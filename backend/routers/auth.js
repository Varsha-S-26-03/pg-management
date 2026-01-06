const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const PendingTenant = require('../models/PendingTenant');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/* =========================
   SIGNUP ROUTE
========================= */
router.post('/signup', async (req, res) => {
  try {
    // Check DB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    // ✅ PROPER destructuring (FIXED)
    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      age,
      occupation,
      idType,
      idNumber
    } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('Signup attempt for email:', normalizedEmail);

    // Check existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const isTenant = (role || 'tenant') === 'tenant';

    // ✅ Create user safely
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role || 'tenant',
      approved: isTenant ? false : true,
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      age: age ? parseInt(age) : undefined,
      occupation: occupation ? occupation.trim() : '',
      idType: idType || undefined,
      idNumber: idNumber ? idNumber.trim() : ''
    });

    // Save user
    await user.save();
    console.log('✅ User saved:', user.email);

    // Tenant → wait for admin approval
    if (user.role === 'tenant' && user.approved === false) {
      try {
        await PendingTenant.create({
          userId: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          address: user.address || '',
          idType: user.idType || '',
          idNumber: user.idNumber || ''
        });
      } catch (ptErr) {
        console.error('❌ Failed to create PendingTenant record:', ptErr.message);
      }
      return res.status(201).json({
        message: 'Signup successful. Pending admin approval.'
      });
    }

    // JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Signup error:', error.message);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

/* =========================
   LOGIN ROUTE
========================= */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.role === 'tenant' && user.approved === false) {
      return res.status(403).json({ message: 'Account pending admin approval' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/* =========================
   TENANT APPROVAL ROUTE
========================= */
router.patch('/approve-tenant/:tenantId', authMiddleware, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { tenantId } = req.params;

    // Support both User ID and PendingTenant ID
    let tenant = await User.findById(tenantId);
    if (!tenant) {
      const pending = await PendingTenant.findById(tenantId);
      if (!pending) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      tenant = await User.findById(pending.userId);
      if (!tenant) {
        return res.status(404).json({ message: 'User not found for pending tenant' });
      }
    }

    // Approve the tenant
    tenant.approved = true;
    await tenant.save();

    // Cleanup pending record if exists
    try {
      await PendingTenant.deleteOne({ userId: tenant._id });
    } catch (cleanupErr) {
      console.warn('⚠️ Failed to remove PendingTenant on approval:', cleanupErr.message);
    }

    res.json({ message: 'Tenant approved successfully' });
  } catch (error) {
    console.error('❌ Tenant approval error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/* =========================
   TENANT REJECTION ROUTE
========================= */
router.delete('/reject-tenant/:tenantId', authMiddleware, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { tenantId } = req.params;

    // Support both User ID and PendingTenant ID
    let tenant = await User.findById(tenantId);
    if (!tenant) {
      const pending = await PendingTenant.findById(tenantId);
      if (!pending) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      tenant = await User.findById(pending.userId);
      if (!tenant) {
        return res.status(404).json({ message: 'User not found for pending tenant' });
      }
    }

    await User.findByIdAndDelete(tenant._id);
    await PendingTenant.deleteOne({ userId: tenant._id });

    res.json({ message: 'Tenant rejected and deleted successfully' });
  } catch (error) {
    console.error('❌ Tenant rejection error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/* =========================
   PENDING TENANTS ROUTE
========================= */
router.get('/pending-tenants', authMiddleware, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Get all pending tenant records from the dedicated collection
    const pendingRecords = await PendingTenant.find({}).sort({ createdAt: -1 });

    // Also include legacy users with approved=false not yet in PendingTenant
    const legacyUsers = await User.find({ role: 'tenant', approved: false }).sort({ createdAt: -1 });
    const existingUserIds = new Set(pendingRecords.map(p => String(p.userId)));

    const legacyNotRecorded = legacyUsers
      .filter(u => !existingUserIds.has(String(u._id)))
      .map(u => ({
        _id: u._id, // allow frontend to call approve with this id; backend supports it
        userId: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        address: u.address || '',
        idType: u.idType || '',
        idNumber: u.idNumber || '',
        createdAt: u.createdAt
      }));

    const combined = [
      ...pendingRecords.map(p => ({
        _id: p._id,
        userId: p.userId,
        name: p.name,
        email: p.email,
        phone: p.phone,
        address: p.address,
        idType: p.idType,
        idNumber: p.idNumber,
        createdAt: p.createdAt
      })),
      ...legacyNotRecorded
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ tenants: combined });
  } catch (error) {
    console.error('❌ Pending tenants error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

/* =========================
   ALL USERS ROUTE
========================= */
router.get('/all-users', authMiddleware, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Find all users
    const allUsers = await User.find({});
    // Map userId -> roomNumber if assigned
    try {
      const Room = require('../models/Room');
      const rooms = await Room.find({}, 'roomNumber tenants');
      const map = new Map();
      rooms.forEach(r => {
        r.tenants.forEach(tid => {
          map.set(String(tid), r.roomNumber);
        });
      });
      const withRoom = allUsers.map(u => ({
        ...u.toObject(),
        roomNumber: map.get(String(u._id)) || null
      }));
      return res.json({ users: withRoom });
    } catch (joinErr) {
      // Fallback without roomNumber if join fails
      return res.json({ users: allUsers });
    }
  } catch (error) {
    console.error('❌ All users error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
