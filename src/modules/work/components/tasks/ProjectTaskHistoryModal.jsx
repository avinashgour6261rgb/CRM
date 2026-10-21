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
        return { label: 'Created & Assigned', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'reassigned':
        return { label: 'Reassigned 👥', bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' };
      case 'rescheduled':
        return { label: 'Rescheduled / Future 📅', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
      case 'status_changed':
        return { label: 'Status Changed 🔄', bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' };
      case 'snoozed':
        return { label: 'Snoozed ⏰', bg: '#fdf4ff', color: '#a21caf', border: '#f5d0fe' };
      case 'resumed':
        return { label: 'Resumed ▶️', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
      case 'completed':
        return { label: 'Completed ✅', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
      default:
        return { label: 'Activity', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(37,99,235,0.1)'
            }}>
              <History size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Project Task Assignment & Activity History
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Full chronological audit trail of task assignments, future reschedules & completions.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '7px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: '600',
                color: '#334155',
                cursor: 'pointer'
              }}
              title="Download audit records as CSV"
            >
              <Download size={13} /> Export CSV
            </button>

            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '6px 12px',
            flex: '1 1 200px'
          }}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              placeholder="Search by task code, title, employee..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                fontSize: '12.5px',
                width: '100%',
                color: '#0f172a'
              }}
            />
            {searchQuery && (
              <X size={13} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
            )}
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              color: '#334155',
              backgroundColor: '#ffffff',
              outline: 'none',
              cursor: 'pointer'
            }}
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
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              color: '#334155',
              backgroundColor: '#ffffff',
              outline: 'none',
              cursor: 'pointer'
            }}
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
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                color: '#334155',
                backgroundColor: '#ffffff',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Employees</option>
              {(employees || []).map(e => (
                <option key={e._id} value={e.name}>{e.name} ({e.role})</option>
              ))}
            </select>
          )}
        </div>

        {/* History Timeline Content */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {filteredRecords.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#64748b'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: '#94a3b8'
              }}>
                <History size={24} />
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                No History Records Found
              </h4>
              <p style={{ fontSize: '13px', margin: 0 }}>
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
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                  }}
                >
                  {/* Top Bar: Action Badge + Timestamp + Task Code */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        {badge.label}
                      </span>

                      <span style={{
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: '#2563eb',
                        backgroundColor: '#eff6ff',
                        padding: '1px 7px',
                        borderRadius: '4px',
                        border: '1px solid #bfdbfe'
                      }}>
                        #{item.taskCode}
                      </span>

                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        📁 {item.projectName}
                      </span>

                      {item.isPersonal && (
                        <span style={{ fontSize: '10px', color: '#7e22ce', backgroundColor: '#faf5ff', padding: '1px 5px', borderRadius: '4px', border: '1px solid #e9d5ff', fontWeight: '700' }}>
                          🔒 Personal
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Task Title */}
                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                    {item.taskTitle}
                  </div>

                  {/* Details / Action Description */}
                  <div style={{
                    fontSize: '12.5px',
                    color: '#334155',
                    backgroundColor: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '7px',
                    border: '1px solid #f1f5f9',
                    lineHeight: '1.4'
                  }}>
                    {item.details || item.title}
                  </div>

                  {/* Footer Meta: Actor & Target */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    <div>
                      Action Performed by: <strong style={{ color: '#0f172a' }}>{item.performedBy || 'System / Admin'}</strong>
                    </div>

                    {item.to && item.from && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{item.from}</span>
                        <ArrowRight size={11} />
                        <strong style={{ color: '#0f172a' }}>{item.to}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #f1f5f9',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Showing <strong>{filteredRecords.length}</strong> of <strong>{allHistoryRecords.length}</strong> recorded audit events
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '7px 18px',
              borderRadius: '7px',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
