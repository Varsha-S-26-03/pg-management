const express = require('express');
const Tenant = require('../models/Tenant');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get list of tenants (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Optionally, filter by createdBy: req.userId
    const tenants = await Tenant.find({}).sort({ createdAt: -1 });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a tenant (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, email, phone, roomNumber, idType, idNumber } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const tenant = new Tenant({
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      roomNumber: roomNumber ? roomNumber.trim() : undefined,
      idType: idType || undefined,
      idNumber: idNumber ? idNumber.trim() : undefined,
      createdBy: req.userId
    });

    await tenant.save();
    res.status(201).json({ message: 'Tenant created', tenant });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a tenant (protected, admin-only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admins only' });
    }

    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    await Tenant.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tenant removed', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
