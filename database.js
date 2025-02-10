const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  
  database: 'gym_management',
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Database connected!');
});

module.exports = connection;
