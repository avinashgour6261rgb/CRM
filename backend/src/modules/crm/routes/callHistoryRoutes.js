/**
 * @file callHistoryRoutes.js
 * @description API Routes for Call History & Live Screen Share Session Audit Logs.
 */

const express = require('express');
const router = express.Router();
const {
  getCallHistory,
  logCall,
  getScreenShareHistory,
  logScreenShare
} = require('../controllers/callHistoryController');

router.get('/history', getCallHistory);
router.post('/log', logCall);

router.get('/screenshare/history', getScreenShareHistory);
router.post('/screenshare/log', logScreenShare);

module.exports = router;
