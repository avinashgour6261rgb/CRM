import React from 'react';
import {
  ListTodo,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { confirmDialog } from '../../../../shared/context/ConfirmContext';

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
    <div id="dashboard-my-tasks-section" className="bg-white rounded-xl border border-slate-200 p-4 px-5 flex flex-col gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-lg bg-sky-100 flex items-center justify-center">
            <ListTodo size={18} color="#0284c7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] font-extrabold text-slate-900 m-0">
                {dashboardTaskScope === 'delegated' ? 'Delegated Tasks' : (dashboardTaskScope === 'all' ? 'All Company Tasks' : 'My Tasks')}
              </h3>
              <span
                className={`text-[11px] font-bold py-px px-[7px] rounded-[10px] ${dashboardTaskScope === 'delegated' ? 'text-purple-600 bg-purple-100' : 'text-sky-600 bg-sky-100'}`}
              >
                {currentScopePool.length} {dashboardTaskScope === 'delegated' ? 'Delegated' : (dashboardTaskScope === 'all' ? 'Total' : 'Assigned')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              {dashboardTaskScope === 'delegated'
                ? `Tasks assigned by ${currentUser?.name || 'you'} to other team members`
                : (dashboardTaskScope === 'all'
                  ? 'All company & team tasks across all projects'
                  : `${effectiveTargetUser?.name || 'Employee'}'s current assignments, priority levels & status`)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Primary Task Scope Switcher: Assigned to Me vs Delegated by Me vs All */}
          <div className="flex gap-[3px] bg-slate-100 p-[3px] rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => { setDashboardTaskScope('assigned_to_me'); setDashboardTaskTab('pending'); }}
              className={`border-none py-1 px-[9px] rounded-md text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-all ${dashboardTaskScope === 'assigned_to_me' ? 'bg-white text-sky-600 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <span>📥 Assigned to Me ({myTasks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setDashboardTaskScope('delegated'); setDashboardTaskTab('all'); }}
              className={`border-none py-1 px-[9px] rounded-md text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-all ${dashboardTaskScope === 'delegated' ? 'bg-white text-purple-600 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <span>📤 Delegated ({delegatedByMeTasks.length})</span>
            </button>

            {(isUserAdminOrHR || perms?.viewAllTasks) && (
              <button
                type="button"
                onClick={() => { setDashboardTaskScope('all'); setDashboardTaskTab('all'); }}
                className={`border-none py-1 px-[9px] rounded-md text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-all ${dashboardTaskScope === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <span>🏢 All ({allTeamTasks.length})</span>
              </button>
            )}
          </div>

          {/* Status Filter Pills */}
          <div className="flex gap-1 bg-slate-100 p-[3px] rounded-lg">
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
                className={`border-none py-1 px-[9px] rounded-md text-[11px] font-bold cursor-pointer transition-all ${dashboardTaskTab === tab.id ? 'bg-white text-sky-600 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsAddTaskOpen(true)}
            className="flex items-center gap-1 bg-sky-600 text-white border-none py-1.5 px-3 rounded-[7px] text-[11.5px] font-bold cursor-pointer hover:bg-sky-700 transition-colors"
          >
            <Plus size={13} /> Add Task
          </button>

          <button
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-0.5 bg-transparent border-none text-sky-600 text-xs font-bold cursor-pointer hover:underline"
          >
            Full Board →
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="py-2 px-1.5 font-semibold">Task#</th>
              <th className="py-2 px-1.5 font-semibold">Task Title</th>
              <th className="py-2 px-1.5 font-semibold">Assignee</th>
              <th className="py-2 px-1.5 font-semibold">Project</th>
              <th className="py-2 px-1.5 font-semibold">Priority</th>
              <th className="py-2 px-1.5 font-semibold">Due Date</th>
              <th className="py-2 px-1.5 font-semibold">Status</th>
              <th className="py-2 px-1.5 font-semibold text-right">Actions</th>
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
                <td colSpan={8} className="py-6 px-2 text-center text-slate-400">
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
                      className={`border-b border-slate-50 transition-colors ${isRunningTask ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-2 px-1.5 text-sky-600 font-bold font-mono text-[11.5px] whitespace-nowrap">
                        #{task.taskCode || 'TSK'}
                      </td>
                      <td className="py-2 px-1.5 text-slate-900 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => setSelectedTask(task)}
                            className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px] hover:underline"
                            title="Click to view task details"
                          >
                            {task.title}
                          </span>
                          {task.isUntimed && (
                            <span className="text-[9px] font-bold py-px px-1.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                              ⚡ Normal Task
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <div className="text-[10.5px] text-slate-500 font-normal overflow-hidden text-ellipsis whitespace-nowrap max-w-[220px]">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={task.assignedToAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={task.assignedToName}
                            className="w-[22px] h-[22px] rounded-full object-cover border border-slate-300"
                          />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-900">
                              {task.assignedToName || 'Unassigned'}
                            </span>
                            {task.assignedBy && task.assignedBy !== task.assignedToName && (
                              <span className="text-[9.5px] text-slate-500">
                                by {task.assignedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-1.5 text-slate-600 text-[11.5px] whitespace-nowrap">
                        {task.projectName || 'General Work'}
                      </td>
                      <td className="py-2 px-1.5 whitespace-nowrap">
                        <span
                          className={`py-px px-1.5 rounded-[5px] text-[10px] font-bold ${task.priority === 'urgent' ? 'bg-red-100 text-red-600' : (task.priority === 'high' ? 'bg-orange-100 text-orange-700' : (task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'))}`}
                        >
                          {task.priority ? task.priority.toUpperCase() : 'NORMAL'}
                        </span>
                      </td>
                      <td className="py-2 px-1.5 whitespace-nowrap">
                        <span
                          className={`text-[11px] ${isOverdue || isDueToday ? 'font-bold' : 'font-medium'} ${isOverdue ? 'text-red-600' : (isDueToday ? 'text-amber-600' : 'text-slate-500')}`}
                        >
                          {task.isUntimed ? '⚡ Flexible / Open' : (isOverdue ? `⚠️ ${task.dueDate}` : (isDueToday ? `📅 Today` : (task.hasNoDueDate ? 'No date' : (task.dueDate || 'No date'))))}
                        </span>
                      </td>
                      <td className="py-2 px-1.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 py-px px-1.5 rounded-lg text-[10.5px] font-semibold border ${isDone ? 'bg-green-50 text-green-600 border-green-200' : (isRunningTask ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200')}`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${isDone ? 'bg-green-600' : (isRunningTask ? 'bg-blue-600' : 'bg-slate-400')}`}
                          />
                          {isDone ? 'Completed' : (isRunningTask ? 'In Progress ⏱️' : (task.status ? task.status.replace('_', ' ') : 'Pending'))}
                        </span>
                      </td>
                      <td className="py-2 px-1.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {!isDone && (
                            isRunningTask ? (
                              <button
                                onClick={() => pauseTaskTimer(task._id)}
                                className="flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 py-[3px] px-[7px] rounded-[5px] text-[10.5px] font-bold cursor-pointer hover:bg-blue-100 transition-colors"
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
                                className="flex items-center gap-1 bg-sky-600 text-white border-none py-[3px] px-[7px] rounded-[5px] text-[10.5px] font-bold cursor-pointer hover:bg-sky-700 transition-colors"
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
                              className="flex items-center gap-0.5 bg-green-600 text-white border-none py-[3px] px-[7px] rounded-[5px] text-[10.5px] font-bold cursor-pointer hover:bg-green-700 transition-colors"
                              title="Mark task completed"
                            >
                              <CheckCircle2 size={10} /> Done
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedTask(task)}
                            className="bg-slate-100 text-slate-600 border-none py-[3px] px-[7px] rounded-[5px] text-[10.5px] font-semibold cursor-pointer hover:bg-slate-200 transition-colors"
                            title="View full task details"
                          >
                            View
                          </button>

                          {canDeleteTask(task) && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const ok = await confirmDialog({
                                  title: 'Delete Task',
                                  message: `Are you sure you want to delete task "${task.title}"?`,
                                  confirmText: 'Delete Task',
                                  variant: 'danger'
                                });
                                if (ok) {
                                  deleteTask(task._id);
                                }
                              }}
                              className="bg-red-50 text-red-600 border border-red-200 py-[3px] px-1.5 rounded-[5px] text-[10.5px] font-semibold cursor-pointer inline-flex items-center gap-0.5 hover:bg-red-100 transition-colors"
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
