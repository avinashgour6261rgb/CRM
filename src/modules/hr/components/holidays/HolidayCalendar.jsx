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
    <div className="table-card" style={{ padding: '0', overflow: 'hidden' }}>
      {/* Calendar Header Controls (Matching Screenshot 3) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Prev / Next / Today Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handlePrevMonth}
            className="page-btn"
            style={{ width: '32px', height: '32px', padding: '0' }}
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextMonth}
            className="page-btn"
            style={{ width: '32px', height: '32px', padding: '0' }}
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={handleToday}
            className="page-btn"
            style={{ height: '32px', padding: '0 12px', marginLeft: '4px' }}
          >
            today
          </button>
        </div>

        {/* Center: Month Year Title */}
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
          {monthName}
        </div>

        {/* Right: View Switcher (month | week | day | list) matching Screenshot 3 */}
        <div className="view-switch-group">
          {['month', 'week', 'day', 'list'].map((view) => (
            <button
              key={view}
              onClick={() => setCalendarView(view)}
              className="page-btn"
              style={{
                height: '30px',
                padding: '0 12px',
                borderRadius: '4px',
                border: 'none',
                textTransform: 'capitalize',
                fontSize: '12.5px',
                fontWeight: '600',
                backgroundColor: calendarView === view ? '#101b33' : 'transparent',
                color: calendarView === view ? '#ffffff' : '#64748b'
              }}
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            textAlign: 'center',
            fontSize: '12.5px',
            fontWeight: '600',
            color: '#475569',
            padding: '10px 0'
          }}>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Calendar Day Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            backgroundColor: '#e2e8f0',
            gap: '1px'
          }}>
            {calendarCells.map((cell, index) => {
              const dayHolidays = holidays.filter(h => h.date === cell.dateStr && !(h.date === '2026-10-15' && (h.name?.toLowerCase().includes('foundation') || h.title?.toLowerCase().includes('foundation'))));

              return (
                <div
                  key={index}
                  onClick={() => handleCellClick(cell.dateStr)}
                  style={{
                    minHeight: '110px',
                    backgroundColor: cell.isCurrentMonth ? '#ffffff' : '#f8fafc',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (cell.isCurrentMonth) e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    if (cell.isCurrentMonth) e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    fontWeight: cell.isCurrentMonth ? '600' : '400',
                    color: cell.isCurrentMonth ? '#0f172a' : '#cbd5e1',
                    textAlign: 'right'
                  }}>
                    {cell.day}
                  </div>

                  {/* Holiday Badges / Events */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', flex: 1 }}>
                    {dayHolidays.map(hol => (
                      <div
                        key={hol._id}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          background: hol.type === 'National Holiday' ? '#fef3c7' : '#e0f2fe',
                          borderLeft: hol.type === 'National Holiday' ? '3px solid #d97706' : '3px solid #0284c7',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: hol.type === 'National Holiday' ? '#92400e' : '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '4px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ⭐ {hol.name}
                        </span>
                        {canManageHolidays && (
                          <button
                            onClick={() => deleteHoliday(hol._id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              display: 'flex',
                              padding: '1px'
                            }}
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
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => {
              const startOfWeek = new Date(currentDate);
              const dayOffset = (startOfWeek.getDay() + 6) % 7;
              startOfWeek.setDate(startOfWeek.getDate() - dayOffset + idx);
              const dayDateStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
              const dayHols = holidays.filter(h => h.date === dayDateStr);
              return (
                <div key={idx} style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0', minHeight: '140px' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{dayName}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>{dayDateStr}</div>
                  {dayHols.map(h => (
                    <div key={h._id} style={{ background: '#fef3c7', color: '#92400e', padding: '4px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
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
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
            Daily Schedule View
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Click on any date on the Month view to add new company holidays or view schedules.
          </p>
        </div>
      )}

      {/* List View with Name, Date, Day of Week, Type, Status */}
      {calendarView === 'list' && (
        <div style={{ padding: '16px' }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th>Holiday Name</th>
                <th>Date</th>
                <th>Day of Week</th>
                <th>Category / Type</th>
                <th>Status</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map(hol => {
                const isUpcoming = hol.date >= todayStr;
                return (
                  <tr key={hol._id}>
                    <td style={{ fontWeight: '700', color: '#0f172a' }}>
                      ⭐ {hol.name}
                    </td>
                    <td style={{ fontWeight: '600' }}>{hol.date}</td>
                    <td style={{ color: '#475569', fontWeight: '500' }}>
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
                    <td style={{ color: '#64748b', fontSize: '12.5px', maxWidth: '240px' }}>
                      {hol.description || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {canManageHolidays ? (
                        <button
                          onClick={() => deleteHoliday(hol._id)}
                          className="btn-icon-only"
                          style={{ width: '28px', height: '28px', color: '#ef4444' }}
                          title="Delete holiday (Admin/HR)"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
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
