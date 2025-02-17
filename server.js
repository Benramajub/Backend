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
const serialPort = new SerialPort({
  path: "COM5", // เปลี่ยนตามพอร์ตของคุณ
  baudRate: 9600,
});

const parser = new ReadlineParser();
serialPort.pipe(parser);

parser.on("data", (data) => {
  const trimmedData = data.trim();
  console.log("📡 Received from Arduino:", trimmedData);


  // ✅ ถ้าลายนิ้วมือมีอยู่แล้ว (ข้อความจาก Arduino)
  if (trimmedData.startsWith("Fingerprint already exists at ID:")) {
    const fingerprintID = parseInt(trimmedData.split(":")[1], 10);

    console.log(`⚠️ ลายนิ้วมือมีอยู่แล้วที่ ID: ${fingerprintID}`);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ status: "exists", fingerprintID }));
      }
    });

    return;
  }


  if (trimmedData.startsWith("TEMPLATE_DATA:")) {
    const parts = trimmedData.split(":");

    // ✅ ตรวจสอบว่าโครงสร้างข้อมูลที่ได้รับถูกต้อง
    console.log("📌 Parsed Parts:", parts);

    if (parts.length < 3) {
      console.error("❌ Invalid template data: Missing templateHex value", trimmedData);
      return;
    }

    // ✅ ตรวจสอบว่า `parts[1]` เป็นตัวเลข (Fingerprint ID)
    const fingerprintID = parseInt(parts[1], 10);
    if (isNaN(fingerprintID)) {
      console.error("❌ Invalid Fingerprint ID:", parts[1]);
      return;
    }

    // ✅ รวมค่าที่เหลือเป็น HEX String
    const templateHex = parts.slice(2).join(":").trim(); 

    // ✅ ตรวจสอบค่า `templateHex`
    if (!templateHex || templateHex.length < 10) {
      console.error("❌ Invalid templateHex:", templateHex);
      return;
    }

    console.log(`✅ Fingerprint ID: ${fingerprintID}`);
    console.log(`✅ Template HEX: ${templateHex}`);

    // ✅ แปลง Hex เป็น Buffer
    try {
      const fingerprintTemplate = Buffer.from(templateHex, "hex");

      // ✅ อัปเดตค่า Template ลงฐานข้อมูล
      const updateSql = "UPDATE fingerprints SET template = ? WHERE fingerprint_id = ?";
      db.query(updateSql, [fingerprintTemplate, fingerprintID], (err, result) => {
        if (err) {
          console.error("❌ Database update error:", err);
          return;
        }

        if (result.affectedRows > 0) {
          console.log(`✅ Template updated for Fingerprint ID: ${fingerprintID}`);
        } else {
          console.log(`⚠️ Fingerprint ID: ${fingerprintID} not found in database.`);
        }
      });
    } catch (error) {
      console.error("❌ Failed to convert HEX to Buffer:", error);
    }
  }

  // ✅ ตรวจจับคำสั่งลบลายนิ้วมือ
if (trimmedData.startsWith("DELETE ENROLL:")) {
  const memberId = parseInt(trimmedData.split(":")[1], 10);

  if (isNaN(memberId)) {
    console.error("❌ Invalid Member ID:", memberId);
    return;
  }

  console.log(`🗑️ ลบลายนิ้วมือของ Member ID: ${memberId}`);

  // ✅ ค้นหา fingerprint_id ของ memberId
  const findFingerprintSql = "SELECT fingerprint_id FROM fingerprints WHERE member_id = ?";
  db.query(findFingerprintSql, [memberId], (err, result) => {
    if (err) {
      console.error("❌ Database error:", err);
      return;
    }

    if (result.length === 0) {
      console.log("⚠️ ไม่พบลายนิ้วมือสำหรับสมาชิกนี้:", memberId);
      return;
    }

    const fingerprintId = result[0].fingerprint_id;

    // ✅ ลบลายนิ้วมือจากฐานข้อมูล
    const deleteSql = "DELETE FROM fingerprints WHERE member_id = ?";
    db.query(deleteSql, [memberId], (err, deleteResult) => {
      if (err) {
        console.error("❌ Error deleting fingerprint:", err);
        return;
      }

      console.log(`✅ ลบลายนิ้วมือสำเร็จ Fingerprint ID: ${fingerprintId}`);

      // ✅ อัปเดต members ให้ hasFingerprint = 0
      const updateMemberSql = "UPDATE members SET hasFingerprint = 0 WHERE id = ?";
      db.query(updateMemberSql, [memberId], (err, updateResult) => {
        if (err) {
          console.error("❌ Database update error:", err);
          return;
        }

        console.log(`✅ อัปเดตสมาชิก Member ID: ${memberId} ให้ไม่มีลายนิ้วมือ`);

        // 🔥 แจ้งเตือน React ผ่าน WebSocket
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ status: "delete_success", memberId }));
          }
        });
      });
    });
  });
}


  
  if (trimmedData.startsWith("ENROLL_SUCCESS:")) {
    const parts = trimmedData.split(":");

    if (parts.length < 3) {
      console.error("❌ Received data is incomplete:", trimmedData);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ status: "failed", message: "ข้อมูลที่ได้รับไม่ถูกต้อง!" }));
        }
      });
      return;
    }

    const memberId = parseInt(parts[1], 10);
    const fingerprintID = parseInt(parts[2], 10);

    if (isNaN(memberId) || isNaN(fingerprintID)) {
      console.error("❌ Invalid memberId or fingerprintID:", memberId, fingerprintID);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ status: "failed", message: "ข้อมูลที่ได้รับไม่ถูกต้อง!" }));
        }
      });
      return;
    }

    // ✅ ตรวจสอบว่ามี fingerprint_id นี้อยู่แล้วหรือไม่
    const checkFingerprintSql = "SELECT * FROM fingerprints WHERE fingerprint_id = ?";
    db.query(checkFingerprintSql, [fingerprintID], (err, rows) => {
      if (err) {
        console.error("❌ Database check error:", err);
        return;
      }

      if (rows.length > 0) {
        console.log(`⚠️ Fingerprint ID: ${fingerprintID} already exists.`);
        
        // 🔥 แจ้งเตือนกลับไปที่ React
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ status: "exists", fingerprintID }));
          }
        });

        return; // ❌ ไม่บันทึกซ้ำ
      }

      // ✅ ถ้า fingerprint_id ยังไม่มี → บันทึกลงฐานข้อมูล
      const insertSql = "INSERT INTO fingerprints (fingerprint_id, member_id) VALUES (?, ?)";
      db.query(insertSql, [fingerprintID, memberId], (err, result) => {
        if (err) {
          console.error("❌ Database insert error:", err);
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ status: "failed", message: "ลงทะเบียนไม่สำเร็จ! กรุณาลองใหม่" }));
            }
          });
          return;
        }

        // ✅ ถ้ามี `fingerprintID` แต่ไม่มีการบันทึกลงฐานข้อมูล
        if (fingerprintID && (!result || result.affectedRows === 0)) {
          console.log(`❌ ลงทะเบียนไม่สำเร็จสำหรับ Fingerprint ID: ${fingerprintID}`);

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ status: "failed", fingerprintID }));
            }
          });

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
    });
  } 


  // ✅ ตรวจจับการสแกนลายนิ้วมือ
  // ✅ ตรวจจับการสแกนลายนิ้วมือ
else if (trimmedData.startsWith("SCAN_SUCCESS:")) {
  const fingerprintID = parseInt(trimmedData.split(":")[1], 10);

  if (isNaN(fingerprintID)) {
    console.error("❌ Invalid fingerprint ID:", fingerprintID);
    return;
  }

  // ✅ ค้นหาสมาชิกที่ตรงกับ fingerprintID
  const findMemberSql = `
    SELECT members.id AS member_id, members.firstName, members.lastName, members.endDate 
    FROM fingerprints 
    JOIN members ON fingerprints.member_id = members.id 
    WHERE fingerprints.fingerprint_id = ?`;

  db.query(findMemberSql, [fingerprintID], (err, result) => {
    if (err) {
      console.error("❌ Database error:", err);
      return;
    }

    if (result.length === 0) {
      console.log("⚠️ Unknown fingerprint ID:", fingerprintID);
      return;
    }

    const { member_id, firstName, lastName, endDate } = result[0];
    const name = `${firstName} ${lastName}`;
    const expiryDate = new Date(endDate);
    const today = new Date();

    // ✅ ตรวจสอบวันหมดอายุ
    if (expiryDate < today) {
      console.log(`❌ สมาชิกหมดอายุ (${expiryDate.toISOString().split("T")[0]}), ไม่สามารถเข้าใช้ได้`);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ status: "expired", memberId: member_id, name }));
        }
      });
      return;
    }

    const scanTime = new Date();

    // ✅ บันทึกลง scan_logs
    const insertScanSql = "INSERT INTO scan_logs (member_id, scan_time) VALUES (?, ?)";
    db.query(insertScanSql, [member_id, scanTime], (err) => {
      if (err) {
        console.error("❌ Database insert error:", err);
        return;
      }
      console.log(`✅ Logged scan for Member ID: ${member_id} (${name}) at ${scanTime}`);

      // ✅ ส่งข้อมูลไปยัง WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ status: "scan", memberId: member_id, name, scanTime }));
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





// ✅ ลบลายนิ้วมือของสมาชิกตาม `memberId`
app.delete("/members/:memberId/fingerprint", (req, res) => {
  const { memberId } = req.params;

  // ✅ ค้นหา fingerprint_id ที่ต้องการลบ
  const findSql = "SELECT fingerprint_id FROM fingerprints WHERE member_id = ?";
  db.query(findSql, [memberId], (err, results) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.status(500).json({ error: "Database query error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "No fingerprint found for this member." });
    }

    const fingerprintId = results[0].fingerprint_id;

    // ✅ ลบ fingerprint จากฐานข้อมูล
    const deleteSql = "DELETE FROM fingerprints WHERE member_id = ?";
    db.query(deleteSql, [memberId], (err, result) => {
      if (err) {
        console.error("❌ Error deleting fingerprint:", err);
        return res.status(500).json({ error: "Failed to delete fingerprint" });
      }

      // ✅ อัปเดต `members` ให้ `hasFingerprint = 0`
      const updateMemberSql = "UPDATE members SET hasFingerprint = 0 WHERE id = ?";
      db.query(updateMemberSql, [memberId], (err) => {
        if (err) {
          console.error("❌ Error updating member status:", err);
          return res.status(500).json({ error: "Failed to update member fingerprint status" });
        }

        console.log(`✅ ลบลายนิ้วมือสำเร็จสำหรับ Member ID: ${memberId}`);
        res.json({ message: "Fingerprint deleted successfully." });
      });
    });
  });
});

// ✅ ดึงสมาชิกที่ลงทะเบียนลายนิ้วมือแล้ว
app.get("/members/registered", (req, res) => {
  const query = `
      SELECT members.id, members.firstName, members.lastName 
      FROM fingerprints 
      JOIN members ON fingerprints.member_id = members.id
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error("❌ Database error:", err);
          return res.status(500).json({ error: "Database query error" });
      }

      res.json(results);
  });
});

// ✅ ดึงสมาชิกที่ลงทะเบียนลายนิ้วมือแล้ว
app.get("/members/registered", (req, res) => {
  const query = `
      SELECT members.id, members.firstName, members.lastName 
      FROM fingerprints 
      JOIN members ON fingerprints.member_id = members.id
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error("❌ Database error:", err);
          return res.status(500).json({ error: "Database query error" });
      }

      res.json(results);
  });
});

// ✅ ดึง fingerprint_id ตาม memberId
app.get("/api/finger/:memberId/getfingerprint", (req, res) => {
  const { memberId } = req.params;
  const query = "SELECT fingerprint_id FROM fingerprints WHERE member_id = ?";

  db.query(query, [memberId], (err, results) => {
      if (err) {
          console.error("❌ Database error:", err);
          return res.status(500).json({ error: "Database query error" });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: "Fingerprint not found for this member." });
      }

      res.json({ fingerprint_id: results[0].fingerprint_id });
  });
});


// ✅ ลบ fingerprint ตาม memberId
app.delete("/api/finger/:memberId/delfingerprint", (req, res) => {
  const { memberId } = req.params;
  const query = "DELETE FROM fingerprints WHERE member_id = ?";

  db.query(query, [memberId], (err, result) => {
      if (err) {
          console.error("❌ Database error:", err);
          return res.status(500).json({ error: "Failed to delete fingerprint" });
      }

      if (result.affectedRows === 0) {
          return res.status(404).json({ error: "No fingerprint found for this member." });
      }

      res.json({ message: "✅ Fingerprint deleted successfully." });
  });
});

// ✅ API ตรวจสอบวันหมดอายุของสมาชิก
app.get('/api/members/:id/check-access', async (req, res) => {
  const { id } = req.params;

  try {
    // ✅ ใช้ await db.query() (แบบ Promise)
    const [rows] = await db.query('SELECT endDate FROM members WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: '❌ ไม่พบสมาชิกนี้' });
    }

    const endDate = new Date(rows[0].endDate);
    const currentDate = new Date();

    if (endDate < currentDate) {
      return res.json({ access: false, message: '❌ สมาชิกหมดอายุ, ไม่สามารถเข้าใช้ได้' });
    }

    res.json({ access: true, message: '✅ สมาชิกยังใช้งานได้' });
  } catch (error) {
    console.error('❌ Database Error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});


// 📌 ฟังก์ชันสุ่มรหัส 4 หลัก
const generateCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};




app.put('api/members/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const result = await db.query('UPDATE members SET status = ? WHERE id = ?', [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating member status:', error);
    res.status(500).json({ error: 'Database error' });
  }
});



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





app.post("/api/addmembers", (req, res) => {
  const { id, firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate } = req.body;

  // ตรวจสอบว่ามี ID นี้อยู่ในระบบแล้วหรือไม่
  db.query("SELECT id FROM members WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("❌ Error checking existing ID:", err);
      res.status(500).json({ error: "Database error" });
      return;
    }

    if (results.length > 0) {
      return res.status(400).json({ error: "❌ ID already exists. Please use another ID." });
    }

    // เพิ่มข้อมูลสมาชิก
    const insertQuery =
      "INSERT INTO members (id, firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    db.query(
      insertQuery,
      [id, firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate],
      (err, results) => {
        if (err) {
          console.error("❌ Error adding member:", err);
          res.status(500).json({ error: "Failed to add member" });
          return;
        }
        res.status(201).json({ message: "✅ Member added successfully!", id });
      }
    );
  });
});

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

// 📌 API: ดึงข้อมูลสมาชิกทั้งหมด
app.get("/api/daily-reports", (req, res) => {
  const query = "SELECT * FROM dailyreports";

  db.query(query, (err, results) => {
      if (err) {
          console.error("❌ Error fetching data:", err);
          res.status(500).json({ error: "Failed to fetch data" });
          return;
      }
      res.status(200).json(results);
  });
});

// ✅ ลบลายนิ้วมือและส่งคำสั่งไปยัง Arduino/ESP32
app.post("/api/fingerprint/delete", (req, res) => {
  const { memberId } = req.body;

  if (!memberId) {
      return res.status(400).json({ message: "Member ID is required." });
  }

  // ✅ ค้นหา fingerprint_id ของ memberId
  const findSql = "SELECT fingerprint_id FROM fingerprints WHERE member_id = ?";
  db.query(findSql, [memberId], (err, results) => {
      if (err) {
          console.error("❌ Database error:", err);
          return res.status(500).json({ error: "Database query error" });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: "No fingerprint found for this member." });
      }

      const fingerprintId = results[0].fingerprint_id;

      // ✅ ส่งคำสั่งลบไปยัง Arduino/ESP32 ผ่าน Serial
      const command = `DELETE ENROLL:${memberId}\n`;
      serialPort.write(command, (err) => {
          if (err) {
              console.error("❌ Failed to send command to Arduino:", err);
              return res.status(500).json({ message: "Failed to send command to Arduino." });
          }

          console.log("📡 Sent to Arduino:", command);

          // ✅ ลบ fingerprint ออกจากฐานข้อมูล
          const deleteSql = "DELETE FROM fingerprints WHERE member_id = ?";
          db.query(deleteSql, [memberId], (err, result) => {
              if (err) {
                  console.error("❌ Error deleting fingerprint:", err);
                  return res.status(500).json({ error: "Failed to delete fingerprint" });
              }

              // ✅ อัปเดต `members` ให้ `hasFingerprint = 0`
              const updateMemberSql = "UPDATE members SET hasFingerprint = 0 WHERE id = ?";
              db.query(updateMemberSql, [memberId], (err) => {
                  if (err) {
                      console.error("❌ Error updating member status:", err);
                      return res.status(500).json({ error: "Failed to update member fingerprint status" });
                  }

                  console.log(`✅ ลบลายนิ้วมือสำเร็จสำหรับ Member ID: ${memberId}`);
                  res.json({ message: "Fingerprint deleted successfully." });
              });
          });
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
app.get("/api/reports", (req, res) => {
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
app.get("/api/fingerprints", (req, res) => {
  const query = "SELECT * FROM fingerprints";

  db.query(query, (err, results) => {
      if (err) {
          console.error("❌ Error fetching members:", err);
          res.status(500).json({ error: "Failed to fetch members" });
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

app.get("/api/members/latestId", (req, res) => {
  const query = "SELECT MAX(id) AS latestId FROM members";

  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Error fetching latest member ID:", err);
      res.status(500).json({ error: "Failed to fetch latest ID" });
      return;
    }

    // ถ้าไม่มีสมาชิกให้เริ่มที่ 1
    const latestId = results[0].latestId !== null ? results[0].latestId : 0;
    const nextId = latestId + 1; // ให้ frontend ใช้ค่าถัดไป
    res.json({ latestId: nextId });
  });
});





app.post("/api/members", (req, res) => {
  const { id, firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate } = req.body;

  // ตรวจสอบว่ามี ID นี้อยู่ในระบบแล้วหรือไม่
  db.query("SELECT id FROM members WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("❌ Error checking existing ID:", err);
      res.status(500).json({ error: "Database error" });
      return;
    }

    if (results.length > 0) {
      return res.status(400).json({ error: "❌ ID already exists. Please use another ID." });
    }

    // เพิ่มข้อมูลสมาชิก
    const insertQuery =
      "INSERT INTO members (id, firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    db.query(
      insertQuery,
      [id, firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate],
      (err, results) => {
        if (err) {
          console.error("❌ Error adding member:", err);
          res.status(500).json({ error: "Failed to add member" });
          return;
        }
        res.status(201).json({ message: "✅ Member added successfully!", id });
      }
    );
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

// Route สำหรับดึงข้อมูลสมาชิก
app.get("/api/fingrtprints_id", (req, res) => {
  const query = "SELECT * FROM fingerprints WHERE fingerprint_id IS NOT NULL";

  db.query(query, (error, results) => {
    if (error) {
      console.error("❌ Database error:", error);
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

// 📌 API: ดึงข้อมูลสมาชิกทั้งหมด
app.get("/api/users", (req, res) => {
  const query = "SELECT * FROM users";

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
      // 🔍 ตรวจสอบว่ามีอีเมลนี้อยู่ในระบบแล้วหรือไม่
      const [existingUser] = await db.promise().execute(
          "SELECT * FROM users WHERE LOWER(Email) = LOWER(?)",
          [Email]
      );

      if (existingUser.length > 0) {
          return res.status(409).json({ status: "error", message: "อีเมลนี้ถูกใช้งานแล้ว!" });
      }

      // 🔒 เข้ารหัสรหัสผ่าน
      const hash = await bcrypt.hash(Password, 10);

      // 🔹 บันทึกลงฐานข้อมูล
      await db.promise().execute(
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

  if (!Email || !Password) {
      return res.status(400).json({ status: 'error', message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
  }

  try {
      const [rows] = await db.promise().execute(
          'SELECT * FROM users WHERE LOWER(Email) = LOWER(?)',
          [Email]
      );

      if (rows.length === 0) {
          return res.status(404).json({ status: 'error', message: 'ไม่พบบัญชีผู้ใช้' });
      }

      const user = rows[0];
      console.log('✅ พบผู้ใช้:', user);

      // 🔑 ตรวจสอบรหัสผ่าน
      const isMatch = await bcrypt.compare(Password, user.Password);
      if (!isMatch) {
          return res.status(401).json({ status: 'error', message: 'รหัสผ่านไม่ถูกต้อง' });
      }

      // 🔐 สร้าง Token สำหรับ Authentication
      const token = jwt.sign({ id: user.id, email: user.Email }, 'secretKey', { expiresIn: '1h' });

      return res.status(200).json({ status: 'Ok', token, user: { id: user.id, fname: user.fname, lname: user.lname, email: user.Email } });

  } catch (error) {
      console.error('❌ Database Error:', error);
      return res.status(500).json({ status: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' });
  }
});






const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

