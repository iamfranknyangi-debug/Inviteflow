require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const { db }      = require('./config/database');
const logger      = require('./utils/logger');
const runSchema   = require('./utils/runSchema');
const routes      = require('./routes');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}));
app.use(rateLimit({ windowMs: 15*60*1000, max: 200 }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));
app.use('/uploads', express.static('uploads'));

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  logger.error(err.message);
  if (err.code === '23505') return res.status(409).json({ success: false, message: 'Record already exists' });
  if (err.code === '23503') return res.status(400).json({ success: false, message: 'Referenced record not found' });
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

// Start server and auto-run schema
app.listen(PORT, async () => {
  logger.info(`🚀 InviteFlow API running on port ${PORT}`);
  // Auto-setup database on first run
  await runSchema();
});

module.exports = app;
