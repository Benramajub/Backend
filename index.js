const express = require('express')
const app = express()
const PORT = 4000

app.use(express.json());

require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
    uri: process.env.MYSQL_URI, // ใช้ค่า URI จาก .env
});

db.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return;
    }
    console.log("Connected to MySQL Database!");
  });


app.listen(PORT, () => {
    console.log('API Listening on PORT ${PORT}')
})

app.get('/' ,(req, res) => {
    res.send('This is my API running...')
})

app.get('/about' ,(req, res) => {
    res.send('This is my API running..a.')
})


// API สำหรับดึงข้อมูลสมาชิกทั้งหมด
app.get('/api/members', (req, res) => {
    const query = 'SELECT * FROM members';
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching members:', err);
        res.status(500).json({ error: 'Failed to fetch members' });
        return;
      }
      res.status(200).json(results);
    });
  });

// 📌 **ดึงข้อมูลรหัสที่ใช้งานได้**
app.get("/dailymembers", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM Dailymembers WHERE uses_remaining > 0`
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});

module.exports = app