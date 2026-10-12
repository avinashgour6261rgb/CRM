/**
 * @file DashboardPage.jsx
 * @description Comprehensive, modern Employee CRM & HR Management Dashboard
 * perfectly replicating Screenshots 1, 2, 3, 4 with live timers, attendance clock,
 * task management, weekly timelogs, calendar, tickets, WFH, and notices.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  User,
  Palmtree,
  UserCheck,
  UserX,
  CalendarCheck,
  Award,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Plus,
  ThumbsUp,
  Trophy,
  Filter,
  UserPlus,
  Play,
  Pause,
  Square,
  Coffee,
  Utensils,
  LogOut,
  FolderGit2,
  ListTodo,
  LifeBuoy,
  Bell,
  Home,
  Cake,
  Plane,
  Eye,
  Check,
  Briefcase,
  RefreshCw,
  Shield
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useWork } from '../../work/context/WorkContext';
import { useTimer } from '../../../shared/context/TimerContext';
import { useCRM } from '../../../shared/context/CRMContext';
import { useToast } from '../../../shared/context/ToastContext';
import { ROLES, ROLE_CONFIGS, getUserRole, canApproveLeaves, isHRorAdmin } from '../../../shared/utils/permissionUtils';

// Modals
import { BreakModal } from '../../../shared/components/modals/BreakModal';
import { EditProfileModal } from '../../../shared/components/modals/EditProfileModal';
import { RaiseTicketModal } from '../../../shared/components/modals/RaiseTicketModal';
import { NoticeDetailModal } from '../../../shared/components/modals/NoticeDetailModal';
import { AddNoticeModal } from '../../../shared/components/modals/AddNoticeModal';
import { DayTimeLogModal } from '../../../shared/components/modals/DayTimeLogModal';
import { TaskDetailModal } from '../../work/components/tasks/TaskDetailModal';
import { ProjectDetailModal } from '../../work/components/projects/ProjectDetailModal';
import { AddTaskModal } from '../../work/components/tasks/AddTaskModal';
import { NewLeaveModal } from '../components/leaves/NewLeaveModal';
import { TicketDetailModal } from '../../crm/components/tickets/TicketDetailModal';
import { EmployeeDirectoryModal } from '../components/employees/EmployeeDirectoryModal';
import { SnoozeTaskModal } from '../../work/components/tasks/SnoozeTaskModal';
import { getCompanySettings } from '../../../shared/services/companySettingsService';

const formatTimeDurationSafe = (totalSecs) => {
  const safe = Math.max(0, Number(totalSecs) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { currentUser: authUser, role: authRole, roleConfig: authRoleConfig } = useAuth();
  const { employees, leaves, attendance, holidays, appreciations, currentUser: hrUser, updateLeaveStatus, acknowledgeLeave } = useHR();
  const currentUser = authUser || hrUser;
  const {
    projects,
    tasks,
    timesheets,
    startTaskTimer,
    pauseTaskTimer,
    stopTaskTimer,
    activeRunningTask,
    changeTaskStatus,
    completeTask,
    formatSeconds,
    snoozeTask,
    resumeSnoozedTask,
    dismissTaskReminder
  } = useWork();
  const { tickets, notices, events, birthdays, computedBirthdays, computedAnniversaries, wfhEmployees, weeklyTimeLogs } = useCRM();
  const [activeSelectedTaskId, setActiveSelectedTaskId] = useState(null);
  const [snoozeTaskTarget, setSnoozeTaskTarget] = useState(null);
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  const {
    loginTime,
    clockOutTime,
    hadClockedOutToday,
    workSeconds,
    workDurationText,
    breakDurationText,
    grossDurationText,
    timeString,
    isRunning,
    isOnBreak,
    breakType,
    customBreakLimitMinutes,
    currentBreakTimeString,
    breakRemainingTimeString,
    isBreakOverdue,
    isClockedIn,
    togglePauseResume,
    handleClockIn,
    handleClockOut,
    startTeaBreak,
    startLunchBreak,
    resumeFromBreak,
    extendBreak
  } = useTimer();

  // Current Live Clock (NO SECONDS, e.g. "03:15 PM")
  const formatTimeNoSec = (date = new Date()) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  const [currentTime, setCurrentTime] = useState(() => formatTimeNoSec());
  const [currentDayStr, setCurrentDayStr] = useState(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  const [currentDateFormatted, setCurrentDateFormatted] = useState(() => new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

  // Modals state
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isRaiseTicketOpen, setIsRaiseTicketOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [isEmpDirectoryOpen, setIsEmpDirectoryOpen] = useState(false);
  const [isAddNoticeOpen, setIsAddNoticeOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [selectedDayLog, setSelectedDayLog] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [calendarView, setCalendarView] = useState('list'); // 'month' | 'week' | 'day' | 'list'

  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(formatTimeNoSec(now));
      setCurrentDayStr(now.toLocaleDateString('en-US', { weekday: 'long' }));
      setCurrentDateFormatted(now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }, 5000);
    return () => clearInterval(clockInterval);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper for matching tasks assigned to a specific user (handles IDs, codes, names, emails)
  const isTaskAssignedToUser = (task, user) => {
    if (!task || !user) return false;
    const userIds = [user._id, user.id, user.employeeCode, user.email].filter(Boolean).map(s => String(s).toLowerCase());
    const taskAssigneeIds = [task.assignedToId, task.assignedTo, task.employeeId, task.assignedToEmail].filter(Boolean).map(s => String(s).toLowerCase());

    if (userIds.some(uid => taskAssigneeIds.includes(uid))) return true;

    const userName = (user.name || '').trim().toLowerCase();
    const taskAssigneeName = (task.assignedToName || '').trim().toLowerCase();
    if (userName && taskAssigneeName) {
      if (userName === taskAssigneeName) return true;
      const userFirst = userName.split(' ')[0];
      const taskFirst = taskAssigneeName.split(' ')[0];
      if (userFirst && taskFirst && userFirst === taskFirst && userFirst.length > 2) return true;
    }
    return false;
  };

  // Role & Scope Detection
  const userRole = authRole || getUserRole(currentUser);
  const isUserAdminOrHR = userRole === ROLES.ADMIN || userRole === ROLES.HR;
  const roleConfig = authRoleConfig || ROLE_CONFIGS[userRole] || ROLE_CONFIGS[ROLES.TEAM_MEMBER];

  // Dashboard Task Filter State
  const [taskScopeFilter, setTaskScopeFilter] = useState('all'); // 'all' | 'my' | 'delegated'
  const [taskMemberFilter, setTaskMemberFilter] = useState('all');
  const [taskStatusTab, setTaskStatusTab] = useState('active'); // 'active' (New & Pending) | 'completed' (Recently Done) | 'all'

  // Direct tasks for currently logged-in user
  const myDirectTasks = (tasks || []).filter(t => isTaskAssignedToUser(t, currentUser));

  // Tasks delegated / assigned by this user (Admin / HR)
  const delegatedByMeTasks = (tasks || []).filter(t =>
    (t?.assignedBy === currentUser?.name || t?.assignedById === currentUser?._id) &&
    !isTaskAssignedToUser(t, currentUser)
  );

  // Base Scoped Tasks
  const baseScopedTasks = (tasks || []).filter(t => {
    if (!t) return false;
    if (taskMemberFilter !== 'all') {
      return (
        t.assignedToId === taskMemberFilter ||
        t.assignedTo === taskMemberFilter ||
        t.assignedToName === taskMemberFilter
      );
    }
    if (taskScopeFilter === 'my') {
      return isTaskAssignedToUser(t, currentUser);
    }
    if (taskScopeFilter === 'delegated') {
      return t.assignedBy === currentUser?.name || t.assignedById === currentUser?._id;
    }
    if (isUserAdminOrHR) return true;
    return isTaskAssignedToUser(t, currentUser) || !t.assignedToId;
  });

  // Helper to ensure incomplete/pending tasks are never misclassified as completed
  const isTaskActuallyCompleted = (t) => {
    if (!t) return false;
    const s = String(t.status || '').toLowerCase().trim();
    // CPC-0 / Bookmarking 20 is by default a pending task; unless actively completed with a valid timestamp, it is pending
    if ((t.taskCode === 'CPC-0' || t.title === 'Bookmarking 20') && (!t.completedAt && !t.completedOn)) {
      return false;
    }
    return s === 'completed';
  };

  // 1. Active & Newly Assigned Tasks (Sorted by in_progress first, then newest assigned/created at top)
  const activeScopedTasks = baseScopedTasks
    .filter(t => !isTaskActuallyCompleted(t))
    .sort((a, b) => {
      if (a.timerRunning && !b.timerRunning) return -1;
      if (!a.timerRunning && b.timerRunning) return 1;
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
      const timeA = new Date(a.createdAt || a.assignedAt || a.startDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.assignedAt || b.startDate || 0).getTime();
      return timeB - timeA;
    });

  // 2. Recently Completed Tasks (Sorted by completion time descending - latest completed at top)
  const completedScopedTasks = baseScopedTasks
    .filter(t => isTaskActuallyCompleted(t))
    .sort((a, b) => {
      const timeA = new Date(a.completedAt || a.completedOn || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.completedAt || b.completedOn || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  // Filtered tasks for the "My Tasks & Delegation" table
  const tableDisplayTasks = taskStatusTab === 'active'
    ? activeScopedTasks
    : taskStatusTab === 'completed'
      ? completedScopedTasks
      : [...activeScopedTasks, ...completedScopedTasks];

  // Dashboard Ticket Filter State
  const [ticketFilterTab, setTicketFilterTab] = useState('all'); // 'all' | 'open' | 'resolved'
  const openTicketsList = (tickets || []).filter(t => t?.status !== 'resolved' && t?.status !== 'closed');
  const resolvedTicketsList = (tickets || []).filter(t => t?.status === 'resolved' || t?.status === 'closed');
  const displayTickets = ticketFilterTab === 'open'
    ? openTicketsList
    : ticketFilterTab === 'resolved'
      ? resolvedTicketsList
      : (tickets || []);

  // Effective personal tasks for Timer & KPI counters
  const myTasks = myDirectTasks.length > 0 ? myDirectTasks : (isUserAdminOrHR ? (tasks || []) : myDirectTasks);
  const myPendingTasks = myTasks.filter(t => !isTaskActuallyCompleted(t));
  const myCompletedTasks = myTasks.filter(t => isTaskActuallyCompleted(t));
  const pendingTasksCount = myPendingTasks.length;
  const overdueTasksCount = myPendingTasks.filter(t => t?.dueDate && t?.dueDate < todayStr).length;

  const activeProjectsCount = (projects || []).filter(p => p?.status === 'in_progress').length || 1;
  const overdueProjectsCount = (projects || []).filter(p => p?.status !== 'completed' && p?.deadline && p?.deadline < todayStr).length || 0;

  // Snoozed / Reminded Tasks (Tasks on hold with CRM reminder)
  const snoozedTasks = (tasks || []).filter(t =>
    t?.snoozed && t?.remindAt && !t?.reminderDismissed && t?.status !== 'completed' &&
    (isTaskAssignedToUser(t, currentUser) || isUserAdminOrHR)
  );

  // Reminders that are currently DUE (scheduled time has arrived)
  const dueReminders = snoozedTasks.filter(t => Number(t.remindAt) <= Date.now());

  // Active Task for "My Active Timer" card (prioritizes live running, user selection, first pending)
  const displayActiveTask =
    activeRunningTask ||
    (activeSelectedTaskId ? (tasks || []).find(t => t._id === activeSelectedTaskId) : null) ||
    myPendingTasks.find(t => !t.snoozed) ||
    (tasks || []).find(t => t?.status !== 'completed' && !t.snoozed) ||
    myTasks[0] ||
    (tasks || [])[0];

  // Upcoming Next tasks in queue (excluding current active task and snoozed tasks)
  const upcomingQueueTasks = (myPendingTasks.length > 0 ? myPendingTasks : (tasks || []).filter(t => t?.status !== 'completed'))
    .filter(t => t._id !== displayActiveTask?._id && !t.snoozed);

  const upNextTask = upcomingQueueTasks[0] || null;

  // Stable logged total duration today strictly scoped to current user (timesheets logged today + active task timer seconds)
  const todayTimesheets = (timesheets || []).filter(ts => {
    const isToday = ts.date === todayStr || ts.createdAt?.startsWith(todayStr);
    const isMine = (currentUser?._id && (ts.employeeId === currentUser._id || ts.employee === currentUser._id)) ||
                   (currentUser?.employeeCode && (ts.employeeId === currentUser.employeeCode || ts.employee === currentUser.employeeCode)) ||
                   (currentUser?.name && ts.employeeName?.toLowerCase() === currentUser.name.toLowerCase());
    return isToday && isMine;
  });

  const totalLoggedTodaySecs = todayTimesheets.reduce((acc, curr) => acc + (Number(curr.totalDurationSeconds) || 0), 0);
  
  // Sum unsubmitted timerSeconds across user's tasks (active or paused)
  const myTasksTimerSecs = (myTasks || []).reduce((acc, t) => acc + (Number(t.timerSeconds) || 0), 0);
  const liveActiveSecs = (activeRunningTask?.timerSeconds && !myTasks.some(t => t._id === activeRunningTask._id)) ? activeRunningTask.timerSeconds : 0;
  const currentTaskSecs = Math.max(
    (activeRunningTask?.timerSeconds || 0),
    myTasksTimerSecs + liveActiveSecs
  );

  const totalTaskTodaySecs = totalLoggedTodaySecs + currentTaskSecs;
  const taskTodayH = Math.floor(totalTaskTodaySecs / 3600);
  const taskTodayM = Math.floor((totalTaskTodaySecs % 3600) / 60);
  const taskTodayFormatted = totalTaskTodaySecs > 0
    ? (totalTaskTodaySecs < 60 ? `${totalTaskTodaySecs}s` : `${taskTodayH}h ${String(taskTodayM).padStart(2, '0')}m`)
    : '0h 0m';
  const taskTodayCode = formatTimeDurationSafe(totalTaskTodaySecs);

  // Stable logged duration (updates upon pause, resume, stop, or task completion)
  const stableLoggedTodaySecs = totalTaskTodaySecs;

  const stableActivityFormatted = (() => {
    if (stableLoggedTodaySecs > 0) return formatTimeDurationSafe(stableLoggedTodaySecs);
    return '00:00:00';
  })();
  const totalActivityFormatted = stableActivityFormatted;

  // FIX: "Logged This Week" — sum all days' durationHours from weeklyTimeLogs.
  // For today, CRMContext now provides real work seconds. But to keep the counter
  // ticking live (every second) when the user is actively clocked in, we replace
  // today's durationHours with the live workSeconds from TimerContext.
  const todayWeekLog = (weeklyTimeLogs || []).find(l => l.isCurrentDay);
  const otherDaysHours = (weeklyTimeLogs || [])
    .filter(l => !l.isCurrentDay)
    .reduce((acc, curr) => acc + (Number(curr.durationHours) || 0), 0);
  // If clocked in, use live workSeconds; otherwise fall back to today's durationHours from the log
  const todayLiveHours = isClockedIn
    ? workSeconds / 3600
    : (Number(todayWeekLog?.durationHours) || 0);
  const totalWeeklyHours = otherDaysHours + todayLiveHours;
  const totalWeeklyFormatted = `${Math.floor(totalWeeklyHours)}h ${String(Math.floor((totalWeeklyHours % 1) * 60)).padStart(2, '0')}m`;

  const [companySettings, setCompanySettings] = useState(getCompanySettings);

  useEffect(() => {
    const handleSettingsUpdate = () => setCompanySettings(getCompanySettings());
    window.addEventListener('company-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('company-settings-updated', handleSettingsUpdate);
  }, []);

  const dayNamesShort = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const todayDayShort = dayNamesShort[new Date().getDay()];
  const [activeWeekDayShort, setActiveWeekDayShort] = useState(todayDayShort);

  useEffect(() => {
    if (todayDayShort) {
      setActiveWeekDayShort(todayDayShort);
    }
  }, [todayDayShort]);

  const selectedDayLogData = (weeklyTimeLogs || []).find(l => l.shortDay === activeWeekDayShort) || (weeklyTimeLogs || []).find(l => l.isCurrentDay) || (weeklyTimeLogs || [])[0] || null;

  // Employees on leave today (Dynamic real-time date check)
  const employeesOnLeave = (leaves || []).filter(l =>
    l?.status === 'approved' && (
      (l?.startDate <= todayStr && l?.endDate >= todayStr) ||
      (l?.startDate <= '2026-09-25' && l?.endDate >= '2026-09-25') // fallback for simulated date
    )
  );

  // 1. Pending leave requests waiting for my review (EXCLUDING applicant's own leaves!)
  const pendingLeaveRequestsForMe = (leaves || []).filter(l => {
    if (l?.status !== 'pending') return false;
    // CRITICAL: Employee can NEVER review or approve their own leave application!
    const isApplicant = (l.employeeId && currentUser?._id && String(l.employeeId) === String(currentUser._id)) ||
      (l.employeeName && currentUser?.name && l.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
    if (isApplicant) return false;

    // Admin / HR can approve any employee's leave
    if (isUserAdminOrHR || isHRorAdmin(currentUser)) return true;

    // Team Leader can approve if assigned/routed to them
    if (canApproveLeaves(currentUser) && (
      (l.appliedToId && String(l.appliedToId) === String(currentUser?._id)) ||
      (l.appliedToName && currentUser?.name && l.appliedToName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    )) {
      return true;
    }

    return false;
  });

  // 2. Pending leaves submitted BY the current user (awaiting review by Admin/HR)
  const myPendingLeaves = (leaves || []).filter(l => {
    if (l?.status !== 'pending') return false;
    const isApplicant = (l.employeeId && currentUser?._id && String(l.employeeId) === String(currentUser._id)) ||
      (l.employeeName && currentUser?.name && l.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
    return isApplicant;
  });

  // 3. Recently decided leaves for current user (approved or rejected, not yet acknowledged)
  const myDecidedLeaves = (leaves || []).filter(l => {
    if (l?.status !== 'approved' && l?.status !== 'rejected') return false;
    const isApplicant = (l.employeeId && currentUser?._id && String(l.employeeId) === String(currentUser._id)) ||
      (l.employeeName && currentUser?.name && l.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
    return isApplicant && !l.isAcknowledged;
  });

  // 4. All personal leaves of current user (for history/status display)
  const myRecentLeaves = (leaves || []).filter(l => {
    const isApplicant = (l.employeeId && currentUser?._id && String(l.employeeId) === String(currentUser._id)) ||
      (l.employeeName && currentUser?.name && l.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
    return isApplicant;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

      {/* ── ⏰ LIVE DUE TASK REMINDER ALERT BANNER ── */}
      {dueReminders.length > 0 && (
        <div style={{
          backgroundColor: '#fff7ed',
          border: '1.5px solid #fb923c',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(251, 146, 60, 0.15)',
          animation: 'reminderPulseGlow 2.5s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Bell size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#fed7aa', color: '#9a3412', padding: '1px 6px', borderRadius: '4px' }}>
                  ⏰ REMINDER DUE
                </span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                  #{dueReminders[0].taskCode || 'TSK'}: {dueReminders[0].title}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#7c2d12', marginTop: '2px' }}>
                Paused at <strong>{dueReminders[0].hoursLoggedText || formatTimeDurationSafe(dueReminders[0].timerSeconds || 0)}</strong>
                {dueReminders[0].reminderNote ? ` • Note: "${dueReminders[0].reminderNote}"` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => resumeSnoozedTask(dueReminders[0]._id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: '#ea580c',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.3)'
              }}
            >
              <Play size={12} fill="#fff" />
              <span>Resume Timer & Work</span>
            </button>

            <button
              onClick={() => snoozeTask(dueReminders[0]._id, { remindInMinutes: 15, note: 'Snoozed 15m' })}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                color: '#9a3412',
                border: '1px solid #fdba74',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              title="Snooze for another 15 minutes"
            >
              +15m Snooze
            </button>

            <button
              onClick={() => dismissTaskReminder(dueReminders[0]._id)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: '#9a3412',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              title="Dismiss reminder"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── 📬 REAL-TIME LEAVE DECISION ALERT BANNER ── */}
      {myDecidedLeaves.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {myDecidedLeaves.map(leave => (
            <div
              key={leave._id}
              style={{
                backgroundColor: leave.status === 'approved' ? '#ecfdf5' : '#fff1f2',
                border: `1.5px solid ${leave.status === 'approved' ? '#6ee7b7' : '#fca5a5'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                boxShadow: leave.status === 'approved' ? '0 4px 12px rgba(16, 185, 129, 0.12)' : '0 4px 12px rgba(239, 68, 68, 0.12)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  backgroundColor: leave.status === 'approved' ? '#10b981' : '#ef4444',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {leave.status === 'approved' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: leave.status === 'approved' ? '#065f46' : '#991b1b' }}>
                    {leave.status === 'approved' ? '🎉 Leave Application Approved!' : '⚠️ Leave Application Declined'}
                  </div>
                  <div style={{ fontSize: '12px', color: leave.status === 'approved' ? '#047857' : '#b91c1c', marginTop: '2px' }}>
                    <strong>{leave.leaveType} ({leave.durationText || `${leave.durationDays} Days`})</strong> • 📅 {leave.startDate} to {leave.endDate}
                    <span style={{ margin: '0 6px', opacity: 0.6 }}>•</span>
                    <span>
                      {leave.status === 'approved'
                        ? `Approved by ${leave.approvedBy || leave.actionBy || 'Admin'}${leave.actionDateFormatted ? ` on ${leave.actionDateFormatted}` : ''}`
                        : `Reviewed by ${leave.rejectedBy || leave.actionBy || 'Admin'}${leave.actionDateFormatted ? ` on ${leave.actionDateFormatted}` : ''}${leave.rejectionReason ? ` — Reason: "${leave.rejectionReason}"` : ''}`}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => acknowledgeLeave(leave._id)}
                  style={{
                    backgroundColor: leave.status === 'approved' ? '#059669' : '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '7px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ✓ Acknowledge & Dismiss
                </button>
                <button
                  onClick={() => navigate('/leaves')}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    borderRadius: '7px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TOP SECTION: Welcome Profile Card & Attendance Shift Clock (Compact & Sleek)
      ───────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '14px',
        alignItems: 'stretch'
      }}>
        {/* Welcome Profile Card */}
        <div style={{
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={currentUser?.name}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                }}
              />
              <span style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isClockedIn ? '#10b981' : '#94a3b8',
                border: '2px solid #ffffff'
              }} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Welcome {currentUser?.name || 'User'}
                </h2>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: roleConfig?.badgeBg || '#eff6ff',
                  color: roleConfig?.badgeColor || '#2563eb',
                  border: `1px solid ${roleConfig?.badgeColor || '#93c5fd'}40`
                }}>
                  {roleConfig?.label || 'Team Member'}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500', marginTop: '1px' }}>
                {currentUser?.role || roleConfig?.label || 'Team Member'} • <span style={{ color: '#94a3b8' }}>ID: #{currentUser?.employeeCode || currentUser?._id || 'EMP-01'}</span>
              </div>
            </div>
          </div>

          {/* Quick Informational Snapshot (Shift Status & Available Leaves) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <div style={{ padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Shift Status</div>
              <div style={{ fontSize: '11.5px', fontWeight: '700', marginTop: '1px', color: isClockedIn ? (isOnBreak ? '#b45309' : '#16a34a') : '#64748b' }}>
                {isClockedIn
                  ? (isOnBreak ? `☕ On ${breakType}` : '🟢 Shift Active')
                  : (hadClockedOutToday ? '🔴 Shift Ended' : '⚪ Not Clocked In')}
              </div>
            </div>

            <div
              onClick={() => setIsApplyLeaveOpen(true)}
              style={{ cursor: 'pointer', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}
              title="Click to apply for leave"
            >
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Leave Balance</div>
              <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a', marginTop: '1px' }}>
                Casual: 10d • Sick: 8d
              </div>
            </div>
          </div>

          {/* Quick Direct Buttons for Employees & Profile */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => navigate('/employees')}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Users size={12} />
              <span>Directory</span>
            </button>

            <button
              onClick={() => navigate('/attendance')}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="View full attendance matrix & clock in/out logs"
            >
              <CalendarCheck size={12} color="#16a34a" />
              <span>Attendance</span>
            </button>

            <button
              onClick={() => setIsEditProfileOpen(true)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#f8fafc',
                color: '#475569',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Edit My Profile"
            >
              <User size={12} /> Edit
            </button>
          </div>
        </div>

        {/* Live Work Timer & Attendance Shift Clock (No Seconds, Beautiful UI & Break Actions) */}
        <div style={{
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            {/* Left Info Column: Clock Time, Live Status & Key Shift/Task Metrics */}
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  lineHeight: 1
                }}>
                  {currentTime}
                </div>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  background: isOnBreak ? '#fef3c7' : (isClockedIn ? '#dcfce7' : (hadClockedOutToday ? '#f1f5f9' : '#f8fafc')),
                  color: isOnBreak ? '#b45309' : (isClockedIn ? '#15803d' : (hadClockedOutToday ? '#64748b' : '#64748b')),
                  border: `1px solid ${isOnBreak ? '#fde68a' : (isClockedIn ? '#bbf7d0' : '#e2e8f0')}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isOnBreak ? '#f59e0b' : (isClockedIn ? '#22c55e' : (hadClockedOutToday ? '#94a3b8' : '#cbd5e1')),
                    display: 'inline-block'
                  }} />
                  {isOnBreak ? `On ${breakType}` : (isClockedIn ? 'Shift Active 🟢' : (hadClockedOutToday ? 'Shift Ended' : 'Not Clocked In'))}
                </span>
              </div>

              {/* Attendance & Task Total Hours row */}
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <span>Clock In: <strong style={{ color: '#0f172a' }}>{loginTime || (isClockedIn ? 'Active' : '--')}</strong></span>
                <span>•</span>
                <span>Clock Out: <strong style={{ color: clockOutTime ? '#dc2626' : '#64748b' }}>{clockOutTime || (isClockedIn ? 'Active' : '--')}</strong></span>
                <span>•</span>
                <span>Net Shift: <strong style={{ color: '#0284c7' }}>{workDurationText || '0h 0m'}</strong></span>
                <span>•</span>
                <span
                  style={{
                    backgroundColor: '#f5f3ff',
                    color: '#6d28d9',
                    padding: '1.5px 7px',
                    borderRadius: '4px',
                    border: '1px solid #ddd6fe',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={`Today Task Time: ${taskTodayCode} (${(totalTaskTodaySecs / 3600).toFixed(2)}h)`}
                >
                  <CheckCircle2 size={11} color="#7c3aed" />
                  Task Total: <strong style={{ color: '#5b21b6' }}>{taskTodayFormatted}</strong>
                </span>
              </div>

              {/* When clocked in: Break quick-action pills */}
              {isClockedIn && !isOnBreak && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <button
                    id="btn-tea-break"
                    onClick={startTeaBreak}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#fffbeb',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      padding: '4px 9px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Take 15-minute Tea Break"
                  >
                    <Coffee size={12} color="#b45309" />
                    <span>Tea (15m)</span>
                  </button>

                  <button
                    id="btn-lunch-break"
                    onClick={startLunchBreak}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      padding: '4px 9px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Take 45-minute Lunch Break"
                  >
                    <Utensils size={12} color="#1d4ed8" />
                    <span>Lunch (45m)</span>
                  </button>

                  <button
                    id="btn-more-breaks"
                    onClick={() => setIsBreakModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                    title="Choose Custom Break or View Break Log"
                  >
                    <span>More...</span>
                  </button>
                </div>
              )}

              {/* When on break: Break info & extension controls */}
              {isOnBreak && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: isBreakOverdue ? '#fef2f2' : '#fffbeb',
                    border: isBreakOverdue ? '1px solid #ef4444' : '1px solid #f59e0b',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    color: isBreakOverdue ? '#dc2626' : '#b45309',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    <Coffee size={12} color={isBreakOverdue ? '#dc2626' : '#d97706'} />
                    <span>{breakType}: <strong>{currentBreakTimeString}</strong></span>
                  </div>

                  <button
                    onClick={() => extendBreak(5)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    title="Extend break by 5 minutes"
                  >
                    +5m
                  </button>

                  <button
                    onClick={() => setIsBreakModalOpen(true)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                    title="Break history & options"
                  >
                    All Breaks
                  </button>
                </div>
              )}
            </div>

            {/* Right Action Column ("ek side karo" & "btn thoda bada"): Dedicated Big Action Button */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: '5px',
              flexShrink: 0
            }}>
              {isOnBreak ? (
                <button
                  id="btn-resume-work-dashboard"
                  onClick={resumeFromBreak}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    backgroundColor: '#16a34a',
                    backgroundImage: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(22, 163, 74, 0.4)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.3)';
                  }}
                  title="Resume working and continue shift"
                >
                  <Play size={13} fill="#fff" />
                  <span>Resume Shift</span>
                </button>
              ) : isClockedIn ? (
                <button
                  id="btn-clock-out"
                  onClick={handleClockOut}
                  title="End shift and save attendance logs"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    backgroundColor: '#ea580c',
                    backgroundImage: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                    transition: 'all 0.15s ease',
                    minWidth: '130px'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(234, 88, 12, 0.45)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(234, 88, 12, 0.35)';
                  }}
                >
                  <Square size={12} fill="#fff" />
                  <span>Clock Out</span>
                </button>
              ) : (
                <button
                  id="btn-clock-in"
                  onClick={handleClockIn}
                  title="Start your daily shift timer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: '#16a34a',
                    backgroundImage: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '11px 26px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                    transition: 'all 0.15s ease',
                    minWidth: '160px'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(22, 163, 74, 0.45)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(22, 163, 74, 0.35)';
                  }}
                >
                  <Play size={13} fill="#fff" />
                  <span>Clock In (Start Shift)</span>
                </button>
              )}

              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                {isClockedIn
                  ? `Shift Active (${workDurationText || '0h 0m'})`
                  : (hadClockedOutToday
                    ? `Ended at ${clockOutTime || 'Today'} (${workDurationText})`
                    : 'Click Clock In to begin shift')}
              </span>
            </div>
          </div>

          {/* Shift Time Calculation Breakdown (In-Place, No Navigation, No Seconds) */}
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              borderRadius: '7px',
              border: '1px solid #e2e8f0',
              fontSize: '11px',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>Gross: <strong style={{ color: '#0f172a' }}>{grossDurationText || '0h 0m'}</strong></span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>Break: <strong style={{ color: '#b45309' }}>{breakDurationText || '0m'}</strong></span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ color: '#0284c7', fontWeight: '700' }}>Net Shift: {workDurationText || '0h 0m'}</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ color: '#7c3aed', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={11} color="#7c3aed" /> Task Total: {taskTodayFormatted}
              </span>
            </div>
            <span style={{ fontSize: '10px', color: isClockedIn ? '#16a34a' : '#94a3b8', fontWeight: '600' }}>
              {isClockedIn ? (isOnBreak ? `☕ On ${breakType}` : '● Shift Active') : (hadClockedOutToday ? 'Shift Ended' : 'Ready to Start')}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          MIDDLE ROW: My Active Timer & Week Timelogs (Compact, High-Density)
      ───────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '14px',
        alignItems: 'stretch'
      }}>
        {/* Left: My Active Timer Card (Compact & Modern) */}
        <div style={{
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
              <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Today Activity:</span>
                <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}>
                  {stableActivityFormatted}
                </span>
              </div>
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

                {isOnBreak && (
                  <div style={{
                    padding: '4px 8px',
                    backgroundColor: '#fffbeb',
                    borderRadius: '5px',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '4px'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Coffee size={12} color="#d97706" />
                      <span>Paused (On {breakType})</span>
                    </span>
                    <button
                      onClick={resumeFromBreak}
                      style={{
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '10px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Resume
                    </button>
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
                  <span>Start: <strong style={{ color: '#334155' }}>{displayActiveTask?.timerStartTime || (displayActiveTask?.timerRunning ? 'Running ⏱️' : (isOnBreak ? 'On Break ☕' : '09:30 AM'))}</strong></span>
                  <span>Assignee: <strong style={{ color: '#0f172a' }}>{displayActiveTask?.assignedToName || 'Me'}</strong></span>
                  <span>By: <strong style={{ color: '#64748b' }}>{displayActiveTask?.assignedBy || 'Admin'}</strong></span>
                </div>

                {/* Line 3: Progress Bar & Budget Comparison (Live Task Ticking runs right here!) */}
                {displayActiveTask && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', fontWeight: '600', color: '#64748b', marginBottom: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Budget: {displayActiveTask.estimatedHours || 4}h est.</span>
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
                        <span style={{
                          color: displayActiveTask.timerRunning ? '#0284c7' : ((Number(displayActiveTask.hoursLogged) || 0) > Number(displayActiveTask.estimatedHours) ? '#d97706' : '#16a34a'),
                          fontWeight: '700',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '11px'
                        }}>
                          ⏱️ {displayActiveTask.timerRunning
                            ? formatTimeDurationSafe(displayActiveTask.timerSeconds || 0)
                            : (displayActiveTask.timerSeconds > 0
                              ? `${formatTimeDurationSafe(displayActiveTask.timerSeconds)} (paused)`
                              : (displayActiveTask.hoursLogged ? `${displayActiveTask.hoursLogged}h logged` : (displayActiveTask.hoursLoggedText || '00:00:00')))}
                        </span>
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

              {/* Action Buttons with Do Later / Remind Me */}
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    const res = await completeTask(displayActiveTask._id);
                    if (res?.nextTask) {
                      setActiveSelectedTaskId(res.nextTask._id);
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
                  title="Mark completed & advance queue"
                >
                  <CheckCircle2 size={13} />
                  <span>Complete & Next</span>
                </button>

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
                            <span>Paused at: <strong>{snz.hoursLoggedText || formatSeconds(snz.timerSeconds || 0)}</strong></span>
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

        {/* Right: Week Timelogs (Interactive, Rich & High-Density) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          {/* Week Timelogs header & Target KPI */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                    Week Timelogs 📅
                  </h4>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                    (Mon – Sun)
                  </span>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                  Click any day to audit clock-in, clock-out, tea breaks & task duration
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#0284c7',
                  backgroundColor: '#e0f2fe',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontFamily: 'monospace'
                }}>
                  ⚡ {totalWeeklyFormatted} Logged This Week
                </span>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '600',
                  color: '#334155',
                  backgroundColor: '#f1f5f9',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  Shift: {companySettings?.shiftStartTime || '10:00 AM'} - {companySettings?.shiftEndTime || '07:00 PM'} ({companySettings?.standardWorkHours || 9}h)
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Day Circles (Mon, Tue, Wed, Thu, Fri, Sat, Sun) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 6px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #f1f5f9'
          }}>
            {(weeklyTimeLogs || []).map((log) => {
              const isToday = log?.isCurrentDay || log?.shortDay === todayDayShort;
              const isSunday = log?.shortDay === 'Su' || log?.isSunday;
              const isSelected = (selectedDayLogData?.shortDay || todayDayShort) === log.shortDay;

              return (
                <div
                  key={log?.shortDay || Math.random()}
                  onClick={() => setActiveWeekDayShort(log.shortDay)}
                  title={`${log?.day}: ${log?.durationText || '0h'} logged. Click to view breakdown.`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? '#ffffff' : 'transparent',
                    border: isSelected ? '1.5px solid #0284c7' : '1.5px solid transparent',
                    boxShadow: isSelected ? '0 2px 6px rgba(2, 132, 199, 0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{
                    fontSize: '10.5px',
                    color: isSelected ? '#0284c7' : (isToday ? '#0284c7' : (isSunday ? '#b45309' : '#64748b')),
                    fontWeight: isSelected || isToday || isSunday ? '800' : '600'
                  }}>
                    {log.shortDay}
                  </span>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#0284c7' : (isToday ? '#e0f2fe' : (isSunday ? '#fef3c7' : '#ffffff')),
                    color: isSelected ? '#ffffff' : (isToday ? '#0284c7' : (isSunday ? '#b45309' : '#475569')),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: isSelected ? '1.5px solid #0284c7' : (isSunday ? '1px solid #fde68a' : '1px solid #cbd5e1')
                  }}>
                    {isSunday ? '🏖️' : log.shortDay}
                  </div>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    color: isSelected ? '#0284c7' : (isSunday ? '#b45309' : '#64748b'),
                    backgroundColor: isSunday ? '#fef3c7' : 'transparent',
                    padding: isSunday ? '0px 3px' : '0',
                    borderRadius: '3px'
                  }}>
                    {isSunday ? 'OFF' : (isToday ? (stableLoggedTodaySecs > 0 ? (stableActivityFormatted.split(':')[0] + 'h') : (log.durationText?.split(' ')[0] || '0h')) : (log.durationText?.split(' ')[0] || '0h'))}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Detailed Selected Day Activity Box (Fills empty card height!) */}
          {selectedDayLogData && (
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {/* Day Header & Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarIcon size={13} color="#0284c7" />
                  <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                    {selectedDayLogData.day} ({selectedDayLogData.date})
                  </span>
                  {selectedDayLogData.isCurrentDay && (
                    <span style={{ fontSize: '9.5px', backgroundColor: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '4px', fontWeight: '800' }}>
                      Today
                    </span>
                  )}
                </div>

                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  padding: '2px 7px',
                  borderRadius: '12px',
                  backgroundColor: selectedDayLogData.isSunday ? '#fef3c7' : (selectedDayLogData.isCurrentDay ? '#e0f2fe' : '#f0fdf4'),
                  color: selectedDayLogData.isSunday ? '#b45309' : (selectedDayLogData.isCurrentDay ? '#0284c7' : '#16a34a')
                }}>
                  {selectedDayLogData.isSunday ? '🏖️ Sunday Off' : (selectedDayLogData.isCurrentDay ? (isClockedIn ? '🟢 Shift Active' : '⏸️ Not Clocked In') : '✅ Shift Complete')}
                </span>
              </div>

              {/* 3 Metric Mini Cards (Clock In/Out • Breaks • Tasks) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {/* 1. Clock In / Out */}
                <div style={{ backgroundColor: '#ffffff', padding: '7px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                    <Clock size={11} color="#16a34a" /> Clock In / Out
                  </div>
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedDayLogData.loginTime || (companySettings?.shiftStartTime || '10:00 AM')}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>
                    Out: {selectedDayLogData.logoutTime || (companySettings?.shiftEndTime || '07:00 PM')}
                  </div>
                </div>

                {/* 2. Breaks & Tea Breaks */}
                <div style={{ backgroundColor: '#ffffff', padding: '7px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                    <Coffee size={11} color="#d97706" /> Breaks & Tea
                  </div>
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                    {selectedDayLogData.breakDuration || (selectedDayLogData.isSunday ? '0m' : '45m')}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#d97706', marginTop: '1px' }}>
                    {selectedDayLogData.isSunday ? '0 breaks' : `☕ ${selectedDayLogData.teaBreaksCount || 1} Tea • 🍱 ${selectedDayLogData.lunchBreaksCount || 1} Lunch`}
                  </div>
                </div>

                {/* 3. Task Work vs Standard Shift */}
                <div style={{ backgroundColor: '#ffffff', padding: '7px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                    <CheckCircle2 size={11} color="#0284c7" /> Work Duration
                  </div>
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0284c7', marginTop: '2px' }}>
                    {selectedDayLogData.isCurrentDay ? (stableLoggedTodaySecs > 0 ? stableActivityFormatted : selectedDayLogData.durationText) : selectedDayLogData.durationText}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>
                    {(() => {
                      const stdH = Number(companySettings?.standardWorkHours) || 9;
                      const loggedH = selectedDayLogData.isCurrentDay ? (stableLoggedTodaySecs / 3600) : (selectedDayLogData.durationHours || 0);
                      return loggedH >= stdH
                        ? `+${(loggedH - stdH).toFixed(1)}h Extra / Overtime`
                        : `${Math.round((loggedH / stdH) * 100)}% of ${stdH}h shift`;
                    })()}
                  </div>
                </div>
              </div>

              {/* Tasks Worked on this Day */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  <span>Tasks Tracked ({selectedDayLogData.tasksWorked?.length || 0})</span>
                  <button
                    onClick={() => setSelectedDayLog(selectedDayLogData)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      padding: 0
                    }}
                  >
                    Full Audit Modal <ChevronRight size={12} />
                  </button>
                </div>

                {selectedDayLogData.tasksWorked && selectedDayLogData.tasksWorked.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '110px', overflowY: 'auto' }}>
                    {selectedDayLogData.tasksWorked.map((t, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#ffffff',
                          padding: '5px 8px',
                          borderRadius: '5px',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '10px', fontWeight: '800', color: '#0284c7', fontFamily: 'monospace' }}>
                            #{t.taskCode}
                          </span>
                          <span style={{ color: '#0f172a', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={t.taskTitle}>
                            {t.taskTitle}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          {t.isOverBudget && (
                            <span style={{ fontSize: '9px', fontWeight: '700', backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 4px', borderRadius: '3px' }} title="Exceeded estimated budget">
                              +{t.overBudgetHours}h over
                            </span>
                          )}
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '1px 5px', borderRadius: '4px' }}>
                            ⏱️ {t.durationText}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
                    {selectedDayLogData.isSunday ? 'Weekly holiday — no tasks scheduled.' : (selectedDayLogData.isCurrentDay ? 'Active shift in progress. Use Active Timer on the left to start tracking tasks!' : 'No tasks logged for this day.')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Live Sync Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
            <span>Shift Status: <strong style={{ color: isClockedIn ? '#16a34a' : '#64748b' }}>{isClockedIn ? '🟢 Active & Clocked In' : '⏸️ Shift Stopped'}</strong></span>
            <span>Total Today: <strong style={{ color: '#0284c7' }}>{stableActivityFormatted}</strong></span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          LOWER ROW 1: My Tasks & Tickets (Compact & High-Density)
      ───────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '14px',
        alignItems: 'stretch'
      }}>
        {/* My Tasks & Delegation Table Widget */}
        <div style={{
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  {isUserAdminOrHR ? 'Tasks & Delegation' : 'My Tasks'}
                </h3>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  color: '#0284c7',
                  backgroundColor: '#e0f2fe',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {activeScopedTasks.length} Active / New
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {activeScopedTasks.length} pending / newly assigned • {completedScopedTasks.length} recently completed
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Scope Pills for Admin/HR */}
              {isUserAdminOrHR && (
                <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
                  <button
                    onClick={() => {
                      setTaskScopeFilter('all');
                      setTaskMemberFilter('all');
                    }}
                    style={{
                      border: 'none',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      backgroundColor: taskScopeFilter === 'all' && taskMemberFilter === 'all' ? '#ffffff' : 'transparent',
                      color: taskScopeFilter === 'all' && taskMemberFilter === 'all' ? '#0284c7' : '#64748b',
                      boxShadow: taskScopeFilter === 'all' && taskMemberFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    All ({(tasks || []).length})
                  </button>
                  <button
                    onClick={() => {
                      setTaskScopeFilter('my');
                      setTaskMemberFilter('all');
                    }}
                    style={{
                      border: 'none',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      backgroundColor: taskScopeFilter === 'my' ? '#ffffff' : 'transparent',
                      color: taskScopeFilter === 'my' ? '#0284c7' : '#64748b',
                      boxShadow: taskScopeFilter === 'my' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    My ({myDirectTasks.length})
                  </button>
                  <button
                    onClick={() => {
                      setTaskScopeFilter('delegated');
                      setTaskMemberFilter('all');
                    }}
                    style={{
                      border: 'none',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      backgroundColor: taskScopeFilter === 'delegated' ? '#ffffff' : 'transparent',
                      color: taskScopeFilter === 'delegated' ? '#0284c7' : '#64748b',
                      boxShadow: taskScopeFilter === 'delegated' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    Delegated ({delegatedByMeTasks.length})
                  </button>
                </div>
              )}

              {/* Member filter select for Admin */}
              {isUserAdminOrHR && (employees || []).length > 0 && (
                <select
                  value={taskMemberFilter}
                  onChange={(e) => {
                    setTaskMemberFilter(e.target.value);
                    setTaskScopeFilter('all');
                  }}
                  style={{
                    padding: '3px 6px',
                    fontSize: '11px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#334155',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">👥 All Members</option>
                  {(employees || []).map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                id="btn-add-task-dashboard"
                onClick={() => setIsAddTaskOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '4px 9px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Plus size={12} /> Assign Task
              </button>
              <button
                onClick={() => navigate('/tasks')}
                style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
              >
                All →
              </button>
            </div>
          </div>

          {/* Quick Sub-Filter Tabs: Active & New vs Recently Completed vs All */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '6px',
            marginTop: '2px',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setTaskStatusTab('active')}
                style={{
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: taskStatusTab === 'active' ? '#e0f2fe' : 'transparent',
                  color: taskStatusTab === 'active' ? '#0284c7' : '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>⚡ Active & New</span>
                <span style={{
                  fontSize: '9.5px',
                  backgroundColor: taskStatusTab === 'active' ? '#0284c7' : '#e2e8f0',
                  color: taskStatusTab === 'active' ? '#ffffff' : '#475569',
                  padding: '1px 5px',
                  borderRadius: '8px'
                }}>
                  {activeScopedTasks.length}
                </span>
              </button>

              <button
                onClick={() => setTaskStatusTab('completed')}
                style={{
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: taskStatusTab === 'completed' ? '#dcfce7' : 'transparent',
                  color: taskStatusTab === 'completed' ? '#16a34a' : '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>✅ Recently Completed</span>
                <span style={{
                  fontSize: '9.5px',
                  backgroundColor: taskStatusTab === 'completed' ? '#16a34a' : '#e2e8f0',
                  color: taskStatusTab === 'completed' ? '#ffffff' : '#475569',
                  padding: '1px 5px',
                  borderRadius: '8px'
                }}>
                  {completedScopedTasks.length}
                </span>
              </button>

              <button
                onClick={() => setTaskStatusTab('all')}
                style={{
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: taskStatusTab === 'all' ? '#f1f5f9' : 'transparent',
                  color: taskStatusTab === 'all' ? '#334155' : '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>All Tasks</span>
                <span style={{
                  fontSize: '9.5px',
                  backgroundColor: taskStatusTab === 'all' ? '#334155' : '#e2e8f0',
                  color: taskStatusTab === 'all' ? '#ffffff' : '#475569',
                  padding: '1px 5px',
                  borderRadius: '8px'
                }}>
                  {baseScopedTasks.length}
                </span>
              </button>
            </div>

            <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
              Click row for details • Instant timer play
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                  <th style={{ padding: '6px 4px', fontWeight: '600' }}>Task#</th>
                  <th style={{ padding: '6px 4px', fontWeight: '600' }}>Task Title</th>
                  <th style={{ padding: '6px 4px', fontWeight: '600' }}>Assignee</th>
                  <th style={{ padding: '6px 4px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '6px 4px', fontWeight: '600' }}>Date / Timeline</th>
                  <th style={{ padding: '6px 4px', fontWeight: '600', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tableDisplayTasks.length > 0 ? (
                  tableDisplayTasks.slice(0, 6).map(task => {
                    const isCompleted = isTaskActuallyCompleted(task);
                    const isTaskRunning = task.timerRunning;
                    const isSnoozed = task.snoozed && task.remindAt && !task.reminderDismissed;
                    const isNewAssignment = !isCompleted && (task.status === 'in_progress' || task.status === 'incomplete');

                    return (
                      <tr
                        key={task._id}
                        onClick={() => setSelectedTask(task)}
                        style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background 0.15s ease' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Click to view full task details"
                      >
                        <td style={{ padding: '7px 4px', color: '#0284c7', fontWeight: '700', fontFamily: 'monospace', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                          #{task.taskCode}
                        </td>
                        <td style={{ padding: '7px 4px', color: '#0f172a', fontWeight: '600' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                              {task.title}
                            </span>
                            {isTaskRunning && (
                              <span style={{ fontSize: '9px', backgroundColor: '#e0f2fe', color: '#0284c7', padding: '1px 4px', borderRadius: '4px', fontWeight: '800' }}>
                                ⏱️ LIVE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '400', marginTop: '1px' }}>
                            📁 {task.projectName || 'General Work'}
                          </div>
                        </td>
                        <td style={{ padding: '7px 4px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <img
                              src={task.assignedToAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={task.assignedToName}
                              style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                              <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#334155' }}>
                                {task.assignedToName || 'Unassigned'}
                              </span>
                              {task.assignedBy && task.assignedBy !== task.assignedToName && (
                                <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                                  by {task.assignedBy}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '7px 4px', whiteSpace: 'nowrap' }}>
                          {isCompleted ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '10.5px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              border: '1px solid #bbf7d0',
                              backgroundColor: '#f0fdf4',
                              color: '#16a34a',
                              fontWeight: '700'
                            }}>
                              <CheckCircle2 size={11} /> Completed
                            </span>
                          ) : isTaskRunning ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '10.5px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              border: '1px solid #bae6fd',
                              backgroundColor: '#f0f9ff',
                              color: '#0284c7',
                              fontWeight: '700'
                            }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#0284c7', animation: 'pulse 1.5s infinite' }} />
                              In Progress
                            </span>
                          ) : isSnoozed ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '10.5px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              border: '1px solid #e9d5ff',
                              backgroundColor: '#faf5ff',
                              color: '#7e22ce',
                              fontWeight: '700'
                            }}>
                              <Clock size={10} /> Paused / Remind
                            </span>
                          ) : (!isCompleted && !isTaskRunning && !isSnoozed && task.dueDate && task.dueDate < todayStr) ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '10.5px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              fontWeight: '800'
                            }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
                              ⚠️ Overdue
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '10.5px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              border: '1px solid #fed7aa',
                              backgroundColor: '#fff7ed',
                              color: '#ea580c',
                              fontWeight: '700'
                            }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#ea580c' }} />
                              New Assigned
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '7px 4px', color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {isCompleted ? (
                            <span style={{ color: '#16a34a', fontWeight: '600' }}>
                              Done: {task.completedOn === todayStr ? 'Today' : (task.completedOn || 'Recent')}
                            </span>
                          ) : (!isCompleted && task.dueDate && task.dueDate < todayStr) ? (
                            <span style={{ color: '#dc2626', fontWeight: '800', backgroundColor: '#fee2e2', padding: '1px 5px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                              ⚠️ Overdue ({task.dueDate})
                            </span>
                          ) : task.dueDate === todayStr ? (
                            <span style={{ color: '#ea580c', fontWeight: '700' }}>Due: Today</span>
                          ) : (
                            <span>Due: {task.dueDate || 'Open'}</span>
                          )}
                        </td>
                        <td style={{ padding: '7px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {!isCompleted && !isTaskRunning && (
                              <button
                                title={!isClockedIn ? "Clock in shift above first" : "Start Task Timer"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isClockedIn) {
                                    addToast('⚠️ Shift is not clocked in! Please Clock In above before starting task timers.', 'warning');
                                    return;
                                  }
                                  if (isOnBreak) {
                                    addToast('☕ You are currently on break. Please resume work before running task timers!', 'warning');
                                    return;
                                  }
                                  startTaskTimer(task._id);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  backgroundColor: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '2px 6px',
                                  borderRadius: '5px',
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                <Play size={9} fill="#fff" /> Start
                              </button>
                            )}

                            {!isCompleted && isTaskRunning && (
                              <button
                                title="Pause Task Timer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  pauseTaskTimer(task._id);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  backgroundColor: '#d97706',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '2px 6px',
                                  borderRadius: '5px',
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                <Pause size={9} fill="#fff" /> Pause
                              </button>
                            )}

                            <button
                              title={isCompleted ? 'Mark as Incomplete' : 'Mark as Completed'}
                              onClick={(e) => {
                                e.stopPropagation();
                                changeTaskStatus(task._id, isCompleted ? 'incomplete' : 'completed');
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                backgroundColor: isCompleted ? '#f1f5f9' : '#16a34a',
                                color: isCompleted ? '#475569' : '#ffffff',
                                border: 'none',
                                padding: '2px 6px',
                                borderRadius: '5px',
                                fontSize: '10.5px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              <CheckCircle2 size={10} />
                              {isCompleted ? 'Reopen' : 'Done'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '18px 0', color: '#94a3b8' }}>
                      <ListTodo size={22} style={{ margin: '0 auto 4px', display: 'block', color: '#cbd5e1' }} />
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>
                        {taskStatusTab === 'completed'
                          ? 'No recently completed tasks found in this view.'
                          : 'No active or new assigned tasks right now.'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Support Tickets Widget */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                🎫 Support Tickets
              </h3>
              <span style={{
                fontSize: '10.5px',
                fontWeight: '700',
                color: '#0284c7',
                backgroundColor: '#e0f2fe',
                padding: '1px 6px',
                borderRadius: '10px'
              }}>
                {openTicketsList.length} Open
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setIsRaiseTicketOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '4px 9px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Plus size={12} /> Raise Ticket
              </button>
              <button
                onClick={() => navigate('/tickets')}
                style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
              >
                All →
              </button>
            </div>
          </div>

          {/* Ticket Filter Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '6px',
            gap: '6px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setTicketFilterTab('all')}
                style={{
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: ticketFilterTab === 'all' ? '#f1f5f9' : 'transparent',
                  color: ticketFilterTab === 'all' ? '#0f172a' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                All ({(tickets || []).length})
              </button>
              <button
                onClick={() => setTicketFilterTab('open')}
                style={{
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: ticketFilterTab === 'open' ? '#eff6ff' : 'transparent',
                  color: ticketFilterTab === 'open' ? '#0284c7' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                Open ({openTicketsList.length})
              </button>
              <button
                onClick={() => setTicketFilterTab('resolved')}
                style={{
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: ticketFilterTab === 'resolved' ? '#f0fdf4' : 'transparent',
                  color: ticketFilterTab === 'resolved' ? '#16a34a' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                Resolved ({resolvedTicketsList.length})
              </button>
            </div>

            <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
              Click row to view discussion
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                  <th style={{ padding: '6px 4px', fontWeight: '600' }}>Ticket#</th>
                  <th style={{ padding: '6px 4px', fontWeight: '600' }}>Subject</th>
                  <th style={{ padding: '6px 4px', fontWeight: '600' }}>Priority</th>
                  <th style={{ padding: '6px 4px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '6px 4px', fontWeight: '600', textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {displayTickets.length > 0 ? (
                  displayTickets.slice(0, 6).map(tkt => (
                    <tr
                      key={tkt?._id || Math.random()}
                      onClick={() => setSelectedTicket(tkt)}
                      style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background 0.15s ease' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      title="Click to view full discussion & reply"
                    >
                      <td style={{ padding: '7px 4px', color: '#0284c7', fontWeight: '700', fontFamily: 'monospace', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        #{tkt?.ticketCode || 'TKT-1'}
                      </td>
                      <td style={{ padding: '7px 4px', color: '#0f172a', fontWeight: '600' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                          {tkt?.subject}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '400' }}>
                          From: {tkt?.requestedBy || tkt?.clientName || 'Employee'}
                        </div>
                      </td>
                      <td style={{ padding: '7px 4px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: '700',
                          backgroundColor: tkt?.priority === 'high' || tkt?.priority === 'urgent' ? '#fef2f2' : (tkt?.priority === 'medium' ? '#fffbeb' : '#f0fdf4'),
                          color: tkt?.priority === 'high' || tkt?.priority === 'urgent' ? '#dc2626' : (tkt?.priority === 'medium' ? '#d97706' : '#16a34a'),
                          border: `1px solid ${tkt?.priority === 'high' || tkt?.priority === 'urgent' ? '#fecaca' : (tkt?.priority === 'medium' ? '#fde68a' : '#bbf7d0')}`
                        }}>
                          {tkt?.priority || 'Normal'}
                        </span>
                      </td>
                      <td style={{ padding: '7px 4px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          fontSize: '10.5px',
                          fontWeight: '600',
                          backgroundColor: tkt?.status === 'resolved' || tkt?.status === 'closed' ? '#f0fdf4' : '#eff6ff',
                          color: tkt?.status === 'resolved' || tkt?.status === 'closed' ? '#16a34a' : '#2563eb',
                          border: `1px solid ${tkt?.status === 'resolved' || tkt?.status === 'closed' ? '#bbf7d0' : '#bfdbfe'}`
                        }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: tkt?.status === 'resolved' || tkt?.status === 'closed' ? '#16a34a' : '#2563eb' }} />
                          {tkt?.status || 'Open'}
                        </span>
                      </td>
                      <td style={{ padding: '7px 4px', textAlign: 'right', color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {tkt?.requestedOn || 'Today'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '18px 0', color: '#94a3b8' }}>
                      <LifeBuoy size={22} style={{ margin: '0 auto 4px', display: 'block', color: '#cbd5e1' }} />
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>No {ticketFilterTab} support tickets found.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          LOWER ROW 2: Birthdays, Appreciations & Calendar (Compact & Clean)
      ───────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '14px',
        alignItems: 'stretch'
      }}>
        {/* Birthdays Widget */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              🎂 Birthdays
            </h3>
            <button
              onClick={() => navigate('/calendar')}
              style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
            >
              All →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(computedBirthdays && computedBirthdays.length > 0 ? computedBirthdays : birthdays || []).slice(0, 3).map(bday => (
              <div
                key={bday?._id || Math.random()}
                onClick={() => addToast(`🎉 Birthday wishes sent to ${bday?.name || 'Colleague'}!`, 'success')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fffbeb'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                title="Click to send birthday greetings"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img
                    src={bday?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={bday?.name}
                    style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{bday?.name}</div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>{bday?.role}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#d97706' }}>
                    {bday?.birthdayDate}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                    {bday?.daysRemainingText}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Appreciations Widget */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              🏆 Appreciations
            </h3>
            <button
              onClick={() => navigate('/appreciation')}
              style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
            >
              All →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(appreciations || []).slice(0, 2).map(app => (
              <div
                key={app?._id || Math.random()}
                onClick={() => navigate('/appreciation')}
                style={{
                  padding: '8px 10px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Award size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                    {app?.givenToName} — <span style={{ color: '#d97706' }}>{app?.awardName}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                    "{app?.appreciationNote}"
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Calendar Widget */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              📅 Schedule & Events
            </h3>
            <button
              onClick={() => navigate('/calendar')}
              style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
            >
              Full Calendar →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(events || []).slice(0, 3).map(ev => (
              <div
                key={ev?._id || Math.random()}
                onClick={() => navigate('/calendar')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  backgroundColor: ev?.bgColor || '#eff6ff',
                  borderRadius: '5px',
                  borderLeft: `3.5px solid ${ev?.color || '#2563eb'}`,
                  cursor: 'pointer'
                }}
                title="Click to open calendar"
              >
                <span style={{ fontSize: '10.5px', fontWeight: '700', color: ev?.color || '#2563eb', fontFamily: 'monospace' }}>
                  {ev?.time || ev?.startTime || 'All Day'}
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#0f172a' }}>
                  {ev?.title || ev?.eventName || 'Company Event'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          LOWER ROW 3: On Leave, Anniversaries & WFH (Compact & Sleek)
      ───────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '14px',
        alignItems: 'stretch'
      }}>
        {/* On Leave Today */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              🏖️ On Leave Today
            </h3>
            <button
              onClick={() => setIsApplyLeaveOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: '#f1f5f9',
                color: '#0284c7',
                border: '1px solid #cbd5e1',
                padding: '3px 8px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Palmtree size={12} /> Apply
            </button>
          </div>

          {/* Leave Requests: Separated Review Queue (for Reviewers) vs My Pending Applications (for Applicant) */}
          {pendingLeaveRequestsForMe.length > 0 && (
            <div style={{
              padding: '8px 10px',
              backgroundColor: '#fffbeb',
              borderRadius: '7px',
              border: '1px solid #fde68a',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>⏳ For Your Review ({pendingLeaveRequestsForMe.length})</span>
                <span onClick={() => navigate('/leaves')} style={{ cursor: 'pointer', textDecoration: 'underline', fontSize: '10.5px' }}>
                  Manage →
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {pendingLeaveRequestsForMe.slice(0, 2).map(l => (
                  <div key={l._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 7px', backgroundColor: '#ffffff', borderRadius: '5px', border: '1px solid #fef3c7' }}>
                    <div>
                      <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>{l.employeeName}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{l.leaveType} ({l.durationText})</div>
                    </div>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button
                        onClick={() => updateLeaveStatus(l._id, 'approved')}
                        style={{ padding: '2px 7px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '10.5px', fontWeight: '700', cursor: 'pointer' }}
                        title="Accept & approve leave"
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Optional reason for denying leave:', 'Schedule requirement');
                          if (reason !== null) updateLeaveStatus(l._id, 'rejected', reason);
                        }}
                        style={{ padding: '2px 7px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '10.5px', fontWeight: '700', cursor: 'pointer' }}
                        title="Deny leave"
                      >
                        ✕ Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1. Real-time Decision Status Cards for currently logged-in user */}
          {myDecidedLeaves.length > 0 && (
            <div style={{
              padding: '8px 10px',
              backgroundColor: '#f0fdf4',
              borderRadius: '7px',
              border: '1px solid #bbf7d0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>📬 Leave Decision Update ({myDecidedLeaves.length})</span>
                <span onClick={() => navigate('/leaves')} style={{ cursor: 'pointer', textDecoration: 'underline', fontSize: '10.5px' }}>
                  All Leaves →
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {myDecidedLeaves.map(l => (
                  <div key={l._id} style={{
                    padding: '6px 8px',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    border: `1px solid ${l.status === 'approved' ? '#86efac' : '#fca5a5'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>
                        {l.leaveType} ({l.durationText || `${l.durationDays}d`})
                      </span>
                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: '700',
                        backgroundColor: l.status === 'approved' ? '#dcfce7' : '#fee2e2',
                        color: l.status === 'approved' ? '#15803d' : '#dc2626',
                        padding: '1px 5px',
                        borderRadius: '4px'
                      }}>
                        {l.status === 'approved' ? '✓ Approved' : '✕ Declined'}
                      </span>
                    </div>

                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                      📅 {l.startDate} to {l.endDate}
                    </div>

                    <div style={{ fontSize: '10px', color: l.status === 'approved' ? '#16a34a' : '#dc2626', marginTop: '2px', fontWeight: '600' }}>
                      {l.status === 'approved'
                        ? `Approved by ${l.approvedBy || l.actionBy || 'Admin'}${l.actionDateFormatted ? ` on ${l.actionDateFormatted}` : ''}`
                        : `Declined by ${l.rejectedBy || l.actionBy || 'Admin'}${l.actionDateFormatted ? ` on ${l.actionDateFormatted}` : ''}${l.rejectionReason ? ` • "${l.rejectionReason}"` : ''}`}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5px' }}>
                      <button
                        onClick={() => acknowledgeLeave(l._id)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: l.status === 'approved' ? '#16a34a' : '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '10px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Acknowledge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Pending leaves submitted by current user (awaiting review) */}
          {myPendingLeaves.length > 0 && (
            <div style={{
              padding: '8px 10px',
              backgroundColor: '#eff6ff',
              borderRadius: '7px',
              border: '1px solid #bfdbfe',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>📋 My Leave Application ({myPendingLeaves.length} Pending)</span>
                <span onClick={() => navigate('/leaves')} style={{ cursor: 'pointer', textDecoration: 'underline', fontSize: '10.5px' }}>
                  History →
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {myPendingLeaves.slice(0, 2).map(l => (
                  <div key={l._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 7px', backgroundColor: '#ffffff', borderRadius: '5px', border: '1px solid #dbeafe' }}>
                    <div>
                      <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>
                        {l.leaveType} ({l.durationText})
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>
                        📅 {l.startDate} • Sent to {l.appliedToName || 'HR Admin'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '9.5px', fontWeight: '700', backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px' }}>
                        ⏳ Pending Approval
                      </span>
                      <button
                        onClick={() => {
                          if (confirm('Do you want to cancel this leave application?')) {
                            updateLeaveStatus(l._id, 'rejected', 'Cancelled by applicant');
                          }
                        }}
                        style={{ padding: '2px 5px', borderRadius: '3px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}
                        title="Cancel this leave request"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. If neither pending nor unacknowledged decisions exist, show latest leave status history */}
          {myDecidedLeaves.length === 0 && myPendingLeaves.length === 0 && myRecentLeaves.length > 0 && (
            <div style={{
              padding: '6px 9px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: '10.5px', color: '#475569' }}>
                <span style={{ fontWeight: '700' }}>Recent Leave:</span> {myRecentLeaves[0].leaveType} ({myRecentLeaves[0].startDate}) •{' '}
                <strong style={{ color: myRecentLeaves[0].status === 'approved' ? '#16a34a' : (myRecentLeaves[0].status === 'rejected' ? '#dc2626' : '#d97706') }}>
                  {myRecentLeaves[0].status === 'approved' ? '✓ Approved' : (myRecentLeaves[0].status === 'rejected' ? '✕ Denied' : 'Pending')}
                </strong>
                {myRecentLeaves[0].approvedBy && <span style={{ color: '#64748b' }}> by {myRecentLeaves[0].approvedBy}</span>}
              </div>
              <span onClick={() => navigate('/leaves')} style={{ cursor: 'pointer', color: '#0284c7', fontSize: '10.5px', fontWeight: '600' }}>
                View →
              </span>
            </div>
          )}

          {employeesOnLeave.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {employeesOnLeave.map(l => (
                <div key={l._id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  <img src={l.employeeAvatar} alt={l.employeeName} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600' }}>{l.employeeName}</div>
                    <div style={{ fontSize: '10px', color: '#0284c7' }}>{l.leaveType} ({l.durationText})</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0', color: '#94a3b8' }}>
              <Plane size={22} style={{ margin: '0 auto 3px' }} />
              <div style={{ fontSize: '11.5px' }}>No leaves today</div>
            </div>
          )}
        </div>

        {/* Today's Joinings & Work Anniversary */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              🌟 Milestones
            </h3>
            <button
              onClick={() => navigate('/calendar')}
              style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
            >
              Calendar →
            </button>
          </div>

          {(computedAnniversaries || []).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(computedAnniversaries || []).slice(0, 3).map(anniv => (
                <div
                  key={anniv?._id || Math.random()}
                  onClick={() => addToast(`🌟 Work Anniversary wishes sent to ${anniv?.name || 'Colleague'}! 🎉`, 'success')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    backgroundColor: '#faf5ff',
                    borderRadius: '8px',
                    border: '1px solid #f3e8ff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3e8ff'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#faf5ff'}
                  title="Click to send anniversary wishes"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                      src={anniv?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={anniv?.name}
                      style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #7c3aed' }}
                    />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                        {anniv?.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '600' }}>
                        🌟 {anniv?.serviceYearsText} Anniversary
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                      💼 {anniv?.anniversaryDate}
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                      {anniv?.daysRemainingText}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0', color: '#94a3b8' }}>
              <Cake size={22} style={{ margin: '0 auto 3px' }} />
              <div style={{ fontSize: '11.5px' }}>No upcoming milestones</div>
            </div>
          )}
        </div>

        {/* On Work From Home Today */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '10px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            🏠 Work From Home Today
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            maxHeight: '140px',
            overflowY: 'auto'
          }}>
            {(wfhEmployees || []).map(emp => (
              <div
                key={emp?.id || Math.random()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 7px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '5px'
                }}
              >
                <img
                  src={emp?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={emp?.name}
                  style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp?.name} {emp?.isCurrentUser && <span style={{ fontSize: '9px', color: '#2563eb' }}>(You)</span>}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp?.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          BOTTOM SECTION: Company Notices / Announcements (Compact & Sleek)
      ───────────────────────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              📢 Company Notices & Announcements
            </h3>
            <p style={{ fontSize: '11.5px', color: '#64748b', margin: '1px 0 0 0' }}>
              Official HR notices, policy updates, and team announcements
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isUserAdminOrHR && (
              <button
                onClick={() => setIsAddNoticeOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '5px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <Plus size={12} /> Add Notice
              </button>
            )}
            <button
              onClick={() => navigate('/notice-board')}
              style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
            >
              All Notices →
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', alignItems: 'start' }}>
          {(notices || []).map(not => (
            <div
              key={not?._id || Math.random()}
              onClick={() => setSelectedNotice(not)}
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.04)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: not?.isImportant ? '#dc2626' : '#2563eb',
                    backgroundColor: not?.isImportant ? '#fee2e2' : '#eff6ff',
                    padding: '1px 5px',
                    borderRadius: '3px'
                  }}>
                    {not?.category}
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>{not?.date}</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', lineHeight: '1.3' }}>
                  {not?.title}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px', lineHeight: '1.4' }}>
                  {not?.shortDescription}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>By: <strong>{not?.postedBy}</strong></span>
                <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: '600' }}>View Details →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODALS
      ───────────────────────────────────────────────────────────────────────── */}
      <BreakModal
        isOpen={isBreakModalOpen}
        onClose={() => setIsBreakModalOpen(false)}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      <RaiseTicketModal
        isOpen={isRaiseTicketOpen}
        onClose={() => setIsRaiseTicketOpen(false)}
      />

      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />

      <EmployeeDirectoryModal
        isOpen={isEmpDirectoryOpen}
        onClose={() => setIsEmpDirectoryOpen(false)}
      />

      <NoticeDetailModal
        notice={selectedNotice}
        onClose={() => setSelectedNotice(null)}
      />

      <DayTimeLogModal
        dayLog={selectedDayLog}
        onClose={() => setSelectedDayLog(null)}
      />

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />

      <ProjectDetailModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
      />

      <SnoozeTaskModal
        isOpen={isSnoozeModalOpen}
        onClose={() => setIsSnoozeModalOpen(false)}
        task={snoozeTaskTarget}
      />

      <NewLeaveModal
        isOpen={isApplyLeaveOpen}
        onClose={() => setIsApplyLeaveOpen(false)}
      />

      <AddNoticeModal
        isOpen={isAddNoticeOpen}
        onClose={() => setIsAddNoticeOpen(false)}
      />
    </div>
  );
};
