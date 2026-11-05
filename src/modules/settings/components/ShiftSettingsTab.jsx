import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldAlert,
  Coffee,
  Utensils,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Building2,
  Info,
  Sliders,
  History
} from 'lucide-react';
import {
  getCompanySettings,
  saveCompanySettings,
  fetchCompanySettingsFromDB
} from '../../../shared/services/companySettingsService';
import { useToast } from '../../../shared/context/ToastContext';

export const ShiftSettingsTab = ({ onNavigateTab }) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState(getCompanySettings());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    fetchCompanySettingsFromDB().then(data => {
      if (data) setFormData(data);
    });
    const handleUpdate = () => setFormData(getCompanySettings());
    window.addEventListener('company-settings-updated', handleUpdate);
    return () => window.removeEventListener('company-settings-updated', handleUpdate);
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const applyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      shiftStartTime: preset.shiftStartTime,
      shiftEndTime: preset.shiftEndTime,
      standardWorkHours: preset.standardWorkHours,
      gracePeriodMinutes: preset.gracePeriodMinutes,
      halfDayThresholdHours: preset.halfDayThresholdHours,
      lunchDurationMinutes: preset.lunchDurationMinutes,
      teaBreakMinutes: preset.teaBreakMinutes
    }));
    setIsSaved(false);
    addToast({
      title: 'Shift Preset Loaded',
      message: `Preset "${preset.name}" loaded into form. Click "Save Shift Policy" to apply.`,
      type: 'info'
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveCompanySettings(formData);
    setIsSaved(true);
    addToast({
      title: 'Shift Policy Saved! ⏱️',
      message: `Universal shift (${formData.shiftStartTime} - ${formData.shiftEndTime}) saved and enforced across attendance and employee records.`,
      type: 'success'
    });
  };

  // Helper calculation for visual timeline
  const gracePeriod = Number(formData.gracePeriodMinutes) || 15;
  const halfDayHours = Number(formData.halfDayThresholdHours) || 4.5;
  const lunchMins = Number(formData.lunchDurationMinutes) || 45;
  const teaMins = Number(formData.teaBreakMinutes) || 15;
  const workHours = Number(formData.standardWorkHours) || 9;

  return (
    <div className="flex flex-col gap-5 py-3">
      {/* ── Sub Navigation Switcher ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Clock size={16} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 m-0">
              Work Shift & Timing Policy
            </h2>
            <p className="text-[11.5px] text-slate-600 dark:text-slate-400 m-0 mt-0.5">
              Universal office hours, late grace margins, half-day cutoffs, and official break rules.
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('company')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold cursor-pointer transition-colors shrink-0 shadow-xs"
          >
            <Building2 size={13} className="text-blue-500" />
            <span>Switch to Company Profile & Branding</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* ── Presets Bar ── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1 mr-1">
          <Sliders size={13} className="text-blue-500" />
          <span>Quick Presets:</span>
        </span>
        {[
          {
            name: 'Standard Day (09:30 AM - 06:30 PM)',
            shiftStartTime: '09:30 AM',
            shiftEndTime: '06:30 PM',
            standardWorkHours: 9,
            gracePeriodMinutes: 15,
            halfDayThresholdHours: 4.5,
            lunchDurationMinutes: 45,
            teaBreakMinutes: 15
          },
          {
            name: 'Morning Shift (08:30 AM - 05:30 PM)',
            shiftStartTime: '08:30 AM',
            shiftEndTime: '05:30 PM',
            standardWorkHours: 9,
            gracePeriodMinutes: 15,
            halfDayThresholdHours: 4.5,
            lunchDurationMinutes: 45,
            teaBreakMinutes: 15
          },
          {
            name: '8-Hour General (10:00 AM - 06:00 PM)',
            shiftStartTime: '10:00 AM',
            shiftEndTime: '06:00 PM',
            standardWorkHours: 8,
            gracePeriodMinutes: 10,
            halfDayThresholdHours: 4,
            lunchDurationMinutes: 40,
            teaBreakMinutes: 15
          },
          {
            name: 'Late Shift (12:00 PM - 09:00 PM)',
            shiftStartTime: '12:00 PM',
            shiftEndTime: '09:00 PM',
            standardWorkHours: 9,
            gracePeriodMinutes: 15,
            halfDayThresholdHours: 4.5,
            lunchDurationMinutes: 45,
            teaBreakMinutes: 15
          }
        ].map(preset => (
          <button
            key={preset.name}
            type="button"
            onClick={() => applyPreset(preset)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* ── Main Form Grid ── */}
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        
        {/* Section 1: Office Shift Schedule */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Clock size={16} className="text-blue-600" />
            <div>
              <h3 className="text-[13.5px] font-extrabold text-slate-900 dark:text-slate-100 m-0">
                1. Standard Daily Shift Timings
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0">
                The primary office shift assigned automatically to all newly created employees.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Shift Start Time *
              </label>
              <input
                type="text"
                value={formData.shiftStartTime || '09:30 AM'}
                onChange={e => handleChange('shiftStartTime', e.target.value)}
                placeholder="09:30 AM"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:border-blue-500 transition-colors shadow-xs"
              />
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 block">
                Official check-in starting time.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Shift End Time *
              </label>
              <input
                type="text"
                value={formData.shiftEndTime || '06:30 PM'}
                onChange={e => handleChange('shiftEndTime', e.target.value)}
                placeholder="06:30 PM"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:border-blue-500 transition-colors shadow-xs"
              />
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 block">
                Official shift completion time.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Standard Daily Work Hours
              </label>
              <input
                type="number"
                min="4"
                max="16"
                step="0.5"
                value={formData.standardWorkHours || 9}
                onChange={e => handleChange('standardWorkHours', Number(e.target.value) || 9)}
                placeholder="9"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:border-blue-500 transition-colors shadow-xs"
              />
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 block">
                Expected working duration (e.g. 9 hrs).
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Working Days Policy Description
            </label>
            <input
              type="text"
              value={formData.workDaysDescription || 'Monday - Saturday (Sunday Weekly Off)'}
              onChange={e => handleChange('workDaysDescription', e.target.value)}
              placeholder="e.g. Monday - Saturday (Sunday Weekly Off)"
              className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:border-blue-500 transition-colors"
            />
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 block">
              Displayed in employee shift card and employment handbook.
            </span>
          </div>
        </div>

        {/* Section 2: Punctuality, Late Grace & Half-Day Rules */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <ShieldAlert size={16} className="text-amber-500" />
            <div>
              <h3 className="text-[13.5px] font-extrabold text-slate-900 dark:text-slate-100 m-0">
                2. Attendance & Punctuality Rules
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0">
                Define buffer limits for late arrivals, half-day triggers, and overtime eligibility.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Late Arrival Grace Period (Minutes)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={formData.gracePeriodMinutes ?? 15}
                  onChange={e => handleChange('gracePeriodMinutes', Number(e.target.value) || 0)}
                  placeholder="15"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:border-blue-500 transition-colors shadow-xs"
                />
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md mt-1.5 leading-snug">
                Clock-in up to <strong>+{gracePeriod} mins</strong> after {formData.shiftStartTime} is allowed. Clock-ins after that are marked <strong>Late</strong> in attendance.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Half-Day Minimum Threshold (Hours)
              </label>
              <input
                type="number"
                min="2"
                max="8"
                step="0.5"
                value={formData.halfDayThresholdHours ?? 4.5}
                onChange={e => handleChange('halfDayThresholdHours', Number(e.target.value) || 4.5)}
                placeholder="4.5"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:border-blue-500 transition-colors shadow-xs"
              />
              <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-md mt-1.5 leading-snug">
                Employees logging less than <strong>{halfDayHours} hours</strong> of total active work in a day are registered as <strong>Half Day</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Min. Overtime Qualifying (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                step="5"
                value={formData.minOvertimeMinutes ?? 30}
                onChange={e => handleChange('minOvertimeMinutes', Number(e.target.value) || 0)}
                placeholder="30"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:border-blue-500 transition-colors shadow-xs"
              />
              <p className="text-[11px] text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 p-2 rounded-md mt-1.5 leading-snug">
                Extra duty completed <strong>{formData.minOvertimeMinutes || 30}+ mins</strong> past {formData.shiftEndTime} qualifies for Overtime (OT).
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Official Shift Break Allowances */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Coffee size={16} className="text-emerald-600" />
            <div>
              <h3 className="text-[13.5px] font-extrabold text-slate-900 dark:text-slate-100 m-0">
                3. Official Shift Break Allowances
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0">
                Standard allocated break limits. When an employee takes a break, the timer tracks against these durations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Utensils size={15} className="text-emerald-600" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Lunch Break Allocation
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="15"
                  max="90"
                  step="5"
                  value={formData.lunchDurationMinutes ?? 45}
                  onChange={e => handleChange('lunchDurationMinutes', Number(e.target.value) || 45)}
                  className="w-24 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:border-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Minutes</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Standard midday lunch window ({lunchMins} mins). Timer alerts employee when nearing limit.
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Coffee size={15} className="text-amber-600" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Tea / Refreshment Break Allocation
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="45"
                  step="5"
                  value={formData.teaBreakMinutes ?? 15}
                  onChange={e => handleChange('teaBreakMinutes', Number(e.target.value) || 15)}
                  className="w-24 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none focus:border-amber-500"
                />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Minutes</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Short break allocation ({teaMins} mins) for quick refreshment pauses.
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Live Visual Policy Timeline */}
        <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-300">
                Live Shift Policy Blueprint
              </span>
            </div>
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {formData.workDaysDescription || 'Mon - Sat'}
            </span>
          </div>

          {/* Visual Step Timeline */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Start Shift</span>
              <span className="text-xs sm:text-[13px] font-extrabold text-emerald-400 mt-0.5">
                {formData.shiftStartTime || '09:30 AM'}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Clock-in opens</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Grace Limit</span>
              <span className="text-xs sm:text-[13px] font-extrabold text-amber-400 mt-0.5">
                +{gracePeriod} mins
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Past is marked Late</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Official Breaks</span>
              <span className="text-xs sm:text-[13px] font-extrabold text-sky-400 mt-0.5">
                {lunchMins}m + {teaMins}m
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Lunch & Tea</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Half-Day Cutoff</span>
              <span className="text-xs sm:text-[13px] font-extrabold text-purple-400 mt-0.5">
                {halfDayHours} Hours
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Min. full day duty</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Shift End</span>
              <span className="text-xs sm:text-[13px] font-extrabold text-blue-400 mt-0.5">
                {formData.shiftEndTime || '06:30 PM'}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Total {workHours}h work</span>
            </div>
          </div>
        </div>

        {/* ── Save Button ── */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info size={14} className="text-blue-500" />
            <span>Policy changes update auto-calculated metrics across Attendance, Timer, and Dashboard.</span>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border-0 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold cursor-pointer shadow-md shadow-blue-600/30 transition-all hover:shadow-lg active:scale-[0.99]"
          >
            <CheckCircle2 size={16} />
            <span>Save Shift Policy</span>
          </button>
        </div>

      </form>
    </div>
  );
};

