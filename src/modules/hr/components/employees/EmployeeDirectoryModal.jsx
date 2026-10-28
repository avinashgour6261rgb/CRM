import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import { useConfirm } from '../../../../shared/context/ConfirmContext';
import { Plus, Trash2, Mail, Briefcase, Building, Search, Calendar, UserCheck, Award, User, Edit3, ArrowUpDown, ShieldCheck } from 'lucide-react';
import { AddEmployeeModal } from './AddEmployeeModal';
import { PromoteEmployeeModal } from './PromoteEmployeeModal';
import { EditProfileModal } from '../../../../shared/components/modals/EditProfileModal';
import { SalaryIncrementModal } from '../../../finance/components/SalaryIncrementModal';
import { ManagePermissionsModal } from './ManagePermissionsModal';

export const EmployeeDirectoryModal = ({ isOpen, onClose }) => {
  const { employees, deleteEmployee, currentUser } = useHR();
  const { confirm } = useConfirm();
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
        <div className="flex flex-col gap-4">
          {/* Action & Filter Bar */}
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-1">
              <div className="filter-input-wrap flex-1 min-w-[200px]">
                <Search size={15} className="filter-input-icon" />
                <input
                  type="text"
                  placeholder="Search by name, role, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="filter-input w-full"
                />
              </div>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="filter-select h-9"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsAddOpen(true)}
              className="btn btn-primary h-9"
            >
              <Plus size={15} />
              <span>Add Employee</span>
            </button>
          </div>

          {/* Employee Table */}
          <div className="table-responsive max-h-[450px] border border-slate-200 rounded-lg">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee Code</th>
                  <th>Department</th>
                  <th>Joining Date</th>
                  <th>Leave Balance</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp._id}>
                    <td>
                      <div
                        className="employee-cell cursor-pointer"
                        onClick={() => setSelectedProfileEmp(emp)}
                        title="Click to view & edit employee profile and role"
                      >
                        <div className="employee-avatar">
                          {emp.avatar ? <img src={emp.avatar} alt={emp.name} /> : (emp.name?.charAt(0) || 'E')}
                        </div>
                        <div className="employee-name-group">
                          <span className="employee-name text-blue-600 underline">
                            {emp.name}
                            {isEmployeeSelf(emp) && (
                              <span className="its-you-pill text-[9px] py-[1px] px-[5px] ml-1.5">It's You</span>
                            )}
                          </span>
                          <span className="employee-role">{emp.role} • {emp.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="font-semibold text-slate-800">
                      {emp.employeeCode || '—'}
                    </td>

                    <td>
                      <span className="bg-slate-100 text-slate-700 py-[3px] px-2 rounded-md text-[11.5px] font-semibold">
                        {emp.department}
                      </span>
                    </td>

                    <td className="text-[12.5px] text-slate-500">
                      {emp.joiningDate || '2023-01-15'}
                    </td>

                    <td className="text-xs text-sky-600 font-semibold">
                      CL: {emp.leaveBalance?.casual || 0} | SL: {emp.leaveBalance?.sick || 0} | EL: {emp.leaveBalance?.earned || 0}
                    </td>

                    <td className="text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedSalaryEmp(emp)}
                        className="inline-flex items-center gap-1 py-1 px-2 rounded-md bg-green-50 text-green-700 border border-green-200 text-[11px] font-bold cursor-pointer mr-1.5 hover:bg-green-100"
                        title="Revise Compensation (Hike 📈 or Decrease 📉)"
                      >
                        <ArrowUpDown size={11} color="#16a34a" />
                        <span>Revise Salary</span>
                      </button>

                      <button
                        onClick={() => setSelectedProfileEmp(emp)}
                        className="inline-flex items-center gap-1 py-1 px-2 rounded-md bg-slate-50 text-slate-600 border border-slate-300 text-[11px] font-bold cursor-pointer mr-1.5 hover:bg-slate-100"
                        title="View & Edit Full Profile / Role"
                      >
                        <User size={12} color="#0284c7" />
                        <span>Profile & Role</span>
                      </button>

                      <button
                        onClick={() => setSelectedPermsEmp(emp)}
                        className="inline-flex items-center gap-1 py-1 px-2 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold cursor-pointer mr-1.5 hover:bg-purple-100"
                        title="Configure Granular Module Permissions & Access Rights"
                      >
                        <ShieldCheck size={12} color="#7c3aed" />
                        <span>Access Rights</span>
                      </button>

                      <button
                        onClick={() => setSelectedPromoteEmp(emp)}
                        className="inline-flex items-center gap-1 py-1 px-2 rounded-md bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-bold cursor-pointer mr-1.5 hover:bg-blue-100"
                        title="Promote / Upgrade Post (Admin & HR)"
                      >
                        <Award size={12} />
                        <span>Promote</span>
                      </button>

                      {!isEmployeeSelf(emp) && (
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Remove Employee',
                              message: `Are you sure you want to remove employee "${emp.name}"? This action cannot be undone.`,
                              confirmText: 'Remove Employee',
                              variant: 'danger'
                            });
                            if (ok) {
                              deleteEmployee(emp._id);
                            }
                          }}
                          className="btn-icon-only w-7 h-7 text-red-500"
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
