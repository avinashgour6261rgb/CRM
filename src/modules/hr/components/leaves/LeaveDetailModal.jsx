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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Employee & Reviewer Banners */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Applicant Employee Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <div className="employee-avatar" style={{ width: '40px', height: '40px', fontSize: '14px' }}>
              {leave.employeeAvatar ? (
                <img src={leave.employeeAvatar} alt={leave.employeeName} />
              ) : (
                leave.employeeName?.charAt(0) || 'E'
              )}
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                Applicant
              </span>
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                {leave.employeeName}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                {leave.employeeRole}
              </div>
            </div>
          </div>

          {/* Requested Approver Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            backgroundColor: '#eff6ff',
            borderRadius: '10px',
            border: '1px solid #bfdbfe'
          }}>
            <div className="employee-avatar" style={{ width: '40px', height: '40px', fontSize: '14px', background: '#dbeafe', color: '#1d4ed8' }}>
              {leave.appliedToAvatar ? (
                <img src={leave.appliedToAvatar} alt={leave.appliedToName} />
              ) : (
                <UserCheck size={18} />
              )}
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: '700', textTransform: 'uppercase' }}>
                Requested Reviewer
              </span>
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e3a8a' }}>
                {leave.appliedToName || 'HR Admin'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#3b82f6' }}>
                {leave.appliedToRole || 'Administrator'}
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div style={{ padding: '10px 12px', border: '1px solid #f1f5f9', borderRadius: '8px', background: '#fafbfc' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Leave Type
            </div>
            <div style={{ fontWeight: '700', color: '#1e293b', marginTop: '2px', fontSize: '13px' }}>
              {leave.leaveType}
            </div>
          </div>

          <div style={{ padding: '10px 12px', border: '1px solid #f1f5f9', borderRadius: '8px', background: '#fafbfc' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Duration
            </div>
            <div style={{ fontWeight: '700', color: '#1e293b', marginTop: '2px', fontSize: '13px' }}>
              {leave.durationText}
            </div>
          </div>

          <div style={{ padding: '10px 12px', border: '1px solid #f1f5f9', borderRadius: '8px', background: '#fafbfc' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Paid Leave
            </div>
            <div style={{ fontWeight: '700', color: leave.isPaid ? '#16a34a' : '#64748b', marginTop: '2px', fontSize: '13px' }}>
              {leave.isPaid ? 'Yes (Paid)' : 'No (Unpaid)'}
            </div>
          </div>

          <div style={{ padding: '10px 12px', border: '1px solid #f1f5f9', borderRadius: '8px', background: '#fafbfc' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Status
            </div>
            <div style={{ marginTop: '2px' }}>
              <span className={`badge badge-${leave.status}`}>
                {leave.status === 'approved' ? '✓ Approved' : (leave.status === 'rejected' ? '✕ Denied' : '⏳ Pending')}
              </span>
            </div>
          </div>
        </div>

        {/* Date Details */}
        <div style={{
          padding: '10px 14px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#334155'
        }}>
          <Calendar size={16} color="#2563eb" />
          <span>Leave Dates: <strong>{leave.startDate}</strong> {leave.endDate !== leave.startDate ? `to ${leave.endDate}` : ''}</span>
        </div>

        {/* Reason Box */}
        <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
            Applicant's Reason
          </div>
          <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5', margin: 0 }}>
            {leave.reason || 'No specific reason provided.'}
          </p>
        </div>

        {/* Approved Status Banner */}
        {leave.status === 'approved' && (leave.approvedBy || leave.actionBy) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            fontSize: '13px',
            color: '#15803d'
          }}>
            <ShieldCheck size={18} />
            <span>This leave request was <strong>Approved</strong> by <strong>{leave.approvedBy || leave.actionBy}</strong>{leave.actionDateFormatted ? ` on ${leave.actionDateFormatted}` : ''}</span>
          </div>
        )}

        {/* Rejected Status Banner */}
        {leave.status === 'rejected' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            fontSize: '13px',
            color: '#dc2626'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
              <ShieldAlert size={18} />
              <span>Leave Request Denied by {leave.rejectedBy || leave.actionBy || 'Reviewer'}{leave.actionDateFormatted ? ` on ${leave.actionDateFormatted}` : ''}</span>
            </div>
            {leave.rejectionReason && (
              <span style={{ fontSize: '12px', color: '#991b1b', marginLeft: '26px' }}>
                Reason: "{leave.rejectionReason}"
              </span>
            )}
          </div>
        )}

        {/* Deny note input field (if opened) */}
        {showDenyInput && leave.status === 'pending' && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fff1f2',
            borderRadius: '8px',
            border: '1px solid #fecdd3',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#9f1239' }}>
              Reason for Denying this Request (will be shown to employee):
            </label>
            <input
              type="text"
              value={rejectionNote}
              onChange={e => setRejectionNote(e.target.value)}
              placeholder="e.g., Important sprint deliverable, insufficient coverage..."
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #fda4af',
                fontSize: '13px',
                outline: 'none',
                background: '#ffffff'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowDenyInput(false)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                style={{
                  padding: '5px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Confirm Deny
              </button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: canDelete ? 'space-between' : 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          {canDelete && (
            <button
              onClick={handleDelete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#ef4444',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {leave.status === 'pending' && isApplicant && (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}
                >
                  <X size={15} />
                  <span>Deny Request</span>
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '700',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
                  }}
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '700'
                }}
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
