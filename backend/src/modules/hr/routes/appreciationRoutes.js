const express = require('express');
const router = express.Router();
const {
  getAppreciations,
  getAppreciationById,
  createAppreciation,
  deleteAppreciation
} = require('../controllers/appreciationController');
const { authenticateUser } = require('../../../shared/middleware/authMiddleware');

router.route('/')
  .get(getAppreciations)
  .post(authenticateUser, createAppreciation);

router.route('/:id')
  .get(getAppreciationById)
  .delete(authenticateUser, deleteAppreciation);

module.exports = router;
