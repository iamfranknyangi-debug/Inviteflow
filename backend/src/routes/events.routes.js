// ============================================================
//  Events Routes
//  src/routes/events.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/events.controller');

router.get   ('/',           ctrl.list);
router.post  ('/',           ctrl.create);
router.get   ('/:id',        ctrl.getOne);
router.put   ('/:id',        ctrl.update);
router.delete('/:id',        ctrl.remove);
router.get   ('/:id/summary',ctrl.summary);

module.exports = router;
