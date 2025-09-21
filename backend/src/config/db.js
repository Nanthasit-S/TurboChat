// src/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config(); // โหลดค่าจาก .env

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root', 
  password: process.env.DB_PASSWORD || '', 
  database: process.env.DB_NAME || 'pj_network',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('MySQL Connection Pool created.');

module.exports = pool;