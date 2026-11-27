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
  ShieldCheck,
  Check,
  CreditCard
} from 'lucide-react';
import { useToast } from '../../../shared/context/ToastContext';
import { useHR } from '../../hr/context/HRContext';
import { getCompanySettings } from '../../../shared/services/companySettingsService';
import { getLocalDateString } from '../../../shared/utils/timerUtils';

export const SalaryIncrementModal = ({ isOpen, onClose, employee, currentSalaryData, onSalaryUpdated }) => {
  const { addToast } = useToast();
  const { updateEmployee, currentUser } = useHR();

  const [companyInfo, setCompanyInfo] = useState(getCompanySettings());

  useEffect(() => {
    const updateInfo = () => setCompanyInfo(getCompanySettings());
    window.addEventListener('company-settings-updated', updateInfo);
    return () => window.removeEventListener('company-settings-updated', updateInfo);
  }, []);

  // Revision Type: 'hike' (Increment) vs 'decrease' (Reduction / Deduction)
  const [revisionType, setRevisionType] = useState('hike');
  const [mode, setMode] = useState('fixed'); // 'fixed' | 'percentage'
  const [percentageValue, setPercentageValue] = useState(10);
  const [targetFixedSalary, setTargetFixedSalary] = useState(0);
  const [isDirectSalary, setIsDirectSalary] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(getLocalDateString());
  const [reason, setReason] = useState('Annual Performance Appraisal');
  const [remarks, setRemarks] = useState('');
  const [showLetterPreview, setShowLetterPreview] = useState(false);

  // Baseline current salary
  const oldGrossMonthly = Number(currentSalaryData?.monthlyGross) ||
    Number(currentSalaryData?.basic ? (currentSalaryData.basic + (currentSalaryData.hra || 0) + (currentSalaryData.allowances || 0) + (currentSalaryData.bonus || 0)) : 0) ||
    Number(employee?.startingSalary) ||
    (employee?.annualCTC ? Math.round(Number(employee.annualCTC) / 12) : 45000);

  const oldAnnualCTC = oldGrossMonthly * 12;

  // Initialize target fixed salary when modal opens or employee changes
  useEffect(() => {
    if (employee && isOpen) {
      const curGross = oldGrossMonthly || 35000;
      setTargetFixedSalary(curGross);
      setPercentageValue(10);
      setIsDirectSalary(Boolean(currentSalaryData?.isDirectSalary || employee?.salary?.isDirectSalary));
      setRevisionType('hike');
      setReason('Annual Performance Appraisal');
      setRemarks('');
      setShowLetterPreview(false);
    }
  }, [employee, isOpen, oldGrossMonthly]);

  if (!isOpen || !employee) return null;

  // Calculate new salary & delta
  let newGrossMonthly = oldGrossMonthly;
  let diffAmount = 0;
  let diffPercentage = 0;

  if (mode === 'percentage') {
    diffPercentage = Math.abs(Number(percentageValue)) || 0;
    diffAmount = Math.round((oldGrossMonthly * diffPercentage) / 100);
    newGrossMonthly = revisionType === 'hike'
      ? oldGrossMonthly + diffAmount
      : Math.max(1000, oldGrossMonthly - diffAmount);
  } else {
    // Fixed direct amount mode
    newGrossMonthly = Math.max(1000, Number(targetFixedSalary) || oldGrossMonthly);
    if (newGrossMonthly >= oldGrossMonthly) {
      diffAmount = newGrossMonthly - oldGrossMonthly;
      diffPercentage = oldGrossMonthly > 0 ? Number(((diffAmount / oldGrossMonthly) * 100).toFixed(1)) : 0;
    } else {
      diffAmount = oldGrossMonthly - newGrossMonthly;
      diffPercentage = oldGrossMonthly > 0 ? Number(((diffAmount / oldGrossMonthly) * 100).toFixed(1)) : 0;
    }
  }

  // Auto detect hike vs decrease based on computed values
  const isHike = mode === 'fixed'
    ? (newGrossMonthly >= oldGrossMonthly)
    : (revisionType === 'hike');

  // Direct In-Hand Salary Model (No statutory breakdown, 100% direct agreed package)
  const newBasic = newGrossMonthly;
  const newHra = 0;
  const newAllowances = 0;
  const newPf = 0;
  const newPt = 0;
  const newTds = 0;
  const totalDeductions = 0;
  const netInHand = newGrossMonthly;

  const newAnnualCTC = newGrossMonthly * 12;

  const handleSubmitRevision = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const actualRevisionType = isHike ? 'hike' : 'decrease';

    const updatedSalaryObject = {
      basic: newBasic,
      hra: newHra,
      allowances: newAllowances,
      bonus: 0,
      pf: newPf,
      pt: newPt,
      tds: newTds,
      monthlyGross: newGrossMonthly,
      annualCTC: newAnnualCTC,
      netSalary: netInHand,
      totalDeductions: totalDeductions,
      isDirectSalary: Boolean(isDirectSalary),
      revisionType: actualRevisionType,
      lastRevisionDate: effectiveDate,
      lastRevisionPercentage: isHike ? diffPercentage : -diffPercentage,
      lastRevisionAmount: isHike ? diffAmount : -diffAmount,
      // Backwards compatibility keys
      lastHikeDate: effectiveDate,
      lastHikePercentage: isHike ? diffPercentage : null,
      lastHikeAmount: isHike ? diffAmount : null,
      revisedBy: currentUser?.employeeCode ? `${currentUser.name || 'Administrator'} (${currentUser.employeeCode})` : (currentUser?.name || 'Administrator'),
      revisedById: currentUser?._id,
      revisedByCode: currentUser?.employeeCode,
      revisedAt: new Date().toISOString(),
      reason,
      remarks
    };

    // 1. Sync to localStorage EMS_SALARY_MAP fallback
    try {
      const map = JSON.parse(localStorage.getItem('EMS_SALARY_MAP') || '{}');
      const code = employee.employeeCode || employee._id;
      if (code) {
        map[code] = updatedSalaryObject;
        localStorage.setItem('EMS_SALARY_MAP', JSON.stringify(map));
      }
    } catch (err) {}

    // 2. Notify parent component
    if (onSalaryUpdated) {
      onSalaryUpdated(employee.employeeCode, updatedSalaryObject);
    }

    // 3. Persist permanently to MongoDB Atlas & HR Context
    if (employee?._id && typeof updateEmployee === 'function') {
      updateEmployee(employee._id, {
        ...employee,
        salary: updatedSalaryObject,
        startingSalary: updatedSalaryObject.monthlyGross,
        annualCTC: updatedSalaryObject.annualCTC
      });
    }

    // 4. Dispatch global event for instant reactive sync
    window.dispatchEvent(new CustomEvent('hrms_salary_update', {
      detail: {
        employeeCode: employee.employeeCode,
        salary: updatedSalaryObject
      }
    }));

    if (diffAmount === 0) {
      addToast({
        title: 'Salary Structure Updated ✅',
        message: `${employee.name}'s compensation details updated at ₹${newGrossMonthly.toLocaleString('en-IN')}/mo.`,
        type: 'success'
      });
    } else if (isHike) {
      addToast({
        title: 'Salary Hike Applied Successfully! 📈',
        message: `${employee.name}'s salary increased from ₹${oldGrossMonthly.toLocaleString('en-IN')} to ₹${newGrossMonthly.toLocaleString('en-IN')} (+${diffPercentage}%).`,
        type: 'success'
      });
    } else {
      addToast({
        title: 'Salary Revision Applied! 📉',
        message: `${employee.name}'s salary adjusted from ₹${oldGrossMonthly.toLocaleString('en-IN')} to ₹${newGrossMonthly.toLocaleString('en-IN')} (-${diffPercentage}%).`,
        type: 'warning'
      });
    }

    onClose();
  };

  const handlePrintLetter = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[720px] max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Top Header Bar */}
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center ${
              isHike ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
            }`}>
              {isHike ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            </div>
            <div>
              <h3 className="text-[15.5px] font-extrabold text-slate-900 dark:text-slate-100 m-0">
                Edit & Revise Salary
              </h3>
              <p className="m-0 text-[11.5px] text-slate-500 dark:text-slate-400">
                Easily adjust compensation (Hike 📈 or Reduction 📉) with auto-balanced statutory recalculation.
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
              src={employee.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(employee.name)}`}
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
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Current Monthly Salary</span>
            <div className="text-[17px] font-extrabold text-slate-900 dark:text-slate-100">
              ₹{oldGrossMonthly.toLocaleString('en-IN')} <span className="text-[11px] text-slate-500 font-normal">/ mo</span>
            </div>
            <span className="text-[10.5px] text-slate-600 dark:text-slate-400">Annual CTC: ₹{oldAnnualCTC.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {!showLetterPreview ? (
          /* Main Revision Form */
          <form onSubmit={handleSubmitRevision} className="p-5 sm:px-6 flex flex-col gap-4">
            
            {/* Step 1: Action Selector (Hike vs Decrease) */}
            <div>
              <label className="block text-[12.5px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                1. Salary Action
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Hike Button */}
                <button
                  type="button"
                  onClick={() => {
                    setRevisionType('hike');
                    if (targetFixedSalary < oldGrossMonthly) {
                      setTargetFixedSalary(oldGrossMonthly + 5000);
                    }
                  }}
                  className={`flex items-center gap-2.5 p-3 sm:px-4 rounded-xl cursor-pointer transition-all text-left ${
                    isHike
                      ? 'border-2 border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 shadow-xs'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isHike ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <div className="text-[13px] font-extrabold">📈 Increase / Hike</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Annual appraisal, merit increment, promotion</div>
                  </div>
                </button>

                {/* Decrease Button */}
                <button
                  type="button"
                  onClick={() => {
                    setRevisionType('decrease');
                    if (targetFixedSalary >= oldGrossMonthly) {
                      setTargetFixedSalary(Math.max(1000, oldGrossMonthly - 3000));
                    }
                  }}
                  className={`flex items-center gap-2.5 p-3 sm:px-4 rounded-xl cursor-pointer transition-all text-left ${
                    !isHike
                      ? 'border-2 border-rose-600 bg-rose-50/70 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 shadow-xs'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    !isHike ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}>
                    <TrendingDown size={18} />
                  </div>
                  <div>
                    <div className="text-[13px] font-extrabold">📉 Reduce / Deduct</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Role restructuring, demotion, PIP alignment</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Calculation Mode Toggle (Fixed vs Percentage) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12.5px] font-bold text-slate-700 dark:text-slate-300">
                  2. Adjustment Mode
                </label>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <Check size={13} /> Direct In-Hand Salary (No Statutory Deductions)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('fixed')}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border-0 text-[12.5px] font-bold cursor-pointer transition-all ${
                    mode === 'fixed' ? 'bg-blue-600 text-white shadow-xs' : 'bg-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <DollarSign size={15} /> Exact New Amount (₹)
                </button>

                <button
                  type="button"
                  onClick={() => setMode('percentage')}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border-0 text-[12.5px] font-bold cursor-pointer transition-all ${
                    mode === 'percentage' ? 'bg-blue-600 text-white shadow-xs' : 'bg-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Percent size={14} /> Percentage (+% / -%)
                </button>
              </div>
            </div>

            {/* Step 3: Input Controls */}
            {mode === 'fixed' ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12.5px] font-bold text-slate-700 dark:text-slate-300">
                    Revised Monthly Salary (₹)
                  </label>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Current: <strong>₹{oldGrossMonthly.toLocaleString('en-IN')}</strong>
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-slate-500 text-[16px]">₹</span>
                  <input
                    type="number"
                    value={targetFixedSalary || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setTargetFixedSalary(val);
                      if (val < oldGrossMonthly) {
                        setRevisionType('decrease');
                      } else {
                        setRevisionType('hike');
                      }
                    }}
                    min="1000"
                    step="500"
                    placeholder="Enter revised monthly gross..."
                    className={`w-full py-2.5 pr-3.5 pl-8 rounded-lg text-base font-extrabold text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 transition-colors ${
                      isHike ? 'border-[1.5px] border-emerald-600 focus:border-emerald-700' : 'border-[1.5px] border-rose-600 focus:border-rose-700'
                    }`}
                  />
                </div>

                {/* Quick Shortcuts */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold">Quick Adjust:</span>
                  {/* Reset to current */}
                  <button
                    type="button"
                    onClick={() => setTargetFixedSalary(oldGrossMonthly)}
                    className="px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    title="Reset to current salary"
                  >
                    Current (₹{oldGrossMonthly.toLocaleString('en-IN')})
                  </button>

                  {/* Add presets */}
                  {[2000, 5000, 10000, 15000].map(addAmt => (
                    <button
                      key={addAmt}
                      type="button"
                      onClick={() => {
                        setRevisionType('hike');
                        setTargetFixedSalary(oldGrossMonthly + addAmt);
                      }}
                      className="px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                    >
                      +₹{addAmt.toLocaleString('en-IN')}
                    </button>
                  ))}

                  {/* Deduct presets */}
                  {[2000, 5000, 10000].map(subAmt => (
                    <button
                      key={subAmt}
                      type="button"
                      onClick={() => {
                        setRevisionType('decrease');
                        setTargetFixedSalary(Math.max(1000, oldGrossMonthly - subAmt));
                      }}
                      className="px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                    >
                      -₹{subAmt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="block text-[12.5px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                    className={`flex-1 ${isHike ? 'accent-emerald-600' : 'accent-rose-600'}`}
                  />
                  <div className={`px-4 py-2 rounded-lg font-extrabold text-[16px] min-w-[75px] text-center ${
                    isHike ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  }`}>
                    {isHike ? `+${percentageValue}%` : `-${percentageValue}%`}
                  </div>
                </div>

                {/* Quick Percentage Chips */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold">Presets:</span>
                  {(isHike ? [5, 10, 15, 20, 25, 30, 40] : [5, 10, 15, 20, 25]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPercentageValue(p)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                        percentageValue === p
                          ? isHike ? 'border-[1.5px] border-emerald-600 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'border-[1.5px] border-rose-600 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isHike ? `+${p}%` : `-${p}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Comparison Banner */}
            <div className={`p-4 sm:px-5 rounded-xl border-[1.5px] flex items-center justify-between flex-wrap gap-3 ${
              isHike ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
            }`}>
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Previous Salary
                </span>
                <div className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                  ₹{oldGrossMonthly.toLocaleString('en-IN')}
                </div>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400">₹{oldAnnualCTC.toLocaleString('en-IN')} / yr</span>
              </div>

              <div className={`flex items-center gap-2 ${isHike ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                <ArrowRight size={16} />
                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                  isHike ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' : 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                }`}>
                  {diffAmount === 0
                    ? 'No Change (₹0)'
                    : isHike
                      ? `+₹${diffAmount.toLocaleString('en-IN')} (+${diffPercentage}%)`
                      : `-₹${diffAmount.toLocaleString('en-IN')} (-${diffPercentage}%)`}
                </span>
                <ArrowRight size={16} />
              </div>

              <div className="text-right">
                <span className={`text-[11px] font-bold uppercase ${isHike ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  Revised New Salary
                </span>
                <div className={`text-xl font-extrabold ${isHike ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  ₹{newGrossMonthly.toLocaleString('en-IN')}
                </div>
                <span className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-400">
                  ₹{newAnnualCTC.toLocaleString('en-IN')} / yr
                </span>
              </div>
            </div>

            {/* Step 5: Direct Salary Package Overview */}
            <div className="p-3.5 px-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Revised Monthly Salary:</span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-[13px]">₹{newGrossMonthly.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Revised Annual CTC:</span>
                <span className="font-extrabold text-purple-700 dark:text-purple-300 text-[13px]">₹{newAnnualCTC.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Statutory Deductions:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[12px]">₹0 (Direct In-Hand)</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Monthly Net Take-Home:</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-[14px]">₹{netInHand.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Step 6: Reason & Effective Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[12.5px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Revision Reason
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 transition-colors cursor-pointer"
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
                <label className="block text-[12.5px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Step 7: HR Remarks */}
            <div>
              <label className="block text-[12.5px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                HR Remarks / Notes (Optional)
              </label>
              <textarea
                placeholder={isHike
                  ? "e.g. Promoted to Senior Lead based on exceptional client project delivery."
                  : "e.g. Compensation restructuring aligned with revised role scope."}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs outline-none resize-none font-sans bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Bottom Form Actions */}
            <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-4 flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setShowLetterPreview(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 text-xs font-bold cursor-pointer transition-colors"
              >
                <FileCheck size={15} />
                <span>Preview Letter</span>
              </button>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg border-0 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs ${
                    isHike
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <CheckCircle2 size={15} />
                  <span>{isHike ? 'Apply Salary Increase' : 'Apply Salary Revision'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Official Document Letter Preview */
          <div className="p-6 sm:px-8 flex flex-col gap-4">
            <div className={`border-2 rounded-xl p-6 sm:px-[30px] bg-white dark:bg-slate-900 shadow-md ${
              isHike ? 'border-blue-600' : 'border-amber-500'
            }`}>
              {/* Header Letterhead */}
              <div className={`flex justify-between border-b-2 pb-3.5 mb-4 ${
                isHike ? 'border-blue-600' : 'border-amber-500'
              }`}>
                <div className="flex items-start gap-3">
                  {companyInfo.companyLogo && (
                    <img
                      src={companyInfo.companyLogo}
                      alt={companyInfo.companyName || 'Logo'}
                      className="h-11 max-w-[90px] object-contain rounded border border-slate-200 bg-white p-0.5 shrink-0"
                    />
                  )}
                  <div>
                    <h2 className="text-base font-extrabold text-blue-900 dark:text-blue-300 m-0 uppercase">
                      {companyInfo.companyName || 'ORGANIZATION'}
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 m-0">
                      {[companyInfo.address, companyInfo.hrEmail || companyInfo.email, companyInfo.phone].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500">Date: {new Date().toLocaleDateString('en-IN')}</span>
                  <div className={`text-xs font-bold ${isHike ? 'text-blue-600' : 'text-amber-600'}`}>
                    Ref: {companyInfo.shortName?.slice(0, 3).toUpperCase() || 'EMS'}/{isHike ? 'HR-APPRAISAL' : 'HR-REVISION'}/{employee.employeeCode}
                  </div>
                </div>
              </div>

              {/* Title of Document */}
              <div className="text-center mb-4">
                <h3 className={`inline-block m-0 text-sm font-extrabold uppercase tracking-wide border-b-2 pb-1 ${
                  isHike ? 'text-blue-900 dark:text-blue-300 border-blue-200' : 'text-rose-900 dark:text-rose-300 border-rose-200'
                }`}>
                  {isHike ? 'Official Appraisal & Salary Increment Letter' : 'Compensation Restructuring & Salary Revision Notice'}
                </h3>
              </div>

              {/* Salutation */}
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2 m-0">
                Dear {employee.name},
              </p>

              {/* Body Text */}
              {isHike ? (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-3 m-0">
                  We take immense pleasure in informing you that in recognition of your dedicated contributions and performance, the Management has approved a salary increment effective from <strong>{effectiveDate}</strong>.
                </p>
              ) : (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-3 m-0">
                  This notice serves as official confirmation that following management review and role alignment, your monthly compensation structure will be adjusted effective from <strong>{effectiveDate}</strong> due to <em>{reason}</em>.
                </p>
              )}

              {/* Revised Salary Table */}
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3.5 mb-4 text-xs">
                <div className="flex justify-between mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Previous Monthly Salary:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">₹{oldGrossMonthly.toLocaleString('en-IN')}</span>
                </div>
                <div className={`flex justify-between mb-1.5 font-bold ${isHike ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  <span>{isHike ? 'Increment' : 'Adjustment'}:</span>
                  <span>
                    {diffAmount === 0 ? 'No Change (₹0)' : (isHike ? `+${diffPercentage}% (+₹${diffAmount.toLocaleString('en-IN')})` : `-${diffPercentage}% (-₹${diffAmount.toLocaleString('en-IN')})`)}
                  </span>
                </div>
                <div className={`flex justify-between border-t border-dashed border-slate-300 dark:border-slate-600 pt-1.5 font-extrabold text-[13px] ${
                  isHike ? 'text-blue-900 dark:text-blue-300' : 'text-rose-900 dark:text-rose-300'
                }`}>
                  <span>Revised Monthly Salary:</span>
                  <span>₹{newGrossMonthly.toLocaleString('en-IN')} / month</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Annualized CTC:</span>
                  <span>₹{newAnnualCTC.toLocaleString('en-IN')} / annum</span>
                </div>
              </div>

              <p className="text-[11.5px] text-slate-500 leading-normal mb-4 m-0">
                {remarks || (isHike
                  ? 'We look forward to your continued dedication, leadership, and success as we scale new milestones together.'
                  : 'Should you have any queries regarding your revised compensation schedule, please connect with the HR Directorate.')}
              </p>

              {/* Signature Block */}
              <div className="flex justify-between items-end pt-2">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {companyInfo.signatoryTitle || 'Authorized HR Directorate'}
                  </div>
                  <div className="text-[10.5px] text-slate-500">
                    {companyInfo.companyName || 'Organization Directorate'}
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold">
                  ✅ Digitally Verified & Sealed
                </div>
              </div>
            </div>

            {/* Bottom Preview Actions */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowLetterPreview(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                ← Back to Config
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrintLetter}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Printer size={14} /> Print Letter
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRevision}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-0 text-white text-xs font-bold cursor-pointer transition-colors ${
                    isHike ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <CheckCircle2 size={14} /> Confirm & Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalaryIncrementModal;
