const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const PendingTenant = require('../models/PendingTenant');
const Complaint = require('../models/Complaint');

router.get('/admin', authMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingApprovals = await PendingTenant.countDocuments();
    const approvedTenants = await User.countDocuments({ role: 'tenant', approved: true });
    const totalOwners = await User.countDocuments({ role: 'owner' });

    // Total tenants should include both approved tenants and pending approvals
    const totalTenants = approvedTenants + pendingApprovals;
    
    // Count occupied beds by summing up occupied field from all rooms
    const rooms = await Room.find({});
    const occupiedBeds = rooms.reduce((total, room) => total + (room.occupied || 0), 0);
    
    // Calculate total beds (sum of all room capacities)
    const totalBeds = rooms.reduce((total, room) => total + (room.capacity || 0), 0);
    
    // Calculate vacant beds
    const vacantBeds = totalBeds - occupiedBeds;
    
    // Count available rooms
    const availableRooms = rooms.filter(room => room.status === 'available').length;
    
    // Count complaint statistics
    const totalComplaints = await Complaint.countDocuments();
    const pendingComplaints = await Complaint.countDocuments({ status: 'pending' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'in-progress' });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });
    
    const totalRevenue = await Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const balance = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    res.json({
      totalTenants,
      pendingApprovals,
      approvedTenants,
      totalOwners,
      occupiedBeds,
      vacantBeds,
      availableRooms,
      totalBeds,
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      totalRevenue: balance,
      pendingPayments,
      balance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
