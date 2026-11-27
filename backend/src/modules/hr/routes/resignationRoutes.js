/**
 * @file resignationRoutes.js
 * @description API Routes for Resignations and Approvals.
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../../../shared/middleware/authMiddleware');
const {
  getResignations,
  submitResignation,
  reviewResignation
} = require('../controllers/resignationController');

router.use(protect);
router.get('/', getResignations);
router.post('/', submitResignation);
router.put('/:id/review', reviewResignation);
router.patch('/:id/review', reviewResignation);

module.exports = router;

