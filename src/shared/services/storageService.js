/**
 * @file storageService.js
 * @description Centralized Database-First Storage & Offline Mirroring Layer.
 * 
 * ARCHITECTURE:
 * 1. Single Source of Truth: MongoDB Atlas Cloud Database.
 * 2. Zero Hardcoded Mock Data: All live workforce, projects, tasks, attendances, and leaves
 *    are populated directly from backend API endpoints (`/api/*`).
 * 3. Reactive Browser Synchronization: Syncs seamlessly across browser tabs and devices.
 */

import { API_BASE } from '../config/apiConfig';
import { broadcastSyncEvent, subscribeToSyncEvents, SYNC_EVENTS } from './realtimeSyncService';

export const KEYS = {
  EMPLOYEES: 'hrms_employees',
  LEAVES: 'hrms_leaves',
  ATTENDANCE: 'hrms_attendance',
  HOLIDAYS: 'hrms_holidays',
  APPRECIATIONS: 'hrms_appreciations',
  PROJECTS: 'ems_projects',
  TASKS: 'ems_tasks',
  TIMESHEETS: 'ems_timesheets',
  TICKETS: 'ems_tickets',
  NOTICES: 'ems_notices',
  EVENTS: 'ems_events',
  BIRTHDAYS: 'ems_birthdays',
  WFH: 'ems_wfh',
  WEEKLY_TIMELOGS: 'ems_weekly_timelogs',
  LEADS: 'ems_leads',
  EXPENSES: 'ems_expenses',
  CONVERSATIONS: 'ems_conversations',
  EMERGENCY_CONTACTS: 'ems_emergency_contacts',
  USER_SETTINGS: 'ems_user_settings',
  WORK_TIMER: 'hrms_work_timer',
  SETTINGS: 'hrms_settings',
  ATTENDANCE_AUDIT: 'ems_attendance_audit_logs',
  ATTENDANCE_OVERTIME: 'ems_attendance_overtime',
  DOCUMENTS: 'ems_documents',
  USER_DATE_MEMORIES: 'ems_user_date_memories',
  SUGGESTED_HOLIDAYS: 'ems_suggested_holidays'
};

const PROD_CLEAN_VERSION = 'ems_clean_multiuser_prod_v6';

/**
 * Sanitize runaway task timers that leaked from previous days/weeks
 */
export const sanitizeRunawayTimers = () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMidnightMs = todayMidnight.getTime();

    // 1. Sanitize all active timer snapshots in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('ems_active_task_timer') || key === 'ems_active_task_timer')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed) {
              const startedAtMs = parsed.startedAt ? Number(parsed.startedAt) : null;
              const isStartedBeforeToday = startedAtMs && startedAtMs < todayMidnightMs;
              const isDifferentDate = parsed.date && parsed.date !== today;

              if (isStartedBeforeToday || isDifferentDate) {
                parsed.timerRunning = false;
                parsed.startedAt = null;
                if (isDifferentDate) {
                  parsed.accumulatedSeconds = 0;
                }
                localStorage.setItem(key, JSON.stringify(parsed));
              }
            }
          }
        } catch (_) {}
      }
    }

    // 2. Sanitize tasks collection in localStorage
    try {
      const tasksRaw = localStorage.getItem(KEYS.TASKS);
      if (tasksRaw) {
        const tasks = JSON.parse(tasksRaw);
        if (Array.isArray(tasks)) {
          let tasksChanged = false;
          const cleanedTasks = tasks.map(t => {
            const startedAtMs = t.startedAt ? Number(t.startedAt) : null;
            const isStartedBeforeToday = startedAtMs && startedAtMs < todayMidnightMs;
            const isDifferentDate = t.sessionDate && t.sessionDate !== today;

            if (t.timerRunning && (isStartedBeforeToday || isDifferentDate)) {
              tasksChanged = true;
              return {
                ...t,
                timerRunning: false,
                startedAt: null
              };
            }
            return t;
          });
          if (tasksChanged) {
            localStorage.setItem(KEYS.TASKS, JSON.stringify(cleanedTasks));
          }
        }
      }
    } catch (_) {}

    // 3. Sanitize timesheets collection in localStorage (filter out any multi-day corrupt entries)
    try {
      const timesheetsRaw = localStorage.getItem(KEYS.TIMESHEETS);
      if (timesheetsRaw) {
        const timesheets = JSON.parse(timesheetsRaw);
        if (Array.isArray(timesheets)) {
          // Remove runaway duplicate entries > 12 hours from previous buggy overflows
          const cleanedTimesheets = timesheets.filter(ts => {
            const rawSecs = Number(ts.totalDurationSeconds) || 0;
            return rawSecs <= 14 * 3600;
          });
          if (cleanedTimesheets.length !== timesheets.length) {
            localStorage.setItem(KEYS.TIMESHEETS, JSON.stringify(cleanedTimesheets));
          }
        }
      }
    } catch (_) {}

    // 4. Sanitize weekly timelogs in localStorage
    try {
      const weeklyRaw = localStorage.getItem(KEYS.WEEKLY_TIMELOGS);
      if (weeklyRaw) {
        const weekly = JSON.parse(weeklyRaw);
        if (Array.isArray(weekly)) {
          const cleanedWeekly = weekly.map(w => {
            const rawSecs = Number(w.durationSeconds) || 0;
            if (rawSecs > 14 * 3600) {
              return {
                ...w,
                durationSeconds: 0,
                durationText: '0h 00m'
              };
            }
            return w;
          });
          localStorage.setItem(KEYS.WEEKLY_TIMELOGS, JSON.stringify(cleanedWeekly));
        }
      }
    } catch (_) {}
  } catch (err) {
    console.warn('Error in sanitizeRunawayTimers:', err);
  }
};

/**
 * Clean up obsolete mock data and stale cache from previous sessions
 */
export const purgeStaleMockData = () => {
  try {
    const migrated = localStorage.getItem(PROD_CLEAN_VERSION);
    if (!migrated) {
      // Clean obsolete legacy keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key && (
            key.startsWith('ems_timer_') ||
            key.startsWith('ems_active_task_timer_') ||
            key.includes('emp_00') ||
            key.includes('EMP-00') ||
            key.includes('Priya') ||
            key === 'hrms_tasks'
          )
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // Reset collections to clean arrays so they are freshly hydrated from MongoDB
      Object.values(KEYS).forEach(k => {
        if (!localStorage.getItem(k)) {
          localStorage.setItem(k, JSON.stringify([]));
        }
      });

      localStorage.setItem(PROD_CLEAN_VERSION, 'true');
      console.log('✅ Inforag Management System: Stale mock data cleaned. Ready for live DB sync.');
    }
  } catch (e) {
    console.error('Error purging stale mock data:', e);
  }
};

/**
 * Universal Database-to-Storage Synchronizer:
 * Asynchronously pulls the authoritative state from MongoDB Atlas into local mirror
 */
export const syncDatabaseToStorage = async () => {
  try {
    const endpoints = [
      { key: KEYS.EMPLOYEES, url: `${API_BASE}/employees` },
      { key: KEYS.PROJECTS, url: `${API_BASE}/projects` },
      { key: KEYS.TASKS, url: `${API_BASE}/tasks` },
      { key: KEYS.ATTENDANCE, url: `${API_BASE}/attendance` },
      { key: KEYS.LEAVES, url: `${API_BASE}/leaves` },
      { key: KEYS.HOLIDAYS, url: `${API_BASE}/holidays` },
      { key: KEYS.APPRECIATIONS, url: `${API_BASE}/appreciations` },
      { key: KEYS.TIMESHEETS, url: `${API_BASE}/timesheet` },
      { key: KEYS.LEADS, url: `${API_BASE}/leads` },
      { key: KEYS.NOTICES, url: `${API_BASE}/notices` },
      { key: KEYS.TICKETS, url: `${API_BASE}/tickets` },
      { key: KEYS.EVENTS, url: `${API_BASE}/events` },
      { key: KEYS.EXPENSES, url: `${API_BASE}/expenses` }
    ];

    const authHeaders = (() => {
      try {
        const s = localStorage.getItem('ems_auth_session');
        if (!s) return {};
        const parsed = JSON.parse(s);
        const u = parsed?.user || parsed;
        if (u) {
          return {
            'x-user-id': String(u._id || u.id || u.employeeCode || ''),
            'x-user-role': String(u.systemRole || (u.isAdmin ? 'admin' : (u.department === 'Human Resources' ? 'hr' : 'team_member')))
          };
        }
      } catch {}
      return {};
    })();

    await Promise.all(
      endpoints.map(async ({ key, url }) => {
        try {
          const res = await fetch(url, {
            headers: authHeaders,
            signal: AbortSignal.timeout(4000)
          });
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('application/json')) {
            const json = await res.json();
            const data = json.data !== undefined ? json.data : json;
            if (Array.isArray(data)) {
              localStorage.setItem(key, JSON.stringify(data));
            }
          }
        } catch (_) {}
      })
    );

    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'all' } }));
  } catch (err) {
    console.warn('MongoDB Atlas live sync notice:', err);
  }
};

/**
 * Storage initialization on boot:
 * Ensures collections exist as arrays and triggers background live DB synchronization.
 */
export const initStorage = () => {
  purgeStaleMockData();
  sanitizeRunawayTimers();

  // Initialize any unset keys as empty arrays
  Object.values(KEYS).forEach(k => {
    if (!localStorage.getItem(k)) {
      localStorage.setItem(k, JSON.stringify([]));
    }
  });

  // Pull live data from MongoDB Atlas
  syncDatabaseToStorage();
};

// Generic read
export const getCollection = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return [];
  }
};

// Generic write with instant cross-tab broadcast
export const saveCollection = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key } }));
    broadcastSyncEvent(SYNC_EVENTS.STORAGE_MUTATION, { key });
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

// Cross-tab reactive bridge: when another tab mutates a collection, emit locally
if (typeof window !== 'undefined') {
  subscribeToSyncEvents((event) => {
    if (event?.type === SYNC_EVENTS.STORAGE_MUTATION && event.payload?.key) {
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: event.payload.key } }));
    }
  });
}

/**
 * Clear collections while preserving system authentication
 */
export const clearAllDummyData = () => {
  try {
    saveCollection(KEYS.PROJECTS, []);
    saveCollection(KEYS.TASKS, []);
    saveCollection(KEYS.TIMESHEETS, []);
    saveCollection(KEYS.TICKETS, []);
    saveCollection(KEYS.NOTICES, []);
    saveCollection(KEYS.LEADS, []);
    saveCollection(KEYS.EXPENSES, []);
    saveCollection(KEYS.LEAVES, []);
    saveCollection(KEYS.WEEKLY_TIMELOGS, []);
    
    // Re-sync with actual MongoDB collections
    syncDatabaseToStorage();

    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'all' } }));
    return true;
  } catch (err) {
    console.error('Error clearing data:', err);
    return false;
  }
};
