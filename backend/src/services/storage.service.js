const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
exports.uploadBuffer = async (buffer, key) => {
  try {
    const dir = path.join(process.cwd(), 'uploads', path.dirname(key));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), 'uploads', key), buffer);
    return `${process.env.APP_URL || 'http://localhost:5000'}/uploads/${key}`;
  } catch (err) { logger.warn('Upload failed: ' + err.message); return null; }
};
exports.uploadFile = async (filePath, key) => exports.uploadBuffer(fs.readFileSync(filePath), key);
