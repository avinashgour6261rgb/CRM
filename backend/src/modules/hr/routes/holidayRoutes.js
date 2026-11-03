const express = require('express');
const router = express.Router();
const {
  getHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday
} = require('../controllers/holidayController');
const { authenticateUser } = require('../../../shared/middleware/authMiddleware');

router.route('/')
  .get(getHolidays)
  .post(authenticateUser, createHoliday);

router.route('/:id')
  .get(getHolidayById)
  .put(authenticateUser, updateHoliday)
  .delete(authenticateUser, deleteHoliday);

module.exports = router;
