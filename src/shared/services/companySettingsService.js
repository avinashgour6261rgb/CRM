/**
 * @file companySettingsService.js
 * @description Centralized Company Branding, Anniversary & Payslip/Shift Policy Configuration Layer in MongoDB Atlas.
 */

import { API_BASE, getAuthHeaders } from '../config/apiConfig';

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
  standardWorkHours: 9, // Standard daily shift window (10:00 AM - 07:00 PM, 9h including breaks)
  shiftStartTime: '10:00 AM', // Shift start time (work before this counts as Overtime)
  shiftEndTime: '07:00 PM', // Shift end time (work after this counts as Overtime)
  gracePeriodMinutes: 15, // Grace period before marked Late (e.g. 15 mins)
  halfDayThresholdHours: 4.5, // Work hours below which is marked Half Day
  minOvertimeMinutes: 0, // Every minute outside 10 AM - 7 PM counts automatically as overtime
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

const applyCompanyTitle = (settings) => {
  try {
    if (typeof document !== 'undefined' && settings?.companyName) {
      document.title = `${settings.companyName} — Enterprise Management System`;
    }
  } catch (_) {}
};

// Fetch from MongoDB database on app start and cache in localStorage
export const fetchCompanySettingsFromDB = async () => {
  try {
    const res = await fetch(`${API_BASE}/company-settings`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        const merged = { ...DEFAULT_COMPANY_SETTINGS, ...json.data };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        applyCompanyTitle(merged);
        window.dispatchEvent(new Event('company-settings-updated'));
        return merged;
      }
    }
  } catch (err) {
    console.warn('[companySettingsService] Offline fallback for company settings:', err);
  }
  const local = getCompanySettings();
  applyCompanyTitle(local);
  return local;
};

export const saveCompanySettings = async (newSettings) => {
  const merged = { ...getCompanySettings(), ...newSettings };
  // Strip MongoDB metadata before PUT
  const payload = { ...merged };
  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;

  // Persist directly to MongoDB Atlas backend first so failures are surfaced clearly
  const res = await fetch(`${API_BASE}/company-settings`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let errMsg = `Failed to save company settings (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.message) errMsg = errJson.message;
    } catch (_) {}
    throw new Error(errMsg);
  }

  let saved = merged;
  try {
    const json = await res.json();
    if (json?.data) {
      saved = { ...DEFAULT_COMPANY_SETTINGS, ...json.data };
    }
  } catch (_) {}

  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  applyCompanyTitle(saved);
  window.dispatchEvent(new Event('company-settings-updated'));
  window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: STORAGE_KEY } }));
  return saved;
};
