/**
 * @file ProjectTaskHistoryModal.jsx
 * @description Comprehensive Audit Trail & Project History Modal.
 * Tracks who was assigned what task, reassignments, past days leftover reschedules,
 * future date assignments, status transitions, and final completions.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Filter,
  History,
  Calendar,
  User,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  FolderGit2,
  Tag,
  Sparkles,
  Layers,
  FileCheck2,
  CalendarClock,
  RefreshCw
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { isHRorAdmin } from '../../../../shared/utils/permissionUtils';

export const ProjectTaskHistoryModal = ({ isOpen, onClose }) => {
  const { tasks, projects, employees } = useWork();
  const { currentUser } = useAuth();
  const isPrivileged = isHRorAdmin(currentUser);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all'); // 'all' | 'assignments' | 'rescheduled' | 'status' | 'completed'
  const [projectFilter, setProjectFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  // Synthesize and aggregate all history entries across tasks
  const allHistoryRecords = useMemo(() => {
    let list = [];

    (tasks || []).forEach(task => {
      // Role scope: Non-privileged users only see history of tasks assigned to or created by them
      if (!isPrivileged && currentUser) {
        const myIds = [currentUser._id, currentUser.employeeCode, currentUser.name]
          .filter(Boolean)
          .map(s => String(s).toLowerCase());
        const isMine =
          (task.assignedToId && myIds.includes(String(task.assignedToId).toLowerCase())) ||
          (task.assignedTo && myIds.includes(String(task.assignedTo).toLowerCase())) ||
          (task.assignedToName && myIds.includes(String(task.assignedToName).toLowerCase())) ||
          (task.assignedById && myIds.includes(String(task.assignedById).toLowerCase())) ||
          (task.assignedBy && myIds.includes(String(task.assignedBy).toLowerCase())) ||
          (Array.isArray(task.assignedToIds) && task.assignedToIds.some(id => myIds.includes(String(id).toLowerCase()))) ||
          (Array.isArray(task.assignees) && task.assignees.some(a => myIds.includes(String(a._id || a.employeeCode || a.name).toLowerCase())));
        if (!isMine) return;
      }

      // If task has explicit history array
      if (Array.isArray(task.history) && task.history.length > 0) {
        task.history.forEach(h => {
          list.push({
            ...h,
            taskId: task._id,
            taskCode: task.taskCode || 'TSK',
            taskTitle: task.title,
            projectName: task.projectName || 'General Work',
            projectCode: task.projectCode || 'PRJ',
            currentStatus: task.status,
            dueDate: task.dueDate,
            isPersonal: !!task.isPersonal
          });
        });
      } else {
        // Synthesize baseline creation entry
        if (task.createdAt) {
          list.push({
            id: `hist_init_${task._id}`,
            timestamp: task.createdAt,
            action: 'created',
            title: 'Task Created & Assigned',
            performedBy: task.assignedBy || 'Administrator',
            performedById: task.assignedById,
            assignedTo: task.assignedToName || 'Team Members',
            details: `Task created and assigned to ${task.assignedToName || 'team'} by ${task.assignedBy || 'Administrator'}. (Due: ${task.hasNoDueDate ? 'No Due Date' : (task.dueDate || 'Open')})`,
            taskId: task._id,
            taskCode: task.taskCode || 'TSK',
            taskTitle: task.title,
            projectName: task.projectName || 'General Work',
            projectCode: task.projectCode || 'PRJ',
            currentStatus: task.status,
            dueDate: task.dueDate,
            isPersonal: !!task.isPersonal
          });
        }
        // Synthesize completion entry if completed
        if (task.completedAt || task.completedOn) {
          list.push({
            id: `hist_comp_${task._id}`,
            timestamp: task.completedAt || `${task.completedOn}T18:00:00.000Z`,
            action: 'completed',
            title: 'Task Completed & Final Duration Logged',
            performedBy: task.assignedToName || 'User',
            details: `Task marked complete. Logged duration: ${task.hoursLoggedText || `${task.hoursLogged || 0}h`}`,
            taskId: task._id,
            taskCode: task.taskCode || 'TSK',
            taskTitle: task.title,
            projectName: task.projectName || 'General Work',
            projectCode: task.projectCode || 'PRJ',
            currentStatus: 'completed',
            dueDate: task.dueDate,
            isPersonal: !!task.isPersonal
          });
        }
      }
    });

    // Sort descending (newest activity at the top)
    return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [tasks, isPrivileged, currentUser]);

  // Statistics KPI computation
  const stats = useMemo(() => {
    let assignments = 0;
    let rescheduled = 0;
    let completed = 0;
    allHistoryRecords.forEach(r => {
      if (r.action === 'created' || r.action === 'reassigned') assignments++;
      if (r.action === 'rescheduled') rescheduled++;
      if (r.action === 'completed') completed++;
    });
    return {
      total: allHistoryRecords.length,
      assignments,
      rescheduled,
      completed
    };
  }, [allHistoryRecords]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return allHistoryRecords.filter(item => {
      // 1. Action type filter
      if (actionFilter !== 'all') {
        if (actionFilter === 'assignments' && (item.action !== 'created' && item.action !== 'reassigned')) return false;
        if (actionFilter === 'rescheduled' && item.action !== 'rescheduled') return false;
        if (actionFilter === 'status' && item.action !== 'status_changed') return false;
        if (actionFilter === 'completed' && item.action !== 'completed') return false;
      }

      // 2. Project filter
      if (projectFilter !== 'all') {
        if (item.projectName !== projectFilter && item.projectCode !== projectFilter) return false;
      }

      // 3. Employee filter
      if (employeeFilter !== 'all') {
        const matchesEmp =
          item.assignedTo === employeeFilter ||
          item.performedBy === employeeFilter ||
          item.to === employeeFilter ||
          item.from === employeeFilter ||
          (item.details && item.details.toLowerCase().includes(employeeFilter.toLowerCase()));
        if (!matchesEmp) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const str = `${item.taskCode} ${item.taskTitle} ${item.projectName} ${item.performedBy} ${item.assignedTo} ${item.to} ${item.from} ${item.details}`.toLowerCase();
        if (!str.includes(q)) return false;
      }

      return true;
    });
  }, [allHistoryRecords, actionFilter, projectFilter, employeeFilter, searchQuery]);

  if (!isOpen) return null;

  // Export Audit CSV
  const handleExportCSV = () => {
    if (!filteredRecords.length) return;
    const headers = ['Timestamp', 'Task Code', 'Task Title', 'Project', 'Action', 'Performed By', 'Details'];
    const rows = filteredRecords.map(r => [
      r.timestamp ? new Date(r.timestamp).toLocaleString() : '',
      r.taskCode || '',
      `"${(r.taskTitle || '').replace(/"/g, '""')}"`,
      `"${(r.projectName || '').replace(/"/g, '""')}"`,
      r.action || '',
      `"${(r.performedBy || '').replace(/"/g, '""')}"`,
      `"${(r.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EMS_Project_Task_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'created':
        return { label: 'Created & Assigned', badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'reassigned':
        return { label: 'Reassigned 👥', badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
      case 'rescheduled':
        return { label: 'Rescheduled / Future 📅', badgeClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800' };
      case 'status_changed':
        return { label: 'Status Changed 🔄', badgeClass: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' };
      case 'snoozed':
        return { label: 'Snoozed ⏰', badgeClass: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800' };
      case 'resumed':
        return { label: 'Resumed ▶️', badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800' };
      case 'completed':
        return { label: 'Completed ✅', badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      default:
        return { label: 'Activity', badgeClass: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-[1100] p-4 sm:p-5 select-none animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[960px] max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* ── Modal Header ── */}
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900/50 shadow-xs">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 m-0">
                Project Task Assignment & Activity History
              </h2>
              <p className="mt-0.5 mb-0 text-xs text-slate-500 dark:text-slate-400">
                Full chronological audit trail of task delegations, future reschedules & completions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-xs"
              title="Download audit records as CSV"
            >
              <Download size={13} /> Export CSV
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Quick KPI Stat Pills ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 px-6 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 p-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              <Layers size={14} />
            </div>
            <div>
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Total Events</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{stats.total}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 p-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
              <Users size={14} />
            </div>
            <div>
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Assignments</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{stats.assignments}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 p-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xs">
              <CalendarClock size={14} />
            </div>
            <div>
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Rescheduled</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{stats.rescheduled}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 p-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              <CheckCircle2 size={14} />
            </div>
            <div>
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Completed</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{stats.completed}</div>
            </div>
          </div>
        </div>

        {/* ── Filter Controls Bar ── */}
        <div className="p-3 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 flex-1 min-w-[200px]">
            <Search size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Search by task code, title, employee..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent outline-none text-[12.5px] w-full text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
            {searchQuery && (
              <X size={13} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer" onClick={() => setSearchQuery('')} />
            )}
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none cursor-pointer font-medium"
          >
            <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">All Actions ({allHistoryRecords.length})</option>
            <option value="assignments" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Assignments & Delegations</option>
            <option value="rescheduled" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Rescheduled / Future Date</option>
            <option value="status" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Status Transitions</option>
            <option value="completed" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Completed Tasks</option>
          </select>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none cursor-pointer font-medium"
          >
            <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">All Projects</option>
            {(projects || []).map(p => (
              <option key={p._id} value={p.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                [{p.projectCode}] {p.name}
              </option>
            ))}
          </select>

          {/* Employee Filter (Admin/HR) */}
          {isPrivileged && (
            <select
              value={employeeFilter}
              onChange={e => setEmployeeFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none cursor-pointer font-medium"
            >
              <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">All Employees</option>
              {(employees || []).map(e => (
                <option key={e._id} value={e.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  {e.name} ({e.role || 'Member'})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── History Timeline Content ── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-950">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16 px-5 text-slate-500 dark:text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <History size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 mt-0">
                No History Records Found
              </h4>
              <p className="text-xs m-0 text-slate-500 dark:text-slate-400">
                Try adjusting your search query or filter options.
              </p>
            </div>
          ) : (
            filteredRecords.map((item, idx) => {
              const badge = getActionBadge(item.action);
              const formattedDate = item.timestamp
                ? new Date(item.timestamp).toLocaleString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })
                : 'Recent';

              return (
                <div
                  key={item.id || idx}
                  className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 px-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm flex flex-col gap-2 transition-all"
                >
                  {/* Top Bar: Action Badge + Timestamp + Task Code */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.badgeClass}`}>
                        {badge.label}
                      </span>

                      <span className="text-[11.5px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                        #{item.taskCode}
                      </span>

                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        📁 {item.projectName}
                      </span>

                      {item.isPersonal && (
                        <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800 font-bold">
                          🔒 Personal
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                      <Clock size={12} />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Task Title */}
                  <div className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100">
                    {item.taskTitle}
                  </div>

                  {/* Details / Action Description */}
                  <div className="text-[12.5px] text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/70 p-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700/60 leading-relaxed">
                    {item.details || item.title}
                  </div>

                  {/* Footer Meta: Actor & Target */}
                  <div className="flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <div>
                      Action Performed by: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{item.performedBy || 'System / Admin'}</strong>
                    </div>

                    {item.to && item.from && (
                      <div className="flex items-center gap-1">
                        <span>{item.from}</span>
                        <ArrowRight size={11} />
                        <strong className="text-slate-900 dark:text-slate-100 font-semibold">{item.to}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="p-3.5 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-900 dark:text-slate-100">{filteredRecords.length}</strong> of <strong className="text-slate-900 dark:text-slate-100">{allHistoryRecords.length}</strong> recorded audit events
          </div>
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white border-0 py-1.5 px-5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
