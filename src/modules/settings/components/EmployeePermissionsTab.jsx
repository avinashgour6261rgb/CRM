/**
 * @file EmployeePermissionsTab.jsx
 * @description Settings tab for Admin to manage Module-wise Toggle Permissions per Employee & Role.
 * Meets Requirement PART 4: Settings - Role and Permission Management (Items 15, 16, 17).
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Check,
  RotateCcw,
  UserCheck,
  LayoutDashboard,
  CheckSquare,
  Users2,
  CalendarCheck,
  Palmtree,
  LifeBuoy,
  Calendar,
  Building2,
  BarChart3,
  Eye,
  Lock,
  Sparkles,
  FolderLock,
  Crown,
  FolderGit2,
  Zap,
  CreditCard,
  Landmark,
  FileSpreadsheet,
  Layers,
  Briefcase,
  Clock
} from 'lucide-react';
import { useHR } from '../../hr/context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import {
  ROLES,
  getUserRole,
  getUserModulePermissions,
  DEFAULT_MODULE_PERMISSIONS
} from '../../../shared/utils/permissionUtils';

const MODULE_LIST = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview KPIs, active timer, welcome banner and summary widgets' },
  { id: 'liveOperations', label: 'Live Operations & Shift Controls', icon: Zap, desc: 'Live team monitoring, real-time punch overrides and operational hub' },
  { id: 'projects', label: 'Projects & Workspaces', icon: FolderGit2, desc: 'View projects, assign project members, sprint tracking and deliverables' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, desc: 'Sprint tasks, Kanban board, task timers and delegation' },
  { id: 'leads', label: 'Leads', icon: Users2, desc: 'Sales pipeline, CRM prospects, client conversion deals' },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck, desc: 'Daily clock in/out, shift time matrix, monthly logs' },
  { id: 'leaves', label: 'Leave Management', icon: Palmtree, desc: 'Apply for leaves, view balances, who is on leave today' },
  { id: 'tickets', label: 'Support Tickets', icon: LifeBuoy, desc: 'Raise problem requests, IT helpdesk, issue tickets' },
  { id: 'events', label: 'Events & Calendar', icon: Calendar, desc: 'Company schedules, festivals, and official holiday list' },
  { id: 'employees', label: 'Employee Information', icon: Building2, desc: 'Employee directory, team profiles, and organization structure' },
  { id: 'payroll', label: 'Payroll & Compensation Hub', icon: CreditCard, desc: 'Manage salary hikes, deductions, automated monthly payslips' },
  { id: 'finance', label: 'Finance & Reimbursements', icon: Landmark, desc: 'Expense reimbursements, project claims, financial audit' },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, desc: 'Weekly work reports, timesheet exports and executive KPIs' },
  { id: 'documentation', label: 'Documents & KYC', icon: FolderLock, desc: 'Company documents, KYC verifications, compliance letters and certificates' }
];

export const EmployeePermissionsTab = () => {
  const { employees, updateEmployee } = useHR();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  // Admin's own permissions — can only grant what he himself has
  const adminPerms = getUserModulePermissions(currentUser);

  const [selectedEmpId, setSelectedEmpId] = useState(() => {
    // Default to first non-admin employee if available, or first employee
    const nonAdmin = (employees || []).find(e => !e.isAdmin && e.role?.toLowerCase() !== 'admin');
    return nonAdmin?._id || employees[0]?._id || 'ENG-001';
  });

  const selectedEmp = (employees || []).find(e => e._id === selectedEmpId || e.employeeCode === selectedEmpId) || employees[0];
  const selectedRole = selectedEmp ? getUserRole(selectedEmp) : ROLES.TEAM_MEMBER;

  const isSelectedEmpPrimaryAdmin = selectedEmp?.employeeCode === 'ADM-001' ||
    selectedEmp?.isSuperAdmin ||
    selectedEmp?.email === 'admin@inforag.com' ||
    (selectedEmp?.isAdmin && (selectedEmp?.role || '').toLowerCase() === 'admin');

  // Local state for current employee's toggle permissions
  const [permissions, setPermissions] = useState(() => {
    return getUserModulePermissions(selectedEmp);
  });
  const [isDelegatedAdmin, setIsDelegatedAdmin] = useState(false);
  const [delegationExpiresAt, setDelegationExpiresAt] = useState('');
  const [isSaved, setIsSaved] = useState(true);

  // When selected employee changes, load their saved permissions & delegated status
  useEffect(() => {
    if (selectedEmp) {
      setPermissions(getUserModulePermissions(selectedEmp));
      setIsDelegatedAdmin(!!selectedEmp?.isDelegatedAdmin || selectedEmp?.isAdmin || selectedEmp?.role?.toLowerCase() === 'admin');
      
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

  // Master Authority Toggle: Full Admin Access
  const handleToggleDelegatedAdmin = () => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator authority is protected and cannot be revoked.', 'warning');
      return;
    }
    const nextVal = !isDelegatedAdmin;
    setIsDelegatedAdmin(nextVal);
    setIsSaved(false);
    if (nextVal) {
      const allTrue = {};
      MODULE_LIST.forEach(m => { allTrue[m.id] = true; });
      allTrue.manageProjects = true;
      allTrue.viewAllProjects = true;
      allTrue.approveLeaves = true;
      allTrue.viewAllLeads = true;
      allTrue.viewAllTasks = true;
      allTrue.viewAllTickets = true;
      allTrue.viewAllAttendance = true;
      allTrue.viewAllLeaves = true;
      allTrue.manageEmployees = true;
      allTrue.accessFinance = true;
      allTrue.liveOperations = true;
      allTrue.payroll = true;
      allTrue.finance = true;
      allTrue.allAccess = true;
      allTrue.deleteTasks = true;
      allTrue.deleteProjects = true;
      allTrue.deleteEmployees = true;
      allTrue.deleteLeads = true;
      allTrue.deleteTickets = true;
      allTrue.deleteNotices = true;
      allTrue.manageSalaries = true;
      allTrue.manageExpenses = true;
      allTrue.editAttendance = true;
      allTrue.postNotices = true;
      allTrue.grantPermissions = true;
      allTrue.export_leads = true;
      allTrue.export_payroll = true;
      allTrue.export_attendance = true;
      allTrue.leadsScope = 'all';
      allTrue.tasksScope = 'all';
      allTrue.projectsScope = 'all';
      setPermissions(prev => ({ ...prev, ...allTrue }));
      addToast(`👑 Full Admin access granted for ${selectedEmp?.name}! Click Save to apply.`, 'info');
    } else {
      handleResetToRoleDefault();
    }
  };

  // 1-Click Role Presets
  const applyPreset = (presetType) => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator authority is protected.', 'warning');
      return;
    }

    let preset = {};
    if (presetType === 'viewer') {
      MODULE_LIST.forEach(m => {
        preset[m.id] = ['dashboard', 'projects', 'tasks', 'leads', 'events', 'documentation'].includes(m.id);
      });
      preset.viewAllProjects = false;
      preset.viewAllTasks = false;
      preset.viewAllLeads = false;
      preset.manageProjects = false;
      preset.deleteTasks = false;
      preset.deleteProjects = false;
      preset.deleteLeads = false;
      preset.deleteTickets = false;
      preset.deleteEmployees = false;
      preset.approveLeaves = false;
      preset.manageSalaries = false;
      preset.manageExpenses = false;
      preset.editAttendance = false;
      preset.export_leads = false;
      preset.export_payroll = false;
      preset.export_attendance = false;
      preset.leadsScope = 'own';
      preset.tasksScope = 'own';
      preset.projectsScope = 'own';
      setIsDelegatedAdmin(false);
      addToast('👁️ Applied "Read-Only Viewer" preset', 'info');
    } else if (presetType === 'sales') {
      MODULE_LIST.forEach(m => {
        preset[m.id] = ['dashboard', 'leads', 'tasks', 'tickets', 'events'].includes(m.id);
      });
      preset.viewAllLeads = true;
      preset.leadsScope = 'all';
      preset.tasksScope = 'own';
      preset.deleteLeads = false;
      preset.export_leads = true;
      preset.deleteTasks = false;
      preset.approveLeaves = false;
      preset.manageSalaries = false;
      setIsDelegatedAdmin(false);
      addToast('💼 Applied "Sales & CRM Specialist" preset', 'info');
    } else if (presetType === 'project_lead') {
      MODULE_LIST.forEach(m => {
        preset[m.id] = ['dashboard', 'projects', 'tasks', 'leaves', 'attendance', 'events', 'tickets'].includes(m.id);
      });
      preset.manageProjects = true;
      preset.viewAllProjects = true;
      preset.viewAllTasks = true;
      preset.approveLeaves = true;
      preset.deleteTasks = true;
      preset.tasksScope = 'team';
      preset.projectsScope = 'team';
      preset.manageSalaries = false;
      preset.deleteProjects = false;
      setIsDelegatedAdmin(false);
      addToast('🚀 Applied "Sprint Lead / Project Manager" preset', 'info');
    } else if (presetType === 'hr_specialist') {
      MODULE_LIST.forEach(m => {
        preset[m.id] = ['dashboard', 'employees', 'attendance', 'leaves', 'payroll', 'finance', 'events', 'documentation'].includes(m.id);
      });
      preset.manageEmployees = true;
      preset.viewAllAttendance = true;
      preset.viewAllLeaves = true;
      preset.approveLeaves = true;
      preset.manageSalaries = true;
      preset.manageExpenses = true;
      preset.editAttendance = true;
      preset.postNotices = true;
      preset.export_attendance = true;
      preset.export_payroll = true;
      setIsDelegatedAdmin(false);
      addToast('👥 Applied "HR Operations" preset', 'info');
    }

    const clamped = {};
    Object.keys(preset).forEach(k => {
      clamped[k] = adminPerms[k] === false ? false : preset[k];
    });
    setPermissions(prev => ({ ...prev, ...clamped }));
    setIsSaved(false);
  };

  const handleScopeChange = (key, value) => {
    setPermissions(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  // Admin can only toggle permissions he himself has
  const handleToggle = (key) => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator privileges are permanently active to prevent lockout.', 'warning');
      return;
    }
    if (adminPerms[key] === false) {
      addToast('⚠️ You cannot grant a permission you do not have yourself.', 'warning');
      return;
    }
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setIsSaved(false);
  };

  // 1-Click All Access & Full Administrative Authority
  const handleGrantAll = () => {
    if (isSelectedEmpPrimaryAdmin) {
      addToast('🔒 Primary Administrator authority is protected.', 'warning');
      return;
    }
    const allTrue = { ...permissions, allAccess: true, isDelegatedAdmin: true };
    MODULE_LIST.forEach(m => { allTrue[m.id] = true; });
    [
      'deleteTasks', 'deleteProjects', 'deleteEmployees', 'deleteLeads', 'deleteTickets', 'deleteNotices', 'manageProjects',
      'viewAllProjects', 'approveLeaves', 'viewAllLeads', 'viewAllTasks',
      'viewAllTickets', 'viewAllAttendance', 'viewAllLeaves', 'manageEmployees',
      'accessFinance', 'liveOperations', 'manageSalaries', 'manageExpenses',
      'editAttendance', 'postNotices', 'grantPermissions', 'payroll', 'finance'
    ].forEach(k => { allTrue[k] = true; });

    setPermissions(allTrue);
    setIsDelegatedAdmin(true);
    setIsSaved(false);
    addToast(`⚡ All administrative permissions & module access enabled for ${selectedEmp?.name}! Click Save to apply.`, 'info');
  };

  const handleResetToRoleDefault = () => {
    const defaultPerms = DEFAULT_MODULE_PERMISSIONS[selectedRole] || DEFAULT_MODULE_PERMISSIONS.team_member;
    // Clamp to adminPerms — can't reset to values above what admin has
    const clamped = {};
    Object.keys(defaultPerms).forEach(k => {
      clamped[k] = adminPerms[k] === false ? false : defaultPerms[k];
    });
    setPermissions(clamped);
    setIsSaved(false);
    addToast(`Reset to default ${selectedRole} permissions`, 'info');
  };

  const handleSave = () => {
    try {
      const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
      const map = rawMap ? JSON.parse(rawMap) : {};
      const userKey = selectedEmp?._id || selectedEmp?.employeeCode || selectedEmp?.email;

      if (userKey) {
        // Final safety clamp — ensure no permission exceeds adminPerms
        const safePerms = {};
        Object.keys(permissions).forEach(k => {
          safePerms[k] = adminPerms[k] === false ? false : permissions[k];
        });
        if (isDelegatedAdmin) {
          safePerms.allAccess = true;
          safePerms.isDelegatedAdmin = true;
        }
        if (delegationExpiresAt) {
          safePerms.delegationExpiresAt = delegationExpiresAt;
        } else {
          delete safePerms.delegationExpiresAt;
        }
        map[userKey] = safePerms;
        localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(map));

        if (selectedEmp?._id && updateEmployee) {
          updateEmployee(selectedEmp._id, {
            ...selectedEmp,
            isDelegatedAdmin,
            delegationExpiresAt: delegationExpiresAt || null,
            permissions: safePerms
          });
        }

        window.dispatchEvent(new CustomEvent('ems_permissions_updated', { detail: { userKey, permissions: safePerms } }));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'EMS_USER_PERMISSIONS' } }));
        setIsSaved(true);
        addToast(`✅ Permissions & Admin Access updated for ${selectedEmp?.name || 'Employee'}!`, 'success');
      }
    } catch (e) {
      console.error('Failed to save permissions:', e);
      addToast('Error saving permissions', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5 py-4">
      
      {/* Header Info */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:px-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border-[1.5px] border-blue-200 dark:border-blue-900/50">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0">
              Employee Access & Permission Management
            </h2>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5 m-0">
              Admin control: Decide which modules each employee can access and toggle their data visibility.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToRoleDefault}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`inline-flex items-center gap-1.5 px-[18px] py-[7px] rounded-lg border-0 text-white text-[12.5px] font-bold cursor-pointer shadow-sm transition-all ${
              isSaved
                ? 'bg-green-600 hover:bg-green-700 shadow-green-600/25'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
            }`}
          >
            <Check size={14} />
            <span>{isSaved ? 'Saved' : 'Save Permissions'}</span>
          </button>
        </div>
      </div>

      {/* Employee Selector Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:px-5 flex items-center justify-between flex-wrap gap-3.5">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Select Employee:
          </label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="px-3 py-2 rounded-lg border-[1.5px] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 font-semibold cursor-pointer flex-1 max-w-[360px] outline-none focus:border-blue-500 transition-colors"
          >
            {(employees || []).map(emp => (
              <option key={emp._id} value={emp._id}>
                {emp.name} ({emp.employeeCode || 'EMP'}) — {emp.role || 'Member'}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Employee Quick Card */}
        {selectedEmp && (
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <img
              src={selectedEmp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={selectedEmp.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div>
              <div className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100">
                {selectedEmp.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Role: <span className="font-bold text-blue-600 dark:text-blue-400">{selectedEmp.role}</span> • ID: #{selectedEmp.employeeCode || 'EMP-001'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MASTER ADMIN AUTHORITY DELEGATION CARD ── */}
      <div className={`rounded-2xl p-4 sm:px-5 flex flex-col gap-3 transition-all ${
        isDelegatedAdmin
          ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/30 border-[1.5px] border-blue-500 dark:border-blue-600 shadow-md shadow-blue-500/10'
          : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-3.5">
          <div className="flex items-center gap-3.5">
            <div className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center text-white shrink-0 ${
              isDelegatedAdmin ? 'bg-blue-600 shadow-md shadow-blue-600/30' : 'bg-slate-400'
            }`}>
              <Crown size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-extrabold ${isDelegatedAdmin ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-100'}`}>
                  Full Admin Authority Delegation
                </span>
                {isDelegatedAdmin && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white tracking-wide">
                    FULL ACCESS ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0">
                Grant this user identical superpowers to Master Admin (all employees, reports, documentation, approvals, and system controls).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <label className="relative inline-block w-[46px] h-6 cursor-pointer">
              <input
                type="checkbox"
                checked={isDelegatedAdmin}
                onChange={handleToggleDelegatedAdmin}
                className="sr-only"
              />
              <span className={`block w-full h-full rounded-full transition-colors ${
                isDelegatedAdmin ? 'bg-blue-600 shadow-sm shadow-blue-600/30' : 'bg-slate-300'
              }`}>
                <span className={`absolute top-[3px] h-[18px] w-[18px] bg-white rounded-full transition-all shadow-sm ${
                  isDelegatedAdmin ? 'left-[24px]' : 'left-[3px]'
                }`} />
              </span>
            </label>
          </div>
        </div>

        {/* Temporary Delegation Expiry (Optional) */}
        {isDelegatedAdmin && (
          <div className="pt-3 mt-1 border-t border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-blue-950 dark:text-blue-200 font-bold">
              <Clock size={15} className="text-blue-600" />
              <span>Temporary Delegation Expiry (Optional):</span>
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
                className="px-2.5 py-1 text-xs rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold outline-none focus:border-blue-500"
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

      {/* ── ⚡ 1-CLICK ROLE PRESETS BAR ── */}
      <div className="flex flex-col gap-2.5 p-3.5 px-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Enterprise Role Presets (1-Click Assignment)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Quickly configure standard permission sets for roles
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => applyPreset('viewer')}
            className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
            title="Read-only access across core modules (No delete/edit rights)"
          >
            <span>👁️</span> Read-Only Viewer
          </button>

          <button
            type="button"
            onClick={() => applyPreset('sales')}
            className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
            title="Full Leads pipeline access and customer outreach (No HR or Finance access)"
          >
            <span>💼</span> Sales & Leads Specialist
          </button>

          <button
            type="button"
            onClick={() => applyPreset('project_lead')}
            className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
            title="Project Sprints, Task delegation, and team leave approvals"
          >
            <span>🚀</span> Sprint Lead / PM
          </button>

          <button
            type="button"
            onClick={() => applyPreset('hr_specialist')}
            className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
            title="Workforce management, attendance, leave approvals and payroll summaries"
          >
            <span>👥</span> HR Operations
          </button>

          <button
            type="button"
            onClick={handleGrantAll}
            className="py-1.5 px-3.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
            title="1-Click: Grant All Module & Delete Permissions to this employee"
          >
            <span>⚡</span> Full Access
          </button>

          <button
            type="button"
            onClick={handleResetToRoleDefault}
            className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1"
          >
            <RotateCcw size={12} /> Reset Default
          </button>
        </div>
      </div>

      {/* ── 🗑️ CRITICAL ADMINISTRATIVE ACTIONS & DELETE PERMISSIONS (GRANULAR) ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:px-5 flex flex-col gap-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🗑️</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Administrative Actions & Delete Authority
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Grant or revoke granular authority to delete tasks, projects, employees, approve leaves, and manage company records.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(270px,1fr))] gap-3 mt-1.5">
          {[
            { key: 'deleteTasks',      emoji: '🗑️', label: 'Delete Tasks',               onDesc: 'Can permanently delete any task across the enterprise',            offDesc: 'Cannot delete tasks (unless assigned creator)' },
            { key: 'deleteProjects',   emoji: '🗂️', label: 'Delete Projects',            onDesc: 'Can permanently delete any project & its sprint tasks',           offDesc: 'Cannot delete projects' },
            { key: 'deleteEmployees',  emoji: '👥', label: 'Delete & Manage Employees',  onDesc: 'Can onboard, edit, archive or remove employee accounts',          offDesc: 'Cannot edit or remove employee directory' },
            { key: 'deleteLeads',      emoji: '💼', label: 'Delete CRM Leads',            onDesc: 'Can permanently delete any sales lead from the CRM pipeline',     offDesc: 'Cannot delete leads' },
            { key: 'deleteTickets',    emoji: '🎫', label: 'Delete Support Tickets',      onDesc: 'Can permanently delete any helpdesk support ticket',              offDesc: 'Cannot delete support tickets (unless creator)' },
            { key: 'approveLeaves',    emoji: '🌴', label: 'Universal Leave Approvals',   onDesc: 'Can review, approve or decline employee leave applications',       offDesc: 'Cannot approve leaves' },
            { key: 'manageSalaries',   emoji: '💰', label: 'Salary & Payroll Management', onDesc: 'Can manage employee salary hikes, deductions, and payslips',       offDesc: 'Cannot access payroll or salary edits' },
            { key: 'manageExpenses',   emoji: '💳', label: 'Approve Reimbursements',     onDesc: 'Can review, approve and settle employee expense claims',           offDesc: 'Can only submit personal expense claims' },
            { key: 'editAttendance',   emoji: '⏱️', label: 'Shift & Clock Overrides',     onDesc: 'Can override attendance logs, force clock-out, adjust timers',    offDesc: 'Cannot manage live team shifts' },
            { key: 'postNotices',      emoji: '📢', label: 'Publish & Delete Notices',    onDesc: 'Can publish company announcements and delete board notices',       offDesc: 'Can only read company notices' },
            { key: 'export_leads',     emoji: '📤', label: 'Export CRM Leads (CSV/Excel)', onDesc: 'Allowed to download client lead contacts and pipeline data',    offDesc: 'Restricted: Cannot export leads data (data leak protection)' },
            { key: 'export_payroll',   emoji: '📊', label: 'Export Payroll & Salary Data', onDesc: 'Can download salary registers and compensation summaries',       offDesc: 'Cannot export salary spreadsheets' },
            { key: 'export_attendance', emoji: '📑', label: 'Export Monthly Attendance',   onDesc: 'Can export monthly employee clock in/out timesheet sheets',       offDesc: 'Cannot export attendance records' },
            { key: 'grantPermissions', emoji: '🛡️', label: 'Role & Permission Delegation', onDesc: 'Can manage access rights and permissions of other employees',      offDesc: 'Cannot modify permissions' }
          ].map(({ key, emoji, label, onDesc, offDesc }) => {
            const isEnabled = !!permissions[key] || isDelegatedAdmin;
            const adminHas = adminPerms[key] !== false;
            return (
              <div
                key={key}
                className={`p-3 px-3.5 rounded-lg flex items-center justify-between gap-2.5 transition-colors ${
                  adminHas ? 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 opacity-100' : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 opacity-75'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>{emoji}</span>
                    <span>{label}</span>
                    {!adminHas && <Lock size={11} className="text-red-600 shrink-0" />}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${adminHas ? 'text-slate-500 dark:text-slate-400' : 'text-red-600 dark:text-red-400'}`}>
                    {!adminHas ? 'You lack this permission — cannot grant' : (isEnabled ? onDesc : offDesc)}
                  </div>
                </div>
                <label className={`relative inline-block w-[38px] h-5 shrink-0 ${adminHas ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={!adminHas}
                    onChange={() => handleToggle(key)}
                    className="sr-only"
                  />
                  <span className={`block w-full h-full rounded-full transition-colors ${
                    !adminHas ? 'bg-slate-200 dark:bg-slate-800' : isEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}>
                    <span className={`absolute top-[3px] h-3.5 w-3.5 bg-white rounded-full transition-all shadow-xs ${
                      isEnabled ? 'left-[20px]' : 'left-[3px]'
                    }`} />
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODULE TOGGLE PERMISSIONS MATRIX ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="px-[18px] py-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
          <span>MODULE & FEATURE</span>
          <span>ACCESS PERMISSION</span>
        </div>

        <div className="flex flex-col">
          {MODULE_LIST.map((mod, index) => {
            const Icon = mod.icon;
            const isEnabled = permissions[mod.id] !== false;
            const adminHasMod = adminPerms[mod.id] !== false;

            return (
              <div
                key={mod.id}
                className={`flex items-center justify-between px-[18px] py-3.5 transition-colors ${
                  index < MODULE_LIST.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/60' : ''
                } ${adminHasMod ? (isEnabled ? 'bg-white dark:bg-slate-900' : 'bg-neutral-50/50 dark:bg-slate-950/40') : 'bg-rose-50/40 dark:bg-rose-950/20'} ${
                  adminHasMod ? 'opacity-100' : 'opacity-70'
                }`}
              >
                {/* Left: Icon, Name & Description */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    adminHasMod
                      ? (isEnabled ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500')
                      : 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  }`}>
                    {adminHasMod ? <Icon size={18} /> : <Lock size={16} />}
                  </div>
                  <div>
                    <div className={`text-[13.5px] font-bold flex items-center gap-1.5 ${
                      adminHasMod ? (isEnabled ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400') : 'text-red-600 dark:text-red-400'
                    }`}>
                      {mod.label}
                      {!adminHasMod && (
                        <span className="text-[10px] bg-red-200 dark:bg-red-900/60 text-red-600 dark:text-red-300 rounded px-1.5 py-0.5">
                          No Access
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {adminHasMod ? mod.desc : 'You lack access to this module — cannot grant it'}
                    </div>
                  </div>
                </div>

                {/* Right: Toggle Switch */}
                <div className="flex items-center gap-2.5">
                  <span className={`text-[11.5px] font-bold min-w-[45px] text-right ${
                    !adminHasMod ? 'text-red-600 dark:text-red-400' : (isEnabled ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500')
                  }`}>
                    {!adminHasMod ? 'LOCKED' : (isEnabled ? 'ON' : 'OFF')}
                  </span>

                  <label className={`relative inline-block w-11 h-6 ${adminHasMod ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      disabled={!adminHasMod}
                      onChange={() => handleToggle(mod.id)}
                      className="sr-only"
                    />
                    <span className={`block w-full h-full rounded-full transition-colors ${
                      !adminHasMod ? 'bg-slate-200 dark:bg-slate-800 cursor-not-allowed' : (isEnabled ? 'bg-green-500 cursor-pointer' : 'bg-slate-300 dark:bg-slate-700 cursor-pointer')
                    }`}>
                      <span className={`absolute top-[3px] h-[18px] w-[18px] bg-white rounded-full transition-all shadow-sm ${
                        isEnabled ? 'left-[22px]' : 'left-[3px]'
                      }`} />
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ADDITIONAL DATA SCOPE CONTROLS ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:px-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-sky-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
            Data Visibility & Record Ownership Scope
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
          Control record visibility: choose whether this user sees only their personally assigned records, their squad/team records, or entire enterprise records.
        </p>

        {/* 3 Record-Level Ownership & Visibility Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 mt-1">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              💼 CRM Leads Scope
            </label>
            <select
              value={permissions.leadsScope || (permissions.viewAllLeads ? 'all' : 'own')}
              onChange={(e) => {
                const val = e.target.value;
                handleScopeChange('leadsScope', val);
                handleScopeChange('viewAllLeads', val === 'all');
              }}
              className="w-full text-xs font-semibold py-2 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer outline-none focus:border-blue-500"
            >
              <option value="own">Own Assigned Leads Only</option>
              <option value="team">Assigned Team Leads</option>
              <option value="all">All Company Leads (Global)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              ✅ Sprint Tasks Scope
            </label>
            <select
              value={permissions.tasksScope || (permissions.viewAllTasks ? 'all' : 'own')}
              onChange={(e) => {
                const val = e.target.value;
                handleScopeChange('tasksScope', val);
                handleScopeChange('viewAllTasks', val === 'all');
              }}
              className="w-full text-xs font-semibold py-2 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer outline-none focus:border-blue-500"
            >
              <option value="own">Personally Assigned Tasks Only</option>
              <option value="team">Team Sprints & Tasks</option>
              <option value="all">All Enterprise Tasks (Global)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              📁 Projects Scope
            </label>
            <select
              value={permissions.projectsScope || (permissions.viewAllProjects ? 'all' : 'own')}
              onChange={(e) => {
                const val = e.target.value;
                handleScopeChange('projectsScope', val);
                handleScopeChange('viewAllProjects', val === 'all');
              }}
              className="w-full text-xs font-semibold py-2 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer outline-none focus:border-blue-500"
            >
              <option value="own">Assigned Projects Only</option>
              <option value="team">Department Projects</option>
              <option value="all">All Company Projects (Global)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3 mt-1.5">
          {[
            { key: 'manageProjects',    emoji: '📁', label: 'Create & Manage Projects',   onDesc: 'Can create new projects, add members & edit project details', offDesc: 'Can only view assigned projects' },
            { key: 'viewAllProjects',   emoji: '🗂️', label: 'View All Company Projects',   onDesc: 'Sees all projects across the enterprise',                     offDesc: 'Only sees projects assigned to them' },
            { key: 'approveLeaves',     emoji: '🌴', label: 'Approve & Reject Leaves',     onDesc: 'Authorized to review, approve and reject leave applications', offDesc: 'Cannot approve leaves' },
            { key: 'viewAllLeads',      emoji: '👥', label: 'View All Company Leads',     onDesc: 'Sees entire company CRM pipeline',                            offDesc: 'Only sees own & assigned leads' },
            { key: 'viewAllTasks',      emoji: '✅', label: 'View All Team Tasks',         onDesc: 'Sees all teammates tasks & sprints',                          offDesc: 'Only sees personally assigned tasks' },
            { key: 'viewAllTickets',    emoji: '🎫', label: 'View All Support Tickets',    onDesc: 'Sees all company helpdesk tickets',                           offDesc: 'Only sees own submitted / assigned tickets' },
            { key: 'viewAllAttendance', emoji: '🕐', label: 'View All Attendance Records', onDesc: 'Sees full team attendance matrix',                             offDesc: 'Only sees own attendance & clock logs' },
            { key: 'viewAllLeaves',     emoji: '🌴', label: 'View All Leave Requests',     onDesc: 'Sees all employee leave applications',                        offDesc: 'Only sees own submitted leave requests' },
            { key: 'manageEmployees',   emoji: '🏢', label: 'Manage Employees & Directory', onDesc: 'Can view full employee details, edit profiles and onboard members', offDesc: 'Cannot edit or manage employee directory' },
            { key: 'accessFinance',     emoji: '💰', label: 'Approve Expenses & Finance',  onDesc: 'Can review expense claims, payroll summaries, and company finances', offDesc: 'Can only submit personal expense claims' },
            { key: 'liveOperations',    emoji: '⚡', label: 'Live Team Shift Overrides',    onDesc: 'Can view live team clock status and force clock-out / override punches', offDesc: 'Cannot manage live team shifts' },
          ].map(({ key, emoji, label, onDesc, offDesc }) => {
            const isEnabled = !!permissions[key];
            const adminHas = adminPerms[key] !== false;
            return (
              <div
                key={key}
                className={`p-3 px-3.5 rounded-lg flex items-center justify-between gap-2.5 transition-colors ${
                  adminHas ? 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 opacity-100' : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 opacity-75'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    {emoji} {label}
                    {!adminHas && <Lock size={11} className="text-red-600 shrink-0" />}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${adminHas ? 'text-slate-500 dark:text-slate-400' : 'text-red-600 dark:text-red-400'}`}>
                    {!adminHas ? 'You lack this permission — cannot grant' : (isEnabled ? onDesc : offDesc)}
                  </div>
                </div>
                <label className={`relative inline-block w-[38px] h-5 shrink-0 ${adminHas ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={!adminHas}
                    onChange={() => handleToggle(key)}
                    className="sr-only"
                  />
                  <span className={`block w-full h-full rounded-full transition-colors ${
                    !adminHas ? 'bg-slate-200 dark:bg-slate-800' : isEnabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}>
                    <span className={`absolute top-[3px] h-3.5 w-3.5 bg-white rounded-full transition-all shadow-xs ${
                      isEnabled ? 'left-[20px]' : 'left-[3px]'
                    }`} />
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
