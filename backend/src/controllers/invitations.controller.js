// ============================================================
//  Invitations Controller
const smsService = require('../services/sms.service');
// ============================================================
const { db }   = require('../config/database');
const smsService = require('../services/sms.service');
const logger   = require('../utils/logger');

const DEFAULT_TEMPLATE = `Dear {guest_name},

You are cordially invited to {event_name}.

📅 Date: {event_date}
🕖 Time: {event_time}
📍 Venue: {venue_name}

Your personal QR code: {qr_link}
Confirm attendance: {rsvp_link}

We look forward to seeing you!`;

function buildMessage(template, guest, event, qrToken) {
  const base = process.env.APP_URL || 'https://inviteflow.app';
  return template
    .replace(/{guest_name}/g,  guest.full_name)
    .replace(/{event_name}/g,  event.name)
    .replace(/{event_date}/g,  event.event_date)
    .replace(/{event_time}/g,  event.event_time)
    .replace(/{venue_name}/g,  event.venue_name)
    .replace(/{qr_link}/g,     `${base}/verify/${qrToken}`)
    .replace(/{rsvp_link}/g,   `${base}/rsvp/${qrToken}`);
}

// ── GET /api/invitations ──────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const { event_id, status, page=1, limit=50 } = req.query;
    const offset = (page-1)*limit;
    const conds  = []; const params = [];

    if (event_id) { params.push(event_id); conds.push(`i.event_id=$${params.length}`); }
    if (status)   { params.push(status);   conds.push(`i.status=$${params.length}`); }

    params.push(limit, offset);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await db.query(`
      SELECT i.*, g.full_name, g.phone, g.guest_code
      FROM invitations i JOIN guests g ON g.id=i.guest_id
      ${where}
      ORDER BY i.created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);
    res.json({ success:true, data: rows });
  } catch (err) { next(err); }
};

// ── POST /api/invitations/send ────────────────────────────────
exports.send = async (req, res, next) => {
  try {
    const { guest_ids, event_id, channel='sms', template, provider='africas_talking' } = req.body;
    if (!guest_ids?.length || !event_id) {
      return res.status(400).json({ success:false, message:'guest_ids and event_id are required' });
    }

    const { rows: evRows } = await db.query('SELECT * FROM events WHERE id=$1', [event_id]);
    const event = evRows[0];
    if (!event) return res.status(404).json({ success:false, message:'Event not found' });

    const results = { sent:0, failed:0, errors:[] };

    for (const gid of guest_ids) {
      try {
        const { rows } = await db.query(`
          SELECT g.*, qr.token AS qr_token FROM guests g
          LEFT JOIN qr_codes qr ON qr.guest_id=g.id
          WHERE g.id=$1`, [gid]
        );
        const guest = rows[0];
        if (!guest) continue;

        // Generate QR if missing
        let token = guest.qr_token;
        if (!token) {
          const jwt = require('jsonwebtoken');
          token = jwt.sign({ gid: guest.id, eid: event_id }, process.env.QR_SECRET||'qr', { expiresIn:'365d' });
          await db.query(
            'INSERT INTO qr_codes (guest_id,token) VALUES ($1,$2) ON CONFLICT (guest_id) DO UPDATE SET token=$2',
            [guest.id, token]
          );
        }

        const message = buildMessage(template || DEFAULT_TEMPLATE, guest, event, token);

        // Create invitation record (pending)
        const { rows: invRows } = await db.query(`
          INSERT INTO invitations (guest_id,event_id,channel,status,provider,message_body)
          VALUES ($1,$2,$3,'pending',$4,$5) RETURNING id`,
          [guest.id, event_id, channel, provider, message]
        );
        const invId = invRows[0].id;

        // Send via SMS service
        const sendResult = await smsService.send({ phone: guest.phone, message, channel, provider });

        // Update status
        await db.query(`
          UPDATE invitations SET status='sent', sent_at=NOW(), provider_msg_id=$1
          WHERE id=$2`,
          [sendResult.messageId, invId]
        );
        results.sent++;
      } catch (err) {
        results.failed++;
        results.errors.push({ guest_id: gid, error: err.message });
        logger.error(`Failed to send invitation to guest ${gid}`, err.message);
      }
    }

    res.json({ success:true, data: results });
  } catch (err) { next(err); }
};

// ── POST /api/invitations/send-all ─────────────────────────────
exports.sendAll = async (req, res, next) => {
  try {
    const { event_id, channel='sms', template, provider='africas_talking' } = req.body;
    if (!event_id) return res.status(400).json({ success:false, message:'event_id is required' });

    // Get all guests who haven't been sent yet
    const { rows } = await db.query(`
      SELECT g.id FROM guests g
      WHERE g.event_id=$1
      AND NOT EXISTS (
        SELECT 1 FROM invitations i WHERE i.guest_id=g.id AND i.status='sent'
      )`, [event_id]
    );

    if (!rows.length) return res.json({ success:true, message:'All guests already invited', data:{sent:0,failed:0} });

    const guest_ids = rows.map(r=>r.id);
    req.body.guest_ids = guest_ids;
    return exports.send(req, res, next);
  } catch (err) { next(err); }
};

// ── GET /api/invitations/:id ──────────────────────────────────
exports.getOne = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT i.*, g.full_name, g.phone FROM invitations i JOIN guests g ON g.id=i.guest_id WHERE i.id=$1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success:false, message:'Not found' });
    res.json({ success:true, data: rows[0] });
  } catch (err) { next(err); }
};

// ── POST /api/invitations/test ────────────────────────────────
exports.sendTest = async (req, res, next) => {
  try {
    const { phone, message='This is a test invitation from InviteFlow.', channel='sms' } = req.body;
    if (!phone) return res.status(400).json({ success:false, message:'phone is required' });
    const result = await smsService.send({ phone, message, channel });
    res.json({ success:true, data: result });
  } catch (err) { next(err); }
};
