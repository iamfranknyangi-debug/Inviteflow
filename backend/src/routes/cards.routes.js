// ============================================================
//  Cards Routes
//  src/routes/cards.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/cards.controller');
const upload  = require('../middleware/upload');

router.get ('/:eventId',              ctrl.getCard);
router.post('/:eventId',              ctrl.upsertCard);
router.post('/:eventId/background',   upload.single('image'), ctrl.uploadBackground);
router.post('/:eventId/preview',      ctrl.generatePreview);   // returns PNG image
router.post('/:eventId/generate-all', ctrl.generateAllCards);  // generates all guest cards

module.exports = router;
