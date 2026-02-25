const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const authMiddleware = require('../middleware/auth');
const tenantMiddleware = require('../middleware/tenantMiddleware');

const router = express.Router();

// Get unallocated tenants (admin only)
router.get('/unallocated', authMiddleware, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.userId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admins only' });
    }

    // 1. Get all rooms and collect allocated tenant IDs
    const rooms = await Room.find({}).select('tenants');
    const allocatedTenantIds = new Set();
    rooms.forEach(room => {
      if (room.tenants && Array.isArray(room.tenants)) {
        room.tenants.forEach(id => allocatedTenantIds.add(id.toString()));
      }
    });

    // 2. Find all tenants who are approved
    const allTenants = await User.find({ role: 'tenant', approved: true }).select('name email phone');

    // 3. Filter out allocated tenants
    const unallocated = allTenants.filter(t => !allocatedTenantIds.has(t._id.toString()));

    res.json(unallocated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

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

// Move out user (change status to moved-out)
router.put('/:id/move-out', authMiddleware, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.userId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admins only' });
    }

    const { moveOutDate } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update user status and move out date
    user.status = 'moved-out';
    user.moveOutDate = moveOutDate ? new Date(moveOutDate) : new Date();
    user.isActive = false;
    
    await user.save();

    // Remove user from any rooms they are allocated to
    try {
      const rooms = await (await require('../models/Room')).find({ tenants: user._id });
      for (const room of rooms) {
        room.tenants = room.tenants.filter(t => String(t) !== String(user._id));
        room.occupied = room.tenants.length;
        room.status = room.occupied >= room.capacity ? 'occupied' : 'available';
        await room.save();
      }
    } catch (roomErr) {
      console.error('Error removing moved-out user from rooms:', roomErr);
      // Continue without failing the whole request
    }

    res.json({ 
      message: 'User moved out successfully',
      user: {
        id: user._id,
        name: user.name,
        status: user.status,
        moveOutDate: user.moveOutDate
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reactivate user (change status to active)
router.put('/:id/reactivate', authMiddleware, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.userId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admins only' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update user status
    user.status = 'active';
    user.isActive = true;
    user.moveOutDate = null;
    
    await user.save();

    res.json({ 
      message: 'User reactivated successfully',
      user: {
        id: user._id,
        name: user.name,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/me', async (req, res) => {
  // Use different middleware based on user role
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is moved out
    if (user.status === 'moved-out') {
      return res.status(403).json({ 
        message: 'Your account has been deactivated. Please contact the PG owner for assistance.',
        status: 'moved-out',
        moveOutDate: user.moveOutDate,
        userName: user.name
      });
    }
    
    // Continue with the rest of the logic...
    const effectiveJoiningDate = user.joiningDate || user.createdAt;
    const effectiveIsActive = typeof user.isActive === 'boolean' ? user.isActive : true;

    let tenantDetails = {};
    if (user.role === 'tenant') {
      const Room = require('../models/Room');
      const room = await Room.findOne({ tenants: user._id });
      tenantDetails = {
        roomNumber: room ? room.roomNumber : 'Not assigned',
        rentAmount: room ? room.price : 0
      };
    }

    const profileData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      role: user.role,
      profileRole: user.profileRole,
      joiningDate: effectiveJoiningDate,
      isActive: effectiveIsActive,
      approved: user.approved,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      profilePhoto: user.profilePhoto,
      emergencyContact: user.emergencyContact,
      status: user.status,
      moveOutDate: user.moveOutDate,
      ...tenantDetails
    };

    res.json(profileData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Keep the original /me route but rename it for backward compatibility
router.get('/me-old', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const effectiveJoiningDate = user.joiningDate || user.createdAt;
    const effectiveIsActive = typeof user.isActive === 'boolean' ? user.isActive : true;

    let tenantDetails = {};
    if (user.role === 'tenant') {
      const Room = require('../models/Room');
      const room = await Room.findOne({ tenants: user._id });
      tenantDetails = {
        roomNumber: room ? room.roomNumber : 'Not assigned',
        rentAmount: room ? room.price : 0
      };
    }

    const profileData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      role: user.role,
      profileRole: user.profileRole,
      joiningDate: effectiveJoiningDate,
      isActive: effectiveIsActive,
      approved: user.approved,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      profilePhoto: user.profilePhoto,
      emergencyContact: user.emergencyContact,
      ...tenantDetails
    };

    res.json(profileData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { phone, emergencyContact, profilePhoto, gender, dateOfBirth, profileRole } = req.body;

    const updates = {};
    if (phone !== undefined) updates.phone = phone;
    if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact;
    if (profilePhoto !== undefined) updates.profilePhoto = profilePhoto;
    if (gender !== undefined) updates.gender = gender;
    if (dateOfBirth !== undefined && dateOfBirth !== '') updates.dateOfBirth = dateOfBirth;
    if (profileRole !== undefined) updates.profileRole = profileRole;

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
