/**
 * @file timerUtils.js
 * @description Canonical key resolution, multi-key mirroring, and formatting helpers
 * for Shift Clock, Active Task Timer, and Attendance State.
 */

/**
 * Universal canonical timer key resolver.
 * Bridges employeeCode, _id, id, and email so all timer reads/writes map to the same tenant.
 *
 * @param {Object|string} user - User object or string identifier
 * @returns {string} Canonical uppercase/normalized key
 */
export const getCanonicalTimerKey = (user) => {
  if (!user) return '';
  if (typeof user === 'string') {
    const trimmed = user.trim();
    if (!trimmed) return '';
    return trimmed.toUpperCase();
  }

  // Object checks
  if (user.employeeCode && String(user.employeeCode).trim()) {
    return String(user.employeeCode).trim().toUpperCase();
  }
  if (user._id) {
    return String(user._id).trim();
  }
  if (user.id) {
    return String(user.id).trim();
  }
  if (user.email) {
    return String(user.email).trim().toLowerCase();
  }
  return '';
};

/**
 * Returns all mirror alias keys for an employee to guarantee 100% synchronization.
 *
 * @param {Object|string} user - User object or string identifier
 * @returns {string[]} Array of unique string keys
 */
export const getTimerMirrorKeys = (user) => {
  if (!user) return [];
  if (typeof user === 'string') {
    const c = getCanonicalTimerKey(user);
    return c ? [c] : [];
  }

  const keys = new Set();
  const c = getCanonicalTimerKey(user);
  if (c) keys.add(c);

  if (user.employeeCode) keys.add(String(user.employeeCode).trim().toUpperCase());
  if (user._id) keys.add(String(user._id).trim());
  if (user.id) keys.add(String(user.id).trim());
  if (user.email) keys.add(String(user.email).trim().toLowerCase());

  return Array.from(keys);
};

/**
 * Parses any time string ("09:30 AM", "18:30:00", "09:30", "9:30am") into seconds from midnight.
 *
 * @param {string} str - Time string
 * @returns {number} Seconds from midnight
 */
export const parseTimeToSeconds = (str) => {
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

/**
 * Formats seconds into human readable duration: "Xh Ym"
 */
export const formatSecondsToHoursMins = (secs = 0) => {
  const safeSecs = Math.max(0, Math.floor(Number(secs) || 0));
  const h = Math.floor(safeSecs / 3600);
  const m = Math.floor((safeSecs % 3600) / 60);
  return `${h}h ${m}m`;
};

/**
 * Formats seconds into digital timer display: "HH:MM:SS"
 */
export const formatSecondsToDigital = (secs = 0) => {
  const safeSecs = Math.max(0, Math.floor(Number(secs) || 0));
  const h = Math.floor(safeSecs / 3600);
  const m = Math.floor((safeSecs % 3600) / 60);
  const s = safeSecs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Canonical Non-Overlapping Punch Session Normalizer.
 * Sorts all sessions chronologically, merges overlapping/nested sessions,
 * and eliminates duplicate time counting.
 *
 * @param {Array} sessions - Raw punch sessions array
 * @returns {Array} Clean, strictly non-overlapping, chronologically ordered sessions
 */
export const normalizePunchSessions = (sessions = []) => {
  if (!Array.isArray(sessions) || sessions.length === 0) return [];
  const valid = sessions
    .filter(s => s && Number(s.inTimestamp || 0) > 0)
    .sort((a, b) => Number(a.inTimestamp) - Number(b.inTimestamp));
  if (valid.length === 0) return [];

  const merged = [];
  let current = { ...valid[0] };

  for (let i = 1; i < valid.length; i++) {
    const next = valid[i];
    const curIn = Number(current.inTimestamp);
    const curOut = Number(current.outTimestamp || curIn);
    const nextIn = Number(next.inTimestamp);
    const nextOut = Number(next.outTimestamp || nextIn);

    // Overlap or contiguous session within 60 seconds
    if (nextIn <= curOut + 60000) {
      current.outTimestamp = Math.max(curOut, nextOut);
      current.outTime = nextOut >= curOut ? next.outTime : current.outTime;
      const dur = Math.max(0, Math.floor((current.outTimestamp - curIn) / 1000));
      current.durationSeconds = dur;
      current.durationText = formatSecondsToHoursMins(dur);
    } else {
      const dur = Math.max(0, Math.floor((curOut - curIn) / 1000));
      current.durationSeconds = dur;
      current.durationText = formatSecondsToHoursMins(dur);
      merged.push(current);
      current = { ...next };
    }
  }

  const lastIn = Number(current.inTimestamp);
  const lastOut = Number(current.outTimestamp || lastIn);
  const dur = Math.max(0, Math.floor((lastOut - lastIn) / 1000));
  current.durationSeconds = dur;
  current.durationText = formatSecondsToHoursMins(dur);
  merged.push(current);

  return merged.map((s, idx) => ({ ...s, sessionNumber: idx + 1 }));
};

/**
 * Read timer storage safely with mirror fallback
 */
export const readTimerStorage = (user, subKey, fallback = null) => {
  if (typeof localStorage === 'undefined') return fallback;
  const keys = getTimerMirrorKeys(user);
  for (const k of keys) {
    const val = localStorage.getItem(`ems_timer_${k}_${subKey}`);
    if (val !== null && val !== undefined) return val;
  }
  return fallback;
};

/**
 * Write timer storage value across all mirror keys of an employee
 */
export const writeTimerStorage = (user, subKey, value) => {
  if (typeof localStorage === 'undefined') return;
  const keys = getTimerMirrorKeys(user);
  const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
  for (const k of keys) {
    localStorage.setItem(`ems_timer_${k}_${subKey}`, valStr);
  }
};

/**
 * Remove timer storage key across all mirror keys of an employee
 */
export const removeTimerStorage = (user, subKey) => {
  if (typeof localStorage === 'undefined') return;
  const keys = getTimerMirrorKeys(user);
  for (const k of keys) {
    localStorage.removeItem(`ems_timer_${k}_${subKey}`);
  }
};

import { API_BASE } from '../config/apiConfig';
import { hrService } from '../../modules/hr/services/hrService';
import { workService } from '../../modules/work/services/workService';

/**
 * Single Source of Truth: Calculate shift work seconds for an employee on a given date.
 * Strictly guarantees:
 * - If never clocked in today: returns 0.
 * - If not clocked in and has clocked out: returns verified frozen punch session work_seconds. Zero live ticking.
 * - If on break: returns frozen work_seconds. Zero work ticking.
 * - If clocked in: returns pastSessionsSecs + currentSessionNet. Live ticking.
 * - Work seconds can NEVER exceed physical wall-clock elapsed time since midnight today.
 */
export const calculateShiftWorkSeconds = (userOrEmp, dateStr, nowMs = Date.now(), options = {}) => {
  if (!userOrEmp || typeof localStorage === 'undefined') return 0;
  const today = dateStr || new Date().toISOString().split('T')[0];

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const todayMidnightMs = todayMidnight.getTime();
  const maxPossibleGrossToday = Math.max(0, Math.floor((nowMs - todayMidnightMs) / 1000));

  const storedSessionDate = readTimerStorage(userOrEmp, 'work_session_date');
  const isTodaySession = storedSessionDate === today;

  const storedClockedIn = isTodaySession && (readTimerStorage(userOrEmp, 'is_clocked_in') === 'true' || readTimerStorage(userOrEmp, 'is_clocked_in') === true);
  const storedOnBreak = options.isOnBreak !== undefined ? Boolean(options.isOnBreak) : (isTodaySession && (readTimerStorage(userOrEmp, 'is_on_break') === 'true' || readTimerStorage(userOrEmp, 'is_on_break') === true));
  const storedWorkSecs = isTodaySession ? (Number(readTimerStorage(userOrEmp, 'work_seconds')) || 0) : 0;
  const storedBreakSecs = isTodaySession ? (Number(readTimerStorage(userOrEmp, 'break_seconds')) || 0) : 0;
  const storedHadClockOut = isTodaySession && (
    readTimerStorage(userOrEmp, 'had_clocked_out') === 'true' ||
    readTimerStorage(userOrEmp, 'is_clocked_in') === 'false' ||
    Boolean(readTimerStorage(userOrEmp, 'clock_out')) ||
    Boolean(readTimerStorage(userOrEmp, 'clockout_time'))
  );

  let attRec = options.attRec || null;
  if (!attRec) {
    try {
      const rawAtt = localStorage.getItem('hrms_attendance');
      if (rawAtt) {
        const attList = JSON.parse(rawAtt) || [];
        const keys = getTimerMirrorKeys(userOrEmp).map(k => String(k).toLowerCase());
        const uName = (userOrEmp.name || userOrEmp.employeeName || '').toLowerCase().trim();
        attRec = attList.find(a =>
          a.date === today && (
            (a.employeeId && keys.includes(String(a.employeeId).toLowerCase())) ||
            (a.employee && keys.includes(String(a.employee._id || a.employee).toLowerCase())) ||
            (a.employeeCode && keys.includes(String(a.employeeCode).toLowerCase())) ||
            (uName && a.employeeName && a.employeeName.toLowerCase().trim() === uName)
          )
        ) || null;
      }
    } catch (_) {}
  }

  const hasAttClockIn = Boolean(attRec && attRec.date === today && (attRec.clockInTime || attRec.clockIn));
  const hasAttClockOut = Boolean(attRec && attRec.date === today && (attRec.clockOutTime || attRec.clockOut));
  const hasAnyClockInToday = hasAttClockIn || (isTodaySession && Boolean(readTimerStorage(userOrEmp, 'login_time') || Number(readTimerStorage(userOrEmp, 'clock_in_timestamp')) > 0));

  // Derive first clock in timestamp of today to strictly bound physical elapsed work time
  let firstClockInTs = Number(readTimerStorage(userOrEmp, 'clock_in_timestamp')) || Number(attRec?.clockInTimestamp);
  if (!firstClockInTs || firstClockInTs < todayMidnightMs) {
    const loginStr = readTimerStorage(userOrEmp, 'login_time') || attRec?.clockInTime || attRec?.clockIn;
    if (loginStr && loginStr !== '--' && loginStr !== 'Active') {
      firstClockInTs = todayMidnightMs + parseTimeToSeconds(loginStr) * 1000;
    }
  }

  // The true physical upper bound is time elapsed since FIRST clock in today (e.g. 1h 50m since 10:04 AM)
  const maxPhysicalElapsedToday = (firstClockInTs && firstClockInTs >= todayMidnightMs)
    ? Math.max(0, Math.floor((nowMs - firstClockInTs) / 1000))
    : maxPossibleGrossToday;

  // Punch sessions strictly for TODAY (filter out any dirty sessions from prior dates)
  let rawSessions = [];
  try {
    const raw = readTimerStorage(userOrEmp, 'punch_sessions');
    if (raw) rawSessions = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (_) {}
  if ((!rawSessions || rawSessions.length === 0) && Array.isArray(attRec?.punchSessions)) {
    rawSessions = attRec.punchSessions;
  }
  const validTodaySessions = normalizePunchSessions((rawSessions || []).filter(s => {
    const ts = Number(s.inTimestamp || 0);
    if (ts > 0) return ts >= todayMidnightMs;
    return false;
  }));
  const pastSessionsSecs = validTodaySessions.reduce((acc, s) => acc + (Number(s.durationSeconds) || 0), 0);

  // If user NEVER clocked in today, their work time is STRICTLY 0!
  if (!hasAnyClockInToday && !storedClockedIn && pastSessionsSecs === 0) {
    return 0;
  }

  // Strict Clock-Out resolution:
  const isExplicitlyClockedOut = Boolean(
    options.isClockedOut === true ||
    (options.isClockedIn === false && options.isClockedOut !== false) ||
    storedHadClockOut ||
    hasAttClockOut ||
    (hasAttClockIn && attRec?.isClockedIn === false)
  );

  // Strict Clock-In resolution:
  const isEffectivelyClockedIn = (options.isClockedIn !== false) && !isExplicitlyClockedOut && (
    options.isClockedIn === true ||
    (storedClockedIn && !hasAttClockOut) ||
    (hasAttClockIn && !hasAttClockOut && attRec?.isClockedIn === true && attRec?.status !== 'absent')
  );

  const isEffectivelyClockedOut = isExplicitlyClockedOut || (
    !isEffectivelyClockedIn && (hasAnyClockInToday || pastSessionsSecs > 0)
  );

  if (isEffectivelyClockedIn) {
    if (storedOnBreak) {
      const frozenSecs = pastSessionsSecs > 0 ? pastSessionsSecs : (storedWorkSecs || Number(attRec?.workSeconds) || 0);
      return Math.min(frozenSecs, maxPhysicalElapsedToday);
    }

    const lastSessionOut = validTodaySessions.length > 0
      ? Math.max(...validTodaySessions.map(s => Number(s.outTimestamp || s.inTimestamp || 0)))
      : 0;

    let sessStartTs = Number(readTimerStorage(userOrEmp, 'current_session_start_timestamp'));
    if (!sessStartTs || sessStartTs < todayMidnightMs) {
      if (lastSessionOut > 0) {
        sessStartTs = lastSessionOut;
      } else {
        sessStartTs = firstClockInTs || nowMs;
      }
    }
    if (lastSessionOut > 0 && sessStartTs < lastSessionOut) {
      sessStartTs = lastSessionOut;
    }
    sessStartTs = Math.max(sessStartTs, todayMidnightMs);

    const rawSessionGross = Math.max(0, Math.floor((nowMs - sessStartTs) / 1000));
    const curSessionGross = Math.min(maxPhysicalElapsedToday, rawSessionGross);
    const sessionBreakBaseline = Number(readTimerStorage(userOrEmp, 'session_break_baseline')) || 0;
    const curSessionBreaks = Math.max(0, storedBreakSecs - sessionBreakBaseline);
    const liveSecs = pastSessionsSecs + Math.max(0, curSessionGross - curSessionBreaks);

    // FLICKER FIX: Never bounce with stale storedWorkSecs. Use monotonic physical liveSecs.
    return Math.min(liveSecs, maxPhysicalElapsedToday);
  } else if (isEffectivelyClockedOut) {
    // CLOCKED OUT: Strictly return verified frozen seconds. NEVER calculate live elapsed time!
    let finalSecs = pastSessionsSecs > 0 ? pastSessionsSecs : (storedWorkSecs || Number(attRec?.workSeconds) || 0);
    if (!finalSecs && attRec?.totalWorkingHours) {
      finalSecs = Math.round(Number(attRec.totalWorkingHours) * 3600);
    }
    return Math.min(finalSecs, maxPhysicalElapsedToday);
  }

  return 0;
};

/**
 * Single Source of Truth: Calculate task today seconds for any task on a given date.
 * Strictly guarantees:
 * - Past tasks not worked or completed today return strictly 0 today seconds (prevents leaking into Day Logs).
 * - Identical values across Dashboard, Active Timer, Weekly Logs, and Tasks Page.
 */
export const getTaskTodaySeconds = (task, dateStr, nowMs = Date.now(), isEffectiveClockedIn = true, isEffectiveOnBreak = false) => {
  if (!task) return 0;
  const today = dateStr || new Date().toISOString().split('T')[0];

  let baseSecs = 0;
  if (task.dailySessions && typeof task.dailySessions === 'object' && task.dailySessions[today] !== undefined) {
    baseSecs = Number(task.dailySessions[today]) || 0;
  } else if (task.sessionDate === today && task.todayWorkSeconds !== undefined) {
    baseSecs = Number(task.todayWorkSeconds) || 0;
  } else if (task.sessionDate === today) {
    baseSecs = Number(task.accumulatedSeconds ?? task.timerSeconds ?? 0);
  } else if (task.completedOn === today || (task.completedAt && String(task.completedAt).startsWith(today))) {
    baseSecs = Number(task.accumulatedSeconds ?? task.timerSeconds ?? 0);
  } else {
    // STRICT: Past tasks not worked today have 0 seconds for today!
    baseSecs = 0;
  }

  let liveSecs = 0;
  if (task.timerRunning && isEffectiveClockedIn && !isEffectiveOnBreak) {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMidnightMs = todayMidnight.getTime();
    const startTs = task.startedAt ? Number(task.startedAt) : nowMs;
    const safeStart = Math.max(startTs, todayMidnightMs);
    liveSecs = Math.max(0, Math.floor((nowMs - safeStart) / 1000));
  }

  return Math.min(baseSecs + liveSecs, 14 * 3600);
};

/**
 * Atomic Lockstep Sync: Prepares a paused task object with 100% synchronized duration fields.
 * Prevents time jumping backwards on resume.
 */
export const syncTaskPauseState = (task, { nowMs = Date.now(), todayStr, wasPausedForClockOut = false, wasPausedForBreak = false } = {}) => {
  if (!task) return null;
  const today = todayStr || new Date().toISOString().split('T')[0];

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const todayMidnightMs = todayMidnight.getTime();

  let sessionElapsed = 0;
  if (task.timerRunning && task.startedAt) {
    const safeStart = Math.max(Number(task.startedAt), todayMidnightMs);
    sessionElapsed = Math.max(0, Math.floor((nowMs - safeStart) / 1000));
  }

  const baseAccum = Number(task.accumulatedSeconds ?? task.timerSeconds ?? 0);
  const totalSecs = baseAccum + sessionElapsed;

  const dailySessionsMap = (task.dailySessions && typeof task.dailySessions === 'object') ? { ...task.dailySessions } : {};
  let priorTodaySecs = Number(dailySessionsMap[today]) || (task.sessionDate === today ? Number(task.todayWorkSeconds || 0) : 0);
  if (priorTodaySecs === 0 && (task.sessionDate === today || !task.sessionDate)) {
    priorTodaySecs = baseAccum;
  }
  const totalTodaySecs = priorTodaySecs + sessionElapsed;
  dailySessionsMap[today] = totalTodaySecs;

  return {
    ...task,
    timerRunning: false,
    startedAt: null,
    accumulatedSeconds: totalSecs,
    timerSeconds: totalSecs,
    todayWorkSeconds: totalTodaySecs,
    dailySessions: dailySessionsMap,
    sessionDate: today,
    wasPausedForClockOut: Boolean(wasPausedForClockOut),
    wasPausedForBreak: Boolean(wasPausedForBreak),
    liveDurationText: formatSecondsToDigital(totalSecs),
    hoursLoggedText: formatSecondsToHoursMins(totalSecs)
  };
};

/**
 * Universal Shift Clock-Out Engine.
 * Shared by Shift Card, Logout, Switch User, and Admin Force Clock Out.
 * Strictly guarantees zero ghost ticking, accurate punch sessions, and complete task pause.
 */
export const performShiftClockOut = (user, { reason = 'Clock Out', nowTs = Date.now(), nowStr } = {}) => {
  if (!user || typeof localStorage === 'undefined') return;

  const today = new Date().toISOString().split('T')[0];
  const timeStr = nowStr || new Date(nowTs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const mirrorKeys = getTimerMirrorKeys(user);

  // 1. Calculate final verified shift duration & record punch session
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const maxPossibleGrossToday = Math.max(0, Math.floor((nowTs - todayMidnight.getTime()) / 1000));

  let existingSessions = [];
  try {
    const rawSessions = readTimerStorage(user, 'punch_sessions');
    if (rawSessions) existingSessions = typeof rawSessions === 'string' ? JSON.parse(rawSessions) : rawSessions;
  } catch (_) {}
  const todayMidnightMs = todayMidnight.getTime();
  existingSessions = normalizePunchSessions((existingSessions || []).filter(s => Number(s.inTimestamp || 0) >= todayMidnightMs));

  const lastSessionOut = existingSessions.length > 0
    ? Math.max(...existingSessions.map(s => Number(s.outTimestamp || s.inTimestamp || 0)))
    : 0;

  const storedWorkSecs = Number(readTimerStorage(user, 'work_seconds')) || 0;
  let sessStartTs = Number(readTimerStorage(user, 'current_session_start_timestamp'));
  if (!sessStartTs || sessStartTs < todayMidnight.getTime()) {
    if (lastSessionOut > 0) {
      sessStartTs = lastSessionOut;
    } else {
      sessStartTs = Number(readTimerStorage(user, 'clock_in_timestamp')) || nowTs;
    }
  }
  // CANONICAL BOUND: sessStartTs can NEVER precede lastSessionOut (prevents overlapping sessions)
  if (lastSessionOut > 0 && sessStartTs < lastSessionOut) {
    sessStartTs = lastSessionOut;
  }
  sessStartTs = Math.max(sessStartTs, todayMidnight.getTime());

  const sessInStr = readTimerStorage(user, 'current_session_in') || readTimerStorage(user, 'login_time') || timeStr;

  const grossSessionSecs = Math.max(0, Math.floor((nowTs - sessStartTs) / 1000));
  const currentBreakSecs = Number(readTimerStorage(user, 'break_seconds')) || 0;
  const sessionBreakBaseline = Number(readTimerStorage(user, 'session_break_baseline')) || 0;
  const sessionBreaks = Math.max(0, currentBreakSecs - sessionBreakBaseline);
  const curSessionDuration = Math.min(maxPossibleGrossToday, Math.max(0, grossSessionSecs - sessionBreaks));

  let updatedSessions = [...(existingSessions || [])];
  if (curSessionDuration > 0 && sessStartTs < nowTs) {
    const newSession = {
      id: `sess_${Date.now()}`,
      sessionNumber: updatedSessions.length + 1,
      inTime: sessInStr,
      outTime: timeStr,
      inTimestamp: sessStartTs,
      outTimestamp: nowTs,
      durationSeconds: curSessionDuration,
      durationText: formatSecondsToHoursMins(curSessionDuration)
    };
    updatedSessions = normalizePunchSessions([...updatedSessions, newSession]);
  }

  const finalVerifiedWorkSecs = Math.min(maxPossibleGrossToday, updatedSessions.reduce((acc, s) => acc + (Number(s.durationSeconds) || 0), 0));

  // 2. Persist shift timer keys across all mirror keys
  for (const uk of mirrorKeys) {
    localStorage.setItem(`ems_timer_${uk}_clockout_time`, timeStr);
    localStorage.setItem(`ems_timer_${uk}_clock_out`, timeStr);
    localStorage.setItem(`ems_timer_${uk}_clock_out_timestamp`, nowTs.toString());
    localStorage.setItem(`ems_timer_${uk}_had_clocked_out`, 'true');
    localStorage.setItem(`ems_timer_${uk}_work_session_date`, today);
    localStorage.setItem(`ems_timer_${uk}_saved_official_seconds`, finalVerifiedWorkSecs.toString());
    localStorage.setItem(`ems_timer_${uk}_work_seconds`, finalVerifiedWorkSecs.toString());
    localStorage.setItem(`ems_timer_${uk}_is_clocked_in`, 'false');
    localStorage.setItem(`ems_timer_${uk}_is_running`, 'false');
    localStorage.setItem(`ems_timer_${uk}_is_on_break`, 'false');
    localStorage.removeItem(`ems_timer_${uk}_break_start_time`);
    localStorage.removeItem(`ems_timer_${uk}_break_start_timestamp`);
    localStorage.setItem(`ems_timer_${uk}_current_break_seconds`, '0');
    localStorage.setItem(`ems_timer_${uk}_punch_sessions`, JSON.stringify(updatedSessions));
    localStorage.removeItem(`ems_timer_${uk}_current_session_start_timestamp`);
    localStorage.removeItem(`ems_timer_${uk}_current_session_in`);
  }

  // 3. Atomically update attendance record in localStorage & sync with backend
  try {
    const rawAtt = localStorage.getItem('hrms_attendance');
    if (rawAtt) {
      const attList = JSON.parse(rawAtt) || [];
      const keys = mirrorKeys.map(k => String(k).toLowerCase());
      const uName = (user.name || user.employeeName || '').toLowerCase().trim();
      let attChanged = false;
      let matchedRecord = null;

      const updatedAtt = attList.map(a => {
        const matchesUser = a.date === today && (
          (a.employeeId && keys.includes(String(a.employeeId).toLowerCase())) ||
          (a.employee && keys.includes(String(a.employee._id || a.employee).toLowerCase())) ||
          (a.employeeCode && keys.includes(String(a.employeeCode).toLowerCase())) ||
          (uName && a.employeeName && a.employeeName.toLowerCase().trim() === uName)
        );

        if (matchesUser) {
          attChanged = true;
          const updated = {
            ...a,
            clockOutTime: timeStr,
            clockOut: timeStr,
            clockOutTimestamp: nowTs,
            isClockedIn: false,
            isOnBreak: false,
            workSeconds: finalVerifiedWorkSecs,
            totalWorkingHours: +(finalVerifiedWorkSecs / 3600).toFixed(2),
            punchSessions: updatedSessions
          };
          matchedRecord = updated;
          return updated;
        }
        return a;
      });

      if (attChanged) {
        localStorage.setItem('hrms_attendance', JSON.stringify(updatedAtt));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'hrms_attendance' } }));
      }

      if (matchedRecord) {
        try {
          hrService.markAttendance({
            ...matchedRecord,
            employee: matchedRecord.employee || matchedRecord.employeeId || mirrorKeys[0],
            employeeId: matchedRecord.employeeId || matchedRecord.employee || mirrorKeys[0],
            status: matchedRecord.status || 'present'
          }).catch(() => {});
        } catch (_) {}
      }
    }
  } catch (_) {}

  // 4. Auto-pause running task timers for this user
  try {
    const activeTimerKeys = mirrorKeys.map(k => `ems_active_task_timer_${k}`).concat(['ems_active_task_timer']);
    let pausedActiveTimer = null;

    for (const tk of activeTimerKeys) {
      const raw = localStorage.getItem(tk);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.timerRunning) {
          const paused = syncTaskPauseState(parsed, { nowMs: nowTs, todayStr: today, wasPausedForClockOut: true });
          if (paused) {
            localStorage.setItem(tk, JSON.stringify(paused));
            pausedActiveTimer = paused;
          }
        }
      }
    }

    // Update ems_tasks collection
    const rawTasks = localStorage.getItem('ems_tasks');
    if (rawTasks) {
      const taskList = JSON.parse(rawTasks) || [];
      const userIdentifiers = mirrorKeys.map(k => String(k).toLowerCase());
      let taskChanged = false;
      const tasksToUpdateBackend = [];

      const updatedTasks = taskList.map(t => {
        const isAssigned = (t.assignedToId && userIdentifiers.includes(String(t.assignedToId).toLowerCase())) ||
          (t.assignedTo && userIdentifiers.includes(String(t.assignedTo._id || t.assignedTo).toLowerCase())) ||
          (t.assignedToCode && userIdentifiers.includes(String(t.assignedToCode).toLowerCase())) ||
          (Array.isArray(t.assignedToIds) && t.assignedToIds.some(id => userIdentifiers.includes(String(id).toLowerCase()))) ||
          (pausedActiveTimer?.taskId && String(t._id || t.id) === String(pausedActiveTimer.taskId));

        if (isAssigned && t.timerRunning) {
          taskChanged = true;
          const pausedT = syncTaskPauseState(t, { nowMs: nowTs, todayStr: today, wasPausedForClockOut: true });
          tasksToUpdateBackend.push(pausedT);
          return pausedT;
        }
        return t;
      });

      if (taskChanged) {
        localStorage.setItem('ems_tasks', JSON.stringify(updatedTasks));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_tasks' } }));

        // Async update tasks in MongoDB backend so remote clients see timerRunning: false
        tasksToUpdateBackend.forEach(pt => {
          if (pt && (pt._id || pt.id)) {
            workService.updateTask(pt._id || pt.id, {
              timerRunning: false,
              startedAt: null,
              accumulatedSeconds: pt.accumulatedSeconds,
              timerSeconds: pt.timerSeconds,
              todayWorkSeconds: pt.todayWorkSeconds,
              dailySessions: pt.dailySessions,
              sessionDate: pt.sessionDate,
              wasPausedForClockOut: true
            }).catch(() => {});
          }
        });
      }

      // Also ensure pausedActiveTimer taskId is synced to backend
      if (pausedActiveTimer && pausedActiveTimer.taskId) {
        const alreadyUpdated = tasksToUpdateBackend.some(pt => String(pt._id || pt.id) === String(pausedActiveTimer.taskId));
        if (!alreadyUpdated) {
          workService.updateTask(pausedActiveTimer.taskId, {
            timerRunning: false,
            startedAt: null,
            accumulatedSeconds: pausedActiveTimer.accumulatedSeconds,
            timerSeconds: pausedActiveTimer.timerSeconds,
            todayWorkSeconds: pausedActiveTimer.todayWorkSeconds,
            dailySessions: pausedActiveTimer.dailySessions,
            sessionDate: pausedActiveTimer.sessionDate,
            wasPausedForClockOut: true
          }).catch(() => {});
        }
      }
    }
  } catch (_) {}

  // 5. Dispatch sync events
  window.dispatchEvent(new CustomEvent('ems_clocked_out', {
    detail: {
      userKey: mirrorKeys[0],
      employeeId: user._id,
      employeeCode: user.employeeCode,
      logoutTime: timeStr,
      date: today,
      reason
    }
  }));
  window.dispatchEvent(new CustomEvent('ems_task_timer_paused', {
    detail: { userKey: mirrorKeys[0] }
  }));
  window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));
};


