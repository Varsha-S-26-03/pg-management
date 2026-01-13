const express = require('express');
const authMiddleware = require('../middleware/auth');
const MoveOutNotice = require('../models/MoveOutNotice');
const Room = require('../models/Room');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { moveOutDate, reason, noticePeriodAcknowledgement } = req.body;
    if (!moveOutDate) {
      return res.status(400).json({ message: 'Move-out date is required' });
    }
    if (!noticePeriodAcknowledgement) {
      return res.status(400).json({ message: 'Notice period acknowledgement is required' });
    }
    const existing = await MoveOutNotice.findOne({ user: req.userId, status: { $in: ['pending', 'approved'] } });
    if (existing) {
      return res.status(400).json({ message: 'An active move-out notice already exists' });
    }

    // Find user's room
    const room = await Room.findOne({ tenants: req.userId });

    const notice = await MoveOutNotice.create({
      user: req.userId,
      moveOutDate: new Date(moveOutDate),
      reason: reason || '',
      roomNumber: room ? room.roomNumber : undefined,
      noticePeriodAcknowledgement
    });
    res.status(201).json({ message: 'Move-out notice submitted', notice });
  } catch (error) {
    console.error('Error submitting move-out notice:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const notices = await MoveOutNotice.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ notices });
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

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const notices = await MoveOutNotice.find()
      .populate('user', 'name email phone roomNumber')
      .sort({ createdAt: -1 });
    res.json({ notices });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id/reply', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { adminReply } = req.body;
    if (!adminReply || adminReply.trim() === '') {
      return res.status(400).json({ message: 'Admin reply is required' });
    }
    const notice = await MoveOutNotice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }
    notice.adminReply = adminReply.trim();
    await notice.save();
    res.json({ message: 'Admin reply added', notice });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notice = await MoveOutNotice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Allow admin to delete any request
    if (req.user.role === 'admin') {
      await MoveOutNotice.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Move-out request deleted' });
    }

    // Allow tenant to delete ONLY their own PENDING requests
    if (req.user.role === 'tenant') {
      if (notice.user.toString() !== req.userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      if (!['pending', 'submitted'].includes(notice.status)) {
        return res.status(400).json({ message: 'Cannot delete processed request' });
      }
      await MoveOutNotice.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Move-out request deleted' });
    }

    return res.status(403).json({ message: 'Forbidden' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
