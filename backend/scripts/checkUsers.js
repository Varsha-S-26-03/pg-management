require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const checkUsers = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log('\n=== Checking Users in Database ===\n');
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Collection: users\n`);
    
    // Count all users
    const userCount = await User.countDocuments();
    console.log(`Total users: ${userCount}\n`);
    
    if (userCount === 0) {
      console.log('⚠️  No users found in database!');
    } else {
      // Get all users
      const users = await User.find().select('name email role createdAt');
      console.log('Users in database:');
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Created: ${user.createdAt}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkUsers();

