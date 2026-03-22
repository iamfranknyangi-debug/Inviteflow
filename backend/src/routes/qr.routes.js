// ============================================================
//  QR Routes (public — no auth required for scanning)
//  src/routes/qr.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/qr.controller');
const { authenticate } = require('../middleware/auth');

router.get('/verify/:token',       ctrl.verify);          // public: QR scan endpoint
router.post('/scan/:token',        ctrl.scan);            // public: mark attendance
router.post('/generate/:guestId',  authenticate, ctrl.generate); // admin: regenerate
router.get('/bulk/:eventId',       authenticate, ctrl.bulkGenerate); // admin: gen all

module.exports = router;
