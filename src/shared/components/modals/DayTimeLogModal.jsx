/**
 * @file DayTimeLogModal.jsx
 * @description Modal showing granular daily login, logout, break, task activity, and timestamped audit logs for any day (Mon-Sun).
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  Calendar,
  Coffee,
  CheckCircle2,
  LogIn,
  LogOut,
  Zap,
  ListTodo,
  Briefcase,
  ShieldAlert,
  Utensils,
  AlertTriangle,
  History,
  User,
  Play,
  Pause,
  Palmtree,
  Home
} from 'lucide-react';
import { getCollection, KEYS } from '../../services/storageService';

export const DayTimeLogModal = ({ dayLog, onClose }) => {
  if (!dayLog) return null;

  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'tasks'

  const tasksWorked = dayLog.tasksWorked || [];

  // Load audit trail logs scoped to this specific date and employee
  const dayAudits = useMemo(() => {
    try {
      const allAudits = getCollection(KEYS.ATTENDANCE_AUDIT) || [];
      const targetEmpId = dayLog.employeeId ? String(dayLog.employeeId) : null;
      const targetEmpCode = dayLog.employeeCode ? String(dayLog.employeeCode) : null;
      const targetEmpName = dayLog.employeeName ? String(dayLog.employeeName).toLowerCase().trim() : null;

      return allAudits
        .filter(a => {
          if (a.date !== dayLog.date) return false;
          // Scope to target employee when available
          if (targetEmpId || targetEmpCode || targetEmpName) {
            const matchesId = targetEmpId && (String(a.employeeId) === targetEmpId || String(a.actorId) === targetEmpId);
            const matchesCode = targetEmpCode && (String(a.employeeCode) === targetEmpCode || String(a.employeeId) === targetEmpCode);
            const matchesName = targetEmpName && (String(a.employeeName || a.actorName).toLowerCase().trim() === targetEmpName);
            return matchesId || matchesCode || matchesName;
          }
          return true;
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (e) {
      return [];
    }
  }, [dayLog.date, dayLog.employeeId, dayLog.employeeCode, dayLog.employeeName]);

  // If no formal audit entries exist in storage yet, synthesize a clear timeline from dayLog
  const effectiveAudits = useMemo(() => {
    if (dayAudits.length > 0) return dayAudits;

    const synth = [];
    const empName = dayLog.employeeName || 'Employee';

    // 1. Clock In event
    if (dayLog.loginTime && dayLog.loginTime !== '--' && dayLog.loginTime !== 'Not Clocked In') {
      synth.push({
        _id: 'synth-clock-in',
        type: 'clock_in',
        timeFormatted: dayLog.loginTime,
        timestamp: new Date().toISOString(),
        details: `Shift Clock In recorded at ${dayLog.loginTime}`,
        actorName: empName
      });
    }

    // 2. Break event
    if (dayLog.breakDuration && dayLog.breakDuration !== '0m' && dayLog.breakDuration !== '0s') {
      synth.push({
        _id: 'synth-break',
        type: 'tea_break_start',
        timeFormatted: 'During Shift',
        durationText: dayLog.breakDuration,
        timestamp: new Date().toISOString(),
        details: `Breaks recorded (${dayLog.breakDuration} total duration)`,
        actorName: empName
      });
    }

    // 3. Tasks Worked
    (tasksWorked || []).forEach((t, i) => {
      if (t.isCompleted || t.status === 'completed') {
        synth.push({
          _id: `synth-task-done-${i}`,
          type: 'task_completed',
          timeFormatted: 'Today',
          durationText: t.durationText,
          timestamp: new Date().toISOString(),
          details: `Completed task #${t.taskCode || 'TSK'}: ${t.taskTitle} (${t.projectName || 'General'})`,
          actorName: empName
        });
      } else if (t.timerRunning || t.status === 'in_progress') {
        synth.push({
          _id: `synth-task-running-${i}`,
          type: 'task_timer_start',
          timeFormatted: 'Active Now',
          durationText: t.durationText,
          timestamp: new Date().toISOString(),
          details: `Working on task #${t.taskCode || 'TSK'}: ${t.taskTitle} (Timer Running)`,
          actorName: empName
        });
      }
    });

    // 4. Clock Out event
    if (dayLog.logoutTime && dayLog.logoutTime !== '--' && dayLog.logoutTime !== 'In Progress' && dayLog.logoutTime !== 'Active (In Progress)') {
      synth.push({
        _id: 'synth-clock-out',
        type: 'clock_out',
        timeFormatted: dayLog.logoutTime,
        durationText: dayLog.durationText,
        timestamp: new Date().toISOString(),
        details: `Shift Clock Out completed. Total Net Working Time: ${dayLog.durationText}`,
        actorName: empName
      });
    }

    return synth;
  }, [dayAudits, dayLog, tasksWorked]);

  const hasAdminOverrides = effectiveAudits.some(a => a.isAdminOverride || a.type?.startsWith('admin_'));

  const getAuditBadge = (type) => {
    switch (type) {
      case 'clock_in':
        return { icon: <LogIn size={13} color="#16a34a" />, label: 'Clock In', color: '#16a34a', bg: '#dcfce7' };
      case 'clock_out':
        return { icon: <LogOut size={13} color="#dc2626" />, label: 'Clock Out', color: '#dc2626', bg: '#fee2e2' };
      case 'task_timer_start':
        return { icon: <Play size={13} color="#0284c7" fill="#0284c7" />, label: 'Task Started', color: '#0284c7', bg: '#e0f2fe' };
      case 'task_timer_pause':
        return { icon: <Pause size={13} color="#ea580c" />, label: 'Task Paused', color: '#ea580c', bg: '#fff7ed' };
      case 'task_completed':
        return { icon: <CheckCircle2 size={13} color="#16a34a" />, label: 'Task Completed', color: '#16a34a', bg: '#dcfce7' };
      case 'tea_break_start':
        return { icon: <Coffee size={13} color="#d97706" />, label: 'Tea Break Started', color: '#d97706', bg: '#fef3c7' };
      case 'tea_break_end':
        return { icon: <Coffee size={13} color="#b45309" />, label: 'Tea Break Resumed', color: '#b45309', bg: '#fef3c7' };
      case 'lunch_break_start':
        return { icon: <Utensils size={13} color="#0284c7" />, label: 'Lunch Break Started', color: '#0284c7', bg: '#e0f2fe' };
      case 'lunch_break_end':
        return { icon: <Utensils size={13} color="#0369a1" />, label: 'Lunch Break Resumed', color: '#0369a1', bg: '#e0f2fe' };
      case 'leave_approved':
        return { icon: <Palmtree size={13} color="#059669" />, label: 'Leave Approved', color: '#059669', bg: '#ecfdf5' };
      case 'leave_requested':
        return { icon: <Palmtree size={13} color="#d97706" />, label: 'Leave Applied', color: '#d97706', bg: '#fffbeb' };
      case 'wfh_requested':
        return { icon: <Home size={13} color="#7c3aed" />, label: 'WFH Requested', color: '#7c3aed', bg: '#f5f3ff' };
      case 'admin_force_clock_out':
        return { icon: <ShieldAlert size={13} color="#991b1b" />, label: 'Admin Force Clock-Out', color: '#991b1b', bg: '#fee2e2' };
      case 'admin_shift_adjustment':
        return { icon: <AlertTriangle size={13} color="#92400e" />, label: 'Admin Shift Adjustment', color: '#92400e', bg: '#fef3c7' };
      default:
        return { icon: <Clock size={13} color="#64748b" />, label: 'Activity Log', color: '#64748b', bg: '#f1f5f9' };
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
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '620px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {dayLog.day} Attendance & Audit ({dayLog.date})
              </h2>
              {hasAdminOverrides && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  color: '#991b1b',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  ⚠️ Admin Modified
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
              Complete punch timestamps, tea/lunch breaks, and administrator adjustments
            </p>
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

        {/* Content */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Total Duration Callout */}
          <div style={{
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            borderRadius: '12px',
            padding: '16px 20px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#e0f2fe', fontWeight: '600', textTransform: 'uppercase' }}>
                Net Productive Work Duration
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'monospace' }}>
                {dayLog.durationText}
              </div>
            </div>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700'
            }}>
              {dayLog.isSunday ? '🏖️ Sunday Off' : (dayLog.isDayOff ? '🏖️ Weekend Off' : (dayLog.isCurrentDay ? '🚀 Active Today' : '✅ Completed'))}
            </div>
          </div>

          {/* Shift Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
                <LogIn size={12} color="#16a34a" /> Clock In
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                {dayLog.loginTime || (dayLog.isSunday ? 'Sunday Off' : (dayLog.isCurrentDay ? 'Not Clocked In' : '--'))}
              </div>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
                <LogOut size={12} color="#dc2626" /> Clock Out
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                {dayLog.logoutTime || (dayLog.isSunday ? 'Sunday Off' : (dayLog.isCurrentDay && dayLog.loginTime && dayLog.loginTime !== '--' && dayLog.loginTime !== 'Not Clocked In' ? 'In Progress' : '--'))}
              </div>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
                <Coffee size={12} color="#d97706" /> Breaks
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                {dayLog.breakDuration || '0m'}
              </div>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
                <Zap size={12} color="#2563eb" /> Status
              </div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: dayLog.isSunday ? '#d97706' : '#2563eb' }}>
                {dayLog.isSunday ? 'Sunday Off' : (dayLog.isCurrentDay ? (dayLog.loginTime && dayLog.loginTime !== '--' ? 'Active Shift' : 'Not Started') : 'Working Day')}
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '8px'
          }}>
            <button
              onClick={() => setActiveTab('audit')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: activeTab === 'audit' ? '1px solid #0284c7' : '1px solid #e2e8f0',
                backgroundColor: activeTab === 'audit' ? '#f0f9ff' : '#ffffff',
                color: activeTab === 'audit' ? '#0369a1' : '#64748b',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <History size={13} />
              <span>Punch & Break Audit Trail ({effectiveAudits.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: activeTab === 'tasks' ? '1px solid #0284c7' : '1px solid #e2e8f0',
                backgroundColor: activeTab === 'tasks' ? '#f0f9ff' : '#ffffff',
                color: activeTab === 'tasks' ? '#0369a1' : '#64748b',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <ListTodo size={13} />
              <span>Tasks Worked ({tasksWorked.length})</span>
            </button>
          </div>

          {/* TAB 1: Punch & Break Audit Trail */}
          {activeTab === 'audit' && (
            <div>
              {effectiveAudits.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                  {effectiveAudits.map((audit, idx) => {
                    const badge = getAuditBadge(audit.type);
                    const isOverride = audit.isAdminOverride || audit.type.startsWith('admin_');

                    return (
                      <div
                        key={audit._id || idx}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: isOverride ? '#fffaf5' : '#f8fafc',
                          border: isOverride ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '12px',
                              fontSize: '10.5px',
                              fontWeight: '700',
                              backgroundColor: badge.bg,
                              color: badge.color
                            }}>
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>
                            <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                              {audit.timeFormatted}
                            </span>
                          </div>

                          {audit.durationText && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#0369a1',
                              backgroundColor: '#e0f2fe',
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}>
                              ⏱️ {audit.durationText}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '11.5px', color: '#475569' }}>
                          {audit.details || audit.action || audit.note}
                        </div>

                        {/* Actor Callout */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                          <span>
                            Triggered by: <strong>{audit.actorName || audit.employeeName}</strong> {isOverride ? `[Admin ID: #${audit.adminId}]` : '(Self)'}
                          </span>
                          <span style={{ color: '#94a3b8' }}>
                            {new Date(audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        {/* Admin Override Reason */}
                        {audit.auditNote && (
                          <div style={{
                            marginTop: '3px',
                            padding: '4px 8px',
                            backgroundColor: '#fee2e2',
                            borderLeft: '3px solid #dc2626',
                            borderRadius: '2px 4px 4px 2px',
                            fontSize: '11px',
                            color: '#991b1b',
                            fontWeight: '600'
                          }}>
                            <strong>Administrator Explanation:</strong> "{audit.auditNote}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  fontSize: '12.5px'
                }}>
                  No granular punch audit logs recorded for this date yet. Live punches (Clock-in, Tea Break, Lunch Break, Clock-out) are automatically captured as they happen.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Tasks Tracked */}
          {activeTab === 'tasks' && (
            <div>
              {tasksWorked.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                  {tasksWorked.map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe'
                          }}>
                            #{t.taskCode || 'TSK'}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                            {t.taskTitle}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {/* Task Status Badge */}
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: (t.timerRunning || (t.status === 'in_progress' && t.endTime?.includes('Running'))) ? '#ecfdf5' : ((t.isCompleted || t.status === 'completed') ? '#dcfce7' : (t.status === 'on_hold' || t.durationSeconds > 0 ? '#fef3c7' : '#f1f5f9')),
                            color: (t.timerRunning || (t.status === 'in_progress' && t.endTime?.includes('Running'))) ? '#059669' : ((t.isCompleted || t.status === 'completed') ? '#16a34a' : (t.status === 'on_hold' || t.durationSeconds > 0 ? '#b45309' : '#64748b')),
                            border: `1px solid ${(t.timerRunning || (t.status === 'in_progress' && t.endTime?.includes('Running'))) ? '#a7f3d0' : ((t.isCompleted || t.status === 'completed') ? '#bbf7d0' : (t.status === 'on_hold' || t.durationSeconds > 0 ? '#fde68a' : '#e2e8f0'))}`
                          }}>
                            {(t.timerRunning || (t.status === 'in_progress' && t.endTime?.includes('Running'))) ? '⚡ Working Now (Live)' : ((t.isCompleted || t.status === 'completed') ? '✅ Completed' : (t.status === 'on_hold' || t.durationSeconds > 0 ? '⏸️ Paused (Last Session)' : '⏳ Pending'))}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '800',
                            color: '#0284c7',
                            backgroundColor: '#e0f2fe',
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}>
                            ⏱️ {t.durationText}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
                        <span>Project: <strong>{t.projectName || 'General'}</strong></span>
                        <span>
                          {t.timerRunning ? '🟢 Currently Active' : (t.startTime && t.endTime ? `${t.startTime} - ${t.endTime}` : (t.memo || t.status || 'Tracked Session'))}
                        </span>
                      </div>

                      {t.memo && (
                        <div style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>
                          "{t.memo}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  fontSize: '12.5px'
                }}>
                  No individual task sessions logged on this day. Total logged shift duration is <strong>{dayLog.durationText}</strong>.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#f8fafc'
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
