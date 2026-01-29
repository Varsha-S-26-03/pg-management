const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routers/auth');
const statsRoutes = require('./routers/stats');
const roomRoutes = require('./routers/rooms');
const paymentRoutes = require('./routers/payments');
const tenantRoutes = require('./routers/tenants');
const usersRoutes = require('./routers/users');
const complaintRoutes = require('./routers/complaints');
const moveOutRoutes = require('./routers/moveouts');
const roomRequestRoutes = require('./routers/roomRequests');
const messRoutes = require('./routers/mess');
const feedbackRoutes = require('./routers/feedback');
const noticeRoutes = require('./routers/notices');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Serve static files from public directory
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/moveouts', moveOutRoutes);
app.use('/api/room-requests', roomRequestRoutes);
app.use('/api/mess', messRoutes);
app.use('/api/feedback', feedbackRoutes);
// Attach io to requests for real-time notifications
app.use('/api/notices', (req, res, next) => {
  req.io = io;
  next();
}, noticeRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  
  socket.on('join', (userId) => {
    console.log(`👤 User ${userId} joined room`);
    socket.join(userId);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

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

// Test endpoint to verify request body parsing
app.post('/test', (req, res) => {
  console.log('🔍 TEST REQ BODY:', req.body);
  res.json({ 
    message: 'Request received',
    body: req.body,
    contentType: req.headers['content-type']
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
    
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ API available at http://localhost:${PORT}`);
      console.log(`✅ Socket.io server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }
};

startServer();
