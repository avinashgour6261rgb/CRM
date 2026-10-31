import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, MessageSquare, Check, Calendar, User, Clock } from 'lucide-react';

const PRESET_REASONS = [
  'Critical sprint delivery / project deadline approaching',
  'Staffing shortage / multiple team members on leave',
  'Important client milestone & stakeholder meeting scheduled',
  'Insufficient leave balance for the requested period',
  'Please coordinate with team lead and reschedule dates'
];

export const RejectLeaveModal = ({ isOpen, onClose, leave, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setSelectedPreset('');
    }
  }, [isOpen, leave]);

  if (!isOpen || !leave) return null;

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setReason(preset);
  };

  const handleConfirm = () => {
    const finalReason = reason.trim() || selectedPreset || 'Schedule / staffing requirement';
    onConfirm(finalReason);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-[11000] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[520px] shadow-2xl overflow-hidden border border-red-200 dark:border-red-900/50">
        {/* Header */}
        <div className="px-5 py-4 border-b border-red-100 dark:border-red-950 bg-red-50 dark:bg-red-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-[15px] font-extrabold text-red-800 dark:text-red-200 m-0">
                Decline Leave Application
              </h3>
              <p className="text-[11px] text-red-700 dark:text-red-400 m-0 mt-0.5">
                Provide a clear reason for the employee regarding this decision
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 cursor-pointer p-1 rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-3.5">
          {/* Leave Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-[10px] p-3 px-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-500 dark:text-slate-400" />
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                  {leave.employeeName || leave.name || 'Employee'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  ({leave.employeeCode || leave.employeeId || 'EMP'})
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                {leave.leaveType || 'Leave'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11.5px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-500 dark:text-slate-400" />
                <span>{leave.startDate} {leave.endDate && leave.endDate !== leave.startDate ? `to ${leave.endDate}` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-slate-500 dark:text-slate-400" />
                <span>{leave.durationText || (leave.days ? `${leave.days} Day(s)` : 'Full Day')}</span>
              </div>
            </div>

            {leave.reason && (
              <div className="text-[11.5px] text-slate-500 dark:text-slate-400 italic border-t border-dashed border-slate-200 dark:border-slate-700 pt-1.5">
                Applicant Note: "{leave.reason}"
              </div>
            )}
          </div>

          {/* Quick Preset Reasons */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              ⚡ Quick Reasons (Click to select):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map(preset => {
                const isSelected = selectedPreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`border px-2 py-1 rounded-md text-[11px] cursor-pointer text-left transition-all ${
                      isSelected
                        ? 'border-red-600 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:border-slate-300'
                    }`}
                  >
                    {isSelected && <Check size={11} className="inline mr-1" />}
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Reason Textarea */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
              <MessageSquare size={13} className="text-red-600 dark:text-red-400" />
              Reason for Declining *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSelectedPreset('');
              }}
              placeholder="Enter explanation so the employee understands why the leave was declined..."
              className="w-full p-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[12.5px] text-slate-900 dark:text-slate-100 outline-none resize-y focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-inherit"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[7px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 rounded-[7px] border-0 bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
          >
            <X size={14} />
            <span>Confirm Rejection</span>
          </button>
        </div>
      </div>
    </div>
  );
};
