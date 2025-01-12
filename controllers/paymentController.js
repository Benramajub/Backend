const db = require('../database');

exports.processPayment = (req, res) => {
  const { memberId, amount, date } = req.body;
  const query = 'INSERT INTO payments (memberId, amount, date) VALUES (?, ?, ?)';
  db.query(query, [memberId, amount, date], (err, results) => {
    if (err) throw err;
    res.json({ message: 'Payment processed successfully!' });
  });
};