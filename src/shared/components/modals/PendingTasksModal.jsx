/**
 * @file PendingTasksModal.jsx
 * @description Modal displaying all pending, in-progress, and overdue tasks with instant interactive actions.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  Calendar,
  AlertCircle,
  Play,
  Pause,
  CheckCircle2,
  ListTodo,
  Search,
  Filter,
  ArrowUpRight,
  ExternalLink,
  Tag,
  User,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PendingTasksModal = ({
  isOpen,
  onClose,
  tasks = [],
  user = null,
  initialFilter = 'all',
  onSelectTask,
  onStartTimer,
  onPauseTimer,
  onCompleteTask,
  activeTaskId = null
}) => {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState(initialFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Sync filter tab whenever initialFilter or isOpen changes
  React.useEffect(() => {
    if (isOpen && initialFilter) {
      setFilterTab(initialFilter);
    }
  }, [isOpen, initialFilter]);

  // Filter tasks based on status and tab
  const filteredTasks = useMemo(() => {
    return (tasks || []).filter(task => {
      // Must not be completed
      const isCompleted = task.status === 'completed' || task.progress === 100;
      if (isCompleted) return false;

      // Tab filter
      if (filterTab === 'overdue') {
        if (!task.dueDate || task.hasNoDueDate || task.dueDate >= todayStr) return false;
      } else if (filterTab === 'in_progress') {
        if (task.status !== 'in_progress' && !task.timerRunning) return false;
      } else if (filterTab === 'due_today') {
        if (task.dueDate !== todayStr) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (task.taskCode || '').toLowerCase().includes(q);
        const matchTitle = (task.title || '').toLowerCase().includes(q);
        const matchProject = (task.projectName || '').toLowerCase().includes(q);
        const matchAssignee = (task.assignedToName || '').toLowerCase().includes(q);
        if (!matchCode && !matchTitle && !matchProject && !matchAssignee) return false;
      }

      return true;
    });
  }, [tasks, filterTab, searchQuery, todayStr]);

  const overdueCount = useMemo(() => (tasks || []).filter(t => t.status !== 'completed' && t.dueDate && t.dueDate < todayStr).length, [tasks, todayStr]);
  const inProgressCount = useMemo(() => (tasks || []).filter(t => t.status !== 'completed' && (t.status === 'in_progress' || t.timerRunning)).length, [tasks]);
  const dueTodayCount = useMemo(() => (tasks || []).filter(t => t.status !== 'completed' && t.dueDate === todayStr).length, [tasks, todayStr]);

  const formatSecs = (totalSecs) => {
    const s = Number(totalSecs) || 0;
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return { cls: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800', label: 'Urgent' };
      case 'high':
        return { cls: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800', label: 'High' };
      case 'medium':
        return { cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', label: 'Medium' };
      default:
        return { cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', label: 'Normal' };
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-[9999] flex items-center justify-center p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[860px] max-h-[90vh] flex flex-col shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-[22px] py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <ListTodo size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-extrabold text-slate-900 dark:text-slate-100 m-0">
                  Pending Tasks Queue
                </h2>
                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 rounded-full">
                  {tasks.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                {user ? `Active and upcoming tasks assigned to ${user.name}` : 'All team pending work requiring action'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls & Search */}
        <div className="px-[22px] py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-slate-900">
          {/* Filter Tabs */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg border-0 text-xs font-bold cursor-pointer transition-all ${
                filterTab === 'all'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({tasks.length})
            </button>

            <button
              onClick={() => setFilterTab('in_progress')}
              className={`px-3 py-1.5 rounded-lg border-0 text-xs font-bold cursor-pointer transition-all ${
                filterTab === 'in_progress'
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 ring-1 ring-blue-300 dark:ring-blue-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              ⏱️ In Progress ({inProgressCount})
            </button>

            <button
              onClick={() => setFilterTab('overdue')}
              className={`px-3 py-1.5 rounded-lg border-0 text-xs font-bold cursor-pointer transition-all ${
                filterTab === 'overdue'
                  ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 ring-1 ring-red-300 dark:ring-red-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              🔥 Overdue ({overdueCount})
            </button>

            <button
              onClick={() => setFilterTab('due_today')}
              className={`px-3 py-1.5 rounded-lg border-0 text-xs font-bold cursor-pointer transition-all ${
                filterTab === 'due_today'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 ring-1 ring-amber-300 dark:ring-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              📅 Due Today ({dueTodayCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search size={14} className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by task, code, project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-1.5 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs outline-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-sky-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>
        </div>

        {/* Task List Body */}
        <div className="px-[22px] py-4 overflow-y-auto flex-1 flex flex-col gap-2.5">
          {filteredTasks.length === 0 ? (
            <div className="p-10 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <CheckCircle2 size={36} className="text-green-600 mx-auto mb-2.5" />
              <h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 m-0 mb-1">
                No pending tasks found
              </h4>
              <p className="text-xs m-0">
                {searchQuery ? 'Try adjusting your search criteria.' : 'All tasks under this filter are completed or caught up!'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const priorityInfo = getPriorityBadge(task.priority);
              const isOverdue = task.dueDate && task.dueDate < todayStr;
              const isDueToday = task.dueDate === todayStr;
              const isCurrentActive = activeTaskId === task._id || task.timerRunning;

              return (
                <div
                  key={task._id || task.id}
                  className={`rounded-[10px] p-3 px-4 flex flex-col gap-2 transition-all ${
                    isCurrentActive
                      ? 'bg-sky-50 dark:bg-sky-950/30 border border-sky-500 shadow-sm'
                      : 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-slate-300'
                  }`}
                >
                  {/* Row 1: Code, Title, Badges */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950/50 px-1.5 py-0.5 rounded font-mono">
                        #{task.taskCode || 'TSK'}
                      </span>

                      <h4
                        onClick={() => onSelectTask && onSelectTask(task)}
                        className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 m-0 cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                        title="Click to view full details"
                      >
                        {task.title}
                      </h4>

                      {isCurrentActive && (
                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950/60 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                          Active Now
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded border ${priorityInfo.cls}`}>
                        {priorityInfo.label}
                      </span>

                      {isOverdue && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-900">
                          ⚠️ Overdue
                        </span>
                      )}

                      {isDueToday && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900">
                          📅 Due Today
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Project, Due Date, Time Stats */}
                  <div className="flex items-center justify-between gap-3 text-[11.5px] text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
                    <div className="flex items-center gap-3.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Layers size={13} className="text-slate-400" />
                        <strong className="text-slate-700 dark:text-slate-300">{task.projectName || 'General Work'}</strong>
                      </span>

                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className={isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-400'} />
                          <span>Due: <strong className={isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}>{task.dueDate}</strong></span>
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-slate-400" />
                        <span>Est: <strong className="text-slate-700 dark:text-slate-300">{task.estimatedHours || 3}h</strong></span>
                        {Number(task.timerSeconds) > 0 && (
                          <span className="text-sky-600 dark:text-sky-400 font-bold ml-1">
                            (Tracked: {formatSecs(task.timerSeconds)})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {task.timerRunning ? (
                        <button
                          onClick={() => onPauseTimer && onPauseTimer(task._id)}
                          className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 px-2 py-1 rounded text-[11px] font-bold cursor-pointer hover:bg-blue-100 transition-colors"
                        >
                          <Pause size={12} /> Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartTimer && onStartTimer(task._id)}
                          className="flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white border-0 px-2 py-1 rounded text-[11px] font-bold cursor-pointer shadow-xs transition-colors"
                        >
                          <Play size={12} /> {Number(task.timerSeconds) > 0 ? 'Resume' : 'Start'}
                        </button>
                      )}

                      <button
                        onClick={() => onCompleteTask && onCompleteTask(task._id)}
                        className="flex items-center gap-0.5 bg-green-600 hover:bg-green-700 text-white border-0 px-2 py-1 rounded text-[11px] font-bold cursor-pointer shadow-xs transition-colors"
                      >
                        <CheckCircle2 size={12} /> Complete
                      </button>

                      <button
                        onClick={() => onSelectTask && onSelectTask(task)}
                        className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded text-[11px] font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-[22px] py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <button
            onClick={() => {
              onClose();
              navigate('/tasks');
            }}
            className="flex items-center gap-1 bg-transparent border-0 text-sky-600 dark:text-sky-400 text-xs font-bold cursor-pointer hover:underline"
          >
            <span>Open Dedicated Tasks Board</span>
            <ExternalLink size={13} />
          </button>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[7px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
