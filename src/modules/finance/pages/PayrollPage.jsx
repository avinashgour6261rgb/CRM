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

export const PayrollPage = () => {
  const { employees, currentUser, updateEmployee, attendance, leaves } = useHR();
  const { currentUser: authUser, isHRorAdmin: isAuthHRorAdmin } = useAuth();
  const { addToast } = useToast();

  const effectiveUser = currentUser || authUser;
  const isPrivileged = isAuthHRorAdmin || isHRorAdmin(effectiveUser) || effectiveUser?.isDelegatedAdmin || canAccessModule(effectiveUser, 'payroll') || canAccessModule(effectiveUser, 'finance');
  const canManageSalaries = useMemo(() => canManagePayroll(effectiveUser), [effectiveUser]);
  const canExport = useMemo(() => canExportData(effectiveUser, 'payroll') || isHRorAdmin(effectiveUser), [effectiveUser]);

  const [selectedMonth, setSelectedMonth] = useState('October 2026');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [activeEmployeeForPayslip, setActiveEmployeeForPayslip] = useState(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  const [activeEmployeeForRevision, setActiveEmployeeForRevision] = useState(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  // Track batch disbursed months
  const [disbursedMonths, setDisbursedMonths] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('EMS_DISBURSED_PAYROLLS') || '["September 2026", "August 2026"]');
    } catch (_) {
      return ['September 2026', 'August 2026'];
    }
  });

  const isCurrentMonthDisbursed = disbursedMonths.includes(selectedMonth);

  // Helper to resolve an employee's live salary from DB/record or standard statutory structure
  const resolveEmployeeSalary = (emp) => {
    if (!emp) {
      return {
        basic: 45000,
        hra: 18000,
        allowances: 12000,
        bonus: 0,
        pf: 1800,
        pt: 200,
        tds: 0,
        monthlyGross: 75000,
        netSalary: 73000,
        annualCTC: 900000
      };
    }

    // 1. Employee document in DB has salary structure
    if (emp.salary && (emp.salary.basic !== undefined || emp.salary.monthlyGross !== undefined)) {
      const s = emp.salary;
      const gross = Number(s.monthlyGross) || Number(s.basic) || (Number(emp.startingSalary) || 45000);
      const basic = s.basic || Math.round(gross * 0.5);
      const hra = s.hra || Math.round(basic * 0.4);
      const allowances = s.allowances || Math.max(0, gross - basic - hra);
      const bonus = s.bonus || 0;
      const pf = s.pf !== undefined ? s.pf : Math.min(1800, Math.round(basic * 0.12));
      const pt = s.pt !== undefined ? s.pt : (gross > 15000 ? 200 : 0);
      const tds = s.tds !== undefined ? s.tds : (gross > 50000 ? Math.round((gross - 50000) * 0.05) : 0);
      const deductions = pf + pt + tds;
      return {
        ...s,
        basic,
        hra,
        allowances,
        bonus,
        pf,
        pt,
        tds,
        monthlyGross: gross,
        netSalary: Math.max(0, gross - deductions),
        annualCTC: gross * 12
      };
    }

    // 2. Fallback to startingSalary or annualCTC configured on employee
    const gross = Number(emp.startingSalary) || (emp.annualCTC ? Math.round(Number(emp.annualCTC) / 12) : 45000);
    const basic = Math.round(gross * 0.5);
    const hra = Math.round(basic * 0.4);
    const allowances = Math.max(0, gross - basic - hra);
    const pf = Math.min(1800, Math.round(basic * 0.12));
    const pt = gross > 15000 ? 200 : 0;
    const tds = gross > 50000 ? Math.round((gross - 50000) * 0.05) : 0;
    const deductions = pf + pt + tds;

    return {
      basic,
      hra,
      allowances,
      bonus: 0,
      pf,
      pt,
      tds,
      monthlyGross: gross,
      netSalary: Math.max(0, gross - deductions),
      annualCTC: gross * 12
    };
  };

  // Helper to compute attendance-based Loss of Pay (LOP) for the selected month
  const computeEmployeeLOP = (emp) => {
    if (!emp || !attendance) return { unpaidDays: 0, lopAmount: 0 };
    const empId = String(emp._id || emp.employeeCode || '');
    const empCode = String(emp.employeeCode || '');

    // Get current month prefix, e.g. "2026-10"
    const monthMap = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    const parts = selectedMonth.split(' ');
    const mNum = monthMap[parts[0]] || '10';
    const yNum = parts[1] || '2026';
    const monthPrefix = `${yNum}-${mNum}`;

    // Filter unexcused absences
    const monthAbsences = (attendance || []).filter(a => {
      const aEmpId = String(a.employeeId || a.employee || '');
      const aEmpCode = String(a.employeeCode || '');
      const matchEmp = (empId && aEmpId === empId) || (empCode && aEmpCode === empCode);
      const matchMonth = a.date && a.date.startsWith(monthPrefix);
      return matchEmp && matchMonth && a.status === 'absent';
    });

    const unpaidDays = monthAbsences.length;
    const salary = resolveEmployeeSalary(emp);
    const dailyRate = Math.round(salary.monthlyGross / 30);
    const lopAmount = unpaidDays * dailyRate;

    return { unpaidDays, lopAmount };
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

  const handleDisburseAll = () => {
    if (isCurrentMonthDisbursed) {
      addToast({
        title: 'Payroll Already Disbursed',
        message: `Salaries for ${selectedMonth} have already been officially transferred to bank accounts.`,
        type: 'info'
      });
      return;
    }

    const updated = Array.from(new Set([...disbursedMonths, selectedMonth]));
    setDisbursedMonths(updated);
    try {
      localStorage.setItem('EMS_DISBURSED_PAYROLLS', JSON.stringify(updated));
    } catch (_) {}

    addToast({
      title: 'Batch Payroll Processed & Disbursed 🚀',
      message: `Direct bank salary transfer successfully executed for all employees for ${selectedMonth}.`,
      type: 'success'
    });
  };

  // =========================================================================
  // VIEW 1: REGULAR EMPLOYEE / TEAM MEMBER SELF-SERVICE PAYSLIP HUB
  // =========================================================================
  if (!isPrivileged) {
    const myEmp = effectiveUser;
    const mySalary = resolveEmployeeSalary(myEmp);
    const { unpaidDays, lopAmount } = computeEmployeeLOP(myEmp);
    const netTakeHome = Math.max(0, mySalary.netSalary - lopAmount);

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
                  Employee Self-Service
                </span>
              </div>
              <p className="mt-0.5 m-0 text-xs text-slate-500 dark:text-slate-400">
                View your monthly compensation package, tax breakdown, and download official payslips
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 h-[32px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer outline-none focus:border-blue-500 transition-colors flex-1 sm:flex-initial"
            >
              <option value="October 2026">October 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="August 2026">August 2026</option>
              <option value="July 2026">July 2026</option>
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
          {/* 1. Monthly Gross */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 px-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <DollarSign size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Monthly Gross CTC</span>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                ₹{mySalary.monthlyGross.toLocaleString('en-IN')}
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
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Net Take-Home Pay</span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                ₹{netTakeHome.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                {isCurrentMonthDisbursed ? '✓ Disbursed to Bank' : '⏳ Pending Cycle'}
              </span>
            </div>
          </div>

          {/* 3. Deductions & Taxes */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 px-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ArrowUpDown size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Deductions</span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 leading-tight">
                ₹{(mySalary.pf + mySalary.pt + mySalary.tds + lopAmount).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-500">PF, PT, TDS {lopAmount > 0 ? `& LOP (${unpaidDays}d)` : ''}</span>
            </div>
          </div>

          {/* 4. Annual CTC */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 px-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Annual Cost to Company</span>
              <div className="text-xl font-black text-purple-700 dark:text-purple-400 leading-tight">
                ₹{mySalary.annualCTC.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-500">Official Package</span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Card (Earnings vs Deductions) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Earnings Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider m-0">
                Earnings Breakdown
              </h3>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                ₹{mySalary.monthlyGross.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Basic Salary (50%)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">₹{mySalary.basic.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">House Rent Allowance (HRA - 40%)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">₹{mySalary.hra.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Special & Conveyance Allowances</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">₹{mySalary.allowances.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Performance Bonus</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">₹{(mySalary.bonus || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between pt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                <span>Total Gross Earnings</span>
                <span className="text-blue-600 dark:text-blue-400">₹{mySalary.monthlyGross.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Deductions Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider m-0">
                Statutory Deductions & Taxes
              </h3>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                ₹{(mySalary.pf + mySalary.pt + mySalary.tds + lopAmount).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Provident Fund (Employee PF 12%)</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">-₹{mySalary.pf.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Professional Tax (PT)</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">-₹{mySalary.pt.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">TDS / Income Tax Withheld</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">-₹{mySalary.tds.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Loss of Pay (LOP: {unpaidDays} Days)</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {lopAmount > 0 ? `-₹${lopAmount.toLocaleString('en-IN')}` : '₹0'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                <span>Net Payable to Bank</span>
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
          salaryData={mySalary}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ADMIN & HR ENTERPRISE PAYROLL MATRIX & COMPENSATION HUB
  // =========================================================================
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

  const handleExportPayroll = () => {
    if (!filteredEmployees || filteredEmployees.length === 0) {
      alert('No employee payroll records to export');
      return;
    }
    const headers = ['Employee Code', 'Name', 'Department', 'Designation', 'Gross Salary', 'Deductions', 'Net Pay', 'Status'];
    const rows = filteredEmployees.map(emp => {
      const s = resolveEmployeeSalary(emp);
      const gross = s.monthlyGross || 0;
      const deductions = (s.pf || 0) + (s.pt || 0) + (s.tds || 0);
      const net = Math.max(0, gross - deductions);
      return [
        `"${emp.employeeCode || ''}"`,
        `"${emp.name || ''}"`,
        `"${emp.department || ''}"`,
        `"${emp.designation || emp.role || ''}"`,
        gross,
        deductions,
        net,
        `"${isCurrentMonthDisbursed ? 'Disbursed' : 'Pending'}"`
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payroll_${selectedMonth.replace(/\s+/g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate live company-wide totals directly from employees
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNetPay = 0;

  employees.forEach(emp => {
    const s = resolveEmployeeSalary(emp);
    const { lopAmount } = computeEmployeeLOP(emp);
    const gross = s.monthlyGross;
    const deductions = s.pf + s.pt + s.tds + lopAmount;
    const net = Math.max(0, gross - deductions);

    totalGross += gross;
    totalDeductions += deductions;
    totalNetPay += net;
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
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ✓ Disbursed
                </span>
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
            <option value="October 2026">October 2026</option>
            <option value="September 2026">September 2026</option>
            <option value="August 2026">August 2026</option>
            <option value="July 2026">July 2026</option>
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
          <span>👉 Swipe horizontally for Basic, Allowances, Deductions & Actions</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">
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
                const s = resolveEmployeeSalary(emp);
                const { unpaidDays, lopAmount } = computeEmployeeLOP(emp);
                const gross = s.monthlyGross;
                const deductions = s.pf + s.pt + s.tds + lopAmount;
                const net = Math.max(0, gross - deductions);

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

                    {/* Gross CTC */}
                    <td className="py-[7px] px-2.5 font-extrabold text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">
                      ₹{gross.toLocaleString('en-IN')}
                    </td>

                    {/* Basic */}
                    <td className="py-[7px] px-2.5 font-semibold text-slate-700 dark:text-slate-300 text-[11.5px] whitespace-nowrap">
                      ₹{s.basic.toLocaleString('en-IN')}
                    </td>

                    {/* HRA & Allowances */}
                    <td className="py-[7px] px-2.5 text-green-600 dark:text-emerald-400 text-[11.5px] whitespace-nowrap">
                      +₹{(s.hra + s.allowances + (s.bonus || 0)).toLocaleString('en-IN')}
                    </td>

                    {/* Deductions */}
                    <td className="py-[7px] px-2.5 text-red-700 dark:text-rose-400 font-semibold text-[11.5px] whitespace-nowrap">
                      -₹{deductions.toLocaleString('en-IN')}
                      {lopAmount > 0 && (
                        <span className="text-[9.5px] block text-amber-600 font-normal">
                          (LOP: {unpaidDays}d)
                        </span>
                      )}
                    </td>

                    {/* Net Pay */}
                    <td className="py-[7px] px-2.5 font-extrabold text-green-700 dark:text-emerald-400 text-[12.5px] whitespace-nowrap">
                      ₹{net.toLocaleString('en-IN')}
                    </td>

                    {/* Actions */}
                    <td className="py-[7px] px-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-[5px]">
                        
                        {/* Revise Salary Button */}
                        {canManageSalaries && (
                          <button
                            onClick={() => handleOpenRevisionModal(emp)}
                            className="inline-flex items-center gap-[3px] px-2 py-[3px] rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 text-[11px] font-bold cursor-pointer h-6 transition-colors"
                            title="Hike (Increase) or Deduct (Decrease) Employee Salary"
                          >
                            <ArrowUpDown size={11} className="text-blue-600 dark:text-blue-400" />
                            <span>Revise</span>
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
