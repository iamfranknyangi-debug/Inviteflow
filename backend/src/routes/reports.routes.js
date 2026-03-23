// src/routes/reports.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reports.controller');

router.get('/dashboard',           ctrl.dashboard);
router.get('/event/:eventId',      ctrl.eventReport);
router.get('/export/:eventId',     ctrl.exportGuests);

module.exports = router;
