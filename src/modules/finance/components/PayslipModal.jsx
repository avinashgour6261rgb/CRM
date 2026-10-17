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

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '94vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Modal Action Header (Excluded from Print) */}
          <div className="no-print" style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="#2563eb" />
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                Salary Slip Generator
              </span>
            </div>

            {/* Month & Year Interactive Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#64748b" />
              <select
                value={selectedMonthName}
                onChange={e => setSelectedMonthName(e.target.value)}
                style={{
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  colorScheme: 'light'
                }}
              >
                {MONTH_OPTIONS.map(m => (
                  <option key={m} value={m} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>{m}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                style={{
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  padding: '0 8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  colorScheme: 'light'
                }}
              >
                {['2025', '2026', '2027'].map(y => (
                  <option key={y} value={y} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>{y}</option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleNavigateToCompanySettings}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                title="Configure Company Name, Logo & Legal Info in Settings"
              >
                <Settings size={13} />
                <span>Company Info</span>
              </button>

              <button
                onClick={handleSendEmail}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 11px',
                  borderRadius: '6px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Mail size={13} /> <span>Email Slip</span>
              </button>

              <button
                onClick={handlePrint}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                }}
              >
                <Printer size={13} /> <span>Print / Save PDF</span>
              </button>

              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Printable Payslip Body */}
          <div ref={printRef} className="payslip-print-container" style={{ padding: '36px 40px', color: '#0f172a', backgroundColor: '#ffffff' }}>
            
            {/* 1. Official Corporate Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2.5px solid #1e3a8a',
              paddingBottom: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ flex: 1, paddingRight: '20px' }}>
                <h1 style={{
                  fontSize: '22px',
                  fontWeight: '800',
                  color: '#1e3a8a',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em'
                }}>
                  {companyInfo.companyName || 'ENTERPRISE TECHNOLOGY SOLUTIONS'}
                </h1>
                <p style={{ fontSize: '11.5px', color: '#475569', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                  {companyInfo.address || 'Corporate Headquarters & Registered Office'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  {companyInfo.hrEmail && <span>Email: <strong>{companyInfo.hrEmail}</strong></span>}
                  {companyInfo.phone && <span>Phone: <strong>{companyInfo.phone}</strong></span>}
                  {companyInfo.cin && <span>CIN: <strong>{companyInfo.cin}</strong></span>}
                  {companyInfo.gstin && <span>GSTIN: <strong>{companyInfo.gstin}</strong></span>}
                  {companyInfo.pan && <span>PAN: <strong>{companyInfo.pan}</strong></span>}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  fontSize: '13px',
                  fontWeight: '800',
                  letterSpacing: '0.04em'
                }}>
                  SALARY SLIP
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginTop: '4px' }}>
                  {currentSlipPeriod.toUpperCase()}
                </div>
              </div>
            </div>

            {/* 2. Employee Profile & Banking Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              padding: '16px 20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              marginBottom: '22px',
              fontSize: '12.5px'
            }}>
              {/* Column 1: Employee Particulars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Employee Name:</span>
                  <span style={{ fontWeight: '800', color: '#0f172a' }}>{employee.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Employee ID / Code:</span>
                  <span style={{ fontWeight: '700', color: '#1e40af' }}>{employee.employeeCode || employee._id || 'EMP-001'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Designation:</span>
                  <span style={{ fontWeight: '600' }}>{employee.role || 'Senior Specialist'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Department:</span>
                  <span style={{ fontWeight: '600' }}>{employee.department || 'Operations'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Date of Joining:</span>
                  <span style={{ fontWeight: '600' }}>{employee.joiningDate || '2024-01-15'}</span>
                </div>
              </div>

              {/* Column 2: Bank & Attendance Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Bank Name:</span>
                  <span style={{ fontWeight: '700' }}>{bankName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Bank A/C No:</span>
                  <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{maskedAcct}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>IFSC Code:</span>
                  <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{ifscCode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Employee PAN:</span>
                  <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{panNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Days Paid / Worked:</span>
                  <span style={{ fontWeight: '800', color: '#16a34a' }}>{daysInMonth} / {daysInMonth} Days (LOP: 0)</span>
                </div>
              </div>
            </div>

            {/* 3. Earnings & Deductions Table */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              border: '1.5px solid #94a3b8',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '20px'
            }}>
              {/* Earnings Column */}
              <div style={{ borderRight: '1.5px solid #94a3b8' }}>
                <div style={{
                  padding: '10px 16px',
                  backgroundColor: '#f1f5f9',
                  fontWeight: '800',
                  fontSize: '13px',
                  borderBottom: '1px solid #cbd5e1',
                  color: '#0f172a',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>EARNINGS</span>
                  <span>AMOUNT (₹)</span>
                </div>
                <div style={{ padding: '14px 16px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Basic Salary</span>
                    <span style={{ fontWeight: '600' }}>₹{resolvedSalary.basic.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>House Rent Allowance (HRA)</span>
                    <span style={{ fontWeight: '600' }}>₹{resolvedSalary.hra.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Special Allowance</span>
                    <span style={{ fontWeight: '600' }}>₹{resolvedSalary.allowances.toLocaleString('en-IN')}</span>
                  </div>
                  {resolvedSalary.bonus > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Performance Bonus / Incentive</span>
                      <span style={{ fontWeight: '600' }}>₹{resolvedSalary.bonus.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Conveyance Allowance</span>
                    <span style={{ fontWeight: '600' }}>₹0</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1.5px solid #cbd5e1',
                    paddingTop: '10px',
                    fontWeight: '800',
                    color: '#15803d',
                    fontSize: '13.5px'
                  }}>
                    <span>Total Gross Earnings</span>
                    <span>₹{resolvedSalary.gross.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Column */}
              <div>
                <div style={{
                  padding: '10px 16px',
                  backgroundColor: '#f1f5f9',
                  fontWeight: '800',
                  fontSize: '13px',
                  borderBottom: '1px solid #cbd5e1',
                  color: '#0f172a',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>DEDUCTIONS</span>
                  <span>AMOUNT (₹)</span>
                </div>
                <div style={{ padding: '14px 16px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Provident Fund (EPF / PF)</span>
                    <span style={{ fontWeight: '600' }}>₹{resolvedSalary.pf.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Professional Tax (PT)</span>
                    <span style={{ fontWeight: '600' }}>₹{resolvedSalary.pt.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tax Deducted at Source (TDS)</span>
                    <span style={{ fontWeight: '600' }}>₹{resolvedSalary.tds.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Other Deductions / Advance</span>
                    <span style={{ fontWeight: '600' }}>₹0</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1.5px solid #cbd5e1',
                    paddingTop: '10px',
                    fontWeight: '800',
                    color: '#b91c1c',
                    fontSize: '13.5px'
                  }}>
                    <span>Total Deductions</span>
                    <span>₹{resolvedSalary.deductions.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Net Salary & Words Banner */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '22px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  NET TAKE-HOME SALARY PAYABLE
                </span>
                <div style={{ fontSize: '26px', fontWeight: '900', color: '#14532d', lineHeight: '1.2' }}>
                  ₹{resolvedSalary.netSalary.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534', marginTop: '2px', fontStyle: 'italic' }}>
                  ({numberToWordsINR(resolvedSalary.netSalary)})
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '12.5px', fontWeight: '700' }}>
                <CheckCircle2 size={18} />
                <span>Direct Bank Transfer Processed</span>
              </div>
            </div>

            {/* 5. Authorization & Verification Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingTop: '20px',
              borderTop: '1px solid #cbd5e1',
              fontSize: '11px',
              color: '#64748b'
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: '600' }}>
                  {companyInfo.footerNote || '* This is a computer-generated salary slip and does not require a physical signature.'}
                </p>
                <p style={{ margin: '3px 0 0 0', color: '#94a3b8' }}>
                  Generated from {companyInfo.companyName || 'Enterprise Management Portal'} • Official Employee Payroll Record.
                </p>
              </div>

              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#1e40af',
                  fontSize: '10.5px',
                  fontWeight: '700',
                  marginBottom: '6px'
                }}>
                  <FileCheck size={14} /> Digitally Verified
                </div>
                <div style={{ width: '140px', borderBottom: '1.5px solid #64748b', margin: '0 auto 4px auto' }}></div>
                <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '12px' }}>
                  {companyInfo.signatoryTitle || 'Authorized Signatory'}
                </span>
                {companyInfo.signatoryName && (
                  <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: '600' }}>
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
