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
  FolderGit2
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
  { id: 'projects', label: 'Projects & Workspaces', icon: FolderGit2, desc: 'View projects, assign project members, sprint tracking and deliverables' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, desc: 'Sprint tasks, Kanban board, task timers and delegation' },
  { id: 'leads', label: 'Leads', icon: Users2, desc: 'Sales pipeline, CRM prospects, client conversion deals' },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck, desc: 'Daily clock in/out, shift time matrix, monthly logs' },
  { id: 'leaves', label: 'Leave Management', icon: Palmtree, desc: 'Apply for leaves, view balances, who is on leave today' },
  { id: 'tickets', label: 'Support Tickets', icon: LifeBuoy, desc: 'Raise problem requests, IT helpdesk, issue tickets' },
  { id: 'events', label: 'Events & Calendar', icon: Calendar, desc: 'Company schedules, festivals, and official holiday list' },
  { id: 'employees', label: 'Employee Information', icon: Building2, desc: 'Employee directory, team profiles, and organization structure' },
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
  const [isSaved, setIsSaved] = useState(true);

  // When selected employee changes, load their saved permissions & delegated status
  useEffect(() => {
    if (selectedEmp) {
      setPermissions(getUserModulePermissions(selectedEmp));
      setIsDelegatedAdmin(!!selectedEmp?.isDelegatedAdmin || selectedEmp?.isAdmin || selectedEmp?.role?.toLowerCase() === 'admin');
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
      setPermissions(prev => ({ ...prev, ...allTrue }));
      addToast(`👑 Full Admin access granted for ${selectedEmp?.name}! Click Save to apply.`, 'info');
    } else {
      handleResetToRoleDefault();
    }
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
        map[userKey] = safePerms;
        localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(map));

        if (selectedEmp?._id && updateEmployee) {
          updateEmployee(selectedEmp._id, {
            ...selectedEmp,
            isDelegatedAdmin,
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
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:px-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border-[1.5px] border-blue-200">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 m-0">
              Employee Access & Permission Management
            </h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5 m-0">
              Admin control: Decide which modules each employee can access and toggle their data visibility.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToRoleDefault}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
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
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:px-5 flex items-center justify-between flex-wrap gap-3.5">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <label className="text-[13px] font-bold text-slate-700 whitespace-nowrap">
            Select Employee:
          </label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="px-3 py-2 rounded-lg border-[1.5px] border-slate-300 bg-white text-[13px] text-slate-900 font-semibold cursor-pointer flex-1 max-w-[360px] outline-none focus:border-blue-500 transition-colors"
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
          <div className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
            <img
              src={selectedEmp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={selectedEmp.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div>
              <div className="text-[12.5px] font-bold text-slate-900">
                {selectedEmp.name}
              </div>
              <div className="text-[11px] text-slate-500">
                Role: <span className="font-bold text-blue-600">{selectedEmp.role}</span> • ID: #{selectedEmp.employeeCode || 'EMP-001'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MASTER ADMIN AUTHORITY DELEGATION CARD ── */}
      <div className={`rounded-2xl p-4 sm:px-5 flex items-center justify-between transition-all flex-wrap gap-3.5 ${
        isDelegatedAdmin
          ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-[1.5px] border-blue-500 shadow-md shadow-blue-500/10'
          : 'bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center text-white shrink-0 ${
            isDelegatedAdmin ? 'bg-blue-600 shadow-md shadow-blue-600/30' : 'bg-slate-400'
          }`}>
            <Crown size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-extrabold ${isDelegatedAdmin ? 'text-blue-900' : 'text-slate-800'}`}>
                Full Admin Authority Delegation
              </span>
              {isDelegatedAdmin && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white tracking-wide">
                  FULL ACCESS ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 m-0">
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

      {/* ── MODULE TOGGLE PERMISSIONS MATRIX ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-[18px] py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
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
                  index < MODULE_LIST.length - 1 ? 'border-b border-slate-100' : ''
                } ${adminHasMod ? (isEnabled ? 'bg-white' : 'bg-neutral-50/50') : 'bg-rose-50/40'} ${
                  adminHasMod ? 'opacity-100' : 'opacity-70'
                }`}
              >
                {/* Left: Icon, Name & Description */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    adminHasMod
                      ? (isEnabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400')
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {adminHasMod ? <Icon size={18} /> : <Lock size={16} />}
                  </div>
                  <div>
                    <div className={`text-[13.5px] font-bold flex items-center gap-1.5 ${
                      adminHasMod ? (isEnabled ? 'text-slate-900' : 'text-slate-500') : 'text-red-600'
                    }`}>
                      {mod.label}
                      {!adminHasMod && (
                        <span className="text-[10px] bg-red-200 text-red-600 rounded px-1.5 py-0.5">
                          No Access
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-slate-400 mt-0.5">
                      {adminHasMod ? mod.desc : 'You lack access to this module — cannot grant it'}
                    </div>
                  </div>
                </div>

                {/* Right: Toggle Switch */}
                <div className="flex items-center gap-2.5">
                  <span className={`text-[11.5px] font-bold min-w-[45px] text-right ${
                    !adminHasMod ? 'text-red-600' : (isEnabled ? 'text-green-600' : 'text-slate-400')
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
                      !adminHasMod ? 'bg-slate-200 cursor-not-allowed' : (isEnabled ? 'bg-green-500 cursor-pointer' : 'bg-slate-300 cursor-pointer')
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
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:px-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-sky-600" />
          <h3 className="text-sm font-bold text-slate-900 m-0">
            Data Visibility Scope (Item 17)
          </h3>
        </div>
        <p className="text-xs text-slate-500 m-0">
          By default, employees only see their own data. Toggle below to grant wider company visibility.
          {' '}<span className="text-red-600 font-semibold">🔒 Locked toggles</span>{' '}mean you do not have that permission yourself and cannot grant it.
        </p>

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
          ].map(({ key, emoji, label, onDesc, offDesc }) => {
            const isEnabled = !!permissions[key];
            const adminHas = adminPerms[key] !== false;
            return (
              <div
                key={key}
                className={`p-3 px-3.5 rounded-lg flex items-center justify-between gap-2.5 transition-colors ${
                  adminHas ? 'bg-slate-50 border border-slate-200 opacity-100' : 'bg-red-50 border border-red-200 opacity-75'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-bold text-slate-800 flex items-center gap-1">
                    {emoji} {label}
                    {!adminHas && <Lock size={11} className="text-red-600 shrink-0" />}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${adminHas ? 'text-slate-500' : 'text-red-600'}`}>
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
                    !adminHas ? 'bg-slate-200' : isEnabled ? 'bg-sky-600' : 'bg-slate-300'
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
