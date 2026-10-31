/**
 * @file ExtendDeadlineModal.jsx
 * @description Modal for extending a project's deadline with mandatory reason and client audit history.
 */

import React, { useState } from 'react';
import {
  X,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  FileText,
  User,
  History,
  Sparkles
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useToast } from '../../../../shared/context/ToastContext';

const REASON_CATEGORIES = [
  'Client Scope Expansion',
  'Client Requested Timeline Delay',
  'Client Review & Revision Cycle',
  'Third-Party / Dependency Blocker',
  'Testing & Quality Assurance',
  'Resource Allocation & Technical Rework',
  'Other Reason'
];

export const ExtendDeadlineModal = ({ isOpen, onClose, project, onSuccess }) => {
  const { updateProject } = useWork();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getFutureDateStr = (days = 14) => {
    const base = (project?.deadline && new Date(project.deadline) > new Date()) ? new Date(project.deadline) : new Date();
    base.setDate(base.getDate() + days);
    return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
  };

  const [newDeadline, setNewDeadline] = useState(() => getFutureDateStr(14));
  const [reasonCategory, setReasonCategory] = useState(REASON_CATEGORIES[0]);
  const [reasonText, setReasonText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !project) return null;

  const todayStr = getTodayStr();
  const currentDeadline = project.deadline || 'No deadline';
  const isOverdue = project.deadline && !project.hasNoDeadline && project.deadline < todayStr;
  const overdueDays = isOverdue
    ? Math.max(1, Math.ceil((new Date(todayStr) - new Date(project.deadline)) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleQuickAdd = (days) => {
    setNewDeadline(getFutureDateStr(days));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!newDeadline) {
      addToast('Please select a new deadline date', 'error');
      return;
    }

    if (newDeadline <= (project.deadline || todayStr) && !isOverdue) {
      addToast('New deadline must be after the current deadline', 'warning');
      return;
    }

    if (!reasonText.trim()) {
      addToast('Please provide a reason / client explanation for extending deadline', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const extensionRecord = {
        _id: `ext_${Date.now()}`,
        previousDeadline: project.deadline || 'None',
        newDeadline: newDeadline,
        reasonCategory: reasonCategory,
        reason: reasonText.trim(),
        extendedBy: currentUser?._id || currentUser?.id || 'emp',
        extendedByName: currentUser?.name || 'Authorized Member',
        extendedByRole: currentUser?.role || 'Team Member',
        extendedAt: new Date().toISOString()
      };

      const updatedExtensions = [
        extensionRecord,
        ...(Array.isArray(project.deadlineExtensions) ? project.deadlineExtensions : [])
      ];

      const updated = await updateProject(project._id, {
        deadline: newDeadline,
        hasNoDeadline: false,
        hasDeadlineExtended: true,
        extensionCount: (project.extensionCount || 0) + 1,
        deadlineExtensions: updatedExtensions
      });

      addToast(`Deadline for "${project.name}" extended to ${newDeadline}! Reason recorded.`, 'success');
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Failed to extend deadline. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[4px] flex items-center justify-center z-[1100] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[560px] max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-t-2xl ${
          isOverdue ? 'bg-red-50 dark:bg-red-950/40' : 'bg-slate-50 dark:bg-slate-800/50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isOverdue 
                ? 'bg-red-100 text-red-600 border-red-300 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800' 
                : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800'
            }`}>
              {isOverdue ? <AlertTriangle size={20} /> : <Calendar size={20} />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white m-0">
                Extend Project Deadline
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-bold text-blue-600 dark:text-blue-400">{project.projectCode}</span> — {project.name}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-[18px]">
          {/* Overdue Alert Banner if overdue */}
          {isOverdue ? (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-900 rounded-xl p-3 px-3.5 flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="text-[12.5px] text-red-800 dark:text-red-300 leading-relaxed">
                <strong>⚠️ Project is currently OVERDUE!</strong>
                <div>
                  Original deadline passed on <strong>{project.deadline}</strong> ({overdueDays} day{overdueDays > 1 ? 's' : ''} ago). Specify the client-approved extension date and reason below.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-2.5 px-3.5 flex items-center justify-between text-[12.5px] text-blue-800 dark:text-blue-300">
              <span><strong>Current Deadline:</strong> {currentDeadline}</span>
              {project.hasDeadlineExtended && (
                <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
                  Previously Extended {project.extensionCount || 1}x
                </span>
              )}
            </div>
          )}

          {/* New Deadline Selection */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                New Extended Deadline *
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickAdd(7)}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  +1 Wk
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(14)}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  +2 Wks
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(30)}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  +1 Mo
                </button>
              </div>
            </div>

            <div className="relative">
              <Calendar size={16} className="text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="date"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                min={todayStr}
                required
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[13.5px] text-slate-900 dark:text-white outline-none bg-white dark:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Reason Category */}
          <div>
            <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason Category *
            </label>
            <select
              value={reasonCategory}
              onChange={e => setReasonCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] text-slate-900 dark:text-white outline-none bg-white dark:bg-slate-800 cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {REASON_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Reason / Client Explanation Notes */}
          <div>
            <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Detailed Reason & Client Notes *
            </label>
            <textarea
              rows={3}
              value={reasonText}
              onChange={e => setReasonText(e.target.value)}
              placeholder="e.g. Client requested additional payment integration and requested 2 weeks extension for UAT testing..."
              required
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] text-slate-900 dark:text-white outline-none resize-y bg-white dark:bg-slate-800 font-sans focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              ℹ️ Reason audit log me permanently record hoga taaki client delivery timeline track ho sake.
            </span>
          </div>

          {/* Extended By Info */}
          <div className="p-2 px-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-[11.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>👤 <strong>Extended By:</strong> {currentUser?.name || 'Authorized Member'} ({currentUser?.role || 'Team Member'})</span>
            <span>🕒 {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 mt-1.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[13px] font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-[18px] py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={15} />
              {submitting ? 'Extending Deadline...' : 'Save & Extend Deadline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExtendDeadlineModal;
