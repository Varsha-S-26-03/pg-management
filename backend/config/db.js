const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const nonSrv = process.env.MONGODB_URI_NON_SRV;
    let mongoUri = nonSrv || process.env.MONGODB_URI;
    
    if (!nonSrv && mongoUri && mongoUri.startsWith('mongodb+srv://')) {
      mongoUri = mongoUri.replace(/@([^\/\?@:]+):(\d+)([\/\?]|$)/g, '@$1$3');
      mongoUri = mongoUri.replace(/[?&]port=\d+/gi, '');
      mongoUri = mongoUri.replace(/\?&/, '?').replace(/&&/, '&');
    }

    if (mongoUri && (!mongoUri.includes('/') || mongoUri.split('?')[0].endsWith('/'))) {
      const separator = mongoUri.includes('?') ? '?' : '';
      const queryString = mongoUri.includes('?') ? mongoUri.split('?')[1] : '';
      mongoUri = mongoUri.split('?')[0].replace(/\/$/, '') + '/pgmanagement' + separator + queryString;
      console.log('📝 Added database name "pgmanagement" to connection string');
    }
    
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB connected successfully: ${conn.connection.host}`);
      console.log(`📊 Database name: ${conn.connection.name}`);
      console.log(`🔌 Connection state: ${conn.connection.readyState} (1 = connected)`);
      console.log(`📦 Collection will be: users`);
      return conn;
    } catch (primaryErr) {
      const fallbackUri = process.env.MONGODB_URI_FALLBACK;
      if (fallbackUri) {
        try {
          const fbConn = await mongoose.connect(fallbackUri, {
            serverSelectionTimeoutMS: 5000,
          });
          console.log(`✅ MongoDB connected successfully (fallback): ${fbConn.connection.host}`);
          console.log(`📊 Database name: ${fbConn.connection.name}`);
          console.log(`🔌 Connection state: ${fbConn.connection.readyState} (1 = connected)`);
          console.log(`📦 Collection will be: users`);
          return fbConn;
        } catch (fbErr) {
          console.error('MongoDB fallback connection error:', fbErr.message);
          throw primaryErr;
        }
      } else {
        throw primaryErr;
      }
    }
    
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

