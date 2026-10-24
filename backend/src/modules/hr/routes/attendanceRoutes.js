const express = require('express');
const router = express.Router();
const {
  getMonthlyAttendance,
  getAttendanceSummary,
  getAttendanceByDate,
  markAttendance,
  bulkMarkAttendance,
  deleteAttendance,
  getAuditLogs,
  createAuditLog,
  forceClockOut
} = require('../controllers/attendanceController');

router.get('/', getMonthlyAttendance);
router.get('/monthly', getMonthlyAttendance);
router.get('/summary', getAttendanceSummary);
router.get('/daily', getAttendanceByDate);
router.post('/bulk', bulkMarkAttendance);
router.post('/mark', markAttendance);
router.delete('/:id', deleteAttendance);

// Audit Trail & Admin Override routes
router.get('/audit', getAuditLogs);
router.post('/audit', createAuditLog);
router.post('/force-clock-out', forceClockOut);

module.exports = router;
