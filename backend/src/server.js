'use strict';

require('dotenv').config();

const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server: SocketIOServer } = require('socket.io');

const { connect: connectDB } = require('./config/database');
const { autoSeedIfEmpty } = require('./scripts/seedData');
const authRoutes = require('./routes/auth');
const grievanceRoutes = require('./routes/grievances');
const uploadRoutes = require('./routes/upload');
const patternRoutes = require('./routes/patterns');
const actionRoutes = require('./routes/actions');
const outcomeRoutes = require('./routes/outcomes');
const departmentRoutes = require('./routes/departments');
const { seedDepartments } = require('./routes/departments');
const searchRoutes = require('./routes/search');
const evaluationRoutes = require('./routes/evaluation');

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
// Static file serving for uploaded attachments
// ---------------------------------------------------------------------------
app.use('/uploads', express.static('uploads'));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/patterns', patternRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/outcomes', outcomeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/evaluation', evaluationRoutes);

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

// Make io accessible to route controllers via req.app.get('io')
app.set('io', io);

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDB();
  await seedDepartments();
  await autoSeedIfEmpty();   // seeds historical CSV data if collection is empty
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
