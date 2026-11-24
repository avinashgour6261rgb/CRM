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

import { API_BASE, getAuthHeaders } from '../config/apiConfig';
import { ensureHistoricalData } from '../utils/historicalDataSeeder';
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
  SUGGESTED_HOLIDAYS: 'ems_suggested_holidays',
  CANCELLED_HOLIDAYS: 'hrms_cancelled_holidays',
  RESIGNATIONS: 'hrms_resignations'
};

const PROD_CLEAN_VERSION = 'ems_clean_multiuser_prod_v6';

/**
 * Sanitize runaway task timers that leaked from previous days/weeks
 */
export const sanitizeRunawayTimers = () => {
  try {
    const _now = new Date();
    const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
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
              // Do NOT reset accumulatedSeconds - it holds total all-time seconds
              // but DO reset session-scoped fields so today starts fresh
              return {
                ...t,
                timerRunning: false,
                startedAt: null,
                // todayWorkSeconds reset to 0 for the new day (dailySessions preserves per-day truth)
                todayWorkSeconds: isDifferentDate ? 0 : (t.todayWorkSeconds || 0)
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

    // 3. Sanitize timesheets collection in localStorage (filter out any multi-day corrupt entries & cross-user leakages)
    try {
      const timesheetsRaw = localStorage.getItem(KEYS.TIMESHEETS);
      if (timesheetsRaw) {
        const timesheets = JSON.parse(timesheetsRaw);
        if (Array.isArray(timesheets)) {
          let tasksList = [];
          try {
            const tr = localStorage.getItem(KEYS.TASKS);
            if (tr) tasksList = JSON.parse(tr) || [];
          } catch (_) {}

          let tsChanged = false;
          const cleanedTimesheets = timesheets.filter(ts => {
            const rawSecs = Number(ts.totalDurationSeconds) || 0;
            if (rawSecs > 14 * 3600) {
              tsChanged = true;
              return false;
            }
            // Purge timesheets mistakenly saved under Administrator for another employee's task (e.g. TSK-8 belongs to Sandeep)
            if ((ts.employeeId === 'ADM-001' || ts.employeeName === 'Administrator') && (ts.taskId || ts.taskCode)) {
              const matchedTask = tasksList.find(t =>
                (ts.taskId && String(t._id || t.id) === String(ts.taskId)) ||
                (ts.taskCode && t.taskCode && String(t.taskCode).trim().toLowerCase() === String(ts.taskCode).trim().toLowerCase())
              );
              if (matchedTask && matchedTask.assignedToName && matchedTask.assignedToName.trim().toLowerCase() !== 'administrator') {
                tsChanged = true;
                return false;
              }
            }
            return true;
          });
          if (tsChanged || cleanedTimesheets.length !== timesheets.length) {
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
      console.log('âœ… Inforag Management System: Stale mock data cleaned. Ready for live DB sync.');
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
    // Skip protected backend fetches until a user session is authenticated (avoids 401 noise on /login)
    if (typeof localStorage === 'undefined' || !localStorage.getItem('ems_auth_session')) {
      return;
    }

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
      { key: KEYS.EXPENSES, url: `${API_BASE}/expenses` },
      { key: KEYS.CONVERSATIONS, url: `${API_BASE}/conversations` }
    ];

    const authHeaders = getAuthHeaders();

    await Promise.all(
      endpoints.map(async ({ key, url }) => {
        try {
          const res = await fetch(url, {
            headers: authHeaders,
            signal: AbortSignal.timeout(10000)
          });
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('application/json')) {
            const json = await res.json();
            const data = json.data !== undefined ? json.data : json;
            if (Array.isArray(data)) {
              if (key === KEYS.ATTENDANCE) {
                const existing = getCollection(KEYS.ATTENDANCE) || [];
                const attMap = new Map();
                const isObjId = (v) => typeof v === 'string' && /^[a-fA-F0-9]{24}$/.test(v);
                // Only keep unsaved local records; remote MongoDB is authoritative for synced records
                existing.forEach(a => {
                  if (!isObjId(String(a._id || ''))) {
                    const k = `${a.employeeId || a.employeeCode || (a.employee?._id || a.employee)}_${a.date}`;
                    attMap.set(k, a);
                  }
                });
                data.forEach(a => {
                  const k = `${a.employeeId || a.employeeCode || (a.employee?._id || a.employee)}_${a.date}`;
                  attMap.set(k, a);
                });
                localStorage.setItem(key, JSON.stringify(Array.from(attMap.values())));
              } else if (key === KEYS.TASKS) {
                const existing = getCollection(KEYS.TASKS) || [];
                const isObjId = (v) => typeof v === 'string' && /^[a-fA-F0-9]{24}$/.test(v);
                const tMap = new Map();
                // Preserve only unsaved offline-created tasks; never resurrect tasks deleted in MongoDB
                existing.forEach(t => {
                  if (!isObjId(String(t._id || t.id || ''))) {
                    tMap.set(String(t._id || t.id), t);
                  }
                });
                data.forEach(t => {
                  tMap.set(String(t._id || t.id), t);
                });
                localStorage.setItem(key, JSON.stringify(Array.from(tMap.values())));
              } else if (key === KEYS.CONVERSATIONS) {
                // Sanitize conversations and deduplicate messages mirrored from MongoDB
                const cleanConvs = (Array.isArray(data) ? data : []).map(c => {
                  if (!c || !Array.isArray(c.messages)) return c;
                  const seen = new Set();
                  const uniqueMsgs = [];
                  for (const m of c.messages) {
                    if (!m) continue;
                    const mKey = m.id || `${m.senderId || ''}_${m.createdAt || ''}_${m.text || ''}`;
                    if (!seen.has(mKey)) {
                      seen.add(mKey);
                      uniqueMsgs.push(m);
                    }
                  }
                  return { ...c, messages: uniqueMsgs };
                });
                localStorage.setItem(key, JSON.stringify(cleanConvs));
              } else {
                localStorage.setItem(key, JSON.stringify(data));
              }
              if (key === KEYS.EMPLOYEES) {
                try {
                  const rawMap = localStorage.getItem('EMS_USER_PERMISSIONS');
                  const parsedMap = rawMap ? JSON.parse(rawMap) : {};
                  data.forEach(emp => {
                    if (emp.permissions && typeof emp.permissions === 'object') {
                      if (emp._id) parsedMap[String(emp._id)] = emp.permissions;
                      if (emp.employeeCode) parsedMap[String(emp.employeeCode)] = emp.permissions;
                      if (emp.email) parsedMap[String(emp.email).toLowerCase()] = emp.permissions;
                    }
                  });
                  localStorage.setItem('EMS_USER_PERMISSIONS', JSON.stringify(parsedMap));
                } catch (_) {}
              }
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
  pruneExcessStorage();

  // Initialize any unset keys as empty arrays
  Object.values(KEYS).forEach(k => {
    if (!localStorage.getItem(k)) {
      localStorage.setItem(k, JSON.stringify([]));
    }
  });

  // Ensure historical records for past days/months exist so users never see blank screens
  ensureHistoricalData();

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

export const pruneExcessStorage = () => {
  if (typeof localStorage === 'undefined') return;
  try {
    // 1. Prune oversized chat media / messages if present locally
    const convsRaw = localStorage.getItem(KEYS.CONVERSATIONS);
    if (convsRaw && convsRaw.length > 400000) {
      try {
        const convs = JSON.parse(convsRaw);
        if (Array.isArray(convs)) {
          const trimmed = convs.map(c => ({
            ...c,
            messages: Array.isArray(c.messages) ? c.messages.slice(-30) : []
          }));
          localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(trimmed));
        }
      } catch (_) {}
    }

    // 2. Prune old audit logs beyond latest 150
    const auditRaw = localStorage.getItem(KEYS.ATTENDANCE_AUDIT);
    if (auditRaw && auditRaw.length > 300000) {
      try {
        const logs = JSON.parse(auditRaw);
        if (Array.isArray(logs) && logs.length > 150) {
          localStorage.setItem(KEYS.ATTENDANCE_AUDIT, JSON.stringify(logs.slice(0, 150)));
        }
      } catch (_) {}
    }

    // 3. Prune historical timesheets beyond latest 200
    const tsRaw = localStorage.getItem(KEYS.TIMESHEETS);
    if (tsRaw && tsRaw.length > 400000) {
      try {
        const timesheets = JSON.parse(tsRaw);
        if (Array.isArray(timesheets) && timesheets.length > 200) {
          localStorage.setItem(KEYS.TIMESHEETS, JSON.stringify(timesheets.slice(0, 200)));
        }
      } catch (_) {}
    }

    // 4. Prune historical attendance records beyond latest 200 (all records preserved in MongoDB)
    const attRaw = localStorage.getItem(KEYS.ATTENDANCE);
    if (attRaw && attRaw.length > 400000) {
      try {
        const attendance = JSON.parse(attRaw);
        if (Array.isArray(attendance) && attendance.length > 200) {
          localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(attendance.slice(0, 200)));
        }
      } catch (_) {}
    }

    // 5. Prune weekly timelogs beyond latest 100
    const wtRaw = localStorage.getItem(KEYS.WEEKLY_TIMELOGS);
    if (wtRaw && wtRaw.length > 300000) {
      try {
        const timelogs = JSON.parse(wtRaw);
        if (Array.isArray(timelogs) && timelogs.length > 100) {
          localStorage.setItem(KEYS.WEEKLY_TIMELOGS, JSON.stringify(timelogs.slice(0, 100)));
        }
      } catch (_) {}
    }
  } catch (_) {}
};

// Generic write with instant cross-tab & cross-device broadcast and quota protection
export const saveCollection = (key, data, options = {}) => {
  const { broadcast = true } = options;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    if (error && (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014)) {
      console.warn(`[storageService] Quota exceeded writing ${key}. Auto-pruning old mirrors...`);
      pruneExcessStorage();
      try {
        let payloadToSave = data;
        if (Array.isArray(data) && data.length > 150 && [KEYS.ATTENDANCE, KEYS.TIMESHEETS, KEYS.ATTENDANCE_AUDIT, KEYS.WEEKLY_TIMELOGS].includes(key)) {
          payloadToSave = data.slice(0, 150);
        }
        localStorage.setItem(key, JSON.stringify(payloadToSave));
      } catch (retryErr) {
        console.error(`[storageService] Failed to write ${key} after prune:`, retryErr);
      }
    } else {
      console.error(`Error saving ${key} to storage:`, error);
    }
  }

  window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key } }));
  if (broadcast) {
    broadcastSyncEvent(SYNC_EVENTS.STORAGE_MUTATION, { key });
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
