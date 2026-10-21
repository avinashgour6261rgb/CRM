const express = require('express');
const router = express.Router();
const {
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice
} = require('../controllers/noticeController');

router.route('/')
  .get(getNotices)
  .post(createNotice);

router.route('/:id')
  .put(updateNotice)
  .delete(deleteNotice);

module.exports = router;
