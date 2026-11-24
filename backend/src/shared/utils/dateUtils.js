/**
 * @file dateUtils.js
 * @description Canonical IST (UTC+5:30) calendar date helpers for EMS backend.
 * Prevents midnight-to-5:30 AM IST UTC date skew bugs across attendance, leaves, tasks, and timesheets.
 */

const IST_OFFSET_MS = 330 * 60 * 1000; // +05:30

/**
 * Returns YYYY-MM-DD in IST (India Standard Time, UTC+5:30).
 */
const getIstDateString = (date = new Date()) => {
  const ms = (date instanceof Date ? date.getTime() : new Date(date).getTime()) + IST_OFFSET_MS;
  return new Date(ms).toISOString().split('T')[0];
};

/**
 * Returns canonical hh:mm A time string in IST (India Standard Time, UTC+5:30).
 * Prevents UTC skew bugs on Render / cloud servers where process.env.TZ is UTC.
 * Uses exact UTC+05:30 offset arithmetic so it is 100% immune to OS/container tzdata absence.
 */
const getIstTimeString = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const ms = d.getTime();
  if (isNaN(ms)) return '--';
  const ist = new Date(ms + IST_OFFSET_MS);
  let h = ist.getUTCHours();
  const m = String(ist.getUTCMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const hStr = String(h).padStart(2, '0');
  return `${hStr}:${m} ${ampm}`;
};

module.exports = {
  getIstDateString,
  getIstTimeString,
  IST_OFFSET_MS
};
