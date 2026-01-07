const express = require('express');
const Complaint = require('../models/Complaint');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper: check admin / warden role (here: admin or owner treated as warden)
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// ================== STUDENT / TENANT ROUTES ==================

// Create complaint (tenant)
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, priority, roomNumber } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description and category are required' });
    }

    const complaint = new Complaint({
      title,
      description,
      category,
      priority: priority || 'medium',
      roomNumber: roomNumber || '',
      submittedBy: req.userId
    });

    await complaint.save();

    res.status(201).json({ message: 'Complaint created', complaint });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get complaints for logged in student
router.get('/', auth, async (req, res) => {
  try {
    // Tenants / students: see only their own complaints
    const filter = { submittedBy: req.userId };

    const complaints = await Complaint.find(filter)
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ complaints });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete own complaint
router.delete('/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Student can delete only own complaint; admin can delete any (handled below)
    if (String(complaint.submittedBy) !== String(req.userId) &&
        (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner'))) {
      return res.status(403).json({ message: 'Not authorized to delete this complaint' });
    }

    await complaint.deleteOne();
    res.json({ message: 'Complaint deleted' });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================== ADMIN / WARDEN ROUTES ==================

// Get all complaints for admin
router.get('/admin', auth, requireAdmin, async (req, res) => {
  try {
    const complaints = await Complaint.find({})
      .populate('submittedBy', 'name email roomNumber')
      .sort({ createdAt: -1 });

    // adapt shape slightly for frontend convenience
    const mapped = complaints.map(c => ({
      ...c.toObject(),
      studentName: c.submittedBy?.name,
      studentEmail: c.submittedBy?.email,
      roomNumber: c.roomNumber || c.submittedBy?.roomNumber
    }));

    res.json({ complaints: mapped });
  } catch (error) {
    console.error('Error fetching admin complaints:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update complaint status / admin response
router.patch('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { status, response } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (status) {
      complaint.status = status;
      // If using resolution.status mapping, adjust here; we keep it simple
      if ((status === 'resolved' || status === 'closed') && !complaint.resolution?.resolvedAt) {
        complaint.resolution = complaint.resolution || {};
        complaint.resolution.resolvedAt = new Date();
        complaint.resolution.resolvedBy = req.userId;
      }
    }

    if (typeof response === 'string') {
      complaint.resolution = complaint.resolution || {};
      complaint.resolution.description = response;
      if (!complaint.resolution.resolvedBy) {
        complaint.resolution.resolvedBy = req.userId;
      }
      if (!complaint.resolution.resolvedAt) {
        complaint.resolution.resolvedAt = new Date();
      }
    }

    await complaint.save();

    res.json({ message: 'Complaint updated', complaint });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

