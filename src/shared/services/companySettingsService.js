/**
 * @file companySettingsService.js
 * @description Centralized Company Branding & Payslip Configuration Layer.
 * Allows Admin to dynamically customize company name, address, tax IDs, and signatories across all payslips & letters.
 */

const STORAGE_KEY = 'EMS_COMPANY_SETTINGS';

export const DEFAULT_COMPANY_SETTINGS = {
  companyName: '',
  shortName: '',
  tagline: 'Enterprise Management System & CRM',
  address: '',
  email: '',
  hrEmail: '',
  phone: '',
  website: '',
  cin: '',
  gstin: '',
  pan: '',
  showCompanyNameOnLogin: false, // User setting: Only show company name on login if enabled by Admin
  signatoryTitle: 'Authorized Directorate',
  signatoryName: '',
  footerNote: '* This is an electronic record and does not require a physical signature.',
  // ⏱️ Admin Configurable Shift Timing & Working Hours
  standardWorkHours: 9, // Standard daily work hours (default 9h)
  shiftStartTime: '10:00 AM', // Shift start time (default 10:00 AM)
  shiftEndTime: '07:00 PM', // Shift end time (default 07:00 PM)
  workDaysDescription: 'Mon - Sat (Sunday Off)'
};

export const getCompanySettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // If saved companyName was the old mock Inforag name, clear it so user's preference is honored
      if (parsed.companyName && (parsed.companyName.includes('INFORAG') || parsed.companyName.includes('Inforag'))) {
        parsed.companyName = '';
        parsed.shortName = '';
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return { ...DEFAULT_COMPANY_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn('Error reading company settings:', err);
  }
  return DEFAULT_COMPANY_SETTINGS;
};

export const saveCompanySettings = (newSettings) => {
  try {
    const updated = { ...getCompanySettings(), ...newSettings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom window event so all open modals / pages re-render instantly
    window.dispatchEvent(new Event('company-settings-updated'));
    return updated;
  } catch (err) {
    console.error('Error saving company settings:', err);
    return DEFAULT_COMPANY_SETTINGS;
  }
};
