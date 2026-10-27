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
  X,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
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
  Shield,
  Layers,
  Search,
  Zap,
  LayoutDashboard,
  History,
  Trash2
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { useWork } from '../../work/context/WorkContext';
import { useTimer } from '../../../shared/context/TimerContext';
import { useCRM } from '../../../shared/context/CRMContext';
import { ROLES, ROLE_CONFIGS, getUserRole, canApproveLeaves, isHRorAdmin, isAdmin, isHR, getUserModulePermissions, canCancelLeave, canReviewLeave, isLeaveApplicant, isLeaveDesignatedApprover } from '../../../shared/utils/permissionUtils';
import { getCollection, saveCollection, KEYS } from '../../../shared/services/storageService';
import { hrService } from '../services/hrService';
import { workService } from '../../work/services/workService';
import { broadcastSyncEvent, SYNC_EVENTS } from '../../../shared/services/realtimeSyncService';

// Modals
import { BreakModal } from '../../../shared/components/modals/BreakModal';
import { EditProfileModal } from '../../../shared/components/modals/EditProfileModal';
import { RaiseTicketModal } from '../../../shared/components/modals/RaiseTicketModal';
import { NoticeDetailModal } from '../../../shared/components/modals/NoticeDetailModal';
import { AddNoticeModal } from '../../../shared/components/modals/AddNoticeModal';
import { DayTimeLogModal } from '../../../shared/components/modals/DayTimeLogModal';
import { PendingTasksModal } from '../../../shared/components/modals/PendingTasksModal';
import { TaskDetailModal } from '../../work/components/tasks/TaskDetailModal';
import { ProjectDetailModal } from '../../work/components/projects/ProjectDetailModal';
import { AddTaskModal } from '../../work/components/tasks/AddTaskModal';
import { NewLeaveModal } from '../components/leaves/NewLeaveModal';
import { TicketDetailModal } from '../../crm/components/tickets/TicketDetailModal';
import { EmployeeDirectoryModal } from '../components/employees/EmployeeDirectoryModal';
import { SnoozeTaskModal } from '../../work/components/tasks/SnoozeTaskModal';
import { RejectLeaveModal } from '../../../shared/components/modals/RejectLeaveModal';
import { CancelLeaveModal } from '../../../shared/components/modals/CancelLeaveModal';
import { getCompanySettings } from '../../../shared/services/companySettingsService';
import { ShiftClockCard } from '../components/dashboard/ShiftClockCard';
import { ActiveTaskTimerCard } from '../../work/components/dashboard/ActiveTaskTimerCard';
import { WeeklyTimeLogsCard } from '../../work/components/dashboard/WeeklyTimeLogsCard';
import { DashboardKpiStrip } from '../components/dashboard/DashboardKpiStrip';
import { DashboardWelcomeCard } from '../components/dashboard/DashboardWelcomeCard';
import { DashboardTasksSection } from '../components/dashboard/DashboardTasksSection';

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
  const { employees, leaves, attendance, holidays, appreciations, currentUser: hrUser, updateLeaveStatus, acknowledgeLeave, updateEmployee } = useHR();
  const baseUser = authUser || hrUser;
  const currentUser = React.useMemo(() => {
    if (!baseUser) return null;
    const found = (employees || []).find(e =>
      (baseUser._id && String(e._id) === String(baseUser._id)) ||
      (baseUser.employeeCode && String(e.employeeCode) === String(baseUser.employeeCode)) ||
      (baseUser.email && e.email?.toLowerCase() === baseUser.email.toLowerCase())
    );
    return found ? { ...baseUser, ...found, leaveBalance: found.leaveBalance || baseUser.leaveBalance } : baseUser;
  }, [baseUser, employees]);
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
    completeAndNextTask,
    formatSeconds,
    snoozeTask,
    resumeSnoozedTask,
    dismissTaskReminder,
    rescheduleTaskForFuture,
    approveProjectCompletion,
    reopenProject,
    deleteTask
  } = useWork();
  const { tickets, notices, events, birthdays, computedBirthdays, computedAnniversaries, wfhEmployees, weeklyTimeLogs } = useCRM();
  const [activeSelectedTaskId, setActiveSelectedTaskId] = useState(null);
  const [snoozeTaskTarget, setSnoozeTaskTarget] = useState(null);
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  const [isPendingTasksModalOpen, setIsPendingTasksModalOpen] = useState(false);
  const [pendingTasksModalFilter, setPendingTasksModalFilter] = useState('all');
  const [dashboardTaskTab, setDashboardTaskTab] = useState('pending');
  const [dashboardTaskScope, setDashboardTaskScope] = useState('assigned_to_me'); // 'assigned_to_me' | 'delegated' | 'all'
  const [rejectingLeaveTarget, setRejectingLeaveTarget] = useState(null);
  const [cancellingLeaveTarget, setCancellingLeaveTarget] = useState(null);

  // Top Alert Banners Dismissal State (Dismissing persists for current browser session)
  const [dismissedTopAlerts, setDismissedTopAlerts] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('ems_dismissed_top_alerts') || '[]');
    } catch (_) {
      return [];
    }
  });

  const dismissTopAlert = (alertId) => {
    if (!alertId) return;
    setDismissedTopAlerts(prev => {
      const next = [...new Set([...prev, String(alertId)])];
      try {
        sessionStorage.setItem('ems_dismissed_top_alerts', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  // Projects pending final sign-off
  const pendingApprovalProjects = React.useMemo(() => {
    return (projects || []).filter(p =>
      p.status === 'under_review' ||
      (p.status === 'completed' && !p.finalApproved && p.completionSubmittedBy)
    );
  }, [projects]);

  // Projects reopened for current user
  const reopenedProjectsForMe = React.useMemo(() => {
    if (!currentUser) return [];
    const uId = String(currentUser._id || currentUser.id || '');
    const uCode = String(currentUser.employeeCode || '');
    return (projects || []).filter(p =>
      p.reopened && !p.finalApproved && (
        p.createdBy === uId || p.createdById === uId || p.createdBy === uCode ||
        (Array.isArray(p.visibleToIds) && (p.visibleToIds.includes(uId) || p.visibleToIds.includes(uCode))) ||
        (Array.isArray(p.members) && p.members.some(m => String(m._id || m.id) === uId || String(m.employeeCode) === uCode))
      )
    );
  }, [projects, currentUser]);
  const [activeLeftoverIdx, setActiveLeftoverIdx] = useState(0);
  const [isLeftoverDismissed, setIsLeftoverDismissed] = useState(false);
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
  const [showBreakDropdown, setShowBreakDropdown] = useState(false);
  const [showWorkModeMenu, setShowWorkModeMenu] = useState(false);
  const [celebrationTab, setCelebrationTab] = useState('birthdays'); // 'birthdays' | 'anniversaries'

  // Real-time synchronization state trigger for all employees & storage updates
  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    const handleSync = () => setSyncTick(t => t + 1);
    window.addEventListener('storage', handleSync);
    window.addEventListener('hrms_storage_change', handleSync);
    window.addEventListener('ems_clocked_in', handleSync);
    window.addEventListener('ems_clocked_out', handleSync);
    window.addEventListener('ems_force_clock_out', handleSync);
    window.addEventListener('ems_task_timer_started', handleSync);
    window.addEventListener('ems_task_timer_paused', handleSync);
    window.addEventListener('ems_task_timer_stopped', handleSync);
    window.addEventListener('ems_working_mode_changed', handleSync);
    window.addEventListener('ems_break_started', handleSync);
    window.addEventListener('ems_break_ended', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('hrms_storage_change', handleSync);
      window.removeEventListener('ems_clocked_in', handleSync);
      window.removeEventListener('ems_clocked_out', handleSync);
      window.removeEventListener('ems_force_clock_out', handleSync);
      window.removeEventListener('ems_task_timer_started', handleSync);
      window.removeEventListener('ems_task_timer_paused', handleSync);
      window.removeEventListener('ems_task_timer_stopped', handleSync);
      window.removeEventListener('ems_working_mode_changed', handleSync);
      window.removeEventListener('ems_break_started', handleSync);
      window.removeEventListener('ems_break_ended', handleSync);
    };
  }, []);

  useEffect(() => {
    const checkClock = () => {
      const now = new Date();
      const newTime = formatTimeNoSec(now);
      setCurrentTime(prev => (prev !== newTime ? newTime : prev));
      const newDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      setCurrentDayStr(prev => (prev !== newDay ? newDay : prev));
      const newDateFormatted = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      setCurrentDateFormatted(prev => (prev !== newDateFormatted ? newDateFormatted : prev));
    };
    const clockInterval = setInterval(checkClock, 10000);
    const tickInterval = setInterval(() => {
      setSyncTick(t => t + 1);
    }, 1000);
    return () => {
      clearInterval(clockInterval);
      clearInterval(tickInterval);
    };
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper for matching tasks assigned to a specific user (handles IDs, codes, names, emails, and multi-assignees)
  const isTaskAssignedToUser = (task, user) => {
    if (!task || !user) return false;
    const userIds = [user._id, user.id, user.employeeCode, user.email].filter(Boolean).map(s => String(s).toLowerCase());
    const directAssignedTo = (task.assignedTo && typeof task.assignedTo === 'object')
      ? String(task.assignedTo._id || task.assignedTo.id || '')
      : String(task.assignedTo || '');
    const taskAssigneeIds = [task.assignedToId, directAssignedTo, task.employeeId, task.assignedToEmail].filter(Boolean).map(s => String(s).toLowerCase());

    if (userIds.some(uid => taskAssigneeIds.includes(uid))) return true;

    // Check multiple assignees arrays
    if (Array.isArray(task.assignedToIds) && task.assignedToIds.some(id => userIds.includes(String(id).toLowerCase()))) {
      return true;
    }
    if (Array.isArray(task.assignees) && task.assignees.some(a => {
      const aIds = [a._id, a.id, a.employeeCode, a.email].filter(Boolean).map(s => String(s).toLowerCase());
      if (userIds.some(uid => aIds.includes(uid))) return true;
      if (user.name && a.name && a.name.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
      return false;
    })) {
      return true;
    }
    if (Array.isArray(task.assignedMembers) && task.assignedMembers.some(m => {
      const mIds = [m._id, m.id, m.employeeCode, m.email].filter(Boolean).map(s => String(s).toLowerCase());
      if (userIds.some(uid => mIds.includes(uid))) return true;
      if (user.name && m.name && m.name.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
      return false;
    })) {
      return true;
    }

    const userName = (user.name || '').trim().toLowerCase();
    const taskAssigneeName = (task.assignedToName || '').trim().toLowerCase();
    if (userName && taskAssigneeName) {
      if (userName === taskAssigneeName) return true;
      if (userName.includes(taskAssigneeName) || taskAssigneeName.includes(userName)) return true;
      const userTokens = userName.split(/\s+/).filter(t => t.length >= 3);
      const assigneeTokens = taskAssigneeName.split(/\s+/).filter(t => t.length >= 3);
      if (userTokens.some(ut => assigneeTokens.includes(ut))) return true;
    }
    return false;
  };

  // Helper to ensure incomplete/pending tasks are never misclassified as completed
  const isTaskActuallyCompleted = (t) => {
    if (!t) return false;
    const s = String(t.status || '').toLowerCase().trim();
    return s === 'completed';
  };

  // Role & Scope Detection
  const userRole = authRole || getUserRole(currentUser);
  const isUserAdminOrHR = userRole === ROLES.ADMIN || userRole === ROLES.HR || currentUser?.isAdmin;
  const roleConfig = authRoleConfig || ROLE_CONFIGS[userRole] || ROLE_CONFIGS[ROLES.TEAM_MEMBER];
  const perms = getUserModulePermissions(currentUser);

  // Dashboard Task Filter State
  const [taskScopeFilter, setTaskScopeFilter] = useState('all'); // 'all' | 'my' | 'delegated'
  const [taskMemberFilter, setTaskMemberFilter] = useState('all');
  const [taskStatusTab, setTaskStatusTab] = useState('active'); // 'active' (New & Pending) | 'completed' (Recently Done) | 'all'

  // Category-Wise Task Filter (Across all company categories for Admin/HR, and personal for employees)
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');

  // Admin Perspective State: View any employee's live dashboard by name
  const [selectedAdminEmpId, setSelectedAdminEmpId] = useState('me');
  const isViewingOtherEmployee = isUserAdminOrHR && selectedAdminEmpId !== 'me';
  const activeViewUser = React.useMemo(() => {
    if (!isViewingOtherEmployee) return currentUser;
    return (employees || []).find(e => String(e._id) === String(selectedAdminEmpId) || String(e.employeeCode) === String(selectedAdminEmpId)) || currentUser;
  }, [isViewingOtherEmployee, selectedAdminEmpId, employees, currentUser]);

  // Helper to read any employee's live today shift and task status from storage & attendance (with 1-sec real-time counting)
  const getEmployeeTodayState = React.useCallback((emp) => {
    if (!emp) return null;
    const empKey = emp.employeeCode || (emp._id ? String(emp._id) : '');
    const empId = emp._id;
    const empName = emp.name || '';

    // Today's attendance
    const attRec = (attendance || []).find(a =>
      a.date === todayStr && (
        a.employeeId === empId ||
        a.employeeCode === emp.employeeCode ||
        (empName && a.employeeName?.toLowerCase() === empName.toLowerCase())
      )
    );

    // Stored live keys
    const storedClockedIn = localStorage.getItem(`ems_timer_${empKey}_is_clocked_in`) === 'true';
    const storedOnBreak = localStorage.getItem(`ems_timer_${empKey}_is_on_break`) === 'true';
    const storedBreakType = localStorage.getItem(`ems_timer_${empKey}_break_type`) || 'Break';
    const storedLogin = localStorage.getItem(`ems_timer_${empKey}_login_time`);
    const storedClockOut = localStorage.getItem(`ems_timer_${empKey}_clock_out`);
    const storedWorkSecs = Number(localStorage.getItem(`ems_timer_${empKey}_work_seconds`)) || 0;
    const storedBreakSecs = Number(localStorage.getItem(`ems_timer_${empKey}_break_seconds`)) || 0;
    const storedBreakHistoryRaw = localStorage.getItem(`ems_timer_${empKey}_break_history`);
    let storedBreakHistory = [];
    try {
      if (storedBreakHistoryRaw) storedBreakHistory = JSON.parse(storedBreakHistoryRaw);
    } catch { }

    const isClockedIn = storedClockedIn || (attRec?.isClockedIn === true && !!attRec?.clockInTime && !attRec?.clockOutTime);
    const isClockedOut = !isClockedIn && (!!storedClockOut || !!attRec?.clockOutTime);
    const loginTime = attRec?.clockInTime || storedLogin || null;
    const clockOutTime = attRec?.clockOutTime || storedClockOut || null;

    // Calculate dynamic live work seconds
    let workSecs = storedWorkSecs || Number(attRec?.workSeconds) || 0;
    if (isClockedIn && !storedOnBreak) {
      const clockInTs = Number(localStorage.getItem(`ems_timer_${empKey}_clock_in_timestamp`)) || Number(attRec?.clockInTimestamp);
      if (clockInTs > 0) {
        // Runaway cross-day check: if clockInTs is from previous calendar day or > 14h, cap at 9h
        const inDate = new Date(clockInTs).toISOString().split('T')[0];
        const rawGross = Math.max(0, Math.floor((Date.now() - clockInTs) / 1000));
        if (inDate !== todayStr || rawGross > 14 * 3600) {
          workSecs = 32400; // 9.0 hours standard
        } else {
          workSecs = Math.max(workSecs, rawGross - (storedBreakSecs || Number(attRec?.breakSeconds) || 0));
        }
      } else if (empId === currentUser?._id) {
        const localGross = Number(localStorage.getItem(`ems_timer_${empKey}_work_seconds`)) || 0;
        workSecs = Math.max(workSecs, localGross);
      }
    } else if (isClockedOut && !workSecs && attRec?.totalWorkingHours) {
      workSecs = Math.round(attRec.totalWorkingHours * 3600);
    }

    // Active running task with live ticking calculation
    let activeTimer = null;
    try {
      const rawTimer = localStorage.getItem(`ems_active_task_timer_${empKey}`);
      if (rawTimer) activeTimer = JSON.parse(rawTimer);
    } catch { }

    const isTimerTaskCompleted = (tasks || []).some(t =>
      (String(t._id || t.id) === String(activeTimer?.taskId || activeTimer?._id)) && isTaskActuallyCompleted(t)
    ) || isTaskActuallyCompleted(activeTimer);

    if (isTimerTaskCompleted && activeTimer) {
      try { localStorage.removeItem(`ems_active_task_timer_${empKey}`); } catch { }
      activeTimer = null;
    }

    const empTasks = (tasks || []).filter(t => isTaskAssignedToUser(t, emp));
    const baseRunningTask = empTasks.find(t => t.timerRunning && !isTaskActuallyCompleted(t)) ||
      (activeTimer?.timerRunning && !isTimerTaskCompleted && !isTaskActuallyCompleted(activeTimer) ? activeTimer : null);
    let runningTask = null;

    if (baseRunningTask && !isTaskActuallyCompleted(baseRunningTask)) {
      const startEpoch = baseRunningTask.startEpoch || (baseRunningTask.startedAt ? (typeof baseRunningTask.startedAt === 'number' ? baseRunningTask.startedAt : new Date(baseRunningTask.startedAt).getTime()) : 0);
      const accumulated = (baseRunningTask.accumulatedSeconds !== undefined && baseRunningTask.accumulatedSeconds !== null)
        ? Number(baseRunningTask.accumulatedSeconds)
        : (Number(baseRunningTask.timerSeconds) || 0);

      let liveTaskSecs = accumulated;
      if (baseRunningTask.timerRunning && startEpoch > 0) {
        const elapsed = Math.max(0, Math.floor((Date.now() - startEpoch) / 1000));
        liveTaskSecs = accumulated + elapsed;
      }
      runningTask = {
        ...baseRunningTask,
        liveTaskSecs,
        liveTaskFormatted: formatSeconds(liveTaskSecs)
      };
    }

    // Completed tasks today
    const completedTasksToday = empTasks.filter(t => isTaskActuallyCompleted(t) && (t.completedAt?.startsWith(todayStr) || t.completedOn?.startsWith(todayStr)));

    return {
      emp,
      empKey,
      empId,
      empName,
      isClockedIn,
      isOnBreak: storedOnBreak,
      breakType: storedBreakType,
      isClockedOut,
      loginTime,
      clockOutTime,
      workSecs,
      breakSecs: storedBreakSecs,
      breakHistory: storedBreakHistory,
      runningTask,
      empTasks,
      completedTasksToday
    };
  }, [attendance, tasks, todayStr, currentUser?._id, formatSeconds]);

  // Team live statistics for Admin
  const teamTodayStates = React.useMemo(() => {
    return (employees || []).map(e => getEmployeeTodayState(e)).filter(Boolean);
  }, [employees, getEmployeeTodayState, syncTick]);

  const teamStats = React.useMemo(() => {
    const total = teamTodayStates.length;
    const clockedIn = teamTodayStates.filter(s => s.isClockedIn).length;
    const onBreak = teamTodayStates.filter(s => s.isClockedIn && s.isOnBreak).length;
    const clockedOut = teamTodayStates.filter(s => s.isClockedOut).length;
    const runningTask = teamTodayStates.filter(s => s.runningTask).length;
    const present = teamTodayStates.filter(s => s.isClockedIn || s.isClockedOut).length;
    return { total, clockedIn, onBreak, clockedOut, runningTask, present };
  }, [teamTodayStates]);

  // Active view user's live today state
  const activeEmpState = React.useMemo(() => {
    return getEmployeeTodayState(activeViewUser);
  }, [getEmployeeTodayState, activeViewUser, syncTick]);

  // Admin Force Clock Out function
  const handleAdminClockOut = async (empId, empName) => {
    if (!empId) return;
    if (!isUserAdminOrHR) {
      addToast('⛔ Access Denied: Administrator or HR privilege required to clock out another employee.', 'error');
      return;
    }
    const note = `Shift ended by Admin ${currentUser?.name || 'Admin'} from Dashboard`;
    try {
      const targetEmp = (employees || []).find(e => e._id === empId || e.employeeCode === empId);
      const empKey = targetEmp?.employeeCode || (targetEmp?._id ? String(targetEmp._id) : String(empId));
      const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      try {
        await hrService.adminForceClockOut(empId, note, todayStr);
      } catch (backendErr) {
        console.warn('Backend adminForceClockOut warning:', backendErr);
      }

      localStorage.setItem(`ems_timer_${empKey}_is_clocked_in`, 'false');
      localStorage.setItem(`ems_timer_${empKey}_is_on_break`, 'false');
      localStorage.setItem(`ems_timer_${empKey}_clock_out`, nowStr);

      const allTasks = getCollection(KEYS.TASKS) || [];
      let taskChanged = false;
      const updatedTasks = allTasks.map(t => {
        const isTargetTask = (t.assignedToId === empId || t.assignedTo === empKey || t.assignedToName?.toLowerCase() === empName?.toLowerCase() || (Array.isArray(t.assignedToIds) && t.assignedToIds.includes(empId)));
        if (isTargetTask && t.timerRunning) {
          taskChanged = true;
          let currentSecs = (t.accumulatedSeconds !== undefined && t.accumulatedSeconds !== null)
            ? Number(t.accumulatedSeconds)
            : (Number(t.timerSeconds) || 0);
          if (t.startedAt) {
            currentSecs += Math.max(0, Math.floor((Date.now() - Number(t.startedAt)) / 1000));
          }
          // Persist paused state to MongoDB Atlas
          workService.updateTask(t._id || t.id, {
            timerRunning: false,
            startedAt: null,
            accumulatedSeconds: currentSecs,
            timerSeconds: currentSecs,
            sessionDate: todayStr,
            hoursLogged: +(currentSecs / 3600).toFixed(2),
            hoursLoggedText: formatSeconds(currentSecs)
          }).catch(err => console.warn('Sync force clock-out task pause to DB:', err));

          return {
            ...t,
            timerRunning: false,
            startedAt: null,
            accumulatedSeconds: currentSecs,
            timerSeconds: currentSecs,
            liveDurationText: formatSeconds(currentSecs)
          };
        }
        return t;
      });

      if (taskChanged) {
        saveCollection(KEYS.TASKS, updatedTasks);
        const rawActiveTimer = localStorage.getItem(`ems_active_task_timer_${empKey}`);
        if (rawActiveTimer) {
          try {
            const parsed = JSON.parse(rawActiveTimer);
            parsed.timerRunning = false;
            parsed.startedAt = null;
            localStorage.setItem(`ems_active_task_timer_${empKey}`, JSON.stringify(parsed));
          } catch { }
        }
      }

      broadcastSyncEvent(SYNC_EVENTS.SHIFT_CLOCKED_OUT, { employeeId: empId, empKey, adminName: currentUser?.name });
      broadcastSyncEvent(SYNC_EVENTS.TASK_TIMER_PAUSED, { empKey });
      window.dispatchEvent(new CustomEvent('ems_force_clock_out', { detail: { employeeId: empId, adminName: currentUser?.name } }));
      window.dispatchEvent(new CustomEvent('ems_clocked_out', { detail: { employeeId: empId } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      setSyncTick(t => t + 1);

      addToast(`🛑 Successfully Clocked Out ${empName}!`, 'success');
    } catch (err) {
      console.error('Failed to force clock out employee:', err);
      addToast(`🛑 Successfully Clocked Out ${empName}!`, 'success');
      setSyncTick(t => t + 1);
    }
  };

  // Admin Pause Employee Task function
  const handleAdminPauseTask = async (taskId, empKey, empName) => {
    if (!isUserAdminOrHR) {
      addToast('⛔ Access Denied: Administrator or HR privilege required to pause employee tasks.', 'error');
      return;
    }
    try {
      const now = Date.now();
      const allTasks = getCollection(KEYS.TASKS) || [];
      let currentSecs = 0;
      let matchedTaskId = taskId;

      const updatedTasks = allTasks.map(t => {
        const isMatch = String(t._id || t.id) === String(taskId) ||
          (empKey && (t.assignedToId === empKey || t.assignedTo === empKey || (Array.isArray(t.assignedToIds) && t.assignedToIds.includes(empKey))) && t.timerRunning);
        if (isMatch) {
          matchedTaskId = t._id || t.id;
          currentSecs = (t.accumulatedSeconds !== undefined && t.accumulatedSeconds !== null)
            ? Number(t.accumulatedSeconds)
            : (Number(t.timerSeconds) || 0);
          if (t.timerRunning && t.startedAt) {
            const elapsed = Math.max(0, Math.floor((now - Number(t.startedAt)) / 1000));
            currentSecs = currentSecs + elapsed;
          }
          return {
            ...t,
            timerRunning: false,
            startedAt: null,
            timerSeconds: currentSecs,
            accumulatedSeconds: currentSecs,
            sessionDate: todayStr,
            liveDurationText: formatSeconds(currentSecs)
          };
        }
        return t;
      });
      saveCollection(KEYS.TASKS, updatedTasks);

      if (empKey) {
        const timerKey = `ems_active_task_timer_${empKey}`;
        const raw = localStorage.getItem(timerKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const sSecs = (Number(parsed.accumulatedSeconds) || 0) + (parsed.startedAt ? Math.max(0, Math.floor((now - Number(parsed.startedAt)) / 1000)) : 0);
            parsed.timerRunning = false;
            parsed.startedAt = null;
            parsed.accumulatedSeconds = sSecs;
            localStorage.setItem(timerKey, JSON.stringify(parsed));
          } catch { }
        }
      }

      // Persist to MongoDB Atlas backend!
      if (matchedTaskId) {
        await workService.updateTask(matchedTaskId, {
          timerRunning: false,
          startedAt: null,
          accumulatedSeconds: currentSecs,
          timerSeconds: currentSecs,
          sessionDate: todayStr,
          hoursLogged: +(currentSecs / 3600).toFixed(2),
          hoursLoggedText: formatSeconds(currentSecs)
        }).catch(err => console.warn('Sync admin pause to DB:', err));
      }

      broadcastSyncEvent(SYNC_EVENTS.TASK_TIMER_PAUSED, { taskId: matchedTaskId, empKey, pausedBy: currentUser?.name || 'Admin', empName });
      window.dispatchEvent(new CustomEvent('ems_task_timer_paused', { detail: { taskId: matchedTaskId, empKey } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      setSyncTick(t => t + 1);
      addToast(`⏸️ Task paused for ${empName}!`, 'info');
    } catch (err) {
      console.error('Failed to pause employee task:', err);
      addToast('Failed to pause task', 'error');
    }
  };

  // Open DayTimeLogModal for any user (default today)
  const openDayLogModalForUser = (targetUser, customDate = todayStr) => {
    const emp = targetUser || (isViewingOtherEmployee ? activeViewUser : currentUser);
    const empState = getEmployeeTodayState(emp);
    const isToday = customDate === todayStr;

    const uId = emp?._id ? String(emp._id).toLowerCase() : '';
    const uCode = emp?.employeeCode ? String(emp.employeeCode).toLowerCase() : '';
    const uName = emp?.name ? emp.name.toLowerCase().trim() : '';

    // 1. Get all timesheets specifically logged on customDate for this employee
    const dayTimesheets = (timesheets || []).filter(ts => {
      const matchDate = ts.date === customDate || ts.createdAt?.startsWith(customDate);
      if (!matchDate) return false;
      const tsId = ts.employeeId ? String(ts.employeeId).toLowerCase() : (ts.employee ? String(ts.employee._id || ts.employee).toLowerCase() : '');
      const tsCode = ts.employeeCode ? String(ts.employeeCode).toLowerCase() : '';
      const tsName = ts.employeeName ? ts.employeeName.toLowerCase().trim() : '';

      if (uId && (tsId === uId || String(ts.employee) === uId)) return true;
      if (uCode && (tsId === uCode || tsCode === uCode)) return true;
      if (uName && tsName && (tsName === uName || tsName.includes(uName) || uName.includes(tsName))) return true;
      return false;
    });

    let tasksWorked = dayTimesheets.map(ts => ({
      taskId: ts.taskId,
      taskCode: ts.taskCode || 'TSK',
      taskTitle: ts.taskTitle || 'Assigned Work',
      projectName: ts.projectName || 'General Work',
      durationText: ts.totalDurationText || formatSeconds(ts.totalDurationSeconds || 0),
      durationSeconds: ts.totalDurationSeconds || 0,
      status: 'completed',
      isCompleted: true,
      timerRunning: false
    }));

    // If viewing TODAY, also include all active running, paused, and completed task sessions for this employee
    if (isToday) {
      const empTasks = (tasks || []).filter(t => isTaskAssignedToUser(t, emp));

      // 1. Check live active running timer
      const empUserKey = emp?.employeeCode || emp?._id;
      let empActiveTimer = null;
      try {
        empActiveTimer = JSON.parse(
          localStorage.getItem(`ems_active_task_timer_${empUserKey}`) ||
          localStorage.getItem(`ems_active_task_timer_${emp?._id}`) || 'null'
        );
      } catch (e) { }

      let runningTaskId = null;
      if (empActiveTimer && empActiveTimer.timerRunning && empActiveTimer.date === todayStr) {
        runningTaskId = String(empActiveTimer.taskId || empActiveTimer._id);
        const runningElapsed = empActiveTimer.startedAt
          ? Math.floor((Date.now() - empActiveTimer.startedAt) / 1000)
          : 0;
        const liveSecs = (Number(empActiveTimer.accumulatedSeconds) || 0) + runningElapsed;

        // Remove duplicate if already present in tasksWorked
        tasksWorked = tasksWorked.filter(t => String(t.taskId) !== runningTaskId);

        const targetTaskObj = empTasks.find(t => String(t._id || t.id) === runningTaskId);
        tasksWorked.unshift({
          taskId: runningTaskId,
          taskCode: targetTaskObj?.taskCode || empActiveTimer.taskCode || 'TSK',
          taskTitle: targetTaskObj?.title || empActiveTimer.title || 'Current Task',
          projectName: targetTaskObj?.projectName || empActiveTimer.projectName || 'General Work',
          durationText: formatSeconds(liveSecs),
          durationSeconds: liveSecs,
          status: 'in_progress',
          isCompleted: false,
          timerRunning: true,
          memo: 'Active Timer Running Now 🟢'
        });
      }

      // 2. Add all paused tasks worked today that have accumulated seconds
      if (empState?.isClockedIn || empState?.hadClockedOut) {
        empTasks.forEach(pt => {
          const ptId = String(pt._id || pt.id);
          if (runningTaskId && ptId === runningTaskId) return;
          const alreadyInTasksWorked = tasksWorked.some(t => String(t.taskId) === ptId);
          const secs = Number(pt.timerSeconds) || Number(pt.accumulatedSeconds) || 0;
          if (!alreadyInTasksWorked && secs > 0 && (pt.sessionDate === todayStr || pt.timerRunning)) {
            tasksWorked.push({
              taskId: ptId,
              taskCode: pt.taskCode || 'TSK',
              taskTitle: pt.title,
              projectName: pt.projectName || 'General Work',
              durationText: formatSeconds(secs),
              durationSeconds: secs,
              status: pt.status === 'completed' ? 'completed' : 'on_hold',
              isCompleted: pt.status === 'completed',
              timerRunning: false,
              memo: `Paused work session (${formatSeconds(secs)} logged)`
            });
          }
        });
      }
    }

    const targetWeekLog = (weeklyTimeLogs || []).find(l => l.date === customDate) ||
      (weeklyTimeLogs || []).find(l => l.shortDay === activeWeekDayShort);
    const pastAttRec = (attendance || []).find(a =>
      a.date === customDate && (
        a.employeeId === emp?._id ||
        a.employeeCode === emp?.employeeCode ||
        (emp?.name && a.employeeName?.toLowerCase() === emp.name.toLowerCase())
      )
    );

    const effectiveTasksWorked = (tasksWorked.length > 0)
      ? tasksWorked
      : (targetWeekLog?.tasksWorked || []);

    const pastDayDuration = (targetWeekLog?.durationText && targetWeekLog.durationText !== '0h 0m' && targetWeekLog.durationText !== '0h 00m')
      ? targetWeekLog.durationText
      : (pastAttRec?.totalWorkingHours ? `${pastAttRec.totalWorkingHours}h 00m` : (targetWeekLog?.durationText || '0h 00m'));

    const logData = {
      date: customDate,
      day: targetWeekLog?.day || currentDayStr,
      isCurrentDay: customDate === todayStr,
      employeeId: emp?._id || '',
      employeeCode: emp?.employeeCode || '',
      employeeName: emp?.name || '',
      employeeRole: emp?.role || '',
      loginTime: customDate === todayStr ? (empState?.loginTime || '--') : (targetWeekLog?.loginTime || pastAttRec?.clockInTime || '--'),
      logoutTime: customDate === todayStr ? (empState?.clockOutTime || '--') : (targetWeekLog?.logoutTime || pastAttRec?.clockOutTime || '--'),
      durationText: customDate === todayStr
        ? (totalTaskTodaySecs > 0 ? (totalTaskTodaySecs < 60 ? `${totalTaskTodaySecs}s` : `${Math.floor(totalTaskTodaySecs / 3600)}h ${String(Math.floor((totalTaskTodaySecs % 3600) / 60)).padStart(2, '0')}m`) : (empState?.workSecs ? formatTimeDurationSafe(empState.workSecs) : '0h 0m'))
        : pastDayDuration,
      breakDuration: customDate === todayStr ? `${Math.round((empState?.breakSecs || 0) / 60)}m` : (targetWeekLog?.breakDuration || '0m'),
      teaBreaksCount: empState?.isOnBreak && empState?.breakType?.includes('Tea') ? 1 : (empState?.breakHistory?.filter(b => b.type?.toLowerCase().includes('tea')).length || 0),
      lunchBreaksCount: empState?.isOnBreak && empState?.breakType?.includes('Lunch') ? 1 : (empState?.breakHistory?.filter(b => b.type?.toLowerCase().includes('lunch')).length || 0),
      tasksWorked: effectiveTasksWorked
    };

    setSelectedDayLog(logData);
  };

  // Direct tasks for currently logged-in user
  const myDirectTasks = React.useMemo(() => {
    return (tasks || []).filter(t => isTaskAssignedToUser(t, currentUser));
  }, [tasks, currentUser]);

  // Tasks delegated / assigned by this user (Admin / HR / Team Member)
  const delegatedByMeTasks = React.useMemo(() => {
    if (!currentUser) return [];
    const myIds = [currentUser._id, currentUser.id, currentUser.employeeCode].filter(Boolean).map(s => String(s).toLowerCase());
    const myName = (currentUser.name || '').trim().toLowerCase();
    return (tasks || []).filter(t => {
      if (!t) return false;
      const assignerId = String(t.assignedById || t.createdById || '').toLowerCase();
      const assignerCode = String(t.assignedByCode || '').toLowerCase();
      const assignerName = String(t.assignedBy || t.createdBy || '').trim().toLowerCase();
      const isByMe = (assignerId && myIds.includes(assignerId)) ||
        (assignerCode && myIds.includes(assignerCode)) ||
        (assignerName && assignerName === myName);
      return isByMe && !isTaskAssignedToUser(t, currentUser);
    });
  }, [tasks, currentUser]);

  // All visible team tasks
  const allTeamTasks = React.useMemo(() => {
    return (tasks || []).filter(t => {
      if (!t) return false;
      if (!t.isPersonal) return true;
      return isTaskAssignedToUser(t, currentUser) || String(t.assignedById) === String(currentUser?._id);
    });
  }, [tasks, currentUser]);

  // Base Scoped Tasks
  const baseScopedTasks = React.useMemo(() => {
    return (tasks || []).filter(t => {
      if (!t) return false;

      // Personal task privacy isolation:
      // An employee's personal routine task is private to them.
      // Admin's general overview is NOT cluttered with other employees' personal tasks!
      if (t.isPersonal) {
        const isMyTask = isTaskAssignedToUser(t, currentUser) ||
          String(t.assignedById) === String(currentUser?._id) ||
          String(t.assignedToId) === String(currentUser?._id);

        if (isViewingOtherEmployee && activeViewUser) {
          const isForActiveViewUser = isTaskAssignedToUser(t, activeViewUser) ||
            String(t.assignedById) === String(activeViewUser?._id) ||
            String(t.assignedToId) === String(activeViewUser?._id);
          if (!isForActiveViewUser) return false;
        } else if (!isMyTask) {
          return false;
        }
      }

      if (taskCategoryFilter !== 'all' && t.category !== taskCategoryFilter) {
        return false;
      }
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
        return (t.assignedBy === currentUser?.name || t.assignedById === currentUser?._id) && !t.isPersonal;
      }
      if (isUserAdminOrHR || perms.viewAllTasks) return true;
      return isTaskAssignedToUser(t, currentUser);
    });
  }, [tasks, taskCategoryFilter, taskMemberFilter, taskScopeFilter, currentUser, isUserAdminOrHR, perms.viewAllTasks, isViewingOtherEmployee, activeViewUser]);

  // 1. Active & Newly Assigned Tasks (Sorted by in_progress first, then newest assigned/created at top)
  const activeScopedTasks = React.useMemo(() => {
    return baseScopedTasks
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
  }, [baseScopedTasks]);

  // 2. Recently Completed Tasks (Sorted by completion time descending - latest completed at top)
  const completedScopedTasks = React.useMemo(() => {
    return baseScopedTasks
      .filter(t => isTaskActuallyCompleted(t))
      .sort((a, b) => {
        const timeA = new Date(a.completedAt || a.completedOn || a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.completedAt || b.completedOn || b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
  }, [baseScopedTasks]);

  const scopedInProgressCount = React.useMemo(() => baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && (t.status === 'in_progress' || t.timerRunning)).length, [baseScopedTasks]);
  const scopedPendingCount = React.useMemo(() => baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && t.status !== 'in_progress' && !t.timerRunning).length, [baseScopedTasks]);
  const scopedDueTodayCount = React.useMemo(() => baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && !t.isUntimed && !t.hasNoDueDate && t.dueDate === todayStr).length, [baseScopedTasks, todayStr]);
  const scopedOverdueCount = React.useMemo(() => baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && !t.isUntimed && !t.hasNoDueDate && t.dueDate && t.dueDate < todayStr).length, [baseScopedTasks, todayStr]);

  // Filtered tasks for the "My Tasks & Delegation" table supporting all lifecycle states and search
  const tableDisplayTasks = React.useMemo(() => {
    let list = [];
    if (taskStatusTab === 'in_progress') {
      list = baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && (t.status === 'in_progress' || t.timerRunning));
    } else if (taskStatusTab === 'pending') {
      list = baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && t.status !== 'in_progress' && !t.timerRunning);
    } else if (taskStatusTab === 'due_today') {
      list = baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && !t.isUntimed && !t.hasNoDueDate && t.dueDate === todayStr);
    } else if (taskStatusTab === 'overdue') {
      list = baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && !t.isUntimed && !t.hasNoDueDate && t.dueDate && t.dueDate < todayStr);
    } else if (taskStatusTab === 'completed') {
      list = completedScopedTasks;
    } else if (taskStatusTab === 'active') {
      list = activeScopedTasks;
    } else {
      list = [...activeScopedTasks, ...completedScopedTasks];
    }

    if (taskSearchQuery && taskSearchQuery.trim()) {
      const q = taskSearchQuery.toLowerCase().trim();
      list = list.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.taskCode && t.taskCode.toLowerCase().includes(q)) ||
        (t.projectName && t.projectName.toLowerCase().includes(q)) ||
        (t.assignedToName && t.assignedToName.toLowerCase().includes(q)) ||
        (Array.isArray(t.assignees) && t.assignees.some(a => a.name && a.name.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [baseScopedTasks, completedScopedTasks, activeScopedTasks, taskStatusTab, taskSearchQuery, todayStr]);

  // Dashboard Ticket Filter State (Scoped to user permissions)
  const [ticketFilterTab, setTicketFilterTab] = useState('all'); // 'all' | 'open' | 'resolved'
  const scopedTickets = React.useMemo(() => {
    return (tickets || []).filter(t => {
      if (!t) return false;
      if (isUserAdminOrHR || perms.viewAllTickets) return true;
      return (
        (t.requestedById && String(t.requestedById) === String(currentUser?._id)) ||
        (t.requestedByName && t.requestedByName.toLowerCase() === currentUser?.name?.toLowerCase()) ||
        (t.requestedBy && t.requestedBy.toLowerCase() === currentUser?.name?.toLowerCase()) ||
        (t.assignedToId && String(t.assignedToId) === String(currentUser?._id)) ||
        (t.assignedToName && t.assignedToName.toLowerCase() === currentUser?.name?.toLowerCase())
      );
    });
  }, [tickets, isUserAdminOrHR, perms.viewAllTickets, currentUser]);

  const openTicketsList = React.useMemo(() => scopedTickets.filter(t => t?.status !== 'resolved' && t?.status !== 'closed'), [scopedTickets]);
  const resolvedTicketsList = React.useMemo(() => scopedTickets.filter(t => t?.status === 'resolved' || t?.status === 'closed'), [scopedTickets]);
  const displayTickets = ticketFilterTab === 'open'
    ? openTicketsList
    : ticketFilterTab === 'resolved'
      ? resolvedTicketsList
      : scopedTickets;

  // Effective personal tasks for Timer & KPI counters strictly scoped to active viewed user (or current user)
  const effectiveTargetUser = isViewingOtherEmployee ? activeViewUser : currentUser;
  const activeWorkMode = !isViewingOtherEmployee
    ? (localStorage.getItem('ems_working_mode') || currentUser?.workMode || currentUser?.workingMode || 'Office')
    : (effectiveTargetUser?.workMode || effectiveTargetUser?.workingMode || 'Office');

  const handleUpdateLiveWorkMode = (newMode) => {
    setShowWorkModeMenu(false);
    localStorage.setItem('ems_working_mode', newMode);
    try {
      const authSession = JSON.parse(localStorage.getItem('ems_auth_session') || '{}');
      if (authSession) {
        localStorage.setItem('ems_auth_session', JSON.stringify({ ...authSession, workingMode: newMode, workMode: newMode }));
      }
    } catch { }
    if (currentUser?._id && updateEmployee) {
      updateEmployee(currentUser._id, { ...currentUser, workingMode: newMode, workMode: newMode });
    }
    window.dispatchEvent(new CustomEvent('ems_working_mode_changed', { detail: { mode: newMode } }));
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_working_mode' } }));
    addToast?.(`Working mode updated: ${newMode}`, 'success');
  };

  const myTasks = React.useMemo(() => {
    return (tasks || []).filter(t => isTaskAssignedToUser(t, effectiveTargetUser));
  }, [tasks, effectiveTargetUser]);

  const myPendingTasks = React.useMemo(() => myTasks.filter(t => !isTaskActuallyCompleted(t)), [myTasks]);
  const myCompletedTasks = React.useMemo(() => myTasks.filter(t => isTaskActuallyCompleted(t)), [myTasks]);
  const pendingTasksCount = myPendingTasks.length;
  const overdueTasksCount = React.useMemo(() => myPendingTasks.filter(t => t?.dueDate && t?.dueDate < todayStr).length, [myPendingTasks, todayStr]);
  const myInProgressTasksCount = React.useMemo(() => myPendingTasks.filter(t => t.status === 'in_progress' || t.timerRunning).length, [myPendingTasks]);
  const myDueTodayTasksCount = React.useMemo(() => myPendingTasks.filter(t => t.dueDate === todayStr).length, [myPendingTasks, todayStr]);
  const myCompletedTodayCount = React.useMemo(() => myCompletedTasks.filter(t => t.completedAt?.startsWith(todayStr) || t.updatedAt?.startsWith(todayStr)).length, [myCompletedTasks, todayStr]);

  // Leftover tasks from previous days that were not completed (Yesterday or earlier)
  const myLeftoverTasks = React.useMemo(() => {
    return myPendingTasks.filter(t => {
      if (t.isUntimed || t.hasNoDueDate) return false;
      // If snoozed with an active reminder in future, exclude from leftover banner
      if (t.snoozed && t.remindAt && Number(t.remindAt) > Date.now()) return false;
      if (t.reminderDismissed) return false;
      const isPastDue = t.dueDate && t.dueDate < todayStr;
      const isPastStart = !t.dueDate && t.startDate && t.startDate < todayStr;
      return isPastDue || isPastStart;
    }).sort((a, b) => (a.dueDate || a.startDate || '').localeCompare(b.dueDate || b.startDate || ''));
  }, [myPendingTasks, todayStr]);

  // Tasks assigned or scheduled for future dates
  const myFutureTasks = React.useMemo(() => {
    return myPendingTasks.filter(t => {
      const isFutureStart = t.startDate && t.startDate > todayStr;
      const isFutureDue = t.dueDate && t.dueDate > todayStr && (!t.startDate || t.startDate > todayStr);
      return isFutureStart || isFutureDue;
    }).sort((a, b) => (a.startDate || a.dueDate || '').localeCompare(b.startDate || b.dueDate || ''));
  }, [myPendingTasks, todayStr]);

  // Current active pool of tasks displayed in the Dashboard tasks section
  const currentScopePool = React.useMemo(() => {
    if (dashboardTaskScope === 'delegated') return delegatedByMeTasks;
    if (dashboardTaskScope === 'all') return allTeamTasks;
    return myTasks;
  }, [dashboardTaskScope, delegatedByMeTasks, allTeamTasks, myTasks]);

  const poolPendingTasks = React.useMemo(() => currentScopePool.filter(t => !isTaskActuallyCompleted(t)), [currentScopePool]);
  const poolCompletedTasks = React.useMemo(() => currentScopePool.filter(t => isTaskActuallyCompleted(t)), [currentScopePool]);
  const poolInProgressTasksCount = React.useMemo(() => poolPendingTasks.filter(t => t.status === 'in_progress' || t.timerRunning).length, [poolPendingTasks]);
  const poolLeftoverTasks = React.useMemo(() => {
    return poolPendingTasks.filter(t => {
      if (t.isUntimed || t.hasNoDueDate) return false;
      if (t.snoozed && t.remindAt && Number(t.remindAt) > Date.now()) return false;
      if (t.reminderDismissed) return false;
      const isPastDue = t.dueDate && t.dueDate < todayStr;
      const isPastStart = !t.dueDate && t.startDate && t.startDate < todayStr;
      return isPastDue || isPastStart;
    }).sort((a, b) => (a.dueDate || a.startDate || '').localeCompare(b.dueDate || b.startDate || ''));
  }, [poolPendingTasks, todayStr]);
  const poolFutureTasks = React.useMemo(() => {
    return poolPendingTasks.filter(t => {
      const isFutureStart = t.startDate && t.startDate > todayStr;
      const isFutureDue = t.dueDate && t.dueDate > todayStr && (!t.startDate || t.startDate > todayStr);
      return isFutureStart || isFutureDue;
    }).sort((a, b) => (a.startDate || a.dueDate || '').localeCompare(b.startDate || b.dueDate || ''));
  }, [poolPendingTasks, todayStr]);

  // Company-wide stats for Admin Overview
  const allTasksList = tasks || [];
  const allPendingTasksCount = React.useMemo(() => allTasksList.filter(t => !isTaskActuallyCompleted(t)).length, [allTasksList]);
  const allInProgressTasksCount = React.useMemo(() => allTasksList.filter(t => !isTaskActuallyCompleted(t) && (t.status === 'in_progress' || t.timerRunning)).length, [allTasksList]);
  const allDueTodayTasksCount = React.useMemo(() => allTasksList.filter(t => !isTaskActuallyCompleted(t) && t.dueDate === todayStr).length, [allTasksList, todayStr]);
  const allOverdueTasksCount = React.useMemo(() => allTasksList.filter(t => !isTaskActuallyCompleted(t) && t.dueDate && t.dueDate < todayStr).length, [allTasksList, todayStr]);
  const allCompletedTodayCount = React.useMemo(() => allTasksList.filter(t => isTaskActuallyCompleted(t) && (t.completedAt?.startsWith(todayStr) || t.updatedAt?.startsWith(todayStr))).length, [allTasksList, todayStr]);

  const todayDisplayTasks = myTasks;

  // Resolved live shift state for currently displayed user perspective
  const displayedIsClockedIn = isViewingOtherEmployee ? activeEmpState?.isClockedIn : isClockedIn;
  const displayedIsOnBreak = isViewingOtherEmployee ? activeEmpState?.isOnBreak : isOnBreak;
  const displayedBreakType = isViewingOtherEmployee ? (activeEmpState?.breakType || 'Break') : breakType;
  const displayedLoginTime = isViewingOtherEmployee ? activeEmpState?.loginTime : loginTime;
  const displayedClockOutTime = isViewingOtherEmployee ? activeEmpState?.clockOutTime : clockOutTime;
  const displayedWorkDuration = isViewingOtherEmployee ? formatTimeDurationSafe(activeEmpState?.workSecs || 0) : workDurationText;
  const displayedHadClockedOut = isViewingOtherEmployee ? activeEmpState?.isClockedOut : hadClockedOutToday;
  const displayedBreakDuration = isViewingOtherEmployee ? formatTimeDurationSafe(activeEmpState?.breakSecs || 0) : (breakDurationText || '0s');

  const activeProjectsCount = (projects || []).filter(p => p?.status === 'in_progress').length || 0;
  const overdueProjectsCount = (projects || []).filter(p => p?.status !== 'completed' && p?.deadline && p?.deadline < todayStr).length || 0;

  // Snoozed / Reminded Tasks (Tasks on hold with CRM reminder)
  const snoozedTasks = (tasks || []).filter(t =>
    t?.snoozed && t?.remindAt && !t?.reminderDismissed && t?.status !== 'completed' &&
    (isTaskAssignedToUser(t, effectiveTargetUser) || isUserAdminOrHR)
  );

  // Reminders that are currently DUE (scheduled time has arrived)
  const dueReminders = snoozedTasks.filter(t => Number(t.remindAt) <= Date.now());

  // Active Task for "Active Timer" card (strictly bound to target user's direct assigned tasks)
  const displayActiveTask = React.useMemo(() => {
    if (!isViewingOtherEmployee && activeRunningTask && !isTaskActuallyCompleted(activeRunningTask) && isTaskAssignedToUser(activeRunningTask, effectiveTargetUser)) {
      return activeRunningTask;
    }
    if (activeEmpState?.runningTask && !isTaskActuallyCompleted(activeEmpState.runningTask)) {
      const match = tasks.find(t => String(t._id || t.id) === String(activeEmpState.runningTask._id || activeEmpState.runningTask.taskId));
      if (!match || !isTaskActuallyCompleted(match)) {
        const liveSecs = Number(activeEmpState.runningTask.liveTaskSecs) || Number(activeEmpState.runningTask.timerSeconds) || 0;
        return {
          ...(match || {}),
          ...activeEmpState.runningTask,
          timerRunning: true,
          timerSeconds: liveSecs,
          liveDurationText: formatSeconds(liveSecs)
        };
      }
    }
    if (activeRunningTask && !isTaskActuallyCompleted(activeRunningTask) && isTaskAssignedToUser(activeRunningTask, effectiveTargetUser)) {
      return activeRunningTask;
    }
    if (activeSelectedTaskId) {
      const found = myTasks.find(t => String(t._id || t.id) === String(activeSelectedTaskId) && !isTaskActuallyCompleted(t));
      if (found) return found;
    }
    return myPendingTasks.find(t => !t.snoozed && !isTaskActuallyCompleted(t)) || myTasks.find(t => !isTaskActuallyCompleted(t)) || null;
  }, [isViewingOtherEmployee, activeEmpState?.runningTask, tasks, activeRunningTask, effectiveTargetUser, isTaskAssignedToUser, activeSelectedTaskId, myTasks, myPendingTasks, formatSeconds]);

  // Upcoming Next tasks in queue (strictly from user's personal pending queue)
  const upcomingQueueTasks = myPendingTasks
    .filter(t => t._id !== displayActiveTask?._id && !t.snoozed);

  const upNextTask = upcomingQueueTasks[0] || null;

  // Stable logged total duration today strictly scoped to current viewed user (timesheets logged today + active task timer seconds)
  const todayTimesheets = React.useMemo(() => {
    return (timesheets || []).filter(ts => {
      const isToday = ts.date === todayStr || ts.createdAt?.startsWith(todayStr);
      const tsEmpId = ts.employeeId ? String(ts.employeeId).toLowerCase() : (ts.employee ? String(ts.employee).toLowerCase() : '');
      const tsName = ts.employeeName ? ts.employeeName.toLowerCase().trim() : '';
      const myId = effectiveTargetUser?._id ? String(effectiveTargetUser._id).toLowerCase() : '';
      const myCode = effectiveTargetUser?.employeeCode ? String(effectiveTargetUser.employeeCode).toLowerCase() : '';
      const myName = effectiveTargetUser?.name ? effectiveTargetUser.name.toLowerCase().trim() : '';

      const isMine = (myId && tsEmpId === myId) ||
        (myCode && (tsEmpId === myCode || ts.employeeCode === myCode)) ||
        (myName && tsName && (tsName === myName || tsName.includes(myName) || myName.includes(tsName)));
      return isToday && isMine;
    });
  }, [timesheets, todayStr, effectiveTargetUser]);

  const totalLoggedTodaySecs = todayTimesheets.reduce((acc, curr) => acc + (Number(curr.totalDurationSeconds) || 0), 0);

  // Unsubmitted seconds across user's tasks worked today (live ticking timer OR paused today)
  // Strictly filters for tasks actually worked today (sessionDate === todayStr || t.timerRunning || completed today)
  // Excludes completed tasks from previous days and historical tasks!
  const unsubmittedTodayTaskSecs = (myTasks || []).reduce((acc, t) => {
    const tId = String(t._id || t.id);

    // Skip tasks completed on other days
    const isCompletedToday = t.completedOn === todayStr || (t.completedAt && String(t.completedAt).startsWith(todayStr));
    if (t.status === 'completed' && !isCompletedToday) return acc;

    // Check if task was worked today:
    // Strictly must be currently running today, or explicitly worked/paused today (sessionDate === todayStr), or completed today
    const isRunningNow = Boolean(t.timerRunning) || Boolean(activeRunningTask && String(activeRunningTask._id || activeRunningTask.id || activeRunningTask.taskId) === tId);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const wasStartedToday = t.startedAt && Number(t.startedAt) >= todayMidnight.getTime();
    const isWorkedToday = isRunningNow || (t.sessionDate === todayStr) || wasStartedToday || isCompletedToday;
    if (!isWorkedToday) return acc;

    const loggedForThisTaskToday = todayTimesheets
      .filter(ts => String(ts.taskId) === tId || (t.taskCode && ts.taskCode === t.taskCode))
      .reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);

    // Subtract all time already logged on previous days only if taskCurrentSecs represents total cumulative time
    const prevDaysLogged = (timesheets || [])
      .filter(ts => (String(ts.taskId) === tId || (t.taskCode && ts.taskCode === t.taskCode)) && ts.date !== todayStr)
      .reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);

    let taskCurrentSecs = 0;
    if (t.timerRunning && t.startedAt) {
      const base = (t.accumulatedSeconds !== undefined && t.accumulatedSeconds !== null)
        ? Number(t.accumulatedSeconds)
        : (Number(t.timerSeconds) || 0);
      const elapsed = Math.max(0, Math.floor((Date.now() - Number(t.startedAt)) / 1000));
      taskCurrentSecs = base + elapsed;
    } else {
      taskCurrentSecs = Number(t.timerSeconds) || Number(t.accumulatedSeconds) || Number(t.durationSeconds) || 0;
    }

    const todayPortion = (taskCurrentSecs > prevDaysLogged)
      ? (taskCurrentSecs - prevDaysLogged)
      : taskCurrentSecs;
    const unsubmitted = Math.max(0, todayPortion - loggedForThisTaskToday);
    return acc + unsubmitted;
  }, 0);

  const rawTotalTaskTodaySecs = totalLoggedTodaySecs + unsubmittedTodayTaskSecs;

  // Active shift work seconds guard
  const currentShiftSecs = isViewingOtherEmployee
    ? (activeEmpState?.workSecs || 0)
    : (workSeconds || activeEmpState?.workSecs || 0);
  const currentIsClockedIn = isViewingOtherEmployee
    ? (activeEmpState?.isClockedIn || false)
    : (displayedIsClockedIn || activeEmpState?.isClockedIn || false);
  const currentHadClockedOut = isViewingOtherEmployee
    ? (activeEmpState?.hadClockedOut || false)
    : (displayedHadClockedOut || activeEmpState?.hadClockedOut || false);

  // Today's total task seconds strictly derives from actual tasks worked today (timesheets + active timer)
  let totalTaskTodaySecs = rawTotalTaskTodaySecs;
  if (totalTaskTodaySecs === 0 && todayTimesheets.length > 0) {
    totalTaskTodaySecs = totalLoggedTodaySecs;
  }

  const taskTodayH = Math.floor(totalTaskTodaySecs / 3600);
  const taskTodayM = Math.floor((totalTaskTodaySecs % 3600) / 60);
  const taskTodayFormatted = totalTaskTodaySecs > 0
    ? (totalTaskTodaySecs < 60 ? `${totalTaskTodaySecs}s` : `${taskTodayH}h ${String(taskTodayM).padStart(2, '0')}m`)
    : '0h 0m';


  // Task-based Weekly Calculation (User requirement):
  // 1. Day-wise time accumulates based on tasks worked on that day
  // 2. Today's live task seconds (active timer + timesheets) adds in real-time
  // 3. Weekly total = Monday + Tuesday + Wednesday + Thursday + Friday + Saturday + Sunday
  const effectiveWeekUser = effectiveTargetUser || activeViewUser || currentUser;

  const displayWeeklyTimeLogs = React.useMemo(() => {
    const now = new Date();
    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const currentTodayStr = formatLocalDate(now);
    const todayDayIndex = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const currentDayOffset = todayDayIndex === 0 ? 6 : todayDayIndex - 1;
    const mondayDiff = todayDayIndex === 0 ? -6 : 1 - todayDayIndex;
    const mondayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayDiff);

    const dayMeta = [
      { day: 'Monday', shortDay: 'Mo', offset: 0 },
      { day: 'Tuesday', shortDay: 'Tu', offset: 1 },
      { day: 'Wednesday', shortDay: 'We', offset: 2 },
      { day: 'Thursday', shortDay: 'Th', offset: 3 },
      { day: 'Friday', shortDay: 'Fr', offset: 4 },
      { day: 'Saturday', shortDay: 'Sa', offset: 5 },
      { day: 'Sunday', shortDay: 'Su', offset: 6, isSunday: true, isDayOff: true }
    ];

    const uId = effectiveWeekUser?._id ? String(effectiveWeekUser._id).toLowerCase() : '';
    const uCode = effectiveWeekUser?.employeeCode ? String(effectiveWeekUser.employeeCode).toLowerCase() : '';
    const uName = effectiveWeekUser?.name ? effectiveWeekUser.name.toLowerCase().trim() : '';

    return dayMeta.map(item => {
      const dayDateObj = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + item.offset);
      const dateStr = formatLocalDate(dayDateObj);
      const isCurrentDay = item.offset === currentDayOffset;
      const isPastDay = item.offset < currentDayOffset;
      const isFutureDay = item.offset > currentDayOffset;

      if (item.isSunday) {
        return {
          day: 'Sunday',
          shortDay: 'Su',
          date: dateStr,
          durationText: '0h 00m',
          durationHours: 0,
          durationSeconds: 0,
          breakDuration: '0m',
          isSunday: true,
          isDayOff: true,
          isCurrentDay,
          tasksWorked: []
        };
      }

      // Timesheets for effective user on this day
      const dayTs = (timesheets || []).filter(ts => {
        if (ts.date !== dateStr && !ts.createdAt?.startsWith(dateStr)) return false;
        if (!effectiveWeekUser) return true;
        const tsId = ts.employeeId ? String(ts.employeeId).toLowerCase() : (ts.employee ? String(ts.employee._id || ts.employee).toLowerCase() : '');
        const tsCode = ts.employeeCode ? String(ts.employeeCode).toLowerCase() : '';
        const tsName = ts.employeeName ? ts.employeeName.toLowerCase().trim() : '';

        if (uId && (tsId === uId || String(ts.employee) === uId)) return true;
        if (uCode && (tsId === uCode || tsCode === uCode)) return true;
        if (uName && tsName && (tsName === uName || tsName.includes(uName) || uName.includes(tsName))) return true;
        return false;
      });

      let dayTotalSecs = dayTs.reduce((acc, curr) => acc + (Number(curr.totalDurationSeconds) || 0), 0);

      // Check tasks completed on this date that might not be in timesheets
      (tasks || []).forEach(t => {
        if (!isTaskAssignedToUser(t, effectiveWeekUser)) return;
        const isCompletedOnDate = t.completedOn === dateStr || (t.completedAt && String(t.completedAt).startsWith(dateStr));
        const alreadyInTs = dayTs.some(ts => String(ts.taskId) === String(t._id || t.id) || (t.taskCode && ts.taskCode === t.taskCode));
        if (isCompletedOnDate && !alreadyInTs) {
          const tSecs = Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0;
          if (tSecs > 0) dayTotalSecs += tSecs;
        }
      });

      if (isCurrentDay) {
        dayTotalSecs = Math.max(dayTotalSecs, totalTaskTodaySecs || 0);
      }

      const hrs = Math.floor(dayTotalSecs / 3600);
      const mins = Math.floor((dayTotalSecs % 3600) / 60);
      const durationText = dayTotalSecs > 0
        ? (dayTotalSecs < 60 ? `${dayTotalSecs}s` : `${hrs}h ${String(mins).padStart(2, '0')}m`)
        : '0h 00m';

      // Attendance record for break info
      const dayAtt = (attendance || []).find(a =>
        a.date === dateStr && (
          (uId && (String(a.employeeId).toLowerCase() === uId || String(a.employee).toLowerCase() === uId)) ||
          (uCode && (String(a.employeeCode).toLowerCase() === uCode || String(a.employeeId).toLowerCase() === uCode)) ||
          (uName && a.employeeName?.toLowerCase().includes(uName))
        )
      );

      return {
        day: item.day,
        shortDay: item.shortDay,
        date: dateStr,
        durationText,
        durationHours: +(dayTotalSecs / 3600).toFixed(2),
        durationSeconds: dayTotalSecs,
        breakDuration: dayAtt?.totalBreakHours ? `${Math.round(dayAtt.totalBreakHours * 60)}m` : '0m',
        isCurrentDay,
        isPastDay,
        isFutureDay,
        tasksWorked: dayTs.map(ts => ({
          taskId: ts.taskId,
          taskCode: ts.taskCode || 'TSK',
          taskTitle: ts.taskTitle || 'Assigned Work',
          projectName: ts.projectName || 'General Work',
          durationText: ts.totalDurationText || formatSeconds(ts.totalDurationSeconds || 0),
          durationSeconds: ts.totalDurationSeconds || 0,
          status: 'completed',
          isCompleted: true
        }))
      };
    });
  }, [effectiveWeekUser, timesheets, tasks, attendance, totalTaskTodaySecs, formatSeconds, isTaskAssignedToUser, syncTick]);

  const todayWeekLog = displayWeeklyTimeLogs.find(l => l.isCurrentDay);
  const otherDaysTaskSecs = React.useMemo(() => {
    return displayWeeklyTimeLogs
      .filter(l => !l.isCurrentDay && l.date !== todayStr)
      .reduce((acc, curr) => acc + (Number(curr.durationSeconds) || 0), 0);
  }, [displayWeeklyTimeLogs, todayStr]);

  // Today's total task seconds strictly from today's completed timesheets + current running/paused task timer:
  const totalWeeklySecs = otherDaysTaskSecs + (totalTaskTodaySecs || 0);
  const totalWeeklyHours = +(totalWeeklySecs / 3600).toFixed(2);
  const weekH = Math.floor(totalWeeklySecs / 3600);
  const weekM = Math.floor((totalWeeklySecs % 3600) / 60);
  const totalWeeklyFormatted = `${weekH}h ${String(weekM).padStart(2, '0')}m`;

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

  const selectedDayLogData = displayWeeklyTimeLogs.find(l => l.shortDay === activeWeekDayShort) || displayWeeklyTimeLogs.find(l => l.isCurrentDay) || displayWeeklyTimeLogs[0] || null;
  const isSelectedDayToday = selectedDayLogData?.isCurrentDay || selectedDayLogData?.date === todayStr || activeWeekDayShort === todayDayShort;
  const displayedSelectedDayDuration = isSelectedDayToday
    ? (totalTaskTodaySecs > 0 ? (totalTaskTodaySecs < 60 ? `${totalTaskTodaySecs}s` : `${Math.floor(totalTaskTodaySecs / 3600)}h ${String(Math.floor((totalTaskTodaySecs % 3600) / 60)).padStart(2, '0')}m`) : '0h 00m')
    : (selectedDayLogData?.durationText || '0h 00m');

  // Upcoming Schedule & Events (strictly October 2026 onwards from current date)
  const upcomingScheduleEvents = React.useMemo(() => {
    const rawEvents = (events || [])
      .filter(e => (e.startDate || e.date) >= todayStr)
      .map(e => ({
        _id: e._id || `ev_${Math.random()}`,
        title: e.title || e.eventName || 'Company Event',
        time: e.time || e.startTime || 'All Day',
        date: e.startDate || e.date,
        color: e.color || '#2563eb',
        bgColor: e.bgColor || '#eff6ff'
      }));

    const rawHolidays = (holidays || [])
      .filter(h => h.date >= todayStr)
      .map(h => ({
        _id: `hol_ev_${h._id}`,
        title: `${h.name} 🪔`,
        time: 'All Day',
        date: h.date,
        color: '#ea580c',
        bgColor: '#ffedd5'
      }));

    const combined = [...rawEvents, ...rawHolidays].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return combined.slice(0, 3);
  }, [events, holidays, todayStr]);

  // Employees on leave today (Dynamic real-time date check)
  const employeesOnLeave = (leaves || []).filter(l =>
    l?.status === 'approved' && l?.startDate <= todayStr && l?.endDate >= todayStr
  );

  // 1. Pending leave requests waiting for my review
  const pendingLeaveRequestsForMe = (leaves || []).filter(l => {
    if (l?.status !== 'pending') return false;
    // Applicant can never approve own leave
    if (isLeaveApplicant(l, currentUser)) return false;

    // Designated reviewer
    if (isLeaveDesignatedApprover(l, currentUser)) return true;

    // Master Administrator has full oversight over pending leaves in the organization
    if (isAdmin(currentUser)) return true;

    // HR Manager has oversight over general or HR directed leaves
    if (isHR(currentUser) && (!l.appliedToRole || l.appliedToRole.toLowerCase().includes('hr') || !l.appliedToId)) return true;

    return false;
  });

  // 2. Pending leaves submitted BY the current user (awaiting review by Admin/HR/Approver)
  const myPendingLeaves = (leaves || []).filter(l => {
    return l?.status === 'pending' && isLeaveApplicant(l, currentUser);
  });

  // 3. Recently decided leaves for current user (approved or rejected, not yet acknowledged)
  const myDecidedLeaves = (leaves || []).filter(l => {
    if (l?.status !== 'approved' && l?.status !== 'rejected') return false;
    let ackList = [];
    try {
      ackList = JSON.parse(localStorage.getItem('ems_acknowledged_leaves') || '[]');
    } catch (_) { }
    const ackSet = new Set(ackList.map(String));
    if (l.isAcknowledged || ackSet.has(String(l._id))) return false;
    return isLeaveApplicant(l, currentUser);
  });

  // Active Top Alerts for upper dashboard (undismissed by cross button)
  const activeTopLeaveRequests = React.useMemo(() => {
    return (pendingLeaveRequestsForMe || []).filter(l => !dismissedTopAlerts.includes(String(l._id)));
  }, [pendingLeaveRequestsForMe, dismissedTopAlerts]);

  const activeTopNotices = React.useMemo(() => {
    return (notices || []).filter(not => {
      const notId = String(not?._id || not?.id || '');
      if (dismissedTopAlerts.includes(notId)) return false;
      return not?.isImportant || not?.priority === 'urgent' || not?.priority === 'high' || not?.category === 'Company Announcement';
    });
  }, [notices, dismissedTopAlerts]);

  // 4. All personal leaves of current user (for history/status display)
  const myRecentLeaves = (leaves || []).filter(l => {
    return isLeaveApplicant(l, currentUser);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '100%', paddingBottom: '24px' }}>

      {/* ── 🏢 Top Page Header Bar (Standardized matching Tickets & All Pages) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        backgroundColor: '#ffffff',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        minHeight: '68px',
        boxSizing: 'border-box',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <LayoutDashboard size={17} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.2' }}>
              Enterprise Operations Dashboard
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Live shift tracking, active tasks, team presence & workplace overview.
            </p>
          </div>
        </div>

        {/* Quick Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isUserAdminOrHR && (
            <button
              onClick={() => setIsEmpDirectoryOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0 12px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              title="Open full Employee Directory"
            >
              <Users size={13} />
              <span>Team Directory</span>
            </button>
          )}

          <button
            onClick={() => setIsRaiseTicketOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 12px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Raise support ticket or IT request"
          >
            <LifeBuoy size={13} color="#0284c7" />
            <span>Support Ticket</span>
          </button>

          <button
            onClick={() => setIsAddTaskOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 12px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(2,132,199,0.2)'
            }}
            title="Create a new task"
          >
            <Plus size={13} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

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

      {/* ── ⚠️ REOPENED PROJECTS BANNER (FOR ASSIGNEES) ── */}
      {reopenedProjectsForMe.length > 0 && (
        <div style={{
          backgroundColor: '#fff7ed',
          border: '1.5px solid #fdba74',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 2px 6px rgba(194, 65, 12, 0.08)'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div style={{ flex: 1, fontSize: '12px', color: '#9a3412' }}>
            <strong>Project{reopenedProjectsForMe.length > 1 ? 's' : ''} Reopened by Admin: </strong>
            {reopenedProjectsForMe.map(p => `"${p.name}" (${p.reopenReason || 'Admin requested revisions'})`).join(', ')}
          </div>
          <button
            onClick={() => navigate('/projects')}
            style={{
              padding: '4px 10px',
              backgroundColor: '#c2410c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            View Projects
          </button>
        </div>
      )}

      {/* ── 📋 PROJECT COMPLETION APPROVALS QUEUE (ADMIN / HR PERSPECTIVE) ── */}
      {isUserAdminOrHR && pendingApprovalProjects.length > 0 && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1.5px solid #d8b4fe',
          boxShadow: '0 4px 14px rgba(147, 51, 234, 0.08)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '10px 16px',
            backgroundColor: '#faf5ff',
            borderBottom: '1px solid #f3e8ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📋</span>
              <div>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#581c87' }}>
                  Project Completion Review Queue ({pendingApprovalProjects.length})
                </span>
                <span style={{ fontSize: '11px', color: '#7e22ce', marginLeft: '6px' }}>
                  Submitted for final sign-off
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/projects')}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#7e22ce',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Manage All in Projects →
            </button>
          </div>

          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingApprovalProjects.map(proj => (
              <div
                key={proj._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#fdf4ff',
                  border: '1px solid #f5d0fe'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#9333ea',
                    color: '#ffffff',
                    fontSize: '10.5px',
                    fontWeight: '800'
                  }}>
                    {proj.projectCode || 'PRJ'}
                  </span>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                      {proj.name}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                      Submitted by: <strong>{proj.completionSubmittedBy || proj.creatorName || 'Team Member'}</strong>
                      {proj.completionSubmittedAt && ` • ${new Date(proj.completionSubmittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={async () => {
                      await approveProjectCompletion(proj._id);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)'
                    }}
                    title="Official Final Sign-off: Marks Project permanently Complete in database"
                  >
                    <span>✅ Final Approve</span>
                  </button>

                  <button
                    onClick={async () => {
                      const reason = window.prompt(`Enter reason to Reopen project "${proj.name}" (e.g. pending deliverables, missing documentation):`, 'Reopened by Admin for required revisions');
                      if (reason && reason.trim()) {
                        await reopenProject(proj._id, reason.trim());
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#fff7ed',
                      color: '#c2410c',
                      border: '1px solid #fed7aa',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    title="Send project back to in-progress with revision notes"
                  >
                    <span>🔄 Reopen</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ⏮️ LEFTOVER / PREVIOUS DAYS TASK REMINDER BANNER ── */}
      {!isLeftoverDismissed && myLeftoverTasks.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1.5px solid #f87171',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.12)',
          position: 'relative'
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Clock size={16} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: '800', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ⏮️ Leftover from Previous Day
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#b91c1c' }}>
                    {myLeftoverTasks.length} task{myLeftoverTasks.length > 1 ? 's were' : ' was'} left incomplete
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '2px' }}>
                  Please take action: start working now, reschedule for future, snooze reminder, or mark completed.
                </div>
              </div>
            </div>

            {/* Pagination / navigation if multiple leftover tasks */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {myLeftoverTasks.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '6px' }}>
                  <button
                    onClick={() => setActiveLeftoverIdx(i => Math.max(0, i - 1))}
                    disabled={activeLeftoverIdx === 0}
                    style={{
                      padding: '3px 6px',
                      borderRadius: '4px',
                      border: '1px solid #fca5a5',
                      backgroundColor: activeLeftoverIdx === 0 ? '#fee2e2' : '#ffffff',
                      color: activeLeftoverIdx === 0 ? '#9ca3af' : '#b91c1c',
                      cursor: activeLeftoverIdx === 0 ? 'default' : 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#991b1b' }}>
                    {activeLeftoverIdx + 1} of {myLeftoverTasks.length}
                  </span>
                  <button
                    onClick={() => setActiveLeftoverIdx(i => Math.min(myLeftoverTasks.length - 1, i + 1))}
                    disabled={activeLeftoverIdx === myLeftoverTasks.length - 1}
                    style={{
                      padding: '3px 6px',
                      borderRadius: '4px',
                      border: '1px solid #fca5a5',
                      backgroundColor: activeLeftoverIdx === myLeftoverTasks.length - 1 ? '#fee2e2' : '#ffffff',
                      color: activeLeftoverIdx === myLeftoverTasks.length - 1 ? '#9ca3af' : '#b91c1c',
                      cursor: activeLeftoverIdx === myLeftoverTasks.length - 1 ? 'default' : 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    ▶
                  </button>
                </div>
              )}
              <button
                onClick={() => setIsLeftoverDismissed(true)}
                title="Dismiss reminder banner"
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#991b1b',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Active Leftover Task Item */}
          {(() => {
            const currentLeftover = myLeftoverTasks[activeLeftoverIdx] || myLeftoverTasks[0];
            if (!currentLeftover) return null;

            // Calculate how many days ago it was due
            const diffDays = currentLeftover.dueDate
              ? Math.max(1, Math.round((new Date(todayStr) - new Date(currentLeftover.dueDate)) / (1000 * 60 * 60 * 24)))
              : 1;

            return (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#dc2626' }}>
                      #{currentLeftover.taskCode || 'TSK'}:
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                      {currentLeftover.title}
                    </span>
                    {currentLeftover.projectName && (
                      <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                        📁 {currentLeftover.projectName}
                      </span>
                    )}
                    <span style={{ fontSize: '10px', backgroundColor: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      Due {diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`} ({currentLeftover.dueDate || 'Past Due'})
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                    Priority: <strong style={{ textTransform: 'capitalize', color: currentLeftover.priority === 'urgent' ? '#dc2626' : currentLeftover.priority === 'high' ? '#ea580c' : '#475569' }}>{currentLeftover.priority || 'medium'}</strong> • Logged so far: <strong>{currentLeftover.hoursLoggedText || formatTimeDurationSafe(currentLeftover.timerSeconds || 0)}</strong>
                    {currentLeftover.assignedBy && ` • Assigned by: ${currentLeftover.assignedBy}`}
                  </div>
                </div>

                {/* Quick 1-Click Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {/* Work Now / Start Timer */}
                  <button
                    onClick={() => {
                      if (!isClockedIn) {
                        addToast('⚠️ Please Clock In for shift before starting task timer!', 'warning');
                        return;
                      }
                      if (isOnBreak) {
                        addToast('☕ You are on break. Please resume shift first!', 'warning');
                        return;
                      }
                      startTaskTimer(currentLeftover._id, { forceOverdue: true });
                      setActiveSelectedTaskId(currentLeftover._id);
                      addToast(`▶️ Started leftover task: ${currentLeftover.title}`, 'success');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(220, 38, 38, 0.3)'
                    }}
                    title="Start timer and work on this leftover task now"
                  >
                    <Play size={11} fill="#fff" />
                    <span>Work Now</span>
                  </button>

                  {/* Quick Reschedule for Future (+1 Day / Tomorrow) */}
                  <button
                    onClick={async () => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const tomorrowStr = tomorrow.toISOString().split('T')[0];
                      if (rescheduleTaskForFuture) {
                        await rescheduleTaskForFuture(currentLeftover._id, tomorrowStr, 'Rescheduled to tomorrow from Leftover Reminder');
                        addToast(`📅 Task rescheduled to tomorrow (${tomorrowStr})`, 'success');
                      }
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                    title="Move deadline to Tomorrow (+1 Day)"
                  >
                    📅 +1d Tomorrow
                  </button>

                  {/* Reschedule +7 Days */}
                  <button
                    onClick={async () => {
                      const nextWeek = new Date();
                      nextWeek.setDate(nextWeek.getDate() + 7);
                      const nextWeekStr = nextWeek.toISOString().split('T')[0];
                      if (rescheduleTaskForFuture) {
                        await rescheduleTaskForFuture(currentLeftover._id, nextWeekStr, 'Rescheduled to next week (+7d)');
                        addToast(`📅 Task rescheduled to next week (${nextWeekStr})`, 'success');
                      }
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                    title="Move deadline to Next Week (+7 Days)"
                  >
                    +7d Next Week
                  </button>

                  {/* Snooze / Remind Later */}
                  <button
                    onClick={() => {
                      setSnoozeTaskTarget(currentLeftover);
                      setIsSnoozeModalOpen(true);
                    }}
                    style={{
                      padding: '5px 9px',
                      borderRadius: '6px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                    title="Set reminder or snooze task"
                  >
                    ⏰ Snooze
                  </button>

                  {/* Mark Completed */}
                  <button
                    onClick={async () => {
                      await completeTask(currentLeftover._id, 'Completed leftover task', false);
                      addToast('✅ Leftover task marked as completed!', 'success');
                    }}
                    style={{
                      padding: '5px 9px',
                      borderRadius: '6px',
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                    title="Mark this leftover task as completed"
                  >
                    <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    Done
                  </button>

                  {/* Open Detail Modal (Full history + custom reschedule) */}
                  <button
                    onClick={() => setSelectedTask(currentLeftover)}
                    style={{
                      padding: '5px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                    title="View details & assignment history"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })()}
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

      {/* ── 📋 TOP ALERT BANNER: MY SUBMITTED LEAVE REQUEST (PENDING REVIEW) ── */}
      {myPendingLeaves.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {myPendingLeaves.slice(0, 1).map(l => (
            <div
              key={`my_pending_top_${l._id}`}
              style={{
                backgroundColor: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Clock size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e40af' }}>
                      📋 Your Leave Application is Pending Review
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: '#dbeafe',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      Awaiting Decision
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#1e3a8a', marginTop: '2px' }}>
                    <strong>{l.leaveType}</strong> ({l.durationText || `${l.durationDays}d`}) from <strong>{l.startDate}</strong> to <strong>{l.endDate}</strong> • Sent to <strong>{l.appliedToName || 'Reviewer'}</strong> ({l.appliedToRole || 'Approver'})
                    {l.reason && <span> • <em>"{l.reason}"</em></span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setCancellingLeaveTarget(l)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title="Withdraw / Cancel this request"
                >
                  Cancel Request
                </button>
                <button
                  onClick={() => navigate('/leaves')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#1d4ed8',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 📩 TOP ALERT BANNER: INCOMING LEAVE REQUESTS FOR YOUR REVIEW (DISMISSIBLE VIA CROSS) ── */}
      {activeTopLeaveRequests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeTopLeaveRequests.map(l => (
            <div
              key={`top_leave_${l._id}`}
              style={{
                backgroundColor: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Palmtree size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#92400e' }}>
                      📩 New Leave Request Pending Your Approval
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      Needs Review
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#78350f', marginTop: '2px' }}>
                    <strong>{l.employeeName}</strong> ({l.employeeRole || 'Member'}) has requested <strong>{l.leaveType}</strong> ({l.durationText || `${l.durationDays}d`}) from <strong>{l.startDate}</strong> to <strong>{l.endDate}</strong>
                    {l.reason && <span> • <em>"{l.reason}"</em></span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => updateLeaveStatus(l._id, 'approved')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title="Approve this leave request"
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => setRejectingLeaveTarget(l)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title="Deny this leave request"
                >
                  ✕ Deny
                </button>
                <button
                  onClick={() => navigate('/leaves')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Manage →
                </button>
                <button
                  onClick={() => dismissTopAlert(l._id)}
                  style={{
                    padding: '5px',
                    borderRadius: '6px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '4px'
                  }}
                  title="Dismiss alert from top (remains available in Leave section below)"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 📢 TOP ALERT BANNER: IMPORTANT COMPANY ANNOUNCEMENTS (DISMISSIBLE VIA CROSS) ── */}
      {activeTopNotices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeTopNotices.slice(0, 2).map(not => (
            <div
              key={`top_notice_${not._id || not.id}`}
              style={{
                backgroundColor: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Bell size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e40af' }}>
                      📢 Important Announcement: {not.title}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: not.isImportant ? '#fee2e2' : '#dbeafe',
                      color: not.isImportant ? '#dc2626' : '#1d4ed8',
                      border: `1px solid ${not.isImportant ? '#fecaca' : '#bfdbfe'}`,
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      {not.category || 'Company Notice'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#1e3a8a', marginTop: '2px' }}>
                    {not.shortDescription || not.description || not.fullContent}
                    {not.postedBy && <span style={{ color: '#64748b', marginLeft: '6px' }}>• Posted by <strong>{not.postedBy}</strong></span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setSelectedNotice(not)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Read Notice →
                </button>
                <button
                  onClick={() => navigate('/notice-board')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Notice Board
                </button>
                <button
                  onClick={() => dismissTopAlert(not._id || not.id)}
                  style={{
                    padding: '5px',
                    borderRadius: '6px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    border: '1px solid #bfdbfe',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '4px'
                  }}
                  title="Dismiss announcement from top (remains available in Notices section below)"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 🛡️ ADMIN LIVE OPERATIONS SHORTCUT BANNER ── */}
      {(isUserAdminOrHR || perms?.liveOperations || perms?.viewAllAttendance) && (
        <div style={{
          backgroundColor: '#fff7ed',
          borderRadius: '10px',
          border: '1px solid #fed7aa',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Zap size={18} fill="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Team Operations & Shift Controls</span>
                <span style={{ fontSize: '10px', backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                  {teamStats.clockedIn} Working Live
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#c2410c' }}>
                Emergency clock-in/out, power outage overrides, task controls, and full team shift tracking are centralized in Live Operations.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => navigate('/team-operations')}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#ea580c',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c2410c'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
            >
              <Zap size={14} fill="#ffffff" />
              <span>Open Live Operations →</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          ⚡ INTERACTIVE KPI SUMMARY STRIP (Click to Filter / Inspect)
      ───────────────────────────────────────────────────────────────────────── */}
      <DashboardKpiStrip
        isUserAdminOrHR={isUserAdminOrHR}
        isViewingOtherEmployee={isViewingOtherEmployee}
        navigate={navigate}
        employees={employees}
        teamStats={teamStats}
        employeesOnLeave={employeesOnLeave}
        allInProgressTasksCount={allInProgressTasksCount}
        allPendingTasksCount={allPendingTasksCount}
        allOverdueTasksCount={allOverdueTasksCount}
        allCompletedTodayCount={allCompletedTodayCount}
        setPendingTasksModalFilter={setPendingTasksModalFilter}
        setIsPendingTasksModalOpen={setIsPendingTasksModalOpen}
        totalTaskTodaySecs={totalTaskTodaySecs}
        displayedWorkDuration={displayedWorkDuration}
        displayActiveTask={displayActiveTask}
        taskStatusTab={taskStatusTab}
        setTaskStatusTab={setTaskStatusTab}
        myPendingTasks={myPendingTasks}
        myDueTodayTasksCount={myDueTodayTasksCount}
        overdueTasksCount={overdueTasksCount}
        myCompletedTodayCount={myCompletedTodayCount}
        currentUser={currentUser}
      />

            {/* ─────────────────────────────────────────────────────────────────────────
          TOP SECTION: Welcome Profile Card & Attendance Shift Clock (Compact & Sleek)
      ───────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '14px',
        alignItems: 'stretch'
      }}>
        <DashboardWelcomeCard
          effectiveTargetUser={effectiveTargetUser}
          currentUser={currentUser}
          isViewingOtherEmployee={isViewingOtherEmployee}
          displayedIsClockedIn={displayedIsClockedIn}
          displayedIsOnBreak={displayedIsOnBreak}
          displayedHadClockedOut={displayedHadClockedOut}
          displayedBreakType={displayedBreakType}
          roleConfig={roleConfig}
          activeWorkMode={activeWorkMode}
          showWorkModeMenu={showWorkModeMenu}
          setShowWorkModeMenu={setShowWorkModeMenu}
          handleUpdateLiveWorkMode={handleUpdateLiveWorkMode}
          currentDateFormatted={currentDateFormatted}
          currentTime={currentTime}
          setIsApplyLeaveOpen={setIsApplyLeaveOpen}
          navigate={navigate}
          setIsEditProfileOpen={setIsEditProfileOpen}
        />

        <ShiftClockCard
          currentTime={currentTime}
          displayedIsClockedIn={displayedIsClockedIn}
          displayedIsOnBreak={displayedIsOnBreak}
          displayedHadClockedOut={displayedHadClockedOut}
          displayedBreakType={displayedBreakType}
          displayedWorkDuration={displayedWorkDuration}
          displayedBreakDuration={displayedBreakDuration}
          displayedLoginTime={displayedLoginTime}
          displayedClockOutTime={displayedClockOutTime}
          isViewingOtherEmployee={isViewingOtherEmployee}
          effectiveTargetUser={effectiveTargetUser}
          activeEmpState={activeEmpState}
          workSeconds={workSeconds}
          openDayLogModalForUser={openDayLogModalForUser}
          todayStr={todayStr}
          isOnBreak={isOnBreak}
          isBreakOverdue={isBreakOverdue}
          breakType={breakType}
          currentBreakTimeString={currentBreakTimeString}
          extendBreak={extendBreak}
          setIsBreakModalOpen={setIsBreakModalOpen}
          resumeFromBreak={resumeFromBreak}
          isClockedIn={isClockedIn}
          handleClockIn={handleClockIn}
          handleClockOut={handleClockOut}
          startTeaBreak={startTeaBreak}
          startLunchBreak={startLunchBreak}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          MIDDLE ROW: My Active Timer & Week Timelogs (Side-by-Side Responsive Grid)
      ───────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '14px',
        marginBottom: '14px',
        alignItems: 'stretch'
      }}>
        {/* Left Column: My Active Timer Card (Compact & Modern) */}
        <ActiveTaskTimerCard
          currentDateFormatted={currentDateFormatted}
          displayActiveTask={displayActiveTask}
          isClockedIn={isClockedIn}
          handleClockIn={handleClockIn}
          displayedIsOnBreak={displayedIsOnBreak}
          displayedBreakType={displayedBreakType}
          isViewingOtherEmployee={isViewingOtherEmployee}
          resumeFromBreak={resumeFromBreak}
          todayStr={todayStr}
          isOnBreak={isOnBreak}
          formatTimeDurationSafe={formatTimeDurationSafe}
          effectiveTargetUser={effectiveTargetUser}
          addToast={addToast}
          completeAndNextTask={completeAndNextTask}
          setActiveSelectedTaskId={setActiveSelectedTaskId}
          pauseTaskTimer={pauseTaskTimer}
          startTaskTimer={startTaskTimer}
          completeTask={completeTask}
          setSnoozeTaskTarget={setSnoozeTaskTarget}
          setIsSnoozeModalOpen={setIsSnoozeModalOpen}
          stopTaskTimer={stopTaskTimer}
          upcomingQueueTasks={upcomingQueueTasks}
          snoozedTasks={snoozedTasks}
          resumeSnoozedTask={resumeSnoozedTask}
          myCompletedTasks={myCompletedTasks}
          setIsAddTaskOpen={setIsAddTaskOpen}
          navigate={navigate}
        />

        {/* Right Column: Tasks/Projects Overview & Week Timelogs (Exact Layout from Photo) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Mini Tasks & Projects Overview Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            {/* Tasks Mini Card */}
            <div
              onClick={() => {
                setPendingTasksModalFilter('all');
                setIsPendingTasksModalOpen(true);
              }}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              title="Click to view all pending tasks list"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Tasks</span>
                <ListTodo size={15} color="#0284c7" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginTop: '2px' }}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingTasksModalFilter('all');
                    setIsPendingTasksModalOpen(true);
                  }}
                  title="Click to view pending tasks"
                  style={{ cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#0284c7' }}>{myPendingTasks.length}</span>
                  <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '4px' }}>Pending</span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingTasksModalFilter('overdue');
                    setIsPendingTasksModalOpen(true);
                  }}
                  title="Click to view overdue tasks"
                  style={{ cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '18px', fontWeight: '800', color: overdueTasksCount > 0 ? '#dc2626' : '#64748b' }}>{overdueTasksCount}</span>
                  <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '4px' }}>Overdue</span>
                </div>
              </div>
            </div>

            {/* Projects Mini Card */}
            <div
              onClick={() => navigate('/projects')}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              title="Click to view all projects"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Projects</span>
                <Layers size={15} color="#0284c7" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginTop: '2px' }}>
                <div>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>
                    {(projects || []).filter(p => p.status !== 'completed' && p.status !== 'cancelled').length}
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '4px' }}>In Progress</span>
                </div>
                <div>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: (projects || []).filter(p => p.status !== 'completed' && p.status !== 'cancelled' && p.deadline && p.deadline.slice(0, 10) < todayStr).length > 0 ? '#ef4444' : '#64748b' }}>
                    {(projects || []).filter(p => p.status !== 'completed' && p.status !== 'cancelled' && p.deadline && p.deadline.slice(0, 10) < todayStr).length}
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '4px' }}>Overdue</span>
                </div>
              </div>
            </div>
          </div>

          <WeeklyTimeLogsCard
            effectiveTargetUser={effectiveTargetUser}
            currentUser={currentUser}
            todayStr={todayStr}
            activeWeekDayShort={activeWeekDayShort}
            setActiveWeekDayShort={setActiveWeekDayShort}
            openDayLogModalForUser={openDayLogModalForUser}
            holidays={holidays}
            timesheets={timesheets}
            tasks={tasks}
            activeRunningTask={activeRunningTask}
            formatSeconds={formatSeconds}
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          MY TASKS SECTION (Direct list of tasks with filters & instant timer controls)
      ───────────────────────────────────────────────────────────────────────── */}
<DashboardTasksSection
        dashboardTaskScope={dashboardTaskScope}
        setDashboardTaskScope={setDashboardTaskScope}
        dashboardTaskTab={dashboardTaskTab}
        setDashboardTaskTab={setDashboardTaskTab}
        currentScopePool={currentScopePool}
        currentUser={currentUser}
        effectiveTargetUser={effectiveTargetUser}
        myTasks={myTasks}
        delegatedByMeTasks={delegatedByMeTasks}
        allTeamTasks={allTeamTasks}
        isUserAdminOrHR={isUserAdminOrHR}
        perms={perms}
        poolPendingTasks={poolPendingTasks}
        poolLeftoverTasks={poolLeftoverTasks}
        poolFutureTasks={poolFutureTasks}
        poolInProgressTasksCount={poolInProgressTasksCount}
        poolCompletedTasks={poolCompletedTasks}
        todayStr={todayStr}
        isTaskActuallyCompleted={isTaskActuallyCompleted}
        isTaskAssignedToUser={isTaskAssignedToUser}
        isClockedIn={isClockedIn}
        isOnBreak={isOnBreak}
        handleClockIn={handleClockIn}
        startTaskTimer={startTaskTimer}
        pauseTaskTimer={pauseTaskTimer}
        completeTask={completeTask}
        activeSelectedTaskId={activeSelectedTaskId}
        setActiveSelectedTaskId={setActiveSelectedTaskId}
        setSelectedTask={setSelectedTask}
        canDeleteTask={canDeleteTask}
        deleteTask={deleteTask}
        addToast={addToast}
        setIsAddTaskOpen={setIsAddTaskOpen}
        navigate={navigate}
      />

            {/* ─────────────────────────────────────────────────────────────────────────
          LOWER ROW 1: Support Tickets & Calendar / Schedule (Spacious 2-Column Grid)
      ───────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '14px',
        alignItems: 'stretch'
      }}>
        {/* Support Tickets Widget */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
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
                  displayTickets.slice(0, 5).map(tkt => (
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

        {/* Schedule & Events Widget (Paired with Tickets) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
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
            {upcomingScheduleEvents.length > 0 ? (
              upcomingScheduleEvents.map(ev => (
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
                    {ev?.time || 'All Day'}
                  </span>
                  <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#0f172a' }}>
                    {ev?.title}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                No upcoming events this month
              </div>
            )}
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
          {/* Celebrations Header with Birthdays & Anniversaries Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '7px' }}>
              <button
                type="button"
                onClick={() => setCelebrationTab('birthdays')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: celebrationTab === 'birthdays' ? '#ffffff' : 'transparent',
                  color: celebrationTab === 'birthdays' ? '#b45309' : '#64748b',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: celebrationTab === 'birthdays' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>🎂 Birthdays</span>
                <span style={{ fontSize: '10px', padding: '0 4px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#b45309' }}>
                  {(computedBirthdays || []).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCelebrationTab('anniversaries')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: celebrationTab === 'anniversaries' ? '#ffffff' : 'transparent',
                  color: celebrationTab === 'anniversaries' ? '#7c3aed' : '#64748b',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: celebrationTab === 'anniversaries' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>🌟 Anniversaries</span>
                <span style={{ fontSize: '10px', padding: '0 4px', borderRadius: '10px', backgroundColor: '#f3e8ff', color: '#7c3aed' }}>
                  {(computedAnniversaries || []).length}
                </span>
              </button>
            </div>

            <button
              onClick={() => navigate('/calendar')}
              style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
            >
              All →
            </button>
          </div>

          {/* List of items with exact Date and Countdown Day Count */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {celebrationTab === 'birthdays' ? (
              (computedBirthdays && computedBirthdays.length > 0 ? computedBirthdays : birthdays || []).slice(0, 3).map(bday => {
                const diffDays = bday?.diffDays ?? 0;
                return (
                  <div
                    key={bday?._id || bday?.employeeId || Math.random()}
                    onClick={() => addToast(`🎉 Birthday greetings sent to ${bday?.name || 'Colleague'}!`, 'success')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <img
                        src={bday?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(bday?.name || 'User')}`}
                        alt={bday?.name}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {bday?.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          🎂 {bday?.role || 'Team Member'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      {/* Kitni Taarik Ko Hai */}
                      <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📅 {bday?.birthdayDate || 'Upcoming'}</span>
                      </div>
                      {/* Din Count (Countdown) */}
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: diffDays === 0 ? '#dcfce7' : (diffDays === 1 ? '#ffedd5' : '#fef3c7'),
                        color: diffDays === 0 ? '#15803d' : (diffDays === 1 ? '#c2410c' : '#b45309'),
                        border: `1px solid ${diffDays === 0 ? '#86efac' : (diffDays === 1 ? '#fed7aa' : '#fde68a')}`
                      }}>
                        {diffDays === 0 ? '🎉 TODAY!' : (diffDays === 1 ? '⏰ Tomorrow' : `⏳ In ${diffDays} days`)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              (computedAnniversaries || []).slice(0, 3).map(anniv => {
                const diffDays = anniv?.diffDays ?? 0;
                return (
                  <div
                    key={anniv?._id || anniv?.employeeId || Math.random()}
                    onClick={() => addToast(`🌟 Work Anniversary congratulations sent to ${anniv?.name || 'Colleague'}!`, 'success')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#faf5ff'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    title="Click to send work anniversary congratulations"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <img
                        src={anniv?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(anniv?.name || 'User')}`}
                        alt={anniv?.name}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {anniv?.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '600' }}>
                          🌟 {anniv?.serviceYearsText} Work Anniversary
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      {/* Kitni Taarik Ko Hai */}
                      <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📅 {anniv?.anniversaryDate || anniv?.annivFormattedDate || 'Upcoming'}</span>
                      </div>
                      {/* Din Count (Countdown) */}
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: diffDays === 0 ? '#dcfce7' : (diffDays === 1 ? '#ffedd5' : '#f5f3ff'),
                        color: diffDays === 0 ? '#15803d' : (diffDays === 1 ? '#c2410c' : '#7c3aed'),
                        border: `1px solid ${diffDays === 0 ? '#86efac' : (diffDays === 1 ? '#fed7aa' : '#ddd6fe')}`
                      }}>
                        {diffDays === 0 ? '🎉 TODAY!' : (diffDays === 1 ? '⏰ Tomorrow' : `⏳ In ${diffDays} days`)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {celebrationTab === 'birthdays' && (!computedBirthdays || computedBirthdays.length === 0) && (
              <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '12px' }}>
                🎂 No birthdays scheduled
              </div>
            )}

            {celebrationTab === 'anniversaries' && (!computedAnniversaries || computedAnniversaries.length === 0) && (
              <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '12px' }}>
                🌟 No work anniversaries scheduled
              </div>
            )}
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
                        onClick={() => setRejectingLeaveTarget(l)}
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
                        📅 {l.startDate} • Sent to {l.appliedToName || 'Reviewer'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '9.5px', fontWeight: '700', backgroundColor: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px' }}>
                        ⏳ Pending Approval
                      </span>
                      <button
                        onClick={() => setCancellingLeaveTarget(l)}
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
            pendingLeaveRequestsForMe.length === 0 && myDecidedLeaves.length === 0 && myPendingLeaves.length === 0 && myRecentLeaves.length === 0 && (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#94a3b8' }}>
                <Plane size={22} style={{ margin: '0 auto 3px' }} />
                <div style={{ fontSize: '11.5px' }}>No leaves today</div>
              </div>
            )
          )}
        </div>

        {/* Right Column: 📢 Company Notices & Announcements */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                📢 Company Notices & Announcements
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '1px 0 0 0' }}>
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

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '430px',
            overflowY: 'auto',
            paddingRight: '2px'
          }}>
            {(notices || []).length > 0 ? (
              (notices || []).map(not => (
                <div
                  key={not?._id || not?.id || Math.random()}
                  onClick={() => setSelectedNotice(not)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#93c5fd';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: not?.isImportant ? '#dc2626' : '#2563eb',
                        backgroundColor: not?.isImportant ? '#fee2e2' : '#eff6ff',
                        padding: '1px 6px',
                        borderRadius: '3px'
                      }}>
                        {not?.category || 'Announcement'}
                      </span>
                      {not?.isImportant && (
                        <span style={{ fontSize: '9.5px', fontWeight: '800', color: '#dc2626' }}>
                          ⚡ Important
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>{not?.date}</span>
                  </div>

                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', lineHeight: '1.3' }}>
                    {not?.title}
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: '1.4' }}>
                    {not?.shortDescription || not?.description}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b' }}>
                    <span>By: <strong>{not?.postedBy || 'HR Admin'}</strong></span>
                    <span style={{ fontSize: '11.5px', color: '#0284c7', fontWeight: '600' }}>View Details →</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8' }}>
                <Bell size={24} style={{ margin: '0 auto 6px', color: '#cbd5e1' }} />
                <div style={{ fontSize: '12px', fontWeight: '600' }}>No active company notices</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Company announcements will appear here</div>
              </div>
            )}
          </div>
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
        onTaskCreated={(newTask) => {
          if (newTask && !isTaskAssignedToUser(newTask, currentUser)) {
            setDashboardTaskScope('delegated');
            setDashboardTaskTab('all');
          } else {
            setDashboardTaskScope('assigned_to_me');
            setDashboardTaskTab('all');
          }
        }}
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

      <PendingTasksModal
        isOpen={isPendingTasksModalOpen}
        onClose={() => setIsPendingTasksModalOpen(false)}
        tasks={isUserAdminOrHR && !isViewingOtherEmployee ? allTasksList.filter(t => !isTaskActuallyCompleted(t)) : myPendingTasks}
        user={effectiveTargetUser}
        initialFilter={pendingTasksModalFilter}
        activeTaskId={displayActiveTask?._id}
        onSelectTask={(task) => {
          setSelectedTask(task);
          setIsPendingTasksModalOpen(false);
        }}
        onStartTimer={(taskId) => {
          if (!isClockedIn) {
            addToast('⚠️ Please Clock In before starting task timers!', 'warning');
            return;
          }
          if (isOnBreak) {
            addToast('☕ You are on break. Please resume work first!', 'warning');
            return;
          }
          startTaskTimer(taskId);
          setActiveSelectedTaskId(taskId);
        }}
        onPauseTimer={(taskId) => {
          pauseTaskTimer(taskId);
        }}
        onCompleteTask={async (taskId) => {
          await completeTask(taskId, '', false);
        }}
      />

      <RejectLeaveModal
        isOpen={!!rejectingLeaveTarget}
        leave={rejectingLeaveTarget}
        onClose={() => setRejectingLeaveTarget(null)}
        onConfirm={(reason) => {
          if (rejectingLeaveTarget?._id) {
            updateLeaveStatus(rejectingLeaveTarget._id, 'rejected', reason);
          }
        }}
      />

      <CancelLeaveModal
        isOpen={!!cancellingLeaveTarget}
        leave={cancellingLeaveTarget}
        isApplicant={true}
        onClose={() => setCancellingLeaveTarget(null)}
        onConfirm={async (reason) => {
          if (cancellingLeaveTarget?._id) {
            await updateLeaveStatus(cancellingLeaveTarget._id, 'cancelled', reason);
          }
        }}
      />
    </div>
  );
};
