import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Lock,
  Users,
  Award,
  AlertCircle,
  Sparkles,
  Layers,
  Calendar,
  X,
  Zap,
  Check,
  Briefcase,
  UserCheck,
  ArrowRight,
  Shield,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import {
  getRoles,
  createCustomRole,
  deleteCustomRole,
  getPromotionHistory,
  SYSTEM_ROLES
} from '../../../shared/services/roleManagementService';
import { useToast } from '../../../shared/context/ToastContext';
import { useHR } from '../../hr/context/HRContext';
import { ROLES, ROLE_CONFIGS, getUserRole } from '../../../shared/utils/permissionUtils';

export const RolesManagementTab = () => {
  const { addToast } = useToast();
  const { employees, currentUser, updateEmployee } = useHR();

  const [roles, setRoles] = useState(getRoles());
  const [promotions, setPromotions] = useState(getPromotionHistory());
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'cards' | 'history'

  // New Custom Role Form State
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCategory, setNewRoleCategory] = useState('Engineering');
  const [newRoleLevel, setNewRoleLevel] = useState(3);
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState({
    manageEmployees: false,
    manageSalaries: false,
    approveLeaves: true,
    manageProjects: true,
    postNotices: false,
    viewFinancials: false
  });

  useEffect(() => {
    const handleUpdate = () => {
      setRoles(getRoles());
      setPromotions(getPromotionHistory());
    };
    window.addEventListener('ems_roles_updated', handleUpdate);
    window.addEventListener('ems_promotions_updated', handleUpdate);
    return () => {
      window.removeEventListener('ems_roles_updated', handleUpdate);
      window.removeEventListener('ems_promotions_updated', handleUpdate);
    };
  }, []);

  const activeUserRole = getUserRole(currentUser);

  // Quick Role Simulator Switcher for testing
  const handleSimulateRole = async (targetRoleId) => {
    if (!currentUser) return;
    const config = ROLE_CONFIGS[targetRoleId];
    if (!config) return;

    try {
      await updateEmployee(currentUser._id || 'emp_1', {
        role: config.name,
        systemRole: targetRoleId,
        designation: config.name
      });
      addToast({
        title: `Switched to ${config.badge} 🎭`,
        message: `Active session now operating with ${config.name} permissions across all CRM modules.`,
        type: 'success'
      });
    } catch (err) {
      addToast('Failed to switch role simulation', 'error');
    }
  };

  const handleCreateRole = (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    createCustomRole({
      name: newRoleName.trim(),
      category: newRoleCategory,
      level: newRoleLevel,
      description: newRoleDescription,
      permissions: newRolePermissions
    });

    addToast({
      title: 'Custom Role Created 🎖️',
      message: `Role "${newRoleName}" added with customized permissions. Ready for employee assignment.`,
      type: 'success'
    });

    setNewRoleName('');
    setNewRoleDescription('');
    setIsCreateRoleOpen(false);
  };

  const handleDeleteRole = (roleId, roleName) => {
    deleteCustomRole(roleId);
    addToast({
      title: 'Custom Role Removed 🗑️',
      message: `Role "${roleName}" has been removed.`,
      type: 'info'
    });
  };

  // Detailed 11-Module RBAC Matrix Data
  const rbacMatrix = [
    {
      module: 'System & Security Settings',
      category: 'Administration',
      admin: { allowed: true, text: 'Full Master Access & Branding' },
      hr: { allowed: false, text: 'No Access' },
      teamLeader: { allowed: false, text: 'No Access' },
      teamMember: { allowed: false, text: 'No Access' }
    },
    {
      module: 'Role & RBAC Management',
      category: 'Administration',
      admin: { allowed: true, text: 'Assign & Create Roles' },
      hr: { allowed: false, text: 'No Access' },
      teamLeader: { allowed: false, text: 'No Access' },
      teamMember: { allowed: false, text: 'No Access' }
    },
    {
      module: 'Employee Directory & Onboarding',
      category: 'Workforce',
      admin: { allowed: true, text: 'Add, Edit, Delete & Promote' },
      hr: { allowed: true, text: 'Onboard & Edit Documents' },
      teamLeader: { allowed: 'partial', text: 'Team Directory View' },
      teamMember: { allowed: 'partial', text: 'Public Directory View' }
    },
    {
      module: 'Leave Approvals & Policy',
      category: 'Workforce',
      admin: { allowed: true, text: 'Universal Approve / Reject' },
      hr: { allowed: true, text: 'Full HR Leave Approvals' },
      teamLeader: { allowed: true, text: 'Approve Squad Members' },
      teamMember: { allowed: false, text: 'Apply Personal Leaves Only' }
    },
    {
      module: 'Official Company Holidays',
      category: 'Workforce',
      admin: { allowed: true, text: 'Declare, Edit & Delete' },
      hr: { allowed: true, text: 'Declare, Edit & Delete' },
      teamLeader: { allowed: 'partial', text: 'View Holiday Calendar' },
      teamMember: { allowed: 'partial', text: 'View Holiday Calendar' }
    },
    {
      module: 'Shift Attendance & Timer Breaks',
      category: 'Workforce',
      admin: { allowed: true, text: 'Full Company Shift Matrix' },
      hr: { allowed: true, text: 'Monthly Attendance Reports' },
      teamLeader: { allowed: 'partial', text: 'Squad Timesheet Oversight' },
      teamMember: { allowed: true, text: '8h 30m Clock In/Out & 1-Click Breaks' }
    },
    {
      module: 'Projects, Sprints & Tasks',
      category: 'Operations',
      admin: { allowed: true, text: 'Manage All Projects & Sprints' },
      hr: { allowed: 'partial', text: 'Resource & Allocation View' },
      teamLeader: { allowed: true, text: 'Create Projects & Assign Tasks' },
      teamMember: { allowed: 'partial', text: 'Execute Assigned Tasks' }
    },
    {
      module: 'CRM Leads & Deals Pipeline',
      category: 'Operations',
      admin: { allowed: true, text: 'Full CRM Leads & Pipeline' },
      hr: { allowed: 'partial', text: 'View Pipeline Overview' },
      teamLeader: { allowed: true, text: 'Manage Team Deals & Leads' },
      teamMember: { allowed: 'partial', text: 'Assigned Leads Only' }
    },
    {
      module: 'Payroll, Salary Slips & Claims',
      category: 'Finance',
      admin: { allowed: true, text: 'Full Payroll & Salary Hikes' },
      hr: { allowed: true, text: 'Generate Payslips & Review Claims' },
      teamLeader: { allowed: 'partial', text: 'Submit Project Expenses' },
      teamMember: { allowed: 'partial', text: 'Download My Payslips & Claims' }
    },
    {
      module: 'Support Tickets & Resolution',
      category: 'Helpdesk',
      admin: { allowed: true, text: 'Manage All System Tickets' },
      hr: { allowed: true, text: 'Internal HR/Employee Tickets' },
      teamLeader: { allowed: true, text: 'Client & Project Tickets' },
      teamMember: { allowed: 'partial', text: 'Raise Support Tickets' }
    },
    {
      module: 'Company Notices & Announcements',
      category: 'Communication',
      admin: { allowed: true, text: 'Publish, Pin & Delete All' },
      hr: { allowed: true, text: 'Publish HR & Company Notices' },
      teamLeader: { allowed: true, text: 'Post Squad Announcements' },
      teamMember: { allowed: 'partial', text: 'Read-only & Acknowledge' }
    }
  ];

  const renderMatrixBadge = (perm) => {
    if (perm.allowed === true) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-green-100 text-green-600 text-[11px] font-bold shrink-0">
            ✓
          </span>
          <span className="text-xs text-green-700 font-semibold">{perm.text}</span>
        </div>
      );
    }
    if (perm.allowed === 'partial') {
      return (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold shrink-0">
            👁️
          </span>
          <span className="text-xs text-blue-600 font-medium">{perm.text}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-slate-100 text-slate-400 text-[11px] font-bold shrink-0">
          ✕
        </span>
        <span className="text-xs text-slate-400">{perm.text}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5 py-3 pb-8">
      
      {/* ── Top Header & Active User Role Live Simulator ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:px-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 m-0">
                Role-Based Access Control (RBAC) Matrix
              </h2>
              <p className="text-[13px] text-slate-500 mt-0.5 m-0">
                Standard 4-tier hierarchy: <strong>Admin</strong> ➔ <strong>HR</strong> ➔ <strong>Team Leader (TL)</strong> ➔ <strong>Team Member (Employee under TL)</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateRoleOpen(true)}
              className="inline-flex items-center gap-1.5 px-[15px] py-[9px] rounded-lg bg-white hover:bg-blue-50/50 text-blue-600 border-[1.5px] border-blue-200 text-[13px] font-bold cursor-pointer transition-colors"
            >
              <Plus size={15} />
              <span>Add Custom Role</span>
            </button>
          </div>
        </div>

        {/* Live Role Switcher / Simulator Bar */}
        <div className="p-3 px-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[12.5px] font-bold text-slate-700">
              🎭 Live Role Simulator:
            </span>
            <span
              style={{
                backgroundColor: ROLE_CONFIGS[activeUserRole]?.bg || '#eff6ff',
                color: ROLE_CONFIGS[activeUserRole]?.color || '#2563eb',
                borderColor: ROLE_CONFIGS[activeUserRole]?.border || '#bfdbfe'
              }}
              className="px-2.5 py-[3px] rounded-full border text-xs font-bold"
            >
              Active: {ROLE_CONFIGS[activeUserRole]?.badge || '👑 Admin'} ({currentUser?.name || 'User'})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11.5px] text-slate-500">Test permissions as:</span>
            {Object.values(ROLES).map(rId => {
              const cfg = ROLE_CONFIGS[rId];
              const isActive = activeUserRole === rId;
              return (
                <button
                  key={rId}
                  onClick={() => handleSimulateRole(rId)}
                  style={{
                    borderColor: isActive ? cfg.color : undefined,
                    backgroundColor: isActive ? cfg.bg : undefined,
                    color: isActive ? cfg.color : undefined
                  }}
                  className={`px-3 py-[5px] rounded-lg border text-xs cursor-pointer inline-flex items-center gap-1 transition-all ${
                    isActive ? 'font-bold' : 'border-slate-300 bg-white text-slate-600 font-medium hover:bg-slate-50'
                  }`}
                  title={`Switch active session to ${cfg.name}`}
                >
                  <span>{cfg.badge}</span>
                  {isActive && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 4 Standard Roles Cards Overview ── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
        {Object.values(ROLES).map(rId => {
          const cfg = ROLE_CONFIGS[rId];
          const isCurrentActive = activeUserRole === rId;
          const assignedCount = employees.filter(e => getUserRole(e) === rId).length;

          return (
            <div
              key={rId}
              style={{
                borderColor: isCurrentActive ? cfg.color : undefined,
                boxShadow: isCurrentActive ? `0 4px 12px ${cfg.color}25` : undefined
              }}
              className={`bg-white rounded-2xl p-[18px] flex flex-col justify-between relative transition-shadow ${
                isCurrentActive ? 'border-2' : 'border border-slate-200 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    style={{
                      backgroundColor: cfg.bg,
                      color: cfg.color,
                      borderColor: cfg.border
                    }}
                    className="text-[11px] font-extrabold px-2 py-0.5 rounded-md border"
                  >
                    Level {cfg.level} • {cfg.badge}
                  </span>
                  {isCurrentActive && (
                    <span className="text-[10.5px] font-bold text-green-600 flex items-center gap-[3px]">
                      <CheckCircle2 size={12} /> Active
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-slate-900 mt-1 mb-1.5">
                  {cfg.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  {cfg.description}
                </p>

                {/* Key Privilege Tags */}
                <div className="flex flex-col gap-1 mb-3">
                  {cfg.permissions.slice(0, 3).map((p, idx) => (
                    <div key={idx} className="text-[11.5px] text-slate-700 flex items-start gap-1.5">
                      <span style={{ color: cfg.color }} className="font-bold">•</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11.5px] text-slate-500">
                <span>Assigned: <strong>{assignedCount} members</strong></span>
                <button
                  onClick={() => handleSimulateRole(rId)}
                  style={{ color: cfg.color }}
                  className="bg-transparent border-0 font-bold cursor-pointer p-0 text-[11.5px]"
                >
                  {isCurrentActive ? 'Current Role' : 'Switch ➔'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tab Switcher: Matrix Comparison vs Promotion History ── */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 rounded-lg border-0 text-[13px] font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
            activeTab === 'matrix' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          <Layers size={15} />
          <span>Full RBAC Permissions Matrix</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg border-0 text-[13px] font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
            activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          <Award size={15} />
          <span>Promotion & Role Upgrade Log ({promotions.length})</span>
        </button>
      </div>

      {/* ── Tab 1: Detailed RBAC Matrix Table ── */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:px-5 border-b border-slate-200 bg-slate-50">
            <h3 className="text-[15px] font-extrabold text-slate-900 m-0">
              Module-by-Module Permission Comparison (All 4 Roles)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              Clear breakdown of exact rights granted to Admin, HR, Team Leader, and Team Member across the 11 system modules.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="p-3 px-4 font-extrabold text-slate-800 w-[240px]">
                    CRM Module / Feature
                  </th>
                  <th className="p-3 px-4 font-extrabold text-blue-700 w-[220px]">
                    👑 Admin (Level 1)
                  </th>
                  <th className="p-3 px-4 font-extrabold text-sky-700 w-[220px]">
                    💼 HR (Level 2)
                  </th>
                  <th className="p-3 px-4 font-extrabold text-purple-700 w-[220px]">
                    🚀 Team Leader (Level 3)
                  </th>
                  <th className="p-3 px-4 font-extrabold text-green-700 w-[220px]">
                    <div>👤 Team Member (Level 4)</div>
                    <div className="text-[10.5px] font-semibold text-green-600 mt-0.5">
                      (Employee under TL)
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rbacMatrix.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-slate-100 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="p-3.5 px-4">
                      <div className="font-bold text-slate-900 text-[13px]">
                        {row.module}
                      </div>
                      <span className="text-[10.5px] text-slate-500 uppercase font-semibold">
                        {row.category}
                      </span>
                    </td>
                    <td className="p-3.5 px-4">
                      {renderMatrixBadge(row.admin)}
                    </td>
                    <td className="p-3.5 px-4">
                      {renderMatrixBadge(row.hr)}
                    </td>
                    <td className="p-3.5 px-4">
                      {renderMatrixBadge(row.teamLeader)}
                    </td>
                    <td className="p-3.5 px-4">
                      {renderMatrixBadge(row.teamMember)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab 2: Promotion & Role Upgrade Log ── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-extrabold text-slate-900 m-0">
                Official Promotion & Post Upgrade History
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 m-0">
                Complete audit trail of designation changes and role elevations across departments.
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl">
              {promotions.length} Total Records
            </span>
          </div>

          {promotions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-[13px]">
              ✨ No promotion records found yet. Use the "Promote / Change Role" action on employee profiles to elevate team members.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {promotions.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[13px] flex-wrap gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.employeeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={item.employeeName}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-bold text-slate-900">{item.employeeName}</div>
                      <div className="text-[11.5px] text-slate-500">
                        <span className="line-through">{item.previousRole}</span>
                        {' ➔ '}
                        <strong className="text-green-600">{item.newRole}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-[11px] font-bold">
                      Promoted on {item.effectiveDate}
                    </span>
                    <div className="text-[10.5px] text-slate-500 mt-0.5">
                      By {item.promotedBy} • {item.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create Custom Role Modal ── */}
      {isCreateRoleOpen && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-5">
          <div className="bg-white rounded-2xl w-full max-w-[540px] overflow-hidden shadow-2xl">
            <div className="p-4 sm:px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-[15px] font-extrabold text-slate-900 m-0">
                Create New Custom Role / Designation
              </h3>
              <button
                onClick={() => setIsCreateRoleOpen(false)}
                className="bg-transparent border-0 text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
                  Role Title / Designation Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lead Solution Architect / Principal QA Engineer"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  required
                  className="w-full px-3 py-[9px] rounded-lg border-[1.5px] border-blue-500 text-[13px] outline-none font-semibold focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={newRoleCategory}
                    onChange={e => setNewRoleCategory(e.target.value)}
                    className="w-full px-3 py-[9px] rounded-lg border border-slate-300 text-[13px] outline-none bg-white focus:border-blue-500 transition-colors"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product Design">Product Design</option>
                    <option value="Marketing & Growth">Marketing & Growth</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Hierarchy Seniority Level
                  </label>
                  <select
                    value={newRoleLevel}
                    onChange={e => setNewRoleLevel(Number(e.target.value))}
                    className="w-full px-3 py-[9px] rounded-lg border border-slate-300 text-[13px] outline-none bg-white focus:border-blue-500 transition-colors"
                  >
                    <option value={2}>Level 2 — Senior Leadership / Partner</option>
                    <option value={3}>Level 3 — Team Leader / Squad Lead</option>
                    <option value={4}>Level 4 — Senior Specialist / Lead</option>
                    <option value={5}>Level 5 — Associate / Junior</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description / Responsibilities
                </label>
                <textarea
                  placeholder="Summarize key responsibilities for this role..."
                  value={newRoleDescription}
                  onChange={e => setNewRoleDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] outline-none focus:border-blue-500 transition-colors font-sans resize-y"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-slate-700 mb-2">
                  Assigned Security Privileges:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.approveLeaves}
                      onChange={e => setNewRolePermissions(p => ({ ...p, approveLeaves: e.target.checked }))}
                    />
                    Approve Team Leaves
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.manageProjects}
                      onChange={e => setNewRolePermissions(p => ({ ...p, manageProjects: e.target.checked }))}
                    />
                    Manage Tasks & Projects
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.manageEmployees}
                      onChange={e => setNewRolePermissions(p => ({ ...p, manageEmployees: e.target.checked }))}
                    />
                    Onboard Employees
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRolePermissions.manageSalaries}
                      onChange={e => setNewRolePermissions(p => ({ ...p, manageSalaries: e.target.checked }))}
                    />
                    View & Appraise Salaries
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRoleOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-[12.5px] font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-[18px] py-2 rounded-lg border-0 bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-bold cursor-pointer shadow-sm shadow-blue-600/25 transition-colors"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
