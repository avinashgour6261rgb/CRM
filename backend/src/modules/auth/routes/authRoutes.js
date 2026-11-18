const express = require('express');
const router = express.Router();
const { login, getMe, logoutOtherDevices } = require('../controllers/authController');

router.post('/login', login);
router.get('/me', getMe);
router.post('/logout-other-devices', logoutOtherDevices);

module.exports = router;
