// Auto-runs schema.sql on first startup
const fs   = require('fs');
const path = require('path');
const { db } = require('../config/database');
const logger = require('./logger');

async function runSchema() {
  try {
    // Check if tables already exist
    const { rows } = await db.query(`
      SELECT COUNT(*) FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    `);

    if (parseInt(rows[0].count) > 0) {
      logger.info('Database tables already exist — skipping schema setup');
      return;
    }

    logger.info('First run detected — setting up database schema...');

    // Read schema file
    const schemaPath = path.join(__dirname, '../../schema.sql');
    if (!fs.existsSync(schemaPath)) {
      logger.warn('schema.sql not found at ' + schemaPath);
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split and run each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await db.query(statement + ';');
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          logger.warn('Schema statement warning: ' + err.message.substring(0, 100));
        }
      }
    }

    logger.info('✅ Database schema setup complete!');
    logger.info('✅ Default admin created — username: admin, password: admin123');

  } catch (err) {
    logger.error('Schema setup error: ' + err.message);
  }
}

module.exports = runSchema;
