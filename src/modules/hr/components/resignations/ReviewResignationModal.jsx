import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, UserCheck, ShieldAlert, Calendar, FileText, AlertCircle } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useToast } from '../../../../shared/context/ToastContext';

export const ReviewResignationModal = ({ isOpen, onClose, resignation = null }) => {
  const { currentUser: hrUser, reviewResignation } = useHR();
  const { currentUser: authUser } = useAuth();
  const { addToast } = useToast();
  const currentUser = authUser || hrUser;

  const today = new Date().toISOString().split('T')[0];

  const [decision, setDecision] = useState('approved'); // 'approved' | 'rejected' | 'relieved'
  const [approvedLastDay, setApprovedLastDay] = useState(resignation?.proposedLastWorkingDay || today);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !resignation) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isRelievedAction = decision === 'relieved';
      const statusValue = isRelievedAction ? 'approved' : decision;

      await reviewResignation(resignation.id, {
        status: statusValue,
        approvedLastWorkingDay: approvedLastDay || resignation.proposedLastWorkingDay,
        reviewRemarks: remarks.trim() || (isRelievedAction ? 'Employee relieved & archived as ex-employee' : `Resignation ${decision}`),
        reviewedBy: String(currentUser?._id || currentUser?.id || 'admin'),
        reviewedByName: currentUser?.name || 'Executive Leadership',
        isRelieved: isRelievedAction,
        employeeId: resignation.employeeId,
        employeeCode: resignation.employeeCode
      });

      if (isRelievedAction) {
        addToast(`Employee ${resignation.employeeName} has been officially relieved. Archived safely in database as Ex-Employee.`, 'success');
      } else {
        addToast(`Resignation ${statusValue} successfully for ${resignation.employeeName}.`, 'success');
      }
      onClose();
    } catch (err) {
      // toast in HRContext
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
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                Review Resignation Request
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
                Higher Authority Offboarding & Archival Decision
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

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Employee Info Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base">
                {resignation.employeeName?.charAt(0) || 'E'}
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {resignation.employeeName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {resignation.role} • {resignation.department} • #{resignation.employeeCode}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Applied on: {resignation.submissionDate}
                </div>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
              resignation.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' :
              resignation.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' :
              'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
            }`}>
              {resignation.isRelieved ? 'Relieved (Archived)' : resignation.status}
            </span>
          </div>

          {/* Reason & Proposal details */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700/50 text-xs">
            <div className="text-slate-500 dark:text-slate-400 mb-0.5">Stated Reason:</div>
            <div className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{resignation.reason}</div>
            <div className="text-slate-500 dark:text-slate-400 mb-0.5">Proposed Last Day:</div>
            <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">{resignation.proposedLastWorkingDay}</div>
            {resignation.detailedNotes && (
              <>
                <div className="text-slate-500 dark:text-slate-400 mb-0.5">Applicant Notes:</div>
                <div className="text-slate-700 dark:text-slate-300 italic">{resignation.detailedNotes}</div>
              </>
            )}
          </div>

          {/* Authority Decision Radio Group */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Authority Action *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecision('approved')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors flex flex-col items-center gap-1 ${
                  decision === 'approved'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 size={16} />
                <span>Approve Notice</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('rejected')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors flex flex-col items-center gap-1 ${
                  decision === 'rejected'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <XCircle size={16} />
                <span>Reject & Retain</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('relieved')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors flex flex-col items-center gap-1 ${
                  decision === 'relieved'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <UserCheck size={16} />
                <span>Relieve & Archive</span>
              </button>
            </div>
          </div>

          {/* If Approved or Relieved, allow setting/verifying official last working day */}
          {(decision === 'approved' || decision === 'relieved') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Approved Official Last Working Day *</span>
                {decision === 'relieved' && <span className="text-purple-600 font-bold text-[11px]">Marks employee as Relieved</span>}
              </label>
              <input
                type="date"
                required
                value={approvedLastDay}
                onChange={e => setApprovedLastDay(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500"
              />
            </div>
          )}

          {decision === 'relieved' && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 rounded-xl text-xs text-purple-800 dark:text-purple-300">
              ⚡ <strong>Ex-Employee Archival Rule:</strong> Clicking confirm will transition this employee's status in MongoDB to <code>'resigned'</code>. Their historical work logs, tasks, and attendances are permanently retained in database, but their birthdays and work anniversaries will automatically stop appearing across public boards.
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Authority Remarks / Exit Clearance Note
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Clearance verified, asset hand-over approved, or retention discussion summary..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 resize-none"
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
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 ${
                decision === 'rejected' ? 'bg-rose-600 hover:bg-rose-700' :
                decision === 'relieved' ? 'bg-purple-600 hover:bg-purple-700' :
                'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {submitting ? 'Updating...' : decision === 'relieved' ? 'Confirm Relieved & Archive' : decision === 'approved' ? 'Approve Separation' : 'Reject Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

