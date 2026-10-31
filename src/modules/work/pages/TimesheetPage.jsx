/**
 * @file TimesheetPage.jsx
 * @description Main Timesheet and Time Tracking page with active timers, logs, filters, and manual logging modal.
 */

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Clock,
  Zap,
  Calendar,
  Layers,
  User,
  CheckCircle2,
  TrendingUp,
  Download
} from 'lucide-react';
import { useWork } from '../context/WorkContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { isHRorAdmin } from '../../../shared/utils/permissionUtils';
import { matchesFilter, matchesProject, matchesDateRange, matchesSearch } from '../../../shared/utils/filterUtils';
import { ActiveTimerCard } from '../components/timesheet/ActiveTimerCard';
import { TimesheetTable } from '../components/timesheet/TimesheetTable';
import { LogTimeModal } from '../components/timesheet/LogTimeModal';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';

export const TimesheetPage = () => {
  const {
    timesheets,
    timesheetFilter,
    setTimesheetFilter,
    projects,
    tasks,
    employees,
    activeRunningTask
  } = useWork();
  const { currentUser } = useAuth();
  const isPrivileged = React.useMemo(() => isHRorAdmin(currentUser), [currentUser]);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Strictly scoped timesheets for privacy (regular employees only see their own timesheets) + Active Filters
  const displayTimesheets = React.useMemo(() => {
    let list = timesheets || [];

    // 1. Regular employee privacy scoping
    if (!isPrivileged && currentUser) {
      list = list.filter(ts =>
        ts.employeeId === currentUser._id ||
        ts.employee === currentUser._id ||
        ts.employeeId === currentUser.employeeCode ||
        ts.employee === currentUser.employeeCode ||
        (ts.employeeName && currentUser.name && ts.employeeName.toLowerCase() === currentUser.name.toLowerCase())
      );
    } else if (timesheetFilter.employeeId && timesheetFilter.employeeId !== 'all') {
      // Admin/HR employee filter
      list = list.filter(ts =>
        matchesFilter(ts.employeeId, timesheetFilter.employeeId) ||
        matchesFilter(ts.employee, timesheetFilter.employeeId) ||
        matchesFilter(ts.employeeCode, timesheetFilter.employeeId) ||
        matchesFilter(ts.employeeName, timesheetFilter.employeeId)
      );
    }

    // 2. Project Filter
    if (timesheetFilter.projectId && timesheetFilter.projectId !== 'all') {
      list = list.filter(ts => matchesProject(ts, timesheetFilter.projectId));
    }

    // 3. Status Filter (active vs stopped/logged)
    if (timesheetFilter.status && timesheetFilter.status !== 'all') {
      list = list.filter(ts => matchesFilter(ts.status, timesheetFilter.status));
    }

    // 4. Date Filter
    if (timesheetFilter.date) {
      list = list.filter(ts => matchesDateRange(ts.date, timesheetFilter.date, timesheetFilter.date));
    }

    // 5. Search Filter
    if (timesheetFilter.search && timesheetFilter.search.trim()) {
      list = list.filter(ts => matchesSearch(ts, timesheetFilter.search, [
        'taskCode', 'taskTitle', 'projectName', 'employeeName', 'memo', 'projectCode'
      ]));
    }

    return list;
  }, [timesheets, isPrivileged, currentUser, timesheetFilter]);

  // Statistics calculation strictly scoped to user view
  const totalSeconds = displayTimesheets.reduce((acc, curr) => acc + (curr.totalDurationSeconds || 0), 0);
  const totalHoursLogged = (totalSeconds / 3600).toFixed(1);
  const activeSessionsCount = displayTimesheets.filter(t => t.status === 'active').length + (activeRunningTask ? 1 : 0);
  const uniqueEmployees = new Set(displayTimesheets.map(t => t.employeeId || t.employeeName)).size;

  // Export CSV strictly from scoped timesheets
  const handleExportCSV = () => {
    if (!displayTimesheets.length) return;
    const headers = ['Task Code', 'Task Title', 'Project', 'Employee', 'Date', 'Start Time', 'End Time', 'Duration', 'Status', 'Memo'];
    const rows = displayTimesheets.map(ts => [
      ts.taskCode || '',
      `"${(ts.taskTitle || '').replace(/"/g, '""')}"`,
      `"${(ts.projectName || '').replace(/"/g, '""')}"`,
      `"${(ts.employeeName || '').replace(/"/g, '""')}"`,
      ts.date,
      ts.startTime || '',
      ts.endTime || '',
      ts.totalDurationText || '',
      ts.status || '',
      `"${(ts.memo || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EMS_Timesheets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-3.5 min-h-full pb-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock size={17} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white m-0 leading-tight">
              Timesheet & Time Tracking
            </h1>
            <p className="mt-0.5 mb-0 text-[11.5px] text-slate-500 dark:text-slate-400">
              Live timers, work duration logs, and task time tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            title="Export timesheets to CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-lg bg-sky-600 hover:bg-sky-700 text-white border-none text-xs font-bold cursor-pointer shadow-xs shadow-sky-600/30 transition-colors"
            title="Manually log time"
          >
            <Plus size={13} />
            <span>Log Time</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 px-3.5 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Hours Logged</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {totalHoursLogged} hrs
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 px-3.5 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
            <Zap size={16} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Active Live Timers</div>
            <div className="text-lg font-extrabold text-green-600 dark:text-green-400 leading-tight">
              {activeSessionsCount}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 px-3.5 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
            <Layers size={16} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tracked Sessions</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {timesheets.length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 px-3.5 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <User size={16} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Active Team Members</div>
            <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400 leading-tight">
              {uniqueEmployees}
            </div>
          </div>
        </div>
      </div>

      {/* Active Running Task Banner */}
      <ActiveTimerCard onSelectTask={(task) => setSelectedTask(task)} />

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 px-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg py-1.5 px-3 min-w-[240px] flex-1">
          <Search size={15} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search timesheet logs by task, project, employee..."
            value={timesheetFilter.search}
            onChange={e => setTimesheetFilter(prev => ({ ...prev, search: e.target.value }))}
            className="border-none bg-transparent outline-none text-[13px] w-full text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Employee Filter (Admin/HR Only for Privacy) */}
          {isPrivileged && (
            <select
              value={timesheetFilter.employeeId}
              onChange={e => setTimesheetFilter(prev => ({ ...prev, employeeId: e.target.value }))}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] text-slate-700 dark:text-slate-300 outline-none bg-white dark:bg-slate-800 cursor-pointer"
            >
              <option value="all">All Employees</option>
              {employees.map(e => (
                <option key={e._id} value={e._id}>{e.name}</option>
              ))}
            </select>
          )}

          {/* Project Filter */}
          <select
            value={timesheetFilter.projectId}
            onChange={e => setTimesheetFilter(prev => ({ ...prev, projectId: e.target.value }))}
            className="py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] text-slate-700 dark:text-slate-300 outline-none bg-white dark:bg-slate-800 cursor-pointer"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p._id} value={p._id}>[{p.projectCode}] {p.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={timesheetFilter.status}
            onChange={e => setTimesheetFilter(prev => ({ ...prev, status: e.target.value }))}
            className="py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] text-slate-700 dark:text-slate-300 outline-none bg-white dark:bg-slate-800 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active (Running)</option>
            <option value="stopped">Logged</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      {/* Timesheet Table */}
      <TimesheetTable timesheets={displayTimesheets} />

      {/* Log Time Modal */}
      <LogTimeModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
};
