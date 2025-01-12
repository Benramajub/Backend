const db = require('../database');

exports.getMembers = (req, res) => {
  const query = 'SELECT * FROM members';
  db.query(query, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
};

exports.addMember = (req, res) => {
  const { firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate } = req.body;
  const query = 'INSERT INTO members (firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(query, [firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate], (err, results) => {
    if (err) throw err;
    res.json({ message: 'Member added successfully!' });
  });
};

exports.deleteMember = (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM members WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) throw err;
    res.json({ message: 'Member deleted successfully!' });
  });
};

exports.updateMember = (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate } = req.body;
  const query = 'UPDATE members SET firstName = ?, lastName = ?, age = ?, phone = ?, email = ?, duration = ?, originalPrice = ?, points = ?, discount = ?, startDate = ?, endDate = ? WHERE id = ?';
  db.query(query, [firstName, lastName, age, phone, email, duration, originalPrice, points, discount, startDate, endDate, id], (err, results) => {
    if (err) throw err;
    res.json({ message: 'Member updated successfully!' });
  });
};

exports.deleteMember = (req, res) => {
    const { id } = req.params;
  
    // อัปเดตข้อมูลใน payments ให้ memberId เป็น NULL
    const updatePaymentsQuery = 'UPDATE payments SET memberId = NULL WHERE memberId = ?';
    db.query(updatePaymentsQuery, [id], (err, result) => {
      if (err) {
        console.error('Error updating payments:', err);
        return res.status(500).json({ error: 'Failed to update payments' });
      }
  
      // ลบสมาชิกจากตาราง members
      const deleteMemberQuery = 'DELETE FROM members WHERE id = ?';
      db.query(deleteMemberQuery, [id], (err, result) => {
        if (err) {
          console.error('Error deleting member:', err);
          return res.status(500).json({ error: 'Failed to delete member' });
        }
  
        res.status(200).json({ message: 'Member deleted successfully' });
      });
    });
  };