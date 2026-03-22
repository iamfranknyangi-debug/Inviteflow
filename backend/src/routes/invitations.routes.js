// ============================================================
//  Invitations Routes
//  src/routes/invitations.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/invitations.controller');

router.get ('/',             ctrl.list);
router.post('/send',         ctrl.send);          // send to one or many guests
router.post('/send-all',     ctrl.sendAll);        // send to all unsent guests in event
router.get ('/:id',          ctrl.getOne);
router.post('/test',         ctrl.sendTest);       // send test to self

module.exports = router;
