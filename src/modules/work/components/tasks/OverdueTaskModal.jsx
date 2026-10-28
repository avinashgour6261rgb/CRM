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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #fed7aa',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header Banner */}
        <div style={{
          backgroundColor: '#fff7ed',
          borderBottom: '1px solid #ffedd5',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#fed7aa',
              color: '#c2410c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#9a3412',
                  backgroundColor: '#ffedd5',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>
                  {task.taskCode || 'TASK'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#ea580c' }}>
                  ⚠️ Deadline Expired
                </span>
              </div>
              <h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: '800', color: '#431407' }}>
                Overdue Task Timer Restriction
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9a3412',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px' }}>
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '12px 14px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
              {task.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11.5px', color: '#64748b' }}>
              <span>Project: <strong style={{ color: '#334155' }}>{task.projectName || 'General Work'}</strong></span>
              <span>Due Date: <strong style={{ color: '#dc2626' }}>{task.dueDate || 'Passed'} (Expired)</strong></span>
            </div>
          </div>

          <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', margin: '0 0 16px' }}>
            This task has passed its designated deadline. To maintain clean project timelines and prevent unmonitored time drift, please choose an action below before tracking time:
          </p>

          {/* Action Choice 1: Quick Extension */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.02em' }}>
              Option 1: Extend Task Deadline & Start Timer
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickExtend(1)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
              >
                <Calendar size={13} color="#2563eb" />
                <span>+1 Day</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickExtend(3)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
              >
                <Calendar size={13} color="#2563eb" />
                <span>+3 Days</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickExtend(7)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
              >
                <Calendar size={13} color="#2563eb" />
                <span>+1 Week</span>
              </button>
            </div>

            {/* Custom Date Picker */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  flex: 1,
                  height: '32px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                disabled={!customDate || submitting}
                onClick={handleCustomExtend}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: !customDate ? '#e2e8f0' : '#2563eb',
                  color: !customDate ? '#94a3b8' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: !customDate || submitting ? 'not-allowed' : 'pointer'
                }}
              >
                Apply Date
              </button>
            </div>
          </div>

          {/* Option 2 & 3: Complete Task or Continue */}
          <div style={{
            borderTop: '1px solid #f1f5f9',
            paddingTop: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <button
              type="button"
              disabled={submitting}
              onClick={handleCompleteTask}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #86efac',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                fontSize: '12.5px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              <CheckCircle2 size={15} />
              <span>Mark Task as Completed</span>
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '6px 0'
                }}
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
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#c2410c',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline'
                }}
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
