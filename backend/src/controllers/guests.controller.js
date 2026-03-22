// ============================================================
//  Guests Controller
//  src/controllers/guests.controller.js
// ============================================================
const Joi     = require('joi');
const { parse } = require('csv-parse/sync');
const XLSX    = require('xlsx');
const QRCode  = require('qrcode');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db }  = require('../config/database');
const { uploadBuffer } = require('../services/storage.service');
const logger  = require('../utils/logger');

const guestSchema = Joi.object({
  event_id:     Joi.string().uuid().required(),
  full_name:    Joi.string().max(150).required(),
  phone:        Joi.string().max(30).required(),
  email:        Joi.string().email().optional().allow(''),
  notes:        Joi.string().optional().allow(''),
  table_number: Joi.string().max(20).optional().allow(''),
  is_vip:       Joi.boolean().default(false),
});

// Generate sequential guest code
async function nextGuestCode(client) {
  const { rows } = await (client||db).query(
    "SELECT guest_code FROM guests ORDER BY created_at DESC LIMIT 1"
  );
  if (!rows[0]) return 'G-00001';
  const last = parseInt(rows[0].guest_code.replace('G-','')) || 0;
  return `G-${String(last+1).padStart(5,'0')}`;
}

// ── GET /api/guests ──────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const { event_id, status, search, page=1, limit=50 } = req.query;
    const offset = (page-1)*limit;
    const conditions = ['1=1'];
    const params = [];

    if (event_id) { params.push(event_id); conditions.push(`g.event_id=$${params.length}`); }
    if (search)   { params.push(`%${search}%`); conditions.push(`(g.full_name ILIKE $${params.length} OR g.phone ILIKE $${params.length} OR g.guest_code ILIKE $${params.length})`); }
    if (status)   { params.push(status); conditions.push(`r.status=$${params.length}`); }

    params.push(limit, offset);
    const { rows } = await db.query(`
      SELECT g.*,
        r.status         AS rsvp_status,
        r.responded_at,
        i.status         AS invitation_status,
        i.sent_at,
        a.checked_in_at  AS attended_at,
        qr.token         AS qr_token
      FROM guests g
      LEFT JOIN rsvp_responses r  ON r.guest_id = g.id
      LEFT JOIN invitations    i  ON i.guest_id = g.id AND i.status='sent'
      LEFT JOIN attendance     a  ON a.guest_id = g.id
      LEFT JOIN qr_codes       qr ON qr.guest_id = g.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY g.created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── POST /api/guests ─────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const { error, value } = guestSchema.validate(req.body);
    if (error) return res.status(400).json({ success:false, message: error.details[0].message });

    const result = await db.transaction(async (client) => {
      const code = await nextGuestCode(client);
      const { rows } = await client.query(`
        INSERT INTO guests (event_id,guest_code,full_name,phone,email,notes,table_number,is_vip)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [value.event_id, code, value.full_name, value.phone, value.email,
         value.notes, value.table_number, value.is_vip]
      );
      const guest = rows[0];

      // Auto-create RSVP record
      await client.query(
        'INSERT INTO rsvp_responses (guest_id, event_id) VALUES ($1,$2)',
        [guest.id, value.event_id]
      );

      return guest;
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── POST /api/guests/bulk ─────────────────────────────────────
exports.bulkUpload = async (req, res, next) => {
  try {
    const { event_id } = req.body;
    if (!event_id) return res.status(400).json({ success:false, message:'event_id is required' });
    if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded' });

    let records = [];
    const ext = req.file.originalname.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      records = parse(req.file.buffer.toString(), {
        columns: true, skip_empty_lines: true, trim: true,
      });
    } else if (['xlsx','xls'].includes(ext)) {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      records = XLSX.utils.sheet_to_json(ws);
    } else {
      return res.status(400).json({ success:false, message:'Only CSV or XLSX files are supported' });
    }

    // Create job record
    const { rows: jobRows } = await db.query(`
      INSERT INTO bulk_upload_jobs (event_id,uploaded_by,file_name,total_rows,status)
      VALUES ($1,$2,$3,$4,'processing') RETURNING id`,
      [event_id, req.user.userId, req.file.originalname, records.length]
    );
    const jobId = jobRows[0].id;

    // Process in background
    processBulkRecords(records, event_id, jobId).catch(err =>
      logger.error('Bulk upload processing error', err)
    );

    res.status(202).json({
      success: true,
      message: `Processing ${records.length} records...`,
      jobId,
    });
  } catch (err) { next(err); }
};

async function processBulkRecords(records, event_id, jobId) {
  let success = 0;
  const errors = [];

  for (const rec of records) {
    const name  = rec['Full Name'] || rec['Name'] || rec['full_name'] || rec['name'];
    const phone = rec['Phone'] || rec['Phone Number'] || rec['phone'] || rec['phone_number'];
    if (!name || !phone) { errors.push({ row: rec, error: 'Missing name or phone' }); continue; }

    try {
      await db.transaction(async (client) => {
        const code = await nextGuestCode(client);
        const { rows } = await client.query(`
          INSERT INTO guests (event_id,guest_code,full_name,phone)
          VALUES ($1,$2,$3,$4) ON CONFLICT (event_id,phone) DO NOTHING RETURNING id`,
          [event_id, code, String(name).trim(), String(phone).trim()]
        );
        if (rows[0]) {
          await client.query(
            'INSERT INTO rsvp_responses (guest_id,event_id) VALUES ($1,$2)',
            [rows[0].id, event_id]
          );
          success++;
        }
      });
    } catch (err) { errors.push({ row: rec, error: err.message }); }
  }

  await db.query(`
    UPDATE bulk_upload_jobs SET status='completed',success_rows=$1,failed_rows=$2,
      error_log=$3,completed_at=NOW() WHERE id=$4`,
    [success, errors.length, JSON.stringify(errors), jobId]
  );
  logger.info(`Bulk upload ${jobId} done: ${success} success, ${errors.length} failed`);
}

// ── GET /api/guests/:id ──────────────────────────────────────
exports.getOne = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT g.*, r.status AS rsvp_status, a.checked_in_at, qr.token AS qr_token
      FROM guests g
      LEFT JOIN rsvp_responses r ON r.guest_id=g.id
      LEFT JOIN attendance     a ON a.guest_id=g.id
      LEFT JOIN qr_codes      qr ON qr.guest_id=g.id
      WHERE g.id=$1`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success:false, message:'Guest not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ── PUT /api/guests/:id ──────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const { full_name, phone, email, notes, table_number, is_vip } = req.body;
    const { rows } = await db.query(`
      UPDATE guests SET full_name=$1,phone=$2,email=$3,notes=$4,table_number=$5,is_vip=$6
      WHERE id=$7 RETURNING *`,
      [full_name, phone, email, notes, table_number, is_vip, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success:false, message:'Guest not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ── DELETE /api/guests/:id ───────────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM guests WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ success:false, message:'Guest not found' });
    res.json({ success: true, message: 'Guest deleted' });
  } catch (err) { next(err); }
};

// ── POST /api/guests/:id/qr ──────────────────────────────────
exports.generateQR = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT g.*, e.name AS event_name, e.event_date, e.event_time, e.venue_name
      FROM guests g JOIN events e ON e.id=g.event_id
      WHERE g.id=$1`, [req.params.id]
    );
    const guest = rows[0];
    if (!guest) return res.status(404).json({ success:false, message:'Guest not found' });

    // Create signed token
    const token = jwt.sign(
      { gid: guest.id, eid: guest.event_id, code: guest.guest_code },
      process.env.QR_SECRET || 'qr_secret',
      { expiresIn: '365d' }
    );

    const verifyUrl = `${process.env.QR_BASE_URL}/${token}`;

    // Generate QR PNG buffer
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 300, margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    // Upload to storage
    let qr_image_url = null;
    try {
      qr_image_url = await uploadBuffer(qrBuffer, `qr/${guest.id}.png`, 'image/png');
    } catch (uploadErr) {
      logger.warn('QR upload failed, proceeding without URL', uploadErr.message);
    }

    // Upsert QR code record
    const { rows: qrRows } = await db.query(`
      INSERT INTO qr_codes (guest_id, token, qr_image_url)
      VALUES ($1,$2,$3)
      ON CONFLICT (guest_id) DO UPDATE SET token=$2, qr_image_url=$3
      RETURNING *`,
      [guest.id, token, qr_image_url]
    );

    res.json({
      success: true,
      data: {
        ...qrRows[0],
        verify_url: verifyUrl,
        guest: { name: guest.full_name, code: guest.guest_code },
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/guests/:id/qr/image ─────────────────────────────
exports.downloadQR = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT g.*, qr.token FROM guests g LEFT JOIN qr_codes qr ON qr.guest_id=g.id WHERE g.id=$1',
      [req.params.id]
    );
    const guest = rows[0];
    if (!guest) return res.status(404).json({ success:false, message:'Guest not found' });

    const token = guest.token || jwt.sign(
      { gid: guest.id }, process.env.QR_SECRET||'qr_secret', { expiresIn: '365d' }
    );
    const verifyUrl = `${process.env.QR_BASE_URL}/${token}`;
    const buffer = await QRCode.toBuffer(verifyUrl, { width: 400, margin: 2 });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${guest.guest_code}-qr.png"`);
    res.send(buffer);
  } catch (err) { next(err); }
};
