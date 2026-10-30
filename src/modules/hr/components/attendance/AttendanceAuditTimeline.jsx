import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Coffee,
  Utensils,
  LogIn,
  LogOut,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  User,
  FileText,
  RotateCcw
} from 'lucide-react';
import { useHR } from '../../context/HRContext';

export const AttendanceAuditTimeline = ({ initialEmployeeId = 'all', allowEmployeeSwitch = true }) => {
  const { auditLogs, employees, currentUser } = useHR();

  const isPrivileged = currentUser?.isAdmin || currentUser?.systemRole === 'admin' || currentUser?.role === 'admin' || currentUser?.role === 'hr';

  const [selectedEmp, setSelectedEmp] = useState(
    !isPrivileged
      ? (currentUser?._id || currentUser?.employeeCode || 'emp_003')
      : (initialEmployeeId || 'all')
  );
  const [filterType, setFilterType] = useState('all'); // 'all', 'clock', 'breaks', 'overrides'
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');

  // Enforce Tenant Scoping: Non-privileged users can NEVER view others' audit logs
  const effectiveEmployeeFilter = !isPrivileged
    ? (currentUser?._id || currentUser?.employeeCode || 'emp_003')
    : selectedEmp;

  const filteredLogs = useMemo(() => {
    return (auditLogs || []).filter(log => {
      // 1. Employee filter
      if (effectiveEmployeeFilter !== 'all') {
        const matchesEmp = log.employeeId === effectiveEmployeeFilter ||
                           log.employeeCode === effectiveEmployeeFilter ||
                           log.employee === effectiveEmployeeFilter;
        if (!matchesEmp) return false;
      }

      // 2. Type filter
      if (filterType === 'clock') {
        if (!['clock_in', 'clock_out'].includes(log.type)) return false;
      } else if (filterType === 'breaks') {
        if (!['tea_break_start', 'tea_break_end', 'lunch_break_start', 'lunch_break_end', 'break_start', 'break_end'].includes(log.type)) return false;
      } else if (filterType === 'overrides') {
        if (!log.isAdminOverride && !['admin_force_clock_out', 'admin_shift_adjustment', 'reclock_approved', 'reclock_rejected'].includes(log.type)) return false;
      }

      // 3. Date filter
      if (dateFilter && log.date !== dateFilter) return false;

      // 4. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesQ = (log.employeeName || '').toLowerCase().includes(q) ||
                         (log.action || '').toLowerCase().includes(q) ||
                         (log.details || '').toLowerCase().includes(q) ||
                         (log.auditNote || '').toLowerCase().includes(q) ||
                         (log.adminName || '').toLowerCase().includes(q) ||
                         (log.adminId || '').toLowerCase().includes(q);
        if (!matchesQ) return false;
      }

      return true;
    });
  }, [auditLogs, effectiveEmployeeFilter, filterType, dateFilter, search]);

  // Aggregate Metrics for Header
  const metrics = useMemo(() => {
    const list = filteredLogs;
    return {
      total: list.length,
      clockPunches: list.filter(l => ['clock_in', 'clock_out'].includes(l.type)).length,
      breaks: list.filter(l => ['tea_break_start', 'tea_break_end', 'lunch_break_start', 'lunch_break_end', 'break_start', 'break_end'].includes(l.type)).length,
      overrides: list.filter(l => l.isAdminOverride || ['admin_force_clock_out', 'admin_shift_adjustment'].includes(l.type)).length
    };
  }, [filteredLogs]);

  const getEventBadge = (type) => {
    switch (type) {
      case 'clock_in':
        return {
          icon: <LogIn size={13} className="text-green-600 dark:text-green-400" />,
          label: 'Clock In',
          badgeClass: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800'
        };
      case 'clock_out':
        return {
          icon: <LogOut size={13} className="text-red-600 dark:text-red-400" />,
          label: 'Clock Out',
          badgeClass: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
        };
      case 'tea_break_start':
        return {
          icon: <Coffee size={13} className="text-amber-600 dark:text-amber-400" />,
          label: 'Tea Break Started',
          badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
        };
      case 'tea_break_end':
        return {
          icon: <Coffee size={13} className="text-amber-700 dark:text-amber-300" />,
          label: 'Tea Break Resumed',
          badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
        };
      case 'lunch_break_start':
        return {
          icon: <Utensils size={13} className="text-sky-600 dark:text-sky-400" />,
          label: 'Lunch Break Started',
          badgeClass: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
        };
      case 'lunch_break_end':
        return {
          icon: <Utensils size={13} className="text-sky-700 dark:text-sky-300" />,
          label: 'Lunch Break Resumed',
          badgeClass: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
        };
      case 'admin_force_clock_out':
        return {
          icon: <ShieldAlert size={13} className="text-red-600 dark:text-red-400" />,
          label: 'Admin Force Clock-Out',
          badgeClass: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-700'
        };
      case 'admin_shift_adjustment':
        return {
          icon: <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400" />,
          label: 'Admin Shift Adjustment',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700'
        };
      case 'reclock_approved':
        return {
          icon: <CheckCircle2 size={13} className="text-green-600 dark:text-green-400" />,
          label: 'Re-Clock Approved',
          badgeClass: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800'
        };
      case 'reclock_rejected':
        return {
          icon: <RotateCcw size={13} className="text-red-600 dark:text-red-400" />,
          label: 'Re-Clock Rejected',
          badgeClass: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
        };
      default:
        return {
          icon: <Clock size={13} className="text-slate-500 dark:text-slate-400" />,
          label: 'Break Activity',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        };
    }
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl py-3 px-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
            Total Audit Records
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {metrics.total}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Full timestamped punch history
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl py-3 px-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-green-600 dark:text-green-400 font-semibold uppercase">
            Clock In & Out Punches
          </div>
          <div className="text-xl font-extrabold text-green-600 dark:text-green-400 mt-1">
            {metrics.clockPunches}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Standard daily attendance
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl py-3 px-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase">
            Tea & Lunch Breaks
          </div>
          <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {metrics.breaks}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Break triggers & durations
          </div>
        </div>

        <div className="rounded-xl py-3 px-4 border border-orange-200 dark:border-orange-800/60 bg-orange-50/50 dark:bg-orange-950/30 shadow-xs">
          <div className="text-[11px] text-orange-700 dark:text-orange-300 font-bold uppercase">
            ⚠️ Admin Overrides
          </div>
          <div className="text-xl font-extrabold text-orange-600 dark:text-orange-400 mt-1">
            {metrics.overrides}
          </div>
          <div className="text-[11px] text-orange-800 dark:text-orange-300/80 mt-0.5">
            Manual adjustments & forced stops
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 py-3 px-4 flex items-center justify-between flex-wrap gap-3">
        {/* Left: Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Filter Type:</span>
          
          <button
            onClick={() => setFilterType('all')}
            className={`py-1 px-3 rounded-md text-[11.5px] font-semibold cursor-pointer border ${filterType === 'all' ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'}`}
          >
            All Logs ({metrics.total})
          </button>

          <button
            onClick={() => setFilterType('clock')}
            className={`py-1 px-3 rounded-md text-[11.5px] font-semibold cursor-pointer border ${filterType === 'clock' ? 'border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'}`}
          >
            Clock In / Out
          </button>

          <button
            onClick={() => setFilterType('breaks')}
            className={`py-1 px-3 rounded-md text-[11.5px] font-semibold cursor-pointer border ${filterType === 'breaks' ? 'border-amber-600 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'}`}
          >
            Tea & Lunch Breaks
          </button>

          <button
            onClick={() => setFilterType('overrides')}
            className={`py-1 px-3 rounded-md text-[11.5px] font-bold cursor-pointer border ${filterType === 'overrides' ? 'border-orange-600 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300' : 'border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40'}`}
          >
            ⚠️ Admin Overrides Only ({metrics.overrides})
          </button>
        </div>

        {/* Right: Employee Dropdown & Date Picker */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isPrivileged && allowEmployeeSwitch && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Employee:</span>
              <select
                value={selectedEmp}
                onChange={e => setSelectedEmp(e.target.value)}
                className="h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
              >
                <option value="all">All Employees</option>
                {employees.map(e => (
                  <option key={e._id} value={e._id}>
                    {e.name} {e._id === currentUser?._id ? "[It's You]" : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="h-8 px-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="border-0 bg-transparent text-red-600 dark:text-red-400 text-[11px] cursor-pointer font-semibold hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Audit Records Table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="crm-table">
            <thead>
              <tr>
                <th className="w-[130px]">Date & Time</th>
                <th className="w-[180px]">Employee</th>
                <th className="w-[180px]">Event Trigger</th>
                <th className="w-[100px]">Duration</th>
                <th className="w-[170px]">Initiated By</th>
                <th>Details & Admin Audit Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => {
                  const badge = getEventBadge(log.type);
                  const isOverride = log.isAdminOverride || log.type.startsWith('admin_');

                  return (
                    <tr
                      key={log._id || `${log.timestamp}_${Math.random()}`}
                      className={`transition-colors duration-150 ${isOverride ? 'bg-orange-50/30 dark:bg-orange-950/20' : 'bg-transparent'}`}
                    >
                      {/* Date & Time */}
                      <td>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {log.timeFormatted || new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                          {log.date}
                        </div>
                      </td>

                      {/* Employee */}
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-[26px] h-[26px] rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[11px] font-bold">
                            {log.employeeName ? log.employeeName.charAt(0) : 'E'}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {log.employeeName}
                            </div>
                            <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                              #{log.employeeCode || log.employeeId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Event Trigger Badge */}
                      <td>
                        <span
                          className={`inline-flex items-center gap-1.5 py-[3px] px-2 rounded-full text-[11px] font-bold border ${badge.badgeClass}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Duration */}
                      <td>
                        {log.durationText ? (
                          <span className="text-[11.5px] font-bold font-mono text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 py-0.5 px-1.5 rounded">
                            ⏱️ {log.durationText}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      {/* Initiated By / Actor */}
                      <td>
                        {isOverride ? (
                          <div className="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 py-0.5 px-1.5 rounded-md text-[11px] font-bold">
                            <ShieldAlert size={11} className="text-orange-600 dark:text-orange-400" />
                            <span>Admin #{log.adminId || 'ADM'} ({log.adminName || 'Admin'})</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[11.5px] text-slate-600 dark:text-slate-400">
                            <User size={12} className="text-slate-500 dark:text-slate-400" />
                            <span>{log.actorName || log.employeeName} (Self)</span>
                          </div>
                        )}
                      </td>

                      {/* Details & Admin Note */}
                      <td>
                        <div className="text-[11.5px] text-slate-700 dark:text-slate-300 leading-snug">
                          {log.details || log.action}
                        </div>
                        {log.auditNote && (
                          <div className="mt-1 py-1 px-2 bg-red-50 dark:bg-red-950/40 border-l-[3px] border-red-600 dark:border-red-500 rounded-r text-[11px] text-red-800 dark:text-red-300 font-semibold">
                            <strong>Reason for Override:</strong> "{log.auditNote}"
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Clock size={28} className="text-slate-400 dark:text-slate-500" />
                      <div className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        No Audit Log Records Found
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {dateFilter || filterType !== 'all'
                          ? 'Try clearing the search or filter settings.'
                          : 'Attendance and shift events will be automatically logged in real-time as users clock in, take breaks, and clock out.'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
