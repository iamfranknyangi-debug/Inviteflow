// ============================================================
//  Storage Service — S3 / Cloudinary abstraction
//  src/services/storage.service.js
// ============================================================
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const path   = require('path');
const logger = require('../utils/logger');

let s3Client = null;

function getS3() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'af-south-1',
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

/**
 * Upload a buffer to storage and return the public URL.
 * Falls back to local filesystem if storage is not configured.
 */
exports.uploadBuffer = async (buffer, key, contentType = 'application/octet-stream') => {
  if (!process.env.AWS_ACCESS_KEY_ID) {
    return uploadLocalFallback(buffer, key);
  }

  const s3 = getS3();
  const bucket = process.env.AWS_S3_BUCKET || 'inviteflow-assets';

  await s3.send(new PutObjectCommand({
    Bucket:      bucket,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
    ACL:         'public-read',
  }));

  const region = process.env.AWS_REGION || 'af-south-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

/**
 * Upload from a local file path (e.g. multer disk storage)
 */
exports.uploadFile = async (filePath, key, contentType) => {
  const fs     = require('fs');
  const buffer = fs.readFileSync(filePath);
  return exports.uploadBuffer(buffer, key, contentType);
};

/**
 * Local fallback — saves to /uploads directory and returns a local URL
 */
async function uploadLocalFallback(buffer, key) {
  const fs   = require('fs');
  const dir  = path.join(process.cwd(), 'uploads', path.dirname(key));
  const file = path.join(process.cwd(), 'uploads', key);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, buffer);

  const base = process.env.APP_URL || 'http://localhost:5000';
  return `${base}/uploads/${key}`;
}
