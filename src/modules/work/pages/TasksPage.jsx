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
  Sparkles
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
    employees
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
    if (mode === 'assigned_to_me') {
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

  // Export CSV
  const handleExportCSV = () => {
    if (!tasks.length) return;
    const headers = ['Code', 'Title', 'Project', 'Category', 'Assignee', 'Assigned By', 'Start Date', 'Due Date', 'Status', 'Estimated Hours', 'Hours Logged'];
    const rows = tasks.map(t => [
      t.taskCode,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.projectName.replace(/"/g, '""')}"`,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Breadcrumb & Title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b', marginBottom: '1px' }}>
            <span>Home</span>
            <span>•</span>
            <span style={{ color: '#0f172a', fontWeight: '600' }}>Tasks</span>
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Tasks & Delegation
          </h1>
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
        <TasksTable onSelectTask={(task) => setSelectedTask(task)} />
      ) : (
        <TasksKanban onSelectTask={(task) => setSelectedTask(task)} />
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
