/**
 * @file TasksKanban.jsx
 * @description Interactive Kanban Board view for Tasks in EMS.
 */

import React from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { confirmDialog } from '../../../../shared/context/ConfirmContext';

const COLUMNS = [
  { key: 'incomplete', title: 'Incomplete / Pending', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { key: 'in_progress', title: 'In Progress', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'on_hold', title: 'On Hold / Paused', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { key: 'under_review', title: 'Under Review', color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff' },
  { key: 'completed', title: 'Completed', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
];

export const TasksKanban = ({ tasks: propTasks, onSelectTask }) => {
  const { tasks: contextTasks, changeTaskStatus, startTaskTimer, pauseTaskTimer, stopTaskTimer, completeTask, deleteTask } = useWork();
  const { currentUser } = useAuth();
  const tasks = propTasks !== undefined ? propTasks : (contextTasks || []);

  const canDeleteTask = (task) => {
    if (!currentUser) return false;
    return (
      currentUser.isAdmin ||
      currentUser.isSuperAdmin ||
      currentUser.systemRole === 'admin' ||
      currentUser.systemRole === 'hr' ||
      currentUser.role === 'Administrator' ||
      currentUser.role === 'HR Manager' ||
      currentUser.permissions?.manageTasks ||
      currentUser.permissions?.deleteTasks ||
      task?.assignedById === currentUser?._id ||
      task?.createdBy === currentUser?.name ||
      task?.createdById === currentUser?._id
    );
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      alignItems: 'start'
    }}>
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter(t => (t.status || 'incomplete') === col.key);

        return (
          <div
            key={col.key}
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: `1px solid ${col.border}`,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minHeight: '400px'
            }}
          >
            {/* Column Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '10px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: col.color
                }} />
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  {col.title}
                </h3>
              </div>
              <span style={{
                fontSize: '12px',
                fontWeight: '700',
                color: col.color,
                backgroundColor: col.bg,
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {colTasks.length}
              </span>
            </div>

            {/* Task Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {colTasks.map((task) => (
                <div
                  key={task._id}
                  onClick={() => onSelectTask && onSelectTask(task)}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
                >
                  {/* Top Bar: Code & Project */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#2563eb',
                        backgroundColor: '#eff6ff',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {task.taskCode || 'TSK'}
                      </span>
                      {task.isPersonal && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          color: '#7c3aed',
                          backgroundColor: '#faf5ff',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          border: '1px solid #e9d5ff'
                        }}>
                          🔒 Personal
                        </span>
                      )}
                      {task.isUntimed && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          color: '#059669',
                          backgroundColor: '#ecfdf5',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          border: '1px solid #a7f3d0'
                        }}>
                          ⚡ Normal
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
                        {task.projectName || 'General'}
                      </span>
                      {canDeleteTask(task) && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirmDialog({
                              title: 'Delete Task',
                              message: `Are you sure you want to delete task "${task.title}"?`,
                              confirmText: 'Delete Task',
                              variant: 'danger'
                            });
                            if (ok) {
                              deleteTask(task._id);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            padding: '2px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                          title="Delete task"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0f172a', lineHeight: '1.4' }}>
                    {task.title}
                  </div>

                  {/* Action Bar (Timer Controls + Complete Button) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    {(task.timerRunning && task.status !== 'completed' && !task.completedAt) ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        padding: '3px 7px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        <span>⏱️ {task.liveDurationText || task.hoursLoggedText}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            pauseTaskTimer(task._id);
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.25)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          Pause
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            stopTaskTimer(task._id);
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.25)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          Stop
                        </button>
                      </div>
                    ) : task.status !== 'completed' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startTaskTimer(task._id);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          backgroundColor: '#f1f5f9',
                          color: '#0284c7',
                          border: '1px solid #cbd5e1',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        <Play size={9} fill="#0284c7" /> Start
                      </button>
                    ) : (
                      <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: '700' }}>
                        ✓ Completed
                      </span>
                    )}

                    {task.status !== 'completed' && (
                      <button
                        title="Mark Completed"
                        onClick={(e) => {
                          e.stopPropagation();
                          completeTask(task._id);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)'
                        }}
                      >
                        <CheckCircle2 size={11} /> Complete
                      </button>
                    )}
                  </div>

                  {/* Bottom details: Assignee & Date */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid #f1f5f9'
                  }}>
                    {Array.isArray(task.assignees) && task.assignees.length > 1 ? (
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                        title={task.assignees.map(a => a.name).join(', ')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {task.assignees.slice(0, 3).map((a, idx) => (
                            <img
                              key={a._id || a.id || idx}
                              src={a.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={a.name}
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid #ffffff',
                                marginLeft: idx > 0 ? '-6px' : '0'
                              }}
                            />
                          ))}
                        </div>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#0284c7' }}>
                          {task.assignees.length} Members
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <img
                          src={task.assignedToAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={task.assignedToName}
                          style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                            {task.assignedToName || 'Unassigned'}
                          </div>
                          {task.assignedBy && task.assignedBy !== task.assignedToName && (
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                              By {task.assignedBy}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                      {task.isUntimed ? '⚡ Open Duration' : (task.hasNoDueDate ? 'No Due Date' : `Due: ${task.dueDate || 'N/A'}`)}
                    </div>
                  </div>
                </div>
              ))}

              {colTasks.length === 0 && (
                <div style={{
                  padding: '30px 10px',
                  textAlign: 'center',
                  fontSize: '12.5px',
                  color: '#94a3b8',
                  fontStyle: 'italic'
                }}>
                  No tasks in this column
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
