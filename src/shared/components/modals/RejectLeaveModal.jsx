import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, MessageSquare, Check, Calendar, User, Clock } from 'lucide-react';

const PRESET_REASONS = [
  'Critical sprint delivery / project deadline approaching',
  'Staffing shortage / multiple team members on leave',
  'Important client milestone & stakeholder meeting scheduled',
  'Insufficient leave balance for the requested period',
  'Please coordinate with team lead and reschedule dates'
];

export const RejectLeaveModal = ({ isOpen, onClose, leave, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setSelectedPreset('');
    }
  }, [isOpen, leave]);

  if (!isOpen || !leave) return null;

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setReason(preset);
  };

  const handleConfirm = () => {
    const finalReason = reason.trim() || selectedPreset || 'Schedule / staffing requirement';
    onConfirm(finalReason);
    onClose();
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #fecaca'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #fee2e2',
          backgroundColor: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#991b1b', margin: 0 }}>
                Decline Leave Application
              </h3>
              <p style={{ fontSize: '11px', color: '#b91c1c', margin: '2px 0 0 0' }}>
                Provide a clear reason for the employee regarding this decision
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#991b1b',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Leave Summary Card */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={14} color="#64748b" />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                  {leave.employeeName || leave.name || 'Employee'}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  ({leave.employeeCode || leave.employeeId || 'EMP'})
                </span>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                color: '#2563eb'
              }}>
                {leave.leaveType || 'Leave'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11.5px', color: '#475569' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={13} color="#64748b" />
                <span>{leave.startDate} {leave.endDate && leave.endDate !== leave.startDate ? `to ${leave.endDate}` : ''}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={13} color="#64748b" />
                <span>{leave.durationText || (leave.days ? `${leave.days} Day(s)` : 'Full Day')}</span>
              </div>
            </div>

            {leave.reason && (
              <div style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                Applicant Note: "{leave.reason}"
              </div>
            )}
          </div>

          {/* Quick Preset Reasons */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
              ⚡ Quick Reasons (Click to select):
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PRESET_REASONS.map(preset => {
                const isSelected = selectedPreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      border: isSelected ? '1px solid #dc2626' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#fee2e2' : '#ffffff',
                      color: isSelected ? '#991b1b' : '#475569',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: isSelected ? '700' : '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSelected && <Check size={11} style={{ display: 'inline', marginRight: '4px' }} />}
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Reason Textarea */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <MessageSquare size={13} color="#dc2626" />
              Reason for Declining *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSelectedPreset('');
              }}
              placeholder="Enter explanation so the employee understands why the leave was declined..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '12.5px',
                color: '#0f172a',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = '#dc2626'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid #f1f5f9',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 14px',
              borderRadius: '7px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
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
            onClick={handleConfirm}
            style={{
              padding: '7px 16px',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
            }}
          >
            <X size={14} />
            <span>Confirm Rejection</span>
          </button>
        </div>
      </div>
    </div>
  );
};
