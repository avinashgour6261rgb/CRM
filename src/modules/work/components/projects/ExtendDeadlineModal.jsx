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
      zIndex: 1100,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isOverdue ? '#fff1f2' : '#f8fafc',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: isOverdue ? '#fee2e2' : '#eff6ff',
              color: isOverdue ? '#dc2626' : '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${isOverdue ? '#fca5a5' : '#bfdbfe'}`
            }}>
              {isOverdue ? <AlertTriangle size={20} /> : <Calendar size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Extend Project Deadline
              </h3>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                <span style={{ fontWeight: '700', color: '#2563eb' }}>{project.projectCode}</span> — {project.name}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Overdue Alert Banner if overdue */}
          {isOverdue ? (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1.5px solid #f87171',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <AlertTriangle size={18} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '12.5px', color: '#991b1b', lineHeight: '1.5' }}>
                <strong>⚠️ Project is currently OVERDUE!</strong>
                <div>
                  Original deadline passed on <strong>{project.deadline}</strong> ({overdueDays} day{overdueDays > 1 ? 's' : ''} ago). Specify the client-approved extension date and reason below.
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12.5px',
              color: '#1e40af'
            }}>
              <span><strong>Current Deadline:</strong> {currentDeadline}</span>
              {project.hasDeadlineExtended && (
                <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                  Previously Extended {project.extensionCount || 1}x
                </span>
              )}
            </div>
          )}

          {/* New Deadline Selection */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                New Extended Deadline *
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(7)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    fontSize: '10.5px',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  +1 Wk
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(14)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    fontSize: '10.5px',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  +2 Wks
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(30)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    fontSize: '10.5px',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  +1 Mo
                </button>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <Calendar size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="date"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                min={todayStr}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13.5px',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
          </div>

          {/* Reason Category */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Reason Category *
            </label>
            <select
              value={reasonCategory}
              onChange={e => setReasonCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            >
              {REASON_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Reason / Client Explanation Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Detailed Reason & Client Notes *
            </label>
            <textarea
              rows={3}
              value={reasonText}
              onChange={e => setReasonText(e.target.value)}
              placeholder="e.g. Client requested additional payment integration and requested 2 weeks extension for UAT testing..."
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
                resize: 'vertical',
                backgroundColor: '#ffffff',
                fontFamily: 'inherit'
              }}
            />
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
              ℹ️ Reason audit log me permanently record hoga taaki client delivery timeline track ho sake.
            </span>
          </div>

          {/* Extended By Info */}
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '11.5px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>👤 <strong>Extended By:</strong> {currentUser?.name || 'Authorized Member'} ({currentUser?.role || 'Team Member'})</span>
            <span>🕒 {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.35)',
                opacity: submitting ? 0.7 : 1
              }}
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
