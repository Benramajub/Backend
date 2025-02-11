const db = require('../database');

let pendingEnrollRequest = null; // ใช้เก็บ memberId ที่รอให้ ESP32 ลงทะเบียน

// ✅ API สำหรับรับข้อมูลการลงทะเบียนลายนิ้วมือ
exports.enrollFingerprint = (req, res) => {
  const { memberId, fingerprintID } = req.body;
  if (!memberId || !fingerprintID) {
    return res.status(400).json({ message: "Missing memberId or fingerprintID" });
  }

  const checkSql = "SELECT * FROM fingerprints WHERE member_id = ?";
  db.query(checkSql, [memberId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (rows.length > 0) {
      return res.status(409).json({ message: `Member ID ${memberId} already has a fingerprint.` });
    }

    const insertSql = "INSERT INTO fingerprints (fingerprint_id, member_id) VALUES (?, ?)";
    db.query(insertSql, [fingerprintID, memberId], (err) => {
      if (err) return res.status(500).json({ message: "Database insert error" });

      return res.status(201).json({ message: "Enrollment successful", memberId, fingerprintID });
    });
  });
};

// ✅ API ให้ ESP32 ขอ `memberId` สำหรับลงทะเบียน
exports.requestEnroll = (req, res) => {
  if (pendingEnrollRequest) {
    res.json({ memberId: pendingEnrollRequest });
    pendingEnrollRequest = null; // เคลียร์ค่าหลังจาก ESP32 ดึงไปใช้
  } else {
    res.status(204).send();
  }
};

// ✅ API ให้ Frontend หรือ Admin ส่ง `memberId` มาให้ ESP32 ลงทะเบียน
exports.processEnrollRequest = (req, res) => {
  const { memberId } = req.body;
  
  if (!memberId) {
    return res.status(400).json({ message: "Missing memberId" });
  }

  pendingEnrollRequest = memberId;
  res.status(200).json({ message: `Enrollment request for Member ID: ${memberId} received` });
};

// ✅ API สำหรับรับข้อมูลการสแกนลายนิ้วมือ
exports.scanFingerprint = (req, res) => {
  const { fingerprintID } = req.body;
  if (!fingerprintID) {
    return res.status(400).json({ message: "Missing fingerprint ID" });
  }

  const findMemberSql = "SELECT member_id FROM fingerprints WHERE fingerprint_id = ?";
  db.query(findMemberSql, [fingerprintID], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (result.length === 0) {
      return res.status(404).json({ message: "Fingerprint not found" });
    }

    const memberId = result[0].member_id;
    const scanTime = new Date();

    const insertScanSql = "INSERT INTO scan_logs (member_id, scan_time) VALUES (?, ?)";
    db.query(insertScanSql, [memberId, scanTime], (err) => {
      if (err) return res.status(500).json({ message: "Database insert error" });

      return res.status(200).json({ message: "Scan logged successfully", memberId, scanTime });
    });
  });
};
