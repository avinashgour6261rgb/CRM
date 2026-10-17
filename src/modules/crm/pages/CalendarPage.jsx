/**
 * @file CalendarPage.jsx
 * @description Interactive Company Events & Calendar page matching Screenshot 3 with automatic birthday generation.
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
  Award
} from 'lucide-react';
import { useCRM } from '../../../shared/context/CRMContext';
import { useHR } from '../../hr/context/HRContext';
import { useWork } from '../../work/context/WorkContext';
import { useToast } from '../../../shared/context/ToastContext';
import { AddEventModal } from '../../../shared/components/modals/AddEventModal';
import { getCompanySettings } from '../../../shared/services/companySettingsService';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarPage = () => {
  const { addToast } = useToast();
  const { events, deleteEvent, computedBirthdays, computedAnniversaries } = useCRM();
  const { holidays, currentUser, employees, leaves } = useHR();
  const { tasks } = useWork();

  const isPrivileged = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.systemRole === 'hr' || currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.role === 'manager';

  const [currentDate, setCurrentDate] = useState(new Date()); // Dynamic live current date
  const [currentView, setCurrentView] = useState('month'); // 'month' | 'week' | 'day' | 'list'
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Category and View Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('all'); // 'all' | 'holiday' | 'birthday' | 'anniversary' | 'leave' | 'task' | 'meeting'
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

  // =========================================================================
  // COMBINE ALL EVENTS + DYNAMIC LEAVES + SHIFT SCHEDULES + BIRTHDAYS + HOLIDAYS + TASKS
  // =========================================================================
  const allEvents = useMemo(() => {
    // 1. Base User & Company Events
    const baseEvents = (events || []).map(e => ({
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
    const isPrivileged = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.systemRole === 'hr';
    (leaves || []).filter(l => l.status === 'approved').forEach(l => {
      const isMine = (l.employeeId && currentUser?._id && String(l.employeeId) === String(currentUser._id)) ||
                     (l.employee && currentUser?._id && String(l.employee) === String(currentUser._id)) ||
                     (l.employeeCode && currentUser?.employeeCode && String(l.employeeCode) === String(currentUser.employeeCode)) ||
                     (l.employeeName && currentUser?.name && l.employeeName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());

      if (!isPrivileged && !isMine) return;

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

    // 6. Dynamic Tasks Due Dates (Scoped by user role)
    const todayStr = new Date().toISOString().split('T')[0];
    const taskEvents = (tasks || [])
      .filter(t => t?.dueDate)
      .filter(t => {
        if (isPrivileged) return true;
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
          description: `Task assigned to ${t.assignedToName || 'team'}. Status: ${t.status || 'Active'}. ${isOverdue ? '⚠️ Deadline Expired!' : ''}`,
          color: isOverdue ? '#dc2626' : '#0891b2',
          bgColor: isOverdue ? '#fee2e2' : '#ecfeff'
        };
      });

    // 7. Dynamic Work Shift Schedules (from Company Settings)
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

    return [
      ...baseEvents,
      ...dynamicBirthdayEvents,
      ...dynamicAnniversaryEvents,
      ...holidayEvents,
      ...approvedLeaveEvents,
      ...taskEvents,
      ...shiftEvents
    ];
  }, [events, computedBirthdays, computedAnniversaries, holidays, leaves, tasks, currentUser, currentDate]);

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
      } else if (eventTypeFilter === 'birthday') {
        if (ev.type !== 'Birthday') return false;
      } else if (eventTypeFilter === 'anniversary') {
        if (ev.type !== 'Work Anniversary') return false;
      } else if (eventTypeFilter === 'leave') {
        if (ev.type !== 'Approved Leave') return false;
      } else if (eventTypeFilter === 'task') {
        if (!ev.type?.toLowerCase().includes('task')) return false;
      } else if (eventTypeFilter === 'meeting') {
        if (
          ev.type === 'Birthday' ||
          ev.type === 'Work Anniversary' ||
          ev.isHoliday ||
          ev.type === 'Approved Leave' ||
          ev.type?.toLowerCase().includes('task') ||
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        backgroundColor: '#ffffff',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CalendarIcon size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Company Calendar & Schedules</h1>
              <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '700' }}>
                {filteredEvents.length} Events & Birthdays
              </span>
            </div>
            <p style={{ margin: '1px 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Synchronized view of meetings, birthdays, work anniversaries & holiday schedule
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddEventOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 15px',
            borderRadius: '8px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(37,99,235,0.25)'
          }}
        >
          <Plus size={14} />
          Add Event / Reminder
        </button>
      </div>

      {/* Filter and Top Navigation Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Employee Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <span style={{ fontWeight: '600' }}>Employee:</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 8px',
              height: '30px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc'
            }}>
              <img
                src={selectedEmployee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={selectedEmployee?.name}
                style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                disabled={!isPrivileged}
                title={!isPrivileged ? "Calendar schedule is scoped to your personal profile" : "Select employee schedule"}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: !isPrivileged ? '#64748b' : '#0f172a',
                  cursor: !isPrivileged ? 'not-allowed' : 'pointer'
                }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            <span style={{ fontWeight: '600' }}>Client:</span>
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              style={{
                height: '30px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Clients</option>
              <option value="enterprise">Enterprise Clients</option>
              <option value="internal">Internal Team</option>
            </select>
          </div>

          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 10px',
            height: '30px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            minWidth: '220px'
          }}>
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search event, milestone, birthday..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '12px',
                width: '100%',
                backgroundColor: 'transparent',
                color: '#0f172a'
              }}
            />
          </div>
        </div>
      </div>

      {/* 30-Day Celebrations Advance Alerts Banner */}
      {upcomingCelebrations.length > 0 && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #fed7aa',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'linear-gradient(135deg, #fffaf5 0%, #ffffff 100%)',
          boxShadow: '0 1px 3px rgba(249, 115, 22, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🎉</span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#9a3412' }}>
                Upcoming Celebrations (Next 30 Days)
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#ffedd5',
                color: '#c2410c'
              }}>
                {upcomingCelebrations.length} upcoming
              </span>
            </div>
            <span style={{ fontSize: '11.5px', color: '#9a3412', fontWeight: '500' }}>
              Advance notification to plan wishes & team greetings
            </span>
          </div>

          <div style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '4px'
          }}>
            {upcomingCelebrations.map(c => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  backgroundColor: c.type === 'birthday' ? '#fff7ed' : '#f5f3ff',
                  border: `1px solid ${c.type === 'birthday' ? '#fed7aa' : '#ddd6fe'}`,
                  minWidth: '220px',
                  flexShrink: 0
                }}
              >
                <img
                  src={c.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.name)}`}
                  alt={c.name}
                  style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.type === 'birthday' ? '🎂' : '🌟'} {c.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {c.type === 'birthday' ? 'Birthday' : `${c.yearsText} Anniversary`} • {c.date}
                  </div>
                </div>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '800',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  backgroundColor: c.diffDays === 0 ? '#ef4444' : (c.type === 'birthday' ? '#ea580c' : '#7c3aed'),
                  color: '#ffffff',
                  whiteSpace: 'nowrap'
                }}>
                  {c.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter Pills Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Items' },
            { id: 'holiday', label: '🏖️ Official Holidays', count: (holidays || []).length },
            { id: 'birthday', label: '🎂 Birthdays', count: (computedBirthdays || []).length },
            { id: 'anniversary', label: '🌟 Anniversaries', count: (computedAnniversaries || []).length },
            { id: 'leave', label: '🌴 Approved Leaves' },
            { id: 'task', label: '📌 Tasks Due' },
            { id: 'meeting', label: '🏢 Company Events' }
          ].map(tab => {
            const isActive = eventTypeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setEventTypeFilter(tab.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                  color: isActive ? '#1d4ed8' : '#475569',
                  fontSize: '12px',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? '#2563eb' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#64748b'
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Shift visibility toggle */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#475569',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: showShifts ? '#f1f5f9' : 'transparent'
        }}>
          <input
            type="checkbox"
            checked={showShifts}
            onChange={e => setShowShifts(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontWeight: '600' }}>Show Daily Shifts</span>
        </label>
      </div>

      {/* Calendar Viewport Matching Screenshot 3 */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        
        {/* Calendar Nav Bar (< > today, Month Year, month/week/day/list switcher) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
              <button
                onClick={handlePrevMonth}
                style={{
                  padding: '6px 12px',
                  background: '#ffffff',
                  border: 'none',
                  borderRight: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextMonth}
                style={{
                  padding: '6px 12px',
                  background: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={handleToday}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              today
            </button>
          </div>

          {/* Current Month & Year Display */}
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
            {monthNames[month]} {year}
          </div>

          {/* View Switcher (month, week, day, list) */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            {['month', 'week', 'day', 'list'].map(view => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: currentView === view ? '#0f172a' : 'transparent',
                  color: currentView === view ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease',
                  textTransform: 'capitalize'
                }}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* Days of Week Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '8px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: '700',
          color: '#475569'
        }}>
          {DAYS_OF_WEEK.map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Month Calendar Grid */}
        {currentView === 'month' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderLeft: '1px solid #f1f5f9',
            borderTop: '1px solid #f1f5f9'
          }}>
            {calendarDays.map((day, idx) => {
              const isHolidayDay = day.events?.some(ev => 
                ev.isHoliday ||
                ev.type?.toLowerCase().includes('holiday') || 
                ev.title?.toLowerCase().includes('holiday') ||
                ev._id?.startsWith('hol_')
              );

              return (
                <div
                  key={idx}
                  style={{
                    minHeight: '100px',
                    borderRight: isHolidayDay ? '1.5px solid #fca5a5' : '1px solid #f1f5f9',
                    borderBottom: isHolidayDay ? '1.5px solid #fca5a5' : '1px solid #f1f5f9',
                    padding: '6px 8px',
                    backgroundColor: isHolidayDay 
                      ? '#fef2f2' 
                      : (day.isCurrentMonth ? '#ffffff' : '#fafafa'),
                    position: 'relative',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  {/* Day Number, Today & Holiday Tag */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isHolidayDay && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '800',
                          color: '#dc2626',
                          backgroundColor: '#fee2e2',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          letterSpacing: '0.2px'
                        }}>
                          🏖️ HOLIDAY
                        </span>
                      )}
                      {day.dateStr === new Date().toISOString().split('T')[0] && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '800',
                          color: '#1d4ed8',
                          backgroundColor: '#dbeafe',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          letterSpacing: '0.2px'
                        }}>
                          TODAY
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '12.5px',
                      fontWeight: '700',
                      color: isHolidayDay ? '#dc2626' : (day.dateStr === new Date().toISOString().split('T')[0] ? '#2563eb' : (day.isCurrentMonth ? '#0f172a' : '#cbd5e1')),
                      width: day.dateStr === new Date().toISOString().split('T')[0] ? '22px' : 'auto',
                      height: day.dateStr === new Date().toISOString().split('T')[0] ? '22px' : 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      backgroundColor: day.dateStr === new Date().toISOString().split('T')[0] ? '#eff6ff' : 'transparent',
                      border: day.dateStr === new Date().toISOString().split('T')[0] ? '1px solid #93c5fd' : 'none'
                    }}>
                      {day.dayNum}
                    </span>
                  </div>

                  {/* Event Pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {day.events.slice(0, 3).map(ev => {
                      const isEvHoliday = ev.isHoliday || ev.type?.toLowerCase().includes('holiday') || ev.title?.toLowerCase().includes('holiday') || ev._id?.startsWith('hol_');
                      return (
                        <div
                          key={ev._id}
                          onClick={() => setSelectedEvent(ev)}
                          style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: isEvHoliday ? '#fee2e2' : (ev.bgColor || '#eff6ff'),
                            color: isEvHoliday ? '#b91c1c' : (ev.color || '#2563eb'),
                            borderLeft: `3px solid ${isEvHoliday ? '#ef4444' : (ev.color || '#2563eb')}`,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                          }}
                          title={`${ev.title} (${ev.time})`}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {day.events.length > 3 && (
                      <div
                        onClick={() => {
                          setCurrentDate(new Date(day.dateStr));
                          setCurrentView('day');
                        }}
                        style={{
                          fontSize: '10px',
                          color: '#2563eb',
                          fontWeight: '700',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          backgroundColor: '#eff6ff',
                          textAlign: 'center'
                        }}
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderLeft: '1px solid #f1f5f9',
            borderTop: '1px solid #f1f5f9',
            marginTop: '12px'
          }}>
            {calendarDays.slice(0, 7).map((day, idx) => (
              <div
                key={idx}
                style={{
                  minHeight: '260px',
                  borderRight: '1px solid #f1f5f9',
                  borderBottom: '1px solid #f1f5f9',
                  padding: '10px',
                  backgroundColor: '#ffffff'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                  {DAYS_OF_WEEK[idx]} ({day.dateStr})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {day.events.map(ev => (
                    <div
                      key={ev._id}
                      onClick={() => setSelectedEvent(ev)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        backgroundColor: ev.bgColor,
                        color: ev.color,
                        borderLeft: `3px solid ${ev.color}`,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div>{ev.title}</div>
                      <div style={{ fontSize: '10.5px', opacity: 0.8, marginTop: '2px' }}>{ev.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Day View */}
        {currentView === 'day' && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              padding: '14px 18px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontWeight: '700',
              fontSize: '14px',
              color: '#0f172a'
            }}>
              Events for {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            {filteredEvents.filter(e => e.date === currentDate.toISOString().split('T')[0] || e.isRecurring).length > 0 ? (
              filteredEvents.filter(e => e.date === currentDate.toISOString().split('T')[0] || e.isRecurring).map(ev => (
                <div
                  key={ev._id}
                  onClick={() => setSelectedEvent(ev)}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: ev.bgColor,
                      color: ev.color,
                      fontWeight: '800',
                      fontSize: '13px'
                    }}>
                      {ev.time}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>{ev.title}</div>
                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                        {ev.type} • {ev.location}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    backgroundColor: ev.bgColor,
                    color: ev.color
                  }}>
                    {ev.type}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <CalendarIcon size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div style={{ fontSize: '13.5px' }}>No events scheduled for this day</div>
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {currentView === 'list' && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredEvents.map(ev => (
              <div
                key={ev._id}
                onClick={() => setSelectedEvent(ev)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: ev.bgColor,
                    color: ev.color,
                    fontWeight: '800',
                    fontSize: '12px',
                    textAlign: 'center'
                  }}>
                    {ev.date}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                      {ev.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {ev.time} • {ev.type} • {ev.location}
                    </div>
                  </div>
                </div>

                <span style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  backgroundColor: ev.bgColor,
                  color: ev.color
                }}>
                  {ev.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
      />

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                backgroundColor: selectedEvent.bgColor,
                color: selectedEvent.color
              }}>
                {selectedEvent.type}
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px' }}>
              {selectedEvent.title}
            </h3>

            {/* Employee Profile Preview for Birthdays & Anniversaries */}
            {(selectedEvent.type === 'Birthday' || selectedEvent.type === 'Work Anniversary') && selectedEvent.employeeName && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                backgroundColor: selectedEvent.bgColor,
                borderRadius: '10px',
                border: `1px solid ${selectedEvent.color}30`,
                marginBottom: '16px'
              }}>
                <img
                  src={selectedEvent.employeeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={selectedEvent.employeeName}
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${selectedEvent.color}` }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                    {selectedEvent.employeeName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedEvent.employeeRole || 'Colleague'}
                  </div>
                </div>
                <span style={{
                  fontSize: '11.5px',
                  fontWeight: '700',
                  color: selectedEvent.color,
                  backgroundColor: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  {selectedEvent.type === 'Work Anniversary' ? `${selectedEvent.serviceYearsText || '1st'} Year Milestone` : 'Birthday'}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={16} color="#2563eb" />
                <span>Date: <strong>{selectedEvent.date}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#2563eb" />
                <span>Time: {selectedEvent.time}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color="#2563eb" />
                <span>Location: {selectedEvent.location}</span>
              </div>
              {selectedEvent.isRecurring && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: '600' }}>
                  <Repeat size={15} />
                  <span>Annual Recurring Event (Automatically repeats every year)</span>
                </div>
              )}
            </div>

            {selectedEvent.description && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                fontSize: '13px',
                color: '#334155',
                lineHeight: '1.5',
                marginBottom: '18px'
              }}>
                {selectedEvent.description}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {selectedEvent.type === 'Work Anniversary' && (
                <button
                  onClick={() => {
                    addToast(`🎉 Work Anniversary congratulations sent to ${selectedEvent.employeeName || 'Colleague'}!`, 'success');
                    setSelectedEvent(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#7c3aed',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
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
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Heart size={14} /> Send Birthday Wishes 🎉
                </button>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
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
