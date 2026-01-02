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

    // Ensure database name is specified in URI
    // If no database name is in URI, add 'pgmanagement' as default
    if (!mongoUri.includes('/') || mongoUri.split('?')[0].endsWith('/')) {
      const separator = mongoUri.includes('?') ? '?' : '';
      const queryString = mongoUri.includes('?') ? mongoUri.split('?')[1] : '';
      mongoUri = mongoUri.split('?')[0].replace(/\/$/, '') + '/pgmanagement' + separator + queryString;
      console.log('📝 Added database name "pgmanagement" to connection string');
    }
    
    const conn = await mongoose.connect(mongoUri, {
      // Connection options for better reliability
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    
    console.log(`✅ MongoDB connected successfully: ${conn.connection.host}`);
    console.log(`📊 Database name: ${conn.connection.name}`);
    console.log(`🔌 Connection state: ${conn.connection.readyState} (1 = connected)`);
    console.log(`📦 Collection will be: users`);
    
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

