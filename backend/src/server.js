'use strict';

require('dotenv').config();

const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server: SocketIOServer } = require('socket.io');

const { connect: connectDB } = require('./config/database');
const authRoutes = require('./routes/auth');

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();

// Security headers
app.use(helmet());

// CORS
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Rate limiting for auth routes
// ---------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authLimiter, authRoutes);

// 404 fallthrough handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message;
  res.status(status).json({ success: false, message });
});

// ---------------------------------------------------------------------------
// HTTP server + Socket.IO
// ---------------------------------------------------------------------------
const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: corsOptions,
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`[Server] Campus Guardian 360 backend listening on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Failed to start:', err.message);
  process.exit(1);
});

// Export for testing
module.exports = { app, io };
