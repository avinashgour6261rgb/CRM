import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  Calendar,
  Award,
  FileCheck,
  Printer,
  Mail,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Building2,
  Sliders,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '../../../shared/context/ToastContext';
import { getCompanySettings } from '../../../shared/services/companySettingsService';

export const SalaryIncrementModal = ({ isOpen, onClose, employee, currentSalaryData, onSalaryUpdated }) => {
  const { addToast } = useToast();

  const [companyInfo, setCompanyInfo] = useState(getCompanySettings());

  useEffect(() => {
    const updateInfo = () => setCompanyInfo(getCompanySettings());
    window.addEventListener('company-settings-updated', updateInfo);
    return () => window.removeEventListener('company-settings-updated', updateInfo);
  }, []);

  // Revision Type: 'hike' (Increment) vs 'decrease' (Reduction / Deduction)
  const [revisionType, setRevisionType] = useState('hike');
  const [mode, setMode] = useState('fixed'); // 'fixed' | 'percentage'
  const [percentageValue, setPercentageValue] = useState(15);
  const [targetFixedSalary, setTargetFixedSalary] = useState(0);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Annual Performance Appraisal');
  const [remarks, setRemarks] = useState('');
  const [showLetterPreview, setShowLetterPreview] = useState(false);

  const oldBasic = currentSalaryData?.basic || 45000;
  const oldHra = currentSalaryData?.hra || 18000;
  const oldAllowances = currentSalaryData?.allowances || 12000;
  const oldBonus = currentSalaryData?.bonus || 0;
  const oldGrossMonthly = oldBasic + oldHra + oldAllowances + oldBonus;

  // Initialize target fixed salary when modal opens or employee changes
  useEffect(() => {
    if (employee && currentSalaryData) {
      if (revisionType === 'hike') {
        setTargetFixedSalary(oldGrossMonthly + 5000);
        setPercentageValue(15);
        setReason('Annual Performance Appraisal');
      } else {
        setTargetFixedSalary(Math.max(10000, oldGrossMonthly - 5000));
        setPercentageValue(10);
        setReason('Performance Improvement Plan (PIP) / Role Restructuring');
      }
    }
  }, [employee, currentSalaryData, oldGrossMonthly, revisionType, isOpen]);

  if (!isOpen || !employee) return null;

  // Calculate new salary & delta
  let newGrossMonthly = oldGrossMonthly;
  let diffAmount = 0;
  let diffPercentage = 0;

  if (revisionType === 'hike') {
    if (mode === 'percentage') {
      diffPercentage = Math.abs(Number(percentageValue)) || 0;
      diffAmount = Math.round((oldGrossMonthly * diffPercentage) / 100);
      newGrossMonthly = oldGrossMonthly + diffAmount;
    } else {
      newGrossMonthly = Math.max(1000, Number(targetFixedSalary) || oldGrossMonthly);
      diffAmount = Math.max(0, newGrossMonthly - oldGrossMonthly);
      diffPercentage = oldGrossMonthly > 0 ? Number(((diffAmount / oldGrossMonthly) * 100).toFixed(1)) : 0;
    }
  } else {
    // Decrease / Deduction
    if (mode === 'percentage') {
      diffPercentage = Math.abs(Number(percentageValue)) || 0;
      diffAmount = Math.round((oldGrossMonthly * diffPercentage) / 100);
      newGrossMonthly = Math.max(1000, oldGrossMonthly - diffAmount);
    } else {
      newGrossMonthly = Math.max(1000, Number(targetFixedSalary) || oldGrossMonthly);
      diffAmount = Math.max(0, oldGrossMonthly - newGrossMonthly);
      diffPercentage = oldGrossMonthly > 0 ? Number(((diffAmount / oldGrossMonthly) * 100).toFixed(1)) : 0;
    }
  }

  // Auto split new salary breakdown according to Indian / Global standard payroll ratio
  const newBasic = Math.round(newGrossMonthly * 0.50);
  const newHra = Math.round(newBasic * 0.40);
  const newAllowances = Math.max(0, newGrossMonthly - newBasic - newHra);
  const newPf = Math.round(newBasic * 0.08);
  const newPt = 200;
  const newTds = newGrossMonthly > 100000 
    ? Math.round(newGrossMonthly * 0.10) 
    : newGrossMonthly > 50000 
      ? Math.round(newGrossMonthly * 0.05) 
      : 0;

  const totalDeductions = newPf + newPt + newTds;
  const netInHand = newGrossMonthly - totalDeductions;
  const newAnnualCTC = newGrossMonthly * 12;
  const oldAnnualCTC = oldGrossMonthly * 12;

  const handleSubmitRevision = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const isHike = revisionType === 'hike';

    const updatedSalaryObject = {
      basic: newBasic,
      hra: newHra,
      allowances: newAllowances,
      bonus: 0,
      pf: newPf,
      pt: newPt,
      tds: newTds,
      revisionType: revisionType,
      lastRevisionDate: effectiveDate,
      lastRevisionPercentage: isHike ? diffPercentage : -diffPercentage,
      lastRevisionAmount: isHike ? diffAmount : -diffAmount,
      // Backwards compatibility keys
      lastHikeDate: effectiveDate,
      lastHikePercentage: isHike ? diffPercentage : null,
      lastHikeAmount: isHike ? diffAmount : null,
      reason,
      remarks
    };

    if (onSalaryUpdated) {
      onSalaryUpdated(employee.employeeCode, updatedSalaryObject);
    }

    // Dispatch global event for instant sync
    window.dispatchEvent(new CustomEvent('hrms_salary_update', {
      detail: {
        employeeCode: employee.employeeCode,
        salary: updatedSalaryObject
      }
    }));

    if (isHike) {
      addToast({
        title: 'Salary Hike Applied Successfully! 📈',
        message: `${employee.name}'s salary increased from ₹${oldGrossMonthly.toLocaleString()} to ₹${newGrossMonthly.toLocaleString()} (+${diffPercentage}%).`,
        type: 'success'
      });
    } else {
      addToast({
        title: 'Salary Revision / Reduction Applied! 📉',
        message: `${employee.name}'s compensation adjusted from ₹${oldGrossMonthly.toLocaleString()} to ₹${newGrossMonthly.toLocaleString()} (-${diffPercentage}%).`,
        type: 'warning'
      });
    }

    onClose();
  };

  const handlePrintLetter = () => {
    window.print();
  };

  const isHike = revisionType === 'hike';
  const themeColor = isHike ? '#16a34a' : '#dc2626';
  const themeBgLight = isHike ? '#f0fdf4' : '#fef2f2';
  const themeBorder = isHike ? '#bbf7d0' : '#fecaca';

  return (
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
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '94vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Header Bar */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: isHike ? '#dcfce7' : '#fee2e2',
              color: themeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isHike ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            </div>
            <div>
              <h3 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Salary Revision & Compensation Engine
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                Bi-directional adjustments (Hike 📈 / Deduction 📉) with real-time statutory recalculation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Employee Info Header */}
        <div style={{
          padding: '14px 24px',
          backgroundColor: '#eff6ff',
          borderBottom: '1px solid #dbeafe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={employee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={employee.name}
              style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #3b82f6' }}
            />
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#1e3a8a' }}>{employee.name}</div>
              <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                {employee.role} • <strong>{employee.employeeCode}</strong> • {employee.department}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Current Monthly CTC</span>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              ₹{oldGrossMonthly.toLocaleString()} <span style={{ fontSize: '11px', color: '#64748b' }}>/ mo</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#475569' }}>Annual: ₹{oldAnnualCTC.toLocaleString()}</span>
          </div>
        </div>

        {!showLetterPreview ? (
          /* Main Revision Form */
          <form onSubmit={handleSubmitRevision} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Step 1: Choose Revision Type (Hike vs Decrease) */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                1. Select Salary Action Type
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                {/* Hike Button */}
                <button
                  type="button"
                  onClick={() => {
                    setRevisionType('hike');
                    setTargetFixedSalary(oldGrossMonthly + 5000);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: revisionType === 'hike' ? '2px solid #16a34a' : '1.5px solid #e2e8f0',
                    backgroundColor: revisionType === 'hike' ? '#f0fdf4' : '#ffffff',
                    color: revisionType === 'hike' ? '#15803d' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: revisionType === 'hike' ? '#dcfce7' : '#f1f5f9',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '800' }}>📈 Salary Hike / Increment</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Appraisal, Promotion, Merit Increase</div>
                  </div>
                </button>

                {/* Decrease Button */}
                <button
                  type="button"
                  onClick={() => {
                    setRevisionType('decrease');
                    setTargetFixedSalary(Math.max(10000, oldGrossMonthly - 5000));
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: revisionType === 'decrease' ? '2px solid #dc2626' : '1.5px solid #e2e8f0',
                    backgroundColor: revisionType === 'decrease' ? '#fef2f2' : '#ffffff',
                    color: revisionType === 'decrease' ? '#b91c1c' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: revisionType === 'decrease' ? '#fee2e2' : '#f1f5f9',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <TrendingDown size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '800' }}>📉 Salary Reduction / Deduction</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Role Restructuring, Demotion, PIP Adjust</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Choose Method (Fixed Amount vs Percentage) */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                2. Revision Calculation Mode
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                backgroundColor: '#f1f5f9',
                padding: '4px',
                borderRadius: '10px'
              }}>
                <button
                  type="button"
                  onClick={() => setMode('fixed')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: mode === 'fixed' ? '#2563eb' : 'transparent',
                    color: mode === 'fixed' ? '#ffffff' : '#64748b',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <DollarSign size={16} /> Direct Amount (e.g. ₹20k ➔ ₹15k or ₹25k)
                </button>

                <button
                  type="button"
                  onClick={() => setMode('percentage')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: mode === 'percentage' ? '#2563eb' : 'transparent',
                    color: mode === 'percentage' ? '#ffffff' : '#64748b',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Percent size={15} /> Percentage Adjust ({isHike ? '+%' : '-%'})
                </button>
              </div>
            </div>

            {/* Step 3: Input Controls */}
            {mode === 'fixed' ? (
              <div style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Target Monthly Gross CTC (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '10px', fontWeight: '700', color: '#64748b', fontSize: '15px' }}>₹</span>
                  <input
                    type="number"
                    value={targetFixedSalary}
                    onChange={e => setTargetFixedSalary(Number(e.target.value))}
                    min="1000"
                    step="500"
                    placeholder="Enter revised monthly gross..."
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 32px',
                      borderRadius: '8px',
                      border: isHike ? '1.5px solid #16a34a' : '1.5px solid #dc2626',
                      fontSize: '16px',
                      fontWeight: '800',
                      color: '#0f172a',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  />
                </div>

                {/* Quick Fixed Increment/Decrement Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>Quick Shortcuts:</span>
                  {isHike ? (
                    [2000, 5000, 10000, 15000, 20000].map(addAmt => (
                      <button
                        key={addAmt}
                        type="button"
                        onClick={() => setTargetFixedSalary(oldGrossMonthly + addAmt)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: targetFixedSalary === oldGrossMonthly + addAmt ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                          backgroundColor: targetFixedSalary === oldGrossMonthly + addAmt ? '#dcfce7' : '#ffffff',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          color: '#15803d',
                          cursor: 'pointer'
                        }}
                      >
                        +₹{addAmt.toLocaleString()}
                      </button>
                    ))
                  ) : (
                    [2000, 5000, 10000, 15000].map(subAmt => (
                      <button
                        key={subAmt}
                        type="button"
                        onClick={() => setTargetFixedSalary(Math.max(1000, oldGrossMonthly - subAmt))}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: targetFixedSalary === Math.max(1000, oldGrossMonthly - subAmt) ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                          backgroundColor: targetFixedSalary === Math.max(1000, oldGrossMonthly - subAmt) ? '#fee2e2' : '#ffffff',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          color: '#b91c1c',
                          cursor: 'pointer'
                        }}
                      >
                        -₹{subAmt.toLocaleString()}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  {isHike ? 'Hike Percentage (+%)' : 'Reduction Percentage (-%)'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <input
                    type="range"
                    min="5"
                    max={isHike ? '100' : '50'}
                    step="5"
                    value={percentageValue}
                    onChange={e => setPercentageValue(Number(e.target.value))}
                    style={{ flex: 1, accentColor: isHike ? '#16a34a' : '#dc2626' }}
                  />
                  <div style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: isHike ? '#dcfce7' : '#fee2e2',
                    color: themeColor,
                    fontWeight: '800',
                    fontSize: '17px',
                    minWidth: '75px',
                    textAlign: 'center'
                  }}>
                    {isHike ? `+${percentageValue}%` : `-${percentageValue}%`}
                  </div>
                </div>

                {/* Quick Percentage Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>Presets:</span>
                  {(isHike ? [10, 15, 20, 25, 30, 40, 50] : [5, 10, 15, 20, 25, 30]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPercentageValue(p)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: percentageValue === p ? `1.5px solid ${themeColor}` : '1px solid #cbd5e1',
                        backgroundColor: percentageValue === p ? (isHike ? '#eff6ff' : '#fff1f2') : '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: percentageValue === p ? themeColor : '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      {isHike ? `+${p}%` : `-${p}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Live Comparison Box */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: themeBgLight,
              borderRadius: '12px',
              border: `1.5px solid ${themeBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Previous Salary
                </span>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#334155' }}>
                  ₹{oldGrossMonthly.toLocaleString()}
                </div>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>₹{oldAnnualCTC.toLocaleString()} / yr</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: themeColor }}>
                <ArrowRight size={18} />
                <span style={{
                  padding: '5px 10px',
                  borderRadius: '14px',
                  backgroundColor: isHike ? '#dcfce7' : '#fee2e2',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  color: themeColor,
                  border: `1px solid ${themeBorder}`
                }}>
                  {isHike ? `+₹${diffAmount.toLocaleString()} (+${diffPercentage}%)` : `-₹${diffAmount.toLocaleString()} (-${diffPercentage}%)`}
                </span>
                <ArrowRight size={18} />
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: isHike ? '#15803d' : '#b91c1c', textTransform: 'uppercase' }}>
                  {isHike ? 'Revised New CTC' : 'Adjusted New CTC'}
                </span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: isHike ? '#15803d' : '#b91c1c' }}>
                  ₹{newGrossMonthly.toLocaleString()}
                </div>
                <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#475569' }}>
                  ₹{newAnnualCTC.toLocaleString()} / yr
                </span>
              </div>
            </div>

            {/* Step 5: Recalculated Breakdown Details */}
            <div style={{
              padding: '14px 18px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px'
            }}>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Basic Pay (50%):</span>
                <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px' }}>₹{newBasic.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>HRA (40% Basic):</span>
                <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px' }}>₹{newHra.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Allowances:</span>
                <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px' }}>₹{newAllowances.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>PF & Tax Ded.:</span>
                <span style={{ fontWeight: '800', color: '#b91c1c', fontSize: '13px' }}>-₹{totalDeductions.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Net In-Hand / Mo:</span>
                <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '13px' }}>₹{netInHand.toLocaleString()}</span>
              </div>
            </div>

            {/* Step 6: Reason & Effective Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  {isHike ? 'Appraisal Reason' : 'Adjustment Rationale'}
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {isHike ? (
                    <>
                      <option value="Annual Performance Appraisal">Annual Performance Appraisal</option>
                      <option value="Promotion & Role Upgrade">Promotion & Role Upgrade</option>
                      <option value="Probation Confirmation & Regularization">Probation Confirmation & Regularization</option>
                      <option value="Merit & Key Milestone Achievement">Merit & Key Milestone Achievement</option>
                      <option value="Market Benchmarking & Correction">Market Benchmarking & Correction</option>
                      <option value="Retention & Key Performer Bonus">Retention & Key Performer Bonus</option>
                    </>
                  ) : (
                    <>
                      <option value="Performance Improvement Plan (PIP) / Role Restructuring">Performance Improvement Plan (PIP) / Role Restructuring</option>
                      <option value="Role Change / Demotion / Department Transfer">Role Change / Demotion / Department Transfer</option>
                      <option value="Voluntary Work-Hour or Shift Adjustment">Voluntary Work-Hour or Shift Adjustment</option>
                      <option value="Operational Cost Optimization / Market Re-alignment">Operational Cost Optimization / Market Re-alignment</option>
                      <option value="Disciplinary Action & Policy Revision">Disciplinary Action & Policy Revision</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Effective Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>
            </div>

            {/* Step 7: HR / Leadership Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                HR & Executive Remarks (Will appear on official letter)
              </label>
              <textarea
                placeholder={isHike
                  ? "e.g. Promoted to Senior Lead based on exceptional Q3 project delivery and leadership excellence."
                  : "e.g. Compensation restructuring aligned with revised role scope as agreed during the performance evaluation."}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            {/* Bottom Form Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '16px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <button
                type="button"
                onClick={() => setShowLetterPreview(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <FileCheck size={16} />
                Preview Official Letter
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: themeColor,
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: isHike ? '0 2px 6px rgba(22, 163, 74, 0.3)' : '0 2px 6px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  <CheckCircle2 size={16} />
                  {isHike ? 'Apply Salary Hike' : 'Apply Salary Revision'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Official Document Letter Preview (Adaptive: Appraisal vs Revision Notice) */
          <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              border: isHike ? '2px solid #2563eb' : '2px solid #d97706',
              borderRadius: '12px',
              padding: '24px 30px',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 14px rgba(0,0,0,0.05)'
            }}>
              {/* Header Letterhead */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: isHike ? '2px solid #2563eb' : '2px solid #d97706',
                paddingBottom: '14px',
                marginBottom: '18px'
              }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e3a8a', margin: 0, textTransform: 'uppercase' }}>
                    {companyInfo.companyName || 'ORGANIZATION'}
                  </h2>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                    {companyInfo.address} • {companyInfo.hrEmail || companyInfo.email}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Date: {new Date().toLocaleDateString()}</span>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: isHike ? '#2563eb' : '#d97706' }}>
                    Ref: {companyInfo.shortName?.slice(0, 3).toUpperCase() || 'EMS'}/{isHike ? 'HR-APPRAISAL' : 'HR-REVISION'}/{employee.employeeCode}
                  </div>
                </div>
              </div>

              {/* Title of Document */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h3 style={{
                  display: 'inline-block',
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: '800',
                  color: isHike ? '#1e3a8a' : '#991b1b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: `2px solid ${isHike ? '#bfdbfe' : '#fecaca'}`,
                  paddingBottom: '4px'
                }}>
                  {isHike ? 'Official Appraisal & Salary Increment Letter' : 'Compensation Restructuring & Salary Revision Notice'}
                </h3>
              </div>

              {/* Salutation */}
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' }}>
                Dear {employee.name},
              </p>

              {/* Body Text */}
              {isHike ? (
                <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                  We take immense pleasure in informing you that in recognition of your dedicated contributions, professionalism, and performance, the Management has approved a salary increment effective from <strong>{effectiveDate}</strong>.
                </p>
              ) : (
                <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.6', margin: '0 0 12px 0' }}>
                  This notice serves as official confirmation that following management review and role alignment, your monthly compensation structure will be adjusted effective from <strong>{effectiveDate}</strong> due to <em>{reason}</em>.
                </p>
              )}

              {/* Revised Salary Table */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '16px',
                fontSize: '12.5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Previous Monthly CTC:</span>
                  <span style={{ fontWeight: '600' }}>₹{oldGrossMonthly.toLocaleString()}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  color: isHike ? '#16a34a' : '#dc2626',
                  fontWeight: '700'
                }}>
                  <span>{isHike ? 'Increment' : 'Adjustment'}:</span>
                  <span>
                    {isHike ? `+${diffPercentage}% (+₹${diffAmount.toLocaleString()})` : `-${diffPercentage}% (-₹${diffAmount.toLocaleString()})`}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px dashed #cbd5e1',
                  paddingTop: '6px',
                  fontWeight: '800',
                  color: isHike ? '#1e3a8a' : '#991b1b',
                  fontSize: '14px'
                }}>
                  <span>Revised Monthly CTC:</span>
                  <span>₹{newGrossMonthly.toLocaleString()} / month</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  <span>Annualized CTC:</span>
                  <span>₹{newAnnualCTC.toLocaleString()} / annum</span>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5', margin: '0 0 18px 0' }}>
                {remarks || (isHike
                  ? 'We look forward to your continued dedication, leadership, and success as we scale new milestones together.'
                  : 'Should you have any queries regarding your revised compensation schedule, please connect with the HR Directorate.')}
              </p>

              {/* Signature Block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '10px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                    {companyInfo.signatoryTitle || 'Authorized HR Directorate'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {companyInfo.companyName || 'Organization Directorate'}
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  fontSize: '11px',
                  fontWeight: '700'
                }}>
                  ✅ Digitally Verified & Sealed
                </div>
              </div>
            </div>

            {/* Bottom Preview Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setShowLetterPreview(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ← Back to Config
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrintLetter}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={15} /> Print Official Letter
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRevision}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: themeColor,
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <CheckCircle2 size={15} /> Confirm & Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
