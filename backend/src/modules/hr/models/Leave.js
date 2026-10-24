const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required']
    },
    // Denormalized for fast table rendering without populate
    employeeId: { type: String },
    employeeName: { type: String, required: true },
    employeeAvatar: { type: String, default: '' },
    employeeRole: { type: String, required: true },
    employeeCode: { type: String },

    // Reviewer/Approver fields
    appliedToId: { type: String, default: '' },
    appliedToName: { type: String, default: '' },
    appliedToRole: { type: String, default: '' },
    appliedToAvatar: { type: String, default: '' },

    leaveType: {
      type: String,
      required: [true, 'Leave type is required'],
      enum: ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity/Paternity', 'Unpaid Leave']
    },
    startDate: {
      type: String,
      required: [true, 'Start date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD']
    },
    endDate: {
      type: String,
      required: [true, 'End date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD']
    },
    durationDays: {
      type: Number,
      required: true,
      min: [0.5, 'Minimum 0.5 days (half day)']
    },
    durationText: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      required: [true, 'Reason for leave is required'],
      minlength: [5, 'Please provide a proper reason (min 5 characters)'],
      maxlength: [500, 'Reason too long (max 500 characters)']
    },
    isPaid: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },
    approvedBy: {
      type: String,
      default: null
    },
    approverRemarks: {
      type: String,
      default: ''
    },
    cancelledBy: {
      type: String,
      default: null
    },
    cancellationReason: {
      type: String,
      default: ''
    },
    rejectedBy: {
      type: String,
      default: null
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    actionBy: {
      type: String,
      default: null
    },
    actionDate: {
      type: Date,
      default: null
    },
    isAcknowledged: {
      type: Boolean,
      default: false
    },
    appliedOn: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for fast employee+date queries
LeaveSchema.index({ employee: 1, startDate: -1 });
LeaveSchema.index({ status: 1 });
LeaveSchema.index({ startDate: 1, endDate: 1 });

// Validate: endDate must not be before startDate
LeaveSchema.pre('save', function (next) {
  if (this.endDate < this.startDate) {
    return next(new Error('End date cannot be before start date'));
  }
  next();
});

module.exports = mongoose.model('Leave', LeaveSchema);
