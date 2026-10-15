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
  Shield,
  Layers,
  Search,
  Zap
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { useWork } from '../../work/context/WorkContext';
import { useTimer } from '../../../shared/context/TimerContext';
import { useCRM } from '../../../shared/context/CRMContext';
import { ROLES, ROLE_CONFIGS, getUserRole, canApproveLeaves, isHRorAdmin, getUserModulePermissions } from '../../../shared/utils/permissionUtils';
import { getCollection, saveCollection, KEYS } from '../../../shared/services/storageService';
import { hrService } from '../services/hrService';

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
  const [showBreakDropdown, setShowBreakDropdown] = useState(false);

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
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('hrms_storage_change', handleSync);
      window.removeEventListener('ems_clocked_in', handleSync);
      window.removeEventListener('ems_clocked_out', handleSync);
      window.removeEventListener('ems_force_clock_out', handleSync);
      window.removeEventListener('ems_task_timer_started', handleSync);
      window.removeEventListener('ems_task_timer_paused', handleSync);
      window.removeEventListener('ems_task_timer_stopped', handleSync);
    };
  }, []);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(formatTimeNoSec(now));
      setCurrentDayStr(now.toLocaleDateString('en-US', { weekday: 'long' }));
      setCurrentDateFormatted(now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
      setSyncTick(t => t + 1); // Live real-time tick for all timers
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper for matching tasks assigned to a specific user (handles IDs, codes, names, emails, and multi-assignees)
  const isTaskAssignedToUser = (task, user) => {
    if (!task || !user) return false;
    const userIds = [user._id, user.id, user.employeeCode, user.email].filter(Boolean).map(s => String(s).toLowerCase());
    const taskAssigneeIds = [task.assignedToId, task.assignedTo, task.employeeId, task.assignedToEmail].filter(Boolean).map(s => String(s).toLowerCase());

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
      const userFirst = userName.split(' ')[0];
      const taskFirst = taskAssigneeName.split(' ')[0];
      if (userFirst && taskFirst && userFirst === taskFirst && userFirst.length > 2) return true;
    }
    return false;
  };

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

    const isClockedIn = storedClockedIn || (!!attRec?.clockInTime && !attRec?.clockOutTime);
    const isClockedOut = !isClockedIn && (!!storedClockOut || !!attRec?.clockOutTime);
    const loginTime = attRec?.clockInTime || storedLogin || (isClockedIn ? '09:30 AM' : null);
    const clockOutTime = attRec?.clockOutTime || storedClockOut || null;

    // Calculate dynamic live work seconds
    let workSecs = storedWorkSecs;
    if (isClockedIn && !storedOnBreak) {
      const clockInTs = Number(localStorage.getItem(`ems_timer_${empKey}_clock_in_timestamp`));
      if (clockInTs > 0) {
        const gross = Math.max(0, Math.floor((Date.now() - clockInTs) / 1000));
        workSecs = Math.max(0, gross - storedBreakSecs);
      } else if (empId === currentUser?._id && workSeconds > 0) {
        workSecs = workSeconds;
      }
    } else if (isClockedOut && !workSecs && attRec?.totalWorkingHours) {
      workSecs = Math.round(attRec.totalWorkingHours * 3600);
    }

    // Active running task with live ticking calculation
    let activeTimer = null;
    try {
      const rawTimer = localStorage.getItem(`ems_active_task_timer_${empKey}`);
      if (rawTimer) activeTimer = JSON.parse(rawTimer);
    } catch {}

    const empTasks = (tasks || []).filter(t => isTaskAssignedToUser(t, emp));
    const baseRunningTask = empTasks.find(t => t.timerRunning) || (activeTimer?.timerRunning ? activeTimer : null);
    let runningTask = null;

    if (baseRunningTask) {
      let liveTaskSecs = baseRunningTask.timerSeconds || 0;
      const startEpoch = baseRunningTask.startEpoch || (baseRunningTask.startedAt ? new Date(baseRunningTask.startedAt).getTime() : 0);
      if (baseRunningTask.timerRunning && startEpoch > 0) {
        const elapsed = Math.max(0, Math.floor((Date.now() - startEpoch) / 1000));
        liveTaskSecs = (baseRunningTask.accumulatedSeconds || baseRunningTask.timerSeconds || 0) + elapsed;
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
      runningTask,
      empTasks,
      completedTasksToday
    };
  }, [attendance, tasks, todayStr, syncTick, currentUser?._id, workSeconds]);

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
    const note = `Shift ended by Admin ${currentUser?.name || 'Admin'} from Dashboard`;
    try {
      const targetEmp = (employees || []).find(e => e._id === empId || e.employeeCode === empId);
      const empKey = targetEmp?.employeeCode || (targetEmp?._id ? String(targetEmp._id) : String(empId));
      const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      await hrService.adminForceClockOut(empId, note, todayStr);

      localStorage.setItem(`ems_timer_${empKey}_is_clocked_in`, 'false');
      localStorage.setItem(`ems_timer_${empKey}_is_on_break`, 'false');
      localStorage.setItem(`ems_timer_${empKey}_clock_out`, nowStr);

      const allTasks = getCollection(KEYS.TASKS) || [];
      let taskChanged = false;
      const updatedTasks = allTasks.map(t => {
        if ((t.assignedToId === empId || t.assignedTo === empKey || t.assignedToName?.toLowerCase() === empName?.toLowerCase()) && t.timerRunning) {
          taskChanged = true;
          return { ...t, timerRunning: false };
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
          } catch {}
        }
      }

      window.dispatchEvent(new CustomEvent('ems_force_clock_out', { detail: { employeeId: empId, adminName: currentUser?.name } }));
      window.dispatchEvent(new CustomEvent('ems_clocked_out', { detail: { employeeId: empId } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      setSyncTick(t => t + 1);

      addToast(`🛑 Successfully Clocked Out ${empName}!`, 'success');
    } catch (err) {
      console.error('Failed to force clock out employee:', err);
      addToast(`Failed to clock out ${empName}`, 'error');
    }
  };

  // Admin Pause Employee Task function
  const handleAdminPauseTask = (taskId, empKey, empName) => {
    try {
      const allTasks = getCollection(KEYS.TASKS) || [];
      const updatedTasks = allTasks.map(t => {
        if (t._id === taskId || (empKey && (t.assignedToId === empKey || t.assignedTo === empKey) && t.timerRunning)) {
          return { ...t, timerRunning: false };
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
            parsed.timerRunning = false;
            parsed.startedAt = null;
            localStorage.setItem(timerKey, JSON.stringify(parsed));
          } catch {}
        }
      }

      window.dispatchEvent(new CustomEvent('ems_task_timer_paused', { detail: { taskId, empKey } }));
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
    const empTasks = (tasks || []).filter(t => isTaskAssignedToUser(t, emp));

    // Only include tasks that were worked on today, have active timer, or were completed today!
    const userTasksToday = empTasks.filter(t => {
      const actuallyDone = isTaskActuallyCompleted(t);
      const isDoneToday = actuallyDone && (
        t.completedAt?.startsWith(customDate) ||
        t.completedOn?.startsWith(customDate) ||
        t.updatedAt?.startsWith(customDate)
      );
      const hasTimeLogged = (t.timerSeconds || 0) > 0;
      const isRunning = Boolean(t.timerRunning);
      return isDoneToday || hasTimeLogged || isRunning;
    });

    const tasksWorked = userTasksToday.map(t => {
      const actuallyDone = isTaskActuallyCompleted(t);
      return {
        taskId: t._id,
        taskCode: t.taskCode || 'TSK',
        taskTitle: t.title,
        projectName: t.projectName || 'General',
        durationText: t.hoursLoggedText || formatSeconds(t.timerSeconds || 0),
        status: actuallyDone ? 'completed' : (t.timerRunning ? 'in_progress' : (t.status || 'pending')),
        isCompleted: actuallyDone,
        timerRunning: Boolean(t.timerRunning)
      };
    });

    const targetWeekLog = (weeklyTimeLogs || []).find(l => l.date === customDate) ||
                          (weeklyTimeLogs || []).find(l => l.shortDay === activeWeekDayShort);
    const effectiveTasksWorked = (tasksWorked.length > 0)
      ? tasksWorked
      : (targetWeekLog?.tasksWorked || []);

    const logData = {
      date: customDate,
      day: targetWeekLog?.day || currentDayStr,
      isCurrentDay: customDate === todayStr,
      employeeId: emp?._id || '',
      employeeCode: emp?.employeeCode || '',
      employeeName: emp?.name || '',
      employeeRole: emp?.role || '',
      loginTime: customDate === todayStr ? (empState?.loginTime || '--') : (targetWeekLog?.loginTime || '--'),
      logoutTime: customDate === todayStr ? (empState?.clockOutTime || '--') : (targetWeekLog?.logoutTime || '--'),
      durationText: customDate === todayStr
        ? (totalTaskTodaySecs > 0 ? (totalTaskTodaySecs < 60 ? `${totalTaskTodaySecs}s` : `${Math.floor(totalTaskTodaySecs / 3600)}h ${String(Math.floor((totalTaskTodaySecs % 3600) / 60)).padStart(2, '0')}m`) : (empState?.workSecs ? formatTimeDurationSafe(empState.workSecs) : '0h 0m'))
        : (targetWeekLog?.durationText || '0h 0m'),
      breakDuration: customDate === todayStr ? `${Math.round((empState?.breakSecs || 0) / 60)}m` : (targetWeekLog?.breakDuration || '0m'),
      teaBreaksCount: empState?.isOnBreak && empState?.breakType?.includes('Tea') ? 1 : (empState?.breakSecs > 0 ? 1 : 0),
      lunchBreaksCount: empState?.isOnBreak && empState?.breakType?.includes('Lunch') ? 1 : (empState?.breakSecs > 900 ? 1 : 0),
      tasksWorked: effectiveTasksWorked
    };

    setSelectedDayLog(logData);
  };

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
      return t.assignedBy === currentUser?.name || t.assignedById === currentUser?._id;
    }
    if (isUserAdminOrHR || perms.viewAllTasks) return true;
    return isTaskAssignedToUser(t, currentUser);
  });

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

  const scopedInProgressCount = baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && (t.status === 'in_progress' || t.timerRunning)).length;
  const scopedPendingCount = baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && t.status !== 'in_progress' && !t.timerRunning).length;
  const scopedDueTodayCount = baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && t.dueDate === todayStr).length;
  const scopedOverdueCount = baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && t.dueDate && t.dueDate < todayStr).length;

  // Filtered tasks for the "My Tasks & Delegation" table supporting all lifecycle states and search
  const tableDisplayTasks = React.useMemo(() => {
    let list = [];
    if (taskStatusTab === 'in_progress') {
      list = baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && (t.status === 'in_progress' || t.timerRunning));
    } else if (taskStatusTab === 'pending') {
      list = baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && t.status !== 'in_progress' && !t.timerRunning);
    } else if (taskStatusTab === 'due_today') {
      list = baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && t.dueDate === todayStr);
    } else if (taskStatusTab === 'overdue') {
      list = baseScopedTasks.filter(t => !isTaskActuallyCompleted(t) && t.dueDate && t.dueDate < todayStr);
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
  const scopedTickets = (tickets || []).filter(t => {
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
  const openTicketsList = scopedTickets.filter(t => t?.status !== 'resolved' && t?.status !== 'closed');
  const resolvedTicketsList = scopedTickets.filter(t => t?.status === 'resolved' || t?.status === 'closed');
  const displayTickets = ticketFilterTab === 'open'
    ? openTicketsList
    : ticketFilterTab === 'resolved'
      ? resolvedTicketsList
      : scopedTickets;

  // Effective personal tasks for Timer & KPI counters strictly scoped to active viewed user (or current user)
  const effectiveTargetUser = isViewingOtherEmployee ? activeViewUser : currentUser;
  const myTasks = (tasks || []).filter(t => isTaskAssignedToUser(t, effectiveTargetUser));
  const myPendingTasks = myTasks.filter(t => !isTaskActuallyCompleted(t));
  const myCompletedTasks = myTasks.filter(t => isTaskActuallyCompleted(t));
  const pendingTasksCount = myPendingTasks.length;
  const overdueTasksCount = myPendingTasks.filter(t => t?.dueDate && t?.dueDate < todayStr).length;
  const myInProgressTasksCount = myPendingTasks.filter(t => t.status === 'in_progress' || t.timerRunning).length;
  const myDueTodayTasksCount = myPendingTasks.filter(t => t.dueDate === todayStr).length;
  const myCompletedTodayCount = myCompletedTasks.filter(t => t.completedAt?.startsWith(todayStr) || t.updatedAt?.startsWith(todayStr)).length;

  // Company-wide stats for Admin Overview
  const allTasksList = tasks || [];
  const allPendingTasksCount = allTasksList.filter(t => !isTaskActuallyCompleted(t)).length;
  const allInProgressTasksCount = allTasksList.filter(t => !isTaskActuallyCompleted(t) && (t.status === 'in_progress' || t.timerRunning)).length;
  const allDueTodayTasksCount = allTasksList.filter(t => !isTaskActuallyCompleted(t) && t.dueDate === todayStr).length;
  const allOverdueTasksCount = allTasksList.filter(t => !isTaskActuallyCompleted(t) && t.dueDate && t.dueDate < todayStr).length;
  const allCompletedTodayCount = allTasksList.filter(t => isTaskActuallyCompleted(t) && (t.completedAt?.startsWith(todayStr) || t.updatedAt?.startsWith(todayStr))).length;

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

  const activeProjectsCount = (projects || []).filter(p => p?.status === 'in_progress').length || 1;
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
    if (activeEmpState?.runningTask) {
      const match = tasks.find(t => String(t._id || t.id) === String(activeEmpState.runningTask._id || activeEmpState.runningTask.taskId));
      const liveSecs = Number(activeEmpState.runningTask.liveTaskSecs) || Number(activeEmpState.runningTask.timerSeconds) || 0;
      return {
        ...(match || {}),
        ...activeEmpState.runningTask,
        timerRunning: true,
        timerSeconds: liveSecs,
        liveDurationText: formatSeconds(liveSecs)
      };
    }
    if (activeRunningTask && isTaskAssignedToUser(activeRunningTask, effectiveTargetUser)) {
      return activeRunningTask;
    }
    if (activeSelectedTaskId) {
      const found = myTasks.find(t => String(t._id || t.id) === String(activeSelectedTaskId));
      if (found) return found;
    }
    return myPendingTasks.find(t => !t.snoozed) || myTasks[0] || null;
  }, [activeEmpState?.runningTask, tasks, activeRunningTask, effectiveTargetUser, isTaskAssignedToUser, activeSelectedTaskId, myTasks, myPendingTasks, formatSeconds]);

  // Upcoming Next tasks in queue (strictly from user's personal pending queue)
  const upcomingQueueTasks = myPendingTasks
    .filter(t => t._id !== displayActiveTask?._id && !t.snoozed);

  const upNextTask = upcomingQueueTasks[0] || null;

  // Stable logged total duration today strictly scoped to current viewed user (timesheets logged today + active task timer seconds)
  const todayTimesheets = (timesheets || []).filter(ts => {
    const isToday = ts.date === todayStr || ts.createdAt?.startsWith(todayStr);
    const isMine = (effectiveTargetUser?._id && (ts.employeeId === effectiveTargetUser._id || ts.employee === effectiveTargetUser._id)) ||
                   (effectiveTargetUser?.employeeCode && (ts.employeeId === effectiveTargetUser.employeeCode || ts.employee === effectiveTargetUser.employeeCode)) ||
                   (effectiveTargetUser?.name && ts.employeeName?.toLowerCase() === effectiveTargetUser.name.toLowerCase());
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

  // Task-based Weekly Calculation (User requirement):
  // 1. Day-wise time accumulates based on tasks worked on that day
  // 2. Today's live task seconds (active timer + timesheets) adds in real-time
  // 3. Weekly total = Monday + Tuesday + Wednesday + Thursday + Friday + Saturday + Sunday
  const todayWeekLog = (weeklyTimeLogs || []).find(l => l.isCurrentDay);
  const otherDaysTaskSecs = (weeklyTimeLogs || [])
    .filter(l => !l.isCurrentDay && l.date !== todayStr)
    .reduce((acc, curr) => acc + (Number(curr.durationSeconds) || Math.round((Number(curr.durationHours) || 0) * 3600)), 0);

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

  const selectedDayLogData = (weeklyTimeLogs || []).find(l => l.shortDay === activeWeekDayShort) || (weeklyTimeLogs || []).find(l => l.isCurrentDay) || (weeklyTimeLogs || [])[0] || null;
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
    let ackList = [];
    try {
      ackList = JSON.parse(localStorage.getItem('ems_acknowledged_leaves') || '[]');
    } catch (_) {}
    const ackSet = new Set(ackList.map(String));
    if (l.isAcknowledged || ackSet.has(String(l._id))) return false;
    const isApplicant = (l.employeeId && currentUser?._id && String(l.employeeId) === String(currentUser._id)) ||
      (l.employeeName && currentUser?.name && l.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
    return isApplicant;
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

      {/* ── 🛡️ ADMIN LIVE OPERATIONS SHORTCUT BANNER ── */}
      {isUserAdminOrHR && (
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

          <button
            onClick={() => navigate('/team-operations')}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 1px 4px rgba(234, 88, 12, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <span>Open Live Operations →</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          ⚡ INTERACTIVE KPI SUMMARY STRIP (Click to Filter / Inspect)
      ───────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px'
      }}>
        {isUserAdminOrHR && !isViewingOtherEmployee ? (
          <>
            <div
              onClick={() => navigate('/team-operations')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              title="Click to open Live Operations"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Total Team</span>
                <Users size={13} color="#0284c7" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                {(employees || []).length}
              </div>
            </div>

            <div
              onClick={() => navigate('/attendance')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              title="Click to view Attendance"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Present Today</span>
                <UserCheck size={13} color="#16a34a" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>
                {teamStats.present || 0}
              </div>
            </div>

            <div
              onClick={() => navigate('/leaves')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              title="Click to open Leave Requests"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>On Leave</span>
                <Palmtree size={13} color="#d97706" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>
                {employeesOnLeave.length}
              </div>
            </div>

            <div
              onClick={() => navigate('/team-operations')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              title="Click to view Live Operations"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Working Now</span>
                <Clock size={13} color="#2563eb" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>
                {teamStats.clockedIn}
              </div>
            </div>

            <div
              onClick={() => navigate('/tasks')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              title="Click to open Tasks Board"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>In Progress</span>
                <Play size={13} color="#2563eb" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>
                {allInProgressTasksCount}
              </div>
            </div>

            <div
              onClick={() => navigate('/tasks')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d97706'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              title="Click to open Tasks Board"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Pending</span>
                <Clock size={13} color="#d97706" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>
                {allPendingTasksCount}
              </div>
            </div>

            <div
              onClick={() => navigate('/tasks')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              title="Click to open Tasks Board"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700' }}>Overdue 🔥</span>
                <AlertCircle size={13} color="#dc2626" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#dc2626' }}>
                {allOverdueTasksCount}
              </div>
            </div>

            <div
              onClick={() => navigate('/tasks')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
              title="Click to open Tasks Board"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Done Today</span>
                <CheckCircle2 size={13} color="#16a34a" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>
                {allCompletedTodayCount}
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Today's Time</span>
                <Clock size={13} color="#0284c7" />
              </div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                {displayedWorkDuration || '0h 0m'}
              </div>
            </div>

            <div
              onClick={() => document.getElementById('active-timer-card')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              title="Active Task"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Active Task</span>
                <Play size={13} color="#7c3aed" />
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#7c3aed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayActiveTask ? `#${displayActiveTask.taskCode || 'TSK'}` : 'None'}
              </div>
            </div>

            <div
              onClick={() => {
                setTaskStatusTab('pending');
                document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                backgroundColor: taskStatusTab === 'pending' ? '#fffbeb' : '#ffffff',
                border: taskStatusTab === 'pending' ? '1px solid #d97706' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              title="Click to view Pending tasks"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>My Pending</span>
                <ListTodo size={13} color="#d97706" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>
                {myPendingTasks.length}
              </div>
            </div>

            <div
              onClick={() => {
                setTaskStatusTab('due_today');
                document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                backgroundColor: taskStatusTab === 'due_today' ? '#fae8ff' : '#ffffff',
                border: taskStatusTab === 'due_today' ? '1px solid #c026d3' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              title="Click to view tasks Due Today"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Due Today</span>
                <CalendarIcon size={13} color="#c026d3" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#c026d3' }}>
                {myDueTodayTasksCount}
              </div>
            </div>

            <div
              onClick={() => {
                setTaskStatusTab('overdue');
                document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                backgroundColor: taskStatusTab === 'overdue' ? '#fef2f2' : '#ffffff',
                border: taskStatusTab === 'overdue' ? '1px solid #dc2626' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              title="Click to view Overdue tasks 🔥"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700' }}>Overdue 🔥</span>
                <AlertCircle size={13} color="#dc2626" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#dc2626' }}>
                {overdueTasksCount}
              </div>
            </div>

            <div
              onClick={() => {
                setTaskStatusTab('completed');
                document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                backgroundColor: taskStatusTab === 'completed' ? '#f0fdf4' : '#ffffff',
                border: taskStatusTab === 'completed' ? '1px solid #16a34a' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              title="Click to view Completed tasks"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Done Today</span>
                <CheckCircle2 size={13} color="#16a34a" />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>
                {myCompletedTodayCount}
              </div>
            </div>

            <div
              onClick={() => navigate('/leaves')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              title="Click to view Leaves"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Leave Balance</span>
                <Palmtree size={13} color="#059669" />
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669' }}>
                {currentUser?.leaveBalance?.casual ?? 8} Days
              </div>
            </div>
          </>
        )}
      </div>

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
                src={effectiveTargetUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={effectiveTargetUser?.name}
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
                backgroundColor: displayedIsClockedIn ? '#10b981' : '#94a3b8',
                border: '2px solid #ffffff'
              }} />
            </div>

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
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1'
                }}>
                  {effectiveTargetUser?.workingMode === 'Remote' ? '🏡 Remote' : effectiveTargetUser?.workingMode === 'Hybrid' ? '🔄 Hybrid' : '🏢 Office'}
                </span>
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
                  background: displayedIsOnBreak ? '#fef3c7' : (displayedIsClockedIn ? '#dcfce7' : (displayedHadClockedOut ? '#f1f5f9' : '#f8fafc')),
                  color: displayedIsOnBreak ? '#b45309' : (displayedIsClockedIn ? '#15803d' : (displayedHadClockedOut ? '#64748b' : '#64748b')),
                  border: `1px solid ${displayedIsOnBreak ? '#fde68a' : (displayedIsClockedIn ? '#bbf7d0' : '#e2e8f0')}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: displayedIsOnBreak ? '#f59e0b' : (displayedIsClockedIn ? '#22c55e' : (displayedHadClockedOut ? '#94a3b8' : '#cbd5e1')),
                    display: 'inline-block'
                  }} />
                  {displayedIsOnBreak ? `On ${displayedBreakType}` : (displayedIsClockedIn ? 'Shift Active 🟢' : (displayedHadClockedOut ? 'Shift Ended' : 'Not Clocked In'))}
                </span>
              </div>

              {/* Attendance & Shift Time row */}
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span>Clock In: <strong style={{ color: '#0f172a' }}>{displayedLoginTime || (displayedIsClockedIn ? 'Active' : '--')}</strong></span>
                <span>•</span>
                <span>Clock Out: <strong style={{ color: displayedClockOutTime ? '#dc2626' : '#64748b' }}>{displayedClockOutTime || (displayedIsClockedIn ? 'Active' : '--')}</strong></span>
                <span>•</span>
                <span>Working Time: <strong style={{ color: '#0284c7' }}>{displayedWorkDuration || '0h 0m'}</strong></span>
                <button
                  id="btn-eye-shift-top"
                  onClick={() => openDayLogModalForUser(effectiveTargetUser, todayStr)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#eff6ff',
                    color: '#0284c7',
                    border: '1px solid #bfdbfe',
                    borderRadius: '5px',
                    padding: '2px 7px',
                    fontSize: '10.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title="View full day activity log (clock in, clock out, breaks, tasks)"
                >
                  <Eye size={11} color="#0284c7" />
                  <span>Day Log 👁️</span>
                </button>
              </div>

              {/* When on break: Show active break reminder tag */}
              {!isViewingOtherEmployee && isOnBreak && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: isBreakOverdue ? '#fef2f2' : '#fffbeb',
                    border: isBreakOverdue ? '1.5px solid #ef4444' : '1.5px solid #f59e0b',
                    borderRadius: '6px',
                    padding: '4px 9px',
                    color: isBreakOverdue ? '#dc2626' : '#b45309',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    <Coffee size={13} color={isBreakOverdue ? '#dc2626' : '#d97706'} />
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
                    title="Break history & custom options"
                  >
                    Options...
                  </button>
                </div>
              )}
            </div>

            {/* Right Action Column: Prominent Action Buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: '6px',
              flexShrink: 0
            }}>
              {isViewingOtherEmployee ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: '5px' }}>
                    Shift View: {effectiveTargetUser?.name} (Read-Only)
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: displayedIsClockedIn ? (displayedIsOnBreak ? '#b45309' : '#16a34a') : '#64748b' }}>
                    {displayedIsClockedIn
                      ? (displayedIsOnBreak ? `☕ On ${displayedBreakType} (${displayedBreakDuration})` : '🟢 On Active Shift')
                      : (displayedHadClockedOut ? `🔴 Shift Ended (${displayedClockOutTime || '--'})` : '⚪ Not Clocked In')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                    Shift controls are managed by the employee
                  </div>
                </div>
              ) : (
                isOnBreak ? (
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
                      padding: '11px 24px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Resume working and continue shift"
                  >
                    <Play size={14} fill="#fff" />
                    <span>Resume Shift 🟢</span>
                  </button>
                ) : isClockedIn ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* ☕ SINGLE BIG BREAK BUTTON WITH OPTIONS */}
                    <div style={{ position: 'relative' }}>
                      <button
                        id="btn-take-break-menu"
                        onClick={() => setShowBreakDropdown(prev => !prev)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          border: '1.5px solid #fde68a',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(217, 119, 6, 0.15)',
                          transition: 'all 0.15s ease'
                        }}
                        title="Choose a break (Tea, Lunch, or Custom)"
                      >
                        <Coffee size={14} color="#b45309" />
                        <span>Take Break ☕ ▾</span>
                      </button>

                      {showBreakDropdown && (
                        <div style={{
                          position: 'absolute',
                          top: '115%',
                          right: 0,
                          zIndex: 100,
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                          padding: '6px',
                          minWidth: '220px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <button
                            id="btn-menu-tea-break"
                            onClick={() => { startTeaBreak(); setShowBreakDropdown(false); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#fffbeb',
                              color: '#b45309',
                              fontWeight: '700',
                              fontSize: '12px',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <Coffee size={13} color="#b45309" />
                            <span>☕ Quick Tea Break (15 Min)</span>
                          </button>
                          <button
                            id="btn-menu-lunch-break"
                            onClick={() => { startLunchBreak(); setShowBreakDropdown(false); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              fontWeight: '700',
                              fontSize: '12px',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <Utensils size={13} color="#1d4ed8" />
                            <span>🍱 Lunch Break (45 Min)</span>
                          </button>
                          <button
                            id="btn-menu-custom-break"
                            onClick={() => { setIsBreakModalOpen(true); setShowBreakDropdown(false); }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#f8fafc',
                              color: '#475569',
                              fontWeight: '600',
                              fontSize: '12px',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <Clock size={13} color="#64748b" />
                            <span>⚡ Custom Break / All Options...</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* CLOCK OUT BUTTON */}
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
                        padding: '10px 22px',
                        borderRadius: '8px',
                        fontSize: '13.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Square size={12} fill="#fff" />
                      <span>Clock Out</span>
                    </button>
                  </div>
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
                  >
                    <Play size={13} fill="#fff" />
                    <span>Clock In (Start Shift)</span>
                  </button>
                )
              )}

              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                {displayedIsClockedIn
                  ? `Shift Active (${displayedWorkDuration || '0h 0m'})`
                  : (displayedHadClockedOut
                    ? `Ended at ${displayedClockOutTime || 'Today'} (${displayedWorkDuration})`
                    : 'Shift not active')}
              </span>
            </div>
          </div>
        </div>
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
        <div id="active-timer-card" style={{
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
                  <span>Start: <strong style={{ color: '#334155' }}>{displayActiveTask?.timerStartTime || (displayActiveTask?.timerRunning ? 'Running ⏱️' : (isOnBreak ? 'On Break ☕' : (displayActiveTask?.timerSeconds > 0 ? 'Paused ⏸️' : 'Not Started')))}</strong></span>
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
              {isViewingOtherEmployee ? (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '7px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  fontSize: '11.5px',
                  color: '#64748b',
                  fontWeight: '600'
                }}>
                  👀 Active task timer is controlled by {effectiveTargetUser?.name || 'Employee'}
                </div>
              ) : (
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
                    onClick={() => completeTask(displayActiveTask._id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(22, 163, 74, 0.25)'
                    }}
                    title="Mark this task as complete"
                  >
                    <CheckCircle2 size={12} />
                    <span>Complete</span>
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
              )}

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
              onClick={() => document.getElementById('tasks-delegation-widget')?.scrollIntoView({ behavior: 'smooth' })}
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
              title="Click to view all tasks"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Tasks</span>
                <ListTodo size={15} color="#0284c7" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginTop: '2px' }}>
                <div>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#0284c7' }}>{myPendingTasks.length}</span>
                  <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '4px' }}>Pending</span>
                </div>
                <div>
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
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>{(projects || []).filter(p => p.status !== 'completed').length || 1}</span>
                  <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '4px' }}>In Progress</span>
                </div>
                <div>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#64748b' }}>0</span>
                  <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '4px' }}>Overdue</span>
                </div>
              </div>
            </div>
          </div>

          {/* Week Timelogs Card (Exact Match from User Photo) */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            {/* Header: Title + Pill Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} color="#0284c7" />
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Week Timelogs
                </h3>
              </div>

              {/* Exact Pill Badge from Screenshot: XXh YYm This Week */}
              <div style={{
                backgroundColor: '#0284c7',
                backgroundImage: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '14px',
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '0.01em',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>{totalWeeklyFormatted} This Week</span>
              </div>
            </div>

            {/* Weekdays Row: Mo, Tu, We, Th, Fr, Sa, Su */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '4px',
              padding: '4px 0'
            }}>
              {(weeklyTimeLogs || []).map(dayLog => {
                const isSelected = dayLog.shortDay === activeWeekDayShort;
                const isCurrent = dayLog.isCurrentDay;
                const dayHrs = isCurrent
                  ? (totalTaskTodaySecs > 0 ? (totalTaskTodaySecs < 60 ? `${totalTaskTodaySecs}s` : `${Math.floor(totalTaskTodaySecs / 3600)}h ${String(Math.floor((totalTaskTodaySecs % 3600) / 60)).padStart(2, '0')}m`) : '0h')
                  : (dayLog.durationText && dayLog.durationText !== '0h 00m' ? dayLog.durationText : '0h');

                return (
                  <button
                    key={dayLog.shortDay}
                    onClick={() => setActiveWeekDayShort(dayLog.shortDay)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      flex: 1
                    }}
                    title={`Click to view ${dayLog.day}'s timelog: ${dayHrs} worked`}
                  >
                    {/* Circle badge for selected day, or plain letter */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? '#0284c7' : (isCurrent ? '#eff6ff' : 'transparent'),
                      color: isSelected ? '#ffffff' : (isCurrent ? '#0284c7' : '#475569'),
                      border: isCurrent && !isSelected ? '1.5px solid #bfdbfe' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: isSelected || isCurrent ? '800' : '600',
                      boxShadow: isSelected ? '0 2px 8px rgba(2, 132, 199, 0.35)' : 'none',
                      transition: 'all 0.15s ease'
                    }}>
                      {dayLog.shortDay}
                    </div>

                    {/* Tiny hour tag below each day */}
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: isSelected ? '800' : '600',
                      color: isSelected ? '#0284c7' : (dayHrs !== '0h' ? '#0f172a' : '#94a3b8')
                    }}>
                      {dayHrs}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Blue Progress Bar (Exact look from Screenshot) */}
            <div style={{
              width: '100%',
              height: '7px',
              backgroundColor: '#e2e8f0',
              borderRadius: '4px',
              overflow: 'hidden',
              marginTop: '2px'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Math.max(12, ((totalWeeklyHours || 0) / 40) * 100))}%`,
                backgroundColor: '#0284c7',
                backgroundImage: 'linear-gradient(90deg, #0284c7 0%, #2563eb 100%)',
                borderRadius: '4px',
                transition: 'width 0.4s ease'
              }} />
            </div>

            {/* Subtitle Footer Row: Duration: Xh Ym | Break: 0s | Day Log 👁️ */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
              color: '#64748b',
              marginTop: '2px',
              flexWrap: 'wrap',
              gap: '6px'
            }}>
              <div>
                <span>Duration: </span>
                <strong style={{ color: '#0f172a', fontWeight: '800' }}>
                  {displayedSelectedDayDuration}
                </strong>
                {isSelectedDayToday && totalTaskTodaySecs > 0 && (
                  <span style={{ marginLeft: '4px', fontSize: '10px', color: '#16a34a', fontWeight: '700' }}>
                    ● Live
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div>
                  <span>Break: </span>
                  <strong style={{ color: '#475569' }}>
                    {isSelectedDayToday && displayedBreakDuration
                      ? displayedBreakDuration
                      : (selectedDayLogData?.breakDuration || '0s')}
                  </strong>
                </div>

                <button
                  onClick={() => openDayLogModalForUser(effectiveTargetUser, selectedDayLogData?.date || todayStr)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#eff6ff',
                    color: '#0284c7',
                    border: '1px solid #bfdbfe',
                    borderRadius: '5px',
                    padding: '2px 8px',
                    fontSize: '10.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title={`View all tasks worked on ${selectedDayLogData?.day || 'selected day'}`}
                >
                  <Eye size={11} color="#0284c7" />
                  <span>Day Log 👁️</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks widget removed to declutter dashboard - dedicated board at /tasks */}

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
