import React from 'react';
import { Play, Pause, Square, CheckCircle2, Bell, Coffee, Plus } from 'lucide-react';

export const ActiveTaskTimerCard = ({
  currentDateFormatted,
  displayActiveTask,
  isClockedIn,
  handleClockIn,
  displayedIsOnBreak,
  displayedBreakType,
  isViewingOtherEmployee,
  resumeFromBreak,
  todayStr,
  isOnBreak,
  formatTimeDurationSafe,
  effectiveTargetUser,
  addToast,
  completeAndNextTask,
  setActiveSelectedTaskId,
  pauseTaskTimer,
  startTaskTimer,
  completeTask,
  setSnoozeTaskTarget,
  setIsSnoozeModalOpen,
  stopTaskTimer,
  upcomingQueueTasks = [],
  snoozedTasks = [],
  resumeSnoozedTask,
  myCompletedTasks = [],
  setIsAddTaskOpen,
  navigate
}) => {
  return (
    <div id="active-timer-card" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 sm:px-[18px] flex flex-col justify-between gap-2.5 shadow-xs">
      <div>
        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <h3
            onClick={() => navigate('/timesheet')}
            className="text-sm font-bold text-slate-900 dark:text-white m-0 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Click to open Timesheet"
          >
            My Active Timer ⏱️
          </h3>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          {currentDateFormatted}
        </div>
      </div>

      {displayActiveTask && displayActiveTask.status !== 'completed' ? (
        <>
          <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/80 flex flex-col gap-1.5">
            {!isClockedIn && (
              <div className="p-1.5 px-2 bg-red-50 dark:bg-red-950/40 rounded-md border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-[11px] font-bold flex items-center justify-between gap-1">
                <span className="flex items-center gap-1">
                  <span>⚠️ Shift Not Clocked In — Clock in to track task time</span>
                </span>
                <button
                  onClick={handleClockIn}
                  className="px-2 py-0.5 rounded bg-green-600 hover:bg-green-700 text-white border-none text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Clock In
                </button>
              </div>
            )}

            {displayedIsOnBreak && (
              <div className="p-1.5 px-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11.5px] font-bold flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <Coffee size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>On {displayedBreakType} — Task timer is paused</span>
                </span>
                {!isViewingOtherEmployee && (
                  <button
                    onClick={resumeFromBreak}
                    className="px-2 py-0.5 rounded bg-green-600 hover:bg-green-700 text-white border-none text-[10.5px] font-bold cursor-pointer transition-colors"
                  >
                    Resume Shift
                  </button>
                )}
              </div>
            )}

            {/* Line 1: Task Title + Project + Overdue Badge */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="font-bold text-slate-900 dark:text-white text-[12.5px] overflow-hidden text-ellipsis whitespace-nowrap" title={displayActiveTask?.title}>
                <span className="text-sky-600 dark:text-sky-400 font-mono">#{displayActiveTask?.taskCode || 'TSK'}:</span> {displayActiveTask?.title}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {displayActiveTask?.dueDate && displayActiveTask.dueDate < todayStr && displayActiveTask.status !== 'completed' && (
                  <span className="text-[9.5px] font-extrabold px-1.5 py-[1px] rounded bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900">
                    ⚠️ Overdue
                  </span>
                )}
                <span className="text-[10px] font-semibold px-1.5 py-[1px] rounded bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  {displayActiveTask?.projectName || 'General'}
                </span>
              </div>
            </div>

            {/* Line 2: Meta info (Start Time • Assignee • Assigner) */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Start: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{displayActiveTask?.timerStartTime || (displayActiveTask?.timerRunning ? 'Running ⏱️' : (isOnBreak ? 'On Break ☕' : (displayActiveTask?.timerSeconds > 0 ? 'Paused ⏸️' : 'Not Started')))}</strong></span>
              <span>Assignee: <strong className="text-slate-900 dark:text-white font-semibold">{displayActiveTask?.assignedToName || 'Me'}</strong></span>
              <span>By: <strong className="text-slate-500 dark:text-slate-400">{displayActiveTask?.assignedBy || 'Admin'}</strong></span>
            </div>

            {/* Line 3: Progress Bar & Budget Comparison */}
            {displayActiveTask && (
              <div>
                <div className="flex justify-between items-center text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span>Est. Budget: {displayActiveTask.estimatedHours || 4}h</span>
                    {displayActiveTask.timerRunning && (
                      <span className="text-[9.5px] px-1.5 py-[1px] rounded bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 font-bold inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Live Ticking
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(Number(displayActiveTask.hoursLogged) || 0) > Number(displayActiveTask.estimatedHours) && (
                      <span className="text-[9.5px] px-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold" title="Exceeded estimated time - normal work continues">
                        +{(Number(displayActiveTask.hoursLogged) - Number(displayActiveTask.estimatedHours)).toFixed(1)}h over
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold font-mono text-[11px] px-1.5 py-0.5 rounded ${
                        displayActiveTask.timerRunning 
                          ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60' 
                          : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800'
                      }`}>
                        ⏱️ Task: {displayActiveTask.timerRunning
                          ? (displayActiveTask.liveDurationText || formatTimeDurationSafe(displayActiveTask.timerSeconds || 0))
                          : (displayActiveTask.timerSeconds > 0
                            ? `${formatTimeDurationSafe(displayActiveTask.timerSeconds)} (paused)`
                            : '00:00:00')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      (Number(displayActiveTask.hoursLogged) || 0) > Number(displayActiveTask.estimatedHours)
                        ? 'bg-amber-500'
                        : 'bg-sky-600'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round(((((Number(displayActiveTask.hoursLogged) || 0) * 3600) + (Number(displayActiveTask.timerSeconds) || 0)) / ((Number(displayActiveTask.estimatedHours) || 4) * 3600)) * 100)) || 5}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isViewingOtherEmployee && (
            <div className="p-1.5 px-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-300 dark:border-amber-800 flex items-center justify-between text-[11px] text-amber-900 dark:text-amber-200 font-bold mb-1.5">
              <span>👑 Admin Live Control: {effectiveTargetUser?.name}</span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">⚡ Real-time connected</span>
            </div>
          )}

          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={async () => {
                if (!isViewingOtherEmployee && !isClockedIn) {
                  addToast('⚠️ Shift is not clocked in! Please Clock In above before advancing tasks.', 'warning');
                  return;
                }
                if (!isViewingOtherEmployee && isOnBreak) {
                  addToast('☕ You are currently on break. Please resume work before running task timers!', 'warning');
                  return;
                }
                const res = await completeAndNextTask(displayActiveTask._id);
                if (res?.nextTask) {
                  setActiveSelectedTaskId(res.nextTask._id);
                } else {
                  setActiveSelectedTaskId(null);
                }
              }}
              className="flex-[1.2] flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white border-none py-1.5 px-2.5 rounded-lg text-[11.5px] font-bold cursor-pointer shadow-sm shadow-green-600/30 transition-colors"
              title="Mark current task complete & automatically start next task in queue"
            >
              <CheckCircle2 size={13} />
              <span>Complete & Next</span>
            </button>

            <button
              onClick={() => {
                if (!isViewingOtherEmployee && !isClockedIn) {
                  addToast('⚠️ Shift is not clocked in! Please Clock In above before starting task timers.', 'warning');
                  return;
                }
                if (!isViewingOtherEmployee && isOnBreak) {
                  addToast('☕ You are currently on break. Please resume work before running task timers!', 'warning');
                  return;
                }
                if (displayActiveTask?.timerRunning) {
                  pauseTaskTimer(displayActiveTask._id);
                } else {
                  startTaskTimer(displayActiveTask._id);
                }
              }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11.5px] font-semibold cursor-pointer border transition-colors ${
                displayActiveTask?.timerRunning
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {displayActiveTask?.timerRunning ? <Pause size={12} /> : <Play size={12} />}
              <span>
                {displayActiveTask?.timerRunning
                  ? 'Pause'
                  : (displayActiveTask?.timerSeconds > 0 ? 'Resume' : 'Start Timer')}
              </span>
            </button>

            <button
              onClick={async () => {
                const res = await completeTask(displayActiveTask._id, '', false);
                if (res?.nextTask) {
                  setActiveSelectedTaskId(res.nextTask._id);
                } else {
                  setActiveSelectedTaskId(null);
                }
              }}
              className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none py-1.5 px-2 rounded-lg text-[11.5px] font-bold cursor-pointer shadow-sm shadow-emerald-600/30 transition-colors"
              title="Mark this task as complete (without auto-starting next task)"
            >
              <CheckCircle2 size={12} />
              <span>Complete</span>
            </button>

            <button
              onClick={() => {
                setSnoozeTaskTarget(displayActiveTask);
                setIsSnoozeModalOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 py-1.5 px-2 rounded-lg text-[11.5px] font-bold cursor-pointer transition-colors"
              title="Pause task right here and schedule CRM reminder"
            >
              <Bell size={12} />
              <span>Do Later ⏰</span>
            </button>

            <button
              onClick={() => stopTaskTimer(displayActiveTask._id)}
              className="flex-[0.7] flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 py-1.5 px-2 rounded-lg text-[11.5px] font-semibold cursor-pointer transition-colors"
              title="Stop timer and log hours"
            >
              <Square size={10} className="fill-slate-500" />
              <span>Stop</span>
            </button>
          </div>

          {/* ── ⏭️ NEXT UP IN QUEUE (Upcoming Tasks) ── */}
          {upcomingQueueTasks.length > 0 && (
            <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-sky-700 dark:text-sky-300 flex items-center gap-1">
                  <span>⏭️</span> Next Up In Queue ({upcomingQueueTasks.length})
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Click to start next task</span>
              </div>

              {upcomingQueueTasks.slice(0, 2).map(nextT => (
                <div
                  key={nextT._id}
                  className="p-1.5 px-2 bg-white dark:bg-slate-850 rounded-md border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] font-bold text-slate-900 dark:text-white overflow-hidden text-ellipsis whitespace-nowrap">
                      <span className="text-sky-600 dark:text-sky-400">#{nextT.taskCode || 'TSK'}:</span> {nextT.title}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{nextT.projectName || 'General'}</span>
                      <span>•</span>
                      <span>{nextT.estimatedHours ? `${nextT.estimatedHours}h` : 'No est.'}</span>
                      <span className={`px-1 py-[1px] rounded text-[9px] font-bold ${
                        nextT.priority === 'urgent'
                          ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400'
                          : nextT.priority === 'high'
                            ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400'
                            : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                      }`}>
                        {nextT.priority?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        if (!isClockedIn) {
                          addToast('⚠️ Shift is not clocked in! Please Clock In above before starting task timers.', 'warning');
                          return;
                        }
                        if (isOnBreak) {
                          addToast('☕ You are currently on break. Please resume work before running task timers!', 'warning');
                          return;
                        }
                        startTaskTimer(nextT._id);
                        setActiveSelectedTaskId(nextT._id);
                      }}
                      className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white border-none text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors"
                      title="Start working on this task immediately"
                    >
                      <Play size={10} className="fill-white" />
                      <span>Start 🚀</span>
                    </button>

                    <button
                      onClick={() => {
                        setSnoozeTaskTarget(nextT);
                        setIsSnoozeModalOpen(true);
                      }}
                      className="p-1 px-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 border border-slate-300 dark:border-slate-700 text-[10.5px] font-bold cursor-pointer transition-colors"
                      title="Snooze / Do Later"
                    >
                      ⏰
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ⏰ SNOOZED / ON-HOLD REMINDER TASKS ── */}
          {snoozedTasks.length > 0 && (
            <div className="p-2 sm:p-2.5 bg-purple-50/60 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <span>⏰</span> Tasks On Hold / Reminded ({snoozedTasks.length})
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400">Timer paused & saved</span>
              </div>

              {snoozedTasks.slice(0, 2).map(snz => {
                const isDue = Number(snz.remindAt) <= Date.now();
                const remindTimeStr = new Date(snz.remindAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={snz._id}
                    className={`p-1.5 px-2 bg-white dark:bg-slate-850 rounded-md border flex items-center justify-between gap-1.5 ${
                      isDue ? 'border-orange-500' : 'border-purple-200 dark:border-purple-900/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[11.5px] font-bold text-slate-900 dark:text-white overflow-hidden text-ellipsis whitespace-nowrap">
                        <span className="text-purple-600 dark:text-purple-400">#{snz.taskCode || 'TSK'}:</span> {snz.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>Paused at: <strong>{snz.hoursLoggedText || formatTimeDurationSafe(snz.timerSeconds || 0)}</strong></span>
                        <span>•</span>
                        <span className={`font-bold ${isDue ? 'text-orange-600 dark:text-orange-400' : 'text-purple-600 dark:text-purple-400'}`}>
                          {isDue ? '🚨 Due Now!' : `Reminding at ${remindTimeStr}`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => resumeSnoozedTask(snz._id)}
                      className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white border-none text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <Play size={10} className="fill-white" />
                      <span>Resume 🚀</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Clean Minimal All Tasks Completed View */
        <div className="p-2.5 sm:px-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-green-600 dark:text-green-400" />
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                All tasks completed ({myCompletedTasks.length} finished)
              </div>
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                No pending tasks in queue.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsAddTaskOpen(true)}
              className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white border-none text-[11px] font-semibold cursor-pointer flex items-center gap-1 transition-colors"
            >
              <Plus size={11} /> Add Task
            </button>
            <button
              onClick={() => navigate('/timesheet')}
              className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
            >
              Timesheet →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
