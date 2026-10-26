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
    <div id="active-timer-card" style={{
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      padding: '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '10px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <h3
            onClick={() => navigate('/timesheet')}
            style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0, cursor: 'pointer' }}
            title="Click to open Timesheet"
          >
            My Active Timer ⏱️
          </h3>
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
          {currentDateFormatted}
        </div>
      </div>

      {displayActiveTask && displayActiveTask.status !== 'completed' ? (
        <>
          <div style={{
            padding: '8px 10px',
            backgroundColor: '#f8fafc',
            borderRadius: '7px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            {!isClockedIn && (
              <div style={{
                padding: '5px 8px',
                backgroundColor: '#fef2f2',
                borderRadius: '5px',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '4px'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠️ Shift Not Clocked In — Clock in to track task time</span>
                </span>
                <button
                  onClick={handleClockIn}
                  style={{
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Clock In
                </button>
              </div>
            )}

            {displayedIsOnBreak && (
              <div style={{
                padding: '6px 10px',
                backgroundColor: '#fffbeb',
                borderRadius: '6px',
                border: '1.5px solid #fde68a',
                color: '#b45309',
                fontSize: '11.5px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Coffee size={14} color="#d97706" />
                  <span>On {displayedBreakType} — Task timer is paused</span>
                </span>
                {!isViewingOtherEmployee && (
                  <button
                    onClick={resumeFromBreak}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Resume Shift
                  </button>
                )}
              </div>
            )}

            {/* Line 1: Task Title + Project + Overdue Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={displayActiveTask?.title}>
                <span style={{ color: '#0284c7', fontFamily: 'monospace' }}>#{displayActiveTask?.taskCode || 'TSK'}:</span> {displayActiveTask?.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {displayActiveTask?.dueDate && displayActiveTask.dueDate < todayStr && displayActiveTask.status !== 'completed' && (
                  <span style={{ fontSize: '9.5px', fontWeight: '800', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
                    ⚠️ Overdue
                  </span>
                )}
                <span style={{ fontSize: '10px', fontWeight: '600', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#2563eb' }}>
                  {displayActiveTask?.projectName || 'General'}
                </span>
              </div>
            </div>

            {/* Line 2: Meta info (Start Time • Assignee • Assigner) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
              <span>Start: <strong style={{ color: '#334155' }}>{displayActiveTask?.timerStartTime || (displayActiveTask?.timerRunning ? 'Running ⏱️' : (isOnBreak ? 'On Break ☕' : (displayActiveTask?.timerSeconds > 0 ? 'Paused ⏸️' : 'Not Started')))}</strong></span>
              <span>Assignee: <strong style={{ color: '#0f172a' }}>{displayActiveTask?.assignedToName || 'Me'}</strong></span>
              <span>By: <strong style={{ color: '#64748b' }}>{displayActiveTask?.assignedBy || 'Admin'}</strong></span>
            </div>

            {/* Line 3: Progress Bar & Budget Comparison */}
            {displayActiveTask && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', fontWeight: '600', color: '#64748b', marginBottom: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Est. Budget: {displayActiveTask.estimatedHours || 4}h</span>
                    {displayActiveTask.timerRunning && (
                      <span style={{
                        fontSize: '9.5px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                        Live Ticking
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {(Number(displayActiveTask.hoursLogged) || 0) > Number(displayActiveTask.estimatedHours) && (
                      <span style={{ fontSize: '9.5px', padding: '0 4px', borderRadius: '3px', backgroundColor: '#fef3c7', color: '#b45309', fontWeight: '700' }} title="Exceeded estimated time - normal work continues">
                        +{(Number(displayActiveTask.hoursLogged) - Number(displayActiveTask.estimatedHours)).toFixed(1)}h over
                      </span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        color: displayActiveTask.timerRunning ? '#0284c7' : '#475569',
                        fontWeight: '700',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '11px',
                        backgroundColor: displayActiveTask.timerRunning ? '#eff6ff' : '#f1f5f9',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        ⏱️ Task: {displayActiveTask.timerRunning
                          ? (displayActiveTask.liveDurationText || formatTimeDurationSafe(displayActiveTask.timerSeconds || 0))
                          : (displayActiveTask.timerSeconds > 0
                            ? `${formatTimeDurationSafe(displayActiveTask.timerSeconds)} (paused)`
                            : '00:00:00')}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ width: '100%', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round(((((Number(displayActiveTask.hoursLogged) || 0) * 3600) + (Number(displayActiveTask.timerSeconds) || 0)) / ((Number(displayActiveTask.estimatedHours) || 4) * 3600)) * 100)) || 5}%`,
                    backgroundColor: (Number(displayActiveTask.hoursLogged) || 0) > Number(displayActiveTask.estimatedHours) ? '#f59e0b' : '#0284c7',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isViewingOtherEmployee && (
            <div style={{
              padding: '5px 10px',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#92400e',
              fontWeight: '700',
              marginBottom: '6px'
            }}>
              <span>👑 Admin Live Control: {effectiveTargetUser?.name}</span>
              <span style={{ fontSize: '10px', color: '#b45309', fontWeight: '500' }}>⚡ Real-time connected</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
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
              style={{
                flex: 1.2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(22, 163, 74, 0.25)'
              }}
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
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                backgroundColor: displayActiveTask?.timerRunning ? '#eff6ff' : '#ffffff',
                color: displayActiveTask?.timerRunning ? '#2563eb' : '#334155',
                border: displayActiveTask?.timerRunning ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
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
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)'
              }}
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
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                backgroundColor: '#faf5ff',
                color: '#7e22ce',
                border: '1px solid #e9d5ff',
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Pause task right here and schedule CRM reminder"
            >
              <Bell size={12} />
              <span>Do Later ⏰</span>
            </button>

            <button
              onClick={() => stopTaskTimer(displayActiveTask._id)}
              style={{
                flex: 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              title="Stop timer and log hours"
            >
              <Square size={10} fill="#64748b" />
              <span>Stop</span>
            </button>
          </div>

          {/* ── ⏭️ NEXT UP IN QUEUE (Upcoming Tasks) ── */}
          {upcomingQueueTasks.length > 0 && (
            <div style={{
              padding: '8px 10px',
              backgroundColor: '#f8fafc',
              borderRadius: '7px',
              border: '1px dashed #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⏭️</span> Next Up In Queue ({upcomingQueueTasks.length})
                </span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>Click to start next task</span>
              </div>

              {upcomingQueueTasks.slice(0, 2).map(nextT => (
                <div
                  key={nextT._id}
                  style={{
                    padding: '6px 8px',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#0284c7' }}>#{nextT.taskCode || 'TSK'}:</span> {nextT.title}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                      <span>{nextT.projectName || 'General'}</span>
                      <span>•</span>
                      <span>{nextT.estimatedHours ? `${nextT.estimatedHours}h` : 'No est.'}</span>
                      <span style={{
                        padding: '1px 4px',
                        borderRadius: '3px',
                        fontSize: '9px',
                        fontWeight: '700',
                        backgroundColor: nextT.priority === 'urgent' ? '#fee2e2' : nextT.priority === 'high' ? '#ffedd5' : '#eff6ff',
                        color: nextT.priority === 'urgent' ? '#dc2626' : nextT.priority === 'high' ? '#ea580c' : '#2563eb'
                      }}>
                        {nextT.priority?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
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
                      style={{
                        padding: '4px 8px',
                        borderRadius: '5px',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Start working on this task immediately"
                    >
                      <Play size={10} fill="#fff" />
                      <span>Start 🚀</span>
                    </button>

                    <button
                      onClick={() => {
                        setSnoozeTaskTarget(nextT);
                        setIsSnoozeModalOpen(true);
                      }}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '5px',
                        backgroundColor: '#f1f5f9',
                        color: '#7e22ce',
                        border: '1px solid #cbd5e1',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
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
            <div style={{
              padding: '8px 10px',
              backgroundColor: '#faf5ff',
              borderRadius: '7px',
              border: '1px solid #e9d5ff',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#7e22ce', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⏰</span> Tasks On Hold / Reminded ({snoozedTasks.length})
                </span>
                <span style={{ fontSize: '10px', color: '#9333ea' }}>Timer paused & saved</span>
              </div>

              {snoozedTasks.slice(0, 2).map(snz => {
                const isDue = Number(snz.remindAt) <= Date.now();
                const remindTimeStr = new Date(snz.remindAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={snz._id}
                    style={{
                      padding: '6px 8px',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: isDue ? '1px solid #f97316' : '1px solid #e9d5ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#7e22ce' }}>#{snz.taskCode || 'TSK'}:</span> {snz.title}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                        <span>Paused at: <strong>{snz.hoursLoggedText || formatTimeDurationSafe(snz.timerSeconds || 0)}</strong></span>
                        <span>•</span>
                        <span style={{ color: isDue ? '#ea580c' : '#7e22ce', fontWeight: '700' }}>
                          {isDue ? '🚨 Due Now!' : `Reminding at ${remindTimeStr}`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => resumeSnoozedTask(snz._id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '5px',
                        backgroundColor: '#7e22ce',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        flexShrink: 0
                      }}
                    >
                      <Play size={10} fill="#fff" />
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
        <div style={{
          padding: '10px 12px',
          backgroundColor: '#f8fafc',
          borderRadius: '7px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={15} color="#16a34a" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                All tasks completed ({myCompletedTasks.length} finished)
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                No pending tasks in queue.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button
              onClick={() => setIsAddTaskOpen(true)}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <Plus size={11} /> Add Task
            </button>
            <button
              onClick={() => navigate('/timesheet')}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Timesheet →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
