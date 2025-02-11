const express = require('express')
const app = express()
const cors = require('cors');
app.use(cors());
app.use(express.json());
require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
  uri: process.env.MYSQL_URI, // ใช้ค่า URI จาก .env
  ssl: { rejectUnauthorized: true } // 🔥 เปิด SSL
});

db.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return;
    }
    console.log("Connected to MySQL Database!");
  });


  const PORT = 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.get('/' ,(req, res) => {
    res.send('This is my API running...')
})

app.get('/about' ,(req, res) => {
    res.send('This is my API running..a.')
})


// 📌 API: ดำเนินการชำระเงิน
app.post("/api/payments", (req, res) => {
  const { memberId, amount, date } = req.body;
  const query = "INSERT INTO payments (memberId, amount, date) VALUES (?, ?, ?)";

  db.query(query, [memberId, amount, date], (err, results) => {
      if (err) {
          console.error("❌ Error processing payment:", err);
          res.status(500).json({ error: "Failed to process payment" });
          return;
      }
      res.json({ message: "✅ Payment processed successfully!" });
  });
});

// 📌 API: ดึงข้อมูลการสแกน (Scan Reports)
app.get("/api/scan-reports", (req, res) => {
  const sql = `
      SELECT logs.id, logs.member_id AS memberId, 
             members.firstName, members.lastName, 
             DATE_FORMAT(logs.scan_time, '%Y-%m-%d %H:%i:%s') AS scanTime
      FROM scan_logs AS logs
      LEFT JOIN members ON logs.member_id = members.id  -- ✅ ใช้ LEFT JOIN ป้องกันกรณีไม่มีข้อมูลใน members
      ORDER BY logs.scan_time DESC;
  `;

  db.query(sql, (err, results) => {
      if (err) {
          console.error("❌ Database error:", err);
          return res.status(500).json({ error: "Database error" });
      }
      console.log("📌 Sending scan logs data:", results);
      res.json(results.map((row) => ({
          id: row.id,
          memberId: row.memberId,
          name: row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : "ไม่พบข้อมูล",
          scanTime: row.scanTime,
      })));
  });
});

app.post('/Register', jsonParser, function (req, res, next) {
    bcrypt.hash(req.body.Password, saltRounds, function(err, hash) {
  
      connection.execute(
          'INSERT INTO users (Email, Password, fname, lname) VALUES (?, ?, ?, ?)',
          [req.body.Email, hash, req.body.fname, req.body.lname],
        function(err, results, fields){
          if(err) {
              res.json({status:'error', message:err})
              return
          }
        res.json({status: 'Ok'})
      }
      
      );
    });
  })
  
  app.post('/Login', jsonParser, function (req, res, next) {
      connection.execute(
          'SELECT * FROM users WHERE Email=?',
          [req.body.Email],
        function(err, users, fields){
          if(err) {res.json({status:'error', message:err});return}
          if(users.length == 0) {res.json({status:'error', message:'No User'}); return }
          bcrypt.compare(req.body.Password, users[0].Password, function(err, isLogin) {
            if(isLogin){
              var token = jwt.sign({ Email: users[0].Email }, secret);
              res.json({status:'Ok', message: 'Login Success',token})
            }else{
              res.json({status:'Error', message: 'Login Failed'})
            }
        });
          
      }
      
      );
  })

app.get("/api/dailymembers", async (req, res) => {
  try {
      const [rows] = await db.promise().query(`SELECT * FROM Dailymembers WHERE uses_remaining > 0`);
      res.json(rows);
  } catch (error) {
      console.error("❌ Error fetching data:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});


// API สำหรับดึงข้อมูลการชำระเงินทั้งหมด
app.get('/api/payments', (req, res) => {
  const query = 'SELECT * FROM payments';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching payments:', err);
      res.status(500).json({ error: 'Failed to fetch payments' });
      return;
    }
    res.status(200).json(results);
  });
});


// 📌 API: ดึงข้อมูลสมาชิกทั้งหมด
app.get("/api/members", (req, res) => {
  const query = "SELECT * FROM members";

  db.query(query, (err, results) => {
      if (err) {
          console.error("❌ Error fetching members:", err);
          res.status(500).json({ error: "Failed to fetch members" });
          return;
      }
      res.status(200).json(results);
  });
});


// 📌 API: เพิ่มสมาชิก
app.post("/api/members", (req, res) => {
  const { firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate } = req.body;
  const query = "INSERT INTO members (firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  db.query(query, [firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate], (err, results) => {
      if (err) {
          console.error("❌ Error adding member:", err);
          res.status(500).json({ error: "Failed to add member" });
          return;
      }
      res.status(201).json({ message: "✅ Member added successfully!" });
  });
});

// 📌 API: อัปเดตข้อมูลสมาชิก
app.put("/api/members/:id", (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate } = req.body;
  const query = "UPDATE members SET firstName = ?, lastName = ?, age = ?, phone = ?, email = ?, duration = ?, originalPrice = ?, points = ?, discount = ?, startDate = ?, endDate = ? WHERE id = ?";

  db.query(query, [firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate, id], (err, results) => {
      if (err) {
          console.error("❌ Error updating member:", err);
          res.status(500).json({ error: "Failed to update member" });
          return;
      }
      res.json({ message: "✅ Member updated successfully!" });
  });
});

// 📌 API: ลบสมาชิก และอัปเดต payments
app.delete("/api/members/:id", (req, res) => {
  const { id } = req.params;

  // 1️⃣ อัปเดต payments (ให้ memberId เป็น NULL)
  const updatePaymentsQuery = "UPDATE payments SET memberId = NULL WHERE memberId = ?";
  db.query(updatePaymentsQuery, [id], (err) => {
      if (err) {
          console.error("❌ Error updating payments:", err);
          res.status(500).json({ error: "Failed to update payments" });
          return;
      }

      // 2️⃣ ลบข้อมูลสมาชิก
      const deleteMemberQuery = "DELETE FROM members WHERE id = ?";
      db.query(deleteMemberQuery, [id], (err) => {
          if (err) {
              console.error("❌ Error deleting member:", err);
              res.status(500).json({ error: "Failed to delete member" });
              return;
          }
          res.json({ message: "✅ Member deleted successfully!" });
      });
  });
});

module.exports = app