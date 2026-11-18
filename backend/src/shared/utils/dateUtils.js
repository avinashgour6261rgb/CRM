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

module.exports = {
  getIstDateString,
  IST_OFFSET_MS
};
