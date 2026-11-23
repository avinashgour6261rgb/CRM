/**
 * @file roleManagementService.js
 * @description Enterprise Role-Based Access Control (RBAC), Custom Roles, Designations, Departments & Promotion Engine.
 * Synced to MongoDB Atlas via CompanySettings (with instant local cache reads).
 */

import { getCompanySettings, saveCompanySettings } from './companySettingsService';
import { getLocalDateString } from '../utils/timerUtils';

const LEGACY_KEY_ROLES = 'EMS_CUSTOM_ROLES';
const LEGACY_KEY_DEPARTMENTS = 'EMS_CUSTOM_DEPARTMENTS';
const LEGACY_KEY_PROMOTIONS = 'EMS_PROMOTION_HISTORY';

export const SYSTEM_ROLES = [
  {
    id: 'admin',
    name: 'Admin',
    badge: '👑 Admin',
    category: 'Executive Management',
    level: 1,
    isSystem: true,
    canBeAssignedBy: ['admin', 'super_admin'],
    permissions: {
      createAdmins: true,
      manageRoles: true,
      manageEmployees: true,
      manageSalaries: true,
      approveLeaves: true,
      manageHolidays: true,
      manageProjects: true,
      manageLeads: true,
      manageTickets: true,
      postNotices: true,
      viewFinancials: true
    },
    description: 'Master unrestricted authority over entire system, RBAC role assignments, and company configuration.'
  },
  {
    id: 'hr',
    name: 'HR',
    badge: '💼 HR',
    category: 'Human Resources',
    level: 2,
    isSystem: true,
    canBeAssignedBy: ['admin', 'super_admin'],
    permissions: {
      createAdmins: false,
      manageRoles: false,
      manageEmployees: true,
      manageSalaries: true,
      approveLeaves: true,
      manageHolidays: true,
      manageProjects: false,
      manageLeads: false,
      manageTickets: true,
      postNotices: true,
      viewFinancials: true
    },
    description: 'Workforce onboarding, leave approvals, monthly attendance management, company holidays & payroll reporting.'
  },
  {
    id: 'team_leader',
    name: 'Team Leader',
    badge: '🚀 Team Leader',
    category: 'Project Management',
    level: 3,
    isSystem: true,
    canBeAssignedBy: ['admin', 'super_admin', 'hr'],
    permissions: {
      createAdmins: false,
      manageRoles: false,
      manageEmployees: false,
      manageSalaries: false,
      approveLeaves: true,
      manageHolidays: false,
      manageProjects: true,
      manageLeads: true,
      manageTickets: true,
      postNotices: true,
      viewFinancials: false
    },
    description: 'Sprint planning, project creation, task delegation, team timesheet oversight & squad leave approvals.'
  },
  {
    id: 'team_member',
    name: 'Team Member',
    badge: '👤 Team Member (Under TL)',
    category: 'Core Workforce (Reports to TL)',
    level: 4,
    isSystem: true,
    canBeAssignedBy: ['admin', 'super_admin', 'hr'],
    permissions: {
      createAdmins: false,
      manageRoles: false,
      manageEmployees: false,
      manageSalaries: false,
      approveLeaves: false,
      manageHolidays: false,
      manageProjects: false,
      manageLeads: false,
      manageTickets: false,
      postNotices: false,
      viewFinancials: false
    },
    description: 'Regular employee reporting to TL: assigned tasks, daily shift tracking, leave applications & personal payslips.'
  }
];

const readLegacyArray = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getCustomRoles = () => {
  const cfg = getCompanySettings();
  const dbRoles = Array.isArray(cfg?.customRoles)
    ? cfg.customRoles.filter(r => r && typeof r === 'object' && r.id && r.name)
    : [];
  const legacyRoles = readLegacyArray(LEGACY_KEY_ROLES).filter(r => r && typeof r === 'object' && r.id && r.name);
  const seen = new Set(dbRoles.map(r => r.id));
  return [...dbRoles, ...legacyRoles.filter(r => !seen.has(r.id))];
};

export const getRoles = () => {
  return [...SYSTEM_ROLES, ...getCustomRoles()];
};

export const createCustomRole = (roleData) => {
  const custom = getCustomRoles();
  const newRole = {
    id: 'custom_' + Date.now(),
    name: roleData.name,
    category: roleData.category || 'Custom Operations',
    level: Number(roleData.level) || 4,
    isSystem: false,
    canBeAssignedBy: ['super_admin', 'admin', 'hr_manager'],
    permissions: {
      createAdmins: false,
      manageEmployees: !!roleData.permissions?.manageEmployees,
      manageSalaries: !!roleData.permissions?.manageSalaries,
      approveLeaves: !!roleData.permissions?.approveLeaves,
      manageProjects: !!roleData.permissions?.manageProjects,
      postNotices: !!roleData.permissions?.postNotices,
      viewFinancials: !!roleData.permissions?.viewFinancials
    },
    description: roleData.description || 'Custom company designation with customized security privileges.'
  };

  const next = [...custom, newRole];
  saveCompanySettings({ customRoles: next }).catch(err => {
    console.warn('[roleManagementService] Failed to sync customRoles to MongoDB:', err?.message || err);
  });
  window.dispatchEvent(new Event('ems_roles_updated'));
  return newRole;
};

export const deleteCustomRole = (roleId) => {
  const next = getCustomRoles().filter(r => r.id !== roleId);
  saveCompanySettings({ customRoles: next }).catch(err => {
    console.warn('[roleManagementService] Failed to sync deleted role to MongoDB:', err?.message || err);
  });
  window.dispatchEvent(new Event('ems_roles_updated'));
};

export const getCustomDesignations = (defaults = []) => {
  const cfg = getCompanySettings();
  const dbList = Array.isArray(cfg?.customDesignations)
    ? cfg.customDesignations.filter(v => typeof v === 'string' && v.trim())
    : [];
  // Gracefully include any legacy string entries saved by older AddEmployeeModal builds
  const legacyStrings = readLegacyArray(LEGACY_KEY_ROLES).filter(v => typeof v === 'string' && v.trim());
  return Array.from(new Set([...defaults, ...dbList, ...legacyStrings]));
};

export const addCustomDesignation = (designation, defaults = []) => {
  const trimmed = String(designation || '').trim();
  if (!trimmed) return getCustomDesignations(defaults);
  const current = getCustomDesignations([]);
  const nextCustom = Array.from(new Set([...current, trimmed]));
  saveCompanySettings({ customDesignations: nextCustom }).catch(err => {
    console.warn('[roleManagementService] Failed to sync customDesignations to MongoDB:', err?.message || err);
  });
  return Array.from(new Set([...defaults, ...nextCustom]));
};

export const getCustomDepartments = (defaults = []) => {
  const cfg = getCompanySettings();
  const dbList = Array.isArray(cfg?.customDepartments)
    ? cfg.customDepartments.filter(v => typeof v === 'string' && v.trim())
    : [];
  const legacyList = readLegacyArray(LEGACY_KEY_DEPARTMENTS).filter(v => typeof v === 'string' && v.trim());
  return Array.from(new Set([...defaults, ...dbList, ...legacyList]));
};

export const addCustomDepartment = (department, defaults = []) => {
  const trimmed = String(department || '').trim();
  if (!trimmed) return getCustomDepartments(defaults);
  const current = getCustomDepartments([]);
  const nextCustom = Array.from(new Set([...current, trimmed]));
  saveCompanySettings({ customDepartments: nextCustom }).catch(err => {
    console.warn('[roleManagementService] Failed to sync customDepartments to MongoDB:', err?.message || err);
  });
  return Array.from(new Set([...defaults, ...nextCustom]));
};

export const canUserAssignRole = (actorRole = 'super_admin', targetRoleId = '') => {
  const normalizedActor = (actorRole || '').toLowerCase();
  const isAdminActor = normalizedActor.includes('admin');

  if (targetRoleId === 'super_admin' || targetRoleId === 'admin' || targetRoleId.toLowerCase().includes('admin')) {
    return isAdminActor;
  }

  if (normalizedActor.includes('hr') || normalizedActor.includes('human resources')) {
    return true;
  }

  return isAdminActor;
};

export const getPromotionHistory = (employeeId = null) => {
  const cfg = getCompanySettings();
  const dbHistory = Array.isArray(cfg?.promotionHistory) ? cfg.promotionHistory : [];
  const legacyHistory = readLegacyArray(LEGACY_KEY_PROMOTIONS);
  const seen = new Set(dbHistory.map(p => p?.id).filter(Boolean));
  const combined = [...dbHistory, ...legacyHistory.filter(p => p && !seen.has(p.id))];

  if (employeeId) {
    return combined.filter(p => p.employeeId === employeeId || p.employeeCode === employeeId);
  }
  return combined;
};

export const recordPromotion = (promotionData) => {
  const history = getPromotionHistory();
  const newRecord = {
    id: 'PROM-' + Date.now(),
    employeeId: promotionData.employeeId,
    employeeName: promotionData.employeeName,
    employeeCode: promotionData.employeeCode,
    employeeAvatar: promotionData.employeeAvatar,
    previousRole: promotionData.previousRole,
    newRole: promotionData.newRole,
    previousDepartment: promotionData.previousDepartment,
    newDepartment: promotionData.newDepartment,
    effectiveDate: promotionData.effectiveDate || getLocalDateString(),
    promotedBy: promotionData.promotedBy || 'Administrator',
    promotedById: promotionData.promotedById || '',
    promotedByCode: promotionData.promotedByCode || '',
    reason: promotionData.reason || 'Outstanding Performance & Leadership',
    remarks: promotionData.remarks || '',
    salaryHikeAmount: promotionData.salaryHikeAmount || 0,
    timestamp: new Date().toISOString()
  };

  const next = [newRecord, ...history].slice(0, 200);
  saveCompanySettings({ promotionHistory: next }).catch(err => {
    console.warn('[roleManagementService] Failed to sync promotionHistory to MongoDB:', err?.message || err);
  });
  window.dispatchEvent(new Event('ems_promotions_updated'));
  return newRecord;
};
