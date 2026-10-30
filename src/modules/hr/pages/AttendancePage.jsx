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
import { matchesFilter } from '../../../shared/utils/filterUtils';
import { AttendanceLegend } from '../components/attendance/AttendanceLegend';
import { MonthlyMatrixTable } from '../components/attendance/MonthlyMatrixTable';
import { MarkAttendanceModal } from '../components/attendance/MarkAttendanceModal';
import { AttendanceAuditTimeline } from '../components/attendance/AttendanceAuditTimeline';
import { AdminForceClockOutModal } from '../components/attendance/AdminForceClockOutModal';
import { OvertimeManagementPanel } from '../components/attendance/OvertimeManagementPanel';
import { useToast } from '../../../shared/context/ToastContext';

export const AttendancePage = () => {
  const { addToast } = useToast();
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

  const displayLogRecords = React.useMemo(() => {
    if (statusFilter === 'all') return currentMonthRecords;
    return currentMonthRecords.filter(r => matchesFilter(r.status, statusFilter));
  }, [currentMonthRecords, statusFilter]);

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
    <div className="flex flex-col gap-3.5 min-h-full pb-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-3 px-4 rounded-[10px] border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[68px] box-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CalendarCheck size={17} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0 leading-tight">
              Attendance & Shift Tracking
            </h1>
            <p className="m-0 mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
              Live employee presence, monthly attendance matrix, and audit trails.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Export attendance records to CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          {isPrivileged && (
            <button
              onClick={() => setIsMarkModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 h-[30px] rounded-md bg-sky-600 text-white border-none text-xs font-bold cursor-pointer shadow-sm hover:bg-sky-700 transition-colors"
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
        <div className="kpi-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="kpi-header">
            <span className="kpi-title text-slate-600 dark:text-slate-300">Present Days</span>
            <div className="kpi-icon-wrap bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="kpi-value text-green-600 dark:text-green-400">{presentCount}</div>
          <div className="kpi-subtext text-green-600 dark:text-green-400">
            <span>✔️ On-time attendance</span>
          </div>
        </div>

        <div className="kpi-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="kpi-header">
            <span className="kpi-title text-slate-600 dark:text-slate-300">Half Days</span>
            <div className="kpi-icon-wrap bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Award size={18} />
            </div>
          </div>
          <div className="kpi-value text-purple-600 dark:text-purple-400">{halfDayCount}</div>
          <div className="kpi-subtext text-purple-600 dark:text-purple-400">
            <span>🌟 4-hour shifts</span>
          </div>
        </div>

        <div className="kpi-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="kpi-header">
            <span className="kpi-title text-slate-600 dark:text-slate-300">Late Arrivals</span>
            <div className="kpi-icon-wrap bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="kpi-value text-amber-600 dark:text-amber-400">{lateCount}</div>
          <div className="kpi-subtext text-amber-600 dark:text-amber-400">
            <span>⚠️ Past grace period</span>
          </div>
        </div>

        <div className="kpi-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="kpi-header">
            <span className="kpi-title text-slate-600 dark:text-slate-300">Absences</span>
            <div className="kpi-icon-wrap bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              <UserX size={18} />
            </div>
          </div>
          <div className="kpi-value text-red-600 dark:text-red-400">{absentCount}</div>
          <div className="kpi-subtext text-red-600 dark:text-red-400">
            <span>❌ Unplanned leaves</span>
          </div>
        </div>

        <div className="kpi-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="kpi-header">
            <span className="kpi-title text-slate-600 dark:text-slate-300">On Leave</span>
            <div className="kpi-icon-wrap bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Palmtree size={18} />
            </div>
          </div>
          <div className="kpi-value text-sky-600 dark:text-sky-400">{onLeaveCount}</div>
          <div className="kpi-subtext text-sky-600 dark:text-sky-400">
            <span>✈️ Approved leaves</span>
          </div>
        </div>

        <div className="kpi-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="kpi-header">
            <span className="kpi-title text-slate-600 dark:text-slate-300">Days Off & Holidays</span>
            <div className="kpi-icon-wrap bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <CalendarCheck size={18} />
            </div>
          </div>
          <div className="kpi-value text-slate-800 dark:text-slate-100">{dayOffCount + holidayCount}</div>
          <div className="kpi-subtext text-slate-500 dark:text-slate-400">
            <span>📅 Weekends & Holidays</span>
          </div>
        </div>
      </div>

      {/* Top Filter Bar (Matches Screenshot 2 + Attendance Status Filter) */}
      <div className="action-bar-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="filter-left-group">
          {/* Employee Selector */}
          <div className="filter-item">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Employee:</span>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              disabled={!canViewAllAttendance}
              className={`filter-select min-w-[180px] dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 ${!canViewAllAttendance ? 'bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed text-slate-400' : 'bg-white dark:bg-slate-800 cursor-pointer'}`}
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
            <span className="font-semibold text-slate-600 dark:text-slate-300">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="filter-select dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="filter-item">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="filter-select dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Attendance Status Filter (Explicit Requirement) */}
          <div className="filter-item">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select min-w-[140px] dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
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
              className="btn btn-outline text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
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
            className="btn btn-outline dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          >
            <Download size={15} />
            <span>Export</span>
          </button>

          {/* View Mode Switcher */}
          <div className="view-switch-group">
            <button
              onClick={() => setViewMode('matrix')}
              className={`view-switch-btn inline-flex items-center gap-1 px-2 ${viewMode === 'matrix' ? 'active' : ''}`}
              title="Matrix Calendar View"
            >
              <Grid size={15} />
              <span className="text-[11px] font-bold">Matrix</span>
            </button>
            <button
              onClick={() => setViewMode('logs')}
              className={`view-switch-btn inline-flex items-center gap-1 px-2 ${viewMode === 'logs' ? 'active' : ''}`}
              title="Detailed Daily Punch Logs (Clock In / Clock Out)"
            >
              <List size={15} />
              <span className="text-[11px] font-bold">Daily Logs</span>
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`view-switch-btn inline-flex items-center gap-1 px-2 ${viewMode === 'summary' ? 'active' : ''}`}
              title="Analytics Summary"
            >
              <BarChart2 size={15} />
              <span className="text-[11px] font-bold">Summary</span>
            </button>
            <button
              onClick={() => setViewMode('audit')}
              className={`view-switch-btn inline-flex items-center gap-1 px-2.5 transition-colors ${viewMode === 'audit' ? 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800' : 'text-slate-500 dark:text-slate-400 bg-transparent border-transparent'}`}
              title="Complete Admin & Employee Audit Trail"
            >
              <ShieldAlert size={15} color={viewMode === 'audit' ? '#ea580c' : '#64748b'} />
              <span className="text-[11px] font-bold">Audit Trail</span>
            </button>
            <button
              onClick={() => setViewMode('overtime')}
              className={`view-switch-btn inline-flex items-center gap-1 px-2.5 transition-colors ${viewMode === 'overtime' ? 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800' : 'text-slate-500 dark:text-slate-400 bg-transparent border-transparent'}`}
              title="Overtime Requests & Approvals"
            >
              <Clock size={15} color={viewMode === 'overtime' ? '#ea580c' : '#64748b'} />
              <span className="text-[11px] font-bold">Overtime</span>
            </button>
          </div>
        </div>
      </div>

      {/* Legend Ribbon with all 8 statuses (only for matrix/logs) */}
      {viewMode !== 'audit' && viewMode !== 'overtime' && <AttendanceLegend />}

      {/* Overtime Requests & Approvals Panel */}
      {viewMode === 'overtime' && (
        <OvertimeManagementPanel currentUser={currentUser} addToast={addToast} />
      )}

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
                {displayLogRecords.length > 0 ? (
                  displayLogRecords.map(record => {
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
                                  <span className="its-you-pill text-[9px] py-px px-1.5 ml-1.5">It's You</span>
                                )}
                              </span>
                              <span className="employee-role">{emp?.role || (emp?.employeeCode ? `ID: #${emp.employeeCode}` : 'Team Member')}</span>
                            </div>
                          </div>
                        </td>
                        <td className="font-semibold">{record.date}</td>
                        <td>
                          <span className={`badge badge-${record.status}`}>
                            {record.status}
                          </span>
                        </td>
                        <td>
                          <span className={`font-bold font-mono text-[12.5px] ${clockInDisplay ? 'text-green-600' : 'text-slate-400 font-sans'}`}>
                            {clockInDisplay || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`font-bold font-mono text-[12.5px] ${clockOutDisplay ? 'text-red-600' : (record.status === 'present' ? 'text-green-600 font-sans' : 'text-slate-400 font-sans')}`}>
                            {clockOutDisplay || (record.status === 'present' ? '🟢 Active' : '—')}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">
                              {record.totalWorkingHours ? `${record.totalWorkingHours} hrs` : (record.workSeconds ? `${(record.workSeconds / 3600).toFixed(2)} hrs` : '—')}
                            </span>
                            {Array.isArray(record.punchSessions) && record.punchSessions.length > 1 && (
                              <span
                                title={record.punchSessions.map((s, idx) => `Session ${idx + 1}: ${s.inTime} - ${s.outTime} (${s.durationText || Math.round((s.durationSeconds || 0) / 60) + 'm'})`).join('\n')}
                                className="cursor-help text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-px"
                              >
                                {record.punchSessions.length} sessions
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-slate-500 text-xs">{record.notes || '—'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center p-9 text-slate-400">
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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-500 dark:text-slate-400 font-semibold">Present Rate</span>
              <CheckCircle2 color="#16a34a" size={20} />
            </div>
            <div className="text-[28px] font-extrabold text-green-600 dark:text-green-400 mt-2.5">
              {Math.round(((presentCount + lateCount + halfDayCount) / (totalLogs || 1)) * 100)}%
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Effective presence recorded</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-500 dark:text-slate-400 font-semibold">Average Daily Hours</span>
              <Clock color="#2563eb" size={20} />
            </div>
            <div className="text-[28px] font-extrabold text-blue-600 dark:text-blue-400 mt-2.5">
              8.2 <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">hrs/day</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Standard shift compliance</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-500 dark:text-slate-400 font-semibold">Late Incidents</span>
              <AlertTriangle color="#d97706" size={20} />
            </div>
            <div className="text-[28px] font-extrabold text-amber-600 dark:text-amber-400 mt-2.5">
              {lateCount}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Check-ins past 09:30 AM</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-500 dark:text-slate-400 font-semibold">Total Absences</span>
              <XCircle color="#dc2626" size={20} />
            </div>
            <div className="text-[28px] font-extrabold text-red-600 dark:text-red-400 mt-2.5">
              {absentCount}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Requires follow-up</span>
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
