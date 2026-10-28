import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Calendar, Clock, CheckCircle2, Lock } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { isHRorAdmin } from '../../../../shared/utils/permissionUtils';
import { AddHolidayModal } from './AddHolidayModal';

export const HolidayCalendar = () => {
  const { addToast } = useToast();
  const { holidays, deleteHoliday, currentUser } = useHR();

  const canManageHolidays = isHRorAdmin(currentUser);

  const now = new Date();
  const [currentDate, setCurrentDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [calendarView, setCalendarView] = useState('month'); // 'month', 'week', 'day', 'list'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState('');

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

  // Calendar calculations
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
      addToast('🔒 Access Restricted: Only HR & Admin can add or modify company holidays.', 'warning');
      return;
    }
    setSelectedDayDate(dateStr);
    setIsAddModalOpen(true);
  };

  return (
    <div className="table-card p-0 overflow-hidden">
      {/* Calendar Header Controls (Matching Screenshot 3) */}
      <div className="flex items-center justify-between p-4 px-5 border-b border-slate-200 bg-white flex-wrap gap-3">
        {/* Left: Prev / Next / Today Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="page-btn w-8 h-8 p-0"
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextMonth}
            className="page-btn w-8 h-8 p-0"
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={handleToday}
            className="page-btn h-8 px-3 ml-1"
          >
            today
          </button>
        </div>

        {/* Center: Month Year Title */}
        <div className="text-base font-bold text-slate-800">
          {monthName}
        </div>

        {/* Right: View Switcher (month | week | day | list) matching Screenshot 3 */}
        <div className="view-switch-group">
          {['month', 'week', 'day', 'list'].map((view) => (
            <button
              key={view}
              onClick={() => setCalendarView(view)}
              className={`page-btn h-[30px] px-3 rounded border-none capitalize text-[12.5px] font-semibold ${calendarView === view ? 'bg-[#101b33] text-white' : 'bg-transparent text-slate-500'}`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Main Month Grid View (Matching Screenshot 3) */}
      {calendarView === 'month' && (
        <div>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-[12.5px] font-semibold text-slate-600 py-2.5">
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
              const dayHolidays = holidays.filter(h => h.date === cell.dateStr && !(h.date === '2026-10-15' && (h.name?.toLowerCase().includes('foundation') || h.title?.toLowerCase().includes('foundation'))));

              return (
                <div
                  key={index}
                  onClick={() => handleCellClick(cell.dateStr)}
                  className={`min-h-[110px] p-2 px-2.5 flex flex-col justify-between cursor-pointer transition-colors ${cell.isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50'}`}
                >
                  <div className={`text-xs text-right ${cell.isCurrentMonth ? 'font-semibold text-slate-900' : 'font-normal text-slate-300'}`}>
                    {cell.day}
                  </div>

                  {/* Holiday Badges / Events */}
                  <div className="flex flex-col gap-1 mt-1 flex-1">
                    {dayHolidays.map(hol => (
                      <div
                        key={hol._id}
                        onClick={(e) => e.stopPropagation()}
                        className={`p-1 px-1.5 rounded text-[11px] font-semibold flex items-center justify-between gap-1 shadow-sm ${hol.type === 'National Holiday' ? 'bg-amber-100 border-l-[3px] border-amber-600 text-amber-800' : 'bg-sky-100 border-l-[3px] border-sky-600 text-sky-800'}`}
                      >
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                          ⭐ {hol.name}
                        </span>
                        {canManageHolidays && (
                          <button
                            onClick={() => deleteHoliday(hol._id)}
                            className="bg-transparent border-none text-slate-400 hover:text-red-500 cursor-pointer flex p-px transition-colors"
                            title="Remove holiday (Admin/HR)"
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
        <div className="p-5">
          <div className="grid grid-cols-7 gap-2.5">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => {
              const startOfWeek = new Date(currentDate);
              const dayOffset = (startOfWeek.getDay() + 6) % 7;
              startOfWeek.setDate(startOfWeek.getDate() - dayOffset + idx);
              const dayDateStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
              const dayHols = holidays.filter(h => h.date === dayDateStr);
              return (
                <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200 min-h-[140px]">
                  <div className="font-bold text-[13px] text-slate-900">{dayName}</div>
                  <div className="text-[11px] text-slate-500 mb-2">{dayDateStr}</div>
                  {dayHols.map(h => (
                    <div key={h._id} className="bg-amber-100 text-amber-800 py-1 px-1.5 rounded text-[11px] font-semibold">
                      ⭐ {h.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {calendarView === 'day' && (
        <div className="p-6 text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            Daily Schedule View
          </h3>
          <p className="text-[13px] text-slate-500">
            Click on any date on the Month view to add new company holidays or view schedules.
          </p>
        </div>
      )}

      {/* List View with Name, Date, Day of Week, Type, Status */}
      {calendarView === 'list' && (
        <div className="p-4">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Holiday Name</th>
                <th>Date</th>
                <th>Day of Week</th>
                <th>Category / Type</th>
                <th>Status</th>
                <th>Description</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map(hol => {
                const isUpcoming = hol.date >= todayStr;
                return (
                  <tr key={hol._id}>
                    <td className="font-bold text-slate-900">
                      ⭐ {hol.name}
                    </td>
                    <td className="font-semibold">{hol.date}</td>
                    <td className="text-slate-600 font-medium">
                      {hol.dayOfWeek || new Date(hol.date).toLocaleDateString('en-US', { weekday: 'long' })}
                    </td>
                    <td>
                      <span className="badge badge-holiday">{hol.type}</span>
                    </td>
                    <td>
                      <span className={`badge ${isUpcoming ? 'badge-pending' : 'badge-approved'}`}>
                        {isUpcoming ? 'Upcoming' : 'Completed'}
                      </span>
                    </td>
                    <td className="text-slate-500 text-[12.5px] max-w-[240px]">
                      {hol.description || '—'}
                    </td>
                    <td className="text-right">
                      {canManageHolidays ? (
                        <button
                          onClick={() => deleteHoliday(hol._id)}
                          className="btn-icon-only w-7 h-7 text-red-500"
                          title="Delete holiday (Admin/HR)"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Official
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
