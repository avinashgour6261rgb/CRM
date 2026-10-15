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
import { useNavigate } from 'react-router-dom';
import { AddEmployeeModal } from '../components/employees/AddEmployeeModal';
import { PromoteEmployeeModal } from '../components/employees/PromoteEmployeeModal';
import { EditProfileModal } from '../../../shared/components/modals/EditProfileModal';
import { SalaryIncrementModal } from '../../finance/components/SalaryIncrementModal';
import { getRoles } from '../../../shared/services/roleManagementService';
import { isAdmin, isHRorAdmin } from '../../../shared/utils/permissionUtils';

export const EmployeesPage = () => {
  const navigate = useNavigate();
  const { employees, deleteEmployee, currentUser } = useHR();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPromoteEmp, setSelectedPromoteEmp] = useState(null);
  const [selectedProfileEmp, setSelectedProfileEmp] = useState(null);
  const [selectedSalaryEmp, setSelectedSalaryEmp] = useState(null);

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

  const isActorAdmin = isAdmin(currentUser);
  const isActorHR = isHRorAdmin(currentUser);

  if (!isActorHR && !isActorAdmin) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '40px auto', maxWidth: '600px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>Access Restricted</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>The Employees & Roles directory and management features are strictly reserved for Administrators and HR personnel.</p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ padding: '8px 18px', borderRadius: '8px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '24px' }}>
      
      {/* ── Page Header & Quick RBAC Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        backgroundColor: '#ffffff',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Users size={17} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.2' }}>
              Employees & Role Management
            </h1>
            <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
              Total <strong style={{ color: '#2563eb' }}>{employees?.length || 0}</strong> active employees • Manage roles, promotions & profiles.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/settings')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 11px',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              height: '30px'
            }}
            title="Configure RBAC Roles & Custom Designations"
          >
            <ShieldCheck size={14} color="#2563eb" />
            <span>Roles & RBAC Matrix</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              height: '30px',
              boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
            }}
          >
            <Plus size={14} />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* ── Security Rule Explanation Card (Compact) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '10px'
      }}>
        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '15px' }}>👑</span>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#1e3a8a' }}>
              Super Admin Authority
            </div>
            <div style={{ fontSize: '11px', color: '#2563eb', lineHeight: '1.2' }}>
              Can assign any role, create <strong>New Admins</strong>, HRs, Team Leads, or Custom Roles.
            </div>
          </div>
        </div>

        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '15px' }}>💼</span>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#92400e' }}>
              HR Manager Role Assignment
            </div>
            <div style={{ fontSize: '11px', color: '#b45309', lineHeight: '1.2' }}>
              Can promote Team Leads, Seniors, Juniors & Custom Roles (cannot create Admins).
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar (Compact) ── */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
          <div style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name, role, email, employee ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: '30px',
                paddingLeft: '30px',
                paddingRight: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none',
                backgroundColor: '#f8fafc'
              }}
            />
          </div>

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            style={{
              height: '30px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              backgroundColor: '#ffffff',
              outline: 'none'
            }}
          >
            <option value="all">All Departments ({departments.length})</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={selectedRoleFilter}
            onChange={e => setSelectedRoleFilter(e.target.value)}
            style={{
              height: '30px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              backgroundColor: '#ffffff',
              outline: 'none'
            }}
          >
            <option value="all">All Roles & Posts</option>
            {systemRoles.map(r => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
            Showing {filteredEmployees.length} of {employees.length} employees
          </span>
        </div>
      </div>

      {/* ── Employee Directory Table (Compact Rows & Zero Wrapping) ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Employee Details</th>
                <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Employee ID</th>
                <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Designation / Current Role</th>
                <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Department</th>
                <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Joining Date</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Actions & Role Change</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '12px' }}>
                    No employees matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const badge = getRoleBadgeStyle(emp.role);
                  return (
                    <tr
                      key={emp._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(emp.name)}`}
                            alt={emp.name}
                            style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                          />
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', lineHeight: '1.2' }}>
                              <span>{emp.name}</span>
                              {emp.isCurrentUser && (
                                <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '700' }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                              {emp.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '7px 10px', fontWeight: '700', color: '#1e293b', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        {emp.employeeCode || '—'}
                      </td>

                      {/* Current Role with distinct badge */}
                      <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          backgroundColor: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.color,
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          <span>{badge.icon}</span>
                          <span>{emp.role || 'Junior Associate'}</span>
                        </span>
                      </td>

                      <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {emp.department || 'Engineering'}
                        </span>
                      </td>

                      <td style={{ padding: '7px 10px', fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {emp.joiningDate || '2023-01-15'}
                      </td>

                      {/* Actions: Direct Role Change & Profile Edit */}
                      <td style={{ padding: '7px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {/* Button 1: Revise Compensation (Hike / Reduction) */}
                          <button
                            onClick={() => setSelectedSalaryEmp(emp)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '3px 7px',
                              borderRadius: '5px',
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              height: '24px'
                            }}
                            title="Revise Compensation (Hike 📈 or Deduction 📉)"
                          >
                            <ArrowUpDown size={11} color="#16a34a" />
                            <span>Salary</span>
                          </button>

                          {/* Button 2: Direct Role & Post Change (Promote Modal) */}
                          <button
                            onClick={() => setSelectedPromoteEmp(emp)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '3px 8px',
                              borderRadius: '5px',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              height: '24px'
                            }}
                            title="Promote or Change Post (Admin & HR)"
                          >
                            <Award size={11} />
                            <span>Role</span>
                          </button>

                          {/* Button 3: Full Profile & Role Edit */}
                          <button
                            onClick={() => setSelectedProfileEmp(emp)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '3px 7px',
                              borderRadius: '5px',
                              backgroundColor: '#f8fafc',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              height: '24px'
                            }}
                            title="Edit Full Profile & Designation"
                          >
                            <User size={11} color="#0284c7" />
                            <span>Edit</span>
                          </button>

                          {!emp.isCurrentUser && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to remove employee ${emp.name}?`)) {
                                  deleteEmployee(emp._id);
                                  addToast('Employee removed', 'info');
                                }
                              }}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '5px',
                                border: '1px solid #fee2e2',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title="Delete Employee"
                            >
                              <Trash2 size={11} />
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

    </div>
  );
};
