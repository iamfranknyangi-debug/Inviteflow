// ============================================================
//  Auth Controller
//  src/controllers/auth.controller.js
// ============================================================
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const Joi    = require('joi');
const { db } = require('../config/database');
const logger = require('../utils/logger');

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().min(6).required(),
});

// ── POST /api/auth/login ─────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { rows } = await db.query(
      'SELECT * FROM users WHERE (username=$1 OR email=$1) AND is_active=true',
      [value.username]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(value.password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last_login
    await db.query('UPDATE users SET last_login=$1 WHERE id=$2', [new Date(), user.id]);

    logger.info(`User logged in: ${user.username}`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/auth/logout ────────────────────────────────────
exports.logout = async (req, res) => {
  // JWT is stateless; client must discard the token.
  // For token blacklisting, add token to Redis with TTL = remaining JWT expiry.
  res.json({ success: true, message: 'Logged out successfully' });
};

// ── GET /api/auth/me ──────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, email, full_name, role, last_login, created_at FROM users WHERE id=$1',
      [req.user.userId]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ── PUT /api/auth/me ──────────────────────────────────────────
exports.updateMe = async (req, res, next) => {
  try {
    const { full_name, email } = req.body;
    const { rows } = await db.query(
      'UPDATE users SET full_name=$1, email=$2 WHERE id=$3 RETURNING id,username,email,full_name,role',
      [full_name, email, req.user.userId]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ── POST /api/auth/change-password ────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const { rows } = await db.query('SELECT password FROM users WHERE id=$1', [req.user.userId]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(current_password, user.password))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const hashed = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, req.user.userId]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) { next(err); }
};
