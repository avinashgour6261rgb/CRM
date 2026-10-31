import React, { useState } from 'react';
import { X, AlertTriangle, Send, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useToast } from '../../../../shared/context/ToastContext';

export const SubmitResignationModal = ({ isOpen, onClose }) => {
  const { currentUser: hrUser, submitResignation, resignations } = useHR();
  const { currentUser: authUser } = useAuth();
  const { addToast } = useToast();
  const currentUser = authUser || hrUser;

  const today = new Date().toISOString().split('T')[0];
  // Standard 30 days notice
  const defaultLastDay = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    reason: 'Career Growth / Better Opportunity',
    customReason: '',
    proposedLastWorkingDay: defaultLastDay,
    detailedNotes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Check if current user already has a pending resignation
  const existingPending = (resignations || []).find(r =>
    (String(r.employeeId) === String(currentUser?._id || currentUser?.id) ||
     String(r.employeeCode).toUpperCase() === String(currentUser?.employeeCode || '').toUpperCase()) &&
    r.status === 'pending'
  );

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.proposedLastWorkingDay) {
      addToast('Please specify your proposed last working day.', 'warning');
      return;
    }
    if (formData.proposedLastWorkingDay < today) {
      addToast('Proposed last working day cannot be in the past.', 'warning');
      return;
    }

    const finalReason = formData.reason === 'Other' && formData.customReason.trim()
      ? formData.customReason.trim()
      : formData.reason;

    setSubmitting(true);
    try {
      await submitResignation({
        employeeId: String(currentUser?._id || currentUser?.id || `emp_${Date.now()}`),
        employeeCode: currentUser?.employeeCode || 'EMP-001',
        employeeName: currentUser?.name || 'Employee',
        employeeAvatar: currentUser?.avatar || '',
        role: currentUser?.role || 'Team Member',
        department: currentUser?.department || 'General',
        reason: finalReason,
        detailedNotes: formData.detailedNotes.trim(),
        submissionDate: today,
        proposedLastWorkingDay: formData.proposedLastWorkingDay
      });
      onClose();
    } catch (err) {
      // toast handled in HRContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                Submit Resignation Request
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
                Formal separation & higher authority offboarding approval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {existingPending ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Resignation Already Under Review
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              You submitted a resignation request on <strong>{existingPending.submissionDate}</strong> with proposed last working day <strong>{existingPending.proposedLastWorkingDay}</strong>. It is currently awaiting approval from Higher Authorities (HR / Admin Directorate).
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 text-left border border-slate-200 dark:border-slate-700">
              <div className="font-semibold mb-1">Status: <span className="text-amber-600 uppercase font-bold">Pending Review</span></div>
              <div>Reason: {existingPending.reason}</div>
            </div>
            <button
              onClick={onClose}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {/* Warning Note */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                Submitting this request will notify HR and Executive Leadership. Once approved and relieved, your record will be archived as an ex-employee, and work anniversary celebrations will be concluded.
              </div>
            </div>

            {/* Applicant Profile Snapshot */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                {currentUser?.name?.charAt(0) || 'E'}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100">{currentUser?.name || 'Employee'}</div>
                <div className="text-slate-500 dark:text-slate-400">{currentUser?.role || 'Team Member'} • #{currentUser?.employeeCode || 'EMP-001'}</div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Primary Reason for Separation *
              </label>
              <select
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-rose-500"
              >
                <option value="Career Growth / Better Opportunity">Career Growth / Better Opportunity</option>
                <option value="Relocation / Geographical Move">Relocation / Geographical Move</option>
                <option value="Personal / Health Reasons">Personal / Health Reasons</option>
                <option value="Higher Studies / Professional Certification">Higher Studies / Professional Certification</option>
                <option value="Entrepreneurship / Starting Venture">Entrepreneurship / Starting Venture</option>
                <option value="Compensation / Package">Compensation / Package</option>
                <option value="Other">Other Reason (Specify below)</option>
              </select>
            </div>

            {formData.reason === 'Other' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Specify Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Please state specific reason..."
                  value={formData.customReason}
                  onChange={e => setFormData({ ...formData, customReason: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-rose-500"
                />
              </div>
            )}

            {/* Proposed Last Working Day */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Proposed Last Working Day *</span>
                <span className="text-[11px] text-slate-400 font-normal">Min. 30 days notice recommended</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={today}
                  required
                  value={formData.proposedLastWorkingDay}
                  onChange={e => setFormData({ ...formData, proposedLastWorkingDay: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Detailed Notes / Handover Proposal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Handover Plan & Official Notes
              </label>
              <textarea
                rows={3}
                placeholder="Briefly state ongoing tasks, project handover proposals, or notes for the leadership..."
                value={formData.detailedNotes}
                onChange={e => setFormData({ ...formData, detailedNotes: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-rose-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors disabled:opacity-50"
              >
                <Send size={13} />
                {submitting ? 'Submitting...' : 'Submit to Authority'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

