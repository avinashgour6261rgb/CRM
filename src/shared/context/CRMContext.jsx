/**
 * @file CRMContext.jsx
 * @description State Management for CRM modules: Expenses/Finance, Tickets with discussion threads,
 * Events with Automatic Birthday Generation from employee DOB, Team Chat/Messages, Notices, and Dark Mode.
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getCollection, saveCollection, KEYS } from '../services/storageService';
import { useToast } from './ToastContext';
import { useHR } from '../../modules/hr/context/HRContext';
import { getCompanySettings } from '../services/companySettingsService';
import { API_BASE } from '../config/apiConfig';

import { calculateComputedBirthdays, calculateComputedAnniversaries } from '../../modules/crm/utils/celebrationUtils';

const DEFAULT_WEEKLY_TIMELOGS = [
  { day: 'Monday', shortDay: 'Mo', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Tuesday', shortDay: 'Tu', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Wednesday', shortDay: 'We', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Thursday', shortDay: 'Th', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Friday', shortDay: 'Fr', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Saturday', shortDay: 'Sa', date: '', durationText: '0h 00m', durationHours: 0, loginTime: '--', logoutTime: '--', breakDuration: '0m', isCompleted: false },
  { day: 'Sunday', shortDay: 'Su', date: '', durationText: '0h 00m', durationHours: 0, loginTime: 'Off', logoutTime: 'Off', breakDuration: '0m', isDayOff: true }
];

const CRMContext = createContext();

export const CRMProvider = ({ children }) => {
  const { addToast } = useToast();
  const { currentUser, updateEmployee, employees } = useHR();

  // Helper to normalize event objects so undefined values never leak to UI
  const normalizeEvent = (e) => ({
    _id: e._id || `ev_${Math.random()}`,
    eventName: e.eventName || e.title || 'Company Event',
    title: e.title || e.eventName || 'Company Event',
    eventType: e.eventType || e.type || 'Company Event',
    type: e.type || e.eventType || 'Company Event',
    startDate: e.startDate || e.date || new Date().toISOString().split('T')[0],
    date: e.date || e.startDate || new Date().toISOString().split('T')[0],
    endDate: e.endDate || e.startDate || e.date || new Date().toISOString().split('T')[0],
    startTime: e.startTime || e.time || '10:00 AM',
    time: e.time || e.startTime || '10:00 AM',
    location: e.location || 'Headquarters / Main Office',
    description: e.description || '',
    isRecurring: !!e.isRecurring,
    color: e.color || '#2563eb',
    bgColor: e.bgColor || '#eff6ff',
    ...e
  });

  // Core Storage States
  const [expenses, setExpenses] = useState(() => getCollection(KEYS.EXPENSES));
  const [tickets, setTickets] = useState(() => getCollection(KEYS.TICKETS));
  const [notices, setNotices] = useState(() => getCollection(KEYS.NOTICES));
  const [events, setEvents] = useState(() => (getCollection(KEYS.EVENTS) || []).map(normalizeEvent));
  const [conversations, setConversations] = useState(() => getCollection(KEYS.CONVERSATIONS));
  const [activeConversationId, setActiveConversationId] = useState('conv_1');
  const [wfhEmployees, setWfhEmployees] = useState(() => getCollection(KEYS.WFH));
  const [storedWeeklyTimeLogs, setStoredWeeklyTimeLogs] = useState(() => getCollection(KEYS.WEEKLY_TIMELOGS));
  const [leads, setLeads] = useState(() => getCollection(KEYS.LEADS));
  const [emergencyContacts, setEmergencyContacts] = useState(() => getCollection(KEYS.EMERGENCY_CONTACTS));
  const [userSettings, setUserSettings] = useState(() => {
    const saved = localStorage.getItem(KEYS.USER_SETTINGS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      salutation: 'Mr.',
      emailNotifications: 'enable',
      googleCalendar: 'yes',
      country: 'India',
      countryCode: '+91',
      mobile: '',
      language: 'English',
      gender: 'Male',
      dob: '',
      slackId: '',
      maritalStatus: 'Single',
      address: '',
      about: '',
      twoFactorEmail: false,
      twoFactorAuth: false
    };
  });

  const [leadsFilter, setLeadsFilter] = useState({
    search: '',
    status: 'all',
    leadType: 'all',
    leadOwnerId: 'all',
    priority: 'all',
    client: 'all',
    startDate: '',
    endDate: ''
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('ems_dark_mode') === 'true' || localStorage.getItem('ems_theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('ems_dark_mode', darkMode.toString());
    localStorage.setItem('ems_theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark-mode', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-mode', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode', 'dark');
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('dark-mode', 'dark');
      document.body.removeAttribute('data-theme');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      addToast(next ? 'Dark Mode Enabled 🌙' : 'Light Mode Enabled ☀️', 'info');
      return next;
    });
  };

  const getAuthHeaders = () => {
    try {
      const s = localStorage.getItem('ems_auth_session');
      if (!s) return { 'Content-Type': 'application/json' };
      const parsed = JSON.parse(s);
      const u = parsed?.user || parsed;
      return {
        'Content-Type': 'application/json',
        'x-user-id': String(u?._id || u?.id || u?.employeeCode || ''),
        'x-user-role': String(u?.systemRole || (u?.isAdmin ? 'admin' : (u?.department === 'Human Resources' ? 'hr' : 'team_member')))
      };
    } catch {
      return { 'Content-Type': 'application/json' };
    }
  };

  const [storageTick, setStorageTick] = useState(0);
  const [companySettings, setCompanySettings] = useState(getCompanySettings);

  // Sync state with storage
  const syncWithStorage = () => {
    setExpenses(getCollection(KEYS.EXPENSES));
    setTickets(getCollection(KEYS.TICKETS));
    setNotices(getCollection(KEYS.NOTICES));
    setEvents((getCollection(KEYS.EVENTS) || []).map(normalizeEvent));
    setConversations(getCollection(KEYS.CONVERSATIONS));
    setWfhEmployees(getCollection(KEYS.WFH));
    setStoredWeeklyTimeLogs(getCollection(KEYS.WEEKLY_TIMELOGS));
    setLeads(getCollection(KEYS.LEADS));
    setEmergencyContacts(getCollection(KEYS.EMERGENCY_CONTACTS));
    setStorageTick(prev => prev + 1);
  };

  // Synchronize tickets with MongoDB backend
  const loadTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        const remoteTickets = json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(remoteTickets)) {
          const local = getCollection(KEYS.TICKETS) || [];
          const ticketMap = new Map();

          remoteTickets.forEach(t => {
            const key = String(t._id || t.ticketCode);
            ticketMap.set(key, t);
          });

          local.forEach(t => {
            const key = String(t._id || t.ticketCode);
            if (!ticketMap.has(key)) {
              ticketMap.set(key, t);
            } else {
              const remote = ticketMap.get(key);
              if ((t.replies?.length || 0) > (remote.replies?.length || 0)) {
                ticketMap.set(key, { ...remote, replies: t.replies });
              }
            }
          });

          const merged = Array.from(ticketMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          saveCollection(KEYS.TICKETS, merged);
          setTickets(merged);
          return;
        }
      }
    } catch (err) {
      console.warn('[CRMContext] Offline fallback for tickets:', err);
    }
    setTickets(getCollection(KEYS.TICKETS) || []);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    const handleStorageUpdate = (e) => {
      // FIX: Use 'hrms_attendance' (not 'ems_attendance') to match TimerContext dispatch key
      if (['ems_expenses', 'ems_tickets', 'ems_notices', 'ems_events', 'ems_conversations', 'ems_wfh', 'ems_leads', 'ems_emergency_contacts', 'ems_timesheets', 'ems_tasks', 'hrms_attendance'].includes(e.detail?.key)) {
        syncWithStorage();
      }
    };
    const handleSettingsUpdate = () => {
      setCompanySettings(getCompanySettings());
      setStorageTick(prev => prev + 1);
    };

    window.addEventListener('hrms_storage_change', handleStorageUpdate);
    window.addEventListener('company-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('hrms_storage_change', handleStorageUpdate);
      window.removeEventListener('company-settings-updated', handleSettingsUpdate);
    };
  }, []);

  // Re-compute weekly logs when user clocks in/out, takes breaks, or changes task timers
  useEffect(() => {
    let timeoutId = null;
    const refreshTick = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setStorageTick(prev => prev + 1);
      }, 300);
    };

    window.addEventListener('ems_clocked_in', refreshTick);
    window.addEventListener('ems_clocked_out', refreshTick);
    window.addEventListener('ems_break_started', refreshTick);
    window.addEventListener('ems_break_ended', refreshTick);
    window.addEventListener('ems_force_clock_out', refreshTick);
    window.addEventListener('ems_task_timer_started', refreshTick);
    window.addEventListener('ems_task_timer_paused', refreshTick);
    window.addEventListener('ems_task_timer_stopped', refreshTick);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('ems_clocked_in', refreshTick);
      window.removeEventListener('ems_clocked_out', refreshTick);
      window.removeEventListener('ems_break_started', refreshTick);
      window.removeEventListener('ems_break_ended', refreshTick);
      window.removeEventListener('ems_force_clock_out', refreshTick);
      window.removeEventListener('ems_task_timer_started', refreshTick);
      window.removeEventListener('ems_task_timer_paused', refreshTick);
      window.removeEventListener('ems_task_timer_stopped', refreshTick);
    };
  }, []);

  // =========================================================================
  // 🎂 AUTOMATIC BIRTHDAY & ANNIVERSARY ENGINE (Pure Calculation Helper)
  // =========================================================================
  const computedBirthdays = useMemo(() => calculateComputedBirthdays(employees), [employees]);
  const computedAnniversaries = useMemo(() => calculateComputedAnniversaries(employees), [employees]);

  // =========================================================================
  // ⏱️ DYNAMIC WEEKLY TIME LOGS & TASK ACTIVITY ENGINE (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
  // =========================================================================
  const computedWeeklyTimeLogs = useMemo(() => {
    const timesheets = getCollection(KEYS.TIMESHEETS) || [];
    const attendance = getCollection(KEYS.ATTENDANCE) || [];
    const settings = getCompanySettings();
    const standardWorkHours = Number(settings.standardWorkHours) || 9;
    const shiftStart = settings.shiftStartTime || '10:00 AM';
    const shiftEnd = settings.shiftEndTime || '07:00 PM';

    const now = new Date();
    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatLocalDate(now);
    const todayDayIndex = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    // Mon = 0, Tue = 1, Wed = 2, Thu = 3, Fri = 4, Sat = 5, Sun = 6
    const currentDayOffset = todayDayIndex === 0 ? 6 : todayDayIndex - 1;

    // Calculate current week's Monday purely in local calendar dates
    const mondayDiff = todayDayIndex === 0 ? -6 : 1 - todayDayIndex;
    const mondayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayDiff);

    const dayMeta = [
      { day: 'Monday', shortDay: 'Mo', offset: 0 },
      { day: 'Tuesday', shortDay: 'Tu', offset: 1 },
      { day: 'Wednesday', shortDay: 'We', offset: 2 },
      { day: 'Thursday', shortDay: 'Th', offset: 3 },
      { day: 'Friday', shortDay: 'Fr', offset: 4 },
      { day: 'Saturday', shortDay: 'Sa', offset: 5 },
      { day: 'Sunday', shortDay: 'Su', offset: 6, isSunday: true, isDayOff: true }
    ];

    return dayMeta.map(item => {
      const dayDateObj = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + item.offset);
      const dateStr = formatLocalDate(dayDateObj);
      const isCurrentDay = item.offset === currentDayOffset;
      const isPastDay = item.offset < currentDayOffset;
      const isFutureDay = item.offset > currentDayOffset;

      // Special rule: Sunday is always an official Holiday / Day Off
      if (item.isSunday) {
        return {
          day: 'Sunday',
          shortDay: 'Su',
          date: dateStr,
          durationText: '0h 00m',
          durationHours: 0,
          loginTime: 'Off',
          logoutTime: 'Off',
          clockInsCount: 0,
          clockOutsCount: 0,
          breakDuration: '0m',
          breaksCount: 0,
          teaBreaksCount: 0,
          lunchBreaksCount: 0,
          isSunday: true,
          isDayOff: true,
          isCurrentDay,
          tasksWorked: []
        };
      }

      // Find matching timesheet logs for this date strictly scoped to authenticated user
      const matchingTimesheets = timesheets.filter(t => {
        if (t.date !== dateStr && !t.createdAt?.startsWith(dateStr)) return false;
        if (!currentUser) return true;
        const cId = currentUser._id ? String(currentUser._id).toLowerCase() : null;
        const cCode = currentUser.employeeCode ? String(currentUser.employeeCode).toLowerCase() : null;
        const cName = currentUser.name ? currentUser.name.toLowerCase().trim() : null;

        const tEmpId = t.employeeId ? String(t.employeeId).toLowerCase() : (t.employee ? String(t.employee._id || t.employee).toLowerCase() : null);
        const tEmpCode = t.employeeCode ? String(t.employeeCode).toLowerCase() : null;
        const tEmpName = t.employeeName ? t.employeeName.toLowerCase().trim() : null;

        if (cId && (tEmpId === cId || String(t.employee) === cId)) return true;
        if (cCode && (tEmpId === cCode || tEmpCode === cCode)) return true;
        if (cName && tEmpName && (tEmpName === cName || tEmpName.includes(cName) || cName.includes(tEmpName))) return true;
        return false;
      });
      let timesheetTaskSeconds = matchingTimesheets.reduce((acc, curr) => acc + (Number(curr.totalDurationSeconds) || 0), 0);

      const allTasks = getCollection(KEYS.TASKS) || [];
      const userKey = currentUser?.employeeCode || (currentUser?._id ? String(currentUser._id) : 'ADM-001');
      const isClockedInToday = localStorage.getItem(`ems_timer_${userKey}_is_clocked_in`) === 'true';
      const hadClockedOutToday = localStorage.getItem(`ems_timer_${userKey}_had_clocked_out`) === 'true';
      const rawBreakSecs = Number(localStorage.getItem(`ems_timer_${userKey}_break_seconds`)) || 0;
      let todayBreakHistory = [];
      try {
        todayBreakHistory = JSON.parse(localStorage.getItem(`ems_timer_${userKey}_break_history`) || '[]');
      } catch (e) {}

      // Helper to check if task belongs to user
      const isTaskForMe = (t) => {
        if (!t) return false;
        const cId = currentUser?._id ? String(currentUser._id) : null;
        const cCode = currentUser?.employeeCode ? String(currentUser.employeeCode) : null;
        const cName = currentUser?.name ? currentUser.name.toLowerCase().trim() : null;
        if (cId && (String(t.assignedToId) === cId || String(t.assignedTo) === cId)) return true;
        if (cCode && (t.assignedToId === cCode || t.assignedTo === cCode)) return true;
        if (cName && t.assignedToName && t.assignedToName.toLowerCase().trim() === cName) return true;
        if (Array.isArray(t.assignedToIds) && (cId && t.assignedToIds.includes(cId) || cCode && t.assignedToIds.includes(cCode))) return true;
        if (Array.isArray(t.assignees) && t.assignees.some(a => (cId && String(a._id) === cId) || (cCode && a.employeeCode === cCode))) return true;
        return false;
      };

      // Default baseline hours for working days
      let finalDurationText = '0h 00m';
      let finalDurationHours = 0;
      let dayLoginTime = shiftStart;
      let dayLogoutTime = shiftEnd;
      let dayBreakDuration = '0m';
      let dayTeaBreaks = 0;
      let dayLunchBreaks = 0;
      let dayClockIns = 0;
      let dayClockOuts = 0;

      // Helper: match an attendance record to the current user
      const isMyAttRecord = (a) =>
        (currentUser?._id && (String(a.employeeId) === String(currentUser._id) || a.employeeId === currentUser.employeeCode)) ||
        (currentUser?.employeeCode && a.employeeId === currentUser.employeeCode) ||
        (currentUser?.name && a.employeeName?.toLowerCase() === currentUser.name.toLowerCase());

      // Task calculation based on user request:
      // "week logs me total day wise task ke anusar time count hoga or duration me bhi total task or uske time kitni der me khatam kiya agar task time 1 hour hai or tumne 1:30 laga diye to wo bhi count hote jayega or nest task kiya usna time plus ho jayega"
      let dayTotalTaskSeconds = timesheetTaskSeconds;
      let activeTimerTask = null;
      let liveActiveTimerSecs = 0;
      let dayTasks = [];
      // Also find any tasks completed on this date that aren't already captured in timesheets
      const matchingCompletedTasks = allTasks.filter(t => {
        if (!isTaskForMe(t)) return false;
        const isCompletedOnDate = t.completedOn === dateStr || (t.completedAt && String(t.completedAt).startsWith(dateStr));
        const alreadyInTimesheets = matchingTimesheets.some(ts => ts.taskId === t._id || ts.taskCode === t.taskCode);
        return isCompletedOnDate && !alreadyInTimesheets;
      });

      if (isCurrentDay) {
        const rawLogin = localStorage.getItem(`ems_timer_${userKey}_login_time`);
        const rawLogout = localStorage.getItem(`ems_timer_${userKey}_clockout_time`);
        const todayAttRec = attendance.find(a => a.date === dateStr && isMyAttRecord(a));
        dayLoginTime = rawLogin || todayAttRec?.clockInTime || todayAttRec?.clockIn || (isClockedInToday ? 'Active' : '--');
        dayLogoutTime = rawLogout || todayAttRec?.clockOutTime || todayAttRec?.clockOut || (isClockedInToday ? 'Active / In Progress' : (hadClockedOutToday ? (rawLogout || '--') : '--'));
        dayClockIns = isClockedInToday || hadClockedOutToday ? 1 : 0;
        dayClockOuts = hadClockedOutToday ? 1 : 0;

        const bHrs = Math.floor(rawBreakSecs / 3600);
        const bMins = Math.floor((rawBreakSecs % 3600) / 60);
        dayBreakDuration = bHrs > 0 ? `${bHrs}h ${bMins}m` : (bMins > 0 ? `${bMins}m` : '0m');
        dayTeaBreaks = todayBreakHistory.filter(b => b.type?.toLowerCase().includes('tea')).length;
        dayLunchBreaks = todayBreakHistory.filter(b => b.type?.toLowerCase().includes('lunch')).length;

        // 1. Check live active task timer from localStorage
        const activeTimerKey = `ems_active_task_timer_${userKey}`;
        let activeTimer = null;
        try {
          activeTimer = JSON.parse(localStorage.getItem(activeTimerKey) || localStorage.getItem('ems_active_task_timer') || 'null');
        } catch (e) {}

        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const todayMidnightMs = todayMidnight.getTime();

        if (activeTimer && activeTimer.date === dateStr && (isClockedInToday || hadClockedOutToday)) {
          const nowMs = Date.now();
          const isStartedToday = activeTimer.startedAt && Number(activeTimer.startedAt) >= todayMidnightMs;
          const runningElapsed = activeTimer.timerRunning && isStartedToday
            ? Math.max(0, Math.floor((nowMs - Number(activeTimer.startedAt)) / 1000))
            : 0;
          const liveActiveTimerSecs = (Number(activeTimer.accumulatedSeconds) || 0) + runningElapsed;
          activeTimerTask = activeTimer;

          const timesheetsForThisTask = matchingTimesheets
            .filter(ts => String(ts.taskId) === String(activeTimer.taskId) || (activeTimer.taskCode && ts.taskCode === activeTimer.taskCode))
            .reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);

          const otherDaysLogged = (timesheets || [])
            .filter(ts => (String(ts.taskId) === String(activeTimer.taskId) || (activeTimer.taskCode && ts.taskCode === activeTimer.taskCode)) && ts.date !== dateStr)
            .reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);

          const dayPortion = Math.max(0, liveActiveTimerSecs - otherDaysLogged);
          const unsubmitted = Math.max(0, dayPortion - timesheetsForThisTask);
          dayTotalTaskSeconds += unsubmitted;
        }

        // 2. Check any other paused or worked tasks today (strictly tasks worked today!)
        if (isClockedInToday || hadClockedOutToday) {
          allTasks.forEach(t => {
            if (!isTaskForMe(t)) return;
            const tId = String(t._id || t.id);
            if (activeTimerTask && (String(activeTimerTask.taskId) === tId || String(activeTimerTask._id) === tId)) return;

            // Strict guard: Skip tasks completed on other days
            const isCompletedToday = t.completedOn === dateStr || (t.completedAt && String(t.completedAt).startsWith(dateStr));
            if (t.status === 'completed' && !isCompletedToday) return;

            // Only consider tasks explicitly worked/paused on this date or completed today
            const isWorkedToday = (t.sessionDate === dateStr && !t.completedAt) || isCompletedToday;
            if (!isWorkedToday) return;

            const timesheetsForThisTask = matchingTimesheets
              .filter(ts => String(ts.taskId) === tId || (t.taskCode && ts.taskCode === t.taskCode))
              .reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);

            const otherDaysLogged = (timesheets || [])
              .filter(ts => (String(ts.taskId) === tId || (t.taskCode && ts.taskCode === t.taskCode)) && ts.date !== dateStr)
              .reduce((s, ts) => s + (Number(ts.totalDurationSeconds) || 0), 0);

            const taskSecs = Number(t.timerSeconds) || Number(t.accumulatedSeconds) || Number(t.durationSeconds) || 0;
            const dayPortion = Math.max(0, taskSecs - otherDaysLogged);
            const unsubmitted = Math.max(0, dayPortion - timesheetsForThisTask);
            dayTotalTaskSeconds += unsubmitted;
          });
        }
      } else {
        const completedTaskSeconds = matchingCompletedTasks.reduce((acc, curr) => {
          const secs = Number(curr.timerSeconds) > 0
            ? Number(curr.timerSeconds)
            : (Number(curr.durationSeconds) > 0
                ? Number(curr.durationSeconds)
                : (Number(curr.hoursLogged) > 0 ? Math.round(Number(curr.hoursLogged) * 3600) : 0));
          return acc + secs;
        }, 0);

        dayTotalTaskSeconds += completedTaskSeconds;

        // Also check any tasks worked on this past date that were not marked completed
        allTasks.forEach(t => {
          if (!isTaskForMe(t)) return;
          const tId = String(t._id || t.id);
          const isWorkedOnDate = t.sessionDate === dateStr;
          if (!isWorkedOnDate) return;

          const alreadyInTimesheets = matchingTimesheets.some(ts => String(ts.taskId) === tId || (t.taskCode && ts.taskCode === t.taskCode));
          const alreadyInCompleted = matchingCompletedTasks.some(ct => String(ct._id || ct.id) === tId);
          if (alreadyInTimesheets || alreadyInCompleted) return;

          const secs = Number(t.timerSeconds) > 0
            ? Number(t.timerSeconds)
            : (Number(t.accumulatedSeconds) > 0
                ? Number(t.accumulatedSeconds)
                : (Number(t.hoursLogged) > 0 ? Math.round(Number(t.hoursLogged) * 3600) : 0));
          if (secs > 0) {
            dayTotalTaskSeconds += secs;
            const estH = t.estimatedHours || 3;
            const loggedH = secs / 3600;
            const isOver = loggedH > estH;
            dayTasks.push({
              taskId: t._id,
              taskCode: t.taskCode || 'TSK',
              taskTitle: t.title || 'Worked Task',
              projectName: t.projectName || 'General Work',
              durationText: `${Math.floor(secs / 3600)}h ${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}m`,
              durationSeconds: secs,
              estimatedHours: estH,
              isOverBudget: isOver,
              overBudgetHours: isOver ? +(loggedH - estH).toFixed(1) : 0,
              startTime: shiftStart,
              endTime: shiftEnd,
              memo: `Worked on task: ${Math.floor(secs / 60)} mins tracked`,
              employeeName: t.assignedToName || currentUser?.name || 'Employee',
              status: t.status || 'in_progress',
              isCompleted: false
            });
          }
        });
      }

      // Map tasks worked with budget estimate comparison
      if (matchingTimesheets.length > 0) {
        const mappedTimesheets = matchingTimesheets.map(t => {
          const matchedTask = allTasks.find(at => at._id === t.taskId || at.taskCode === t.taskCode);
          const estH = matchedTask?.estimatedHours || 3;
          const loggedH = (t.totalDurationSeconds || 0) / 3600;
          const isOver = loggedH > estH;
          return {
            taskId: t.taskId,
            taskCode: t.taskCode || 'TSK',
            taskTitle: t.taskTitle || 'Assigned Work',
            projectName: t.projectName || 'General Work',
            durationText: t.totalDurationText || `${Math.floor((t.totalDurationSeconds || 0) / 60)}m`,
            durationSeconds: t.totalDurationSeconds || 0,
            estimatedHours: estH,
            isOverBudget: isOver,
            overBudgetHours: isOver ? +(loggedH - estH).toFixed(1) : 0,
            startTime: t.startTime || shiftStart,
            endTime: t.endTime || shiftEnd,
            memo: t.memo || 'Work session',
            employeeName: t.employeeName || currentUser?.name || 'Employee',
            status: 'completed',
            isCompleted: true
          };
        });
        dayTasks = [...dayTasks, ...mappedTimesheets];
      }

      matchingCompletedTasks.forEach(t => {
        const secs = Number(t.timerSeconds) > 0 ? Number(t.timerSeconds) : 0;
        if (secs <= 0) return; // Do not add fake entries for un-timed tasks
        const estH = t.estimatedHours || Math.round(secs / 3600) || 3;
        const loggedH = secs / 3600;
        const isOver = loggedH > estH;
        dayTasks.push({
          taskId: t._id,
          taskCode: t.taskCode || 'TSK',
          taskTitle: t.title || 'Completed Task',
          projectName: t.projectName || 'General Work',
          durationText: `${Math.floor(secs / 3600)}h ${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}m`,
          durationSeconds: secs,
          estimatedHours: estH,
          isOverBudget: isOver,
          overBudgetHours: isOver ? +(loggedH - estH).toFixed(1) : 0,
          startTime: shiftStart,
          endTime: shiftEnd,
          memo: `Completed task: ${t.title}`,
          employeeName: t.assignedToName || currentUser?.name || 'Employee',
          status: 'completed',
          isCompleted: true
        });
      });

      if (isCurrentDay) {
        // Paused tasks worked today that haven't been stopped into timesheets yet
        const pausedTasks = (isClockedInToday || hadClockedOutToday) ? allTasks.filter(t => {
          if (!isTaskForMe(t)) return false;
          if (activeTimerTask && (String(activeTimerTask.taskId) === String(t._id) || String(activeTimerTask._id) === String(t._id))) return false;
          const alreadyInTimesheets = matchingTimesheets.some(ts => ts.taskId === t._id);
          const alreadyInCompleted = matchingCompletedTasks.some(ct => ct._id === t._id);
          const secs = Number(t.timerSeconds) || Number(t.accumulatedSeconds) || 0;
          return !alreadyInTimesheets && !alreadyInCompleted && secs > 0 && (t.sessionDate === dateStr || t.timerRunning);
        }) : [];

        pausedTasks.forEach(pt => {
          const secs = Number(pt.timerSeconds) || 0;
          const estH = pt.estimatedHours || 3;
          const loggedH = secs / 3600;
          const isOver = loggedH > estH;
          dayTasks.push({
            taskId: pt._id,
            taskCode: pt.taskCode || 'TSK',
            taskTitle: pt.title || 'Worked Task',
            projectName: pt.projectName || 'General Work',
            durationText: `${Math.floor(secs / 3600)}h ${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}m`,
            durationSeconds: secs,
            estimatedHours: estH,
            isOverBudget: isOver,
            overBudgetHours: isOver ? +(loggedH - estH).toFixed(1) : 0,
            startTime: shiftStart,
            endTime: 'Paused ⏸️',
            memo: `Worked on task: ${Math.floor(secs / 60)} mins tracked`,
            employeeName: pt.assignedToName || currentUser?.name || 'Employee',
            status: 'on_hold',
            isCompleted: false,
            timerRunning: false
          });
        });

        // Shift work seconds guard: Ensure valid tracking without artificially clamping independent task time
        const rawShiftWorkSecs = Number(localStorage.getItem(`ems_timer_${userKey}_work_seconds`)) || 0;
        const isOnBreakToday = localStorage.getItem(`ems_timer_${userKey}_is_on_break`) === 'true';
        if (!isClockedInToday && !isOnBreakToday && !hadClockedOutToday && rawShiftWorkSecs === 0 && matchingTimesheets.length === 0 && !activeTimerTask) {
          dayTotalTaskSeconds = 0;
        }

        if (dayTotalTaskSeconds > 0) {
          const hrs = Math.floor(dayTotalTaskSeconds / 3600);
          const mins = Math.floor((dayTotalTaskSeconds % 3600) / 60);
          finalDurationText = `${hrs}h ${String(mins).padStart(2, '0')}m`;
          finalDurationHours = +(dayTotalTaskSeconds / 3600).toFixed(2);
        } else {
          finalDurationText = '0h 00m';
          finalDurationHours = 0;
        }

        if (activeTimerTask) {
          const runningTaskObj = allTasks.find(at => at._id === activeTimerTask.taskId || at._id === activeTimerTask._id);
          const estH = runningTaskObj?.estimatedHours || 3;
          const loggedH = liveActiveTimerSecs / 3600;
          const isOver = loggedH > estH;
          dayTasks.unshift({
            taskId: activeTimerTask.taskId,
            taskCode: activeTimerTask.taskCode || 'TSK',
            taskTitle: activeTimerTask.title || 'Current Task',
            projectName: activeTimerTask.projectName || 'Active Project',
            durationText: `${Math.floor(liveActiveTimerSecs / 3600)}h ${String(Math.floor((liveActiveTimerSecs % 3600) / 60)).padStart(2, '0')}m`,
            durationSeconds: liveActiveTimerSecs,
            estimatedHours: estH,
            isOverBudget: isOver,
            overBudgetHours: isOver ? +(loggedH - estH).toFixed(1) : 0,
            startTime: shiftStart,
            endTime: 'Running Now 🟢',
            memo: 'Active Timer Running',
            employeeName: currentUser?.name || 'Employee',
            status: 'in_progress',
            isCompleted: false
          });
        }
      } else if (dayTotalTaskSeconds > 0) {
        // If tasks or timesheets were recorded for this day, strictly use actual task hours
        const pastAttRec = attendance.find(a => a.date === dateStr && isMyAttRecord(a));
        const hrs = Math.floor(dayTotalTaskSeconds / 3600);
        const mins = Math.floor((dayTotalTaskSeconds % 3600) / 60);
        finalDurationText = `${hrs}h ${String(mins).padStart(2, '0')}m`;
        finalDurationHours = +(dayTotalTaskSeconds / 3600).toFixed(2);
        dayBreakDuration = pastAttRec?.totalBreakHours ? `${Math.round(pastAttRec.totalBreakHours * 60)}m` : '0m';

        if (pastAttRec) {
          if (pastAttRec.clockInTime) dayLoginTime = pastAttRec.clockInTime;
          if (pastAttRec.clockOutTime) dayLogoutTime = pastAttRec.clockOutTime;
        }
      } else if (isPastDay) {
        // For past working days: Strictly check if employee has actual logged attendance or timesheets
        const pastAttRec = attendance.find(a => a.date === dateStr && isMyAttRecord(a));
        const rawWorkHours = pastAttRec
          ? (Number(pastAttRec.totalWorkingHours) > 0
              ? Number(pastAttRec.totalWorkingHours)
              : (Number(pastAttRec.workSeconds) > 0 ? Number(pastAttRec.workSeconds) / 3600 : 0))
          : 0;
        const hasRealAttendanceHours = pastAttRec &&
          pastAttRec.status !== 'absent' &&
          pastAttRec.status !== 'on_leave' &&
          pastAttRec.status !== 'day_off' &&
          rawWorkHours > 0;

        if (hasRealAttendanceHours) {
          const workHours = rawWorkHours;
          dayTotalTaskSeconds = Math.round(workHours * 3600);
          const hrs = Math.floor(dayTotalTaskSeconds / 3600);
          const mins = Math.floor((dayTotalTaskSeconds % 3600) / 60);
          finalDurationText = `${hrs}h ${String(mins).padStart(2, '0')}m`;
          finalDurationHours = +workHours.toFixed(2);
          dayLoginTime = pastAttRec.clockInTime || '--';
          dayLogoutTime = pastAttRec.clockOutTime || '--';
          dayBreakDuration = pastAttRec?.totalBreakHours ? `${Math.round(pastAttRec.totalBreakHours * 60)}m` : '0m';
        } else {
          // No work or attendance logged for this employee on this past day — strictly 0h 00m
          dayTotalTaskSeconds = 0;
          finalDurationText = '0h 00m';
          finalDurationHours = 0;
          dayLoginTime = pastAttRec?.clockInTime || '--';
          dayLogoutTime = pastAttRec?.clockOutTime || '--';
          dayBreakDuration = '--';
          dayTasks = [];
        }
      }

      return {
        day: item.day,
        shortDay: item.shortDay,
        date: dateStr,
        durationText: finalDurationText,
        durationHours: finalDurationHours,
        durationSeconds: dayTotalTaskSeconds,
        loginTime: dayLoginTime,
        logoutTime: dayLogoutTime,
        clockInsCount: dayClockIns,
        clockOutsCount: dayClockOuts,
        breakDuration: dayBreakDuration,
        breaksCount: dayTeaBreaks + dayLunchBreaks,
        teaBreaksCount: dayTeaBreaks,
        lunchBreaksCount: dayLunchBreaks,
        isCurrentDay,
        isFutureDay,
        isCompleted: isPastDay,
        tasksWorked: dayTasks
      };
    });
  }, [currentUser, storageTick, companySettings]);

  // 💰 FINANCE / EXPENSES MODULE
  // =========================================================================
  const createExpense = async (expenseData) => {
    const currentList = getCollection(KEYS.EXPENSES);
    const nextNum = currentList.length > 0 ? Math.max(...currentList.map(e => e.idNumber || 0)) + 1 : 1;
    const now = new Date();

    const selectedEmployee = employees.find(emp => emp._id === expenseData.employeeId) || currentUser;

    const newExpense = {
      _id: `exp_${Date.now()}`,
      idNumber: nextNum,
      expenseCode: `EXP-${100 + nextNum}`,
      itemName: expenseData.itemName || expenseData.title || 'Office Expense',
      price: Number(expenseData.price || expenseData.amount) || 0,
      amount: Number(expenseData.price || expenseData.amount) || 0,
      category: expenseData.category || 'Utilities & Office',
      purchasedFrom: expenseData.purchasedFrom || 'Vendor Partner',
      purchaseDate: expenseData.purchaseDate || expenseData.date || now.toISOString().split('T')[0],
      date: expenseData.purchaseDate || expenseData.date || now.toISOString().split('T')[0],
      employeeId: selectedEmployee?._id || currentUser?._id || 'emp_001',
      employeeName: selectedEmployee?.name || currentUser?.name || 'Employee',
      employeeAvatar: selectedEmployee?.avatar || currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      paidBy: selectedEmployee?.name || currentUser?.name || 'Employee',
      status: expenseData.status || 'pending',
      description: expenseData.description || '',
      billAttachment: expenseData.billAttachment || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
      createdById: currentUser?._id || 'emp_001',
      createdByName: currentUser?.name || 'Employee',
      createdAt: now.toISOString(),
      ...expenseData
    };

    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?._id) newExpense._id = json.data._id;
      }
    } catch (_) {}

    currentList.unshift(newExpense);
    saveCollection(KEYS.EXPENSES, currentList);
    setExpenses([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EXPENSES } }));
    addToast(`Expense "${newExpense.itemName}" recorded successfully!`, 'success');
    return newExpense;
  };

  const updateExpense = async (expenseId, updateData) => {
    try {
      await fetch(`${API_BASE}/expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.EXPENSES);
    const idx = currentList.findIndex(e => e._id === expenseId);
    if (idx !== -1) {
      currentList[idx] = {
        ...currentList[idx],
        ...updateData,
        price: Number(updateData.price || updateData.amount || currentList[idx].price),
        amount: Number(updateData.price || updateData.amount || currentList[idx].amount),
        updatedAt: new Date().toISOString()
      };
      saveCollection(KEYS.EXPENSES, currentList);
      setExpenses([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EXPENSES } }));
      addToast('Expense record updated successfully!', 'success');
      return currentList[idx];
    }
  };

  const updateExpenseStatus = async (expenseId, status) => {
    try {
      await fetch(`${API_BASE}/expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.EXPENSES);
    const idx = currentList.findIndex(e => e._id === expenseId);
    if (idx !== -1) {
      currentList[idx].status = status;
      currentList[idx].updatedAt = new Date().toISOString();
      saveCollection(KEYS.EXPENSES, currentList);
      setExpenses([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EXPENSES } }));
      addToast(`Expense status marked as ${status.toUpperCase()}`, status === 'approved' ? 'success' : 'info');
    }
  };

  const deleteExpense = async (expenseId) => {
    try {
      await fetch(`${API_BASE}/expenses/${expenseId}`, { method: 'DELETE' });
    } catch (_) {}

    const currentList = getCollection(KEYS.EXPENSES);
    const filtered = currentList.filter(e => e._id !== expenseId);
    saveCollection(KEYS.EXPENSES, filtered);
    setExpenses(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EXPENSES } }));
    addToast('Expense record removed', 'info');
  };

  const importExpensesBatch = async (importedList) => {
    const currentList = getCollection(KEYS.EXPENSES);
    let maxNum = currentList.length > 0 ? Math.max(...currentList.map(e => e.idNumber || 0)) : 0;
    const now = new Date();

    const formatted = importedList.map((item, idx) => {
      maxNum++;
      return {
        _id: `exp_${Date.now()}_${idx}`,
        idNumber: maxNum,
        expenseCode: `EXP-${100 + maxNum}`,
        itemName: item.itemName || item.title || 'Imported Expense Item',
        price: Number(item.price || item.amount) || 1000,
        amount: Number(item.price || item.amount) || 1000,
        category: item.category || 'Utilities & Office',
        purchasedFrom: item.purchasedFrom || 'Vendor',
        purchaseDate: item.purchaseDate || item.date || now.toISOString().split('T')[0],
        date: item.purchaseDate || item.date || now.toISOString().split('T')[0],
        employeeId: currentUser?._id || 'emp_001',
        employeeName: item.employeeName || item.paidBy || currentUser?.name || 'Employee',
        employeeAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        paidBy: item.paidBy || currentUser?.name || 'Employee',
        status: item.status || 'pending',
        description: item.description || 'Imported via CSV template',
        billAttachment: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500',
        createdById: currentUser?._id || 'emp_001',
        createdByName: currentUser?.name || 'Employee',
        createdAt: now.toISOString()
      };
    });

    const updated = [...formatted, ...currentList];
    saveCollection(KEYS.EXPENSES, updated);
    setExpenses(updated);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EXPENSES } }));
    addToast(`Successfully imported ${formatted.length} expense items!`, 'success');
  };

  // =========================================================================
  // 🎫 TICKETS MODULE (Immediate Admin & Employee Synchronization)
  // =========================================================================
  const createTicket = async (ticketData) => {
    const currentList = getCollection(KEYS.TICKETS) || [];
    const nextNum = currentList.length > 0 ? Math.max(...currentList.map(t => parseInt(t.ticketCode?.replace('TKT-', '') || '1040', 10))) + 1 : 1041;
    const now = new Date();

    const u = currentUser;
    const reqId = String(u?._id || u?.employeeCode || 'emp_001');
    const reqName = u?.name || 'Employee';
    const reqAvatar = u?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
    const reqRole = u?.role || 'Team Member';

    const newTicket = {
      _id: `tkt_${Date.now()}`,
      ticketCode: `TKT-${nextNum}`,
      subject: ticketData.subject || 'Helpdesk Support Request',
      category: ticketData.category || 'General Support',
      priority: ticketData.priority || 'medium',
      description: ticketData.description || 'Support request raised.',
      attachment: ticketData.attachment || '',
      status: 'open',
      department: ticketData.category || 'IT Support',
      requestedById: reqId,
      requestedByName: reqName,
      requestedByAvatar: reqAvatar,
      requestedByRole: reqRole,
      createdBy: reqId,
      createdByName: reqName,
      createdByAvatar: reqAvatar,
      createdByRole: reqRole,
      assignedToId: ticketData.assignedToId || 'emp_005',
      assignedToName: ticketData.assignedToName || 'Amit Kumar (Admin / Support)',
      assignedTo: ticketData.assignedToId || 'emp_005',
      requestedOn: now.toISOString().split('T')[0],
      createdAt: now.toISOString(),
      replies: [],
      internalNotes: [],
      ...ticketData
    };

    try {
      const payload = { ...newTicket };
      delete payload._id;
      const res = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?._id) newTicket._id = String(json.data._id);
        if (json.data?.ticketCode) newTicket.ticketCode = json.data.ticketCode;
      }
    } catch (e) {
      console.warn('[CRMContext] Ticket offline save:', e);
    }

    currentList.unshift(newTicket);
    saveCollection(KEYS.TICKETS, currentList);
    setTickets([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
    addToast(`Ticket "${newTicket.ticketCode}" raised! Admin has been notified immediately.`, 'success');
    return newTicket;
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.TICKETS) || [];
    const idx = currentList.findIndex(t => String(t._id) === String(ticketId) || String(t.id) === String(ticketId) || String(t.ticketCode) === String(ticketId));
    if (idx !== -1) {
      currentList[idx].status = status;
      currentList[idx].updatedAt = new Date().toISOString();
      saveCollection(KEYS.TICKETS, currentList);
      setTickets([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
      addToast(`Ticket status updated to ${status.replace('_', ' ').toUpperCase()}`, 'success');
    }
  };

  const replyToTicket = async (ticketId, messageText) => {
    if (!messageText.trim()) return;
    const currentList = getCollection(KEYS.TICKETS) || [];
    const idx = currentList.findIndex(t => String(t._id) === String(ticketId) || String(t.ticketCode) === String(ticketId));
    if (idx !== -1) {
      const isUserAdmin = currentUser?.role?.toLowerCase().includes('lead') || currentUser?.role?.toLowerCase().includes('director') || currentUser?.role?.toLowerCase().includes('manager') || currentUser?.role?.toLowerCase().includes('admin');
      const newReply = {
        id: `rep_${Date.now()}`,
        senderId: currentUser?._id || 'emp_001',
        senderName: currentUser?.name || 'Employee',
        senderAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        message: messageText,
        timestamp: new Date().toISOString(),
        isAdminReply: isUserAdmin
      };

      try {
        await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            authorName: newReply.senderName,
            authorAvatar: newReply.senderAvatar,
            authorRole: isUserAdmin ? 'Administrator' : 'Team Member',
            text: messageText,
            message: messageText,
            isAdminReply: isUserAdmin
          })
        });
      } catch (_) {}

      currentList[idx].replies = [...(currentList[idx].replies || []), newReply];
      if (currentList[idx].status === 'open' && isUserAdmin) {
        currentList[idx].status = 'in_progress';
      }

      saveCollection(KEYS.TICKETS, currentList);
      setTickets([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
      addToast('Reply sent successfully!', 'success');
    }
  };

  const addTicketInternalNote = async (ticketId, noteText) => {
    if (!noteText.trim()) return;
    const currentList = getCollection(KEYS.TICKETS) || [];
    const idx = currentList.findIndex(t => String(t._id) === String(ticketId) || String(t.ticketCode) === String(ticketId));
    if (idx !== -1) {
      const newNote = {
        id: `note_${Date.now()}`,
        author: currentUser?.name || 'Admin',
        text: noteText,
        date: new Date().toISOString()
      };
      currentList[idx].internalNotes = [...(currentList[idx].internalNotes || []), newNote];
      try {
        await fetch(`${API_BASE}/tickets/${ticketId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ internalNotes: currentList[idx].internalNotes })
        });
      } catch (_) {}
      saveCollection(KEYS.TICKETS, currentList);
      setTickets([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
      addToast('Internal admin note attached to ticket', 'info');
    }
  };

  const assignTicket = async (ticketId, employeeId) => {
    const currentList = getCollection(KEYS.TICKETS) || [];
    const idx = currentList.findIndex(t => String(t._id) === String(ticketId) || String(t.ticketCode) === String(ticketId));
    const emp = employees.find(e => String(e._id) === String(employeeId));
    if (idx !== -1 && emp) {
      currentList[idx].assignedToId = emp._id;
      currentList[idx].assignedToName = emp.name;
      try {
        await fetch(`${API_BASE}/tickets/${ticketId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ assignedTo: emp._id, assignedToId: emp._id, assignedToName: emp.name })
        });
      } catch (_) {}
      saveCollection(KEYS.TICKETS, currentList);
      setTickets([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
      addToast(`Ticket reassigned to ${emp.name}`, 'info');
    }
  };

  const deleteTicket = async (ticketId) => {
    try {
      await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (e) {
      console.warn('[CRMContext] Ticket deleted offline:', e);
    }
    const currentList = getCollection(KEYS.TICKETS) || [];
    const filtered = currentList.filter(t => String(t._id) !== String(ticketId) && String(t.ticketCode) !== String(ticketId));
    saveCollection(KEYS.TICKETS, filtered);
    setTickets(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
    addToast('Ticket removed successfully', 'info');
    return true;
  };

  // =========================================================================
  // 📅 EVENTS & COMPANY CALENDAR
  // =========================================================================
  const createEvent = async (eventData) => {
    const currentList = getCollection(KEYS.EVENTS);
    const newEvent = {
      _id: `ev_${Date.now()}`,
      eventName: eventData.eventName || eventData.title || 'Company Event',
      title: eventData.eventName || eventData.title || 'Company Event',
      eventType: eventData.eventType || 'Company Event',
      type: (eventData.eventType || 'meeting').toLowerCase().replace(/\s+/g, '_'),
      startDate: eventData.startDate || new Date().toISOString().split('T')[0],
      endDate: eventData.endDate || eventData.startDate || new Date().toISOString().split('T')[0],
      date: eventData.startDate || new Date().toISOString().split('T')[0],
      startTime: eventData.startTime || '10:00 AM',
      time: eventData.startTime || '10:00 AM',
      location: eventData.location || 'Headquarters & Video Link',
      description: eventData.description || '',
      isRecurring: !!eventData.isRecurring,
      color: eventData.color || '#2563eb',
      bgColor: eventData.bgColor || '#eff6ff',
      createdById: currentUser?._id || 'emp_001',
      createdAt: new Date().toISOString(),
      ...eventData
    };

    try {
      const payload = { ...newEvent };
      delete payload._id;
      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?._id) newEvent._id = String(json.data._id);
      }
    } catch (_) {}

    currentList.unshift(newEvent);
    saveCollection(KEYS.EVENTS, currentList);
    setEvents([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EVENTS } }));
    addToast(`Event "${newEvent.eventName}" scheduled on company calendar!`, 'success');
    return newEvent;
  };

  const updateEvent = async (eventId, updateData) => {
    try {
      const payload = { ...updateData };
      delete payload._id;
      await fetch(`${API_BASE}/events/${eventId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.EVENTS);
    const idx = currentList.findIndex(e => e._id === eventId || e.id === eventId);
    if (idx !== -1) {
      currentList[idx] = {
        ...currentList[idx],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      saveCollection(KEYS.EVENTS, currentList);
      setEvents([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EVENTS } }));
      addToast('Calendar event updated!', 'success');
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await fetch(`${API_BASE}/events/${eventId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.EVENTS);
    const filtered = currentList.filter(e => e._id !== eventId && e.id !== eventId);
    saveCollection(KEYS.EVENTS, filtered);
    setEvents(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EVENTS } }));
    addToast('Event removed from calendar', 'info');
  };

  // =========================================================================
  // 💬 MESSAGES & TEAM CHAT
  // =========================================================================
  const sendMessage = (conversationId, text) => {
    if (!text.trim()) return;
    const currentConvs = getCollection(KEYS.CONVERSATIONS);
    const idx = currentConvs.findIndex(c => c.id === conversationId);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: currentUser?._id || 'emp_001',
      senderName: currentUser?.name || 'Employee',
      text: text.trim(),
      timestamp: timeStr,
      isOutgoing: true
    };

    if (idx !== -1) {
      currentConvs[idx].messages.push(newMsg);
      currentConvs[idx].lastMessage = text.trim();
      currentConvs[idx].lastMessageTime = timeStr;
      saveCollection(KEYS.CONVERSATIONS, currentConvs);
      setConversations([...currentConvs]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.CONVERSATIONS } }));

      // Simulate a smart automatic friendly response after 2 seconds!
      setTimeout(() => {
        const contactName = currentConvs[idx].participantName || 'Colleague';
        const simulatedReply = {
          id: `msg_reply_${Date.now()}`,
          senderId: currentConvs[idx].participantId,
          senderName: contactName,
          text: `Got it, thanks for sharing! I am on it right away.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOutgoing: false
        };
        const latestConvs = getCollection(KEYS.CONVERSATIONS);
        const lIdx = latestConvs.findIndex(c => c.id === conversationId);
        if (lIdx !== -1) {
          latestConvs[lIdx].messages.push(simulatedReply);
          latestConvs[lIdx].lastMessage = simulatedReply.text;
          latestConvs[lIdx].lastMessageTime = simulatedReply.timestamp;
          saveCollection(KEYS.CONVERSATIONS, latestConvs);
          setConversations([...latestConvs]);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.CONVERSATIONS } }));
        }
      }, 1500);
    }
  };

  const startConversation = (employeeId) => {
    const emp = employees.find(e => e._id === employeeId);
    if (!emp) return;

    const currentConvs = getCollection(KEYS.CONVERSATIONS);
    const existing = currentConvs.find(c => c.participantId === employeeId);

    if (existing) {
      setActiveConversationId(existing.id);
      addToast(`Chat opened with ${emp.name}`, 'info');
      return existing.id;
    }

    const newConv = {
      id: `conv_${Date.now()}`,
      participantId: emp._id,
      participantName: emp.name,
      participantRole: emp.role,
      participantAvatar: emp.avatar,
      isOnline: true,
      lastMessage: 'Started new direct conversation.',
      lastMessageTime: 'Just now',
      unreadCount: 0,
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          senderId: currentUser?._id || 'emp_001',
          senderName: currentUser?.name || 'Employee',
          text: `Hi ${emp.name.split(' ')[0]}! Starting a new conversation.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOutgoing: true
        }
      ]
    };

    currentConvs.unshift(newConv);
    saveCollection(KEYS.CONVERSATIONS, currentConvs);
    setConversations([...currentConvs]);
    setActiveConversationId(newConv.id);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.CONVERSATIONS } }));
    addToast(`New conversation started with ${emp.name}!`, 'success');
    return newConv.id;
  };

  // =========================================================================
  // 📢 NOTICE BOARD MODULE
  // =========================================================================
  const createNotice = async (noticeData) => {
    const currentList = getCollection(KEYS.NOTICES);
    const now = new Date();
    const noticePayload = {
      title: noticeData.title || 'Company Notice',
      description: noticeData.description || noticeData.shortDescription || '',
      shortDescription: noticeData.shortDescription || noticeData.description || '',
      category: noticeData.category || 'Company Announcement',
      priority: noticeData.priority || 'medium',
      targetAudience: noticeData.targetAudience || noticeData.to || 'All Employees',
      to: noticeData.targetAudience || noticeData.to || 'All Employees',
      postedBy: currentUser?.name || 'HR Operations',
      createdBy: currentUser?.name || 'HR Operations',
      date: noticeData.date || now.toISOString().split('T')[0],
      expiryDate: noticeData.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      attachment: noticeData.attachment || '',
      isImportant: noticeData.priority === 'urgent' || noticeData.priority === 'high' || !!noticeData.isImportant,
      fullContent: noticeData.description || noticeData.fullContent || '',
      createdAt: now.toISOString(),
      ...noticeData
    };
    // Never send client-side temporary string ID to backend
    delete noticePayload._id;

    let savedNotice = {
      _id: `not_${Date.now()}`,
      ...noticePayload
    };

    try {
      const res = await fetch(`${API_BASE}/notices`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(noticePayload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          savedNotice = {
            ...savedNotice,
            ...json.data,
            _id: String(json.data._id || savedNotice._id)
          };
        }
      } else {
        console.warn('Backend rejected notice creation:', await res.text());
      }
    } catch (err) {
      console.warn('Notice saved locally, offline sync will propagate to MongoDB:', err);
    }

    currentList.unshift(savedNotice);
    saveCollection(KEYS.NOTICES, currentList);
    setNotices([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.NOTICES } }));
    addToast('Company announcement published to Notice Board & Dashboards!', 'success');
    return savedNotice;
  };

  const updateNotice = async (noticeId, updateData) => {
    try {
      const payload = { ...updateData };
      delete payload._id;
      await fetch(`${API_BASE}/notices/${noticeId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.NOTICES);
    const idx = currentList.findIndex(n => n._id === noticeId || n.id === noticeId || n.noticeCode === noticeId);
    if (idx !== -1) {
      currentList[idx] = {
        ...currentList[idx],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      saveCollection(KEYS.NOTICES, currentList);
      setNotices([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.NOTICES } }));
      addToast('Notice updated successfully!', 'success');
    }
  };

  const dismissNoticeForUser = async (noticeId, userIdentifier) => {
    if (!noticeId || !userIdentifier) return;
    const currentList = getCollection(KEYS.NOTICES) || [];
    const idx = currentList.findIndex(n => String(n._id) === String(noticeId) || String(n.id) === String(noticeId) || String(n.noticeCode) === String(noticeId));
    if (idx !== -1) {
      const existingDismissed = Array.isArray(currentList[idx].dismissedBy) ? currentList[idx].dismissedBy : [];
      const updatedDismissed = [...new Set([...existingDismissed, String(userIdentifier)])];
      currentList[idx] = {
        ...currentList[idx],
        dismissedBy: updatedDismissed,
        updatedAt: new Date().toISOString()
      };
      saveCollection(KEYS.NOTICES, currentList);
      setNotices([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.NOTICES } }));

      try {
        const realId = currentList[idx]._id || noticeId;
        await fetch(`${API_BASE}/notices/${realId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ dismissedBy: updatedDismissed })
        });
      } catch (_) {}
    }
  };

  const deleteNotice = async (noticeId) => {
    try {
      await fetch(`${API_BASE}/notices/${noticeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.NOTICES);
    const filtered = currentList.filter(n => n._id !== noticeId && n.id !== noticeId && n.noticeCode !== noticeId);
    saveCollection(KEYS.NOTICES, filtered);
    setNotices(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.NOTICES } }));
    addToast('Notice removed from board', 'info');
  };

  // =========================================================================
  // 👤 PROFILE UPDATE
  // =========================================================================
  const updateUserProfile = async (profileData) => {
    if (currentUser?._id) {
      await updateEmployee(currentUser._id, profileData);
      addToast('Profile updated successfully!', 'success');
    }
  };

  // =========================================================================
  // 👥 LEADS MANAGEMENT
  // =========================================================================
  const createLead = async (leadData) => {
    const currentList = getCollection(KEYS.LEADS);
    const nextNum = (currentList.length > 0 ? Math.max(...currentList.map(l => l.idNumber || 0)) + 1 : 1);
    const now = new Date();

    const leadPayload = {
      idNumber: nextNum,
      leadCode: leadData.leadCode || `LEAD-${1000 + nextNum}`,
      name: leadData.name || leadData.contactPerson,
      contactPerson: leadData.contactPerson || leadData.name,
      companyName: leadData.companyName || leadData.client || 'Enterprise Client',
      client: leadData.client || leadData.companyName || 'Enterprise Client',
      email: leadData.email || '',
      phone: leadData.phone || '',
      leadType: leadData.leadType || 'Inbound Web',
      leadOwnerId: leadData.leadOwnerId || currentUser?._id || 'emp_001',
      leadOwnerName: leadData.leadOwnerName || currentUser?.name || 'Lead Owner',
      leadOwnerRole: leadData.leadOwnerRole || currentUser?.role || 'Sales Lead',
      leadOwnerAvatar: leadData.leadOwnerAvatar || currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      createdById: currentUser?._id || 'emp_001',
      createdByName: currentUser?.name || 'Employee',
      createdByRole: currentUser?.role || 'Senior',
      createdByAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      startDate: leadData.startDate || now.toISOString().split('T')[0],
      endDate: leadData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdDate: now.toLocaleDateString('en-GB').replace(/\//g, '-'),
      createdAt: now.toISOString(),
      status: leadData.status || 'new',
      priority: leadData.priority || 'medium',
      dealValue: Number(leadData.dealValue) || 0,
      leadSource: leadData.leadSource || 'Website Inquiry',
      notes: leadData.notes || '',
      ...leadData
    };
    delete leadPayload._id;

    let savedLead = {
      _id: `lead_${Date.now()}`,
      ...leadPayload
    };

    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(leadPayload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          savedLead = {
            ...savedLead,
            ...json.data,
            _id: String(json.data._id || savedLead._id)
          };
        }
      }
    } catch (_) {}

    currentList.unshift(savedLead);
    saveCollection(KEYS.LEADS, currentList);
    setLeads([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEADS } }));
    addToast(`Lead "${savedLead.name}" added successfully!`, 'success');
    return savedLead;
  };

  const updateLead = async (leadId, updateData) => {
    try {
      const payload = { ...updateData };
      delete payload._id;
      await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.LEADS);
    const idx = currentList.findIndex(l => l._id === leadId || l.id === leadId || l.leadCode === leadId);
    if (idx !== -1) {
      currentList[idx] = {
        ...currentList[idx],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      saveCollection(KEYS.LEADS, currentList);
      setLeads([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEADS } }));
      addToast('Lead updated successfully!', 'success');
      return currentList[idx];
    }
  };

  const updateLeadStatus = async (leadId, status) => {
    try {
      await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.LEADS);
    const idx = currentList.findIndex(l => l._id === leadId || l.id === leadId || l.leadCode === leadId);
    if (idx !== -1) {
      const prevStatus = currentList[idx].status;
      currentList[idx].status = status;
      currentList[idx].updatedAt = new Date().toISOString();
      saveCollection(KEYS.LEADS, currentList);
      setLeads([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEADS } }));

      if (status === 'converted' && prevStatus !== 'converted') {
        addToast(`🎉 Awesome! Lead marked as Converted (Won Deal)!`, 'success');
      } else {
        addToast(`Lead status updated to ${status.replace('_', ' ')}`, 'info');
      }
    }
  };

  const deleteLead = async (leadId) => {
    try {
      await fetch(`${API_BASE}/leads/${leadId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (_) {}

    const currentList = getCollection(KEYS.LEADS);
    const filtered = currentList.filter(l => l._id !== leadId && l.id !== leadId && l.leadCode !== leadId);
    saveCollection(KEYS.LEADS, filtered);
    setLeads(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEADS } }));
    addToast('Lead deleted from database', 'info');
  };

  const importLeadsBatch = async (importedList) => {
    const currentList = getCollection(KEYS.LEADS);
    let maxNum = currentList.length > 0 ? Math.max(...currentList.map(l => l.idNumber || 0)) : 0;
    const now = new Date();

    const formattedList = importedList.map((item, idx) => {
      maxNum++;
      return {
        _id: `lead_${Date.now()}_${idx}`,
        idNumber: maxNum,
        leadCode: `LEAD-${1000 + maxNum}`,
        name: item.name || item.contactPerson || 'Untitled Lead',
        contactPerson: item.contactPerson || item.name || 'Contact Person',
        companyName: item.companyName || item.client || 'Enterprise Client',
        client: item.client || item.companyName || 'Enterprise Client',
        email: item.email || '',
        phone: item.phone || item.phoneNumber || '',
        leadType: item.leadType || item.category || 'Inbound Web',
        leadOwnerId: item.leadOwnerId || currentUser?._id || 'emp_001',
        leadOwnerName: item.leadOwnerName || currentUser?.name || 'Lead Owner',
        leadOwnerRole: item.leadOwnerRole || currentUser?.role || 'Sales Lead',
        leadOwnerAvatar: item.leadOwnerAvatar || currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        createdById: currentUser?._id || 'emp_001',
        createdByName: currentUser?.name || 'Employee',
        createdByRole: currentUser?.role || 'Senior',
        createdByAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        startDate: item.startDate || now.toISOString().split('T')[0],
        endDate: item.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdDate: now.toLocaleDateString('en-GB').replace(/\//g, '-'),
        createdAt: now.toISOString(),
        status: item.status || 'new',
        priority: item.priority || 'medium',
        dealValue: Number(item.dealValue) || 0,
        leadSource: item.leadSource || 'CSV Import',
        notes: item.notes || item.description || 'Imported via CSV/Excel template.'
      };
    });

    const updated = [...formattedList, ...currentList];
    saveCollection(KEYS.LEADS, updated);
    setLeads(updated);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEADS } }));
    addToast(`Successfully imported ${formattedList.length} leads!`, 'success');
    return formattedList;
  };

  // =========================================================================
  // 🚑 EMERGENCY CONTACTS
  // =========================================================================
  const addEmergencyContact = async (contactData) => {
    const currentList = getCollection(KEYS.EMERGENCY_CONTACTS);
    const newContact = {
      _id: `emg_${Date.now()}`,
      name: contactData.name || '',
      email: contactData.email || '',
      mobile: contactData.mobile || '',
      alternateNumber: contactData.alternateNumber || '',
      relationship: contactData.relationship || 'Family',
      address: contactData.address || '',
      employeeId: currentUser?._id || 'emp_001',
      createdAt: new Date().toISOString()
    };
    currentList.push(newContact);
    saveCollection(KEYS.EMERGENCY_CONTACTS, currentList);
    setEmergencyContacts([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMERGENCY_CONTACTS } }));
    addToast('Emergency contact added successfully!', 'success');
    return newContact;
  };

  const updateEmergencyContact = async (contactId, updateData) => {
    const currentList = getCollection(KEYS.EMERGENCY_CONTACTS);
    const idx = currentList.findIndex(c => c._id === contactId);
    if (idx !== -1) {
      currentList[idx] = { ...currentList[idx], ...updateData, updatedAt: new Date().toISOString() };
      saveCollection(KEYS.EMERGENCY_CONTACTS, currentList);
      setEmergencyContacts([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMERGENCY_CONTACTS } }));
      addToast('Emergency contact updated!', 'success');
    }
  };

  const deleteEmergencyContact = async (contactId) => {
    const currentList = getCollection(KEYS.EMERGENCY_CONTACTS);
    const filtered = currentList.filter(c => c._id !== contactId);
    saveCollection(KEYS.EMERGENCY_CONTACTS, filtered);
    setEmergencyContacts(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMERGENCY_CONTACTS } }));
    addToast('Emergency contact removed', 'info');
  };



  // =========================================================================
  // ⚙️ USER SETTINGS
  // =========================================================================
  const updateUserSettings = async (newSettings) => {
    const merged = { ...userSettings, ...newSettings };
    setUserSettings(merged);
    localStorage.setItem(KEYS.USER_SETTINGS, JSON.stringify(merged));
    addToast('Settings saved successfully!', 'success');
  };

  const contextValue = useMemo(() => ({
    expenses,
    createExpense,
    updateExpense,
    updateExpenseStatus,
    deleteExpense,
    importExpensesBatch,

    tickets,
    createTicket,
    updateTicketStatus,
    replyToTicket,
    addTicketInternalNote,
    assignTicket,
    deleteTicket,

    events,
    createEvent,
    updateEvent,
    deleteEvent,
    computedBirthdays,
    birthdays: computedBirthdays,
    computedAnniversaries,
    anniversaries: computedAnniversaries,

    conversations,
    activeConversationId,
    setActiveConversationId,
    sendMessage,
    startConversation,

    notices,
    createNotice,
    updateNotice,
    deleteNotice,
    dismissNoticeForUser,

    leads,
    leadsFilter,
    setLeadsFilter,
    createLead,
    updateLead,
    updateLeadStatus,
    deleteLead,
    importLeadsBatch,

    emergencyContacts,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,

    userSettings,
    updateUserSettings,

    wfhEmployees,
    weeklyTimeLogs: computedWeeklyTimeLogs,
    computedWeeklyTimeLogs,
    darkMode,
    toggleDarkMode,
    updateUserProfile
  }), [
    expenses, tickets, events, computedBirthdays, computedAnniversaries,
    conversations, activeConversationId, notices, leads, leadsFilter,
    emergencyContacts, userSettings, wfhEmployees,
    computedWeeklyTimeLogs, darkMode
  ]);

  return (
    <CRMContext.Provider value={contextValue}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => useContext(CRMContext);
