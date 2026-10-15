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
  ATTENDANCE_AUDIT: 'ems_attendance_audit_logs'
};

export const purgeStaleMockData = () => {
  try {
    const authSession = localStorage.getItem('ems_auth_session');
    if (authSession && (authSession.includes('Avinash') || authSession.includes('emp_admin') || authSession.includes('emp_001'))) {
      localStorage.removeItem('ems_auth_session');
    }

    const empRaw = localStorage.getItem(KEYS.EMPLOYEES);
    if (empRaw && empRaw.includes('Avinash')) {
      localStorage.removeItem(KEYS.EMPLOYEES);
    }

    const tasksRaw = localStorage.getItem(KEYS.TASKS);
    if (tasksRaw && tasksRaw.includes('Avinash')) {
      localStorage.removeItem(KEYS.TASKS);
    }

    const timesheetsRaw = localStorage.getItem(KEYS.TIMESHEETS);
    if (timesheetsRaw && timesheetsRaw.includes('Avinash')) {
      localStorage.removeItem(KEYS.TIMESHEETS);
    }

    Object.keys(localStorage).forEach(key => {
      if (key.includes('emp_001') || key.includes('emp_admin')) {
        localStorage.removeItem(key);
      }
      try {
        const val = localStorage.getItem(key);
        if (typeof val === 'string' && val.includes('Avinash')) {
          localStorage.removeItem(key);
        }
      } catch (err) {}
    });
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
      const storedHolidays = JSON.parse(localStorage.getItem(KEYS.HOLIDAYS)) || [];
      const storedIds = new Set(storedHolidays.map(h => h._id || h.name));
      const missingHolidays = INITIAL_HOLIDAYS.filter(h => !storedIds.has(h._id) && !storedHolidays.some(sh => sh.name === h.name && sh.date === h.date));
      if (missingHolidays.length > 0) {
        const merged = [...storedHolidays, ...missingHolidays];
        localStorage.setItem(KEYS.HOLIDAYS, JSON.stringify(merged));
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
      const storedTasks = JSON.parse(localStorage.getItem(KEYS.TASKS));
      let modified = false;
      const updated = (storedTasks || []).map(t => {
        // Fix: CPC-0 (Bookmarking 20) is a pending/incomplete task, ensure it is not erroneously marked completed
        if ((t.taskCode === 'CPC-0' || t.title === 'Bookmarking 20') && t.status === 'completed') {
          modified = true;
          return {
            ...t,
            status: 'incomplete',
            completedOn: null,
            completedAt: null
          };
        }
        return t;
      });
      if (modified) {
        localStorage.setItem(KEYS.TASKS, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TASKS } }));
      }
    } catch (e) {
      console.error('Error syncing tasks state:', e);
    }
  }

  // Also clean up any legacy hrms_tasks key if present
  try {
    const legacyTasksRaw = localStorage.getItem('hrms_tasks');
    if (legacyTasksRaw) {
      const legacyTasks = JSON.parse(legacyTasksRaw);
      let legacyMod = false;
      const updatedLegacy = (legacyTasks || []).map(t => {
        if ((t.taskCode === 'CPC-0' || t.title === 'Bookmarking 20') && t.status === 'completed') {
          legacyMod = true;
          return { ...t, status: 'incomplete', completedOn: null, completedAt: null };
        }
        return t;
      });
      if (legacyMod) {
        localStorage.setItem('hrms_tasks', JSON.stringify(updatedLegacy));
      }
    }
  } catch (e) {}
  if (!localStorage.getItem(KEYS.TIMESHEETS)) {
    localStorage.setItem(KEYS.TIMESHEETS, JSON.stringify(INITIAL_TIMESHEETS));
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
    localStorage.setItem(KEYS.ATTENDANCE_AUDIT, JSON.stringify([
      {
        _id: 'audit_init_1',
        employeeId: 'emp_003',
        employeeName: 'Rahul Verma',
        employeeCode: 'EMP-003',
        date: '2026-10-12',
        timestamp: '2026-10-12T13:16:00.000Z',
        timeFormatted: '01:16 PM',
        type: 'clock_in',
        action: 'Shift Clock In',
        durationSeconds: 0,
        durationText: '',
        details: 'Shift started on schedule via web portal.',
        actor: 'employee',
        actorId: 'emp_003',
        actorName: 'Rahul Verma',
        isAdminOverride: false,
        adminId: null,
        adminName: null,
        auditNote: null
      },
      {
        _id: 'audit_init_2',
        employeeId: 'emp_003',
        employeeName: 'Rahul Verma',
        employeeCode: 'EMP-003',
        date: '2026-10-12',
        timestamp: '2026-10-12T15:30:00.000Z',
        timeFormatted: '03:30 PM',
        type: 'tea_break_start',
        action: 'Tea Break Started',
        durationSeconds: 0,
        durationText: '',
        details: '15-minute afternoon Tea Break started.',
        actor: 'employee',
        actorId: 'emp_003',
        actorName: 'Rahul Verma',
        isAdminOverride: false,
        adminId: null,
        adminName: null,
        auditNote: null
      },
      {
        _id: 'audit_init_3',
        employeeId: 'emp_003',
        employeeName: 'Rahul Verma',
        employeeCode: 'EMP-003',
        date: '2026-10-12',
        timestamp: '2026-10-12T15:44:30.000Z',
        timeFormatted: '03:44 PM',
        type: 'tea_break_end',
        action: 'Resumed from Tea Break',
        durationSeconds: 870,
        durationText: '14m 30s',
        details: 'Resumed shift on time (within 15m threshold).',
        actor: 'employee',
        actorId: 'emp_003',
        actorName: 'Rahul Verma',
        isAdminOverride: false,
        adminId: null,
        adminName: null,
        auditNote: null
      },
      {
        _id: 'audit_init_4',
        employeeId: 'emp_002',
        employeeName: 'Priya Sharma',
        employeeCode: 'EMP-002',
        date: '2026-10-12',
        timestamp: '2026-10-12T09:30:00.000Z',
        timeFormatted: '09:30 AM',
        type: 'clock_in',
        action: 'Shift Clock In',
        durationSeconds: 0,
        durationText: '',
        details: 'Shift started on schedule via web portal.',
        actor: 'employee',
        actorId: 'emp_002',
        actorName: 'Priya Sharma',
        isAdminOverride: false,
        adminId: null,
        adminName: null,
        auditNote: null
      },
      {
        _id: 'audit_init_5',
        employeeId: 'emp_002',
        employeeName: 'Priya Sharma',
        employeeCode: 'EMP-002',
        date: '2026-10-12',
        timestamp: '2026-10-12T13:00:00.000Z',
        timeFormatted: '01:00 PM',
        type: 'lunch_break_start',
        action: 'Lunch Break Started',
        durationSeconds: 0,
        durationText: '',
        details: 'Standard 45-minute Lunch Break started.',
        actor: 'employee',
        actorId: 'emp_002',
        actorName: 'Priya Sharma',
        isAdminOverride: false,
        adminId: null,
        adminName: null,
        auditNote: null
      },
      {
        _id: 'audit_init_6',
        employeeId: 'emp_002',
        employeeName: 'Priya Sharma',
        employeeCode: 'EMP-002',
        date: '2026-10-12',
        timestamp: '2026-10-12T13:42:00.000Z',
        timeFormatted: '01:42 PM',
        type: 'lunch_break_end',
        action: 'Resumed from Lunch Break',
        durationSeconds: 2520,
        durationText: '42m 00s',
        details: 'Resumed shift on time (within 45m threshold).',
        actor: 'employee',
        actorId: 'emp_002',
        actorName: 'Priya Sharma',
        isAdminOverride: false,
        adminId: null,
        adminName: null,
        auditNote: null
      },
      {
        _id: 'audit_init_7',
        employeeId: 'emp_004',
        employeeName: 'Amit Kumar',
        employeeCode: 'EMP-004',
        date: '2026-10-09',
        timestamp: '2026-10-09T18:45:00.000Z',
        timeFormatted: '06:45 PM',
        type: 'admin_force_clock_out',
        action: 'Admin Force Clock-Out',
        durationSeconds: 28800,
        durationText: '8h 00m',
        details: 'Administrator Admin User [ID: ADM-001] manually forced shift clock-out. Reason: "Employee left premises without clocking out; verified via security gate register."',
        actor: 'admin',
        actorId: 'ADM-001',
        actorName: 'Admin User',
        isAdminOverride: true,
        adminId: 'ADM-001',
        adminName: 'Admin User',
        auditNote: 'Employee left premises without clocking out; verified via security gate register.'
      },
      {
        _id: 'audit_init_8',
        employeeId: 'emp_005',
        employeeName: 'Sneha Patel',
        employeeCode: 'EMP-005',
        date: '2026-10-08',
        timestamp: '2026-10-08T17:15:00.000Z',
        timeFormatted: '05:15 PM',
        type: 'admin_shift_adjustment',
        action: 'Admin Shift Hour Adjustment',
        durationSeconds: 27000,
        durationText: '7.5h',
        details: 'Shift manually adjusted by Admin Admin User (ID: ADM-001). Status: present, In: 09:30:00, Out: 17:00:00. Reason: "Corrected punch discrepancy due to client on-site visit."',
        actor: 'admin',
        actorId: 'ADM-001',
        actorName: 'Admin User',
        isAdminOverride: true,
        adminId: 'ADM-001',
        adminName: 'Admin User',
        auditNote: 'Corrected punch discrepancy due to client on-site visit.'
      }
    ]));
  }

  // ── Seed Live Today Interconnected Demo Data ──
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Ensure all employees exist
    const storedEmps = JSON.parse(localStorage.getItem(KEYS.EMPLOYEES) || '[]');
    const storedEmpIds = new Set(storedEmps.map(e => e._id));
    const missingEmps = INITIAL_EMPLOYEES.filter(e => !storedEmpIds.has(e._id));
    if (missingEmps.length > 0) {
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify([...storedEmps, ...missingEmps]));
    }

    // Ensure today's attendance records exist
    const storedAtt = JSON.parse(localStorage.getItem(KEYS.ATTENDANCE) || '[]');
    const hasTodayAtt = storedAtt.some(a => a.date === todayStr);
    if (!hasTodayAtt) {
      const freshAtt = generateInitialAttendance();
      const todayRecords = freshAtt.filter(a => a.date === todayStr);
      localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([...todayRecords, ...storedAtt]));
    }

    // Ensure tasks are populated with categorized tasks
    const storedTasks = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
    if (storedTasks.length < 8) {
      localStorage.setItem(KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    }

    // Seed Live Clock & Timer snapshots for Team Monitor demo
    const liveTeamDemo = [
      { key: 'EMP-002', isClocked: 'true', isOnBreak: 'false', loginTime: '09:30 AM', workSecs: '24480', taskId: 'tsk_004', taskCode: 'DES-1', title: 'Design System Token Definition & Glassmorphism UI Kit' },
      { key: 'EMP-003', isClocked: 'true', isOnBreak: 'false', loginTime: '09:15 AM', workSecs: '25920', taskId: 'tsk_001', taskCode: 'ERP-1', title: 'Enterprise ERP Core Pipeline & Mongoose Pooling' },
      { key: 'EMP-005', isClocked: 'true', isOnBreak: 'true', breakType: 'Tea Break', loginTime: '09:45 AM', workSecs: '23400' },
      { key: 'EMP-004', isClocked: 'false', hadOut: 'true', loginTime: '09:00 AM', clockOut: '05:30 PM', workSecs: '28800' }
    ];

    liveTeamDemo.forEach(item => {
      if (localStorage.getItem(`ems_timer_${item.key}_is_clocked_in`) === null) {
        localStorage.setItem(`ems_timer_${item.key}_is_clocked_in`, item.isClocked);
        localStorage.setItem(`ems_timer_${item.key}_login_time`, item.loginTime);
        localStorage.setItem(`ems_timer_${item.key}_work_seconds`, item.workSecs);
        localStorage.setItem(`ems_timer_${item.key}_work_session_date`, todayStr);
        if (item.isOnBreak) {
          localStorage.setItem(`ems_timer_${item.key}_is_on_break`, 'true');
          localStorage.setItem(`ems_timer_${item.key}_break_type`, item.breakType || 'Tea Break');
        }
        if (item.hadOut) {
          localStorage.setItem(`ems_timer_${item.key}_had_clocked_out`, 'true');
          localStorage.setItem(`ems_timer_${item.key}_clockout_time`, item.clockOut);
        }
        if (item.taskId) {
          localStorage.setItem(`ems_active_task_timer_${item.key}`, JSON.stringify({
            taskId: item.taskId,
            taskCode: item.taskCode,
            title: item.title,
            timerRunning: true,
            startedAt: Date.now() - 3600000,
            accumulatedSeconds: 3600,
            date: todayStr
          }));
        }
      }
    });
  } catch (err) {
    console.error('Error seeding live demo state:', err);
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

// Generic write with broadcast
export const saveCollection = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key } }));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

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
    
    // Retain only primary admin, hr, and employee users or clear to clean roster
    const primaryUsers = [
      {
        _id: 'emp_admin',
        employeeCode: 'ADM-001',
        name: 'Admin User',
        email: 'admin@inforag.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
        role: 'Administrator',
        systemRole: 'admin',
        department: 'Management',
        status: 'active',
        isCurrentUser: true,
        leaveBalance: { casual: 12, sick: 10, earned: 18, maternity: 0 }
      },
      {
        _id: 'emp_hr',
        employeeCode: 'HR-001',
        name: 'Pooja Sharma',
        email: 'hr@inforag.com',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120',
        role: 'HR Manager',
        systemRole: 'hr',
        department: 'Human Resources',
        status: 'active',
        leaveBalance: { casual: 10, sick: 8, earned: 15, maternity: 0 }
      },
      {
        _id: 'emp_employee',
        employeeCode: 'ENG-001',
        name: 'Rahul Verma',
        email: 'rahul.verma@inforag.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
        role: 'Senior Full Stack Developer',
        systemRole: 'team_member',
        department: 'Engineering',
        status: 'active',
        leaveBalance: { casual: 10, sick: 6, earned: 14, maternity: 0 }
      }
    ];
    saveCollection(KEYS.EMPLOYEES, primaryUsers);

    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: 'all' } }));
    return true;
  } catch (err) {
    console.error('Error clearing dummy data:', err);
    return false;
  }
};

export { KEYS };

