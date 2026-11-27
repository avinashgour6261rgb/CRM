import React, { useState } from 'react';
import { X, AlertTriangle, Send, Calendar, FileText, CheckCircle2, Clock, UserCheck, XCircle, ShieldCheck } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { getLocalDateString } from '../../../../shared/utils/timerUtils';

export const SubmitResignationModal = ({ isOpen, onClose }) => {
  const { currentUser: hrUser = null, submitResignation = () => {}, resignations = [] } = useHR() || {};
  const { currentUser: authUser = null } = useAuth() || {};
  const { addToast = () => {} } = useToast() || {};
  const currentUser = authUser || hrUser;

  const today = getLocalDateString();
  // Standard 30 days notice
  const defaultLastDay = getLocalDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  const [formData, setFormData] = useState({
    reason: 'Career Growth / Better Opportunity',
    customReason: '',
    proposedLastWorkingDay: defaultLastDay,
    detailedNotes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [allowNewSubmission, setAllowNewSubmission] = useState(false);

  // Match all resignations for current user
  const userResignations = (resignations || []).filter(r => {
    if (!r) return false;
    const myId = String(currentUser?._id || currentUser?.id || '');
    const myCode = String(currentUser?.employeeCode || '').trim().toUpperCase();
    const rId = String(r.employeeId || '');
    const rCode = String(r.employeeCode || '').trim().toUpperCase();
    return (myId && (rId === myId || rId === String(currentUser?._id) || rId === String(currentUser?.id))) ||
           (myCode && rCode === myCode);
  });

  const latestResignation = [...userResignations].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.submissionDate || 0).getTime();
    const timeB = new Date(b.createdAt || b.submissionDate || 0).getTime();
    return timeB - timeA;
  })[0] || null;

  const existingRelieved = latestResignation?.isRelieved ? latestResignation : null;
  const existingApproved = (!latestResignation?.isRelieved && latestResignation?.status === 'approved') ? latestResignation : null;
  const existingPending = (!latestResignation?.isRelieved && latestResignation?.status === 'pending') ? latestResignation : null;
  const existingRejected = (!latestResignation?.isRelieved && latestResignation?.status === 'rejected') ? latestResignation : null;

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
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              existingApproved
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : existingRelieved
                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                : existingPending
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                : existingRejected && !allowNewSubmission
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
            }`}>
              {existingApproved ? (
                <CheckCircle2 size={18} />
              ) : existingRelieved ? (
                <UserCheck size={18} />
              ) : existingPending ? (
                <Clock size={18} />
              ) : existingRejected && !allowNewSubmission ? (
                <XCircle size={18} />
              ) : (
                <FileText size={18} />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                {existingApproved
                  ? 'Resignation Status — Approved'
                  : existingRelieved
                  ? 'Resignation Status — Relieved'
                  : existingPending
                  ? 'Resignation Status — Under Review'
                  : existingRejected && !allowNewSubmission
                  ? 'Resignation Status — Declined'
                  : 'Submit Resignation Request'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
                {existingApproved
                  ? 'Formal separation approved by Higher Authorities (Executive / HR Directorate)'
                  : existingRelieved
                  ? 'Separation process concluded & record archived'
                  : existingPending
                  ? 'Awaiting approval from Higher Authorities'
                  : existingRejected && !allowNewSubmission
                  ? 'Separation request was declined'
                  : 'Formal separation & higher authority offboarding approval'}
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

        {existingApproved ? (
          <div className="p-5 flex flex-col gap-4">
            {/* Success Hero Alert */}
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 m-0">
                    Resignation Request Accepted & Approved!
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-300">
                    Active Notice Period
                  </span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 m-0 leading-relaxed">
                  Your resignation request has been accepted and approved. Higher Authorities have finalized your separation schedule and active notice period.
                </p>
              </div>
            </div>

            {/* Applicant Profile Snapshot */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                {currentUser?.name?.charAt(0) || 'E'}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100">{currentUser?.name || 'Employee'}</div>
                <div className="text-slate-500 dark:text-slate-400">{currentUser?.role || 'Team Member'} • #{currentUser?.employeeCode || 'EMP-001'}</div>
              </div>
            </div>

            {/* Structured Details Cards */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70 dark:border-slate-700/60">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar size={14} className="text-emerald-600" />
                  <span className="font-semibold">Approved Last Working Day</span>
                </div>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                  {existingApproved.approvedLastWorkingDay || existingApproved.proposedLastWorkingDay || '—'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10.5px] text-slate-400 block mb-0.5">Approved By</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {existingApproved.reviewedByName || 'HR Directorate'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10.5px] text-slate-400 block mb-0.5">Submission Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {existingApproved.submissionDate || today}
                  </span>
                </div>
              </div>

              {existingApproved.reviewRemarks && (
                <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs">
                  <span className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-400 block mb-0.5">
                    Authority Remarks / Review Note:
                  </span>
                  <p className="text-emerald-900 dark:text-emerald-200 italic m-0">
                    "{existingApproved.reviewRemarks}"
                  </p>
                </div>
              )}

              <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">Primary Reason: </span>
                {existingApproved.reason}
              </div>
            </div>

            {/* Handover & Clearance Advice */}
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 rounded-xl flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <strong>Notice Period Handover Checklist:</strong> Please coordinate with your manager and HR to complete your ongoing tasks, handover project responsibilities, and return company assets before your last working day ({existingApproved.approvedLastWorkingDay || existingApproved.proposedLastWorkingDay}).
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        ) : existingRelieved ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
              <UserCheck size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Officially Relieved (Ex-Employee)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              Your formal separation and offboarding process has been concluded. Your employment record has been safely archived in the system.
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 text-left border border-slate-200 dark:border-slate-700">
              <div className="font-semibold mb-1">Status: <span className="text-purple-600 uppercase font-bold">Relieved / Completed</span></div>
              <div>Relieved On: {existingRelieved.relievedDate || existingRelieved.approvedLastWorkingDay || 'Completed'}</div>
              <div>Reviewed By: {existingRelieved.reviewedByName || 'HR / Executive Leadership'}</div>
            </div>
            <button
              onClick={onClose}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : existingPending ? (
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
        ) : existingRejected && !allowNewSubmission ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <XCircle size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Resignation Request Not Approved / Retained
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              Your resignation request submitted on {existingRejected.submissionDate} was declined or leadership requested retention.
            </p>
            {existingRejected.reviewRemarks && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-xs text-rose-700 dark:text-rose-300 text-left border border-rose-200 dark:border-rose-800 mb-4">
                <span className="font-bold">Remarks: </span>"{existingRejected.reviewRemarks}"
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => setAllowNewSubmission(true)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Submit New Request
              </button>
            </div>
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

