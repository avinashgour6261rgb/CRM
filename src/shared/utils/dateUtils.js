/**
 * @file dateUtils.js
 * @description Pure canonical date & time utility helpers for frontend.
 * Zero-dependency module: immune to circular dependency / TDZ initialization errors.
 */

/**
 * Returns YYYY-MM-DD in local/calendar date format.
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
 * Returns canonical hh:mm A time string in IST (India Standard Time, UTC+5:30).
 * Prevents UTC skew bugs across client browsers, cloud previews, and servers.
 */
export const getIstTimeString = (d = new Date()) => {
  const dateObj = d instanceof Date ? d : new Date(d);
  return dateObj.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Convenience alias for today's date in YYYY-MM-DD format
 */
export const getTodayStr = (d = new Date()) => getLocalDateString(d);

/**
 * Parses time string (e.g. "10:30 AM", "14:15") to total seconds from midnight.
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
