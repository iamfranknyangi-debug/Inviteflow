const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host:     process.env.DB_HOST || 'localhost',
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'inviteflow',
        user:     process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      }
);

pool.on('error', (err) => logger.error('DB pool error', err.message));

const db = {
  query: async (text, params) => {
    try { return await pool.query(text, params); }
    catch (err) { logger.error('Query error', { text, error: err.message }); throw err; }
  },
  transaction: async (cb) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await cb(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally { client.release(); }
  }
};

module.exports = { db };
```
