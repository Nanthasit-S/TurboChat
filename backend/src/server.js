// src/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { initializeSocket } = require('./socket/socketHandler');

// Import Routes
const authRoutes = require('./routes/auth');
const socialRoutes = require('./routes/social');
const postRoutes = require('./routes/posts');
const chatRoutes = require('./routes/chat');
const groupRoutes = require('./routes/groups');
const conversationRoutes = require('./routes/conversations'); // ++ เพิ่มบรรทัดนี้

// --- Basic Setup ---
const PORT = process.env.PORT || 4001;
const app = express();
const server = http.createServer(app);

// --- Initialize Socket.IO ---
const io = initializeSocket(server);

// --- Middlewares ---
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware to attach io to each request
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});


// --- API Routes ---
app.use('/api', authRoutes); // Full paths will be e.g. /api/register
app.use('/api', socialRoutes);
app.use('/api', postRoutes);
app.use('/api', chatRoutes);
app.use('/api/chat', chatRoutes); // Changed from '/api' to '/api/chat'
app.use('/api/groups', groupRoutes); // Base path is /api/groups
app.use('/api/conversations', conversationRoutes); // ++ เพิ่มบรรทัดนี้

// --- Health Check Route ---
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// --- Start Server ---
server.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});