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

  // Load formal audit trail logs scoped to this specific date and employee
  const dayAudits = useMemo(() => {
    try {
      const allAudits = getCollection(KEYS.ATTENDANCE_AUDIT) || [];
      const targetEmpId = dayLog.employeeId ? String(dayLog.employeeId).toLowerCase() : null;
      const targetEmpCode = dayLog.employeeCode ? String(dayLog.employeeCode).toLowerCase() : null;
      const targetEmpName = dayLog.employeeName ? String(dayLog.employeeName).toLowerCase().trim() : null;

      return allAudits
        .filter(a => {
          if (a.date !== dayLog.date) return false;
          // Scope to target employee when available
          if (targetEmpId || targetEmpCode || targetEmpName) {
            const matchesId = targetEmpId && (String(a.employeeId).toLowerCase() === targetEmpId || String(a.actorId).toLowerCase() === targetEmpId);
            const matchesCode = targetEmpCode && (String(a.employeeCode).toLowerCase() === targetEmpCode || String(a.employeeId).toLowerCase() === targetEmpCode);
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

  // Comprehensive chronological timeline of punches, breaks, leaves, and admin overrides
  const timelineEvents = useMemo(() => {
    const list = [];
    const empName = dayLog.employeeName || 'Employee';

    // 1. All Punch In / Out Sessions
    if (Array.isArray(dayLog.punchSessions) && dayLog.punchSessions.length > 0) {
      dayLog.punchSessions.forEach((s, idx) => {
        const sessNum = s.sessionNumber || idx + 1;
        if (s.isLive) {
          list.push({
            id: s.id || `sess_live_${idx}`,
            type: 'shift_active',
            label: `Session #${sessNum} (Live)`,
            timeFormatted: `${s.inTime || '--'} → Live Now`,
            durationText: s.durationText,
            timestamp: s.inTimestamp || new Date().toISOString(),
            details: `Shift Session #${sessNum} is actively running right now. Clocked in at ${s.inTime || '--'}.`,
            actorName: empName,
            isLive: true
          });
        } else {
          list.push({
            id: s.id || `sess_${idx}`,
            type: 'punch_session',
            label: `Session #${sessNum}`,
            timeFormatted: `${s.inTime || '--'} - ${s.outTime || '--'}`,
            durationText: s.durationText,
            timestamp: s.outTimestamp || s.inTimestamp || new Date().toISOString(),
            details: `Shift Session #${sessNum}: Clocked in at ${s.inTime || '--'}, clocked out at ${s.outTime || '--'} (${s.durationText || 'recorded'}).`,
            actorName: empName
          });
        }
      });
    } else if (dayLog.loginTime && dayLog.loginTime !== '--' && dayLog.loginTime !== 'Not Clocked In') {
      // Single session fallback
      list.push({
        id: 'synth-clock-in',
        type: dayLog.isClockedIn ? 'shift_active' : 'clock_in',
        label: dayLog.isClockedIn ? 'Active Shift (Running)' : 'Clock In',
        timeFormatted: dayLog.isClockedIn ? `${dayLog.loginTime} → Live Now` : dayLog.loginTime,
        durationText: dayLog.durationText,
        timestamp: new Date().toISOString(),
        details: dayLog.isClockedIn
          ? `Shift is actively running. Clocked in at ${dayLog.loginTime}.`
          : `Shift Clock In recorded at ${dayLog.loginTime}.`,
        actorName: empName,
        isLive: Boolean(dayLog.isClockedIn)
      });
      if (dayLog.logoutTime && dayLog.logoutTime !== '--' && dayLog.logoutTime !== 'In Progress' && !dayLog.isClockedIn) {
        list.push({
          id: 'synth-clock-out',
          type: 'clock_out',
          label: 'Clock Out',
          timeFormatted: dayLog.logoutTime,
          durationText: dayLog.durationText,
          timestamp: new Date().toISOString(),
          details: `Shift Clock Out completed at ${dayLog.logoutTime}. Total shift work duration: ${dayLog.durationText}.`,
          actorName: empName
        });
      }
    }

    // 2. All Break Sessions (Tea, Lunch, etc.)
    if (Array.isArray(dayLog.breakHistory) && dayLog.breakHistory.length > 0) {
      dayLog.breakHistory.forEach((b, idx) => {
        const isLiveBreak = Boolean(b.isLive);
        const isLunch = (b.type || '').toLowerCase().includes('lunch');
        list.push({
          id: b.id || `brk_${idx}`,
          type: isLiveBreak ? (isLunch ? 'lunch_break_active' : 'tea_break_active') : (isLunch ? 'lunch_break' : 'tea_break'),
          label: b.type || (isLunch ? 'Lunch Break' : 'Tea Break'),
          timeFormatted: isLiveBreak ? `${b.startTime || '--'} → Active Break` : `${b.startTime || '--'} - ${b.endTime || '--'}`,
          durationText: b.durationText,
          timestamp: new Date().toISOString(),
          details: isLiveBreak
            ? `Currently on ${b.type || 'break'}. Started at ${b.startTime || '--'}.`
            : `${b.type || 'Break'} session (${b.durationText || 'recorded'}).`,
          actorName: empName,
          isLive: isLiveBreak
        });
      });
    } else if (dayLog.breakDuration && dayLog.breakDuration !== '0m' && dayLog.breakDuration !== '0s') {
      list.push({
        id: 'synth-break',
        type: 'tea_break',
        label: 'Break Log',
        timeFormatted: 'During Shift',
        durationText: dayLog.breakDuration,
        timestamp: new Date().toISOString(),
        details: `Breaks recorded (${dayLog.breakDuration} total duration)`,
        actorName: empName
      });
    }

    // 3. Admin Overrides & Formal Audit Logs (from KEYS.ATTENDANCE_AUDIT)
    dayAudits.forEach((a, idx) => {
      list.push({
        ...a,
        id: a._id || `audit_${idx}`,
        isOverride: Boolean(a.isAdminOverride || a.type?.startsWith('admin_')),
        timeFormatted: a.timeFormatted || (a.timestamp ? new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'),
        details: a.details || a.action || a.note || (a.type?.replace(/_/g, ' ') || 'Audit Log Event')
      });
    });

    // 4. Leave Info if applicable
    if (dayLog.isOnLeave) {
      list.unshift({
        id: 'leave_record',
        type: 'leave_approved',
        label: 'Approved Leave',
        timeFormatted: 'Full Day',
        details: dayLog.leaveNote || 'Approved Leave recorded for this date',
        actorName: 'HR / Administrator',
        timestamp: new Date().toISOString()
      });
    }

    return list;
  }, [dayLog, dayAudits]);

  const hasAdminOverrides = timelineEvents.some(a => a.isOverride || a.isAdminOverride || a.type?.startsWith('admin_'));

  const getAuditBadge = (type) => {
    switch (type) {
      case 'shift_active':
      case 'clock_in_active':
        return {
          icon: <Play size={13} className="text-emerald-600 fill-emerald-600 animate-pulse" />,
          label: 'Active Shift (Running)',
          badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
        };
      case 'punch_session':
      case 'clock_in':
        return {
          icon: <LogIn size={13} className="text-green-600" />,
          label: 'Shift Punch',
          badgeClass: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 border border-green-200 dark:border-green-800'
        };
      case 'clock_out':
        return {
          icon: <LogOut size={13} className="text-red-600" />,
          label: 'Clock Out',
          badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
        };
      case 'tea_break_active':
        return {
          icon: <Coffee size={13} className="text-amber-600 animate-pulse" />,
          label: 'Tea Break (Active)',
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
        };
      case 'tea_break':
      case 'tea_break_start':
      case 'tea_break_end':
        return {
          icon: <Coffee size={13} className="text-amber-600" />,
          label: 'Tea Break',
          badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
        };
      case 'lunch_break_active':
        return {
          icon: <Utensils size={13} className="text-sky-600 animate-pulse" />,
          label: 'Lunch Break (Active)',
          badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
        };
      case 'lunch_break':
      case 'lunch_break_start':
      case 'lunch_break_end':
        return {
          icon: <Utensils size={13} className="text-sky-600" />,
          label: 'Lunch Break',
          badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
        };
      case 'admin_force_clock_out':
        return {
          icon: <ShieldAlert size={13} className="text-red-700" />,
          label: 'Admin Force Clock-Out',
          badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800'
        };
      case 'admin_shift_adjustment':
        return {
          icon: <AlertTriangle size={13} className="text-amber-800" />,
          label: 'Admin Shift Adjustment',
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
        };
      case 'leave_approved':
        return {
          icon: <Palmtree size={13} className="text-emerald-600" />,
          label: 'Leave Approved',
          badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
        };
      case 'leave_requested':
        return {
          icon: <Palmtree size={13} className="text-amber-600" />,
          label: 'Leave Applied',
          badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
        };
      case 'wfh_requested':
        return {
          icon: <Home size={13} className="text-purple-600" />,
          label: 'WFH Requested',
          badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
        };
      default:
        return {
          icon: <Clock size={13} className="text-slate-500" />,
          label: 'Activity Log',
          badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
        };
    }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-2.5 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[620px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white m-0">
                {dayLog.day} Attendance & Activity Log ({dayLog.date})
              </h2>
              {hasAdminOverrides && (
                <span className="text-[10px] font-extrabold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-900 px-1.5 py-[1px] rounded-full">
                  ⚠️ Admin Modified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-0">
              {dayLog.employeeName ? `${dayLog.employeeName} (${dayLog.employeeCode || 'EMP'}) • ${dayLog.employeeRole || 'Member'}` : 'Complete punch timestamps, tea/lunch breaks, and administrator adjustments'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-6 flex flex-col gap-4">
          {/* Total Duration Callout */}
          <div className="bg-gradient-to-r from-sky-600 to-sky-700 rounded-xl p-4 sm:px-5 text-white flex items-center justify-between shadow-md shadow-sky-600/25">
            <div>
              <div className="text-[11px] text-sky-100 font-semibold uppercase tracking-wider">
                Net Productive Shift Duration
              </div>
              <div className="text-2xl font-extrabold font-mono">
                {dayLog.shiftDurationText || dayLog.durationText || '0h 0m'}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-sky-100 font-medium">
                <span>Tasks: <strong className="text-white font-bold">{dayLog.totalTaskDurationText || dayLog.taskDurationText || '0m'}</strong></span>
                <span>•</span>
                <span>Breaks: <strong className="text-white font-bold">{dayLog.breakDuration || '0m'}</strong></span>
              </div>
            </div>
            <div className="bg-white/20 px-3 py-1.5 rounded-full text-xs font-bold text-white">
              {dayLog.isOnLeave
                ? '🌴 On Leave'
                : (dayLog.isSunday && !dayLog.isClockedIn && (dayLog.shiftWorkSeconds || 0) === 0
                    ? '🏖️ Sunday Off'
                    : (dayLog.isClockedIn
                        ? '🟢 Active Shift'
                        : (dayLog.isOnBreak
                            ? `☕ On ${dayLog.breakType || 'Break'}`
                            : (dayLog.isClockedOut
                                ? '✅ Shift Ended'
                                : (dayLog.isCurrentDay ? '⏳ Not Clocked In' : '💼 Completed')))))}
            </div>
          </div>

          {/* Shift Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                <LogIn size={12} className="text-green-600" /> Clock In
              </div>
              <div className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                {dayLog.loginTime && dayLog.loginTime !== '--' && dayLog.loginTime !== 'Off'
                  ? dayLog.loginTime
                  : (dayLog.isSunday && (dayLog.shiftWorkSeconds || 0) === 0 ? 'Sunday Off' : (dayLog.isCurrentDay ? 'Not Clocked In' : '--'))}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                <LogOut size={12} className="text-red-600" /> Clock Out
              </div>
              <div className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                {dayLog.logoutTime && dayLog.logoutTime !== '--' && dayLog.logoutTime !== 'Off'
                  ? dayLog.logoutTime
                  : (dayLog.isClockedIn ? 'In Progress 🟢' : (dayLog.isSunday && (dayLog.shiftWorkSeconds || 0) === 0 ? 'Sunday Off' : '--'))}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                <Coffee size={12} className="text-amber-600" /> Breaks
              </div>
              <div className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                {dayLog.breakDuration || '0m'}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                <Zap size={12} className="text-blue-600" /> Status
              </div>
              <div className={`text-xs font-bold truncate ${dayLog.isClockedIn ? 'text-green-600 dark:text-green-400' : (dayLog.isOnBreak ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400')}`}>
                {dayLog.isOnLeave
                  ? 'On Leave 🌴'
                  : (dayLog.isSunday && !dayLog.isClockedIn && (dayLog.shiftWorkSeconds || 0) === 0
                      ? 'Sunday Off'
                      : (dayLog.isClockedIn
                          ? 'Active Shift 🟢'
                          : (dayLog.isOnBreak
                              ? `On ${dayLog.breakType || 'Break'} ☕`
                              : (dayLog.isClockedOut
                                  ? 'Shift Ended'
                                  : (dayLog.isCurrentDay ? 'Not Started' : 'Completed')))))}
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                activeTab === 'audit'
                  ? 'border border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <History size={13} />
              <span>Punch & Break Timeline ({timelineEvents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                activeTab === 'tasks'
                  ? 'border border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <ListTodo size={13} />
              <span>Tasks Worked ({tasksWorked.length})</span>
            </button>
          </div>

          {/* TAB 1: Punch & Break Timeline */}
          {activeTab === 'audit' && (
            <div>
              {timelineEvents.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                  {timelineEvents.map((item, idx) => {
                    const badge = getAuditBadge(item.type);
                    const isOverride = item.isOverride || item.isAdminOverride || item.type?.startsWith('admin_');

                    return (
                      <div
                        key={item.id || item._id || idx}
                        className={`p-2.5 px-3 rounded-lg flex flex-col gap-1 border ${
                          isOverride
                            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/60'
                            : (item.isLive
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700')
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${badge.badgeClass}`}>
                              {badge.icon}
                              <span>{item.label || badge.label}</span>
                            </span>
                            <span className="text-[12.5px] font-bold text-slate-900 dark:text-white">
                              {item.timeFormatted}
                            </span>
                          </div>

                          {item.durationText && (
                            <span className={`text-[11px] font-bold px-1.5 py-[1px] rounded ${
                              item.isLive
                                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 animate-pulse'
                                : 'text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60'
                            }`}>
                              ⏱️ {item.durationText}
                            </span>
                          )}
                        </div>

                        <div className="text-[11.5px] text-slate-600 dark:text-slate-300">
                          {item.details || item.action || item.note}
                        </div>

                        {/* Actor Callout */}
                        <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>
                            Recorded for: <strong>{item.actorName || item.employeeName || dayLog.employeeName}</strong> {isOverride ? `[Admin ID: #${item.adminId || 'ADM'}]` : ''}
                          </span>
                          <span className="text-slate-400">
                            {item.isLive ? 'Live Update' : (item.timestamp && !String(item.timestamp).includes('T') ? item.timestamp : (item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''))}
                          </span>
                        </div>

                        {/* Admin Override Reason */}
                        {item.auditNote && (
                          <div className="mt-1 p-1 px-2 bg-red-100 dark:bg-red-950/60 border-l-3 border-red-600 rounded text-[11px] text-red-800 dark:text-red-300 font-semibold">
                            <strong>Administrator Explanation:</strong> "{item.auditNote}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[12.5px]">
                  No punch or break sessions recorded for this date yet. Shift sessions (Clock-in, Tea Break, Lunch Break, Clock-out) are automatically captured live.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Tasks Tracked */}
          {activeTab === 'tasks' && (
            <div>
              {/* Total task logged time banner */}
              {tasksWorked.length > 0 && (
                <div className="flex items-center justify-between p-2.5 px-3 mb-2 bg-sky-50 dark:bg-sky-950/40 rounded-lg border border-sky-200 dark:border-sky-900/60 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Total Task Work Logged Today:
                  </span>
                  <span className="font-extrabold text-sky-700 dark:text-sky-300">
                    ⏱️ {dayLog.totalTaskDurationText || dayLog.taskDurationText || '0m'} ({tasksWorked.length} {tasksWorked.length === 1 ? 'task' : 'tasks'})
                  </span>
                </div>
              )}

              {tasksWorked.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
                  {tasksWorked.map((t, idx) => (
                    <div
                      key={t.taskId || idx}
                      className="p-3 px-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold px-1.5 py-[1px] rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            #{t.taskCode || 'TSK'}
                          </span>
                          <span className="text-[13px] font-bold text-slate-900 dark:text-white">
                            {t.taskTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Task Status Badge */}
                          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                            (t.timerRunning || (t.status === 'in_progress' && t.endTime?.includes('Running')))
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 animate-pulse'
                              : ((t.isCompleted || t.status === 'completed')
                                ? 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800'
                                : (t.status === 'on_hold' || t.durationSeconds > 0
                                  ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'))
                          }`}>
                            {(t.timerRunning || (t.status === 'in_progress' && t.endTime?.includes('Running'))) ? '⚡ Working Now (Live)' : ((t.isCompleted || t.status === 'completed') ? '✅ Completed' : (t.status === 'on_hold' || t.durationSeconds > 0 ? '⏸️ Paused (Worked Session)' : '⏳ Pending'))}
                          </span>
                          <span className="text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 rounded">
                            ⏱️ {t.durationText}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400">
                        <span>Project: <strong className="text-slate-700 dark:text-slate-300">{t.projectName || 'General Work'}</strong></span>
                        <span>
                          {t.timerRunning ? '🟢 Currently Active' : (t.startTime && t.endTime ? `${t.startTime} - ${t.endTime}` : (t.memo || t.status || 'Tracked Session'))}
                        </span>
                      </div>

                      {t.memo && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 italic mt-0.5">
                          "{t.memo}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[12.5px]">
                  No individual task sessions logged on this day. Total logged shift duration is <strong>{dayLog.shiftDurationText || dayLog.durationText}</strong>.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="bg-sky-600 hover:bg-sky-700 text-white border-none py-2 px-5 rounded-lg text-[13px] font-semibold cursor-pointer shadow-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
