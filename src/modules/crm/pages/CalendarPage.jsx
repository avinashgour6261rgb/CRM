/**
 * @file CalendarPage.jsx
 * @description Interactive Company Events & Calendar page with Google Calendar festivals,
 * Admin holiday approval, and user-isolated private date memories.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Search,
  Calendar as CalendarIcon,
  Sparkles,
  Trash2,
  Tag,
  CheckCircle2,
  X,
  Repeat,
  Bell,
  Heart,
  Award,
  Lock,
  Check
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useHR } from '../../hr/context/HRContext';
import { useWork } from '../../work/context/WorkContext';
import { useToast } from '../../../shared/context/ToastContext';
import { AddEventModal } from '../../../shared/components/modals/AddEventModal';
import { DateMemoryModal } from '../components/calendar/DateMemoryModal';
import { dateMemoryService } from '../services/dateMemoryService';
import { holidaySyncService } from '../../hr/services/holidaySyncService';
import { getCompanySettings } from '../../../shared/services/companySettingsService';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarPage = () => {
  const { addToast } = useToast();
  const { events, deleteEvent, computedBirthdays, computedAnniversaries, darkMode } = useCRM();
  const isDark = !!darkMode;
  const { holidays, currentUser, employees, leaves } = useHR();
  const { tasks, projects } = useWork();

  const isPrivileged = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.systemRole === 'hr' || currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.role === 'manager';

  const [currentDate, setCurrentDate] = useState(new Date()); // Dynamic live current date
  const [currentView, setCurrentView] = useState('month'); // 'month' | 'week' | 'day' | 'list'
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Private Date Memory Modal State
  const [isDateMemoryOpen, setIsDateMemoryOpen] = useState(false);
  const [selectedMemoryDate, setSelectedMemoryDate] = useState('');
  const [userMemories, setUserMemories] = useState([]);
  const [suggestedHolidays, setSuggestedHolidays] = useState([]);

  // Category and View Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('all'); // 'all' | 'project' | 'holiday' | 'festival' | 'memory' | 'birthday' | 'anniversary' | 'leave' | 'task' | 'meeting'
  const [showShifts, setShowShifts] = useState(false);

  // Filters
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(currentUser?._id || 'emp_001');

  useEffect(() => {
    if (!isPrivileged && currentUser?._id) {
      setSelectedEmployeeId(currentUser._id);
    }
  }, [isPrivileged, currentUser?._id]);

  const [clientFilter, setClientFilter] = useState('all');
  const [search, setSearch] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Load User's Private Memories (strictly isolated) & Suggested Festivals
  const loadUserMemories = () => {
    if (currentUser) {
      setUserMemories(dateMemoryService.getUserMemories(currentUser));
    }
  };

  const loadFestivals = async () => {
    try {
      const list = await holidaySyncService.getSuggestedHolidays(year);
      setSuggestedHolidays(list);
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    loadUserMemories();
    loadFestivals();

    const handleSync = () => {
      loadUserMemories();
      loadFestivals();
    };

    window.addEventListener('ems_user_memories_updated', handleSync);
    window.addEventListener('ems_holidays_updated', handleSync);
    window.addEventListener('hrms_storage_change', handleSync);
    return () => {
      window.removeEventListener('ems_user_memories_updated', handleSync);
      window.removeEventListener('ems_holidays_updated', handleSync);
      window.removeEventListener('hrms_storage_change', handleSync);
    };
  }, [currentUser?._id, year]);

  // =========================================================================
  // COMBINE ALL EVENTS + DYNAMIC LEAVES + SHIFT SCHEDULES + BIRTHDAYS + HOLIDAYS + TASKS + MEMORIES + FESTIVALS
  // =========================================================================
  const allEvents = useMemo(() => {
    // 1. Base User & Company Events (Scoped: Personal Reminders visible only to creator!)
    const baseEvents = (events || [])
      .filter(e => {
        const isPersonal = e.isPersonal === true || e.eventType === 'Personal Reminder' || e.type === 'Personal Reminder';
        if (isPersonal) {
          const isMine = (e.createdBy && (String(e.createdBy) === String(currentUser?._id) || String(e.createdBy) === String(currentUser?.employeeCode))) ||
                         (e.createdByName && currentUser?.name && e.createdByName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
          return isMine;
        }
        return true;
      })
      .map(e => ({
        _id: e._id || `ev_${Math.random()}`,
        title: e.eventName || e.title || 'Company Event',
        date: e.startDate || e.date || new Date().toISOString().split('T')[0],
        endDate: e.endDate || e.startDate || e.date || new Date().toISOString().split('T')[0],
        time: e.startTime || e.time || 'All Day',
        type: e.eventType || e.type || 'Company Event',
        location: e.location || 'Headquarters / Main Office',
        description: e.description || 'Company scheduled event and meeting.',
        isRecurring: !!e.isRecurring,
        color: e.color || '#2563eb',
        bgColor: e.bgColor || '#eff6ff'
      }));

    // 2. Dynamic Automatic Birthdays calculated from Employee Profiles (DOB)
    const dynamicBirthdayEvents = (computedBirthdays || []).map(b => ({
      _id: `bday_cal_${b.employeeId || Math.random()}`,
      title: `🎂 Birthday: ${b.name || 'Team Member'}`,
      date: b.eventDate || new Date().toISOString().split('T')[0],
      endDate: b.eventDate || new Date().toISOString().split('T')[0],
      time: 'All Day',
      type: 'Birthday',
      employeeName: b.name,
      employeeAvatar: b.avatar,
      employeeRole: b.role,
      location: 'Company Wide Celebration',
      description: `🎂 Happy Birthday to ${b.name || 'Team Member'} (${b.role || 'Colleague'})! Wishing continued joy and success. 🎉`,
      isRecurring: true,
      color: '#d97706',
      bgColor: '#fef3c7'
    }));

    // 3. Dynamic Automatic Work Anniversaries calculated from Employee Joining Date
    const dynamicAnniversaryEvents = (computedAnniversaries || []).map(a => ({
      _id: `anniv_cal_${a.employeeId || Math.random()}`,
      title: `🌟 ${a.serviceYearsText} Work Anniversary: ${a.name || 'Team Member'}`,
      date: a.eventDate || new Date().toISOString().split('T')[0],
      endDate: a.eventDate || new Date().toISOString().split('T')[0],
      time: 'All Day',
      type: 'Work Anniversary',
      employeeName: a.name,
      employeeAvatar: a.avatar,
      employeeRole: a.role,
      serviceYearsText: a.serviceYearsText,
      serviceYears: a.serviceYears,
      location: 'Corporate Milestone',
      description: `🌟 Milestone Celebration: ${a.name} (${a.role}) completes ${a.serviceYearsText} year${a.serviceYears > 1 ? 's' : ''} of dedicated service! Thank you for being a vital pillar of our success. 💼🎉`,
      isRecurring: true,
      color: '#7c3aed',
      bgColor: '#f5f3ff'
    }));

    // 4. Official Public & Company Holidays (Highlighted Red)
    const holidayEvents = (holidays || [])
      .filter(h => !(h.date === '2026-10-15' && (h.name?.toLowerCase().includes('foundation') || h.title?.toLowerCase().includes('foundation'))))
      .map(h => ({
      _id: `hol_cal_${h._id || Math.random()}`,
      title: `🏖️ ${h.name || h.holidayName || h.title || 'Public Holiday'}`,
      date: h.date || new Date().toISOString().split('T')[0],
      endDate: h.date || new Date().toISOString().split('T')[0],
      time: 'All Day',
      type: h.type || 'Company Holiday',
      location: h.type === 'Company Holiday' ? 'Company Declared Holiday' : 'National / Gazetted Holiday',
      description: h.description || `${h.name || 'Holiday'} - Official Holiday across all offices.`,
      isRecurring: !!h.isRecurringYearly,
      isHoliday: true,
      color: '#dc2626',
      bgColor: '#fee2e2'
    }));

    // 5. Dynamic Approved Leaves from Database
    const approvedLeaveEvents = [];
    const isPrivilegedUser = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.systemRole === 'hr';
    (leaves || []).filter(l => l.status === 'approved').forEach(l => {
      const isMine = (l.employeeId && currentUser?._id && String(l.employeeId) === String(currentUser._id)) ||
                     (l.employee && currentUser?._id && String(l.employee) === String(currentUser._id)) ||
                     (l.employeeCode && currentUser?.employeeCode && String(l.employeeCode) === String(currentUser.employeeCode)) ||
                     (l.employeeName && currentUser?.name && l.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());

      if (!isPrivilegedUser && !isMine) return;

      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      const cur = new Date(start);

      while (cur <= end) {
        const dStr = cur.toISOString().split('T')[0];
        approvedLeaveEvents.push({
          _id: `leave_cal_${l._id}_${dStr}`,
          title: `🌴 ${l.leaveType || 'Leave'}: ${l.employeeName || 'Team Member'}`,
          date: dStr,
          endDate: l.endDate,
          time: 'All Day',
          type: 'Approved Leave',
          leaveType: l.leaveType,
          employeeName: l.employeeName,
          employeeAvatar: l.employeeAvatar,
          employeeRole: l.employeeRole,
          durationDays: l.durationDays,
          location: 'Approved Time Off',
          description: `🌴 Approved ${l.leaveType} for ${l.employeeName} (${l.durationDays} day${l.durationDays > 1 ? 's' : ''}). Reason: ${l.reason || 'Personal Leave'}`,
          color: '#0d9488',
          bgColor: '#f0fdfa'
        });
        cur.setDate(cur.getDate() + 1);
      }
    });

    // 6. Dynamic Tasks Due Dates (Scoped by user role & personal task isolation)
    const todayStr = new Date().toISOString().split('T')[0];
    const taskEvents = (tasks || [])
      .filter(t => t?.dueDate)
      .filter(t => {
        if (t.isPersonal) {
          return (t.assignedToId === currentUser?._id || t.assignedTo === currentUser?._id ||
                  t.assignedById === currentUser?._id ||
                  (t.assignedToName && currentUser?.name && t.assignedToName.toLowerCase() === currentUser.name.toLowerCase()));
        }
        if (isPrivilegedUser) return true;
        return (t.assignedToId === currentUser?._id || t.assignedTo === currentUser?._id ||
                t.assignedToId === currentUser?.employeeCode || t.assignedTo === currentUser?.employeeCode ||
                (t.assignedToName && currentUser?.name && t.assignedToName.toLowerCase() === currentUser.name.toLowerCase()));
      })
      .map(t => {
        const isOverdue = t.isOverdue || (t.dueDate < todayStr && t.status !== 'completed');
        return {
          _id: `tsk_cal_${t._id || Math.random()}`,
          title: `📌 ${isOverdue ? '⚠️ Overdue' : 'Due'}: #${t.taskCode || 'TSK'} ${t.title || 'Task'}`,
          date: t.dueDate,
          endDate: t.dueDate,
          time: '06:00 PM',
          type: isOverdue ? 'Overdue Task' : 'Task Deadline',
          location: t.projectName || 'Work Module',
          description: `Task: ${t.title}. Priority: ${t.priority || 'Medium'}. Status: ${t.status || 'Pending'}. Assigned to: ${t.assignedToName || 'Team'}.`,
          isTask: true,
          color: isOverdue ? '#dc2626' : '#2563eb',
          bgColor: isOverdue ? '#fee2e2' : '#eff6ff'
        };
      });

    // 7. Dynamic Project Delivery Deadlines
    const projectDeadlineEvents = (projects || [])
      .filter(p => p?.deadline)
      .map(p => {
        const isOverdue = p.deadline < todayStr;
        return {
          _id: `prj_dead_${p._id || p.id || Math.random()}`,
          title: `🚀 Project Deadline: ${p.name || 'Project'}`,
          date: p.deadline,
          endDate: p.deadline,
          time: '11:59 PM',
          type: 'Project Deadline',
          isProject: true,
          location: p.client ? `Client: ${p.client}` : (p.department ? `Dept: ${p.department}` : 'All Teams'),
          description: `🚀 Project delivery deadline for "${p.name}". Category: ${p.category || 'General'}. Open to all team members to view and contribute.`,
          color: isOverdue ? '#dc2626' : '#7c3aed',
          bgColor: isOverdue ? '#fee2e2' : '#f5f3ff'
        };
      });

    // 8. Dynamic Work Shift Schedules (from Company Settings)
    const companySettings = getCompanySettings();
    const shiftStart = companySettings.shiftStartTime || '10:00 AM';
    const shiftEnd = companySettings.shiftEndTime || '07:00 PM';

    const shiftEvents = [];
    const curYear = currentDate.getFullYear();
    const curMonth = currentDate.getMonth();
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(curYear, curMonth, day);
      const dayOfWeek = dayDate.getDay();
      if (dayOfWeek !== 0) { // Exclude Sundays
        const dStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasHoliday = (holidays || []).some(h => h.date === dStr);
        if (!hasHoliday) {
          shiftEvents.push({
            _id: `shift_${dStr}`,
            title: `🕒 Shift: ${shiftStart} - ${shiftEnd}`,
            date: dStr,
            endDate: dStr,
            time: `${shiftStart} - ${shiftEnd}`,
            type: 'Shift Schedule',
            location: 'Office / Remote Hybrid',
            description: `Scheduled standard working shift ${shiftStart} to ${shiftEnd} for ${currentUser?.name || 'Employee'}.`,
            color: '#475569',
            bgColor: '#f8fafc'
          });
        }
      }
    }

    // 9. Personal Date Memories & Daily Notes (Strictly isolated to currentUser)
    const privateMemoryEvents = (userMemories || []).map(m => ({
      _id: m._id,
      title: `${m.isCompleted ? '✅' : '📌'} ${m.time && m.time !== 'All Day' ? `[${m.time}] ` : ''}${m.title}`,
      rawTitle: m.title,
      date: m.date,
      endDate: m.date,
      time: m.time || 'All Day',
      type: 'Private Memory',
      tag: m.tag,
      isCompleted: m.isCompleted,
      isPrivateMemory: true,
      description: m.description || 'Personal date memory & note.',
      color: m.isCompleted ? '#64748b' : '#7c3aed',
      bgColor: m.isCompleted ? '#f1f5f9' : '#f5f3ff'
    }));

    // 10. Major Indian Cultural Festivals & Observances (Google Calendar / Master List)
    const festivalEvents = (suggestedHolidays || [])
      .filter(s => !s.isConfirmed)
      .map(s => ({
        _id: `fest_${s.code}`,
        title: `${s.icon || '🪔'} ${s.name}`,
        date: s.date,
        endDate: s.date,
        time: 'All Day',
        type: 'Major Festival',
        isFestival: true,
        description: s.description || 'Major cultural celebration.',
        color: '#d97706',
        bgColor: '#fef3c7'
      }));

    return [
      ...baseEvents,
      ...dynamicBirthdayEvents,
      ...dynamicAnniversaryEvents,
      ...holidayEvents,
      ...approvedLeaveEvents,
      ...taskEvents,
      ...projectDeadlineEvents,
      ...shiftEvents,
      ...privateMemoryEvents,
      ...festivalEvents
    ];
  }, [events, computedBirthdays, computedAnniversaries, holidays, leaves, tasks, projects, currentUser, currentDate, userMemories, suggestedHolidays]);

  // 30-Day Upcoming Birthdays & Anniversaries Advance Alerts
  const upcomingCelebrations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const celebrations = [];

    (computedBirthdays || []).forEach(b => {
      if (!b.eventDate) return;
      const bDate = new Date(b.eventDate);
      bDate.setHours(0, 0, 0, 0);
      const diffTime = bDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 30) {
        celebrations.push({
          id: `bday_${b.employeeId || b.name}`,
          type: 'birthday',
          name: b.name,
          avatar: b.avatar,
          role: b.role,
          date: b.eventDate,
          diffDays,
          badge: diffDays === 0 ? 'Today! 🎂' : (diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`)
        });
      }
    });

    (computedAnniversaries || []).forEach(a => {
      if (!a.eventDate) return;
      const aDate = new Date(a.eventDate);
      aDate.setHours(0, 0, 0, 0);
      const diffTime = aDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 30) {
        celebrations.push({
          id: `anniv_${a.employeeId || a.name}`,
          type: 'anniversary',
          name: a.name,
          avatar: a.avatar,
          role: a.role,
          yearsText: a.serviceYearsText,
          date: a.eventDate,
          diffDays,
          badge: diffDays === 0 ? 'Today! 🌟' : (diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`)
        });
      }
    });

    return celebrations.sort((a, b) => a.diffDays - b.diffDays);
  }, [computedBirthdays, computedAnniversaries]);

  // Next Upcoming Major Festival or Holiday Countdown
  const todayStr = new Date().toISOString().split('T')[0];
  const nextFestivalOrHoliday = useMemo(() => {
    const combined = [
      ...(suggestedHolidays || []),
      ...(holidays || []).map(h => ({
        code: h._id,
        name: h.name,
        date: h.date,
        icon: h.icon || '🏖️',
        isConfirmed: true,
        dayOfWeek: h.dayOfWeek
      }))
    ];

    const upcoming = combined
      .filter(item => item.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (upcoming.length === 0) return null;
    const next = upcoming[0];
    const diffDays = Math.max(0, Math.ceil((new Date(next.date + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / (1000 * 60 * 60 * 24)));
    return { ...next, diffDays };
  }, [suggestedHolidays, holidays, todayStr]);

  // Filter events by search, category pill, and shift visibility
  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      // 1. Shift schedule visibility
      if (ev.type === 'Shift Schedule' && !showShifts && eventTypeFilter !== 'shift') {
        return false;
      }

      // 2. Category pill filter
      if (eventTypeFilter === 'holiday') {
        const isHol = ev.isHoliday || ev.type?.toLowerCase().includes('holiday') || ev._id?.startsWith('hol_');
        if (!isHol) return false;
      } else if (eventTypeFilter === 'festival') {
        if (!ev.isFestival && !ev.isHoliday) return false;
      } else if (eventTypeFilter === 'memory') {
        if (!ev.isPrivateMemory) return false;
      } else if (eventTypeFilter === 'birthday') {
        if (ev.type !== 'Birthday') return false;
      } else if (eventTypeFilter === 'anniversary') {
        if (ev.type !== 'Work Anniversary') return false;
      } else if (eventTypeFilter === 'leave') {
        if (ev.type !== 'Approved Leave') return false;
      } else if (eventTypeFilter === 'project') {
        if (ev.type !== 'Project Deadline') return false;
      } else if (eventTypeFilter === 'task') {
        if (!ev.type?.toLowerCase().includes('task')) return false;
      } else if (eventTypeFilter === 'meeting') {
        if (
          ev.type === 'Birthday' ||
          ev.type === 'Work Anniversary' ||
          ev.isHoliday ||
          ev.isFestival ||
          ev.isPrivateMemory ||
          ev.type === 'Approved Leave' ||
          ev.type?.toLowerCase().includes('task') ||
          ev.type === 'Project Deadline' ||
          ev.type === 'Shift Schedule'
        ) return false;
      }

      // 3. Search query
      const q = search.toLowerCase();
      const matchesSearch = !search ||
        (ev.title || '').toLowerCase().includes(q) ||
        (ev.description || '').toLowerCase().includes(q) ||
        (ev.type || '').toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [allEvents, search, eventTypeFilter, showShifts]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open Date Memory Modal on Date Click
  const handleOpenDateMemory = (dateString) => {
    setSelectedMemoryDate(dateString);
    setIsDateMemoryOpen(true);
  };

  // Calendar days generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // 0 is Mon

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month overflow
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        events: filteredEvents.filter(e => e.date === dateStr)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const curDate = new Date(year, month, i);
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: true,
        events: filteredEvents.filter(e => e.date === dateStr)
      });
    }

    // Next month overflow
    const totalSlots = Math.ceil(days.length / 7) * 7;
    let nextDay = 1;
    while (days.length < totalSlots) {
      const nextDate = new Date(year, month + 1, nextDay);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({
        dayNum: nextDay,
        dateStr,
        isCurrentMonth: false,
        events: filteredEvents.filter(e => e.date === dateStr)
      });
      nextDay++;
    }

    return days;
  }, [year, month, filteredEvents]);

  const selectedEmployee = employees.find(e => e._id === selectedEmployeeId) || currentUser;

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 px-4 py-3 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-md min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 text-sky-500 dark:text-sky-400 flex items-center justify-center shrink-0">
            <CalendarIcon size={17} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="m-0 text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">Company Calendar & Daily Planner</h1>
              <span className="text-[10.5px] px-1.5 py-[1px] rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold">
                {filteredEvents.length} Items & Milestones
              </span>
            </div>
            <p className="mt-[1px] mb-0 text-[11.5px] text-slate-500 dark:text-slate-400">
              National festivals, gazetted holidays, team milestones & your private daily notes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Add Private Note Button */}
          <button
            onClick={() => handleOpenDateMemory(todayStr)}
            className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-purple-600 hover:bg-purple-700 text-white border-0 text-xs font-bold cursor-pointer shadow-sm transition-colors"
            title="Add a private memory or task for today or any date"
          >
            <Lock size={12} />
            <span>+ Private Note</span>
          </button>

          {/* Add Public Event Button */}
          <button
            onClick={() => setIsAddEventOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs font-bold cursor-pointer shadow-[0_1px_3px_rgba(37,99,235,0.2)] transition-colors"
          >
            <Plus size={14} />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Upcoming Festive Celebration Countdown Ribbon */}
      {nextFestivalOrHoliday && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/80 dark:border-amber-800/60 rounded-[10px] p-2.5 px-4 flex items-center justify-between flex-wrap gap-2 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{nextFestivalOrHoliday.icon || '🪔'}</span>
            <div>
              <span className="font-extrabold text-amber-950 dark:text-amber-200 text-xs">
                Next Celebration: {nextFestivalOrHoliday.name}
              </span>
              <span className="text-slate-600 dark:text-slate-400 font-medium ml-1.5">
                • {nextFestivalOrHoliday.date} ({nextFestivalOrHoliday.dayOfWeek || ''})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 text-[11px]">
              {nextFestivalOrHoliday.diffDays === 0 ? 'Today! 🎉' : nextFestivalOrHoliday.diffDays === 1 ? 'Tomorrow 🌟' : `In ${nextFestivalOrHoliday.diffDays} days`}
            </span>
            {isPrivileged && !nextFestivalOrHoliday.isConfirmed && (
              <button
                onClick={() => {
                  holidaySyncService.confirmHolidayAsCompanyOff(nextFestivalOrHoliday, currentUser);
                  addToast(`Confirmed "${nextFestivalOrHoliday.name}" as official paid company holiday!`, 'success');
                }}
                className="text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded cursor-pointer transition-colors shadow-xs"
              >
                Confirm as Off
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Top Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-[10px] border border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between flex-wrap gap-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-md">
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Employee Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Employee:</span>
            <div className="flex items-center gap-1.5 px-2 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <img
                src={selectedEmployee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={selectedEmployee?.name}
                className="w-[18px] h-[18px] rounded-full object-cover"
              />
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                disabled={!isPrivileged}
                title={!isPrivileged ? "Calendar schedule is scoped to your personal profile" : "Select employee schedule"}
                className={`border-0 bg-transparent outline-none text-xs font-semibold ${
                  !isPrivileged ? 'text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'text-slate-900 dark:text-slate-100 cursor-pointer'
                }`}
              >
                {isPrivileged ? (
                  employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} {emp._id === currentUser?._id ? "[It's You]" : ''}
                    </option>
                  ))
                ) : (
                  <option value={currentUser?._id || selectedEmployeeId}>
                    {currentUser?.name || 'My Schedule'} [It's You]
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* Client Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Client:</span>
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              className="h-[30px] px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
            >
              <option value="all">All Clients</option>
              <option value="enterprise">Enterprise Clients</option>
              <option value="internal">Internal Team</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-1.5 px-2.5 h-[30px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 min-w-[220px]">
            <Search size={13} className="text-slate-400 dark:text-sky-400 shrink-0" />
            <input
              type="text"
              placeholder="Search event, milestone, note, festival..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-0 outline-none text-xs w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* 30-Day Celebrations Advance Alerts Banner */}
      {upcomingCelebrations.length > 0 && (
        <div className="rounded-[10px] border border-orange-200 dark:border-orange-950/80 p-3 px-4 flex flex-col gap-2.5 bg-gradient-to-br from-orange-50/60 to-white dark:from-orange-950/20 dark:to-slate-900 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🎉</span>
              <span className="text-[13px] font-extrabold text-orange-900 dark:text-orange-400">
                Upcoming Celebrations (Next 30 Days)
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                {upcomingCelebrations.length} upcoming
              </span>
            </div>
            <span className="text-[11.5px] text-orange-800 dark:text-orange-300 font-medium">
              Advance notification to plan wishes & team greetings
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {upcomingCelebrations.map(c => (
              <div
                key={c.id}
                className={`flex items-center gap-2.5 px-3 py-[7px] rounded-lg border min-w-[220px] shrink-0 ${
                  c.type === 'birthday'
                    ? 'bg-orange-50/70 border-orange-200 dark:bg-slate-800 dark:border-slate-700'
                    : 'bg-purple-50/70 border-purple-200 dark:bg-slate-800 dark:border-slate-700'
                }`}
              >
                <img
                  src={c.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.name)}`}
                  alt={c.name}
                  className="w-[30px] h-[30px] rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis">
                    {c.type === 'birthday' ? '🎂' : '🌟'} {c.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {c.type === 'birthday' ? 'Birthday' : `${c.yearsText} Anniversary`} • {c.date}
                  </div>
                </div>
                <span className={`text-[10.5px] font-extrabold px-[7px] py-0.5 rounded text-white whitespace-nowrap ${
                  c.diffDays === 0 ? 'bg-red-500' : (c.type === 'birthday' ? 'bg-orange-600' : 'bg-purple-600')
                }`}>
                  {c.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter Pills Bar */}
      <div className="bg-white dark:bg-[#151e32] rounded-[10px] border border-slate-200 dark:border-[#243049] p-2 px-3 flex items-center justify-between flex-wrap gap-2 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'memory', label: '🔒 My Private Notes', count: (userMemories || []).length },
            { id: 'holiday', label: '🏖️ Official Holidays', count: (holidays || []).length },
            { id: 'festival', label: '🪔 Festivals & Vrats' },
            { id: 'project', label: '🚀 Projects Due', count: (projects || []).filter(p => p.deadline && p.status !== 'completed').length },
            { id: 'birthday', label: '🎂 Birthdays', count: (computedBirthdays || []).length },
            { id: 'anniversary', label: '🌟 Anniversaries', count: (computedAnniversaries || []).length },
            { id: 'leave', label: '🌴 Leaves' },
            { id: 'task', label: '📌 Tasks Due' },
            { id: 'meeting', label: '🏢 Events' }
          ].map(tab => {
            const isActive = eventTypeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setEventTypeFilter(tab.id)}
                className={`py-1.5 px-3 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'border border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700/60'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] font-bold py-0.5 px-1.5 rounded-full ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-[#243049] text-slate-500 dark:text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Shift visibility toggle */}
        <label className={`flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer py-1 px-2 rounded-md ${
          showShifts ? 'bg-slate-100 dark:bg-slate-800' : 'bg-transparent'
        }`}>
          <input
            type="checkbox"
            checked={showShifts}
            onChange={e => setShowShifts(e.target.checked)}
            className="cursor-pointer"
          />
          <span className="font-semibold">Show Daily Shifts</span>
        </label>
      </div>

      {/* Calendar Viewport */}
      <div className="bg-white dark:bg-[#151e32] rounded-xl border border-slate-200 dark:border-[#243049] p-[18px] shadow-sm dark:shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
        
        {/* Calendar Nav Bar (< > today, Month Year, month/week/day/list switcher) */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden">
              <button
                onClick={handlePrevMonth}
                className="py-1.5 px-3 bg-white dark:bg-slate-800 border-none border-r border-slate-300 dark:border-slate-700 cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextMonth}
                className="py-1.5 px-3 bg-white dark:bg-slate-800 border-none cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={handleToday}
              className="py-1.5 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              today
            </button>
          </div>

          {/* Current Month & Year Display */}
          <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50">
            {monthNames[month]} {year}
          </div>

          {/* View Switcher (month, week, day, list) */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {['month', 'week', 'day', 'list'].map(view => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`py-1 px-3.5 rounded-md border-none text-[12.5px] font-bold cursor-pointer transition-all capitalize ${
                  currentView === view
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-[#243049] pb-2 text-center text-[13px] font-bold text-slate-600 dark:text-slate-300">
          {DAYS_OF_WEEK.map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Month Calendar Grid */}
        {currentView === 'month' && (
          <div className="grid grid-cols-7 border-l border-t border-slate-100 dark:border-[#243049]">
            {calendarDays.map((day, idx) => {
              const isHolidayDay = day.events?.some(ev => 
                ev.isHoliday ||
                ev.type?.toLowerCase().includes('holiday') || 
                ev.title?.toLowerCase().includes('holiday') ||
                ev._id?.startsWith('hol_')
              );
              const isToday = day.dateStr === todayStr;
              const privateNotesCount = day.events.filter(e => e.isPrivateMemory).length;

              return (
                <div
                  key={idx}
                  onClick={() => handleOpenDateMemory(day.dateStr)}
                  className={`min-h-[105px] p-1.5 px-2 relative transition-all cursor-pointer group hover:bg-blue-50/25 dark:hover:bg-blue-900/10 ${
                    isHolidayDay
                      ? 'border-r-[1.5px] border-b-[1.5px] border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-[#2a1215]'
                      : `border-r border-b border-slate-100 dark:border-[#243049] ${
                          day.isCurrentMonth
                            ? 'bg-white dark:bg-[#151e32]'
                            : 'bg-slate-50/60 dark:bg-[#0d1322]'
                        }`
                  }`}
                  title="Click on any date to write private memory / view daily schedule"
                >
                  {/* Day Number, Tags & Quick Add Pin */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      {isHolidayDay && (
                        <span className="text-[9px] font-extrabold text-red-500 bg-red-100 dark:bg-[#451a1a] py-0.5 px-1.5 rounded tracking-wide">
                          🏖️ OFF
                        </span>
                      )}
                      {isToday && (
                        <span className="text-[9px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 py-0.5 px-1.5 rounded tracking-wide">
                          TODAY
                        </span>
                      )}
                      {privateNotesCount > 0 && (
                        <span className="text-[9px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 py-0.5 px-1.5 rounded tracking-wide flex items-center gap-0.5">
                          📌 {privateNotesCount}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Hover Quick Add Indicator */}
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800 px-1 rounded transition-opacity">
                        +Note
                      </span>
                      <span className={`text-[12.5px] font-bold flex items-center justify-center rounded-full ${
                        isToday
                          ? 'w-[22px] h-[22px] text-blue-400 bg-blue-50 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-500'
                          : isHolidayDay
                          ? 'text-red-400'
                          : day.isCurrentMonth
                          ? 'text-slate-900 dark:text-slate-50'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}>
                        {day.dayNum}
                      </span>
                    </div>
                  </div>

                  {/* Event & Note Pills */}
                  <div className="flex flex-col gap-0.5">
                    {day.events.slice(0, 3).map(ev => {
                      const isEvHoliday = ev.isHoliday || ev.type?.toLowerCase().includes('holiday') || ev.title?.toLowerCase().includes('holiday') || ev._id?.startsWith('hol_');
                      const isEvPrivate = ev.isPrivateMemory;

                      return (
                        <div
                          key={ev._id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isEvPrivate) {
                              handleOpenDateMemory(ev.date);
                            } else {
                              setSelectedEvent(ev);
                            }
                          }}
                          className={`py-0.5 px-1.5 rounded text-[11px] font-bold cursor-pointer truncate shadow-xs dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] ${
                            isEvHoliday
                              ? 'bg-red-100 dark:bg-[#451a1a] text-red-500 dark:text-red-300 border-l-[3px] border-red-500'
                              : isEvPrivate
                              ? 'bg-purple-100/80 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-l-[3px] border-purple-500'
                              : 'dark:bg-slate-800 dark:text-slate-100'
                          }`}
                          style={(!isEvHoliday && !isEvPrivate) ? {
                            backgroundColor: isDark ? undefined : (ev.bgColor || '#eff6ff'),
                            color: isDark ? undefined : (ev.color || '#2563eb'),
                            borderLeft: `3px solid ${ev.color || '#2563eb'}`
                          } : undefined}
                          title={`${ev.title} (${ev.time || 'All Day'})`}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {day.events.length > 3 && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentDate(new Date(day.dateStr));
                          setCurrentView('day');
                        }}
                        className="text-[10px] text-blue-600 font-bold cursor-pointer py-0.5 px-1 rounded bg-blue-50 text-center hover:bg-blue-100"
                        title="Click to view all events for this day"
                      >
                        +{day.events.length - 3} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Week View */}
        {currentView === 'week' && (
          <div className="grid grid-cols-7 border-l border-t border-slate-100 dark:border-slate-800 mt-3">
            {calendarDays.slice(0, 7).map((day, idx) => (
              <div
                key={idx}
                onClick={() => handleOpenDateMemory(day.dateStr)}
                className="min-h-[260px] border-r border-b border-slate-100 dark:border-slate-800 p-2.5 bg-white dark:bg-[#151e32] cursor-pointer hover:bg-slate-50/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[13px] font-extrabold text-slate-900 dark:text-slate-100">
                    {DAYS_OF_WEEK[idx]} ({day.dateStr})
                  </div>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1 rounded">
                    +Note
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {day.events.map(ev => (
                    <div
                      key={ev._id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (ev.isPrivateMemory) {
                          handleOpenDateMemory(ev.date);
                        } else {
                          setSelectedEvent(ev);
                        }
                      }}
                      className="p-1.5 px-2 rounded-md text-[11.5px] font-bold cursor-pointer shadow-xs"
                      style={{
                        backgroundColor: ev.bgColor,
                        color: ev.color,
                        borderLeft: `3px solid ${ev.color}`
                      }}
                    >
                      <div>{ev.title}</div>
                      <div className="text-[10.5px] opacity-80 mt-0.5">{ev.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Day View */}
        {currentView === 'day' && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="p-3.5 px-[18px] bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Events for {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <button
                onClick={() => handleOpenDateMemory(currentDate.toISOString().split('T')[0])}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-purple-600 text-white text-xs font-bold cursor-pointer hover:bg-purple-700 transition-colors"
              >
                <Lock size={11} />
                <span>+ Add Note for this Day</span>
              </button>
            </div>
            {filteredEvents.filter(e => e.date === currentDate.toISOString().split('T')[0] || e.isRecurring).length > 0 ? (
              filteredEvents.filter(e => e.date === currentDate.toISOString().split('T')[0] || e.isRecurring).map(ev => (
                <div
                  key={ev._id}
                  onClick={() => {
                    if (ev.isPrivateMemory) {
                      handleOpenDateMemory(ev.date);
                    } else {
                      setSelectedEvent(ev);
                    }
                  }}
                  className="p-4 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151e32] flex items-center justify-between cursor-pointer hover:border-blue-400"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="py-2 px-3 rounded-lg font-extrabold text-[13px]"
                      style={{
                        backgroundColor: ev.bgColor,
                        color: ev.color
                      }}
                    >
                      {ev.time}
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{ev.title}</div>
                      <div className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {ev.type} • {ev.location || 'Personal Planner'}
                      </div>
                    </div>
                  </div>
                  <span
                    className="py-1 px-2.5 rounded-md text-xs font-bold"
                    style={{
                      backgroundColor: ev.bgColor,
                      color: ev.color
                    }}
                  >
                    {ev.type}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400">
                <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                <div className="text-[13.5px]">No events scheduled for this day</div>
                <button
                  onClick={() => handleOpenDateMemory(currentDate.toISOString().split('T')[0])}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer hover:bg-blue-700"
                >
                  + Add First Note / Task
                </button>
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {currentView === 'list' && (
          <div className="mt-4 flex flex-col gap-2.5">
            {filteredEvents.map(ev => (
              <div
                key={ev._id}
                onClick={() => {
                  if (ev.isPrivateMemory) {
                    handleOpenDateMemory(ev.date);
                  } else {
                    setSelectedEvent(ev);
                  }
                }}
                className="py-3 px-4 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151e32] flex items-center justify-between cursor-pointer hover:border-blue-400"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="py-2 px-3 rounded-lg font-extrabold text-xs text-center min-w-[90px]"
                    style={{
                      backgroundColor: ev.bgColor,
                      color: ev.color
                    }}
                  >
                    {ev.date}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {ev.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {ev.time} • {ev.type} • {ev.location || 'Calendar Record'}
                    </div>
                  </div>
                </div>

                <span
                  className="py-1 px-2.5 rounded-md text-[11.5px] font-bold"
                  style={{
                    backgroundColor: ev.bgColor,
                    color: ev.color
                  }}
                >
                  {ev.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Public Event Modal */}
      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
      />

      {/* Private Date Memory Modal (User Isolated) */}
      <DateMemoryModal
        isOpen={isDateMemoryOpen}
        onClose={() => setIsDateMemoryOpen(false)}
        selectedDate={selectedMemoryDate}
        currentUser={currentUser}
        dayEvents={filteredEvents.filter(e => e.date === selectedMemoryDate)}
      />

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[1000] p-5">
          <div className="bg-white dark:bg-[#151e32] rounded-2xl w-full max-w-[480px] p-6 shadow-2xl dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] border border-slate-200 dark:border-[#243049]">
            <div className="flex items-center justify-between mb-4">
              <span
                className="py-1 px-2.5 rounded-md text-xs font-bold"
                style={{
                  backgroundColor: isDark ? '#1e293b' : selectedEvent.bgColor,
                  color: isDark ? '#38bdf8' : selectedEvent.color
                }}
              >
                {selectedEvent.type}
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="bg-transparent border-none text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-3">
              {selectedEvent.title}
            </h3>

            {/* Employee Profile Preview for Birthdays & Anniversaries */}
            {(selectedEvent.type === 'Birthday' || selectedEvent.type === 'Work Anniversary') && selectedEvent.employeeName && (
              <div
                className="flex items-center gap-3 p-3 px-3.5 rounded-[10px] mb-4 border border-slate-200 dark:border-slate-700"
                style={{
                  backgroundColor: isDark ? '#1e293b' : selectedEvent.bgColor,
                  borderColor: isDark ? '#334155' : `${selectedEvent.color}30`
                }}
              >
                <img
                  src={selectedEvent.employeeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={selectedEvent.employeeName}
                  className="w-[42px] h-[42px] rounded-full object-cover"
                  style={{ border: `2px solid ${selectedEvent.color}` }}
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {selectedEvent.employeeName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedEvent.employeeRole || 'Colleague'}
                  </div>
                </div>
                <span
                  className="text-[11.5px] font-bold bg-white dark:bg-[#151e32] py-1 px-2 rounded-md shadow-xs"
                  style={{ color: isDark ? '#38bdf8' : selectedEvent.color }}
                >
                  {selectedEvent.type === 'Work Anniversary' ? `${selectedEvent.serviceYearsText || '1st'} Year Milestone` : 'Birthday'}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2 text-[13px] text-slate-600 dark:text-slate-300 mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-sky-400" />
                <span>Date: <strong className="text-slate-900 dark:text-white">{selectedEvent.date}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-sky-400" />
                <span>Time: {selectedEvent.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-sky-400" />
                <span>Location: {selectedEvent.location}</span>
              </div>
              {selectedEvent.isRecurring && (
                <div className="flex items-center gap-2 text-green-400 font-semibold">
                  <Repeat size={15} />
                  <span>Annual Recurring Event (Automatically repeats every year)</span>
                </div>
              )}
            </div>

            {selectedEvent.description && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed mb-[18px]">
                {selectedEvent.description}
              </div>
            )}

            <div className="flex justify-end gap-2">
              {selectedEvent.type === 'Work Anniversary' && (
                <button
                  onClick={() => {
                    addToast(`🎉 Work Anniversary congratulations sent to ${selectedEvent.employeeName || 'Colleague'}!`, 'success');
                    setSelectedEvent(null);
                  }}
                  className="py-2 px-4 rounded-lg border-none bg-purple-600 hover:bg-purple-700 text-white text-[12.5px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Award size={14} /> Send Congratulations 🌟
                </button>
              )}
              {selectedEvent.type === 'Birthday' && (
                <button
                  onClick={() => {
                    addToast(`🎂 Birthday wishes sent to ${selectedEvent.employeeName || 'Colleague'}!`, 'success');
                    setSelectedEvent(null);
                  }}
                  className="py-2 px-4 rounded-lg border-none bg-amber-600 hover:bg-amber-700 text-white text-[12.5px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Heart size={14} /> Send Birthday Wishes 🎉
                </button>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12.5px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
