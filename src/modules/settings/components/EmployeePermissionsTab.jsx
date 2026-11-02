/**
 * @file EmployeePermissionsTab.jsx
 * @description Clean, Intuitive Role-Based Access Control (RBAC) Management.
 * Redesigned for zero layout jitter, 1-click role presets, and a clean collapsible superpower drawer.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Crown,
  Zap,
  CreditCard,
  Building2,
  Users2,
  FolderGit2,
  Clock,
  ChevronDown,
  ChevronUp,
  Lock,
  Layers,
  CheckSquare,
  CalendarCheck,
  Palmtree,
  LifeBuoy,
  FolderLock
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

// 4 Standard Enterprise Role Presets
const ROLE_PRESETS = [
  {
    id: 'team_member',
    name: 'Team Member',
    badge: '👤 Standard',
    color: 'emerald',
    icon: Users2,
    tagline: 'Standard team workflow: Assigned tasks, shift tracking & personal leaves',
    description: 'Sees personal dashboard, assigned sprint tasks, daily attendance clock, applies for personal leaves & submits support tickets. (No management or delete rights)',
    modules: ['dashboard', 'tasks', 'attendance', 'leaves', 'tickets', 'events', 'documentation'],
    extraFlags: {
      tasksScope: 'own',
      projectsScope: 'own',
      leadsScope: 'own',
      viewAllTasks: false,
      viewAllProjects: false,
      viewAllLeads: false,
      viewAllAttendance: false,
      viewAllLeaves: false,
      manageProjects: false,
      manageEmployees: false,
      manageSalaries: false,
      manageExpenses: false,
      editAttendance: false,
      liveOperations: false,
      payroll: false,
      deleteTasks: false,
      deleteProjects: false,
      deleteEmployees: false,
      deleteLeads: false
    }
  },
  {
    id: 'project_lead',
    name: 'Project Lead / PM',
    badge: '🚀 Sprint Lead',
    color: 'purple',
    icon: FolderGit2,
    tagline: 'Sprint planning, project creation & team task delegation',
    description: 'Full project workspace management, assigns tasks to team members, views team sprint backlog, and reviews project deliverable progress.',
    modules: ['dashboard', 'projects', 'tasks', 'attendance', 'leaves', 'tickets', 'events', 'documentation'],
    extraFlags: {
      tasksScope: 'team',
      projectsScope: 'team',
      leadsScope: 'own',
      viewAllTasks: true,
      viewAllProjects: true,
      manageProjects: true,
      approveLeaves: true,
      deleteTasks: true,
      deleteProjects: false,
      manageEmployees: false,
      manageSalaries: false,
      editAttendance: false,
      liveOperations: false,
      payroll: false
    }
  },
  {
    id: 'hr_specialist',
    name: 'HR Operations',
    badge: '💼 Workforce HR',
    color: 'sky',
    icon: Building2,
    tagline: 'Workforce directory, attendance oversight & leave approvals',
    description: 'Universal leave review & approvals, complete employee directory, monthly attendance matrix, company announcements & holiday notices.',
    modules: ['dashboard', 'employees', 'attendance', 'leaves', 'payroll', 'events', 'documentation'],
    extraFlags: {
      tasksScope: 'own',
      projectsScope: 'own',
      leadsScope: 'own',
      viewAllAttendance: true,
      viewAllLeaves: true,
      approveLeaves: true,
      manageEmployees: true,
      editAttendance: true,
      postNotices: true,
      export_attendance: true,
      export_payroll: true,
      manageSalaries: true,
      manageExpenses: true,
      manageProjects: false,
      deleteTasks: false
    }
  },
  {
    id: 'admin',
    name: 'Administrator',
    badge: '👑 Master Admin',
    color: 'blue',
    icon: Crown,
    tagline: 'Unrestricted master enterprise authority across all modules & settings',
    description: 'Full unrestricted power: Live operations, shift overrides, financial hubs, payroll, security delegation, and permanent delete authority.',
    modules: [
      'dashboard', 'liveOperations', 'projects', 'tasks', 'leads', 'attendance',
      'leaves', 'tickets', 'events', 'employees', 'payroll', 'finance', 'reports', 'documentation'
    ],
    extraFlags: {
      allAccess: true,
      isDelegatedAdmin: true,
      tasksScope: 'all',
      projectsScope: 'all',
      leadsScope: 'all',
      viewAllTasks: true,
      viewAllProjects: true,
      viewAllLeads: true,
      viewAllAttendance: true,
      viewAllLeaves: true,
      viewAllTickets: true,
      manageProjects: true,
      manageEmployees: true,
      manageSalaries: true,
      manageExpenses: true,
      editAttendance: true,
      liveOperations: true,
      payroll: true,
      finance: true,
      postNotices: true,
      deleteTasks: true,
      deleteProjects: true,
      deleteEmployees: true,
      deleteLeads: true,
      deleteTickets: true,
      deleteNotices: true,
      export_leads: true,
      export_payroll: true,
      export_attendance: true,
      grantPermissions: true
    }
  }
];

// 5 High-Impact Granular Superpowers (Collapsible Drawer)
const SUPERPOWER_LIST = [
  {
    key: 'liveOperations',
    name: 'Live Operations & Shift Monitor',
    icon: Zap,
    color: 'amber',
    description: 'Monitor live active timers, view clock punches, and perform shift overrides or force clock-out.',
    syncKeys: ['editAttendance', 'viewAllAttendance']
  },
  {
    key: 'payroll',
    name: 'Payroll & Compensation Hub',
    icon: CreditCard,
    color: 'emerald',
    description: 'Access employee compensation structures, salary history, and export monthly payroll records.',
    syncKeys: ['manageSalaries', 'export_payroll']
  },
  {
    key: 'employees',
    name: 'Employee Directory Management',
    icon: Building2,
    color: 'indigo',
    description: 'Onboard new team members, edit personnel profiles, and manage the company directory.',
    syncKeys: ['manageEmployees']
  },
  {
    key: 'leads',
    name: 'CRM Leads & Sales Pipeline',
    icon: Users2,
    color: 'cyan',
    description: 'Access company sales leads, client CRM pipelines, deals conversion and leads export.',
    syncKeys: ['viewAllLeads', 'accessCRM', 'export_leads']
  },
  {
    key: 'isDelegatedAdmin',
    name: 'Master Admin Delegation',
    icon: Crown,
    color: 'blue',
    description: 'Grant identical master administrator authority across all company systems & security settings.',
    syncKeys: ['allAccess']
  }
];

export const EmployeePermissionsTab = () => {
  const { employees, updateEmployee, updateEmployeePermissions } = useHR();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  // Admin's own permissions — can only grant what they hold
  const adminPerms = getUserModulePermissions(currentUser);

  const [selectedEmpId, setSelectedEmpId] = useState(() => {
    const nonAdmin = (employees || []).find(e => !e.isAdmin && e.role?.toLowerCase() !== 'admin');
    return nonAdmin?._id || employees[0]?._id || 'ENG-001';
  });

  const selectedEmp = (employees || []).find(
    e => e._id === selectedEmpId || e.employeeCode === selectedEmpId
  ) || employees[0];

  const selectedRole = selectedEmp ? getUserRole(selectedEmp) : ROLES.TEAM_MEMBER;

  const isSelectedEmpPrimaryAdmin =
    selectedEmp?.employeeCode === 'ADM-001' ||
    selectedEmp?.isSuperAdmin ||
    selectedEmp?.email === 'admin@inforag.com' ||
    (selectedEmp?.isAdmin && (selectedEmp?.role || '').toLowerCase() === 'admin');

  // Permissions state
  const [permissions, setPermissions] = useState(() => getUserModulePermissions(selectedEmp));
  const [isDelegatedAdmin, setIsDelegatedAdmin] = useState(false);
  const [delegationExpiresAt, setDelegationExpiresAt] = useState('');
  const [showSuperpowers, setShowSuperpowers] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when selected employee changes
  useEffect(() => {
    if (selectedEmp) {
      setPermissions(getUserModulePermissions(selectedEmp));
      setIsDelegatedAdmin(
        !!selectedEmp?.isDelegatedAdmin ||
        selectedEmp?.isAdmin ||
        selectedEmp?.role?.toLowerCase() === 'admin'
      );
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

  // Determine which Role Preset best matches the current state
  const activePresetId = useMemo(() => {
    if (isDelegatedAdmin || permissions.allAccess) return 'admin';
    if (permissions.manageEmployees || (permissions.employees && permissions.leaves)) return 'hr_specialist';
    if (permissions.manageProjects || permissions.projects) return 'project_lead';
    return 'team_member';
  }, [isDelegatedAdmin, permissions]);

  // Count active superpowers beyond the base role
  const activeSuperpowersCount = useMemo(() => {
    let count = 0;
    if (permissions.liveOperations || permissions.editAttendance) count++;
    if (permissions.payroll || permissions.manageSalaries) count++;
    if (permissions.employees || permissions.manageEmployees) count++;
    if (permissions.leads || permissions.viewAllLeads) count++;
    if (isDelegatedAdmin) count++;
    return count;
  }, [permissions, isDelegatedAdmin]);

  // Apply a clean 1-click Role Preset
  const handleSelectRolePreset = (presetId) => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator authority is protected and cannot be altered.', 'warning');
      return;
    }

    const preset = ROLE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const newPerms = {};
    // Turn on modules in preset
    preset.modules.forEach(m => {
      newPerms[m] = true;
    });
    // Merge extra flags
    Object.assign(newPerms, preset.extraFlags);

    if (presetId === 'admin') {
      setIsDelegatedAdmin(true);
      newPerms.isDelegatedAdmin = true;
      newPerms.allAccess = true;
    } else {
      setIsDelegatedAdmin(false);
      delete newPerms.isDelegatedAdmin;
      delete newPerms.allAccess;
    }

    // Safety clamp — cannot grant what admin does not hold
    const clamped = {};
    Object.keys(newPerms).forEach(k => {
      clamped[k] = adminPerms[k] === false ? false : newPerms[k];
    });

    setPermissions(clamped);
    setIsSaved(false);
    addToast(`✨ Configured "${preset.name}" preset for ${selectedEmp?.name}. Click Save to apply.`, 'info');
  };

  // Toggle a single Superpower with fixed layout height
  const handleToggleSuperpower = (key, syncKeys = []) => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator privileges are permanently active.', 'warning');
      return;
    }
    if (adminPerms[key] === false) {
      addToast('⚠️ You cannot grant a permission you do not have yourself.', 'warning');
      return;
    }

    if (key === 'isDelegatedAdmin') {
      const nextVal = !isDelegatedAdmin;
      setIsDelegatedAdmin(nextVal);
      setPermissions(prev => ({
        ...prev,
        allAccess: nextVal,
        isDelegatedAdmin: nextVal
      }));
      setIsSaved(false);
      return;
    }

    const currentVal = !!permissions[key];
    const nextVal = !currentVal;

    setPermissions(prev => {
      const updated = { ...prev, [key]: nextVal };
      syncKeys.forEach(sk => {
        updated[sk] = nextVal;
      });
      return updated;
    });
    setIsSaved(false);
  };

  // Reset to default role configuration
  const handleResetToRoleDefault = () => {
    const defaultPerms = DEFAULT_MODULE_PERMISSIONS[selectedRole] || DEFAULT_MODULE_PERMISSIONS.team_member;
    const clamped = {};
    Object.keys(defaultPerms).forEach(k => {
      clamped[k] = adminPerms[k] === false ? false : defaultPerms[k];
    });
    setPermissions(clamped);
    setIsDelegatedAdmin(false);
    setDelegationExpiresAt('');
    setIsSaved(false);
    addToast(`Reset to default ${selectedRole} permissions`, 'info');
  };

  // Persist directly to MongoDB Atlas
  const handleSave = async () => {
    if (!selectedEmp?._id) return;
    setIsSaving(true);
    try {
      const userKey = selectedEmp._id || selectedEmp.employeeCode || selectedEmp.email;

      // Final safety clamp
      const safePerms = {};
      Object.keys(permissions).forEach(k => {
        safePerms[k] = adminPerms[k] === false ? false : permissions[k];
      });

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

      // 1. Authoritative Save to MongoDB Atlas via HR Service
      if (updateEmployeePermissions) {
        await updateEmployeePermissions(selectedEmp._id, {
          permissions: safePerms,
          isDelegatedAdmin: Boolean(isDelegatedAdmin),
          delegationExpiresAt: delegationExpiresAt || null,
          systemRole: selectedEmp.systemRole
        });
      } else if (updateEmployee) {
        await updateEmployee(selectedEmp._id, {
          isDelegatedAdmin: Boolean(isDelegatedAdmin),
          delegationExpiresAt: delegationExpiresAt || null,
          permissions: safePerms
        });
      }

      // 2. Sync Local Storage Cache
      const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
      const map = rawMap ? JSON.parse(rawMap) : {};
      map[userKey] = safePerms;
      if (selectedEmp._id) map[String(selectedEmp._id)] = safePerms;
      if (selectedEmp.employeeCode) map[String(selectedEmp.employeeCode)] = safePerms;
      if (selectedEmp.email) map[String(selectedEmp.email).toLowerCase()] = safePerms;
      localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(map));

      // 3. Dispatch Reactive Events
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
      addToast(`✅ Saved permissions directly to database for ${selectedEmp?.name || 'Employee'}!`, 'success');
    } catch (e) {
      console.error('Failed to save permissions to database:', e);
      addToast(`Failed to save permissions: ${e?.message || 'Network error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 py-4 max-w-6xl mx-auto">
      {/* ── HEADER BAR ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900/50 shadow-xs">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                Employee Access & Role Presets
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                MongoDB Synced
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 m-0">
              Select an employee, pick their role tier in 1-click, or grant extra superpowers without layout clutter.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToRoleDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <RotateCcw size={13} />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl border-0 text-white text-xs font-bold cursor-pointer shadow-md transition-all ${
              isSaving
                ? 'bg-blue-400 cursor-wait'
                : isSaved
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25 ring-2 ring-blue-500/20 animate-pulse'
            }`}
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving to DB...</span>
              </>
            ) : (
              <>
                <Check size={15} />
                <span>{isSaved ? 'Saved in Database' : 'Save Changes *'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── EMPLOYEE SELECTOR ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Target Employee:
          </span>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-slate-100 font-bold cursor-pointer flex-1 max-w-[400px] outline-none focus:border-blue-500 focus:bg-white transition-all shadow-xs"
          >
            {(employees || []).map(emp => (
              <option key={emp._id} value={emp._id}>
                {emp.name} ({emp.employeeCode || 'EMP'}) — {emp.role || 'Team Member'}
              </option>
            ))}
          </select>
        </div>

        {selectedEmp && (
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <img
              src={selectedEmp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={selectedEmp.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
            />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {selectedEmp.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                ID: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedEmp.employeeCode || 'EMP-001'}</span> • Role: <span className="font-bold text-blue-600 dark:text-blue-400">{selectedEmp.role || 'Member'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── STEP 1: 4 ROLE PRESET CARDS (CLEAN & SIMPLE) ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Step 1: Choose Employee Role Preset
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            1-click automatically configures standard permissions for normal employees
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {ROLE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isCurrent = activePresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectRolePreset(preset.id)}
                className={`relative rounded-2xl p-4 flex flex-col justify-between cursor-pointer border-[1.5px] transition-all min-h-[160px] select-none ${
                  isCurrent
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-600 dark:border-blue-500 shadow-md shadow-blue-500/10'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      <Icon size={18} />
                    </div>
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                        <Check size={11} /> Active Preset
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {preset.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                    {preset.name}
                  </h3>
                  <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 mt-1 m-0 line-clamp-2">
                    {preset.tagline}
                  </p>
                </div>

                <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 dark:text-slate-500">
                    {preset.modules.length} Standard Modules
                  </span>
                  <span className={`font-bold ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {isCurrent ? 'Selected' : 'Click to Apply'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── STEP 2: ACTIVE ACCESS SUMMARY STRIP ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:px-5 flex flex-col gap-2.5 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Active Access Summary for {selectedEmp?.name || 'Employee'}:
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Visible in user dashboard navigation
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'attendance', label: 'Attendance' },
            { id: 'leaves', label: 'Leaves' },
            { id: 'projects', label: 'Projects' },
            { id: 'liveOperations', label: 'Live Operations' },
            { id: 'leads', label: 'CRM Leads' },
            { id: 'tickets', label: 'Tickets' },
            { id: 'employees', label: 'Directory' },
            { id: 'payroll', label: 'Payroll' },
            { id: 'events', label: 'Calendar' },
            { id: 'documentation', label: 'Documents' }
          ].map(mod => {
            const isAccessible = !!permissions[mod.id] || isDelegatedAdmin;
            return (
              <span
                key={mod.id}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                  isAccessible
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700/40 opacity-60'
                }`}
              >
                {isAccessible ? <Check size={11} className="text-emerald-600" /> : <Lock size={10} />}
                <span>{mod.label}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── STEP 3: GRANT EXTRA ACCESS / SUPERPOWERS (COLLAPSIBLE DRAWER) ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Accordion Trigger */}
        <button
          type="button"
          onClick={() => setShowSuperpowers(prev => !prev)}
          className="w-full px-5 py-4 flex items-center justify-between text-left bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors border-0 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-900/50">
              <Zap size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Grant Extra Superpowers & Custom Access (Optional)
                </span>
                {activeSuperpowersCount > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    {activeSuperpowersCount} Extra Active
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Normal users don't need changes. Open only if you need to grant specific administrative superpowers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{showSuperpowers ? 'Hide Superpowers' : 'Configure Extra Access'}</span>
            {showSuperpowers ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {/* Collapsible Content: 5 Fixed-Height Cards — ZERO JITTER / LAYOUT SHIFT */}
        {showSuperpowers && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SUPERPOWER_LIST.map((sp) => {
                const Icon = sp.icon;
                const isEnabled = sp.key === 'isDelegatedAdmin'
                  ? Boolean(isDelegatedAdmin)
                  : Boolean(permissions[sp.key] || isDelegatedAdmin);
                const adminHas = sp.key === 'isDelegatedAdmin' ? true : adminPerms[sp.key] !== false;

                return (
                  <div
                    key={sp.key}
                    className={`h-[78px] px-4 rounded-xl border flex items-center justify-between gap-3.5 transition-colors overflow-hidden ${
                      !adminHas
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-70'
                        : isEnabled
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/80'
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    {/* Left: Icon & Constant 1-Line Description (Fixed Height - Never Jumps!) */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isEnabled
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                          <span>{sp.name}</span>
                          {!adminHas && <Lock size={11} className="text-rose-500 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {sp.description}
                        </div>
                      </div>
                    </div>

                    {/* Right: Fixed-Size Toggle Switch (Never Causes Reflow) */}
                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`text-[11px] font-bold min-w-[32px] text-right ${
                        isEnabled ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                      }`}>
                        {isEnabled ? 'ON' : 'OFF'}
                      </span>
                      <label className={`relative inline-block w-11 h-6 shrink-0 ${adminHas ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          disabled={!adminHas}
                          onChange={() => handleToggleSuperpower(sp.key, sp.syncKeys)}
                          className="sr-only"
                        />
                        <span className={`block w-full h-full rounded-full transition-colors ${
                          !adminHas
                            ? 'bg-slate-200 dark:bg-slate-800'
                            : isEnabled
                              ? 'bg-blue-600'
                              : 'bg-slate-300 dark:bg-slate-700'
                        }`}>
                          <span className={`absolute top-[3px] h-[18px] w-[18px] bg-white rounded-full transition-transform shadow-xs ${
                            isEnabled ? 'translate-x-[22px]' : 'translate-x-[3px]'
                          }`} />
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Optional Expiry for Delegated Admin */}
            {isDelegatedAdmin && (
              <div className="mt-2 p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2 text-blue-950 dark:text-blue-200 font-bold">
                  <Clock size={15} className="text-blue-600" />
                  <span>Temporary Admin Expiry (Optional):</span>
                  <span className="text-slate-500 text-[11px] font-normal">
                    (Leave empty for permanent delegation)
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
                    className="px-2.5 py-1 text-xs rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold outline-none focus:border-blue-500"
                  />
                  {delegationExpiresAt && (
                    <button
                      type="button"
                      onClick={() => {
                        setDelegationExpiresAt('');
                        setIsSaved(false);
                      }}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 font-semibold cursor-pointer border-0"
                    >
                      Clear Expiry
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
