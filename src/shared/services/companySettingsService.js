/**
 * @file companySettingsService.js
 * @description Centralized Company Branding, Anniversary & Payslip/Shift Policy Configuration Layer in MongoDB Atlas.
 */

import { API_BASE } from '../config/apiConfig';

const STORAGE_KEY = 'EMS_COMPANY_SETTINGS';

export const DEFAULT_COMPANY_SETTINGS = {
  companyName: 'Inforag Technology',
  shortName: 'Inforag',
  tagline: 'Enterprise Management System & CRM',
  address: '',
  email: '',
  hrEmail: '',
  phone: '',
  website: '',
  cin: '',
  gstin: '',
  pan: '',
  foundationDate: '2020-04-15', // 🏢 Company Foundation / Anniversary Day
  showCompanyNameOnLogin: false,
  signatoryTitle: 'Authorized Directorate',
  signatoryName: '',
  footerNote: '* This is an electronic record and does not require a physical signature.',
  
  // ⏱️ Admin Configurable Shift Timing & Working Hours (Strictly followed across company)
  standardWorkHours: 9, // Standard daily work hours (default 9h)
  shiftStartTime: '09:30 AM', // Shift start time (e.g. 09:30 AM)
  shiftEndTime: '06:30 PM', // Shift end time (e.g. 06:30 PM)
  gracePeriodMinutes: 15, // Grace period before marked Late (e.g. 15 mins)
  halfDayThresholdHours: 4.5, // Work hours below which is marked Half Day
  minOvertimeMinutes: 30, // Minimum minutes past shift to qualify for overtime
  lunchDurationMinutes: 45,
  teaBreakMinutes: 15,
  workDaysDescription: 'Mon - Sat (Sunday Off)'
};

export const getCompanySettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_COMPANY_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn('Error reading company settings:', err);
  }
  return DEFAULT_COMPANY_SETTINGS;
};

// Fetch from MongoDB database on app start and cache in localStorage
export const fetchCompanySettingsFromDB = async () => {
  try {
    const res = await fetch(`${API_BASE}/company-settings`);
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        const merged = { ...DEFAULT_COMPANY_SETTINGS, ...json.data };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new Event('company-settings-updated'));
        return merged;
      }
    }
  } catch (err) {
    console.warn('[companySettingsService] Offline fallback for company settings:', err);
  }
  return getCompanySettings();
};

export const saveCompanySettings = async (newSettings) => {
  try {
    const updated = { ...getCompanySettings(), ...newSettings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('company-settings-updated'));

    // Persist directly to MongoDB Atlas backend
    try {
      fetch(`${API_BASE}/company-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(err => console.warn('[companySettingsService] Offline queued:', err));
    } catch (_) {}

    return updated;
  } catch (err) {
    console.error('Error saving company settings:', err);
    return DEFAULT_COMPANY_SETTINGS;
  }
};
