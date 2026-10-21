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
          icon: <LogIn size={13} color="#16a34a" />,
          label: 'Clock In',
          color: '#16a34a',
          bg: '#dcfce7',
          border: '#bbf7d0'
        };
      case 'clock_out':
        return {
          icon: <LogOut size={13} color="#dc2626" />,
          label: 'Clock Out',
          color: '#dc2626',
          bg: '#fee2e2',
          border: '#fca5a5'
        };
      case 'tea_break_start':
        return {
          icon: <Coffee size={13} color="#d97706" />,
          label: 'Tea Break Started',
          color: '#d97706',
          bg: '#fef3c7',
          border: '#fde68a'
        };
      case 'tea_break_end':
        return {
          icon: <Coffee size={13} color="#b45309" />,
          label: 'Tea Break Resumed',
          color: '#b45309',
          bg: '#fef3c7',
          border: '#fde68a'
        };
      case 'lunch_break_start':
        return {
          icon: <Utensils size={13} color="#0284c7" />,
          label: 'Lunch Break Started',
          color: '#0284c7',
          bg: '#e0f2fe',
          border: '#bae6fd'
        };
      case 'lunch_break_end':
        return {
          icon: <Utensils size={13} color="#0369a1" />,
          label: 'Lunch Break Resumed',
          color: '#0369a1',
          bg: '#e0f2fe',
          border: '#bae6fd'
        };
      case 'admin_force_clock_out':
        return {
          icon: <ShieldAlert size={13} color="#991b1b" />,
          label: 'Admin Force Clock-Out',
          color: '#991b1b',
          bg: '#fee2e2',
          border: '#f87171'
        };
      case 'admin_shift_adjustment':
        return {
          icon: <AlertTriangle size={13} color="#92400e" />,
          label: 'Admin Shift Adjustment',
          color: '#92400e',
          bg: '#fef3c7',
          border: '#fcd34d'
        };
      case 'reclock_approved':
        return {
          icon: <CheckCircle2 size={13} color="#16a34a" />,
          label: 'Re-Clock Approved',
          color: '#16a34a',
          bg: '#dcfce7',
          border: '#86efac'
        };
      case 'reclock_rejected':
        return {
          icon: <RotateCcw size={13} color="#dc2626" />,
          label: 'Re-Clock Rejected',
          color: '#dc2626',
          bg: '#fee2e2',
          border: '#fca5a5'
        };
      default:
        return {
          icon: <Clock size={13} color="#64748b" />,
          label: 'Break Activity',
          color: '#64748b',
          bg: '#f1f5f9',
          border: '#e2e8f0'
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '12px 16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
            Total Audit Records
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {metrics.total}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Full timestamped punch history
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '12px 16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600', textTransform: 'uppercase' }}>
            Clock In & Out Punches
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
            {metrics.clockPunches}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Standard daily attendance
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '12px 16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '600', textTransform: 'uppercase' }}>
            Tea & Lunch Breaks
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>
            {metrics.breaks}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Break triggers & durations
          </div>
        </div>

        <div style={{
          borderRadius: '10px',
          padding: '12px 16px',
          border: '1px solid #fed7aa',
          backgroundColor: '#fffaf5',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '11px', color: '#c2410c', fontWeight: '700', textTransform: 'uppercase' }}>
            ⚠️ Admin Overrides
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#ea580c', marginTop: '4px' }}>
            {metrics.overrides}
          </div>
          <div style={{ fontSize: '11px', color: '#9a3412', marginTop: '2px' }}>
            Manual adjustments & forced stops
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Filter Type:</span>
          
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: '600',
              border: filterType === 'all' ? '1px solid #2563eb' : '1px solid #cbd5e1',
              backgroundColor: filterType === 'all' ? '#eff6ff' : '#ffffff',
              color: filterType === 'all' ? '#1d4ed8' : '#475569',
              cursor: 'pointer'
            }}
          >
            All Logs ({metrics.total})
          </button>

          <button
            onClick={() => setFilterType('clock')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: '600',
              border: filterType === 'clock' ? '1px solid #16a34a' : '1px solid #cbd5e1',
              backgroundColor: filterType === 'clock' ? '#f0fdf4' : '#ffffff',
              color: filterType === 'clock' ? '#15803d' : '#475569',
              cursor: 'pointer'
            }}
          >
            Clock In / Out
          </button>

          <button
            onClick={() => setFilterType('breaks')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: '600',
              border: filterType === 'breaks' ? '1px solid #d97706' : '1px solid #cbd5e1',
              backgroundColor: filterType === 'breaks' ? '#fefce8' : '#ffffff',
              color: filterType === 'breaks' ? '#b45309' : '#475569',
              cursor: 'pointer'
            }}
          >
            Tea & Lunch Breaks
          </button>

          <button
            onClick={() => setFilterType('overrides')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: '700',
              border: filterType === 'overrides' ? '1px solid #ea580c' : '1px solid #fed7aa',
              backgroundColor: filterType === 'overrides' ? '#fff7ed' : '#ffffff',
              color: filterType === 'overrides' ? '#c2410c' : '#ea580c',
              cursor: 'pointer'
            }}
          >
            ⚠️ Admin Overrides Only ({metrics.overrides})
          </button>
        </div>

        {/* Right: Employee Dropdown & Date Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {isPrivileged && allowEmployeeSwitch && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <span style={{ fontWeight: '600', color: '#64748b' }}>Employee:</span>
              <select
                value={selectedEmp}
                onChange={e => setSelectedEmp(e.target.value)}
                style={{
                  height: '32px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#0f172a'
                }}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ fontWeight: '600', color: '#64748b' }}>Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '12px'
              }}
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#dc2626',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
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
                <th style={{ width: '130px' }}>Date & Time</th>
                <th style={{ width: '180px' }}>Employee</th>
                <th style={{ width: '180px' }}>Event Trigger</th>
                <th style={{ width: '100px' }}>Duration</th>
                <th style={{ width: '170px' }}>Initiated By</th>
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
                      style={{
                        backgroundColor: isOverride ? '#fffbf7' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Date & Time */}
                      <td>
                        <div style={{ fontWeight: '700', fontSize: '12px', color: '#0f172a' }}>
                          {log.timeFormatted || new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                          {log.date}
                        </div>
                      </td>

                      {/* Employee */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            {log.employeeName ? log.employeeName.charAt(0) : 'E'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '12px', color: '#0f172a' }}>
                              {log.employeeName}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                              #{log.employeeCode || log.employeeId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Event Trigger Badge */}
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`
                        }}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Duration */}
                      <td>
                        {log.durationText ? (
                          <span style={{
                            fontSize: '11.5px',
                            fontWeight: '700',
                            fontFamily: 'monospace',
                            color: '#0f172a',
                            backgroundColor: '#f1f5f9',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            ⏱️ {log.durationText}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Initiated By / Actor */}
                      <td>
                        {isOverride ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#fff7ed',
                            color: '#c2410c',
                            border: '1px solid #fed7aa',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            <ShieldAlert size={11} color="#ea580c" />
                            <span>Admin #{log.adminId || 'ADM'} ({log.adminName || 'Admin'})</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#475569' }}>
                            <User size={12} color="#64748b" />
                            <span>{log.actorName || log.employeeName} (Self)</span>
                          </div>
                        )}
                      </td>

                      {/* Details & Admin Note */}
                      <td>
                        <div style={{ fontSize: '11.5px', color: '#334155', lineHeight: '1.4' }}>
                          {log.details || log.action}
                        </div>
                        {log.auditNote && (
                          <div style={{
                            marginTop: '4px',
                            padding: '4px 8px',
                            backgroundColor: '#fef2f2',
                            borderLeft: '3px solid #dc2626',
                            borderRadius: '2px 4px 4px 2px',
                            fontSize: '11px',
                            color: '#991b1b',
                            fontWeight: '600'
                          }}>
                            <strong>Reason for Override:</strong> "{log.auditNote}"
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Clock size={28} color="#94a3b8" />
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#334155' }}>
                        No Audit Log Records Found
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
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
