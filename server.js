const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
var jsonParser = bodyParser.json()
const db = require('./database');
const app = express();
const bcrypt = require('bcrypt');
const saltRounds = 10;
var jwt = require('jsonwebtoken');
var token = jwt.sign({ foo: 'bar' }, 'shhhhh');
const secret = 'Adlog'
const mysql = require('mysql2')
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'gym_management',
  });

app.use(cors());
app.use(bodyParser.json());

// Routes
const memberRoutes = require('./routes/memberRoutes');
app.use('/api/members', memberRoutes);

const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);

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

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

