const express = require('express');
const router = express.Router();
const {
  getTimesheets,
  createTimesheet,
  stopTimer,
  updateTimesheet,
  deleteTimesheet
} = require('../controllers/timesheetController');

router.route('/')
  .get(getTimesheets)
  .post(createTimesheet);

router.route('/stop')
  .post(stopTimer);

router.route('/:id')
  .put(updateTimesheet)
  .delete(deleteTimesheet);

module.exports = router;
