import React, { useState } from 'react';
import { useHR } from '../../context/HRContext';
import { MarkAttendanceModal } from './MarkAttendanceModal';

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
        return { icon: '📅', color: '#94a3b8', bg: '#f1f5f9', label: 'Day Off' };
      }
      return { icon: '—', color: '#cbd5e1', bg: '#ffffff', label: 'Upcoming' };
    }

    if (!record) {
      if (isWeekend) {
        return { icon: '📅', color: '#64748b', bg: '#f1f5f9', label: 'Day Off' };
      }
      return { icon: '—', color: '#94a3b8', bg: '#ffffff', label: 'Not Marked' };
    }

    switch (record.status) {
      case 'present':
        return { icon: '✔️', color: '#16a34a', bg: '#dcfce7', label: 'Present' };
      case 'late':
        return { icon: '⚠️', color: '#d97706', bg: '#fef3c7', label: `Late (${record.clockInTime || '10:30'})` };
      case 'half_day':
        return { icon: '🌟', color: '#8b5cf6', bg: '#f3e8ff', label: 'Half Day' };
      case 'absent':
        return { icon: '❌', color: '#dc2626', bg: '#fee2e2', label: 'Absent' };
      case 'on_leave':
        return { icon: '✈️', color: '#0284c7', bg: '#e0f2fe', label: 'On Leave' };
      case 'holiday':
        return { icon: '⭐', color: '#854d0e', bg: '#fef9c3', label: 'Holiday' };
      case 'day_off':
        return { icon: '📅', color: '#64748b', bg: '#f1f5f9', label: 'Day Off' };
      case 'not_marked':
        return { icon: '—', color: '#94a3b8', bg: '#f8fafc', label: 'Not Marked' };
      default:
        return { icon: '—', color: '#94a3b8', bg: 'transparent', label: 'Not Marked' };
    }
  };

  return (
    <div className="table-card" style={{ marginBottom: '24px' }}>
      <div className="table-responsive" style={{ maxHeight: '680px' }}>
        <table className="crm-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              {/* Sticky Employee Column */}
              <th style={{
                position: 'sticky',
                left: 0,
                zIndex: 20,
                background: '#f8fafc',
                minWidth: '220px',
                borderRight: '2px solid #e2e8f0'
              }}>
                Employee
              </th>

              {/* Day Columns */}
              {daysArray.map((day) => {
                const dayName = getDayName(day);
                const isWeekend = dayName === 'Sat' || dayName === 'Sun';
                return (
                  <th
                    key={day}
                    style={{
                      textAlign: 'center',
                      padding: '8px 3px',
                      minWidth: '34px',
                      fontSize: '11px',
                      backgroundColor: isWeekend ? '#f1f5f9' : '#f8fafc',
                      color: isWeekend ? '#64748b' : '#334155',
                      borderRight: '1px solid #f1f5f9'
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '12px' }}>{day}</div>
                    <div style={{ fontSize: '9.5px', color: '#94a3b8', textTransform: 'uppercase' }}>{dayName}</div>
                  </th>
                );
              })}

              {/* Total Column */}
              <th style={{
                textAlign: 'center',
                minWidth: '80px',
                fontWeight: '700',
                background: '#f8fafc',
                position: 'sticky',
                right: 0,
                zIndex: 20,
                borderLeft: '2px solid #e2e8f0'
              }}>
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
                  <td style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 10,
                    backgroundColor: '#ffffff',
                    borderRight: '2px solid #e2e8f0',
                    padding: '12px 14px'
                  }}>
                    <div className="employee-cell">
                      <div className="employee-avatar">
                        {emp.avatar ? <img src={emp.avatar} alt={emp.name} /> : emp.name.charAt(0)}
                      </div>
                      <div className="employee-name-group">
                        <span className="employee-name" style={{ fontSize: '13px' }}>
                          {emp.name}
                          {isEmployeeSelf(emp) && (
                            <span className="its-you-pill" style={{ fontSize: '9px', padding: '1px 5px' }}>It's You</span>
                          )}
                        </span>
                        <span className="employee-role" style={{ fontSize: '11px' }}>{emp.role}</span>
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

                    // Check if matching status filter
                    const effectiveStatus = safeRecord ? safeRecord.status : (isFuture ? 'upcoming' : (isWeekend ? 'day_off' : 'not_marked'));
                    const isMuted = statusFilter !== 'all' && effectiveStatus !== statusFilter;

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
                        style={{
                          textAlign: 'center',
                          padding: '6px 2px',
                          borderRight: '1px solid #f1f5f9',
                          cursor: isFuture ? 'default' : 'pointer',
                          backgroundColor: isMuted ? '#f8fafc' : (isFuture ? '#fafafa' : (safeRecord?.status === 'late' ? '#fef3c7' : (safeRecord?.status === 'absent' ? '#fee2e2' : (isWeekend ? '#fafafa' : 'transparent')))),
                          opacity: isMuted ? 0.3 : 1,
                          transition: 'all 0.15s'
                        }}
                        title={isFuture ? `${emp.name} - ${dateStr}: ${display.label}` : `${emp.name} - ${dateStr}: ${display.label}${timeDetail}`}
                      >
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: display.color,
                          display: 'inline-block'
                        }}>
                          {display.icon}
                        </span>
                      </td>
                    );
                  })}

                  {/* Sticky Total Count Cell (Matches 6/30 in screenshot) */}
                  <td style={{
                    textAlign: 'center',
                    fontWeight: '700',
                    fontSize: '13px',
                    color: '#0f172a',
                    position: 'sticky',
                    right: 0,
                    zIndex: 10,
                    backgroundColor: '#ffffff',
                    borderLeft: '2px solid #e2e8f0'
                  }}>
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
