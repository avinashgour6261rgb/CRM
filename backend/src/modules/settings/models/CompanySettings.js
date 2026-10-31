/**
 * @file CompanySettings.js
 * @description Mongoose Schema for Centralized Company Branding, Foundation Anniversary & Shift Policy in MongoDB.
 */

const mongoose = require('mongoose');

const CompanySettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Inforag Technology' },
  shortName: { type: String, default: 'Inforag' },
  tagline: { type: String, default: 'Enterprise Management System & CRM' },
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
  standardWorkHours: { type: Number, default: 9 }, // Standard work hours/day
  shiftStartTime: { type: String, default: '09:30 AM' }, // Work shift start (e.g. 09:30 AM)
  shiftEndTime: { type: String, default: '06:30 PM' }, // Work shift end (e.g. 06:30 PM)
  gracePeriodMinutes: { type: Number, default: 15 }, // Grace period before marked Late (e.g. 15 mins)
  halfDayThresholdHours: { type: Number, default: 4.5 }, // Hours threshold for Half Day
  minOvertimeMinutes: { type: Number, default: 30 }, // Minutes beyond shift for Overtime eligibility
  lunchDurationMinutes: { type: Number, default: 45 },
  teaBreakMinutes: { type: Number, default: 15 },
  workDaysDescription: { type: String, default: 'Mon - Sat (Sunday Off)' }
}, {
  timestamps: true
});

module.exports = mongoose.model('CompanySettings', CompanySettingsSchema);

