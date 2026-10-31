/**
 * @file Resignation.js
 * @description Mongoose Schema for Employee Resignations & Higher Authority Approvals.
 */

const mongoose = require('mongoose');

const ResignationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    required: true
  },
  employeeCode: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  employeeAvatar: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    default: 'Team Member'
  },
  department: {
    type: String,
    default: 'General'
  },
  reason: {
    type: String,
    required: true
  },
  detailedNotes: {
    type: String,
    default: ''
  },
  submissionDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  proposedLastWorkingDay: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // Higher Authority Review
  reviewedBy: {
    type: String,
    default: ''
  },
  reviewedByName: {
    type: String,
    default: ''
  },
  reviewRemarks: {
    type: String,
    default: ''
  },
  approvedLastWorkingDay: {
    type: String,
    default: ''
  },
  isRelieved: {
    type: Boolean,
    default: false
  },
  relievedDate: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Resignation', ResignationSchema);

