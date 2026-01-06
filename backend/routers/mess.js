const express = require('express');
const MessMenu = require('../models/MessMenu');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get current week's mess menu
router.get('/menu', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));

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

// Create/update mess menu (admin only)
router.post('/menu', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { date, breakfast, lunch, dinner, snacks } = req.body;

    const menuItem = await MessMenu.findOneAndUpdate(
      { date: new Date(date) },
      {
        breakfast,
        lunch,
        dinner,
        snacks,
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

module.exports = router;
