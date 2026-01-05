const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI;
    
    // Fix: For mongodb+srv:// URIs, ensure no port is present
    if (mongoUri && mongoUri.startsWith('mongodb+srv://')) {
      // Simple approach: Remove port numbers that appear after @ and before / or ?
      // Pattern: @hostname:port/ or @hostname:port? or @hostname:port$
      // This preserves the rest of the URI structure
      mongoUri = mongoUri.replace(/@([^\/\?@:]+):(\d+)([\/\?]|$)/g, '@$1$3');
      
      // Also remove port from query string if present
      mongoUri = mongoUri.replace(/[?&]port=\d+/gi, '');
      mongoUri = mongoUri.replace(/\?&/, '?').replace(/&&/, '&');
    }

    const conn = await mongoose.connect(mongoUri, {
      // Connection options for better reliability
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    
    console.log(`✅ MongoDB connected successfully: ${conn.connection.host}`);
    console.log(`📊 Database name: ${conn.connection.name}`);
    console.log(`🔌 Connection state: ${conn.connection.readyState} (1 = connected)`);
    
    // Check if database name is 'test' (default) - might need to specify in URI
    if (conn.connection.name === 'test') {
      console.log('⚠️  Warning: Using default database "test". Consider specifying database name in MONGODB_URI');
    }
    
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

