// ============================================================
//  QR Controller
//  src/controllers/qr.controller.js
// ============================================================
const jwt    = require('jsonwebtoken');
const QRCode = require('qrcode');
const { db } = require('../config/database');
const { uploadBuffer } = require('../services/storage.service');
const logger = require('../utils/logger');

// ── GET /api/qr/verify/:token  (public) ─────────────────────
exports.verify = async (req, res, next) => {
  try {
    let payload;
    try {
      payload = jwt.verify(req.params.token, process.env.QR_SECRET || 'qr_secret');
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid or expired QR code' });
    }

    const { rows } = await db.query(`
      SELECT g.id, g.guest_code, g.full_name, g.phone, g.is_vip, g.table_number,
             e.name AS event_name, e.event_date, e.event_time, e.venue_name, e.venue_address,
             r.status AS rsvp_status,
             a.checked_in_at,
             qr.scan_count, qr.is_active
      FROM guests  g
      JOIN events  e  ON e.id = g.event_id
      LEFT JOIN rsvp_responses r ON r.guest_id = g.id
      LEFT JOIN attendance     a ON a.guest_id = g.id
      LEFT JOIN qr_codes      qr ON qr.guest_id = g.id
      WHERE g.id = $1`, [payload.gid]
    );

    const guest = rows[0];
    if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });
    if (!guest.is_active) return res.status(403).json({ success: false, message: 'QR code has been deactivated' });

    // Increment scan count
    await db.query(
      'UPDATE qr_codes SET scan_count=scan_count+1, last_scanned_at=NOW(), last_scanned_ip=$1 WHERE guest_id=$2',
      [req.ip, guest.id]
    );

    res.json({
      success: true,
      data: {
        guest_code:    guest.guest_code,
        full_name:     guest.full_name,
        is_vip:        guest.is_vip,
        table_number:  guest.table_number,
        event_name:    guest.event_name,
        event_date:    guest.event_date,
        event_time:    guest.event_time,
        venue_name:    guest.venue_name,
        rsvp_status:   guest.rsvp_status,
        checked_in_at: guest.checked_in_at,
        scan_count:    guest.scan_count + 1,
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/qr/scan/:token  (public — marks attendance) ────
exports.scan = async (req, res, next) => {
  try {
    let payload;
    try {
      payload = jwt.verify(req.params.token, process.env.QR_SECRET || 'qr_secret');
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid or expired QR code' });
    }

    const { rows } = await db.query(
      'SELECT g.*, e.name AS event_name FROM guests g JOIN events e ON e.id=g.event_id WHERE g.id=$1',
      [payload.gid]
    );
    const guest = rows[0];
    if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });

    // Check already checked in
    const { rows: attRows } = await db.query(
      'SELECT id, checked_in_at FROM attendance WHERE guest_id=$1', [guest.id]
    );
    if (attRows[0]) {
      return res.json({
        success: true,
        already_checked_in: true,
        message: `${guest.full_name} already checked in at ${attRows[0].checked_in_at}`,
        data: { full_name: guest.full_name, checked_in_at: attRows[0].checked_in_at },
      });
    }

    // Record attendance
    await db.transaction(async (client) => {
      await client.query(`
        INSERT INTO attendance (guest_id, event_id, check_in_method, ip_address)
        VALUES ($1,$2,'qr_scan',$3)`,
        [guest.id, guest.event_id, req.ip]
      );
      await client.query(
        'UPDATE rsvp_responses SET status=$1 WHERE guest_id=$2 AND status!=\'confirmed\'',
        ['confirmed', guest.id]
      );
    });

    logger.info(`Guest checked in: ${guest.full_name} (${guest.guest_code})`);
    res.json({
      success: true,
      already_checked_in: false,
      message: `Welcome, ${guest.full_name}!`,
      data: { full_name: guest.full_name, event_name: guest.event_name, checked_in_at: new Date() },
    });
  } catch (err) { next(err); }
};

// ── POST /api/qr/generate/:guestId  (admin) ──────────────────
exports.generate = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT g.*, e.name AS event_name FROM guests g JOIN events e ON e.id=g.event_id WHERE g.id=$1',
      [req.params.guestId]
    );
    const guest = rows[0];
    if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });

    const token = jwt.sign(
      { gid: guest.id, eid: guest.event_id, code: guest.guest_code },
      process.env.QR_SECRET || 'qr_secret',
      { expiresIn: '365d' }
    );
    const verifyUrl = `${process.env.QR_BASE_URL || 'https://inviteflow.app/verify'}/${token}`;

    const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 300, margin: 2 });
    let qr_image_url = null;
    try { qr_image_url = await uploadBuffer(qrBuffer, `qr/${guest.id}.png`, 'image/png'); }
    catch (e) { logger.warn('QR upload skipped', e.message); }

    const { rows: qrRows } = await db.query(`
      INSERT INTO qr_codes (guest_id, token, qr_image_url)
      VALUES ($1,$2,$3)
      ON CONFLICT (guest_id) DO UPDATE SET token=$2, qr_image_url=$3
      RETURNING *`, [guest.id, token, qr_image_url]
    );

    res.json({ success: true, data: { ...qrRows[0], verify_url: verifyUrl } });
  } catch (err) { next(err); }
};

// ── GET /api/qr/bulk/:eventId  (generates all at once) ───────
exports.bulkGenerate = async (req, res, next) => {
  try {
    const { rows: guests } = await db.query(
      'SELECT id FROM guests WHERE event_id=$1', [req.params.eventId]
    );
    if (!guests.length) return res.status(404).json({ success:false, message:'No guests found' });

    let generated = 0;
    for (const g of guests) {
      try {
        req.params.guestId = g.id;
        await exports.generate({ ...req, params:{ guestId: g.id } }, { json:()=>{} }, ()=>{});
        generated++;
      } catch (e) { logger.warn(`QR gen failed for ${g.id}`, e.message); }
    }

    res.json({ success: true, message: `Generated ${generated}/${guests.length} QR codes` });
  } catch (err) { next(err); }
};
