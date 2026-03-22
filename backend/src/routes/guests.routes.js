// ============================================================
//  Guests Routes
//  src/routes/guests.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/guests.controller');
const upload  = require('../middleware/upload');

router.get   ('/',              ctrl.list);
router.post  ('/',              ctrl.create);
router.post  ('/bulk',          upload.single('file'), ctrl.bulkUpload);
router.get   ('/:id',           ctrl.getOne);
router.put   ('/:id',           ctrl.update);
router.delete('/:id',           ctrl.remove);
router.post  ('/:id/qr',        ctrl.generateQR);
router.get   ('/:id/qr/image',  ctrl.downloadQR);

module.exports = router;
