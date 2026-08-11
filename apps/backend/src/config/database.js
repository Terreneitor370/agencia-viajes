/**
 * Pool de conexiones MySQL. Nadie fuera de core/db.js debe importar este archivo.
 * DUENO: core (compartido).
 */
const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // CRITICO (OWASP A03): impide apilar varias sentencias en una sola query.
  multipleStatements: false,
  namedPlaceholders: true,
  timezone: 'Z',
  charset: 'utf8mb4_general_ci',
});

module.exports = pool;
