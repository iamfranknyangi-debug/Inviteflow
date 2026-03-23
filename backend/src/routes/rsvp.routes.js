// ============================================================
//  RSVP Routes (public — guests confirm without login)
//  src/routes/rsvp.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/rsvp.controller');
const { authenticate } = require('../middleware/auth');

router.get ('/:token',           ctrl.getByToken);   // public: load guest RSVP page
router.post('/:token',           ctrl.respond);      // public: guest submits response
router.get ('/event/:eventId',   authenticate, ctrl.listByEvent);  // admin
router.put ('/guest/:guestId',   authenticate, ctrl.updateByAdmin);// admin override

module.exports = router;
