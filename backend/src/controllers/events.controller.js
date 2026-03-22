// ============================================================
//  Events Controller
//  src/controllers/events.controller.js
// ============================================================
const Joi    = require('joi');
const { db } = require('../config/database');

const schema = Joi.object({
  name:          Joi.string().max(200).required(),
  description:   Joi.string().optional().allow(''),
  event_date:    Joi.date().iso().required(),
  event_time:    Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  venue_name:    Joi.string().max(200).required(),
  venue_address: Joi.string().optional().allow(''),
  venue_city:    Joi.string().max(100).optional().allow(''),
  emoji:         Joi.string().max(10).default('🎉'),
  max_guests:    Joi.number().integer().positive().optional(),
  status:        Joi.string().valid('draft','active','completed','cancelled').default('draft'),
});

// GET /api/events
exports.list = async (req, res, next) => {
  try {
    const { status, page=1, limit=20 } = req.query;
    const offset = (page-1) * limit;
    const where  = status ? `WHERE e.status = $3` : '';
    const params = status ? [limit, offset, status] : [limit, offset];

    const { rows } = await db.query(`
      SELECT e.*, v.total_guests, v.invitations_sent, v.rsvp_confirmed,
             v.rsvp_declined, v.rsvp_pending, v.attended
      FROM events e
      LEFT JOIN v_event_summary v ON v.id = e.id
      WHERE e.created_by = $1
      ${status ? 'AND e.status = $3' : ''}
      ORDER BY e.event_date DESC
      LIMIT $2 OFFSET ${status ? '$4' : '$3'}
    `, [req.user.userId, limit, ...(status ? [status, offset] : [offset])]);

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM events WHERE created_by=$1 ${status ? 'AND status=$2':''} `,
      status ? [req.user.userId, status] : [req.user.userId]
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page: +page, limit: +limit, total: +countRows[0].count },
    });
  } catch (err) { next(err); }
};

// POST /api/events
exports.create = async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success:false, message: error.details[0].message });

    const { rows } = await db.query(`
      INSERT INTO events (created_by,name,description,event_date,event_time,
        venue_name,venue_address,venue_city,emoji,max_guests,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.userId, value.name, value.description, value.event_date,
       value.event_time, value.venue_name, value.venue_address, value.venue_city,
       value.emoji, value.max_guests, value.status]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// GET /api/events/:id
exports.getOne = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM events WHERE id=$1 AND created_by=$2',
      [req.params.id, req.user.userId]
    );
    if (!rows[0]) return res.status(404).json({ success:false, message:'Event not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/events/:id
exports.update = async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success:false, message: error.details[0].message });

    const { rows } = await db.query(`
      UPDATE events SET name=$1,description=$2,event_date=$3,event_time=$4,
        venue_name=$5,venue_address=$6,venue_city=$7,emoji=$8,max_guests=$9,status=$10
      WHERE id=$11 AND created_by=$12 RETURNING *`,
      [value.name, value.description, value.event_date, value.event_time,
       value.venue_name, value.venue_address, value.venue_city, value.emoji,
       value.max_guests, value.status, req.params.id, req.user.userId]
    );
    if (!rows[0]) return res.status(404).json({ success:false, message:'Event not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// DELETE /api/events/:id
exports.remove = async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM events WHERE id=$1 AND created_by=$2',
      [req.params.id, req.user.userId]
    );
    if (!rowCount) return res.status(404).json({ success:false, message:'Event not found' });
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) { next(err); }
};

// GET /api/events/:id/summary
exports.summary = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM v_event_summary WHERE id=$1', [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success:false, message:'Event not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
