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
import { calculateMonthlyPayroll } from '../../../shared/utils/payrollUtils';

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
  leaves = [],
  holidays = []
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

  // Compute unified monthly payroll, attendance breakdown & LOP
  const payroll = useMemo(() => {
    if (!employee) return null;
    return calculateMonthlyPayroll({
      employee,
      selectedMonth: `${selectedMonthName} ${selectedYear}`,
      attendance,
      leaves,
      holidays,
      companySettings: companyInfo,
      salaryOverride: salaryData
    });
  }, [employee, selectedMonthName, selectedYear, attendance, leaves, holidays, companyInfo, salaryData]);

  if (!isOpen || !employee || !payroll) return null;

  const currentSlipPeriod = `${selectedMonthName} ${selectedYear}`;
  const monthIdx = MONTH_OPTIONS.indexOf(selectedMonthName);

  // Corporate Serial & Statutory identifiers
  const payslipSerialNo = `INF/PAY/${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}/${employee.employeeCode || employee._id || 'EMP'}`;

  // Smart Banking & Disbursal Channel Detection
  const hasCustomBank = Boolean(
    (employee.bankDetails?.bankName && employee.bankDetails.bankName.trim() !== '' && employee.bankDetails.bankName !== 'Not Provided') ||
    (employee.bankName && employee.bankName.trim() !== '' && employee.bankName !== 'Not Provided') ||
    (employee.bankDetails?.accountNumber && employee.bankDetails.accountNumber.trim() !== '' && employee.bankDetails.accountNumber !== 'Not Provided') ||
    (employee.accountNumber && employee.accountNumber.trim() !== '' && employee.accountNumber !== 'Not Provided')
  );

  const rawAcct = employee.bankDetails?.accountNumber || employee.accountNumber || '';
  const maskedAcct = rawAcct.length > 4
    ? `•••• •••• ${rawAcct.slice(-4)}`
    : (rawAcct || `PAY-DIR-${employee.employeeCode || employee._id || 'ACC'}`);

  const bankName = hasCustomBank
    ? (employee.bankDetails?.bankName || employee.bankName)
    : (companyInfo.shortName ? `${companyInfo.shortName} Corporate Payroll Account` : 'Corporate Direct Payroll Account');

  const ifscCode = hasCustomBank
    ? (employee.bankDetails?.ifsc || employee.ifsc || 'Corporate Verified')
    : 'Direct NEFT / IMPS Transfer';

  const rawPan = employee.bankDetails?.pan || employee.pan || '';
  const panNumber = (rawPan && rawPan !== 'Not Provided' && rawPan !== 'NA')
    ? rawPan
    : 'Corporate Verified (On File)';

  const rawUan = employee.bankDetails?.uan || employee.uan || employee.bankDetails?.pfUan || '';
  const uanNumber = (rawUan && rawUan !== 'Not Provided' && rawUan !== 'NA')
    ? rawUan
    : 'Direct Professional Payroll (Exempt)';

  const handlePrint = () => {
    const prevTitle = document.title;
    const cleanCompany = (companyInfo.shortName || companyInfo.companyName || 'Inforag').replace(/[^\w\s-]/g, '').trim();
    const cleanEmp = (employee.name || 'Employee').replace(/[^\w\s-]/g, '').trim();
    const titleStr = `${cleanCompany} - Salary Slip - ${cleanEmp} - ${currentSlipPeriod}`;
    document.title = titleStr;

    if (!printRef.current) {
      window.print();
      setTimeout(() => { document.title = prevTitle; }, 800);
      return;
    }

    // Collect all stylesheets from main document for perfect typography
    const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(node => node.outerHTML)
      .join('\n');

    let iframe = document.getElementById('payslip-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'payslip-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${titleStr}</title>
          ${headStyles}
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              width: 100% !important;
              overflow: visible !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            .payslip-print-container {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              height: auto !important;
              overflow: visible !important;
              font-size: 11px !important;
              line-height: 1.4 !important;
            }
            .payslip-print-container * {
              color: #0f172a !important;
              text-shadow: none !important;
              box-shadow: none !important;
            }
            .print-letterhead {
              border-bottom: 2.5px solid #1e3a8a !important;
              padding-bottom: 12px !important;
              margin-bottom: 14px !important;
            }
            .print-brand-title {
              color: #1e3a8a !important;
            }
            .print-info-grid {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 16px !important;
              background: #f8fafc !important;
              background-color: #f8fafc !important;
              border: 1px solid #cbd5e1 !important;
              padding: 10px 14px !important;
              margin-bottom: 14px !important;
            }
            .print-table {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              border: 1.5px solid #cbd5e1 !important;
              margin-bottom: 14px !important;
            }
            .print-earnings-col {
              border-right: 1.5px solid #cbd5e1 !important;
            }
            .print-th {
              background: #f1f5f9 !important;
              background-color: #f1f5f9 !important;
              border-bottom: 1.5px solid #cbd5e1 !important;
              font-weight: 800 !important;
              color: #0f172a !important;
              padding: 7px 12px !important;
            }
            .print-net-banner {
              background: #ecfdf5 !important;
              background-color: #ecfdf5 !important;
              border: 1.5px solid #a7f3d0 !important;
              padding: 10px 14px !important;
              margin-bottom: 14px !important;
            }
            .print-net-title {
              color: #065f46 !important;
            }
            .print-net-amount {
              color: #047857 !important;
              font-size: 22px !important;
              font-weight: 900 !important;
            }
            .print-badge {
              background-color: #dbeafe !important;
              color: #1e3a8a !important;
            }
            .print-footer {
              border-top: 1px solid #cbd5e1 !important;
              padding-top: 10px !important;
              margin-top: 6px !important;
            }
            .print-letterhead,
            .print-info-grid,
            .print-table,
            .print-net-banner,
            .print-footer {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body class="light" style="background:#ffffff !important; color:#0f172a !important; margin:0 !important; padding:0 !important;">
          ${printRef.current.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        window.print();
      }
      setTimeout(() => { document.title = prevTitle; }, 1000);
    }, 250);
  };

  const handleSendEmail = () => {
    const recipient = employee.email || '';
    const companyName = companyInfo.companyName || 'Inforag Technologies';
    const subject = encodeURIComponent(`Salary Slip - ${currentSlipPeriod} - ${companyName}`);
    const body = encodeURIComponent(
      `Hi ${employee.name || 'Team Member'},\n\n` +
      `Please find your salary summary for ${currentSlipPeriod}:\n` +
      `• Agreed Monthly In-Hand Salary: Rs. ${Number(payroll.monthlyGross || 0).toLocaleString('en-IN')}\n` +
      `• Total LOP / Attendance Deductions: Rs. ${Number(payroll.totalLopDeduction || 0).toLocaleString('en-IN')}\n` +
      `• Net Take-Home Pay: Rs. ${Number(payroll.netSalary || 0).toLocaleString('en-IN')}\n\n` +
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
      {/* Dedicated Print Stylesheet: Fits on standard single A4 page cleanly with pure white background */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }

          /* Strip all transforms and animations that trap fixed positioning */
          *, *::before, *::after {
            transform: none !important;
            animation: none !important;
            transition: none !important;
          }

          /* Force browser page and root to clean white */
          html, body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #root, #root > div {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          /* Hide all other app elements outside this payslip modal */
          body * {
            visibility: hidden !important;
          }

          .payslip-print-container,
          .payslip-print-container * {
            visibility: visible !important;
          }

          /* Remove dark overlay backdrop completely in print */
          .payslip-modal-backdrop {
            position: static !important;
            display: block !important;
            background: transparent !important;
            background-color: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: 0 !important;
            min-height: 0 !important;
            overflow: visible !important;
            z-index: auto !important;
          }

          .payslip-modal-card {
            position: static !important;
            display: block !important;
            max-width: 100% !important;
            max-height: none !important;
            width: 100% !important;
            height: 0 !important;
            min-height: 0 !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: transparent !important;
            background-color: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .payslip-print-container {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            padding: 8mm 10mm !important;
            margin: 0 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
            font-size: 10.5px !important;
            line-height: 1.35 !important;
            box-sizing: border-box !important;
            z-index: 99999999 !important;
          }

          /* Ensure high-contrast dark text and clean light cards regardless of dark mode */
          .payslip-print-container * {
            color: #0f172a !important;
            border-color: #cbd5e1 !important;
            box-shadow: none !important;
            text-shadow: none !important;
            background-image: none !important;
          }

          .payslip-print-container .print-letterhead {
            border-bottom: 2.5px solid #1e3a8a !important;
            margin-bottom: 10px !important;
            padding-bottom: 8px !important;
          }

          .payslip-print-container .print-brand-title {
            color: #1e3a8a !important;
          }

          .payslip-print-container .print-info-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
            background-color: #f8fafc !important;
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            padding: 8px 12px !important;
            margin-bottom: 10px !important;
          }

          .payslip-print-container .print-table {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            border: 1.5px solid #cbd5e1 !important;
            margin-bottom: 10px !important;
          }

          .payslip-print-container .print-earnings-col {
            border-right: 1.5px solid #cbd5e1 !important;
          }

          .payslip-print-container .print-th {
            background-color: #f1f5f9 !important;
            background: #f1f5f9 !important;
            border-bottom: 1.5px solid #cbd5e1 !important;
            color: #0f172a !important;
            font-weight: 800 !important;
            padding: 6px 10px !important;
          }

          .payslip-print-container .print-net-banner {
            background-color: #ecfdf5 !important;
            background: #ecfdf5 !important;
            border: 1.5px solid #a7f3d0 !important;
            padding: 8px 12px !important;
            margin-bottom: 10px !important;
          }

          .payslip-print-container .print-net-title {
            color: #065f46 !important;
          }

          .payslip-print-container .print-net-amount {
            color: #047857 !important;
            font-size: 20px !important;
          }

          .payslip-print-container .print-badge {
            background-color: #dbeafe !important;
            background: #dbeafe !important;
            color: #1e3a8a !important;
            border: 1px solid #bfdbfe !important;
          }

          .payslip-print-container .print-emerald-text {
            color: #047857 !important;
          }

          .payslip-print-container .print-rose-text {
            color: #b91c1c !important;
          }

          .payslip-print-container .print-amber-text {
            color: #b45309 !important;
          }

          .payslip-print-container .print-purple-text {
            color: #7e22ce !important;
          }

          .payslip-print-container .print-footer {
            margin-top: 6px !important;
            padding-top: 8px !important;
            border-top: 1px solid #cbd5e1 !important;
          }

          /* Prevent unexpected page breaks */
          .payslip-print-container .print-letterhead,
          .payslip-print-container .print-info-grid,
          .payslip-print-container .print-table,
          .payslip-print-container .print-net-banner,
          .payslip-print-container .print-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      <div className="payslip-modal-backdrop fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 sm:p-4 animate-fade-in" onClick={handleBackdropClick}>
        <div className="payslip-modal-card popup-spring bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[820px] max-h-[94vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={handleCardClick}>
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
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">EPF UAN / Status:</span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{uanNumber}</span>
                </div>
              </div>

              {/* Column 2: Banking & Attendance Summary */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">
                    {hasCustomBank ? 'Bank Name:' : 'Disbursal Mode:'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    {hasCustomBank ? (
                      bankName
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-900 dark:text-blue-300">
                        <Building2 size={12} className="text-blue-600 shrink-0" />
                        {bankName}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">
                    {hasCustomBank ? 'Bank Account No:' : 'Payment Ref ID:'}
                  </span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{maskedAcct}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">
                    {hasCustomBank ? 'Bank IFSC Code:' : 'Transfer Method:'}
                  </span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{ifscCode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Tax Identifier (PAN):</span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{panNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Total Calendar Days:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{payroll.daysInMonth} Days in Month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Paid Days / Attendance:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {payroll.paidDays} Paid Days {payroll.totalLopDays > 0 ? `(LOP: ${payroll.totalLopDays}d)` : '(Full Attendance)'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Earnings & Deductions Table (Direct In-Hand Salary Basis) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border-[1.5px] border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden mb-4">
              {/* Earnings Column */}
              <div className="print-earnings-col sm:border-r-[1.5px] sm:border-slate-300 dark:sm:border-slate-700">
                <div className="p-2 px-3.5 bg-slate-100 dark:bg-slate-800 font-extrabold text-xs border-b border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex justify-between">
                  <span>EARNINGS</span>
                  <span>AMOUNT (₹)</span>
                </div>
                <div className="p-3 px-3.5 text-xs flex flex-col gap-2 min-h-[140px]">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-slate-800 dark:text-slate-200 font-bold">Agreed Monthly In-Hand Salary</div>
                      <div className="text-[10.5px] text-slate-500">
                        ₹{payroll.dailyRate.toLocaleString('en-IN')}/calendar day ({payroll.daysInMonth} days in {selectedMonthName})
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">₹{payroll.monthlyGross.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="mt-auto pt-3 flex justify-between border-t-[1.5px] border-slate-300 dark:border-slate-700 font-extrabold text-emerald-700 dark:text-emerald-400 text-[13px]">
                    <span>Total Gross Earnings (A)</span>
                    <span>₹{payroll.monthlyGross.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Column */}
              <div>
                <div className="p-2 px-3.5 bg-slate-100 dark:bg-slate-800 font-extrabold text-xs border-b border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex justify-between">
                  <span>ATTENDANCE DEDUCTIONS</span>
                  <span>AMOUNT (₹)</span>
                </div>
                <div className="p-3 px-3.5 text-xs flex flex-col gap-2 min-h-[140px]">
                  {payroll.totalLopDeduction > 0 ? (
                    <>
                      {payroll.absentDays > 0 && (
                        <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                          <div>
                            <span className="font-semibold">Absent Deduction</span>
                            <span className="text-[10px] text-slate-500 block">
                              ({payroll.absentDays} {payroll.absentDays === 1 ? 'day' : 'days'} @ ₹{payroll.dailyRate}/day)
                            </span>
                          </div>
                          <span className="font-bold">-₹{payroll.absentDeduction.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      {payroll.halfDays > 0 && (
                        <div className="flex justify-between items-center text-amber-700 dark:text-amber-400">
                          <div>
                            <span className="font-semibold">Half-Day Deduction</span>
                            <span className="text-[10px] text-slate-500 block">
                              ({payroll.halfDays} {payroll.halfDays === 1 ? 'half-day' : 'half-days'} @ ₹{payroll.halfDayRate})
                            </span>
                          </div>
                          <span className="font-bold">-₹{payroll.halfDayDeduction.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      {payroll.unpaidLeaveDays > 0 && (
                        <div className="flex justify-between items-center text-purple-700 dark:text-purple-400">
                          <div>
                            <span className="font-semibold">Unpaid Leave (LOP)</span>
                            <span className="text-[10px] text-slate-500 block">
                              ({payroll.unpaidLeaveDays} {payroll.unpaidLeaveDays === 1 ? 'day' : 'days'} @ ₹{payroll.dailyRate}/day)
                            </span>
                          </div>
                          <span className="font-bold">-₹{payroll.unpaidLeaveDeduction.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-3 text-slate-500 italic text-[11px] leading-relaxed">
                      ✔️ Full month attendance recorded. Zero Loss of Pay (LOP) deductions for {selectedMonthName}.
                    </div>
                  )}

                  <div className="mt-auto pt-3 flex justify-between border-t-[1.5px] border-slate-300 dark:border-slate-700 font-extrabold text-rose-700 dark:text-rose-400 text-[13px]">
                    <span>Total Deductions (B)</span>
                    <span>{payroll.totalLopDeduction > 0 ? `-₹${payroll.totalLopDeduction.toLocaleString('en-IN')}` : '₹0'}</span>
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
                  ₹{payroll.netSalary.toLocaleString('en-IN')}
                </div>
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mt-0.5 italic">
                  ({numberToWordsINR(payroll.netSalary)})
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 size={16} />
                <span>Bank Transfer Disbursed</span>
              </div>
            </div>

            {/* 5. Authorization & Verification Footer */}
            <div className="print-footer flex justify-between items-end pt-3 border-t border-slate-300 dark:border-slate-700 text-[10.5px] text-slate-500 dark:text-slate-400">
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
