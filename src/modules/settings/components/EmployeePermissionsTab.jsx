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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px 0' }}>
      
      {/* Header Info */}
      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #bfdbfe'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Employee Access & Permission Management
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
              Admin control: Decide which modules each employee can access and toggle their data visibility.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleResetToRoleDefault}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '7px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={13} />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 18px',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: isSaved ? '#16a34a' : '#2563eb',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Check size={14} />
            <span>{isSaved ? 'Saved' : 'Save Permissions'}</span>
          </button>
        </div>
      </div>

      {/* Employee Selector Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', whiteSpace: 'nowrap' }}>
            Select Employee:
          </label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              color: '#0f172a',
              fontWeight: '600',
              cursor: 'pointer',
              flex: 1,
              maxWidth: '360px',
              outline: 'none'
            }}
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#f8fafc',
            padding: '6px 14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <img
              src={selectedEmp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={selectedEmp.name}
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                {selectedEmp.name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Role: <span style={{ fontWeight: '700', color: '#2563eb' }}>{selectedEmp.role}</span> • ID: #{selectedEmp.employeeCode || 'EMP-001'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MASTER ADMIN AUTHORITY DELEGATION CARD ── */}
      <div style={{
        background: isDelegatedAdmin 
          ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' 
          : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '14px',
        border: isDelegatedAdmin ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: isDelegatedAdmin ? '0 4px 14px rgba(59, 130, 246, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
        transition: 'all 0.2s ease',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: isDelegatedAdmin ? '#2563eb' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: isDelegatedAdmin ? '0 4px 10px rgba(37,99,235,0.3)' : 'none',
            flexShrink: 0
          }}>
            <Crown size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: isDelegatedAdmin ? '#1e3a8a' : '#1e293b' }}>
                Full Admin Authority Delegation
              </span>
              {isDelegatedAdmin && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  letterSpacing: '0.3px'
                }}>
                  FULL ACCESS ACTIVE
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
              Grant this user identical superpowers to Master Admin (all employees, reports, documentation, approvals, and system controls).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: '46px',
            height: '24px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={isDelegatedAdmin}
              onChange={handleToggleDelegatedAdmin}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isDelegatedAdmin ? '#2563eb' : '#cbd5e1',
              borderRadius: '24px',
              transition: '0.2s',
              boxShadow: isDelegatedAdmin ? '0 2px 6px rgba(37,99,235,0.3)' : 'none'
            }}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '18px',
                width: '18px',
                left: isDelegatedAdmin ? '24px' : '3px',
                bottom: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: '0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </span>
          </label>
        </div>
      </div>

      {/* ── MODULE TOGGLE PERMISSIONS MATRIX ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          padding: '12px 18px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          fontWeight: '700',
          color: '#475569'
        }}>
          <span>MODULE & FEATURE</span>
          <span>ACCESS PERMISSION</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {MODULE_LIST.map((mod, index) => {
            const Icon = mod.icon;
            const isEnabled = permissions[mod.id] !== false;
            const adminHasMod = adminPerms[mod.id] !== false;

            return (
              <div
                key={mod.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderBottom: index < MODULE_LIST.length - 1 ? '1px solid #f1f5f9' : 'none',
                  backgroundColor: adminHasMod ? (isEnabled ? '#ffffff' : '#fafafa') : '#fff8f8',
                  transition: 'background-color 0.15s ease',
                  opacity: adminHasMod ? 1 : 0.7
                }}
              >
                {/* Left: Icon, Name & Description */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: adminHasMod ? (isEnabled ? '#eff6ff' : '#f1f5f9') : '#fee2e2',
                    color: adminHasMod ? (isEnabled ? '#2563eb' : '#94a3b8') : '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {adminHasMod ? <Icon size={18} /> : <Lock size={16} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: adminHasMod ? (isEnabled ? '#0f172a' : '#64748b') : '#dc2626', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {mod.label}
                      {!adminHasMod && <span style={{ fontSize: '10px', backgroundColor: '#fecaca', color: '#dc2626', borderRadius: '4px', padding: '1px 5px' }}>No Access</span>}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '1px' }}>
                      {adminHasMod ? mod.desc : 'You lack access to this module — cannot grant it'}
                    </div>
                  </div>
                </div>

                {/* Right: Toggle Switch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: '700',
                    color: !adminHasMod ? '#dc2626' : (isEnabled ? '#16a34a' : '#94a3b8'),
                    minWidth: '45px',
                    textAlign: 'right'
                  }}>
                    {!adminHasMod ? 'LOCKED' : (isEnabled ? 'ON' : 'OFF')}
                  </span>

                  <label style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '44px',
                    height: '24px',
                    cursor: adminHasMod ? 'pointer' : 'not-allowed'
                  }}>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      disabled={!adminHasMod}
                      onChange={() => handleToggle(mod.id)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: adminHasMod ? 'pointer' : 'not-allowed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: !adminHasMod ? '#e2e8f0' : (isEnabled ? '#22c55e' : '#cbd5e1'),
                      transition: '0.2s',
                      borderRadius: '24px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        height: '18px',
                        width: '18px',
                        left: isEnabled ? '22px' : '3px',
                        bottom: '3px',
                        backgroundColor: '#ffffff',
                        transition: '0.2s',
                        borderRadius: '50%',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ADDITIONAL DATA SCOPE CONTROLS ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye size={16} color="#0284c7" />
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Data Visibility Scope (Item 17)
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
          By default, employees only see their own data. Toggle below to grant wider company visibility.
          {' '}<span style={{ color: '#dc2626', fontWeight: '600' }}>🔒 Locked toggles</span>{' '}mean you do not have that permission yourself and cannot grant it.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginTop: '6px' }}>
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
              <div key={key} style={{
                padding: '12px 14px',
                backgroundColor: adminHas ? '#f8fafc' : '#fef2f2',
                borderRadius: '8px',
                border: `1px solid ${adminHas ? '#e2e8f0' : '#fecaca'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                opacity: adminHas ? 1 : 0.75
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {emoji} {label}
                    {!adminHas && <Lock size={11} color="#dc2626" style={{ flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontSize: '11px', color: adminHas ? '#64748b' : '#dc2626', marginTop: '2px' }}>
                    {!adminHas ? 'You lack this permission — cannot grant' : (isEnabled ? onDesc : offDesc)}
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px', cursor: adminHas ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={!adminHas}
                    onChange={() => handleToggle(key)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: !adminHas ? '#e2e8f0' : isEnabled ? '#0284c7' : '#cbd5e1',
                    borderRadius: '20px',
                    transition: '0.2s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '14px', width: '14px',
                      left: isEnabled ? '20px' : '3px',
                      bottom: '3px',
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      transition: '0.2s'
                    }} />
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
