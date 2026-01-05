const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Signup route
router.post('/signup', async (req, res) => {
  try {
    // Check if database is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database not connected. Please try again later.' });
    }

    const { name, email, password, role, address, idType, idNumber } = req.body;

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
    console.log('Creating user with data:', { name, email: normalizedEmail, address, idType, idNumber, role: role || 'tenant' });
    const isTenant = (role || 'tenant') === 'tenant';
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      address: address ? address.trim() : undefined,
      idType: idType || undefined,
      idNumber: idNumber ? idNumber.trim() : undefined,
      password,
      role: role || 'tenant',
      approved: isTenant ? false : true
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

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // If tenant signup, do not auto-login — require admin approval
    if (user.role === 'tenant' && user.approved === false) {
      console.log('Signup pending admin approval for:', user.email);
      return res.status(201).json({ message: 'Signup successful. Pending admin approval.' });
    }

    // Create token for approved users (admins/owners or approved tenants)
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
        address: user.address,
        idType: user.idType,
        idNumber: user.idNumber,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Signup error occurred:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    
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
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
      });
    }
    
    // Handle other errors - always show error in response for debugging
    const errorMessage = error.message || 'Unknown error occurred';
    console.error('Returning error response:', errorMessage);
    res.status(500).json({ 
      message: 'Server error: ' + errorMessage,
      error: errorMessage
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

    // Prevent login for tenants not approved by admin
    if (user.role === 'tenant' && user.approved === false) {
      console.log('Login blocked — tenant pending approval:', normalizedEmail);
      return res.status(403).json({ message: 'Account pending admin approval' });
    }

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
        address: user.address,
        idType: user.idType,
        idNumber: user.idNumber,
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