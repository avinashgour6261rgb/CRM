import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import { Plus, Trash2, Mail, Briefcase, Building, Search, Calendar, UserCheck, Award, User, Edit3, ArrowUpDown, ShieldCheck } from 'lucide-react';
import { AddEmployeeModal } from './AddEmployeeModal';
import { PromoteEmployeeModal } from './PromoteEmployeeModal';
import { EditProfileModal } from '../../../../shared/components/modals/EditProfileModal';
import { SalaryIncrementModal } from '../../../finance/components/SalaryIncrementModal';
import { ManagePermissionsModal } from './ManagePermissionsModal';

export const EmployeeDirectoryModal = ({ isOpen, onClose }) => {
  const { employees, deleteEmployee, currentUser } = useHR();
  const [search, setSearch] = useState('');

  const isEmployeeSelf = (emp) => {
    if (!currentUser || !emp) return false;
    return String(emp._id || emp.id) === String(currentUser._id || currentUser.id) ||
      (emp.employeeCode && currentUser.employeeCode && String(emp.employeeCode).toUpperCase() === String(currentUser.employeeCode).toUpperCase()) ||
      (emp.email && currentUser.email && emp.email.toLowerCase() === currentUser.email.toLowerCase());
  };
  const [selectedDept, setSelectedDept] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPromoteEmp, setSelectedPromoteEmp] = useState(null);
  const [selectedProfileEmp, setSelectedProfileEmp] = useState(null);
  const [selectedSalaryEmp, setSelectedSalaryEmp] = useState(null);
  const [selectedPermsEmp, setSelectedPermsEmp] = useState(null);

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

  const filtered = (employees || []).filter(e => {
    if (selectedDept !== 'all' && e.department !== selectedDept) return false;
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

  const departments = Array.from(new Set((employees || []).map(e => e.department).filter(Boolean)));

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Employee Directory & Team Roster"
        subtitle={`Total ${employees?.length || 0} active employees registered in company database.`}
        maxWidth="920px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Action & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <div className="filter-input-wrap" style={{ flex: 1, minWidth: '200px' }}>
                <Search size={15} className="filter-input-icon" />
                <input
                  type="text"
                  placeholder="Search by name, role, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="filter-input"
                  style={{ width: '100%' }}
                />
              </div>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="filter-select"
                style={{ height: '36px' }}
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsAddOpen(true)}
              className="btn btn-primary"
              style={{ height: '36px' }}
            >
              <Plus size={15} />
              <span>Add Employee</span>
            </button>
          </div>

          {/* Employee Table */}
          <div className="table-responsive" style={{ maxHeight: '450px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee Code</th>
                  <th>Department</th>
                  <th>Joining Date</th>
                  <th>Leave Balance</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp._id}>
                    <td>
                      <div
                        className="employee-cell"
                        onClick={() => setSelectedProfileEmp(emp)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view & edit employee profile and role"
                      >
                        <div className="employee-avatar">
                          {emp.avatar ? <img src={emp.avatar} alt={emp.name} /> : (emp.name?.charAt(0) || 'E')}
                        </div>
                        <div className="employee-name-group">
                          <span className="employee-name" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                            {emp.name}
                            {isEmployeeSelf(emp) && (
                              <span className="its-you-pill" style={{ fontSize: '9px', padding: '1px 5px', marginLeft: '6px' }}>It's You</span>
                            )}
                          </span>
                          <span className="employee-role">{emp.role} • {emp.email}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ fontWeight: '600', color: '#1e293b' }}>
                      {emp.employeeCode || '—'}
                    </td>

                    <td>
                      <span style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: '600'
                      }}>
                        {emp.department}
                      </span>
                    </td>

                    <td style={{ fontSize: '12.5px', color: '#64748b' }}>
                      {emp.joiningDate || '2023-01-15'}
                    </td>

                    <td style={{ fontSize: '12px', color: '#0284c7', fontWeight: '600' }}>
                      CL: {emp.leaveBalance?.casual || 0} | SL: {emp.leaveBalance?.sick || 0} | EL: {emp.leaveBalance?.earned || 0}
                    </td>

                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setSelectedSalaryEmp(emp)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#f0fdf4',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          marginRight: '6px'
                        }}
                        title="Revise Compensation (Hike 📈 or Decrease 📉)"
                      >
                        <ArrowUpDown size={11} color="#16a34a" />
                        <span>Revise Salary</span>
                      </button>

                      <button
                        onClick={() => setSelectedProfileEmp(emp)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          marginRight: '6px'
                        }}
                        title="View & Edit Full Profile / Role"
                      >
                        <User size={12} color="#0284c7" />
                        <span>Profile & Role</span>
                      </button>

                      <button
                        onClick={() => setSelectedPermsEmp(emp)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#f5f3ff',
                          color: '#7c3aed',
                          border: '1px solid #ddd6fe',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          marginRight: '6px'
                        }}
                        title="Configure Granular Module Permissions & Access Rights"
                      >
                        <ShieldCheck size={12} color="#7c3aed" />
                        <span>Access Rights</span>
                      </button>

                      <button
                        onClick={() => setSelectedPromoteEmp(emp)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          marginRight: '6px'
                        }}
                        title="Promote / Upgrade Post (Admin & HR)"
                      >
                        <Award size={12} />
                        <span>Promote</span>
                      </button>

                      {!isEmployeeSelf(emp) && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove employee ${emp.name}?`)) {
                              deleteEmployee(emp._id);
                            }
                          }}
                          className="btn-icon-only"
                          style={{ width: '28px', height: '28px', color: '#ef4444' }}
                          title="Remove Employee"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

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
    </>
  );
};
