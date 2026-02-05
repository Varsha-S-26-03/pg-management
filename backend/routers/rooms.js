const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Room = require('../models/Room');
const User = require('../models/User');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find().populate('tenants', 'name email');
    res.json({ rooms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a room (admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 Room creation request received');
    console.log('👤 User role:', req.user.role);
    console.log('📦 Request body:', req.body);
    
    if (req.user.role !== 'admin') {
      console.log('❌ Forbidden: User is not admin');
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const { roomNumber, type, capacity, price, floor } = req.body;
    
    const normalizeType = (val) => {
      const s = String(val || '').toLowerCase().trim();
      if (['single', '1', 'single share'].includes(s)) return 'single';
      if (['double', '2', 'two', '2 share', 'double share'].includes(s)) return 'double';
      if (['triple', '3', 'three', '3 share', 'triple share'].includes(s)) return 'triple';
      if (['dormitory', 'dorm', '4', 'four', 'many', 'multiple'].includes(s)) return 'dormitory';
      return null;
    };
    
    if (!roomNumber || !type || !capacity || price === undefined) {
      console.log('❌ Missing required fields:', { roomNumber, type, capacity, price });
      return res.status(400).json({ message: 'roomNumber, type, capacity, price are required' });
    }
    
    const exists = await Room.findOne({ roomNumber });
    if (exists) {
      console.log('❌ Room number already exists:', roomNumber);
      return res.status(409).json({ message: 'Room number already exists' });
    }
    
    const room = new Room({
      roomNumber: String(roomNumber).trim(),
      type: normalizeType(type),
      capacity: Number(capacity),
      price: Number(price),
      floor: floor !== undefined ? Number(floor) : 1,
      status: 'available',
      occupied: 0,
      tenants: [],
      createdBy: req.userId
    });
    
    if (!room.type) {
      console.log('❌ Invalid room type:', type);
      return res.status(400).json({ message: 'Invalid type. Use single/double/triple/dormitory or 1/2/3/4.' });
    }
    
    await room.save();
    console.log('✅ Room created successfully:', room.roomNumber);
    res.status(201).json({ message: 'Room created', room });
  } catch (error) {
    console.error('❌ Room creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a room (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: 'Room deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign a tenant to room (admin only)
router.post('/:id/assign', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { userId, email } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    let tenantUser = null;
    if (userId) {
      tenantUser = await User.findById(userId);
    } else if (email) {
      tenantUser = await User.findOne({ email: String(email).toLowerCase().trim() });
    }
    if (!tenantUser) return res.status(404).json({ message: 'Tenant user not found' });
    if (tenantUser.role !== 'tenant') return res.status(400).json({ message: 'User is not a tenant' });
    if (tenantUser.approved === false) return res.status(400).json({ message: 'Tenant is not approved' });

    const already = room.tenants.find(t => String(t) === String(tenantUser._id));
    if (already) return res.status(409).json({ message: 'Tenant already allocated to this room' });
    if (room.tenants.length >= room.capacity) return res.status(400).json({ message: 'Room is at full capacity' });

    room.tenants.push(tenantUser._id);
    room.occupied = room.tenants.length;
    room.status = room.occupied >= room.capacity ? 'occupied' : 'available';
    await room.save();

    const populated = await Room.findById(room._id).populate('tenants', 'name email');
    res.json({ message: 'Tenant allocated', room: populated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove a tenant from room (admin only)
router.delete('/:id/tenants/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const userId = String(req.params.userId);
    const before = room.tenants.length;
    room.tenants = room.tenants.filter(t => String(t) !== userId);
    if (room.tenants.length === before) {
      return res.status(404).json({ message: 'Tenant not in room' });
    }
    room.occupied = room.tenants.length;
    room.status = room.occupied >= room.capacity ? 'occupied' : 'available';
    await room.save();
    const populated = await Room.findById(room._id).populate('tenants', 'name email');
    res.json({ message: 'Tenant removed', room: populated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
