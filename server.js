const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
var jsonParser = bodyParser.json()
const app = express();
const bcrypt = require('bcrypt');
const saltRounds = 10;
var jwt = require('jsonwebtoken');
var token = jwt.sign({ foo: 'bar' }, 'shhhhh');
const secret = 'Adlog'

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
    uri: process.env.MYSQL_URI, // ใช้ค่า URI จาก .env
});

const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const WebSocket = require("ws");

// 🔥 สร้าง WebSocket Server ที่พอร์ต 8080
const wss = new WebSocket.Server({ port: 8080 });

// เปิด Serial Port (เปลี่ยนเป็นพอร์ตที่ใช้งานจริง)
/*const serialPort = new SerialPort({
  path: "COM5", // เปลี่ยนตามพอร์ตของคุณ
  baudRate: 9600,
});

const parser = new ReadlineParser();
serialPort.pipe(parser);

parser.on("data", (data) => {
  const trimmedData = data.trim();
  console.log("📡 Received from Arduino:", trimmedData);

  if (trimmedData.startsWith("ENROLL_SUCCESS:")) {
    const parts = trimmedData.split(":");

    if (parts.length < 3) {
      console.error("❌ Received data is incomplete:", trimmedData);
      return;
    }

    const memberId = parseInt(parts[1], 10);
    const fingerprintID = parseInt(parts[2], 10);

    if (isNaN(memberId) || isNaN(fingerprintID)) {
      console.error("❌ Invalid memberId or fingerprintID:", memberId, fingerprintID);
      return;
    }

    const checkSql = "SELECT * FROM fingerprints WHERE member_id = ?";
    db.query(checkSql, [memberId], (err, rows) => {
      if (err) {
        console.error("❌ Database check error:", err);
        return;
      }

      if (rows.length > 0) {
        console.log(`⚠️ Member ID: ${memberId} already has a fingerprint.`);
        return;
      } else {
        const insertSql = "INSERT INTO fingerprints (fingerprint_id, member_id) VALUES (?, ?)";
        db.query(insertSql, [fingerprintID, memberId], (err) => {
          if (err) {
            console.error("❌ Database insert error:", err);
            return;
          }
          console.log(`✅ Inserted fingerprint for Member ID: ${memberId} with Fingerprint ID: ${fingerprintID}`);

          const updateSql = "UPDATE members SET hasFingerprint = 1 WHERE id = ?";
          db.query(updateSql, [memberId], (err) => {
            if (err) {
              console.error("❌ Database update error:", err);
              return;
            }
            console.log(`✅ Updated members table for Member ID: ${memberId}, set hasFingerprint to 1`);

            // 🔥 ส่งข้อมูลไปยัง React ผ่าน WebSocket
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ status: "success", memberId, fingerprintID }));
              }
            });
          });
        });
      }
    });
  } else if (trimmedData.startsWith("SCAN_SUCCESS:")) {
    const fingerprintID = parseInt(trimmedData.split(":")[1], 10);

    if (isNaN(fingerprintID)) {
      console.error("❌ Invalid fingerprint ID:", fingerprintID);
      return;
    }

    const findMemberSql = "SELECT member_id FROM fingerprints WHERE fingerprint_id = ?";
    db.query(findMemberSql, [fingerprintID], (err, result) => {
      if (err) {
        console.error("❌ Database error:", err);
        return;
      }

      if (result.length === 0) {
        console.log("⚠️ Unknown fingerprint ID:", fingerprintID);
        return;
      }

      const memberId = result[0].member_id;
      const scanTime = new Date();

      const insertScanSql = "INSERT INTO scan_logs (member_id, scan_time) VALUES (?, ?)";
      db.query(insertScanSql, [memberId, scanTime], (err) => {
        if (err) {
          console.error("❌ Database insert error:", err);
          return;
        }
        console.log(`✅ Logged scan for Member ID: ${memberId} at ${scanTime}`);

        // 🔥 ส่งข้อมูลการสแกนไปยัง React ผ่าน WebSocket
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ status: "scan", memberId, scanTime }));
          }
        });
      });
    });
  }
});

// ✅ ตรวจสอบการเชื่อมต่อ WebSocket
wss.on("connection", (ws) => {
  console.log("🔗 WebSocket Client Connected");

  ws.on("close", () => {
    console.log("❌ WebSocket Client Disconnected");
  });
});
*/

// 📌 ฟังก์ชันสุ่มรหัส 4 หลัก
const generateCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};


app.post("/api/dailymembers", async (req, res) => {
  const { name } = req.body;
  const amount = 100; // ล็อกค่าเป็น 100 บาท
  const code = generateCode();
  const uses_remaining = 2;
  const date = new Date().toISOString().split("T")[0];

  if (!name) {
      return res.status(400).json({ error: "กรุณากรอกชื่อ!" });
  }

  try {
      const sql = `INSERT INTO Dailymembers (name, amount, code, uses_remaining, date) VALUES (?, ?, ?, ?, ?)`;
      await db.promise().query(sql, [name, amount, code, uses_remaining, date]);

      res.status(201).json({
          message: "✅ ชำระเงินสำเร็จ!",
          code: code,
          uses_remaining: uses_remaining,
      });
  } catch (error) {
      console.error("❌ Error processing payment:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  }
});


// 📌 **API ดึงข้อมูลรหัสที่ยังใช้งานได้**
app.get("/api/dailymembers", async (req, res) => {
  try {
      const [rows] = await db.promise().query(`SELECT * FROM Dailymembers WHERE uses_remaining > 0`);
      res.json(rows);
  } catch (error) {
      console.error("❌ Error fetching data:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});


// 📌 **API ใช้งานรหัส (ลดจำนวนครั้ง)**
app.post("/api/dailymembers/use-code", async (req, res) => {
  const { code } = req.body;

  if (!code) {
      return res.status(400).json({ error: "กรุณาระบุรหัส!" });
  }

  try {
      // ตรวจสอบว่ารหัสยังใช้งานได้
      const [rows] = await db.promise().query(`SELECT * FROM Dailymembers WHERE code = ? AND uses_remaining > 0`, [code]);

      if (rows.length === 0) {
          return res.status(400).json({ error: "❌ รหัสนี้ใช้ไม่ได้หรือหมดอายุแล้ว!" });
      }

      // ลดจำนวนครั้งที่ใช้ได้
      await db.promise().query(`UPDATE Dailymembers SET uses_remaining = uses_remaining - 1 WHERE code = ?`, [code]);

      res.json({ message: "✅ ใช้รหัสสำเร็จ!", remaining: rows[0].uses_remaining - 1 });
  } catch (error) {
      console.error("❌ Error updating code usage:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการใช้รหัส" });
  }
});


// 📌 **API ลบรหัสที่ใช้หมดแล้ว**
app.delete("/api/dailymembers/cleanup", async (req, res) => {
  try {
      await db.query(`DELETE FROM Dailymembers WHERE uses_remaining = 0`);
      res.json({ message: "✅ ลบรหัสที่หมดอายุสำเร็จ!" });
  } catch (error) {
      console.error("❌ Error deleting expired codes:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบข้อมูล" });
  }
});


// 📌 ฟังก์ชันสำหรับลงทะเบียนลายนิ้วมือ
function enrollFingerprint(serialPort, memberId, callback) {
  console.log(`📌 Enrolling fingerprint for Member ID: ${memberId}`);

  // **ตัวอย่างการส่งคำสั่งไปยังเครื่องสแกน (ขึ้นกับอุปกรณ์ที่ใช้)**
  serialPort.write(`ENROLL ${memberId}\n`, (err) => {
      if (err) {
          return callback(err, { success: false });
      }

      serialPort.once("data", (data) => {
          const response = data.toString().trim();
          console.log("🔍 Fingerprint Scanner Response:", response);

          if (response === "SUCCESS") {
              callback(null, { success: true });
          } else {
              callback(null, { success: false });
          }
      });
  });
}

app.post("/api/fingerprint/enroll", (req, res) => {
  const { memberId } = req.body;

  if (!memberId) {
      return res.status(400).json({ message: "Member ID is required." });
  }

  const command = `ENROLL:${memberId}\n`;
  serialPort.write(command, (err) => {
      if (err) {
          console.error("Failed to send command to Arduino:", err);
          return res.status(500).json({ message: "Failed to send command to Arduino." });
      }
      console.log("Sent to Arduino:", command);
      res.status(200).json({ message: "Enrollment started. Please scan your fingerprint." });
  });
});

// 📌 API: ลงทะเบียนลายนิ้วมือ
app.post("/api/enroll-fingerprint", (req, res) => {
  const { memberId } = req.body;

  if (!memberId) {
      return res.status(400).json({ message: "Member ID is required." });
  }

  // ✅ ตรวจสอบว่า Member ID มีอยู่หรือไม่
  db.query("SELECT * FROM members WHERE id = ?", [memberId], (err, results) => {
      if (err) {
          console.error("❌ Database error:", err);
          return res.status(500).json({ message: "Database error." });
      }

      if (results.length === 0) {
          return res.status(404).json({ message: "Member not found." });
      }

      const member = results[0];
      if (member.hasFingerprint) {
          return res.status(400).json({ message: "Fingerprint already registered for this member." });
      }

      // ✅ เรียกใช้ฟังก์ชัน enrollFingerprint
      enrollFingerprint(serialPort, memberId, (err, result) => {
          if (err) {
              console.error("❌ Error enrolling fingerprint:", err);
              return res.status(500).json({ message: "Error enrolling fingerprint." });
          }

          if (result.success) {
              // ✅ อัปเดตสถานะในฐานข้อมูล
              db.query(
                  "UPDATE members SET hasFingerprint = 1 WHERE id = ?",
                  [memberId],
                  (updateErr) => {
                      if (updateErr) {
                          console.error("❌ Database update error:", updateErr);
                          return res.status(500).json({ message: "Failed to update database." });
                      }

                      res.status(200).json({ message: "✅ Fingerprint enrolled successfully." });
                  }
              );
          } else {
              res.status(400).json({ message: "Failed to enroll fingerprint." });
          }
      });
  });
});

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

db.connect((err) => {
  if (err) throw err;
  console.log('Connect to Mysql');
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

// Route สำหรับดึงข้อมูลสมาชิก
app.get("/api/fingrtprints/members", (req, res) => {
  db.query("SELECT * FROM members WHERE hasFingerprint = 0", (error, results) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ message: "Database error." });
    }
    res.json(results);
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
  
  app.get('/api/members', async (req, res) => {
    try {
      const members = await Member.find();
      const today = new Date();
  
      // อัปเดตสถานะสมาชิกตาม endDate
      const updatedMembers = members.map((member) => {
        const endDate = new Date(member.endDate);
        if (endDate < today) {
          member.status = 'Inactive';
        }
        return member;
      });
  
      res.status(200).send(updatedMembers);
    } catch (error) {
      res.status(500).send('Error fetching members');
    }
  });

  app.get('/api/members', async (req, res) => {
    try {
      const members = await db.query('SELECT id, firstName, lastName, originalPrice FROM members');
      res.json(members.rows); // ส่งข้อมูล originalPrice กลับไปด้วย
    } catch (err) {
      console.error(err);
      res.status(500).send('Error retrieving members');
    }
  });
  
  app.post('/api/payments', async (req, res) => {
    try {
      const { memberId, amount, date } = req.body;
  
      // ตรวจสอบว่า memberId มีอยู่ในระบบหรือไม่
      const member = await Member.findById(memberId);
      if (!member) return res.status(404).send('Member not found');
  
      // สร้างข้อมูลการชำระเงินใหม่
      const payment = new Payment({
        memberId,
        amount,
        date,
      });
  
      // บันทึกข้อมูลการชำระเงิน
      await payment.save();
  
      // เปลี่ยนสถานะสมาชิกเป็น Active หลังชำระเงิน
      member.status = 'Active';
      await member.save();
  
      res.status(201).send(payment);
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).send('Error processing payment');
    }
  });

  
  app.put('/api/members/:id', (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, phone, email, points, duration, startDate, endDate, status, originalPrice } = req.body;
  
    const sql = `
      UPDATE members 
      SET firstName = ?, lastName = ?, phone = ?, email = ?, points = ?, duration = ?, startDate = ?, endDate = ?, status = ?, originalPrice = ?
      WHERE id = ?
    `;
    
    db.query(sql, [firstName, lastName, phone, email, points, duration, startDate, endDate, status, originalPrice, id], (err, result) => {
      if (err) {
        console.error('Error updating member:', err);
        return res.status(500).json({ message: 'Error updating member' });
      }
      res.status(200).json({ message: 'Member updated successfully' });
    });
  });
  
  
  // API สำหรับดึงข้อมูลสมาชิกตาม ID
app.get('/api/members/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM members WHERE id = ?';
  
    db.query(query, [id], (err, results) => {
      if (err) {
        console.error('Error fetching member by ID:', err);
        res.status(500).json({ error: 'Failed to fetch member' });
        return;
      }
  
      if (results.length === 0) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }
  
      res.status(200).json(results[0]); // ส่งข้อมูลสมาชิกกลับไปที่ฟรอนต์เอนด์
    });
  });

  
  
  app.post("/fingerprints", (req, res) => {
    console.log(req.body);
    res.json({ message: "Fingerprint data received successfully" });
  });
  

  app.delete('/api/members/:id', (req, res) => {
    const { id } = req.params;
  
    const query = 'DELETE FROM members WHERE id = ?';
  
    db.query(query, [id], (err, result) => {
      if (err) {
        console.error('Error deleting member:', err);
        res.status(500).json({ error: 'Failed to delete member' });
        return;
      }
  
      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }
  
      res.status(200).json({ message: 'Member deleted successfully' });
    });
  });
  
  app.get("/api/dailymembers/search", async (req, res) => {
    const searchQuery = req.query.q;

    if (!searchQuery || searchQuery.trim() === "") {
        return res.json([]); // ถ้าไม่มีค่าค้นหา ส่งข้อมูลว่าง
    }

    try {
        const [rows] = await db.promise().query(
            "SELECT * FROM dailymembers WHERE name LIKE ? OR code LIKE ?",
            [`%${searchQuery}%`, `%${searchQuery}%`]
        );
        res.json(rows);
    } catch (error) {
        console.error("❌ Error searching daily members:", error);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการค้นหา" });
    }
});


app.get("/api/member/search", async (req, res) => {
  const searchQuery = req.query.q;

  console.log("🔍 ค้นหา:", searchQuery);

  if (!searchQuery || searchQuery.trim() === "") {
      console.log("❌ ไม่มีค่าค้นหา ส่งข้อมูลทั้งหมด");
      return res.json([]);
  }

  try {
      const sql = "SELECT * FROM members WHERE firstName LIKE ? OR lastName LIKE ? OR phone LIKE ? OR email LIKE ?";
      const params = [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];

      console.log("🛠 SQL Query:", sql);
      console.log("🔎 Parameters:", params);

      const [rows] = await db.promise().query(sql, params);

      console.log("✅ ผลลัพธ์ที่ได้:", rows);
      res.json(rows);
  } catch (error) {
      console.error("❌ Error searching members:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการค้นหา" });
  }
});




  app.post('/api/members/check-id', (req, res) => {
    const { id } = req.body;
  
    db.query('SELECT * FROM members WHERE id = ?', [id], (err, result) => {
      if (err) return res.status(500).send('Database error');
      if (result.length > 0) {
        return res.status(400).send('ID already exists');
      }
  
      // บันทึก ID ลงฐานข้อมูล
      db.query('INSERT INTO members (id) VALUES (?)', [id], (err) => {
        if (err) return res.status(500).send('Database error');
        res.send('ID saved successfully');
      });
    });
  });

  
// 📌 **API ลงทะเบียนผู้ใช้ (Register)**
app.post("/api/register", async (req, res) => {
  const { Email, Password, fname, lname } = req.body;

  if (!Email || !Password || !fname || !lname) {
      return res.status(400).json({ status: "error", message: "กรุณากรอกข้อมูลให้ครบถ้วน!" });
  }

  try {
      // 🔒 เข้ารหัสรหัสผ่าน
      const hash = await bcrypt.hash(Password, saltRounds);

      // 🔹 บันทึกลงฐานข้อมูล
      await db.execute(
          "INSERT INTO users (Email, Password, fname, lname) VALUES (?, ?, ?, ?)",
          [Email, hash, fname, lname]
      );

      res.json({ status: "Ok", message: "✅ ลงทะเบียนสำเร็จ!" });
  } catch (err) {
      console.error("❌ Error during registration:", err);
      res.status(500).json({ status: "error", message: "เกิดข้อผิดพลาดในการลงทะเบียน" });
  }
});

app.post('/api/login', async (req, res) => {
  const { Email, Password } = req.body;

  try {
      const [rows] = await db.promise().execute(
          'SELECT * FROM users WHERE LOWER(Email) = LOWER(?)',
          [Email]
      );

      

      if (rows.length === 0) {
          return res.status(404).json({ status: 'Error', message: 'User not found' });
      }

      const user = rows[0];
      console.log('✅ Found User:', user);

      // ตรวจสอบรหัสผ่าน
      const isMatch = await bcrypt.compare(Password, user.Password);
      if (!isMatch) {
          return res.status(401).json({ status: 'Error', message: 'Invalid password' });
      }

      // สร้าง token
      const token = jwt.sign({ id: user.id, email: user.Email }, 'secretKey', { expiresIn: '1h' });

      return res.status(200).json({ status: 'Ok', token });

  } catch (error) {
      console.error('❌ Database Error:', error);
      return res.status(500).json({ status: 'Error', message: 'Database error' });
  }
});





const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

