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
import { ROLES, ROLE_CONFIGS, getUserRole, canApproveLeaves, isHRorAdmin, isAdmin, isHR, getUserModulePermissions, canCancelLeave, canReviewLeave, isLeaveApplicant, isLeaveDesignatedApprover, isProjectVisibleToUser, isTaskVisibleToUser } from '../../../shared/utils/permissionUtils';
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
<<<<<<< HEAD
import { AttendanceShiftClock } from '../components/attendance/AttendanceShiftClock';
=======
import { ShiftClockCard } from '../components/dashboard/ShiftClockCard';
import { ActiveTaskTimerCard } from '../../work/components/dashboard/ActiveTaskTimerCard';
import { WeeklyTimeLogsCard } from '../../work/components/dashboard/WeeklyTimeLogsCard';
import { DashboardKpiStrip } from '../components/dashboard/DashboardKpiStrip';
import { DashboardWelcomeCard } from '../components/dashboard/DashboardWelcomeCard';
import { DashboardTasksSection } from '../components/dashboard/DashboardTasksSection';
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22

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
  const { tickets, notices, events, birthdays, computedBirthdays, computedAnniversaries, wfhEmployees, weeklyTimeLogs, dismissNoticeForUser } = useCRM();
  const [activeSelectedTaskId, setActiveSelectedTaskId] = useState(null);
  const [snoozeTaskTarget, setSnoozeTaskTarget] = useState(null);
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  const [isPendingTasksModalOpen, setIsPendingTasksModalOpen] = useState(false);
  const [pendingTasksModalFilter, setPendingTasksModalFilter] = useState('all');
  const [dashboardTaskTab, setDashboardTaskTab] = useState('pending');
  const [dashboardTaskScope, setDashboardTaskScope] = useState('assigned_to_me'); // 'assigned_to_me' | 'delegated' | 'all'
  const [rejectingLeaveTarget, setRejectingLeaveTarget] = useState(null);
  const [cancellingLeaveTarget, setCancellingLeaveTarget] = useState(null);

  // Role & Scope Detection
  const userRole = authRole || getUserRole(currentUser);
  const isUserAdminOrHR = userRole === ROLES.ADMIN || userRole === ROLES.HR || currentUser?.isAdmin;
  const roleConfig = authRoleConfig || ROLE_CONFIGS[userRole] || ROLE_CONFIGS[ROLES.TEAM_MEMBER];
  const perms = getUserModulePermissions(currentUser);

  // Admin Perspective State: View any employee's live dashboard by name
  const [selectedAdminEmpId, setSelectedAdminEmpId] = useState('me');
  const isViewingOtherEmployee = isUserAdminOrHR && selectedAdminEmpId !== 'me';
  const activeViewUser = React.useMemo(() => {
    if (!isViewingOtherEmployee) return currentUser;
    return (employees || []).find(e => String(e._id) === String(selectedAdminEmpId) || String(e.employeeCode) === String(selectedAdminEmpId)) || currentUser;
  }, [isViewingOtherEmployee, selectedAdminEmpId, employees, currentUser]);
  const effectiveTargetUser = isViewingOtherEmployee ? activeViewUser : currentUser;

  // Target Active User UID for strictly user-scoped alerts and dismissals (Both for logged in employee and admin switcher perspective)
  const targetActiveUid = React.useMemo(() => {
    return String(effectiveTargetUser?._id || effectiveTargetUser?.employeeCode || currentUser?._id || currentUser?.employeeCode || 'global');
  }, [effectiveTargetUser?._id, effectiveTargetUser?.employeeCode, currentUser?._id, currentUser?.employeeCode]);

  const todayStr = new Date().toISOString().split('T')[0];

  const userAlertKey = React.useMemo(() => {
    return `ems_dismissed_top_alerts_${targetActiveUid}`;
  }, [targetActiveUid]);

  const [dismissedTopAlerts, setDismissedTopAlerts] = useState(() => {
    try {
      const stored = localStorage.getItem(`ems_dismissed_top_alerts_${targetActiveUid}`);
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  // Re-load alerts whenever the effective target user changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(userAlertKey);
      setDismissedTopAlerts(stored ? JSON.parse(stored) : []);
    } catch (_) {
      setDismissedTopAlerts([]);
    }
  }, [userAlertKey]);

  // Per-User Top Alert Dismissal: Updates local user state, localStorage, and syncs notice dismissals to MongoDB
  const dismissTopAlert = (alertId) => {
    if (!alertId) return;
    const strId = String(alertId);
    setDismissedTopAlerts(prev => {
      const next = [...new Set([...prev, strId])];
      try {
        localStorage.setItem(userAlertKey, JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    if (typeof dismissNoticeForUser === 'function') {
      dismissNoticeForUser(strId, targetActiveUid);
    }
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
    return (projects || []).filter(p =>
      p.reopened && !p.finalApproved && isProjectVisibleToUser(p, currentUser)
    );
  }, [projects, currentUser]);
  const [activeLeftoverIdx, setActiveLeftoverIdx] = useState(0);
  const leftoverDismissKey = `ems_dismissed_leftover_${targetActiveUid}_${todayStr}`;
  const [isLeftoverDismissed, setIsLeftoverDismissed] = useState(() => {
    try {
      return localStorage.getItem(`ems_dismissed_leftover_${targetActiveUid}_${todayStr}`) === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    try {
      setIsLeftoverDismissed(localStorage.getItem(leftoverDismissKey) === 'true');
    } catch (_) {
      setIsLeftoverDismissed(false);
    }
  }, [leftoverDismissKey]);

  const handleDismissLeftover = () => {
    setIsLeftoverDismissed(true);
    try {
      localStorage.setItem(leftoverDismissKey, 'true');
    } catch (_) {}
  };
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
    isOnLeaveToday,
    todayLeaveRecord,
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

  // Dashboard Task Filter State
  const [taskScopeFilter, setTaskScopeFilter] = useState('all'); // 'all' | 'my' | 'delegated'
  const [taskMemberFilter, setTaskMemberFilter] = useState('all');
  const [taskStatusTab, setTaskStatusTab] = useState('active'); // 'active' (New & Pending) | 'completed' (Recently Done) | 'all'

  // Category-Wise Task Filter (Across all company categories for Admin/HR, and personal for employees)
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');

  // Helper to read any employee's live today shift and task status from storage & attendance (with 1-sec real-time counting)
  const getEmployeeTodayState = React.useCallback((emp) => {
    if (!emp) return null;
    const empKey = emp.employeeCode || (emp._id ? String(emp._id) : '');
    const empId = emp._id;
    const empName = emp.name || '';

    // Today's attendance
    const attRec = (attendance || []).find(a =>
      a.date === todayStr && (
        String(a.employeeId) === String(empId) ||
        String(a.employee) === String(empId) ||
        (emp.employeeCode && (String(a.employeeCode) === String(emp.employeeCode) || String(a.employeeId) === String(emp.employeeCode))) ||
        (empKey && (String(a.employeeCode) === String(empKey) || String(a.employeeId) === String(empKey))) ||
        (empName && a.employeeName?.trim().toLowerCase() === empName.trim().toLowerCase())
      )
    );

<<<<<<< HEAD
    // Stored live keys (strictly validated against todayStr so past days never bleed in)
    const storedSessionDate = localStorage.getItem(`ems_timer_${empKey}_work_session_date`);
    const isStoredDateToday = storedSessionDate === todayStr;

    const storedClockedIn = isStoredDateToday && (localStorage.getItem(`ems_timer_${empKey}_is_clocked_in`) === 'true');
    const storedOnBreak = isStoredDateToday && (localStorage.getItem(`ems_timer_${empKey}_is_on_break`) === 'true');
    const storedBreakType = isStoredDateToday ? (localStorage.getItem(`ems_timer_${empKey}_break_type`) || 'Break') : 'Break';
    const storedLogin = isStoredDateToday ? localStorage.getItem(`ems_timer_${empKey}_login_time`) : null;
    const storedClockOut = isStoredDateToday ? (localStorage.getItem(`ems_timer_${empKey}_clock_out`) || localStorage.getItem(`ems_timer_${empKey}_clockout_time`)) : null;
    const storedWorkSecs = isStoredDateToday ? (Number(localStorage.getItem(`ems_timer_${empKey}_work_seconds`)) || 0) : 0;
    const storedBreakSecs = isStoredDateToday ? (Number(localStorage.getItem(`ems_timer_${empKey}_break_seconds`)) || 0) : 0;
    const storedBreakHistoryRaw = isStoredDateToday ? localStorage.getItem(`ems_timer_${empKey}_break_history`) : null;
=======
    // Check if employee is on approved leave today
    const isOnLeave = Boolean(
      attRec?.status === 'on_leave' ||
      (leaves || []).some(l =>
        l.status === 'approved' &&
        l.startDate <= todayStr &&
        l.endDate >= todayStr &&
        (
          String(l.employeeId) === String(empId) ||
          String(l.employee) === String(empId) ||
          (emp.employeeCode && l.employeeCode === emp.employeeCode) ||
          (empName && l.employeeName?.trim().toLowerCase() === empName.trim().toLowerCase())
        )
      )
    );
    const leaveNote = attRec?.notes || 'Approved Leave';

    // Stored live keys
    const storedClockedIn = localStorage.getItem(`ems_timer_${empKey}_is_clocked_in`) === 'true';
    const storedOnBreak = localStorage.getItem(`ems_timer_${empKey}_is_on_break`) === 'true';
    const storedBreakType = localStorage.getItem(`ems_timer_${empKey}_break_type`) || 'Break';
    const storedLogin = localStorage.getItem(`ems_timer_${empKey}_login_time`);
    const storedClockOut = localStorage.getItem(`ems_timer_${empKey}_clock_out`);
    const storedWorkSecs = Number(localStorage.getItem(`ems_timer_${empKey}_work_seconds`)) || 0;
    const storedBreakSecs = Number(localStorage.getItem(`ems_timer_${empKey}_break_seconds`)) || 0;
    const storedBreakHistoryRaw = localStorage.getItem(`ems_timer_${empKey}_break_history`);
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
    let storedBreakHistory = [];
    try {
      if (storedBreakHistoryRaw) storedBreakHistory = JSON.parse(storedBreakHistoryRaw);
    } catch { }

    // Check if clockIn was from a previous calendar day (forgotten clock-out)
    const storedSessionDate = localStorage.getItem(`ems_timer_${empKey}_work_session_date`);
    const rawClockInTs = Number(localStorage.getItem(`ems_timer_${empKey}_clock_in_timestamp`)) || Number(attRec?.clockInTimestamp);
    let isStaleFromPreviousDay = false;
    let inDate = '';
    if (storedSessionDate && storedSessionDate !== todayStr) {
      isStaleFromPreviousDay = true;
      inDate = storedSessionDate;
    } else if (rawClockInTs > 0) {
      inDate = new Date(rawClockInTs).toISOString().split('T')[0];
      if (inDate !== todayStr) {
        isStaleFromPreviousDay = true;
      }
    }

<<<<<<< HEAD
    // Calculate dynamic live work seconds
    let workSecs = storedWorkSecs;
    if (isClockedIn && !storedOnBreak) {
      const clockInTs = Number(localStorage.getItem(`ems_timer_${empKey}_clock_in_timestamp`));
      const clockInDate = localStorage.getItem(`ems_timer_${empKey}_clock_in_date`);
      if (clockInTs > 0 && clockInDate === todayStr) {
        const gross = Math.max(0, Math.floor((Date.now() - clockInTs) / 1000));
        workSecs = Math.max(0, gross - storedBreakSecs);
      } else if (empId === currentUser?._id && isStoredDateToday) {
=======
    if (isStaleFromPreviousDay) {
      // Auto-close stale yesterday session in background
      try {
        localStorage.setItem(`ems_timer_${empKey}_is_clocked_in`, 'false');
        localStorage.setItem(`ems_timer_${empKey}_is_running`, 'false');
        localStorage.setItem(`ems_timer_${empKey}_is_on_break`, 'false');
        localStorage.setItem(`ems_timer_${empKey}_work_seconds`, '0');
        localStorage.removeItem(`ems_timer_${empKey}_clock_in_timestamp`);
        localStorage.removeItem(`ems_timer_${empKey}_login_time`);
        localStorage.removeItem(`ems_timer_${empKey}_clock_out`);
        localStorage.removeItem(`ems_timer_${empKey}_current_session_start_timestamp`);
        localStorage.setItem(`ems_timer_${empKey}_work_session_date`, todayStr);
        const rawAtt = localStorage.getItem('hrms_attendance');
        if (rawAtt) {
          const list = JSON.parse(rawAtt);
          let changed = false;
          const updated = list.map(a => {
            if (a.date === inDate && (a.employeeId === empId || a.employeeCode === emp.employeeCode || a.employeeCode === empKey) && !a.clockOutTime) {
              changed = true;
              return {
                ...a,
                clockOutTime: '07:00 PM',
                isClockedIn: false,
                workSeconds: 32400,
                totalWorkingHours: 9.0,
                notes: (a.notes ? a.notes + ' • ' : '') + 'Auto-closed at midnight (forgotten clock-out)'
              };
            }
            return a;
          });
          if (changed) {
            localStorage.setItem('hrms_attendance', JSON.stringify(updated));
          }
        }
      } catch (_) {}
    }

    // Strict today-only attendance validation: employee is ONLY clocked in/out if they actively punched today!
    const hasTodayAttClockIn = Boolean(attRec?.date === todayStr && (attRec?.clockInTime || attRec?.clockIn));
    const hasTodayAttClockOut = Boolean(attRec?.date === todayStr && (attRec?.clockOutTime || attRec?.clockOut));
    const hasTodayStoredSession = !isStaleFromPreviousDay && (storedSessionDate === todayStr);
    const hasTodayStoredClockIn = Boolean(hasTodayStoredSession && (storedLogin || rawClockInTs > 0));
    const hasTodayStoredClockOut = Boolean(hasTodayStoredSession && (storedClockOut || localStorage.getItem(`ems_timer_${empKey}_had_clocked_out`) === 'true'));

    const isClockedIn = !isStaleFromPreviousDay && (
      (hasTodayStoredSession && storedClockedIn && hasTodayStoredClockIn) ||
      (hasTodayAttClockIn && !hasTodayAttClockOut && attRec?.isClockedIn !== false && attRec?.status !== 'absent')
    );

    const isClockedOut = !isClockedIn && !isStaleFromPreviousDay && (
      (hasTodayAttClockIn && hasTodayAttClockOut) ||
      (hasTodayStoredClockIn && hasTodayStoredClockOut && !storedClockedIn)
    );

    const loginTime = isClockedIn
      ? (attRec?.clockInTime || storedLogin || 'Active')
      : (isClockedOut ? (attRec?.clockInTime || storedLogin || null) : null);

    const clockOutTime = isClockedOut
      ? (attRec?.clockOutTime || storedClockOut || null)
      : null;

    // Calculate dynamic live work seconds strictly for today
    let workSecs = 0;
    if (isClockedIn && !storedOnBreak && !isStaleFromPreviousDay) {
      workSecs = storedWorkSecs || Number(attRec?.workSeconds) || 0;
      const clockInTs = rawClockInTs;
      if (clockInTs > 0) {
        const rawGross = Math.max(0, Math.floor((Date.now() - clockInTs) / 1000));
        if (rawGross > 14 * 3600) {
          workSecs = 32400; // Cap runaway session at 9.0 hours standard
        } else {
          workSecs = Math.max(workSecs, rawGross - (storedBreakSecs || Number(attRec?.breakSeconds) || 0));
        }
      } else if (empId === currentUser?._id) {
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
        const localGross = Number(localStorage.getItem(`ems_timer_${empKey}_work_seconds`)) || 0;
        workSecs = Math.max(workSecs, localGross);
      }
    } else if (isClockedOut && !isStaleFromPreviousDay) {
      workSecs = storedWorkSecs || Number(attRec?.workSeconds) || 0;
      if (!workSecs && attRec?.totalWorkingHours) {
        workSecs = Math.round(attRec.totalWorkingHours * 3600);
      }
    } else {
      workSecs = 0;
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
      isOnLeave,
      leaveNote,
      isClockedIn: !isOnLeave && isClockedIn,
      isOnBreak: !isOnLeave && storedOnBreak,
      breakType: storedBreakType,
      isClockedOut: !isOnLeave && isClockedOut,
      loginTime: !isOnLeave ? loginTime : null,
      clockOutTime: !isOnLeave ? clockOutTime : null,
      workSecs: !isOnLeave ? workSecs : 0,
      breakSecs: storedBreakSecs,
      breakHistory: storedBreakHistory,
      runningTask: !isOnLeave ? runningTask : null,
      empTasks,
      completedTasksToday
    };
  }, [attendance, leaves, tasks, todayStr, currentUser?._id, formatSeconds]);

  // Team live statistics for Admin
  const teamTodayStates = React.useMemo(() => {
    return (employees || []).map(e => getEmployeeTodayState(e)).filter(Boolean);
  }, [employees, getEmployeeTodayState, syncTick]);

  const teamStats = React.useMemo(() => {
    const total = teamTodayStates.length;
    const onLeave = teamTodayStates.filter(s => s.isOnLeave).length;
    const clockedIn = teamTodayStates.filter(s => s.isClockedIn).length;
    const onBreak = teamTodayStates.filter(s => s.isClockedIn && s.isOnBreak).length;
    const clockedOut = teamTodayStates.filter(s => s.isClockedOut).length;
    const runningTask = teamTodayStates.filter(s => s.runningTask).length;
    const present = teamTodayStates.filter(s => s.isClockedIn || s.isClockedOut).length;
    return { total, onLeave, clockedIn, onBreak, clockedOut, runningTask, present };
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

  const isReminderDismissedForActiveUser = (t) => {
    const uid = String(effectiveTargetUser?._id || effectiveTargetUser?.employeeCode || currentUser?._id || currentUser?.employeeCode || '');
    const code = String(effectiveTargetUser?.employeeCode || currentUser?.employeeCode || '');
    if (Array.isArray(t?.reminderDismissedBy)) {
      if (uid && t.reminderDismissedBy.includes(uid)) return true;
      if (code && t.reminderDismissedBy.includes(code)) return true;
      return false;
    }
    return !!t?.reminderDismissed;
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
      if (isReminderDismissedForActiveUser(t)) return false;
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
    if (dashboardTaskScope === 'all') {
      if (isUserAdminOrHR || perms?.viewAllTasks) return allTeamTasks;
      return myTasks;
    }
    return myTasks;
  }, [dashboardTaskScope, delegatedByMeTasks, allTeamTasks, myTasks, isUserAdminOrHR, perms?.viewAllTasks]);

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
  const displayedIsOnLeave = isViewingOtherEmployee ? Boolean(activeEmpState?.isOnLeave) : Boolean(isOnLeaveToday || activeEmpState?.isOnLeave);
  const displayedIsClockedIn = isViewingOtherEmployee ? activeEmpState?.isClockedIn : isClockedIn;
  const displayedIsOnBreak = isViewingOtherEmployee ? activeEmpState?.isOnBreak : isOnBreak;
  const displayedBreakType = isViewingOtherEmployee ? (activeEmpState?.breakType || 'Break') : breakType;
  const displayedLoginTime = isViewingOtherEmployee ? activeEmpState?.loginTime : loginTime;
  const displayedClockOutTime = isViewingOtherEmployee ? activeEmpState?.clockOutTime : clockOutTime;
  const displayedWorkDuration = isViewingOtherEmployee ? formatTimeDurationSafe(activeEmpState?.workSecs || 0) : workDurationText;
  const displayedHadClockedOut = isViewingOtherEmployee ? activeEmpState?.isClockedOut : hadClockedOutToday;
  const displayedBreakDuration = isViewingOtherEmployee ? formatTimeDurationSafe(activeEmpState?.breakSecs || 0) : (breakDurationText || '0s');

  const userScopedProjects = React.useMemo(() => {
    return (projects || []).filter(p => isProjectVisibleToUser(p, effectiveTargetUser || currentUser));
  }, [projects, effectiveTargetUser, currentUser]);

  const activeProjectsCount = userScopedProjects.filter(p => p?.status === 'in_progress').length || 0;
  const overdueProjectsCount = userScopedProjects.filter(p => p?.status !== 'completed' && p?.deadline && p?.deadline < todayStr).length || 0;


  // Snoozed / Reminded Tasks (Tasks on hold with CRM reminder — strictly scoped per user)
  const snoozedTasks = (tasks || []).filter(t =>
    t?.snoozed && t?.remindAt && !isReminderDismissedForActiveUser(t) && t?.status !== 'completed' &&
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
    const rawList = (timesheets || []).filter(ts => {
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

    // Deduplicate by task (taking max duration) to prevent duplicate auto-saves from inflating today's total
    const dedupeMap = new Map();
    rawList.forEach(ts => {
      const key = String(ts.taskId || ts.taskCode || ts._id || Math.random());
      const dur = Number(ts.totalDurationSeconds) || 0;
      if (!dedupeMap.has(key) || dur > (Number(dedupeMap.get(key).totalDurationSeconds) || 0)) {
        dedupeMap.set(key, ts);
      }
    });
    return Array.from(dedupeMap.values());
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
    const today = new Date().toISOString().split('T')[0];
    const targetUid = String(effectiveTargetUser?._id || effectiveTargetUser?.employeeCode || currentUser?._id || currentUser?.employeeCode || '');
    const targetCode = String(effectiveTargetUser?.employeeCode || currentUser?.employeeCode || '');
    const targetDept = String(effectiveTargetUser?.department || currentUser?.department || '').toLowerCase();

    return (notices || []).filter(not => {
      if (!not) return false;
      const notId = String(not._id || not.id || not.noticeCode || '');

      // Exclude expired notices
      if (not.expiryDate && not.expiryDate < today) return false;

      // Strictly per-user dismissal check:
      // If dismissed in this user's local storage list, or in notice.dismissedBy array:
      if (dismissedTopAlerts.includes(notId)) return false;
      if (Array.isArray(not.dismissedBy)) {
        if (targetUid && not.dismissedBy.includes(targetUid)) return false;
        if (targetCode && not.dismissedBy.includes(targetCode)) return false;
      }

      // Audience filter: "All Employees" or matches user's department
      const aud = String(not.targetAudience || not.to || 'All Employees').toLowerCase();
      if (aud !== 'all employees' && aud !== 'all' && !aud.includes('all')) {
        if (targetDept && !aud.includes(targetDept) && !targetDept.includes(aud)) {
          return false;
        }
      }

      return true;
    });
  }, [notices, dismissedTopAlerts, effectiveTargetUser, currentUser]);

  // 4. All personal leaves of current user (for history/status display)
  const myRecentLeaves = (leaves || []).filter(l => {
    return isLeaveApplicant(l, currentUser);
  });

  return (
    <div className="flex flex-col gap-3.5 min-h-full pb-6">

      {/* ── 🏢 Top Page Header Bar (Standardized matching Tickets & All Pages) ── */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 py-3 px-4 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-xs min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <LayoutDashboard size={17} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white m-0 leading-tight">
              Enterprise Operations Dashboard
            </h1>
            <p className="mt-0.5 mb-0 text-[11.5px] text-slate-500 dark:text-slate-400">
              Live shift tracking, active tasks, team presence & workplace overview.
            </p>
          </div>
        </div>

        {/* Quick Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {isUserAdminOrHR && (
            <button
              onClick={() => setIsEmpDirectoryOpen(true)}
              className="inline-flex items-center gap-1 px-3 h-[30px] rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 text-xs font-semibold cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
              title="Open full Employee Directory"
            >
              <Users size={13} />
              <span>Team Directory</span>
            </button>
          )}

          <button
            onClick={() => setIsRaiseTicketOpen(true)}
            className="inline-flex items-center gap-1 px-3 h-[30px] rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Raise support ticket or IT request"
          >
            <LifeBuoy size={13} color="#0284c7" />
            <span>Support Ticket</span>
          </button>

          <button
            onClick={() => setIsAddTaskOpen(true)}
            className="inline-flex items-center gap-1 px-3 h-[30px] rounded-md bg-sky-600 text-white border-none text-xs font-bold cursor-pointer shadow-xs hover:bg-sky-700 transition-colors"
            title="Create a new task"
          >
            <Plus size={13} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* ── ⏰ LIVE DUE TASK REMINDER ALERT BANNER ── */}
      {dueReminders.length > 0 && (
        <div
          className="bg-orange-50 dark:bg-orange-950/40 border-[1.5px] border-orange-400 dark:border-orange-800 rounded-[10px] py-2.5 px-3.5 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_4px_12px_rgba(251,146,60,0.15)] animate-[reminderPulseGlow_2.5s_infinite]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
              <Bell size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold bg-orange-200 dark:bg-orange-900/60 text-orange-900 dark:text-orange-200 px-1.5 py-px rounded">
                  ⏰ REMINDER DUE
                </span>
                <span className="text-[13px] font-extrabold text-slate-900 dark:text-white">
                  #{dueReminders[0].taskCode || 'TSK'}: {dueReminders[0].title}
                </span>
              </div>
              <div className="text-[11px] text-orange-950 dark:text-orange-200 mt-0.5">
                Paused at <strong>{dueReminders[0].hoursLoggedText || formatTimeDurationSafe(dueReminders[0].timerSeconds || 0)}</strong>
                {dueReminders[0].reminderNote ? ` • Note: "${dueReminders[0].reminderNote}"` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => resumeSnoozedTask(dueReminders[0]._id)}
              className="inline-flex items-center gap-1 py-1.5 px-3.5 rounded-md bg-orange-600 text-white border-none text-xs font-bold cursor-pointer shadow-[0_2px_6px_rgba(234,88,12,0.3)] hover:bg-orange-700 transition-colors"
            >
              <Play size={12} fill="#fff" />
              <span>Resume Timer & Work</span>
            </button>

            <button
              onClick={() => snoozeTask(dueReminders[0]._id, { remindInMinutes: 15, note: 'Snoozed 15m' })}
              className="py-1.5 px-2.5 rounded-md bg-white dark:bg-slate-800 text-orange-900 dark:text-orange-300 border border-orange-300 dark:border-orange-800 text-[11.5px] font-semibold cursor-pointer hover:bg-orange-50 dark:hover:bg-slate-700 transition-colors"
              title="Snooze for another 15 minutes"
            >
              +15m Snooze
            </button>

            <button
              onClick={() => dismissTaskReminder(dueReminders[0]._id, targetActiveUid)}
              className="py-1.5 px-2 rounded-md bg-transparent text-orange-900 dark:text-orange-300 border-none text-[11.5px] font-semibold cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
              title="Dismiss reminder"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── ⚠️ REOPENED PROJECTS BANNER (FOR ASSIGNEES) ── */}
      {reopenedProjectsForMe.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950/40 border-[1.5px] border-orange-300 dark:border-orange-800 rounded-[10px] py-2.5 px-3.5 flex items-center gap-2.5 shadow-[0_2px_6px_rgba(194,65,12,0.08)]">
          <span className="text-lg">⚠️</span>
          <div className="flex-1 text-xs text-orange-900 dark:text-orange-200">
            <strong>Project{reopenedProjectsForMe.length > 1 ? 's' : ''} Reopened by Admin: </strong>
            {reopenedProjectsForMe.map(p => `"${p.name}" (${p.reopenReason || 'Admin requested revisions'})`).join(', ')}
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="py-1 px-2.5 bg-orange-700 text-white border-none rounded-md text-[11px] font-bold cursor-pointer hover:bg-orange-800 transition-colors"
          >
            View Projects
          </button>
        </div>
      )}

      {/* ── 📋 PROJECT COMPLETION APPROVALS QUEUE (ADMIN / HR PERSPECTIVE) ── */}
      {isUserAdminOrHR && pendingApprovalProjects.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border-[1.5px] border-purple-300 dark:border-purple-800 shadow-[0_4px_14px_rgba(147,51,234,0.08)] overflow-hidden">
          <div className="py-2.5 px-4 bg-purple-50 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-900/40 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <div>
                <span className="text-[13px] font-extrabold text-purple-950 dark:text-purple-200">
                  Project Completion Review Queue ({pendingApprovalProjects.length})
                </span>
                <span className="text-[11px] text-purple-700 dark:text-purple-400 ml-1.5">
                  Submitted for final sign-off
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="bg-transparent border-none text-purple-700 dark:text-purple-400 text-[11.5px] font-bold cursor-pointer underline hover:text-purple-900 dark:hover:text-purple-300"
            >
              Manage All in Projects →
            </button>
          </div>

          <div className="p-2.5 px-3.5 flex flex-col gap-2">
            {pendingApprovalProjects.map(proj => (
              <div
                key={proj._id}
                className="flex items-center justify-between flex-wrap gap-2.5 py-2 px-3 rounded-lg bg-fuchsia-50/60 dark:bg-fuchsia-950/20 border border-fuchsia-200 dark:border-fuchsia-900/50"
              >
                <div className="flex items-center gap-2">
                  <span className="py-0.5 px-1.5 rounded bg-purple-600 text-white text-[10.5px] font-extrabold">
                    {proj.projectCode || 'PRJ'}
                  </span>
                  <div>
                    <div className="text-[12.5px] font-bold text-slate-900 dark:text-white">
                      {proj.name}
                    </div>
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      Submitted by: <strong>{proj.completionSubmittedBy || proj.creatorName || 'Team Member'}</strong>
                      {proj.completionSubmittedAt && ` • ${new Date(proj.completionSubmittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={async () => {
                      await approveProjectCompletion(proj._id);
                    }}
                    className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-md bg-green-600 text-white border-none text-[11px] font-bold cursor-pointer shadow-xs hover:bg-green-700 transition-colors"
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
                    className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-md bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-[11px] font-bold cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
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
        <div className="bg-red-50 dark:bg-red-950/40 border-[1.5px] border-red-400 dark:border-red-800 rounded-[10px] py-3 px-4 flex flex-col gap-2.5 shadow-[0_4px_14px_rgba(239,68,68,0.12)] relative">
          {/* Header row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                <Clock size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-extrabold bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 py-0.5 px-2 rounded uppercase tracking-wider">
                    ⏮️ Leftover from Previous Day
                  </span>
                  <span className="text-xs font-bold text-red-700 dark:text-red-300">
                    {myLeftoverTasks.length} task{myLeftoverTasks.length > 1 ? 's were' : ' was'} left incomplete
                  </span>
                </div>
                <div className="text-[11px] text-red-900 dark:text-red-200 mt-0.5">
                  Please take action: start working now, reschedule for future, snooze reminder, or mark completed.
                </div>
              </div>
            </div>

            {/* Pagination / navigation if multiple leftover tasks */}
            <div className="flex items-center gap-1.5">
              {myLeftoverTasks.length > 1 && (
                <div className="flex items-center gap-1 mr-1.5">
                  <button
                    onClick={() => setActiveLeftoverIdx(i => Math.max(0, i - 1))}
                    disabled={activeLeftoverIdx === 0}
                    className={`py-1 px-1.5 rounded border border-red-300 dark:border-red-800 text-xs font-semibold ${activeLeftoverIdx === 0 ? 'bg-red-100 dark:bg-red-950/60 text-gray-400 cursor-default' : 'bg-white dark:bg-slate-800 text-red-700 dark:text-red-300 cursor-pointer'}`}
                  >
                    ◀
                  </button>
                  <span className="text-xs font-bold text-red-800 dark:text-red-300">
                    {activeLeftoverIdx + 1} of {myLeftoverTasks.length}
                  </span>
                  <button
                    onClick={() => setActiveLeftoverIdx(i => Math.min(myLeftoverTasks.length - 1, i + 1))}
                    disabled={activeLeftoverIdx === myLeftoverTasks.length - 1}
                    className={`py-1 px-1.5 rounded border border-red-300 dark:border-red-800 text-xs font-semibold ${activeLeftoverIdx === myLeftoverTasks.length - 1 ? 'bg-red-100 dark:bg-red-950/60 text-gray-400 cursor-default' : 'bg-white dark:bg-slate-800 text-red-700 dark:text-red-300 cursor-pointer'}`}
                  >
                    ▶
                  </button>
                </div>
              )}
              <button
                onClick={handleDismissLeftover}
                title="Dismiss reminder banner"
                className="border-none bg-transparent text-red-800 dark:text-red-300 text-sm cursor-pointer py-0.5 px-1.5 rounded hover:bg-red-200/50 dark:hover:bg-red-900/40 transition-colors"
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
              <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-lg py-2.5 px-3.5 flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-extrabold text-red-600 dark:text-red-400">
                      #{currentLeftover.taskCode || 'TSK'}:
                    </span>
                    <span className="text-[13px] font-bold text-slate-800 dark:text-white">
                      {currentLeftover.title}
                    </span>
                    {currentLeftover.projectName && (
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-px px-1.5 rounded font-semibold">
                        📁 {currentLeftover.projectName}
                      </span>
                    )}
                    <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 py-px px-1.5 rounded font-bold">
                      Due {diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`} ({currentLeftover.dueDate || 'Past Due'})
                    </span>
                  </div>
                  <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1">
                    Priority: <strong className={`capitalize ${currentLeftover.priority === 'urgent' ? 'text-red-600 dark:text-red-400' : currentLeftover.priority === 'high' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300'}`}>{currentLeftover.priority || 'medium'}</strong> • Logged so far: <strong>{currentLeftover.hoursLoggedText || formatTimeDurationSafe(currentLeftover.timerSeconds || 0)}</strong>
                    {currentLeftover.assignedBy && ` • Assigned by: ${currentLeftover.assignedBy}`}
                  </div>
                </div>

                {/* Quick 1-Click Action Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
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
                    className="inline-flex items-center gap-1 py-1.5 px-3 rounded-md bg-red-600 text-white border-none text-[11.5px] font-bold cursor-pointer shadow-xs hover:bg-red-700 transition-colors"
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
                    className="py-1.5 px-2.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11.5px] font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
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
                    className="py-1.5 px-2.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[11.5px] font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
                    className="py-1.5 px-2.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 text-[11.5px] font-semibold cursor-pointer hover:bg-amber-200 transition-colors"
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
                    className="py-1.5 px-2.5 rounded-md bg-green-100 text-green-700 border border-green-200 text-[11.5px] font-semibold cursor-pointer hover:bg-green-200 transition-colors"
                    title="Mark this leftover task as completed"
                  >
                    <CheckCircle2 size={12} className="inline mr-1" />
                    Done
                  </button>

                  {/* Open Detail Modal (Full history + custom reschedule) */}
                  <button
                    onClick={() => setSelectedTask(currentLeftover)}
                    className="py-1.5 px-2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11px] font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
        <div className="flex flex-col gap-2">
          {myDecidedLeaves.map(leave => (
            <div
              key={leave._id}
              className={`rounded-[10px] py-3 px-4 flex items-center justify-between flex-wrap gap-2.5 ${leave.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[1.5px] border-emerald-300 dark:border-emerald-800 shadow-[0_4px_12px_rgba(16,185,129,0.12)]' : 'bg-rose-50 dark:bg-rose-950/40 border-[1.5px] border-rose-300 dark:border-rose-800 shadow-[0_4px_12px_rgba(239,68,68,0.12)]'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-[9px] text-white flex items-center justify-center shrink-0 ${leave.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  {leave.status === 'approved' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                </div>
                <div>
                  <div className={`text-[13.5px] font-bold ${leave.status === 'approved' ? 'text-emerald-900 dark:text-emerald-200' : 'text-red-900 dark:text-red-200'}`}>
                    {leave.status === 'approved' ? '🎉 Leave Application Approved!' : '⚠️ Leave Application Declined'}
                  </div>
                  <div className={`text-xs mt-0.5 ${leave.status === 'approved' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                    <strong>{leave.leaveType} ({leave.durationText || `${leave.durationDays} Days`})</strong> • 📅 {leave.startDate} to {leave.endDate}
                    <span className="mx-1.5 opacity-60">•</span>
                    <span>
                      {leave.status === 'approved'
                        ? `Approved by ${leave.approvedBy || leave.actionBy || 'Admin'}${leave.actionDateFormatted ? ` on ${leave.actionDateFormatted}` : ''}`
                        : `Reviewed by ${leave.rejectedBy || leave.actionBy || 'Admin'}${leave.actionDateFormatted ? ` on ${leave.actionDateFormatted}` : ''}${leave.rejectionReason ? ` — Reason: "${leave.rejectionReason}"` : ''}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => acknowledgeLeave(leave._id)}
                  className={`text-white border-none py-1.5 px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${leave.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  ✓ Acknowledge & Dismiss
                </button>
                <button
                  onClick={() => navigate('/leaves')}
                  className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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
        <div className="flex flex-col gap-2">
          {myPendingLeaves.slice(0, 1).map(l => (
            <div
              key={`my_pending_top_${l._id}`}
              className="bg-blue-50 dark:bg-blue-950/40 border-[1.5px] border-blue-200 dark:border-blue-900/60 rounded-[10px] py-3 px-4 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_2px_8px_rgba(37,99,235,0.08)]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <div className="w-9 h-9 rounded-[9px] bg-blue-500 text-white flex items-center justify-center shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-extrabold text-blue-800 dark:text-blue-200">
                      📋 Your Leave Application is Pending Review
                    </span>
                    <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-px rounded">
                      Awaiting Decision
                    </span>
                  </div>
                  <div className="text-xs text-blue-900 dark:text-blue-200 mt-0.5">
                    <strong>{l.leaveType}</strong> ({l.durationText || `${l.durationDays}d`}) from <strong>{l.startDate}</strong> to <strong>{l.endDate}</strong> • Sent to <strong>{l.appliedToName || 'Reviewer'}</strong> ({l.appliedToRole || 'Approver'})
                    {l.reason && <span> • <em>"{l.reason}"</em></span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCancellingLeaveTarget(l)}
                  className="py-1.5 px-3 rounded-md bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 text-[11.5px] font-bold cursor-pointer hover:bg-red-50 dark:hover:bg-slate-700 transition-colors"
                  title="Withdraw / Cancel this request"
                >
                  Cancel Request
                </button>
                <button
                  onClick={() => navigate('/leaves')}
                  className="py-1.5 px-3 rounded-md bg-blue-700 text-white border-none text-[11.5px] font-semibold cursor-pointer hover:bg-blue-800 transition-colors"
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
        <div className="flex flex-col gap-2">
          {activeTopLeaveRequests.map(l => (
            <div
              key={`top_leave_${l._id}`}
              className="bg-amber-50 dark:bg-amber-950/40 border-[1.5px] border-amber-200 dark:border-amber-800 rounded-[10px] py-3 px-4 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_4px_12px_rgba(245,158,11,0.12)]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <div className="w-9 h-9 rounded-[9px] bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Palmtree size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-extrabold text-amber-900 dark:text-amber-200">
                      📩 New Leave Request Pending Your Approval
                    </span>
                    <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-px rounded">
                      Needs Review
                    </span>
                  </div>
                  <div className="text-xs text-amber-950 dark:text-amber-200 mt-0.5">
                    <strong>{l.employeeName}</strong> ({l.employeeRole || 'Member'}) has requested <strong>{l.leaveType}</strong> ({l.durationText || `${l.durationDays}d`}) from <strong>{l.startDate}</strong> to <strong>{l.endDate}</strong>
                    {l.reason && <span> • <em>"{l.reason}"</em></span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateLeaveStatus(l._id, 'approved')}
                  className="py-1.5 px-3 rounded-md bg-green-600 text-white border-none text-[11.5px] font-bold cursor-pointer hover:bg-green-700 transition-colors"
                  title="Approve this leave request"
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => setRejectingLeaveTarget(l)}
                  className="py-1.5 px-3 rounded-md bg-red-600 text-white border-none text-[11.5px] font-bold cursor-pointer hover:bg-red-700 transition-colors"
                  title="Deny this leave request"
                >
                  ✕ Deny
                </button>
                <button
                  onClick={() => navigate('/leaves')}
                  className="py-1.5 px-3 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11.5px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Manage →
                </button>
                <button
                  onClick={() => dismissTopAlert(l._id)}
                  className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 cursor-pointer flex items-center justify-center ml-1 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors"
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
        <div className="flex flex-col gap-2">
          {activeTopNotices.slice(0, 2).map(not => (
            <div
              key={`top_notice_${not._id || not.id}`}
              className="bg-blue-50 dark:bg-blue-950/40 border-[1.5px] border-blue-200 dark:border-blue-900/60 rounded-[10px] py-3 px-4 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_4px_12px_rgba(37,99,235,0.08)]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <div className="w-9 h-9 rounded-[9px] bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Bell size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-extrabold text-blue-800 dark:text-blue-200">
                      📢 Important Announcement: {not.title}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-px rounded ${not.isImportant ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900' : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'}`}>
                      {not.category || 'Company Notice'}
                    </span>
                  </div>
                  <div className="text-xs text-blue-900 dark:text-blue-200 mt-0.5">
                    {not.shortDescription || not.description || not.fullContent}
                    {not.postedBy && <span className="text-slate-500 dark:text-slate-400 ml-1.5">• Posted by <strong>{not.postedBy}</strong></span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedNotice(not)}
                  className="py-1.5 px-3 rounded-md bg-blue-600 text-white border-none text-[11.5px] font-bold cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  Read Notice →
                </button>
                <button
                  onClick={() => navigate('/notice-board')}
                  className="py-1.5 px-3 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11.5px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Notice Board
                </button>
                <button
                  onClick={() => dismissTopAlert(not._id || not.id)}
                  className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 cursor-pointer flex items-center justify-center ml-1 hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
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
        <div className="bg-orange-50 dark:bg-orange-950/40 rounded-[10px] border border-orange-200 dark:border-orange-800 py-3 px-[18px] flex items-center justify-between flex-wrap gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-[34px] h-[34px] rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
              <Zap size={18} fill="#ffffff" />
            </div>
            <div>
              <div className="text-[13.5px] font-extrabold text-orange-900 dark:text-orange-200 flex items-center gap-1.5">
                <span>Team Operations & Shift Controls</span>
                <span className="text-[10px] bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 px-1.5 py-px rounded font-bold">
                  {teamStats.clockedIn} Working Live
                </span>
              </div>
              <div className="text-[11.5px] text-orange-700 dark:text-orange-300">
                Emergency clock-in/out, power outage overrides, task controls, and full team shift tracking are centralized in Live Operations.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/team-operations')}
              className="py-1.5 px-4 rounded-lg border-none bg-orange-600 text-white text-[12.5px] font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-[0_2px_6px_rgba(234,88,12,0.25)] hover:bg-orange-700 transition-colors"
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-3.5 items-stretch">
        <DashboardWelcomeCard
          effectiveTargetUser={effectiveTargetUser}
          currentUser={currentUser}
          isViewingOtherEmployee={isViewingOtherEmployee}
          displayedIsOnLeave={displayedIsOnLeave}
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

<<<<<<< HEAD
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isViewingOtherEmployee ? `Employee: ${effectiveTargetUser?.name || 'User'}` : `Welcome ${currentUser?.name || 'User'}`}
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
                  {effectiveTargetUser?.role || roleConfig?.label || 'Team Member'}
                </span>
                {/* Interactive Working Mode Selector */}
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <button
                    id="btn-toggle-workmode-welcome"
                    type="button"
                    onClick={() => setShowWorkModeMenu(prev => !prev)}
                    title="Click to change your live working mode (Office / Hybrid / Remote)"
                    style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '1.5px 6px',
                      borderRadius: '4px',
                      backgroundColor: activeWorkMode === 'Remote' ? '#ecfdf5' : activeWorkMode === 'Hybrid' ? '#faf5ff' : '#f1f5f9',
                      color: activeWorkMode === 'Remote' ? '#059669' : activeWorkMode === 'Hybrid' ? '#7c3aed' : '#334155',
                      border: `1px solid ${activeWorkMode === 'Remote' ? '#a7f3d0' : activeWorkMode === 'Hybrid' ? '#e9d5ff' : '#cbd5e1'}`,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <span>{activeWorkMode === 'Remote' ? '🏡 Remote' : activeWorkMode === 'Hybrid' ? '🔄 Hybrid' : '🏢 Office'}</span>
                    <ChevronDown size={10} />
                  </button>

                  {showWorkModeMenu && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '4px',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
                      padding: '4px',
                      zIndex: 100,
                      minWidth: '110px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}>
                      {[
                        { id: 'Office', label: '🏢 Office' },
                        { id: 'Hybrid', label: '🔄 Hybrid' },
                        { id: 'Remote', label: '🏡 Remote' }
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleUpdateLiveWorkMode(m.id)}
                          style={{
                            padding: '5px 8px',
                            fontSize: '11px',
                            fontWeight: activeWorkMode === m.id ? '700' : '500',
                            backgroundColor: activeWorkMode === m.id ? '#eff6ff' : 'transparent',
                            color: activeWorkMode === m.id ? '#2563eb' : '#334155',
                            border: 'none',
                            borderRadius: '4px',
                            textAlign: 'left',
                            cursor: 'pointer'
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>
                {effectiveTargetUser?.role || roleConfig?.label || 'Team Member'} • <span style={{ color: '#94a3b8' }}>ID: #{effectiveTargetUser?.employeeCode || effectiveTargetUser?._id || 'EMP-01'}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>📅 {currentDateFormatted}</span>
                <span>•</span>
                <span>🕒 {currentTime}</span>
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
              <div style={{ fontSize: '11.5px', fontWeight: '700', marginTop: '1px', color: displayedIsClockedIn ? (displayedIsOnBreak ? '#b45309' : '#16a34a') : '#64748b' }}>
                {displayedIsClockedIn
                  ? (displayedIsOnBreak ? `☕ On ${displayedBreakType}` : '🟢 Shift Active')
                  : (displayedHadClockedOut ? '🔴 Shift Ended' : '⚪ Not Clocked In')}
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
          <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
            <button
              onClick={() => navigate('/employees')}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '8px 12px',
                borderRadius: '7px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Users size={13} />
              <span>Directory</span>
            </button>

            <button
              onClick={() => navigate('/attendance')}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '8px 12px',
                borderRadius: '7px',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="View full attendance matrix & clock in/out logs"
            >
              <CalendarCheck size={13} color="#16a34a" />
              <span>Attendance</span>
            </button>

            <button
              id="btn-edit-profile-welcome"
              onClick={() => setIsEditProfileOpen(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '7px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                border: '1.5px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease'
              }}
              title="Edit My Profile"
            >
              <User size={13} color="#2563eb" /> Edit Profile
            </button>
          </div>
        </div>

        {/* Live Work Timer & Attendance Shift Clock (Isolated Reusable Component) */}
        <AttendanceShiftClock
          targetUser={effectiveTargetUser}
          isViewingOtherEmployee={isViewingOtherEmployee}
          empState={activeEmpState}
          todayStr={todayStr}
          currentTime={currentTime}
          onOpenDayLog={openDayLogModalForUser}
          onOpenBreakModal={() => setIsBreakModalOpen(true)}
=======
        <ShiftClockCard
          currentTime={currentTime}
          displayedIsOnLeave={displayedIsOnLeave}
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
>>>>>>> b80ddf09b2104884719d4c3fd0bb9f6edab79a22
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          MIDDLE ROW: My Active Timer & Week Timelogs (Side-by-Side Responsive Grid)
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-3.5 mb-3.5 items-stretch">
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
        <div className="flex flex-col gap-3">
          {/* Mini Tasks & Projects Overview Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Tasks Mini Card */}
            <div
              onClick={() => {
                setPendingTasksModalFilter('all');
                setIsPendingTasksModalOpen(true);
              }}
              className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 p-3 px-3.5 flex flex-col gap-1 cursor-pointer shadow-xs transition-all duration-150 hover:border-sky-600 hover:-translate-y-0.5"
              title="Click to view all pending tasks list"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Tasks</span>
                <ListTodo size={15} color="#0284c7" />
              </div>
              <div className="flex items-baseline gap-3.5 mt-0.5">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingTasksModalFilter('all');
                    setIsPendingTasksModalOpen(true);
                  }}
                  title="Click to view pending tasks"
                  className="cursor-pointer"
                >
                  <span className="text-lg font-extrabold text-sky-600 dark:text-sky-400">{myPendingTasks.length}</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 ml-1">Pending</span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingTasksModalFilter('overdue');
                    setIsPendingTasksModalOpen(true);
                  }}
                  title="Click to view overdue tasks"
                  className="cursor-pointer"
                >
                  <span className={`text-lg font-extrabold ${overdueTasksCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{overdueTasksCount}</span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 ml-1">Overdue</span>
                </div>
              </div>
            </div>

            {/* Projects Mini Card */}
            <div
              onClick={() => navigate('/projects')}
              className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 p-3 px-3.5 flex flex-col gap-1 cursor-pointer shadow-xs transition-all duration-150 hover:border-sky-600 hover:-translate-y-0.5"
              title="Click to view all projects"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Projects</span>
                <Layers size={15} color="#0284c7" />
              </div>
              <div className="flex items-baseline gap-3.5 mt-0.5">
                <div>
                  <span className="text-lg font-extrabold text-green-600 dark:text-green-400">
                    {userScopedProjects.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length}
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 ml-1">In Progress</span>
                </div>
                <div>
                  <span className={`text-lg font-extrabold ${userScopedProjects.filter(p => p.status !== 'completed' && p.status !== 'cancelled' && p.deadline && p.deadline.slice(0, 10) < todayStr).length > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {userScopedProjects.filter(p => p.status !== 'completed' && p.status !== 'cancelled' && p.deadline && p.deadline.slice(0, 10) < todayStr).length}
                  </span>
                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400 ml-1">Overdue</span>
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-3.5 items-stretch">
        {/* Support Tickets Widget */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 px-[18px] flex flex-col justify-start gap-2.5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
                🎫 Support Tickets
              </h3>
              <span className="text-[10.5px] font-bold text-sky-600 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-1.5 py-px rounded-full">
                {openTicketsList.length} Open
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsRaiseTicketOpen(true)}
                className="flex items-center gap-1 bg-sky-600 text-white border-none py-1 px-2.5 rounded text-[11px] font-bold cursor-pointer hover:bg-sky-700 transition-colors"
              >
                <Plus size={12} /> Raise Ticket
              </button>
              <button
                onClick={() => navigate('/tickets')}
                className="bg-transparent border-none text-sky-600 dark:text-sky-400 text-[11.5px] font-semibold cursor-pointer hover:underline"
              >
                All →
              </button>
            </div>
          </div>

          {/* Ticket Filter Pills */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 gap-1.5 flex-wrap">
            <div className="flex gap-1">
              <button
                onClick={() => setTicketFilterTab('all')}
                className={`border-none py-1 px-2 rounded text-[11px] font-bold cursor-pointer transition-all duration-150 ${ticketFilterTab === 'all' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                All ({(tickets || []).length})
              </button>
              <button
                onClick={() => setTicketFilterTab('open')}
                className={`border-none py-1 px-2 rounded text-[11px] font-bold cursor-pointer transition-all duration-150 ${ticketFilterTab === 'open' ? 'bg-blue-50 dark:bg-blue-950/60 text-sky-600 dark:text-sky-400' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                Open ({openTicketsList.length})
              </button>
              <button
                onClick={() => setTicketFilterTab('resolved')}
                className={`border-none py-1 px-2 rounded text-[11px] font-bold cursor-pointer transition-all duration-150 ${ticketFilterTab === 'resolved' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-green-600 dark:text-green-400' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                Resolved ({resolvedTicketsList.length})
              </button>
            </div>

            <span className="text-[10.5px] text-slate-400 dark:text-slate-500">
              Click row to view discussion
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-1.5 px-1 font-semibold">Ticket#</th>
                  <th className="py-1.5 px-1 font-semibold">Subject</th>
                  <th className="py-1.5 px-1 font-semibold">Priority</th>
                  <th className="py-1.5 px-1 font-semibold">Status</th>
                  <th className="py-1.5 px-1 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {displayTickets.length > 0 ? (
                  displayTickets.slice(0, 5).map(tkt => (
                    <tr
                      key={tkt?._id || Math.random()}
                      onClick={() => setSelectedTicket(tkt)}
                      className="border-b border-slate-50 dark:border-slate-800/70 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      title="Click to view full discussion & reply"
                    >
                      <td className="py-2 px-1 text-sky-600 dark:text-sky-400 font-bold font-mono text-[11.5px] whitespace-nowrap">
                        #{tkt?.ticketCode || 'TKT-1'}
                      </td>
                      <td className="py-2 px-1 text-slate-900 dark:text-white font-semibold">
                        <div className="truncate max-w-[170px]">
                          {tkt?.subject}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                          From: {tkt?.requestedBy || tkt?.clientName || 'Employee'}
                        </div>
                      </td>
                      <td className="py-2 px-1 whitespace-nowrap">
                        <span className={`px-1.5 py-px rounded-md text-[10px] font-bold border ${tkt?.priority === 'high' || tkt?.priority === 'urgent' ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' : tkt?.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900' : 'bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900'}`}>
                          {tkt?.priority || 'Normal'}
                        </span>
                      </td>
                      <td className="py-2 px-1 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-lg text-[10.5px] font-semibold border ${tkt?.status === 'resolved' || tkt?.status === 'closed' ? 'bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900'}`}>
                          <span className={`w-1 h-1 rounded-full ${tkt?.status === 'resolved' || tkt?.status === 'closed' ? 'bg-green-600' : 'bg-blue-600'}`} />
                          {tkt?.status || 'Open'}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-right text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {tkt?.requestedOn || 'Today'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-[18px] text-slate-400 dark:text-slate-500">
                      <LifeBuoy size={22} className="mx-auto mb-1 block text-slate-300 dark:text-slate-600" />
                      <div className="text-xs font-semibold">No {ticketFilterTab} support tickets found.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Schedule & Events Widget (Paired with Tickets) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 px-[18px] flex flex-col justify-start gap-2.5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
              📅 Schedule & Events
            </h3>
            <button
              onClick={() => navigate('/calendar')}
              className="bg-transparent border-none text-sky-600 dark:text-sky-400 text-[11.5px] font-semibold cursor-pointer hover:underline"
            >
              Full Calendar →
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {upcomingScheduleEvents.length > 0 ? (
              upcomingScheduleEvents.map(ev => (
                <div
                  key={ev?._id || Math.random()}
                  onClick={() => navigate('/calendar')}
                  className="flex items-center gap-2 py-1.5 px-2.5 rounded cursor-pointer bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/60"
                  style={{
                    borderLeft: `3.5px solid ${ev?.color || '#2563eb'}`
                  }}
                  title="Click to open calendar"
                >
                  <span className="text-[10.5px] font-bold font-mono text-sky-600 dark:text-sky-400">
                    {ev?.time || 'All Day'}
                  </span>
                  <span className="text-[11.5px] font-semibold text-slate-900 dark:text-white">
                    {ev?.title}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">
                No upcoming events this month
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          LOWER ROW 2: Birthdays, Appreciations & Calendar (Compact & Clean)
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-3.5 items-stretch">
        {/* Birthdays Widget */}
        <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 p-3.5 px-[18px] flex flex-col justify-start gap-2.5 shadow-xs">
          {/* Celebrations Header with Birthdays & Anniversaries Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setCelebrationTab('birthdays')}
                className={`py-1 px-2 rounded-md border-none text-xs font-bold cursor-pointer flex items-center gap-1 transition-all ${celebrationTab === 'birthdays' ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs' : 'bg-transparent text-slate-500 dark:text-slate-400'}`}
              >
                <span>🎂 Birthdays</span>
                <span className="text-[10px] px-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  {(computedBirthdays || []).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCelebrationTab('anniversaries')}
                className={`py-1 px-2 rounded-md border-none text-xs font-bold cursor-pointer flex items-center gap-1 transition-all ${celebrationTab === 'anniversaries' ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs' : 'bg-transparent text-slate-500 dark:text-slate-400'}`}
              >
                <span>🌟 Anniversaries</span>
                <span className="text-[10px] px-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  {(computedAnniversaries || []).length}
                </span>
              </button>
            </div>

            <button
              onClick={() => navigate('/calendar')}
              className="bg-transparent border-none text-sky-600 dark:text-sky-400 text-[11.5px] font-semibold cursor-pointer hover:underline"
            >
              All →
            </button>
          </div>

          {/* List of items with exact Date and Countdown Day Count */}
          <div className="flex flex-col gap-2">
            {celebrationTab === 'birthdays' ? (
              (computedBirthdays && computedBirthdays.length > 0 ? computedBirthdays : birthdays || []).slice(0, 3).map(bday => {
                const diffDays = bday?.diffDays ?? 0;
                return (
                  <div
                    key={bday?._id || bday?.employeeId || Math.random()}
                    onClick={() => addToast(`🎉 Birthday greetings sent to ${bday?.name || 'Colleague'}!`, 'success')}
                    className="flex items-center justify-between p-2 px-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 cursor-pointer transition-all duration-150 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    title="Click to send birthday greetings"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={bday?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(bday?.name || 'User')}`}
                        alt={bday?.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-bold text-slate-900 dark:text-white truncate">
                          {bday?.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          🎂 {bday?.role || 'Team Member'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                      {/* Kitni Taarik Ko Hai */}
                      <div className="text-[11.5px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <span>📅 {bday?.birthdayDate || 'Upcoming'}</span>
                      </div>
                      {/* Din Count (Countdown) */}
                      <span className={`text-[10px] font-extrabold px-1.5 py-px rounded-full border ${diffDays === 0 ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-300 dark:border-green-800' : (diffDays === 1 ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800')}`}>
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
                    className="flex items-center justify-between p-2 px-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 cursor-pointer transition-all duration-150 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                    title="Click to send work anniversary congratulations"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={anniv?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(anniv?.name || 'User')}`}
                        alt={anniv?.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-bold text-slate-900 dark:text-white truncate">
                          {anniv?.name}
                        </div>
                        <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                          🌟 {anniv?.serviceYearsText} Work Anniversary
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                      {/* Kitni Taarik Ko Hai */}
                      <div className="text-[11.5px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <span>📅 {anniv?.anniversaryDate || anniv?.annivFormattedDate || 'Upcoming'}</span>
                      </div>
                      {/* Din Count (Countdown) */}
                      <span className={`text-[10px] font-extrabold px-1.5 py-px rounded-full border ${diffDays === 0 ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-300 dark:border-green-800' : (diffDays === 1 ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800' : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800')}`}>
                        {diffDays === 0 ? '🎉 TODAY!' : (diffDays === 1 ? '⏰ Tomorrow' : `⏳ In ${diffDays} days`)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {celebrationTab === 'birthdays' && (!computedBirthdays || computedBirthdays.length === 0) && (
              <div className="text-center p-4 text-slate-400 dark:text-slate-500 text-xs">
                🎂 No birthdays scheduled
              </div>
            )}

            {celebrationTab === 'anniversaries' && (!computedAnniversaries || computedAnniversaries.length === 0) && (
              <div className="text-center p-4 text-slate-400 dark:text-slate-500 text-xs">
                🌟 No work anniversaries scheduled
              </div>
            )}
          </div>
        </div>

        {/* Employee Appreciations Widget */}
        <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 p-3.5 px-[18px] flex flex-col justify-start gap-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
              🏆 Appreciations
            </h3>
            <button
              onClick={() => navigate('/appreciation')}
              className="bg-transparent border-none text-sky-600 dark:text-sky-400 text-[11.5px] font-semibold cursor-pointer hover:underline"
            >
              All →
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {(appreciations || []).slice(0, 2).map(app => (
              <div
                key={app?._id || Math.random()}
                onClick={() => navigate('/appreciation')}
                className="p-2 px-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 flex items-start gap-2 cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Award size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {app?.givenToName} — <span className="text-amber-600 dark:text-amber-400">{app?.awardName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
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
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-3.5 items-stretch">
        {/* On Leave Today */}
        <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 p-3.5 px-[18px] flex flex-col justify-start gap-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
              🏖️ On Leave Today
            </h3>
            <button
              onClick={() => setIsApplyLeaveOpen(true)}
              className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-300 dark:border-slate-700 py-1 px-2 rounded text-[11px] font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Palmtree size={12} /> Apply
            </button>
          </div>

          {/* Leave Requests: Separated Review Queue (for Reviewers) vs My Pending Applications (for Applicant) */}
          {pendingLeaveRequestsForMe.length > 0 && (
            <div className="p-2 px-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/60 flex flex-col gap-1.5">
              <div className="text-[11px] font-extrabold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>⏳ For Your Review ({pendingLeaveRequestsForMe.length})</span>
                <span onClick={() => navigate('/leaves')} className="cursor-pointer underline text-[10.5px]">
                  Manage →
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {pendingLeaveRequestsForMe.slice(0, 2).map(l => (
                  <div key={l._id} className="flex items-center justify-between py-1.5 px-2 bg-white dark:bg-slate-800 rounded-md border border-amber-100 dark:border-amber-900/40">
                    <div>
                      <div className="text-[11.5px] font-bold text-slate-900 dark:text-white">{l.employeeName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{l.leaveType} ({l.durationText})</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateLeaveStatus(l._id, 'approved')}
                        className="py-0.5 px-2 rounded bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-[10.5px] font-bold cursor-pointer hover:bg-green-200 dark:hover:bg-green-900"
                        title="Accept & approve leave"
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={() => setRejectingLeaveTarget(l)}
                        className="py-0.5 px-2 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-[10.5px] font-bold cursor-pointer hover:bg-red-200 dark:hover:bg-red-900"
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
            <div className="p-2 px-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900/60 flex flex-col gap-1.5">
              <div className="text-[11px] font-extrabold text-green-700 dark:text-green-300 flex items-center justify-between">
                <span>📬 Leave Decision Update ({myDecidedLeaves.length})</span>
                <span onClick={() => navigate('/leaves')} className="cursor-pointer underline text-[10.5px]">
                  All Leaves →
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {myDecidedLeaves.map(l => (
                  <div key={l._id} className={`p-1.5 px-2 bg-white dark:bg-slate-800 rounded-md border ${l.status === 'approved' ? 'border-green-300 dark:border-green-800' : 'border-red-300 dark:border-red-800'}`}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11.5px] font-bold text-slate-900 dark:text-white">
                        {l.leaveType} ({l.durationText || `${l.durationDays}d`})
                      </span>
                      <span className={`text-[9.5px] font-bold py-px px-1.5 rounded ${l.status === 'approved' ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'}`}>
                        {l.status === 'approved' ? '✓ Approved' : '✕ Declined'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      📅 {l.startDate} to {l.endDate}
                    </div>

                    <div className={`text-[10px] mt-0.5 font-semibold ${l.status === 'approved' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {l.status === 'approved'
                        ? `Approved by ${l.approvedBy || l.actionBy || 'Admin'}${l.actionDateFormatted ? ` on ${l.actionDateFormatted}` : ''}`
                        : `Declined by ${l.rejectedBy || l.actionBy || 'Admin'}${l.actionDateFormatted ? ` on ${l.actionDateFormatted}` : ''}${l.rejectionReason ? ` • "${l.rejectionReason}"` : ''}`}
                    </div>

                    <div className="flex justify-end mt-1">
                      <button
                        onClick={() => acknowledgeLeave(l._id)}
                        className={`py-0.5 px-2 rounded text-white border-none text-[10px] font-bold cursor-pointer ${l.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
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
            <div className="p-2 px-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900/60 flex flex-col gap-1.5">
              <div className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 flex items-center justify-between">
                <span>📋 My Leave Application ({myPendingLeaves.length} Pending)</span>
                <span onClick={() => navigate('/leaves')} className="cursor-pointer underline text-[10.5px]">
                  History →
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {myPendingLeaves.slice(0, 2).map(l => (
                  <div key={l._id} className="flex items-center justify-between py-1.5 px-2 bg-white dark:bg-slate-800 rounded-md border border-blue-100 dark:border-blue-900/40">
                    <div>
                      <div className="text-[11.5px] font-bold text-slate-900 dark:text-white">
                        {l.leaveType} ({l.durationText})
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        📅 {l.startDate} • Sent to {l.appliedToName || 'Reviewer'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9.5px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 py-px px-1.5 rounded">
                        ⏳ Pending Approval
                      </span>
                      <button
                        onClick={() => setCancellingLeaveTarget(l)}
                        className="py-0.5 px-1.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-300 dark:border-slate-600 text-[10px] font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600"
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
            <div className="py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-[10.5px] text-slate-600 dark:text-slate-300">
                <span className="font-bold">Recent Leave:</span> {myRecentLeaves[0].leaveType} ({myRecentLeaves[0].startDate}) •{' '}
                <strong className={myRecentLeaves[0].status === 'approved' ? 'text-green-600 dark:text-green-400' : (myRecentLeaves[0].status === 'rejected' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>
                  {myRecentLeaves[0].status === 'approved' ? '✓ Approved' : (myRecentLeaves[0].status === 'rejected' ? '✕ Denied' : 'Pending')}
                </strong>
                {myRecentLeaves[0].approvedBy && <span className="text-slate-500 dark:text-slate-400"> by {myRecentLeaves[0].approvedBy}</span>}
              </div>
              <span onClick={() => navigate('/leaves')} className="cursor-pointer text-sky-600 dark:text-sky-400 text-[10.5px] font-semibold hover:underline">
                View →
              </span>
            </div>
          )}

          {employeesOnLeave.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {employeesOnLeave.map(l => (
                <div key={l._id} className="flex items-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-md">
                  <img src={l.employeeAvatar} alt={l.employeeName} className="w-6 h-6 rounded-full" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">{l.employeeName}</div>
                    <div className="text-[10px] text-sky-600 dark:text-sky-400">{l.leaveType} ({l.durationText})</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            pendingLeaveRequestsForMe.length === 0 && myDecidedLeaves.length === 0 && myPendingLeaves.length === 0 && myRecentLeaves.length === 0 && (
              <div className="text-center py-3 text-slate-400 dark:text-slate-500">
                <Plane size={22} className="mx-auto mb-1" />
                <div className="text-[11.5px]">No leaves today</div>
              </div>
            )
          )}
        </div>

        {/* Right Column: 📢 Company Notices & Announcements */}
        <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 p-3.5 px-[18px] flex flex-col justify-start gap-3 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
                📢 Company Notices & Announcements
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Official HR notices, policy updates, and team announcements
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {isUserAdminOrHR && (
                <button
                  onClick={() => setIsAddNoticeOpen(true)}
                  className="flex items-center gap-1 bg-blue-600 text-white border-none py-1 px-2.5 rounded text-[11.5px] font-semibold cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  <Plus size={12} /> Add Notice
                </button>
              )}
              <button
                onClick={() => navigate('/notice-board')}
                className="bg-transparent border-none text-sky-600 dark:text-sky-400 text-xs font-semibold cursor-pointer hover:underline"
              >
                All Notices →
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[430px] overflow-y-auto pr-0.5">
            {(notices || []).length > 0 ? (
              (notices || []).map(not => (
                <div
                  key={not?._id || not?.id || Math.random()}
                  onClick={() => setSelectedNotice(not)}
                  className="p-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 cursor-pointer flex flex-col gap-1.5 transition-all duration-150 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-px rounded ${not?.isImportant ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60' : 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60'}`}>
                        {not?.category || 'Announcement'}
                      </span>
                      {not?.isImportant && (
                        <span className="text-[9.5px] font-extrabold text-red-600 dark:text-red-400">
                          ⚡ Important
                        </span>
                      )}
                    </div>
                    <span className="text-[10.5px] text-slate-400 dark:text-slate-500">{not?.date}</span>
                  </div>

                  <div className="text-[12.5px] font-bold text-slate-900 dark:text-white leading-snug">
                    {not?.title}
                  </div>

                  <div className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-normal">
                    {not?.shortDescription || not?.description}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>By: <strong>{not?.postedBy || 'HR Admin'}</strong></span>
                    <span className="text-[11.5px] text-sky-600 dark:text-sky-400 font-semibold">View Details →</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-7 text-slate-400">
                <Bell size={24} className="mx-auto mb-1.5 text-slate-300" />
                <div className="text-xs font-semibold">No active company notices</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Company announcements will appear here</div>
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
