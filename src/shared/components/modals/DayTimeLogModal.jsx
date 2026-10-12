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
  User
} from 'lucide-react';
import { getCollection, KEYS } from '../../services/storageService';

export const DayTimeLogModal = ({ dayLog, onClose }) => {
  if (!dayLog) return null;

  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'tasks'

  const tasksWorked = dayLog.tasksWorked || [];

  // Load audit trail logs for this specific date
  const dayAudits = useMemo(() => {
    try {
      const allAudits = getCollection(KEYS.ATTENDANCE_AUDIT) || [];
      return allAudits
        .filter(a => a.date === dayLog.date)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (e) {
      return [];
    }
  }, [dayLog.date]);

  const hasAdminOverrides = dayAudits.some(a => a.isAdminOverride || a.type.startsWith('admin_'));

  const getAuditBadge = (type) => {
    switch (type) {
      case 'clock_in':
        return { icon: <LogIn size={13} color="#16a34a" />, label: 'Clock In', color: '#16a34a', bg: '#dcfce7' };
      case 'clock_out':
        return { icon: <LogOut size={13} color="#dc2626" />, label: 'Clock Out', color: '#dc2626', bg: '#fee2e2' };
      case 'tea_break_start':
        return { icon: <Coffee size={13} color="#d97706" />, label: 'Tea Break Started', color: '#d97706', bg: '#fef3c7' };
      case 'tea_break_end':
        return { icon: <Coffee size={13} color="#b45309" />, label: 'Tea Break Resumed', color: '#b45309', bg: '#fef3c7' };
      case 'lunch_break_start':
        return { icon: <Utensils size={13} color="#0284c7" />, label: 'Lunch Break Started', color: '#0284c7', bg: '#e0f2fe' };
      case 'lunch_break_end':
        return { icon: <Utensils size={13} color="#0369a1" />, label: 'Lunch Break Resumed', color: '#0369a1', bg: '#e0f2fe' };
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
                {dayLog.loginTime || (dayLog.isSunday ? 'Sunday Off' : '10:00 AM')}
              </div>
            </div>

            <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
                <LogOut size={12} color="#dc2626" /> Clock Out
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                {dayLog.logoutTime || (dayLog.isSunday ? 'Holiday' : '07:00 PM')}
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
                {dayLog.isSunday ? 'Sunday Off' : 'Working Day'}
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
              <span>Punch & Break Audit Trail ({dayAudits.length})</span>
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
              {dayAudits.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                  {dayAudits.map((audit, idx) => {
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
                          {audit.details || audit.action}
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

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
                        <span>Project: <strong>{t.projectName}</strong></span>
                        <span>{t.startTime} - {t.endTime}</span>
                      </div>

                      {t.memo && (
                        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
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
