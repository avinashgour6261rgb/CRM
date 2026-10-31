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
        return { icon: <LogIn size={13} className="text-green-600" />, label: 'Clock In', badgeClass: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' };
      case 'clock_out':
        return { icon: <LogOut size={13} className="text-red-600" />, label: 'Clock Out', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' };
      case 'task_timer_start':
        return { icon: <Play size={13} className="text-sky-600 fill-sky-600" />, label: 'Task Started', badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' };
      case 'task_timer_pause':
        return { icon: <Pause size={13} className="text-orange-600" />, label: 'Task Paused', badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' };
      case 'task_completed':
        return { icon: <CheckCircle2 size={13} className="text-green-600" />, label: 'Task Completed', badgeClass: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300' };
      case 'tea_break_start':
        return { icon: <Coffee size={13} className="text-amber-600" />, label: 'Tea Break Started', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' };
      case 'tea_break_end':
        return { icon: <Coffee size={13} className="text-amber-700" />, label: 'Tea Break Resumed', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' };
      case 'lunch_break_start':
        return { icon: <Utensils size={13} className="text-sky-600" />, label: 'Lunch Break Started', badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' };
      case 'lunch_break_end':
        return { icon: <Utensils size={13} className="text-sky-700" />, label: 'Lunch Break Resumed', badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' };
      case 'leave_approved':
        return { icon: <Palmtree size={13} className="text-emerald-600" />, label: 'Leave Approved', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' };
      case 'leave_requested':
        return { icon: <Palmtree size={13} className="text-amber-600" />, label: 'Leave Applied', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' };
      case 'wfh_requested':
        return { icon: <Home size={13} className="text-purple-600" />, label: 'WFH Requested', badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' };
      case 'admin_force_clock_out':
        return { icon: <ShieldAlert size={13} className="text-red-700" />, label: 'Admin Force Clock-Out', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' };
      case 'admin_shift_adjustment':
        return { icon: <AlertTriangle size={13} className="text-amber-800" />, label: 'Admin Shift Adjustment', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' };
      default:
        return { icon: <Clock size={13} className="text-slate-500" />, label: 'Activity Log', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-4 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[620px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white m-0">
                {dayLog.day} Attendance & Audit ({dayLog.date})
              </h2>
              {hasAdminOverrides && (
                <span className="text-[10px] font-extrabold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-900 px-1.5 py-[1px] rounded-full">
                  ⚠️ Admin Modified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-0">
              Complete punch timestamps, tea/lunch breaks, and administrator adjustments
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
        <div className="p-5 sm:p-6 flex flex-col gap-4">
          {/* Total Duration Callout */}
          <div className="bg-gradient-to-r from-sky-600 to-sky-700 rounded-xl p-4 sm:px-5 text-white flex items-center justify-between shadow-md shadow-sky-600/25">
            <div>
              <div className="text-[11px] text-sky-100 font-semibold uppercase tracking-wider">
                Net Productive Work Duration
              </div>
              <div className="text-2xl font-extrabold font-mono">
                {dayLog.durationText}
              </div>
            </div>
            <div className="bg-white/20 px-3 py-1.5 rounded-full text-xs font-bold">
              {dayLog.isSunday && dayLog.shortDay !== 'Mo'
                ? '🏖️ Sunday Off'
                : (dayLog.isDayOff && dayLog.shortDay !== 'Mo'
                    ? '🏖️ Weekend Off'
                    : (dayLog.isCurrentDay ? '🚀 Active Today' : (dayLog.shortDay === 'Mo' ? '💼 Working Day' : '✅ Completed')))}
            </div>
          </div>

          {/* Shift Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                <LogIn size={12} className="text-green-600" /> Clock In
              </div>
              <div className="text-[13px] font-bold text-slate-900 dark:text-white">
                {dayLog.loginTime && dayLog.loginTime !== 'Off' ? dayLog.loginTime : (dayLog.isSunday && dayLog.shortDay !== 'Mo' ? 'Sunday Off' : (dayLog.isCurrentDay ? 'Not Clocked In' : '--'))}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                <LogOut size={12} className="text-red-600" /> Clock Out
              </div>
              <div className="text-[13px] font-bold text-slate-900 dark:text-white">
                {dayLog.logoutTime && dayLog.logoutTime !== 'Off' ? dayLog.logoutTime : (dayLog.isSunday && dayLog.shortDay !== 'Mo' ? 'Sunday Off' : (dayLog.isCurrentDay && dayLog.loginTime && dayLog.loginTime !== '--' && dayLog.loginTime !== 'Not Clocked In' ? 'In Progress' : '--'))}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                <Coffee size={12} className="text-amber-600" /> Breaks
              </div>
              <div className="text-[13px] font-bold text-slate-900 dark:text-white">
                {dayLog.breakDuration || '0m'}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                <Zap size={12} className="text-blue-600" /> Status
              </div>
              <div className={`text-xs font-bold ${(dayLog.isSunday && dayLog.shortDay !== 'Mo') ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {(dayLog.isSunday && dayLog.shortDay !== 'Mo') ? 'Sunday Off' : (dayLog.isCurrentDay ? (dayLog.loginTime && dayLog.loginTime !== '--' && dayLog.loginTime !== 'Not Clocked In' ? 'Active Shift' : 'Not Started') : 'Working Day')}
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
              <span>Punch & Break Audit Trail ({effectiveAudits.length})</span>
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

          {/* TAB 1: Punch & Break Audit Trail */}
          {activeTab === 'audit' && (
            <div>
              {effectiveAudits.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                  {effectiveAudits.map((audit, idx) => {
                    const badge = getAuditBadge(audit.type);
                    const isOverride = audit.isAdminOverride || audit.type.startsWith('admin_');

                    return (
                      <div
                        key={audit._id || idx}
                        className={`p-2.5 px-3 rounded-lg flex flex-col gap-1 border ${
                          isOverride
                            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/60'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${badge.badgeClass}`}>
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>
                            <span className="text-[12.5px] font-bold text-slate-900 dark:text-white">
                              {audit.timeFormatted}
                            </span>
                          </div>

                          {audit.durationText && (
                            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-1.5 py-[1px] rounded">
                              ⏱️ {audit.durationText}
                            </span>
                          )}
                        </div>

                        <div className="text-[11.5px] text-slate-600 dark:text-slate-300">
                          {audit.details || audit.action || audit.note}
                        </div>

                        {/* Actor Callout */}
                        <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>
                            Triggered by: <strong>{audit.actorName || audit.employeeName}</strong> {isOverride ? `[Admin ID: #${audit.adminId}]` : '(Self)'}
                          </span>
                          <span className="text-slate-400">
                            {new Date(audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        {/* Admin Override Reason */}
                        {audit.auditNote && (
                          <div className="mt-1 p-1 px-2 bg-red-100 dark:bg-red-950/60 border-l-3 border-red-600 rounded text-[11px] text-red-800 dark:text-red-300 font-semibold">
                            <strong>Administrator Explanation:</strong> "{audit.auditNote}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[12.5px]">
                  No granular punch audit logs recorded for this date yet. Live punches (Clock-in, Tea Break, Lunch Break, Clock-out) are automatically captured as they happen.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Tasks Tracked */}
          {activeTab === 'tasks' && (
            <div>
              {tasksWorked.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                  {tasksWorked.map((t, idx) => (
                    <div
                      key={idx}
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
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : ((t.isCompleted || t.status === 'completed')
                                ? 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800'
                                : (t.status === 'on_hold' || t.durationSeconds > 0
                                  ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'))
                          }`}>
                            {(t.timerRunning || (t.status === 'in_progress' && t.endTime?.includes('Running'))) ? '⚡ Working Now (Live)' : ((t.isCompleted || t.status === 'completed') ? '✅ Completed' : (t.status === 'on_hold' || t.durationSeconds > 0 ? '⏸️ Paused (Last Session)' : '⏳ Pending'))}
                          </span>
                          <span className="text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 rounded">
                            ⏱️ {t.durationText}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400">
                        <span>Project: <strong className="text-slate-700 dark:text-slate-300">{t.projectName || 'General'}</strong></span>
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
                  No individual task sessions logged on this day. Total logged shift duration is <strong>{dayLog.durationText}</strong>.
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
