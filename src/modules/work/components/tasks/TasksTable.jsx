/**
 * @file TasksTable.jsx
 * @description Task management table view matching Screenshot 2 with active ticking session timers, status controls, and HR integration.
 */

import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  MoreVertical,
  Clock,
  Eye,
  Trash2,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  Bell
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useConfirm, confirmDialog } from '../../../../shared/context/ConfirmContext';
import { SnoozeTaskModal } from './SnoozeTaskModal';

const STATUS_CONFIG = {
  incomplete: { label: 'Incomplete', color: '#dc2626', bg: '#fef2f2', dot: '#ef4444' },
  in_progress: { label: 'In Progress', color: '#2563eb', bg: '#eff6ff', dot: '#3b82f6' },
  on_hold: { label: 'On Hold', color: '#d97706', bg: '#fffbeb', dot: '#f59e0b' },
  under_review: { label: 'Under Review', color: '#9333ea', bg: '#faf5ff', dot: '#a855f7' },
  completed: { label: 'Completed', color: '#16a34a', bg: '#f0fdf4', dot: '#22c55e' }
};

export const TasksTable = ({ tasks: propTasks, onSelectTask }) => {
  const {
    tasks: contextTasks,
    deleteTask,
    changeTaskStatus,
    completeTask,
    startTaskTimer,
    pauseTaskTimer,
    stopTaskTimer,
    resumeSnoozedTask,
    isEmployeeOnLeave,
    formatSeconds
  } = useWork();

  const tasks = propTasks !== undefined ? propTasks : (contextTasks || []);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [snoozeTargetTask, setSnoozeTargetTask] = useState(null);
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTaskIds(tasks.map(t => t._id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const toggleSelectTask = (id, e) => {
    e.stopPropagation();
    setSelectedTaskIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setActiveMenuId(null);
    const ok = await confirmDialog({
      title: 'Delete Task',
      message: 'Are you sure you want to permanently delete this task? This cannot be undone.',
      confirmText: 'Delete Task',
      variant: 'danger'
    });
    if (ok) {
      deleteTask(id);
    }
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 py-[60px] px-5 text-center">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4 text-blue-600">
          <Clock size={28} />
        </div>
        <h3 className="text-base font-bold text-slate-900 m-0 mb-1.5">
          No Tasks Found
        </h3>
        <p className="text-[13.5px] text-slate-500 m-0">
          Create a new task to assign it to team members and start tracking work.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-2 px-2.5 w-8">
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={selectedTaskIds.length === tasks.length && tasks.length > 0}
                  className="cursor-pointer"
                />
              </th>
              <th className="py-2 px-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[65px]">
                Code
              </th>
              <th className="py-2 px-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[95px]">
                Timer
              </th>
              <th className="py-2 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Task & Project
              </th>
              <th className="py-2 px-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[135px]">
                Schedule & Due
              </th>
              <th className="py-2 px-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[125px]">
                Logged / Est
              </th>
              <th className="py-2 px-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[145px]">
                Assigned To
              </th>
              <th className="py-2 px-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[115px]">
                Status
              </th>
              <th className="py-2 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right w-[90px]">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.incomplete;
              const isMenuOpen = activeMenuId === task._id;
              const isSelected = selectedTaskIds.includes(task._id);
              const isOnLeave = isEmployeeOnLeave(task.assignedToId || task.assignedTo);

              return (
                <tr
                  key={task._id}
                  onClick={() => onSelectTask && onSelectTask(task)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/80'}`}
                >
                  {/* Checkbox */}
                  <td className="py-1.5 px-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => toggleSelectTask(task._id, e)}
                      onClick={e => e.stopPropagation()}
                      className="cursor-pointer"
                    />
                  </td>

                  {/* Code (e.g. TSK-1) */}
                  <td className="py-1.5 px-2.5 text-[11.5px] font-bold text-slate-600 whitespace-nowrap">
                    {task.taskCode || 'TSK-1'}
                  </td>

                  {/* Timer Pill with Controls */}
                  <td className="py-1.5 px-2.5 whitespace-nowrap">
                    {task.status === 'completed' || task.completedAt ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 border border-green-200 py-0.5 px-2 rounded-full text-[11px] font-bold">
                        <CheckCircle2 size={12} className="text-green-600" />
                        <span>Done ({task.hoursLoggedText || formatSeconds(task.timerSeconds || 0)})</span>
                      </span>
                    ) : task.timerRunning ? (
                      <div className="inline-flex items-center gap-1 bg-sky-600 text-white py-0.5 px-2 rounded-full text-[11px] font-bold shadow-[0_2px_4px_rgba(2,132,199,0.3)]">
                        {/* Pause button */}
                        <button
                          title="Pause Timer"
                          onClick={(e) => {
                            e.stopPropagation();
                            pauseTaskTimer(task._id);
                          }}
                          className="bg-white/25 border-none rounded-full w-4 h-4 flex items-center justify-center text-white cursor-pointer hover:bg-white/40 transition-colors"
                        >
                          <Pause size={8} fill="#ffffff" />
                        </button>

                        {/* Stop & Log button */}
                        <button
                          title="Stop Timer & Log to Timesheet"
                          onClick={(e) => {
                            e.stopPropagation();
                            stopTaskTimer(task._id);
                          }}
                          className="bg-white/25 border-none rounded-full w-4 h-4 flex items-center justify-center text-white cursor-pointer hover:bg-white/40 transition-colors"
                        >
                          <Square size={7} fill="#ffffff" />
                        </button>

                        <span className="font-mono tracking-wide text-[11px]">
                          ⏱️ {task.liveDurationText || formatSeconds(task.timerSeconds || 0)}
                        </span>
                      </div>
                    ) : task.snoozed ? (
                      <div className="inline-flex items-center gap-1">
                        <span
                          className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 py-0.5 px-2 rounded-full text-[10.5px] font-bold"
                          title={task.reminderNote ? `Note: ${task.reminderNote}` : 'CRM Reminder Active'}
                        >
                          <Bell size={10} />
                          <span>Remind: {new Date(task.remindAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <button
                          title="Resume task timer now"
                          onClick={(e) => {
                            e.stopPropagation();
                            resumeSnoozedTask(task._id);
                          }}
                          className="inline-flex items-center gap-0.5 bg-purple-700 text-white border-none py-0.5 px-1.5 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-purple-800 transition-colors"
                        >
                          <Play size={8} fill="#fff" />
                          Resume
                        </button>
                      </div>
                    ) : (
                      <button
                        title="Start Tracking Work"
                        onClick={(e) => {
                          e.stopPropagation();
                          startTaskTimer(task._id);
                        }}
                        className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-300 py-0.5 px-2 rounded-full text-[11px] font-semibold cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                      >
                        <Play size={9} fill="#475569" />
                        <span>Start</span>
                      </button>
                    )}
                  </td>

                  {/* Task Name & Project Name subtitle */}
                  <td className="py-1.5 px-3 min-w-[180px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12.5px] font-semibold text-slate-900 leading-snug">
                        {task.title}
                      </span>
                      {task.isPersonal && (
                        <span className="text-[9.5px] font-bold py-px px-1.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          🔒 Personal
                        </span>
                      )}
                      {task.isUntimed && (
                        <span className="text-[9.5px] font-bold py-px px-1.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ⚡ Normal Task
                        </span>
                      )}
                      {!task.isUntimed && !task.hasNoDueDate && task.dueDate && task.dueDate < todayStr && task.status !== 'completed' && (
                        <span className="text-[9.5px] font-extrabold py-px px-1.5 rounded bg-red-100 text-red-600 border border-red-200">
                          ⚠️ OVERDUE
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] font-bold text-slate-500 uppercase mt-px tracking-wider">
                      {task.projectName || 'General Work'}
                    </div>
                  </td>

                  {/* Schedule & Due Date */}
                  <td className="py-1.5 px-2.5">
                    {task.completedOn ? (
                      <div>
                        <span className="text-[11px] font-bold text-green-700 bg-green-50 py-px px-1.5 rounded border border-green-200">
                          ✅ {task.completedOn === todayStr ? 'Today' : task.completedOn}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Start: {task.startDate || '—'}
                        </div>
                      </div>
                    ) : (!task.isUntimed && !task.hasNoDueDate && task.dueDate && task.dueDate < todayStr && task.status !== 'completed') ? (
                      <div>
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 border border-red-200 py-px px-1.5 rounded font-extrabold text-[10.5px]">
                          ⚠️ {task.dueDate}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Start: {task.startDate || '—'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className={`text-[11px] font-bold ${task.dueDate === todayStr ? 'text-orange-600' : 'text-slate-700'}`}>
                          {task.isUntimed ? '⚡ Flexible / Open' : (task.hasNoDueDate ? 'No Due Date' : (task.dueDate === todayStr ? '🔥 Due Today' : `Due: ${task.dueDate}`))}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-px">
                          Start: {task.startDate === todayStr ? 'Today' : (task.startDate || '—')}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Hours Logged & Progress with Live / Tracked time */}
                  <td className="py-1.5 px-2.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-900">
                        {task.timerRunning ? (
                          <span className="text-green-600 inline-flex items-center gap-1 font-extrabold">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                            ⏱️ {task.liveDurationText || formatSeconds(task.timerSeconds || 0)} (Live)
                          </span>
                        ) : Number(task.timerSeconds) > 0 ? (
                          <span className="text-sky-600 inline-flex items-center gap-1">
                            ⏸️ {formatSeconds(task.timerSeconds)} worked
                          </span>
                        ) : (
                          <span>{task.hoursLogged ? `${task.hoursLogged}h` : '0h'} / {task.isUntimed || !task.estimatedHours ? 'Open' : `${task.estimatedHours}h`}</span>
                        )}
                        {task.isUntimed || !task.estimatedHours ? (
                          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 py-px px-1.5 rounded">
                            ⚡ Open
                          </span>
                        ) : (
                          <span className={`text-[9.5px] font-extrabold ${((Number(task.hoursLogged) || 0) + (Number(task.timerSeconds || 0) / 3600)) > Number(task.estimatedHours) ? 'text-amber-600' : 'text-green-600'}`}>
                            {Math.round(((((Number(task.hoursLogged) || 0) * 3600) + (Number(task.timerSeconds) || 0)) / (Number(task.estimatedHours) * 3600)) * 100)}%
                          </span>
                        )}
                      </div>
                      {!task.isUntimed && task.estimatedHours > 0 && (
                        <div className="w-full h-1 bg-slate-200 rounded-sm overflow-hidden">
                          <div
                            className={`h-full rounded-sm transition-all duration-300 ${((Number(task.hoursLogged) || 0) + (Number(task.timerSeconds || 0) / 3600)) > Number(task.estimatedHours) ? 'bg-amber-500' : 'bg-blue-600'}`}
                            style={{
                              width: `${Math.min(100, Math.round(((((Number(task.hoursLogged) || 0) * 3600) + (Number(task.timerSeconds) || 0)) / (Number(task.estimatedHours) * 3600)) * 100))}%`
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Assigned To (Avatar + Name + Multi-assignee Stack + Smart Leave Badge) */}
                  <td className="py-1.5 px-2.5 whitespace-nowrap">
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
                              title={a.name}
                              className={`w-[22px] h-[22px] rounded-full object-cover border-2 border-white ${idx > 0 ? '-ml-1.5' : ''}`}
                            />
                          ))}
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-900 leading-tight">
                            {task.assignees[0].name} +{task.assignees.length - 1} more
                          </div>
                          <div className="text-[9.5px] text-sky-600 font-semibold">
                            👥 {task.assignees.length} Members
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <img
                          src={task.assignedToAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={task.assignedToName}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div>
                          <div className="text-[11.5px] font-semibold text-slate-900 leading-tight">
                            {task.assignedToName || 'Unassigned'}
                          </div>
                          {task.assignedBy && task.assignedBy !== task.assignedToName && (
                            <div className="text-[10px] text-slate-500">
                              By {task.assignedBy}
                            </div>
                          )}
                          {isOnLeave && (
                            <span className="text-[9px] text-amber-700 bg-amber-100 py-px px-1 rounded font-semibold">
                              🌴 On Leave
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-1.5 px-2.5 whitespace-nowrap">
                    <select
                      value={task.status}
                      onClick={e => e.stopPropagation()}
                      onChange={(e) => changeTaskStatus(task._id, e.target.value)}
                      className={`py-0.5 px-1.5 rounded-full text-[11px] font-semibold outline-none cursor-pointer h-6 border ${
                        task.status === 'completed'
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300 border-green-200 dark:border-green-800'
                          : task.status === 'in_progress'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : task.status === 'on_hold'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : task.status === 'under_review'
                                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <option value="incomplete">🔴 Incomplete</option>
                      <option value="in_progress">🔵 In Progress</option>
                      <option value="on_hold">⏸ On Hold</option>
                      <option value="under_review">🟣 Under Review</option>
                      <option value="completed">🟢 Completed</option>
                    </select>
                  </td>

                  {/* Action Column with Quick Complete Button */}
                  <td className="py-1.5 px-2.5 text-right relative whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      {task.status !== 'completed' ? (
                        <button
                          title="Mark as Completed (1-Click)"
                          onClick={(e) => {
                            e.stopPropagation();
                            completeTask(task._id);
                          }}
                          className="inline-flex items-center gap-1 bg-green-600 text-white border-none py-1 px-2 rounded text-[10.5px] font-bold cursor-pointer shadow-xs hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle2 size={10} /> Done
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-bold bg-green-50 py-0.5 px-1.5 rounded border border-green-200">
                          ✓ Done
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : task._id);
                        }}
                        className="bg-transparent border-none text-slate-500 p-1 rounded cursor-pointer inline-flex items-center justify-center hover:bg-slate-100 transition-colors"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>

                    {isMenuOpen && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute right-2.5 top-8 bg-white rounded-md shadow-lg border border-slate-200 p-1 z-50 min-w-[140px] text-left"
                      >
                        <div
                          onClick={() => {
                            onSelectTask && onSelectTask(task);
                            setActiveMenuId(null);
                          }}
                          className="flex items-center gap-1.5 py-1.5 px-2.5 text-[11.5px] text-slate-700 cursor-pointer rounded hover:bg-slate-100 transition-colors"
                        >
                          <Eye size={13} className="text-blue-500" /> View Details & History 📋
                        </div>
                        <div
                          onClick={() => {
                            onSelectTask && onSelectTask(task);
                            setActiveMenuId(null);
                          }}
                          className="flex items-center gap-1.5 py-1.5 px-2.5 text-[11.5px] text-sky-600 cursor-pointer rounded hover:bg-sky-50 transition-colors"
                        >
                          <Calendar size={13} className="text-sky-600" /> Reschedule for Future 📅
                        </div>
                        <div
                          onClick={() => {
                            setSnoozeTargetTask(task);
                            setIsSnoozeModalOpen(true);
                            setActiveMenuId(null);
                          }}
                          className="flex items-center gap-1.5 py-1.5 px-2.5 text-[11.5px] text-purple-700 cursor-pointer rounded hover:bg-purple-50 transition-colors"
                        >
                          <Bell size={13} className="text-purple-600" /> Do Later & Remind ⏰
                        </div>
                        <div
                          onClick={(e) => handleDelete(task._id, e)}
                          className="flex items-center gap-1.5 py-1.5 px-2.5 text-[11.5px] text-red-500 cursor-pointer rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={13} /> Delete Task
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer & Pagination */}
      <div className="py-3.5 px-5 bg-white border-t border-slate-100 flex items-center justify-between text-[13px] text-slate-500 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            defaultValue="25"
            className="py-1 px-2 rounded-md border border-slate-300 text-[12.5px] text-slate-700 outline-none"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
          <span>entries</span>
        </div>

        <div className="flex items-center gap-4">
          <span>Showing 1 to {tasks.length} of {tasks.length} entries</span>
          <div className="flex gap-1">
            <button
              disabled
              className="py-1 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-400 text-xs cursor-not-allowed"
            >
              Previous
            </button>
            <button
              className="py-1 px-3 rounded-md border border-sky-600 bg-sky-600 text-white text-xs font-semibold cursor-pointer"
            >
              1
            </button>
            <button
              disabled
              className="py-1 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-400 text-xs cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <SnoozeTaskModal
        isOpen={isSnoozeModalOpen}
        onClose={() => setIsSnoozeModalOpen(false)}
        task={snoozeTargetTask}
      />
    </div>
  );
};
