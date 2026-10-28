import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  CreditCard,
  Send,
  Plus,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-react';
import { useHR } from '../../hr/context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { isHRorAdmin } from '../../../shared/utils/permissionUtils';
import { PayslipModal } from '../components/PayslipModal';
import { SalaryIncrementModal } from '../components/SalaryIncrementModal';

export const PayrollPage = () => {
  const { employees, currentUser } = useHR();
  const { currentUser: authUser, isHRorAdmin: isAuthHRorAdmin } = useAuth();
  const { addToast } = useToast();

  const effectiveUser = currentUser || authUser;
  const isPrivileged = isAuthHRorAdmin || isHRorAdmin(effectiveUser) || effectiveUser?.isDelegatedAdmin;

  const [selectedMonth, setSelectedMonth] = useState('September 2026');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [activeEmployeeForPayslip, setActiveEmployeeForPayslip] = useState(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  const [activeEmployeeForRevision, setActiveEmployeeForRevision] = useState(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  if (!isPrivileged) {
    return (
      <div className="flex flex-col items-center justify-center py-15 px-5 text-center bg-white rounded-2xl border border-slate-200 my-[30px] mx-auto max-w-[540px] shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4">
          <DollarSign size={28} />
        </div>
        <h3 className="text-lg font-extrabold text-slate-900 mb-2 m-0">
          Payroll & Salary Access Restricted
        </h3>
        <p className="text-[13.5px] text-slate-500 leading-relaxed mb-4 m-0">
          Company payroll records and salary management are restricted to HR & Administrators only. You can view your personal payslip from your profile.
        </p>
      </div>
    );
  }

  // Dynamic salary state with reactive updates & local persistence
  const [salaryMap, setSalaryMap] = useState(() => {
    const saved = localStorage.getItem('EMS_SALARY_MAP');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      'EMP-001': { basic: 52000, hra: 20800, allowances: 14000, bonus: 5000, pf: 4160, pt: 200, tds: 3500, lastRevisionPercentage: 15, lastRevisionDate: '2026-09-01', revisionType: 'hike' },
      'EMP-002': { basic: 48000, hra: 19200, allowances: 12000, bonus: 4000, pf: 3840, pt: 200, tds: 2800 },
      'EMP-003': { basic: 65000, hra: 26000, allowances: 18000, bonus: 7500, pf: 5200, pt: 200, tds: 5400, lastRevisionPercentage: 20, lastRevisionDate: '2026-08-15', revisionType: 'hike' },
      'EMP-004': { basic: 45000, hra: 18000, allowances: 10000, bonus: 3000, pf: 3600, pt: 200, tds: 2200 },
      'EMP-005': { basic: 58000, hra: 23200, allowances: 15000, bonus: 6000, pf: 4640, pt: 200, tds: 4200 }
    };
  });

  // Listen for global salary revision events across pages
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.detail && e.detail.employeeCode && e.detail.salary) {
        setSalaryMap(prev => {
          const updated = {
            ...prev,
            [e.detail.employeeCode]: { ...(prev[e.detail.employeeCode] || {}), ...e.detail.salary }
          };
          localStorage.setItem('EMS_SALARY_MAP', JSON.stringify(updated));
          return updated;
        });
      }
    };

    window.addEventListener('hrms_salary_update', handleStorageChange);
    return () => window.removeEventListener('hrms_salary_update', handleStorageChange);
  }, []);

  const handleSalaryUpdated = (empCode, updatedData) => {
    setSalaryMap(prev => {
      const updated = {
        ...prev,
        [empCode]: { ...(prev[empCode] || {}), ...updatedData }
      };
      localStorage.setItem('EMS_SALARY_MAP', JSON.stringify(updated));
      return updated;
    });
  };

  const handleOpenRevisionModal = (emp) => {
    setActiveEmployeeForRevision(emp);
    setIsRevisionModalOpen(true);
  };

  const departments = ['all', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDepartment === 'all' || emp.department === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const handleOpenPayslip = (emp) => {
    setActiveEmployeeForPayslip(emp);
    setIsPayslipOpen(true);
  };

  const handleDisburseAll = () => {
    addToast({
      title: 'Batch Payroll Processed 🚀',
      message: `Direct bank salary transfer successfully executed for ${filteredEmployees.length} employees for ${selectedMonth}.`,
      type: 'success'
    });
  };

  // Calculations for total statistics
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNetPay = 0;

  employees.forEach(emp => {
    const s = salaryMap[emp.employeeCode] || { basic: 45000, hra: 18000, allowances: 12000, bonus: 0, pf: 3600, pt: 200, tds: 2500 };
    const gross = s.basic + s.hra + s.allowances + (s.bonus || 0);
    const deductions = (s.pf || 0) + (s.pt || 200) + (s.tds || 0);
    const net = gross - deductions;

    totalGross += gross;
    totalDeductions += deductions;
    totalNetPay += net;
  });

  return (
    <div className="flex flex-col gap-3.5 min-h-full pb-6">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white p-3 px-4 rounded-xl border border-slate-200 shadow-xs min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign size={17} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 m-0 leading-tight">
              Payroll & Compensation Hub
            </h1>
            <p className="mt-0.5 m-0 text-[11.5px] text-slate-500">
              Manage salary hikes 📈, tax & PF deductions, and automated monthly payslips.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-2.5 h-[30px] rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-900 cursor-pointer outline-none focus:border-blue-500 transition-colors"
          >
            <option value="October 2026">October 2026</option>
            <option value="September 2026">September 2026</option>
            <option value="August 2026">August 2026</option>
            <option value="July 2026">July 2026</option>
          </select>

          <button
            onClick={handleDisburseAll}
            className="inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md bg-green-600 hover:bg-green-700 text-white border-0 text-xs font-bold cursor-pointer shadow-xs transition-colors"
          >
            <CreditCard size={14} />
            <span>Disburse All</span>
          </button>
        </div>
      </div>

      {/* Metric Cards (Compact 10px padding) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
        {/* Total Payroll */}
        <div className="bg-white rounded-xl p-2.5 px-3.5 border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <DollarSign size={16} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500">Total Payroll Expense</span>
            <div className="text-lg font-extrabold text-slate-900 leading-tight">
              ₹{totalGross.toLocaleString()}
            </div>
            <span className="text-[10.5px] text-green-600 font-semibold">Gross for {selectedMonth}</span>
          </div>
        </div>

        {/* Net Disbursed */}
        <div className="bg-white rounded-xl p-2.5 px-3.5 border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <CreditCard size={16} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500">Net In-Hand Pay</span>
            <div className="text-lg font-extrabold text-green-700 leading-tight">
              ₹{totalNetPay.toLocaleString()}
            </div>
            <span className="text-[10.5px] text-slate-500">Direct Bank Transfers</span>
          </div>
        </div>

        {/* Deductions & Taxes */}
        <div className="bg-white rounded-xl p-2.5 px-3.5 border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <ArrowUpDown size={16} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500">Total Deductions</span>
            <div className="text-lg font-extrabold text-red-700 leading-tight">
              ₹{totalDeductions.toLocaleString()}
            </div>
            <span className="text-[10.5px] text-slate-500">PF, PT & TDS withheld</span>
          </div>
        </div>

        {/* Workforce on Payroll */}
        <div className="bg-white rounded-xl p-2.5 px-3.5 border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Building2 size={16} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500">Active Payees</span>
            <div className="text-lg font-extrabold text-purple-700 leading-tight">
              {employees.length} Members
            </div>
            <span className="text-[10.5px] text-green-600 font-semibold">100% attendance sync</span>
          </div>
        </div>
      </div>

      {/* Salary List Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Search & Filter Bar */}
        <div className="p-2.5 px-3.5 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 bg-slate-50 w-60 focus-within:border-blue-500 focus-within:bg-white transition-colors">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search employee, ID or role..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent outline-none text-xs w-full text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="px-2 h-[30px] rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-slate-500 font-semibold">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">
                <th className="p-2 px-2.5">Employee</th>
                <th className="p-2 px-2.5">Designation & Dept</th>
                <th className="p-2 px-2.5">Monthly Gross</th>
                <th className="p-2 px-2.5">Basic (50%)</th>
                <th className="p-2 px-2.5">HRA & Allowances</th>
                <th className="p-2 px-2.5">Deductions</th>
                <th className="p-2 px-2.5">Net In-Hand</th>
                <th className="p-2 px-2.5 text-right">Compensation Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => {
                const s = salaryMap[emp.employeeCode] || { basic: 45000, hra: 18000, allowances: 12000, bonus: 3000, pf: 3600, pt: 200, tds: 2500 };
                const gross = s.basic + s.hra + s.allowances + (s.bonus || 0);
                const deductions = (s.pf || 0) + (s.pt || 200) + (s.tds || 0);
                const net = gross - deductions;

                const hasRevision = s.lastRevisionPercentage !== undefined && s.lastRevisionPercentage !== null;
                const isPositiveHike = hasRevision ? s.lastRevisionPercentage > 0 : (s.lastHikePercentage ? true : false);
                const revisionPercent = hasRevision ? Math.abs(s.lastRevisionPercentage) : (s.lastHikePercentage || null);

                return (
                  <tr
                    key={emp._id || emp.employeeCode}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Employee info */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <img
                          src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={emp.name}
                          className="w-[26px] h-[26px] rounded-full object-cover"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-xs leading-tight">{emp.name}</div>
                          <div className="flex items-center gap-1 mt-[1px]">
                            <span className="text-[10.5px] text-slate-500">{emp.employeeCode}</span>
                            {revisionPercent && (
                              <span className={`inline-flex items-center gap-0.5 text-[9.5px] font-extrabold px-1 py-[1px] rounded border ${
                                isPositiveHike
                                  ? 'text-green-700 bg-green-100 border-green-200'
                                  : 'text-red-700 bg-red-100 border-red-200'
                              }`}>
                                {isPositiveHike ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                {isPositiveHike ? `+${revisionPercent}%` : `-${revisionPercent}%`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Department */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 text-xs">{emp.role}</div>
                      <div className="text-[10.5px] text-slate-500">{emp.department}</div>
                    </td>

                    {/* Gross CTC */}
                    <td className="py-[7px] px-2.5 font-extrabold text-slate-900 text-xs whitespace-nowrap">
                      ₹{gross.toLocaleString()}
                    </td>

                    {/* Basic */}
                    <td className="py-[7px] px-2.5 font-semibold text-slate-700 text-[11.5px] whitespace-nowrap">
                      ₹{s.basic.toLocaleString()}
                    </td>

                    {/* HRA & Allowances */}
                    <td className="py-[7px] px-2.5 text-green-600 text-[11.5px] whitespace-nowrap">
                      +₹{(s.hra + s.allowances + (s.bonus || 0)).toLocaleString()}
                    </td>

                    {/* Deductions */}
                    <td className="py-[7px] px-2.5 text-red-700 font-semibold text-[11.5px] whitespace-nowrap">
                      -₹{deductions.toLocaleString()}
                    </td>

                    {/* Net Pay */}
                    <td className="py-[7px] px-2.5 font-extrabold text-green-700 text-[12.5px] whitespace-nowrap">
                      ₹{net.toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="py-[7px] px-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-[5px]">
                        
                        {/* Revise Salary Button */}
                        <button
                          onClick={() => handleOpenRevisionModal(emp)}
                          className="inline-flex items-center gap-[3px] px-2 py-[3px] rounded-md bg-slate-50 hover:bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-bold cursor-pointer h-6 transition-colors"
                          title="Hike (Increase) or Deduct (Decrease) Employee Salary"
                        >
                          <ArrowUpDown size={11} className="text-blue-600" />
                          <span>Revise</span>
                        </button>

                        {/* Payslip Button */}
                        <button
                          onClick={() => handleOpenPayslip(emp)}
                          className="inline-flex items-center gap-[3px] px-2 py-[3px] rounded-md bg-blue-600 hover:bg-blue-700 text-white border-0 text-[11px] font-semibold cursor-pointer h-6 shadow-xs transition-colors"
                        >
                          <FileText size={11} />
                          <span>Payslip</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Modal */}
      <PayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        employee={activeEmployeeForPayslip}
        month={selectedMonth}
        salaryData={activeEmployeeForPayslip ? salaryMap[activeEmployeeForPayslip.employeeCode] : null}
      />

      {/* Salary Revision & Compensation Modal */}
      <SalaryIncrementModal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        employee={activeEmployeeForRevision}
        currentSalaryData={activeEmployeeForRevision ? salaryMap[activeEmployeeForRevision.employeeCode] : null}
        onSalaryUpdated={handleSalaryUpdated}
      />
    </div>
  );
};
