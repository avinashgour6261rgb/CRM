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
  forceClockOut,
  getOvertimeRequests,
  requestOvertime,
  updateOvertimeStatus
} = require('../controllers/attendanceController');

router.get('/', getMonthlyAttendance);
router.get('/monthly', getMonthlyAttendance);
router.get('/summary', getAttendanceSummary);
router.get('/daily', getAttendanceByDate);
router.post('/bulk', bulkMarkAttendance);
router.post('/mark', markAttendance);
router.delete('/:id', deleteAttendance);

// Overtime Requests & Approvals
router.get('/overtime', getOvertimeRequests);
router.post('/overtime', requestOvertime);
router.put('/overtime/:id/status', updateOvertimeStatus);

// Audit Trail & Admin Override routes
router.get('/audit', getAuditLogs);
router.post('/audit', createAuditLog);
router.post('/force-clock-out', forceClockOut);

module.exports = router;
