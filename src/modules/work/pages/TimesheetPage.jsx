/**
 * @file TimesheetPage.jsx
 * @description Main Timesheet and Time Tracking page with active timers, logs, filters, and manual logging modal.
 */

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Clock,
  Zap,
  Calendar,
  Layers,
  User,
  CheckCircle2,
  TrendingUp,
  Download
} from 'lucide-react';
import { useWork } from '../context/WorkContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { isHRorAdmin } from '../../../shared/utils/permissionUtils';
import { ActiveTimerCard } from '../components/timesheet/ActiveTimerCard';
import { TimesheetTable } from '../components/timesheet/TimesheetTable';
import { LogTimeModal } from '../components/timesheet/LogTimeModal';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';

export const TimesheetPage = () => {
  const {
    timesheets,
    timesheetFilter,
    setTimesheetFilter,
    projects,
    tasks,
    employees,
    activeRunningTask
  } = useWork();
  const { currentUser } = useAuth();
  const isPrivileged = React.useMemo(() => isHRorAdmin(currentUser), [currentUser]);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Strictly scoped timesheets for privacy (regular employees only see their own timesheets)
  const displayTimesheets = React.useMemo(() => {
    let list = timesheets || [];
    if (!isPrivileged && currentUser) {
      list = list.filter(ts =>
        ts.employeeId === currentUser._id ||
        ts.employee === currentUser._id ||
        ts.employeeId === currentUser.employeeCode ||
        ts.employee === currentUser.employeeCode ||
        (ts.employeeName && currentUser.name && ts.employeeName.toLowerCase() === currentUser.name.toLowerCase())
      );
    }
    return list;
  }, [timesheets, isPrivileged, currentUser]);

  // Statistics calculation strictly scoped to user view
  const totalSeconds = displayTimesheets.reduce((acc, curr) => acc + (curr.totalDurationSeconds || 0), 0);
  const totalHoursLogged = (totalSeconds / 3600).toFixed(1);
  const activeSessionsCount = displayTimesheets.filter(t => t.status === 'active').length + (activeRunningTask ? 1 : 0);
  const uniqueEmployees = new Set(displayTimesheets.map(t => t.employeeId || t.employeeName)).size;

  // Export CSV strictly from scoped timesheets
  const handleExportCSV = () => {
    if (!displayTimesheets.length) return;
    const headers = ['Task Code', 'Task Title', 'Project', 'Employee', 'Date', 'Start Time', 'End Time', 'Duration', 'Status', 'Memo'];
    const rows = displayTimesheets.map(ts => [
      ts.taskCode || '',
      `"${(ts.taskTitle || '').replace(/"/g, '""')}"`,
      `"${(ts.projectName || '').replace(/"/g, '""')}"`,
      `"${(ts.employeeName || '').replace(/"/g, '""')}"`,
      ts.date,
      ts.startTime || '',
      ts.endTime || '',
      ts.totalDurationText || '',
      ts.status || '',
      `"${(ts.memo || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EMS_Timesheets_${new Date().toISOString().split('T')[0]}.csv`);
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
            <Clock size={17} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.2' }}>
              Timesheet & Time Tracking
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Live timers, work duration logs, and task time tracking.
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
            title="Export timesheets to CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsLogModalOpen(true)}
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
            title="Manually log time"
          >
            <Plus size={13} />
            <span>Log Time</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Total Hours Logged</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', lineHeight: '1.1' }}>
              {totalHoursLogged} hrs
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Zap size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Active Live Timers</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a', lineHeight: '1.1' }}>
              {activeSessionsCount}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: '#f8fafc',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Layers size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Tracked Sessions</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', lineHeight: '1.1' }}>
              {timesheets.length}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: '#faf5ff',
            color: '#9333ea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <User size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Active Team Members</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#9333ea', lineHeight: '1.1' }}>
              {uniqueEmployees}
            </div>
          </div>
        </div>
      </div>

      {/* Active Running Task Banner */}
      <ActiveTimerCard onSelectTask={(task) => setSelectedTask(task)} />

      {/* Filters Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '7px 12px',
          minWidth: '240px',
          flex: 1
        }}>
          <Search size={15} color="#64748b" />
          <input
            type="text"
            placeholder="Search timesheet logs by task, project, employee..."
            value={timesheetFilter.search}
            onChange={e => setTimesheetFilter(prev => ({ ...prev, search: e.target.value }))}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              outline: 'none',
              fontSize: '13px',
              width: '100%',
              color: '#0f172a'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Employee Filter (Admin/HR Only for Privacy) */}
          {isPrivileged && (
            <select
              value={timesheetFilter.employeeId}
              onChange={e => setTimesheetFilter(prev => ({ ...prev, employeeId: e.target.value }))}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                color: '#334155',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="all">All Employees</option>
              {employees.map(e => (
                <option key={e._id} value={e._id}>{e.name}</option>
              ))}
            </select>
          )}

          {/* Project Filter */}
          <select
            value={timesheetFilter.projectId}
            onChange={e => setTimesheetFilter(prev => ({ ...prev, projectId: e.target.value }))}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              color: '#334155',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p._id} value={p._id}>[{p.projectCode}] {p.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={timesheetFilter.status}
            onChange={e => setTimesheetFilter(prev => ({ ...prev, status: e.target.value }))}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              color: '#334155',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active (Running)</option>
            <option value="stopped">Logged</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      {/* Timesheet Table */}
      <TimesheetTable timesheets={displayTimesheets} />

      {/* Log Time Modal */}
      <LogTimeModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
};
