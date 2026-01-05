require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../db');

const createAdmin = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Get admin details from command line arguments or use defaults
    const args = process.argv.slice(2);
    const adminData = {
      name: args[0] || 'Admin User',
      email: args[1] || 'admin@pgmanagement.com',
      password: args[2] || 'admin123',
      address: args[3] || '',
      idType: args[4] || '',
      idNumber: args[5] || '',
      role: 'admin'
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    // Create admin user - password will be hashed by pre-save hook
    // We need to bypass the pre-save hook since we're using create()
    // So we'll use save() instead which properly triggers the hook
    const admin = new User({
      name: adminData.name,
      email: adminData.email.toLowerCase().trim(),
      address: adminData.address ? adminData.address.trim() : undefined,
      idType: adminData.idType || undefined,
      idNumber: adminData.idNumber ? adminData.idNumber.trim() : undefined,
      password: adminData.password, // Will be hashed by pre-save hook
      role: 'admin'
    });
    
    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('Email:', admin.email);
    console.log('Password: admin123');
    console.log('Role:', admin.role);
    console.log('\n⚠️  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }
};

createAdmin();

