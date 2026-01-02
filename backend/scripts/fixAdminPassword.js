require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../db');

const fixAdminPassword = async () => {
  try {
    // Connect to database
    await connectDB();
    
    const email = 'admin@pgmanagement.com';
    const newPassword = 'admin123';
    
    console.log('Finding admin user...');
    const admin = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      process.exit(1);
    }
    
    console.log('✅ Admin user found:', admin.email);
    console.log('Updating password...');
    
    // Update password - this will trigger the pre-save hook to hash it
    admin.password = newPassword;
    await admin.save();
    
    console.log('✅ Password updated successfully!');
    console.log('\nNew credentials:');
    console.log('Email:', admin.email);
    console.log('Password: admin123');
    
    // Verify the password works
    const isMatch = await admin.comparePassword(newPassword);
    console.log('\nPassword verification:', isMatch ? '✅ SUCCESS' : '❌ FAILED');
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing admin password:', error.message);
    console.error(error);
    process.exit(1);
  }
};

fixAdminPassword();

