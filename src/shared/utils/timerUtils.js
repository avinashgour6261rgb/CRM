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

const SESSION_SCOPED_KEYS = new Set([
  'had_clocked_out',
  'is_clocked_in',
  'is_running',
  'is_on_break',
  'break_type',
  'work_seconds',
  'break_seconds',
  'current_break_seconds',
  'first_clock_in_of_day',
  'login_time',
  'clock_out',
  'clockout_time',
  'clock_in_timestamp',
  'clock_out_timestamp',
  'current_session_start_timestamp',
  'current_session_in',
  'punch_sessions',
  'session_break_baseline'
]);

/**
 * Read timer storage safely with mirror fallback and strict session date validation
 */
export const readTimerStorage = (user, subKey, fallback = null) => {
  if (typeof localStorage === 'undefined') return fallback;
  const today = getLocalDateString();
  const isSessionScoped = SESSION_SCOPED_KEYS.has(subKey);
  const keys = getTimerMirrorKeys(user);
  for (const k of keys) {
    if (isSessionScoped) {
      const sDate = localStorage.getItem(`ems_timer_${k}_work_session_date`);
      if (sDate && sDate !== today) {
        continue; // Stale session from a prior date! Ignore stale data
      }
    }
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

import { API_BASE } from '../config/apiConfig.js';
import { hrService } from '../../modules/hr/services/hrService.js';
import { workService } from '../../modules/work/services/workService.js';
import { broadcastSyncEvent, SYNC_EVENTS } from '../services/realtimeSyncService.js';

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
  const today = dateStr || getLocalDateString(new Date(nowMs));

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const todayMidnightMs = todayMidnight.getTime();
  const maxPossibleGrossToday = Math.max(0, Math.floor((nowMs - todayMidnightMs) / 1000));

  // Multi-User Live Telemetry Support (cross-browser / incognito realtime sync)
  if (options.telemetry) {
    const telem = options.telemetry;
    if (telem.isClockedIn) {
      if (telem.isOnBreak) {
        return Number(telem.workSeconds) || 0;
      }
      // Smoothly tick forward using local client receivedAt timestamp (eliminates server-vs-client clock-skew flicker!)
      const refTs = Number(telem.receivedAt) || Number(telem.lastHeartbeatAt) || Number(telem.timestamp) || nowMs;
      const elapsedSinceHeartbeat = Math.max(0, Math.floor((nowMs - refTs) / 1000));
      return Math.min(maxPossibleGrossToday, (Number(telem.workSeconds) || 0) + elapsedSinceHeartbeat);
    } else if (telem.clockOutTime) {
      return Number(telem.workSeconds) || 0;
    } else {
      // Telemetry exists and employee has neither clocked in nor clocked out today on server
      return 0;
    }
  }

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
    } catch (_) { }
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
  } catch (_) { }
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
      const frozenSecs = (storedWorkSecs > 0)
        ? storedWorkSecs
        : (pastSessionsSecs > 0 ? pastSessionsSecs : (Number(attRec?.workSeconds) || 0));
      return Math.min(frozenSecs, maxPhysicalElapsedToday);
    }

    const lastSessionOut = validTodaySessions.length > 0
      ? Math.max(...validTodaySessions.map(s => Number(s.outTimestamp || s.inTimestamp || 0)))
      : 0;

    let sessStartTs = Number(readTimerStorage(userOrEmp, 'current_session_start_timestamp')) ||
                      Number(attRec?.currentSessionStartTimestamp) ||
                      Number(options.telemetry?.currentSessionStartTimestamp);

    if (!sessStartTs || sessStartTs < todayMidnightMs) {
      if (validTodaySessions.length > 0) {
        // User had prior completed session(s) today. Current session started when they re-clocked in!
        // NEVER fall back to lastSessionOut or firstClockInTs because that would count the clocked-out gap as work!
        const reclockTimeStr = readTimerStorage(userOrEmp, 'current_session_in') || attRec?.currentSessionIn;
        if (reclockTimeStr) {
          sessStartTs = todayMidnightMs + parseTimeToSeconds(reclockTimeStr) * 1000;
        } else if (attRec?.updatedAt) {
          sessStartTs = new Date(attRec.updatedAt).getTime();
        } else {
          sessStartTs = nowMs;
        }
      } else {
        sessStartTs = firstClockInTs || nowMs;
      }
    }

    // Strict guard: sessStartTs cannot be before lastSessionOut if previous completed sessions exist
    if (lastSessionOut > 0 && sessStartTs < lastSessionOut) {
      sessStartTs = nowMs;
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
    let finalSecs = (storedWorkSecs > 0)
      ? storedWorkSecs
      : (pastSessionsSecs > 0 ? pastSessionsSecs : (Number(attRec?.workSeconds) || 0));
    if (!finalSecs && attRec?.totalWorkingHours) {
      finalSecs = Math.round(Number(attRec.totalWorkingHours) * 3600);
    }
    return Math.min(finalSecs, maxPhysicalElapsedToday);
  }

  return 0;
};

/**
 * Automatic Real-Time Overtime Engine (No Permission / Request Required).
 * Standard Shift Window: 10:00 AM - 07:00 PM (9h window including breaks).
 * Any active working time BEFORE 10:00 AM OR AFTER 07:00 PM automatically counts as Overtime!
 */
export const calculateAutoOvertimeSeconds = ({
  punchSessions = [],
  currentSessionStartMs = 0,
  isClockedIn = false,
  isOnBreak = false,
  breakHistory = [],
  breakStartMs = 0,
  clockInTimestamp = 0,
  clockOutTimestamp = 0,
  clockInTime = null,
  clockOutTime = null,
  nowMs = Date.now(),
  shiftStartTime = '10:00 AM',
  shiftEndTime = '07:00 PM'
} = {}) => {
  try {
    const dayMidnight = new Date(nowMs);
    dayMidnight.setHours(0, 0, 0, 0);
    const dayMidnightMs = dayMidnight.getTime();

    const startSecsFromMidnight = parseTimeToSeconds(shiftStartTime) || (10 * 3600);
    const endSecsFromMidnight = parseTimeToSeconds(shiftEndTime) || (19 * 3600);
    const shiftStartMs = dayMidnightMs + startSecsFromMidnight * 1000;
    const shiftEndMs = dayMidnightMs + endSecsFromMidnight * 1000;

    const overlapOutsideWindow = (sMs, eMs) => {
      if (!sMs || !eMs || eMs <= sMs) return 0;
      const clampedStart = Math.max(dayMidnightMs, sMs);
      const clampedEnd = Math.min(nowMs, eMs);
      if (clampedEnd <= clampedStart) return 0;
      const beforeShift = Math.max(0, Math.min(clampedEnd, shiftStartMs) - clampedStart);
      const afterShift = Math.max(0, clampedEnd - Math.max(clampedStart, shiftEndMs));
      return (beforeShift + afterShift) / 1000;
    };

    const intervals = [];
    if (Array.isArray(punchSessions) && punchSessions.length > 0) {
      punchSessions.forEach(s => {
        const sIn = Number(s?.inTimestamp || 0);
        const sOut = Number(s?.outTimestamp || 0);
        if (sIn >= dayMidnightMs && sOut > sIn) {
          intervals.push([sIn, sOut]);
        }
      });
    }

    if (isClockedIn) {
      let activeStart = Number(currentSessionStartMs || 0);
      if (!activeStart || activeStart < dayMidnightMs) {
        activeStart = Number(clockInTimestamp || 0);
      }
      if ((!activeStart || activeStart < dayMidnightMs) && clockInTime && clockInTime !== '--' && clockInTime !== 'Active') {
        activeStart = dayMidnightMs + parseTimeToSeconds(clockInTime) * 1000;
      }
      const activeEnd = (isOnBreak && breakStartMs && Number(breakStartMs) >= activeStart)
        ? Number(breakStartMs)
        : nowMs;
      if (activeStart >= dayMidnightMs && activeEnd > activeStart) {
        intervals.push([activeStart, activeEnd]);
      }
    } else if (intervals.length === 0) {
      let fIn = Number(clockInTimestamp || 0);
      if ((!fIn || fIn < dayMidnightMs) && clockInTime && clockInTime !== '--' && clockInTime !== 'Active') {
        fIn = dayMidnightMs + parseTimeToSeconds(clockInTime) * 1000;
      }
      let fOut = Number(clockOutTimestamp || 0);
      if ((!fOut || fOut < dayMidnightMs) && clockOutTime && clockOutTime !== '--') {
        fOut = dayMidnightMs + parseTimeToSeconds(clockOutTime) * 1000;
      }
      if (fIn >= dayMidnightMs && fOut > fIn) {
        intervals.push([fIn, fOut]);
      }
    }

    if (intervals.length === 0) return 0;

    // Merge any overlapping work intervals so overtime is never double-counted
    intervals.sort((a, b) => a[0] - b[0]);
    const merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
      const prev = merged[merged.length - 1];
      if (intervals[i][0] <= prev[1]) {
        prev[1] = Math.max(prev[1], intervals[i][1]);
      } else {
        merged.push(intervals[i]);
      }
    }

    let grossOvertimeSecs = 0;
    for (const [s, e] of merged) {
      grossOvertimeSecs += overlapOutsideWindow(s, e);
    }

    // Subtract any breaks that occurred outside the 10:00 AM - 07:00 PM shift window
    let overtimeBreakSecs = 0;
    if (Array.isArray(breakHistory)) {
      breakHistory.forEach(b => {
        if (!b) return;
        let bStart = Number(b.startTimestamp || 0);
        let bEnd = Number(b.endTimestamp || 0);
        if (!bStart && b.startTime) bStart = dayMidnightMs + parseTimeToSeconds(b.startTime) * 1000;
        if (!bEnd && b.endTime) bEnd = dayMidnightMs + parseTimeToSeconds(b.endTime) * 1000;
        if (bStart >= dayMidnightMs && bEnd > bStart) {
          overtimeBreakSecs += overlapOutsideWindow(bStart, bEnd);
        }
      });
    }

    return Math.max(0, Math.floor(grossOvertimeSecs - overtimeBreakSecs));
  } catch {
    return 0;
  }
};

/**
 * Canonical format for local calendar date YYYY-MM-DD.
 * Strictly immune to UTC offset skew / midnight rollover bugs.
 */
export const getLocalDateString = (d = new Date()) => {
  const dateObj = d instanceof Date ? d : new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Single Source of Truth: Calculate task today seconds for any task on a given date.
 * Strictly guarantees:
 * - Past tasks not worked or completed today return strictly 0 today seconds (prevents leaking into Day Logs).
 * - Identical values across Dashboard, Active Timer, Weekly Logs, and Tasks Page.
 */
export const getTaskTodaySeconds = (task, dateStr, nowMs = Date.now(), isEffectiveClockedIn = true, isEffectiveOnBreak = false) => {
  if (!task) return 0;
  const actualToday = getLocalDateString(new Date(nowMs));
  const targetDate = dateStr || actualToday;
  const isTargetToday = targetDate === actualToday;
  const isRunningToday = Boolean(task.timerRunning && isTargetToday && isEffectiveClockedIn && !isEffectiveOnBreak);

  // If liveTodaySeconds was already computed by WorkContext ticking loop for today, return directly
  if (isRunningToday && task.liveTodaySeconds !== undefined && task.liveTodaySeconds !== null) {
    return Math.max(0, Number(task.liveTodaySeconds) || 0);
  }

  // 1. Base seconds worked on targetDate from closed / paused sessions
  let baseSecs = 0;
  if (task.dailySessions && typeof task.dailySessions === 'object' && task.dailySessions[targetDate] !== undefined) {
    baseSecs = Math.max(0, Number(task.dailySessions[targetDate]) || 0);
  } else if (isTargetToday && task.sessionDate === targetDate && task.accumulatedTodaySeconds !== undefined && task.accumulatedTodaySeconds !== null) {
    baseSecs = Math.max(0, Number(task.accumulatedTodaySeconds) || 0);
  } else if (isTargetToday && task.sessionDate === targetDate && task.todayWorkSeconds !== undefined && task.todayWorkSeconds !== null) {
    baseSecs = Math.max(0, Number(task.todayWorkSeconds) || 0);
  } else if (task.completedOn === targetDate && (task.startDate === targetDate || task.createdAt?.startsWith(targetDate)) && !task.sessionDate && (!task.dailySessions || Object.keys(task.dailySessions).length === 0)) {
    // Single-day task created and completed exclusively on targetDate with no prior sessions
    baseSecs = Math.max(0, Number(task.accumulatedSeconds ?? task.timerSeconds ?? 0));
  } else {
    // STRICT: Past tasks not worked today have 0 seconds for today!
    baseSecs = 0;
  }

  // 2. Live ticking elapsed timer: ONLY counts if task is actively running on actualToday
  let liveSecs = 0;
  if (isRunningToday) {
    const todayMidnight = new Date(nowMs);
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMidnightMs = todayMidnight.getTime();
    const startTs = task.startedAt ? Number(task.startedAt) : 0;
    // CRITICAL: If startTs was before midnight or invalid, it was started on a past day or uninitialized!
    // It must NOT tick live today as runaway ghost time!
    if (startTs >= todayMidnightMs && startTs <= nowMs) {
      liveSecs = Math.max(0, Math.floor((nowMs - startTs) / 1000));
    }
  }

  return baseSecs + liveSecs;
};

/**
 * Auto-healer: Sanitizes and repairs a task's dailySessions map to prevent multi-day leakage.
 * If prior bugs caused total accumulated seconds to be copied into dailySessions[today],
 * this repairs it so dailySessions strictly sum up to task.accumulatedSeconds without overflow.
 */
export const sanitizeTaskDailySessions = (task) => {
  if (!task) return task;
  // CRITICAL: While a task timer is actively running, NEVER fold live `todayWorkSeconds`
  // or live `timerSeconds` back into frozen baselines (`accumulatedSeconds`, `accumulatedTodaySeconds`,
  // `dailySessions[today]`), otherwise elapsed time gets double-counted every tick (2x+ speed)!
  if (task.timerRunning) {
    return task;
  }

  const rawSessions = (task.dailySessions && typeof task.dailySessions === 'object') ? { ...task.dailySessions } : null;
  if (!rawSessions || Object.keys(rawSessions).length === 0) {
    return task;
  }

  const today = getLocalDateString(new Date());
  const sessionDates = Object.keys(rawSessions);
  const sumSessions = sessionDates.reduce((acc, d) => acc + (Number(rawSessions[d]) || 0), 0);
  const totalAccum = Math.max(Number(task.accumulatedSeconds ?? task.timerSeconds ?? 0), sumSessions);
  const cleanSessions = { ...rawSessions };

  const isStartedOnPastDay = task.startDate && task.startDate < today;
  let todaySessionSecs = 0;
  if (task.sessionDate === today) {
    const rawToday = Math.max(
      Number(task.todayWorkSeconds) || 0,
      Number(task.accumulatedTodaySeconds) || 0,
      Number(rawSessions[today]) || 0
    );
    if (isStartedOnPastDay && !task.timerRunning && rawToday >= totalAccum && totalAccum > 0) {
      // Stale copy of total accumulated duration into today: heal by partitioning to past date
      todaySessionSecs = 0;
      if (!cleanSessions[task.startDate]) {
        cleanSessions[task.startDate] = totalAccum;
      }
    } else {
      todaySessionSecs = rawToday;
    }
  } else {
    todaySessionSecs = Number(rawSessions[today]) || 0;
  }

  cleanSessions[today] = todaySessionSecs;

  return {
    ...task,
    accumulatedSeconds: totalAccum,
    timerSeconds: Math.max(Number(task.timerSeconds) || 0, totalAccum),
    todayWorkSeconds: todaySessionSecs,
    accumulatedTodaySeconds: todaySessionSecs,
    dailySessions: cleanSessions
  };
};

/**
 * Atomic Lockstep Sync: Prepares a paused task object with 100% synchronized duration fields.
 * Prevents time jumping backwards on resume.
 */
export const syncTaskPauseState = (task, { nowMs = Date.now(), todayStr, wasPausedForClockOut = false, wasPausedForBreak = false } = {}) => {
  if (!task) return null;
  const today = todayStr || getLocalDateString(new Date(nowMs));

  const todayMidnight = new Date(nowMs);
  todayMidnight.setHours(0, 0, 0, 0);
  const todayMidnightMs = todayMidnight.getTime();

  let sessionElapsed = 0;
  if (task.timerRunning && task.startedAt) {
    const startTs = Number(task.startedAt);
    if (startTs >= todayMidnightMs && startTs <= nowMs) {
      sessionElapsed = Math.max(0, Math.floor((nowMs - startTs) / 1000));
    }
  }

  const baseAccum = (task.accumulatedSeconds !== undefined && task.accumulatedSeconds !== null)
    ? Number(task.accumulatedSeconds)
    : Math.max(0, (Number(task.timerSeconds) || 0) - sessionElapsed);
  const totalSecs = baseAccum + sessionElapsed;

  const dailySessionsMap = (task.dailySessions && typeof task.dailySessions === 'object') ? { ...task.dailySessions } : {};
  let priorTodaySecs = 0;
  if (dailySessionsMap[today] !== undefined) {
    priorTodaySecs = Number(dailySessionsMap[today]) || 0;
  } else if (task.sessionDate === today && task.accumulatedTodaySeconds !== undefined && task.accumulatedTodaySeconds !== null) {
    priorTodaySecs = Number(task.accumulatedTodaySeconds) || 0;
  } else if (task.sessionDate === today && task.todayWorkSeconds !== undefined) {
    priorTodaySecs = task.timerRunning
      ? Math.max(0, (Number(task.todayWorkSeconds) || 0) - sessionElapsed)
      : (Number(task.todayWorkSeconds) || 0);
  }
  // STRICT: Do NOT copy baseAccum into priorTodaySecs! If priorTodaySecs was 0, it means 0 prior seconds for today.
  const totalTodaySecs = priorTodaySecs + sessionElapsed;
  dailySessionsMap[today] = totalTodaySecs;

  return {
    ...task,
    timerRunning: false,
    startedAt: null,
    accumulatedSeconds: totalSecs,
    accumulatedTodaySeconds: totalTodaySecs,
    timerSeconds: totalSecs,
    todayWorkSeconds: totalTodaySecs,
    liveTodaySeconds: totalTodaySecs,
    dailySessions: dailySessionsMap,
    sessionDate: today,
    wasPausedForClockOut: Boolean(wasPausedForClockOut),
    wasPausedForBreak: Boolean(wasPausedForBreak),
    liveDurationText: formatSecondsToDigital(totalTodaySecs),
    hoursLogged: +(totalSecs / 3600).toFixed(2),
    hoursLoggedText: formatSecondsToDigital(totalSecs)
  };
};

/**
 * Universal Shift Clock-Out Engine.
 * Shared by Shift Card, Logout, Switch User, and Admin Force Clock Out.
 * Strictly guarantees zero ghost ticking, accurate punch sessions, and complete task pause.
 */
export const performShiftClockOut = (user, { reason = 'Clock Out', nowTs = Date.now(), nowStr } = {}) => {
  if (!user || typeof localStorage === 'undefined') return;

  const today = getLocalDateString(new Date(nowTs));
  const timeStr = nowStr || new Date(nowTs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const mirrorKeys = getTimerMirrorKeys(user);

  // GUARD: Never fabricate a ghost clock-in/clock-out record if this user is NOT actually clocked in today!
  const storedSessionDate = readTimerStorage(user, 'work_session_date');
  const isStoredClockedIn = storedSessionDate === today && (
    readTimerStorage(user, 'is_clocked_in') === 'true' ||
    readTimerStorage(user, 'is_clocked_in') === true
  );
  let isAttClockedIn = false;
  try {
    const rawAttCheck = localStorage.getItem('hrms_attendance');
    if (rawAttCheck) {
      const attListCheck = JSON.parse(rawAttCheck) || [];
      const keysLower = mirrorKeys.map(k => String(k).toLowerCase());
      const attCheck = attListCheck.find(a => a.date === today && (
        (a.employeeId && keysLower.includes(String(a.employeeId).toLowerCase())) ||
        (a.employee && keysLower.includes(String(a.employee._id || a.employee).toLowerCase())) ||
        (a.employeeCode && keysLower.includes(String(a.employeeCode).toLowerCase()))
      ));
      isAttClockedIn = Boolean(attCheck && attCheck.isClockedIn === true && !attCheck.clockOutTime && (attCheck.clockInTime || attCheck.clockIn));
    }
  } catch (_) {}

  if (!isStoredClockedIn && !isAttClockedIn) {
    return;
  }

  // 1. Calculate final verified shift duration & record punch session
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const maxPossibleGrossToday = Math.max(0, Math.floor((nowTs - todayMidnight.getTime()) / 1000));

  let existingSessions = [];
  try {
    const rawSessions = readTimerStorage(user, 'punch_sessions');
    if (rawSessions) existingSessions = typeof rawSessions === 'string' ? JSON.parse(rawSessions) : rawSessions;
  } catch (_) { }
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

  const sumSessionsSecs = updatedSessions.reduce((acc, s) => acc + (Number(s.durationSeconds) || 0), 0);
  const finalVerifiedWorkSecs = Math.min(
    maxPossibleGrossToday,
    Math.max(storedWorkSecs, sumSessionsSecs)
  );

  // Monotonic Invariant: If stored work seconds had accumulated higher than sessions,
  // reconcile the last session so punchSessions strictly matches work_seconds without dropping time!
  if (finalVerifiedWorkSecs > sumSessionsSecs) {
    const diff = finalVerifiedWorkSecs - sumSessionsSecs;
    if (updatedSessions.length > 0) {
      const last = { ...updatedSessions[updatedSessions.length - 1] };
      last.durationSeconds = (Number(last.durationSeconds) || 0) + diff;
      last.durationText = formatSecondsToHoursMins(last.durationSeconds);
      last.outTimestamp = nowTs;
      last.outTime = timeStr;
      updatedSessions[updatedSessions.length - 1] = last;
    } else {
      updatedSessions.push({
        id: `sess_${Date.now()}`,
        sessionNumber: 1,
        inTime: sessInStr,
        outTime: timeStr,
        inTimestamp: Math.max(todayMidnight.getTime(), nowTs - finalVerifiedWorkSecs * 1000),
        outTimestamp: nowTs,
        durationSeconds: finalVerifiedWorkSecs,
        durationText: formatSecondsToHoursMins(finalVerifiedWorkSecs)
      });
    }
  }

  // 2. Persist shift timer keys across all mirror keys
  const origLoginTime = readTimerStorage(user, 'first_clock_in_of_day') || readTimerStorage(user, 'login_time') || timeStr;
  for (const uk of mirrorKeys) {
    localStorage.setItem(`ems_timer_${uk}_first_clock_in_of_day`, origLoginTime);
    localStorage.setItem(`ems_timer_${uk}_login_time`, origLoginTime);
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
          // Standard shift: 10:00 AM - 07:00 PM (9 hours). Work beyond 9h is Overtime (OT)
          const standardShiftSecs = 9 * 3600;
          const overtimeSecs = Math.max(0, finalVerifiedWorkSecs - standardShiftSecs);
          const overtimeHrs = +(overtimeSecs / 3600).toFixed(2);

          const updated = {
            ...a,
            // Preserve immutable First Clock-In of the day
            clockInTime: a.clockInTime || a.clockIn || readTimerStorage(user, 'login_time') || timeStr,
            clockIn: a.clockInTime || a.clockIn || readTimerStorage(user, 'login_time') || timeStr,
            // Progressive Last Clock-Out of the day
            clockOutTime: timeStr,
            clockOut: timeStr,
            clockOutTimestamp: nowTs,
            isClockedIn: false,
            isOnBreak: false,
            workSeconds: finalVerifiedWorkSecs,
            totalWorkingHours: +(finalVerifiedWorkSecs / 3600).toFixed(2),
            overtimeSeconds: overtimeSecs,
            overtimeHours: overtimeHrs,
            hasOvertime: overtimeSecs > 0,
            punchSessions: updatedSessions
          };
          matchedRecord = updated;
          return updated;
        }
        return a;
      });

      if (!attChanged) {
        // Fallback: Create today's attendance record with First In and Last Out
        const firstClockIn = readTimerStorage(user, 'login_time') || timeStr;
        const standardShiftSecs = 9 * 3600;
        const overtimeSecs = Math.max(0, finalVerifiedWorkSecs - standardShiftSecs);
        const overtimeHrs = +(overtimeSecs / 3600).toFixed(2);

        const newRecord = {
          _id: `att_${user._id || mirrorKeys[0]}_${Date.now()}`,
          employeeId: user._id || mirrorKeys[0],
          employeeCode: user.employeeCode || mirrorKeys[0],
          employeeName: user.name || 'Team Member',
          date: today,
          status: 'present',
          clockInTime: firstClockIn,
          clockIn: firstClockIn,
          clockOutTime: timeStr,
          clockOut: timeStr,
          clockOutTimestamp: nowTs,
          isClockedIn: false,
          isOnBreak: false,
          workSeconds: finalVerifiedWorkSecs,
          totalWorkingHours: +(finalVerifiedWorkSecs / 3600).toFixed(2),
          overtimeSeconds: overtimeSecs,
          overtimeHours: overtimeHrs,
          hasOvertime: overtimeSecs > 0,
          punchSessions: updatedSessions
        };
        updatedAtt.push(newRecord);
        matchedRecord = newRecord;
        attChanged = true;
      }

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
          }).catch(() => { });

          hrService.sendHeartbeat({
            employeeId: matchedRecord.employeeId || matchedRecord.employee || mirrorKeys[0],
            employeeCode: matchedRecord.employeeCode || user.employeeCode,
            employeeName: matchedRecord.employeeName || user.name,
            isClockedIn: false,
            clockOutTime: timeStr,
            clockOutTimestamp: nowTs,
            workSeconds: finalVerifiedWorkSecs,
            activeTask: null
          }).catch(() => { });
        } catch (_) { }
      }
    }
  } catch (_) { }

  // 4. Auto-pause running task timers for this user
  try {
    const activeTimerKeys = mirrorKeys.map(k => `ems_active_task_timer_${k}`);
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
            }).catch(() => { });
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
          }).catch(() => { });
        }
      }
    }
  } catch (_) { }

  // 5. Dispatch sync events
  const clockOutPayload = {
    userKey: mirrorKeys[0],
    employeeId: user._id,
    employeeCode: user.employeeCode,
    logoutTime: timeStr,
    clockOutTime: timeStr,
    workSeconds: finalVerifiedWorkSecs,
    date: today,
    reason
  };

  window.dispatchEvent(new CustomEvent('ems_clocked_out', { detail: clockOutPayload }));
  window.dispatchEvent(new CustomEvent('ems_task_timer_paused', { detail: { userKey: mirrorKeys[0] } }));
  window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_auth_session' } }));

  try {
    broadcastSyncEvent(SYNC_EVENTS.SHIFT_CLOCKED_OUT, clockOutPayload);
  } catch (_) { }
};

/**
 * Canonical check whether a task is assigned to a specific user.
 * Supports single assignedTo, multi-assignees (assignedToIds, assignees, assignedMembers),
 * and exact name/ID matches.
 */
export const isTaskAssignedToUser = (task, user) => {
  if (!task || !user) return false;
  const userIds = [
    user._id,
    user.id,
    user.employeeCode,
    user.email,
    user.username
  ].filter(Boolean).map(s => String(s).toLowerCase().trim());

  const directAssignedTo = (task.assignedTo && typeof task.assignedTo === 'object')
    ? String(task.assignedTo._id || task.assignedTo.id || '')
    : String(task.assignedTo || '');

  const taskAssigneeIds = [
    task.assignedToId,
    directAssignedTo,
    task.assignedToCode,
    task.assignedToEmail
  ].filter(Boolean).map(s => String(s).toLowerCase().trim());

  if (userIds.some(uid => taskAssigneeIds.includes(uid))) return true;

  // Check multiple assignees arrays
  if (Array.isArray(task.assignedToIds) && task.assignedToIds.some(id => userIds.includes(String(id).toLowerCase().trim()))) {
    return true;
  }
  if (Array.isArray(task.assignees) && task.assignees.some(a => {
    if (!a) return false;
    const aIds = [a._id, a.id, a.employeeCode, a.email].filter(Boolean).map(s => String(s).toLowerCase().trim());
    if (userIds.some(uid => aIds.includes(uid))) return true;
    if (user.name && a.name && a.name.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
    return false;
  })) {
    return true;
  }
  if (Array.isArray(task.assignedMembers) && task.assignedMembers.some(m => {
    if (!m) return false;
    const mIds = [m._id, m.id, m.employeeCode, m.email].filter(Boolean).map(s => String(s).toLowerCase().trim());
    if (userIds.some(uid => mIds.includes(uid))) return true;
    if (user.name && m.name && m.name.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
    return false;
  })) {
    return true;
  }

  // Exact full name match (strictly avoid substring splits that cross-match different employees)
  const userName = (user.name || '').trim().toLowerCase();
  const taskAssigneeName = (task.assignedToName || '').trim().toLowerCase();
  if (userName && taskAssigneeName && userName === taskAssigneeName) {
    return true;
  }
  return false;
};

/**
 * Canonical Single Source of Truth (SSOT) Task Time Engine.
 * Accurately calculates a user's daily task duration and breaks down the tasks worked on a target date.
 * Guarantees:
 * 1. Zero cross-user pollution (Employee tasks never leak into Admin's time or Day Log).
 * 2. Strict daily session partitioning (Multi-day lifetime seconds are never attributed to a single day).
 * 3. Physical shift clamping (Task time cannot exceed physical shift time clocked in today).
 * 4. Deduplicated timesheets so multiple saves don't inflate hours.
 */
export const getUserDailyTaskBreakdown = (targetUser, targetDate, options = {}) => {
  if (!targetUser) {
    return {
      totalTaskSeconds: 0,
      totalTaskDurationText: '00:00:00',
      rawTaskSeconds: 0,
      rawTaskDurationText: '00:00:00',
      tasksWorked: [],
      dedupedTimesheets: []
    };
  }

  const {
    tasks: customTasks,
    timesheets: customTimesheets,
    activeTimer: customActiveTimer,
    isClockedIn = true,
    isOnBreak = false,
    shiftSeconds = 0,
    clampToShift = true
  } = options;

  const actualToday = getLocalDateString(new Date());
  const effectiveDate = targetDate || actualToday;
  const isToday = effectiveDate === actualToday;

  const uId = targetUser._id ? String(targetUser._id).toLowerCase().trim() : '';
  const uCode = targetUser.employeeCode ? String(targetUser.employeeCode).toLowerCase().trim() : '';
  const uName = targetUser.name ? targetUser.name.toLowerCase().trim() : '';

  // Safe fetch of tasks and timesheets
  let allTasks = customTasks;
  if (!allTasks || allTasks.length === 0) {
    try {
      const raw = localStorage.getItem('ems_tasks');
      if (raw) allTasks = JSON.parse(raw);
    } catch (_) {}
  }
  allTasks = allTasks || [];

  let allTimesheets = customTimesheets;
  if (!allTimesheets || allTimesheets.length === 0) {
    try {
      const raw = localStorage.getItem('ems_timesheets');
      if (raw) allTimesheets = JSON.parse(raw);
    } catch (_) {}
  }
  allTimesheets = allTimesheets || [];

  // 1. Gather all timesheets for targetDate that strictly belong to targetUser
  const rawDayTimesheets = allTimesheets.filter(ts => {
    if (!ts) return false;
    const tsDate = ts.date || (ts.createdAt ? ts.createdAt.split('T')[0] : '');
    if (tsDate !== effectiveDate) return false;

    const tsId = ts.employeeId ? String(ts.employeeId).toLowerCase().trim() : (ts.employee ? String(ts.employee._id || ts.employee).toLowerCase().trim() : '');
    const tsCode = ts.employeeCode ? String(ts.employeeCode).toLowerCase().trim() : '';
    const tsName = ts.employeeName ? ts.employeeName.toLowerCase().trim() : '';

    // Disallow mismatched employee names
    if (tsName && uName && tsName !== uName) {
      return false;
    }

    const empMatches = Boolean(
      (uId && (tsId === uId || String(ts.employee) === uId)) ||
      (uCode && (tsId === uCode || tsCode === uCode)) ||
      (uName && tsName && tsName === uName)
    );
    if (!empMatches) return false;

    // Cross-verification: If timesheet references a task in the tasks list,
    // verify it is actually assigned to targetUser!
    // If it belongs to someone else (e.g. TSK-8 belongs to Sandeep), REJECT IT!
    if (ts.taskId || ts.taskCode) {
      const refTask = allTasks.find(t =>
        (ts.taskId && String(t._id || t.id) === String(ts.taskId)) ||
        (ts.taskCode && t.taskCode && String(t.taskCode).trim().toLowerCase() === String(ts.taskCode).trim().toLowerCase())
      );
      if (refTask) {
        if (!isTaskAssignedToUser(refTask, targetUser)) {
          return false;
        }
      }
    }
    return true;
  });

  // 2. Deduplicate timesheets by task key to prevent duplicate rows inflating duration
  const dayTsMap = new Map();
  rawDayTimesheets.forEach(ts => {
    let taskKey = null;
    if (ts.taskCode && String(ts.taskCode).trim()) {
      taskKey = `code_${String(ts.taskCode).trim().toLowerCase()}`;
    } else if (ts.taskId && String(ts.taskId).trim()) {
      taskKey = `id_${String(ts.taskId).trim().toLowerCase()}`;
    } else if (ts.taskTitle && String(ts.taskTitle).trim()) {
      taskKey = `title_${String(ts.taskTitle).trim().toLowerCase()}`;
    } else {
      taskKey = `raw_${ts._id || Math.random()}`;
    }
    const dur = Number(ts.totalDurationSeconds) || 0;
    if (!dayTsMap.has(taskKey) || dur > (Number(dayTsMap.get(taskKey).totalDurationSeconds) || 0)) {
      dayTsMap.set(taskKey, ts);
    }
  });

  // Construct tasksWorked entries from deduped timesheets
  let tasksWorked = Array.from(dayTsMap.values()).map(ts => ({
    taskId: ts.taskId || ts._id,
    taskCode: ts.taskCode || 'TSK',
    taskTitle: ts.taskTitle || 'Assigned Work',
    projectName: ts.projectName || 'General Work',
    durationText: ts.totalDurationText || formatSecondsToDigital(Number(ts.totalDurationSeconds) || 0),
    durationSeconds: Number(ts.totalDurationSeconds) || 0,
    status: 'completed',
    isCompleted: true,
    timerRunning: false,
    memo: ts.notes || ts.memo || 'Completed Task Timesheet'
  }));

  // 3. For today: merge live ticking or paused tasks worked today that haven't been submitted to timesheets yet
  if (isToday) {
    const empTasks = allTasks.filter(t => isTaskAssignedToUser(t, targetUser));
    const empUserKey = targetUser.employeeCode || targetUser._id;
    let empActiveTimer = customActiveTimer;
    if (!empActiveTimer) {
      try {
        empActiveTimer = JSON.parse(
          localStorage.getItem(`ems_active_task_timer_${empUserKey}`) ||
          localStorage.getItem(`ems_active_task_timer_${targetUser._id}`) || 'null'
        );
      } catch (_) {}
    }

    let runningTaskId = null;
    if (empActiveTimer && empActiveTimer.timerRunning && (empActiveTimer.date === actualToday || !empActiveTimer.date) && isClockedIn && !isOnBreak) {
      runningTaskId = String(empActiveTimer.taskId || empActiveTimer._id);
      const targetTaskObj = empTasks.find(t => String(t._id || t.id) === runningTaskId);
      const liveSecs = targetTaskObj
        ? getTaskTodaySeconds(targetTaskObj, actualToday, Date.now(), isClockedIn, isOnBreak)
        : getTaskTodaySeconds(empActiveTimer, actualToday, Date.now(), isClockedIn, isOnBreak);

      // Remove any completed row for the running task to avoid double-counting
      tasksWorked = tasksWorked.filter(t => String(t.taskId) !== runningTaskId && t.taskCode !== empActiveTimer.taskCode);
      tasksWorked.unshift({
        taskId: runningTaskId,
        taskCode: targetTaskObj?.taskCode || empActiveTimer.taskCode || 'TSK',
        taskTitle: targetTaskObj?.title || empActiveTimer.title || 'Current Task',
        projectName: targetTaskObj?.projectName || empActiveTimer.projectName || 'General Work',
        durationText: formatSecondsToDigital(liveSecs),
        durationSeconds: liveSecs,
        status: 'in_progress',
        isCompleted: false,
        timerRunning: true,
        memo: 'Active Timer Running Now 🟢'
      });
    }

    // Also include paused tasks worked today that have sessions but no timesheet yet
    empTasks.forEach(pt => {
      const ptId = String(pt._id || pt.id);
      if (runningTaskId && ptId === runningTaskId) return;

      const alreadyInTasksWorked = tasksWorked.some(t =>
        String(t.taskId) === ptId ||
        (pt.taskCode && t.taskCode && String(pt.taskCode).trim().toLowerCase() === String(t.taskCode).trim().toLowerCase())
      );
      if (alreadyInTasksWorked) return;

      const hasSessionToday = (pt.dailySessions && Number(pt.dailySessions[actualToday]) > 0) ||
        (pt.sessionDate === actualToday && Number(pt.todayWorkSeconds) > 0);
      const isRunningToday = pt.timerRunning && isClockedIn;
      if (!hasSessionToday && !isRunningToday) return;

      const todaySecs = getTaskTodaySeconds(pt, actualToday, Date.now(), isClockedIn, isOnBreak);
      if (todaySecs > 0) {
        const isDone = pt.status === 'completed' || !!pt.completedAt;
        tasksWorked.push({
          taskId: ptId,
          taskCode: pt.taskCode || 'TSK',
          taskTitle: pt.title,
          projectName: pt.projectName || 'General Work',
          durationText: formatSecondsToDigital(todaySecs),
          durationSeconds: todaySecs,
          status: isDone ? 'completed' : (pt.timerRunning ? 'in_progress' : 'on_hold'),
          isCompleted: isDone,
          timerRunning: Boolean(pt.timerRunning && isClockedIn),
          memo: isDone ? 'Completed Today' : `Work session (${formatSecondsToDigital(todaySecs)} logged)`
        });
      }
    });
  }

  const rawTotalSecs = tasksWorked.reduce((sum, t) => sum + (Number(t.durationSeconds) || 0), 0);

  // 4. Physical shift clamping:
  // If shiftSeconds > 0 and clampToShift is true, task time cannot exceed physical shift time.
  let effectiveTotalSecs = rawTotalSecs;
  if (clampToShift && shiftSeconds > 0) {
    effectiveTotalSecs = Math.min(rawTotalSecs, shiftSeconds);
  } else if (clampToShift && !isClockedIn && shiftSeconds === 0 && tasksWorked.length === 0) {
    effectiveTotalSecs = 0;
  }

  return {
    totalTaskSeconds: effectiveTotalSecs,
    totalTaskDurationText: formatSecondsToDigital(effectiveTotalSecs),
    rawTaskSeconds: rawTotalSecs,
    rawTaskDurationText: formatSecondsToDigital(rawTotalSecs),
    tasksWorked,
    dedupedTimesheets: Array.from(dayTsMap.values())
  };
};

/**
 * Universal one-liner helper for components that just need the user's total daily task seconds.
 */
export const calculateUserDailyTaskSeconds = (targetUser, targetDate, options = {}) => {
  const result = getUserDailyTaskBreakdown(targetUser, targetDate, options);
  return result.totalTaskSeconds;
};



