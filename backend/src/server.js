// ============================================================
//  InviteFlow — Express Server Entry Point
//  src/server.js
// ============================================================
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const { db }     = require('./config/database');
const logger     = require('./utils/logger');
const routes     = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}));

// ── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10 });
app.use('/api/auth', authLimiter);

// ── General Middleware ────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) }}));

// ── Static Files ──────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ── Health Check ──────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} — ${err.message}`, { stack: err.stack });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message, errors: err.details });
  }
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({ success: false, message: 'Record already exists' });
  }
  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({ success: false, message: 'Referenced record not found' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start Server ──────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`🚀 InviteFlow API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => { logger.info('Server closed.'); process.exit(0); });
});

module.exports = app;
