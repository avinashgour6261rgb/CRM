/**
 * @file EmployeePermissionsTab.jsx
 * @description Enterprise Role-Based Access Control (RBAC) & Granular Permissions Management.
 * Features:
 *  1. 1-Click Base Role Presets (Team Member, Team / Project Lead, HR Specialist).
 *  2. Categorized Granular Capabilities Matrix (26+ Individual Toggles across 5 Modules).
 *  3. Category-level Quick Actions ("Enable All" & "Disable All" in 1 click).
 *  4. Instant Keyword Search Filter to find any permission instantly.
 *  5. Executive Co-Admin Delegation with optional expiry date.
 *  6. Spreadsheet & CSV Data Export Authority Controls.
 *  7. Full Cloud Database Persistence (MongoDB Atlas + Real-Time Sync across all devices/laptops).
 *  8. Primary Administrator Permanent Account Protection.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShieldCheck,
  Check,
  RotateCcw,
  Crown,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Shield,
  Layers,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useHR } from '../../hr/context/HRContext';
import { broadcastSyncEvent } from '../../../shared/services/realtimeSyncService';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import {
  ROLES,
  getUserRole,
  getUserModulePermissions,
  GRANULAR_PERMISSIONS_LIST,
  PERMISSION_CATEGORIES,
  canUserGrantPermissions,
  isAdmin
} from '../../../shared/utils/permissionUtils';

const BASE_ROLES = [
  {
    id: 'team_member',
    roleKey: ROLES.TEAM_MEMBER,
    emoji: '👤',
    title: 'Team Member',
    subtitle: 'Standard Employee (Default)',
    desc: 'Self-service dashboard: personal tasks, shift clock-in/out, personal leaves & support tickets.',
    badgeColor: 'blue',
    presets: {
      dashboard: true,
      tasks: true,
      attendance: true,
      leaves: true,
      tickets: true,
      events: true,
      documentation: false,
      projects: true,
      leads: false,
      employees: false,
      payroll: false,
      finance: false,
      liveOperations: false,
      reports: false,
      createTasks: false,
      viewAllTasks: false,
      deleteTasks: false,
      manageProjects: false,
      viewAllProjects: false,
      deleteProjects: false,
      manageEmployees: false,
      deleteEmployees: false,
      viewAllAttendance: false,
      editAttendance: false,
      forceClockOut: false,
      viewAllLeaves: false,
      approveLeaves: false,
      manageCompanyHolidays: false,
      giveAppreciation: false,
      deleteAppreciations: false,
      accessCRM: false,
      viewAllLeads: false,
      deleteLeads: false,
      manageTickets: false,
      deleteTickets: false,
      postNotices: false,
      deleteNotices: false,
      createChannels: false,
      screenShare: true,
      accessFinance: false,
      manageSalaries: false,
      grantPermissions: false,
      allAccess: false,
      export_leads: false,
      export_payroll: false,
      export_attendance: false,
      tasksScope: 'own',
      projectsScope: 'own',
      leadsScope: 'own'
    }
  },
  {
    id: 'team_lead',
    roleKey: ROLES.TEAM_LEADER,
    emoji: '📋',
    title: 'Team / Project Lead',
    subtitle: 'Squad & Sprint Lead',
    desc: 'Create sprint projects, delegate tasks to teammates, view squad work & review team leaves.',
    badgeColor: 'purple',
    presets: {
      dashboard: true,
      tasks: true,
      projects: true,
      attendance: true,
      leaves: true,
      tickets: true,
      events: true,
      documentation: true,
      leads: false,
      employees: false,
      payroll: false,
      finance: false,
      liveOperations: false,
      reports: false,
      createTasks: true,
      viewAllTasks: true,
      deleteTasks: true,
      manageProjects: true,
      viewAllProjects: true,
      deleteProjects: false,
      manageEmployees: false,
      deleteEmployees: false,
      viewAllAttendance: false,
      editAttendance: false,
      forceClockOut: false,
      viewAllLeaves: true,
      approveLeaves: true,
      manageCompanyHolidays: false,
      giveAppreciation: true,
      deleteAppreciations: false,
      accessCRM: false,
      viewAllLeads: false,
      deleteLeads: false,
      manageTickets: true,
      deleteTickets: false,
      postNotices: true,
      deleteNotices: false,
      createChannels: true,
      screenShare: true,
      accessFinance: false,
      manageSalaries: false,
      grantPermissions: false,
      allAccess: false,
      export_leads: false,
      export_payroll: false,
      export_attendance: false,
      tasksScope: 'team',
      projectsScope: 'team',
      leadsScope: 'own'
    }
  },
  {
    id: 'hr_specialist',
    roleKey: ROLES.HR,
    emoji: '💼',
    title: 'HR Specialist',
    subtitle: 'Workforce & Operations',
    desc: 'Full workforce directory, attendance punch matrix, leave approvals & payroll summaries.',
    badgeColor: 'amber',
    presets: {
      dashboard: true,
      tasks: true,
      projects: true,
      employees: true,
      attendance: true,
      leaves: true,
      payroll: true,
      finance: true,
      events: true,
      documentation: true,
      liveOperations: true,
      reports: true,
      createTasks: false,
      viewAllTasks: true,
      deleteTasks: false,
      manageProjects: false,
      viewAllProjects: true,
      deleteProjects: false,
      manageEmployees: true,
      deleteEmployees: false,
      viewAllAttendance: true,
      editAttendance: true,
      forceClockOut: true,
      viewAllLeaves: true,
      approveLeaves: true,
      manageCompanyHolidays: true,
      giveAppreciation: true,
      deleteAppreciations: false,
      accessCRM: false,
      viewAllLeads: false,
      deleteLeads: false,
      manageTickets: true,
      deleteTickets: false,
      postNotices: true,
      deleteNotices: false,
      createChannels: true,
      screenShare: true,
      accessFinance: true,
      manageSalaries: true,
      grantPermissions: false,
      allAccess: false,
      export_attendance: true,
      export_payroll: true,
      export_leads: false,
      tasksScope: 'own',
      projectsScope: 'own',
      leadsScope: 'own'
    }
  }
];

const SPREADSHEET_EXPORTS_LIST = [
  { key: 'export_attendance', emoji: '📑', label: 'Export Attendance Reports', desc: 'Download monthly timesheets, daily punch logs, and overtime CSV/Excel' },
  { key: 'export_payroll', emoji: '📊', label: 'Export Payroll & Salary Data', desc: 'Download monthly salary registers and compensation summaries' },
  { key: 'export_leads', emoji: '📤', label: 'Export CRM Client Leads', desc: 'Export sales pipeline contacts and CRM lead sheets' }
];

export const EmployeePermissionsTab = () => {
  const { employees, updateEmployee, updateEmployeePermissions } = useHR();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const canEdit = isAdmin(currentUser) || canUserGrantPermissions(currentUser);

  const [selectedEmpId, setSelectedEmpId] = useState(() => {
    const nonAdmin = (employees || []).find(e => !e.isAdmin && e.role?.toLowerCase() !== 'admin');
    return nonAdmin?._id || employees[0]?._id || 'EMP-002';
  });

  const selectedEmp = useMemo(() => {
    return (employees || []).find(e => e._id === selectedEmpId || e.employeeCode === selectedEmpId) || employees[0];
  }, [employees, selectedEmpId]);

  const isSelectedEmpPrimaryAdmin = useMemo(() => {
    if (!selectedEmp) return false;
    return (
      selectedEmp.employeeCode === 'ADM-001' ||
      selectedEmp.isSuperAdmin ||
      selectedEmp.email === 'avinash@inforag.com' ||
      selectedEmp.email === 'admin@inforag.com' ||
      (selectedEmp.isAdmin && (selectedEmp.role || '').toLowerCase() === 'admin')
    );
  }, [selectedEmp]);

  const [permissions, setPermissions] = useState(() => {
    return getUserModulePermissions(selectedEmp);
  });
  const [isDelegatedAdmin, setIsDelegatedAdmin] = useState(false);
  const [delegationExpiresAt, setDelegationExpiresAt] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // UI state for search & filtering
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportsSection, setShowExportsSection] = useState(false);

  // Ref to track last explicitly loaded employee ID
  const lastLoadedEmpIdRef = useRef(null);

  // Sync state ONLY when user explicitly selects a different employee in dropdown
  useEffect(() => {
    if (!selectedEmp) return;
    if (lastLoadedEmpIdRef.current !== selectedEmpId) {
      lastLoadedEmpIdRef.current = selectedEmpId;
      const loaded = getUserModulePermissions(selectedEmp);
      setPermissions(loaded || {});
      setIsDelegatedAdmin(Boolean(selectedEmp?.isDelegatedAdmin || selectedEmp?.isAdmin || selectedEmp?.role?.toLowerCase() === 'admin'));

      let exp = selectedEmp?.delegationExpiresAt || '';
      try {
        const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
        if (rawMap) {
          const parsed = JSON.parse(rawMap);
          const userKey = selectedEmp._id || selectedEmp.employeeCode || selectedEmp.email;
          if (userKey && parsed[userKey]?.delegationExpiresAt) {
            exp = parsed[userKey].delegationExpiresAt;
          }
        }
      } catch (_) {}
      setDelegationExpiresAt(exp);
      setIsSaved(true);
    }
  }, [selectedEmpId, selectedEmp]);

  // Apply baseline preset in 1 click
  const handleApplyBaseRole = (baseRoleId) => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator privileges are permanently active and cannot be altered.', 'warning');
      return;
    }
    if (!canEdit) {
      addToast('Unauthorized: Only Admin or authorized Accessers can modify permissions', 'error');
      return;
    }

    const presetObj = BASE_ROLES.find(r => r.id === baseRoleId);
    if (!presetObj) return;

    setIsDelegatedAdmin(false);
    setPermissions({ ...presetObj.presets });
    setIsSaved(false);
    addToast(`${presetObj.emoji} Applied ${presetObj.title} baseline permissions`, 'info');
  };

  // Toggle single permission key
  const handleTogglePermission = (key) => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator privileges are permanently active.', 'warning');
      return;
    }
    if (!canEdit) {
      addToast('Unauthorized: Only Admin or authorized Accessers can modify permissions', 'error');
      return;
    }

    setPermissions(prev => {
      const nextVal = !prev[key];
      const updated = { ...prev, [key]: nextVal };

      // Automatic elevation: if turning on a capability, ensure parent module view is enabled
      if (nextVal) {
        if (key === 'manageEmployees' || key === 'deleteEmployees') updated.employees = true;
        if (key === 'manageSalaries' || key === 'accessFinance') {
          updated.payroll = true;
          updated.finance = true;
        }
        if (key === 'accessCRM' || key === 'viewAllLeads' || key === 'deleteLeads') updated.leads = true;
        if (key === 'viewAllAttendance' || key === 'editAttendance' || key === 'forceClockOut') updated.attendance = true;
        if (key === 'liveOperations') updated.teamoperations = true;
        if (key === 'approveLeaves' || key === 'viewAllLeaves') updated.leaves = true;
        if (key === 'manageProjects' || key === 'createProjects' || key === 'deleteProjects' || key === 'viewAllProjects') updated.projects = true;
        if (key === 'createTasks' || key === 'viewAllTasks' || key === 'deleteTasks') updated.tasks = true;
        if (key === 'manageTickets' || key === 'deleteTickets') updated.tickets = true;
        if (key === 'documentation') updated.documents = true;
        if (key === 'reports') updated.viewReports = true;
      }

      if (key === 'allAccess') {
        setIsDelegatedAdmin(nextVal);
      }

      return updated;
    });

    setIsSaved(false);
  };

  // Quick action: Grant / Revoke all in a specific category
  const handleToggleCategory = (categoryId, grantAll) => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator privileges are permanently active.', 'warning');
      return;
    }
    if (!canEdit) {
      addToast('Unauthorized: Only Admin or authorized Accessers can modify permissions', 'error');
      return;
    }

    const items = GRANULAR_PERMISSIONS_LIST.filter(p => p.category === categoryId);
    setPermissions(prev => {
      const updated = { ...prev };
      items.forEach(item => {
        updated[item.key] = grantAll;
      });

      if (grantAll) {
        if (categoryId === 'shift_attendance') {
          updated.attendance = true;
          updated.teamoperations = true;
        } else if (categoryId === 'tasks_projects') {
          updated.tasks = true;
          updated.projects = true;
        } else if (categoryId === 'workforce_hr') {
          updated.employees = true;
          updated.leaves = true;
        } else if (categoryId === 'crm_comms') {
          updated.leads = true;
          updated.tickets = true;
        } else if (categoryId === 'finance_admin') {
          updated.payroll = true;
          updated.finance = true;
        }
      }

      return updated;
    });

    setIsSaved(false);
    addToast(`${grantAll ? '✓ Granted' : '✕ Revoked'} all capabilities in ${categoryId.replace('_', ' ')}`, 'info');
  };

  // Co-Admin Delegation Switch
  const handleToggleDelegatedAdmin = () => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator privileges are permanently active.', 'warning');
      return;
    }
    if (!canEdit) {
      addToast('Unauthorized: Only Admin can grant full Co-Admin powers', 'error');
      return;
    }

    const nextVal = !isDelegatedAdmin;
    setIsDelegatedAdmin(nextVal);
    setPermissions(prev => ({
      ...prev,
      allAccess: nextVal,
      isDelegatedAdmin: nextVal
    }));
    setIsSaved(false);
  };

  // Save everything to MongoDB Atlas DB
  const handleSave = async () => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('Primary Administrator settings cannot be altered', 'info');
      return;
    }
    if (!canEdit) {
      addToast('Unauthorized: You do not have permission to alter access rights', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const userKey = selectedEmp.employeeCode || selectedEmp._id;
      const safePerms = { ...permissions };

      if (isDelegatedAdmin) {
        safePerms.allAccess = true;
        safePerms.isDelegatedAdmin = true;
      } else {
        delete safePerms.allAccess;
        delete safePerms.isDelegatedAdmin;
      }

      if (delegationExpiresAt) {
        safePerms.delegationExpiresAt = delegationExpiresAt;
      } else {
        delete safePerms.delegationExpiresAt;
      }

      // 1. Authoritative Save directly to MongoDB Atlas Cloud Database
      if (updateEmployeePermissions) {
        await updateEmployeePermissions(selectedEmp._id, {
          permissions: safePerms,
          isDelegatedAdmin: Boolean(isDelegatedAdmin),
          delegationExpiresAt: delegationExpiresAt || null,
          systemRole: selectedEmp.systemRole || (isDelegatedAdmin ? 'admin' : 'team_member')
        });
      } else if (updateEmployee) {
        await updateEmployee(selectedEmp._id, {
          isDelegatedAdmin: Boolean(isDelegatedAdmin),
          delegationExpiresAt: delegationExpiresAt || null,
          permissions: safePerms
        });
      }

      // 2. Synchronize Local Cache (EMS_USER_PERMISSIONS)
      const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
      const map = rawMap ? JSON.parse(rawMap) : {};
      map[userKey] = safePerms;
      if (selectedEmp._id) map[String(selectedEmp._id)] = safePerms;
      if (selectedEmp.employeeCode) map[String(selectedEmp.employeeCode)] = safePerms;
      if (selectedEmp.email) map[String(selectedEmp.email).toLowerCase()] = safePerms;
      localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(map));

      // 3. Dispatch Live Browser & Cross-Device Broadcast Sync Events
      window.dispatchEvent(new CustomEvent('ems_permissions_updated', { detail: { userKey, permissions: safePerms } }));
      broadcastSyncEvent('PERMISSIONS_UPDATED', {
        userKey,
        employeeId: selectedEmp._id,
        employeeCode: selectedEmp.employeeCode,
        permissions: safePerms,
        isDelegatedAdmin: Boolean(isDelegatedAdmin)
      });
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'EMS_USER_PERMISSIONS' } }));

      setIsSaved(true);
      addToast(`✅ Permissions saved to Database for ${selectedEmp?.name || 'Employee'}!`, 'success');
    } catch (e) {
      console.error('Failed to save permissions to database:', e);
      addToast(`Failed to save permissions: ${e?.message || 'Network error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered permissions list based on active category tab & search query
  const filteredCategories = useMemo(() => {
    return PERMISSION_CATEGORIES.filter(cat => {
      if (activeCategoryTab !== 'all' && cat.id !== activeCategoryTab) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const items = GRANULAR_PERMISSIONS_LIST.filter(p => p.category === cat.id);
      return (
        cat.label.toLowerCase().includes(q) ||
        items.some(p => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))
      );
    });
  }, [activeCategoryTab, searchQuery]);

  return (
    <div className="flex flex-col gap-5 py-2 select-none">

      {/* ── TOP HEADER & ACTIONS ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between flex-wrap gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900/50 shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0 flex items-center gap-2">
              <span>Employee Role & Access Control (RBAC)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ☁️ DB Synced
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 m-0">
              Configure granular modular toggles for any employee. All updates sync authoritative data to MongoDB Atlas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleApplyBaseRole('team_member')}
            disabled={isSelectedEmpPrimaryAdmin || !canEdit}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={13} />
            <span>Reset to Standard</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isSelectedEmpPrimaryAdmin || !canEdit}
            className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl border-0 text-white text-xs font-bold cursor-pointer shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isSaving
                ? 'bg-blue-400 cursor-wait'
                : isSaved
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 animate-pulse'
            }`}
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>{isSaved ? 'Saved in Database' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── EMPLOYEE SELECTOR BAR ── */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:px-5 flex items-center justify-between flex-wrap gap-3.5">
        <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Select Employee:
          </span>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-semibold cursor-pointer flex-1 w-full sm:max-w-[380px] outline-none focus:border-blue-500 transition-colors shadow-xs"
          >
            {(employees || []).map(emp => (
              <option key={emp._id} value={emp._id}>
                {emp.name} ({emp.employeeCode || 'EMP'}) — {emp.role || 'Member'}
              </option>
            ))}
          </select>
        </div>

        {selectedEmp && (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            {selectedEmp.avatar ? (
              <img
                src={selectedEmp.avatar}
                alt={selectedEmp.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px]">
                {selectedEmp.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="leading-tight">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{selectedEmp.name}</span>
                {isSelectedEmpPrimaryAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-800">
                    <Shield size={10} /> Protected Admin
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Code: #{selectedEmp.employeeCode || 'EMP'} • Department: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedEmp.department || 'General'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ADMIN PROTECTED NOTICE ── */}
      {isSelectedEmpPrimaryAdmin && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-4 flex items-center gap-3 text-amber-900 dark:text-amber-200 text-xs">
          <Shield className="text-amber-600 shrink-0" size={20} />
          <div>
            <span className="font-bold">Permanent Administrator Account:</span> This root administrator account has universal master authority over the entire enterprise. All capabilities are permanently active and protected from modification.
          </div>
        </div>
      )}

      {/* ── 1️⃣ BASE ROLE BASELINE PRESETS ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              1. Base Role Presets (1-Click Baseline)
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              (Quickly set standard defaults for Team Member, Lead, or HR)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BASE_ROLES.map(role => {
            const isMemberBase = role.id === 'team_member' && !permissions.manageProjects && !permissions.manageEmployees && !isDelegatedAdmin;
            const isLeadBase = role.id === 'team_lead' && permissions.manageProjects && !permissions.manageEmployees && !isDelegatedAdmin;
            const isHRBase = role.id === 'hr_specialist' && permissions.manageEmployees && !isDelegatedAdmin;
            const isCurrentBase = isMemberBase || isLeadBase || isHRBase;

            return (
              <div
                key={role.id}
                className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                  isCurrentBase
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 shadow-xs ring-1 ring-blue-400/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{role.emoji}</span>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 m-0">
                          {role.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {role.subtitle}
                        </span>
                      </div>
                    </div>
                    {isCurrentBase && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white tracking-wide">
                        ACTIVE PRESET
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-2 m-0 leading-relaxed min-h-[38px]">
                    {role.desc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyBaseRole(role.id)}
                  disabled={isSelectedEmpPrimaryAdmin || !canEdit}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                    isCurrentBase
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isCurrentBase ? '✓ Active Baseline' : `Apply ${role.title} Preset`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2️⃣ EXECUTIVE CO-ADMIN DELEGATION ── */}
      <div className={`rounded-2xl p-4 sm:p-5 flex flex-col gap-3 transition-all ${
        isDelegatedAdmin
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-400 dark:border-blue-700 shadow-sm'
          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
              isDelegatedAdmin ? 'bg-blue-600 shadow-md shadow-blue-600/30' : 'bg-slate-400 dark:bg-slate-700'
            }`}>
              <Crown size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-extrabold ${isDelegatedAdmin ? 'text-blue-950 dark:text-blue-100' : 'text-slate-900 dark:text-slate-100'}`}>
                  Full Administrator Superpowers (Co-Admin Delegation)
                </span>
                {isDelegatedAdmin && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white tracking-wide">
                    CO-ADMIN ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 m-0">
                Grant this user master system privileges identical to Primary Admin (all employees, financial approvals, audit logs, and settings).
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isDelegatedAdmin}
            disabled={isSelectedEmpPrimaryAdmin || !canEdit}
            onClick={handleToggleDelegatedAdmin}
            className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent focus:outline-none cursor-pointer shrink-0 ${
              isDelegatedAdmin ? 'bg-blue-600 shadow-sm shadow-blue-600/30' : 'bg-slate-300 dark:bg-slate-700'
            } ${isSelectedEmpPrimaryAdmin || !canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out ${
                isDelegatedAdmin ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {isDelegatedAdmin && (
          <div className="pt-3 border-t border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-blue-950 dark:text-blue-200 font-bold">
              <Clock size={14} className="text-blue-600" />
              <span>Optional Temporary Delegation Expiry Date:</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-normal">
                (Leave blank for indefinite / permanent delegation)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={delegationExpiresAt}
                onChange={(e) => {
                  setDelegationExpiresAt(e.target.value);
                  setIsSaved(false);
                }}
                className="px-2.5 py-1 text-xs rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold outline-none focus:border-blue-500 shadow-xs"
              />
              {delegationExpiresAt && (
                <button
                  type="button"
                  onClick={() => {
                    setDelegationExpiresAt('');
                    setIsSaved(false);
                  }}
                  className="px-2 py-1 text-[11px] rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 font-semibold cursor-pointer"
                >
                  Clear Expiry
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 3️⃣ GRANULAR MODULAR CAPABILITIES MATRIX ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>3. Modular Granular Permissions Matrix</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                {GRANULAR_PERMISSIONS_LIST.length} Total Capabilities
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 m-0">
              Fine-tune exact capabilities. Each toggle operates independently and saves to the cloud database.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-auto sm:min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search capability or keyword..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 shadow-xs"
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveCategoryTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer ${
              activeCategoryTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All Categories ({GRANULAR_PERMISSIONS_LIST.length})
          </button>
          {PERMISSION_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryTab(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer whitespace-nowrap ${
                activeCategoryTab === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Categories & Capability Cards */}
        <div className="flex flex-col gap-4">
          {filteredCategories.map(cat => {
            const items = GRANULAR_PERMISSIONS_LIST.filter(p => {
              if (p.category !== cat.id) return false;
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase().trim();
              return p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
            });

            if (items.length === 0) return null;

            const enabledCount = items.filter(p => Boolean(permissions[p.key] || isDelegatedAdmin)).length;

            return (
              <div
                key={cat.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col gap-3.5 shadow-xs"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{cat.label}</span>
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                        enabledCount > 0
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {enabledCount} of {items.length} active
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {cat.desc}
                    </div>
                  </div>

                  {canEdit && !isSelectedEmpPrimaryAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(cat.id, true)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-sky-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900/40 cursor-pointer transition-colors"
                      >
                        <CheckCircle2 size={12} />
                        <span>Enable All</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(cat.id, false)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                      >
                        <XCircle size={12} />
                        <span>Disable All</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Capability Toggles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(item => {
                    const isChecked = Boolean(permissions[item.key] || isDelegatedAdmin);
                    const canToggleSingle = canEdit && !isSelectedEmpPrimaryAdmin && !isDelegatedAdmin;

                    return (
                      <div
                        key={item.key}
                        onClick={() => canToggleSingle && handleTogglePermission(item.key)}
                        className={`rounded-xl p-3 border transition-all flex flex-col justify-between gap-2.5 select-none ${
                          canToggleSingle ? 'cursor-pointer hover:shadow-xs' : 'cursor-default'
                        } ${
                          isChecked
                            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/80 shadow-xs'
                            : 'bg-slate-50/50 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base shrink-0">{item.icon}</span>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 m-0 truncate">
                                {item.label}
                              </h4>
                            </div>

                            {/* Clean Switch Toggle */}
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isChecked}
                              disabled={!canToggleSingle}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePermission(item.key);
                              }}
                              className={`relative inline-flex items-center w-10 h-5.5 rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent focus:outline-none cursor-pointer shrink-0 ${
                                isChecked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                              } ${!canToggleSingle ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-4.5 w-4.5 rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out ${
                                  isChecked ? 'translate-x-4.5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 m-0 leading-relaxed line-clamp-2">
                            {item.desc}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50 dark:border-slate-800/50 text-[10.5px]">
                          <span className="text-slate-400">Access:</span>
                          <span className={`font-bold ${isChecked ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                            {isChecked ? '● Active' : '○ Locked'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4️⃣ SPREADSHEET & CSV EXPORT CONTROLS ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowExportsSection(prev => !prev)}
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer border-0 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Layers size={16} className="text-slate-500 dark:text-slate-400" />
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Data Export & Download Authority (CSV / Excel)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2 hidden sm:inline">
                (Allow this employee to export attendance records, salary registers, or CRM leads)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{showExportsSection ? 'Hide' : 'Show'}</span>
            {showExportsSection ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </button>

        {showExportsSection && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SPREADSHEET_EXPORTS_LIST.map(item => {
                const isEnabled = Boolean(permissions[item.key] || isDelegatedAdmin);
                const canToggleSingle = canEdit && !isSelectedEmpPrimaryAdmin && !isDelegatedAdmin;

                return (
                  <div
                    key={item.key}
                    onClick={() => canToggleSingle && handleTogglePermission(item.key)}
                    className={`p-3 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between gap-2.5 min-h-[64px] ${
                      canToggleSingle ? 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800' : 'cursor-default'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
                        <span>{item.emoji}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {item.desc}
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      disabled={!canToggleSingle}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePermission(item.key);
                      }}
                      className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent focus:outline-none cursor-pointer shrink-0 ${
                        isEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      } ${!canToggleSingle ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
