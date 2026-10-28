import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Award,
  User,
  ShieldCheck,
  Building,
  Mail,
  Calendar,
  Layers,
  Sparkles,
  Trash2,
  Lock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useToast } from '../../../shared/context/ToastContext';
import { useConfirm } from '../../../shared/context/ConfirmContext';
import { useNavigate } from 'react-router-dom';
import { AddEmployeeModal } from '../components/employees/AddEmployeeModal';
import { PromoteEmployeeModal } from '../components/employees/PromoteEmployeeModal';
import { EditProfileModal } from '../../../shared/components/modals/EditProfileModal';
import { SalaryIncrementModal } from '../../finance/components/SalaryIncrementModal';
import { ManagePermissionsModal } from '../components/employees/ManagePermissionsModal';
import { getRoles } from '../../../shared/services/roleManagementService';
import { isAdmin, isHRorAdmin } from '../../../shared/utils/permissionUtils';

export const EmployeesPage = () => {
  const navigate = useNavigate();
  const { employees, deleteEmployee, currentUser } = useHR();
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPromoteEmp, setSelectedPromoteEmp] = useState(null);
  const [selectedProfileEmp, setSelectedProfileEmp] = useState(null);
  const [selectedSalaryEmp, setSelectedSalaryEmp] = useState(null);
  const [selectedPermsEmp, setSelectedPermsEmp] = useState(null);

  // Salary map from localStorage for quick lookup
  const [salaryMap, setSalaryMap] = useState(() => {
    try {
      const saved = localStorage.getItem('EMS_SALARY_MAP');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    const handleSalaryUpdate = () => {
      try {
        const saved = localStorage.getItem('EMS_SALARY_MAP');
        if (saved) setSalaryMap(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('hrms_salary_update', handleSalaryUpdate);
    return () => window.removeEventListener('hrms_salary_update', handleSalaryUpdate);
  }, []);

  const handleSalaryUpdated = (empCode, updatedSalary) => {
    const updated = { ...salaryMap, [empCode]: updatedSalary };
    setSalaryMap(updated);
    localStorage.setItem('EMS_SALARY_MAP', JSON.stringify(updated));
  };

  const isEmployeeSelf = (emp) => {
    if (!currentUser || !emp) return false;
    return String(emp._id || emp.id) === String(currentUser._id || currentUser.id) ||
      (emp.employeeCode && currentUser.employeeCode && String(emp.employeeCode).toUpperCase() === String(currentUser.employeeCode).toUpperCase()) ||
      (emp.email && currentUser.email && emp.email.toLowerCase() === currentUser.email.toLowerCase());
  };

  const isActorAdmin = isAdmin(currentUser);
  const isActorHR = isHRorAdmin(currentUser);

  if (!isActorHR && !isActorAdmin) {
    return (
      <div className="p-10 px-5 text-center bg-white rounded-xl border border-slate-200 my-10 mx-auto max-w-[600px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="text-lg font-extrabold text-slate-900 mb-1.5">Access Restricted</h2>
        <p className="text-[13px] text-slate-500 mb-4">The Employees & Roles directory and management features are strictly reserved for Administrators and HR personnel.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="py-2 px-[18px] rounded-lg bg-blue-600 text-white border-none font-bold text-[12.5px] cursor-pointer hover:bg-blue-700 transition-colors"
        >
          Return to My Workspace
        </button>
      </div>
    );
  }

  const departments = Array.from(new Set((employees || []).map(e => e.department).filter(Boolean)));
  const systemRoles = getRoles();

  const filteredEmployees = (employees || []).filter(e => {
    if (selectedDept !== 'all' && e.department !== selectedDept) return false;
    if (selectedRoleFilter !== 'all' && e.role !== selectedRoleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = e.name?.toLowerCase().includes(q);
      const matchRole = e.role?.toLowerCase().includes(q);
      const matchEmail = e.email?.toLowerCase().includes(q);
      const matchCode = e.employeeCode?.toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchEmail && !matchCode) return false;
    }
    return true;
  });

  const getRoleBadgeStyle = (roleName = '') => {
    const r = roleName.toLowerCase();
    if (r.includes('super admin') || r.includes('admin')) {
      return { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', icon: '👑' };
    }
    if (r.includes('hr') || r.includes('human resources')) {
      return { bg: '#fdf2f8', border: '#fbcfe8', color: '#be185d', icon: '💼' };
    }
    if (r.includes('leader') || r.includes('lead') || r.includes('manager')) {
      return { bg: '#fffbeb', border: '#fde68a', color: '#b45309', icon: '⚡' };
    }
    if (r.includes('senior')) {
      return { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: '🌟' };
    }
    return { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', icon: '👤' };
  };

  return (
    <div className="flex flex-col gap-3.5 pb-6">
      
      {/* ── Page Header & Quick RBAC Bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white p-3 px-4 rounded-[10px] border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users size={17} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 m-0 leading-tight">
              Employees & Role Management
            </h1>
            <p className="text-[11.5px] text-slate-500 m-0 mt-0.5">
              Total <strong className="text-blue-600">{employees?.length || 0}</strong> active employees • Manage roles, promotions & profiles.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-1.5 py-1.5 px-[11px] rounded-md bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold cursor-pointer h-[30px] hover:bg-slate-100 transition-colors"
            title="Configure RBAC Roles & Custom Designations"
          >
            <ShieldCheck size={14} color="#2563eb" />
            <span>Roles & RBAC Matrix</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-md bg-blue-600 text-white border-none text-xs font-bold cursor-pointer h-[30px] shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* ── Security Rule Explanation Card (Compact) ── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-2.5">
        <div className="py-2 px-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
          <span className="text-[15px]">👑</span>
          <div>
            <div className="text-[11.5px] font-extrabold text-blue-900">
              Super Admin Authority
            </div>
            <div className="text-[11px] text-blue-600 leading-tight">
              Can assign any role, create <strong>New Admins</strong>, HRs, Team Leads, or Custom Roles.
            </div>
          </div>
        </div>

        <div className="py-2 px-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
          <span className="text-[15px]">💼</span>
          <div>
            <div className="text-[11.5px] font-extrabold text-amber-800">
              HR Manager Role Assignment
            </div>
            <div className="text-[11px] text-amber-700 leading-tight">
              Can promote Team Leads, Seniors, Juniors & Custom Roles (cannot create Admins).
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar (Compact) ── */}
      <div className="bg-white p-2.5 px-3.5 rounded-[10px] border border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 flex items-center">
            <Search size={14} className="absolute left-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, role, email, employee ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-[30px] pl-[30px] pr-2.5 rounded-md border border-slate-300 text-xs outline-none bg-slate-50 text-slate-900"
            />
          </div>

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="h-[30px] px-2 rounded-md border border-slate-300 text-xs bg-white text-slate-900 outline-none"
          >
            <option value="all" className="bg-white text-slate-900">All Departments ({departments.length})</option>
            {departments.map(d => (
              <option key={d} value={d} className="bg-white text-slate-900">{d}</option>
            ))}
          </select>

          <select
            value={selectedRoleFilter}
            onChange={e => setSelectedRoleFilter(e.target.value)}
            className="h-[30px] px-2 rounded-md border border-slate-300 text-xs bg-white text-slate-900 outline-none"
          >
            <option value="all" className="bg-white text-slate-900">All Roles & Posts</option>
            {systemRoles.map(r => (
              <option key={r.id} value={r.name} className="bg-white text-slate-900">{r.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-semibold">
            Showing {filteredEmployees.length} of {employees.length} employees
          </span>
        </div>
      </div>

      {/* ── Employee Directory Table (Compact Rows & Zero Wrapping) ── */}
      <div className="bg-white rounded-[10px] border border-slate-200 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-2 px-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Employee Details</th>
                <th className="p-2 px-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Employee ID</th>
                <th className="p-2 px-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Designation / Current Role</th>
                <th className="p-2 px-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Department</th>
                <th className="p-2 px-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Joining Date</th>
                <th className="p-2 px-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Actions & Role Change</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-7 text-slate-500 text-xs">
                    No employees matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const badge = getRoleBadgeStyle(emp.role);
                  return (
                    <tr
                      key={emp._id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-2 px-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img
                            src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(emp.name)}`}
                            alt={emp.name}
                            className="w-[26px] h-[26px] rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 leading-tight">
                              <span>{emp.name}</span>
                              {isEmployeeSelf(emp) && (
                                <span className="text-[9px] py-px px-1 rounded bg-blue-50 text-blue-600 font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-slate-500">
                              {emp.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-2 px-2.5 font-bold text-slate-800 text-[11.5px] whitespace-nowrap">
                        {emp.employeeCode || '—'}
                      </td>

                      {/* Current Role with distinct badge */}
                      <td className="p-2 px-2.5 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1 py-0.5 px-2 rounded-[5px] border text-[11px] font-bold"
                          style={{
                            backgroundColor: badge.bg,
                            borderColor: badge.border,
                            color: badge.color
                          }}
                        >
                          <span>{badge.icon}</span>
                          <span>{emp.role || 'Junior Associate'}</span>
                        </span>
                      </td>

                      <td className="p-2 px-2.5 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 py-0.5 px-1.5 rounded text-[11px] font-semibold">
                          {emp.department || 'Engineering'}
                        </span>
                      </td>

                      <td className="p-2 px-2.5 text-[11.5px] text-slate-500 whitespace-nowrap">
                        {emp.joiningDate || '2023-01-15'}
                      </td>

                      {/* Actions: Direct Role Change & Profile Edit */}
                      <td className="p-2 px-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Button 1: Revise Compensation (Hike / Reduction) */}
                          <button
                            onClick={() => setSelectedSalaryEmp(emp)}
                            className="inline-flex items-center gap-1 py-1 px-2 rounded-[5px] bg-green-50 text-green-700 border border-green-200 text-[11px] font-bold cursor-pointer h-6 hover:bg-green-100 transition-colors"
                            title="Revise Compensation (Hike 📈 or Deduction 📉)"
                          >
                            <ArrowUpDown size={11} color="#16a34a" />
                            <span>Salary</span>
                          </button>

                          {/* Button 2: Direct Role & Post Change (Promote Modal) */}
                          <button
                            onClick={() => setSelectedPromoteEmp(emp)}
                            className="inline-flex items-center gap-1 py-1 px-2 rounded-[5px] bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold cursor-pointer h-6 hover:bg-blue-100 transition-colors"
                            title="Promote or Change Post (Admin & HR)"
                          >
                            <Award size={11} />
                            <span>Role</span>
                          </button>

                          {/* Button 2.5: Granular Permissions & Access Rights Modal */}
                          <button
                            onClick={() => setSelectedPermsEmp(emp)}
                            className="inline-flex items-center gap-1 py-1 px-2 rounded-[5px] bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold cursor-pointer h-6 hover:bg-purple-100 transition-colors"
                            title="Manage Granular Module Permissions & Access Rights"
                          >
                            <ShieldCheck size={11} color="#7c3aed" />
                            <span>Access</span>
                          </button>

                          {/* Button 3: Full Profile & Role Edit */}
                          <button
                            onClick={() => setSelectedProfileEmp(emp)}
                            className="inline-flex items-center gap-1 py-1 px-2 rounded-[5px] bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-semibold cursor-pointer h-6 hover:bg-slate-100 transition-colors"
                            title="Edit Full Profile & Designation"
                          >
                            <User size={11} color="#0284c7" />
                            <span>Edit</span>
                          </button>

                          {!isEmployeeSelf(emp) && (
                            <button
                              onClick={async () => {
                                const ok = await confirm({
                                  title: 'Remove Employee',
                                  message: `Are you sure you want to remove employee "${emp.name}" (${emp.employeeCode || emp.designation})? This will deactivate their account.`,
                                  confirmText: 'Remove Employee',
                                  variant: 'danger'
                                });
                                if (ok) {
                                  deleteEmployee(emp._id);
                                }
                              }}
                              className="w-6 h-6 rounded-[5px] border border-red-200 bg-red-50 text-red-600 inline-flex items-center justify-center cursor-pointer hover:bg-red-100 transition-colors"
                              title="Delete Employee"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ── */}
      <AddEmployeeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      <PromoteEmployeeModal
        isOpen={!!selectedPromoteEmp}
        onClose={() => setSelectedPromoteEmp(null)}
        employee={selectedPromoteEmp}
      />

      <EditProfileModal
        isOpen={!!selectedProfileEmp}
        onClose={() => setSelectedProfileEmp(null)}
        employee={selectedProfileEmp}
      />

      <SalaryIncrementModal
        isOpen={!!selectedSalaryEmp}
        onClose={() => setSelectedSalaryEmp(null)}
        employee={selectedSalaryEmp}
        currentSalaryData={selectedSalaryEmp ? salaryMap[selectedSalaryEmp.employeeCode] : null}
        onSalaryUpdated={handleSalaryUpdated}
      />

      <ManagePermissionsModal
        isOpen={!!selectedPermsEmp}
        onClose={() => setSelectedPermsEmp(null)}
        employee={selectedPermsEmp}
      />

    </div>
  );
};
