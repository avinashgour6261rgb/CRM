/**
 * @file TaskDetailModal.jsx
 * @description Detailed view modal for a single task with timer controls and status updates.
 */

import React, { useState } from 'react';
import {
  X,
  Play,
  Pause,
  Square,
  Clock,
  Calendar,
  User,
  Tag,
  FolderGit2,
  CheckCircle2,
  Check,
  History,
  ArrowRight,
  Sparkles,
  Trash2,
  Pencil
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { confirmDialog } from '../../../../shared/context/ConfirmContext';
import { canDeleteTask, canEditAnyTask } from '../../../../shared/utils/permissionUtils';
import { getLocalDateString } from '../../../../shared/utils/timerUtils';
import { getCollection, KEYS } from '../../../../shared/services/storageService';
import { useModalUX } from '../../../../shared/hooks/useModalUX';

export const TaskDetailModal = ({ task, onClose }) => {
  const { handleBackdropClick, handleCardClick } = useModalUX({ onClose, isOpen: Boolean(task) });
  const {
    startTaskTimer,
    pauseTaskTimer,
    stopTaskTimer,
    changeTaskStatus,
    completeTask,
    updateTask,
    deleteTask,
    rescheduleTaskForFuture,
    updateTimesheet,
    logTimesheet,
    employees
  } = useWork();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [isReassigning, setIsReassigning] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [customFutureDate, setCustomFutureDate] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');

  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editHours, setEditHours] = useState(() => {
    const totalSecs = Number(task?.accumulatedSeconds ?? task?.timerSeconds ?? 0) || Math.round((Number(task?.hoursLogged) || 0) * 3600);
    return Math.floor(totalSecs / 3600);
  });
  const [editMinutes, setEditMinutes] = useState(() => {
    const totalSecs = Number(task?.accumulatedSeconds ?? task?.timerSeconds ?? 0) || Math.round((Number(task?.hoursLogged) || 0) * 3600);
    return Math.floor((totalSecs % 3600) / 60);
  });
  const [editNote, setEditNote] = useState('');
  const [isSavingTime, setIsSavingTime] = useState(false);

  const myId = String(currentUser?._id || '');
  const myCode = currentUser?.employeeCode ? String(currentUser.employeeCode) : '';
  const activeWorkerIdStr = String(task?.activeWorkerId || task?.activeUserId || '');
  const isMyRunning = Boolean(
    (activeWorkerIdStr && (activeWorkerIdStr === myId || (myCode && activeWorkerIdStr === myCode))) ||
    (!task?.activeWorkerId && !task?.activeUserId)
  );
  const activeWorkerName = task?.activeWorkerName || task?.activeUserName || task?.assignedToName || 'Team Member';

  // Sync edit fields when task changes
  React.useEffect(() => {
    if (task) {
      const totalSecs = Number(task.accumulatedSeconds ?? task.timerSeconds ?? 0) || Math.round((Number(task.hoursLogged) || 0) * 3600);
      setEditHours(Math.floor(totalSecs / 3600));
      setEditMinutes(Math.floor((totalSecs % 3600) / 60));
    }
  }, [task?.accumulatedSeconds, task?.timerSeconds, task?.hoursLogged]);

  if (!task) return null;

  const userCanDelete = canDeleteTask(currentUser, task);
  const userCanEdit = React.useMemo(() => {
    if (!currentUser || !task) return false;
    if (canEditAnyTask(currentUser)) return true;
    const myId = String(currentUser._id || currentUser.id || '').toLowerCase();
    const myCode = String(currentUser.employeeCode || '').toLowerCase();
    const creatorIds = [task.assignedById, task.assignedByCode, task.createdById, task.createdBy].filter(Boolean).map(s => String(s).toLowerCase());
    return creatorIds.includes(myId) || creatorIds.includes(myCode);
  }, [currentUser, task]);

  const handleReassign = async (newEmpId) => {
    const newAssignee = employees.find(e => e._id === newEmpId);
    if (!newAssignee) return;
    try {
      await updateTask(task._id, {
        assignedTo: newAssignee._id,
        assignedToId: newAssignee._id,
        assignedToName: newAssignee.name,
        assignedToEmail: newAssignee.email || '',
        assignedToAvatar: newAssignee.avatar,
        assignedToRole: newAssignee.role,
        assignedToIds: [newAssignee._id],
        assignees: [newAssignee]
      });
      setIsReassigning(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickReschedule = async (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const newDateStr = getLocalDateString(d);
    await rescheduleTaskForFuture(task._id, newDateStr, `Assigned +${days} day${days > 1 ? 's' : ''} ahead`);
    setIsRescheduling(false);
  };

  const handleCustomReschedule = async () => {
    if (!customFutureDate) return;
    await rescheduleTaskForFuture(task._id, customFutureDate, rescheduleNote || 'Custom future date');
    setIsRescheduling(false);
    setCustomFutureDate('');
    setRescheduleNote('');
  };

  const handleSaveTime = async () => {
    setIsSavingTime(true);
    try {
      const totalSecs = (Number(editHours) * 3600) + (Number(editMinutes) * 60);
      const hrsLoggedNum = +(totalSecs / 3600).toFixed(2);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const hrsLoggedStr = `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
      const todayStr = getLocalDateString();

      await updateTask(task._id, {
        hoursLogged: hrsLoggedNum,
        hoursLoggedText: hrsLoggedStr,
        liveDurationText: hrsLoggedStr,
        accumulatedSeconds: totalSecs,
        timerSeconds: totalSecs,
        durationSeconds: totalSecs,
        todayWorkSeconds: totalSecs,
        dailySessions: { ...(task.dailySessions || {}), [todayStr]: totalSecs },
        sessionDate: todayStr
      });

      // Synchronize into Timesheet collection (prioritize today's session to avoid overwriting historical days)
      const allTimesheets = getCollection(KEYS.TIMESHEETS) || [];
      const tsEntry = allTimesheets.find(ts =>
        (String(ts.taskId) === String(task._id) || (task.taskCode && ts.taskCode === task.taskCode)) &&
        (!ts.date || ts.date === todayStr)
      ) || allTimesheets.find(ts =>
        String(ts.taskId) === String(task._id) ||
        (task.taskCode && ts.taskCode === task.taskCode)
      );

      const assignedEmpId = task.assignedToId || (typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?._id) || currentUser?._id;
      const assignedEmpCode = task.assignedToCode || currentUser?.employeeCode || '';
      const assignedEmpName = task.assignedToName || currentUser?.name || 'Employee';

      if (tsEntry) {
        await updateTimesheet(tsEntry._id, {
          totalDurationSeconds: totalSecs,
          totalDurationText: hrsLoggedStr,
          memo: editNote || tsEntry.memo || `Task logged time adjusted (${hrsLoggedStr})`
        });
      } else if (totalSecs > 0) {
        await logTimesheet({
          taskId: task._id,
          taskCode: task.taskCode || 'TSK',
          taskTitle: task.title,
          projectId: task.projectId || '',
          projectName: task.projectName || 'General Work',
          employeeId: assignedEmpId,
          employeeCode: assignedEmpCode,
          employeeName: assignedEmpName,
          totalDurationSeconds: totalSecs,
          totalDurationText: hrsLoggedStr,
          date: todayStr,
          memo: editNote || `Task time logged (${hrsLoggedStr})`,
          isBillable: true
        });
      }

      addToast('✅ Task time updated and timesheet synchronized!', 'success');
      setIsEditingTime(false);
    } catch (err) {
      addToast('Failed to save updated time', 'error');
    } finally {
      setIsSavingTime(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[1000] p-3 sm:p-5 animate-fade-in" onClick={handleBackdropClick}>
      <div className="popup-spring bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[760px] max-h-[92vh] sm:max-h-[88vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col" onClick={handleCardClick}>
        {/* Header */}
        <div className="shrink-0 px-5 sm:px-7 py-4 sm:py-[22px] border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-[3px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-md text-xs font-bold border border-blue-200 dark:border-blue-900">
                {task.taskCode}
              </span>
              <span className="px-2 py-[3px] bg-slate-100 dark:bg-slate-800 rounded-md text-xs text-slate-600 dark:text-slate-300 font-medium">
                {task.projectName}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-7 flex-1 overflow-y-auto flex flex-col gap-5">
          {/* Overdue Task Banner */}
          {(() => {
            const todayStr = getLocalDateString();
            const isOverdue = !!(task.dueDate && !task.hasNoDueDate && task.dueDate < todayStr && task.status !== 'completed');
            if (!isOverdue) return null;
            return (
              <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 rounded-[10px] px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <div className="text-[13px] font-extrabold text-orange-700 dark:text-orange-400">
                      Task Deadline Expired (Due: {task.dueDate})
                    </div>
                    <div className="text-[11.5px] text-orange-800 dark:text-orange-300">
                      Time tracking on overdue tasks requires updating the deadline or completing the task.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const baseDate = new Date();
                    baseDate.setDate(baseDate.getDate() + 3);
                    const newDate = getLocalDateString(baseDate);
                    await updateTask(task._id, { dueDate: newDate, hasNoDueDate: false });
                  }}
                  className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white border-0 text-[11.5px] font-bold cursor-pointer whitespace-nowrap transition-colors"
                >
                  Extend +3 Days
                </button>
              </div>
            );
          })()}

          {/* Active Timer Banner */}
          <div className={`flex items-center justify-between px-5 py-4 rounded-[10px] border transition-colors ${
            task.timerRunning
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
          }`}>
            <div>
              {task.timerRunning ? (
                <div className="flex items-center gap-2 mb-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isMyRunning ? 'You are actively working on this task' : `${activeWorkerName} is actively working on this task`}
                  </span>
                  {task.activeWorkerRole && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                      {task.activeWorkerRole}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Work Session Timer
                </div>
              )}
              <div className={`text-xl font-extrabold font-mono ${task.timerRunning ? 'text-sky-600 dark:text-sky-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {task.liveDurationText || task.hoursLoggedText || '00:00:00'}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {task.timerRunning ? (
                <>
                  <button
                    onClick={() => pauseTaskTimer(task._id)}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white border-0 px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors"
                    title={isMyRunning ? "Pause Timer" : `Pause ${activeWorkerName}'s session`}
                  >
                    <Pause size={14} /> {isMyRunning ? 'Pause' : `Pause (${activeWorkerName.split(' ')[0]})`}
                  </button>
                  <button
                    onClick={() => {
                      stopTaskTimer(task._id);
                    }}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white border-0 px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-colors"
                  >
                    <Square size={14} /> Stop & Log
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startTaskTimer(task._id)}
                  className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white border-0 px-[18px] py-2 rounded-lg text-[13px] font-semibold cursor-pointer shadow-sm transition-colors"
                >
                  <Play size={14} /> Start Tracking
                </button>
              )}

              {task.status !== 'completed' ? (
                <button
                  onClick={async () => {
                    await completeTask(task._id);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0 px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer shadow-sm transition-colors"
                >
                  <CheckCircle2 size={15} /> Complete Task
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await changeTaskStatus(task._id, 'in_progress');
                  }}
                  className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-3.5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Reopen Task
                </button>
              )}
            </div>
          </div>

          {/* Time Budget vs Logged Hours Progress Card */}
          <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Clock size={16} className="text-blue-600 dark:text-blue-400" />
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                  Task Time Allocation & Progress
                </span>
              </div>
              <span className={`text-[11.5px] font-bold px-2 py-0.5 rounded-md ${
                (Number(task.hoursLogged) || 0) > Number(task.estimatedHours)
                  ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
              }`}>
                {task.estimatedHours > 0 
                  ? `${Math.round(((Number(task.hoursLogged) || 0) / Number(task.estimatedHours)) * 100)}% of Budget`
                  : 'Open Budget'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[12.5px]">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[11.5px] block">Estimated Budget:</span>
                <strong className="text-slate-900 dark:text-slate-100 text-[13.5px]">
                  {task.estimatedHours ? `${task.estimatedHours}h 00m` : 'Not set'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[11.5px] block">Actual Logged:</span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-blue-600 dark:text-blue-400 text-[13.5px]">
                    {task.hoursLogged ? `${task.hoursLogged}h` : (task.hoursLoggedText || '0s')}
                  </strong>
                  {userCanEdit && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTime(!isEditingTime)}
                      className="text-[11px] px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900 cursor-pointer font-semibold transition-colors"
                      title="Adjust logged working hours and update timesheets"
                    >
                      {isEditingTime ? 'Cancel' : '✏️ Edit'}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[11.5px] block">Variance / Balance:</span>
                <strong className={`text-[13.5px] ${
                  (Number(task.hoursLogged) || 0) > Number(task.estimatedHours)
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {task.estimatedHours > 0
                    ? ((Number(task.hoursLogged) || 0) > Number(task.estimatedHours)
                      ? `+${((Number(task.hoursLogged) || 0) - Number(task.estimatedHours)).toFixed(1)}h Overtime`
                      : `${(Number(task.estimatedHours) - (Number(task.hoursLogged) || 0)).toFixed(1)}h Left`)
                    : 'Flexible'}
                </strong>
              </div>
            </div>

            {/* Inline Working Hours Adjustment Form */}
            {isEditingTime && (
              <div className="mt-2.5 p-3 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col gap-2.5">
                <div className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>Adjust Working Hours (Auto-syncs to Timesheets & Timelogs)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={editHours}
                      onChange={(e) => setEditHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full h-8 px-2.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full h-8 px-2.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Adjustment Reason / Audit Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Corrected manual work session / Supervisor adjustment"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingTime(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingTime}
                    onClick={handleSaveTime}
                    className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer shadow-xs transition-colors"
                  >
                    {isSavingTime ? 'Saving...' : 'Save & Sync Timesheet'}
                  </button>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {task.estimatedHours > 0 && (
              <div className="w-full h-[7px] bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                <div
                  style={{
                    width: `${Math.min(100, Math.round(((Number(task.hoursLogged) || 0) / Number(task.estimatedHours)) * 100))}%`
                  }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    (Number(task.hoursLogged) || 0) > Number(task.estimatedHours) ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-[13px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mt-0 mb-2">
              Task Description
            </h4>
            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
              {task.description || 'No specific description provided for this task.'}
            </div>
          </div>

          {/* Meta Grid (Assignee, Assigner, Timeline, Priority, Status) */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
            {/* Assigned Member (Assignee) with quick Reassign button */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold">Assigned To</div>
                {userCanEdit && (
                  <button
                    onClick={() => setIsReassigning(!isReassigning)}
                    className="bg-transparent border-0 text-blue-600 dark:text-blue-400 text-[11.5px] font-semibold cursor-pointer p-0 hover:underline"
                  >
                    {isReassigning ? 'Cancel' : 'Reassign ↻'}
                  </button>
                )}
              </div>

              {!isReassigning ? (
                <div>
                  {Array.isArray(task.assignees) && task.assignees.length > 1 ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-[11.5px] font-bold text-sky-600 dark:text-sky-400">
                        👥 {task.assignees.length} Assigned Members:
                      </div>
                      <div className="flex flex-wrap gap-[5px]">
                        {task.assignees.map(a => (
                          <div
                            key={a._id || a.id}
                            className="inline-flex items-center gap-[5px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-[7px] py-0.5 rounded-full text-[11px] font-semibold text-slate-800 dark:text-slate-200"
                          >
                            <img
                              src={a.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={a.name}
                              className="w-[18px] h-[18px] rounded-full object-cover"
                            />
                            <span>{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <img
                        src={task.assignedToAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={task.assignedToName}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{task.assignedToName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{task.assignedToRole || 'Team Member'}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <select
                  value={task.assignedToId || ''}
                  onChange={(e) => handleReassign(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-md border border-blue-500 text-[12.5px] font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="" disabled>Select colleague...</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Assigned By (Creator) */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-slate-800">
              <div className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold mb-1.5">Assigned By</div>
              <div className="flex items-center gap-2">
                <img
                  src={task.assignedByAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={task.assignedBy || 'Creator'}
                  className="w-7 h-7 rounded-full object-cover"
                />
                <div>
                  <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{task.assignedBy || 'Admin / Project Manager'}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{task.assignedByRole || 'Assigner'}</div>
                </div>
              </div>
            </div>

            {/* Timeline & Quick Reschedule */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold">Timeline & Schedule</div>
                {userCanEdit && (
                  <button
                    onClick={() => setIsRescheduling(!isRescheduling)}
                    className="bg-transparent border-0 text-blue-600 dark:text-blue-400 text-[11.5px] font-semibold cursor-pointer p-0 hover:underline"
                  >
                    {isRescheduling ? 'Cancel' : 'Reschedule for Future 📅'}
                  </button>
                )}
              </div>

              {!isRescheduling ? (
                <>
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    {task.startDate || '—'} → {task.hasNoDueDate ? 'No Due Date' : (task.dueDate || 'Open')}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Priority: <strong className="text-slate-900 dark:text-slate-100 capitalize">{task.priority || 'Medium'}</strong>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleQuickReschedule(1)}
                      className="flex-1 p-1 text-[10.5px] font-semibold rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 cursor-pointer"
                    >
                      +1d (Tomorrow)
                    </button>
                    <button
                      onClick={() => handleQuickReschedule(3)}
                      className="flex-1 p-1 text-[10.5px] font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50"
                    >
                      +3 Days
                    </button>
                    <button
                      onClick={() => handleQuickReschedule(7)}
                      className="flex-1 p-1 text-[10.5px] font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50"
                    >
                      +7 Days
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="date"
                      value={customFutureDate}
                      onChange={e => setCustomFutureDate(e.target.value)}
                      className="flex-1 px-1.5 py-1 text-[11px] rounded border border-slate-300 dark:border-slate-700 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <button
                      onClick={handleCustomReschedule}
                      disabled={!customFutureDate}
                      className="px-2 py-1 text-[11px] font-bold rounded border-0 bg-blue-600 text-white cursor-pointer disabled:opacity-60"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status Selector */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-slate-800">
              <div className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold mb-1.5">Current Status</div>
              <select
                value={task.status}
                onChange={e => changeTaskStatus(task._id, e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-[12.5px] font-semibold outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="incomplete">🔴 Incomplete / Pending</option>
                <option value="in_progress">🔵 In Progress</option>
                <option value="on_hold">⏸ On Hold / Paused</option>
                <option value="under_review">🟣 Under Review</option>
                <option value="completed">🟢 Completed</option>
              </select>
            </div>
          </div>

          {/* 📋 Task Assignment & Activity History (Audit Trail) */}
          <div className="mt-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={16} className="text-blue-600 dark:text-blue-400" />
                <h4 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 m-0 uppercase tracking-wider">
                  Assignment & Activity History (Audit Trail)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                {(task.history && task.history.length > 0) ? `${task.history.length} Event${task.history.length > 1 ? 's' : ''}` : 'Activity Log'}
              </span>
            </div>

            {/* Timeline List */}
            <div className="flex flex-col gap-2">
              {(() => {
                let historyList = Array.isArray(task.history) && task.history.length > 0 ? [...task.history] : [];
                if (historyList.length === 0) {
                  if (task.createdAt) {
                    historyList.push({
                      id: 'hist_init',
                      timestamp: task.createdAt,
                      action: 'created',
                      title: 'Task Created & Assigned',
                      performedBy: task.assignedBy || 'Administrator',
                      details: `Assigned to ${task.assignedToName || 'team member'} by ${task.assignedBy || 'Administrator'}. (Due: ${task.hasNoDueDate ? 'No Due Date' : (task.dueDate || 'Open')})`
                    });
                  }
                  if (task.status === 'completed' || task.completedAt) {
                    historyList.push({
                      id: 'hist_completed',
                      timestamp: task.completedAt || new Date().toISOString(),
                      action: 'completed',
                      title: 'Task Completed',
                      performedBy: task.assignedToName || 'User',
                      details: `Completed with ${task.hoursLoggedText || `${task.hoursLogged || 0}h`} logged.`
                    });
                  }
                }

                historyList.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

                return historyList.map((item, idx) => {
                  const dateStr = item.timestamp
                    ? new Date(item.timestamp).toLocaleString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })
                    : 'Recorded';

                  const badgeStyle = item.action === 'created'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : (item.action === 'completed'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : (item.action === 'rescheduled'
                        ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'));

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg px-3.5 py-2.5 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10.5px] font-bold px-1.5 py-[1px] rounded border ${badgeStyle}`}>
                            {item.title || item.action}
                          </span>
                        </div>
                        <span className="text-[10.5px] text-slate-400">
                          {dateStr}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-300 leading-normal">
                        {item.details || item.title}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>By: <strong className="text-slate-900 dark:text-slate-100">{item.performedBy || 'User'}</strong></span>
                        {item.to && (
                          <span>To: <strong className="text-slate-900 dark:text-slate-100">{item.to}</strong></span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 sm:px-7 py-3.5 sm:py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
          <div>
            {userCanDelete && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: 'Delete Task',
                    message: `Are you sure you want to permanently delete task "${task.title}" (#${task.taskCode || ''})? This action cannot be reversed.`,
                    confirmText: 'Delete Task',
                    variant: 'danger'
                  });
                  if (ok) {
                    await deleteTask(task._id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                title="Permanently delete task"
              >
                <Trash2 size={14} />
                <span>Delete Task</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-[18px] py-2 rounded-lg text-[13.5px] font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
