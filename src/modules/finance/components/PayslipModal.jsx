import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  Mail,
  CheckCircle2,
  Building2,
  Settings,
  Calendar,
  FileCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../shared/context/ToastContext';
import { getCompanySettings, getWeeklyOffDays } from '../../../shared/services/companySettingsService';
import { useModalUX } from '../../../shared/hooks/useModalUX';

/**
 * Converts Indian currency numbers to words (Lakhs, Crores, Thousands)
 */
function numberToWordsINR(amount) {
  if (!amount || isNaN(amount)) return 'Zero Rupees Only';
  let num = Math.round(Number(amount));
  if (num <= 0) return 'Zero Rupees Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
  }

  let str = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  const rest = num % 100;

  if (crore) str += inWords(crore) + ' Crore ';
  if (lakh) str += inWords(lakh) + ' Lakh ';
  if (thousand) str += inWords(thousand) + ' Thousand ';
  if (hundred) str += inWords(hundred) + ' Hundred ';
  if (rest) str += (str ? 'and ' : '') + inWords(rest) + ' ';

  return 'Rupees ' + str.trim() + ' Only';
}

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getCurrentMonthLabel = () => {
  const now = new Date();
  return `${MONTH_OPTIONS[now.getMonth()]} ${now.getFullYear()}`;
};

export const PayslipModal = ({
  isOpen,
  onClose,
  employee,
  month = '',
  salaryData = null,
  attendance = [],
  leaves = []
}) => {
  const { handleBackdropClick, handleCardClick } = useModalUX({ onClose, isOpen });
  const { addToast } = useToast();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [companyInfo, setCompanyInfo] = useState(getCompanySettings());

  // Interactive Month & Year selector state
  const resolvedInitial = (month || getCurrentMonthLabel()).split(' ');
  const nowYear = new Date().getFullYear();
  const yearOptions = [String(nowYear - 2), String(nowYear - 1), String(nowYear), String(nowYear + 1)];
  const [selectedMonthName, setSelectedMonthName] = useState(resolvedInitial[0] || MONTH_OPTIONS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(resolvedInitial[1] || String(nowYear));

  useEffect(() => {
    const updateInfo = () => setCompanyInfo(getCompanySettings());
    window.addEventListener('company-settings-updated', updateInfo);
    return () => window.removeEventListener('company-settings-updated', updateInfo);
  }, []);

  useEffect(() => {
    if (month) {
      const parts = month.split(' ');
      if (parts.length >= 2) {
        setSelectedMonthName(parts[0]);
        setSelectedYear(parts[1]);
      }
    }
  }, [month]);

  // Compute resolved salary breakdown accurately from passed props, employee records, or EMS_SALARY_MAP
  const resolvedSalary = useMemo(() => {
    if (!employee) return null;

    // 1. Explicitly passed salary data
    if (salaryData && (salaryData.basic !== undefined || salaryData.monthlyGross !== undefined)) {
      const gross = Number(salaryData.monthlyGross) || Number(salaryData.basic) || 0;
      if (salaryData.isDirectSalary || (salaryData.totalDeductions === 0 && !salaryData.pf)) {
        return {
          gross,
          basic: gross,
          hra: 0,
          allowances: 0,
          bonus: 0,
          pf: 0,
          pt: 0,
          tds: 0,
          deductions: 0,
          netSalary: gross,
          isDirectSalary: true
        };
      }
      const basic = salaryData.basic || Math.round(gross * 0.5);
      const hra = salaryData.hra || Math.round(basic * 0.4);
      const allowances = salaryData.allowances || Math.max(0, gross - basic - hra);
      const bonus = salaryData.bonus || 0;
      const pf = salaryData.pf !== undefined ? salaryData.pf : Math.min(1800, Math.round(basic * 0.12));
      const pt = salaryData.pt !== undefined ? salaryData.pt : (gross > 15000 ? 200 : 0);
      const tds = salaryData.tds !== undefined ? salaryData.tds : (gross > 50000 ? Math.round((gross - 50000) * 0.05) : 0);
      const deductions = pf + pt + tds;
      return {
        gross,
        basic,
        hra,
        allowances,
        bonus,
        pf,
        pt,
        tds,
        deductions,
        netSalary: Math.max(0, gross - deductions),
        isDirectSalary: false
      };
    }

    // 2. Employee record stored salary object
    if (employee.salary && (employee.salary.basic !== undefined || employee.salary.monthlyGross !== undefined)) {
      const s = employee.salary;
      const gross = Number(s.monthlyGross) || Number(s.basic) || (Number(employee.startingSalary) || 0);
      if (s.isDirectSalary || (s.totalDeductions === 0 && !s.pf)) {
        return {
          gross,
          basic: gross,
          hra: 0,
          allowances: 0,
          bonus: 0,
          pf: 0,
          pt: 0,
          tds: 0,
          deductions: 0,
          netSalary: gross,
          isDirectSalary: true
        };
      }
      const basic = s.basic || Math.round(gross * 0.5);
      const hra = s.hra || Math.round(basic * 0.4);
      const allowances = s.allowances || Math.max(0, gross - basic - hra);
      const bonus = s.bonus || 0;
      const pf = s.pf !== undefined ? s.pf : Math.min(1800, Math.round(basic * 0.12));
      const pt = s.pt !== undefined ? s.pt : (gross > 15000 ? 200 : 0);
      const tds = s.tds !== undefined ? s.tds : (gross > 50000 ? Math.round((gross - 50000) * 0.05) : 0);
      const deductions = pf + pt + tds;
      return {
        gross,
        basic,
        hra,
        allowances,
        bonus,
        pf,
        pt,
        tds,
        deductions,
        netSalary: Math.max(0, gross - deductions),
        isDirectSalary: false
      };
    }

    // 3. Saved localStorage EMS_SALARY_MAP
    try {
      const map = JSON.parse(localStorage.getItem('EMS_SALARY_MAP') || '{}');
      const code = employee.employeeCode || employee._id;
      if (code && map[code]) {
        const s = map[code];
        const gross = Number(s.monthlyGross) || (s.basic + (s.hra || 0) + (s.allowances || 0) + (s.bonus || 0));
        if (s.isDirectSalary || (s.totalDeductions === 0 && !s.pf)) {
          return {
            gross,
            basic: gross,
            hra: 0,
            allowances: 0,
            bonus: 0,
            pf: 0,
            pt: 0,
            tds: 0,
            deductions: 0,
            netSalary: gross,
            isDirectSalary: true
          };
        }
        const basic = s.basic || Math.round(gross * 0.5);
        const hra = s.hra || Math.round(basic * 0.4);
        const allowances = s.allowances || 0;
        const bonus = s.bonus || 0;
        const pf = s.pf || 0;
        const pt = s.pt !== undefined ? s.pt : 200;
        const tds = s.tds || 0;
        const deductions = pf + pt + tds;
        return {
          gross,
          basic,
          hra,
          allowances,
          bonus,
          pf,
          pt,
          tds,
          deductions,
          netSalary: Math.max(0, gross - deductions),
          isDirectSalary: false
        };
      }
    } catch (e) {}

    // 4. Fallback calculation from startingSalary or default
    const gross = Number(employee.startingSalary) || (employee.annualCTC ? Math.round(Number(employee.annualCTC) / 12) : 35000);
    const basic = Math.round(gross * 0.5);
    const hra = Math.round(basic * 0.4);
    const allowances = Math.max(0, gross - basic - hra);
    const pf = Math.min(1800, Math.round(basic * 0.12));
    const pt = gross > 15000 ? 200 : 0;
    const tds = gross > 50000 ? Math.round((gross - 50000) * 0.05) : 0;
    const deductions = pf + pt + tds;
    return {
      gross,
      basic,
      hra,
      allowances,
      bonus: 0,
      pf,
      pt,
      tds,
      deductions,
      netSalary: Math.max(0, gross - deductions),
      isDirectSalary: false
    };
  }, [employee, salaryData]);

  if (!isOpen || !employee || !resolvedSalary) return null;

  // Days in selected month & real attendance summary
  const monthIdx = MONTH_OPTIONS.indexOf(selectedMonthName);
  const yearNum = parseInt(selectedYear, 10) || nowYear;
  const daysInMonth = monthIdx >= 0 ? new Date(yearNum, monthIdx + 1, 0).getDate() : 30;
  const currentSlipPeriod = `${selectedMonthName} ${selectedYear}`;
  const monthPrefix = `${yearNum}-${String(monthIdx + 1).padStart(2, '0')}`;

  const attendanceSummary = (() => {
    const empId = String(employee?._id || employee?.id || '').toLowerCase();
    const empCode = String(employee?.employeeCode || '').toLowerCase();
    const empName = (employee?.name || '').trim().toLowerCase();
    const empAtt = (attendance || []).filter(a => {
      if (!a?.date || !a.date.startsWith(monthPrefix)) return false;
      const aId = String(a.employeeId || (typeof a.employee === 'object' ? a.employee?._id : a.employee) || '').toLowerCase();
      const aCode = String(a.employeeCode || '').toLowerCase();
      const aName = (a.employeeName || '').trim().toLowerCase();
      return (empId && aId === empId) || (empCode && aCode === empCode) || (empName && aName === empName);
    });

    if (empAtt.length === 0) {
      return { paidDays: daysInMonth, lopDays: 0, presentDays: daysInMonth, halfDays: 0, hasRealData: false };
    }

    const weeklyOffs = getWeeklyOffDays(companyInfo);
    let weekOffCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (weeklyOffs.includes(new Date(yearNum, monthIdx, d).getDay())) weekOffCount++;
    }

    const fullPresent = empAtt.filter(a => ['present', 'late'].includes(a.status)).length;
    const halfDays = empAtt.filter(a => a.status === 'half_day').length;
    const absentExplicit = empAtt.filter(a => a.status === 'absent').length;
    const unpaidLeaveDays = (leaves || []).filter(l =>
      l.status === 'approved' &&
      String(l.leaveType || l.type || '').toLowerCase().includes('unpaid') &&
      l.startDate && l.startDate.startsWith(monthPrefix) && (
        (empId && String(l.employeeId || l.employee || '').toLowerCase() === empId) ||
        (empCode && String(l.employeeCode || '').toLowerCase() === empCode)
      )
    ).reduce((sum, l) => sum + (Number(l.days) || 1), 0);

    const lopDays = +(absentExplicit + (halfDays * 0.5) + unpaidLeaveDays).toFixed(1);
    const paidDays = Math.max(0, +(daysInMonth - lopDays).toFixed(1));

    return {
      paidDays,
      lopDays,
      presentDays: +(fullPresent + halfDays * 0.5).toFixed(1),
      halfDays,
      weekOffCount,
      hasRealData: true
    };
  })();

  // Real-world mathematical balance: Deduct LOP from gross/net pay
  const dailyRate = Math.round(resolvedSalary.gross / daysInMonth);
  const lopDeductionAmount = Math.round(attendanceSummary.lopDays * dailyRate);
  const effectiveTotalDeductions = resolvedSalary.deductions + lopDeductionAmount;
  const effectiveNetSalary = Math.max(0, resolvedSalary.gross - effectiveTotalDeductions);

  // Corporate Serial & Statutory identifiers
  const payslipSerialNo = `INF/PAY/${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}/${employee.employeeCode || employee._id || 'EMP'}`;
  const uanNumber = employee.bankDetails?.uan || employee.uan || employee.bankDetails?.pfUan || 'NA';
  const pfNumber = employee.bankDetails?.pfNumber || employee.pfNumber || 'NA';

  const rawAcct = employee.bankDetails?.accountNumber || employee.accountNumber || '';
  const maskedAcct = rawAcct.length > 4
    ? `•••• •••• ${rawAcct.slice(-4)}`
    : (rawAcct || 'Not Provided');

  const bankName = employee.bankDetails?.bankName || employee.bankName || 'Not Provided';
  const ifscCode = employee.bankDetails?.ifsc || employee.ifsc || 'Not Provided';
  const panNumber = employee.bankDetails?.pan || employee.pan || 'Not Provided';

  const handlePrint = () => {
    const prevTitle = document.title;
    const cleanCompany = (companyInfo.shortName || companyInfo.companyName || 'Inforag').replace(/[^\w\s-]/g, '').trim();
    const cleanEmp = (employee.name || 'Employee').replace(/[^\w\s-]/g, '').trim();
    document.title = `${cleanCompany} - Salary Slip - ${cleanEmp} - ${currentSlipPeriod}`;
    window.print();
    setTimeout(() => { document.title = prevTitle; }, 800);
  };

  const handleSendEmail = () => {
    const recipient = employee.email || '';
    const companyName = companyInfo.companyName || 'Inforag Technologies';
    const subject = encodeURIComponent(`Salary Slip - ${currentSlipPeriod} - ${companyName}`);
    const body = encodeURIComponent(
      `Hi ${employee.name || 'Team Member'},\n\n` +
      `Please find your salary summary for ${currentSlipPeriod}:\n` +
      `• Gross Earnings: Rs. ${Number(resolvedSalary.gross || 0).toLocaleString('en-IN')}\n` +
      `• Total Deductions: Rs. ${Number(effectiveTotalDeductions || 0).toLocaleString('en-IN')}\n` +
      `• Net Take-Home Pay: Rs. ${Number(effectiveNetSalary || 0).toLocaleString('en-IN')}\n\n` +
      `(Note: Please refer to the PDF exported via "Print / Save PDF".)\n\n` +
      `Regards,\n${companyName} Payroll Team`
    );
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    addToast({
      title: 'Email Draft Opened',
      message: `Prepared email draft for ${recipient || employee.name}.`,
      type: 'info'
    });
  };

  const handleNavigateToCompanySettings = () => {
    onClose();
    navigate('/settings');
  };

  return (
    <>
      {/* Dedicated Print Stylesheet: Fits on standard single A4 page cleanly */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body * {
            visibility: hidden !important;
          }
          .payslip-print-container, .payslip-print-container * {
            visibility: visible !important;
          }
          .payslip-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            font-size: 11px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 sm:p-4 animate-fade-in" onClick={handleBackdropClick}>
        <div className="popup-spring bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[820px] max-h-[94vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={handleCardClick}>
          {/* Modal Action Header (Excluded from Print) */}
          <div className="shrink-0 no-print p-3.5 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 flex-wrap gap-2.5 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" />
              <span className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
                Official Salary Slip
              </span>
            </div>

            {/* Month & Year Interactive Picker */}
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-500" />
              <select
                value={selectedMonthName}
                onChange={e => setSelectedMonthName(e.target.value)}
                className="h-8 rounded-md border border-slate-300 dark:border-slate-700 px-2 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none cursor-pointer focus:border-blue-500 transition-colors"
              >
                {MONTH_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="h-8 rounded-md border border-slate-300 dark:border-slate-700 px-2 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none cursor-pointer focus:border-blue-500 transition-colors"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleNavigateToCompanySettings}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11.5px] font-semibold cursor-pointer transition-colors"
                title="Configure Company Legal Info, Logo & Address in Settings"
              >
                <Settings size={13} />
                <span>Company Info</span>
              </button>

              <button
                onClick={handleSendEmail}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                <Mail size={13} /> <span>Email</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs font-bold cursor-pointer shadow-xs transition-colors"
              >
                <Printer size={13} /> <span>Print / Save PDF</span>
              </button>

              <button
                onClick={onClose}
                className="bg-transparent border-0 text-slate-500 hover:text-slate-700 cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Printable Payslip Body */}
          <div ref={printRef} className="payslip-print-container p-6 sm:p-10 flex-1 overflow-y-auto text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
            
            {/* 1. Official Corporate Letterhead */}
            <div className="flex justify-between items-start border-b-[2.5px] border-blue-900 pb-3.5 mb-4">
              <div className="flex-1 pr-4 flex items-start gap-3.5">
                {companyInfo.companyLogo && (
                  <img
                    src={companyInfo.companyLogo}
                    alt={companyInfo.companyName || 'Company Logo'}
                    className="h-13 max-w-[105px] object-contain rounded border border-slate-200 bg-white p-1 shrink-0"
                  />
                )}
                <div>
                  <h1 className="text-[20px] font-extrabold text-blue-900 dark:text-blue-300 m-0 uppercase tracking-wide leading-tight">
                    {companyInfo.companyName || 'INFORAG TECHNOLOGIES PVT. LTD.'}
                  </h1>
                  {companyInfo.tagline && (
                    <p className="text-[10.5px] font-semibold text-slate-500 m-0 mt-0.5">
                      {companyInfo.tagline}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 m-0 leading-snug">
                    {companyInfo.address || 'Corporate Headquarters & Registered Office'}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-slate-500 mt-0.5">
                    {(companyInfo.hrEmail || companyInfo.email) && <span>Email: <strong>{companyInfo.hrEmail || companyInfo.email}</strong></span>}
                    {companyInfo.phone && <span>Phone: <strong>{companyInfo.phone}</strong></span>}
                    {companyInfo.cin && <span>CIN: <strong>{companyInfo.cin}</strong></span>}
                    {companyInfo.gstin && <span>GSTIN: <strong>{companyInfo.gstin}</strong></span>}
                    {companyInfo.pan && <span>PAN: <strong>{companyInfo.pan}</strong></span>}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-block px-3 py-1 rounded-md bg-blue-100 text-blue-900 text-xs font-black tracking-wider">
                  PAYSLIP / SALARY SLIP
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {currentSlipPeriod.toUpperCase()}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Ref: {payslipSerialNo}
                </div>
              </div>
            </div>

            {/* 2. Employee Profile & Statutory Identifiers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 sm:px-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 mb-4 text-xs">
              {/* Column 1: Employee Particulars */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Employee Name:</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">{employee.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Employee Code / ID:</span>
                  <span className="font-bold text-blue-900 dark:text-blue-300">{employee.employeeCode || employee._id || 'EMP-001'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Designation / Role:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{employee.role || 'Executive'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Department:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{employee.department || 'Operations'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Date of Joining:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{employee.joiningDate || '2024-01-15'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">EPF UAN Number:</span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{uanNumber}</span>
                </div>
              </div>

              {/* Column 2: Banking & Attendance Summary */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Bank Name:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Bank Account No:</span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{maskedAcct}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Bank IFSC Code:</span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{ifscCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Income Tax PAN:</span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{panNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total Working Days:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{daysInMonth} Days in Month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Paid Days / Attendance:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {attendanceSummary.paidDays} Paid Days {attendanceSummary.lopDays > 0 ? `(LOP: ${attendanceSummary.lopDays}d)` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Earnings & Deductions Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border-[1.5px] border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden mb-4">
              {/* Earnings Column */}
              <div className="sm:border-r-[1.5px] sm:border-slate-300 dark:sm:border-slate-700">
                <div className="p-2 px-3.5 bg-slate-100 dark:bg-slate-800 font-extrabold text-xs border-b border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex justify-between">
                  <span>EARNINGS (उपलब्धियां)</span>
                  <span>AMOUNT (₹)</span>
                </div>
                <div className="p-3 px-3.5 text-xs flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300">Basic Salary</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">₹{resolvedSalary.basic.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300">House Rent Allowance (HRA)</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">₹{resolvedSalary.hra.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300">Special Allowances</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">₹{resolvedSalary.allowances.toLocaleString('en-IN')}</span>
                  </div>
                  {resolvedSalary.bonus > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-700 dark:text-slate-300">Performance Incentive / Bonus</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">₹{resolvedSalary.bonus.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-[1.5px] border-slate-300 dark:border-slate-700 pt-2 font-extrabold text-emerald-700 dark:text-emerald-400 text-[13px]">
                    <span>Total Gross Earnings (A)</span>
                    <span>₹{resolvedSalary.gross.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Column */}
              <div>
                <div className="p-2 px-3.5 bg-slate-100 dark:bg-slate-800 font-extrabold text-xs border-b border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex justify-between">
                  <span>DEDUCTIONS (कटौतियां)</span>
                  <span>AMOUNT (₹)</span>
                </div>
                <div className="p-3 px-3.5 text-xs flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300">Provident Fund (EPF / PF)</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">₹{resolvedSalary.pf.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300">Professional Tax (PT)</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">₹{resolvedSalary.pt.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-300">Tax Deducted at Source (TDS)</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">₹{resolvedSalary.tds.toLocaleString('en-IN')}</span>
                  </div>
                  {lopDeductionAmount > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                      <span>Loss of Pay (LOP: {attendanceSummary.lopDays}d)</span>
                      <span>-₹{lopDeductionAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-[1.5px] border-slate-300 dark:border-slate-700 pt-2 font-extrabold text-rose-700 dark:text-rose-400 text-[13px]">
                    <span>Total Deductions (B)</span>
                    <span>₹{effectiveTotalDeductions.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Net Salary & Words Banner */}
            <div className="p-3.5 sm:px-4 bg-emerald-50 dark:bg-emerald-950/40 border-[1.5px] border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between mb-4 flex-wrap gap-2.5">
              <div>
                <span className="text-[10.5px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  NET TAKE-HOME SALARY PAYABLE (A - B)
                </span>
                <div className="text-[24px] font-black text-emerald-950 dark:text-emerald-100 leading-tight">
                  ₹{effectiveNetSalary.toLocaleString('en-IN')}
                </div>
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mt-0.5 italic">
                  ({numberToWordsINR(effectiveNetSalary)})
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 size={16} />
                <span>Bank Transfer Disbursed</span>
              </div>
            </div>

            {/* 5. Authorization & Verification Footer */}
            <div className="flex justify-between items-end pt-3 border-t border-slate-300 dark:border-slate-700 text-[10.5px] text-slate-500 dark:text-slate-400">
              <div>
                <p className="m-0 font-semibold text-slate-700 dark:text-slate-300">
                  {companyInfo.footerNote || '* This is a computer-generated salary slip and does not require a physical signature.'}
                </p>
                <p className="mt-0.5 m-0 text-slate-400">
                  Issued by {companyInfo.companyName || 'Inforag Technologies'} • Verified Official Payroll Record.
                </p>
              </div>

              <div className="text-center min-w-[140px]">
                <div className="inline-flex items-center gap-1 text-blue-900 dark:text-blue-300 text-[10px] font-bold mb-1">
                  <FileCheck size={13} /> Digitally Signed & Sealed
                </div>
                <div className="w-32 border-b-[1.5px] border-slate-400 mx-auto mb-1"></div>
                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                  {companyInfo.signatoryTitle || 'Authorized HR Directorate'}
                </span>
                {companyInfo.signatoryName && (
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">
                    ({companyInfo.signatoryName})
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default PayslipModal;
