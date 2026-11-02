/**
 * @file EmployeePermissionsTab.jsx
 * @description Modern, Clean & Simplified RBAC UI for Admin & HR.
 * Features:
 *  1. 1-Click Base Role Selection (Team Member, Team Lead, HR Specialist).
 *  2. 6 Modular Extra Access Cards (Live Operations, Project Lead, Employee Roster, Payroll, Leaves, CRM Leads).
 *  3. Fixed-height, static layout (Zero layout jitter/jumping on toggle).
 *  4. Co-Admin Delegation with optional expiry date.
 *  5. Optional Collapsible Advanced Controls (granular delete/export switches).
 *  6. Full DB persistence (MongoDB Atlas + localStorage cache sync).
 *  7. Administrator permanent account protection.
 *  8. Direct, rock-solid switch controls (Zero misfire / instant revert bug fixed).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Check,
  RotateCcw,
  UserCheck,
  Users2,
  Lock,
  Sparkles,
  Crown,
  Briefcase,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Shield,
  Layers
} from 'lucide-react';
import { useHR } from '../../hr/context/HRContext';
import { broadcastSyncEvent } from '../../../shared/services/realtimeSyncService';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import {
  ROLES,
  getUserRole,
  getUserModulePermissions,
  DEFAULT_MODULE_PERMISSIONS
} from '../../../shared/utils/permissionUtils';

const BASE_ROLES = [
  {
    id: 'team_member',
    roleKey: ROLES.TEAM_MEMBER,
    emoji: '👤',
    title: 'Team Member',
    subtitle: 'Standard Employee (Default)',
    desc: 'Self-service dashboard: own tasks, shift clock-in/out, personal leaves & support tickets.',
    badgeColor: 'blue'
  },
  {
    id: 'team_lead',
    roleKey: ROLES.TEAM_LEAD,
    emoji: '📋',
    title: 'Team / Project Lead',
    subtitle: 'Squad & Sprint Lead',
    desc: 'Create sprint projects, delegate tasks to teammates, view squad work & review team leaves.',
    badgeColor: 'purple'
  },
  {
    id: 'hr_specialist',
    roleKey: ROLES.HR,
    emoji: '💼',
    title: 'HR Specialist',
    subtitle: 'Workforce & Operations',
    desc: 'Full workforce directory, attendance punch matrix, leave approvals & payroll summaries.',
    badgeColor: 'amber'
  }
];

const EXTRA_ACCESS_CARDS = [
  {
    id: 'liveOperations',
    emoji: '🚀',
    title: 'Live Shift Operations',
    subtitle: 'Floor Monitor & Overrides',
    desc: 'Monitor team live shifts, active breaks, and force clock-out overrides.',
    primaryKey: 'liveOperations',
    grantKeys: {
      liveOperations: true,
      editAttendance: true,
      viewAllAttendance: true
    },
    revokeKeys: {
      liveOperations: false,
      editAttendance: false
    }
  },
  {
    id: 'projectLead',
    emoji: '📋',
    title: 'Project & Task Leadership',
    subtitle: 'Delegation & Workspaces',
    desc: 'Create projects, manage sprints, and assign tasks to any team member.',
    primaryKey: 'manageProjects',
    grantKeys: {
      projects: true,
      manageProjects: true,
      viewAllProjects: true,
      viewAllTasks: true,
      tasksScope: 'team',
      projectsScope: 'team'
    },
    revokeKeys: {
      manageProjects: false,
      viewAllProjects: false,
      viewAllTasks: false,
      tasksScope: 'own',
      projectsScope: 'own'
    }
  },
  {
    id: 'employeeDirectory',
    emoji: '👥',
    title: 'Employee Directory Management',
    subtitle: 'Workforce Records',
    desc: 'View team directory, onboard new employees, and manage profiles.',
    primaryKey: 'manageEmployees',
    grantKeys: {
      employees: true,
      manageEmployees: true
    },
    revokeKeys: {
      manageEmployees: false
    }
  },
  {
    id: 'payrollAccess',
    emoji: '💰',
    title: 'Salary & Payroll Access',
    subtitle: 'Compensation & Payslips',
    desc: 'View salary structures, monthly payslips, and compensation reports.',
    primaryKey: 'payroll',
    grantKeys: {
      payroll: true,
      manageSalaries: true,
      export_payroll: true
    },
    revokeKeys: {
      payroll: false,
      manageSalaries: false,
      export_payroll: false
    }
  },
  {
    id: 'leaveApprovals',
    emoji: '🌴',
    title: 'Leave Approval Authority',
    subtitle: 'Absence Decisions',
    desc: 'Review, approve, or reject team leave applications.',
    primaryKey: 'approveLeaves',
    grantKeys: {
      approveLeaves: true,
      viewAllLeaves: true
    },
    revokeKeys: {
      approveLeaves: false
    }
  },
  {
    id: 'crmLeads',
    emoji: '🎯',
    title: 'CRM Sales & Leads Pipeline',
    subtitle: 'Client Deals & Outreach',
    desc: 'Access sales pipeline, manage customer prospects and sales deals.',
    primaryKey: 'leads',
    grantKeys: {
      leads: true,
      accessCRM: true,
      viewAllLeads: true,
      leadsScope: 'all'
    },
    revokeKeys: {
      leads: false,
      accessCRM: false,
      viewAllLeads: false,
      leadsScope: 'own'
    }
  }
];

const ADVANCED_DELETE_EXPORT_LIST = [
  { key: 'deleteTasks', emoji: '🗑️', label: 'Delete Sprint Tasks', desc: 'Permanently delete tasks created by any employee' },
  { key: 'deleteProjects', emoji: '🗂️', label: 'Delete Workspaces & Projects', desc: 'Permanently remove projects and their task backlogs' },
  { key: 'deleteEmployees', emoji: '👥', label: 'Remove Employee Accounts', desc: 'Archive or permanently delete non-admin employee records' },
  { key: 'deleteLeads', emoji: '💼', label: 'Delete CRM Sales Leads', desc: 'Permanently remove client records from CRM pipeline' },
  { key: 'deleteTickets', emoji: '🎫', label: 'Delete Helpdesk Tickets', desc: 'Permanently remove support tickets' },
  { key: 'postNotices', emoji: '📢', label: 'Publish & Delete Board Notices', desc: 'Broadcast notices to the entire company notice board' },
  { key: 'export_leads', emoji: '📤', label: 'Export CRM Leads (CSV/Excel)', desc: 'Download client lead contacts and pipeline data' },
  { key: 'export_payroll', emoji: '📊', label: 'Export Payroll & Salary Data', desc: 'Download salary registers and compensation summaries' },
  { key: 'export_attendance', emoji: '📑', label: 'Export Monthly Attendance', desc: 'Download monthly employee clock in/out timesheet sheets' }
];

export const EmployeePermissionsTab = () => {
  const { employees, updateEmployee, updateEmployeePermissions } = useHR();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [selectedEmpId, setSelectedEmpId] = useState(() => {
    const nonAdmin = (employees || []).find(e => !e.isAdmin && e.role?.toLowerCase() !== 'admin');
    return nonAdmin?._id || employees[0]?._id || 'ENG-001';
  });

  const selectedEmp = (employees || []).find(e => e._id === selectedEmpId || e.employeeCode === selectedEmpId) || employees[0];

  const isSelectedEmpPrimaryAdmin = selectedEmp?.employeeCode === 'ADM-001' ||
    selectedEmp?.isSuperAdmin ||
    selectedEmp?.email === 'avinash@inforag.com' ||
    selectedEmp?.email === 'admin@inforag.com' ||
    (selectedEmp?.isAdmin && (selectedEmp?.role || '').toLowerCase() === 'admin');

  const [permissions, setPermissions] = useState(() => {
    return getUserModulePermissions(selectedEmp);
  });
  const [isDelegatedAdmin, setIsDelegatedAdmin] = useState(false);
  const [delegationExpiresAt, setDelegationExpiresAt] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Ref to track last explicitly loaded employee ID to prevent background loads from wiping uncommitted edits
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

  // Master Authority Toggle: Full Admin Superpowers
  const handleToggleDelegatedAdmin = () => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator authority is protected and cannot be revoked.', 'warning');
      return;
    }
    const nextVal = !isDelegatedAdmin;
    setIsDelegatedAdmin(nextVal);
    setIsSaved(false);

    if (nextVal) {
      const allTrue = { ...permissions, allAccess: true, isDelegatedAdmin: true };
      const allKeys = [
        'dashboard', 'liveOperations', 'projects', 'tasks', 'leads', 'attendance', 'leaves',
        'tickets', 'events', 'employees', 'payroll', 'finance', 'reports', 'documentation',
        'manageProjects', 'viewAllProjects', 'approveLeaves', 'viewAllLeads', 'viewAllTasks',
        'viewAllTickets', 'viewAllAttendance', 'viewAllLeaves', 'manageEmployees', 'accessFinance',
        'manageSalaries', 'manageExpenses', 'editAttendance', 'postNotices', 'grantPermissions',
        'deleteTasks', 'deleteProjects', 'deleteEmployees', 'deleteLeads', 'deleteTickets',
        'export_leads', 'export_payroll', 'export_attendance'
      ];
      allKeys.forEach(k => {
        allTrue[k] = true;
      });
      allTrue.leadsScope = 'all';
      allTrue.tasksScope = 'all';
      allTrue.projectsScope = 'all';
      setPermissions(allTrue);
      addToast(`👑 Full Admin access granted for ${selectedEmp?.name}! Click 'Save' to apply.`, 'info');
    } else {
      handleApplyBaseRole('team_member');
    }
  };

  // 1-Click Base Role Application
  const handleApplyBaseRole = (baseRoleId) => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator authority is protected.', 'warning');
      return;
    }
    setIsDelegatedAdmin(false);

    let nextPerms = {};
    if (baseRoleId === 'team_member') {
      nextPerms = {
        dashboard: true,
        tasks: true,
        attendance: true,
        leaves: true,
        tickets: true,
        events: true,
        documentation: true,
        projects: false,
        leads: false,
        employees: false,
        payroll: false,
        finance: false,
        liveOperations: false,
        reports: false,
        manageProjects: false,
        viewAllProjects: false,
        viewAllTasks: false,
        viewAllAttendance: false,
        viewAllLeaves: false,
        approveLeaves: false,
        manageEmployees: false,
        manageSalaries: false,
        manageExpenses: false,
        editAttendance: false,
        deleteTasks: false,
        deleteProjects: false,
        deleteEmployees: false,
        deleteLeads: false,
        deleteTickets: false,
        export_leads: false,
        export_payroll: false,
        export_attendance: false,
        tasksScope: 'own',
        projectsScope: 'own',
        leadsScope: 'own'
      };
      addToast('👤 Applied Standard Team Member baseline', 'info');
    } else if (baseRoleId === 'team_lead') {
      nextPerms = {
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
        manageProjects: true,
        viewAllProjects: true,
        viewAllTasks: true,
        approveLeaves: true,
        deleteTasks: true,
        deleteProjects: false,
        manageEmployees: false,
        manageSalaries: false,
        manageExpenses: false,
        editAttendance: false,
        tasksScope: 'team',
        projectsScope: 'team',
        leadsScope: 'own'
      };
      addToast('📋 Applied Team / Project Lead preset', 'info');
    } else if (baseRoleId === 'hr_specialist') {
      nextPerms = {
        dashboard: true,
        tasks: true,
        projects: false,
        employees: true,
        attendance: true,
        leaves: true,
        payroll: true,
        finance: true,
        events: true,
        documentation: true,
        liveOperations: true,
        manageEmployees: true,
        viewAllAttendance: true,
        viewAllLeaves: true,
        approveLeaves: true,
        manageSalaries: true,
        manageExpenses: true,
        editAttendance: true,
        postNotices: true,
        export_attendance: true,
        export_payroll: true,
        tasksScope: 'own',
        projectsScope: 'own',
        leadsScope: 'own'
      };
      addToast('💼 Applied HR Specialist preset', 'info');
    }

    setPermissions(nextPerms);
    setIsSaved(false);
  };

  // Check if an extra access card is currently active
  const isExtraAccessActive = (card) => {
    if (isDelegatedAdmin) return true;
    return Boolean(permissions[card.primaryKey]);
  };

  // Toggle an extra access card bundle cleanly
  const handleToggleExtraAccess = (card) => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator privileges are permanently active.', 'warning');
      return;
    }
    const currentActive = isExtraAccessActive(card);
    const nextVal = !currentActive;

    setPermissions(prev => {
      const updated = { ...prev };
      if (nextVal) {
        Object.assign(updated, card.grantKeys);
      } else {
        Object.assign(updated, card.revokeKeys);
      }
      return updated;
    });

    setIsSaved(false);
  };

  // Toggle single advanced switch
  const handleToggleSingle = (key) => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator privileges are permanently active.', 'warning');
      return;
    }
    const currentVal = Boolean(permissions[key] || isDelegatedAdmin);
    setPermissions(prev => ({
      ...prev,
      [key]: !currentVal
    }));
    setIsSaved(false);
  };

  // Save to DB and sync local cache
  const handleSave = async () => {
    if (!selectedEmp?._id) return;
    setIsSaving(true);
    try {
      const userKey = selectedEmp._id || selectedEmp.employeeCode || selectedEmp.email;
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

      // 1. Authoritative Save to MongoDB Atlas
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

      // 2. Local Cache Update
      const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
      const map = rawMap ? JSON.parse(rawMap) : {};
      map[userKey] = safePerms;
      if (selectedEmp._id) map[String(selectedEmp._id)] = safePerms;
      if (selectedEmp.employeeCode) map[String(selectedEmp.employeeCode)] = safePerms;
      if (selectedEmp.email) map[String(selectedEmp.email).toLowerCase()] = safePerms;
      localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(map));

      // 3. Realtime Cross-tab Sync
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
      addToast(`✅ Permissions & Access saved to database for ${selectedEmp?.name || 'Employee'}!`, 'success');
    } catch (e) {
      console.error('Failed to save permissions to database:', e);
      addToast(`Failed to save permissions: ${e?.message || 'Network error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 py-3 select-none">

      {/* ── TOP HEADER & ACTIONS ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between flex-wrap gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900/50 shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0">
              Employee Role & Access Control (RBAC)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 m-0">
              Standard base roles with 1-click modular extra privileges. Changes are securely saved to the database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleApplyBaseRole('team_member')}
            disabled={isSelectedEmpPrimaryAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={13} />
            <span>Reset to Standard</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isSelectedEmpPrimaryAdmin}
            className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl border-0 text-white text-xs font-bold cursor-pointer shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isSaving
                ? 'bg-blue-400 cursor-wait'
                : isSaved
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving to DB...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>{isSaved ? 'Saved in DB' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── EMPLOYEE SELECTOR BAR ── */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:px-5 flex items-center justify-between flex-wrap gap-3.5">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Select Employee:
          </span>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-semibold cursor-pointer flex-1 max-w-[380px] outline-none focus:border-blue-500 transition-colors shadow-xs"
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
            <img
              src={selectedEmp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={selectedEmp.name}
              className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
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
                Code: #{selectedEmp.employeeCode || 'EMP'} • System Role: <span className="font-bold text-blue-600 dark:text-blue-400">{selectedEmp.role || 'Team Member'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ADMIN PROTECTED NOTICE (IF PRIMARY ADMIN) ── */}
      {isSelectedEmpPrimaryAdmin && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-4 flex items-center gap-3 text-amber-900 dark:text-amber-200 text-xs">
          <Shield className="text-amber-600 shrink-0" size={20} />
          <div>
            <span className="font-bold">Permanent Administrator Account:</span> This account is the primary system administrator. All module permissions, operational controls, and administrative powers are permanently active and protected from deletion or lockout.
          </div>
        </div>
      )}

      {/* ── 1️⃣ BASE ROLE BASELINE CARDS (1-CLICK ASSIGNMENT) ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              1. Base Role Baseline
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              (Choose the primary default role for this employee)
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
                        ACTIVE BASE
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
                  disabled={isSelectedEmpPrimaryAdmin}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                    isCurrentBase
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isCurrentBase ? '✓ Active Baseline' : `Apply ${role.title}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2️⃣ MODULAR EXTRA ACCESS CARDS (ZERO LAYOUT JITTER) ── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              2. Extra Access & Special Powers
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              (Enable specific superpowers on top of the base role without cluttered toggles)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXTRA_ACCESS_CARDS.map(card => {
            const isActive = isExtraAccessActive(card);
            const canToggle = !isSelectedEmpPrimaryAdmin;

            return (
              <div
                key={card.id}
                onClick={() => canToggle && handleToggleExtraAccess(card)}
                className={`rounded-2xl p-4 border transition-colors flex flex-col justify-between gap-3 h-[148px] select-none ${
                  canToggle ? 'cursor-pointer hover:shadow-xs' : 'cursor-not-allowed'
                } ${
                  isActive
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{card.emoji}</span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 m-0 truncate">
                          {card.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate">
                          {card.subtitle}
                        </span>
                      </div>
                    </div>

                    {/* Standard Accessible Switch Button — Zero Double-Trigger */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      disabled={!canToggle}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleExtraAccess(card);
                      }}
                      className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent focus:outline-none cursor-pointer shrink-0 ${
                        isActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      } ${!canToggle ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out ${
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Fixed Static Description (Prevents Layout Shifts) */}
                  <p className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-2 m-0 leading-relaxed line-clamp-2">
                    {card.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                  <span className="text-slate-400 dark:text-slate-500">Status:</span>
                  <span className={`font-bold ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {isActive ? '● Granted (Active)' : '○ Standard (Locked)'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3️⃣ EXECUTIVE CO-ADMIN SUPERPOWERS CARD ── */}
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
                Grant this user master privileges identical to Primary Admin (all employees, financial approvals, audit logs, and settings).
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isDelegatedAdmin}
            disabled={isSelectedEmpPrimaryAdmin}
            onClick={handleToggleDelegatedAdmin}
            className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent focus:outline-none cursor-pointer shrink-0 ${
              isDelegatedAdmin ? 'bg-blue-600 shadow-sm shadow-blue-600/30' : 'bg-slate-300 dark:bg-slate-700'
            } ${isSelectedEmpPrimaryAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              <span>Optional Temporary Delegation Expiry:</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-normal">
                (Leave blank for permanent delegation)
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

      {/* ── 4️⃣ OPTIONAL ADVANCED GRANULAR OVERRIDES (COLLAPSIBLE ACCORDION) ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowAdvanced(prev => !prev)}
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left cursor-pointer border-0 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Layers size={16} className="text-slate-500 dark:text-slate-400" />
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Advanced Granular Authority & Export Rights
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2 hidden sm:inline">
                (Optional: fine-tune specific delete privileges and spreadsheet exports)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{showAdvanced ? 'Hide' : 'Show'}</span>
            {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </button>

        {showAdvanced && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ADVANCED_DELETE_EXPORT_LIST.map(item => {
                const isEnabled = Boolean(permissions[item.key] || isDelegatedAdmin);
                const canToggleSingle = !isSelectedEmpPrimaryAdmin;

                return (
                  <div
                    key={item.key}
                    onClick={() => canToggleSingle && handleToggleSingle(item.key)}
                    className={`p-3 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between gap-2.5 h-[64px] ${
                      canToggleSingle ? 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800' : 'cursor-not-allowed'
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
                        handleToggleSingle(item.key);
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
