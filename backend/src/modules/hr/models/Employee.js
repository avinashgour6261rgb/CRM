const mongoose = require('mongoose');
const { getIstDateString } = require('../../../shared/utils/dateUtils');

const EmployeeSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      required: [true, 'Employee code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Za-z0-9_-]+$/, 'Employee code must contain valid characters (e.g. EMP-001 or INF-001)']
    },
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
    },
    avatar: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      required: [true, 'Role/designation is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      default: 'Engineering'
    },
    dob: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    gender: {
      type: String,
      default: 'Other'
    },
    bloodGroup: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    shiftTiming: {
      type: String,
      default: '10:00 AM - 07:00 PM'
    },
    aadhaar: {
      type: String,
      default: ''
    },
    upiId: {
      type: String,
      default: ''
    },
    emergencyContact: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    emergencyContacts: {
      type: Array,
      default: []
    },
    workPreferences: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    workMode: {
      type: String,
      default: 'Office'
    },
    status: {
      type: String,
      default: 'active'
    },
    tokenVersion: {
      type: Number,
      default: 1
    },
    joiningDate: {
      type: String,
      default: () => getIstDateString()
    },
    systemRole: {
      type: String,
      default: 'team_member'
    },
    password: {
      type: String,
      default: 'emp12345'
    },
    adminVaultPassword: {
      type: String,
      default: ''
    },
    passwordHistory: {
      type: Array,
      default: []
    },
    passwordUpdatedAt: {
      type: String,
      default: null
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    isSuperAdmin: {
      type: Boolean,
      default: false
    },
    isDelegatedAdmin: {
      type: Boolean,
      default: false
    },
    delegationExpiresAt: {
      type: String,
      default: null
    },
    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isCurrentUser: {
      type: Boolean,
      default: false
    },
    leaveBalance: {
      casual: { type: Number, default: 12, min: 0 },
      sick: { type: Number, default: 12, min: 0 },
      earned: { type: Number, default: 15, min: 0 },
      maternity: { type: Number, default: 0, min: 0 }
    },
    startingSalary: {
      type: Number,
      default: 35000
    },
    annualCTC: {
      type: Number,
      default: 420000
    },
    salaryBasis: {
      type: String,
      default: 'monthly'
    },
    bankDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    customFields: {
      type: Array,
      default: []
    },
    salary: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        basic: 17500,
        hra: 7000,
        allowances: 10500,
        bonus: 0,
        pf: 0,
        pt: 0,
        tds: 0,
        monthlyGross: 35000,
        netSalary: 35000,
        annualCTC: 420000,
        revisionType: 'initial'
      }
    }
  },
  {
    timestamps: true,
    strict: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual: Full display info
EmployeeSchema.virtual('displayName').get(function () {
  return `${this.name} (${this.employeeCode})`;
});

// Index for fast lookups
EmployeeSchema.index({ status: 1, department: 1 });
EmployeeSchema.index({ isCurrentUser: 1 });

module.exports = mongoose.model('Employee', EmployeeSchema);
