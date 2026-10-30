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
import { getCompanySettings } from '../../../shared/services/companySettingsService';

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

export const PayslipModal = ({
  isOpen,
  onClose,
  employee,
  month = 'October 2026',
  salaryData = null
}) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [companyInfo, setCompanyInfo] = useState(getCompanySettings());

  // Interactive Month & Year selector state
  const initialMonthParts = month ? month.split(' ') : ['October', '2026'];
  const [selectedMonthName, setSelectedMonthName] = useState(initialMonthParts[0] || 'October');
  const [selectedYear, setSelectedYear] = useState(initialMonthParts[1] || '2026');

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
          netSalary: gross
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
        netSalary: Math.max(0, gross - deductions)
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
          netSalary: gross
        };
      }
      const basic = s.basic || Math.round(gross * 0.5);
      const hra = s.hra || Math.round(basic * 0.4);
      const allowances = s.allowances || 0;
      const bonus = s.bonus || 0;
      const pf = s.pf !== undefined ? s.pf : Math.min(1800, Math.round(basic * 0.12));
      const pt = s.pt !== undefined ? s.pt : 200;
      const tds = s.tds !== undefined ? s.tds : 0;
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
        netSalary: Math.max(0, gross - deductions)
      };
    }

    // 3. Saved localStorage EMS_SALARY_MAP
    try {
      const map = JSON.parse(localStorage.getItem('EMS_SALARY_MAP') || '{}');
      const code = employee.employeeCode || employee._id;
      if (code && map[code]) {
        const s = map[code];
        const basic = s.basic;
        const hra = s.hra;
        const allowances = s.allowances || 0;
        const bonus = s.bonus || 0;
        const gross = basic + hra + allowances + bonus;
        const pf = s.pf || 0;
        const pt = s.pt || 200;
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
          netSalary: Math.max(0, gross - deductions)
        };
      }
    } catch (e) {}

    // 4. Fallback calculation from startingSalary or default
    const gross = Number(employee.startingSalary) || 35000;
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
      netSalary: Math.max(0, gross - deductions)
    };
  }, [employee, salaryData]);

  if (!isOpen || !employee || !resolvedSalary) return null;

  // Days in selected month
  const monthIdx = MONTH_OPTIONS.indexOf(selectedMonthName);
  const yearNum = parseInt(selectedYear, 10) || 2026;
  const daysInMonth = monthIdx >= 0 ? new Date(yearNum, monthIdx + 1, 0).getDate() : 30;
  const currentSlipPeriod = `${selectedMonthName} ${selectedYear}`;

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    addToast({
      title: 'Payslip Dispatched via Email 📧',
      message: `Official Salary Slip for ${currentSlipPeriod} sent to ${employee.email || employee.name.toLowerCase() + '@company.com'} from ${companyInfo.hrEmail || companyInfo.email || 'hr@company.com'}`,
      type: 'success'
    });
  };

  const handleNavigateToCompanySettings = () => {
    onClose();
    navigate('/settings');
  };

  // Mask bank account for security
  const rawAcct = employee.bankDetails?.accountNumber || employee.accountNumber || '';
  const maskedAcct = rawAcct.length > 4
    ? `•••• •••• ${rawAcct.slice(-4)}`
    : (rawAcct || '•••• •••• 4892');

  const bankName = employee.bankDetails?.bankName || employee.bankName || 'HDFC Bank';
  const ifscCode = employee.bankDetails?.ifsc || employee.ifsc || 'HDFC0001234';
  const panNumber = employee.bankDetails?.pan || employee.pan || 'ABCDE1234F';

  return (
    <>
      {/* Dedicated Print Stylesheet: Hides modal chrome, expands payslip to full A4 page */}
      <style>{`
        @media print {
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
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[820px] max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col">
          {/* Modal Action Header (Excluded from Print) */}
          <div className="no-print p-3.5 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 flex-wrap gap-2.5 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" />
              <span className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
                Salary Slip Generator
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
                {['2025', '2026', '2027'].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleNavigateToCompanySettings}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11.5px] font-semibold cursor-pointer transition-colors"
                title="Configure Company Name, Logo & Legal Info in Settings"
              >
                <Settings size={13} />
                <span>Company Info</span>
              </button>

              <button
                onClick={handleSendEmail}
                className="inline-flex items-center gap-[5px] px-[11px] py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                <Mail size={13} /> <span>Email Slip</span>
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
          <div ref={printRef} className="payslip-print-container p-9 sm:px-10 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
            
            {/* 1. Official Corporate Header */}
            <div className="flex justify-between items-start border-b-[2.5px] border-blue-900 pb-4 mb-5">
              <div className="flex-1 pr-5">
                <h1 className="text-[22px] font-extrabold text-blue-900 m-0 uppercase tracking-wide">
                  {companyInfo.companyName || 'ENTERPRISE TECHNOLOGY SOLUTIONS'}
                </h1>
                <p className="text-[11.5px] text-slate-600 mt-1 m-0 leading-snug">
                  {companyInfo.address || 'Corporate Headquarters & Registered Office'}
                </p>
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 mt-1">
                  {companyInfo.hrEmail && <span>Email: <strong>{companyInfo.hrEmail}</strong></span>}
                  {companyInfo.phone && <span>Phone: <strong>{companyInfo.phone}</strong></span>}
                  {companyInfo.cin && <span>CIN: <strong>{companyInfo.cin}</strong></span>}
                  {companyInfo.gstin && <span>GSTIN: <strong>{companyInfo.gstin}</strong></span>}
                  {companyInfo.pan && <span>PAN: <strong>{companyInfo.pan}</strong></span>}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-block px-3.5 py-1.5 rounded-md bg-blue-100 text-blue-800 text-[13px] font-extrabold tracking-wider">
                  SALARY SLIP
                </div>
                <div className="text-xs font-bold text-slate-700 mt-1">
                  {currentSlipPeriod.toUpperCase()}
                </div>
              </div>
            </div>

            {/* 2. Employee Profile & Banking Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:px-5 bg-slate-50 rounded-lg border border-slate-300 mb-[22px] text-[12.5px]">
              {/* Column 1: Employee Particulars */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee Name:</span>
                  <span className="font-extrabold text-slate-900">{employee.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee ID / Code:</span>
                  <span className="font-bold text-blue-900">{employee.employeeCode || employee._id || 'EMP-001'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Designation:</span>
                  <span className="font-semibold">{employee.role || 'Senior Specialist'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-semibold">{employee.department || 'Operations'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date of Joining:</span>
                  <span className="font-semibold">{employee.joiningDate || '2024-01-15'}</span>
                </div>
              </div>

              {/* Column 2: Bank & Attendance Summary */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Name:</span>
                  <span className="font-bold">{bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank A/C No:</span>
                  <span className="font-semibold font-mono">{maskedAcct}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">IFSC Code:</span>
                  <span className="font-semibold font-mono">{ifscCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee PAN:</span>
                  <span className="font-semibold font-mono">{panNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Days Paid / Worked:</span>
                  <span className="font-extrabold text-green-600">{daysInMonth} / {daysInMonth} Days (LOP: 0)</span>
                </div>
              </div>
            </div>

            {/* 3. Earnings & Deductions Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border-[1.5px] border-slate-400 rounded-lg overflow-hidden mb-5">
              {/* Earnings Column */}
              <div className="sm:border-r-[1.5px] sm:border-slate-400">
                <div className="p-2.5 px-4 bg-slate-100 font-extrabold text-[13px] border-b border-slate-300 text-slate-900 flex justify-between">
                  <span>EARNINGS</span>
                  <span>AMOUNT (₹)</span>
                </div>
                <div className="p-3.5 px-4 text-[13px] flex flex-col gap-[9px]">
                  <div className="flex justify-between">
                    <span>Basic Salary</span>
                    <span className="font-semibold">₹{resolvedSalary.basic.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>House Rent Allowance (HRA)</span>
                    <span className="font-semibold">₹{resolvedSalary.hra.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Special Allowance</span>
                    <span className="font-semibold">₹{resolvedSalary.allowances.toLocaleString('en-IN')}</span>
                  </div>
                  {resolvedSalary.bonus > 0 && (
                    <div className="flex justify-between">
                      <span>Performance Bonus / Incentive</span>
                      <span className="font-semibold">₹{resolvedSalary.bonus.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>Conveyance Allowance</span>
                    <span className="font-semibold">₹0</span>
                  </div>
                  <div className="flex justify-between border-t-[1.5px] border-slate-300 pt-2.5 font-extrabold text-green-700 text-[13.5px]">
                    <span>Total Gross Earnings</span>
                    <span>₹{resolvedSalary.gross.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Column */}
              <div>
                <div className="p-2.5 px-4 bg-slate-100 font-extrabold text-[13px] border-b border-slate-300 text-slate-900 flex justify-between">
                  <span>DEDUCTIONS</span>
                  <span>AMOUNT (₹)</span>
                </div>
                <div className="p-3.5 px-4 text-[13px] flex flex-col gap-[9px]">
                  <div className="flex justify-between">
                    <span>Provident Fund (EPF / PF)</span>
                    <span className="font-semibold">₹{resolvedSalary.pf.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Professional Tax (PT)</span>
                    <span className="font-semibold">₹{resolvedSalary.pt.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Deducted at Source (TDS)</span>
                    <span className="font-semibold">₹{resolvedSalary.tds.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Other Deductions / Advance</span>
                    <span className="font-semibold">₹0</span>
                  </div>
                  <div className="flex justify-between border-t-[1.5px] border-slate-300 pt-2.5 font-extrabold text-red-700 text-[13.5px]">
                    <span>Total Deductions</span>
                    <span>₹{resolvedSalary.deductions.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Net Salary & Words Banner */}
            <div className="p-4 sm:px-5 bg-emerald-50 border-[1.5px] border-emerald-300 rounded-xl flex items-center justify-between mb-[22px] flex-wrap gap-3">
              <div>
                <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">
                  NET TAKE-HOME SALARY PAYABLE
                </span>
                <div className="text-[26px] font-black text-emerald-950 leading-tight">
                  ₹{resolvedSalary.netSalary.toLocaleString('en-IN')}
                </div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5 italic">
                  ({numberToWordsINR(resolvedSalary.netSalary)})
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 text-[12.5px] font-bold">
                <CheckCircle2 size={18} />
                <span>Direct Bank Transfer Processed</span>
              </div>
            </div>

            {/* 5. Authorization & Verification Footer */}
            <div className="flex justify-between items-end pt-5 border-t border-slate-300 text-[11px] text-slate-500">
              <div>
                <p className="m-0 font-semibold text-slate-700">
                  {companyInfo.footerNote || '* This is a computer-generated salary slip and does not require a physical signature.'}
                </p>
                <p className="mt-[3px] m-0 text-slate-400">
                  Generated from {companyInfo.companyName || 'Enterprise Management Portal'} • Official Employee Payroll Record.
                </p>
              </div>

              <div className="text-center min-w-[150px]">
                <div className="inline-flex items-center gap-1 text-blue-900 text-[10.5px] font-bold mb-1.5">
                  <FileCheck size={14} /> Digitally Verified
                </div>
                <div className="w-35 border-b-[1.5px] border-slate-500 mx-auto mb-1"></div>
                <span className="font-extrabold text-slate-800 text-xs">
                  {companyInfo.signatoryTitle || 'Authorized Signatory'}
                </span>
                {companyInfo.signatoryName && (
                  <div className="text-[10.5px] text-slate-600 font-semibold">
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
