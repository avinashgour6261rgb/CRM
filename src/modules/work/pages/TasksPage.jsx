/**
 * @file TasksPage.jsx
 * @description Main Tasks management page matching Screenshot 2 with filters, CSV export, Table/Kanban views, and modals.
 */

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  UserCheck,
  LayoutList,
  Kanban,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2
} from 'lucide-react';
import { useWork } from '../context/WorkContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { getUserModulePermissions, isHRorAdmin } from '../../../shared/utils/permissionUtils';
import { TasksTable } from '../components/tasks/TasksTable';
import { TasksKanban } from '../components/tasks/TasksKanban';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';

export const TasksPage = () => {
  const {
    tasks,
    taskFilter,
    setTaskFilter,
    currentUser: workUser,
    projects,
    employees,
    purgeAllTasks
  } = useWork();
  const { currentUser: authUser } = useAuth();
  const currentUser = authUser || workUser;

  const isPrivileged = React.useMemo(() => isHRorAdmin(currentUser), [currentUser]);
  const perms = React.useMemo(() => getUserModulePermissions(currentUser), [currentUser]);
  const canViewAllTasks = isPrivileged || perms?.viewAllTasks;

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [scopeMode, setScopeMode] = useState(!canViewAllTasks ? 'assigned_to_me' : 'all');
  const [statusMode, setStatusMode] = useState('all'); // 'all' | 'active' | 'completed'

  // Sync initial scope if not privileged and not permitted to view all tasks
  React.useEffect(() => {
    if (!canViewAllTasks && currentUser) {
      if (scopeMode === 'all') {
        setScopeMode('assigned_to_me');
        setTaskFilter(prev => ({
          ...prev,
          assignedTo: currentUser._id || '',
          assignedBy: 'all'
        }));
      }
    }
  }, [canViewAllTasks, currentUser, scopeMode, setTaskFilter]);

  // Handle Scope Switching
  const handleScopeChange = (mode) => {
    setScopeMode(mode);
    if (mode === 'personal') {
      setTaskFilter(prev => ({
        ...prev,
        assignedTo: currentUser?._id || '',
        assignedBy: 'all'
      }));
    } else if (mode === 'assigned_to_me') {
      setTaskFilter(prev => ({
        ...prev,
        assignedTo: currentUser?._id || '',
        assignedBy: 'all'
      }));
    } else if (mode === 'assigned_by_me') {
      setTaskFilter(prev => ({
        ...prev,
        assignedTo: 'all',
        assignedBy: currentUser?._id || currentUser?.name || 'Admin'
      }));
    } else {
      setTaskFilter(prev => ({
        ...prev,
        assignedTo: 'all',
        assignedBy: 'all'
      }));
    }
  };

  // Handle Quick Status Tab Switching
  const handleStatusModeChange = (mode) => {
    setStatusMode(mode);
    if (mode === 'active') {
      setTaskFilter(prev => ({ ...prev, hideCompleted: true, status: 'all' }));
    } else if (mode === 'completed') {
      setTaskFilter(prev => ({ ...prev, hideCompleted: false, status: 'completed' }));
    } else {
      setTaskFilter(prev => ({ ...prev, hideCompleted: false, status: 'all' }));
    }
  };

  // Match task assignment (single and multi-assignee)
  const isTaskAssignedToUser = React.useCallback((task, user) => {
    if (!task || !user) return false;
    const uId = String(user._id || user.id || '');
    const uCode = String(user.employeeCode || '');
    const uName = (user.name || '').toLowerCase().trim();

    if (task.assignedToId && (String(task.assignedToId) === uId || String(task.assignedToId) === uCode)) return true;
    if (task.assignedTo && (String(task.assignedTo) === uId || String(task.assignedTo) === uCode)) return true;
    if (task.assignedToName && task.assignedToName.toLowerCase().trim() === uName) return true;

    if (Array.isArray(task.assignedToIds) && (task.assignedToIds.includes(uId) || task.assignedToIds.includes(uCode))) return true;
    if (Array.isArray(task.assignees) && task.assignees.some(a => String(a._id) === uId || String(a.employeeCode) === uCode || (a.name && a.name.toLowerCase().trim() === uName))) return true;

    return false;
  }, []);

  // Filtered & strictly scoped tasks with personal task privacy isolation
  const displayTasks = React.useMemo(() => {
    let list = tasks || [];

    // Personal Task Privacy Filter:
    // Personal tasks are private to the creator/assignee.
    // If Admin selects that employee in the Member dropdown, it will be visible for that member.
    // In global/all-company view, hide other employees' personal tasks!
    list = list.filter(t => {
      if (!t.isPersonal) return true;
      const isMyTask = isTaskAssignedToUser(t, currentUser) ||
                       String(t.assignedById) === String(currentUser?._id) ||
                       String(t.assignedToId) === String(currentUser?._id);

      if (taskFilter.assignedTo && taskFilter.assignedTo !== 'all') {
        const targetEmp = employees?.find(e => e._id === taskFilter.assignedTo || e.employeeCode === taskFilter.assignedTo);
        if (targetEmp) return isTaskAssignedToUser(t, targetEmp);
        return t.assignedToId === taskFilter.assignedTo || t.assignedTo === taskFilter.assignedTo || (Array.isArray(t.assignedToIds) && t.assignedToIds.includes(taskFilter.assignedTo));
      }

      return isMyTask;
    });

    // 1. Role-based tenant isolation: Regular employees can strictly only view tasks assigned to or created by them
    if (!canViewAllTasks && currentUser) {
      if (scopeMode === 'personal') {
        list = list.filter(t => t.isPersonal && (isTaskAssignedToUser(t, currentUser) || t.assignedById === currentUser._id));
      } else {
        list = list.filter(t => isTaskAssignedToUser(t, currentUser) || t.assignedById === currentUser._id || t.assignedBy === currentUser.name);
      }
    } else {
      // Admin / HR scope filtering
      if (scopeMode === 'personal') {
        list = list.filter(t => t.isPersonal && (isTaskAssignedToUser(t, currentUser) || t.assignedById === currentUser?._id));
      } else if (scopeMode === 'assigned_to_me') {
        list = list.filter(t => isTaskAssignedToUser(t, currentUser));
      } else if (scopeMode === 'assigned_by_me') {
        list = list.filter(t => (t.assignedById === currentUser?._id || t.assignedBy === currentUser?.name) && !t.isPersonal);
      }
    }

    // 2. Member filter dropdown (e.g. filter by specific employee)
    if (taskFilter.assignedTo && taskFilter.assignedTo !== 'all') {
      list = list.filter(t => {
        const targetEmp = employees?.find(e => e._id === taskFilter.assignedTo || e.employeeCode === taskFilter.assignedTo);
        if (targetEmp) return isTaskAssignedToUser(t, targetEmp);
        return t.assignedToId === taskFilter.assignedTo || t.assignedTo === taskFilter.assignedTo || (Array.isArray(t.assignedToIds) && t.assignedToIds.includes(taskFilter.assignedTo));
      });
    }

    // 3. Status tab / filter
    if (statusMode === 'active') {
      list = list.filter(t => t.status !== 'completed');
    } else if (statusMode === 'completed') {
      list = list.filter(t => t.status === 'completed');
    } else if (taskFilter.status && taskFilter.status !== 'all') {
      list = list.filter(t => t.status === taskFilter.status);
    } else if (taskFilter.hideCompleted) {
      list = list.filter(t => t.status !== 'completed');
    }

    // 4. Search query
    if (taskFilter.search && taskFilter.search.trim()) {
      const q = taskFilter.search.toLowerCase().trim();
      list = list.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.taskCode && t.taskCode.toLowerCase().includes(q)) ||
        (t.projectName && t.projectName.toLowerCase().includes(q)) ||
        (t.assignedToName && t.assignedToName.toLowerCase().includes(q)) ||
        (Array.isArray(t.assignees) && t.assignees.some(a => a.name && a.name.toLowerCase().includes(q)))
      );
    }

    return [...list].sort((a, b) => {
      if (a.timerRunning && !b.timerRunning) return -1;
      if (!a.timerRunning && b.timerRunning) return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [tasks, canViewAllTasks, currentUser, scopeMode, taskFilter, statusMode, employees, isTaskAssignedToUser]);

  // Export CSV
  const handleExportCSV = () => {
    if (!displayTasks.length) return;
    const headers = ['Code', 'Title', 'Project', 'Category', 'Assignee', 'Assigned By', 'Start Date', 'Due Date', 'Status', 'Estimated Hours', 'Hours Logged'];
    const rows = displayTasks.map(t => [
      t.taskCode,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.projectName || '').replace(/"/g, '""')}"`,
      t.category,
      t.assignedToName,
      t.assignedBy || 'Admin',
      t.startDate,
      t.hasNoDueDate ? 'No Due Date' : t.dueDate,
      t.status,
      t.estimatedHours || 0,
      t.hoursLogged || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EMS_Tasks_${new Date().toISOString().split('T')[0]}.csv`);
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
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={17} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, lineHeight: '1.2' }}>
              Tasks & Work Delegation
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Manage team assignments, live task tracking, and work execution.
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
              padding: '6px 11px',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Export tasks to CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          {isPrivileged && tasks.length > 0 && (
            <button
              onClick={async () => {
                if (window.confirm('⚠️ Are you sure you want to purge all existing tasks? This will wipe legacy tasks so you can start completely clean with new tasks.')) {
                  await purgeAllTasks();
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                borderRadius: '6px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              title="Purge all old tasks to start clean"
            >
              <Trash2 size={13} />
              <span>Purge Old Tasks</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(2,132,199,0.2)'
            }}
            title="Create a new task"
          >
            <Plus size={13} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Top Filter Controls Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '8px 14px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          {/* Member Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Member</span>
            <select
              value={canViewAllTasks ? (taskFilter.assignedTo || 'all') : (currentUser?._id || 'me')}
              onChange={(e) => {
                if (canViewAllTasks) {
                  setTaskFilter(prev => ({ ...prev, assignedTo: e.target.value, assignedBy: 'all' }));
                  setScopeMode('all');
                }
              }}
              disabled={!canViewAllTasks}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                color: '#334155',
                outline: 'none',
                backgroundColor: !canViewAllTasks ? '#f1f5f9' : '#ffffff',
                cursor: !canViewAllTasks ? 'not-allowed' : 'pointer',
                height: '30px'
              }}
            >
              {canViewAllTasks ? (
                <>
                  <option value="all">All Members</option>
                  {employees?.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </>
              ) : (
                <option value={currentUser?._id || 'me'}>
                  {currentUser?.name || 'My Tasks'} (Assigned)
                </option>
              )}
            </select>
          </div>

          {/* Status Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Status</span>
            <select
              value={taskFilter.hideCompleted ? 'hide_completed' : taskFilter.status}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'hide_completed') {
                  setTaskFilter(prev => ({ ...prev, hideCompleted: true, status: 'all' }));
                } else {
                  setTaskFilter(prev => ({ ...prev, hideCompleted: false, status: val }));
                }
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                color: '#334155',
                outline: 'none',
                backgroundColor: '#ffffff',
                height: '30px'
              }}
            >
              <option value="hide_completed">Hide Completed Task</option>
              <option value="all">All Tasks</option>
              <option value="incomplete">Incomplete</option>
              <option value="in_progress">In Progress</option>
              <option value="under_review">Under Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '4px 10px',
            minWidth: '200px',
            flex: 1,
            height: '30px'
          }}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              placeholder="Search by task title, project, assignee or assigner..."
              value={taskFilter.search}
              onChange={e => setTaskFilter(prev => ({ ...prev, search: e.target.value }))}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                fontSize: '12px',
                width: '100%',
                color: '#0f172a'
              }}
            />
          </div>
        </div>
      </div>

      {/* Action Sub-Bar: + Add Task, All / Assigned to Me / Assigned by Me, Export, View Mode */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Add Task Button (Anyone can assign to anyone) */}
          <button
            id="btn-add-task"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.3)',
              transition: 'all 0.15s ease',
              height: '30px'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0369a1'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0284c7'}
          >
            <Plus size={14} />
            Assign New Task
          </button>

          {/* Scope Filter Pills (All / Assigned To Me / Assigned By Me) */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: '2px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            gap: '2px',
            height: '30px',
            alignItems: 'center'
          }}>
            {canViewAllTasks && (
              <button
                onClick={() => handleScopeChange('all')}
                style={{
                  padding: '4px 10px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '11.5px',
                  fontWeight: scopeMode === 'all' ? '700' : '500',
                  backgroundColor: scopeMode === 'all' ? '#ffffff' : 'transparent',
                  color: scopeMode === 'all' ? '#0f172a' : '#64748b',
                  boxShadow: scopeMode === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  height: '24px'
                }}
              >
                All Team Tasks
              </button>
            )}
            <button
              onClick={() => handleScopeChange('assigned_to_me')}
              style={{
                padding: '4px 10px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: scopeMode === 'assigned_to_me' ? '700' : '500',
                backgroundColor: scopeMode === 'assigned_to_me' ? '#ffffff' : 'transparent',
                color: scopeMode === 'assigned_to_me' ? '#2563eb' : '#64748b',
                boxShadow: scopeMode === 'assigned_to_me' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '24px'
              }}
            >
              Assigned to Me
            </button>
            <button
              onClick={() => handleScopeChange('assigned_by_me')}
              style={{
                padding: '4px 10px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: scopeMode === 'assigned_by_me' ? '700' : '500',
                backgroundColor: scopeMode === 'assigned_by_me' ? '#ffffff' : 'transparent',
                color: scopeMode === 'assigned_by_me' ? '#0284c7' : '#64748b',
                boxShadow: scopeMode === 'assigned_by_me' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '24px'
              }}
            >
              Assigned by Me
            </button>
            <button
              onClick={() => handleScopeChange('personal')}
              style={{
                padding: '4px 10px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: scopeMode === 'personal' ? '700' : '500',
                backgroundColor: scopeMode === 'personal' ? '#ffffff' : 'transparent',
                color: scopeMode === 'personal' ? '#7c3aed' : '#64748b',
                boxShadow: scopeMode === 'personal' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '24px'
              }}
            >
              🔒 My Personal Tasks
            </button>
          </div>

          {/* Status Filter Pills (All / Active & New / Recently Completed) */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: '2px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            gap: '2px',
            height: '30px',
            alignItems: 'center'
          }}>
            <button
              onClick={() => handleStatusModeChange('all')}
              style={{
                padding: '4px 9px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: statusMode === 'all' ? '700' : '500',
                backgroundColor: statusMode === 'all' ? '#ffffff' : 'transparent',
                color: statusMode === 'all' ? '#0f172a' : '#64748b',
                boxShadow: statusMode === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '24px'
              }}
            >
              All Status
            </button>
            <button
              onClick={() => handleStatusModeChange('active')}
              style={{
                padding: '4px 9px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: statusMode === 'active' ? '700' : '500',
                backgroundColor: statusMode === 'active' ? '#e0f2fe' : 'transparent',
                color: statusMode === 'active' ? '#0284c7' : '#64748b',
                boxShadow: statusMode === 'active' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '24px'
              }}
            >
              ⚡ Active & New
            </button>
            <button
              onClick={() => handleStatusModeChange('completed')}
              style={{
                padding: '4px 9px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: statusMode === 'completed' ? '700' : '500',
                backgroundColor: statusMode === 'completed' ? '#dcfce7' : 'transparent',
                color: statusMode === 'completed' ? '#16a34a' : '#64748b',
                boxShadow: statusMode === 'completed' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '24px'
              }}
            >
              ✅ Recently Completed
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: '#ffffff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              height: '30px'
            }}
          >
            <Download size={13} />
            Export
          </button>
        </div>

        {/* View Switchers: Table, Kanban */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          overflow: 'hidden',
          height: '30px'
        }}>
          <button
            title="Table View"
            onClick={() => setViewMode('table')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 10px',
              height: '100%',
              border: 'none',
              backgroundColor: viewMode === 'table' ? '#0284c7' : 'transparent',
              color: viewMode === 'table' ? '#ffffff' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <LayoutList size={14} />
          </button>

          <button
            title="Kanban Board"
            onClick={() => setViewMode('kanban')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 10px',
              height: '100%',
              border: 'none',
              backgroundColor: viewMode === 'kanban' ? '#0284c7' : 'transparent',
              color: viewMode === 'kanban' ? '#ffffff' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Kanban size={14} />
          </button>
        </div>
      </div>

      {/* Main View: Table or Kanban */}
      {viewMode === 'table' ? (
        <TasksTable tasks={displayTasks} onSelectTask={(task) => setSelectedTask(task)} />
      ) : (
        <TasksKanban tasks={displayTasks} onSelectTask={(task) => setSelectedTask(task)} />
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
};
