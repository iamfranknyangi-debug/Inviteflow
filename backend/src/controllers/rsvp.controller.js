// ============================================================
//  RSVP Controller
//  src/controllers/rsvp.controller.js
// ============================================================
const jwt    = require('jsonwebtoken');
const { db } = require('../config/database');

// ── GET /api/rsvp/:token  (public) ───────────────────────────
exports.getByToken = async (req, res, next) => {
  try {
    let payload;
    try { payload = jwt.verify(req.params.token, process.env.QR_SECRET || 'qr_secret'); }
    catch { return res.status(400).json({ success: false, message: 'Invalid link' }); }

    const { rows } = await db.query(`
      SELECT g.full_name, g.guest_code, e.name AS event_name, e.event_date, e.event_time,
             e.venue_name, e.venue_address, r.status, r.plus_ones, r.response_note
      FROM guests g
      JOIN events e ON e.id = g.event_id
      LEFT JOIN rsvp_responses r ON r.guest_id = g.id
      WHERE g.id = $1`, [payload.gid]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Guest not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ── POST /api/rsvp/:token  (public — guest submits) ──────────
exports.respond = async (req, res, next) => {
  try {
    let payload;
    try { payload = jwt.verify(req.params.token, process.env.QR_SECRET || 'qr_secret'); }
    catch { return res.status(400).json({ success: false, message: 'Invalid link' }); }

    const { status, plus_ones = 0, response_note = '' } = req.body;
    if (!['confirmed','declined','maybe'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be confirmed, declined, or maybe' });
    }

    const { rows } = await db.query(`
      UPDATE rsvp_responses
      SET status=$1, plus_ones=$2, response_note=$3, responded_at=NOW(), ip_address=$4
      WHERE guest_id=$5 RETURNING *`,
      [status, plus_ones, response_note, req.ip, payload.gid]
    );

    const msg = status === 'confirmed'
      ? 'Thank you! Your attendance is confirmed. 🎉'
      : status === 'declined'
      ? 'We understand. Thank you for letting us know.'
      : 'Thank you for your response!';

    res.json({ success: true, message: msg, data: rows[0] });
  } catch (err) { next(err); }
};

// ── GET /api/rsvp/event/:eventId  (admin) ────────────────────
exports.listByEvent = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT r.*, g.full_name, g.phone, g.guest_code, g.is_vip
      FROM rsvp_responses r JOIN guests g ON g.id=r.guest_id
      WHERE r.event_id=$1 ORDER BY r.responded_at DESC NULLS LAST`,
      [req.params.eventId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── PUT /api/rsvp/guest/:guestId  (admin override) ───────────
exports.updateByAdmin = async (req, res, next) => {
  try {
    const { status, plus_ones, response_note } = req.body;
    const { rows } = await db.query(`
      UPDATE rsvp_responses SET status=$1, plus_ones=$2, response_note=$3, responded_at=NOW()
      WHERE guest_id=$4 RETURNING *`,
      [status, plus_ones || 0, response_note || '', req.params.guestId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'RSVP record not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
