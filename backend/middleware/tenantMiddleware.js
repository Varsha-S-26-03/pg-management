const jwt = require('jsonwebtoken');
const User = require('../models/User');

const tenantMiddleware = async (req, res, next) => {
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
      const user = await User.findById(req.userId).select('name email role status moveOutDate');
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
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
      
      // Check if user is a tenant
      if (user.role !== 'tenant') {
        return res.status(403).json({ message: 'Access denied. Tenant privileges required.' });
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

module.exports = tenantMiddleware;