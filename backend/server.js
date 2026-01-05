const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./db');
const authRoutes = require('./routers/auth');
const tenantRoutes = require('./routers/tenants');
const usersRoutes = require('./routers/users');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', usersRoutes);

// Health check route
app.get('/', (req, res) => {
  const mongoose = require('mongoose');
  res.json({ 
    message: 'PG Management System API is running',
    dbConnected: mongoose.connection.readyState === 1,
    dbName: mongoose.connection.name,
    dbHost: mongoose.connection.host
  });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Check required environment variables
    if (!process.env.MONGODB_URI) {
      console.error('❌ ERROR: MONGODB_URI is not set in .env file');
      process.exit(1);
    }
    
    if (!process.env.JWT_SECRET) {
      console.error('❌ ERROR: JWT_SECRET is not set in .env file');
      console.error('Please add JWT_SECRET=your-secret-key to your .env file');
      process.exit(1);
    }
    
    console.log('✅ Environment variables checked');
    
    await connectDB();
    console.log('✅ Database connection established');
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ API available at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }
};

startServer();