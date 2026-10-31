import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, MessageSquare, Check, Calendar, User, Clock, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';

const ADMIN_CANCEL_PRESETS = [
  'Staffing shortage / critical team coverage required',
  'Urgent client deliverable / sprint deadline approaching',
  'Mutual agreement with employee to reschedule',
  'Employee requested cancellation of this leave',
  'Project milestone meeting scheduled on this date',
  'Leave balance / schedule quota adjustment'
];

const APPLICANT_CANCEL_PRESETS = [
  'Personal plans changed / leave no longer required',
  'Event or trip postponed / rescheduled',
  'Decided to work on sprint milestone instead',
  'Applied by mistake / entered incorrect dates',
  'Family emergency or personal matter resolved'
];

export const CancelLeaveModal = ({ isOpen, onClose, leave, onConfirm, isApplicant = false }) => {
  const [reason, setReason] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setSelectedPreset('');
      setIsSubmitting(false);
    }
  }, [isOpen, leave]);

  if (!isOpen || !leave) return null;

  const presets = isApplicant ? APPLICANT_CANCEL_PRESETS : ADMIN_CANCEL_PRESETS;
  const isApproved = leave.status === 'approved';

  const handleSelectPreset = (preset) => {
    if (selectedPreset === preset) {
      setSelectedPreset('');
      setReason('');
    } else {
      setSelectedPreset(preset);
      setReason(preset);
    }
  };

  const handleConfirm = async () => {
    const finalReason = reason.trim() || selectedPreset || (isApplicant ? 'Cancelled by applicant' : 'Cancelled by administrator / reviewer');
    setIsSubmitting(true);
    try {
      await onConfirm(finalReason);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-[11000] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-[18px] w-full max-w-[520px] shadow-2xl overflow-hidden border border-red-100 dark:border-red-950/80 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-[18px] px-[22px] border-b border-red-100 dark:border-red-950/80 bg-gradient-to-br from-red-50/50 to-red-100/40 dark:from-red-950/40 dark:to-red-900/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800 shadow-xs">
              <AlertTriangle size={21} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-red-900 dark:text-red-200 m-0 tracking-tight">
                {isApproved ? 'Cancel Approved Leave' : 'Cancel Leave Request'}
              </h3>
              <p className="text-xs text-red-700 dark:text-red-400 m-0 mt-0.5 font-medium">
                {isApproved
                  ? 'Specify reason for revoking this approved leave'
                  : 'Specify reason for cancelling this application'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 hover:bg-red-50 dark:hover:bg-slate-700 cursor-pointer w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 px-[22px] flex flex-col gap-3.5">
          {/* Leave Summary Pill Card */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-800/60 dark:to-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 px-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-[26px] h-[26px] rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[11px] font-extrabold">
                  {(leave.employeeName || leave.name || 'E').charAt(0).toUpperCase()}
                </div>
                <span className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100">
                  {leave.employeeName || leave.name || 'Employee'}
                </span>
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400 font-medium">
                  ({leave.employeeCode || leave.employeeId || 'EMP'})
                </span>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isApproved
                    ? 'bg-green-100/60 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800'
                    : 'bg-amber-100/60 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                }`}
              >
                {isApproved ? '● Currently Approved' : '● Pending Review'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Calendar size={13.5} className="text-slate-500 dark:text-slate-400" />
                <span className="font-semibold">{leave.startDate} {leave.endDate && leave.endDate !== leave.startDate ? `to ${leave.endDate}` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={13.5} className="text-slate-500 dark:text-slate-400" />
                <span>{leave.durationText || (leave.durationDays ? `${leave.durationDays} Day(s)` : '1 Day')}</span>
              </div>
              <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900 text-[11px]">
                {leave.leaveType || 'Leave'}
              </span>
            </div>

            {leave.reason && (
              <div className="text-[11.5px] text-slate-500 dark:text-slate-400 italic border-t border-dashed border-slate-300 dark:border-slate-700 pt-1.5 mt-0.5">
                Original Note: "{leave.reason}"
              </div>
            )}
          </div>

          {/* Auto Balance Restoration Notice if Leave was Approved */}
          {isApproved && (
            <div className="flex items-start gap-2.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 p-2.5 px-3.5 rounded-[10px] text-xs text-green-800 dark:text-green-300 leading-relaxed">
              <RotateCcw size={16} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-green-700 dark:text-green-300">Automatic Balance Restoration:</strong> Cancelling this leave will immediately return <strong>{leave.durationDays || 1} day(s)</strong> back to employee's {leave.leaveType || 'leave'} quota and remove scheduled leave tags from attendance.
              </div>
            </div>
          )}

          {/* Quick Preset Reasons Chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles size={13} className="text-rose-600 dark:text-rose-400" /> Quick Reasons (Click to pick):
              </label>
              {selectedPreset && (
                <button
                  type="button"
                  onClick={() => { setSelectedPreset(''); setReason(''); }}
                  className="bg-transparent border-0 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[11px] cursor-pointer underline"
                >
                  Clear choice
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {presets.map(preset => {
                const isSelected = selectedPreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`border px-2.5 py-1.5 rounded-lg text-[11.5px] cursor-pointer text-left transition-all leading-tight ${
                      isSelected
                        ? 'border-red-600 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:border-slate-300'
                    }`}
                  >
                    {isSelected && <Check size={12} className="inline mr-1 align-[-1px]" />}
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Reason Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare size={13.5} className="text-red-600 dark:text-red-400" />
                Cancellation Reason Note <span className="text-red-600">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {reason.length} / 250
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={250}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSelectedPreset('');
              }}
              placeholder={isApplicant
                ? "Describe why you want to cancel this leave application..."
                : "Explain the reason for cancellation (e.g. deliverable deadline moved, team member requested reschedule)..."}
              className="w-full p-2.5 px-3.5 rounded-[10px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none resize-none leading-relaxed focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all font-inherit"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 px-[22px] border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-[18px] py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all disabled:opacity-50"
          >
            Keep Leave
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg border-0 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-[13px] font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-red-600/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <X size={15} />
            <span>{isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelLeaveModal;
