const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    // Attach user object for role checks
    try {
      const user = await User.findById(req.userId).select('name email role');
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      req.user = user;
    } catch (fetchErr) {
      return res.status(500).json({ message: 'Server error' });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
