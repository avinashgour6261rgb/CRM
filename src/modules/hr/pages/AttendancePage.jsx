import React, { useState } from 'react';
import {
  ChevronRight,
  Download,
  Plus,
  Grid,
  List,
  BarChart2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Award,
  Palmtree,
  UserCheck,
  UserX,
  CalendarCheck,
  ShieldAlert,
  LogOut,
  History
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { getUserModulePermissions, isHRorAdmin } from '../../../shared/utils/permissionUtils';
import { AttendanceLegend } from '../components/attendance/AttendanceLegend';
import { MonthlyMatrixTable } from '../components/attendance/MonthlyMatrixTable';
import { MarkAttendanceModal } from '../components/attendance/MarkAttendanceModal';
import { AttendanceAuditTimeline } from '../components/attendance/AttendanceAuditTimeline';
import { AdminForceClockOutModal } from '../components/attendance/AdminForceClockOutModal';

export const AttendancePage = () => {
  const { currentUser: authUser } = useAuth();
  const {
    employees,
    selectedEmployeeId,
    setSelectedEmployeeId,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    attendance,
    currentUser: hrUser
  } = useHR();

  const currentUser = authUser || hrUser;
  const isPrivileged = React.useMemo(() => isHRorAdmin(currentUser), [currentUser]);
  const perms = React.useMemo(() => getUserModulePermissions(currentUser), [currentUser]);
  const canViewAllAttendance = isPrivileged || perms?.viewAllAttendance;

  const isEmployeeSelf = React.useCallback((emp) => {
    if (!currentUser || !emp) return false;
    return String(emp._id || emp.id) === String(currentUser._id || currentUser.id) ||
      (emp.employeeCode && currentUser.employeeCode && String(emp.employeeCode).toUpperCase() === String(currentUser.employeeCode).toUpperCase()) ||
      (emp.email && currentUser.email && emp.email.toLowerCase() === currentUser.email.toLowerCase());
  }, [currentUser]);

  // Automatically lock selectedEmployeeId to currentUser when not permitted to view all attendance
  React.useEffect(() => {
    if (!canViewAllAttendance && currentUser) {
      const myId = currentUser._id || currentUser.employeeCode;
      if (myId && selectedEmployeeId !== myId) {
        setSelectedEmployeeId(myId);
      }
    }
  }, [canViewAllAttendance, currentUser, selectedEmployeeId, setSelectedEmployeeId]);

  const [viewMode, setViewMode] = useState('matrix'); // 'matrix', 'logs', 'summary', 'audit'
  const [statusFilter, setStatusFilter] = useState('all');
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [isForceClockOutOpen, setIsForceClockOutOpen] = useState(false);

  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];

  const years = [2024, 2025, 2026, 2027];

  // 1. Exact Mathematical Calculations for Attendance Summary KPIs
  const currentMonthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const selectedEmpObj = employees.find(e => e._id === selectedEmployeeId || e.employeeCode === selectedEmployeeId);
  const currentMonthRecords = attendance.filter(a => {
    if (!a.date || !a.date.startsWith(currentMonthPrefix)) return false;
    if (selectedEmployeeId === 'all') return true;
    return a.employeeId === selectedEmployeeId ||
           a.employeeCode === selectedEmployeeId ||
           (selectedEmpObj && (
             a.employeeId === selectedEmpObj._id ||
             a.employeeId === selectedEmpObj.employeeCode ||
             a.employeeCode === selectedEmpObj.employeeCode ||
             (a.employeeName && a.employeeName.trim().toLowerCase() === selectedEmpObj.name.trim().toLowerCase())
           ));
  });

  const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  let workingDaysCount = 0;
  for (let day = 1; day <= daysInSelectedMonth; day++) {
    const d = new Date(selectedYear, selectedMonth - 1, day);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      workingDaysCount++;
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const presentCount = currentMonthRecords.filter(a => a.status === 'present' && a.date <= todayStr).length;
  const lateCount = currentMonthRecords.filter(a => a.status === 'late' && a.date <= todayStr).length;
  const halfDayCount = currentMonthRecords.filter(a => a.status === 'half_day' && a.date <= todayStr).length;
  const absentCount = currentMonthRecords.filter(a => a.status === 'absent' && a.date <= todayStr).length;
  const onLeaveCount = currentMonthRecords.filter(a => a.status === 'on_leave').length;
  const holidayCount = currentMonthRecords.filter(a => a.status === 'holiday').length;
  const dayOffCount = currentMonthRecords.filter(a => a.status === 'day_off').length;

  const validPresenceLogs = currentMonthRecords.filter(a => a.date <= todayStr);
  const totalWorkingHoursSum = validPresenceLogs.reduce((sum, a) => sum + (parseFloat(a.totalWorkingHours) || 0), 0);
  const effectiveDays = presentCount + lateCount + (halfDayCount * 0.5);
  const employeeMultiplier = selectedEmployeeId === 'all' ? (employees.length || 1) : 1;
  const totalExpectedWorkingDays = workingDaysCount * employeeMultiplier;
  const attendanceRate = totalExpectedWorkingDays > 0 ? Math.min(100, +((effectiveDays / totalExpectedWorkingDays) * 100).toFixed(1)) : 0;
  const avgDailyHours = (presentCount + lateCount + halfDayCount) > 0 ? (totalWorkingHoursSum / (presentCount + lateCount + halfDayCount)).toFixed(1) : '0.0';

  const totalLogs = currentMonthRecords.length;

  const handleExportCSV = () => {
    if (currentMonthRecords.length === 0) {
      alert('No attendance data to export for selected period.');
      return;
    }
    const headers = ['Employee ID', 'Employee Name', 'Date', 'Status', 'Clock In', 'Clock Out', 'Hours', 'Notes'];
    const rows = currentMonthRecords.map(a => {
      const emp = employees.find(e =>
        e._id === a.employeeId ||
        e.employeeCode === a.employeeId ||
        (a.employeeCode && (e._id === a.employeeCode || e.employeeCode === a.employeeCode)) ||
        (a.employeeName && e.name.toLowerCase() === a.employeeName.toLowerCase())
      );
      return [
        a.employeeCode || a.employeeId,
        `"${emp?.name || a.employeeName || 'Employee'}"`,
        a.date,
        a.status,
        a.clockInTime || a.clockIn || '',
        a.clockOutTime || a.clockOut || '',
        a.totalWorkingHours || 0,
        `"${(a.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Attendance_Report_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '100%', paddingBottom: '24px' }}>
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
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        minHeight: '68px',
        boxSizing: 'border-box',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CalendarCheck size={17} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.2' }}>
              Attendance & Shift Tracking
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Live employee presence, monthly attendance matrix, and audit trails.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 12px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Export attendance records to CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          {isPrivileged && (
            <button
              onClick={() => setIsMarkModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0 12px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(2,132,199,0.2)'
              }}
              title="Manually log or update employee attendance"
            >
              <Plus size={13} />
              <span>Mark Attendance</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Attendance Summary KPI Cards */}
      <div className="kpi-grid-6">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Present Days</span>
            <div className="kpi-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <UserCheck size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#16a34a' }}>{presentCount}</div>
          <div className="kpi-subtext" style={{ color: '#16a34a' }}>
            <span>✔️ On-time attendance</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Half Days</span>
            <div className="kpi-icon-wrap" style={{ background: '#f3e8ff', color: '#8b5cf6' }}>
              <Award size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#8b5cf6' }}>{halfDayCount}</div>
          <div className="kpi-subtext" style={{ color: '#8b5cf6' }}>
            <span>🌟 4-hour shifts</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Late Arrivals</span>
            <div className="kpi-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#d97706' }}>{lateCount}</div>
          <div className="kpi-subtext" style={{ color: '#d97706' }}>
            <span>⚠️ Past grace period</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Absences</span>
            <div className="kpi-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <UserX size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#dc2626' }}>{absentCount}</div>
          <div className="kpi-subtext" style={{ color: '#dc2626' }}>
            <span>❌ Unplanned leaves</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">On Leave</span>
            <div className="kpi-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <Palmtree size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#0284c7' }}>{onLeaveCount}</div>
          <div className="kpi-subtext" style={{ color: '#0284c7' }}>
            <span>✈️ Approved leaves</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Days Off & Holidays</span>
            <div className="kpi-icon-wrap" style={{ background: '#f1f5f9', color: '#64748b' }}>
              <CalendarCheck size={18} />
            </div>
          </div>
          <div className="kpi-value">{dayOffCount + holidayCount}</div>
          <div className="kpi-subtext" style={{ color: '#64748b' }}>
            <span>📅 Weekends & Holidays</span>
          </div>
        </div>
      </div>

      {/* Top Filter Bar (Matches Screenshot 2 + Attendance Status Filter) */}
      <div className="action-bar-card">
        <div className="filter-left-group">
          {/* Employee Selector */}
          <div className="filter-item">
            <span style={{ fontWeight: '600', color: '#475569' }}>Employee:</span>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              disabled={!canViewAllAttendance}
              className="filter-select"
              style={{
                minWidth: '180px',
                backgroundColor: !canViewAllAttendance ? '#f1f5f9' : '#ffffff',
                cursor: !canViewAllAttendance ? 'not-allowed' : 'pointer'
              }}
            >
              {canViewAllAttendance ? (
                <>
                  <option value="all">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} {isEmployeeSelf(emp) ? "— It's You" : ''}
                    </option>
                  ))}
                </>
              ) : (
                <option value={selectedEmployeeId}>
                  {currentUser?.name || 'My Attendance'} (You)
                </option>
              )}
            </select>
          </div>

          {/* Month Selector */}
          <div className="filter-item">
            <span style={{ fontWeight: '600', color: '#475569' }}>Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="filter-select"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="filter-item">
            <span style={{ fontWeight: '600', color: '#475569' }}>Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="filter-select"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Attendance Status Filter (Explicit Requirement) */}
          <div className="filter-item">
            <span style={{ fontWeight: '600', color: '#475569' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
              style={{ minWidth: '140px' }}
            >
              <option value="all">All Statuses</option>
              <option value="present">✔️ Present</option>
              <option value="half_day">🌟 Half Day</option>
              <option value="late">⚠️ Late</option>
              <option value="absent">❌ Absent</option>
              <option value="on_leave">✈️ On Leave</option>
              <option value="holiday">⭐ Holiday</option>
              <option value="day_off">📅 Day Off</option>
              <option value="not_marked">— Not Marked</option>
            </select>
          </div>
        </div>

        <div className="filter-right-group">
          {/* Admin Force Clock-Out Button */}
          {isPrivileged && (
            <button
              onClick={() => setIsForceClockOutOpen(true)}
              className="btn btn-outline"
              style={{
                color: '#dc2626',
                borderColor: '#fca5a5',
                backgroundColor: '#fff5f5',
                fontSize: '12px',
                fontWeight: '700'
              }}
              title="Forcefully clock out an active employee shift with mandatory audit logging"
            >
              <LogOut size={14} />
              <span>Force Clock-Out</span>
            </button>
          )}

          {/* Mark Attendance Button */}
          <button
            onClick={() => setIsMarkModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={15} />
            <span>Mark Attendance</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="btn btn-outline"
          >
            <Download size={15} />
            <span>Export</span>
          </button>

          {/* View Mode Switcher */}
          <div className="view-switch-group">
            <button
              onClick={() => setViewMode('matrix')}
              className={`view-switch-btn ${viewMode === 'matrix' ? 'active' : ''}`}
              title="Matrix Calendar View"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 8px' }}
            >
              <Grid size={15} />
              <span style={{ fontSize: '11px', fontWeight: '700' }}>Matrix</span>
            </button>
            <button
              onClick={() => setViewMode('logs')}
              className={`view-switch-btn ${viewMode === 'logs' ? 'active' : ''}`}
              title="Detailed Daily Punch Logs (Clock In / Clock Out)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 8px' }}
            >
              <List size={15} />
              <span style={{ fontSize: '11px', fontWeight: '700' }}>Daily Logs</span>
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`view-switch-btn ${viewMode === 'summary' ? 'active' : ''}`}
              title="Analytics Summary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 8px' }}
            >
              <BarChart2 size={15} />
              <span style={{ fontSize: '11px', fontWeight: '700' }}>Summary</span>
            </button>
            <button
              onClick={() => setViewMode('audit')}
              className={`view-switch-btn ${viewMode === 'audit' ? 'active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0 10px',
                color: viewMode === 'audit' ? '#c2410c' : '#64748b',
                backgroundColor: viewMode === 'audit' ? '#fff7ed' : 'transparent',
                borderColor: viewMode === 'audit' ? '#fed7aa' : 'transparent'
              }}
              title="Complete Admin & Employee Audit Trail"
            >
              <ShieldAlert size={15} color={viewMode === 'audit' ? '#ea580c' : '#64748b'} />
              <span style={{ fontSize: '11px', fontWeight: '700' }}>Audit Trail</span>
            </button>
          </div>
        </div>
      </div>

      {/* Legend Ribbon with all 8 statuses (only for matrix/logs) */}
      {viewMode !== 'audit' && <AttendanceLegend />}

      {/* Audit Trail View (Complete Admin & Employee Audit Trail) */}
      {viewMode === 'audit' && (
        <AttendanceAuditTimeline initialEmployeeId={selectedEmployeeId} />
      )}

      {/* Main Monthly Attendance Matrix (Screenshot 2) */}
      {viewMode === 'matrix' && (
        <MonthlyMatrixTable
          month={selectedMonth}
          year={selectedYear}
          selectedEmployeeId={selectedEmployeeId}
          statusFilter={statusFilter}
        />
      )}

      {/* Detailed Daily Logs Table */}
      {viewMode === 'logs' && (
        <div className="table-card">
          <div className="table-responsive">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Work Hours</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {currentMonthRecords.length > 0 ? (
                  currentMonthRecords.map(record => {
                    const emp = employees.find(e =>
                      e._id === record.employeeId ||
                      e.employeeCode === record.employeeId ||
                      (record.employeeCode && (e._id === record.employeeCode || e.employeeCode === record.employeeCode)) ||
                      (record.employeeName && e.name.toLowerCase() === record.employeeName.toLowerCase())
                    );
                    const clockInDisplay = record.clockInTime || record.clockIn;
                    const clockOutDisplay = record.clockOutTime || record.clockOut;

                    return (
                      <tr key={record._id}>
                        <td>
                          <div className="employee-cell">
                            <div className="employee-avatar">
                              {emp?.avatar ? <img src={emp.avatar} alt={emp.name} /> : (emp?.name?.charAt(0) || record.employeeName?.charAt(0) || 'E')}
                            </div>
                            <div className="employee-name-group">
                              <span className="employee-name">
                                {emp?.name || record.employeeName || 'Employee'}
                                {isEmployeeSelf(emp) && (
                                  <span className="its-you-pill" style={{ fontSize: '9px', padding: '1px 5px', marginLeft: '6px' }}>It's You</span>
                                )}
                              </span>
                              <span className="employee-role">{emp?.role || (emp?.employeeCode ? `ID: #${emp.employeeCode}` : 'Team Member')}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: '600' }}>{record.date}</td>
                        <td>
                          <span className={`badge badge-${record.status}`}>
                            {record.status}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: '700',
                            color: clockInDisplay ? '#16a34a' : '#94a3b8',
                            fontFamily: clockInDisplay ? 'monospace' : 'inherit',
                            fontSize: '12.5px'
                          }}>
                            {clockInDisplay || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: '700',
                            color: clockOutDisplay ? '#dc2626' : (record.status === 'present' ? '#16a34a' : '#94a3b8'),
                            fontFamily: clockOutDisplay ? 'monospace' : 'inherit',
                            fontSize: '12.5px'
                          }}>
                            {clockOutDisplay || (record.status === 'present' ? '🟢 Active' : '—')}
                          </span>
                        </td>
                        <td>{record.totalWorkingHours ? `${record.totalWorkingHours} hrs` : '—'}</td>
                        <td style={{ color: '#64748b', fontSize: '12px' }}>{record.notes || '—'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      No detailed log records found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Summary */}
      {viewMode === 'summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Present Rate</span>
              <CheckCircle2 color="#16a34a" size={20} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a', marginTop: '10px' }}>
              {Math.round(((presentCount + lateCount + halfDayCount) / (totalLogs || 1)) * 100)}%
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Effective presence recorded</span>
          </div>

          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Average Daily Hours</span>
              <Clock color="#2563eb" size={20} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb', marginTop: '10px' }}>
              8.2 <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>hrs/day</span>
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Standard shift compliance</span>
          </div>

          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Late Incidents</span>
              <AlertTriangle color="#d97706" size={20} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706', marginTop: '10px' }}>
              {lateCount}
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Check-ins past 09:30 AM</span>
          </div>

          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Total Absences</span>
              <XCircle color="#dc2626" size={20} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626', marginTop: '10px' }}>
              {absentCount}
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Requires follow-up</span>
          </div>
        </div>
      )}

      {/* Mark Attendance Modal */}
      <MarkAttendanceModal
        isOpen={isMarkModalOpen}
        onClose={() => setIsMarkModalOpen(false)}
      />

      {/* Admin Force Clock-Out Override Modal */}
      <AdminForceClockOutModal
        isOpen={isForceClockOutOpen}
        onClose={() => setIsForceClockOutOpen(false)}
      />
    </div>
  );
};
