// ============================================================
//  Auth Routes
//  src/routes/auth.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/login',   ctrl.login);
router.post('/logout',  authenticate, ctrl.logout);
router.get ('/me',      authenticate, ctrl.getMe);
router.put ('/me',      authenticate, ctrl.updateMe);
router.post('/change-password', authenticate, ctrl.changePassword);

module.exports = router;
