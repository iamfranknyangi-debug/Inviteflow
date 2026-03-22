// ============================================================
//  Storage Service — local filesystem (no AWS needed)
//  src/services/storage.service.js
// ============================================================
const path = require('path');
const fs   = require('fs');
const logger = require('../utils/logger');

/**
 * Upload a buffer — saves locally, returns a URL
 */
exports.uploadBuffer = async (buffer, key, contentType = 'application/octet-stream') => {
  try {
    const dir  = path.join(process.cwd(), 'uploads', path.dirname(key));
    const file = path.join(process.cwd(), 'uploads', key);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, buffer);
    const base = process.env.APP_URL || 'http://localhost:5000';
    return `${base}/uploads/${key}`;
  } catch (err) {
    logger.warn('File save failed:', err.message);
    return null;
  }
};

exports.uploadFile = async (filePath, key, contentType) => {
  const buffer = fs.readFileSync(filePath);
  return exports.uploadBuffer(buffer, key, contentType);
};
