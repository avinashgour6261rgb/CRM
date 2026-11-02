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

