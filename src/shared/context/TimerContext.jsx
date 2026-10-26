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

// Recommended break thresholds (in seconds) for smart reminder notifications
export const BREAK_THRESHOLDS = {
  'Lunch Break': 45 * 60,       // 45 minutes
  'Tea Break': 15 * 60,         // 15 minutes
  'Tea / Coffee Break': 15 * 60,// 15 minutes
  'Personal Break': 15 * 60,    // 15 minutes
  'Quick Rest / Stretch': 10 * 60, // 10 minutes
  'Short Rest': 10 * 60,        // 10 minutes
  'Wellness & Prayer': 15 * 60  // 15 minutes
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

  // Helper: robustly find today's attendance record from storage
  const getTodayAttendanceRecord = useCallback((targetDate = getTodayStr()) => {
    try {
      const attRaw = localStorage.getItem('hrms_attendance');
      if (!attRaw) return null;
      const att = JSON.parse(attRaw);
      return Array.isArray(att) ? (att.find(a => isRecordForUser(a, targetDate)) || null) : null;
    } catch {
      return null;
    }
  }, [isRecordForUser]);

  // Helper: Purge previous day's ephemeral timer keys so they NEVER bleed into a new day
  const cleanStaleSessionKeys = useCallback((newToday) => {
    localStorage.setItem(`ems_timer_${userKey}_work_session_date`, newToday);
    localStorage.setItem(`ems_timer_${userKey}_work_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_break_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_current_break_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_is_running`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_is_on_break`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_had_clocked_out`, 'false');
    localStorage.removeItem(`ems_timer_${userKey}_login_time`);
    localStorage.removeItem(`ems_timer_${userKey}_clockout_time`);
    localStorage.removeItem(`ems_timer_${userKey}_clock_in_timestamp`);
    localStorage.removeItem(`ems_timer_${userKey}_clock_in_date`);
    localStorage.removeItem(`ems_timer_${userKey}_clock_out_timestamp`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_time`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_timestamp`);
    localStorage.setItem(`ems_timer_${userKey}_reclock_status`, 'none');
    localStorage.setItem(`ems_timer_${userKey}_reclock_session_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_saved_official_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_break_history`, JSON.stringify([]));
  }, [userKey]);

  // ── 1. Daily Clock In / Out State (Persisted Attendance as Source of Truth) ──
  const todayStrNow = getTodayStr();
  const storedSessionDateRaw = localStorage.getItem(`ems_timer_${userKey}_work_session_date`);
  const isDateChangedOnLoad = storedSessionDateRaw && storedSessionDateRaw !== todayStrNow;

  // Auto-close yesterday's session if left unclosed before initializing
  if (isDateChangedOnLoad) {
    const wasClockedInYesterday = localStorage.getItem(`ems_timer_${userKey}_is_clocked_in`) === 'true';
    if (wasClockedInYesterday) {
      try {
        const attRaw = localStorage.getItem('hrms_attendance');
        if (attRaw) {
          const attendance = JSON.parse(attRaw);
          if (Array.isArray(attendance)) {
            const yIdx = attendance.findIndex(a => isRecordForUser(a, storedSessionDateRaw));
            if (yIdx >= 0 && !attendance[yIdx].clockOutTime && !attendance[yIdx].clockOut) {
              attendance[yIdx].clockOutTime = '06:30 PM';
              attendance[yIdx].clockOut = '06:30 PM';
              if (!attendance[yIdx].totalWorkingHours) attendance[yIdx].totalWorkingHours = 8.0;
              localStorage.setItem('hrms_attendance', JSON.stringify(attendance));
            }
          }
        }
      } catch (err) {}
    }
    // Clean stale keys for the new day
    localStorage.setItem(`ems_timer_${userKey}_work_session_date`, todayStrNow);
    localStorage.setItem(`ems_timer_${userKey}_work_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_break_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_current_break_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_is_running`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_is_on_break`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_had_clocked_out`, 'false');
    localStorage.removeItem(`ems_timer_${userKey}_login_time`);
    localStorage.removeItem(`ems_timer_${userKey}_clockout_time`);
    localStorage.removeItem(`ems_timer_${userKey}_clock_in_timestamp`);
    localStorage.removeItem(`ems_timer_${userKey}_clock_in_date`);
    localStorage.removeItem(`ems_timer_${userKey}_clock_out_timestamp`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_time`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_timestamp`);
    localStorage.setItem(`ems_timer_${userKey}_reclock_status`, 'none');
    localStorage.setItem(`ems_timer_${userKey}_reclock_session_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_saved_official_seconds`, '0');
    localStorage.setItem(`ems_timer_${userKey}_break_history`, JSON.stringify([]));
  }

  const [sessionDate, setSessionDate] = useState(() => todayStrNow);
  const isTodaySession = sessionDate === todayStrNow;

  // Read persisted attendance record for today (Authoritative Source of Truth)
  const initialTodayRec = (() => {
    try {
      const attRaw = localStorage.getItem('hrms_attendance');
      if (!attRaw) return null;
      const att = JSON.parse(attRaw);
      return Array.isArray(att) ? (att.find(a => isRecordForUser(a, todayStrNow)) || null) : null;
    } catch {
      return null;
    }
  })();

  const initialHasClockedOut = !!(initialTodayRec?.clockOutTime || initialTodayRec?.clockOut || (localStorage.getItem(`ems_timer_${userKey}_had_clocked_out`) === 'true'));
  const initialIsClockedIn = !initialHasClockedOut && !!(initialTodayRec?.clockInTime || initialTodayRec?.clockIn || (localStorage.getItem(`ems_timer_${userKey}_is_clocked_in`) === 'true'));

  const [loginTime, setLoginTime] = useState(() => {
    if (initialTodayRec?.clockInTime || initialTodayRec?.clockIn) {
      return initialTodayRec.clockInTime || initialTodayRec.clockIn;
    }
    const scoped = localStorage.getItem(`ems_timer_${userKey}_login_time`);
    return scoped || null;
  });

  const [clockOutTime, setClockOutTime] = useState(() => {
    if (initialTodayRec?.clockOutTime || initialTodayRec?.clockOut) {
      return initialTodayRec.clockOutTime || initialTodayRec.clockOut;
    }
    const scoped = localStorage.getItem(`ems_timer_${userKey}_clockout_time`);
    return scoped || null;
  });

  const [hadClockedOutToday, setHadClockedOutToday] = useState(() => {
    return initialHasClockedOut;
  });

  const [isClockedIn, setIsClockedIn] = useState(() => {
    return initialIsClockedIn;
  });

  const [isRunning, setIsRunning] = useState(() => {
    return initialIsClockedIn;
  });

  // Active productive work seconds (starts strictly from 0 on a fresh day, or restores persisted completed hours)
  const [workSeconds, setWorkSeconds] = useState(() => {
    if (initialHasClockedOut) {
      if (initialTodayRec?.totalWorkingHours) {
        return Math.round(Number(initialTodayRec.totalWorkingHours) * 3600);
      }
      const saved = localStorage.getItem(`ems_timer_${userKey}_work_seconds`);
      return saved ? parseInt(saved, 10) : 0;
    }
    if (initialIsClockedIn) {
      const saved = localStorage.getItem(`ems_timer_${userKey}_work_seconds`);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  // Saved official seconds before accidental clock-out
  const [savedOfficialWorkSeconds, setSavedOfficialWorkSeconds] = useState(() => {
    if (initialHasClockedOut) {
      if (initialTodayRec?.totalWorkingHours) {
        return Math.round(Number(initialTodayRec.totalWorkingHours) * 3600);
      }
    }
    const saved = localStorage.getItem(`ems_timer_${userKey}_saved_official_seconds`);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Cumulative break seconds for current day
  const [breakSeconds, setBreakSeconds] = useState(() => {
    if (!initialIsClockedIn && !initialHasClockedOut) return 0;
    const saved = localStorage.getItem(`ems_timer_${userKey}_break_seconds`);
    return saved ? parseInt(saved, 10) : 0;
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

  // Reload timer state when userKey switches (Multi-User Safe & Persisted Attendance Aware)
  useEffect(() => {
    const today = getTodayStr();
    const storedDate = localStorage.getItem(`ems_timer_${userKey}_work_session_date`) || today;
    const isToday = storedDate === today;

    setSessionDate(today);

    if (!isToday) {
      cleanStaleSessionKeys(today);
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
      // Check today's persisted attendance record
      const todayRec = getTodayAttendanceRecord(today);
      const hasClockedOut = !!(todayRec?.clockOutTime || todayRec?.clockOut || (localStorage.getItem(`ems_timer_${userKey}_had_clocked_out`) === 'true'));
      const isClockedInVal = !hasClockedOut && !!(todayRec?.clockInTime || todayRec?.clockIn || (localStorage.getItem(`ems_timer_${userKey}_is_clocked_in`) === 'true'));

      setIsClockedIn(isClockedInVal);
      setIsRunning(isClockedInVal);
      setHadClockedOutToday(hasClockedOut);

      const lTime = todayRec?.clockInTime || todayRec?.clockIn || localStorage.getItem(`ems_timer_${userKey}_login_time`) || null;
      setLoginTime(lTime);

      const cTime = todayRec?.clockOutTime || todayRec?.clockOut || localStorage.getItem(`ems_timer_${userKey}_clockout_time`) || null;
      setClockOutTime(cTime);

      if (hasClockedOut) {
        const finalSecs = todayRec?.totalWorkingHours
          ? Math.round(Number(todayRec.totalWorkingHours) * 3600)
          : (Number(localStorage.getItem(`ems_timer_${userKey}_work_seconds`)) || 0);
        setWorkSeconds(finalSecs);
        setSavedOfficialWorkSeconds(finalSecs);
      } else if (isClockedInVal) {
        const secVal = localStorage.getItem(`ems_timer_${userKey}_work_seconds`);
        setWorkSeconds(secVal ? parseInt(secVal, 10) : 0);
      } else {
        setWorkSeconds(0);
      }

      const brkSec = localStorage.getItem(`ems_timer_${userKey}_break_seconds`);
      setBreakSeconds(brkSec ? parseInt(brkSec, 10) : 0);

      const rStatus = localStorage.getItem(`ems_timer_${userKey}_reclock_status`) || 'none';
      setReclockStatus(rStatus);

      const rSec = localStorage.getItem(`ems_timer_${userKey}_reclock_session_seconds`);
      setReclockSessionSeconds(rSec ? parseInt(rSec, 10) : 0);
    }
  }, [userKey, cleanStaleSessionKeys, getTodayAttendanceRecord]);

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
      cleanStaleSessionKeys(today);
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

      window.dispatchEvent(new CustomEvent('ems_day_rollover', {
        detail: { newDate: today, previousDate: sessionDate, userKey }
      }));
    }
  }, [sessionDate, userKey, cleanStaleSessionKeys]);

  // Save break history
  useEffect(() => {
    localStorage.setItem(`ems_timer_${userKey}_break_history`, JSON.stringify(breakHistory));
  }, [breakHistory, userKey]);

  // ── True Wall-Clock Timestamp Engine (Immune to tab sleep, throttle & page reloads) ──
  useEffect(() => {
    let interval = null;
    let lastStorageWriteTs = 0;

    const tick = () => {
      const today = getTodayStr();

      // Midnight date boundary check
      const currentStoredDate = localStorage.getItem(`ems_timer_${userKey}_work_session_date`);
      if (currentStoredDate && currentStoredDate !== today) {
        cleanStaleSessionKeys(today);
        setSessionDate(today);
        setWorkSeconds(0);
        setBreakSeconds(0);
        setIsClockedIn(false);
        setIsRunning(false);
        setIsOnBreak(false);
        setLoginTime(null);
        setClockOutTime(null);
        setHadClockedOutToday(false);
        return;
      }

      const inVal = localStorage.getItem(`ems_timer_${userKey}_is_clocked_in`) === 'true';
      const onBreakVal = localStorage.getItem(`ems_timer_${userKey}_is_on_break`) === 'true';
      const hadOutVal = localStorage.getItem(`ems_timer_${userKey}_had_clocked_out`) === 'true';
      let clockInTs = Number(localStorage.getItem(`ems_timer_${userKey}_clock_in_timestamp`));
      const clockInDate = localStorage.getItem(`ems_timer_${userKey}_clock_in_date`);
      let breakStartTs = Number(localStorage.getItem(`ems_timer_${userKey}_break_start_timestamp`));

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
      // Break is strictly counted ONLY if user is clocked in AND has explicitly started a break
      if (inVal && onBreakVal) {
        if (!breakStartTs) {
          breakStartTs = Date.now();
          localStorage.setItem(`ems_timer_${userKey}_break_start_timestamp`, breakStartTs.toString());
        }
        activeBreakSecs = Math.max(0, Math.floor((Date.now() - breakStartTs) / 1000));
        setCurrentBreakSeconds(activeBreakSecs);
        localStorage.setItem(`ems_timer_${userKey}_current_break_seconds`, activeBreakSecs.toString());

        const threshold = BREAK_THRESHOLDS[breakType] || (20 * 60);
        if (activeBreakSecs >= threshold && !breakReminderSent) {
          setBreakReminderSent(true);
          addToast({
            title: `☕ Break Reminder (${breakType})`,
            message: `You've been on ${breakType} for ${Math.floor(threshold / 60)} minutes. Remember to resume when ready!`,
            type: 'warning'
          });
        }
      } else {
        // User is working or not on break - clean up any stale break timestamps
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

      if (inVal && !hadOutVal) {
        // Validate that clockInTs strictly belongs to today
        if (!clockInTs || clockInDate !== today) {
          clockInTs = Date.now();
          localStorage.setItem(`ems_timer_${userKey}_clock_in_timestamp`, clockInTs.toString());
          localStorage.setItem(`ems_timer_${userKey}_clock_in_date`, today);
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

        if (reclockStatus === 'pending') {
          const rBase = Number(localStorage.getItem(`ems_timer_${userKey}_saved_official_seconds`) || 0);
          const rSecs = Math.max(0, netWorkSecs - rBase);
          setReclockSessionSeconds(rSecs);
          localStorage.setItem(`ems_timer_${userKey}_reclock_session_seconds`, rSecs.toString());
        }
      } else if (!hadOutVal) {
        // Not clocked in and not clocked out
        setWorkSeconds(0);
      }
      // If hadOutVal is true: session is completed for today, keep workSeconds frozen at recorded duration
    };

    tick();
    interval = setInterval(tick, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isClockedIn, isOnBreak, breakType, breakReminderSent, reclockStatus, userKey, addToast]);



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
   * Clock In Handler (Starts shift from today's valid timestamp, never calculating from yesterday)
   */
  const handleClockIn = () => {
    const today = getTodayStr();
    const now = new Date();
    const nowStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const nowMs = now.getTime();

    // If sessionDate is from another day, clear stale keys first
    const storedDate = localStorage.getItem(`ems_timer_${userKey}_work_session_date`);
    if (storedDate && storedDate !== today) {
      cleanStaleSessionKeys(today);
    }

    setSessionDate(today);

    // Retrieve today's existing attendance record if any
    const existingRec = getTodayAttendanceRecord(today);
    const initialClockIn = existingRec?.clockInTime || existingRec?.clockIn || nowStr;

    setLoginTime(initialClockIn);
    setClockOutTime(null);
    setHadClockedOutToday(false);
    setIsClockedIn(true);
    setIsRunning(true);
    setIsOnBreak(false);
    setReclockStatus('none');
    setReclockSessionSeconds(0);

    // Set strictly today-scoped keys
    localStorage.setItem(`ems_timer_${userKey}_work_session_date`, today);
    localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'true');
    localStorage.setItem(`ems_timer_${userKey}_is_running`, 'true');
    localStorage.setItem(`ems_timer_${userKey}_is_on_break`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_had_clocked_out`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_login_time`, initialClockIn);
    localStorage.removeItem(`ems_timer_${userKey}_clockout_time`);
    localStorage.removeItem(`ems_timer_${userKey}_clock_out_timestamp`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_time`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_timestamp`);
    localStorage.setItem(`ems_timer_${userKey}_reclock_status`, 'none');
    localStorage.setItem(`ems_timer_${userKey}_reclock_session_seconds`, '0');

    // Fresh clock-in: ensure timestamp belongs strictly to today and starts from 0s
    let existingClockInTs = Number(localStorage.getItem(`ems_timer_${userKey}_clock_in_timestamp`));
    const clockInDate = localStorage.getItem(`ems_timer_${userKey}_clock_in_date`);

    if (!existingClockInTs || clockInDate !== today) {
      existingClockInTs = nowMs;
      localStorage.setItem(`ems_timer_${userKey}_clock_in_timestamp`, nowMs.toString());
      localStorage.setItem(`ems_timer_${userKey}_clock_in_date`, today);
      localStorage.setItem(`ems_timer_${userKey}_work_seconds`, '0');
      localStorage.setItem(`ems_timer_${userKey}_break_seconds`, '0');
      localStorage.setItem(`ems_timer_${userKey}_current_break_seconds`, '0');
      localStorage.setItem(`ems_timer_${userKey}_break_history`, JSON.stringify([]));
      setWorkSeconds(0);
      setBreakSeconds(0);
      setCurrentBreakSeconds(0);
      setBreakHistory([]);
    }

    // Sync to Attendance Collection / Time Logs
    try {
      const attRaw = localStorage.getItem('hrms_attendance');
      const parsedAtt = attRaw ? JSON.parse(attRaw) : [];
      const attendance = Array.isArray(parsedAtt) ? parsedAtt : [];
      const existingIdx = attendance.findIndex(a => isRecordForUser(a, today));

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
        totalWorkingHours: 0,
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
        loginTime: initialClockIn,
        date: today
      }
    }));

    // Record audit trail for clock-in trigger
    recordAuditLog({
      type: 'clock_in',
      action: !existingRec ? 'Shift Clock In' : 'Shift Resumed',
      details: !existingRec
        ? `${targetEmpName} clocked in to begin shift at ${nowStr}. Live work timer running.`
        : `Shift resumed at ${nowStr}. Continuing time tracking.`
    });

    addToast({
      title: !existingRec ? 'Clocked In Successfully! 🟢' : 'Shift Resumed! 🟢',
      message: !existingRec
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
   * Clock Out Handler (Stops active timer, records final duration and freezes session)
   */
  const handleClockOut = () => {
    if (!isClockedIn && !hadClockedOutToday) {
      handleClockIn();
      return;
    }
    const today = getTodayStr();
    const now = new Date();
    const logoutStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const logoutTs = now.getTime();

    if (isOnBreak) {
      resumeFromBreak();
    }

    // Determine final net working duration strictly for today
    let clockInTs = Number(localStorage.getItem(`ems_timer_${userKey}_clock_in_timestamp`));
    const clockInDate = localStorage.getItem(`ems_timer_${userKey}_clock_in_date`);
    let finalNetSecs = workSeconds;

    if (clockInTs > 0 && clockInDate === today) {
      const grossShiftSecs = Math.max(0, Math.floor((logoutTs - clockInTs) / 1000));
      finalNetSecs = Math.max(0, grossShiftSecs - breakSeconds);
    }
    const computedHours = +(finalNetSecs / 3600).toFixed(2);

    setClockOutTime(logoutStr);
    setHadClockedOutToday(true);
    setSavedOfficialWorkSeconds(finalNetSecs);
    setWorkSeconds(finalNetSecs);
    setIsRunning(false);
    setIsOnBreak(false);
    setIsClockedIn(false);

    // Save final state to storage & clear active running timestamp so timer cannot continue ticking
    localStorage.setItem(`ems_timer_${userKey}_work_session_date`, today);
    localStorage.setItem(`ems_timer_${userKey}_is_clocked_in`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_is_running`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_is_on_break`, 'false');
    localStorage.setItem(`ems_timer_${userKey}_had_clocked_out`, 'true');
    localStorage.setItem(`ems_timer_${userKey}_clockout_time`, logoutStr);
    localStorage.setItem(`ems_timer_${userKey}_clock_out_timestamp`, logoutTs.toString());
    localStorage.setItem(`ems_timer_${userKey}_work_seconds`, finalNetSecs.toString());
    localStorage.setItem(`ems_timer_${userKey}_saved_official_seconds`, finalNetSecs.toString());
    localStorage.removeItem(`ems_timer_${userKey}_clock_in_timestamp`);
    localStorage.removeItem(`ems_timer_${userKey}_clock_in_date`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_time`);
    localStorage.removeItem(`ems_timer_${userKey}_break_start_timestamp`);
    localStorage.setItem(`ems_timer_${userKey}_current_break_seconds`, '0');

    // Notify WorkContext and other modules that employee clocked out
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
      const parsedAtt = attRaw ? JSON.parse(attRaw) : [];
      const attendance = Array.isArray(parsedAtt) ? parsedAtt : [];
      const existingIdx = attendance.findIndex(a => isRecordForUser(a, today));
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
        totalWorkingHours: computedHours || existingRec?.totalWorkingHours || 0,
        notes: existingRec?.notes || '',
        updatedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        attendance[existingIdx] = {
          ...attendance[existingIdx],
          ...updatedRecord
        };
      } else {
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
