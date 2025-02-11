const express = require('express');
const router = express.Router();
const db = require('../database'); // เชื่อมต่อ MySQL

// ฟังก์ชันสุ่มรหัส 4 หลัก
const generateCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

// 📌 **API เพิ่มข้อมูล Payment2**
router.post('/dailymembers', async (req, res) => {
    const { name } = req.body;
    const amount = 100; // ล็อกค่าเป็น 100 บาท
    const code = generateCode();
    const uses_remaining = 2; // ใช้ได้ 2 ครั้ง
    const date = new Date().toISOString().split('T')[0]; // วันที่ปัจจุบัน

    if (!name) {
        return res.status(400).json({ error: 'กรุณากรอกชื่อ!' });
    }

    try {
        const sql = `INSERT INTO Dailymembers (name, amount, code, uses_remaining, date) VALUES (?, ?, ?, ?, ?)`;
        await db.query(sql, [name, amount, code, uses_remaining, date]);

        res.status(201).json({
            message: 'ชำระเงินสำเร็จ!',
            code: code,
            uses_remaining: uses_remaining,
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
});

// 📌 **API ดึงข้อมูลรหัสที่ยังใช้งานได้**
router.get('/dailymembers', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM Dailymembers WHERE uses_remaining > 0`);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
});

// 📌 **API ใช้งานรหัส (ลดจำนวนครั้ง)**
router.post('/dailymembers/use-code', async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'กรุณาระบุรหัส!' });
    }

    try {
        // ตรวจสอบว่ารหัสยังใช้งานได้
        const [rows] = await db.query(`SELECT * FROM Dailymembers WHERE code = ? AND uses_remaining > 0`, [code]);

        if (rows.length === 0) {
            return res.status(400).json({ error: 'รหัสนี้ใช้ไม่ได้หรือหมดอายุแล้ว!' });
        }

        // ลดจำนวนครั้งที่ใช้ได้
        await db.query(`UPDATE Dailymembers SET uses_remaining = uses_remaining - 1 WHERE code = ?`, [code]);

        res.json({ message: 'ใช้รหัสสำเร็จ!', remaining: rows[0].uses_remaining - 1 });
    } catch (error) {
        console.error('Error updating code usage:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการใช้รหัส' });
    }
});

// 📌 **API ลบรหัสที่ใช้หมดแล้ว**
router.delete('/dailymembers/cleanup', async (req, res) => {
    try {
        await db.query(`DELETE FROM Dailymembers WHERE uses_remaining = 0`);
        res.json({ message: 'ลบรหัสที่หมดอายุสำเร็จ!' });
    } catch (error) {
        console.error('Error deleting expired codes:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
});

module.exports = router;
