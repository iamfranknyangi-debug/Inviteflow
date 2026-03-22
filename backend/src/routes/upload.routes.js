// src/routes/upload.routes.js
const express = require('express');
const router  = express.Router();
const upload  = require('../middleware/upload');
const { uploadBuffer } = require('../services/storage.service');
const path = require('path');

// Generic image upload
router.post('/image', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const ext = path.extname(req.file.originalname) || '.jpg';
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const url = await uploadBuffer(req.file.buffer, key, req.file.mimetype);
    res.json({ success: true, data: { url, key, size: req.file.size } });
  } catch (err) { next(err); }
});

module.exports = router;
