const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get pending tenant signups (admin only)
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.userId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admins only' });
    }

    const pending = await User.find({ role: 'tenant', approved: false }).select('-password');
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve a tenant signup (admin only)
router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.userId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admins only' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.approved = true;
    await user.save();

    // Create a corresponding tenant record so it appears in Tenants list
    try {
      const Tenant = require('../models/Tenant');
      await Tenant.create({
        name: user.name,
        email: user.email,
        phone: user.phone || undefined,
        idType: user.idType || undefined,
        idNumber: user.idNumber || undefined,
        createdBy: req.userId
      });
    } catch (tErr) {
      console.error('Error creating tenant on approval:', tErr);
    }

    res.json({ message: 'User approved', user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject/Delete a pending tenant (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.userId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admins only' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;