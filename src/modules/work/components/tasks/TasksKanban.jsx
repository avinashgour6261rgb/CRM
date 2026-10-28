/**
 * @file TasksKanban.jsx
 * @description Interactive Kanban Board view for Tasks in EMS.
 */

import React from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { confirmDialog } from '../../../../shared/context/ConfirmContext';

const COLUMNS = [
  {
    key: 'incomplete',
    title: 'Incomplete / Pending',
    borderClass: 'border-red-200 dark:border-red-900/60',
    dotClass: 'bg-red-600',
    badgeClass: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60'
  },
  {
    key: 'in_progress',
    title: 'In Progress',
    borderClass: 'border-blue-200 dark:border-blue-900/60',
    dotClass: 'bg-blue-600',
    badgeClass: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60'
  },
  {
    key: 'on_hold',
    title: 'On Hold / Paused',
    borderClass: 'border-amber-200 dark:border-amber-900/60',
    dotClass: 'bg-amber-600',
    badgeClass: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60'
  },
  {
    key: 'under_review',
    title: 'Under Review',
    borderClass: 'border-purple-200 dark:border-purple-900/60',
    dotClass: 'bg-purple-600',
    badgeClass: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60'
  },
  {
    key: 'completed',
    title: 'Completed',
    borderClass: 'border-green-200 dark:border-green-900/60',
    dotClass: 'bg-green-600',
    badgeClass: 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/60'
  }
];

export const TasksKanban = ({ tasks: propTasks, onSelectTask }) => {
  const { tasks: contextTasks, changeTaskStatus, startTaskTimer, pauseTaskTimer, stopTaskTimer, completeTask, deleteTask } = useWork();
  const { currentUser } = useAuth();
  const tasks = propTasks !== undefined ? propTasks : (contextTasks || []);

  const canDeleteTask = (task) => {
    if (!currentUser) return false;
    return (
      currentUser.isAdmin ||
      currentUser.isSuperAdmin ||
      currentUser.systemRole === 'admin' ||
      currentUser.systemRole === 'hr' ||
      currentUser.role === 'Administrator' ||
      currentUser.role === 'HR Manager' ||
      currentUser.permissions?.manageTasks ||
      currentUser.permissions?.deleteTasks ||
      task?.assignedById === currentUser?._id ||
      task?.createdBy === currentUser?.name ||
      task?.createdById === currentUser?._id
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 items-start">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter(t => (t.status || 'incomplete') === col.key);

        return (
          <div
            key={col.key}
            className={`bg-slate-50 dark:bg-slate-900/50 rounded-xl border ${col.borderClass} p-4 flex flex-col gap-3 min-h-[400px]`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dotClass}`} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
                  {col.title}
                </h3>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badgeClass}`}>
                {colTasks.length}
              </span>
            </div>

            {/* Task Cards */}
            <div className="flex flex-col gap-2.5">
              {colTasks.map((task) => (
                <div
                  key={task._id}
                  onClick={() => onSelectTask && onSelectTask(task)}
                  className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700/80 p-3.5 shadow-xs hover:shadow-md cursor-pointer flex flex-col gap-2.5 transition-all"
                >
                  {/* Top Bar: Code & Project */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                        {task.taskCode || 'TSK'}
                      </span>
                      {task.isPersonal && (
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-[1px] rounded border border-purple-200 dark:border-purple-800">
                          🔒 Personal
                        </span>
                      )}
                      {task.isUntimed && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-[1px] rounded border border-emerald-200 dark:border-emerald-800">
                          ⚡ Normal
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {task.projectName || 'General'}
                      </span>
                      {canDeleteTask(task) && (
                        <button
                          type="button"
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
                          className="bg-transparent border-none text-slate-400 hover:text-red-500 p-0.5 cursor-pointer flex items-center rounded transition-colors"
                          title="Delete task"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-[13.5px] font-semibold text-slate-900 dark:text-white leading-snug">
                    {task.title}
                  </div>

                  {/* Action Bar (Timer Controls + Complete Button) */}
                  <div className="flex items-center justify-between gap-1.5">
                    {(task.timerRunning && task.status !== 'completed' && !task.completedAt) ? (
                      <div className="flex items-center gap-1 bg-sky-600 text-white px-2 py-1 rounded-md text-[11px] font-bold">
                        <span>⏱️ {task.liveDurationText || task.hoursLoggedText}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            pauseTaskTimer(task._id);
                          }}
                          className="bg-white/25 hover:bg-white/35 border-none text-white px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors"
                        >
                          Pause
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            stopTaskTimer(task._id);
                          }}
                          className="bg-white/25 hover:bg-white/35 border-none text-white px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors"
                        >
                          Stop
                        </button>
                      </div>
                    ) : task.status !== 'completed' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startTaskTimer(task._id);
                        }}
                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-400 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded text-[10.5px] font-bold cursor-pointer transition-colors"
                      >
                        <Play size={9} className="fill-sky-600 dark:fill-sky-400" /> Start
                      </button>
                    ) : (
                      <span className="text-[10.5px] text-green-600 dark:text-green-400 font-bold">
                        ✓ Completed
                      </span>
                    )}

                    {task.status !== 'completed' && (
                      <button
                        title="Mark Completed"
                        onClick={(e) => {
                          e.stopPropagation();
                          completeTask(task._id);
                        }}
                        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white border-none px-2 py-1 rounded text-[10.5px] font-bold cursor-pointer shadow-xs transition-colors"
                      >
                        <CheckCircle2 size={11} /> Complete
                      </button>
                    )}
                  </div>

                  {/* Bottom details: Assignee & Date */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    {Array.isArray(task.assignees) && task.assignees.length > 1 ? (
                      <div
                        className="flex items-center gap-1.5"
                        title={task.assignees.map(a => a.name).join(', ')}
                      >
                        <div className="flex items-center">
                          {task.assignees.slice(0, 3).map((a, idx) => (
                            <img
                              key={a._id || a.id || idx}
                              src={a.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={a.name}
                              className={`w-5 h-5 rounded-full object-cover border-2 border-white dark:border-slate-800 ${idx > 0 ? '-ml-1.5' : ''}`}
                            />
                          ))}
                        </div>
                        <div className="text-[10.5px] font-bold text-sky-600 dark:text-sky-400">
                          {task.assignees.length} Members
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <img
                          src={task.assignedToAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={task.assignedToName}
                          className="w-[22px] h-[22px] rounded-full object-cover"
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {task.assignedToName || 'Unassigned'}
                          </div>
                          {task.assignedBy && task.assignedBy !== task.assignedToName && (
                            <div className="text-[10px] text-slate-400">
                              By {task.assignedBy}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {task.isUntimed ? '⚡ Open Duration' : (task.hasNoDueDate ? 'No Due Date' : `Due: ${task.dueDate || 'N/A'}`)}
                    </div>
                  </div>
                </div>
              ))}

              {colTasks.length === 0 && (
                <div className="py-8 px-2.5 text-center text-[12.5px] text-slate-400 italic">
                  No tasks in this column
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
