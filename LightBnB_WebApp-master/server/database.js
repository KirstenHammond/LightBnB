require('dotenv').config();
const { query } = require('express');
//const properties = require('./json/properties.json');
//const users = require('./json/users.json');
const { Pool } = require('pg');

const config = {
  user: process.env.lightbnbUser,
  password: process.env.lightbnbPassword,
  host: process.env.lightbnbHost,
  database: process.env.lightbnbDatabase
};

const pool = new Pool(config);
//pool.connect();

//pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {console.log(response.rows)});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {

  return pool.query(`SELECT * FROM users WHERE email = $1;`, [email])
    .then((result) => {
      //console.log(result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
  /* 
  for (const userId in users) {
    user = users[userId];
    if (user.email.toLowerCase() === email.toLowerCase()) {
      break;
    } else {
      user = null;
    }
  } */
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool.query(`SELECT * FROM users WHERE id = $1;`, [id])
    .then((result) => {
      //console.log(result);
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
      return null;
    });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  return pool.query(`
INSERT INTO users (name, email, password)
VALUES ($1, $2, $3)
RETURNING *;
`, [user.name, user.email, user.password])
    .then(result => {
      //console.log("result", result.rows[0]);
      return result.rows[0];
    })
    .catch(err => {
      console.log(err.message);
      return err;
    })

  /*   const userId = Object.keys(users).length + 1;
  user.id = userId;
  users[userId] = user;
  return Promise.resolve(user); */
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  return pool.query(
    `SELECT 
  reservations.start_date, 
  reservations.id, 
  properties.*,
  avg(rating) as average_rating
FROM reservations
JOIN properties ON reservations.property_id = properties.id
JOIN property_reviews ON properties.id = property_reviews.property_id
WHERE reservations.guest_id = $1
GROUP BY properties.id, reservations.id
ORDER BY reservations.start_date
LIMIT $2;`, [guest_id, limit])
    .then(result => {
      //console.log('result.rows', result.rows);
      return result.rows;
    })
    .catch(err => {
      console.log(err.message);
      return err;
    });

  /* return getAllProperties(null, 2); */
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options. { city,  owner_id,  minimum_price_per_night,  maximum_price_per_night,  minimum_rating;}
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  console.log('options', options);
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;
  
  // 3
  //City passed in
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }
 
  //Owner passed in for MyListings
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `WHERE owner_id = $${queryParams.length} `;
  }
 
  //If minimum/maximum amount passed in, returns properties in that range
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    if (queryParams.length > 1) {
      queryString += `AND cost_per_night >= $${queryParams.length} `;
    } else {
      queryString += `WHERE cost_per_night >= $${queryParams.length} `;
    }
  }
  
  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    if (queryParams.length > 1) {
      queryString += `AND cost_per_night <= $${queryParams.length} `;
    } else {
      queryString += `WHERE cost_per_night <= $${queryParams.length} `;
    }
  }
  
  //Only pass in property with a minimum rating provided
  if (options.minimum_rating) {
    queryParams.push(Number(options.minimum_rating));
  }
  
  // 4
  queryParams.push(limit);
  
  if(!options.minimum_rating) {
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  } else {
    queryString += `
    GROUP BY properties.id
    HAVING avg(property_reviews.rating) >= $${queryParams.length-1}
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;
  }
  
  // 5
  console.log(queryString, queryParams);
  
  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);
};


exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;

/* 

SELECT properties.*, avg(property_reviews.rating) as average_rating
FROM properties
JOIN property_reviews ON properties.id = property_id
WHERE city LIKE '%Vancouver%'
GROUP BY properties.id
HAVING avg(property_reviews.rating) >= 3 
ORDER BY cost_per_night
LIMIT 5;

*/