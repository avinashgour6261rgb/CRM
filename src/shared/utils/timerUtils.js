/**
 * @file timerUtils.js
 * @description Canonical key resolution, multi-key mirroring, and formatting helpers
 * for Shift Clock, Active Task Timer, and Attendance State.
 */

export {
  getLocalDateString,
  getIstTimeString,
  getTodayStr,
  parseTimeToSeconds,
  formatSecondsToHoursMins,
  formatSecondsToDigital
} from './dateUtils';

import {
  getLocalDateString,
  getIstTimeString,
  getTodayStr,
  parseTimeToSeconds,
  formatSecondsToHoursMins,
  formatSecondsToDigital
} from './dateUtils';

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

  // Multi-User Live Telemetry Support (cross-browser / incognito realtime sync with Wall-Clock SSOT)
  if (options.telemetry) {
    const telem = options.telemetry;
    if (telem.isClockedIn) {
      if (telem.isOnBreak) {
        return Number(telem.workSeconds) || 0;
      }
      // Smoothly tick forward using local client receivedAt timestamp AND wall-clock session start (eliminates drift & flicker!)
      const refTs = Number(telem.receivedAt) || Number(telem.lastHeartbeatAt) || Number(telem.timestamp) || nowMs;
      const elapsedSinceHeartbeat = Math.max(0, Math.floor((nowMs - refTs) / 1000));
      const heartbeatSecs = (Number(telem.workSeconds) || 0) + elapsedSinceHeartbeat;

      const sessStart = Number(telem.currentSessionStartTimestamp || telem.clockInTimestamp || options.attRec?.currentSessionStartTimestamp || options.attRec?.clockInTimestamp || 0);
      const breakSecs = Number(telem.breakSeconds ?? options.attRec?.breakSeconds ?? 0) || 0;
      const punchSessions = Array.isArray(telem.punchSessions) && telem.punchSessions.length > 0
        ? telem.punchSessions
        : (Array.isArray(options.attRec?.punchSessions) ? options.attRec.punchSessions : []);
      const pastSessionsSecs = punchSessions
        .filter(s => Number(s?.inTimestamp || 0) >= todayMidnightMs)
        .reduce((sum, s) => sum + (Number(s?.durationSeconds) || 0), 0);

      let wallClockSecs = 0;
      if (sessStart >= todayMidnightMs && sessStart <= nowMs) {
        wallClockSecs = pastSessionsSecs + Math.max(0, Math.floor((nowMs - sessStart) / 1000) - breakSecs);
      }

      // Derive earliest clock-in timestamp today so upper bound never clamps below initial clock-in
      const candidateTelemIn = [];
      if (punchSessions.length > 0 && Number(punchSessions[0]?.inTimestamp) >= todayMidnightMs) {
        candidateTelemIn.push(Number(punchSessions[0].inTimestamp));
      }
      const telemInStr = telem.clockInTime || options.attRec?.clockInTime || options.attRec?.clockIn;
      if (telemInStr && telemInStr !== '--' && telemInStr !== '—' && telemInStr !== 'Active') {
        const s = parseTimeToSeconds(telemInStr);
        if (s > 0) candidateTelemIn.push(todayMidnightMs + s * 1000);
      }
      const tClockInTs = Number(telem.clockInTimestamp || options.attRec?.clockInTimestamp || 0);
      if (tClockInTs >= todayMidnightMs && tClockInTs <= nowMs) {
        candidateTelemIn.push(tClockInTs);
      }
      const inTs = candidateTelemIn.length > 0 ? Math.min(...candidateTelemIn) : 0;
      const upperBound = (inTs >= todayMidnightMs && inTs <= nowMs)
        ? Math.max(0, Math.floor((nowMs - inTs) / 1000))
        : maxPossibleGrossToday;

      // Active task worked today is an absolute floor: Shift work can NEVER be less than actual task work performed today!
      const activeTaskSecs = Number(telem.activeTask?.accumulatedTodaySeconds ?? telem.activeTask?.todayWorkSeconds ?? telem.activeTask?.liveTaskSecs ?? 0);
      const baseLive = Math.max(heartbeatSecs, wallClockSecs, activeTaskSecs);
      const safeUpperBound = Math.max(upperBound, activeTaskSecs);
      return Math.min(safeUpperBound, baseLive);
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

  // Derive TRUE earliest clock in timestamp of today across all canonical sources
  const candidateInTs = [];
  if (validTodaySessions.length > 0 && Number(validTodaySessions[0]?.inTimestamp) >= todayMidnightMs) {
    candidateInTs.push(Number(validTodaySessions[0].inTimestamp));
  }
  const firstInStr = readTimerStorage(userOrEmp, 'first_clock_in_of_day');
  if (firstInStr && firstInStr !== '--' && firstInStr !== '—' && firstInStr !== 'Active') {
    const s = parseTimeToSeconds(firstInStr);
    if (s > 0) candidateInTs.push(todayMidnightMs + s * 1000);
  }
  const loginStr = readTimerStorage(userOrEmp, 'login_time') || attRec?.clockInTime || attRec?.clockIn;
  if (loginStr && loginStr !== '--' && loginStr !== '—' && loginStr !== 'Active') {
    const s = parseTimeToSeconds(loginStr);
    if (s > 0) candidateInTs.push(todayMidnightMs + s * 1000);
  }
  const attInTs = Number(attRec?.clockInTimestamp);
  if (attInTs >= todayMidnightMs && attInTs <= nowMs) {
    candidateInTs.push(attInTs);
  }
  const storedClockInTs = Number(readTimerStorage(userOrEmp, 'clock_in_timestamp'));
  if (storedClockInTs >= todayMidnightMs && storedClockInTs <= nowMs) {
    candidateInTs.push(storedClockInTs);
  }
  const firstClockInTs = candidateInTs.length > 0 ? Math.min(...candidateInTs) : 0;

  // The true physical upper bound is time elapsed since FIRST clock in today (e.g. 1h 50m since 10:04 AM)
  const maxPhysicalElapsedToday = (firstClockInTs && firstClockInTs >= todayMidnightMs)
    ? Math.max(0, Math.floor((nowMs - firstClockInTs) / 1000))
    : maxPossibleGrossToday;

  // Read actual tasks worked today for this employee so Shift Time is strictly >= Task Time
  let todayTaskSecs = 0;
  try {
    const rawTimesheets = localStorage.getItem('ems_timesheets');
    if (rawTimesheets) {
      const tsList = JSON.parse(rawTimesheets) || [];
      const keys = getTimerMirrorKeys(userOrEmp).map(k => String(k).toLowerCase());
      const uName = (userOrEmp.name || userOrEmp.employeeName || '').toLowerCase().trim();
      const userTodayTs = tsList.filter(t => t.date === today && (
        keys.includes(String(t.employeeId || '').toLowerCase()) ||
        keys.includes(String(t.employeeCode || '').toLowerCase()) ||
        (uName && t.employeeName && t.employeeName.toLowerCase().trim() === uName)
      ));
      const taskMap = new Map();
      userTodayTs.forEach(t => {
        const k = String(t.taskId || t.taskCode || t._id);
        const sec = Number(t.durationSeconds || (Number(t.hours || 0) * 3600)) || 0;
        if (!taskMap.has(k) || sec > taskMap.get(k)) taskMap.set(k, sec);
      });
      todayTaskSecs = Array.from(taskMap.values()).reduce((sum, s) => sum + s, 0);
    }
  } catch (_) {}

  try {
    const cKey = getCanonicalTimerKey(userOrEmp);
    const rawTimer = readTimerStorage(userOrEmp, 'active_task_timer') || (cKey ? localStorage.getItem(`ems_active_task_timer_${cKey}`) : null);
    if (rawTimer) {
      const p = typeof rawTimer === 'string' ? JSON.parse(rawTimer) : rawTimer;
      if (p && p.timerRunning && p.startedAt && Number(p.startedAt) >= todayMidnightMs) {
        const taskElapsed = Math.max(0, Math.floor((nowMs - Number(p.startedAt)) / 1000));
        const taskBase = Number(p.accumulatedTodaySeconds ?? p.todayWorkSeconds ?? 0);
        todayTaskSecs = Math.max(todayTaskSecs, taskBase + taskElapsed);
      } else if (p && !p.timerRunning) {
        const taskBase = Number(p.accumulatedTodaySeconds ?? p.todayWorkSeconds ?? 0);
        todayTaskSecs = Math.max(todayTaskSecs, taskBase);
      }
    }
  } catch (_) {}

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
    const baseLiveSecs = pastSessionsSecs + Math.max(0, curSessionGross - curSessionBreaks);
    // Absolute floor: shift work seconds can NEVER be less than actual task work performed today!
    const liveSecs = Math.max(baseLiveSecs, todayTaskSecs);
    const effectiveMaxPhysical = Math.max(maxPhysicalElapsedToday, todayTaskSecs);

    // FLICKER FIX: Never bounce with stale storedWorkSecs. Use monotonic physical liveSecs.
    return Math.min(liveSecs, effectiveMaxPhysical);
  } else if (isEffectivelyClockedOut) {
    // CLOCKED OUT: Strictly return verified frozen seconds. NEVER calculate live elapsed time!
    let finalSecs = (storedWorkSecs > 0)
      ? storedWorkSecs
      : (pastSessionsSecs > 0 ? pastSessionsSecs : (Number(attRec?.workSeconds) || 0));
    if (!finalSecs && attRec?.totalWorkingHours) {
      finalSecs = Math.round(Number(attRec.totalWorkingHours) * 3600);
    }
    finalSecs = Math.max(finalSecs, todayTaskSecs);
    const effectiveMaxPhysical = Math.max(maxPhysicalElapsedToday, todayTaskSecs);
    return Math.min(finalSecs, effectiveMaxPhysical);
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
  shiftEndTime = '07:00 PM',
  minOvertimeMinutes = 0
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

    const rawOtSecs = Math.max(0, Math.floor(grossOvertimeSecs - overtimeBreakSecs));
    const minOtSecs = Math.max(0, Number(minOvertimeMinutes) || 0) * 60;
    return rawOtSecs >= minOtSecs ? rawOtSecs : 0;
  } catch {
    return 0;
  }
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
  const hasDailySessions = task.dailySessions && typeof task.dailySessions === 'object' && Object.keys(task.dailySessions).length > 0;

  if (hasDailySessions && Number(task.dailySessions[targetDate]) > 0) {
    baseSecs = Math.max(0, Number(task.dailySessions[targetDate]) || 0);
  }
  if (isTargetToday && task.sessionDate === targetDate) {
    const todayCandidate = Math.max(
      Number(task.accumulatedTodaySeconds) || 0,
      Number(task.todayWorkSeconds) || 0
    );
    baseSecs = Math.max(baseSecs, todayCandidate);
  } else if (!hasDailySessions && task.completedOn === targetDate && (task.startDate === targetDate || task.createdAt?.startsWith(targetDate)) && !task.sessionDate) {
    // Single-day task created and completed exclusively on targetDate with no prior sessions
    baseSecs = Math.max(0, Number(task.accumulatedSeconds ?? task.timerSeconds ?? 0));
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

  let todaySessionSecs = 0;
  if (rawSessions[today] !== undefined && rawSessions[today] !== null) {
    // Authoritative dailySessions[today] exists
    todaySessionSecs = Math.max(0, Number(rawSessions[today]) || 0);
  } else if (task.sessionDate === today) {
    const rawToday = (task.todayWorkSeconds !== undefined && task.todayWorkSeconds !== null)
      ? Math.max(0, Number(task.todayWorkSeconds) || 0)
      : Math.max(0, Number(task.accumulatedTodaySeconds) || 0);
    todaySessionSecs = rawToday;
  } else {
    todaySessionSecs = 0;
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
export const syncTaskPauseState = (task, {
  nowMs = Date.now(),
  todayStr,
  wasPausedForClockOut = false,
  wasPausedForBreak = false,
  workerUser = null,
  knownElapsed = null
} = {}) => {
  if (!task) return null;
  const today = todayStr || getLocalDateString(new Date(nowMs));

  const todayMidnight = new Date(nowMs);
  todayMidnight.setHours(0, 0, 0, 0);
  const todayMidnightMs = todayMidnight.getTime();

  const workerTimer = workerUser ? getWorkerTaskTimer(task, workerUser) : null;
  const isRunning = Boolean(task.timerRunning || workerTimer?.timerRunning);

  let sessionElapsed = 0;
  if (knownElapsed !== null && knownElapsed !== undefined) {
    sessionElapsed = Math.max(0, Number(knownElapsed));
  } else if (isRunning) {
    const startTs = Number(workerTimer?.startedAt || task.startedAt || 0);
    if (startTs >= todayMidnightMs && startTs <= nowMs) {
      sessionElapsed = Math.max(0, Math.floor((nowMs - startTs) / 1000));
    }
  }

  const workerAccum = workerTimer ? Number(workerTimer.accumulatedSeconds || 0) : 0;
  const taskAccum = (task.accumulatedSeconds !== undefined && task.accumulatedSeconds !== null)
    ? Number(task.accumulatedSeconds)
    : Math.max(0, (Number(task.timerSeconds) || 0) - sessionElapsed);
  const baseAccum = Math.max(taskAccum, workerAccum);
  const totalSecs = baseAccum + sessionElapsed;

  const dailySessionsMap = (task.dailySessions && typeof task.dailySessions === 'object') ? { ...task.dailySessions } : {};
  let priorTodaySecs = 0;
  if (dailySessionsMap[today] !== undefined && dailySessionsMap[today] !== null) {
    priorTodaySecs = Number(dailySessionsMap[today]) || 0;
  } else if (task.sessionDate === today && task.accumulatedTodaySeconds !== undefined && task.accumulatedTodaySeconds !== null) {
    priorTodaySecs = Number(task.accumulatedTodaySeconds) || 0;
  } else if (task.sessionDate === today && task.todayWorkSeconds !== undefined && task.todayWorkSeconds !== null) {
    priorTodaySecs = task.timerRunning
      ? Math.max(0, (Number(task.todayWorkSeconds) || 0) - sessionElapsed)
      : (Number(task.todayWorkSeconds) || 0);
  }
  if (workerTimer && workerTimer.sessionDate === today) {
    const workerToday = Number(workerTimer.todayWorkSeconds || 0);
    priorTodaySecs = Math.max(priorTodaySecs, workerToday);
  }
  const totalTodaySecs = priorTodaySecs + sessionElapsed;
  dailySessionsMap[today] = totalTodaySecs;

  return {
    ...task,
    timerRunning: false,
    startedAt: null,
    activeWorkerId: null,
    activeWorkerName: null,
    activeWorkerAvatar: null,
    activeWorkerRole: null,
    activeUserId: null,
    activeUserName: null,
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
export const performShiftClockOut = (user, { reason = 'Clock Out', nowTs = Date.now(), nowStr, actor = '', actorCode = '', actorId = '' } = {}) => {
  if (!user || typeof localStorage === 'undefined') return;

  const today = getLocalDateString(new Date(nowTs));
  const timeStr = nowStr || getIstTimeString(new Date(nowTs));
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
          let companyCfg = {};
          try { companyCfg = JSON.parse(localStorage.getItem('EMS_COMPANY_SETTINGS') || '{}') || {}; } catch (_) {}
          const stdHours = companyCfg.standardWorkHours !== undefined ? Number(companyCfg.standardWorkHours) : 9;
          const halfDayHrs = companyCfg.halfDayThresholdHours !== undefined ? Number(companyCfg.halfDayThresholdHours) : 4.5;
          const minOtMins = companyCfg.minOvertimeMinutes !== undefined ? Number(companyCfg.minOvertimeMinutes) : 0;
          const standardShiftSecs = Math.round(stdHours * 3600);
          const rawOtSecs = Math.max(0, finalVerifiedWorkSecs - standardShiftSecs);
          const overtimeSecs = rawOtSecs >= (minOtMins * 60) ? rawOtSecs : 0;
          const overtimeHrs = +(overtimeSecs / 3600).toFixed(2);
          const finalWorkHrs = +(finalVerifiedWorkSecs / 3600).toFixed(2);
          let nextStatus = a.status || 'present';
          if (finalWorkHrs > 0 && finalWorkHrs < halfDayHrs && !['on_leave', 'holiday', 'day_off'].includes(nextStatus)) {
            nextStatus = 'half_day';
          }

          const updated = {
            ...a,
            status: nextStatus,
            // Preserve immutable First Clock-In of the day
            clockInTime: a.clockInTime || a.clockIn || readTimerStorage(user, 'login_time') || timeStr,
            clockIn: a.clockInTime || a.clockIn || readTimerStorage(user, 'login_time') || timeStr,
            // Progressive Last Clock-Out of the day
            clockOutTime: timeStr,
            clockOut: timeStr,
            clockOutTimestamp: nowTs,
            clockOutReason: reason || a.clockOutReason,
            clockOutBy: actor || a.clockOutBy || user.name,
            markedBy: actor || a.markedBy || user.name,
            lastActionBy: actor || a.lastActionBy,
            notes: reason ? (a.notes ? `${a.notes} | ${reason}` : reason) : a.notes,
            isClockedIn: false,
            isOnBreak: false,
            workSeconds: finalVerifiedWorkSecs,
            totalWorkingHours: finalWorkHrs,
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
        let companyCfg = {};
        try { companyCfg = JSON.parse(localStorage.getItem('EMS_COMPANY_SETTINGS') || '{}') || {}; } catch (_) {}
        const stdHours = companyCfg.standardWorkHours !== undefined ? Number(companyCfg.standardWorkHours) : 9;
        const halfDayHrs = companyCfg.halfDayThresholdHours !== undefined ? Number(companyCfg.halfDayThresholdHours) : 4.5;
        const minOtMins = companyCfg.minOvertimeMinutes !== undefined ? Number(companyCfg.minOvertimeMinutes) : 0;
        const firstClockIn = readTimerStorage(user, 'login_time') || timeStr;
        const standardShiftSecs = Math.round(stdHours * 3600);
        const rawOtSecs = Math.max(0, finalVerifiedWorkSecs - standardShiftSecs);
        const overtimeSecs = rawOtSecs >= (minOtMins * 60) ? rawOtSecs : 0;
        const overtimeHrs = +(overtimeSecs / 3600).toFixed(2);
        const finalWorkHrs = +(finalVerifiedWorkSecs / 3600).toFixed(2);
        const computedStatus = (finalWorkHrs > 0 && finalWorkHrs < halfDayHrs) ? 'half_day' : 'present';

        const newRecord = {
          _id: `att_${user._id || mirrorKeys[0]}_${Date.now()}`,
          employeeId: user._id || mirrorKeys[0],
          employeeCode: user.employeeCode || mirrorKeys[0],
          employeeName: user.name || 'Team Member',
          date: today,
          status: computedStatus,
          clockInTime: firstClockIn,
          clockIn: firstClockIn,
          clockOutTime: timeStr,
          clockOut: timeStr,
          clockOutTimestamp: nowTs,
          clockOutReason: reason,
          clockOutBy: actor || user.name,
          markedBy: actor || user.name,
          lastActionBy: actor,
          notes: reason,
          isClockedIn: false,
          isOnBreak: false,
          workSeconds: finalVerifiedWorkSecs,
          totalWorkingHours: finalWorkHrs,
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

        // If an administrator forced or triggered this clock-out, write a permanent regulatory audit log
        if (actor && actor !== user.name) {
          try {
            const auditLogs = JSON.parse(localStorage.getItem('ems_attendance_audit_logs') || '[]');
            const auditEntry = {
              _id: `audit_force_${Date.now()}`,
              employeeId: String(user._id || mirrorKeys[0] || ''),
              employeeName: user.name || 'Team Member',
              employeeCode: user.employeeCode || '',
              date: today,
              timestamp: new Date().toISOString(),
              timeFormatted: timeStr,
              type: 'admin_force_clock_out',
              action: 'Admin Force Clock-Out',
              actor: 'admin',
              actorId: String(actorId || actorCode || 'ADMIN'),
              actorCode: actorCode || '',
              actorName: actor,
              isAdminOverride: true,
              adminId: String(actorId || actorCode || 'ADMIN'),
              adminName: actor,
              auditNote: reason,
              details: `Administrator ${actor} forced shift clock-out. Reason: "${reason}"`
            };
            auditLogs.unshift(auditEntry);
            localStorage.setItem('ems_attendance_audit_logs', JSON.stringify(auditLogs));
            window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_attendance_audit_logs' } }));
          } catch (_) {}
        }
      }

      if (matchedRecord) {
        try {
          import('../../modules/hr/services/hrService.js').then(mod => {
            const hr = mod?.hrService;
            if (hr) {
              hr.markAttendance({
                ...matchedRecord,
                employee: matchedRecord.employee || matchedRecord.employeeId || mirrorKeys[0],
                employeeId: matchedRecord.employeeId || matchedRecord.employee || mirrorKeys[0],
                status: matchedRecord.status || 'present'
              }).catch(() => { });

              hr.sendHeartbeat({
                employeeId: matchedRecord.employeeId || matchedRecord.employee || mirrorKeys[0],
                employeeCode: matchedRecord.employeeCode || user.employeeCode,
                employeeName: matchedRecord.employeeName || user.name,
                isClockedIn: false,
                clockOutTime: timeStr,
                clockOutTimestamp: nowTs,
                workSeconds: finalVerifiedWorkSecs,
                activeTask: null
              }).catch(() => { });
            }
          }).catch(() => { });
        } catch (_) { }
      }
    }
  } catch (_) { }

  // 4. Auto-pause running task timers for this user
  try {
    const activeTimerKeys = mirrorKeys.map(k => `ems_active_task_timer_${k}`);
    let pausedActiveTimer = null;
    let pausedTaskRecord = null;

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

        const isRunningForUser = isTaskRunningForUser(t, user) || (pausedActiveTimer?.taskId && String(t._id || t.id) === String(pausedActiveTimer.taskId));
        if (isAssigned && t.timerRunning && isRunningForUser) {
          taskChanged = true;
          const pausedT = syncTaskPauseState(t, { nowMs: nowTs, todayStr: today, wasPausedForClockOut: true });
          if (pausedT) {
            pausedTaskRecord = pausedT;
            tasksToUpdateBackend.push(pausedT);
          }
          return pausedT;
        }
        return t;
      });

      if (taskChanged) {
        localStorage.setItem('ems_tasks', JSON.stringify(updatedTasks));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'ems_tasks' } }));

        // Async update tasks in MongoDB backend so remote clients see timerRunning: false
        import('../../modules/work/services/workService.js').then(mod => {
          const ws = mod?.workService;
          if (ws) {
            tasksToUpdateBackend.forEach(pt => {
              if (pt && (pt._id || pt.id)) {
                ws.updateTask(pt._id || pt.id, {
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

            if (pausedActiveTimer && pausedActiveTimer.taskId) {
              const alreadyUpdated = tasksToUpdateBackend.some(pt => String(pt._id || pt.id) === String(pausedActiveTimer.taskId));
              if (!alreadyUpdated) {
                ws.updateTask(pausedActiveTimer.taskId, {
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
        }).catch(() => { });
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
    import('../services/realtimeSyncService.js').then(mod => {
      const bse = mod?.broadcastSyncEvent;
      const se = mod?.SYNC_EVENTS;
      if (bse && se) {
        bse(se.SHIFT_CLOCKED_OUT, clockOutPayload);
        const taskToBroadcast = pausedActiveTimer || pausedTaskRecord;
        if (taskToBroadcast) {
          bse(se.TASK_TIMER_PAUSED, {
            taskId: taskToBroadcast.taskId || taskToBroadcast._id || taskToBroadcast.id,
            taskCode: taskToBroadcast.taskCode || '',
            taskTitle: taskToBroadcast.title || '',
            empKey: mirrorKeys[0],
            employeeId: user._id,
            employeeCode: user.employeeCode,
            accumulatedSeconds: Number(taskToBroadcast.accumulatedSeconds || taskToBroadcast.timerSeconds || 0),
            todayWorkSeconds: Number(taskToBroadcast.todayWorkSeconds || taskToBroadcast.accumulatedTodaySeconds || 0),
            accumulatedTodaySeconds: Number(taskToBroadcast.accumulatedTodaySeconds || taskToBroadcast.todayWorkSeconds || 0),
            dailySessions: taskToBroadcast.dailySessions || {},
            reason: 'Shift Clock Out'
          });
        }
      }
    }).catch(() => { });
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
 * Canonical check whether a running task is actively being worked on by a specific user.
 * In multi-assignee tasks, ONLY the specific active worker has the running timer.
 * Co-assignees see teammate presence without accumulating phantom work seconds.
 */
export const getWorkerTaskTimer = (task, user) => {
  if (!task || !user || !task.assigneeTimers || typeof task.assigneeTimers !== 'object') return null;
  const rawKeys = [
    user._id,
    user.id,
    user.employeeCode,
    user.email,
    user.username
  ].filter(Boolean).map(s => String(s).trim());

  for (const k of rawKeys) {
    if (task.assigneeTimers[k] && typeof task.assigneeTimers[k] === 'object') {
      return task.assigneeTimers[k];
    }
  }
  const lowerKeys = rawKeys.map(k => k.toLowerCase());
  for (const [k, val] of Object.entries(task.assigneeTimers)) {
    if (val && typeof val === 'object' && lowerKeys.includes(String(k).toLowerCase().trim())) {
      return val;
    }
  }
  return null;
};

export const isTaskRunningForUser = (task, user) => {
  if (!task || !user) return false;

  // 0. Per-assignee isolated timer map (multi-assignee safe!)
  const workerTimer = getWorkerTaskTimer(task, user);
  if (workerTimer && typeof workerTimer.timerRunning === 'boolean') {
    return workerTimer.timerRunning;
  }

  if (!task.timerRunning) return false;

  const userIds = [
    user._id,
    user.id,
    user.employeeCode,
    user.email,
    user.username
  ].filter(Boolean).map(s => String(s).toLowerCase().trim());
  const userName = (user.name || '').trim().toLowerCase();

  // 1. Explicit active worker on task
  const activeWorkerIds = [
    task.activeWorkerId,
    task.activeUserId,
    task.activeWorkerCode,
    task.workerId,
    task.workerCode,
    task.employeeId,
    task.employeeCode,
    task.startedById,
    task.userKey
  ].filter(Boolean).map(s => String(s).toLowerCase().trim());
  const activeWorkerName = (task.activeWorkerName || task.activeUserName || task.workerName || task.employeeName || task.startedBy || '').trim().toLowerCase();

  if (activeWorkerIds.length > 0 || activeWorkerName) {
    if (activeWorkerIds.length > 0 && userIds.some(uid => activeWorkerIds.includes(uid))) {
      return true;
    }
    if (userName && activeWorkerName && (userName === activeWorkerName || userName.includes(activeWorkerName) || activeWorkerName.includes(userName))) {
      return true;
    }
    // Explicit active worker is set and does NOT match user -> strictly false!
    return false;
  }

  // 2. Multi-assignee task with no explicit active worker -> false (prevents blind leakage to all members)
  const isMultiAssignee = (Array.isArray(task.assignedToIds) && task.assignedToIds.length > 1) ||
    (Array.isArray(task.assignees) && task.assignees.length > 1) ||
    (Array.isArray(task.assignedMembers) && task.assignedMembers.length > 1);

  if (isMultiAssignee) {
    return false;
  }

  // 3. Single assignee fallback
  return isTaskAssignedToUser(task, user);
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
    clampToShift = false
  } = options;

  const actualToday = getLocalDateString(new Date());
  const effectiveDate = targetDate || actualToday;
  const isToday = effectiveDate === actualToday;

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const todayMidnightMs = todayMidnight.getTime();

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
    // 🛡️ CRITICAL: Exclude synthetic shift attendance syncs! Shift duration is NOT a task!
    const isSyntheticShift = Boolean(
      ts.isShiftSync ||
      ts.taskTitle === 'Daily Shift / Office Work' ||
      ts.title === 'Daily Shift / Office Work' ||
      (ts.taskTitle && String(ts.taskTitle).toLowerCase().includes('daily shift')) ||
      (ts.title && String(ts.title).toLowerCase().includes('daily shift')) ||
      (ts.memo && String(ts.memo).toLowerCase().includes('synced from attendance')) ||
      (ts.notes && String(ts.notes).toLowerCase().includes('synced from attendance'))
    );
    if (isSyntheticShift) {
      return false;
    }
    const tsDate = ts.date || (ts.createdAt ? ts.createdAt.split('T')[0] : '');
    if (tsDate !== effectiveDate) return false;

    const tsId = ts.employeeId ? String(ts.employeeId).toLowerCase().trim() : (ts.employee ? String(ts.employee._id || ts.employee).toLowerCase().trim() : '');
    const tsCode = ts.employeeCode ? String(ts.employeeCode).toLowerCase().trim() : '';
    const tsName = ts.employeeName ? ts.employeeName.toLowerCase().trim() : '';

    // Disallow mismatched employee names
    if (tsName && uName && tsName !== uName && !tsName.includes(uName) && !uName.includes(tsName)) {
      return false;
    }

    const empMatches = Boolean(
      (uId && (tsId === uId || String(ts.employee) === uId)) ||
      (uCode && (tsId === uCode || tsCode === uCode)) ||
      (uName && tsName && (tsName === uName || tsName.includes(uName) || uName.includes(tsName)))
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

  // 2. Intelligently group timesheets by task key so distinct sessions are preserved:
  // - Distinct manual entries (e.g. user logged separate sessions) are SUMMED so no work is dropped.
  // - Automated / system snapshots (e.g. clock-out auto-save, auto-close) are progressive snapshots, so take the maximum.
  const taskTsGroups = new Map();
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
    if (!taskTsGroups.has(taskKey)) taskTsGroups.set(taskKey, []);
    taskTsGroups.get(taskKey).push(ts);
  });

  const dedupedTimesheetEntries = [];
  taskTsGroups.forEach((tsList) => {
    if (tsList.length === 1) {
      dedupedTimesheetEntries.push(tsList[0]);
    } else {
      // In Inforag MS, multiple timesheets for the same task on the same date:
      // When work is saved (via stopTimer, auto-stop, shift end, or completion),
      // each timesheet stores a cumulative snapshot of the task's work on that date.
      // Summing cumulative snapshots multiplies duration into false 18h+ inflation!
      // Take the highest recorded duration for that task on that date.
      const best = tsList.reduce((maxT, curT) =>
        (Number(curT.totalDurationSeconds) || 0) > (Number(maxT.totalDurationSeconds) || 0) ? curT : maxT
      , tsList[0]);

      // If user logged distinct non-overlapping sessions with separate start/end times:
      const hasDistinctIntervals = tsList.length > 1 && tsList.every(t => t.startTime && t.endTime && t.startTime !== t.endTime);
      let totalGroupSecs = Number(best.totalDurationSeconds) || 0;
      if (hasDistinctIntervals) {
        const sorted = [...tsList].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        let isNonOverlapping = true;
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].endTime > sorted[i + 1].startTime) {
            isNonOverlapping = false;
            break;
          }
        }
        if (isNonOverlapping) {
          totalGroupSecs = sorted.reduce((sum, t) => sum + (Number(t.totalDurationSeconds) || 0), 0);
        }
      }

      // Hard sanity guard: a single task's logged time on one calendar day cannot exceed 24 hours (86400s)
      totalGroupSecs = Math.min(86400, Math.max(0, totalGroupSecs));

      dedupedTimesheetEntries.push({
        ...best,
        totalDurationSeconds: totalGroupSecs,
        totalDurationText: formatSecondsToDigital(totalGroupSecs)
      });
    }
  });

  // Construct tasksWorked entries from deduped timesheets (strictly actual tasks only)
  let tasksWorked = dedupedTimesheetEntries
    .filter(ts => !ts.isShiftSync && ts.taskTitle !== 'Daily Shift / Office Work')
    .map(ts => ({
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

  const empTasks = allTasks.filter(t => isTaskAssignedToUser(t, targetUser));

  // 3. For today: merge live ticking or paused tasks worked today that haven't been submitted to timesheets yet
  if (isToday) {
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
    const isTimerValidForTarget = empActiveTimer && empActiveTimer.timerRunning && (empActiveTimer.date === actualToday || !empActiveTimer.date) && isClockedIn && !isOnBreak && isTaskRunningForUser(empActiveTimer, targetUser);
    if (isTimerValidForTarget) {
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
      const ptCode = pt.taskCode ? String(pt.taskCode).trim().toLowerCase() : '';
      if (runningTaskId && (ptId === runningTaskId || (ptCode && empActiveTimer?.taskCode && ptCode === String(empActiveTimer.taskCode).trim().toLowerCase()))) return;

      const isMultiAssignee = (Array.isArray(pt.assignedToIds) && pt.assignedToIds.length > 1) ||
        (Array.isArray(pt.assignees) && pt.assignees.length > 1) ||
        (Array.isArray(pt.assignedMembers) && pt.assignedMembers.length > 1);

      // If task is running right now: ONLY include if targetUser is the active worker!
      if (pt.timerRunning && !isTaskRunningForUser(pt, targetUser)) {
        return; // Running by another teammate! Do not attribute to targetUser
      }

      const targetUserKey = String(targetUser.employeeCode || targetUser._id);
      const targetUserId = String(targetUser._id);
      const targetUserCode = String(targetUser.employeeCode || '');
      const workerSessions = pt.assigneeSessions?.[targetUserKey] || pt.assigneeSessions?.[targetUserId] || pt.assigneeSessions?.[targetUserCode] || {};
      const baseWorkerToday = Number(workerSessions[actualToday]) || 0;
      const tsSecs = dedupedTimesheetEntries
        .filter(ts => String(ts.taskId) === ptId || (ptCode && ts.taskCode && String(ts.taskCode).trim().toLowerCase() === ptCode))
        .reduce((sum, ts) => Math.max(sum, Number(ts.totalDurationSeconds) || 0), 0);

      // If multi-assignee task:
      // Verify that targetUser actually worked on this task today!
      if (isMultiAssignee) {
        const hasMyTimesheet = tsSecs > 0;
        const isMyWorker = isTaskRunningForUser(pt, targetUser) ||
          baseWorkerToday > 0 ||
          (pt.activeWorkerId && (String(pt.activeWorkerId) === String(targetUser._id) || String(pt.activeWorkerId) === String(targetUser.employeeCode))) ||
          (pt.activeUserId && (String(pt.activeUserId) === String(targetUser._id) || String(pt.activeUserId) === String(targetUser.employeeCode))) ||
          (pt.lastWorkerId && (String(pt.lastWorkerId) === String(targetUser._id) || String(pt.lastWorkerId) === String(targetUser.employeeCode)));

        if (!hasMyTimesheet && !isMyWorker) {
          return; // Another teammate worked on it, not targetUser!
        }
      }

      const hasSessionToday = (pt.dailySessions && Number(pt.dailySessions[actualToday]) > 0) ||
        (pt.sessionDate === actualToday && (Number(pt.todayWorkSeconds) > 0 || Number(pt.accumulatedTodaySeconds) > 0)) ||
        baseWorkerToday > 0 ||
        tsSecs > 0;
      const isRunningToday = pt.timerRunning && isClockedIn && isTaskRunningForUser(pt, targetUser);
      if (!hasSessionToday && !isRunningToday) return;

      // Multi-assignee & Single assignee: get user's own today work, checking all authoritative sources
      let todaySecs = 0;
      if (isMultiAssignee) {
        const liveSecs = (pt.timerRunning && isTaskRunningForUser(pt, targetUser))
          ? Math.max(0, Math.floor((Date.now() - Math.max(Number(pt.startedAt || Date.now()), todayMidnightMs)) / 1000))
          : 0;
        todaySecs = Math.max(baseWorkerToday + liveSecs, tsSecs);
      } else {
        const baseTaskSecs = getTaskTodaySeconds(pt, actualToday, Date.now(), isClockedIn, isOnBreak);
        todaySecs = Math.max(baseTaskSecs, baseWorkerToday, tsSecs);
      }
      if (todaySecs > 0) {
        const rowIdx = tasksWorked.findIndex(t =>
          String(t.taskId) === ptId ||
          (pt.taskCode && t.taskCode && String(pt.taskCode).trim().toLowerCase() === String(t.taskCode).trim().toLowerCase())
        );
        if (rowIdx !== -1) {
          // If task already has a timesheet row for today, make sure duration is at least todaySecs
          if (todaySecs > tasksWorked[rowIdx].durationSeconds) {
            tasksWorked[rowIdx].durationSeconds = todaySecs;
            tasksWorked[rowIdx].durationText = formatSecondsToDigital(todaySecs);
          }
        } else {
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
            timerRunning: Boolean(pt.timerRunning && isClockedIn && isTaskRunningForUser(pt, targetUser)),
            memo: isDone ? 'Completed Today' : `Work session (${formatSecondsToDigital(todaySecs)} logged)`
          });
        }
      }
    });
  } else {
    // ── 🛡️ PAST DATES (e.g. yesterday, Friday, etc.): Merge any recorded sessions in task.dailySessions ──
    // Ensures that past work is NEVER lost or displayed as 0 even if an employee didn't submit a formal timesheet!
    empTasks.forEach(pt => {
      const ptId = String(pt._id || pt.id);
      const pastDaySecs = getTaskTodaySeconds(pt, effectiveDate, Date.now(), false, false);
      if (pastDaySecs > 0) {
        const ptCode = pt.taskCode ? String(pt.taskCode).trim().toLowerCase() : '';
        const ptTitle = pt.title ? String(pt.title).trim().toLowerCase() : '';
        const rowIdx = tasksWorked.findIndex(t =>
          String(t.taskId) === ptId ||
          (ptCode && t.taskCode && String(t.taskCode).trim().toLowerCase() === ptCode) ||
          (ptTitle && t.taskTitle && String(t.taskTitle).trim().toLowerCase() === ptTitle)
        );
        if (rowIdx !== -1) {
          // Timesheet exists: ensure it is at least pastDaySecs
          if (pastDaySecs > tasksWorked[rowIdx].durationSeconds) {
            tasksWorked[rowIdx].durationSeconds = pastDaySecs;
            tasksWorked[rowIdx].durationText = formatSecondsToDigital(pastDaySecs);
          }
        } else {
          // No timesheet existed: synthesize the task session row from task.dailySessions!
          const isDone = pt.status === 'completed' || !!pt.completedAt;
          tasksWorked.push({
            taskId: ptId,
            taskCode: pt.taskCode || 'TSK',
            taskTitle: pt.title,
            projectName: pt.projectName || 'General Work',
            durationText: formatSecondsToDigital(pastDaySecs),
            durationSeconds: pastDaySecs,
            status: isDone ? 'completed' : 'on_hold',
            isCompleted: isDone,
            timerRunning: false,
            memo: isDone ? 'Completed on this day' : `Logged task session (${formatSecondsToDigital(pastDaySecs)})`
          });
        }
      }
    });
  }

  const rawTotalSecs = tasksWorked.reduce((sum, t) => sum + (Number(t.durationSeconds) || 0), 0);
  const cappedTotalSecs = Math.min(86400, rawTotalSecs);

  // Task time is STRICTLY independent of Shift Working Time!
  // NEVER clamp/copy live ticking shiftSeconds into task time (otherwise task time ticks alongside shift working time).
  let effectiveTotalSecs = cappedTotalSecs;
  if (!isClockedIn && shiftSeconds === 0 && tasksWorked.length === 0) {
    effectiveTotalSecs = 0;
  }

  return {
    totalTaskSeconds: effectiveTotalSecs,
    totalTaskDurationText: formatSecondsToDigital(effectiveTotalSecs),
    rawTaskSeconds: cappedTotalSecs,
    rawTaskDurationText: formatSecondsToDigital(cappedTotalSecs),
    tasksWorked,
    dedupedTimesheets: dedupedTimesheetEntries
  };
};

/**
 * Universal one-liner helper for components that just need the user's total daily task seconds.
 */
export const calculateUserDailyTaskSeconds = (targetUser, targetDate, options = {}) => {
  const result = getUserDailyTaskBreakdown(targetUser, targetDate, options);
  return result.totalTaskSeconds;
};



