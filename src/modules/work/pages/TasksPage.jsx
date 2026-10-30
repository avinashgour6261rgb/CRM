/**
 * @file TasksPage.jsx
 * @description Main Tasks management page matching Screenshot 2 with filters, CSV export, Table/Kanban views, and modals.
 */

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  UserCheck,
  LayoutList,
  Kanban,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  History
} from 'lucide-react';
import { useWork } from '../context/WorkContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useConfirm } from '../../../shared/context/ConfirmContext';
import { getUserModulePermissions, isHRorAdmin } from '../../../shared/utils/permissionUtils';
import { matchesFilter, matchesAssignee, matchesProject, matchesSearch } from '../../../shared/utils/filterUtils';
import { TasksTable } from '../components/tasks/TasksTable';
import { TasksKanban } from '../components/tasks/TasksKanban';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { ProjectTaskHistoryModal } from '../components/tasks/ProjectTaskHistoryModal';

export const TasksPage = () => {
  const {
    tasks,
    taskFilter,
    setTaskFilter,
    currentUser: workUser,
    projects,
    employees,
    purgeAllTasks
  } = useWork();
  const { currentUser: authUser } = useAuth();
  const { confirm } = useConfirm();
  const currentUser = authUser || workUser;

  const isPrivileged = React.useMemo(() => isHRorAdmin(currentUser), [currentUser]);
  const perms = React.useMemo(() => getUserModulePermissions(currentUser), [currentUser]);
  const canViewAllTasks = isPrivileged || perms?.viewAllTasks;

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [scopeMode, setScopeMode] = useState(!canViewAllTasks ? 'assigned_to_me' : 'all');
  const [statusMode, setStatusMode] = useState('all'); // 'all' | 'active' | 'leftover' | 'future' | 'completed'

  // Sync initial scope if not privileged and not permitted to view all tasks
  React.useEffect(() => {
    if (!canViewAllTasks && currentUser) {
      if (scopeMode === 'all') {
        setScopeMode('assigned_to_me');
      }
    }
  }, [canViewAllTasks, currentUser, scopeMode]);

  // Handle Scope Switching in UI
  const handleScopeChange = (mode) => {
    setScopeMode(mode);
  };

  // Handle Quick Status Tab Switching
  const handleStatusModeChange = (mode) => {
    setStatusMode(mode);
  };

  // Match task assignment (single and multi-assignee)
  const isTaskAssignedToUser = React.useCallback((task, user) => {
    if (!task || !user) return false;
    const uIds = [user._id, user.id, user.employeeCode, user.email].filter(Boolean).map(s => String(s).toLowerCase());
    const uName = (user.name || '').toLowerCase().trim();

    const directAssignedTo = (task.assignedTo && typeof task.assignedTo === 'object')
      ? String(task.assignedTo._id || task.assignedTo.id || '')
      : String(task.assignedTo || '');

    const directIds = [task.assignedToId, directAssignedTo, task.employeeId, task.assignedToCode, task.assignedToEmail]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());

    if (uIds.some(uid => directIds.includes(uid))) return true;

    if (task.assignedToName && task.assignedToName.toLowerCase().trim() === uName) return true;

    if (Array.isArray(task.assignedToIds) && task.assignedToIds.some(id => uIds.includes(String(id).toLowerCase()))) return true;
    if (Array.isArray(task.assignees) && task.assignees.some(a => {
      const aIds = [a._id, a.id, a.employeeCode, a.email].filter(Boolean).map(s => String(s).toLowerCase());
      if (uIds.some(uid => aIds.includes(uid))) return true;
      if (a.name && a.name.toLowerCase().trim() === uName) return true;
      return false;
    })) return true;

    return false;
  }, []);

  // Match task creation/delegation by a user
  const isTaskDelegatedByUser = React.useCallback((task, user) => {
    if (!task || !user) return false;
    const uIds = [user._id, user.id, user.employeeCode].filter(Boolean).map(s => String(s).toLowerCase());
    const uName = (user.name || '').trim().toLowerCase();
    const aId = String(task.assignedById || task.createdById || '').toLowerCase();
    const aCode = String(task.assignedByCode || '').toLowerCase();
    const aName = String(task.assignedBy || task.createdBy || '').trim().toLowerCase();
    return (aId && uIds.includes(aId)) || (aCode && uIds.includes(aCode)) || (aName && aName === uName);
  }, []);

  // Filtered & strictly scoped tasks with personal task privacy isolation
  const displayTasks = React.useMemo(() => {
    let list = tasks || [];

    // Personal Task Privacy Filter:
    // Personal tasks are private to the creator/assignee.
    // If Admin selects that employee in the Member dropdown, it will be visible for that member.
    // In global/all-company view, hide other employees' personal tasks!
    list = list.filter(t => {
      if (!t.isPersonal) return true;
      const isMyTask = isTaskAssignedToUser(t, currentUser) ||
                       String(t.assignedById) === String(currentUser?._id) ||
                       String(t.assignedToId) === String(currentUser?._id);

      if (taskFilter.assignedTo && taskFilter.assignedTo !== 'all') {
        const targetEmp = employees?.find(e => e._id === taskFilter.assignedTo || e.employeeCode === taskFilter.assignedTo);
        if (targetEmp) return isTaskAssignedToUser(t, targetEmp);
        return t.assignedToId === taskFilter.assignedTo || t.assignedTo === taskFilter.assignedTo || (Array.isArray(t.assignedToIds) && t.assignedToIds.includes(taskFilter.assignedTo));
      }

      return isMyTask;
    });

    // 1. Role-based scope filtering (Assigned to Me vs Delegated by Me vs All vs Personal)
    if (!canViewAllTasks && currentUser) {
      if (scopeMode === 'personal') {
        list = list.filter(t => t.isPersonal && (isTaskAssignedToUser(t, currentUser) || isTaskDelegatedByUser(t, currentUser)));
      } else if (scopeMode === 'assigned_to_me') {
        list = list.filter(t => isTaskAssignedToUser(t, currentUser));
      } else if (scopeMode === 'assigned_by_me') {
        list = list.filter(t => isTaskDelegatedByUser(t, currentUser) && !isTaskAssignedToUser(t, currentUser));
      } else {
        list = list.filter(t => isTaskAssignedToUser(t, currentUser) || isTaskDelegatedByUser(t, currentUser));
      }
    } else {
      // Admin / HR scope filtering
      if (scopeMode === 'personal') {
        list = list.filter(t => t.isPersonal && (isTaskAssignedToUser(t, currentUser) || isTaskDelegatedByUser(t, currentUser)));
      } else if (scopeMode === 'assigned_to_me') {
        list = list.filter(t => isTaskAssignedToUser(t, currentUser));
      } else if (scopeMode === 'assigned_by_me') {
        list = list.filter(t => isTaskDelegatedByUser(t, currentUser) && !t.isPersonal);
      }
    }

    // 2. Member filter dropdown (supports single and multi-assignees, employeeCode, ObjectId)
    if (taskFilter.assignedTo && taskFilter.assignedTo !== 'all') {
      list = list.filter(t => matchesAssignee(t, taskFilter.assignedTo));
    }

    // 2b. Project filter dropdown
    if (taskFilter.projectId && taskFilter.projectId !== 'all') {
      list = list.filter(t => matchesProject(t, taskFilter.projectId));
    }

    // 2c. Priority filter
    if (taskFilter.priority && taskFilter.priority !== 'all') {
      list = list.filter(t => matchesFilter(t.priority, taskFilter.priority));
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 3. Status tab / filter
    if (statusMode === 'active') {
      list = list.filter(t => t.status !== 'completed');
    } else if (statusMode === 'completed') {
      list = list.filter(t => t.status === 'completed');
    } else if (statusMode === 'leftover') {
      list = list.filter(t => t.status !== 'completed' && !t.isUntimed && !t.hasNoDueDate && t.dueDate && t.dueDate < todayStr && !(t.snoozed && t.remindAt && Number(t.remindAt) > Date.now()));
    } else if (statusMode === 'future') {
      list = list.filter(t => t.status !== 'completed' && ((t.startDate && t.startDate > todayStr) || (t.dueDate && t.dueDate > todayStr && !t.timerRunning && t.status !== 'in_progress') || (t.snoozed && t.remindAt && Number(t.remindAt) > Date.now())));
    } else if (taskFilter.status && taskFilter.status !== 'all') {
      list = list.filter(t => matchesFilter(t.status, taskFilter.status));
    } else if (taskFilter.hideCompleted) {
      list = list.filter(t => t.status !== 'completed');
    }

    // 4. Search query
    if (taskFilter.search && taskFilter.search.trim()) {
      list = list.filter(t => matchesSearch(t, taskFilter.search, [
        'title', 'taskCode', 'projectName', 'assignedToName', 'assignedBy', 'category', 'description'
      ]));
    }

    return [...list].sort((a, b) => {
      if (a.timerRunning && !b.timerRunning) return -1;
      if (!a.timerRunning && b.timerRunning) return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [tasks, canViewAllTasks, currentUser, scopeMode, taskFilter, statusMode, employees, isTaskAssignedToUser]);

  // Compute leftover & future counts
  const todayStr = new Date().toISOString().split('T')[0];
  const leftoverCount = React.useMemo(() => {
    return (tasks || []).filter(t => {
      if (t.status === 'completed' || t.isUntimed || t.hasNoDueDate || !t.dueDate || t.dueDate >= todayStr) return false;
      if (t.snoozed && t.remindAt && Number(t.remindAt) > Date.now()) return false;
      if (!canViewAllTasks && currentUser) return isTaskAssignedToUser(t, currentUser) || t.assignedById === currentUser._id;
      return true;
    }).length;
  }, [tasks, todayStr, canViewAllTasks, currentUser, isTaskAssignedToUser]);

  const futureCount = React.useMemo(() => {
    return (tasks || []).filter(t => {
      if (t.status === 'completed') return false;
      const isFuture = (t.startDate && t.startDate > todayStr) || (t.dueDate && t.dueDate > todayStr) || (t.snoozed && t.remindAt && Number(t.remindAt) > Date.now());
      if (!isFuture) return false;
      if (!canViewAllTasks && currentUser) return isTaskAssignedToUser(t, currentUser) || t.assignedById === currentUser._id;
      return true;
    }).length;
  }, [tasks, todayStr, canViewAllTasks, currentUser, isTaskAssignedToUser]);

  // Export CSV
  const handleExportCSV = () => {
    if (!displayTasks.length) return;
    const headers = ['Code', 'Title', 'Project', 'Category', 'Assignee', 'Assigned By', 'Start Date', 'Due Date', 'Status', 'Estimated Hours', 'Hours Logged'];
    const rows = displayTasks.map(t => [
      t.taskCode,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.projectName || '').replace(/"/g, '""')}"`,
      t.category,
      t.assignedToName,
      t.assignedBy || 'Admin',
      t.startDate,
      t.hasNoDueDate ? 'No Due Date' : t.dueDate,
      t.status,
      t.estimatedHours || 0,
      t.hoursLogged || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EMS_Tasks_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-3.5 min-h-full pb-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 px-4 py-3 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={17} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0 leading-tight">
              Tasks & Work Delegation
            </h1>
            <p className="mt-0.5 mb-0 text-[11.5px] text-slate-500 dark:text-slate-400">
              Manage team assignments, live task tracking, and work execution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Assignment & Project History Modal Button */}
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
            title="View complete project assignment & activity history audit log"
          >
            <History size={13} className="text-blue-600" />
            <span>Assignment History</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
            title="Export tasks to CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          {isPrivileged && tasks.length > 0 && (
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: 'Purge All Tasks',
                  message: '⚠️ Are you sure you want to purge all existing tasks? This will wipe legacy tasks so you can start completely clean with new tasks.',
                  confirmText: 'Purge All Tasks',
                  variant: 'danger'
                });
                if (ok) {
                  await purgeAllTasks();
                }
              }}
              className="inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-semibold cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              title="Purge all old tasks to start clean"
            >
              <Trash2 size={13} />
              <span>Purge Old Tasks</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-[5px] px-3 h-[30px] rounded-md bg-sky-600 text-white border-0 text-xs font-bold cursor-pointer shadow-[0_1px_2px_rgba(2,132,199,0.2)] hover:bg-sky-700 transition-colors"
            title="Create a new task"
          >
            <Plus size={13} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Top Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-lg px-3.5 py-2 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          {/* Member Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Member</span>
            <select
              value={canViewAllTasks ? (taskFilter.assignedTo || 'all') : (currentUser?._id || 'me')}
              onChange={(e) => {
                if (canViewAllTasks) {
                  setTaskFilter(prev => ({ ...prev, assignedTo: e.target.value, assignedBy: 'all' }));
                  setScopeMode('all');
                }
              }}
              disabled={!canViewAllTasks}
              className={`px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 outline-none h-[30px] ${
                !canViewAllTasks ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed' : 'bg-white dark:bg-slate-900 cursor-pointer'
              }`}
            >
              {canViewAllTasks ? (
                <>
                  <option value="all">All Members</option>
                  {employees?.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </>
              ) : (
                <option value={currentUser?._id || 'me'}>
                  {currentUser?.name || 'My Tasks'} (Assigned)
                </option>
              )}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status</span>
            <select
              value={taskFilter.hideCompleted ? 'hide_completed' : taskFilter.status}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'hide_completed') {
                  setTaskFilter(prev => ({ ...prev, hideCompleted: true, status: 'all' }));
                } else {
                  setTaskFilter(prev => ({ ...prev, hideCompleted: false, status: val }));
                }
              }}
              className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 outline-none bg-white dark:bg-slate-900 h-[30px] cursor-pointer"
            >
              <option value="hide_completed">Hide Completed Task</option>
              <option value="all">All Tasks</option>
              <option value="incomplete">Incomplete</option>
              <option value="in_progress">In Progress</option>
              <option value="under_review">Under Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Project Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Project</span>
            <select
              value={taskFilter.projectId || 'all'}
              onChange={(e) => setTaskFilter(prev => ({ ...prev, projectId: e.target.value }))}
              className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 outline-none bg-white dark:bg-slate-900 h-[30px] cursor-pointer max-w-[160px]"
            >
              <option value="all">All Projects</option>
              {projects?.map(prj => (
                <option key={prj._id} value={prj._id}>
                  {prj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1 min-w-[200px] flex-1 h-[30px]">
            <Search size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by task title, project, assignee or assigner..."
              value={taskFilter.search}
              onChange={e => setTaskFilter(prev => ({ ...prev, search: e.target.value }))}
              className="border-0 bg-transparent outline-none text-xs w-full text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Action Sub-Bar: + Add Task, All / Assigned to Me / Assigned by Me, Export, View Mode */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Task Button */}
          <button
            id="btn-add-task"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-[5px] bg-sky-600 hover:bg-sky-700 text-white border-0 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer shadow-[0_1px_3px_rgba(2,132,199,0.3)] transition-all h-[30px]"
          >
            <Plus size={14} />
            Assign New Task
          </button>

          {/* Scope Filter Pills (All / Assigned To Me / Assigned By Me) */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 gap-0.5 h-[30px] items-center">
            {canViewAllTasks && (
              <button
                onClick={() => handleScopeChange('all')}
                className={`px-2.5 py-1 border-0 rounded text-[11.5px] cursor-pointer transition-all h-6 ${
                  scopeMode === 'all'
                    ? 'font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                    : 'font-medium bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                All Team Tasks
              </button>
            )}
            <button
              onClick={() => handleScopeChange('assigned_to_me')}
              className={`px-2.5 py-1 border-0 rounded text-[11.5px] cursor-pointer transition-all h-6 ${
                scopeMode === 'assigned_to_me'
                  ? 'font-bold bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'font-medium bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Assigned to Me
            </button>
            <button
              onClick={() => handleScopeChange('assigned_by_me')}
              className={`px-2.5 py-1 border-0 rounded text-[11.5px] cursor-pointer transition-all h-6 ${
                scopeMode === 'assigned_by_me'
                  ? 'font-bold bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'font-medium bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Assigned by Me
            </button>
            <button
              onClick={() => handleScopeChange('personal')}
              className={`px-2.5 py-1 border-0 rounded text-[11.5px] cursor-pointer transition-all h-6 ${
                scopeMode === 'personal'
                  ? 'font-bold bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'font-medium bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              🔒 My Personal Tasks
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 gap-0.5 h-[30px] items-center">
            <button
              onClick={() => handleStatusModeChange('all')}
              className={`px-[9px] py-1 border-0 rounded text-[11px] cursor-pointer transition-all h-6 ${
                statusMode === 'all'
                  ? 'font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'font-medium bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => handleStatusModeChange('active')}
              className={`px-[9px] py-1 border-0 rounded text-[11px] cursor-pointer transition-all h-6 ${
                statusMode === 'active'
                  ? 'font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'font-medium bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              ⚡ Active & New
            </button>
            <button
              onClick={() => handleStatusModeChange('leftover')}
              className={`px-[9px] py-1 border-0 rounded text-[11px] cursor-pointer transition-all h-6 inline-flex items-center gap-1 ${
                statusMode === 'leftover'
                  ? 'font-bold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'font-medium bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Tasks from previous days that were left incomplete"
            >
              <span>⏮️ Leftover / Past Days</span>
              {leftoverCount > 0 && (
                <span className="text-[9.5px] font-extrabold bg-red-600 text-white rounded-[10px] px-[5px]">
                  {leftoverCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleStatusModeChange('future')}
              className={`px-[9px] py-1 border-0 rounded text-[11px] cursor-pointer transition-all h-6 inline-flex items-center gap-1 ${
                statusMode === 'future'
                  ? 'font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'font-medium bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Tasks assigned or scheduled for future dates"
            >
              <span>📅 Scheduled / Future</span>
              {futureCount > 0 && (
                <span className="text-[9.5px] font-extrabold bg-orange-600 text-white rounded-[10px] px-[5px]">
                  {futureCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleStatusModeChange('completed')}
              className={`px-[9px] py-1 border-0 rounded text-[11px] cursor-pointer transition-all h-6 ${
                statusMode === 'completed'
                  ? 'font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'font-medium bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              ✅ Recently Completed
            </button>
          </div>

          {/* Assignment History Button */}
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            title="View complete project task assignment & activity audit history"
            className="flex items-center gap-[5px] bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer h-[30px] shadow-[0_1px_2px_rgba(15,118,110,0.08)] hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
          >
            <History size={13} className="text-teal-700 dark:text-teal-400" />
            Assignment History
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-[5px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer h-[30px] hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
          >
            <Download size={13} />
            Export
          </button>
        </div>

        {/* View Switchers: Table, Kanban */}
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden h-[30px]">
          <button
            title="Table View"
            onClick={() => setViewMode('table')}
            className={`flex items-center justify-center px-2.5 h-full border-0 cursor-pointer transition-all ${
              viewMode === 'table' ? 'bg-sky-600 text-white' : 'bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <LayoutList size={14} />
          </button>

          <button
            title="Kanban Board"
            onClick={() => setViewMode('kanban')}
            className={`flex items-center justify-center px-2.5 h-full border-0 cursor-pointer transition-all ${
              viewMode === 'kanban' ? 'bg-sky-600 text-white' : 'bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Kanban size={14} />
          </button>
        </div>
      </div>

      {/* Main View: Table or Kanban */}
      {viewMode === 'table' ? (
        <TasksTable tasks={displayTasks} onSelectTask={(task) => setSelectedTask(task)} />
      ) : (
        <TasksKanban tasks={displayTasks} onSelectTask={(task) => setSelectedTask(task)} />
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTaskCreated={(newTask) => {
          if (newTask && !isTaskAssignedToMe(newTask)) {
            setTaskScopeFilter('assigned_by_me');
          } else {
            setTaskScopeFilter('assigned_to_me');
          }
        }}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />

      {/* Project Task Assignment & Activity History Modal */}
      <ProjectTaskHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
};
