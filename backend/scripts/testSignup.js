require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../db');

const testSignup = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log('\n=== Testing User Creation ===\n');
    
    const testUserData = {
      name: 'Test User',
      email: 'test@example.com',
      address: '123 Test St, Test City',
      idType: 'aadhaar',
      idNumber: '123456789012',
      password: 'test123',
      role: 'tenant'
    };
    
    // Check if test user exists
    const existing = await User.findOne({ email: testUserData.email });
    if (existing) {
      console.log('Test user already exists, deleting...');
      await User.deleteOne({ email: testUserData.email });
    }
    
    console.log('Creating test user...');
    const user = new User(testUserData);
    
    console.log('Saving user...');
    await user.save();
    
    console.log('✅ User saved successfully!');
    console.log('User ID:', user._id);
    console.log('User email:', user.email);
    console.log('User role:', user.role);
    
    // Verify by querying
    const found = await User.findById(user._id);
    if (found) {
      console.log('✅ User found in database!');
      console.log('Verified email:', found.email);
    } else {
      console.log('❌ User NOT found in database!');
    }
    
    // Count all users
    const userCount = await User.countDocuments();
    console.log(`\nTotal users in database: ${userCount}`);
    
    // Clean up - delete test user
    await User.deleteOne({ email: testUserData.email });
    console.log('✅ Test user cleaned up');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.name);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Full error:', error);
    process.exit(1);
  }
};

testSignup();

