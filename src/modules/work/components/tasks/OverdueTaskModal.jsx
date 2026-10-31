/**
 * @file OverdueTaskModal.jsx
 * @description Enterprise modal prompting users/admins when an expired/overdue task timer is accessed.
 * Allows quick deadline extensions (+1d, +3d, +7d, custom date), marking completed, or tracking confirmation.
 */

import React, { useState } from 'react';
import { AlertTriangle, Calendar, Clock, CheckCircle2, Play, X, ArrowRight } from 'lucide-react';
import { useToast } from '../../../../shared/context/ToastContext';

export const OverdueTaskModal = ({
  task,
  onClose,
  onExtend,
  onComplete,
  onContinueAnyway
}) => {
  if (!task) return null;

  const [customDate, setCustomDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const handleQuickExtend = async (days) => {
    setSubmitting(true);
    try {
      await onExtend(task._id, days);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomExtend = async () => {
    if (!customDate) return;
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      if (customDate < today) {
        addToast('Please choose a future date for the new deadline.', 'warning');
        return;
      }
      // Calculate diff in days
      const diffMs = new Date(customDate).getTime() - new Date().getTime();
      const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      await onExtend(task._id, diffDays);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
    setSubmitting(true);
    try {
      await onComplete(task._id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[4px] flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[520px] shadow-2xl border border-orange-200 dark:border-orange-900/50 overflow-hidden animate-fadeIn">
        {/* Header Banner */}
        <div className="bg-orange-50 dark:bg-orange-950/40 border-b border-orange-100 dark:border-orange-900/60 p-4 sm:px-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-200 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 flex items-center justify-center shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold text-orange-800 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/60 px-1.5 py-[1px] rounded uppercase">
                  {task.taskCode || 'TASK'}
                </span>
                <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
                  ⚠️ Deadline Expired
                </span>
              </div>
              <h3 className="m-0 mt-1 text-sm sm:text-base font-extrabold text-orange-950 dark:text-orange-200">
                Overdue Task Timer Restriction
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-transparent border-none text-orange-800 dark:text-orange-300 hover:text-orange-950 dark:hover:text-white cursor-pointer p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5">
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 p-3 px-3.5 mb-4">
            <div className="text-[13px] font-bold text-slate-900 dark:text-white mb-1">
              {task.title}
            </div>
            <div className="flex items-center gap-4 text-[11.5px] text-slate-500 dark:text-slate-400">
              <span>Project: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{task.projectName || 'General Work'}</strong></span>
              <span>Due Date: <strong className="text-red-600 dark:text-red-400 font-semibold">{task.dueDate || 'Passed'} (Expired)</strong></span>
            </div>
          </div>

          <p className="text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed mb-4 mt-0">
            This task has passed its designated deadline. To maintain clean project timelines and prevent unmonitored time drift, please choose an action below before tracking time:
          </p>

          {/* Action Choice 1: Quick Extension */}
          <div className="mb-4">
            <label className="block text-[11.5px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Option 1: Extend Task Deadline & Start Timer
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickExtend(1)}
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-50"
              >
                <Calendar size={13} className="text-blue-600 dark:text-blue-400" />
                <span>+1 Day</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickExtend(3)}
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-50"
              >
                <Calendar size={13} className="text-blue-600 dark:text-blue-400" />
                <span>+3 Days</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickExtend(7)}
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-50"
              >
                <Calendar size={13} className="text-blue-600 dark:text-blue-400" />
                <span>+1 Week</span>
              </button>
            </div>

            {/* Custom Date Picker */}
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 text-xs outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500"
              />
              <button
                type="button"
                disabled={!customDate || submitting}
                onClick={handleCustomExtend}
                className="h-8 px-3 rounded-md border-none bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                Apply Date
              </button>
            </div>
          </div>

          {/* Option 2 & 3: Complete Task or Continue */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5 flex flex-col gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={handleCompleteTask}
              className="w-full py-2 px-3 rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 text-[12.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>Mark Task as Completed</span>
            </button>

            <div className="flex justify-between items-center mt-1">
              <button
                type="button"
                onClick={onClose}
                className="bg-transparent border-none text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs cursor-pointer py-1.5 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  onContinueAnyway(task._id);
                  onClose();
                }}
                className="bg-transparent border-none text-orange-700 hover:text-orange-800 dark:text-orange-400 text-[11.5px] font-bold cursor-pointer underline transition-colors disabled:opacity-50"
                title="Continue tracking on overdue task without deadline change"
              >
                Continue Tracking Anyway →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
