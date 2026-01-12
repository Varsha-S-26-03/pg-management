const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Payment = require('../models/Payment');

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const payments = await Payment.find().sort({ createdAt: -1 }).populate('tenant', 'name email');
    res.json({ payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ tenant: req.userId })
      .sort({ createdAt: -1 })
      .populate('tenant', 'name email');
    res.json({ payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can submit payments' });
    }
    const { amount, paymentType, billingPeriod, method, referenceId } = req.body;
    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }
    const payment = await Payment.create({
      tenant: req.userId,
      amount,
      paymentType: paymentType || 'rent',
      billingPeriod: billingPeriod || '',
      method: method || 'upi',
      referenceId: referenceId || '',
      status: 'pending'
    });
    const populated = await payment.populate('tenant', 'name email');
    res.status(201).json({ message: 'Payment submitted successfully', payment: populated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { status, adminReply } = req.body;
    const update = {};
    if (status) {
      update.status = status;
    }
    if (adminReply !== undefined) {
      update.adminReply = adminReply;
    }
    const payment = await Payment.findByIdAndUpdate(req.params.id, update, {
      new: true
    }).populate('tenant', 'name email');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json({ message: 'Payment updated successfully', payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
