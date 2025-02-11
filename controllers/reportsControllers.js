const db = require('../database');

// 📌 ดึงรายงานการสแกนลายนิ้วมือ
exports.getScanReports = (req, res) => {
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
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      console.log("Sending scan logs data:", results);
      res.json(results.map((row) => ({
        id: row.id,
        memberId: row.memberId,
        name: row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : "ไม่พบข้อมูล",
        scanTime: row.scanTime,
      })));
    });
  };