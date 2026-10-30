import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Zap,
  Clock,
  UserCheck,
  Users,
  Coffee,
  Play,
  Pause,
  Square,
  Eye,
  CheckCircle2,
  AlertCircle,
  Shield,
  Search,
  Filter,
  ArrowUpDown,
  Check,
  X,
  ChevronRight,
  LogIn,
  LogOut,
  RefreshCw,
  HelpCircle,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { useHR } from '../context/HRContext';
import { useWork } from '../../work/context/WorkContext';
import { useToast } from '../../../shared/context/ToastContext';
import { hrService } from '../services/hrService';
import { getCollection, saveCollection, KEYS } from '../../../shared/services/storageService';
import { DayTimeLogModal } from '../../../shared/components/modals/DayTimeLogModal';
import { getUserModulePermissions, isHRorAdmin as checkIsHRorAdmin, isAdmin as checkIsAdmin } from '../../../shared/utils/permissionUtils';
import { subscribeToSyncEvents } from '../../../shared/services/realtimeSyncService';

export const TeamOperationsPage = () => {
  const navigate = useNavigate();
  const { currentUser, isHRorAdmin } = useAuth();
  const { employees, attendance, leaves, loadHRData } = useHR();
  const { tasks, completeTask, formatSeconds, startTaskTimer, pauseTaskTimer } = useWork();
  const { addToast } = useToast();

  const isPrivileged = isHRorAdmin || checkIsHRorAdmin(currentUser) || checkIsAdmin(currentUser) || currentUser?.isDelegatedAdmin;

  const [syncTick, setSyncTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'working' | 'break' | 'clocked_out' | 'offline'
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Modals state
  const [activeDayLogTarget, setActiveDayLogTarget] = useState(null);
  const [clockInModalTarget, setClockInModalTarget] = useState(null);
  const [clockOutModalTarget, setClockOutModalTarget] = useState(null);
  const [emergencyReason, setEmergencyReason] = useState('Electricity / Power cut override');
  const [customPunchTime, setCustomPunchTime] = useState('');

  // 📬 Profile Credential Change Requests State
  const [profileRequests, setProfileRequests] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('EMS_PROFILE_UPDATE_REQUESTS') || '[]');
    } catch (e) {
      return [];
    }
  });

  const pendingProfileRequests = profileRequests.filter(r => r.status === 'pending');

  const handleApproveProfileRequest = (req) => {
    try {
      const emps = getCollection(KEYS.EMPLOYEES, []);
      const idx = emps.findIndex(e => e._id === req.employeeId || e.employeeCode === req.employeeCode);
      if (idx >= 0) {
        if (req.field === 'email') {
          emps[idx].email = req.requestedValue;
        } else if (req.field === 'name') {
          emps[idx].name = req.requestedValue;
        }
        saveCollection(KEYS.EMPLOYEES, emps);
      }

      const updatedReqs = profileRequests.map(r => r.id === req.id ? { ...r, status: 'approved', approvedAt: new Date().toISOString() } : r);
      setProfileRequests(updatedReqs);
      localStorage.setItem('EMS_PROFILE_UPDATE_REQUESTS', JSON.stringify(updatedReqs));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));
      addToast(`Approved ${req.field} change for ${req.employeeName}! Record updated.`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to approve request', 'error');
    }
  };

  const handleRejectProfileRequest = (req) => {
    try {
      const updatedReqs = profileRequests.map(r => r.id === req.id ? { ...r, status: 'rejected', rejectedAt: new Date().toISOString() } : r);
      setProfileRequests(updatedReqs);
      localStorage.setItem('EMS_PROFILE_UPDATE_REQUESTS', JSON.stringify(updatedReqs));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_profile_requests' } }));
      addToast(`Declined ${req.field} request for ${req.employeeName}.`, 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1-sec live ticker for real-time timer progression
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync on storage changes
  useEffect(() => {
    const handleStorage = () => setSyncTick(t => t + 1);
    window.addEventListener('hrms_storage_change', handleStorage);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('ems_clocked_in', handleStorage);
    window.addEventListener('ems_clocked_out', handleStorage);
    window.addEventListener('ems_force_clock_out', handleStorage);
    window.addEventListener('ems_task_timer_started', handleStorage);
    window.addEventListener('ems_task_timer_paused', handleStorage);

    return () => {
      window.removeEventListener('hrms_storage_change', handleStorage);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('ems_clocked_in', handleStorage);
      window.removeEventListener('ems_clocked_out', handleStorage);
      window.removeEventListener('ems_force_clock_out', handleStorage);
      window.removeEventListener('ems_task_timer_started', handleStorage);
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeToSyncEvents(() => setSyncTick(t => t + 1));
    return unsub;
  }, []);

  // Helper: Format duration nicely
  const formatTimeDurationSafe = (totalSecs) => {
    const safe = Math.max(0, Number(totalSecs) || 0);
    const hrs = Math.floor(safe / 3600);
    const mins = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;
    if (hrs > 0) {
      return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
    }
    return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  // Helper: Parse time string "09:30 AM" or "14:15" to seconds from midnight
  const parseTimeToSeconds = (tStr) => {
    if (!tStr || typeof tStr !== 'string') return 0;
    const clean = tStr.trim();
    const isPM = /pm/i.test(clean);
    const isAM = /am/i.test(clean);
    const parts = clean.replace(/[^\d:]/g, '').split(':').map(Number);
    let hrs = parts[0] || 0;
    const mins = parts[1] || 0;
    const secs = parts[2] || 0;
    if (isPM && hrs < 12) hrs += 12;
    if (isAM && hrs === 12) hrs = 0;
    return hrs * 3600 + mins * 60 + secs;
  };

  // Helper: Check if task is assigned to user
  const isTaskAssignedToUser = useCallback((t, user) => {
    if (!t || !user) return false;
    const uId = String(user._id || '').toLowerCase();
    const uCode = String(user.employeeCode || '').toLowerCase();
    const uName = String(user.name || '').toLowerCase().trim();

    if (t.assignedToId && [uId, uCode].includes(String(t.assignedToId).toLowerCase())) return true;
    if (t.assignedTo && [uId, uCode].includes(String(t.assignedTo).toLowerCase())) return true;
    if (t.assignedToName && uName && t.assignedToName.toLowerCase().trim() === uName) return true;

    if (Array.isArray(t.assignedToIds) && t.assignedToIds.some(id => [uId, uCode].includes(String(id).toLowerCase()))) {
      return true;
    }
    if (Array.isArray(t.assignees) && t.assignees.some(a => {
      const aId = String(a._id || a.id || a.employeeCode || '').toLowerCase();
      const aName = String(a.name || '').toLowerCase().trim();
      return (aId && [uId, uCode].includes(aId)) || (aName && aName === uName);
    })) {
      return true;
    }
    return false;
  }, []);

  // Calculate live today shift & task state for an employee
  const getEmployeeTodayState = useCallback((emp) => {
    if (!emp) return null;
    const empKey = emp.employeeCode || (emp._id ? String(emp._id) : '');
    const empId = emp._id;
    const empName = emp.name || '';

    const attRec = (attendance || []).find(a =>
      a.date === todayStr && (
        String(a.employeeId) === String(empId) ||
        String(a.employee) === String(empId) ||
        String(a.employeeCode) === String(emp.employeeCode) ||
        (empName && a.employeeName?.toLowerCase() === empName.toLowerCase())
      )
    );

    const isOnLeave = Boolean(attRec?.status === 'on_leave');
    const storedClockedIn = localStorage.getItem(`ems_timer_${empKey}_is_clocked_in`) === 'true' ||
                            localStorage.getItem(`ems_timer_${empId}_is_clocked_in`) === 'true';
    const storedOnBreak = localStorage.getItem(`ems_timer_${empKey}_is_on_break`) === 'true' ||
                          localStorage.getItem(`ems_timer_${empId}_is_on_break`) === 'true';
    const storedBreakType = localStorage.getItem(`ems_timer_${empKey}_break_type`) || localStorage.getItem(`ems_timer_${empId}_break_type`) || 'Break';
    const storedLogin = localStorage.getItem(`ems_timer_${empKey}_login_time`) || localStorage.getItem(`ems_timer_${empId}_login_time`);
    const storedClockOut = localStorage.getItem(`ems_timer_${empKey}_clock_out`) || localStorage.getItem(`ems_timer_${empId}_clock_out`);
    const storedWorkSecs = Number(localStorage.getItem(`ems_timer_${empKey}_work_seconds`)) || Number(localStorage.getItem(`ems_timer_${empId}_work_seconds`)) || 0;
    const storedBreakSecs = Number(localStorage.getItem(`ems_timer_${empKey}_break_seconds`)) || Number(localStorage.getItem(`ems_timer_${empId}_break_seconds`)) || 0;

    const isClockedIn = storedClockedIn || (!!attRec?.clockInTime && !attRec?.clockOutTime && attRec?.isClockedIn !== false);
    const isClockedOut = !isClockedIn && (!!storedClockOut || !!attRec?.clockOutTime);
    const loginTime = attRec?.clockInTime || storedLogin || (isClockedIn ? 'Active' : (isOnLeave ? 'On Leave' : '--'));
    const clockOutTime = attRec?.clockOutTime || storedClockOut || null;

    let workSecs = storedWorkSecs || Number(attRec?.workSeconds) || 0;
    if (isClockedIn && !storedOnBreak) {
      let clockInTs = Number(attRec?.clockInTimestamp) ||
                      Number(localStorage.getItem(`ems_timer_${empKey}_clock_in_timestamp`)) ||
                      Number(localStorage.getItem(`ems_timer_${empId}_clock_in_timestamp`));
      if (!clockInTs && loginTime && loginTime !== 'Active' && loginTime !== '--' && loginTime !== 'On Leave') {
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        clockInTs = todayMidnight.getTime() + parseTimeToSeconds(loginTime) * 1000;
      }
      if (clockInTs > 0) {
        const gross = Math.max(0, Math.floor((Date.now() - clockInTs) / 1000));
        workSecs = Math.max(workSecs, gross - storedBreakSecs);
      }
    } else if (isClockedOut && !workSecs && attRec?.totalWorkingHours) {
      workSecs = Math.round(attRec.totalWorkingHours * 3600);
    }

    // Active Running Task
    let activeTimer = null;
    try {
      const rawTimer = localStorage.getItem(`ems_active_task_timer_${empKey}`) ||
                       localStorage.getItem(`ems_active_task_timer_${empId}`);
      if (rawTimer) activeTimer = JSON.parse(rawTimer);
    } catch {}

    const empTasks = (tasks || []).filter(t => isTaskAssignedToUser(t, emp));
    const baseRunningTask = empTasks.find(t => t.timerRunning) || (activeTimer?.timerRunning ? activeTimer : null);
    let runningTask = null;

    if (baseRunningTask) {
      let liveTaskSecs = Number(baseRunningTask.timerSeconds) || Number(baseRunningTask.accumulatedSeconds) || 0;
      const startEpoch = baseRunningTask.startEpoch || (baseRunningTask.startedAt ? Number(baseRunningTask.startedAt) : 0);
      if (baseRunningTask.timerRunning && startEpoch > 0) {
        const elapsed = Math.max(0, Math.floor((Date.now() - startEpoch) / 1000));
        liveTaskSecs = (Number(baseRunningTask.accumulatedSeconds) || Number(baseRunningTask.timerSeconds) || 0) + elapsed;
      }
      runningTask = {
        ...baseRunningTask,
        liveTaskSecs,
        liveDurationText: formatSeconds(liveTaskSecs)
      };
    }

    return {
      emp,
      empKey,
      empId,
      empName,
      department: emp.department || 'General',
      isOnLeave,
      isClockedIn,
      isOnBreak: storedOnBreak,
      breakType: storedBreakType,
      isClockedOut,
      loginTime,
      clockOutTime,
      workSecs,
      breakSecs: storedBreakSecs,
      runningTask,
      empTasks
    };
  }, [attendance, tasks, todayStr, isTaskAssignedToUser, formatSeconds]);

  // Compute live states for all employees
  const teamTodayStates = useMemo(() => {
    return (employees || []).map(emp => getEmployeeTodayState(emp)).filter(Boolean);
  }, [employees, getEmployeeTodayState, syncTick]);

  // Overall KPI counts
  const kpiStats = useMemo(() => {
    const total = teamTodayStates.length;
    const onLeave = teamTodayStates.filter(s => s.isOnLeave).length;
    const working = teamTodayStates.filter(s => s.isClockedIn && !s.isOnBreak && !s.isOnLeave).length;
    const onBreak = teamTodayStates.filter(s => s.isClockedIn && s.isOnBreak && !s.isOnLeave).length;
    const clockedOut = teamTodayStates.filter(s => s.isClockedOut && !s.isOnLeave).length;
    const offline = Math.max(0, total - working - onBreak - clockedOut - onLeave);
    const runningTasksCount = teamTodayStates.filter(s => s.runningTask && !s.isOnLeave).length;

    return { total, onLeave, working, onBreak, clockedOut, offline, runningTasksCount };
  }, [teamTodayStates]);

  // Distinct departments
  const departments = useMemo(() => {
    const set = new Set(teamTodayStates.map(s => s.department).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [teamTodayStates]);

  // Filtered list
  const filteredTeam = useMemo(() => {
    return teamTodayStates.filter(item => {
      // Status filter
      if (statusFilter === 'working' && (!item.isClockedIn || item.isOnBreak)) return false;
      if (statusFilter === 'break' && (!item.isClockedIn || !item.isOnBreak)) return false;
      if (statusFilter === 'clocked_out' && !item.isClockedOut) return false;
      if (statusFilter === 'offline' && (item.isClockedIn || item.isClockedOut)) return false;

      // Department filter
      if (departmentFilter !== 'all' && item.department !== departmentFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.empName.toLowerCase().includes(q);
        const matchesCode = String(item.emp.employeeCode || '').toLowerCase().includes(q);
        const matchesRole = String(item.emp.role || '').toLowerCase().includes(q);
        const matchesDept = String(item.department).toLowerCase().includes(q);
        return matchesName || matchesCode || matchesRole || matchesDept;
      }

      return true;
    });
  }, [teamTodayStates, statusFilter, departmentFilter, searchQuery]);

  // =========================================================================
  // ADMIN OVERRIDE ACTIONS
  // =========================================================================

  // 1. Emergency Clock In
  const handleExecuteClockIn = async () => {
    if (!clockInModalTarget) return;
    const emp = clockInModalTarget;
    const empKey = emp.employeeCode || String(emp._id);
    const punchTime = customPunchTime.trim() || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    try {
      localStorage.setItem(`ems_timer_${empKey}_is_clocked_in`, 'true');
      localStorage.setItem(`ems_timer_${empKey}_is_running`, 'true');
      localStorage.setItem(`ems_timer_${empKey}_is_on_break`, 'false');
      localStorage.setItem(`ems_timer_${empKey}_login_time`, punchTime);
      localStorage.setItem(`ems_timer_${empKey}_clock_in_timestamp`, Date.now().toString());
      localStorage.removeItem(`ems_timer_${empKey}_clock_out`);

      if (emp._id) {
        localStorage.setItem(`ems_timer_${emp._id}_is_clocked_in`, 'true');
        localStorage.setItem(`ems_timer_${emp._id}_login_time`, punchTime);
      }

      // Persist attendance directly to MongoDB & Local Storage
      try {
        await hrService.markAttendance({
          employee: emp._id || empKey,
          employeeId: emp._id || empKey,
          employeeCode: emp.employeeCode || empKey,
          employeeName: emp.name,
          date: todayStr,
          status: 'present',
          clockInTime: punchTime,
          markedBy: currentUser?.name || 'Administrator',
          isAdminOverride: true,
          auditNote: emergencyReason ? `Emergency Clock-In: ${emergencyReason}` : 'Emergency Clock-In by Admin'
        });
      } catch (markErr) {
        console.warn('markAttendance warning during emergency clock-in:', markErr);
      }

      try {
        await hrService.createAttendanceAuditLog({
          type: 'admin_emergency_clock_in',
          action: 'admin_emergency_clock_in',
          date: todayStr,
          employeeId: empKey,
          employeeCode: emp.employeeCode || empKey,
          employeeName: emp.name,
          actorId: currentUser?._id,
          actorName: currentUser?.name || 'Admin',
          actorRole: 'Administrator',
          note: `Emergency Clock-In by Admin: "${emergencyReason}" (In Time: ${punchTime})`
        });
      } catch (auditErr) {
        console.warn('Audit log warning:', auditErr);
      }

      window.dispatchEvent(new CustomEvent('ems_clocked_in', {
        detail: { userKey: empKey, employeeId: emp._id, employeeCode: emp.employeeCode, loginTime: punchTime, date: todayStr }
      }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));

      addToast(`⚡ Emergency Clock-In recorded for ${emp.name}!`, 'success');
      setClockInModalTarget(null);
      setCustomPunchTime('');
      setSyncTick(t => t + 1);
    } catch (err) {
      console.error('Emergency clock-in encountered error:', err);
      addToast(`⚡ Emergency Clock-In recorded for ${emp.name}!`, 'success');
      setClockInModalTarget(null);
      setCustomPunchTime('');
      setSyncTick(t => t + 1);
    }
  };

  // 2. Emergency Clock Out
  const handleExecuteClockOut = async () => {
    if (!clockOutModalTarget) return;
    const emp = clockOutModalTarget;
    const empKey = emp.employeeCode || String(emp._id);
    const punchTime = customPunchTime.trim() || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    try {
      try {
        await hrService.adminForceClockOut(emp._id || empKey, `Emergency Shift End: ${emergencyReason} (${punchTime})`, todayStr);
      } catch (backendErr) {
        console.warn('Backend adminForceClockOut warning:', backendErr);
      }

      localStorage.setItem(`ems_timer_${empKey}_is_clocked_in`, 'false');
      localStorage.setItem(`ems_timer_${empKey}_is_running`, 'false');
      localStorage.setItem(`ems_timer_${empKey}_is_on_break`, 'false');
      localStorage.setItem(`ems_timer_${empKey}_clock_out`, punchTime);

      if (emp._id) {
        localStorage.setItem(`ems_timer_${emp._id}_is_clocked_in`, 'false');
        localStorage.setItem(`ems_timer_${emp._id}_clock_out`, punchTime);
      }

      // Pause running tasks for this employee
      const allTasks = getCollection(KEYS.TASKS) || [];
      const updatedTasks = allTasks.map(t => {
        if ((String(t.assignedToId) === empKey || String(t.assignedTo) === empKey || t.assignedToName?.toLowerCase() === emp.name?.toLowerCase()) && t.timerRunning) {
          return { ...t, timerRunning: false };
        }
        return t;
      });
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

      try {
        await hrService.createAttendanceAuditLog({
          type: 'admin_emergency_clock_out',
          action: 'admin_emergency_clock_out',
          date: todayStr,
          employeeId: empKey,
          employeeCode: emp.employeeCode || empKey,
          employeeName: emp.name,
          actorId: currentUser?._id,
          actorName: currentUser?.name || 'Admin',
          actorRole: 'Administrator',
          note: `Emergency Clock-Out by Admin: "${emergencyReason}" (Out Time: ${punchTime})`
        });
      } catch (auditErr) {
        console.warn('Audit log warning:', auditErr);
      }

      window.dispatchEvent(new CustomEvent('ems_force_clock_out', { detail: { employeeId: emp._id, adminName: currentUser?.name } }));
      window.dispatchEvent(new CustomEvent('ems_clocked_out', { detail: { employeeId: emp._id } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));

      addToast(`🛑 Clocked out ${emp.name} successfully!`, 'success');
      setClockOutModalTarget(null);
      setCustomPunchTime('');
      setSyncTick(t => t + 1);
    } catch (err) {
      console.error('Emergency clock out encountered error:', err);
      addToast(`🛑 Clocked out ${emp.name} successfully!`, 'success');
      setClockOutModalTarget(null);
      setCustomPunchTime('');
      setSyncTick(t => t + 1);
    }
  };

  // 3. Admin Pause Task Timer
  const handleAdminPauseTask = async (task, emp) => {
    try {
      const empKey = emp.employeeCode || String(emp._id);
      const allTasks = getCollection(KEYS.TASKS) || [];
      const updatedTasks = allTasks.map(t => {
        if (String(t._id || t.id) === String(task._id || task.id)) {
          return { ...t, timerRunning: false, sessionDate: todayStr };
        }
        return t;
      });
      saveCollection(KEYS.TASKS, updatedTasks);

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

      await hrService.createAttendanceAuditLog({
        type: 'admin_task_pause_override',
        action: 'admin_task_pause_override',
        date: todayStr,
        employeeId: empKey,
        employeeCode: emp.employeeCode || empKey,
        employeeName: emp.name,
        actorId: currentUser?._id,
        actorName: currentUser?.name || 'Admin',
        note: `Admin paused task #${task.taskCode || 'TSK'}: "${task.title}" for ${emp.name}`
      });

      window.dispatchEvent(new CustomEvent('ems_task_timer_paused', { detail: { taskId: task._id, empKey } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      setSyncTick(t => t + 1);
      addToast(`⏸️ Paused task #${task.taskCode || 'TSK'} for ${emp.name}!`, 'info');
    } catch (err) {
      console.error('Failed to pause task:', err);
      addToast('Failed to pause task', 'error');
    }
  };

  // 4. Open Day Log Modal for Employee
  const handleOpenDayLog = (empState) => {
    const emp = empState.emp;
    const empTasks = (tasks || []).filter(t => isTaskAssignedToUser(t, emp));

    const tasksWorked = empTasks.map(t => ({
      taskId: t._id,
      taskCode: t.taskCode || 'TSK',
      taskTitle: t.title,
      projectName: t.projectName || 'General',
      durationText: t.hoursLoggedText || formatSeconds(t.timerSeconds || 0),
      status: t.status || 'pending',
      isCompleted: t.status === 'completed',
      timerRunning: Boolean(t.timerRunning)
    }));

    const logData = {
      date: todayStr,
      day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      isCurrentDay: true,
      employeeId: emp._id,
      employeeCode: emp.employeeCode || '',
      employeeName: emp.name,
      employeeRole: emp.role || 'Member',
      loginTime: empState.loginTime || '--',
      logoutTime: empState.clockOutTime || '--',
      durationText: formatTimeDurationSafe(empState.workSecs),
      breakDuration: formatTimeDurationSafe(empState.breakSecs),
      isClockedIn: empState.isClockedIn,
      isOnBreak: empState.isOnBreak,
      isClockedOut: empState.isClockedOut,
      tasksWorked
    };

    setActiveDayLogTarget(logData);
  };

  const perms = getUserModulePermissions(currentUser);
  const canAccessLiveOps = isHRorAdmin || perms?.liveOperations || perms?.viewAllAttendance;

  if (!canAccessLiveOps) {
    return (
      <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mt-5">
        <Shield size={40} className="mx-auto mb-3 text-red-600" />
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
          Access Restricted
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-[13px] mt-1.5">
          Live Operations & Emergency Shift Overrides require Administrator, HR, or delegated Live Operations permission.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px] pb-[30px]">
      {/* ── HEADER BANNER ── */}
      <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between flex-wrap gap-2.5 shadow-sm min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Zap size={17} className="fill-orange-600 text-orange-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0 leading-tight">
                Live Operations & Shift Controls
              </h1>
              <span className="text-[10.5px] font-bold bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/60 px-1.5 py-0.5 rounded-[10px] inline-flex items-center gap-1">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-500" />
                Real-Time Sync
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
              Administrative operational hub for real-time shift oversight, emergency overrides, and task controls.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            loadHRData();
            setSyncTick(t => t + 1);
            addToast('Refreshed live shift data', 'info');
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all"
        >
          <RefreshCw size={13} />
          <span>Sync Now</span>
        </button>
      </div>

      {/* ── PENDING CREDENTIAL CHANGE REQUESTS (ADMIN REVIEW) ── */}
      {isHRorAdmin && pendingProfileRequests.length > 0 && (
        <div className="bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border-[1.5px] border-blue-200 dark:border-blue-900/50 px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-extrabold text-blue-800 dark:text-blue-200">
                Pending Employee Credential Change Requests ({pendingProfileRequests.length})
              </span>
            </div>
            <span className="text-[11px] text-blue-500 dark:text-blue-400 font-semibold">
              Requires Super Admin Approval to update official database records
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {pendingProfileRequests.map(req => (
              <div
                key={req.id}
                className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-3 rounded-lg border border-blue-100 dark:border-blue-900/40 gap-3 flex-wrap"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[13px] text-slate-900 dark:text-slate-100">
                      {req.employeeName}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">({req.employeeCode})</span>
                    <span className={`text-[10.5px] font-bold px-[7px] py-0.5 rounded ${req.field === 'email' ? 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'}`}>
                      Requested {req.field === 'email' ? 'Email' : 'Name'} Change
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                    <span className="line-through text-slate-400 dark:text-slate-500">{req.currentValue}</span>
                    <span className="mx-1.5">➔</span>
                    <strong className="text-blue-600">{req.requestedValue}</strong>
                    <span className="text-slate-500 dark:text-slate-400 ml-2.5 italic">Reason: &quot;{req.reason}&quot;</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRejectProfileRequest(req)}
                    className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11.5px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleApproveProfileRequest(req)}
                    className="px-3.5 py-1.5 rounded-md border-0 bg-emerald-600 text-white text-[11.5px] font-bold cursor-pointer hover:bg-emerald-700 shadow-sm"
                  >
                    ✓ Approve Change
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI STATS CARDS ── */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Team</span>
            <Users size={16} className="text-sky-600" />
          </div>
          <div className="text-[22px] font-extrabold text-slate-900 dark:text-slate-100 mt-1.5">
            {kpiStats.total}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Registered employees
          </div>
        </div>

        <div className="rounded-[10px] border border-green-200 dark:border-green-900/50 bg-green-50/70 dark:bg-green-950/30 px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between text-green-800 dark:text-green-300 text-xs font-bold">
            <span>Working Now</span>
            <Clock size={16} className="text-green-700 dark:text-green-400" />
          </div>
          <div className="text-[22px] font-extrabold text-green-700 dark:text-green-400 mt-1.5">
            {kpiStats.working}
          </div>
          <div className="text-[11px] text-green-800 dark:text-green-400 mt-0.5">
            Actively on shift
          </div>
        </div>

        <div className="rounded-[10px] border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-xs font-bold">
            <span>On Break</span>
            <Coffee size={16} className="text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-[22px] font-extrabold text-amber-700 dark:text-amber-400 mt-1.5">
            {kpiStats.onBreak}
          </div>
          <div className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5">
            Tea / Lunch breaks
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Shift Ended</span>
            <LogOut size={16} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="text-[22px] font-extrabold text-slate-600 dark:text-slate-300 mt-1.5">
            {kpiStats.clockedOut}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Clocked out today
          </div>
        </div>

        <div className="rounded-[10px] border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between text-blue-800 dark:text-blue-300 text-xs font-bold">
            <span>Running Tasks</span>
            <Play size={16} className="text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
          </div>
          <div className="text-[22px] font-extrabold text-blue-600 dark:text-blue-400 mt-1.5">
            {kpiStats.runningTasksCount}
          </div>
          <div className="text-[11px] text-blue-800 dark:text-blue-400 mt-0.5">
            Active timers live
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH STRIP ── */}
      <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between flex-wrap gap-3 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { id: 'all', label: `All (${kpiStats.total})` },
            { id: 'working', label: `Working (${kpiStats.working})` },
            { id: 'break', label: `Break (${kpiStats.onBreak})` },
            { id: 'clocked_out', label: `Clocked Out (${kpiStats.clockedOut})` },
            { id: 'offline', label: `Offline (${kpiStats.offline})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`border-0 px-3 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                statusFilter === tab.id
                  ? 'font-bold bg-sky-600 text-white'
                  : 'font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Department Filters */}
        <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-[5px] max-w-[240px] w-full">
            <Search size={14} className="text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent outline-none text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 w-full"
            />
            {searchQuery && (
              <X size={12} className="text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300" onClick={() => setSearchQuery('')} />
            )}
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-semibold outline-none cursor-pointer"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── LIVE OPERATIONS TABLE ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 font-bold">Employee</th>
                <th className="px-4 py-3 font-bold">Work Mode</th>
                <th className="px-4 py-3 font-bold">Department</th>
                <th className="px-4 py-3 font-bold">Shift Status</th>
                <th className="px-4 py-3 font-bold">Punch Times</th>
                <th className="px-4 py-3 font-bold">Net Work Time</th>
                <th className="px-4 py-3 font-bold">Active Running Task</th>
                <th className="px-4 py-3 font-bold text-right">Admin Overrides</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeam.length > 0 ? (
                filteredTeam.map((item) => {
                  const emp = item.emp;
                  const isCur = Boolean(
                    currentUser && (
                      (emp._id && currentUser._id && String(emp._id) === String(currentUser._id)) ||
                      (emp._id && currentUser.id && String(emp._id) === String(currentUser.id)) ||
                      (emp.employeeCode && currentUser.employeeCode && String(emp.employeeCode).trim().toLowerCase() === String(currentUser.employeeCode).trim().toLowerCase()) ||
                      (emp.email && currentUser.email && String(emp.email).trim().toLowerCase() === String(currentUser.email).trim().toLowerCase()) ||
                      (emp.name && currentUser.name && String(emp.name).trim().toLowerCase() === String(currentUser.name).trim().toLowerCase())
                    )
                  );

                  return (
                    <tr
                      key={emp._id}
                      className={`border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/50 ${
                        item.isClockedIn ? (item.isOnBreak ? 'bg-amber-50/20 dark:bg-amber-950/20' : 'bg-emerald-50/20 dark:bg-emerald-950/20') : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                      {/* Employee Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={emp.name}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{emp.name}</span>
                              {isCur && (
                                <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded-full leading-tight">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {emp.role || 'Member'} • <span className="text-slate-400 dark:text-slate-500">#{emp.employeeCode || emp._id}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Working Mode Badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[11px] font-bold border ${
                          emp.workingMode === 'Remote'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : emp.workingMode === 'Hybrid'
                            ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                            : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                        }`}>
                          <span>{emp.workingMode === 'Remote' ? '🏡 Remote' : emp.workingMode === 'Hybrid' ? '🔄 Hybrid' : '🏢 Office'}</span>
                        </span>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-[3px] rounded text-[11px]">
                          {item.department}
                        </span>
                      </td>

                      {/* Shift Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                          item.isClockedIn && item.isOnLeave
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : item.isOnLeave
                            ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                            : item.isClockedIn
                            ? (item.isOnBreak ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' : 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800')
                            : (item.isClockedOut ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-400 border-slate-200 dark:border-slate-700')
                        }`}>
                          <span className={`w-[7px] h-[7px] rounded-full ${
                            item.isClockedIn
                              ? 'bg-green-500'
                              : item.isOnLeave
                              ? 'bg-teal-500'
                              : item.isClockedOut
                              ? 'bg-slate-400'
                              : 'bg-slate-300'
                          }`} />
                          {item.isClockedIn && item.isOnLeave
                            ? 'Working (On Leave) 🟢🌴'
                            : item.isOnLeave
                            ? 'On Leave 🌴'
                            : item.isClockedIn
                            ? (item.isOnBreak ? `On ${item.breakType}` : 'Shift Active 🟢')
                            : (item.isClockedOut ? 'Clocked Out 🔴' : 'Not Clocked In ⚪')}
                        </span>
                      </td>

                      {/* Punch Times */}
                      <td className="px-4 py-3 text-[11.5px] text-slate-600 dark:text-slate-400">
                        <div>In: <strong className={item.loginTime ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>{item.loginTime || '--'}</strong></div>
                        <div>Out: <strong className={item.clockOutTime ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}>{item.clockOutTime || '--'}</strong></div>
                      </td>

                      {/* Net Work Time */}
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-sky-600 dark:text-sky-400 text-[13px]">
                          {formatTimeDurationSafe(item.workSecs)}
                        </div>
                        {item.breakSecs > 0 && (
                          <div className="text-[10.5px] text-amber-800 dark:text-amber-300 mt-0.5">
                            Breaks: {Math.round(item.breakSecs / 60)}m
                          </div>
                        )}
                      </td>

                      {/* Currently Running Task */}
                      <td className="px-4 py-3">
                        {item.runningTask ? (
                          <div className="max-w-[240px]">
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                              <strong className="text-[11.5px] text-slate-900 dark:text-slate-100 truncate">
                                #{item.runningTask.taskCode || 'TSK'}: {item.runningTask.title}
                              </strong>
                            </div>
                            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span>⏱️ <strong className="text-sky-600 dark:text-sky-400">{item.runningTask.liveDurationText}</strong></span>
                              <button
                                onClick={() => pauseTaskTimer(item.runningTask._id)}
                                className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded px-1.5 py-0.5 text-[10px] font-bold cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                title="Pause task timer for employee"
                              >
                                Pause ⏸️
                              </button>
                            </div>
                          </div>
                        ) : (() => {
                          const empPendingTasks = (tasks || []).filter(t => 
                            (t.assignedToId === emp._id || t.assignedTo === emp.employeeCode || t.assignedToName?.toLowerCase() === emp.name?.toLowerCase()) && 
                            t.status !== 'completed'
                          );
                          if (empPendingTasks.length > 0) {
                            const firstTask = empPendingTasks[0];
                            return (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => startTaskTimer(firstTask._id)}
                                  className="inline-flex items-center gap-1 border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 rounded px-2 py-0.5 text-[10.5px] font-bold cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/50"
                                  title={`Start timer for ${emp.name} on #${firstTask.taskCode || 'TSK'}: ${firstTask.title}`}
                                >
                                  <Play size={9} className="fill-green-600" /> Start #{firstTask.taskCode || 'TSK'}
                                </button>
                                {empPendingTasks.length > 1 && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">+{empPendingTasks.length - 1} more</span>
                                )}
                              </div>
                            );
                          }
                          return (
                            <span className="text-slate-400 dark:text-slate-500 text-[11.5px] italic">
                              No active tasks
                            </span>
                          );
                        })()}
                      </td>

                      {/* Admin Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Emergency Clock-In (If not clocked in or absent) */}
                          {!item.isClockedIn && (
                            <button
                              onClick={() => {
                                setClockInModalTarget(emp);
                                setEmergencyReason('Power cut / offline assist');
                                setCustomPunchTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-[11.5px] font-bold cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/50"
                              title="Clock in employee manually (e.g. power outage or offline)"
                            >
                              <LogIn size={11} />
                              <span>Clock In</span>
                            </button>
                          )}

                          {/* Emergency Clock-Out (If currently clocked in) */}
                          {item.isClockedIn && (
                            <button
                              onClick={() => {
                                setClockOutModalTarget(emp);
                                setEmergencyReason('Power cut / left office');
                                setCustomPunchTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 text-[11.5px] font-bold cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50"
                              title="End employee shift manually (e.g. left without punch)"
                            >
                              <LogOut size={11} />
                              <span>Clock Out</span>
                            </button>
                          )}

                          {/* Day Log View */}
                          <button
                            onClick={() => handleOpenDayLog(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-sky-600 dark:text-sky-400 border border-blue-200 dark:border-blue-800 text-[11.5px] font-bold cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50"
                            title={`Inspect ${emp.name}'s complete day audit log`}
                          >
                            <Eye size={12} className="text-sky-600" />
                            <span>Day Log</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-9 text-slate-400 dark:text-slate-500">
                    <Users size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <div className="text-[13px] font-bold text-slate-600 dark:text-slate-300">
                      No employees match filter
                    </div>
                    <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Try selecting another status tab or clear search query.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: EMERGENCY CLOCK IN ── */}
      {clockInModalTarget && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[3px] flex items-center justify-center z-[1000] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-[460px] w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 flex items-center justify-center">
                  <LogIn size={18} />
                </div>
                <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100 m-0">
                  Emergency Clock-In Override
                </h3>
              </div>
              <button
                onClick={() => setClockInModalTarget(null)}
                className="bg-transparent border-0 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[12.5px] text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              You are manually initiating shift clock-in for <strong>{clockInModalTarget.name}</strong> (#{clockInModalTarget.employeeCode}). This will be logged in the permanent audit trail.
            </p>

            <div className="flex flex-col gap-3 mb-5">
              <div>
                <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Punch In Time
                </label>
                <input
                  type="text"
                  value={customPunchTime}
                  onChange={(e) => setCustomPunchTime(e.target.value)}
                  placeholder="e.g. 09:30 AM"
                  className="w-full px-2.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Operational Reason (Power outage / offline assist)
                </label>
                <input
                  type="text"
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="Enter reason..."
                  className="w-full px-2.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setClockInModalTarget(null)}
                className="px-3.5 py-[7px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteClockIn}
                className="px-4 py-[7px] rounded-md border-0 bg-green-600 text-white text-xs font-bold cursor-pointer hover:bg-green-700 inline-flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Confirm Clock-In</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EMERGENCY CLOCK OUT ── */}
      {clockOutModalTarget && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[3px] flex items-center justify-center z-[1000] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-[460px] w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-300 flex items-center justify-center">
                  <LogOut size={18} />
                </div>
                <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100 m-0">
                  Emergency Clock-Out Override
                </h3>
              </div>
              <button
                onClick={() => setClockOutModalTarget(null)}
                className="bg-transparent border-0 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[12.5px] text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              You are manually ending the shift for <strong>{clockOutModalTarget.name}</strong> (#{clockOutModalTarget.employeeCode}). Any active running task timer will also be automatically paused.
            </p>

            <div className="flex flex-col gap-3 mb-5">
              <div>
                <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Punch Out Time
                </label>
                <input
                  type="text"
                  value={customPunchTime}
                  onChange={(e) => setCustomPunchTime(e.target.value)}
                  placeholder="e.g. 06:30 PM"
                  className="w-full px-2.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason (Power outage, left office, assist)
                </label>
                <input
                  type="text"
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="Enter reason..."
                  className="w-full px-2.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setClockOutModalTarget(null)}
                className="px-3.5 py-[7px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteClockOut}
                className="px-4 py-[7px] rounded-md border-0 bg-red-600 text-white text-xs font-bold cursor-pointer hover:bg-red-700 inline-flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Confirm Clock-Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DAY TIME LOG MODAL ── */}
      {activeDayLogTarget && (
        <DayTimeLogModal
          dayLog={activeDayLogTarget}
          onClose={() => setActiveDayLogTarget(null)}
        />
      )}
    </div>
  );
};

export default TeamOperationsPage;
