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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 11000,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(220, 38, 38, 0.1)',
          overflow: 'hidden',
          border: '1px solid #fee2e2',
          animation: 'fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid #fee2e2',
            background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #fecaca',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.12)'
              }}
            >
              <AlertTriangle size={21} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#991b1b', margin: 0, letterSpacing: '-0.01em' }}>
                {isApproved ? 'Cancel Approved Leave' : 'Cancel Leave Request'}
              </h3>
              <p style={{ fontSize: '12px', color: '#b91c1c', margin: '3px 0 0 0', fontWeight: '500' }}>
                {isApproved
                  ? 'Specify reason for revoking this approved leave'
                  : 'Specify reason for cancelling this application'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: '#ffffff',
              border: '1px solid #fecaca',
              color: '#991b1b',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Leave Summary Pill Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '800'
                  }}
                >
                  {(leave.employeeName || leave.name || 'E').charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                  {leave.employeeName || leave.name || 'Employee'}
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500' }}>
                  ({leave.employeeCode || leave.employeeId || 'EMP'})
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 9px',
                  borderRadius: '20px',
                  backgroundColor: isApproved ? '#dcfce7' : '#fef3c7',
                  color: isApproved ? '#15803d' : '#b45309',
                  border: isApproved ? '1px solid #bbf7d0' : '1px solid #fde68a'
                }}
              >
                {isApproved ? '● Currently Approved' : '● Pending Review'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#475569', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={13.5} color="#64748b" />
                <span style={{ fontWeight: '600' }}>{leave.startDate} {leave.endDate && leave.endDate !== leave.startDate ? `to ${leave.endDate}` : ''}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13.5} color="#64748b" />
                <span>{leave.durationText || (leave.durationDays ? `${leave.durationDays} Day(s)` : '1 Day')}</span>
              </div>
              <span
                style={{
                  color: '#2563eb',
                  fontWeight: '700',
                  backgroundColor: '#eff6ff',
                  padding: '1px 8px',
                  borderRadius: '6px',
                  border: '1px solid #dbeafe',
                  fontSize: '11px'
                }}
              >
                {leave.leaveType || 'Leave'}
              </span>
            </div>

            {leave.reason && (
              <div style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', borderTop: '1px dashed #cbd5e1', paddingTop: '7px', marginTop: '2px' }}>
                Original Note: "{leave.reason}"
              </div>
            )}
          </div>

          {/* Auto Balance Restoration Notice if Leave was Approved */}
          {isApproved && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#166534',
                lineHeight: '1.45'
              }}
            >
              <RotateCcw size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#15803d' }}>Automatic Balance Restoration:</strong> Cancelling this leave will immediately return <strong>{leave.durationDays || 1} day(s)</strong> back to employee's {leave.leaveType || 'leave'} quota and remove scheduled leave tags from attendance.
              </div>
            </div>
          )}

          {/* Quick Preset Reasons Chips */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={13} color="#e11d48" /> Quick Reasons (Click to pick):
              </label>
              {selectedPreset && (
                <button
                  type="button"
                  onClick={() => { setSelectedPreset(''); setReason(''); }}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear choice
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {presets.map(preset => {
                const isSelected = selectedPreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      border: isSelected ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#fee2e2' : '#ffffff',
                      color: isSelected ? '#991b1b' : '#334155',
                      padding: '5px 11px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: isSelected ? '700' : '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 1px 3px rgba(220, 38, 38, 0.15)' : 'none',
                      lineHeight: '1.3'
                    }}
                  >
                    {isSelected && <Check size={12} style={{ display: 'inline', marginRight: '5px', verticalAlign: '-1px' }} />}
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Reason Input */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={13.5} color="#dc2626" />
                Cancellation Reason Note <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
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
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                lineHeight: '1.45',
                backgroundColor: '#ffffff'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#dc2626';
                e.target.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Keep Leave
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 3px 10px rgba(220, 38, 38, 0.28)',
              opacity: isSubmitting ? 0.7 : 1,
              transition: 'all 0.15s ease'
            }}
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
