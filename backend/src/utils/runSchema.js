const fs     = require('fs');
const path   = require('path');
const { db } = require('../config/database');
const logger = require('./logger');

async function runSchema() {
  try {
    logger.info('Checking database tables...');

    // Check if users table exists
    const { rows } = await db.query(`
      SELECT COUNT(*) FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    `);

    if (parseInt(rows[0].count) > 0) {
      logger.info('✅ Database tables already exist');
      return true;
    }

    logger.info('🔧 Creating database tables for first time...');

    // Find schema file
    const paths = [
      path.join(__dirname, '../../schema.sql'),
      path.join(__dirname, '../../../database/schema.sql'),
      path.join(process.cwd(), 'schema.sql'),
    ];

    let schemaContent = null;
    for (const p of paths) {
      if (fs.existsSync(p)) {
        schemaContent = fs.readFileSync(p, 'utf8');
        logger.info('Found schema at: ' + p);
        break;
      }
    }

    if (!schemaContent) {
      logger.error('❌ schema.sql not found! Searched: ' + paths.join(', '));
      return false;
    }

    // Execute the full schema as one block
    await db.query(schemaContent);
    logger.info('✅ Database schema created successfully!');
    logger.info('✅ Default admin: username=admin, password=admin123');
    return true;

  } catch (err) {
    // If some parts already exist, that's fine
    if (err.message.includes('already exists')) {
      logger.info('✅ Tables already exist (some created previously)');
      return true;
    }
    logger.error('Schema error: ' + err.message);

    // Try running statements one by one as fallback
    try {
      logger.info('Trying statement-by-statement fallback...');
      const schemaPath = path.join(__dirname, '../../schema.sql');
      if (fs.existsSync(schemaPath)) {
        const content = fs.readFileSync(schemaPath, 'utf8');
        const statements = content
          .replace(/--.*$/gm, '')
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 10);

        let success = 0;
        for (const stmt of statements) {
          try {
            await db.query(stmt);
            success++;
          } catch (e) {
            if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
              logger.warn('Statement skipped: ' + e.message.substring(0, 80));
            }
          }
        }
        logger.info(`Schema fallback: ${success}/${statements.length} statements executed`);
      }
    } catch (fallbackErr) {
      logger.error('Fallback also failed: ' + fallbackErr.message);
    }
  }
}

module.exports = runSchema;
