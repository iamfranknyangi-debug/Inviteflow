// ============================================================
//  Routes Index
//  src/routes/index.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');

router.use('/auth',        require('./auth.routes'));
router.use('/events',      authenticate, require('./events.routes'));
router.use('/guests',      authenticate, require('./guests.routes'));
router.use('/invitations', authenticate, require('./invitations.routes'));
router.use('/qr',          require('./qr.routes'));          // public QR verify endpoint
router.use('/rsvp',        require('./rsvp.routes'));        // public RSVP endpoint
router.use('/reports',     authenticate, require('./reports.routes'));
router.use('/cards',       authenticate, require('./cards.routes'));
router.use('/upload',      authenticate, require('./upload.routes'));

module.exports = router;
