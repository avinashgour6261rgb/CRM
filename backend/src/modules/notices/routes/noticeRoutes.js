const express = require('express');
const router = express.Router();
const {
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice
} = require('../controllers/noticeController');
const { authenticateUser } = require('../../../shared/middleware/authMiddleware');

router.route('/')
  .get(getNotices)
  .post(authenticateUser, createNotice);

router.route('/:id')
  .put(authenticateUser, updateNotice)
  .delete(authenticateUser, deleteNotice);

module.exports = router;
