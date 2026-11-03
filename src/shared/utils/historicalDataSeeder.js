/**
 * @file historicalDataSeeder.js
 * @description Generates and maintains mathematically consistent historical attendance and timesheet
 * records for prior days, weeks, and months (September 2026, October 2026, early November 2026).
 *
 * CRITICAL ARCHITECTURE INVARIANTS:
 * 1. NEVER overwrites today's record or today's live shift/task timers.
 * 2. NEVER overwrites existing user-created records.
 * 3. Idempotent: Can run on every boot safely without duplicating entries.
 * 4. Ensures Monthly Matrix, Daily Logs, and DayTimeLogModal never show empty screens for past periods.
 */

import { KEYS, getCollection, saveCollection } from '../services/storageService';

const SEED_VERSION_KEY = 'ems_historical_attendance_seeded_v2';

const BASE_EMPLOYEES = [
  {
    _id: '6ad22399c93908b02fffebe0',
    employeeCode: 'ADM-001',
    name: 'Administrator',
    role: 'Administrator',
    systemRole: 'admin',
    department: 'Management'
  },
  {
    _id: '6ad5b86d4cd8da54d020b12a',
    employeeCode: 'EMP-002',
    name: 'Sandeep Meena',
    role: 'Team Member',
    systemRole: 'team_member',
    department: 'IT & Software Development'
  },
  {
    _id: '6ad363ad24302c31848d32df',
    employeeCode: 'EMP-003',
    name: 'Janvi Hiwse',
    role: 'HR Specialist & Recruiter',
    systemRole: 'hr',
    department: 'Human Resources'
  }
];

const KNOWN_HOLIDAYS_MAP = {
  '2026-09-04': 'Janmashtami',
  '2026-10-02': 'Gandhi Jayanti',
  '2026-10-20': 'Dussehra'
};

const TASK_TEMPLATES = [
  { code: 'TSK-101', title: 'Enterprise RBAC & Permission Matrix Integration', project: 'Inforag ERP Core' },
  { code: 'TSK-102', title: 'Shift Timer Wall-Clock Synchronization & Persistence', project: 'Time & Attendance Engine' },
  { code: 'TSK-103', title: 'MongoDB Atlas Fallback & Cache Optimization', project: 'Cloud Infrastructure' },
  { code: 'TSK-104', title: 'Responsive UI Polish & Multi-Session Punch Logs', project: 'Design System & UX' },
  { code: 'TSK-105', title: 'Security Audit & API Tenant Scoping Review', project: 'Platform Security' },
  { code: 'TSK-106', title: 'Leave Approval Workflow & Balance Reconciliation', project: 'HR Management Suite' }
];

/**
 * Helper to generate all YYYY-MM-DD date strings between start and end
 */
const getDateRange = (startDateStr, endDateStr) => {
  const dates = [];
  const cur = new Date(startDateStr);
  const end = new Date(endDateStr);
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

/**
 * Ensures historical attendance and timesheet records exist in localStorage for past months
 */
export const ensureHistoricalData = () => {
  if (typeof localStorage === 'undefined') return;

  try {
    const isSeeded = localStorage.getItem(SEED_VERSION_KEY);
    const existingAttendance = getCollection(KEYS.ATTENDANCE) || [];
    const existingTimesheets = getCollection(KEYS.TIMESHEETS) || [];

    // Check if we already have records for October 2026
    const hasOctAttendance = existingAttendance.some(a => a.date && a.date.startsWith('2026-10'));
    if (isSeeded && hasOctAttendance && existingAttendance.length > 30) {
      return; // Already populated
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Gather all active employees
    const storedEmployees = getCollection(KEYS.EMPLOYEES) || [];
    const employeeMap = new Map();

    BASE_EMPLOYEES.forEach(e => employeeMap.set(e.employeeCode, e));
    storedEmployees.forEach(e => {
      const code = e.employeeCode || e._id;
      if (code && !employeeMap.has(code)) {
        employeeMap.set(code, {
          _id: e._id || `emp_${code}`,
          employeeCode: code,
          name: e.name || 'Team Member',
          role: e.role || 'Team Member',
          systemRole: e.systemRole || 'team_member',
          department: e.department || 'General'
        });
      }
    });

    const targetEmployees = Array.from(employeeMap.values());

    // Generate dates for September 2026, October 2026, and past November 2026 days
    const allDates = [
      ...getDateRange('2026-09-01', '2026-09-30'),
      ...getDateRange('2026-10-01', '2026-10-31'),
      ...getDateRange('2026-11-01', todayStr)
    ].filter(d => d < todayStr); // Strictly EXCLUDE today!

    const newAttendanceRecords = [];
    const newTimesheetRecords = [];

    // Index existing records by employeeCode + date
    const existingAttSet = new Set(
      existingAttendance.map(a => `${a.employeeCode || a.employeeId}_${a.date}`)
    );
    const existingTsSet = new Set(
      existingTimesheets.map(ts => `${ts.employeeId || ts.employeeName}_${ts.date}_${ts.taskCode}`)
    );

    targetEmployees.forEach((emp, empIdx) => {
      allDates.forEach((dateStr, dayIdx) => {
        const d = new Date(dateStr);
        const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        const isHoliday = Boolean(KNOWN_HOLIDAYS_MAP[dateStr]);
        const key = `${emp.employeeCode || emp._id}_${dateStr}`;

        if (existingAttSet.has(key)) return;

        if (isWeekend) {
          // Weekend - no attendance record needed or recorded as weekend
          return;
        }

        if (isHoliday) {
          newAttendanceRecords.push({
            _id: `att_${emp.employeeCode}_${dateStr}`,
            employeeId: emp._id,
            employeeCode: emp.employeeCode,
            employeeName: emp.name,
            employeeRole: emp.role,
            date: dateStr,
            status: 'holiday',
            clockInTime: null,
            clockIn: null,
            clockOutTime: null,
            clockOut: null,
            isClockedIn: false,
            isOnBreak: false,
            workSeconds: 0,
            totalWorkingHours: 0,
            notes: `Official Holiday: ${KNOWN_HOLIDAYS_MAP[dateStr]}`
          });
          return;
        }

        // Periodic approved leave (e.g. 1 day per month per employee)
        const isLeaveDay = ((dayIdx + empIdx * 7) % 22 === 0);
        if (isLeaveDay) {
          newAttendanceRecords.push({
            _id: `att_${emp.employeeCode}_${dateStr}`,
            employeeId: emp._id,
            employeeCode: emp.employeeCode,
            employeeName: emp.name,
            employeeRole: emp.role,
            date: dateStr,
            status: 'on_leave',
            clockInTime: null,
            clockIn: null,
            clockOutTime: null,
            clockOut: null,
            isClockedIn: false,
            isOnBreak: false,
            workSeconds: 0,
            totalWorkingHours: 0,
            notes: 'Approved Casual Leave'
          });
          return;
        }

        // Regular Working Day: Present or Late
        const isLate = ((dayIdx + empIdx) % 9 === 0);
        const inHour = isLate ? '10:15 AM' : ((dayIdx % 2 === 0) ? '09:30 AM' : '09:45 AM');
        const hasOt = ((dayIdx + empIdx) % 5 === 0);
        const outHour = hasOt ? '07:30 PM' : ((dayIdx % 3 === 0) ? '06:45 PM' : '07:00 PM');

        // Working time calculation
        const grossHrs = hasOt ? 9.75 : ((dayIdx % 3 === 0) ? 8.75 : 9.0);
        const breakSecs = 3600; // 1 hr break
        const netSecs = Math.round((grossHrs * 3600) - breakSecs);
        const netHrs = +(netSecs / 3600).toFixed(2);
        const otSecs = hasOt ? 2700 : 0; // 45m overtime
        const otHrs = hasOt ? 0.75 : 0;

        newAttendanceRecords.push({
          _id: `att_${emp.employeeCode}_${dateStr}`,
          employeeId: emp._id,
          employeeCode: emp.employeeCode,
          employeeName: emp.name,
          employeeRole: emp.role,
          date: dateStr,
          status: isLate ? 'late' : 'present',
          clockInTime: inHour,
          clockIn: inHour,
          clockOutTime: outHour,
          clockOut: outHour,
          isClockedIn: false,
          isOnBreak: false,
          workSeconds: netSecs,
          totalWorkingHours: netHrs,
          breakSeconds: breakSecs,
          overtimeSeconds: otSecs,
          overtimeHours: otHrs,
          hasOvertime: hasOt,
          punchSessions: [
            {
              sessionNumber: 1,
              inTime: inHour,
              outTime: '01:00 PM',
              durationSeconds: Math.round(netSecs * 0.45),
              durationText: `${Math.floor((netSecs * 0.45) / 3600)}h ${Math.floor(((netSecs * 0.45) % 3600) / 60)}m`
            },
            {
              sessionNumber: 2,
              inTime: '02:00 PM',
              outTime: outHour,
              durationSeconds: Math.round(netSecs * 0.55),
              durationText: `${Math.floor((netSecs * 0.55) / 3600)}h ${Math.floor(((netSecs * 0.55) % 3600) / 60)}m`
            }
          ],
          notes: hasOt ? 'Completed shift with 45m approved overtime' : (isLate ? 'Late arrival (traffic delay)' : 'Standard shift completed')
        });

        // Add 1-2 corresponding Timesheet entries for this day
        const task1 = TASK_TEMPLATES[(dayIdx + empIdx) % TASK_TEMPLATES.length];
        const task2 = TASK_TEMPLATES[(dayIdx + empIdx + 2) % TASK_TEMPLATES.length];

        const t1Secs = Math.round(netSecs * 0.55);
        const t2Secs = netSecs - t1Secs;

        const tsKey1 = `${emp._id}_${dateStr}_${task1.code}`;
        if (!existingTsSet.has(tsKey1)) {
          newTimesheetRecords.push({
            _id: `ts_${emp.employeeCode}_${dateStr}_1`,
            taskId: `task_${task1.code}`,
            taskCode: task1.code,
            taskTitle: task1.title,
            projectName: task1.project,
            employeeId: emp._id,
            employeeName: emp.name,
            date: dateStr,
            totalDurationSeconds: t1Secs,
            totalDurationText: `${Math.floor(t1Secs / 3600)}h ${Math.floor((t1Secs % 3600) / 60)}m`,
            memo: 'Milestone deliverables and progress check',
            status: 'completed'
          });
        }

        const tsKey2 = `${emp._id}_${dateStr}_${task2.code}`;
        if (!existingTsSet.has(tsKey2) && t2Secs > 1800) {
          newTimesheetRecords.push({
            _id: `ts_${emp.employeeCode}_${dateStr}_2`,
            taskId: `task_${task2.code}`,
            taskCode: task2.code,
            taskTitle: task2.title,
            projectName: task2.project,
            employeeId: emp._id,
            employeeName: emp.name,
            date: dateStr,
            totalDurationSeconds: t2Secs,
            totalDurationText: `${Math.floor(t2Secs / 3600)}h ${Math.floor((t2Secs % 3600) / 60)}m`,
            memo: 'Implementation, debugging & verification',
            status: 'completed'
          });
        }
      });
    });

    if (newAttendanceRecords.length > 0) {
      const mergedAttendance = [...existingAttendance, ...newAttendanceRecords];
      saveCollection(KEYS.ATTENDANCE, mergedAttendance);
    }

    if (newTimesheetRecords.length > 0) {
      const mergedTimesheets = [...existingTimesheets, ...newTimesheetRecords];
      saveCollection(KEYS.TIMESHEETS, mergedTimesheets);
    }

    localStorage.setItem(SEED_VERSION_KEY, 'true');
    console.log(`✅ Inforag Historical Seeder: Populated ${newAttendanceRecords.length} past attendance & ${newTimesheetRecords.length} past timesheet records.`);
  } catch (err) {
    console.warn('Notice in ensureHistoricalData:', err);
  }
};
