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
  Users,
  CalendarCheck,
  ShieldAlert,
  LogOut,
  History,
  Filter,
  RotateCcw
} from 'lucide-react';
import { useHR } from '../context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { getUserModulePermissions, isHRorAdmin, getUserRole, ROLES } from '../../../shared/utils/permissionUtils';
import { matchesFilter } from '../../../shared/utils/filterUtils';
import { AttendanceLegend } from '../components/attendance/AttendanceLegend';
import { MonthlyMatrixTable } from '../components/attendance/MonthlyMatrixTable';
import { MarkAttendanceModal } from '../components/attendance/MarkAttendanceModal';
import { AttendanceAuditTimeline } from '../components/attendance/AttendanceAuditTimeline';
import { AdminForceClockOutModal } from '../components/attendance/AdminForceClockOutModal';
import { OvertimeManagementPanel } from '../components/attendance/OvertimeManagementPanel';
import { useToast } from '../../../shared/context/ToastContext';
import { getCompanySettings } from '../../../shared/services/companySettingsService';
import { readTimerStorage, parseTimeToSeconds } from '../../../shared/utils/timerUtils';

export const AttendancePage = () => {
  const { addToast } = useToast();
  const companySettings = getCompanySettings();
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
    leaves,
    currentUser: hrUser
  } = useHR();

  const currentUser = authUser || hrUser;
  const isPrivileged = React.useMemo(() => isHRorAdmin(currentUser), [currentUser]);
  const userRole = React.useMemo(() => getUserRole(currentUser), [currentUser]);
  const perms = React.useMemo(() => getUserModulePermissions(currentUser), [currentUser]);
  // Can view team attendance if privileged, or explicitly granted viewAllAttendance / allAccess
  const canViewAllAttendance = isPrivileged || perms?.viewAllAttendance === true || perms?.allAccess === true;
  const hasForceClockOut = isPrivileged || perms?.forceClockOut === true || perms?.allAccess === true;
  const hasEditAttendance = isPrivileged || perms?.editAttendance === true || perms?.allAccess === true;
  const hasViewAuditTrail = isPrivileged || perms?.viewAuditTrail === true || perms?.allAccess === true;

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

  // Strictly compute effective target employee ID: non-privileged users are ALWAYS locked to themselves
  const effectiveEmployeeId = React.useMemo(() => {
    if (!canViewAllAttendance) {
      return currentUser?._id || currentUser?.employeeCode || 'self';
    }
    return selectedEmployeeId;
  }, [canViewAllAttendance, currentUser, selectedEmployeeId]);

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
  const selectedEmpObj = employees.find(e => e._id === effectiveEmployeeId || e.employeeCode === effectiveEmployeeId);
  const currentMonthRecords = React.useMemo(() => {
    return attendance.filter(a => {
      if (!a.date || !a.date.startsWith(currentMonthPrefix)) return false;
      if (!canViewAllAttendance) {
        const myId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || '').toLowerCase();
        const myCode = currentUser?.employeeCode ? String(currentUser.employeeCode).toLowerCase() : '';
        const myName = (currentUser?.name || '').trim().toLowerCase();
        const aId = String(a.employeeId || a.employee?._id || a.employee || '').toLowerCase();
        const aCode = String(a.employeeCode || '').toLowerCase();
        const aName = (a.employeeName || '').trim().toLowerCase();

        return (myId && (aId === myId || aCode === myId)) ||
               (myCode && (aCode === myCode || aId === myCode)) ||
               (myName && aName === myName);
      }
      if (effectiveEmployeeId === 'all') return true;
      return a.employeeId === effectiveEmployeeId ||
             a.employeeCode === effectiveEmployeeId ||
             (selectedEmpObj && (
               a.employeeId === selectedEmpObj._id ||
               a.employeeId === selectedEmpObj.employeeCode ||
               a.employeeCode === selectedEmpObj.employeeCode ||
               (a.employeeName && a.employeeName.trim().toLowerCase() === selectedEmpObj.name.trim().toLowerCase())
             ));
    });
  }, [attendance, currentMonthPrefix, canViewAllAttendance, currentUser, effectiveEmployeeId, selectedEmpObj]);

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

  // Scoped employees for calculations (admin looking at 'all' vs single employee)
  const targetEmployees = React.useMemo(() => {
    if (canViewAllAttendance && effectiveEmployeeId === 'all') {
      return employees || [];
    }
    const filtered = (employees || []).filter(e => isEmployeeSelf(e) || String(e._id) === String(effectiveEmployeeId) || e.employeeCode === effectiveEmployeeId);
    if (filtered.length === 0 && currentUser) return [currentUser];
    return filtered;
  }, [canViewAllAttendance, effectiveEmployeeId, employees, currentUser, isEmployeeSelf]);

  // 1. TODAY'S LIVE WORKFORCE STATUS (Real-time presence & absence truth)
  const todayLiveStats = React.useMemo(() => {
    let present = 0;
    let onTime = 0;
    let late = 0;
    let halfDay = 0;
    let absent = 0;
    let onLeave = 0;
    let workingLive = 0;
    let clockedOut = 0;

    targetEmployees.forEach(emp => {
      const empId = String(emp._id || emp.id || '').toLowerCase();
      const empCode = String(emp.employeeCode || '').toLowerCase();
      const empName = (emp.name || '').trim().toLowerCase();

      const att = (attendance || []).find(a =>
        a.date === todayStr && (
          (empId && (String(a.employeeId).toLowerCase() === empId || String(a.employee).toLowerCase() === empId || String(a.employee?._id).toLowerCase() === empId)) ||
          (empCode && (String(a.employeeCode).toLowerCase() === empCode || String(a.employeeId).toLowerCase() === empCode)) ||
          (empName && a.employeeName?.trim().toLowerCase() === empName)
        )
      );

      const leave = (leaves || []).find(l =>
        l.status === 'approved' && l.startDate <= todayStr && l.endDate >= todayStr && (
          (empId && (String(l.employeeId).toLowerCase() === empId || String(l.employee).toLowerCase() === empId)) ||
          (empCode && String(l.employeeCode).toLowerCase() === empCode) ||
          (empName && l.employeeName?.trim().toLowerCase() === empName)
        )
      );

      const storedIn = readTimerStorage(emp, 'is_clocked_in') === 'true';
      const storedOut = readTimerStorage(emp, 'had_clocked_out') === 'true' || Boolean(readTimerStorage(emp, 'clock_out'));

      const isClockedIn = Boolean(storedIn || (att && att.isClockedIn && !att.clockOutTime));
      const isClockedOut = Boolean(storedOut || att?.clockOutTime || (att && att.isClockedIn === false));
      const isPresent = isClockedIn || isClockedOut || ['present', 'late', 'half_day'].includes(att?.status);
      const isOnLeave = Boolean(att?.status === 'on_leave' || leave);

      if (isOnLeave) {
        onLeave++;
      } else if (isPresent) {
        present++;
        if (att?.status === 'late' || (att?.clockInTime && parseTimeToSeconds(att.clockInTime) > 34200)) {
          late++;
        } else if (att?.status === 'half_day') {
          halfDay++;
        } else {
          onTime++;
        }
        if (isClockedIn) workingLive++;
        if (isClockedOut) clockedOut++;
      } else {
        absent++;
      }
    });

    return {
      total: targetEmployees.length,
      present,
      onTime,
      late,
      halfDay,
      absent,
      onLeave,
      workingLive,
      clockedOut
    };
  }, [targetEmployees, attendance, leaves, todayStr]);

  // 2. MONTHLY ACCUMULATED ATTENDANCE METRICS
  const onTimeCount = currentMonthRecords.filter(a => a.status === 'present' && a.date <= todayStr).length;
  const lateCount = currentMonthRecords.filter(a => a.status === 'late' && a.date <= todayStr).length;
  const halfDayCount = currentMonthRecords.filter(a => a.status === 'half_day' && a.date <= todayStr).length;
  const fullDaysPresent = onTimeCount + lateCount;
  const totalPresentCount = fullDaysPresent + halfDayCount;
  const onLeaveCount = currentMonthRecords.filter(a => a.status === 'on_leave').length;
  const holidayCount = currentMonthRecords.filter(a => a.status === 'holiday').length;
  const dayOffCount = currentMonthRecords.filter(a => a.status === 'day_off').length;

  // Real Monthly Absences: count actual missed working days (no punch + no approved leave)
  const realAbsentCount = React.useMemo(() => {
    let count = 0;
    const pastDates = [];
    for (let day = 1; day <= daysInSelectedMonth; day++) {
      const d = new Date(selectedYear, selectedMonth - 1, day);
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dateStr > todayStr) break;
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      pastDates.push(dateStr);
    }

    pastDates.forEach(dStr => {
      targetEmployees.forEach(emp => {
        const empId = String(emp._id || emp.id || '').toLowerCase();
        const empCode = String(emp.employeeCode || '').toLowerCase();
        const empName = (emp.name || '').trim().toLowerCase();

        const att = (attendance || []).find(a =>
          a.date === dStr && (
            (empId && (String(a.employeeId).toLowerCase() === empId || String(a.employee).toLowerCase() === empId || String(a.employee?._id).toLowerCase() === empId)) ||
            (empCode && (String(a.employeeCode).toLowerCase() === empCode || String(a.employeeId).toLowerCase() === empCode)) ||
            (empName && a.employeeName?.trim().toLowerCase() === empName)
          )
        );

        const onLeave = (leaves || []).some(l =>
          l.status === 'approved' && l.startDate <= dStr && l.endDate >= dStr && (
            (empId && (String(l.employeeId).toLowerCase() === empId || String(l.employee).toLowerCase() === empId)) ||
            (empCode && String(l.employeeCode).toLowerCase() === empCode) ||
            (empName && l.employeeName?.trim().toLowerCase() === empName)
          )
        );

        if (att) {
          if (att.status === 'absent') count++;
        } else if (!onLeave) {
          count++;
        }
      });
    });

    return count;
  }, [daysInSelectedMonth, selectedYear, selectedMonth, todayStr, targetEmployees, attendance, leaves]);

  const validPresenceLogs = currentMonthRecords.filter(a => a.date <= todayStr);
  const totalWorkingHoursSum = validPresenceLogs.reduce((sum, a) => sum + (parseFloat(a.totalWorkingHours) || 0), 0);
  const effectiveDays = fullDaysPresent + (halfDayCount * 0.5);
  const employeeMultiplier = (canViewAllAttendance && effectiveEmployeeId === 'all') ? (employees.length || 1) : 1;
  const totalExpectedWorkingDays = workingDaysCount * employeeMultiplier;
  const attendanceRate = totalExpectedWorkingDays > 0 ? Math.min(100, +((effectiveDays / totalExpectedWorkingDays) * 100).toFixed(1)) : 0;
  const avgDailyHours = totalPresentCount > 0 ? (totalWorkingHoursSum / totalPresentCount).toFixed(1) : '0.0';

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

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end mt-1 sm:mt-0">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 h-[32px] rounded-md bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Export attendance records to CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          {hasEditAttendance && (
            <button
              onClick={() => setIsMarkModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 h-[32px] rounded-md bg-sky-600 text-white border-none text-xs font-bold cursor-pointer shadow-sm hover:bg-sky-700 transition-colors"
              title="Manually log or update employee attendance"
            >
              <Plus size={13} />
              <span>Mark Attendance</span>
            </button>
          )}
        </div>
      </div>

      {/* ── TODAY'S REAL-TIME WORKFORCE STATUS STRIP ── */}
      <div className="bg-slate-50 dark:bg-slate-800/80 rounded-[10px] border border-slate-200 dark:border-slate-700/80 p-3 px-4 flex items-center justify-between flex-wrap gap-2.5 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            📅 Today's Live Status ({todayStr}):
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
            <Users size={13} className="text-sky-600" />
            <span>Team: {todayLiveStats.total}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold bg-green-50 dark:bg-green-950/60 px-2.5 py-1 rounded-md border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
            <UserCheck size={13} className="text-green-600" />
            <span>Present Today: {todayLiveStats.present}</span>
            {todayLiveStats.late > 0 && <span className="text-[10.5px] font-medium text-amber-600">({todayLiveStats.late} late)</span>}
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
            <UserX size={13} className="text-red-600" />
            <span>Absent Today: {todayLiveStats.absent}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
            <Palmtree size={13} className="text-amber-600" />
            <span>On Leave: {todayLiveStats.onLeave}</span>
          </span>
        </div>
        {todayLiveStats.workingLive > 0 && (
          <span className="inline-flex items-center gap-1.5 font-bold text-xs bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded-md text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{todayLiveStats.workingLive} Working Live Now</span>
          </span>
        )}
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
          <div className="kpi-value text-green-600 dark:text-green-400">{totalPresentCount}</div>
          <div className="kpi-subtext text-green-600 dark:text-green-400">
            <span>✔️ {onTimeCount} On Time • {lateCount} Late</span>
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
          <div className="kpi-value text-red-600 dark:text-red-400">{realAbsentCount}</div>
          <div className="kpi-subtext text-red-600 dark:text-red-400">
            <span>❌ Unplanned / No punch</span>
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

      {/* ── Attendance Navigation & Action Toolbar (Clean 2-Row Design) ── */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Row 1: View Modes (Left) & Actions (Right) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {/* Segmented View Mode Tabs */}
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/80 gap-1 overflow-x-auto max-w-full">
            <button
              onClick={() => setViewMode('matrix')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Matrix Calendar View"
            >
              <Grid size={14} />
              <span>Matrix</span>
            </button>

            <button
              onClick={() => setViewMode('logs')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                viewMode === 'logs'
                  ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Detailed Daily Punch Logs (Clock In / Clock Out)"
            >
              <List size={14} />
              <span>Daily Logs</span>
            </button>

            <button
              onClick={() => setViewMode('summary')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                viewMode === 'summary'
                  ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Analytics Summary"
            >
              <BarChart2 size={14} />
              <span>Summary</span>
            </button>

            {hasViewAuditTrail && (
              <button
                onClick={() => setViewMode('audit')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                  viewMode === 'audit'
                    ? 'bg-white dark:bg-orange-600 text-orange-600 dark:text-white shadow-xs'
                    : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Complete Admin & Employee Audit Trail"
              >
                <ShieldAlert size={14} className={viewMode === 'audit' ? 'text-current' : 'text-orange-500'} />
                <span>Audit Trail</span>
              </button>
            )}

            <button
              onClick={() => setViewMode('overtime')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                viewMode === 'overtime'
                  ? 'bg-white dark:bg-amber-600 text-amber-600 dark:text-white shadow-xs'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Overtime Requests & Approvals"
            >
              <Clock size={14} className={viewMode === 'overtime' ? 'text-current' : 'text-amber-500'} />
              <span>Overtime</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
            {/* Admin Force Clock-Out Button */}
            {hasForceClockOut && (
              <button
                onClick={() => setIsForceClockOutOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer shadow-xs"
                title="Forcefully clock out an active employee shift with mandatory audit logging"
              >
                <LogOut size={13} />
                <span>Force Clock-Out</span>
              </button>
            )}

            {/* Export Button */}
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
              title="Export filtered records to CSV"
            >
              <Download size={13} />
              <span>Export</span>
            </button>

            {/* Mark Attendance Button (Admin, HR, or editAttendance permission only) */}
            {hasEditAttendance && (
              <button
                onClick={() => setIsMarkModalOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 border-0 transition-colors cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>Mark Attendance</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Clean Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Employee Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Users size={13} className="text-slate-400" />
                <span>Employee:</span>
              </span>
              <select
                value={effectiveEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                disabled={!canViewAllAttendance}
                className={`text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 outline-none transition-all ${
                  !canViewAllAttendance
                    ? 'bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed text-slate-400'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 cursor-pointer focus:border-blue-500'
                }`}
              >
                {canViewAllAttendance ? (
                  <>
                    <option value="all">All Employees ({employees.length})</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} {isEmployeeSelf(emp) ? "— It's You" : ''}
                      </option>
                    ))}
                  </>
                ) : (
                  <option value={effectiveEmployeeId}>
                    {currentUser?.name || 'My Attendance'} (You)
                  </option>
                )}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar size={13} className="text-slate-400" />
                <span>Month:</span>
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none cursor-pointer focus:border-blue-500"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none cursor-pointer focus:border-blue-500"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Attendance Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Filter size={13} className="text-slate-400" />
                <span>Status:</span>
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none cursor-pointer focus:border-blue-500"
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

            {/* Reset Button */}
            {(statusFilter !== 'all' || (canViewAllAttendance && effectiveEmployeeId !== 'all')) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  if (canViewAllAttendance) setSelectedEmployeeId('all');
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-sky-400 hover:underline bg-transparent border-0 cursor-pointer p-0"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Quick Info Indicator */}
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            <span>{months.find(m => m.value === selectedMonth)?.name} {selectedYear} • {targetEmployees.length} employee(s)</span>
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
      {viewMode === 'audit' && hasViewAuditTrail && (
        <AttendanceAuditTimeline initialEmployeeId={effectiveEmployeeId} />
      )}

      {/* Main Monthly Attendance Matrix (Screenshot 2) */}
      {viewMode === 'matrix' && (
        <MonthlyMatrixTable
          month={selectedMonth}
          year={selectedYear}
          selectedEmployeeId={effectiveEmployeeId}
          statusFilter={statusFilter}
          canViewAllAttendance={canViewAllAttendance}
          currentUser={currentUser}
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
                            {record.overtimeHours > 0 && (
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-px">
                                +{record.overtimeHours}h OT
                              </span>
                            )}
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
              {attendanceRate}%
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Effective presence recorded</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-500 dark:text-slate-400 font-semibold">Average Daily Hours</span>
              <Clock color="#2563eb" size={20} />
            </div>
            <div className="text-[28px] font-extrabold text-blue-600 dark:text-blue-400 mt-2.5">
              {avgDailyHours} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">hrs/day</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Standard shift: {companySettings.standardWorkHours || 9}h</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-500 dark:text-slate-400 font-semibold">Late Incidents</span>
              <AlertTriangle color="#d97706" size={20} />
            </div>
            <div className="text-[28px] font-extrabold text-amber-600 dark:text-amber-400 mt-2.5">
              {lateCount}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Check-ins past {companySettings.shiftStartTime || '09:30 AM'}</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-500 dark:text-slate-400 font-semibold">Total Absences</span>
              <XCircle color="#dc2626" size={20} />
            </div>
            <div className="text-[28px] font-extrabold text-red-600 dark:text-red-400 mt-2.5">
              {realAbsentCount}
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
