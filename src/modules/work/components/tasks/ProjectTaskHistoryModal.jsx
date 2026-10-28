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
  Layers
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { isHRorAdmin } from '../../../../shared/utils/permissionUtils';

export const ProjectTaskHistoryModal = ({ isOpen, onClose }) => {
  const { tasks, projects, employees } = useWork();
  const { currentUser } = useAuth();
  const isPrivileged = isHRorAdmin(currentUser);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all'); // 'all' | 'created' | 'reassigned' | 'rescheduled' | 'status_changed' | 'completed'
  const [projectFilter, setProjectFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  // Synthesize and aggregate all history entries across tasks
  const allHistoryRecords = useMemo(() => {
    let list = [];
    const todayStr = new Date().toISOString().split('T')[0];

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
        // Synthesize completion entry
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
        return { label: 'Status Changed 🔄', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' };
      case 'snoozed':
        return { label: 'Snoozed ⏰', badgeClass: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800' };
      case 'resumed':
        return { label: 'Resumed ▶️', badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800' };
      case 'completed':
        return { label: 'Completed ✅', badgeClass: 'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300 border-green-200 dark:border-green-800' };
      default:
        return { label: 'Activity', badgeClass: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-[5px] flex items-center justify-center z-[1100] p-4 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[920px] max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white m-0">
                Project Task Assignment & Activity History
              </h2>
              <p className="mt-0.5 mb-0 text-xs text-slate-500 dark:text-slate-400">
                Full chronological audit trail of task assignments, future reschedules & completions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
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

        {/* Filter Controls Bar */}
        <div className="p-3 sm:px-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 flex-1 min-w-[200px]">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search by task code, title, employee..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="border-none bg-transparent outline-none text-[12.5px] w-full text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <X size={13} className="text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setSearchQuery('')} />
            )}
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 outline-none cursor-pointer"
          >
            <option value="all">All Actions ({allHistoryRecords.length})</option>
            <option value="assignments">Assignments & Delegations</option>
            <option value="rescheduled">Rescheduled for Future Date</option>
            <option value="status">Status Transitions</option>
            <option value="completed">Completed Tasks</option>
          </select>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 outline-none cursor-pointer"
          >
            <option value="all">All Projects</option>
            {(projects || []).map(p => (
              <option key={p._id} value={p.name}>[{p.projectCode}] {p.name}</option>
            ))}
          </select>

          {/* Employee Filter (Admin/HR) */}
          {isPrivileged && (
            <select
              value={employeeFilter}
              onChange={e => setEmployeeFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 outline-none cursor-pointer"
            >
              <option value="all">All Employees</option>
              {(employees || []).map(e => (
                <option key={e._id} value={e.name}>{e.name} ({e.role})</option>
              ))}
            </select>
          )}
        </div>

        {/* History Timeline Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-3">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16 px-5 text-slate-500 dark:text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <History size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1 mt-0">
                No History Records Found
              </h4>
              <p className="text-xs m-0">
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
                  className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl p-3.5 px-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm flex flex-col gap-2 transition-all"
                >
                  {/* Top Bar: Action Badge + Timestamp + Task Code */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.badgeClass}`}>
                        {badge.label}
                      </span>

                      <span className="text-[11.5px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-[1px] rounded border border-blue-200 dark:border-blue-800">
                        #{item.taskCode}
                      </span>

                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        📁 {item.projectName}
                      </span>

                      {item.isPersonal && (
                        <span className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-[1px] rounded border border-purple-200 dark:border-purple-800 font-bold">
                          🔒 Personal
                        </span>
                      )}
                    </div>

                    <div className="text-[11.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Task Title */}
                  <div className="text-[13.5px] font-bold text-slate-900 dark:text-white">
                    {item.taskTitle}
                  </div>

                  {/* Details / Action Description */}
                  <div className="text-[12.5px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 px-3 rounded-lg border border-slate-100 dark:border-slate-700/60 leading-relaxed">
                    {item.details || item.title}
                  </div>

                  {/* Footer Meta: Actor & Target */}
                  <div className="flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <div>
                      Action Performed by: <strong className="text-slate-900 dark:text-white font-semibold">{item.performedBy || 'System / Admin'}</strong>
                    </div>

                    {item.to && item.from && (
                      <div className="flex items-center gap-1">
                        <span>{item.from}</span>
                        <ArrowRight size={11} />
                        <strong className="text-slate-900 dark:text-white font-semibold">{item.to}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-900 dark:text-white">{filteredRecords.length}</strong> of <strong className="text-slate-900 dark:text-white">{allHistoryRecords.length}</strong> recorded audit events
          </div>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white border-none py-1.5 px-[18px] rounded-lg text-[12.5px] font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
