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

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[720px] max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Top Header Bar */}
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center ${
              isHike ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {isHike ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            </div>
            <div>
              <h3 className="text-[15.5px] font-extrabold text-slate-900 dark:text-slate-100 m-0">
                Salary Revision & Compensation Engine
              </h3>
              <p className="m-0 text-[11.5px] text-slate-500 dark:text-slate-400">
                Bi-directional adjustments (Hike 📈 / Deduction 📉) with real-time statutory recalculation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Employee Info Header */}
        <div className="p-3.5 sm:px-6 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <img
              src={employee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={employee.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-blue-500"
            />
            <div>
              <div className="text-[14.5px] font-extrabold text-blue-900 dark:text-blue-200">{employee.name}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                {employee.role} • <strong>{employee.employeeCode}</strong> • {employee.department}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 font-semibold">Current Monthly CTC</span>
            <div className="text-[17px] font-extrabold text-slate-900 dark:text-slate-100">
              ₹{oldGrossMonthly.toLocaleString()} <span className="text-[11px] text-slate-500 font-normal">/ mo</span>
            </div>
            <span className="text-[10.5px] text-slate-600">Annual: ₹{oldAnnualCTC.toLocaleString()}</span>
          </div>
        </div>

        {!showLetterPreview ? (
          /* Main Revision Form */
          <form onSubmit={handleSubmitRevision} className="p-5 sm:px-6 flex flex-col gap-[18px]">
            
            {/* Step 1: Choose Revision Type (Hike vs Decrease) */}
            <div>
              <label className="block text-[12.5px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                1. Select Salary Action Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Hike Button */}
                <button
                  type="button"
                  onClick={() => {
                    setRevisionType('hike');
                    setTargetFixedSalary(oldGrossMonthly + 5000);
                  }}
                  className={`flex items-center gap-2.5 p-3 sm:px-4 rounded-xl cursor-pointer transition-all text-left ${
                    revisionType === 'hike'
                      ? 'border-2 border-green-600 bg-green-50/70 text-green-700'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    revisionType === 'hike' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <div className="text-[13.5px] font-extrabold">📈 Salary Hike / Increment</div>
                    <div className="text-[11px] text-slate-500">Appraisal, Promotion, Merit Increase</div>
                  </div>
                </button>

                {/* Decrease Button */}
                <button
                  type="button"
                  onClick={() => {
                    setRevisionType('decrease');
                    setTargetFixedSalary(Math.max(10000, oldGrossMonthly - 5000));
                  }}
                  className={`flex items-center gap-2.5 p-3 sm:px-4 rounded-xl cursor-pointer transition-all text-left ${
                    revisionType === 'decrease'
                      ? 'border-2 border-red-600 bg-red-50/70 text-red-700'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    revisionType === 'decrease' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <TrendingDown size={18} />
                  </div>
                  <div>
                    <div className="text-[13.5px] font-extrabold">📉 Salary Reduction / Deduction</div>
                    <div className="text-[11px] text-slate-500">Role Restructuring, Demotion, PIP Adjust</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Choose Method (Fixed Amount vs Percentage) */}
            <div>
              <label className="block text-[12.5px] font-bold text-slate-700 mb-2">
                2. Revision Calculation Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('fixed')}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border-0 text-[13px] font-bold cursor-pointer transition-all ${
                    mode === 'fixed' ? 'bg-blue-600 text-white shadow-xs' : 'bg-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <DollarSign size={16} /> Direct Amount (e.g. ₹20k ➔ ₹15k or ₹25k)
                </button>

                <button
                  type="button"
                  onClick={() => setMode('percentage')}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border-0 text-[13px] font-bold cursor-pointer transition-all ${
                    mode === 'percentage' ? 'bg-blue-600 text-white shadow-xs' : 'bg-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Percent size={15} /> Percentage Adjust ({isHike ? '+%' : '-%'})
                </button>
              </div>
            </div>

            {/* Step 3: Input Controls */}
            {mode === 'fixed' ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="block text-[12.5px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Monthly Gross CTC (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-slate-500 text-[15px]">₹</span>
                  <input
                    type="number"
                    value={targetFixedSalary}
                    onChange={e => setTargetFixedSalary(Number(e.target.value))}
                    min="1000"
                    step="500"
                    placeholder="Enter revised monthly gross..."
                    className={`w-full py-2.5 pr-3.5 pl-8 rounded-lg text-base font-extrabold text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 transition-colors ${
                      isHike ? 'border-[1.5px] border-green-600 focus:border-green-700' : 'border-[1.5px] border-red-600 focus:border-red-700'
                    }`}
                  />
                </div>

                {/* Quick Fixed Increment/Decrement Chips */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="text-[11.5px] text-slate-500 font-semibold">Quick Shortcuts:</span>
                  {isHike ? (
                    [2000, 5000, 10000, 15000, 20000].map(addAmt => (
                      <button
                        key={addAmt}
                        type="button"
                        onClick={() => setTargetFixedSalary(oldGrossMonthly + addAmt)}
                        className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold cursor-pointer transition-colors ${
                          targetFixedSalary === oldGrossMonthly + addAmt
                            ? 'border-[1.5px] border-green-600 bg-green-100 text-green-700'
                            : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30'
                        }`}
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
                        className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold cursor-pointer transition-colors ${
                          targetFixedSalary === Math.max(1000, oldGrossMonthly - subAmt)
                            ? 'border-[1.5px] border-red-600 bg-red-100 text-red-700'
                            : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                        }`}
                      >
                        -₹{subAmt.toLocaleString()}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
                  {isHike ? 'Hike Percentage (+%)' : 'Reduction Percentage (-%)'}
                </label>
                <div className="flex items-center gap-3.5">
                  <input
                    type="range"
                    min="5"
                    max={isHike ? '100' : '50'}
                    step="5"
                    value={percentageValue}
                    onChange={e => setPercentageValue(Number(e.target.value))}
                    className={`flex-1 ${isHike ? 'accent-green-600' : 'accent-red-600'}`}
                  />
                  <div className={`px-4 py-2 rounded-lg font-extrabold text-[17px] min-w-[75px] text-center ${
                    isHike ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {isHike ? `+${percentageValue}%` : `-${percentageValue}%`}
                  </div>
                </div>

                {/* Quick Percentage Chips */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="text-[11.5px] text-slate-500 font-semibold">Presets:</span>
                  {(isHike ? [10, 15, 20, 25, 30, 40, 50] : [5, 10, 15, 20, 25, 30]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPercentageValue(p)}
                      className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold cursor-pointer transition-colors ${
                        percentageValue === p
                          ? isHike ? 'border-[1.5px] border-green-600 bg-blue-50 text-green-700' : 'border-[1.5px] border-red-600 bg-red-50 text-red-700'
                          : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      {isHike ? `+${p}%` : `-${p}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Live Comparison Box */}
            <div className={`p-4 sm:px-5 rounded-xl border-[1.5px] flex items-center justify-between flex-wrap gap-3 ${
              isHike ? 'bg-green-50/70 border-green-200' : 'bg-red-50/70 border-red-200'
            }`}>
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase">
                  Previous Salary
                </span>
                <div className="text-lg font-extrabold text-slate-800">
                  ₹{oldGrossMonthly.toLocaleString()}
                </div>
                <span className="text-[10.5px] text-slate-500">₹{oldAnnualCTC.toLocaleString()} / yr</span>
              </div>

              <div className={`flex items-center gap-2 ${isHike ? 'text-green-600' : 'text-red-600'}`}>
                <ArrowRight size={18} />
                <span className={`px-2.5 py-1 rounded-full text-[12.5px] font-extrabold border ${
                  isHike ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                  {isHike ? `+₹${diffAmount.toLocaleString()} (+${diffPercentage}%)` : `-₹${diffAmount.toLocaleString()} (-${diffPercentage}%)`}
                </span>
                <ArrowRight size={18} />
              </div>

              <div className="text-right">
                <span className={`text-[11px] font-bold uppercase ${isHike ? 'text-green-700' : 'text-red-700'}`}>
                  {isHike ? 'Revised New CTC' : 'Adjusted New CTC'}
                </span>
                <div className={`text-[22px] font-extrabold ${isHike ? 'text-green-700' : 'text-red-700'}`}>
                  ₹{newGrossMonthly.toLocaleString()}
                </div>
                <span className="text-[10.5px] font-semibold text-slate-600">
                  ₹{newAnnualCTC.toLocaleString()} / yr
                </span>
              </div>
            </div>

            {/* Step 5: Recalculated Breakdown Details */}
            <div className="p-3.5 px-[18px] bg-slate-50 rounded-xl border border-slate-200 text-xs grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
              <div>
                <span className="text-slate-500 block">Basic Pay (50%):</span>
                <span className="font-extrabold text-slate-900 text-[13px]">₹{newBasic.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">HRA (40% Basic):</span>
                <span className="font-extrabold text-slate-900 text-[13px]">₹{newHra.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Allowances:</span>
                <span className="font-extrabold text-slate-900 text-[13px]">₹{newAllowances.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">PF & Tax Ded.:</span>
                <span className="font-extrabold text-red-700 text-[13px]">-₹{totalDeductions.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Net In-Hand / Mo:</span>
                <span className="font-extrabold text-blue-600 text-[13px]">₹{netInHand.toLocaleString()}</span>
              </div>
            </div>

            {/* Step 6: Reason & Effective Date */}
            <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-3.5">
              <div>
                <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
                  {isHike ? 'Appraisal Reason' : 'Adjustment Rationale'}
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 transition-colors"
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
                <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Step 7: HR / Leadership Notes */}
            <div>
              <label className="block text-[12.5px] font-bold text-slate-700 mb-1.5">
                HR & Executive Remarks (Will appear on official letter)
              </label>
              <textarea
                placeholder={isHike
                  ? "e.g. Promoted to Senior Lead based on exceptional Q3 project delivery and leadership excellence."
                  : "e.g. Compensation restructuring aligned with revised role scope as agreed during the performance evaluation."}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={2}
                className="w-full px-3 py-[9px] rounded-lg border border-slate-300 text-[13px] outline-none resize-none font-sans focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Bottom Form Actions */}
            <div className="flex justify-between items-center border-t border-slate-200 pt-4 flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setShowLetterPreview(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-[9px] rounded-lg bg-slate-100 hover:bg-slate-200 text-blue-600 border border-blue-200 text-[12.5px] font-bold cursor-pointer transition-colors"
              >
                <FileCheck size={16} />
                Preview Official Letter
              </button>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-[9px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`inline-flex items-center gap-1.5 px-[22px] py-[9px] rounded-lg border-0 text-white text-[13px] font-bold cursor-pointer transition-colors ${
                    isHike
                      ? 'bg-green-600 hover:bg-green-700 shadow-md shadow-green-600/30'
                      : 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/30'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  {isHike ? 'Apply Salary Hike' : 'Apply Salary Revision'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Official Document Letter Preview (Adaptive: Appraisal vs Revision Notice) */
          <div className="p-6 sm:px-8 flex flex-col gap-4">
            <div className={`border-2 rounded-xl p-6 sm:px-[30px] bg-white dark:bg-slate-900 shadow-md ${
              isHike ? 'border-blue-600' : 'border-amber-500'
            }`}>
              {/* Header Letterhead */}
              <div className={`flex justify-between border-b-2 pb-3.5 mb-[18px] ${
                isHike ? 'border-blue-600' : 'border-amber-500'
              }`}>
                <div>
                  <h2 className="text-lg font-extrabold text-blue-900 m-0 uppercase">
                    {companyInfo.companyName || 'ORGANIZATION'}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5 m-0">
                    {companyInfo.address} • {companyInfo.hrEmail || companyInfo.email}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500">Date: {new Date().toLocaleDateString()}</span>
                  <div className={`text-xs font-bold ${isHike ? 'text-blue-600' : 'text-amber-600'}`}>
                    Ref: {companyInfo.shortName?.slice(0, 3).toUpperCase() || 'EMS'}/{isHike ? 'HR-APPRAISAL' : 'HR-REVISION'}/{employee.employeeCode}
                  </div>
                </div>
              </div>

              {/* Title of Document */}
              <div className="text-center mb-4">
                <h3 className={`inline-block m-0 text-[15px] font-extrabold uppercase tracking-wide border-b-2 pb-1 ${
                  isHike ? 'text-blue-900 border-blue-200' : 'text-red-900 border-red-200'
                }`}>
                  {isHike ? 'Official Appraisal & Salary Increment Letter' : 'Compensation Restructuring & Salary Revision Notice'}
                </h3>
              </div>

              {/* Salutation */}
              <p className="text-[13px] font-bold text-slate-900 mb-2.5 m-0">
                Dear {employee.name},
              </p>

              {/* Body Text */}
              {isHike ? (
                <p className="text-[12.5px] text-slate-700 leading-relaxed mb-3 m-0">
                  We take immense pleasure in informing you that in recognition of your dedicated contributions, professionalism, and performance, the Management has approved a salary increment effective from <strong>{effectiveDate}</strong>.
                </p>
              ) : (
                <p className="text-[12.5px] text-slate-700 leading-relaxed mb-3 m-0">
                  This notice serves as official confirmation that following management review and role alignment, your monthly compensation structure will be adjusted effective from <strong>{effectiveDate}</strong> due to <em>{reason}</em>.
                </p>
              )}

              {/* Revised Salary Table */}
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 mb-4 text-[12.5px]">
                <div className="flex justify-between mb-1.5">
                  <span>Previous Monthly CTC:</span>
                  <span className="font-semibold">₹{oldGrossMonthly.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between mb-1.5 font-bold ${isHike ? 'text-green-600' : 'text-red-600'}`}>
                  <span>{isHike ? 'Increment' : 'Adjustment'}:</span>
                  <span>
                    {isHike ? `+${diffPercentage}% (+₹${diffAmount.toLocaleString()})` : `-${diffPercentage}% (-₹${diffAmount.toLocaleString()})`}
                  </span>
                </div>
                <div className={`flex justify-between border-t border-dashed border-slate-300 pt-1.5 font-extrabold text-sm ${
                  isHike ? 'text-blue-900' : 'text-red-900'
                }`}>
                  <span>Revised Monthly CTC:</span>
                  <span>₹{newGrossMonthly.toLocaleString()} / month</span>
                </div>
                <div className="flex justify-between text-[11.5px] text-slate-500 mt-1">
                  <span>Annualized CTC:</span>
                  <span>₹{newAnnualCTC.toLocaleString()} / annum</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-normal mb-[18px] m-0">
                {remarks || (isHike
                  ? 'We look forward to your continued dedication, leadership, and success as we scale new milestones together.'
                  : 'Should you have any queries regarding your revised compensation schedule, please connect with the HR Directorate.')}
              </p>

              {/* Signature Block */}
              <div className="flex justify-between items-end pt-2.5">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {companyInfo.signatoryTitle || 'Authorized HR Directorate'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {companyInfo.companyName || 'Organization Directorate'}
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded bg-green-100 text-green-700 text-[11px] font-bold">
                  ✅ Digitally Verified & Sealed
                </div>
              </div>
            </div>

            {/* Bottom Preview Actions */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowLetterPreview(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[12.5px] font-semibold cursor-pointer transition-colors"
              >
                ← Back to Config
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrintLetter}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[12.5px] font-semibold cursor-pointer transition-colors"
                >
                  <Printer size={15} /> Print Official Letter
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRevision}
                  className={`inline-flex items-center gap-1.5 px-[18px] py-2 rounded-lg border-0 text-white text-[12.5px] font-bold cursor-pointer transition-colors ${
                    isHike ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
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
