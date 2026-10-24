/**
 * @file TimerContext.jsx
 * @description Central Work Session Timer & Dual Time-Tracking Engine:
 * 1. Multi-User Scoped Attendance Clock (Clock In, Clock Out, Gross Shift vs Net Productive Work).
 * 2. Enterprise Break Management Engine with persistent Break History Logging and Active Break Reminders.
 * 3. Accidental Clock-out Re-clock In Request with Real-Time Admin/HR Approval Workflow.
 *    - Instant timer resumption on request ("time starts tracking immediately").
 *    - Admin Acceptance: time is officially approved and merged into attendance.
 *    - Admin Rejection: unapproved extra time is discarded and not counted.
 * 4. Multi-tab and multi-user reactive synchronization without errors or crashes.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from './ToastContext';
import { useHR } from '../../modules/hr/context/HRContext';
import { useAuth } from './AuthContext';
import { hrService } from '../../modules/hr/services/hrService';

const TimerContext = createContext();

export const BREAK_THRESHOLDS = {
  'Lunch Break': 45 * 60,       // 45 minutes
  'Tea Break': 15 * 60,         // 15 minutes
  'Tea / Coffee Break': 15 * 60,// 15 minutes
  'Personal Break': 15 * 60,    // 15 minutes
  'Quick Rest / Stretch': 10 * 60, // 10 minutes
  'Short Rest': 10 * 60,        // 10 minutes
  'Wellness & Prayer': 15 * 60  // 15 minutes
};

const parseTimeToSeconds = (str) => {
  if (!str) return 0;
  const m = String(str).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3] || '0', 10);
  const ampm = (m[4] || '').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 3600 + min * 60 + sec;
};

export const TimerProvider = ({ children }) => {
  const { addToast } = useToast();
  const { currentUser: authUser } = useAuth();
  const { currentUser: hrUser } = useHR();
  const currentUser = authUser || hrUser;

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Derive stable userKey for multi-user storage isolation
  const userKey = useMemo(() => {
    return currentUser?.employeeCode || (currentUser?._id ? String(currentUser._id) : (currentUser ? 'ADM-001' : ''));
  }, [currentUser]);

  // Resolve canonical employee profile from storage to bridge _id, employeeCode, and name
  const resolvedEmp = useMemo(() => {
    try {
      const empsRaw = localStorage.getItem('hrms_employees');
      const allEmps = empsRaw ? JSON.parse(empsRaw) : [];
      const match = allEmps.find(e =>
        (currentUser?._id && (e._id === currentUser._id || e.employeeCode === currentUser._id)) ||
        (currentUser?.employeeCode && (e.employeeCode === currentUser.employeeCode || e._id === currentUser.employeeCode)) ||
        (currentUser?.email && e.email?.toLowerCase() === currentUser.email?.toLowerCase()) ||
        (currentUser?.name && e.name?.toLowerCase() === currentUser.name?.toLowerCase()) ||
        (userKey && (e.employeeCode === userKey || e._id === userKey))
      );
      return match || currentUser;
    } catch {
      return currentUser;
    }
  }, [currentUser, userKey]);

  const targetEmpId = resolvedEmp?._id || currentUser?._id || (userKey.startsWith('emp_') ? userKey : 'emp_admin');
  const targetEmpCode = resolvedEmp?.employeeCode || currentUser?.employeeCode || userKey;
  const targetEmpName = currentUser?.name || resolvedEmp?.name || 'Employee';

  // Helper: robustly check if an attendance record belongs to the current user
  const isRecordForUser = useCallback((rec, dateStr) => {
    if (!rec || rec.date !== dateStr) return false;
    const recEmpId = String(rec.employeeId || '');
    const recEmpCode = String(rec.employeeCode || '');
    const recEmpName = String(rec.employeeName || '').trim().toLowerCase();
    const currName = String(targetEmpName).trim().toLowerCase();

    if (recEmpId && (
      recEmpId === String(targetEmpId) ||
      recEmpId === String(targetEmpCode) ||
      recEmpId === String(userKey) ||
      (currentUser?._id && recEmpId === String(currentUser._id)) ||
      (currentUser?.employeeCode && recEmpId === String(currentUser.employeeCode))
    )) {
      return true;
    }

    if (recEmpCode && (
      recEmpCode === String(targetEmpCode) ||
      recEmpCode === String(targetEmpId) ||
      recEmpCode === String(userKey) ||
      (currentUser?.employeeCode && recEmpCode === String(currentUser.employeeCode))
    )) {
      return true;
    }

    if (recEmpName && currName && recEmpName === currName) {
      return true;
    }

    return false;
  }, [targetEmpId, targetEmpCode, userKey, currentUser, targetEmpName]);

  const k = useCallback((name) => `ems_timer_${userKey}_${name}`, [userKey]);

  // ── Helper to read state with userKey scoping ──
  const readUserItem = useCallback((name, fallback = null) => {
    const scoped = localStorage.getItem(`ems_timer_${userKey}_${name}`);
    if (scoped !== null) return scoped;
    return fallback;
  }, [userKey]);

  // ── Centralized Audit Logging Helper ──
  const recordAuditLog = useCallback(async (eventData) => {
    try {
      const today = getTodayStr();
      const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      await hrService.createAttendanceAuditLog({
        employeeId: targetEmpId,
        employeeName: targetEmpName,
        employeeCode: targetEmpCode,
        date: today,
        timeFormatted: nowStr,
        actor: currentUser?.isAdmin ? 'admin' : 'employee',
        actorId: targetEmpId,
        actorName: targetEmpName,
        ...eventData
      });
    } catch (e) {
      console.warn('Failed to record attendance audit log:', e);
    }
  }, [targetEmpId, targetEmpCode, targetEmpName, currentUser]);

  // ── Admin Override Force Clock-Out Listener ──
  useEffect(() => {
    const handleForceClockOutEvent = (e) => {
      const { employeeId, adminName, adminId, auditNote } = e.detail || {};
      if (employeeId === userKey || employeeId === currentUser?._id || employeeId === currentUser?.employeeCode) {
        setIsRunning(false);
        setIsOnBreak(false);
        setIsClockedIn(false);
        setHadClockedOutToday(true);
        const logoutStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setClockOutTime(logoutStr);

        localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'false');
        localStorage.setItem(`ems_timer_${userKey}_is_running`, 'false');
        localStorage.setItem(`ems_timer_${userKey}_is_on_break`, 'false');
        localStorage.setItem(`ems_timer_${userKey}_clockout_time`, logoutStr);
        localStorage.setItem(`ems_timer_${userKey}_had_clocked_out`, 'true');

        addToast({
          title: '⚠️ Shift Forcefully Clocked Out',
          message: `Administrator ${adminName || 'Admin'} [ID: ${adminId || 'ADM'}] clocked out your shift. Reason: "${auditNote || 'Manual admin override'}"`,
          type: 'warning'
        });
      }
    };

    window.addEventListener('ems_force_clock_out', handleForceClockOutEvent);
    return () => window.removeEventListener('ems_force_clock_out', handleForceClockOutEvent);
  }, [userKey, currentUser, addToast]);

  // ── 1. Daily Clock In / Out State (User-Scoped & Validated against Today) ──
  const [sessionDate, setSessionDate] = useState(() => {
    return localStorage.getItem(`ems_timer_${userKey}_work_session_date`) || getTodayStr();
  });

  const isTodaySession = sessionDate === getTodayStr();

  const [loginTime, setLoginTime] = useState(() => {
    if (!isTodaySession) return null;
    const scoped = localStorage.getItem(`ems_timer_${userKey}_login_time`);
    if (scoped) return scoped;
    try {
      const attRaw = localStorage.getItem('hrms_attendance');
      if (attRaw) {
        const att = JSON.parse(attRaw);
        const today = new Date().toISOString().split('T')[0];
        const rec = att.find(a => a.date === today && (
          a.employeeId === targetEmpId ||
          a.employeeId === targetEmpCode ||
          a.employeeId === userKey ||
          a.employeeCode === targetEmpCode ||
          (a.employeeName && targetEmpName && a.employeeName.trim().toLowerCase() === targetEmpName.trim().toLowerCase())
        ));
        if (rec?.clockInTime || rec?.clockIn) return rec.clockInTime || rec.clockIn;
      }
    } catch {}
    return null;
  });

  const [clockOutTime, setClockOutTime] = useState(() => {
    if (!isTodaySession) return null;
    const scoped = localStorage.getItem(`ems_timer_${userKey}_clockout_time`);
    if (scoped) return scoped;
    try {
      const attRaw = localStorage.getItem('hrms_attendance');
      if (attRaw) {
        const att = JSON.parse(attRaw);
        const today = new Date().toISOString().split('T')[0];
        const rec = att.find(a => a.date === today && (
          a.employeeId === targetEmpId ||
          a.employeeId === targetEmpCode ||
          a.employeeId === userKey ||
          a.employeeCode === targetEmpCode ||
          (a.employeeName && targetEmpName && a.employeeName.trim().toLowerCase() === targetEmpName.trim().toLowerCase())
        ));
        if (rec?.clockOutTime || rec?.clockOut) return rec.clockOutTime || rec.clockOut;
      }
    } catch {}
    return null;
  });

  const [hadClockedOutToday, setHadClockedOutToday] = useState(() => {
    if (!isTodaySession) return false;
    const saved = localStorage.getItem(`ems_timer_${userKey}_had_clocked_out`);
    if (saved !== null) return JSON.parse(saved);
    return !!clockOutTime;
  });

  const [isClockedIn, setIsClockedIn] = useState(() => {
    if (!isTodaySession) return false;
    const saved = localStorage.getItem(`ems_timer_${userKey}_is_clocked_in`);
    if (saved !== null) return JSON.parse(saved);
    return false;
  });

  const [isRunning, setIsRunning] = useState(() => {
    if (!isTodaySession) return false;
    const saved = localStorage.getItem(`ems_timer_${userKey}_is_running`);
    if (saved !== null) return JSON.parse(saved);
    return false;
  });

  // Active productive work seconds (starts strictly from 0 on a fresh day)
  const [workSeconds, setWorkSeconds] = useState(() => {
    if (!isTodaySession) return 0;
    const saved = localStorage.getItem(`ems_timer_${userKey}_work_seconds`);
    if (saved) return parseInt(saved, 10);
    return 0;
  });

  // Saved official seconds before accidental clock-out
  const [savedOfficialWorkSeconds, setSavedOfficialWorkSeconds] = useState(() => {
    if (!isTodaySession) return 0;
    const saved = localStorage.getItem(`ems_timer_${userKey}_saved_official_seconds`);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Cumulative break seconds for current day
  const [breakSeconds, setBreakSeconds] = useState(() => {
    if (!isTodaySession) return 0;
    const saved = localStorage.getItem(`ems_timer_${userKey}_break_seconds`);
    if (saved) return parseInt(saved, 10);
    return 0;
  });

  // ── 2. Active Break & History State ──
  const [isOnBreak, setIsOnBreak] = useState(() => {
    if (!isTodaySession) return false;
    const saved = localStorage.getItem(`ems_timer_${userKey}_is_on_break`);
    if (saved) return JSON.parse(saved);
    return false;
  });

  const [breakType, setBreakType] = useState(() => {
    return localStorage.getItem(`ems_timer_${userKey}_break_type`) || 'Lunch Break';
  });

  const [currentBreakSeconds, setCurrentBreakSeconds] = useState(() => {
    if (!isTodaySession) return 0;
    const saved = localStorage.getItem(`ems_timer_${userKey}_current_break_seconds`);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [breakStartTime, setBreakStartTime] = useState(() => {
    if (!isTodaySession) return null;
    return localStorage.getItem(`ems_timer_${userKey}_break_start_time`) || null;
  });

  const [customBreakLimitMinutes, setCustomBreakLimitMinutes] = useState(() => {
    const saved = localStorage.getItem(`ems_timer_${userKey}_custom_break_limit`);
    return saved ? parseInt(saved, 10) : 15;
  });

  const [breakReminderSent, setBreakReminderSent] = useState(false);

  // Persistent Break History List
  const [breakHistory, setBreakHistory] = useState(() => {
    const saved = localStorage.getItem(`ems_timer_${userKey}_break_history`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // ── 3. Accidental Clock-out Re-Clock In Request State ──
  // Statuses: 'none' | 'pending' | 'approved' | 'rejected'
  const [reclockStatus, setReclockStatus] = useState(() => {
    if (!isTodaySession) return 'none';
    return localStorage.getItem(`ems_timer_${userKey}_reclock_status`) || 'none';
  });

  // Running seconds for the unapproved re-clock session
  const [reclockSessionSeconds, setReclockSessionSeconds] = useState(() => {
    if (!isTodaySession) return 0;
    const saved = localStorage.getItem(`ems_timer_${userKey}_reclock_session_seconds`);
    return saved ? parseInt(saved, 10) : 0;
  });

  // All Re-Clock in requests across the system (for Admin / HR dashboard approvals)
  const [reclockRequests, setReclockRequests] = useState(() => {
    try {
      const raw = localStorage.getItem('ems_reclock_requests');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // Reload timer state when userKey switches (Multi-User Safe)
  useEffect(() => {
    const today = getTodayStr();
    const storedDate = localStorage.getItem(`ems_timer_${userKey}_work_session_date`) || today;
    const isToday = storedDate === today;

    setSessionDate(storedDate);
    if (!isToday) {
      setWorkSeconds(0);
      setBreakSeconds(0);
      setIsClockedIn(false);
      setIsRunning(false);
      setIsOnBreak(false);
      setLoginTime(null);
      setClockOutTime(null);
      setHadClockedOutToday(false);
      setReclockStatus('none');
      setReclockSessionSeconds(0);
      setSavedOfficialWorkSeconds(0);
    } else {
      const inVal = localStorage.getItem(`ems_timer_${userKey}_is_clocked_in`);
      setIsClockedIn(inVal ? JSON.parse(inVal) : false);

      const runVal = localStorage.getItem(`ems_timer_${userKey}_is_running`);
      setIsRunning(runVal ? JSON.parse(runVal) : false);

      const secVal = localStorage.getItem(`ems_timer_${userKey}_work_seconds`);
      setWorkSeconds(secVal ? parseInt(secVal, 10) : 0);

      const brkSec = localStorage.getItem(`ems_timer_${userKey}_break_seconds`);
      setBreakSeconds(brkSec ? parseInt(brkSec, 10) : 0);

      const lTime = localStorage.getItem(`ems_timer_${userKey}_login_time`);
      setLoginTime(lTime || null);

      const cTime = localStorage.getItem(`ems_timer_${userKey}_clockout_time`);
      setClockOutTime(cTime || null);

      const hadOut = localStorage.getItem(`ems_timer_${userKey}_had_clocked_out`);
      setHadClockedOutToday(hadOut ? JSON.parse(hadOut) : !!cTime);

      const rStatus = localStorage.getItem(`ems_timer_${userKey}_reclock_status`) || 'none';
      setReclockStatus(rStatus);

      const rSec = localStorage.getItem(`ems_timer_${userKey}_reclock_session_seconds`);
      setReclockSessionSeconds(rSec ? parseInt(rSec, 10) : 0);

      const sSec = localStorage.getItem(`ems_timer_${userKey}_saved_official_seconds`);
      setSavedOfficialWorkSeconds(sSec ? parseInt(sSec, 10) : (secVal ? parseInt(secVal, 10) : 0));
    }
  }, [userKey]);

  // Synchronize Authoritative Live Shift State from Database across all devices / laptops
  const syncLiveShiftState = useCallback(async () => {
    if (!userKey) return;
    const today = getTodayStr();

    try {
      let rec = null;
      // 1. Check local mirror first
      try {
        const attRaw = localStorage.getItem('hrms_attendance');
        if (attRaw) {
          const list = JSON.parse(attRaw);
          if (Array.isArray(list)) {
            rec = list.find(a => isRecordForUser(a, today));
          }
        }
      } catch {}

      // 2. Query MongoDB Atlas backend for latest attendance record
      try {
        const nowD = new Date();
        const remoteList = await hrService.getMonthlyAttendance(nowD.getMonth() + 1, nowD.getFullYear(), targetEmpId);
        if (Array.isArray(remoteList)) {
          const remoteRec = remoteList.find(a => isRecordForUser(a, today));
          if (remoteRec) {
            rec = remoteRec;
          }
        }
      } catch (err) {}

      if (!rec) return;

      const isActuallyClockedIn = Boolean(rec.isClockedIn || (rec.clockInTime && !rec.clockOutTime));
      const isActuallyClockedOut = Boolean(rec.clockOutTime && !rec.isClockedIn);

      if (isActuallyClockedIn) {
        const inTime = rec.clockInTime || rec.clockIn || '09:30 AM';
        let inTs = Number(rec.clockInTimestamp);
        if (!inTs) {
          const parsedSecs = parseTimeToSeconds(inTime);
          const midnight = new Date();
          midnight.setHours(0, 0, 0, 0);
          inTs = midnight.getTime() + parsedSecs * 1000;
        }

        const bSecs = Number(rec.breakSeconds) || 0;
        const grossSecs = Math.max(0, Math.floor((Date.now() - inTs) / 1000));
        const effectiveWorkSecs = Math.max(0, grossSecs - bSecs);
        const localIsOnBreak = localStorage.getItem(`ems_timer_${userKey}_is_on_break`) === 'true';
        const localBreakStartTs = Number(localStorage.getItem(`ems_timer_${userKey}_break_start_timestamp`));
        const hasRecentLocalBreak = localIsOnBreak && localBreakStartTs && (Date.now() - localBreakStartTs < 2 * 3600 * 1000);

        const effectiveOnBreak = hasRecentLocalBreak ? true : Boolean(rec.isOnBreak);

        setIsClockedIn(true);
        setIsRunning(!effectiveOnBreak);
        setIsOnBreak(effectiveOnBreak);
        setLoginTime(inTime);
        setClockOutTime(null);
        setHadClockedOutToday(false);
        // DO NOT call setWorkSeconds here — the wall-clock tick (1s interval) accurately
        // computes net work seconds in real-time. Overwriting it from DB sync every 5s
        // causes visible counter jumps/flickers. Only restore from DB on initial mount
        // (when clock_in_timestamp is not yet set in localStorage).
        const existingTs = localStorage.getItem(`ems_timer_${userKey}_clock_in_timestamp`);
        if (!existingTs || existingTs === 'NaN' || existingTs === '0') {
          // First load — no timestamp yet, seed from DB record
          localStorage.setItem(`ems_timer_${userKey}_clock_in_timestamp`, String(inTs));
        }
        if (rec.breakType) setBreakType(rec.breakType);
        if (Array.isArray(rec.breakHistory) && rec.breakHistory.length > 0) {
          setBreakHistory(rec.breakHistory);
          localStorage.setItem(`ems_timer_${userKey}_break_history`, JSON.stringify(rec.breakHistory));
        }

        localStorage.setItem(`ems_timer_${userKey}_work_session_date`, today);
        localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'true');
        localStorage.setItem(`ems_timer_${userKey}_is_running`, effectiveOnBreak ? 'false' : 'true');
        localStorage.setItem(`ems_timer_${userKey}_is_on_break`, effectiveOnBreak ? 'true' : 'false');
        localStorage.setItem(`ems_timer_${userKey}_login_time`, inTime);
        localStorage.setItem(`ems_timer_${userKey}_had_clocked_out`, 'false');
        if (!existingTs || existingTs === 'NaN' || existingTs === '0') {
          localStorage.setItem(`ems_timer_${userKey}_break_seconds`, String(bSecs));
          localStorage.setItem(`ems_timer_${userKey}_work_seconds`, String(effectiveWorkSecs));
        }
        localStorage.removeItem(`ems_timer_${userKey}_clockout_time`);
        localStorage.removeItem(`ems_timer_${userKey}_clock_out_timestamp`);
      } else if (isActuallyClockedOut) {
        const outTime = rec.clockOutTime || rec.clockOut;
        const inTime = rec.clockInTime || rec.clockIn || loginTime;
        const finalWorkSecs = Number(rec.workSeconds) || Math.round((Number(rec.totalWorkingHours) || 0) * 3600);

        setIsClockedIn(false);
        setIsRunning(false);
        setIsOnBreak(false);
        setHadClockedOutToday(true);
        setClockOutTime(outTime);
        if (inTime) setLoginTime(inTime);
        if (finalWorkSecs > 0) setWorkSeconds(finalWorkSecs);

        localStorage.setItem(`ems_timer_${userKey}_work_session_date`, today);
        localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'false');
        localStorage.setItem(`ems_timer_${userKey}_is_running`, 'false');
        localStorage.setItem(`ems_timer_${userKey}_is_on_break`, 'false');
        localStorage.setItem(`ems_timer_${userKey}_had_clocked_out`, 'true');
        if (outTime) localStorage.setItem(`ems_timer_${userKey}_clockout_time`, outTime);
        if (inTime) localStorage.setItem(`ems_timer_${userKey}_login_time`, inTime);
        if (finalWorkSecs > 0) localStorage.setItem(`ems_timer_${userKey}_work_seconds`, String(finalWorkSecs));
      }
    } catch (e) {
      console.warn('Error in syncLiveShiftState:', e);
    }
  }, [userKey, targetEmpId, isRecordForUser, loginTime]);

  // Periodic and reactive sync for cross-device consistency
  useEffect(() => {
    syncLiveShiftState();
    const interval = setInterval(syncLiveShiftState, 5000);
    const handleSync = () => syncLiveShiftState();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncLiveShiftState();
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('hrms_storage_change', handleSync);
    window.addEventListener('ems_clocked_in', handleSync);
    window.addEventListener('ems_clocked_out', handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('hrms_storage_change', handleSync);
      window.removeEventListener('ems_clocked_in', handleSync);
      window.removeEventListener('ems_clocked_out', handleSync);
    };
  }, [syncLiveShiftState]);

  // Listen for global reclock requests updates (e.g. from Admin in another tab or component)
  useEffect(() => {
    const handleReclockSync = () => {
      try {
        const raw = localStorage.getItem('ems_reclock_requests');
        const list = raw ? JSON.parse(raw) : [];
        setReclockRequests(list);

        // Check if current user's request status changed
        const myActiveReq = list.find(r => r.employeeId === userKey && r.date === getTodayStr());
        if (myActiveReq) {
          if (myActiveReq.status === 'approved' && reclockStatus === 'pending') {
            setReclockStatus('approved');
            localStorage.setItem(`ems_timer_${userKey}_reclock_status`, 'approved');
            // Merge unapproved session into official
            setSavedOfficialWorkSeconds(workSeconds);
            localStorage.setItem(`ems_timer_${userKey}_saved_official_seconds`, workSeconds.toString());
            addToast('🎉 Admin approved your Re-Clock In! Hours are officially counted.', 'success');
          } else if (myActiveReq.status === 'rejected' && reclockStatus === 'pending') {
            setReclockStatus('rejected');
            setIsRunning(false);
            setIsClockedIn(false);
            // Discard unapproved seconds
            setWorkSeconds(savedOfficialWorkSeconds);
            setReclockSessionSeconds(0);
            localStorage.setItem(`ems_timer_${userKey}_reclock_status`, 'rejected');
            localStorage.setItem(`ems_timer_${userKey}_work_seconds`, savedOfficialWorkSeconds.toString());
            localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'false');
            localStorage.setItem(`ems_timer_${userKey}_is_running`, 'false');
            localStorage.setItem(`ems_timer_${userKey}_reclock_session_seconds`, '0');
            addToast('❌ Re-Clock In request was rejected by Admin. Extra session time was discarded.', 'error');
          }
        }
      } catch (e) {
        console.error('Error syncing reclock requests:', e);
      }
    };

    window.addEventListener('ems_reclock_requests_updated', handleReclockSync);
    window.addEventListener('storage', handleReclockSync);
    return () => {
      window.removeEventListener('ems_reclock_requests_updated', handleReclockSync);
      window.removeEventListener('storage', handleReclockSync);
    };
  }, [userKey, reclockStatus, workSeconds, savedOfficialWorkSeconds, addToast]);

  // Check and perform auto-rollover if date changed while page was open
  useEffect(() => {
    const today = getTodayStr();
    if (sessionDate !== today) {
      setSessionDate(today);
      localStorage.setItem(`ems_timer_${userKey}_work_session_date`, today);
      setWorkSeconds(0);
      setBreakSeconds(0);
      setIsClockedIn(false);
      setIsRunning(false);
      setIsOnBreak(false);
      setLoginTime(null);
      setClockOutTime(null);
      setHadClockedOutToday(false);
      setCurrentBreakSeconds(0);
      setBreakStartTime(null);
      setReclockStatus('none');
      setReclockSessionSeconds(0);
      setSavedOfficialWorkSeconds(0);

      localStorage.setItem(`ems_timer_${userKey}_work_seconds`, '0');
      localStorage.setItem(`ems_timer_${userKey}_break_seconds`, '0');
      localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'false');
      localStorage.setItem(`ems_timer_${userKey}_is_running`, 'false');
      localStorage.setItem(`ems_timer_${userKey}_is_on_break`, 'false');
      localStorage.setItem(`ems_timer_${userKey}_had_clocked_out`, 'false');
      localStorage.removeItem(`ems_timer_${userKey}_login_time`);
      localStorage.removeItem(`ems_timer_${userKey}_clockout_time`);
      localStorage.removeItem(`ems_timer_${userKey}_break_start_time`);
      localStorage.setItem(`ems_timer_${userKey}_reclock_status`, 'none');
      localStorage.setItem(`ems_timer_${userKey}_reclock_session_seconds`, '0');
      localStorage.setItem(`ems_timer_${userKey}_saved_official_seconds`, '0');

      window.dispatchEvent(new CustomEvent('ems_day_rollover', {
        detail: { newDate: today, previousDate: sessionDate, userKey }
      }));
    }
  }, [sessionDate, userKey]);

  // Save break history
  useEffect(() => {
    localStorage.setItem(`ems_timer_${userKey}_break_history`, JSON.stringify(breakHistory));
  }, [breakHistory, userKey]);

  // ── True Wall-Clock Timestamp Engine (Immune to tab sleep, throttle & page reloads) ──
  // Uses refs for volatile values so the setInterval NEVER restarts on state change (eliminates flicker).
  const breakTypeRef = React.useRef(breakType);
  const breakReminderSentRef = React.useRef(breakReminderSent);
  const reclockStatusRef = React.useRef(reclockStatus);
  const addToastRef = React.useRef(addToast);
  React.useEffect(() => { breakTypeRef.current = breakType; }, [breakType]);
  React.useEffect(() => { breakReminderSentRef.current = breakReminderSent; }, [breakReminderSent]);
  React.useEffect(() => { reclockStatusRef.current = reclockStatus; }, [reclockStatus]);
  React.useEffect(() => { addToastRef.current = addToast; }, [addToast]);

  useEffect(() => {
    let lastStorageWriteTs = 0;

    const tick = () => {
      const today = getTodayStr();
      // Read directly from localStorage — avoids stale closure over React state
      const inVal = localStorage.getItem(`ems_timer_${userKey}_is_clocked_in`) === 'true';
      const onBreakVal = localStorage.getItem(`ems_timer_${userKey}_is_on_break`) === 'true';
      const hadOutVal = localStorage.getItem(`ems_timer_${userKey}_had_clocked_out`) === 'true';
      let clockInTs = Number(localStorage.getItem(`ems_timer_${userKey}_clock_in_timestamp`));
      let breakStartTs = Number(localStorage.getItem(`ems_timer_${userKey}_break_start_timestamp`));
      const currentBreakType = breakTypeRef.current;
      const currentReclockStatus = reclockStatusRef.current;

      // Calculate past completed breaks for today from break_history
      let pastBreakSecs = 0;
      try {
        const rawBh = localStorage.getItem(`ems_timer_${userKey}_break_history`);
        if (rawBh) {
          const parsed = JSON.parse(rawBh);
          if (Array.isArray(parsed)) {
            pastBreakSecs = parsed.filter(b => b.date === today).reduce((acc, b) => acc + (Number(b.durationSeconds) || 0), 0);
          }
        }
      } catch {}

      let activeBreakSecs = 0;
      // Break counted ONLY if user is clocked in AND has explicitly started a break
      if (inVal && onBreakVal) {
        if (!breakStartTs) {
          breakStartTs = Date.now();
          localStorage.setItem(`ems_timer_${userKey}_break_start_timestamp`, breakStartTs.toString());
        }
        activeBreakSecs = Math.max(0, Math.floor((Date.now() - breakStartTs) / 1000));
        setCurrentBreakSeconds(activeBreakSecs);
        localStorage.setItem(`ems_timer_${userKey}_current_break_seconds`, activeBreakSecs.toString());

        const threshold = BREAK_THRESHOLDS[currentBreakType] || (20 * 60);
        if (activeBreakSecs >= threshold && !breakReminderSentRef.current) {
          setBreakReminderSent(true);
          breakReminderSentRef.current = true;
          addToastRef.current({
            title: `☕ Break Reminder (${currentBreakType})`,
            message: `You've been on ${currentBreakType} for ${Math.floor(threshold / 60)} minutes. Remember to resume when ready!`,
            type: 'warning'
          });
        }
      } else {
        activeBreakSecs = 0;
        setCurrentBreakSeconds(0);
        if (!onBreakVal) {
          localStorage.removeItem(`ems_timer_${userKey}_break_start_timestamp`);
          localStorage.removeItem(`ems_timer_${userKey}_break_start_time`);
          localStorage.setItem(`ems_timer_${userKey}_current_break_seconds`, '0');
        }
      }

      const totalBreaks = pastBreakSecs + activeBreakSecs;
      setBreakSeconds(totalBreaks);

      if (inVal) {
        if (!clockInTs || isNaN(clockInTs)) {
          clockInTs = Date.now() - (Number(localStorage.getItem(`ems_timer_${userKey}_work_seconds`) || 0) * 1000);
          localStorage.setItem(`ems_timer_${userKey}_clock_in_timestamp`, clockInTs.toString());
        }
        const grossShiftSecs = Math.max(0, Math.floor((Date.now() - clockInTs) / 1000));
        const netWorkSecs = Math.max(0, grossShiftSecs - totalBreaks);
        setWorkSeconds(netWorkSecs);

        const nowTs = Date.now();
        if (nowTs - lastStorageWriteTs > 10000) {
          lastStorageWriteTs = nowTs;
          localStorage.setItem(`ems_timer_${userKey}_break_seconds`, totalBreaks.toString());
          localStorage.setItem(`ems_timer_${userKey}_work_seconds`, netWorkSecs.toString());
        }

        if (currentReclockStatus === 'pending') {
          const rBase = Number(localStorage.getItem(`ems_timer_${userKey}_saved_official_seconds`) || 0);
          const rSecs = Math.max(0, netWorkSecs - rBase);
          setReclockSessionSeconds(rSecs);
          localStorage.setItem(`ems_timer_${userKey}_reclock_session_seconds`, rSecs.toString());
        }
      } else if (!hadOutVal) {
        setWorkSeconds(0);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  // Only restart interval if userKey changes (user switches account)
  // All other volatile values are read via refs or localStorage directly
  }, [userKey]);



  useEffect(() => {
    localStorage.setItem(`ems_timer_${userKey}_is_running`, JSON.stringify(isRunning));
  }, [isRunning, userKey]);

  useEffect(() => {
    localStorage.setItem(`ems_timer_${userKey}_is_on_break`, JSON.stringify(isOnBreak));
    localStorage.setItem(`ems_timer_${userKey}_break_type`, breakType);
  }, [isOnBreak, breakType, userKey]);

  useEffect(() => {
    localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, JSON.stringify(isClockedIn));
  }, [isClockedIn, userKey]);

  useEffect(() => {
    localStorage.setItem(`ems_timer_${userKey}_had_clocked_out`, JSON.stringify(hadClockedOutToday));
  }, [hadClockedOutToday, userKey]);

  // ── Actions ──
  const togglePauseResume = () => {
    if (isOnBreak) {
      resumeFromBreak();
      return;
    }
    setIsRunning(prev => {
      const next = !prev;
      addToast(next ? 'Work timer resumed ⏱️' : 'Work timer paused ⏸️', 'info');
      return next;
    });
  };

  /**
   * Start a new break session with custom duration support
   */
  const startBreak = (type = 'Tea Break', notes = '', customMinutes = null) => {
    const startTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const minutesChosen = customMinutes && customMinutes > 0
      ? Number(customMinutes)
      : (BREAK_THRESHOLDS[type] ? Math.round(BREAK_THRESHOLDS[type] / 60) : 15);

    setBreakType(type);
    setCustomBreakLimitMinutes(minutesChosen);
    setIsOnBreak(true);
    setIsRunning(false);
    setCurrentBreakSeconds(0);
    setBreakStartTime(startTimeStr);
    setBreakReminderSent(false);

    localStorage.setItem(`ems_timer_${userKey}_break_type`, type);
    localStorage.setItem(`ems_timer_${userKey}_custom_break_limit`, minutesChosen.toString());
    localStorage.setItem(`ems_timer_${userKey}_break_start_time`, startTimeStr);
    localStorage.setItem(`ems_timer_${userKey}_break_start_timestamp`, Date.now().toString());
    localStorage.setItem(`ems_timer_${userKey}_current_break_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_is_on_break`, 'true');
    localStorage.setItem(`ems_timer_${userKey}_is_running`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'true');
    localStorage.setItem(`ems_timer_${userKey}_work_seconds`, (workSeconds || 0).toString());

    // Immediately update local hrms_attendance mirror so all UI components see isOnBreak: true synchronously
    try {
      const today = getTodayStr();
      const rawAtt = localStorage.getItem('hrms_attendance');
      if (rawAtt) {
        const list = JSON.parse(rawAtt);
        if (Array.isArray(list)) {
          const updated = list.map(a => {
            if (isRecordForUser(a, today)) {
              return { ...a, isOnBreak: true, breakType: type, status: 'present' };
            }
            return a;
          });
          localStorage.setItem('hrms_attendance', JSON.stringify(updated));
        }
      }
    } catch {}

    // Notify other components (WorkContext task timers pause) with user identity
    window.dispatchEvent(new CustomEvent('ems_break_started', {
      detail: {
        userKey,
        employeeId: targetEmpId,
        employeeCode: targetEmpCode,
        breakType: type,
        targetMinutes: minutesChosen,
        notes
      }
    }));

    // Record audit trail event for break trigger
    const isTea = type.toLowerCase().includes('tea');
    const isLunch = type.toLowerCase().includes('lunch');
    const logType = isTea ? 'tea_break_start' : (isLunch ? 'lunch_break_start' : 'break_start');
    const logAction = isTea ? 'Tea Break Started' : (isLunch ? 'Lunch Break Started' : `${type} Started`);

    recordAuditLog({
      type: logType,
      action: logAction,
      details: `${type} (${minutesChosen} min target) started at ${startTimeStr}. Work and task timers paused.`
    });

    try {
      hrService.markAttendance({
        employee: targetEmpId,
        employeeId: targetEmpId,
        employeeCode: targetEmpCode,
        date: getTodayStr(),
        status: 'present',
        isOnBreak: true,
        breakType: type,
        workSeconds,
        breakSeconds
      }).catch(() => {});
    } catch {}

    addToast({
      title: `On ${type} ☕ (${minutesChosen} min target)`,
      message: `Break started at ${startTimeStr}. Task & work timers paused. Break timer active.`,
      type: 'info'
    });
  };

  /**
   * Resume working from break and record into Break History
   */
  const resumeFromBreak = () => {
    const endTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const sTime = breakStartTime || loginTime;
    const breakStartMs = Number(localStorage.getItem(`ems_timer_${userKey}_break_start_timestamp`));
    const duration = breakStartMs ? Math.max(1, Math.floor((Date.now() - breakStartMs) / 1000)) : (currentBreakSeconds > 0 ? currentBreakSeconds : 60);

    const newRecord = {
      id: `brk_${Date.now()}`,
      type: breakType,
      targetMinutes: customBreakLimitMinutes,
      startTime: sTime,
      endTime: endTimeStr,
      durationSeconds: duration,
      durationText: formatMinutesSeconds(duration),
      date: getTodayStr(),
      notes: `Resumed work at ${endTimeStr}`
    };

    setBreakHistory(prev => [newRecord, ...prev]);

    setIsOnBreak(false);
    setIsRunning(true);
    setCurrentBreakSeconds(0);
    setBreakStartTime(null);
    setBreakReminderSent(false);

    localStorage.setItem(`ems_timer_${userKey}_is_on_break`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_is_running`, 'true');
    localStorage.setItem(`ems_timer_${userKey}_current_break_seconds`, '0');
    localStorage.removeItem(`ems_timer_${userKey}_break_start_time`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_timestamp`);

    const totalBreaksAfterResume = (Number(localStorage.getItem(`ems_timer_${userKey}_break_seconds`)) || breakSeconds) + duration;
    localStorage.setItem(`ems_timer_${userKey}_break_seconds`, totalBreaksAfterResume.toString());
    setBreakSeconds(totalBreaksAfterResume);

    // Immediately update local hrms_attendance mirror so all UI components see isOnBreak: false synchronously
    try {
      const today = getTodayStr();
      const rawAtt = localStorage.getItem('hrms_attendance');
      if (rawAtt) {
        const list = JSON.parse(rawAtt);
        if (Array.isArray(list)) {
          const updated = list.map(a => {
            if (isRecordForUser(a, today)) {
              return { ...a, isOnBreak: false, breakType: null, status: 'present', breakSeconds: totalBreaksAfterResume };
            }
            return a;
          });
          localStorage.setItem('hrms_attendance', JSON.stringify(updated));
        }
      }
    } catch {}

    // Notify other components (WorkContext task timers can resume) with user identity
    window.dispatchEvent(new CustomEvent('ems_break_ended', {
      detail: {
        userKey,
        employeeId: targetEmpId,
        employeeCode: targetEmpCode
      }
    }));

    // Record audit trail event for break completion
    const isTea = breakType.toLowerCase().includes('tea');
    const isLunch = breakType.toLowerCase().includes('lunch');
    const logType = isTea ? 'tea_break_end' : (isLunch ? 'lunch_break_end' : 'break_end');
    const logAction = isTea ? 'Resumed from Tea Break' : (isLunch ? 'Resumed from Lunch Break' : `Resumed from ${breakType}`);

    recordAuditLog({
      type: logType,
      action: logAction,
      durationSeconds: duration,
      durationText: formatMinutesSeconds(duration),
      details: `Ended ${breakType} after ${formatMinutesSeconds(duration)}. Work session resumed at ${endTimeStr}.`
    });

    try {
      hrService.markAttendance({
        employee: targetEmpId,
        employeeId: targetEmpId,
        employeeCode: targetEmpCode,
        date: getTodayStr(),
        status: 'present',
        isOnBreak: false,
        breakType: null,
        workSeconds,
        breakSeconds: totalBreaksAfterResume,
        breakHistory: [newRecord, ...breakHistory]
      }).catch(() => {});
    } catch {}

    addToast({
      title: 'Welcome Back! 🚀',
      message: `Break ended (${newRecord.durationText}). Recorded to Break History. Working timer resumed.`,
      type: 'success'
    });
  };

  /**
   * Extend active break by custom minutes
   */
  const extendBreak = (addMinutes = 5) => {
    setCustomBreakLimitMinutes(prev => {
      const next = prev + addMinutes;
      localStorage.setItem(`ems_timer_${userKey}_custom_break_limit`, next.toString());
      setBreakReminderSent(false);
      addToast(`Break extended by +${addMinutes} mins (New target: ${next} mins)`, 'info');
      return next;
    });
  };

  const deleteBreakHistoryItem = (id) => {
    setBreakHistory(prev => prev.filter(b => b.id !== id));
    addToast('Break log item removed', 'info');
  };

  const clearTodayBreaks = () => {
    setBreakHistory([]);
    setBreakSeconds(0);
    localStorage.setItem(`ems_timer_${userKey}_break_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_break_history`, JSON.stringify([]));
    addToast('Break history cleared for today', 'info');
  };

  const startTeaBreak = () => {
    startBreak('Tea Break', '', 15);
  };

  const startLunchBreak = () => {
    startBreak('Lunch Break', '', 45);
  };

  /**
   * Reset shift timer to 00:00:00
   */
  const resetShiftTimer = () => {
    setWorkSeconds(0);
    setBreakSeconds(0);
    setCurrentBreakSeconds(0);
    setIsRunning(false);
    setIsClockedIn(false);
    setIsOnBreak(false);
    setLoginTime(null);
    setClockOutTime(null);
    setBreakStartTime(null);
    setHadClockedOutToday(false);
    setReclockStatus('none');
    setReclockSessionSeconds(0);
    setSavedOfficialWorkSeconds(0);

    localStorage.setItem(`ems_timer_${userKey}_work_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_break_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_is_running`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_is_on_break`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_had_clocked_out`, 'false');
    localStorage.removeItem(`ems_timer_${userKey}_login_time`);
    localStorage.removeItem(`ems_timer_${userKey}_clockout_time`);
    localStorage.removeItem(`ems_timer_${userKey}_clock_in_timestamp`);
    localStorage.removeItem(`ems_timer_${userKey}_clock_out_timestamp`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_time`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_timestamp`);
    localStorage.setItem(`ems_timer_${userKey}_reclock_status`, 'none');
    localStorage.setItem(`ems_timer_${userKey}_reclock_session_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_saved_official_seconds`, '0');

    addToast('Work shift timer reset to 00:00:00', 'info');
  };

  /**
   * Clock In Handler (Starts shift or resumes existing shift with continuous hour tracking)
   */
  const handleClockIn = () => {
    const today = getTodayStr();
    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isFirstClockIn = !loginTime || sessionDate !== today;

    setSessionDate(today);
    const nowMs = Date.now();
    let clockInTs = Number(localStorage.getItem(`ems_timer_${userKey}_clock_in_timestamp`));
    if (isFirstClockIn || !clockInTs) {
      setLoginTime(nowStr);
      setWorkSeconds(0);
      setBreakSeconds(0);
      setCurrentBreakSeconds(0);
      setBreakHistory([]);
      localStorage.setItem(`ems_timer_${userKey}_break_history`, JSON.stringify([]));
      localStorage.setItem(`ems_timer_${userKey}_break_seconds`, '0');
      localStorage.setItem(`ems_timer_${userKey}_current_break_seconds`, '0');
      localStorage.setItem(`ems_timer_${userKey}_work_seconds`, '0');
      localStorage.setItem(`ems_timer_${userKey}_login_time`, nowStr);
      localStorage.setItem(`ems_timer_${userKey}_clock_in_timestamp`, nowMs.toString());
    }
    setClockOutTime(null);
    setIsClockedIn(true);
    setIsRunning(true);
    setIsOnBreak(false);
    setHadClockedOutToday(false);
    setReclockStatus('none');
    setReclockSessionSeconds(0);

    localStorage.setItem(`ems_timer_${userKey}_work_session_date`, today);
    localStorage.removeItem(`ems_timer_${userKey}_clockout_time`);
    localStorage.removeItem(`ems_timer_${userKey}_clock_out_timestamp`);
    localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'true');
    localStorage.setItem(`ems_timer_${userKey}_is_running`, 'true');
    localStorage.setItem(`ems_timer_${userKey}_is_on_break`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_had_clocked_out`, 'false');
    localStorage.removeItem(`ems_timer_${userKey}_break_start_time`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_timestamp`);
    localStorage.setItem(`ems_timer_${userKey}_current_break_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_reclock_status`, 'none');
    localStorage.setItem(`ems_timer_${userKey}_reclock_session_seconds`, '0');

    // Sync to Attendance Collection / Time Logs
    try {
      const attRaw = localStorage.getItem('hrms_attendance');
      const attendance = attRaw ? JSON.parse(attRaw) : [];
      const existingIdx = attendance.findIndex(a => isRecordForUser(a, today));

      const existingRec = existingIdx >= 0 ? attendance[existingIdx] : null;
      const initialClockIn = isFirstClockIn
        ? nowStr
        : (existingRec?.clockInTime || existingRec?.clockIn || loginTime || nowStr);

      const record = {
        _id: existingRec ? existingRec._id : `att_${targetEmpId}_${Date.now()}`,
        employeeId: targetEmpId,
        employeeCode: targetEmpCode,
        employeeName: targetEmpName,
        date: today,
        status: existingRec?.status === 'absent' ? 'present' : (existingRec?.status || 'present'),
        clockInTime: initialClockIn,
        clockIn: initialClockIn,
        clockOutTime: null,
        clockOut: null,
        clockInTimestamp: clockInTs || nowMs,
        clockOutTimestamp: null,
        workSeconds: 0,
        breakSeconds: 0,
        isOnBreak: false,
        isClockedIn: true,
        totalWorkingHours: +(workSeconds / 3600).toFixed(2),
        isLate: false,
        notes: existingRec?.notes || '',
        updatedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        attendance[existingIdx] = { ...attendance[existingIdx], ...record };
      } else {
        attendance.unshift(record);
      }
      localStorage.setItem('hrms_attendance', JSON.stringify(attendance));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'hrms_attendance' } }));
      window.dispatchEvent(new CustomEvent('ems_attendance_updated', { detail: { record } }));

      // Immediately sync clock-in to MongoDB Atlas backend via hrService
      try {
        hrService.markAttendance(record).catch(err => console.warn('Sync clock in to backend notice:', err));
      } catch (err) {}
    } catch (e) {
      console.error('Error recording clock-in to attendance:', e);
    }

    // Notify WorkContext and other modules
    window.dispatchEvent(new CustomEvent('ems_clocked_in', {
      detail: {
        userKey,
        employeeId: targetEmpId,
        employeeCode: targetEmpCode,
        loginTime: nowStr,
        date: today
      }
    }));

    // Record audit trail for clock-in trigger
    recordAuditLog({
      type: 'clock_in',
      action: isFirstClockIn ? 'Shift Clock In' : 'Shift Resumed',
      details: isFirstClockIn
        ? `${targetEmpName} clocked in to begin shift at ${nowStr}. Live work timer running.`
        : `Shift resumed at ${nowStr}. Continuing time tracking.`
    });

    addToast({
      title: isFirstClockIn ? 'Clocked In Successfully! 🟢' : 'Shift Resumed! 🟢',
      message: isFirstClockIn
        ? `Shift started at ${nowStr}. Live work timer running.`
        : `Shift resumed at ${nowStr}. Continuing time tracking.`,
      type: 'success'
    });
  };

  // ── Auto Clock-In Event Listener (called when employee starts a task timer) ──
  useEffect(() => {
    const handleRequestClockIn = () => {
      if (!isClockedIn) {
        handleClockIn();
      }
    };
    window.addEventListener('ems_request_clock_in', handleRequestClockIn);
    return () => window.removeEventListener('ems_request_clock_in', handleRequestClockIn);
  }, [isClockedIn, handleClockIn]);

  /**
   * Clock Out Handler
   */
  const handleClockOut = () => {
    if (!isClockedIn) {
      addToast({ title: 'Not Clocked In', message: 'You are not currently clocked in. Please clock in first.', type: 'warning' });
      return;
    }
    const today = getTodayStr();
    const logoutStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const logoutTs = Date.now();
    setClockOutTime(logoutStr);
    setHadClockedOutToday(true);
    setSavedOfficialWorkSeconds(workSeconds);

    localStorage.setItem(`ems_timer_${userKey}_clockout_time`, logoutStr);
    localStorage.setItem(`ems_timer_${userKey}_clock_out_timestamp`, logoutTs.toString());
    localStorage.setItem(`ems_timer_${userKey}_had_clocked_out`, 'true');
    localStorage.setItem(`ems_timer_${userKey}_saved_official_seconds`, workSeconds.toString());

    if (isOnBreak) {
      resumeFromBreak();
    }

    setIsRunning(false);
    setIsOnBreak(false);
    setIsClockedIn(false);

    localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_is_running`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_is_on_break`, 'false');
    localStorage.removeItem(`ems_timer_${userKey}_break_start_time`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_timestamp`);
    localStorage.setItem(`ems_timer_${userKey}_current_break_seconds`, '0');

    // Notify WorkContext and other modules that employee clocked out!
    window.dispatchEvent(new CustomEvent('ems_clocked_out', {
      detail: {
        userKey,
        employeeId: targetEmpId,
        employeeCode: targetEmpCode,
        logoutTime: logoutStr,
        date: today
      }
    }));

    // Update Attendance Collection record with final verified hours & clockOutTime
    try {
      const attRaw = localStorage.getItem('hrms_attendance');
      const attendance = attRaw ? JSON.parse(attRaw) : [];
      const existingIdx = attendance.findIndex(a => isRecordForUser(a, today));
      const computedHours = +(workSeconds / 3600).toFixed(2);
      const existingRec = existingIdx >= 0 ? attendance[existingIdx] : null;
      const finalClockIn = existingRec?.clockInTime || existingRec?.clockIn || loginTime || '09:30 AM';

      const updatedRecord = {
        _id: existingRec ? existingRec._id : `att_${targetEmpId}_${Date.now()}`,
        employeeId: targetEmpId,
        employeeCode: targetEmpCode,
        employeeName: targetEmpName,
        date: today,
        status: existingRec?.status || 'present',
        clockInTime: finalClockIn,
        clockIn: finalClockIn,
        clockOutTime: logoutStr,
        clockOut: logoutStr,
        clockInTimestamp: Number(localStorage.getItem(`ems_timer_${userKey}_clock_in_timestamp`)) || existingRec?.clockInTimestamp || undefined,
        clockOutTimestamp: Date.now(),
        workSeconds: workSeconds,
        breakSeconds: breakSeconds,
        isOnBreak: false,
        isClockedIn: false,
        totalWorkingHours: computedHours || existingRec?.totalWorkingHours || +(workSeconds / 3600).toFixed(2),
        notes: existingRec?.notes || '',
        updatedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        attendance[existingIdx] = {
          ...attendance[existingIdx],
          ...updatedRecord
        };
      } else {
        // ALWAYS create a record if none existed, NEVER drop the clock out!
        attendance.unshift(updatedRecord);
      }

      localStorage.setItem('hrms_attendance', JSON.stringify(attendance));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'hrms_attendance' } }));
      window.dispatchEvent(new CustomEvent('ems_attendance_updated', { detail: { record: updatedRecord } }));

      // Also invoke hrService background sync fallback
      try {
        hrService.markAttendance(updatedRecord).catch(() => {});
      } catch {}
    } catch (e) {
      console.error('Error updating clock-out to attendance:', e);
    }

    // Record audit trail for clock-out trigger
    recordAuditLog({
      type: 'clock_out',
      action: 'Shift Clock Out',
      durationSeconds: workSeconds,
      durationText: formatHoursMinutes(workSeconds),
      details: `${targetEmpName} ended shift at ${logoutStr}. Total Productive Work: ${formatHoursMinutes(workSeconds)}, Total Breaks: ${formatHoursMinutes(breakSeconds)}.`
    });

    addToast({
      title: 'Shift Clocked Out 🔴',
      message: `Shift ended at ${logoutStr}. Total Productive Work: ${formatHoursMinutes(workSeconds)} | Breaks: ${formatHoursMinutes(breakSeconds)}.`,
      type: 'info'
    });
  };

  /**
   * ── Accidental Clock-out: Re-Clock In Request ──
   * Allows employee to resume working immediately while sending a real-time request to Admin.
   * "fir se clock in karne se time fir se suru ho jaye chahe admin accept kare ya nhi bhi"
   */
  const requestReclockIn = (reason = 'Accidental Clock-out / Same-day Resume') => {
    const today = getTodayStr();
    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // 1. Immediately resume timer so no productive time is lost!
    setIsClockedIn(true);
    setIsRunning(true);
    setIsOnBreak(false);
    setReclockStatus('pending');
    setReclockSessionSeconds(0);

    localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'true');
    localStorage.setItem(`ems_timer_${userKey}_is_running`, 'true');
    localStorage.setItem(`ems_timer_${userKey}_reclock_status`, 'pending');
    localStorage.setItem(`ems_timer_${userKey}_reclock_session_seconds`, '0');

    // 2. Create Re-Clock in request record for Admin review
    const newRequest = {
      id: `reclock_${Date.now()}`,
      employeeId: userKey,
      employeeName: currentUser?.name || 'Employee',
      employeeAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      employeeRole: currentUser?.role || 'Team Member',
      date: today,
      originalClockIn: loginTime || '09:00 AM',
      accidentalClockOut: clockOutTime || nowStr,
      requestedAt: nowStr,
      reason: reason || 'Accidental Clock-out / Resuming Shift',
      status: 'pending',
      officialHoursBeforeClockout: formatHoursMinutes(savedOfficialWorkSeconds || workSeconds)
    };

    try {
      const raw = localStorage.getItem('ems_reclock_requests');
      const list = raw ? JSON.parse(raw) : [];
      // Remove any existing pending request for this user today to avoid duplicates
      const filtered = list.filter(r => !(r.employeeId === userKey && r.date === today));
      filtered.unshift(newRequest);
      localStorage.setItem('ems_reclock_requests', JSON.stringify(filtered));
      setReclockRequests(filtered);
      window.dispatchEvent(new CustomEvent('ems_reclock_requests_updated'));
    } catch (e) {
      console.error('Error saving reclock request:', e);
    }

    addToast({
      title: '🟡 Re-Clock In Request Sent!',
      message: `Your work timer has resumed immediately (${nowStr}). Admin has been notified for approval.`,
      type: 'warning'
    });
  };

  /**
   * ── Admin Action: Approve Re-Clock In Request ──
   * Officially merges the re-clocked session time into the employee's attendance!
   */
  const approveReclockRequest = (requestId) => {
    try {
      const raw = localStorage.getItem('ems_reclock_requests');
      const list = raw ? JSON.parse(raw) : [];
      const targetReq = list.find(r => r.id === requestId);

      if (!targetReq) {
        addToast('Request not found', 'error');
        return;
      }

      targetReq.status = 'approved';
      targetReq.approvedAt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      targetReq.reviewedBy = currentUser?.name || 'Admin';

      localStorage.setItem('ems_reclock_requests', JSON.stringify(list));
      setReclockRequests(list);

      // If approved user is the current active session
      if (targetReq.employeeId === userKey) {
        setReclockStatus('approved');
        localStorage.setItem(`ems_timer_${userKey}_reclock_status`, 'approved');
        setSavedOfficialWorkSeconds(workSeconds);
        localStorage.setItem(`ems_timer_${userKey}_saved_official_seconds`, workSeconds.toString());
      } else {
        // Update target user's storage directly
        localStorage.setItem(`ems_timer_${targetReq.employeeId}_reclock_status`, 'approved');
      }

      // Update today's attendance record with updated status
      const attRaw = localStorage.getItem('hrms_attendance');
      const attendance = attRaw ? JSON.parse(attRaw) : [];
      const idx = attendance.findIndex(a => (
        a.employeeId === targetReq.employeeId ||
        a.employeeCode === targetReq.employeeId ||
        (a.employeeName && targetReq.employeeName && a.employeeName.toLowerCase() === targetReq.employeeName.toLowerCase())
      ) && a.date === targetReq.date);
      if (idx >= 0) {
        attendance[idx].reclockApproved = true;
        attendance[idx].clockOutTime = null; // reopened
        attendance[idx].notes = `Re-clock in approved by ${currentUser?.name || 'Admin'}`;
        localStorage.setItem('hrms_attendance', JSON.stringify(attendance));
      }

      window.dispatchEvent(new CustomEvent('ems_reclock_requests_updated'));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'hrms_attendance' } }));

      addToast({
        title: '✅ Re-Clock In Approved',
        message: `Approved re-clock in for ${targetReq.employeeName}. Their resumed working hours are officially counted!`,
        type: 'success'
      });
    } catch (e) {
      console.error('Error approving reclock request:', e);
      addToast('Failed to approve request', 'error');
    }
  };

  /**
   * ── Admin Action: Reject Re-Clock In Request ──
   * Discards the extra re-clock session time completely!
   * "or regect kar diya to time count nhi hota"
   */
  const rejectReclockRequest = (requestId) => {
    try {
      const raw = localStorage.getItem('ems_reclock_requests');
      const list = raw ? JSON.parse(raw) : [];
      const targetReq = list.find(r => r.id === requestId);

      if (!targetReq) {
        addToast('Request not found', 'error');
        return;
      }

      targetReq.status = 'rejected';
      targetReq.rejectedAt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      targetReq.reviewedBy = currentUser?.name || 'Admin';

      localStorage.setItem('ems_reclock_requests', JSON.stringify(list));
      setReclockRequests(list);

      // If rejected user is currently active in this session
      if (targetReq.employeeId === userKey) {
        setReclockStatus('rejected');
        setIsRunning(false);
        setIsClockedIn(false);
        setWorkSeconds(savedOfficialWorkSeconds);
        setReclockSessionSeconds(0);

        localStorage.setItem(`ems_timer_${userKey}_reclock_status`, 'rejected');
        localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'false');
        localStorage.setItem(`ems_timer_${userKey}_is_running`, 'false');
        localStorage.setItem(`ems_timer_${userKey}_work_seconds`, savedOfficialWorkSeconds.toString());
        localStorage.setItem(`ems_timer_${userKey}_reclock_session_seconds`, '0');
      } else {
        // Update target user's storage directly to rollback
        const prevOfficial = localStorage.getItem(`ems_timer_${targetReq.employeeId}_saved_official_seconds`) || '0';
        localStorage.setItem(`ems_timer_${targetReq.employeeId}_reclock_status`, 'rejected');
        localStorage.setItem(`ems_timer_${targetReq.employeeId}_is_clocked_in`, 'false');
        localStorage.setItem(`ems_timer_${targetReq.employeeId}_is_running`, 'false');
        localStorage.setItem(`ems_timer_${targetReq.employeeId}_work_seconds`, prevOfficial);
        localStorage.setItem(`ems_timer_${targetReq.employeeId}_reclock_session_seconds`, '0');
      }

      window.dispatchEvent(new CustomEvent('ems_reclock_requests_updated'));
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'hrms_attendance' } }));

      addToast({
        title: '❌ Re-Clock In Request Rejected',
        message: `Rejected request for ${targetReq.employeeName}. Unapproved extra time was discarded and will not count.`,
        type: 'info'
      });
    } catch (e) {
      console.error('Error rejecting reclock request:', e);
      addToast('Failed to reject request', 'error');
    }
  };

  // ── Format Helpers & Target Calculations ──
  const TARGET_SHIFT_SECONDS = 8.5 * 3600; // Standard 8 hours 30 mins daily shift target
  const targetShiftSeconds = TARGET_SHIFT_SECONDS;
  const targetShiftHoursText = '8h 30m';
  const shiftProgressPercent = Math.min(100, Math.round((workSeconds / TARGET_SHIFT_SECONDS) * 100));
  const isShiftTargetReached = workSeconds >= TARGET_SHIFT_SECONDS;
  const remainingShiftSeconds = Math.max(0, TARGET_SHIFT_SECONDS - workSeconds);

  const formatSeconds = (totalSecs) => {
    const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const formatHoursMinutes = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const formatMinutesSeconds = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const grossSeconds = workSeconds + breakSeconds;

  const activeBreakLimit = (customBreakLimitMinutes > 0 ? customBreakLimitMinutes * 60 : (BREAK_THRESHOLDS[breakType] || 20 * 60));
  const activeBreakProgress = Math.min(100, Math.round((currentBreakSeconds / activeBreakLimit) * 100));
  const isBreakOverdue = currentBreakSeconds > activeBreakLimit;
  const breakRemainingSeconds = Math.max(0, activeBreakLimit - currentBreakSeconds);

  const pendingReclockRequests = (reclockRequests || []).filter(r => r.status === 'pending');

  return (
    <TimerContext.Provider value={{
      loginTime,
      clockOutTime,
      hadClockedOutToday,
      workSeconds,
      breakSeconds,
      grossSeconds,
      currentBreakSeconds,
      breakStartTime,
      isRunning,
      isOnBreak,
      breakType,
      customBreakLimitMinutes,
      isClockedIn,
      breakHistory,
      activeBreakLimit,
      activeBreakProgress,
      isBreakOverdue,
      breakRemainingSeconds,
      breakRemainingTimeString: formatMinutesSeconds(breakRemainingSeconds),
      targetShiftSeconds,
      targetShiftHoursText,
      shiftProgressPercent,
      isShiftTargetReached,
      remainingShiftSeconds,
      remainingShiftText: isShiftTargetReached
        ? '🎉 8h 30m Shift Target Completed!'
        : `${formatHoursMinutes(remainingShiftSeconds)} remaining to 8h 30m target`,
      timeString: formatSeconds(workSeconds),
      breakTimeString: formatSeconds(breakSeconds),
      currentBreakTimeString: formatSeconds(currentBreakSeconds),
      workDurationText: formatHoursMinutes(workSeconds),
      breakDurationText: formatHoursMinutes(breakSeconds),
      grossDurationText: formatHoursMinutes(grossSeconds),
      togglePauseResume,
      startBreak,
      startTeaBreak,
      startLunchBreak,
      resumeFromBreak,
      extendBreak,
      handleClockIn,
      handleClockOut,
      resetShiftTimer,
      deleteBreakHistoryItem,
      clearTodayBreaks,
      formatSeconds,
      formatHoursMinutes,
      formatMinutesSeconds,
      // ── Accidental Clock-out Re-clock In Request Feature ──
      reclockStatus,
      reclockSessionSeconds,
      reclockSessionTimeString: formatSeconds(reclockSessionSeconds),
      reclockRequests,
      pendingReclockRequests,
      requestReclockIn,
      approveReclockRequest,
      rejectReclockRequest,
      // ── Audit Trail & Admin Overrides ──
      recordAuditLog,
      adminForceClockOut: async (targetEmpId, auditNote) => {
        return await hrService.adminForceClockOut(targetEmpId, auditNote);
      }
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => useContext(TimerContext);
