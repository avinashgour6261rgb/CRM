/**
 * @file resignationRoutes.js
 * @description API Routes for Resignations and Approvals.
 */

const express = require('express');
const router = express.Router();
const {
  getResignations,
  submitResignation,
  reviewResignation
} = require('../controllers/resignationController');

router.get('/', getResignations);
router.post('/', submitResignation);
router.put('/:id/review', reviewResignation);

module.exports = router;

