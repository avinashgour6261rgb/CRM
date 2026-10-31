/**
 * @file companySettingsRoutes.js
 * @description API Routes for Company Settings, Anniversary & Work Shift Hours.
 */

const express = require('express');
const router = express.Router();
const {
  getCompanySettings,
  updateCompanySettings
} = require('../controllers/companySettingsController');

router.get('/', getCompanySettings);
router.put('/', updateCompanySettings);

module.exports = router;
