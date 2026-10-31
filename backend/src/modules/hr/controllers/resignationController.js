/**
 * @file resignationController.js
 * @description Controller for Employee Resignations, Higher Authority Approvals & Ex-Employee Archiving.
 */

const Resignation = require('../models/Resignation');
const Employee = require('../models/Employee');

exports.getResignations = async (req, res) => {
  try {
    const list = await Resignation.find().sort({ createdAt: -1 });
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
    await Employee.findOneAndUpdate(
      { $or: [{ _id: data.employeeId }, { employeeCode: data.employeeCode }] },
      {
        $set: {
          'resignation.status': 'pending',
          'resignation.submittedAt': data.submissionDate || new Date().toISOString().split('T')[0],
          'resignation.requestedLastWorkingDay': data.proposedLastWorkingDay,
          'resignation.reason': data.reason
        }
      }
    );

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
        resignation.relievedDate = new Date().toISOString().split('T')[0];
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
      empUpdate.relievedDate = new Date().toISOString().split('T')[0];
    } else if (status === 'rejected') {
      empUpdate['resignation.status'] = 'rejected';
      empUpdate.status = 'active';
    }

    await Employee.findOneAndUpdate(
      { $or: [{ _id: resignation.employeeId }, { employeeCode: resignation.employeeCode }] },
      { $set: empUpdate }
    );

    res.json({
      success: true,
      data: resignation,
      message: `Resignation ${status} successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
