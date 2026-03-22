// ============================================================
//  Cards Controller — invitation card image generation
//  src/controllers/cards.controller.js
// ============================================================
const { createCanvas, loadImage } = require('canvas');
const QRCode  = require('qrcode');
const jwt     = require('jsonwebtoken');
const { db }  = require('../config/database');
const { uploadBuffer } = require('../services/storage.service');
const logger  = require('../utils/logger');

// ── GET /api/cards/:eventId ───────────────────────────────────
exports.getCard = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM invitation_cards WHERE event_id=$1', [req.params.eventId]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) { next(err); }
};

// ── POST /api/cards/:eventId ──────────────────────────────────
exports.upsertCard = async (req, res, next) => {
  try {
    const {
      template_type, overlay_color, overlay_opacity, title_text,
      subtitle_text, body_message, footer_text, font_family, primary_color, text_color,
    } = req.body;

    const { rows } = await db.query(`
      INSERT INTO invitation_cards
        (event_id, template_type, overlay_color, overlay_opacity, title_text,
         subtitle_text, body_message, footer_text, font_family, primary_color, text_color)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (event_id) DO UPDATE SET
        template_type=$2, overlay_color=$3, overlay_opacity=$4, title_text=$5,
        subtitle_text=$6, body_message=$7, footer_text=$8, font_family=$9,
        primary_color=$10, text_color=$11, updated_at=NOW()
      RETURNING *`,
      [req.params.eventId, template_type||'custom', overlay_color||'#000000',
       overlay_opacity||0.4, title_text, subtitle_text, body_message,
       footer_text, font_family||'sans-serif', primary_color||'#d4a843', text_color||'#ffffff']
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ── POST /api/cards/:eventId/background ──────────────────────
exports.uploadBackground = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
    const url = await uploadBuffer(req.file.buffer, `cards/${req.params.eventId}-bg.jpg`, req.file.mimetype);
    await db.query('UPDATE invitation_cards SET bg_image_url=$1 WHERE event_id=$2', [url, req.params.eventId]);
    res.json({ success: true, data: { bg_image_url: url } });
  } catch (err) { next(err); }
};

// ── POST /api/cards/:eventId/preview ─────────────────────────
exports.generatePreview = async (req, res, next) => {
  try {
    const { guest_name = 'Guest Name' } = req.body;
    const { rows: cardRows } = await db.query(
      'SELECT ic.*, e.name,e.event_date,e.event_time,e.venue_name FROM invitation_cards ic JOIN events e ON e.id=ic.event_id WHERE ic.event_id=$1',
      [req.params.eventId]
    );
    const card = cardRows[0];
    if (!card) return res.status(404).json({ success: false, message: 'Card design not found' });

    const buffer = await renderCard(card, guest_name, null);
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) { next(err); }
};

// ── POST /api/cards/:eventId/generate-all ────────────────────
exports.generateAllCards = async (req, res, next) => {
  try {
    const { rows: cardRows } = await db.query(
      'SELECT ic.*, e.name,e.event_date,e.event_time,e.venue_name FROM invitation_cards ic JOIN events e ON e.id=ic.event_id WHERE ic.event_id=$1',
      [req.params.eventId]
    );
    const card = cardRows[0];
    if (!card) return res.status(404).json({ success: false, message: 'Card design not found' });

    const { rows: guests } = await db.query(
      'SELECT g.id, g.full_name, qr.token FROM guests g LEFT JOIN qr_codes qr ON qr.guest_id=g.id WHERE g.event_id=$1',
      [req.params.eventId]
    );

    let generated = 0;
    for (const guest of guests) {
      try {
        const buffer = await renderCard(card, guest.full_name, guest.token);
        const url = await uploadBuffer(buffer, `cards/generated/${req.params.eventId}/${guest.id}.png`, 'image/png');
        generated++;
        logger.debug(`Card generated for guest ${guest.id}: ${url}`);
      } catch (e) { logger.warn(`Card gen failed for guest ${guest.id}`, e.message); }
    }

    res.json({ success: true, message: `Generated ${generated}/${guests.length} invitation cards` });
  } catch (err) { next(err); }
};

// ── Internal: render card to PNG buffer ──────────────────────
async function renderCard(card, guestName, qrToken) {
  const W = 1200, H = 800;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // Background
  if (card.bg_image_url) {
    try {
      const img = await loadImage(card.bg_image_url);
      ctx.drawImage(img, 0, 0, W, H);
    } catch {
      ctx.fillStyle = '#0d1520';
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    // Default elegant dark gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0a0c10');
    grad.addColorStop(1, '#1a1035');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative circles
    ctx.strokeStyle = 'rgba(212,168,67,0.08)';
    ctx.lineWidth = 1;
    for (const [cx, cy, r] of [[600,400,350],[600,400,250],[600,400,150]]) {
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    }
  }

  // Overlay
  ctx.fillStyle = card.overlay_color || '#000000';
  ctx.globalAlpha = parseFloat(card.overlay_opacity) || 0.4;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Gold border frame
  ctx.strokeStyle = card.primary_color || '#d4a843';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W-80, H-80);
  ctx.strokeStyle = 'rgba(212,168,67,0.3)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(50, 50, W-100, H-100);

  // Decorative header line
  ctx.strokeStyle = card.primary_color || '#d4a843';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(200, 130); ctx.lineTo(1000, 130); ctx.stroke();

  const textColor = card.text_color || '#ffffff';
  const goldColor = card.primary_color || '#d4a843';

  // "You are cordially invited"
  ctx.font = '500 22px sans-serif';
  ctx.fillStyle = goldColor;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillText('✦  YOU ARE CORDIALLY INVITED  ✦', W/2, 110);

  // Event name (big title)
  const titleText = card.title_text || card.name || 'Special Event';
  ctx.font = `bold 72px Georgia, serif`;
  ctx.fillStyle = textColor;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 20;
  ctx.fillText(titleText, W/2, 230);
  ctx.shadowBlur = 0;

  // Sub title / tagline
  if (card.subtitle_text) {
    ctx.font = '300 26px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(card.subtitle_text, W/2, 280);
  }

  // Divider
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(300, 310); ctx.lineTo(900, 310); ctx.stroke();

  // Dear guest
  ctx.font = '300 24px Georgia, serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('Dear', W/2, 360);

  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillStyle = goldColor;
  ctx.fillText(guestName, W/2, 415);

  // Body message
  const body = card.body_message || 'We request the pleasure of your company';
  ctx.font = '300 22px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(body, W/2, 470);

  // Event details row
  ctx.font = '500 20px sans-serif';
  ctx.fillStyle = textColor;
  const details = [
    `📅  ${card.event_date || ''}`,
    `🕖  ${card.event_time || ''}`,
    `📍  ${card.venue_name || ''}`,
  ];

  // Details box
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.roundRect(200, 505, W-400, 110, 10);
  ctx.fill();

  ctx.font = '400 19px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  details.forEach((d, i) => ctx.fillText(d, W/2, 540 + i*32));

  // QR code (bottom right)
  if (qrToken) {
    try {
      const verifyUrl = `${process.env.QR_BASE_URL || 'https://inviteflow.app/verify'}/${qrToken}`;
      const qrBuffer  = await QRCode.toBuffer(verifyUrl, { width: 130, margin: 1 });
      const qrImg     = await loadImage(qrBuffer);
      // White bg box
      ctx.fillStyle = '#ffffff';
      ctx.roundRect(W-230, H-220, 150, 150, 6);
      ctx.fill();
      ctx.drawImage(qrImg, W-225, H-215, 140, 140);
      ctx.font = '400 13px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('Scan to verify', W-155, H-55);
    } catch { /* skip QR if error */ }
  }

  // Footer
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(200, H-90); ctx.lineTo(1000, H-90); ctx.stroke();

  ctx.font = '300 16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText(card.footer_text || 'Powered by InviteFlow', W/2, H-60);

  return canvas.toBuffer('image/png');
}
