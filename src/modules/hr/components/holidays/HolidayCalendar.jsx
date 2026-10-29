import React, { useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { isHRorAdmin } from '../../../../shared/utils/permissionUtils';
import { AddHolidayModal } from './AddHolidayModal';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const HolidayCalendar = () => {
  const { addToast } = useToast();
  const { holidays, deleteHoliday, currentUser } = useHR();

  const canManageHolidays = isHRorAdmin(currentUser);

  const now = new Date();
  const [currentDate, setCurrentDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [calendarView, setCalendarView] = useState('month'); // 'month', 'week', 'day', 'list'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState('');
  const [listMonthFilter, setListMonthFilter] = useState('all'); // 'all' or 1-12

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

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

  // Safe holiday cancellation with confirmation
  const handleCancelHolidayClick = async (hol) => {
    if (!canManageHolidays) return;
    const confirmed = window.confirm(
      `⚠️ Cancel Company Holiday?\n\nAre you sure you want to cancel "${hol.name}" on ${hol.date}?\n\nThis will restore regular working day status for all employees across the company.`
    );
    if (!confirmed) return;

    try {
      await deleteHoliday(hol._id || hol.code || hol.date);
    } catch {
      addToast('Failed to cancel holiday.', 'error');
    }
  };

  // Filtered list for List View (supports viewing all 12 months or specific month)
  const filteredListHolidays = (holidays || []).filter(hol => {
    if (!hol || !hol.date) return false;
    if (listMonthFilter === 'all') return true;
    const m = parseInt(hol.date.split('-')[1], 10);
    return m === parseInt(listMonthFilter, 10);
  });

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
              const dayHolidays = holidays.filter(h => h.date === cell.dateStr);
              const isTodayCell = cell.dateStr === todayStr;

              return (
                <div
                  key={index}
                  onClick={() => handleCellClick(cell.dateStr)}
                  className={`min-h-[115px] p-2 flex flex-col justify-between cursor-pointer transition-all ${
                    cell.isCurrentMonth ? 'bg-white hover:bg-blue-50/20' : 'bg-slate-50/70'
                  }`}
                  title={canManageHolidays ? "Click date to declare company holiday" : ""}
                >
                  <div className="flex items-center justify-between mb-1">
                    {dayHolidays.length > 0 && (
                      <span className="text-[9.5px] font-extrabold text-red-600 bg-red-100 px-1 rounded">
                        🏖️ OFF
                      </span>
                    )}
                    <span className={`text-xs ml-auto font-bold flex items-center justify-center rounded-full ${
                      isTodayCell
                        ? 'w-5 h-5 bg-blue-600 text-white'
                        : cell.isCurrentMonth
                        ? 'text-slate-900'
                        : 'text-slate-300'
                    }`}>
                      {cell.day}
                    </span>
                  </div>

                  {/* Holiday Badges */}
                  <div className="flex flex-col gap-1 mt-0.5 flex-1 overflow-hidden">
                    {dayHolidays.map(hol => (
                      <div
                        key={hol._id || hol.code || hol.date}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 px-1.5 rounded text-[11px] font-bold flex items-center justify-between gap-1 shadow-2xs border-l-[3px] bg-red-50 border-red-500 text-red-800"
                        title={`${hol.name} (${hol.type})`}
                      >
                        <span className="truncate">
                          {hol.icon || '🏖️'} {hol.name}
                        </span>
                        {canManageHolidays && (
                          <button
                            onClick={() => handleCancelHolidayClick(hol)}
                            className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors shrink-0"
                            title="Cancel / Delete this holiday (Restore normal working day)"
                          >
                            <Trash2 size={11} />
                          </button>
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
              const dayHols = holidays.filter(h => h.date === dayDateStr);

              return (
                <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200 min-h-[160px] flex flex-col justify-between">
                  <div>
                    <div className="font-extrabold text-xs text-slate-900">{dayName}</div>
                    <div className="text-[11px] text-slate-500 mb-2">{dayDateStr}</div>
                    <div className="flex flex-col gap-1">
                      {dayHols.map(h => (
                        <div key={h._id} className="bg-red-50 text-red-800 p-1.5 rounded text-[11px] font-bold border border-red-200 flex items-center justify-between gap-1">
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
                    </div>
                  </div>
                  {canManageHolidays && dayHols.length === 0 && (
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
          {/* Month Quick Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter size={12} /> Filter Month:
              </span>
              <button
                onClick={() => setListMonthFilter('all')}
                className={`text-xs px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                  listMonthFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All 12 Months ({holidays.length})
              </button>
              {MONTH_NAMES.map((mName, idx) => {
                const mNum = idx + 1;
                const count = (holidays || []).filter(h => h.date && parseInt(h.date.split('-')[1], 10) === mNum).length;
                if (count === 0 && listMonthFilter !== String(mNum)) return null;

                return (
                  <button
                    key={mName}
                    onClick={() => setListMonthFilter(String(mNum))}
                    className={`text-xs px-2 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                      listMonthFilter === String(mNum)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {mName.slice(0, 3)} ({count})
                  </button>
                );
              })}
            </div>

            <span className="text-[11.5px] text-slate-500 font-medium">
              Showing {filteredListHolidays.length} official company holidays
            </span>
          </div>

          <table className="crm-table">
            <thead>
              <tr>
                <th>Holiday Name</th>
                <th>Date</th>
                <th>Day of Week</th>
                <th>Category</th>
                <th>Status</th>
                <th>Description</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredListHolidays.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-slate-400">
                    No holidays found for this month filter.
                  </td>
                </tr>
              ) : (
                filteredListHolidays.map(hol => {
                  const isUpcoming = hol.date >= todayStr;
                  return (
                    <tr key={hol._id || hol.code || hol.date}>
                      <td className="font-extrabold text-slate-900">
                        {hol.icon || '🏖️'} {hol.name}
                      </td>
                      <td className="font-bold text-xs">{hol.date}</td>
                      <td className="text-slate-600 font-medium text-xs">
                        {hol.dayOfWeek || new Date(hol.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                      </td>
                      <td>
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {hol.type || 'Company Holiday'}
                        </span>
                      </td>
                      <td>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isUpcoming
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isUpcoming ? 'Upcoming' : 'Passed'}
                        </span>
                      </td>
                      <td className="text-slate-500 text-xs max-w-[260px] truncate">
                        {hol.description || 'Declared company holiday.'}
                      </td>
                      <td className="text-right">
                        {canManageHolidays ? (
                          <button
                            onClick={() => handleCancelHolidayClick(hol)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 cursor-pointer transition-colors shadow-2xs"
                            title="Cancel / Delete this holiday (Restore normal working day)"
                          >
                            <Trash2 size={12} />
                            <span>Cancel Off</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Official Off
                          </span>
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
