const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Signup route
router.post('/signup', async (req, res) => {
  try {
    // STEP 1: Check if request body is coming
    console.log('🔍 REQ BODY:', req.body);
    console.log('🔍 REQ HEADERS:', req.headers['content-type']);
    
    // Check if database is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected. Please try again later.' });
    }

    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Normalize email (lowercase and trim) to match how it's stored
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Signup attempt for email:', normalizedEmail);

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      console.log('User already exists with email:', normalizedEmail);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    console.log('Creating user with data:', { name, email: normalizedEmail, role: role || 'tenant' });
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role || 'tenant'
    });

    console.log('Attempting to save user to database...');
    console.log('Database connection state:', mongoose.connection.readyState);
    console.log('Database name:', mongoose.connection.name);
    
    try {
      await user.save();
      console.log('✅ User saved successfully with ID:', user._id);
      console.log('User email:', user.email);
      console.log('User role:', user.role);
    } catch (saveError) {
      console.error('❌ Error saving user:', saveError);
      console.error('Error name:', saveError.name);
      console.error('Error message:', saveError.message);
      console.error('Error code:', saveError.code);
      throw saveError; // Re-throw to be caught by outer catch
    }

    // Verify user was saved by querying the database
    const savedUser = await User.findById(user._id);
    if (!savedUser) {
      console.error('❌ User was not found in database after save!');
      return res.status(500).json({ message: 'Failed to save user to database' });
    }
    console.log('✅ User verified in database:', savedUser.email);
    
    // Additional verification - count users in collection
    const userCount = await User.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);
    console.log(`📦 Database: ${mongoose.connection.name}, Collection: users`);

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Signup successful for user:', user.email);
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    // STEP 4: Catch & PRINT the real error
    console.error('❌ SIGNUP ERROR:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      console.error('Validation errors:', messages);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    // Handle duplicate key error (unique email)
    if (error.code === 11000) {
      console.error('Duplicate email error - user already exists');
      return res.status(400).json({ message: 'Email already exists' });
    }
    
    // Handle Mongoose errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      console.error('MongoDB error:', error.message);
      return res.status(500).json({ 
        message: 'Database error occurred', 
        error: error.message
      });
    }
    
    // Handle other errors - show actual error message
    res.status(500).json({ 
      message: error.message || 'Server error occurred',
      error: error.message
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Normalize email (lowercase and trim) to match how it's stored
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Login attempt for email:', normalizedEmail);

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log('User not found with email:', normalizedEmail);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('User found:', user.email, 'Role:', user.role);

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for user:', normalizedEmail);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('Password verified for user:', normalizedEmail);

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Create token
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
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user profile (protected route)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;