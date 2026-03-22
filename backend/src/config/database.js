// ============================================================
//  Database Configuration — PostgreSQL connection pool
//  src/config/database.js
// ============================================================
const { Pool } = require('pg');
const logger   = require('../utils/logger');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'inviteflow',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  min:      parseInt(process.env.DB_POOL_MIN) || 2,
  max:      parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => logger.debug('New DB client connected'));
pool.on('error',  (err) => logger.error('Idle DB client error', err));

// Wrapped query helper with automatic logging
const db = {
  query: async (text, params) => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      if (duration > 500) logger.warn('Slow query detected', { text, duration });
      return result;
    } catch (err) {
      logger.error('Database query error', { text, params, error: err.message });
      throw err;
    }
  },

  // Transaction helper
  transaction: async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  getClient: () => pool.connect(),
};

module.exports = { db, pool };
