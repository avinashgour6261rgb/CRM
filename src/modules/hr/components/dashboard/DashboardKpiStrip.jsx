import React from 'react';
import {
  Users,
  UserCheck,
  Palmtree,
  Clock,
  Play,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  Calendar as CalendarIcon
} from 'lucide-react';

export const DashboardKpiStrip = ({
  isUserAdminOrHR,
  isViewingOtherEmployee,
  navigate,
  employees = [],
  teamStats = {},
  employeesOnLeave = [],
  allInProgressTasksCount = 0,
  allPendingTasksCount = 0,
  allOverdueTasksCount = 0,
  allCompletedTodayCount = 0,
  setPendingTasksModalFilter,
  setIsPendingTasksModalOpen,
  totalTaskTodaySecs = 0,
  displayedWorkDuration = '0h 0m',
  displayActiveTask = null,
  taskStatusTab = 'pending',
  setTaskStatusTab,
  myPendingTasks = [],
  myDueTodayTasksCount = 0,
  overdueTasksCount = 0,
  myCompletedTodayCount = 0,
  currentUser = null
}) => {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5">
      {isUserAdminOrHR && !isViewingOtherEmployee ? (
        <>
          <div
            onClick={() => navigate('/team-operations')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-600"
            title="Click to open Live Operations"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Total Team</span>
              <Users size={13} color="#0284c7" />
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">
              {(employees || []).length}
            </div>
          </div>

          <div
            onClick={() => navigate('/attendance')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-600"
            title="Click to view Attendance"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Present Today</span>
              <UserCheck size={13} color="#16a34a" />
            </div>
            <div className="text-lg font-extrabold text-green-600 dark:text-green-400">
              {teamStats.present || 0}
            </div>
          </div>

          <div
            onClick={() => navigate('/leaves')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-600"
            title="Click to open Leave Requests"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">On Leave</span>
              <Palmtree size={13} color="#d97706" />
            </div>
            <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
              {employeesOnLeave.length}
            </div>
          </div>

          <div
            onClick={() => navigate('/team-operations')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-600"
            title="Click to view Live Operations"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Working Now</span>
              <Clock size={13} color="#2563eb" />
            </div>
            <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
              {teamStats.clockedIn}
            </div>
          </div>

          <div
            onClick={() => navigate('/tasks')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-600"
            title="Click to open Tasks Board"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">In Progress</span>
              <Play size={13} color="#2563eb" />
            </div>
            <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
              {allInProgressTasksCount}
            </div>
          </div>

          <div
            onClick={() => {
              setPendingTasksModalFilter('all');
              setIsPendingTasksModalOpen(true);
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-600"
            title="Click to view all pending tasks list"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Pending</span>
              <Clock size={13} color="#d97706" />
            </div>
            <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
              {allPendingTasksCount}
            </div>
          </div>

          <div
            onClick={() => {
              setPendingTasksModalFilter('overdue');
              setIsPendingTasksModalOpen(true);
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-600"
            title="Click to view overdue tasks"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-red-600 dark:text-red-400 font-bold">Overdue 🔥</span>
              <AlertCircle size={13} color="#dc2626" />
            </div>
            <div className="text-lg font-extrabold text-red-600 dark:text-red-400">
              {allOverdueTasksCount}
            </div>
          </div>

          <div
            onClick={() => navigate('/tasks')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green-600"
            title="Click to open Tasks Board"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Done Today</span>
              <CheckCircle2 size={13} color="#16a34a" />
            </div>
            <div className="text-lg font-extrabold text-green-600 dark:text-green-400">
              {allCompletedTodayCount}
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-[10px_12px] flex flex-col gap-1 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Today's Time</span>
              <Clock size={13} color="#0284c7" />
            </div>
            <div className="text-[17px] font-extrabold text-slate-900 dark:text-white">
              {totalTaskTodaySecs > 0
                ? (totalTaskTodaySecs < 60 ? `${totalTaskTodaySecs}s` : `${Math.floor(totalTaskTodaySecs / 3600)}h ${String(Math.floor((totalTaskTodaySecs % 3600) / 60)).padStart(2, '0')}m`)
                : (displayedWorkDuration || '0h 0m')}
            </div>
          </div>

          <div
            onClick={() => document.getElementById('active-timer-card')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm hover:border-purple-400 transition-all"
            title="Active Task"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Active Task</span>
              <Play size={13} color="#7c3aed" />
            </div>
            <div className="text-[15px] font-extrabold text-purple-700 dark:text-purple-400 overflow-hidden text-ellipsis whitespace-nowrap">
              {displayActiveTask ? `#${displayActiveTask.taskCode || 'TSK'}` : 'None'}
            </div>
          </div>

          <div
            onClick={() => {
              if (setTaskStatusTab) setTaskStatusTab('pending');
              document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm border transition-all ${
              taskStatusTab === 'pending'
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 dark:border-amber-700'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400'
            }`}
            title="Click to view Pending tasks"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">My Pending</span>
              <ListTodo size={13} color="#d97706" />
            </div>
            <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
              {myPendingTasks.length}
            </div>
          </div>

          <div
            onClick={() => {
              if (setTaskStatusTab) setTaskStatusTab('due_today');
              document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm border transition-all ${
              taskStatusTab === 'due_today'
                ? 'bg-fuchsia-50 dark:bg-fuchsia-950/60 border-fuchsia-600 dark:border-fuchsia-700'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-fuchsia-400'
            }`}
            title="Click to view tasks Due Today"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Due Today</span>
              <CalendarIcon size={13} color="#c026d3" />
            </div>
            <div className="text-lg font-extrabold text-fuchsia-600 dark:text-fuchsia-400">
              {myDueTodayTasksCount}
            </div>
          </div>

          <div
            onClick={() => {
              if (setTaskStatusTab) setTaskStatusTab('overdue');
              document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm border transition-all ${
              taskStatusTab === 'overdue'
                ? 'bg-red-50 dark:bg-red-950/60 border-red-600 dark:border-red-700'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-red-400'
            }`}
            title="Click to view Overdue tasks 🔥"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-red-600 dark:text-red-400 font-bold">Overdue 🔥</span>
              <AlertCircle size={13} color="#dc2626" />
            </div>
            <div className="text-lg font-extrabold text-red-600 dark:text-red-400">
              {overdueTasksCount}
            </div>
          </div>

          <div
            onClick={() => {
              if (setTaskStatusTab) setTaskStatusTab('completed');
              document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm border transition-all ${
              taskStatusTab === 'completed'
                ? 'bg-green-50 dark:bg-green-950/60 border-green-600 dark:border-green-700'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-green-400'
            }`}
            title="Click to view Completed tasks"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Done Today</span>
              <CheckCircle2 size={13} color="#16a34a" />
            </div>
            <div className="text-lg font-extrabold text-green-600 dark:text-green-400">
              {myCompletedTodayCount}
            </div>
          </div>

          <div
            onClick={() => navigate('/leaves')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-[10px_12px] cursor-pointer flex flex-col gap-1 shadow-sm hover:border-emerald-400 transition-all"
            title="Click to view Leaves"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Leave Balance</span>
              <Palmtree size={13} color="#059669" />
            </div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {currentUser?.leaveBalance ? (
                (Number(currentUser.leaveBalance.casual) || 0) +
                (Number(currentUser.leaveBalance.sick) || 0) +
                (Number(currentUser.leaveBalance.earned) || 0)
              ) : 35} Days
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              CL: {currentUser?.leaveBalance?.casual ?? 10} • SL: {currentUser?.leaveBalance?.sick ?? 8} • EL: {currentUser?.leaveBalance?.earned ?? 15}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
