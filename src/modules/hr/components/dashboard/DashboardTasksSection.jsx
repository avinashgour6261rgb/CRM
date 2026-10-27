import React from 'react';
import {
  ListTodo,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export const DashboardTasksSection = ({
  dashboardTaskScope = 'assigned_to_me',
  setDashboardTaskScope,
  dashboardTaskTab = 'pending',
  setDashboardTaskTab,
  currentScopePool = [],
  currentUser = null,
  effectiveTargetUser = null,
  myTasks = [],
  delegatedByMeTasks = [],
  allTeamTasks = [],
  isUserAdminOrHR = false,
  perms = {},
  poolPendingTasks = [],
  poolLeftoverTasks = [],
  poolFutureTasks = [],
  poolInProgressTasksCount = 0,
  poolCompletedTasks = [],
  todayStr = '',
  isTaskActuallyCompleted = (t) => t?.status === 'completed',
  isTaskAssignedToUser = () => false,
  isClockedIn = false,
  isOnBreak = false,
  handleClockIn = () => {},
  startTaskTimer = () => {},
  pauseTaskTimer = () => {},
  completeTask = () => {},
  activeSelectedTaskId = null,
  setActiveSelectedTaskId = () => {},
  setSelectedTask = () => {},
  canDeleteTask = () => false,
  deleteTask = () => {},
  addToast = () => {},
  setIsAddTaskOpen = () => {},
  navigate = () => {}
}) => {
  return (
    <div id="dashboard-my-tasks-section" style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            backgroundColor: '#e0f2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ListTodo size={18} color="#0284c7" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {dashboardTaskScope === 'delegated' ? 'Delegated Tasks' : (dashboardTaskScope === 'all' ? 'All Company Tasks' : 'My Tasks')}
              </h3>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                color: dashboardTaskScope === 'delegated' ? '#7c3aed' : '#0284c7',
                backgroundColor: dashboardTaskScope === 'delegated' ? '#f3e8ff' : '#e0f2fe',
                padding: '1px 7px',
                borderRadius: '10px'
              }}>
                {currentScopePool.length} {dashboardTaskScope === 'delegated' ? 'Delegated' : (dashboardTaskScope === 'all' ? 'Total' : 'Assigned')}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
              {dashboardTaskScope === 'delegated'
                ? `Tasks assigned by ${currentUser?.name || 'you'} to other team members`
                : (dashboardTaskScope === 'all'
                  ? 'All company & team tasks across all projects'
                  : `${effectiveTargetUser?.name || 'Employee'}'s current assignments, priority levels & status`)}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Primary Task Scope Switcher: Assigned to Me vs Delegated by Me vs All */}
          <div style={{
            display: 'flex',
            gap: '3px',
            backgroundColor: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => { setDashboardTaskScope('assigned_to_me'); setDashboardTaskTab('pending'); }}
              style={{
                border: 'none',
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: dashboardTaskScope === 'assigned_to_me' ? '#ffffff' : 'transparent',
                color: dashboardTaskScope === 'assigned_to_me' ? '#0284c7' : '#64748b',
                boxShadow: dashboardTaskScope === 'assigned_to_me' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>📥 Assigned to Me ({myTasks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setDashboardTaskScope('delegated'); setDashboardTaskTab('all'); }}
              style={{
                border: 'none',
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: dashboardTaskScope === 'delegated' ? '#ffffff' : 'transparent',
                color: dashboardTaskScope === 'delegated' ? '#7c3aed' : '#64748b',
                boxShadow: dashboardTaskScope === 'delegated' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>📤 Delegated ({delegatedByMeTasks.length})</span>
            </button>

            {(isUserAdminOrHR || perms?.viewAllTasks) && (
              <button
                type="button"
                onClick={() => { setDashboardTaskScope('all'); setDashboardTaskTab('all'); }}
                style={{
                  border: 'none',
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: dashboardTaskScope === 'all' ? '#ffffff' : 'transparent',
                  color: dashboardTaskScope === 'all' ? '#0f172a' : '#64748b',
                  boxShadow: dashboardTaskScope === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>🏢 All ({allTeamTasks.length})</span>
              </button>
            )}
          </div>

          {/* Status Filter Pills */}
          <div style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px'
          }}>
            {[
              { id: 'pending', label: `Pending (${poolPendingTasks.length})` },
              ...(poolLeftoverTasks.length > 0 ? [{ id: 'leftover', label: `⏮️ Leftover (${poolLeftoverTasks.length})` }] : []),
              ...(poolFutureTasks.length > 0 ? [{ id: 'future', label: `📅 Future (${poolFutureTasks.length})` }] : []),
              { id: 'in_progress', label: `In Progress (${poolInProgressTasksCount})` },
              { id: 'completed', label: `Completed (${poolCompletedTasks.length})` },
              { id: 'all', label: `All (${currentScopePool.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDashboardTaskTab(tab.id)}
                style={{
                  border: 'none',
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: dashboardTaskTab === tab.id ? '#ffffff' : 'transparent',
                  color: dashboardTaskTab === tab.id ? '#0284c7' : '#64748b',
                  boxShadow: dashboardTaskTab === tab.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsAddTaskOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '7px',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Plus size={13} /> Add Task
          </button>

          <button
            onClick={() => navigate('/tasks')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              background: 'none',
              border: 'none',
              color: '#0284c7',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Full Board →
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
              <th style={{ padding: '8px 6px', fontWeight: '600' }}>Task#</th>
              <th style={{ padding: '8px 6px', fontWeight: '600' }}>Task Title</th>
              <th style={{ padding: '8px 6px', fontWeight: '600' }}>Assignee</th>
              <th style={{ padding: '8px 6px', fontWeight: '600' }}>Project</th>
              <th style={{ padding: '8px 6px', fontWeight: '600' }}>Priority</th>
              <th style={{ padding: '8px 6px', fontWeight: '600' }}>Due Date</th>
              <th style={{ padding: '8px 6px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '8px 6px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentScopePool
              .filter(t => {
                if (dashboardTaskTab === 'pending') return !isTaskActuallyCompleted(t);
                if (dashboardTaskTab === 'leftover') return !isTaskActuallyCompleted(t) && !t.isUntimed && !t.hasNoDueDate && ((t.dueDate && t.dueDate < todayStr) || (!t.dueDate && t.startDate && t.startDate < todayStr));
                if (dashboardTaskTab === 'future') return !isTaskActuallyCompleted(t) && ((t.startDate && t.startDate > todayStr) || (t.dueDate && t.dueDate > todayStr));
                if (dashboardTaskTab === 'in_progress') return !isTaskActuallyCompleted(t) && (t.status === 'in_progress' || t.timerRunning);
                if (dashboardTaskTab === 'completed') return isTaskActuallyCompleted(t);
                return true;
              })
              .length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '24px 8px', textAlign: 'center', color: '#94a3b8' }}>
                  No tasks found under "{dashboardTaskTab.replace('_', ' ')}"{dashboardTaskScope === 'delegated' ? ' in delegated tasks' : ''}. Click "Add Task" to create one.
                </td>
              </tr>
            ) : (
              currentScopePool
                .filter(t => {
                  if (dashboardTaskTab === 'pending') return !isTaskActuallyCompleted(t);
                  if (dashboardTaskTab === 'leftover') return !isTaskActuallyCompleted(t) && !t.isUntimed && !t.hasNoDueDate && ((t.dueDate && t.dueDate < todayStr) || (!t.dueDate && t.startDate && t.startDate < todayStr));
                  if (dashboardTaskTab === 'future') return !isTaskActuallyCompleted(t) && ((t.startDate && t.startDate > todayStr) || (t.dueDate && t.dueDate > todayStr));
                  if (dashboardTaskTab === 'in_progress') return !isTaskActuallyCompleted(t) && (t.status === 'in_progress' || t.timerRunning);
                  if (dashboardTaskTab === 'completed') return isTaskActuallyCompleted(t);
                  return true;
                })
                .map(task => {
                  const isDone = isTaskActuallyCompleted(task);
                  const isOverdue = !isDone && !task.isUntimed && !task.hasNoDueDate && task.dueDate && task.dueDate < todayStr;
                  const isDueToday = !isDone && !task.isUntimed && !task.hasNoDueDate && task.dueDate === todayStr;
                  const isRunningTask = task.timerRunning;

                  return (
                    <tr
                      key={task._id || task.id}
                      style={{
                        borderBottom: '1px solid #f8fafc',
                        transition: 'background 0.15s ease',
                        backgroundColor: isRunningTask ? '#f0f9ff' : 'transparent'
                      }}
                      onMouseEnter={e => { if (!isRunningTask) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={e => { if (!isRunningTask) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '8px 6px', color: '#0284c7', fontWeight: '700', fontFamily: 'monospace', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        #{task.taskCode || 'TSK'}
                      </td>
                      <td style={{ padding: '8px 6px', color: '#0f172a', fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span
                            onClick={() => setSelectedTask(task)}
                            style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}
                            title="Click to view task details"
                          >
                            {task.title}
                          </span>
                          {task.isUntimed && (
                            <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '3px', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                              ⚡ Normal Task
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '400', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img
                            src={task.assignedToAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={task.assignedToName}
                            style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>
                              {task.assignedToName || 'Unassigned'}
                            </span>
                            {task.assignedBy && task.assignedBy !== task.assignedToName && (
                              <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                                by {task.assignedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '8px 6px', color: '#475569', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        {task.projectName || 'General Work'}
                      </td>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '5px',
                          fontSize: '10px',
                          fontWeight: '700',
                          backgroundColor: task.priority === 'urgent' ? '#fee2e2' : (task.priority === 'high' ? '#ffedd5' : (task.priority === 'medium' ? '#fef3c7' : '#f1f5f9')),
                          color: task.priority === 'urgent' ? '#dc2626' : (task.priority === 'high' ? '#c2410c' : (task.priority === 'medium' ? '#b45309' : '#475569'))
                        }}>
                          {task.priority ? task.priority.toUpperCase() : 'NORMAL'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: isOverdue || isDueToday ? '700' : '500',
                          color: isOverdue ? '#dc2626' : (isDueToday ? '#d97706' : '#64748b')
                        }}>
                          {task.isUntimed ? '⚡ Flexible / Open' : (isOverdue ? `⚠️ ${task.dueDate}` : (isDueToday ? `📅 Today` : (task.hasNoDueDate ? 'No date' : (task.dueDate || 'No date'))))}
                        </span>
                      </td>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          fontSize: '10.5px',
                          fontWeight: '600',
                          backgroundColor: isDone ? '#f0fdf4' : (isRunningTask ? '#eff6ff' : '#f8fafc'),
                          color: isDone ? '#16a34a' : (isRunningTask ? '#2563eb' : '#64748b'),
                          border: `1px solid ${isDone ? '#bbf7d0' : (isRunningTask ? '#bfdbfe' : '#e2e8f0')}`
                        }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isDone ? '#16a34a' : (isRunningTask ? '#2563eb' : '#94a3b8') }} />
                          {isDone ? 'Completed' : (isRunningTask ? 'In Progress ⏱️' : (task.status ? task.status.replace('_', ' ') : 'Pending'))}
                        </span>
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {!isDone && (
                            isRunningTask ? (
                              <button
                                onClick={() => pauseTaskTimer(task._id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  backgroundColor: '#eff6ff',
                                  color: '#2563eb',
                                  border: '1px solid #bfdbfe',
                                  padding: '3px 7px',
                                  borderRadius: '5px',
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                                title="Pause timer"
                              >
                                <Pause size={10} /> Pause
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const isMyTask = isTaskAssignedToUser(task, currentUser);
                                  if (isMyTask && !isClockedIn) {
                                    handleClockIn();
                                  }
                                  if (isMyTask && isOnBreak) {
                                    addToast('☕ You are on break. Please resume work first!', 'warning');
                                    return;
                                  }
                                  startTaskTimer(task._id);
                                  setActiveSelectedTaskId(task._id);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  backgroundColor: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '3px 7px',
                                  borderRadius: '5px',
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                                title="Start timer for this task"
                              >
                                <Play size={10} /> Start
                              </button>
                            )
                          )}

                          {!isDone && (
                            <button
                              onClick={async () => {
                                await completeTask(task._id, '', false);
                                if (activeSelectedTaskId === task._id) {
                                  setActiveSelectedTaskId(null);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                backgroundColor: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                padding: '3px 7px',
                                borderRadius: '5px',
                                fontSize: '10.5px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="Mark task completed"
                            >
                              <CheckCircle2 size={10} /> Done
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedTask(task)}
                            style={{
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              border: 'none',
                              padding: '3px 7px',
                              borderRadius: '5px',
                              fontSize: '10.5px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="View full task details"
                          >
                            View
                          </button>

                          {canDeleteTask(task) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
                                  deleteTask(task._id);
                                }
                              }}
                              style={{
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                padding: '3px 6px',
                                borderRadius: '5px',
                                fontSize: '10.5px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}
                              title="Delete task"
                            >
                              <Trash2 size={10} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
