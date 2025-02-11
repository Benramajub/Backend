require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
    uri: process.env.MYSQL_URI, // ใช้ค่า URI จาก .env
});

module.exports = db;