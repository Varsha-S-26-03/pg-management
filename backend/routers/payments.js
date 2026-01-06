const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Payment = require('../models/Payment');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find().populate('tenant', 'name');
    res.json({ payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;