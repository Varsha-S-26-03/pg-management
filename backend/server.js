const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routers/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
// #region agent log
let mongoUri = process.env.MONGODB_URI;
const originalUri = mongoUri;
// Fix: For mongodb+srv:// URIs, ensure no port is present and use proper connection options
if (mongoUri && mongoUri.startsWith('mongodb+srv://')) {
  // Try to manually parse and reconstruct URI without any port
  // Format: mongodb+srv://[username:password@]hostname[/database][?options]
  const uriMatch = mongoUri.match(/^(mongodb\+srv:\/\/)(.*?)(@)?([^\/\?@]+)([\/\?].*)?$/);
  if (uriMatch) {
    const protocol = uriMatch[1];
    const beforeHost = uriMatch[2] || ''; // username:password or empty
    const atSymbol = uriMatch[3] || '';
    let hostname = uriMatch[4] || '';
    const pathAndQuery = uriMatch[5] || '';
    
    // Remove any port from hostname (pattern: hostname:port)
    hostname = hostname.split(':')[0];
    
    // Reconstruct URI
    if (beforeHost && atSymbol) {
      mongoUri = protocol + beforeHost + '@' + hostname + pathAndQuery;
    } else {
      mongoUri = protocol + hostname + pathAndQuery;
    }
    
    // Remove port from query string
    mongoUri = mongoUri.replace(/[?&]port=\d+/gi, '');
    mongoUri = mongoUri.replace(/\?&/, '?').replace(/&&/, '&');
  } else {
    // Fallback: aggressive port removal
    mongoUri = mongoUri.replace(/@([^\/\?@:]+):(\d+)/g, '@$1');
    mongoUri = mongoUri.replace(/([^:\/]+):(\d+)([\/\?]|$)/g, '$1$3');
  }
  fetch('http://127.0.0.1:7243/ingest/1b30c496-8686-4eb5-9fe0-b0400a056038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:15',message:'MongoDB URI reconstruction',data:{originalLength:originalUri?.length,fixedLength:mongoUri?.length,wasModified:originalUri!==mongoUri,originalSanitized:originalUri?.replace(/:[^:@]+@/, ':****@'),fixedSanitized:mongoUri?.replace(/:[^:@]+@/, ':****@')},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix4',hypothesisId:'FIX4'})}).catch(()=>{});
}
// #endregion
// Leave connection options empty; modern MongoDB driver handles parsing internally
const connectOptions = {};
mongoose.connect(mongoUri, connectOptions)
// #region agent log
.then(() => {
  fetch('http://127.0.0.1:7243/ingest/1b30c496-8686-4eb5-9fe0-b0400a056038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:22',message:'MongoDB connection success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
  console.log('MongoDB connected successfully');
})
// #endregion
// #region agent log
.catch((err) => {
  fetch('http://127.0.0.1:7243/ingest/1b30c496-8686-4eb5-9fe0-b0400a056038',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:26',message:'MongoDB connection error after fix',data:{errorName:err.name,errorMessage:err.message},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
  console.error('MongoDB connection error:', err);
});
// #endregion

// Routes
app.use('/api/auth', authRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'PG Management System API is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});