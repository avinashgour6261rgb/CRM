/**
 * @file resignationController.js
 * @description Controller for Employee Resignations, Higher Authority Approvals & Ex-Employee Archiving.
 */

const mongoose = require('mongoose');
const Resignation = require('../models/Resignation');
const Employee = require('../models/Employee');
const { getIstDateString } = require('../../../shared/utils/dateUtils');

exports.getResignations = async (req, res) => {
  try {
    const u = req.user;
    const isPrivileged = Boolean(u && (u.isAdmin || u.isDelegatedAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.permissions?.manageEmployees || u.permissions?.reviewResignations || u.permissions?.allAccess));
    let filter = {};
    if (!isPrivileged && u) {
      const selfOr = [];
      if (u._id || u.id) selfOr.push({ employeeId: String(u._id || u.id) });
      if (u.employeeCode) selfOr.push({ employeeCode: String(u.employeeCode).toUpperCase() });
      if (selfOr.length > 0) filter = { $or: selfOr };
    }
    const list = await Resignation.find(filter).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: list
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitResignation = async (req, res) => {
  try {
    const data = req.body;
    const id = data.id || `res_${Date.now()}`;

    // Create resignation record
    const resignation = new Resignation({
      ...data,
      id
    });
    await resignation.save();

    // Mark employee resignation flag as pending
    const empOr = [];
    if (data.employeeId && mongoose.Types.ObjectId.isValid(data.employeeId)) empOr.push({ _id: data.employeeId });
    if (data.employeeCode) empOr.push({ employeeCode: String(data.employeeCode).toUpperCase() });
    if (empOr.length > 0) {
      await Employee.findOneAndUpdate(
        { $or: empOr },
        {
          $set: {
            'resignation.status': 'pending',
            'resignation.submittedAt': data.submissionDate || getIstDateString(),
            'resignation.requestedLastWorkingDay': data.proposedLastWorkingDay,
            'resignation.reason': data.reason
          }
        }
      );
    }

    try {
      const { emitToAll } = require('../../../shared/socket/socketManager');
      emitToAll('resignation:updated', { action: 'create', item: resignation });
    } catch (_) {}

    res.status(201).json({
      success: true,
      data: resignation,
      message: 'Resignation request submitted for higher authority approval'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reviewResignation = async (req, res) => {
  try {
    const u = req.user;
    const isPrivileged = Boolean(u && (u.isAdmin || u.systemRole === 'admin' || u.systemRole === 'hr' || u.isDelegatedAdmin || u.permissions?.manageEmployees || u.permissions?.reviewResignations || u.permissions?.allAccess));
    if (!isPrivileged) {
      return res.status(403).json({ success: false, message: 'Access denied: Only Admin or HR can review resignations.' });
    }
    const { id } = req.params;
    const {
      status, // 'approved' | 'rejected'
      approvedLastWorkingDay,
      reviewRemarks,
      reviewedBy,
      reviewedByName,
      isRelieved
    } = req.body;

    const resignation = await Resignation.findOne({ id });
    if (!resignation) {
      return res.status(404).json({ success: false, message: 'Resignation request not found' });
    }

    resignation.status = status || resignation.status;
    resignation.reviewRemarks = reviewRemarks || resignation.reviewRemarks;
    resignation.reviewedBy = reviewedBy || resignation.reviewedBy;
    resignation.reviewedByName = reviewedByName || resignation.reviewedByName;
    resignation.approvedLastWorkingDay = approvedLastWorkingDay || resignation.proposedLastWorkingDay;

    if (isRelieved || status === 'approved') {
      resignation.isRelieved = !!isRelieved;
      if (isRelieved) {
        resignation.relievedDate = getIstDateString();
      }
    }

    await resignation.save();

    // Update Employee Status in MongoDB
    const empUpdate = {
      'resignation.status': status,
      'resignation.approvedLastWorkingDay': resignation.approvedLastWorkingDay,
      'resignation.reviewRemarks': reviewRemarks,
      'resignation.approvedBy': reviewedByName
    };

    if (isRelieved) {
      empUpdate.status = 'resigned'; // Archived as Ex-Employee in DB
      empUpdate.relievedDate = getIstDateString();
    } else if (status === 'rejected') {
      empUpdate['resignation.status'] = 'rejected';
      empUpdate.status = 'active';
    }

    const empOrReview = [];
    if (resignation.employeeId && mongoose.Types.ObjectId.isValid(resignation.employeeId)) empOrReview.push({ _id: resignation.employeeId });
    if (resignation.employeeCode) empOrReview.push({ employeeCode: String(resignation.employeeCode).toUpperCase() });
    let updatedEmp = null;
    if (empOrReview.length > 0) {
      const updateOps = isRelieved
        ? { $set: empUpdate, $inc: { tokenVersion: 1 } }
        : { $set: empUpdate };
      updatedEmp = await Employee.findOneAndUpdate(
        { $or: empOrReview },
        updateOps,
        { new: true }
      );
    }

    try {
      const { emitToAll, emitToUser } = require('../../../shared/socket/socketManager');
      emitToAll('resignation:updated', { action: 'update', item: resignation });
      if (updatedEmp) {
        const safeObj = updatedEmp.toObject ? updatedEmp.toObject() : updatedEmp;
        delete safeObj.password;
        delete safeObj.adminVaultPassword;
        emitToAll('employee:updated', { action: 'update', item: safeObj });
        if (isRelieved) {
          const revokePayload = {
            employeeId: String(updatedEmp._id),
            employeeCode: updatedEmp.employeeCode,
            email: updatedEmp.email,
            reason: 'Account relieved / archived by HR'
          };
          emitToUser(String(updatedEmp._id), 'session:revoked', revokePayload);
          if (updatedEmp.employeeCode) emitToUser(updatedEmp.employeeCode, 'session:revoked', revokePayload);
          if (updatedEmp.email) emitToUser(updatedEmp.email.toLowerCase(), 'session:revoked', revokePayload);
          emitToAll('session:revoked', revokePayload);
        }
      }
    } catch (_) {}

    res.json({
      success: true,
      data: resignation,
      message: `Resignation ${status} successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

