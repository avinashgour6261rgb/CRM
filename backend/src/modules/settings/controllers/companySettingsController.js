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
    const u = req.user;
    const canEdit = Boolean(u && (u.isAdmin || u.systemRole === 'admin' || u.isDelegatedAdmin || u.permissions?.manageSettings || u.permissions?.allAccess));
    if (!canEdit) {
      return res.status(403).json({ success: false, message: 'Access denied: Only Administrators can update company settings.' });
    }
    const data = req.body;
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = new CompanySettings(data);
    } else {
      Object.assign(settings, data);
    }
    await settings.save();
    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('settings:updated', { settings });
    } catch (_) {}
    res.json({
      success: true,
      data: settings,
      message: 'Company settings updated successfully in database'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

