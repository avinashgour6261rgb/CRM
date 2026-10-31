import React, { useState } from 'react';
import { useHR } from '../../context/HRContext';
import { MarkAttendanceModal } from './MarkAttendanceModal';
import { matchesFilter } from '../../../../shared/utils/filterUtils';

export const MonthlyMatrixTable = ({
  month = 9,
  year = 2026,
  selectedEmployeeId = 'all',
  statusFilter = 'all'
}) => {
  const { employees, attendance, currentUser } = useHR();
  const [activeRecordModal, setActiveRecordModal] = useState(null);

  const isEmployeeSelf = (emp) => {
    if (!currentUser || !emp) return false;
    return String(emp._id || emp.id) === String(currentUser._id || currentUser.id) ||
      (emp.employeeCode && currentUser.employeeCode && String(emp.employeeCode).toUpperCase() === String(currentUser.employeeCode).toUpperCase()) ||
      (emp.email && currentUser.email && emp.email.toLowerCase() === currentUser.email.toLowerCase());
  };

  // Number of days in the given month/year
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Day name helper (e.g., Tue, Wed, Thu)
  const getDayName = (day) => {
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Filter employees
  const displayEmployees = selectedEmployeeId === 'all'
    ? employees
    : employees.filter(e => e._id === selectedEmployeeId);

  // Get status icon & styling for a specific cell
  const todayStr = new Date().toISOString().split('T')[0];

  const getStatusDisplay = (record, isWeekend, isFuture = false) => {
    if (isFuture) {
      if (record?.status === 'on_leave') {
        return { icon: '✈️', color: '#0284c7', bg: '#e0f2fe', label: 'On Leave (Scheduled)' };
      }
      if (record?.status === 'holiday') {
        return { icon: '⭐', color: '#854d0e', bg: '#fef9c3', label: 'Holiday' };
      }
      if (isWeekend) {
        return { icon: '📅', color: '#94a3b8', bg: 'transparent', label: 'Day Off' };
      }
      return { icon: '—', color: '#cbd5e1', bg: 'transparent', label: 'Upcoming' };
    }

    if (!record) {
      if (isWeekend) {
        return { icon: '📅', color: '#64748b', bg: 'transparent', label: 'Day Off' };
      }
      return { icon: '—', color: '#94a3b8', bg: 'transparent', label: 'Not Marked' };
    }

    switch (record.status) {
      case 'present':
        return { icon: '✔️', color: '#16a34a', bg: 'transparent', label: 'Present' };
      case 'late':
        return { icon: '⚠️', color: '#d97706', bg: 'transparent', label: `Late (${record.clockInTime || '10:30'})` };
      case 'half_day':
        return { icon: '🌟', color: '#8b5cf6', bg: 'transparent', label: 'Half Day' };
      case 'absent':
        return { icon: '❌', color: '#dc2626', bg: 'transparent', label: 'Absent' };
      case 'on_leave':
        return { icon: '✈️', color: '#0284c7', bg: 'transparent', label: 'On Leave' };
      case 'holiday':
        return { icon: '⭐', color: '#854d0e', bg: 'transparent', label: 'Holiday' };
      case 'day_off':
        return { icon: '📅', color: '#64748b', bg: 'transparent', label: 'Day Off' };
      case 'not_marked':
        return { icon: '—', color: '#94a3b8', bg: 'transparent', label: 'Not Marked' };
      default:
        return { icon: '—', color: '#94a3b8', bg: 'transparent', label: 'Not Marked' };
    }
  };

  return (
    <div className="table-card mb-6">
      <div className="table-responsive max-h-[680px]">
        <table className="crm-table border-separate border-spacing-0">
          <thead>
            <tr>
              {/* Sticky Employee Column */}
              <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 min-w-[220px] border-r-2 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                Employee
              </th>

              {/* Day Columns */}
              {daysArray.map((day) => {
                const dayName = getDayName(day);
                const isWeekend = dayName === 'Sat' || dayName === 'Sun';
                return (
                  <th
                    key={day}
                    className={`text-center py-2 px-[3px] min-w-[34px] text-[11px] border-r border-slate-100 dark:border-slate-800 ${isWeekend ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300'}`}
                  >
                    <div className="font-bold text-xs">{day}</div>
                    <div className="text-[9.5px] text-slate-400 uppercase">{dayName}</div>
                  </th>
                );
              })}

              {/* Total Column */}
              <th className="text-center min-w-[80px] font-bold bg-slate-50 dark:bg-slate-900 sticky right-0 z-20 border-l-2 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {displayEmployees.map((emp) => {
              // Exact monthly filtering and mathematical calculation for this employee
              const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
              const empRecords = attendance.filter(a => {
                if (!a.date || !a.date.startsWith(monthPrefix)) return false;
                return a.employeeId === emp._id ||
                  a.employeeId === emp.employeeCode ||
                  a.employeeCode === emp.employeeCode ||
                  a.employeeCode === emp._id ||
                  (a.employeeName && emp.name && a.employeeName.trim().toLowerCase() === emp.name.trim().toLowerCase());
              });
              // Only past and current dates (<= todayStr) can count toward present totals
              const validPresenceRecords = empRecords.filter(a => a.date <= todayStr);
              const fullDaysPresent = validPresenceRecords.filter(a => a.status === 'present' || a.status === 'late').length;
              const halfDaysCount = validPresenceRecords.filter(a => a.status === 'half_day').length;
              const effectivePresentDays = fullDaysPresent + (halfDaysCount * 0.5);
              const totalHoursWorked = validPresenceRecords.reduce((sum, a) => sum + (parseFloat(a.totalWorkingHours) || 0), 0);

              return (
                <tr key={emp._id}>
                  {/* Sticky Employee Details Cell */}
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 border-r-2 border-slate-200 dark:border-slate-800 py-3 px-3.5">
                    <div className="employee-cell">
                      <div className="employee-avatar">
                        {emp.avatar ? <img src={emp.avatar} alt={emp.name} /> : emp.name.charAt(0)}
                      </div>
                      <div className="employee-name-group">
                        <span className="employee-name text-[13px] text-slate-900 dark:text-slate-100 font-bold">
                          {emp.name}
                          {isEmployeeSelf(emp) && (
                            <span className="its-you-pill text-[9px] py-[1px] px-[5px]">It's You</span>
                          )}
                        </span>
                        <span className="employee-role text-[11px] text-slate-500 dark:text-slate-400">{emp.role}</span>
                      </div>
                    </div>
                  </td>

                  {/* Day Status Cells */}
                  {daysArray.map((day) => {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayName = getDayName(day);
                    const isWeekend = dayName === 'Sat' || dayName === 'Sun';
                    const isFuture = dateStr > todayStr;

                    const record = empRecords.find(a => a.date === dateStr);
                    // Safe guard: future dates must NEVER show presence/late
                    const safeRecord = (isFuture && record && record.status !== 'on_leave' && record.status !== 'holiday') ? null : record;
                    const display = getStatusDisplay(safeRecord, isWeekend, isFuture);

                    // Check if matching status filter (case-insensitive and format resilient)
                    const effectiveStatus = safeRecord ? safeRecord.status : (isFuture ? 'upcoming' : (isWeekend ? 'day_off' : 'not_marked'));
                    const isMuted = statusFilter !== 'all' && !matchesFilter(effectiveStatus, statusFilter);

                    const inStr = safeRecord?.clockInTime || safeRecord?.clockIn;
                    const outStr = safeRecord?.clockOutTime || safeRecord?.clockOut;
                    const timeDetail = inStr ? ` | In: ${inStr}${outStr ? ` • Out: ${outStr}` : ' (Active)'}` : '';

                    return (
                      <td
                        key={day}
                        onClick={() => {
                          if (isFuture) return; // Future dates cannot be marked for daily shift attendance
                          setActiveRecordModal({
                            employeeId: emp._id,
                            date: dateStr,
                            status: safeRecord ? safeRecord.status : (isWeekend ? 'day_off' : 'present'),
                            clockInTime: inStr,
                            clockOutTime: outStr,
                            notes: safeRecord?.notes
                          });
                        }}
                        className={`text-center py-1.5 px-0.5 border-r border-slate-100 dark:border-slate-800 transition-all duration-150 ${
                          isFuture ? 'cursor-default' : 'cursor-pointer'
                        } ${
                          isMuted
                            ? 'opacity-25 bg-slate-50 dark:bg-slate-950/40'
                            : isFuture
                            ? 'bg-[#fafafa] dark:bg-slate-950/30'
                            : safeRecord?.status === 'late'
                            ? 'bg-amber-100 dark:bg-amber-950/50'
                            : safeRecord?.status === 'absent'
                            ? 'bg-red-100 dark:bg-red-950/50'
                            : isWeekend
                            ? 'bg-[#fafafa] dark:bg-slate-900/60'
                            : 'bg-transparent'
                        }`}
                        title={isFuture ? `${emp.name} - ${dateStr}: ${display.label}` : `${emp.name} - ${dateStr}: ${display.label}${timeDetail}`}
                      >
                        <span
                          className="text-xs font-semibold inline-block"
                          style={{ color: display.color }}
                        >
                          {display.icon}
                        </span>
                      </td>
                    );
                  })}

                  {/* Sticky Total Count Cell (Matches 6/30 in screenshot) */}
                  <td className="text-center font-bold text-[13px] text-slate-900 dark:text-slate-100 sticky right-0 z-10 bg-white dark:bg-slate-900 border-l-2 border-slate-200 dark:border-slate-800">
                    <span title={`${effectivePresentDays} present days (${totalHoursWorked.toFixed(1)} hrs total)`}>
                      {effectivePresentDays} / {daysInMonth}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quick Edit/Mark Modal */}
      {activeRecordModal && (
        <MarkAttendanceModal
          isOpen={!!activeRecordModal}
          initialData={activeRecordModal}
          onClose={() => setActiveRecordModal(null)}
        />
      )}
    </div>
  );
};
