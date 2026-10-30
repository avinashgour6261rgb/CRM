import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useHR } from '../../context/HRContext';
import { useConfirm } from '../../../../shared/context/ConfirmContext';
import { Check, X, Trash2, Calendar, Clock, User, ShieldCheck, ShieldAlert, UserCheck } from 'lucide-react';
import { canApproveLeaves, isHRorAdmin, isAdmin, canCancelLeave, canReviewLeave, isLeaveApplicant, isLeaveDesignatedApprover } from '../../../../shared/utils/permissionUtils';
import { CancelLeaveModal } from '../../../../shared/components/modals/CancelLeaveModal';

export const LeaveDetailModal = ({ leave, isOpen, onClose }) => {
  const { updateLeaveStatus, deleteLeave, currentUser } = useHR();
  const { confirm } = useConfirm();
  const [rejectionNote, setRejectionNote] = useState('');
  const [showDenyInput, setShowDenyInput] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  if (!leave) return null;

  const isApplicant = isLeaveApplicant(leave, currentUser);
  const isDesignatedApprover = isLeaveDesignatedApprover(leave, currentUser);
  const canApprove = canReviewLeave(leave, currentUser);
  const canCancel = canCancelLeave(leave, currentUser);
  const canDelete = isAdmin(currentUser);

  const handleApprove = async () => {
    await updateLeaveStatus(leave._id, 'approved');
    onClose();
  };

  const handleReject = async () => {
    await updateLeaveStatus(leave._id, 'rejected', rejectionNote.trim() || 'Schedule requirement / workload priority');
    onClose();
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete Leave Record',
      message: 'Are you sure you want to delete this leave record? This action cannot be undone.',
      confirmText: 'Delete Record',
      variant: 'danger'
    });
    if (ok) {
      await deleteLeave(leave._id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Leave Application Details"
      subtitle={`Reference ID: ${leave._id}`}
    >
      <div className="flex flex-col gap-4">
        {/* Employee & Reviewer Banners */}
        <div className="grid grid-cols-2 gap-3">
          {/* Applicant Employee Banner */}
          <div className="flex items-center gap-3 p-3 px-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="employee-avatar w-10 h-10 text-sm">
              {leave.employeeAvatar ? (
                <img src={leave.employeeAvatar} alt={leave.employeeName} />
              ) : (
                leave.employeeName?.charAt(0) || 'E'
              )}
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold uppercase">
                Applicant
              </span>
              <div className="font-bold text-sm text-slate-900">
                {leave.employeeName}
              </div>
              <div className="text-[11.5px] text-slate-500">
                {leave.employeeRole}
              </div>
            </div>
          </div>

          {/* Requested Approver Banner */}
          <div className="flex items-center gap-3 p-3 px-3.5 bg-blue-50 rounded-xl border border-blue-200">
            <div className="employee-avatar w-10 h-10 text-sm bg-blue-100 text-blue-700">
              {leave.appliedToAvatar ? (
                <img src={leave.appliedToAvatar} alt={leave.appliedToName} />
              ) : (
                <UserCheck size={18} />
              )}
            </div>
            <div>
              <span className="text-[11px] text-blue-700 font-bold uppercase">
                Requested Reviewer
              </span>
              <div className="font-bold text-sm text-blue-900">
                {leave.appliedToName || 'HR Admin'}
              </div>
              <div className="text-[11.5px] text-blue-500">
                {leave.appliedToRole || 'Administrator'}
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-4 gap-2.5">
          <div className="py-2.5 px-3 border border-slate-100 rounded-lg bg-slate-50/70">
            <div className="text-[11px] text-slate-500 font-semibold uppercase">
              Leave Type
            </div>
            <div className="font-bold text-slate-800 mt-0.5 text-[13px]">
              {leave.leaveType}
            </div>
          </div>

          <div className="py-2.5 px-3 border border-slate-100 rounded-lg bg-slate-50/70">
            <div className="text-[11px] text-slate-500 font-semibold uppercase">
              Duration
            </div>
            <div className="font-bold text-slate-800 mt-0.5 text-[13px]">
              {leave.durationText}
            </div>
          </div>

          <div className="py-2.5 px-3 border border-slate-100 rounded-lg bg-slate-50/70">
            <div className="text-[11px] text-slate-500 font-semibold uppercase">
              Paid Leave
            </div>
            <div className={`font-bold mt-0.5 text-[13px] ${leave.isPaid ? 'text-green-600' : 'text-slate-500'}`}>
              {leave.isPaid ? 'Yes (Paid)' : 'No (Unpaid)'}
            </div>
          </div>

          <div className="py-2.5 px-3 border border-slate-100 rounded-lg bg-slate-50/70">
            <div className="text-[11px] text-slate-500 font-semibold uppercase">
              Status
            </div>
            <div className="mt-0.5">
              <span className={`badge badge-${leave.status}`}>
                {leave.status === 'approved' ? '✓ Approved' : (leave.status === 'rejected' ? '✕ Denied' : '⏳ Pending')}
              </span>
            </div>
          </div>
        </div>

        {/* Date Details */}
        <div className="py-2.5 px-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2 text-[13px] text-slate-700">
          <Calendar size={16} color="#2563eb" />
          <span>Leave Dates: <strong>{leave.startDate}</strong> {leave.endDate !== leave.startDate ? `to ${leave.endDate}` : ''}</span>
        </div>

        {/* Reason Box */}
        <div className="p-3 px-3.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-[11px] text-slate-500 font-bold uppercase mb-1">
            Applicant's Reason
          </div>
          <p className="text-[13px] text-slate-700 leading-normal m-0">
            {leave.reason || 'No specific reason provided.'}
          </p>
        </div>

        {/* Approved Status Banner */}
        {leave.status === 'approved' && (leave.approvedBy || leave.actionBy) && (
          <div className="flex items-center gap-2 py-2.5 px-3.5 rounded-lg bg-green-50 border border-green-200 text-[13px] text-green-700">
            <ShieldCheck size={18} />
            <span>This leave request was <strong>Approved</strong> by <strong>{leave.approvedBy || leave.actionBy}</strong>{leave.actionDateFormatted ? ` on ${leave.actionDateFormatted}` : ''}</span>
          </div>
        )}

        {/* Rejected Status Banner */}
        {leave.status === 'rejected' && (
          <div className="flex flex-col gap-1 py-2.5 px-3.5 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-600">
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert size={18} />
              <span>Leave Request Denied by {leave.rejectedBy || leave.actionBy || 'Reviewer'}{leave.actionDateFormatted ? ` on ${leave.actionDateFormatted}` : ''}</span>
            </div>
            {leave.rejectionReason && (
              <span className="text-xs text-red-800 ml-[26px]">
                Reason: "{leave.rejectionReason}"
              </span>
            )}
          </div>
        )}

        {/* Deny note input field (if opened) */}
        {showDenyInput && leave.status === 'pending' && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-900/50 flex flex-col gap-2">
            <label className="text-xs font-bold text-rose-800 dark:text-rose-300">
              Reason for Denying this Request (will be shown to employee):
            </label>
            <input
              type="text"
              value={rejectionNote}
              onChange={e => setRejectionNote(e.target.value)}
              placeholder="e.g., Important sprint deliverable, insufficient coverage..."
              className="py-2 px-2.5 rounded-md border border-rose-300 dark:border-rose-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDenyInput(false)}
                className="py-1 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="py-1 px-3.5 rounded-md border-0 bg-red-600 text-white text-xs font-bold cursor-pointer hover:bg-red-700"
              >
                Confirm Deny
              </button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className={`flex items-center ${canDelete ? 'justify-between' : 'justify-end'} border-t border-slate-200 pt-4`}>
          {canDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-red-500 bg-transparent border-0 cursor-pointer text-[13px] font-semibold hover:text-red-700"
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          )}

          <div className="flex gap-2">
            {leave.status === 'pending' && isApplicant && (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-red-100 text-red-600 border border-red-200 cursor-pointer text-[13px] font-semibold hover:bg-red-200"
              >
                <Trash2 size={15} />
                <span>Cancel Application</span>
              </button>
            )}

            {leave.status === 'pending' && canApprove && !showDenyInput && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDenyInput(true)}
                  className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-red-100 text-red-600 border border-red-200 cursor-pointer text-[13px] font-bold hover:bg-red-200"
                >
                  <X size={15} />
                  <span>Deny Request</span>
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="flex items-center gap-1.5 py-2 px-[18px] rounded-lg bg-green-600 text-white border-0 cursor-pointer text-[13px] font-bold shadow-[0_2px_6px_rgba(22,163,74,0.3)] hover:bg-green-700"
                >
                  <Check size={15} />
                  <span>Accept Leave</span>
                </button>
              </>
            )}
            {leave.status === 'approved' && canCancel && (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-red-100 text-red-600 border border-red-200 cursor-pointer text-[13px] font-bold hover:bg-red-200"
                title="Cancel / Revoke Approved Leave"
              >
                <X size={15} />
                <span>Cancel Approved Leave</span>
              </button>
            )}

            <button onClick={onClose} className="btn btn-outline">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Modern Cancel Leave Modal */}
      <CancelLeaveModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        leave={leave}
        isApplicant={isApplicant}
        onConfirm={async (reason) => {
          await updateLeaveStatus(leave._id, 'cancelled', reason);
          setIsCancelModalOpen(false);
          onClose();
        }}
      />
    </Modal>
  );
};

export default LeaveDetailModal;
