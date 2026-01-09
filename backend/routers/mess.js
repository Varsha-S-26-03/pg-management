const express = require('express');
const MessMenu = require('../models/MessMenu');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get current week's mess menu (all)
router.get('/menu', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const base = new Date(now);
    const startOfWeek = new Date(base.setDate(base.getDate() - base.getDay()));
    const endBase = new Date(now);
    const endOfWeek = new Date(endBase.setDate(endBase.getDate() - endBase.getDay() + 6));

    const menu = await MessMenu.find({
      date: {
        $gte: startOfWeek,
        $lte: endOfWeek
      }
    }).sort({ date: 1 });

    res.json({ menu });
  } catch (error) {
    console.error('Error fetching mess menu:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active week's mess menu (tenants)
router.get('/menu/active', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const base = new Date(now);
    const startOfWeek = new Date(base.setDate(base.getDate() - base.getDay()));
    const endBase = new Date(now);
    const endOfWeek = new Date(endBase.setDate(endBase.getDate() - endBase.getDay() + 6));

    const menu = await MessMenu.find({
      isActive: true,
      date: { $gte: startOfWeek, $lte: endOfWeek }
    }).sort({ date: 1 });

    res.json({ menu, status: menu.length > 0 ? 'active' : 'inactive' });
  } catch (error) {
    console.error('Error fetching active mess menu:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create/update a day in the mess menu (admin only)
router.post('/menu', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { date, breakfast, lunch, dinner, isBreakfastVeg, isLunchVeg, isDinnerVeg, isActive } = req.body;
    if (!date || !breakfast || !lunch || !dinner) {
      return res.status(400).json({ message: 'date, breakfast, lunch, dinner are required' });
    }
    const d = new Date(date);
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'long' });

    const menuItem = await MessMenu.findOneAndUpdate(
      { date: d },
      {
        date: d,
        day: dayName,
        breakfast,
        lunch,
        dinner,
        isBreakfastVeg: Boolean(isBreakfastVeg),
        isLunchVeg: Boolean(isLunchVeg),
        isDinnerVeg: Boolean(isDinnerVeg),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        updatedBy: req.userId
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Mess menu updated successfully', menuItem });
  } catch (error) {
    console.error('Error updating mess menu:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a menu day (admin)
router.put('/menu/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { breakfast, lunch, dinner, isBreakfastVeg, isLunchVeg, isDinnerVeg, isActive, date } = req.body;
    const update = {
      ...(date ? { date: new Date(date), day: new Date(date).toLocaleDateString('en-IN', { weekday: 'long' }) } : {}),
      ...(breakfast !== undefined ? { breakfast } : {}),
      ...(lunch !== undefined ? { lunch } : {}),
      ...(dinner !== undefined ? { dinner } : {}),
      ...(isBreakfastVeg !== undefined ? { isBreakfastVeg: Boolean(isBreakfastVeg) } : {}),
      ...(isLunchVeg !== undefined ? { isLunchVeg: Boolean(isLunchVeg) } : {}),
      ...(isDinnerVeg !== undefined ? { isDinnerVeg: Boolean(isDinnerVeg) } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      updatedBy: req.userId,
      updatedAt: new Date()
    };
    const menuItem = await MessMenu.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!menuItem) return res.status(404).json({ message: 'Menu not found' });
    res.json({ message: 'Mess menu updated successfully', menuItem });
  } catch (error) {
    console.error('Error updating mess menu:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a menu day (admin)
router.delete('/menu/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const deleted = await MessMenu.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Menu not found' });
    res.json({ message: 'Mess menu deleted' });
  } catch (error) {
    console.error('Error deleting mess menu:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Activate/Deactivate a menu day (admin)
router.patch('/menu/:id/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive boolean required' });
    }
    const menuItem = await MessMenu.findByIdAndUpdate(
      req.params.id,
      { isActive, updatedBy: req.userId, updatedAt: new Date() },
      { new: true }
    );
    if (!menuItem) return res.status(404).json({ message: 'Menu not found' });
    res.json({ message: 'Status updated', menuItem });
  } catch (error) {
    console.error('Error updating menu status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
