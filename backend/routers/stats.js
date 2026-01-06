const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const PendingTenant = require('../models/PendingTenant');

router.get('/admin', authMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingApprovals = await PendingTenant.countDocuments();
    const approvedTenants = await User.countDocuments({ role: 'tenant', approved: true });
    const totalOwners = await User.countDocuments({ role: 'owner' });

    const occupiedBeds = await Tenant.countDocuments();
    const totalRevenue = await Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const balance = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    res.json({
      totalUsers,
      pendingApprovals,
      approvedTenants,
      totalOwners,
      occupiedBeds,
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
