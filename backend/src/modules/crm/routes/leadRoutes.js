/**
 * @file leadRoutes.js
 * @description Express routes for Lead endpoints.
 */

const express = require('express');
const router = express.Router();
const {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  importLeads
} = require('../controllers/leadController');
const { authenticateUser } = require('../../../shared/middleware/authMiddleware');

router.route('/')
  .get(getLeads)
  .post(authenticateUser, createLead);

router.route('/import')
  .post(authenticateUser, importLeads);

router.route('/:id')
  .put(authenticateUser, updateLead)
  .delete(authenticateUser, deleteLead);

module.exports = router;
