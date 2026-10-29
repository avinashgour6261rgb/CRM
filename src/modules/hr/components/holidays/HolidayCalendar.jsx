import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Lock,
  Filter,
  Search,
  Sparkles,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { useConfirm } from '../../../../shared/context/ConfirmContext';
import { isHRorAdmin } from '../../../../shared/utils/permissionUtils';
import { AddHolidayModal } from './AddHolidayModal';
import { holidaySyncService } from '../../services/holidaySyncService';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const HolidayCalendar = () => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { holidays, deleteHoliday, currentUser, searchQuery } = useHR();

  const canManageHolidays = isHRorAdmin(currentUser);

  const now = new Date();
  const [currentDate, setCurrentDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [calendarView, setCalendarView] = useState('month'); // 'month', 'week', 'day', 'list'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState('');
  const [listMonthFilter, setListMonthFilter] = useState('all'); // 'all' or 1-12
  const [listTypeFilter, setListTypeFilter] = useState('all'); // 'all' | 'official' | 'festival'
  const [suggestedHolidays, setSuggestedHolidays] = useState([]);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Load Pan-India suggested festivals and national holidays (e.g. Dhanteras, Diwali, Govardhan, Chhath, etc.)
  const loadSuggested = async () => {
    try {
      const list = await holidaySyncService.getSuggestedHolidays(currentYear);
      setSuggestedHolidays(list || []);
    } catch (err) {
      console.warn('[HolidayCalendar] Failed to fetch suggested festivals:', err);
    }
  };

  useEffect(() => {
    loadSuggested();
    const handleSync = () => loadSuggested();
    window.addEventListener('hrms_storage_change', handleSync);
    window.addEventListener('ems_holidays_updated', handleSync);
    return () => {
      window.removeEventListener('hrms_storage_change', handleSync);
      window.removeEventListener('ems_holidays_updated', handleSync);
    };
  }, [currentYear, holidays]);

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    const todayNow = new Date();
    setCurrentDate(new Date(todayNow.getFullYear(), todayNow.getMonth(), 1));
  };

  const handleMonthChange = (e) => {
    const m = parseInt(e.target.value, 10);
    setCurrentDate(new Date(currentYear, m, 1));
  };

  const handleYearChange = (e) => {
    const y = parseInt(e.target.value, 10);
    setCurrentDate(new Date(y, currentMonth, 1));
  };

  // Calendar calculations for Month View
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const startDayOffset = (firstDayOfMonth + 6) % 7; // Monday = 0

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarCells = [];

  // Previous month padding cells
  for (let i = startDayOffset - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const d = new Date(currentYear, currentMonth - 1, dayNum);
    calendarCells.push({
      day: dayNum,
      isCurrentMonth: false,
      dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    });
  }

  // Current month cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      dateStr: dateStr
    });
  }

  // Next month padding cells
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let n = 1; n <= remainingCells; n++) {
    const d = new Date(currentYear, currentMonth + 1, n);
    calendarCells.push({
      day: n,
      isCurrentMonth: false,
      dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    });
  }

  const handleCellClick = (dateStr) => {
    if (!canManageHolidays) {
      addToast('🔒 Access Restricted: Only HR & Admin can declare or modify company holidays.', 'warning');
      return;
    }
    setSelectedDayDate(dateStr);
    setIsAddModalOpen(true);
  };

  // Safe holiday cancellation with modern confirmation modal
  const handleCancelHolidayClick = async (hol) => {
    if (!canManageHolidays) return;
    const ok = await confirm({
      title: 'Cancel Company Holiday?',
      message: `Are you sure you want to cancel "${hol.name}" on ${hol.date}? This will immediately restore regular working day status for all employees across the company.`,
      confirmText: 'Yes, Cancel Holiday',
      cancelText: 'Keep Holiday',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await deleteHoliday(hol._id || hol.code || hol.date);
      addToast(`Holiday "${hol.name}" cancelled successfully.`, 'success');
      loadSuggested();
    } catch {
      addToast('Failed to cancel holiday.', 'error');
    }
  };

  // 1-Click: Confirm Indian cultural festival as paid company holiday
  const handleConfirmFestivalClick = async (fest) => {
    if (!canManageHolidays) return;
    const ok = await confirm({
      title: 'Declare Official Paid Holiday?',
      message: `Do you want to declare "${fest.name}" (${fest.date}) as an official paid holiday for all employees across the company?`,
      confirmText: 'Yes, Declare Holiday',
      cancelText: 'Keep as Normal Day',
      variant: 'primary'
    });
    if (!ok) return;

    try {
      await holidaySyncService.confirmHolidayAsCompanyOff(fest, currentUser);
      addToast(`Declared "${fest.name}" as official paid company holiday!`, 'success');
      loadSuggested();
    } catch {
      addToast('Failed to declare holiday.', 'error');
    }
  };

  // Combined master items for List View (combining declared company holidays and cultural festivals)
  const allListItems = useMemo(() => {
    const confirmedMap = new Map();
    (holidays || []).forEach(h => {
      confirmedMap.set(h.date, h);
    });

    const unconfirmed = (suggestedHolidays || []).filter(s => !confirmedMap.has(s.date));

    const combined = [
      ...(holidays || []).map(h => ({
        ...h,
        isConfirmed: true,
        displayType: h.type || 'Company Holiday'
      })),
      ...unconfirmed.map(f => ({
        ...f,
        isConfirmed: false,
        displayType: f.type || 'Major Indian Festival'
      }))
    ];

    return combined.sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays, suggestedHolidays]);

  // Filtered list for List View (supports viewing all 12 months or specific month and type)
  const filteredListHolidays = useMemo(() => {
    return allListItems.filter(item => {
      if (!item || !item.date) return false;

      // Month filter
      if (listMonthFilter !== 'all') {
        const m = parseInt(item.date.split('-')[1], 10);
        if (m !== parseInt(listMonthFilter, 10)) return false;
      }

      // Type filter
      if (listTypeFilter === 'official' && !item.isConfirmed) return false;
      if (listTypeFilter === 'festival' && item.isConfirmed) return false;

      // Search Query filter
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = (item.name || '').toLowerCase().includes(q) ||
                        (item.description || '').toLowerCase().includes(q) ||
                        (item.displayType || '').toLowerCase().includes(q) ||
                        (item.date || '').includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [allListItems, listMonthFilter, listTypeFilter, searchQuery]);

  return (
    <div className="table-card p-0 overflow-hidden shadow-xs">
      {/* Calendar Header Controls */}
      <div className="flex items-center justify-between p-3.5 px-5 border-b border-slate-200 bg-white flex-wrap gap-3">
        {/* Left: Prev / Next / Today & Quick Month-Year Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden bg-white">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors border-none border-r border-slate-300 cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors border-none cursor-pointer"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="h-8 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors"
          >
            Today
          </button>

          {/* Quick Jump Month Dropdown */}
          <select
            value={currentMonth}
            onChange={handleMonthChange}
            className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 outline-none cursor-pointer hover:border-blue-400"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx}>{name}</option>
            ))}
          </select>

          {/* Quick Jump Year Dropdown */}
          <select
            value={currentYear}
            onChange={handleYearChange}
            className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 outline-none cursor-pointer hover:border-blue-400"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>

        {/* Center: Month Year Title */}
        <div className="text-base font-extrabold text-slate-900 tracking-tight">
          {monthName}
        </div>

        {/* Right: View Switcher (month | week | day | list) */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {['month', 'week', 'day', 'list'].map((view) => (
            <button
              key={view}
              onClick={() => setCalendarView(view)}
              className={`h-[28px] px-3.5 rounded-md border-none capitalize text-xs font-bold cursor-pointer transition-all ${
                calendarView === view ? 'bg-blue-600 text-white shadow-xs' : 'bg-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Visual Legend Bar */}
      <div className="flex items-center gap-4 px-5 py-2 bg-slate-50 border-b border-slate-200 text-xs flex-wrap">
        <span className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider">Legend:</span>
        <div className="flex items-center gap-1.5 font-bold text-red-700">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
          <span>🏖️ Official Paid Off</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold text-amber-700">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          <span>🪔 Indian Cultural Festival</span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-blue-700">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
          <span>🏛️ Gazetted / Public Holiday</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
          <span>💼 Working Day</span>
        </div>
      </div>

      {/* Main Month Grid View */}
      {calendarView === 'month' && (
        <div>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-600 py-2.5">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 bg-slate-200 gap-px">
            {calendarCells.map((cell, index) => {
              const dayHolidays = (holidays || []).filter(h => h.date === cell.dateStr);
              const dayFestivals = (suggestedHolidays || []).filter(s =>
                s.date === cell.dateStr &&
                !dayHolidays.some(h => h.date === s.date || (h.name && s.name && h.name.toLowerCase().trim() === s.name.toLowerCase().trim()))
              );
              const isTodayCell = cell.dateStr === todayStr;
              const hasOff = dayHolidays.length > 0;
              const hasFestival = dayFestivals.length > 0;

              return (
                <div
                  key={index}
                  onClick={() => handleCellClick(cell.dateStr)}
                  className={`min-h-[115px] p-2 flex flex-col justify-between cursor-pointer transition-all ${
                    hasOff
                      ? 'bg-red-50/40 hover:bg-red-50/70 border-t-2 border-t-red-500'
                      : hasFestival
                      ? 'bg-amber-50/40 hover:bg-amber-50/70 border-t-2 border-t-amber-500'
                      : (cell.isCurrentMonth ? 'bg-white hover:bg-blue-50/20' : 'bg-slate-50/70')
                  }`}
                  title={canManageHolidays ? "Click date to declare company holiday" : ""}
                >
                  <div className="flex items-center justify-between mb-1">
                    {hasOff ? (
                      <span className="text-[9.5px] font-extrabold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded shadow-2xs">
                        🏖️ PAID OFF
                      </span>
                    ) : hasFestival ? (
                      <span className="text-[9.5px] font-extrabold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded shadow-2xs">
                        🪔 FESTIVAL
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className={`text-xs ml-auto font-bold flex items-center justify-center rounded-full ${
                      isTodayCell
                        ? 'w-5 h-5 bg-blue-600 text-white shadow-xs'
                        : cell.isCurrentMonth
                        ? 'text-slate-900'
                        : 'text-slate-300'
                    }`}>
                      {cell.day}
                    </span>
                  </div>

                  {/* Holiday & Festival Badges */}
                  <div className="flex flex-col gap-1 mt-0.5 flex-1 overflow-hidden">
                    {/* Confirmed Paid Off Holidays */}
                    {dayHolidays.map(hol => (
                      <div
                        key={hol._id || hol.code || hol.date}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 px-1.5 rounded text-[11px] font-bold flex items-center justify-between gap-1 shadow-2xs border-l-[3px] bg-red-100/80 border-red-500 text-red-900"
                        title={`${hol.name} (${hol.type}) - Click trash to cancel`}
                      >
                        <span className="truncate flex items-center gap-1">
                          <span>{hol.icon || '🏖️'}</span>
                          <span className="truncate">{hol.name}</span>
                        </span>
                        {canManageHolidays && (
                          <button
                            onClick={() => handleCancelHolidayClick(hol)}
                            className="w-4 h-4 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-600 rounded cursor-pointer transition-colors shrink-0"
                            title="Cancel / Delete this holiday"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Cultural Festivals (Dhanteras, Govardhan, Bhai Dooj, Chhath, etc.) */}
                    {dayFestivals.map(fest => (
                      <div
                        key={fest.code || fest.date}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canManageHolidays) {
                            handleConfirmFestivalClick(fest);
                          }
                        }}
                        className="p-1 px-1.5 rounded text-[11px] font-bold flex items-center justify-between gap-1 shadow-2xs border-l-[3px] bg-amber-100/90 border-amber-500 text-amber-900 cursor-pointer hover:bg-amber-200/90 transition-colors"
                        title={canManageHolidays ? `${fest.name} - Click to declare official paid company holiday` : `${fest.name} (Indian Festival)`}
                      >
                        <span className="truncate flex items-center gap-1">
                          <span>{fest.icon || '🪔'}</span>
                          <span className="truncate">{fest.name}</span>
                        </span>
                        {canManageHolidays && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-200 text-amber-800 shrink-0 hover:bg-amber-300">
                            + Off
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {calendarView === 'week' && (
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => {
              const startOfWeek = new Date(currentDate);
              const dayOffset = (startOfWeek.getDay() + 6) % 7;
              startOfWeek.setDate(startOfWeek.getDate() - dayOffset + idx);
              const dayDateStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
              const dayHols = (holidays || []).filter(h => h.date === dayDateStr);
              const dayFests = (suggestedHolidays || []).filter(s =>
                s.date === dayDateStr &&
                !dayHols.some(h => h.date === s.date || (h.name && s.name && h.name.toLowerCase().trim() === s.name.toLowerCase().trim()))
              );

              return (
                <div key={idx} className={`rounded-lg p-3 border min-h-[160px] flex flex-col justify-between ${
                  dayHols.length > 0
                    ? 'bg-red-50/50 border-red-200'
                    : dayFests.length > 0
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-extrabold text-xs text-slate-900">{dayName}</div>
                      {dayHols.length > 0 ? (
                        <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1 rounded">Paid Off</span>
                      ) : dayFests.length > 0 ? (
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1 rounded">Festival</span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-slate-500 mb-2">{dayDateStr}</div>

                    <div className="flex flex-col gap-1">
                      {/* Declared Holidays */}
                      {dayHols.map(h => (
                        <div key={h._id || h.code} className="bg-red-100/90 text-red-800 p-1.5 rounded text-[11px] font-bold border border-red-200 flex items-center justify-between gap-1 shadow-2xs">
                          <span className="truncate">{h.icon || '🏖️'} {h.name}</span>
                          {canManageHolidays && (
                            <button
                              onClick={() => handleCancelHolidayClick(h)}
                              className="text-red-500 hover:text-red-700 cursor-pointer"
                              title="Cancel holiday"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Cultural Festivals */}
                      {dayFests.map(f => (
                        <div
                          key={f.code || f.date}
                          onClick={() => canManageHolidays && handleConfirmFestivalClick(f)}
                          className="bg-amber-100/90 text-amber-900 p-1.5 rounded text-[11px] font-bold border border-amber-300 flex items-center justify-between gap-1 cursor-pointer hover:bg-amber-200 shadow-2xs"
                          title={canManageHolidays ? "Click to declare as paid holiday" : f.name}
                        >
                          <span className="truncate">{f.icon || '🪔'} {f.name}</span>
                          {canManageHolidays && (
                            <span className="text-[9px] font-bold text-amber-800 underline">
                              + Off
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {canManageHolidays && dayHols.length === 0 && dayFests.length === 0 && (
                    <button
                      onClick={() => handleCellClick(dayDateStr)}
                      className="text-[10.5px] font-bold text-blue-600 hover:text-blue-700 text-left cursor-pointer"
                    >
                      + Declare Off
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {calendarView === 'day' && (
        <div className="p-6 text-center">
          <CalendarIcon size={36} className="mx-auto text-blue-600 mb-2 opacity-80" />
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Company Holiday Calendar
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
            Click on any date in the Month view to declare an official company holiday or cancel an existing holiday.
          </p>
          <button
            onClick={() => setCalendarView('month')}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-bold cursor-pointer"
          >
            Back to Month Grid
          </button>
        </div>
      )}

      {/* List View Across All 12 Months */}
      {calendarView === 'list' && (
        <div className="p-4 flex flex-col gap-3">
          {/* Month & Type Quick Filter Pills */}
          <div className="flex flex-col gap-2.5 pb-2 border-b border-slate-200">
            {/* Top row: Type switcher */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Show:</span>
                <button
                  onClick={() => setListTypeFilter('all')}
                  className={`text-xs px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                    listTypeFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Days ({allListItems.length})
                </button>
                <button
                  onClick={() => setListTypeFilter('official')}
                  className={`text-xs px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                    listTypeFilter === 'official'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  🏖️ Official Paid Offs ({(holidays || []).length})
                </button>
                <button
                  onClick={() => setListTypeFilter('festival')}
                  className={`text-xs px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                    listTypeFilter === 'festival'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  🪔 Cultural Festivals ({(suggestedHolidays || []).filter(s => !(holidays || []).some(h => h.date === s.date)).length})
                </button>
              </div>

              <span className="text-[11.5px] text-slate-500 font-medium">
                Showing {filteredListHolidays.length} days
              </span>
            </div>

            {/* Bottom row: Month Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter size={12} /> Month:
              </span>
              <button
                onClick={() => setListMonthFilter('all')}
                className={`text-xs px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                  listMonthFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All 12 Months
              </button>
              {MONTH_NAMES.map((mName, idx) => {
                const mNum = idx + 1;
                const count = allListItems.filter(h => h.date && parseInt(h.date.split('-')[1], 10) === mNum).length;
                if (count === 0 && listMonthFilter !== String(mNum)) return null;

                return (
                  <button
                    key={mName}
                    onClick={() => setListMonthFilter(String(mNum))}
                    className={`text-xs px-2 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                      listMonthFilter === String(mNum)
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {mName.slice(0, 3)} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <table className="crm-table">
            <thead>
              <tr>
                <th>Holiday / Festival Name</th>
                <th>Date</th>
                <th>Day of Week</th>
                <th>Type</th>
                <th>Status</th>
                <th>Description</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredListHolidays.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-slate-400">
                    No holidays or festivals found for this filter.
                  </td>
                </tr>
              ) : (
                filteredListHolidays.map(hol => {
                  const isUpcoming = hol.date >= todayStr;
                  const isOff = hol.isConfirmed;

                  return (
                    <tr key={hol._id || hol.code || hol.date} className={isOff ? 'bg-red-50/20' : 'bg-amber-50/20'}>
                      <td className="font-extrabold text-slate-900">
                        {hol.icon || (isOff ? '🏖️' : '🪔')} {hol.name}
                      </td>
                      <td className="font-bold text-xs">{hol.date}</td>
                      <td className="text-slate-600 font-medium text-xs">
                        {hol.dayOfWeek || new Date(hol.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                      </td>
                      <td>
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                          isOff
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {hol.displayType || hol.type || (isOff ? 'Company Holiday' : 'Major Festival')}
                        </span>
                      </td>
                      <td>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOff
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {isOff ? '🏖️ Paid Off' : '🪔 Cultural Festival'}
                        </span>
                      </td>
                      <td className="text-slate-500 text-xs max-w-[260px] truncate">
                        {hol.description || (isOff ? 'Declared company holiday.' : 'Indian festival.')}
                      </td>
                      <td className="text-right">
                        {canManageHolidays && (
                          isOff ? (
                            <button
                              onClick={() => handleCancelHolidayClick(hol)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 cursor-pointer transition-colors shadow-2xs"
                              title="Cancel / Delete this holiday (Restore normal working day)"
                            >
                              <Trash2 size={12} />
                              <span>Cancel Off</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConfirmFestivalClick(hol)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold border border-amber-300 cursor-pointer transition-colors shadow-2xs"
                              title="Declare this festival as official company holiday"
                            >
                              <Plus size={12} />
                              <span>Declare Off</span>
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Holiday Modal */}
      <AddHolidayModal
        isOpen={isAddModalOpen}
        selectedDate={selectedDayDate}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
