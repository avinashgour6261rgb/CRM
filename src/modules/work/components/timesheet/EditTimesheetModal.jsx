/**
 * @file EditTimesheetModal.jsx
 * @description Modal for Admin/HR or assigned employee to adjust logged timesheet hours and audit notes.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../../../hr/components/common/Modal';
import { useWork } from '../../context/WorkContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { Clock, Calendar, User, FileText, CheckCircle2 } from 'lucide-react';

export const EditTimesheetModal = ({ isOpen, onClose, timesheet }) => {
  const { updateTimesheet } = useWork();
  const { addToast } = useToast();

  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [date, setDate] = useState('');
  const [memo, setMemo] = useState('');
  const [status, setStatus] = useState('stopped');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (timesheet) {
      const totalSecs = Number(timesheet.totalDurationSeconds) || 0;
      setHours(Math.floor(totalSecs / 3600));
      setMinutes(Math.floor((totalSecs % 3600) / 60));
      setDate(timesheet.date || '');
      setMemo(timesheet.memo || '');
      setStatus(timesheet.status || 'stopped');
    }
  }, [timesheet]);

  if (!isOpen || !timesheet) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const totalSecs = (Number(hours) * 3600) + (Number(minutes) * 60);
      const totalDurationText = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;

      await updateTimesheet(timesheet._id, {
        totalDurationSeconds: totalSecs,
        totalDurationText,
        date,
        memo,
        status,
        taskId: timesheet.taskId
      });

      addToast('Timesheet entry updated successfully!', 'success');
      onClose();
    } catch (err) {
      addToast('Failed to update timesheet entry', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Timesheet Entry"
      subtitle="Adjust recorded duration, session date, and notes. Task hours will synchronize automatically."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Task & Employee Info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Task:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              [{timesheet.taskCode || 'TSK'}] {timesheet.taskTitle || 'Session'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Employee:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {timesheet.employeeName || 'Team Member'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Project:</span>
            <span className="text-slate-700 dark:text-slate-300">
              {timesheet.projectName || 'General Work'}
            </span>
          </div>
        </div>

        {/* Duration Inputs */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Total Working Duration
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Hours</div>
              <input
                type="number"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                className="filter-input w-full h-10 pl-3 font-mono text-sm"
                required
              />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Minutes</div>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                className="filter-input w-full h-10 pl-3 font-mono text-sm"
                required
              />
            </div>
          </div>
        </div>

        {/* Date & Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Session Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="filter-input w-full h-10 pl-3"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="filter-select w-full h-10"
            >
              <option value="stopped">Logged</option>
              <option value="approved">Approved</option>
              <option value="active">Active (Running)</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Memo / Notes */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Adjustment Reason / Notes
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="e.g. Adjusted manual hours per supervisor approval"
            className="filter-input w-full h-10 pl-3"
          />
        </div>

        <div className="flex justify-end gap-2.5 mt-3">
          <button type="button" onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="btn btn-primary">
            {isSaving ? 'Saving...' : 'Save & Sync'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
