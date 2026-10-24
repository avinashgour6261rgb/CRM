const mongoose = require('mongoose');

const AttendanceAuditSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    employeeId: {
      type: String,
      required: true,
      index: true
    },
    employeeName: {
      type: String,
      required: true
    },
    employeeCode: {
      type: String,
      default: ''
    },
    date: {
      type: String,
      required: true,
      index: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD']
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    timeFormatted: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true
    },
    durationSeconds: {
      type: Number,
      default: 0
    },
    durationText: {
      type: String,
      default: ''
    },
    details: {
      type: String,
      default: ''
    },
    actor: {
      type: String,
      enum: ['employee', 'admin', 'system'],
      default: 'employee'
    },
    actorId: {
      type: String,
      default: ''
    },
    actorName: {
      type: String,
      default: ''
    },
    isAdminOverride: {
      type: Boolean,
      default: false,
      index: true
    },
    adminId: {
      type: String,
      default: null
    },
    adminName: {
      type: String,
      default: null
    },
    auditNote: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

AttendanceAuditSchema.index({ employeeId: 1, date: 1, timestamp: -1 });
AttendanceAuditSchema.index({ date: 1, type: 1 });

module.exports = mongoose.model('AttendanceAudit', AttendanceAuditSchema);
