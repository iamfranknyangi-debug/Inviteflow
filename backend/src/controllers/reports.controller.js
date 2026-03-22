// ============================================================
//  Reports Controller
//  src/controllers/reports.controller.js
// ============================================================
const { db } = require('../config/database');

// ── GET /api/reports/dashboard ───────────────────────────────
exports.dashboard = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const [events, guests, invites, rsvp, attendance] = await Promise.all([
      db.query('SELECT COUNT(*) FROM events WHERE created_by=$1', [userId]),
      db.query('SELECT COUNT(*) FROM guests g JOIN events e ON e.id=g.event_id WHERE e.created_by=$1', [userId]),
      db.query('SELECT COUNT(*) FROM invitations i JOIN events e ON e.id=i.event_id WHERE e.created_by=$1 AND i.status=\'sent\'', [userId]),
      db.query('SELECT status, COUNT(*) FROM rsvp_responses r JOIN events e ON e.id=r.event_id WHERE e.created_by=$1 GROUP BY status', [userId]),
      db.query('SELECT COUNT(*) FROM attendance a JOIN events e ON e.id=a.event_id WHERE e.created_by=$1', [userId]),
    ]);

    const rsvpMap = {};
    rsvp.rows.forEach(r => { rsvpMap[r.status] = +r.count; });

    res.json({
      success: true,
      data: {
        total_events:      +events.rows[0].count,
        total_guests:      +guests.rows[0].count,
        invitations_sent:  +invites.rows[0].count,
        rsvp_confirmed:    rsvpMap.confirmed || 0,
        rsvp_declined:     rsvpMap.declined  || 0,
        rsvp_pending:      rsvpMap.pending   || 0,
        total_attended:    +attendance.rows[0].count,
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/reports/event/:eventId ──────────────────────────
exports.eventReport = async (req, res, next) => {
  try {
    const eid = req.params.eventId;

    const [summary, daily, channels, topGuests] = await Promise.all([
      db.query('SELECT * FROM v_event_summary WHERE id=$1', [eid]),

      // Daily invitation send trend (last 14 days)
      db.query(`
        SELECT DATE(sent_at) AS day, COUNT(*) AS count
        FROM invitations WHERE event_id=$1 AND sent_at IS NOT NULL
        GROUP BY DATE(sent_at) ORDER BY day ASC
        LIMIT 14`, [eid]),

      // Breakdown by channel
      db.query(`
        SELECT channel, COUNT(*) AS total,
               SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) AS sent,
               SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed
        FROM invitations WHERE event_id=$1
        GROUP BY channel`, [eid]),

      // VIP guests
      db.query(`
        SELECT g.full_name, g.guest_code, g.is_vip, r.status AS rsvp_status, a.checked_in_at
        FROM guests g
        LEFT JOIN rsvp_responses r ON r.guest_id=g.id
        LEFT JOIN attendance a ON a.guest_id=g.id
        WHERE g.event_id=$1 AND g.is_vip=true
        ORDER BY g.full_name`, [eid]),
    ]);

    res.json({
      success: true,
      data: {
        summary:    summary.rows[0],
        daily_sends: daily.rows,
        channels:   channels.rows,
        vip_guests: topGuests.rows,
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/reports/export/:eventId?format=csv ──────────────
exports.exportGuests = async (req, res, next) => {
  try {
    const { format = 'csv' } = req.query;
    const { rows } = await db.query(`
      SELECT g.guest_code, g.full_name, g.phone, g.email, g.is_vip, g.table_number,
             r.status AS rsvp_status, r.responded_at, r.plus_ones,
             CASE WHEN a.id IS NOT NULL THEN 'Yes' ELSE 'No' END AS attended,
             a.checked_in_at
      FROM guests g
      LEFT JOIN rsvp_responses r ON r.guest_id=g.id
      LEFT JOIN attendance     a ON a.guest_id=g.id
      WHERE g.event_id=$1
      ORDER BY g.full_name`, [req.params.eventId]
    );

    if (format === 'json') {
      return res.json({ success: true, data: rows });
    }

    // CSV
    const headers = ['Guest Code','Full Name','Phone','Email','VIP','Table','RSVP','Responded At','Plus Ones','Attended','Checked In At'];
    const csv = [
      headers.join(','),
      ...rows.map(r => [
        r.guest_code, `"${r.full_name}"`, r.phone, r.email||'', r.is_vip?'Yes':'No',
        r.table_number||'', r.rsvp_status, r.responded_at||'', r.plus_ones||0,
        r.attended, r.checked_in_at||'',
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="guests-${req.params.eventId}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
};
