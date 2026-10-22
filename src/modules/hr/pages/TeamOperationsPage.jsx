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
        String(a.employeeCode) === String(emp.employeeCode) ||
        (empName && a.employeeName?.toLowerCase() === empName.toLowerCase())
      )
    );

    const storedClockedIn = localStorage.getItem(`ems_timer_${empKey}_is_clocked_in`) === 'true' ||
                            localStorage.getItem(`ems_timer_${empId}_is_clocked_in`) === 'true';
    const storedOnBreak = localStorage.getItem(`ems_timer_${empKey}_is_on_break`) === 'true' ||
                          localStorage.getItem(`ems_timer_${empId}_is_on_break`) === 'true';
    const storedBreakType = localStorage.getItem(`ems_timer_${empKey}_break_type`) || localStorage.getItem(`ems_timer_${empId}_break_type`) || 'Break';
    const storedLogin = localStorage.getItem(`ems_timer_${empKey}_login_time`) || localStorage.getItem(`ems_timer_${empId}_login_time`);
    const storedClockOut = localStorage.getItem(`ems_timer_${empKey}_clock_out`) || localStorage.getItem(`ems_timer_${empId}_clock_out`);
    const storedWorkSecs = Number(localStorage.getItem(`ems_timer_${empKey}_work_seconds`)) || Number(localStorage.getItem(`ems_timer_${empId}_work_seconds`)) || 0;
    const storedBreakSecs = Number(localStorage.getItem(`ems_timer_${empKey}_break_seconds`)) || Number(localStorage.getItem(`ems_timer_${empId}_break_seconds`)) || 0;

    const isClockedIn = storedClockedIn || (!!attRec?.clockInTime && !attRec?.clockOutTime);
    const isClockedOut = !isClockedIn && (!!storedClockOut || !!attRec?.clockOutTime);
    const loginTime = attRec?.clockInTime || storedLogin || (isClockedIn ? '09:30 AM' : null);
    const clockOutTime = attRec?.clockOutTime || storedClockOut || null;

    let workSecs = storedWorkSecs;
    if (isClockedIn && !storedOnBreak) {
      const clockInTs = Number(localStorage.getItem(`ems_timer_${empKey}_clock_in_timestamp`)) || Number(localStorage.getItem(`ems_timer_${empId}_clock_in_timestamp`));
      if (clockInTs > 0) {
        const gross = Math.max(0, Math.floor((Date.now() - clockInTs) / 1000));
        workSecs = Math.max(0, gross - storedBreakSecs);
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
    const working = teamTodayStates.filter(s => s.isClockedIn && !s.isOnBreak).length;
    const onBreak = teamTodayStates.filter(s => s.isClockedIn && s.isOnBreak).length;
    const clockedOut = teamTodayStates.filter(s => s.isClockedOut).length;
    const offline = total - working - onBreak - clockedOut;
    const runningTasksCount = teamTodayStates.filter(s => s.runningTask).length;

    return { total, working, onBreak, clockedOut, offline, runningTasksCount };
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

      window.dispatchEvent(new CustomEvent('ems_clocked_in', {
        detail: { userKey: empKey, employeeId: emp._id, employeeCode: emp.employeeCode, loginTime: punchTime, date: todayStr }
      }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));

      addToast(`⚡ Emergency Clock-In recorded for ${emp.name}!`, 'success');
      setClockInModalTarget(null);
      setCustomPunchTime('');
      setSyncTick(t => t + 1);
    } catch (err) {
      console.error('Failed to execute emergency clock-in:', err);
      addToast('Failed to clock in employee', 'error');
    }
  };

  // 2. Emergency Clock Out
  const handleExecuteClockOut = async () => {
    if (!clockOutModalTarget) return;
    const emp = clockOutModalTarget;
    const empKey = emp.employeeCode || String(emp._id);
    const punchTime = customPunchTime.trim() || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    try {
      await hrService.adminForceClockOut(emp._id, `Emergency Shift End: ${emergencyReason} (${punchTime})`, todayStr);

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

      window.dispatchEvent(new CustomEvent('ems_force_clock_out', { detail: { employeeId: emp._id, adminName: currentUser?.name } }));
      window.dispatchEvent(new CustomEvent('ems_clocked_out', { detail: { employeeId: emp._id } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.ATTENDANCE } }));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));

      addToast(`🛑 Clocked out ${emp.name} successfully!`, 'success');
      setClockOutModalTarget(null);
      setCustomPunchTime('');
      setSyncTick(t => t + 1);
    } catch (err) {
      console.error('Failed to execute emergency clock out:', err);
      addToast('Failed to clock out employee', 'error');
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
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginTop: '20px'
      }}>
        <Shield size={40} color="#dc2626" style={{ margin: '0 auto 12px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
          Access Restricted
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>
          Live Operations & Emergency Shift Overrides require Administrator, HR, or delegated Live Operations permission.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '30px' }}>
      {/* ── HEADER BANNER ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
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
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Zap size={17} fill="#ea580c" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.2' }}>
                Live Operations & Shift Controls
              </h1>
              <span style={{
                fontSize: '10.5px',
                fontWeight: '700',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                padding: '1px 6px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                Real-Time Sync
              </span>
            </div>
            <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
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
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#334155',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <RefreshCw size={13} />
          <span>Sync Now</span>
        </button>
      </div>

      {/* ── PENDING CREDENTIAL CHANGE REQUESTS (ADMIN REVIEW) ── */}
      {isHRorAdmin && pendingProfileRequests.length > 0 && (
        <div style={{
          backgroundColor: '#eff6ff',
          borderRadius: '12px',
          border: '1.5px solid #bfdbfe',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#2563eb" />
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e40af' }}>
                Pending Employee Credential Change Requests ({pendingProfileRequests.length})
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600' }}>
              Requires Super Admin Approval to update official database records
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingProfileRequests.map(req => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #dbeafe',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>
                      {req.employeeName}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>({req.employeeCode})</span>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: '700',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: req.field === 'email' ? '#fdf2f8' : '#f0fdf4',
                      color: req.field === 'email' ? '#be185d' : '#15803d'
                    }}>
                      Requested {req.field === 'email' ? 'Email' : 'Name'} Change
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                    <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{req.currentValue}</span>
                    <span style={{ margin: '0 6px' }}>➔</span>
                    <strong style={{ color: '#2563eb' }}>{req.requestedValue}</strong>
                    <span style={{ color: '#64748b', marginLeft: '10px', fontStyle: 'italic' }}>Reason: &quot;{req.reason}&quot;</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleRejectProfileRequest(req)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#64748b',
                      fontSize: '11.5px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleApproveProfileRequest(req)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(22, 163, 74, 0.3)'
                    }}
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>
            <span>Total Team</span>
            <Users size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            {kpiStats.total}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Registered employees
          </div>
        </div>

        <div style={{
          borderRadius: '10px',
          border: '1px solid #bbf7d0',
          backgroundColor: '#f0fdf4',
          padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#166534', fontSize: '12px', fontWeight: '700' }}>
            <span>Working Now</span>
            <Clock size={16} color="#15803d" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#15803d', marginTop: '6px' }}>
            {kpiStats.working}
          </div>
          <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
            Actively on shift
          </div>
        </div>

        <div style={{
          borderRadius: '10px',
          border: '1px solid #fde68a',
          backgroundColor: '#fffbeb',
          padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#92400e', fontSize: '12px', fontWeight: '700' }}>
            <span>On Break</span>
            <Coffee size={16} color="#b45309" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#b45309', marginTop: '6px' }}>
            {kpiStats.onBreak}
          </div>
          <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>
            Tea / Lunch breaks
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>
            <span>Shift Ended</span>
            <LogOut size={16} color="#64748b" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#475569', marginTop: '6px' }}>
            {kpiStats.clockedOut}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Clocked out today
          </div>
        </div>

        <div style={{
          borderRadius: '10px',
          border: '1px solid #bfdbfe',
          backgroundColor: '#eff6ff',
          padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1e40af', fontSize: '12px', fontWeight: '700' }}>
            <span>Running Tasks</span>
            <Play size={16} color="#2563eb" fill="#2563eb" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#2563eb', marginTop: '6px' }}>
            {kpiStats.runningTasksCount}
          </div>
          <div style={{ fontSize: '11px', color: '#1e40af', marginTop: '2px' }}>
            Active timers live
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH STRIP ── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
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
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: statusFilter === tab.id ? '700' : '600',
                backgroundColor: statusFilter === tab.id ? '#0284c7' : '#f1f5f9',
                color: statusFilter === tab.id ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Department Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '5px 10px',
            maxWidth: '240px',
            width: '100%'
          }}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'none',
                outline: 'none',
                fontSize: '12px',
                color: '#0f172a',
                width: '100%'
              }}
            />
            {searchQuery && (
              <X size={12} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
            )}
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#334155',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer'
            }}
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
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Employee</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Work Mode</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Department</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Shift Status</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Punch Times</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Net Work Time</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Active Running Task</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Admin Overrides</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeam.length > 0 ? (
                filteredTeam.map((item) => {
                  const emp = item.emp;
                  const isCur = emp._id === currentUser?._id;

                  return (
                    <tr
                      key={emp._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                        backgroundColor: item.isClockedIn ? (item.isOnBreak ? '#fffdf7' : '#fafdfb') : '#ffffff'
                      }}
                    >
                      {/* Employee Info */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={emp.name}
                            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                          />
                          <div>
                            <div style={{ fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span>{emp.name}</span>
                              {isCur && (
                                <span style={{ fontSize: '9.5px', backgroundColor: '#eff6ff', color: '#2563eb', padding: '1px 5px', borderRadius: '3px' }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {emp.role || 'Member'} • <span style={{ color: '#94a3b8' }}>#{emp.employeeCode || emp._id}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Working Mode Badge */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: emp.workingMode === 'Remote' ? '#ecfdf5' : emp.workingMode === 'Hybrid' ? '#faf5ff' : '#eff6ff',
                          color: emp.workingMode === 'Remote' ? '#059669' : emp.workingMode === 'Hybrid' ? '#7c3aed' : '#2563eb',
                          border: `1px solid ${emp.workingMode === 'Remote' ? '#a7f3d0' : emp.workingMode === 'Hybrid' ? '#e9d5ff' : '#bfdbfe'}`
                        }}>
                          <span>{emp.workingMode === 'Remote' ? '🏡 Remote' : emp.workingMode === 'Hybrid' ? '🔄 Hybrid' : '🏢 Office'}</span>
                        </span>
                      </td>

                      {/* Department */}
                      <td style={{ padding: '12px 16px', color: '#475569', fontWeight: '600' }}>
                        <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                          {item.department}
                        </span>
                      </td>

                      {/* Shift Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: item.isClockedIn ? (item.isOnBreak ? '#fef3c7' : '#dcfce7') : (item.isClockedOut ? '#f1f5f9' : '#f8fafc'),
                          color: item.isClockedIn ? (item.isOnBreak ? '#b45309' : '#15803d') : (item.isClockedOut ? '#475569' : '#94a3b8'),
                          border: `1px solid ${item.isClockedIn ? (item.isOnBreak ? '#fde68a' : '#bbf7d0') : '#e2e8f0'}`
                        }}>
                          <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: item.isClockedIn ? (item.isOnBreak ? '#f59e0b' : '#22c55e') : (item.isClockedOut ? '#94a3b8' : '#cbd5e1')
                          }} />
                          {item.isClockedIn
                            ? (item.isOnBreak ? `On ${item.breakType}` : 'Shift Active 🟢')
                            : (item.isClockedOut ? 'Clocked Out 🔴' : 'Not Clocked In ⚪')}
                        </span>
                      </td>

                      {/* Punch Times */}
                      <td style={{ padding: '12px 16px', fontSize: '11.5px', color: '#475569' }}>
                        <div>In: <strong style={{ color: item.loginTime ? '#0f172a' : '#94a3b8' }}>{item.loginTime || '--'}</strong></div>
                        <div>Out: <strong style={{ color: item.clockOutTime ? '#dc2626' : '#94a3b8' }}>{item.clockOutTime || '--'}</strong></div>
                      </td>

                      {/* Net Work Time */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '800', color: '#0284c7', fontSize: '13px' }}>
                          {formatTimeDurationSafe(item.workSecs)}
                        </div>
                        {item.breakSecs > 0 && (
                          <div style={{ fontSize: '10.5px', color: '#b45309', marginTop: '1px' }}>
                            Breaks: {Math.round(item.breakSecs / 60)}m
                          </div>
                        )}
                      </td>

                      {/* Currently Running Task */}
                      <td style={{ padding: '12px 16px' }}>
                        {item.runningTask ? (
                          <div style={{ maxWidth: '240px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                              <strong style={{ fontSize: '11.5px', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                #{item.runningTask.taskCode || 'TSK'}: {item.runningTask.title}
                              </strong>
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>⏱️ <strong style={{ color: '#0284c7' }}>{item.runningTask.liveDurationText}</strong></span>
                              <button
                                onClick={() => pauseTaskTimer(item.runningTask._id)}
                                style={{
                                  border: '1px solid #bfdbfe',
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  borderRadius: '3px',
                                  padding: '1px 6px',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <button
                                  onClick={() => startTaskTimer(firstTask._id)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    border: '1px solid #86efac',
                                    backgroundColor: '#f0fdf4',
                                    color: '#16a34a',
                                    borderRadius: '4px',
                                    padding: '2px 7px',
                                    fontSize: '10.5px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                  title={`Start timer for ${emp.name} on #${firstTask.taskCode || 'TSK'}: ${firstTask.title}`}
                                >
                                  <Play size={9} fill="#16a34a" /> Start #{firstTask.taskCode || 'TSK'}
                                </button>
                                {empPendingTasks.length > 1 && (
                                  <span style={{ fontSize: '10px', color: '#64748b' }}>+{empPendingTasks.length - 1} more</span>
                                )}
                              </div>
                            );
                          }
                          return (
                            <span style={{ color: '#94a3b8', fontSize: '11.5px', fontStyle: 'italic' }}>
                              No active tasks
                            </span>
                          );
                        })()}
                      </td>

                      {/* Admin Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Emergency Clock-In (If not clocked in or absent) */}
                          {!item.isClockedIn && (
                            <button
                              onClick={() => {
                                setClockInModalTarget(emp);
                                setEmergencyReason('Power cut / offline assist');
                                setCustomPunchTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '5px 9px',
                                borderRadius: '6px',
                                backgroundColor: '#f0fdf4',
                                color: '#15803d',
                                border: '1px solid #bbf7d0',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
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
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '5px 9px',
                                borderRadius: '6px',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="End employee shift manually (e.g. left without punch)"
                            >
                              <LogOut size={11} />
                              <span>Clock Out</span>
                            </button>
                          )}

                          {/* Day Log View */}
                          <button
                            onClick={() => handleOpenDayLog(item)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              backgroundColor: '#eff6ff',
                              color: '#0284c7',
                              border: '1px solid #bfdbfe',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            title={`Inspect ${emp.name}'s complete day audit log`}
                          >
                            <Eye size={12} color="#0284c7" />
                            <span>Day Log</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                    <Users size={32} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>
                      No employees match filter
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            maxWidth: '460px',
            width: '100%',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogIn size={18} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Emergency Clock-In Override
                </h3>
              </div>
              <button
                onClick={() => setClockInModalTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: '#475569', marginBottom: '16px', lineHeight: '1.5' }}>
              You are manually initiating shift clock-in for <strong>{clockInModalTarget.name}</strong> (#{clockInModalTarget.employeeCode}). This will be logged in the permanent audit trail.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Punch In Time
                </label>
                <input
                  type="text"
                  value={customPunchTime}
                  onChange={(e) => setCustomPunchTime(e.target.value)}
                  placeholder="e.g. 09:30 AM"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Operational Reason (Power outage / offline assist)
                </label>
                <input
                  type="text"
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="Enter reason..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setClockInModalTarget(null)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteClockIn}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            maxWidth: '460px',
            width: '100%',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogOut size={18} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Emergency Clock-Out Override
                </h3>
              </div>
              <button
                onClick={() => setClockOutModalTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: '#475569', marginBottom: '16px', lineHeight: '1.5' }}>
              You are manually ending the shift for <strong>{clockOutModalTarget.name}</strong> (#{clockOutModalTarget.employeeCode}). Any active running task timer will also be automatically paused.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Punch Out Time
                </label>
                <input
                  type="text"
                  value={customPunchTime}
                  onChange={(e) => setCustomPunchTime(e.target.value)}
                  placeholder="e.g. 06:30 PM"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Reason (Power outage, left office, assist)
                </label>
                <input
                  type="text"
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="Enter reason..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setClockOutModalTarget(null)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteClockOut}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
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
