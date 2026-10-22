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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        margin: '30px auto',
        maxWidth: '540px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#dc2626',
          marginBottom: '16px'
        }}>
          <DollarSign size={28} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
          Payroll & Salary Access Restricted
        </h3>
        <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5', margin: '0 0 16px 0' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '100%', paddingBottom: '24px' }}>
      
      {/* Header Bar */}
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
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        minHeight: '68px',
        boxSizing: 'border-box',
        flexShrink: 0
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
            <DollarSign size={17} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.2' }}>
              Payroll & Compensation Hub
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Manage salary hikes 📈, tax & PF deductions, and automated monthly payslips.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{
              padding: '0 10px',
              height: '30px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              fontWeight: '600',
              color: '#0f172a',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="October 2026">October 2026</option>
            <option value="September 2026">September 2026</option>
            <option value="August 2026">August 2026</option>
            <option value="July 2026">July 2026</option>
          </select>

          <button
            onClick={handleDisburseAll}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 12px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(22, 163, 74, 0.2)'
            }}
          >
            <CreditCard size={14} />
            <span>Disburse All</span>
          </button>
        </div>
      </div>

      {/* Metric Cards (Compact 10px padding) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px'
      }}>
        {/* Total Payroll */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={16} />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Total Payroll Expense</span>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', lineHeight: '1.1' }}>
              ₹{totalGross.toLocaleString()}
            </div>
            <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: '600' }}>Gross for {selectedMonth}</span>
          </div>
        </div>

        {/* Net Disbursed */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CreditCard size={16} />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Net In-Hand Pay</span>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#15803d', lineHeight: '1.1' }}>
              ₹{totalNetPay.toLocaleString()}
            </div>
            <span style={{ fontSize: '10.5px', color: '#64748b' }}>Direct Bank Transfers</span>
          </div>
        </div>

        {/* Deductions & Taxes */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowUpDown size={16} />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Total Deductions</span>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#b91c1c', lineHeight: '1.1' }}>
              ₹{totalDeductions.toLocaleString()}
            </div>
            <span style={{ fontSize: '10.5px', color: '#64748b' }}>PF, PT & TDS withheld</span>
          </div>
        </div>

        {/* Workforce on Payroll */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={16} />
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Active Payees</span>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#9333ea', lineHeight: '1.1' }}>
              {employees.length} Members
            </div>
            <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: '600' }}>100% attendance sync</span>
          </div>
        </div>
      </div>

      {/* Salary List Table Card */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        {/* Search & Filter Bar */}
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 10px',
              height: '30px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              width: '240px'
            }}>
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search employee, ID or role..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '12px',
                  width: '100%',
                  color: '#0f172a'
                }}
              />
            </div>

            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              style={{
                padding: '0 8px',
                height: '30px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                fontWeight: '500',
                color: '#334155',
                outline: 'none'
              }}
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                <th style={{ padding: '8px 10px' }}>Employee</th>
                <th style={{ padding: '8px 10px' }}>Designation & Dept</th>
                <th style={{ padding: '8px 10px' }}>Monthly Gross</th>
                <th style={{ padding: '8px 10px' }}>Basic (50%)</th>
                <th style={{ padding: '8px 10px' }}>HRA & Allowances</th>
                <th style={{ padding: '8px 10px' }}>Deductions</th>
                <th style={{ padding: '8px 10px' }}>Net In-Hand</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Compensation Actions</th>
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
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    {/* Employee info */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={emp.name}
                          style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '12px', lineHeight: '1.2' }}>{emp.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>{emp.employeeCode}</span>
                            {revisionPercent && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                fontSize: '9.5px',
                                color: isPositiveHike ? '#15803d' : '#b91c1c',
                                fontWeight: '800',
                                backgroundColor: isPositiveHike ? '#dcfce7' : '#fee2e2',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                border: isPositiveHike ? '1px solid #bbf7d0' : '1px solid #fecaca'
                              }}>
                                {isPositiveHike ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                {isPositiveHike ? `+${revisionPercent}%` : `-${revisionPercent}%`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Department */}
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '12px' }}>{emp.role}</div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>{emp.department}</div>
                    </td>

                    {/* Gross CTC */}
                    <td style={{ padding: '7px 10px', fontWeight: '800', color: '#0f172a', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      ₹{gross.toLocaleString()}
                    </td>

                    {/* Basic */}
                    <td style={{ padding: '7px 10px', fontWeight: '600', color: '#334155', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      ₹{s.basic.toLocaleString()}
                    </td>

                    {/* HRA & Allowances */}
                    <td style={{ padding: '7px 10px', color: '#16a34a', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      +₹{(s.hra + s.allowances + (s.bonus || 0)).toLocaleString()}
                    </td>

                    {/* Deductions */}
                    <td style={{ padding: '7px 10px', color: '#b91c1c', fontWeight: '600', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      -₹{deductions.toLocaleString()}
                    </td>

                    {/* Net Pay */}
                    <td style={{ padding: '7px 10px', fontWeight: '800', color: '#15803d', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                      ₹{net.toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '7px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        
                        {/* Revise Salary Button */}
                        <button
                          onClick={() => handleOpenRevisionModal(emp)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            backgroundColor: '#f8fafc',
                            color: '#1e40af',
                            border: '1px solid #bfdbfe',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            height: '24px'
                          }}
                          title="Hike (Increase) or Deduct (Decrease) Employee Salary"
                        >
                          <ArrowUpDown size={11} color="#2563eb" />
                          <span>Revise</span>
                        </button>

                        {/* Payslip Button */}
                        <button
                          onClick={() => handleOpenPayslip(emp)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            height: '24px',
                            boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                          }}
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
