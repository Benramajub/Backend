const express = require("express");
const router = express.Router();
const reportsControllers = require("../controllers/reportsControllers");

// 📌 ใช้ Controller เพื่อดึงข้อมูลการสแกนลายนิ้วมือ
router.get("/reports", reportsControllers.getScanReports);

module.exports = router;
