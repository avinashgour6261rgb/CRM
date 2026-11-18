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
  companyLogo: '',
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
  minOvertimeMinutes: 0, // Every minute outside shift window above this counts as overtime
  lunchDurationMinutes: 45,
  teaBreakMinutes: 15,
  weeklyOffDays: [0], // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  workDaysDescription: 'Mon - Sat (Sunday Off)',
  disbursedPayrollMonths: []
};

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const getWeeklyOffDays = (settings) => {
  const cfg = settings || getCompanySettings();
  if (Array.isArray(cfg?.weeklyOffDays) && cfg.weeklyOffDays.length > 0) {
    return cfg.weeklyOffDays.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
  }
  return [0];
};

export const formatWeeklyOffDescription = (offDays = [0]) => {
  const normalized = [...new Set((offDays || []).map(Number).filter(n => n >= 0 && n <= 6))].sort((a, b) => a - b);
  if (normalized.length === 0) return 'All 7 Days Active (No Weekly Off)';
  if (normalized.length === 1 && normalized[0] === 0) return 'Mon - Sat (Sunday Off)';
  if (normalized.length === 2 && normalized[0] === 0 && normalized[1] === 6) return 'Mon - Fri (Sat & Sun Off)';
  const working = [1, 2, 3, 4, 5, 6, 0].filter(d => !normalized.includes(d));
  const workStr = working.map(d => DAY_NAMES_SHORT[d]).join(', ');
  const offStr = normalized.map(d => DAY_NAMES_FULL[d]).join(' & ');
  return `${workStr} (${offStr} Off)`;
};

export const time12To24 = (timeStr = '10:00 AM') => {
  if (!timeStr) return '10:00';
  const s = String(timeStr).trim().toUpperCase();
  const match = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (!match) return '10:00';
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const mer = match[3];
  if (mer === 'PM' && h < 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const time24To12 = (time24 = '10:00') => {
  if (!time24 || !String(time24).includes(':')) return '10:00 AM';
  const [hRaw, mRaw] = String(time24).split(':').map(Number);
  const h24 = Number.isFinite(hRaw) ? hRaw : 10;
  const mins = Number.isFinite(mRaw) ? mRaw : 0;
  const mer = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${mer}`;
};

export const computeHoursBetween12h = (startStr, endStr) => {
  const toMins = (str) => {
    const t24 = time12To24(str);
    const [h, m] = t24.split(':').map(Number);
    return (h * 60) + m;
  };
  let diff = toMins(endStr) - toMins(startStr);
  if (diff <= 0) diff += 24 * 60;
  return Math.max(1, Math.min(16, +(diff / 60).toFixed(1)));
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
  // Send only the updated fields (stripped of MongoDB metadata) so partial updates
  // like Payroll disbursement don't overwrite unrelated fields or re-send large logos
  const payload = { ...(newSettings || {}) };
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

export const applyShiftPolicyToOrg = async ({ syncEmployeeShifts = true, recalculateScope = 'today' } = {}) => {
  const res = await fetch(`${API_BASE}/company-settings/apply-shift-policy`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ syncEmployeeShifts, recalculateScope })
  });
  if (!res.ok) {
    let errMsg = `Failed to apply shift policy (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.message) errMsg = errJson.message;
    } catch (_) {}
    throw new Error(errMsg);
  }
  const json = await res.json();
  window.dispatchEvent(new Event('company-settings-updated'));
  window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'hrms_attendance' } }));
  window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'hrms_employees' } }));
  return json;
};
