/**
 * @file Timesheet.js
 * @description Mongoose Schema for Timesheet Entries in EMS.
 */

const mongoose = require('mongoose');

const TimesheetSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },
    taskId: {
      type: String,
      default: ''
    },
    taskCode: {
      type: String,
      trim: true,
      default: ''
    },
    taskTitle: {
      type: String,
      trim: true,
      default: ''
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null
    },
    projectId: {
      type: String,
      default: ''
    },
    projectName: {
      type: String,
      trim: true,
      default: ''
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    employeeId: {
      type: String,
      default: ''
    },
    employeeCode: {
      type: String,
      default: ''
    },
    employeeName: {
      type: String,
      trim: true,
      default: 'Unknown'
    },
    employeeAvatar: {
      type: String,
      default: ''
    },
    employeeRole: {
      type: String,
      default: ''
    },
    date: {
      type: String,
      required: [true, 'Timesheet date is required']
    },
    startTime: {
      type: String,
      default: null
    },
    endTime: {
      type: String,
      default: null
    },
    totalDurationSeconds: {
      type: Number,
      default: 0
    },
    totalDurationText: {
      type: String,
      default: '00:00:00'
    },
    memo: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'stopped', 'approved', 'rejected'],
      default: 'stopped'
    },
    isBillable: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

TimesheetSchema.index({ date: 1 });
TimesheetSchema.index({ employee: 1 });
TimesheetSchema.index({ task: 1 });
TimesheetSchema.index({ status: 1 });

module.exports = mongoose.model('Timesheet', TimesheetSchema);
