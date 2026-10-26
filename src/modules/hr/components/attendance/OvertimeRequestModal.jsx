import React, { useState, useMemo } from 'react';
import { X, Clock, CheckCircle2, AlertTriangle, ShieldCheck, Briefcase, FileText, Send, User } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { isHRorAdmin } from '../../../../shared/utils/permissionUtils';

export const OvertimeRequestModal = ({
  isOpen,
  onClose,
  currentUser,
  workSeconds = 0,
  standardWorkHours = 9,
  shiftStartTime = '10:00 AM',
  shiftEndTime = '07:00 PM',
  todayTasks = [],
  employees = [],
  onConfirmClockOut,
  addToast
}) => {
  if (!isOpen) return null;

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const standardWorkSeconds = standardWorkHours * 3600;
  const overtimeSeconds = Math.max(0, workSeconds - standardWorkSeconds);
  const overtimeHours = +(overtimeSeconds / 3600).toFixed(2);
  const overtimeHoursInt = Math.floor(overtimeSeconds / 3600);
  const overtimeMinsInt = Math.floor((overtimeSeconds % 3600) / 60);

  const workHoursInt = Math.floor(workSeconds / 3600);
  const workMinsInt = Math.floor((workSeconds % 3600) / 60);

  const isAdminUser = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.role === 'Administrator' || isHRorAdmin(currentUser);

  // Eligible approvers (Admin / HR)
  const eligibleApprovers = useMemo(() => {
    return (employees || []).filter(e => {
      const isSelf = String(e._id) === String(currentUser?._id) || (e.employeeCode && e.employeeCode === currentUser?.employeeCode);
      const isPrivileged = e.systemRole === 'admin' || e.systemRole === 'hr' || e.role?.toLowerCase().includes('admin') || e.role?.toLowerCase().includes('hr') || e.department === 'Human Resources';
      return isPrivileged && !isSelf;
    });
  }, [employees, currentUser]);

  const defaultApproverId = eligibleApprovers[0]?._id || '';

  const [selectedApproverId, setSelectedApproverId] = useState(defaultApproverId);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate task time worked today
  const tasksWorkedList = useMemo(() => {
    return (todayTasks || []).filter(t => {
      const secs = Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0;
      return secs > 0 && t.sessionDate === todayStr;
    });
  }, [todayTasks, todayStr]);

  const totalTaskSeconds = tasksWorkedList.reduce((acc, t) => acc + (Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0), 0);
  const totalTaskHoursInt = Math.floor(totalTaskSeconds / 3600);
  const totalTaskMinsInt = Math.floor((totalTaskSeconds % 3600) / 60);

  const formatSecs = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const handleSubmit = async (isSelfApprove = false) => {
    if (!reason.trim() && !isSelfApprove) {
      if (addToast) addToast('Please enter a brief note or reason for overtime work', 'warning');
      return;
    }

    const chosenApprover = eligibleApprovers.find(a => String(a._id) === String(selectedApproverId));

    setIsSubmitting(true);
    try {
      await hrService.requestOvertime({
        employeeId: currentUser?._id || currentUser?.employeeCode,
        employeeCode: currentUser?.employeeCode || '',
        employeeName: currentUser?.name || 'Employee',
        date: todayStr,
        shiftHours: +(workSeconds / 3600).toFixed(2),
        overtimeHours,
        overtimeSeconds,
        overtimeReason: reason.trim() || (isSelfApprove ? 'Admin self-confirmed overtime work session' : 'Completed scheduled deliverables'),
        overtimeTasks: tasksWorkedList.map(t => ({
          taskId: t._id || t.id,
          taskCode: t.taskCode,
          title: t.title,
          seconds: Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0,
          durationText: formatSecs(Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0)
        })),
        requestedToId: chosenApprover?._id || '',
        requestedToName: chosenApprover?.name || (isSelfApprove ? (currentUser?.name || 'Admin') : 'HR Directorate'),
        isSelfApproved: isSelfApprove
      });

      if (addToast) {
        if (isSelfApprove) {
          addToast(`⚡ Overtime of ${overtimeHoursInt}h ${overtimeMinsInt}m self-confirmed & officially logged!`, 'success');
        } else {
          addToast(`📨 Overtime request of ${overtimeHoursInt}h ${overtimeMinsInt}m sent to ${chosenApprover?.name || 'Approver'}!`, 'success');
        }
      }

      onClose();
      if (onConfirmClockOut) onConfirmClockOut();
    } catch (err) {
      console.error('Error submitting overtime request:', err);
      if (addToast) addToast('Failed to record overtime request. Clocking out shift.', 'error');
      onClose();
      if (onConfirmClockOut) onConfirmClockOut();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipOvertime = () => {
    onClose();
    if (onConfirmClockOut) onConfirmClockOut();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        animation: 'modalSlideUp 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                Overtime Detected & Clock Out
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Shift exceeded standard {standardWorkHours}h ({shiftStartTime} - {shiftEndTime})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Dual Metrics Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Shift Duration
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#15803d' }}>
                  {workHoursInt}h {workMinsInt}m
                </span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#15803d', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                  +{overtimeHoursInt}h {overtimeMinsInt}m extra
                </span>
              </div>
            </div>

            <div style={{
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Productive Task Time
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#2563eb' }}>
                  {totalTaskHoursInt}h {totalTaskMinsInt}m
                </span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
                  ({tasksWorkedList.length} task{tasksWorkedList.length === 1 ? '' : 's'})
                </span>
              </div>
            </div>
          </div>

          {/* Tasks Worked Breakdown */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Briefcase size={14} color="#64748b" />
              <span>Tasks Worked Today:</span>
            </div>
            {tasksWorkedList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                {tasksWorkedList.map((t, idx) => {
                  const secs = Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0;
                  return (
                    <div key={t._id || idx} style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span style={{ backgroundColor: '#e2e8f0', color: '#334155', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>
                          {t.taskCode || 'TSK'}
                        </span>
                        <span style={{ color: '#0f172a', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.title}
                        </span>
                      </div>
                      <span style={{ color: '#0284c7', fontWeight: '700', flexShrink: 0, marginLeft: '8px' }}>
                        {formatSecs(secs)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', fontSize: '11.5px', color: '#64748b' }}>
                No active tasks logged today. Working hours will be submitted for overtime review.
              </div>
            )}
          </div>

          {/* Admin Authority Banner or Approver Picker */}
          {isAdminUser ? (
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#fefce8',
              border: '1px solid #fef08a',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <ShieldCheck size={18} color="#ca8a04" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '12.5px', color: '#854d0e', display: 'block' }}>
                  Admin Direct Authority
                </strong>
                <span style={{ fontSize: '11.5px', color: '#a16207' }}>
                  As an Administrator, you can self-confirm your extra working hours directly, or choose to skip claiming overtime.
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Submit Request To Approver:
              </label>
              {eligibleApprovers.length > 0 ? (
                <select
                  value={selectedApproverId}
                  onChange={(e) => setSelectedApproverId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                >
                  {eligibleApprovers.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({a.role || 'HR / Admin'})
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                  Request will be routed to HR Administrator by default.
                </div>
              )}
            </div>
          )}

          {/* Reason / Deliverables Textarea */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Work Accomplished & Overtime Reason:
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Worked on completing client bug fixes and database indexing past shift end..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                color: '#0f172a',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <button
            type="button"
            onClick={handleSkipOvertime}
            disabled={isSubmitting}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#64748b',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Clock out immediately without claiming extra overtime"
          >
            Clock Out Without Claim
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAdminUser ? (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  backgroundImage: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                }}
              >
                <CheckCircle2 size={15} />
                <span>Self-Confirm & Clock Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ea580c',
                  backgroundImage: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)'
                }}
              >
                <Send size={14} />
                <span>Submit & Clock Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
