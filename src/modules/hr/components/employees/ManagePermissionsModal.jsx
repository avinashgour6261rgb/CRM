import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ShieldCheck, Check, Sparkles, AlertCircle, Key, RefreshCw, Copy, Lock, Search, Crown } from 'lucide-react';
import { useToast } from '../../../../shared/context/ToastContext';
import {
  DEFAULT_MODULE_PERMISSIONS,
  GRANULAR_PERMISSIONS_LIST,
  PERMISSION_CATEGORIES,
  PERMISSION_DEPENDENCIES,
  getDependentChildPermissions,
  sanitizePermissionDependencies,
  getUserModulePermissions,
  setUserPermissions,
  canUserGrantPermissions
} from '../../../../shared/utils/permissionUtils';
import { useHR } from '../../context/HRContext';
import { broadcastSyncEvent } from '../../../../shared/services/realtimeSyncService';
import { ChangePasswordModal } from '../../../../shared/components/modals/ChangePasswordModal';

export const ManagePermissionsModal = ({ isOpen, onClose, employee }) => {
  const { addToast } = useToast();
  const { updateEmployee = () => {}, updateEmployeePermissions, currentUser = null } = useHR() || {};

  const [activeCategoryTab, setActiveCategoryTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [permissions, setPermissions] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPass, setGeneratedPass] = useState('');
  const [passCopied, setPassCopied] = useState(false);
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);

  const canEdit = canUserGrantPermissions(currentUser);

  useEffect(() => {
    if (employee && isOpen) {
      const active = getUserModulePermissions(employee);
      setPermissions(active || {});
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const isPrimaryAdmin = employee?.employeeCode === 'ADM-001' ||
    employee?.isSuperAdmin ||
    employee?.email === 'avinash@inforag.com' ||
    employee?.email === 'admin@inforag.com' ||
    (employee?.isAdmin && (employee?.role || '').toLowerCase() === 'admin');

  const handleToggle = (key) => {
    if (isPrimaryAdmin) {
      addToast('🔒 Primary Administrator privileges are permanently active and cannot be altered.', 'warning');
      return;
    }
    if (!canEdit) {
      addToast('Only Admin or authorized managers can alter permissions', 'error');
      return;
    }
    setPermissions(prev => {
      const nextVal = !prev[key];
      if (key === 'allAccess') {
        if (nextVal) {
          return {
            ...DEFAULT_MODULE_PERMISSIONS.admin,
            allAccess: true,
            isDelegatedAdmin: true,
            forceClockOut: true,
            manageSettings: true,
            manageCredentials: true,
            grantPermissions: true,
            export_attendance: true,
            export_payroll: true,
            export_leads: true
          };
        }
        return { ...prev, allAccess: false, isDelegatedAdmin: false };
      }
      const updated = { ...prev, [key]: nextVal };

      if (nextVal) {
        // ── 1. FORWARD CASCADE: Automatically enable parent prerequisites ──
        let curr = key;
        while (PERMISSION_DEPENDENCIES[curr]) {
          const parentKey = PERMISSION_DEPENDENCIES[curr].parentKey;
          updated[parentKey] = true;
          curr = parentKey;
        }

        // Automatic elevation: enable corresponding parent module views
        if (key === 'manageEmployees' || key === 'deleteEmployees' || key === 'viewEmployeeDetails' || key === 'reviewResignations') updated.employees = true;
        if (key === 'manageSalaries' || key === 'export_payroll' || key === 'accessFinance' || key === 'approveExpenses') {
          updated.payroll = true;
          updated.finance = true;
        }
        if (key === 'accessCRM' || key === 'createLeads' || key === 'editLeads' || key === 'viewAllLeads' || key === 'deleteLeads' || key === 'export_leads' || key === 'createChannels') {
          updated.accessCRM = true;
          updated.leads = true;
        }
        if (key === 'viewAllAttendance' || key === 'editAttendance' || key === 'forceClockOut' || key === 'approveOvertime' || key === 'export_attendance') {
          updated.attendance = true;
        }
        if (key === 'liveOperations' || key === 'forceClockOut') updated.teamoperations = true;
        if (key === 'approveLeaves' || key === 'viewAllLeaves' || key === 'cancelLeaves') updated.leaves = true;
        if (key === 'manageProjects' || key === 'createProjects' || key === 'deleteProjects' || key === 'viewAllProjects') updated.projects = true;
        if (key === 'createTasks' || key === 'viewAllTasks' || key === 'deleteTasks' || key === 'editAnyTask') updated.tasks = true;
        if (key === 'manageTickets' || key === 'deleteTickets') updated.tickets = true;
        if (key === 'postNotices' || key === 'deleteNotices') updated.notices = true;
        if (key === 'giveAppreciation' || key === 'deleteAppreciations') updated.appreciation = true;
        if (key === 'documentation') updated.documents = true;
        if (key === 'reports') updated.viewReports = true;
      } else {
        // ── 2. REVERSE CASCADE: Automatically disable all dependent children ──
        const dependentChildren = getDependentChildPermissions(key);
        dependentChildren.forEach(childKey => {
          updated[childKey] = false;
        });

        // Synchronize parent module mirrors when parent is disabled
        if (key === 'accessCRM' || key === 'leads') {
          updated.accessCRM = false;
          updated.leads = false;
        }
        if (key === 'manageEmployees' || key === 'employees') {
          updated.manageEmployees = false;
          updated.employees = false;
        }
        if (key === 'manageSalaries' || key === 'payroll') {
          updated.manageSalaries = false;
          updated.payroll = false;
        }
        if (key === 'accessFinance' || key === 'finance') {
          updated.accessFinance = false;
          updated.finance = false;
        }
        if (key === 'liveOperations' || key === 'teamoperations') {
          updated.liveOperations = false;
          updated.teamoperations = false;
        }
        if (key === 'manageProjects' || key === 'projects') {
          updated.manageProjects = false;
          updated.projects = false;
        }
      }

      return updated;
    });
  };

  const handleSelectAll = (grantAll) => {
    if (isPrimaryAdmin) {
      addToast('🔒 Primary Administrator privileges are permanently active and cannot be altered.', 'warning');
      return;
    }
    if (!canEdit) return;
    const updated = {};
    GRANULAR_PERMISSIONS_LIST.forEach(p => {
      updated[p.key] = grantAll;
    });
    if (!grantAll) {
      updated.leads = false;
      updated.employees = false;
      updated.payroll = false;
      updated.finance = false;
      updated.teamoperations = false;
      updated.projects = false;
      updated.documentation = false;
      updated.documents = false;
      updated.allAccess = false;
      updated.isDelegatedAdmin = false;
      setPermissions(prev => ({ ...prev, ...updated }));
    } else {
      // Grant 100% identical capabilities as Administrator across EVERY module & export
      setPermissions({
        ...DEFAULT_MODULE_PERMISSIONS.admin,
        ...updated,
        allAccess: true,
        isDelegatedAdmin: true,
        forceClockOut: true,
        manageSettings: true,
        manageCredentials: true,
        grantPermissions: true,
        export_attendance: true,
        export_payroll: true,
        export_leads: true
      });
    }
  };

  const handleSelectCategory = (categoryId, grantAll) => {
    if (isPrimaryAdmin) {
      addToast('🔒 Primary Administrator privileges are permanently active and cannot be altered.', 'warning');
      return;
    }
    if (!canEdit) return;
    const items = GRANULAR_PERMISSIONS_LIST.filter(p => p.category === categoryId);
    const updated = {};
    items.forEach(p => {
      updated[p.key] = grantAll;
    });

    if (!grantAll) {
      if (categoryId === 'crm_comms') {
        updated.accessCRM = false;
        updated.leads = false;
        updated.createLeads = false;
        updated.editLeads = false;
        updated.deleteLeads = false;
      } else if (categoryId === 'workforce_hr') {
        updated.manageEmployees = false;
        updated.employees = false;
        updated.viewEmployeeDetails = false;
        updated.deleteEmployees = false;
      } else if (categoryId === 'finance_admin') {
        updated.manageSalaries = false;
        updated.payroll = false;
        updated.accessFinance = false;
        updated.finance = false;
        updated.approveExpenses = false;
      } else if (categoryId === 'shift_attendance') {
        updated.liveOperations = false;
        updated.teamoperations = false;
        updated.forceClockOut = false;
        updated.viewAllAttendance = false;
        updated.editAttendance = false;
      } else if (categoryId === 'tasks_projects') {
        updated.manageProjects = false;
        updated.projects = false;
        updated.deleteProjects = false;
      }
    } else {
      if (categoryId === 'crm_comms') {
        updated.accessCRM = true;
        updated.leads = true;
      } else if (categoryId === 'workforce_hr') {
        updated.manageEmployees = true;
        updated.employees = true;
      } else if (categoryId === 'finance_admin') {
        updated.manageSalaries = true;
        updated.payroll = true;
        updated.accessFinance = true;
        updated.finance = true;
      } else if (categoryId === 'shift_attendance') {
        updated.liveOperations = true;
        updated.teamoperations = true;
        updated.viewAllAttendance = true;
      } else if (categoryId === 'tasks_projects') {
        updated.manageProjects = true;
        updated.projects = true;
      }
    }

    setPermissions(prev => ({ ...prev, ...updated }));
  };

  const handleGeneratePassword = async () => {
    if (!canEdit) return;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#';
    let newPass = '';
    for (let i = 0; i < 8; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPass(newPass);
    try {
      await updateEmployee(employee._id, {
        ...employee,
        password: newPass,
        passwordUpdatedAt: new Date().toISOString()
      });
      addToast(`New password generated and saved for ${employee.name}!`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Error saving generated password', 'error');
    }
  };

  const handleCopyPass = () => {
    navigator.clipboard?.writeText(generatedPass);
    setPassCopied(true);
    setTimeout(() => setPassCopied(false), 2000);
    addToast('Password copied to clipboard!', 'info');
  };

  const handleSave = async () => {
    if (!canEdit) {
      addToast('Unauthorized: You do not have permission to grant access', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const userKey = employee.employeeCode || employee._id;
      const isFullAdminGrant = Boolean(permissions?.allAccess || permissions?.isDelegatedAdmin);
      const safePerms = isFullAdminGrant
        ? {
            ...DEFAULT_MODULE_PERMISSIONS.admin,
            ...permissions,
            allAccess: true,
            isDelegatedAdmin: true,
            forceClockOut: true,
            manageSettings: true,
            manageCredentials: true,
            grantPermissions: true,
            export_attendance: true,
            export_payroll: true,
            export_leads: true
          }
        : sanitizePermissionDependencies({ ...permissions });
      if (!isFullAdminGrant) {
        delete safePerms.allAccess;
        delete safePerms.isDelegatedAdmin;
      }
      const nextSystemRole = isFullAdminGrant
        ? 'admin'
        : (employee.systemRole === 'admin' ? 'team_member' : (employee.systemRole || 'team_member'));

      // 1. Save to global permissions map
      setUserPermissions(userKey, safePerms);
      if (employee._id) setUserPermissions(employee._id, safePerms);
      if (employee.email) setUserPermissions(employee.email, safePerms);

      // 2. Persist directly onto the employee profile in database
      if (updateEmployeePermissions) {
        await updateEmployeePermissions(employee._id, {
          permissions: safePerms,
          isDelegatedAdmin: isFullAdminGrant,
          delegationExpiresAt: isFullAdminGrant ? (employee.delegationExpiresAt || null) : null,
          systemRole: nextSystemRole
        });
      } else {
        await updateEmployee(employee._id, {
          ...employee,
          isDelegatedAdmin: isFullAdminGrant,
          systemRole: nextSystemRole,
          permissions: safePerms
        });
      }

      const syncPayload = {
        userKey,
        employeeId: employee._id,
        employeeCode: employee.employeeCode,
        email: employee.email,
        permissions: safePerms,
        isDelegatedAdmin: isFullAdminGrant,
        delegationExpiresAt: isFullAdminGrant ? (employee.delegationExpiresAt || null) : null,
        systemRole: nextSystemRole
      };

      broadcastSyncEvent('PERMISSIONS_UPDATED', syncPayload);
      window.dispatchEvent(new CustomEvent('ems_permissions_updated', { detail: syncPayload }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'EMS_USER_PERMISSIONS' } }));

      addToast(`Access permissions updated for ${employee.name}!`, 'success');
      onClose();
    } catch (err) {
      addToast('Failed to save permissions: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Access & Permissions: ${employee.name}`}
      subtitle={`Configure granular module access for ${employee.role} (#${employee.employeeCode || employee._id})`}
      maxWidth="840px"
    >
      <div className="flex flex-col gap-4">
        {/* User Summary Pill */}
        <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2.5">
            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={employee.name}
                className="w-[38px] h-[38px] rounded-full object-cover"
              />
            ) : (
              <div className="w-[38px] h-[38px] rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                {employee.name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-slate-900">
                {employee.name}
              </div>
              <div className="text-xs text-slate-500">
                {employee.role} • {employee.department} • ID: {employee.employeeCode}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              disabled={!canEdit}
              className={`py-1 px-2.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 text-[11.5px] font-bold ${canEdit ? 'cursor-pointer hover:bg-blue-100' : 'cursor-not-allowed opacity-60'}`}
            >
              ✓ Grant All
            </button>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              disabled={!canEdit}
              className={`py-1 px-2.5 rounded-md bg-red-50 text-red-600 border border-red-200 text-[11.5px] font-bold ${canEdit ? 'cursor-pointer hover:bg-red-100' : 'cursor-not-allowed opacity-60'}`}
            >
              ✕ Revoke All
            </button>
          </div>
        </div>

        {/* 🔐 Admin Password Management & Instant Generator */}
        <div className="bg-green-50/70 rounded-xl border border-green-300 p-3 px-4 flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-green-100 text-green-600 flex items-center justify-center">
                <Key size={15} />
              </div>
              <div>
                <span className="text-[13px] font-extrabold text-green-800">
                  Login Credentials & Password Control
                </span>
                <span className="text-[11px] text-green-700 ml-2">
                  (Admin can generate or reset employee password anytime)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-md bg-green-600 text-white border-0 text-[11.5px] font-bold cursor-pointer shadow-[0_1px_2px_rgba(22,163,74,0.2)] hover:bg-green-700"
              >
                <RefreshCw size={12} />
                <span>🔄 Generate New Password</span>
              </button>

              <button
                type="button"
                onClick={() => setIsChangePassModalOpen(true)}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-md bg-white dark:bg-slate-800 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800 text-[11.5px] font-bold cursor-pointer hover:bg-green-50 dark:hover:bg-green-950/40"
              >
                <Lock size={12} />
                <span>Custom Reset</span>
              </button>
            </div>
          </div>

          {generatedPass && (
            <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-800 rounded-lg border border-green-300 dark:border-green-800 text-xs mt-1">
              <div>
                <span className="text-green-800 font-semibold">
                  🎉 Active Temporary Password for {employee.name}:
                </span>
                <code className="ml-2 text-[13px] font-extrabold text-emerald-700 bg-green-100 py-0.5 px-2 rounded font-mono">
                  {generatedPass}
                </code>
              </div>

              <button
                type="button"
                onClick={handleCopyPass}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded bg-green-100 border border-green-300 text-green-800 text-[11px] font-bold cursor-pointer hover:bg-green-200"
              >
                {passCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{passCopied ? 'Copied!' : 'Copy Pass'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Security Notice */}
        {!canEdit && (
          <div className="py-2.5 px-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>You do not have delegation rights to modify permissions. Contact Admin.</span>
          </div>
        )}

        {/* 👑 1-Click Full Admin Access Toggle + Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {!isPrimaryAdmin && (
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => handleToggle('allAccess')}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all flex-1 ${
                permissions?.allAccess || permissions?.isDelegatedAdmin
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-300'
              } ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Crown size={16} className={permissions?.allAccess || permissions?.isDelegatedAdmin ? 'text-amber-500 shrink-0' : 'text-slate-400 shrink-0'} />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold truncate">Full Admin Access (Same as Admin)</div>
                  <div className="text-[10.5px] opacity-80 truncate">Grants 100% unrestricted access to all modules, settings &amp; controls</div>
                </div>
              </div>
              <div className={`w-[38px] h-5 rounded-full relative transition-colors duration-200 shrink-0 ${permissions?.allAccess || permissions?.isDelegatedAdmin ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-[14px] h-[14px] rounded-full bg-white absolute top-[3px] transition-[left] duration-200 shadow-sm ${permissions?.allAccess || permissions?.isDelegatedAdmin ? 'left-[21px]' : 'left-[3px]'}`} />
              </div>
            </button>
          )}
          <div className="relative sm:w-60 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search permissions..."
              className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 box-border"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveCategoryTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
              activeCategoryTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All Capabilities ({GRANULAR_PERMISSIONS_LIST.length})
          </button>
          {PERMISSION_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryTab(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer whitespace-nowrap ${
                activeCategoryTab === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Granular Toggles List Grouped by Category (Clean 2-Column Readable Grid) */}
        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
          {PERMISSION_CATEGORIES
            .filter(cat => activeCategoryTab === 'all' || activeCategoryTab === cat.id)
            .map(cat => {
              const q = searchQuery.trim().toLowerCase();
              const allCatItems = GRANULAR_PERMISSIONS_LIST.filter(p => p.category === cat.id);
              const items = q
                ? allCatItems.filter(p => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))
                : allCatItems;
              if (items.length === 0) return null;

              const enabledCount = allCatItems.filter(p => !!permissions[p.key]).length;

              return (
                <div key={cat.id} className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        {cat.label}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${enabledCount > 0 ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500'}`}>
                        {enabledCount}/{allCatItems.length} ON
                      </span>
                    </div>
                    {canEdit && !isPrimaryAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(cat.id, true)}
                          className="text-[10.5px] font-bold text-blue-600 dark:text-sky-400 hover:underline bg-transparent border-0 cursor-pointer p-0"
                        >
                          Enable All
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(cat.id, false)}
                          className="text-[10.5px] font-bold text-slate-400 hover:text-red-500 hover:underline bg-transparent border-0 cursor-pointer p-0"
                        >
                          Disable All
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {items.map(item => {
                      const isChecked = !!permissions[item.key];
                      return (
                        <div
                          key={item.key}
                          onClick={() => handleToggle(item.key)}
                          className={`flex items-center justify-between gap-2 p-2.5 px-3 rounded-xl transition-all duration-150 border ${
                            isChecked
                              ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          } ${canEdit ? 'cursor-pointer hover:border-blue-400' : 'cursor-default'}`}
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-sm leading-none mt-0.5 shrink-0">{item.icon}</span>
                            <div className="min-w-0">
                              <div className={`text-[11.5px] font-bold leading-snug ${isChecked ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                {item.label}
                              </div>
                              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                                {item.desc}
                              </div>
                            </div>
                          </div>

                          {/* Custom Toggle Switch */}
                          <div className={`w-[36px] h-5 rounded-full relative transition-colors duration-200 shrink-0 ${isChecked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                            <div className={`w-[14px] h-[14px] rounded-full bg-white absolute top-[3px] transition-[left] duration-200 shadow-sm ${isChecked ? 'left-[19px]' : 'left-[3px]'}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !canEdit}
            className={`py-2 px-5 rounded-lg border-0 bg-blue-600 text-white text-[13px] font-bold shadow-[0_2px_6px_rgba(37,99,235,0.3)] hover:bg-blue-700 ${isSaving || !canEdit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            {isSaving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isChangePassModalOpen}
        onClose={() => setIsChangePassModalOpen(false)}
        targetUser={employee}
      />
    </Modal>
  );
};
export default ManagePermissionsModal;
