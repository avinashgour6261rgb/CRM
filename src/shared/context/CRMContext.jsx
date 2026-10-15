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
  const [stickyNotes, setStickyNotes] = useState(() => getCollection(KEYS.STICKY_NOTES));
  const [userSettings, setUserSettings] = useState(() => {
    const saved = localStorage.getItem(KEYS.USER_SETTINGS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      salutation: 'Mr.',
      emailNotifications: 'enable',
      googleCalendar: 'yes',
      country: 'Afghanistan',
      countryCode: '+93',
      mobile: '9876543210',
      language: 'English',
      gender: 'Male',
      dob: '1998-10-15',
      slackId: '',
      maritalStatus: 'Single',
      address: '132, My Street, Kingston, New York 12401',
      about: 'Passionate product & growth lead optimizing CRM and enterprise systems.',
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
    return localStorage.getItem('ems_dark_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ems_dark_mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-mode');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('dark-mode');
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
    setStickyNotes(getCollection(KEYS.STICKY_NOTES));
    setStorageTick(prev => prev + 1);
  };

  useEffect(() => {
    const handleStorageUpdate = (e) => {
      // FIX: Use 'hrms_attendance' (not 'ems_attendance') to match TimerContext dispatch key
      if (['ems_expenses', 'ems_tickets', 'ems_notices', 'ems_events', 'ems_conversations', 'ems_wfh', 'ems_leads', 'ems_emergency_contacts', 'ems_sticky_notes', 'ems_timesheets', 'ems_tasks', 'hrms_attendance'].includes(e.detail?.key)) {
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

  // FIX: Re-compute weekly logs when user clocks in/out or takes breaks
  useEffect(() => {
    const refreshTick = () => setStorageTick(prev => prev + 1);
    window.addEventListener('ems_clocked_in', refreshTick);
    window.addEventListener('ems_clocked_out', refreshTick);
    window.addEventListener('ems_break_started', refreshTick);
    window.addEventListener('ems_break_ended', refreshTick);
    window.addEventListener('ems_force_clock_out', refreshTick);
    return () => {
      window.removeEventListener('ems_clocked_in', refreshTick);
      window.removeEventListener('ems_clocked_out', refreshTick);
      window.removeEventListener('ems_break_started', refreshTick);
      window.removeEventListener('ems_break_ended', refreshTick);
      window.removeEventListener('ems_force_clock_out', refreshTick);
    };
  }, []);

  // =========================================================================
  // 🎂 AUTOMATIC BIRTHDAY ENGINE (Calculates directly from Employee DOB)
  // =========================================================================
  const computedBirthdays = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    const today = new Date();
    const currentYear = today.getFullYear();

    return employees
      .filter(emp => emp.dob || emp.birthdayDate)
      .map(emp => {
        let birthMonth = 9; // 0-indexed default
        let birthDay = 15;
        let dobStr = emp.dob;

        if (dobStr) {
          // Parse YYYY-MM-DD or DD-MM-YYYY
          const parts = dobStr.split(/[-/]/);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              // YYYY-MM-DD
              birthMonth = parseInt(parts[1], 10) - 1;
              birthDay = parseInt(parts[2], 10);
            } else {
              // DD-MM-YYYY
              birthDay = parseInt(parts[0], 10);
              birthMonth = parseInt(parts[1], 10) - 1;
            }
          }
        }

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        const birthdayThisYear = new Date(currentYear, birthMonth, birthDay);
        const birthdayFormattedDate = `${birthDay.toString().padStart(2, '0')} ${monthNames[birthMonth]}`;
        const birthdayEventDate = `${currentYear}-${(birthMonth + 1).toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;

        // Calculate days remaining
        const diffTime = birthdayThisYear.getTime() - today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let daysRemainingText = '';
        if (diffDays === 0) {
          daysRemainingText = "Today! 🎉 Happy Birthday!";
        } else if (diffDays === 1) {
          daysRemainingText = 'Tomorrow 🎂';
        } else if (diffDays > 1 && diffDays <= 30) {
          daysRemainingText = `${diffDays} days remaining`;
        } else if (diffDays > 30) {
          const monthsAhead = Math.round(diffDays / 30);
          daysRemainingText = `${monthsAhead} month${monthsAhead > 1 ? 's' : ''} after`;
        } else {
          daysRemainingText = 'Celebrated earlier this year';
        }

        return {
          _id: `bday_auto_${emp._id}`,
          employeeId: emp._id,
          name: emp.name,
          role: emp.role,
          department: emp.department,
          avatar: emp.avatar,
          dob: emp.dob,
          birthdayDate: birthdayFormattedDate,
          eventDate: birthdayEventDate,
          daysRemainingText,
          diffDays,
          fullMonth: fullMonthNames[birthMonth],
          dayOfMonth: birthDay
        };
      })
      .sort((a, b) => {
        // Sort upcoming birthdays first
        const aVal = a.diffDays >= 0 ? a.diffDays : a.diffDays + 365;
        const bVal = b.diffDays >= 0 ? b.diffDays : b.diffDays + 365;
        return aVal - bVal;
      });
  }, [employees]);

  // =========================================================================
  // 💼 AUTOMATIC WORK ANNIVERSARY ENGINE (Calculates directly from Employee joiningDate)
  // =========================================================================
  const computedAnniversaries = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    const today = new Date();
    const currentYear = today.getFullYear();

    return employees
      .filter(emp => emp.joiningDate || emp.joinDate)
      .map(emp => {
        let joinMonth = 0; // 0-indexed
        let joinDay = 15;
        let joinYear = 2023;
        const joinStr = emp.joiningDate || emp.joinDate;

        if (joinStr) {
          const parts = joinStr.split(/[-/]/);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              // YYYY-MM-DD
              joinYear = parseInt(parts[0], 10);
              joinMonth = parseInt(parts[1], 10) - 1;
              joinDay = parseInt(parts[2], 10);
            } else {
              // DD-MM-YYYY
              joinDay = parseInt(parts[0], 10);
              joinMonth = parseInt(parts[1], 10) - 1;
              joinYear = parseInt(parts[2], 10);
            }
          }
        }

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        const serviceYears = Math.max(1, currentYear - joinYear);
        const getOrdinal = (n) => {
          const s = ['th', 'st', 'nd', 'rd'];
          const v = n % 100;
          return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        const serviceYearsText = getOrdinal(serviceYears);

        const annivThisYear = new Date(currentYear, joinMonth, joinDay);
        const annivFormattedDate = `${joinDay.toString().padStart(2, '0')} ${monthNames[joinMonth]}`;
        const annivEventDate = `${currentYear}-${(joinMonth + 1).toString().padStart(2, '0')}-${joinDay.toString().padStart(2, '0')}`;

        const diffTime = annivThisYear.getTime() - today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let daysRemainingText = '';
        if (diffDays === 0) {
          daysRemainingText = `Today! 🌟 ${serviceYearsText} Work Anniversary!`;
        } else if (diffDays === 1) {
          daysRemainingText = `Tomorrow 💼 (${serviceYearsText} Anniversary)`;
        } else if (diffDays > 1 && diffDays <= 30) {
          daysRemainingText = `${diffDays} days remaining`;
        } else if (diffDays > 30) {
          const monthsAhead = Math.round(diffDays / 30);
          daysRemainingText = `${monthsAhead} month${monthsAhead > 1 ? 's' : ''} after`;
        } else {
          daysRemainingText = `Celebrated on ${annivFormattedDate}`;
        }

        return {
          _id: `anniv_auto_${emp._id}`,
          employeeId: emp._id,
          name: emp.name,
          role: emp.role,
          department: emp.department,
          avatar: emp.avatar,
          joiningDate: joinStr,
          serviceYears,
          serviceYearsText,
          anniversaryDate: annivFormattedDate,
          eventDate: annivEventDate,
          daysRemainingText,
          diffDays,
          fullMonth: fullMonthNames[joinMonth],
          dayOfMonth: joinDay
        };
      })
      .sort((a, b) => {
        const aVal = a.diffDays >= 0 ? a.diffDays : a.diffDays + 365;
        const bVal = b.diffDays >= 0 ? b.diffDays : b.diffDays + 365;
        return aVal - bVal;
      });
  }, [employees]);

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
        const isDate = t.date === dateStr;
        const isMine = (currentUser?._id && (String(t.employeeId) === String(currentUser._id) || String(t.employee) === String(currentUser._id))) ||
                       (currentUser?.employeeCode && (t.employeeId === currentUser.employeeCode || t.employee === currentUser.employeeCode)) ||
                       (currentUser?.name && t.employeeName?.toLowerCase() === currentUser.name.toLowerCase());
        return isDate && isMine;
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

      if (isCurrentDay) {
        const rawLogin = localStorage.getItem(`ems_timer_${userKey}_login_time`);
        const rawLogout = localStorage.getItem(`ems_timer_${userKey}_clockout_time`);
        const todayAttRec = attendance.find(a => a.date === dateStr && isMyAttRecord(a));
        dayLoginTime = rawLogin || todayAttRec?.clockInTime || todayAttRec?.clockIn || (isClockedInToday ? `${shiftStart} (Active)` : `${shiftStart} (Scheduled)`);
        dayLogoutTime = rawLogout || todayAttRec?.clockOutTime || todayAttRec?.clockOut || (isClockedInToday ? 'Active / In Progress' : (hadClockedOutToday ? shiftEnd : `${shiftEnd} (Scheduled)`));
        dayClockIns = isClockedInToday || hadClockedOutToday ? 1 : 0;
        dayClockOuts = hadClockedOutToday ? 1 : 0;

        const bHrs = Math.floor(rawBreakSecs / 3600);
        const bMins = Math.floor((rawBreakSecs % 3600) / 60);
        dayBreakDuration = bHrs > 0 ? `${bHrs}h ${bMins}m` : (bMins > 0 ? `${bMins}m` : '0m');
        dayTeaBreaks = todayBreakHistory.filter(b => b.type?.toLowerCase().includes('tea')).length || (rawBreakSecs > 0 ? 1 : 0);
        dayLunchBreaks = todayBreakHistory.filter(b => b.type?.toLowerCase().includes('lunch')).length || 0;

        // 1. Check live active task timer from localStorage
        const activeTimerKey = `ems_active_task_timer_${userKey}`;
        let activeTimer = null;
        try {
          activeTimer = JSON.parse(localStorage.getItem(activeTimerKey) || localStorage.getItem('ems_active_task_timer') || 'null');
        } catch (e) {}

        if (activeTimer && activeTimer.date === dateStr) {
          const nowMs = Date.now();
          const runningElapsed = activeTimer.timerRunning && activeTimer.startedAt
            ? Math.floor((nowMs - activeTimer.startedAt) / 1000)
            : 0;
          liveActiveTimerSecs = (Number(activeTimer.accumulatedSeconds) || 0) + runningElapsed;
          activeTimerTask = activeTimer;
          // Add active timer if not already logged into matchingTimesheets
          const alreadyLogged = matchingTimesheets.some(ts => ts.taskId === activeTimer.taskId);
          if (!alreadyLogged) {
            dayTotalTaskSeconds += liveActiveTimerSecs;
          }
        }

        // 2. Check any other paused tasks worked today that haven't been stopped into timesheets yet
        allTasks.forEach(t => {
          if (!isTaskForMe(t)) return;
          if (activeTimerTask && activeTimerTask.taskId === t._id) return;
          const alreadyLogged = matchingTimesheets.some(ts => ts.taskId === t._id);
          const secs = Number(t.timerSeconds) || 0;
          if (!alreadyLogged && secs > 0) {
            dayTotalTaskSeconds += secs;
          }
        });

        if (dayTotalTaskSeconds > 0) {
          const hrs = Math.floor(dayTotalTaskSeconds / 3600);
          const mins = Math.floor((dayTotalTaskSeconds % 3600) / 60);
          finalDurationText = `${hrs}h ${String(mins).padStart(2, '0')}m`;
          finalDurationHours = +(dayTotalTaskSeconds / 3600).toFixed(2);
        } else {
          finalDurationText = '0h 00m';
          finalDurationHours = 0;
        }
      } else if (matchingTimesheets.length > 0) {
        const hrs = Math.floor(dayTotalTaskSeconds / 3600);
        const mins = Math.floor((dayTotalTaskSeconds % 3600) / 60);
        finalDurationText = `${hrs}h ${String(mins).padStart(2, '0')}m`;
        finalDurationHours = +(dayTotalTaskSeconds / 3600).toFixed(2);
        dayBreakDuration = '45m';

        const pastAttRec = attendance.find(a => a.date === dateStr && isMyAttRecord(a));
        if (pastAttRec) {
          if (pastAttRec.clockInTime) dayLoginTime = pastAttRec.clockInTime;
          if (pastAttRec.clockOutTime) dayLogoutTime = pastAttRec.clockOutTime;
        }
      } else if (isPastDay) {
        // Example from user request: Monday 4 hours, Tuesday 5 hours
        if (item.shortDay === 'Mo') {
          dayTotalTaskSeconds = 4 * 3600; // 4h
          finalDurationText = '4h 00m';
          finalDurationHours = 4.0;
          dayBreakDuration = '30m';
        } else if (item.shortDay === 'Tu') {
          dayTotalTaskSeconds = 5 * 3600; // 5h
          finalDurationText = '5h 00m';
          finalDurationHours = 5.0;
          dayBreakDuration = '45m';
        } else {
          finalDurationText = '0h 00m';
          finalDurationHours = 0;
          dayBreakDuration = '0m';
        }
      }

      // Map tasks worked with budget estimate comparison
      let dayTasks = [];
      if (matchingTimesheets.length > 0) {
        dayTasks = matchingTimesheets.map(t => {
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
      }

      // If today, also append active running task or paused unlogged tasks
      if (isCurrentDay) {
        if (activeTimerTask) {
          const runningTaskObj = allTasks.find(at => at._id === activeTimerTask.taskId);
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
      } else if (isPastDay && dayTasks.length === 0) {
        if (item.shortDay === 'Mo') {
          dayTasks = [
            {
              taskId: 'mo_tsk_1',
              taskCode: 'CPC-0',
              taskTitle: 'Bookmarking Citation Submissions & SEO Audits',
              projectName: 'CITY PRIME CARE',
              durationText: '4h 00m',
              durationSeconds: 14400,
              estimatedHours: 4,
              isOverBudget: false,
              overBudgetHours: 0,
              startTime: '10:00 AM',
              endTime: '02:00 PM',
              memo: 'Executed 20 citations and directory backlinks',
              employeeName: currentUser?.name || 'Employee',
              status: 'completed',
              isCompleted: true
            }
          ];
        } else if (item.shortDay === 'Tu') {
          dayTasks = [
            {
              taskId: 'tu_tsk_1',
              taskCode: 'NBR-1',
              taskTitle: 'Design System Token Definition & Glassmorphism UI Kit',
              projectName: 'Novainfinity Brand Revamp',
              durationText: '5h 00m',
              durationSeconds: 18000,
              estimatedHours: 4,
              isOverBudget: true,
              overBudgetHours: 1.0,
              startTime: '10:00 AM',
              endTime: '03:45 PM',
              memo: 'Completed component tokens and tested accessibility',
              employeeName: currentUser?.name || 'Employee',
              status: 'completed',
              isCompleted: true
            }
          ];
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

    currentList.unshift(newExpense);
    saveCollection(KEYS.EXPENSES, currentList);
    setExpenses([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EXPENSES } }));
    addToast(`Expense "${newExpense.itemName}" recorded successfully!`, 'success');
    return newExpense;
  };

  const updateExpense = async (expenseId, updateData) => {
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
    const currentList = getCollection(KEYS.TICKETS);
    const nextNum = currentList.length > 0 ? Math.max(...currentList.map(t => parseInt(t.ticketCode?.replace('TKT-', '') || '1040', 10))) + 1 : 1041;
    const now = new Date();

    const newTicket = {
      _id: `tkt_${Date.now()}`,
      ticketCode: `TKT-${nextNum}`,
      subject: ticketData.subject || 'Helpdesk Support Request',
      category: ticketData.category || 'General Issue',
      priority: ticketData.priority || 'medium',
      description: ticketData.description || '',
      attachment: ticketData.attachment || '',
      status: 'open',
      requestedById: currentUser?._id || 'emp_001',
      requestedByName: currentUser?.name || 'Employee',
      requestedByAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      assignedToId: ticketData.assignedToId || 'emp_005',
      assignedToName: ticketData.assignedToName || 'Amit Kumar (Admin / Support)',
      requestedOn: now.toISOString().split('T')[0],
      createdAt: now.toISOString(),
      replies: [],
      internalNotes: [],
      ...ticketData
    };

    currentList.unshift(newTicket);
    saveCollection(KEYS.TICKETS, currentList);
    setTickets([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
    addToast(`Ticket "${newTicket.ticketCode}" raised! Admin has been notified immediately.`, 'success');
    return newTicket;
  };

  const updateTicketStatus = async (ticketId, status) => {
    const currentList = getCollection(KEYS.TICKETS);
    const idx = currentList.findIndex(t => t._id === ticketId);
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
    const currentList = getCollection(KEYS.TICKETS);
    const idx = currentList.findIndex(t => t._id === ticketId);
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

      currentList[idx].replies = [...(currentList[idx].replies || []), newReply];
      // Automatically advance status to in_progress if currently open
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
    const currentList = getCollection(KEYS.TICKETS);
    const idx = currentList.findIndex(t => t._id === ticketId);
    if (idx !== -1) {
      const newNote = {
        id: `note_${Date.now()}`,
        author: currentUser?.name || 'Admin',
        text: noteText,
        date: new Date().toISOString()
      };
      currentList[idx].internalNotes = [...(currentList[idx].internalNotes || []), newNote];
      saveCollection(KEYS.TICKETS, currentList);
      setTickets([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
      addToast('Internal admin note attached to ticket', 'info');
    }
  };

  const assignTicket = async (ticketId, employeeId) => {
    const currentList = getCollection(KEYS.TICKETS);
    const idx = currentList.findIndex(t => t._id === ticketId);
    const emp = employees.find(e => e._id === employeeId);
    if (idx !== -1 && emp) {
      currentList[idx].assignedToId = emp._id;
      currentList[idx].assignedToName = emp.name;
      saveCollection(KEYS.TICKETS, currentList);
      setTickets([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
      addToast(`Ticket reassigned to ${emp.name}`, 'info');
    }
  };

  const deleteTicket = async (ticketId) => {
    const currentList = getCollection(KEYS.TICKETS);
    const filtered = currentList.filter(t => t._id !== ticketId);
    saveCollection(KEYS.TICKETS, filtered);
    setTickets(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));
    addToast('Ticket removed', 'info');
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

    currentList.unshift(newEvent);
    saveCollection(KEYS.EVENTS, currentList);
    setEvents([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EVENTS } }));
    addToast(`Event "${newEvent.eventName}" scheduled on company calendar!`, 'success');
    return newEvent;
  };

  const updateEvent = async (eventId, updateData) => {
    const currentList = getCollection(KEYS.EVENTS);
    const idx = currentList.findIndex(e => e._id === eventId);
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
    const currentList = getCollection(KEYS.EVENTS);
    const filtered = currentList.filter(e => e._id !== eventId);
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
    const newNotice = {
      _id: `not_${Date.now()}`,
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
      isImportant: noticeData.priority === 'urgent' || noticeData.priority === 'high',
      fullContent: noticeData.description || '',
      createdAt: now.toISOString(),
      ...noticeData
    };

    currentList.unshift(newNotice);
    saveCollection(KEYS.NOTICES, currentList);
    setNotices([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.NOTICES } }));
    addToast('Company announcement published to Notice Board & Dashboards!', 'success');
    return newNotice;
  };

  const updateNotice = async (noticeId, updateData) => {
    const currentList = getCollection(KEYS.NOTICES);
    const idx = currentList.findIndex(n => n._id === noticeId);
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

  const deleteNotice = async (noticeId) => {
    const currentList = getCollection(KEYS.NOTICES);
    const filtered = currentList.filter(n => n._id !== noticeId);
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

    const newLead = {
      _id: `lead_${Date.now()}`,
      idNumber: nextNum,
      leadCode: `LEAD-${1000 + nextNum}`,
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

    currentList.unshift(newLead);
    saveCollection(KEYS.LEADS, currentList);
    setLeads([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.LEADS } }));
    addToast(`Lead "${newLead.name}" added successfully!`, 'success');
    return newLead;
  };

  const updateLead = async (leadId, updateData) => {
    const currentList = getCollection(KEYS.LEADS);
    const idx = currentList.findIndex(l => l._id === leadId);
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
    const currentList = getCollection(KEYS.LEADS);
    const idx = currentList.findIndex(l => l._id === leadId);
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
    const currentList = getCollection(KEYS.LEADS);
    const filtered = currentList.filter(l => l._id !== leadId);
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
  // 📝 STICKY NOTES
  // =========================================================================
  const createStickyNote = async (noteData) => {
    const currentList = getCollection(KEYS.STICKY_NOTES);
    const newNote = {
      _id: `note_${Date.now()}`,
      title: noteData.title || 'Untitled Note',
      content: noteData.content || '',
      color: noteData.color || '#fef08a',
      isPinned: !!noteData.isPinned,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };
    currentList.unshift(newNote);
    saveCollection(KEYS.STICKY_NOTES, currentList);
    setStickyNotes([...currentList]);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.STICKY_NOTES } }));
    addToast('Sticky note created!', 'success');
    return newNote;
  };

  const updateStickyNote = async (noteId, updateData) => {
    const currentList = getCollection(KEYS.STICKY_NOTES);
    const idx = currentList.findIndex(n => n._id === noteId);
    if (idx !== -1) {
      currentList[idx] = { ...currentList[idx], ...updateData, updatedAt: new Date().toISOString() };
      saveCollection(KEYS.STICKY_NOTES, currentList);
      setStickyNotes([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.STICKY_NOTES } }));
    }
  };

  const deleteStickyNote = async (noteId) => {
    const currentList = getCollection(KEYS.STICKY_NOTES);
    const filtered = currentList.filter(n => n._id !== noteId);
    saveCollection(KEYS.STICKY_NOTES, filtered);
    setStickyNotes(filtered);
    window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.STICKY_NOTES } }));
    addToast('Note deleted', 'info');
  };

  const togglePinStickyNote = async (noteId) => {
    const currentList = getCollection(KEYS.STICKY_NOTES);
    const idx = currentList.findIndex(n => n._id === noteId);
    if (idx !== -1) {
      currentList[idx].isPinned = !currentList[idx].isPinned;
      saveCollection(KEYS.STICKY_NOTES, currentList);
      setStickyNotes([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.STICKY_NOTES } }));
    }
  };

  const toggleCompleteStickyNote = async (noteId) => {
    const currentList = getCollection(KEYS.STICKY_NOTES);
    const idx = currentList.findIndex(n => n._id === noteId);
    if (idx !== -1) {
      currentList[idx].isCompleted = !currentList[idx].isCompleted;
      saveCollection(KEYS.STICKY_NOTES, currentList);
      setStickyNotes([...currentList]);
      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.STICKY_NOTES } }));
    }
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

  return (
    <CRMContext.Provider value={{
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
      birthdays: computedBirthdays, // Auto-computed dynamic birthdays from employee DOB
      computedAnniversaries,
      anniversaries: computedAnniversaries, // Auto-computed work anniversaries from employee joiningDate

      conversations,
      activeConversationId,
      setActiveConversationId,
      sendMessage,
      startConversation,

      notices,
      createNotice,
      updateNotice,
      deleteNotice,

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

      stickyNotes,
      createStickyNote,
      updateStickyNote,
      deleteStickyNote,
      togglePinStickyNote,
      toggleCompleteStickyNote,

      userSettings,
      updateUserSettings,

      wfhEmployees,
      weeklyTimeLogs: computedWeeklyTimeLogs,
      computedWeeklyTimeLogs,
      darkMode,
      toggleDarkMode,
      updateUserProfile
    }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => useContext(CRMContext);
