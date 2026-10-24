const express = require('express');
const router = express.Router();
const {
  getLeaves,
  getLeaveById,
  createLeave,
  updateLeaveStatus,
  deleteLeave,
  acknowledgeLeave
} = require('../controllers/leaveController');

router.route('/')
  .get(getLeaves)
  .post(createLeave);

router.route('/:id')
  .get(getLeaveById)
  .delete(deleteLeave);

router.put('/:id/status', updateLeaveStatus);
router.patch('/:id/status', updateLeaveStatus);
router.patch('/:id/acknowledge', acknowledgeLeave);
router.put('/:id/acknowledge', acknowledgeLeave);

module.exports = router;
