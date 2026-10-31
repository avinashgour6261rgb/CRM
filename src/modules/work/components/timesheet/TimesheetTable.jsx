/**
 * @file TimesheetTable.jsx
 * @description Table displaying active and historical timesheet tracking records.
 */

import React, { useState } from 'react';
import {
  Clock,
  Trash2,
  MoreVertical,
  Calendar,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { isHRorAdmin } from '../../../../shared/utils/permissionUtils';
import { confirmDialog } from '../../../../shared/context/ConfirmContext';

const STATUS_CONFIG = {
  active: { label: 'Active (Running)', className: 'text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-400', dot: 'bg-sky-500' },
  stopped: { label: 'Logged', className: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400', dot: 'bg-slate-400' },
  approved: { label: 'Approved', className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', className: 'text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-400', dot: 'bg-red-500' }
};

export const TimesheetTable = ({ timesheets: propTimesheets }) => {
  const { timesheets: contextTimesheets, deleteTimesheet } = useWork();
  const { currentUser } = useAuth();
  const isPrivileged = isHRorAdmin(currentUser);

  const rawTimesheets = propTimesheets !== undefined ? propTimesheets : contextTimesheets;
  const timesheets = React.useMemo(() => {
    let list = rawTimesheets || [];
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
  }, [rawTimesheets, isPrivileged, currentUser]);

  const [activeMenuId, setActiveMenuId] = useState(null);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setActiveMenuId(null);
    const ok = await confirmDialog({
      title: 'Delete Timesheet Entry',
      message: 'Are you sure you want to delete this timesheet entry? This log will be permanently removed.',
      confirmText: 'Delete Entry',
      variant: 'danger'
    });
    if (ok) {
      deleteTimesheet(id);
    }
  };

  if (!timesheets || timesheets.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-14 text-center">
        <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-4 text-blue-500 dark:text-blue-400">
          <Clock size={28} />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0 mb-1.5">
          No Timesheet Records Found
        </h3>
        <p className="text-[13.5px] text-slate-500 dark:text-slate-400 m-0">
          Run an active task timer or click "Log Time" to add hours worked.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <th className="px-2.5 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Task Name
              </th>
              <th className="px-2.5 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Project
              </th>
              <th className="px-2.5 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Assigned Employee
              </th>
              <th className="px-2.5 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Start Time
              </th>
              <th className="px-2.5 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                End Time
              </th>
              <th className="px-2.5 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Total Duration
              </th>
              <th className="px-2.5 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Date
              </th>
              <th className="px-2.5 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Status
              </th>
              <th className="px-2.5 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {timesheets.map((entry) => {
              const status = STATUS_CONFIG[entry.status] || STATUS_CONFIG.stopped;
              const isMenuOpen = activeMenuId === entry._id;

              return (
                <tr
                  key={entry._id}
                  className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Task Name & Code */}
                  <td className="px-2.5 py-[7px] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="px-[5px] py-[1px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded text-[10.5px] font-bold whitespace-nowrap">
                        {entry.taskCode || 'TSK'}
                      </span>
                      <div className="max-w-[180px] overflow-hidden text-ellipsis">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis">
                          {entry.taskTitle || 'Session'}
                        </div>
                        {entry.memo && (
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">
                            {entry.memo}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Project */}
                  <td className="px-2.5 py-[7px] whitespace-nowrap">
                    <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {entry.projectName || 'General Work'}
                    </div>
                  </td>

                  {/* Employee */}
                  <td className="px-2.5 py-[7px] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={entry.employeeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={entry.employeeName}
                        className="w-[22px] h-[22px] rounded-full object-cover"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                          {entry.employeeName || 'Team Member'}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {entry.employeeRole || 'Strategic'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Start Time */}
                  <td className="px-2.5 py-[7px] text-[11.5px] text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap">
                    {entry.startTime || '09:30:00'}
                  </td>

                  {/* End Time */}
                  <td className="px-2.5 py-[7px] text-[11.5px] text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap">
                    {entry.endTime || (entry.status === 'active' ? '— (Running)' : '18:00:00')}
                  </td>

                  {/* Total Duration */}
                  <td className="px-2.5 py-[7px] whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                      entry.status === 'active'
                        ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}>
                      ⏱️ {entry.totalDurationText || '00:00:00'}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-2.5 py-[7px] text-[11.5px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {entry.date}
                  </td>

                  {/* Status */}
                  <td className="px-2.5 py-[7px] whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold ${status.className}`}>
                      <span className={`w-[5px] h-[5px] rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-2.5 py-[7px] text-right relative whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : entry._id);
                      }}
                      className="bg-transparent border-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1.5 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {isMenuOpen && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute right-[18px] top-10 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1.5 z-50 min-w-[140px] text-left"
                      >
                        <div
                          onClick={(e) => handleDelete(entry._id, e)}
                          className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-red-600 dark:text-red-400 cursor-pointer rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 size={14} /> Delete Entry
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
