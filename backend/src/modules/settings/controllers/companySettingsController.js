/**
 * @file companySettingsController.js
 * @description Controller for Company Settings, Foundation Anniversary & Shift Policy in MongoDB Atlas.
 */

const CompanySettings = require('../models/CompanySettings');

exports.getCompanySettings = async (req, res) => {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = new CompanySettings();
      await settings.save();
    }
    res.json({
      success: true,
      data: settings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCompanySettings = async (req, res) => {
  try {
    const data = req.body;
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = new CompanySettings(data);
    } else {
      Object.assign(settings, data);
    }
    await settings.save();
    res.json({
      success: true,
      data: settings,
      message: 'Company settings updated successfully in database'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

