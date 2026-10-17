/**
 * @file PendingTasksModal.jsx
 * @description Modal displaying all pending, in-progress, and overdue tasks with instant interactive actions.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  Calendar,
  AlertCircle,
  Play,
  Pause,
  CheckCircle2,
  ListTodo,
  Search,
  Filter,
  ArrowUpRight,
  ExternalLink,
  Tag,
  User,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PendingTasksModal = ({
  isOpen,
  onClose,
  tasks = [],
  user = null,
  initialFilter = 'all',
  onSelectTask,
  onStartTimer,
  onPauseTimer,
  onCompleteTask,
  activeTaskId = null
}) => {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState(initialFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Sync filter tab whenever initialFilter or isOpen changes
  React.useEffect(() => {
    if (isOpen && initialFilter) {
      setFilterTab(initialFilter);
    }
  }, [isOpen, initialFilter]);

  // Filter tasks based on status and tab
  const filteredTasks = useMemo(() => {
    return (tasks || []).filter(task => {
      // Must not be completed
      const isCompleted = task.status === 'completed' || task.progress === 100;
      if (isCompleted) return false;

      // Tab filter
      if (filterTab === 'overdue') {
        if (!task.dueDate || task.hasNoDueDate || task.dueDate >= todayStr) return false;
      } else if (filterTab === 'in_progress') {
        if (task.status !== 'in_progress' && !task.timerRunning) return false;
      } else if (filterTab === 'due_today') {
        if (task.dueDate !== todayStr) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (task.taskCode || '').toLowerCase().includes(q);
        const matchTitle = (task.title || '').toLowerCase().includes(q);
        const matchProject = (task.projectName || '').toLowerCase().includes(q);
        const matchAssignee = (task.assignedToName || '').toLowerCase().includes(q);
        if (!matchCode && !matchTitle && !matchProject && !matchAssignee) return false;
      }

      return true;
    });
  }, [tasks, filterTab, searchQuery, todayStr]);

  const overdueCount = useMemo(() => (tasks || []).filter(t => t.status !== 'completed' && t.dueDate && t.dueDate < todayStr).length, [tasks, todayStr]);
  const inProgressCount = useMemo(() => (tasks || []).filter(t => t.status !== 'completed' && (t.status === 'in_progress' || t.timerRunning)).length, [tasks]);
  const dueTodayCount = useMemo(() => (tasks || []).filter(t => t.status !== 'completed' && t.dueDate === todayStr).length, [tasks, todayStr]);

  const formatSecs = (totalSecs) => {
    const s = Number(totalSecs) || 0;
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5', label: 'Urgent' };
      case 'high':
        return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa', label: 'High' };
      case 'medium':
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a', label: 'Medium' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', label: 'Normal' };
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #ffffff, #f8fafc)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ListTodo size={20} color="#0284c7" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Pending Tasks Queue
                </h2>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#0284c7',
                  backgroundColor: '#e0f2fe',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {tasks.length} Total
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                {user ? `Active and upcoming tasks assigned to ${user.name}` : 'All team pending work requiring action'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls & Search */}
        <div style={{
          padding: '12px 22px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          backgroundColor: '#ffffff'
        }}>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterTab('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: filterTab === 'all' ? '#0284c7' : '#f1f5f9',
                color: filterTab === 'all' ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease'
              }}
            >
              All ({tasks.length})
            </button>

            <button
              onClick={() => setFilterTab('in_progress')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: filterTab === 'in_progress' ? '#eff6ff' : '#f1f5f9',
                color: filterTab === 'in_progress' ? '#2563eb' : '#64748b',
                outline: filterTab === 'in_progress' ? '1px solid #bfdbfe' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              ⏱️ In Progress ({inProgressCount})
            </button>

            <button
              onClick={() => setFilterTab('overdue')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: filterTab === 'overdue' ? '#fee2e2' : '#f1f5f9',
                color: filterTab === 'overdue' ? '#dc2626' : '#64748b',
                outline: filterTab === 'overdue' ? '1px solid #fecaca' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              🔥 Overdue ({overdueCount})
            </button>

            <button
              onClick={() => setFilterTab('due_today')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: filterTab === 'due_today' ? '#fef3c7' : '#f1f5f9',
                color: filterTab === 'due_today' ? '#d97706' : '#64748b',
                outline: filterTab === 'due_today' ? '1px solid #fde68a' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              📅 Due Today ({dueTodayCount})
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by task, code, project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 32px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                outline: 'none',
                backgroundColor: '#f8fafc',
                transition: 'all 0.15s ease'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#0284c7'; e.target.style.backgroundColor = '#ffffff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
            />
          </div>
        </div>

        {/* Task List Body */}
        <div style={{
          padding: '16px 22px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {filteredTasks.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#64748b',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1'
            }}>
              <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                No pending tasks found
              </h4>
              <p style={{ fontSize: '12px', margin: 0 }}>
                {searchQuery ? 'Try adjusting your search criteria.' : 'All tasks under this filter are completed or caught up!'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const priorityInfo = getPriorityBadge(task.priority);
              const isOverdue = task.dueDate && task.dueDate < todayStr;
              const isDueToday = task.dueDate === todayStr;
              const isCurrentActive = activeTaskId === task._id || task.timerRunning;

              return (
                <div
                  key={task._id || task.id}
                  style={{
                    backgroundColor: isCurrentActive ? '#f0f9ff' : '#ffffff',
                    border: `1px solid ${isCurrentActive ? '#0284c7' : '#e2e8f0'}`,
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                    boxShadow: isCurrentActive ? '0 2px 6px rgba(2, 132, 199, 0.15)' : '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  {/* Row 1: Code, Title, Badges */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        color: '#0284c7',
                        backgroundColor: '#e0f2fe',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}>
                        #{task.taskCode || 'TSK'}
                      </span>

                      <h4
                        onClick={() => onSelectTask && onSelectTask(task)}
                        style={{
                          fontSize: '13.5px',
                          fontWeight: '700',
                          color: '#0f172a',
                          margin: 0,
                          cursor: 'pointer',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#0284c7'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#0f172a'}
                        title="Click to view full details"
                      >
                        {task.title}
                      </h4>

                      {isCurrentActive && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          color: '#0284c7',
                          backgroundColor: '#e0f2fe',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                          Active Now
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: priorityInfo.bg,
                        color: priorityInfo.text,
                        border: `1px solid ${priorityInfo.border}`
                      }}>
                        {priorityInfo.label}
                      </span>

                      {isOverdue && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca'
                        }}>
                          ⚠️ Overdue
                        </span>
                      )}

                      {isDueToday && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#fef3c7',
                          color: '#d97706',
                          border: '1px solid #fde68a'
                        }}>
                          📅 Due Today
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Project, Due Date, Time Stats */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    fontSize: '11.5px',
                    color: '#64748b',
                    flexWrap: 'wrap',
                    paddingTop: '2px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={13} color="#94a3b8" />
                        <strong style={{ color: '#334155' }}>{task.projectName || 'General Work'}</strong>
                      </span>

                      {task.dueDate && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} color={isOverdue ? '#dc2626' : '#94a3b8'} />
                          <span>Due: <strong style={{ color: isOverdue ? '#dc2626' : '#334155' }}>{task.dueDate}</strong></span>
                        </span>
                      )}

                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} color="#94a3b8" />
                        <span>Est: <strong style={{ color: '#334155' }}>{task.estimatedHours || 3}h</strong></span>
                        {Number(task.timerSeconds) > 0 && (
                          <span style={{ color: '#0284c7', fontWeight: '700', marginLeft: '4px' }}>
                            (Tracked: {formatSecs(task.timerSeconds)})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {task.timerRunning ? (
                        <button
                          onClick={() => onPauseTimer && onPauseTimer(task._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            padding: '4px 8px',
                            borderRadius: '5px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          <Pause size={12} /> Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartTimer && onStartTimer(task._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '5px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          <Play size={12} /> {Number(task.timerSeconds) > 0 ? 'Resume' : 'Start'}
                        </button>
                      )}

                      <button
                        onClick={() => onCompleteTask && onCompleteTask(task._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '5px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        <CheckCircle2 size={12} /> Complete
                      </button>

                      <button
                        onClick={() => onSelectTask && onSelectTask(task)}
                        style={{
                          backgroundColor: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          padding: '4px 8px',
                          borderRadius: '5px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 22px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <button
            onClick={() => {
              onClose();
              navigate('/tasks');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'none',
              border: 'none',
              color: '#0284c7',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <span>Open Dedicated Tasks Board</span>
            <ExternalLink size={13} />
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '12px',
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
