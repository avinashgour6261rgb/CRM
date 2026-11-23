/**
 * @file CompanySettings.js
 * @description Mongoose Schema for Centralized Company Branding, Foundation Anniversary & Shift Policy in MongoDB.
 */

const mongoose = require('mongoose');

const CompanySettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Inforag Technology' },
  shortName: { type: String, default: 'Inforag' },
  tagline: { type: String, default: 'Enterprise Management System & CRM' },
  companyLogo: { type: String, default: '' }, // Base64 PNG/JPG/WebP or URL (printed on Payslips, Letters, Sidebar, Login)
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  hrEmail: { type: String, default: '' },
  phone: { type: String, default: '' },
  website: { type: String, default: '' },
  cin: { type: String, default: '' },
  gstin: { type: String, default: '' },
  pan: { type: String, default: '' },
  foundationDate: { type: String, default: '2020-04-15' }, // Company Foundation / Anniversary Date (YYYY-MM-DD)
  showCompanyNameOnLogin: { type: Boolean, default: false },
  signatoryTitle: { type: String, default: 'Authorized Directorate' },
  signatoryName: { type: String, default: '' },
  footerNote: { type: String, default: '* This is an electronic record and does not require a physical signature.' },

  // ⏱️ Dynamic Shift Timing & Work Hours Configuration
  standardWorkHours: { type: Number, default: 9 }, // Standard 9h shift window (10:00 AM - 07:00 PM including breaks)
  shiftStartTime: { type: String, default: '10:00 AM' }, // Work shift start (work before this = automatic Overtime)
  shiftEndTime: { type: String, default: '07:00 PM' }, // Work shift end (work after this = automatic Overtime)
  gracePeriodMinutes: { type: Number, default: 15 }, // Grace period before marked Late (e.g. 15 mins)
  halfDayThresholdHours: { type: Number, default: 4.5 }, // Hours threshold for Half Day
  minOvertimeMinutes: { type: Number, default: 0 }, // Auto-track all work outside 10:00 AM - 07:00 PM
  lunchDurationMinutes: { type: Number, default: 45 },
  teaBreakMinutes: { type: Number, default: 15 },
  weeklyOffDays: { type: [Number], default: [0] }, // 0=Sun, 1=Mon ... 6=Sat (default: Sunday Off)
  workDaysDescription: { type: String, default: 'Mon - Sat (Sunday Off)' },
  disbursedPayrollMonths: { type: [String], default: [] },
  payrollDisbursedHistory: { type: Object, default: {} },
  customRoles: { type: Array, default: [] },
  customDesignations: { type: [String], default: [] },
  customDepartments: { type: [String], default: [] },
  promotionHistory: { type: Array, default: [] },
  lastUpdatedBy: { type: String, default: '' },
  lastUpdatedById: { type: String, default: '' },
  lastUpdatedByCode: { type: String, default: '' },
  lastUpdatedAt: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('CompanySettings', CompanySettingsSchema);

