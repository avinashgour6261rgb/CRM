/**
 * @file storageService.js
 * @description LocalStorage database engine with reactive triggers.
 * 
 * WHY THIS IS HERE:
 * It simulates a real MongoDB database right inside the browser during frontend development.
 * It persists state across page reloads, supports standard CRUD queries, and emits
 * change events so that the entire app stays synchronized.
 * 
 * LOCATION: src/shared/services/storageService.js
 * USED BY:  src/modules/hr/services/hrService.js (and future module services)
 */

import {
  INITIAL_EMPLOYEES,
  INITIAL_LEAVES,
  generateInitialAttendance,
  INITIAL_HOLIDAYS,
  INITIAL_APPRECIATIONS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_TIMESHEETS,
  INITIAL_TICKETS,
  INITIAL_NOTICES,
  INITIAL_EVENTS,
  INITIAL_BIRTHDAYS,
  INITIAL_WFH_EMPLOYEES,
  INITIAL_WEEKLY_TIMELOGS,
  INITIAL_LEADS,
  INITIAL_EXPENSES,
  INITIAL_CONVERSATIONS,
  INITIAL_EMERGENCY_CONTACTS,
  INITIAL_STICKY_NOTES
} from '../mock/initialData';
import { broadcastSyncEvent, subscribeToSyncEvents, SYNC_EVENTS } from './realtimeSyncService';

const KEYS = {
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
  STICKY_NOTES: 'ems_sticky_notes',
  USER_SETTINGS: 'ems_user_settings',
  WORK_TIMER: 'hrms_work_timer',
  SETTINGS: 'hrms_settings',
  ATTENDANCE_AUDIT: 'ems_attendance_audit_logs',
  DOCUMENTS: 'ems_documents'
};

const PROD_CLEAN_VERSION = 'ems_clean_multiuser_prod_v5';

export const purgeStaleMockData = () => {
  try {
    const migrated = localStorage.getItem(PROD_CLEAN_VERSION);
    if (!migrated) {
      // 1. Reset all collections to clean initial data
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
      localStorage.setItem(KEYS.TASKS, JSON.stringify([]));
      localStorage.setItem(KEYS.PROJECTS, JSON.stringify([]));
      localStorage.setItem(KEYS.LEAVES, JSON.stringify([]));
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
      localStorage.setItem(KEYS.TIMESHEETS, JSON.stringify([]));
      localStorage.setItem(KEYS.APPRECIATIONS, JSON.stringify([]));
      localStorage.setItem(KEYS.TICKETS, JSON.stringify([]));
      localStorage.setItem(KEYS.NOTICES, JSON.stringify([]));
      localStorage.setItem(KEYS.EVENTS, JSON.stringify([]));
      localStorage.setItem(KEYS.BIRTHDAYS, JSON.stringify([]));
      localStorage.setItem(KEYS.WFH, JSON.stringify([]));
      localStorage.setItem(KEYS.LEADS, JSON.stringify([]));
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify([]));
      localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify([]));
      localStorage.setItem(KEYS.EMERGENCY_CONTACTS, JSON.stringify([]));
      localStorage.setItem(KEYS.STICKY_NOTES, JSON.stringify([]));
      localStorage.setItem(KEYS.ATTENDANCE_AUDIT, JSON.stringify([]));
      localStorage.setItem(KEYS.WEEKLY_TIMELOGS, JSON.stringify(INITIAL_WEEKLY_TIMELOGS));

      // 2. Remove all old timer keys, mock shifts, and obsolete cache
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
            key.includes('Avinash') ||
            key === 'hrms_tasks'
          )
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // 3. Keep auth session clean so users authenticate with their own credentials
      // (Do not force auto-login to Master Admin across fresh devices/browsers)

      // 4. Mark migration complete
      localStorage.setItem(PROD_CLEAN_VERSION, 'true');
      console.log('✅ Inforag Management System: Multi-user production cleanup completed.');
    }
  } catch (e) {
    console.error('Error purging stale mock data:', e);
  }
};

export const initStorage = () => {
  purgeStaleMockData();

  if (!localStorage.getItem(KEYS.EMPLOYEES)) {
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
  } else {
    // Backfill dob if missing in stored employees
    try {
      const stored = JSON.parse(localStorage.getItem(KEYS.EMPLOYEES));
      let modified = false;
      const updated = stored.map(emp => {
        if (!emp.dob) {
          const match = INITIAL_EMPLOYEES.find(e => e._id === emp._id);
          if (match && match.dob) {
            modified = true;
            return { ...emp, dob: match.dob };
          }
        }
        return emp;
      });
      if (modified) {
        localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Error backfilling employee DOB:', e);
    }
  }
  if (!localStorage.getItem(KEYS.LEAVES)) {
    localStorage.setItem(KEYS.LEAVES, JSON.stringify(INITIAL_LEAVES));
  }
  if (!localStorage.getItem(KEYS.ATTENDANCE)) {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(generateInitialAttendance()));
  }
  if (!localStorage.getItem(KEYS.HOLIDAYS)) {
    localStorage.setItem(KEYS.HOLIDAYS, JSON.stringify(INITIAL_HOLIDAYS));
  } else {
    try {
      let storedHolidays = JSON.parse(localStorage.getItem(KEYS.HOLIDAYS)) || [];
      // Clean up fake "Inforag Annual Foundation Day" or unauthorized 2026-10-15 holiday
      const beforeLen = storedHolidays.length;
      storedHolidays = storedHolidays.filter(h => 
        !h.name?.toLowerCase().includes('foundation') &&
        !h.title?.toLowerCase().includes('foundation') &&
        h.date !== '2026-10-15'
      );
      const storedIds = new Set(storedHolidays.map(h => h._id || h.name));
      const missingHolidays = INITIAL_HOLIDAYS.filter(h => !storedIds.has(h._id) && !storedHolidays.some(sh => sh.name === h.name && sh.date === h.date));
      const merged = [...storedHolidays, ...missingHolidays];
      localStorage.setItem(KEYS.HOLIDAYS, JSON.stringify(merged));
      if (beforeLen !== storedHolidays.length) {
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.HOLIDAYS } }));
      }
    } catch (e) {
      console.error('Error syncing holiday database:', e);
    }
  }
  if (!localStorage.getItem(KEYS.APPRECIATIONS)) {
    localStorage.setItem(KEYS.APPRECIATIONS, JSON.stringify(INITIAL_APPRECIATIONS));
  }
  if (!localStorage.getItem(KEYS.PROJECTS)) {
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
  }
  if (!localStorage.getItem(KEYS.TASKS)) {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
  } else {
    try {
      const storedTasks = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
      const legacyTitles = [
        'green text',
        'helllo',
        'hello',
        'hero page',
        'generate dashboard',
        'design system token definition & ui kit',
        'setup mongodb atlas connection & schema seeders',
        'general management & team review',
        'backlink',
        'home page',
        'bookmarking 20'
      ];
      // Strictly purge legacy mock/test tasks: CPC-0, TSK-1 to TSK-7, etc.
      const sanitized = (storedTasks || []).filter(t => {
        if (!t) return false;
        const title = (t.title || '').toLowerCase().trim();
        const code = (t.taskCode || '').toUpperCase().trim();
        if (legacyTitles.includes(title)) return false;
        if (title.includes('token definition') || title.includes('schema seeders') || title.includes('bookmarking')) return false;
        if (code === 'CPC-0' || t._id === 'tsk_003' || code.startsWith('MOCK')) return false;
        return true;
      });
      if (sanitized.length !== storedTasks.length) {
        localStorage.setItem(KEYS.TASKS, JSON.stringify(sanitized));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      }
    } catch (e) {
      console.error('Error syncing tasks state:', e);
    }
  }

  // Remove any legacy hrms_tasks key from old versions
  try {
    localStorage.removeItem('hrms_tasks');
  } catch (e) {}
  if (!localStorage.getItem(KEYS.TIMESHEETS)) {
    localStorage.setItem(KEYS.TIMESHEETS, JSON.stringify(INITIAL_TIMESHEETS));
  } else {
    try {
      const storedTs = JSON.parse(localStorage.getItem(KEYS.TIMESHEETS));
      let tsMod = false;
      const todayIso = new Date().toISOString().split('T')[0];
      const sanitizedTs = (storedTs || []).filter(ts => {
        // Remove bogus 21600s (6h) timesheet entry auto-created for today by old completeTask bug
        if ((ts.date === todayIso || ts.createdAt?.startsWith(todayIso)) && (ts.totalDurationSeconds === 21600 || ts.totalDurationText === '06:00:00')) {
          tsMod = true;
          return false;
        }
        return true;
      });
      if (tsMod) {
        localStorage.setItem(KEYS.TIMESHEETS, JSON.stringify(sanitizedTs));
      }
    } catch (e) {}
  }
  if (!localStorage.getItem(KEYS.TICKETS)) {
    localStorage.setItem(KEYS.TICKETS, JSON.stringify(INITIAL_TICKETS));
  }
  if (!localStorage.getItem(KEYS.NOTICES)) {
    localStorage.setItem(KEYS.NOTICES, JSON.stringify(INITIAL_NOTICES));
  }
  if (!localStorage.getItem(KEYS.EVENTS)) {
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
  }
  if (!localStorage.getItem(KEYS.BIRTHDAYS)) {
    localStorage.setItem(KEYS.BIRTHDAYS, JSON.stringify(INITIAL_BIRTHDAYS));
  }
  if (!localStorage.getItem(KEYS.WFH)) {
    localStorage.setItem(KEYS.WFH, JSON.stringify(INITIAL_WFH_EMPLOYEES));
  }
  if (!localStorage.getItem(KEYS.WEEKLY_TIMELOGS)) {
    localStorage.setItem(KEYS.WEEKLY_TIMELOGS, JSON.stringify(INITIAL_WEEKLY_TIMELOGS));
  }
  if (!localStorage.getItem(KEYS.LEADS)) {
    localStorage.setItem(KEYS.LEADS, JSON.stringify(INITIAL_LEADS));
  }
  if (!localStorage.getItem(KEYS.EXPENSES)) {
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
  }
  if (!localStorage.getItem(KEYS.CONVERSATIONS)) {
    localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(INITIAL_CONVERSATIONS));
  }
  if (!localStorage.getItem(KEYS.EMERGENCY_CONTACTS)) {
    localStorage.setItem(KEYS.EMERGENCY_CONTACTS, JSON.stringify(INITIAL_EMERGENCY_CONTACTS));
  }
  if (!localStorage.getItem(KEYS.STICKY_NOTES)) {
    localStorage.setItem(KEYS.STICKY_NOTES, JSON.stringify(INITIAL_STICKY_NOTES));
  }
  if (!localStorage.getItem(KEYS.ATTENDANCE_AUDIT)) {
    localStorage.setItem(KEYS.ATTENDANCE_AUDIT, JSON.stringify([]));
  } else {
    try {
      const storedAudit = JSON.parse(localStorage.getItem(KEYS.ATTENDANCE_AUDIT) || '[]');
      const cleanedAudit = (storedAudit || []).filter(a =>
        a && !a.employeeName?.includes('Rahul') && !a.employeeName?.includes('Priya') && !a.employeeName?.includes('Sneha') && !a.employeeName?.includes('Amit')
      );
      if (cleanedAudit.length !== storedAudit.length) {
        localStorage.setItem(KEYS.ATTENDANCE_AUDIT, JSON.stringify(cleanedAudit));
      }
    } catch (e) {}
  }

  if (!localStorage.getItem(KEYS.DOCUMENTS)) {
    localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify([
      {
        id: 'DOC-1',
        title: 'IT & Cloud Infrastructure Acceptable Use Policy',
        docType: 'Company Policy',
        employeeName: 'Inforag Technology',
        employeeCode: 'ADM-001',
        department: 'Management',
        fileName: 'it_infrastructure_acceptable_policy_2026.pdf',
        fileSize: '1.4 MB',
        uploadDate: '2026-01-01',
        status: 'verified'
      },
      {
        id: 'DOC-2',
        title: 'Employee Code of Conduct & Remote Operations Manual',
        docType: 'Handbook',
        employeeName: 'Human Resources',
        employeeCode: 'ADM-001',
        department: 'Human Resources',
        fileName: 'code_of_conduct_remote_ops_2026.pdf',
        fileSize: '2.1 MB',
        uploadDate: '2026-01-01',
        status: 'verified'
      }
    ]));
  } else {
    try {
      const storedDocs = JSON.parse(localStorage.getItem(KEYS.DOCUMENTS) || '[]');
      const cleanedDocs = (storedDocs || []).filter(d =>
        d && !d.employeeName?.includes('Priya') && !d.employeeName?.includes('Rahul') && !d.employeeName?.includes('Sneha') && !d.employeeName?.includes('Amit')
      );
      if (cleanedDocs.length !== storedDocs.length) {
        localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(cleanedDocs));
      }
    } catch (e) {}
  }

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
 * Clear all dummy tasks, projects, leads, tickets, leaves, expenses, and notices
 * while preserving system user accounts so the user can enter fresh real data.
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
    
    // Retain only Master Admin user
    saveCollection(KEYS.EMPLOYEES, INITIAL_EMPLOYEES);

    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'all' } }));
    return true;
  } catch (err) {
    console.error('Error clearing dummy data:', err);
    return false;
  }
};

export { KEYS };

