const QRCode = require('qrcode');
const jwt    = require('jsonwebtoken');
const { db } = require('../config/database');
const { uploadBuffer } = require('../services/storage.service');
const logger = require('../utils/logger');

exports.getCard = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM invitation_cards WHERE event_id=$1', [req.params.eventId]);
    res.json({ success: true, data: rows[0] || null });
  } catch (err) { next(err); }
};

exports.upsertCard = async (req, res, next) => {
  try {
    const { title_text, subtitle_text, body_message, footer_text, primary_color, text_color, template_type } = req.body;
    const { rows } = await db.query(`
      INSERT INTO invitation_cards (event_id, template_type, title_text, subtitle_text, body_message, footer_text, primary_color, text_color)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (event_id) DO UPDATE SET
        template_type=$2, title_text=$3, subtitle_text=$4, body_message=$5,
        footer_text=$6, primary_color=$7, text_color=$8, updated_at=NOW()
      RETURNING *`,
      [req.params.eventId, template_type||'custom', title_text, subtitle_text, body_message, footer_text, primary_color||'#d4a843', text_color||'#ffffff']
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.uploadBackground = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image' });
    const url = await uploadBuffer(req.file.buffer, `cards/${req.params.eventId}-bg.jpg`);
    await db.query('UPDATE invitation_cards SET bg_image_url=$1 WHERE event_id=$2', [url, req.params.eventId]);
    res.json({ success: true, data: { bg_image_url: url } });
  } catch (err) { next(err); }
};

exports.generatePreview = async (req, res, next) => {
  try {
    const { guest_name = 'Guest Name' } = req.body;
    const { rows } = await db.query(
      'SELECT ic.*, e.name, e.event_date, e.event_time, e.venue_name FROM invitation_cards ic JOIN events e ON e.id=ic.event_id WHERE ic.event_id=$1',
      [req.params.eventId]
    );
    const c = rows[0];
    if (!c) return res.status(404).json({ success: false, message: 'Card not found' });
    const gold = c.primary_color || '#d4a843';
    const svg = `<svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0a0c10"/><stop offset="100%" stop-color="#1a1035"/>
      </linearGradient></defs>
      <rect width="800" height="500" fill="url(#bg)"/>
      <rect x="20" y="20" width="760" height="460" fill="none" stroke="${gold}" stroke-width="1.5" rx="8"/>
      <text x="400" y="72" text-anchor="middle" font-family="Georgia" font-size="11" fill="${gold}">YOU ARE CORDIALLY INVITED</text>
      <text x="400" y="160" text-anchor="middle" font-family="Georgia" font-size="38" font-weight="bold" fill="white">${(c.title_text||c.name||'Event').replace(/[<>&"]/g,'')}</text>
      <text x="400" y="260" text-anchor="middle" font-family="Georgia" font-size="16" fill="rgba(255,255,255,0.7)">Dear</text>
      <text x="400" y="300" text-anchor="middle" font-family="Georgia" font-size="28" font-weight="bold" fill="${gold}">${guest_name.replace(/[<>&"]/g,'')}</text>
      <text x="400" y="350" text-anchor="middle" font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.65)">${(c.body_message||'').replace(/[<>&"]/g,'')}</text>
      <text x="400" y="390" text-anchor="middle" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.5)">Date: ${c.event_date||''} | Time: ${c.event_time||''} | ${(c.venue_name||'').replace(/[<>&"]/g,'')}</text>
    </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (err) { next(err); }
};

exports.generateAllCards = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT COUNT(*) FROM guests WHERE event_id=$1', [req.params.eventId]);
    res.json({ success: true, message: `${rows[0].count} cards ready on demand` });
  } catch (err) { next(err); }
};
