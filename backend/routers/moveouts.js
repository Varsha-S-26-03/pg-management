const express = require('express');
const authMiddleware = require('../middleware/auth');
const MoveOutNotice = require('../models/MoveOutNotice');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { moveOutDate, reason } = req.body;
    if (!moveOutDate) {
      return res.status(400).json({ message: 'Move-out date is required' });
    }
    const existing = await MoveOutNotice.findOne({ user: req.userId, status: { $in: ['submitted', 'approved'] } });
    if (existing) {
      return res.status(400).json({ message: 'An active move-out notice already exists' });
    }
    const notice = await MoveOutNotice.create({
      user: req.userId,
      moveOutDate: new Date(moveOutDate),
      reason: reason || ''
    });
    res.status(201).json({ message: 'Move-out notice submitted', notice });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const notice = await MoveOutNotice.findOne({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ notice });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const notice = await MoveOutNotice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }
    notice.status = status;
    await notice.save();
    res.json({ message: 'Status updated', notice });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
