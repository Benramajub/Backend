const express = require('express');
const router = express.Router();
const { processPayment } = require('../controllers/paymentController');

router.post('/', processPayment);


module.exports = router;