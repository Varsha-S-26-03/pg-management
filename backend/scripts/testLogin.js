require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../db');

const testLogin = async () => {
  try {
    // Connect to database
    await connectDB();
    
    const email = 'admin@pgmanagement.com';
    const password = 'admin123';
    
    console.log('Testing login for:', email);
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    console.log('✅ User found:');
    console.log('  - Name:', user.name);
    console.log('  - Email:', user.email);
    console.log('  - Role:', user.role);
    console.log('  - Password hash exists:', !!user.password);
    console.log('  - Password hash length:', user.password?.length);
    
    // Test password comparison
    const isMatch = await user.comparePassword(password);
    console.log('\nPassword comparison result:', isMatch ? '✅ MATCH' : '❌ NO MATCH');
    
    // Also test direct bcrypt comparison
    const directMatch = await bcrypt.compare(password, user.password);
    console.log('Direct bcrypt comparison:', directMatch ? '✅ MATCH' : '❌ NO MATCH');
    
    if (isMatch) {
      console.log('\n✅ Login test PASSED!');
    } else {
      console.log('\n❌ Login test FAILED!');
      console.log('The password stored might be incorrect.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing login:', error.message);
    console.error(error);
    process.exit(1);
  }
};

testLogin();

