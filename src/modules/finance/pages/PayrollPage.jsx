import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowUpDown,
  User,
  ShieldCheck,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useHR } from '../../hr/context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { isHRorAdmin, canAccessModule, canManagePayroll, canExportData } from '../../../shared/utils/permissionUtils';
import { PayslipModal } from '../components/PayslipModal';
import { SalaryIncrementModal } from '../components/SalaryIncrementModal';
import { getCompanySettings, saveCompanySettings } from '../../../shared/services/companySettingsService';
import { downloadCSVBlob } from '../../../shared/utils/exportUtils';
import { calculateMonthlyPayroll, resolveDirectSalary } from '../../../shared/utils/payrollUtils';

const PAYROLL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getCurrentMonthLabel = () => {
  const now = new Date();
  return `${PAYROLL_MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
};

const getRecentPayrollMonths = (count = 12) => {
  const now = new Date();
  const list = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push(`${PAYROLL_MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`);
  }
  return list;
};

export const PayrollPage = () => {
  const { employees, currentUser, updateEmployee, attendance, leaves, holidays } = useHR();
  const { currentUser: authUser, isHRorAdmin: isAuthHRorAdmin } = useAuth();
  const { addToast } = useToast();

  const effectiveUser = currentUser || authUser;
  const isPrivileged = canAccessModule(effectiveUser, 'payroll') || canAccessModule(effectiveUser, 'finance');
  const canManageSalaries = useMemo(() => canManagePayroll(effectiveUser), [effectiveUser]);
  const canExport = useMemo(() => canExportData(effectiveUser, 'payroll'), [effectiveUser]);

  const payrollMonthOptions = useMemo(() => getRecentPayrollMonths(12), []);
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonthLabel());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [activeEmployeeForPayslip, setActiveEmployeeForPayslip] = useState(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  const [activeEmployeeForRevision, setActiveEmployeeForRevision] = useState(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  // Track batch disbursed months synced with MongoDB CompanySettings
  const [disbursedMonths, setDisbursedMonths] = useState(() => {
    const cfg = getCompanySettings();
    return Array.isArray(cfg?.disbursedPayrollMonths) ? cfg.disbursedPayrollMonths : [];
  });
  const [payrollDisbursedHistory, setPayrollDisbursedHistory] = useState(() => {
    const cfg = getCompanySettings();
    return cfg?.payrollDisbursedHistory || {};
  });

  useEffect(() => {
    const onSettingsUpdate = () => {
      const cfg = getCompanySettings();
      if (Array.isArray(cfg?.disbursedPayrollMonths)) {
        setDisbursedMonths(cfg.disbursedPayrollMonths);
      }
      if (cfg?.payrollDisbursedHistory) {
        setPayrollDisbursedHistory(cfg.payrollDisbursedHistory);
      }
    };
    window.addEventListener('company-settings-updated', onSettingsUpdate);
    return () => window.removeEventListener('company-settings-updated', onSettingsUpdate);
  }, []);

  const isCurrentMonthDisbursed = disbursedMonths.includes(selectedMonth);

  // Helper to resolve an employee's direct in-hand salary (no statutory splits)
  const resolveEmployeeSalary = (emp, salaryData = null) => {
    return resolveDirectSalary(emp, salaryData);
  };

  // Helper to compute attendance-based monthly payroll, calendar daily rate & LOP
  const computeEmployeePayroll = (emp, salaryOverride = null) => {
    return calculateMonthlyPayroll({
      employee: emp,
      selectedMonth,
      attendance,
      leaves,
      holidays,
      companySettings: getCompanySettings(),
      salaryOverride
    });
  };

  // Listen for global salary revision events across pages
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.detail?.employeeCode && e.detail?.salary) {
        // Trigger React re-render
        setSelectedMonth(prev => prev);
      }
    };
    window.addEventListener('hrms_salary_update', handleStorageChange);
    return () => window.removeEventListener('hrms_salary_update', handleStorageChange);
  }, []);

  const handleSalaryUpdated = (empCode, updatedData) => {
    const targetEmp = employees.find(e => e.employeeCode === empCode || e._id === empCode);
    if (targetEmp && typeof updateEmployee === 'function') {
      updateEmployee(targetEmp._id, {
        ...targetEmp,
        salary: updatedData,
        startingSalary: updatedData.monthlyGross,
        annualCTC: updatedData.annualCTC
      });
    }
  };

  const handleOpenRevisionModal = (emp) => {
    setActiveEmployeeForRevision(emp);
    setIsRevisionModalOpen(true);
  };

  const handleOpenPayslip = (emp) => {
    setActiveEmployeeForPayslip(emp);
    setIsPayslipOpen(true);
  };

  const handleDisburseAll = async () => {
    if (isCurrentMonthDisbursed) {
      addToast({
        title: 'Payroll Already Disbursed',
        message: `Salaries for ${selectedMonth} have already been recorded as disbursed.`,
        type: 'info'
      });
      return;
    }

    const actorName = effectiveUser?.name || 'Administrator';
    const actorCode = effectiveUser?.employeeCode || '';
    const actorLabel = actorCode ? `${actorName} (${actorCode})` : actorName;

    const updated = Array.from(new Set([...disbursedMonths, selectedMonth]));
    setDisbursedMonths(updated);
    const updatedHistory = {
      ...payrollDisbursedHistory,
      [selectedMonth]: {
        disbursedBy: actorLabel,
        disbursedById: effectiveUser?._id,
        disbursedByCode: actorCode,
        disbursedAt: new Date().toISOString()
      }
    };
    setPayrollDisbursedHistory(updatedHistory);
    try {
      await saveCompanySettings({ disbursedPayrollMonths: updated, payrollDisbursedHistory: updatedHistory });
      addToast({
        title: 'Batch Payroll Disbursed & Saved 🚀',
        message: `Payroll for ${selectedMonth} recorded by ${actorLabel} in MongoDB and synced live across devices.`,
        type: 'success'
      });
    } catch (err) {
      setDisbursedMonths(disbursedMonths);
      setPayrollDisbursedHistory(payrollDisbursedHistory);
      addToast({
        title: 'Failed to Save Payroll Status',
        message: err?.message || 'Could not save disbursement status to database.',
        type: 'error'
      });
    }
  };

  // =========================================================================
  // VIEW 1: REGULAR EMPLOYEE / TEAM MEMBER SELF-SERVICE PAYSLIP HUB
  // =========================================================================
  if (!isPrivileged) {
    const myEmp = effectiveUser;
    const payroll = computeEmployeePayroll(myEmp);
    const mySalary = payroll.monthlyGross;
    const netTakeHome = payroll.netSalary;
    const totalDeductions = payroll.totalLopDeduction;

    return (
      <div className="flex flex-col gap-3.5 min-h-full pb-8 animate-fade-in">
        {/* Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-h-[68px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0 leading-tight">
                  My Salary & Compensation Hub
                </h1>
                <span className="text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  Direct In-Hand Salary
                </span>
              </div>
              <p className="mt-0.5 m-0 text-xs text-slate-500 dark:text-slate-400">
                View monthly agreed in-hand salary, live attendance tracking & official downloadable payslip
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 h-[32px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer outline-none focus:border-blue-500 transition-colors flex-1 sm:flex-initial"
            >
              {payrollMonthOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <button
              onClick={() => handleOpenPayslip(myEmp)}
              className="inline-flex items-center gap-1.5 px-3.5 h-[32px] rounded-md bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs font-bold cursor-pointer shadow-xs transition-colors flex-1 sm:flex-initial justify-center"
            >
              <FileText size={14} />
              <span>Generate Official Payslip</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* 1. Monthly Direct In-Hand */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 px-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <DollarSign size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Monthly In-Hand Package</span>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                ₹{mySalary.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-blue-600 font-semibold">{selectedMonth}</span>
            </div>
          </div>

          {/* 2. Net Take-Home Pay */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 px-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Net Payable This Month</span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                ₹{netTakeHome.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                {isCurrentMonthDisbursed ? '✓ Disbursed to Bank' : '⏳ Pending Cycle'}
              </span>
            </div>
          </div>

          {/* 3. Deductions & LOP */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 px-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ArrowUpDown size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Attendance Deductions</span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 leading-tight">
                ₹{totalDeductions.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-500">
                {payroll.totalLopDays > 0 ? `${payroll.totalLopDays}d Loss of Pay (LOP)` : 'Full Attendance'}
              </span>
            </div>
          </div>

          {/* 4. Annual Package */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 px-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Annual Equivalent</span>
              <div className="text-xl font-black text-purple-700 dark:text-purple-400 leading-tight">
                ₹{(mySalary * 12).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-500">₹{(mySalary * 12 / 100000).toFixed(2)} LPA In-Hand</span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Card (Monthly Compensation vs Attendance Deductions) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Monthly Package & Days Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider m-0">
                Salary & Attendance Summary
              </h3>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                ₹{mySalary.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Monthly Agreed In-Hand Salary</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">₹{mySalary.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Total Calendar Days in Month</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{payroll.daysInMonth} Days</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Daily Salary Rate (Salary / {payroll.daysInMonth})</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">₹{payroll.dailyRate.toLocaleString('en-IN')} / day</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Half-Day Rate (0.5 × Daily Rate)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">₹{payroll.halfDayRate.toLocaleString('en-IN')} / half-day</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Total Payable Days Count</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{payroll.paidDays} of {payroll.daysInMonth} Days</span>
              </div>
              <div className="flex items-center justify-between pt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                <span>Agreed Gross In-Hand</span>
                <span className="text-blue-600 dark:text-blue-400">₹{mySalary.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Attendance Deductions Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider m-0">
                Attendance Deductions (LOP)
              </h3>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {totalDeductions > 0 ? `-₹${totalDeductions.toLocaleString('en-IN')}` : '₹0 (Full Attendance)'}
              </span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Full Present Days ({payroll.presentDays} Days)</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹0 Deduction</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Half-Day Deduction ({payroll.halfDays} Days @ 0.5)</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {payroll.halfDayDeduction > 0 ? `-₹${payroll.halfDayDeduction.toLocaleString('en-IN')}` : '₹0'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Absent Days ({payroll.absentDays} Days @ 1.0)</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {payroll.absentDeduction > 0 ? `-₹${payroll.absentDeduction.toLocaleString('en-IN')}` : '₹0'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Unpaid Leave Days ({payroll.unpaidLeaveDays} Days @ 1.0)</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {payroll.unpaidLeaveDeduction > 0 ? `-₹${payroll.unpaidLeaveDeduction.toLocaleString('en-IN')}` : '₹0'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Weekly Offs & Holidays ({payroll.weeklyOffCount + payroll.holidayCount} Days)</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Paid Rest Days</span>
              </div>
              <div className="flex items-center justify-between pt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                <span>Net Payable In-Hand</span>
                <span className="text-emerald-600 dark:text-emerald-400">₹{netTakeHome.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payslip Modal for Current User */}
        <PayslipModal
          isOpen={isPayslipOpen}
          onClose={() => setIsPayslipOpen(false)}
          employee={myEmp}
          month={selectedMonth}
          salaryData={mySalary ? { monthlyGross: mySalary } : null}
          attendance={attendance}
          leaves={leaves}
          holidays={holidays}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ADMIN & HR ENTERPRISE PAYROLL MATRIX & COMPENSATION HUB
  // =========================================================================
  // Active employees only for monthly payroll disbursal (exclude relieved/archived ex-employees)
  const inactivePayrollStatuses = new Set(['resigned', 'inactive', 'terminated', 'suspended', 'archived']);
  const activePayrollEmployees = (employees || []).filter(emp => !inactivePayrollStatuses.has(String(emp?.status || 'active').toLowerCase()));
  const departments = ['all', ...Array.from(new Set(activePayrollEmployees.map(e => e.department).filter(Boolean)))];

  const filteredEmployees = activePayrollEmployees.filter(emp => {
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDepartment === 'all' || emp.department === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const handleExportPayroll = () => {
    if (!filteredEmployees || filteredEmployees.length === 0) {
      addToast('No employee payroll records to export.', 'info');
      return;
    }
    const headers = [
      'Employee Code',
      'Name',
      'Department',
      'Designation',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'PAN',
      'Monthly In-Hand Salary (INR)',
      'Calendar Days In Month',
      'Paid Days',
      'Present Days',
      'Half Days',
      'Absent Days',
      'Unpaid Leave Days',
      'LOP Days',
      'Attendance Deductions (INR)',
      'Net In-Hand Payable (INR)',
      'Disbursal Status'
    ];
    const rows = filteredEmployees.map(emp => {
      const p = computeEmployeePayroll(emp);
      const bank = emp.bankDetails?.bankName || emp.bankName || 'NA';
      const acct = emp.bankDetails?.accountNumber || emp.accountNumber || 'NA';
      const ifsc = emp.bankDetails?.ifsc || emp.ifsc || 'NA';
      const pan = emp.bankDetails?.pan || emp.pan || 'NA';

      return [
        `"${emp.employeeCode || ''}"`,
        `"${emp.name || ''}"`,
        `"${emp.department || ''}"`,
        `"${emp.designation || emp.role || ''}"`,
        `"${bank}"`,
        `"${acct}"`,
        `"${ifsc}"`,
        `"${pan}"`,
        p.monthlyGross,
        p.daysInMonth,
        p.paidDays,
        p.presentDays,
        p.halfDays,
        p.absentDays,
        p.unpaidLeaveDays,
        p.totalLopDays,
        p.totalLopDeduction,
        p.netSalary,
        `"${isCurrentMonthDisbursed ? 'Disbursed' : 'Pending'}"`
      ].join(',');
    });
    const cfg = getCompanySettings();
    const companyLabel = (cfg.companyName || 'Company').replace(/"/g, '""');
    const companySlug = (cfg.shortName || cfg.companyName || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const titleBanner = `"${companyLabel} — Direct Payroll Register (${selectedMonth})"`;
    const csvContent = [titleBanner, headers.join(','), ...rows].join('\r\n');
    downloadCSVBlob(`${companySlug}_payroll_${selectedMonth.replace(/\s+/g, '_').toLowerCase()}.csv`, csvContent);
  };

  // Calculate live company-wide totals directly from employees
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNetPay = 0;

  activePayrollEmployees.forEach(emp => {
    const p = computeEmployeePayroll(emp);
    totalGross += p.monthlyGross;
    totalDeductions += p.totalLopDeduction;
    totalNetPay += p.netSalary;
  });

  return (
    <div className="flex flex-col gap-3.5 min-h-full pb-6 animate-fade-in">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <DollarSign size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0 leading-tight">
                Payroll & Compensation Hub
              </h1>
              {isCurrentMonthDisbursed ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    ✓ Disbursed
                  </span>
                  {payrollDisbursedHistory[selectedMonth]?.disbursedBy && (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      by {payrollDisbursedHistory[selectedMonth].disbursedBy}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  ⏳ Cycle Open
                </span>
              )}
            </div>
            <p className="mt-0.5 m-0 text-[11.5px] text-slate-500 dark:text-slate-400">
              Enterprise payroll matrix: statutory recalculation, salary revisions, and automated bank disbursal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-2.5 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer outline-none focus:border-blue-500 transition-colors flex-1 sm:flex-initial"
          >
            {payrollMonthOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {canExport && (
            <button
              onClick={handleExportPayroll}
              className="inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer transition-colors flex-1 sm:flex-initial justify-center"
              title="Export Monthly Payroll CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          )}

          {canManageSalaries && (
            <button
              onClick={handleDisburseAll}
              className={`inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md border-0 text-xs font-bold cursor-pointer shadow-xs transition-colors flex-1 sm:flex-initial justify-center ${
                isCurrentMonthDisbursed
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <CreditCard size={14} />
              <span>{isCurrentMonthDisbursed ? 'Re-Disburse' : 'Disburse All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards (Responsive Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Total Payroll */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 px-3.5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <DollarSign size={16} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Payroll Expense</span>
            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
              ₹{totalGross.toLocaleString('en-IN')}
            </div>
            <span className="text-[10.5px] text-green-600 font-semibold">Gross for {selectedMonth}</span>
          </div>
        </div>

        {/* Net Disbursed */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 px-3.5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
            <CreditCard size={16} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Net In-Hand Pay</span>
            <div className="text-lg font-extrabold text-green-700 dark:text-emerald-400 leading-tight">
              ₹{totalNetPay.toLocaleString('en-IN')}
            </div>
            <span className="text-[10.5px] text-slate-500">Direct Bank Transfers</span>
          </div>
        </div>

        {/* Deductions & Taxes */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 px-3.5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <ArrowUpDown size={16} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Deductions</span>
            <div className="text-lg font-extrabold text-red-700 dark:text-rose-400 leading-tight">
              ₹{totalDeductions.toLocaleString('en-IN')}
            </div>
            <span className="text-[10.5px] text-slate-500">PF, PT, TDS & LOP withheld</span>
          </div>
        </div>

        {/* Workforce on Payroll */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 px-3.5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Building2 size={16} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Active Payees</span>
            <div className="text-lg font-extrabold text-purple-700 dark:text-purple-400 leading-tight">
              {employees.length} Members
            </div>
            <span className="text-[10.5px] text-green-600 font-semibold">100% active database</span>
          </div>
        </div>
      </div>

      {/* Salary List Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Search & Filter Bar */}
        <div className="p-2.5 px-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-full sm:w-60 min-w-0 flex-1 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition-colors">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search employee, ID or role..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent outline-none text-xs w-full text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="px-2 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer w-full sm:w-auto"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        </div>

        {/* Mobile Swipe Hint */}
        <div className="xl:hidden px-3.5 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <span>👉 Swipe horizontally for Attendance, Deductions & Net In-Hand</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">
                <th className="p-2 px-2.5">Employee</th>
                <th className="p-2 px-2.5">Designation & Dept</th>
                <th className="p-2 px-2.5">Agreed In-Hand Salary</th>
                <th className="p-2 px-2.5">Attendance & Paid Days</th>
                <th className="p-2 px-2.5">LOP Deductions</th>
                <th className="p-2 px-2.5">Net Payable In-Hand</th>
                <th className="p-2 px-2.5 text-center">Status</th>
                <th className="p-2 px-2.5 text-right">Compensation Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => {
                const p = computeEmployeePayroll(emp);
                const s = resolveEmployeeSalary(emp);

                const hasRevision = s.lastRevisionPercentage !== undefined && s.lastRevisionPercentage !== null;
                const isPositiveHike = hasRevision ? s.lastRevisionPercentage > 0 : (s.lastHikePercentage ? true : false);
                const revisionPercent = hasRevision ? Math.abs(s.lastRevisionPercentage) : (s.lastHikePercentage || null);

                return (
                  <tr
                    key={emp._id || emp.employeeCode}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Employee info */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <img
                          src={emp.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(emp.name)}`}
                          alt={emp.name}
                          className="w-[26px] h-[26px] rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-tight">{emp.name}</div>
                          <div className="flex items-center gap-1 mt-[1px]">
                            <span className="text-[10.5px] text-slate-500">{emp.employeeCode}</span>
                            {revisionPercent && (
                              <span className={`inline-flex items-center gap-0.5 text-[9.5px] font-extrabold px-1 py-[1px] rounded border ${
                                isPositiveHike
                                  ? 'text-green-700 bg-green-100 border-green-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'text-red-700 bg-red-100 border-red-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
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
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{emp.role}</div>
                      <div className="text-[10.5px] text-slate-500">{emp.department}</div>
                    </td>

                    {/* Agreed Monthly In-Hand */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                        ₹{p.monthlyGross.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ₹{p.dailyRate.toLocaleString('en-IN')}/day
                      </div>
                    </td>

                    {/* Attendance & Paid Days */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {p.paidDays} / {p.daysInMonth} Days
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded font-semibold border border-emerald-200 dark:border-emerald-800">
                          {p.presentDays}P
                        </span>
                        {p.halfDays > 0 && (
                          <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-semibold border border-amber-200 dark:border-amber-800">
                            {p.halfDays}HD
                          </span>
                        )}
                        {p.absentDays > 0 && (
                          <span className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-1 py-0.5 rounded font-semibold border border-rose-200 dark:border-rose-800">
                            {p.absentDays}A
                          </span>
                        )}
                        {p.unpaidLeaveDays > 0 && (
                          <span className="text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-1 py-0.5 rounded font-semibold border border-purple-200 dark:border-purple-800">
                            {p.unpaidLeaveDays} LOP
                          </span>
                        )}
                      </div>
                    </td>

                    {/* LOP Deductions */}
                    <td className="py-[7px] px-2.5 whitespace-nowrap">
                      {p.totalLopDeduction > 0 ? (
                        <div>
                          <div className="text-red-700 dark:text-rose-400 font-bold text-xs">
                            -₹{p.totalLopDeduction.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-amber-600 dark:text-amber-400">
                            {p.totalLopDays}d LOP ({p.absentDays} absent, {p.halfDays} half-day)
                          </div>
                        </div>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          ₹0 (Full Attendance)
                        </span>
                      )}
                    </td>

                    {/* Net Pay */}
                    <td className="py-[7px] px-2.5 font-extrabold text-green-700 dark:text-emerald-400 text-[13px] whitespace-nowrap">
                      ₹{p.netSalary.toLocaleString('en-IN')}
                    </td>

                    {/* Status */}
                    <td className="py-[7px] px-2.5 text-center whitespace-nowrap">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isCurrentMonthDisbursed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      }`}>
                        {isCurrentMonthDisbursed ? '✓ Disbursed' : '⏳ Pending'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-[7px] px-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-[5px]">
                        {/* Revise Salary Button */}
                        {canManageSalaries && (
                          <button
                            onClick={() => handleOpenRevisionModal(emp)}
                            className="inline-flex items-center gap-[3px] px-2 py-[3px] rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 text-[11px] font-bold cursor-pointer h-6 transition-colors"
                            title="Edit Salary (Hike / Increase or Deduct / Decrease)"
                          >
                            <SlidersHorizontal size={11} className="text-blue-600 dark:text-blue-400" />
                            <span>Edit Salary</span>
                          </button>
                        )}

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
        salaryData={activeEmployeeForPayslip ? resolveEmployeeSalary(activeEmployeeForPayslip) : null}
        attendance={attendance}
        leaves={leaves}
        holidays={holidays}
      />

      {/* Salary Revision & Compensation Modal */}
      <SalaryIncrementModal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        employee={activeEmployeeForRevision}
        currentSalaryData={activeEmployeeForRevision ? resolveEmployeeSalary(activeEmployeeForRevision) : null}
        onSalaryUpdated={handleSalaryUpdated}
      />
    </div>
  );
};
