/**
 * @file TaskDetailModal.jsx
 * @description Detailed view modal for a single task with timer controls and status updates.
 */

import React, { useState } from 'react';
import {
  X,
  Play,
  Pause,
  Square,
  Clock,
  Calendar,
  User,
  Tag,
  FolderGit2,
  CheckCircle2,
  Check
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';

export const TaskDetailModal = ({ task, onClose }) => {
  const {
    startTaskTimer,
    pauseTaskTimer,
    stopTaskTimer,
    changeTaskStatus,
    completeTask,
    updateTask,
    employees
  } = useWork();

  const [isReassigning, setIsReassigning] = useState(false);

  if (!task) return null;

  const handleReassign = async (newEmpId) => {
    const newAssignee = employees.find(e => e._id === newEmpId);
    if (!newAssignee) return;
    try {
      await updateTask(task._id, {
        assignedTo: newAssignee._id,
        assignedToId: newAssignee._id,
        assignedToName: newAssignee.name,
        assignedToEmail: newAssignee.email || '',
        assignedToAvatar: newAssignee.avatar,
        assignedToRole: newAssignee.role
      });
      setIsReassigning(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '760px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                padding: '3px 8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                border: '1px solid #bfdbfe'
              }}>
                {task.taskCode}
              </span>
              <span style={{
                padding: '3px 8px',
                backgroundColor: '#f1f5f9',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#475569',
                fontWeight: '500'
              }}>
                {task.projectName}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Overdue Task Banner */}
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const isOverdue = !!(task.dueDate && !task.hasNoDueDate && task.dueDate < todayStr && task.status !== 'completed');
            if (!isOverdue) return null;
            return (
              <div style={{
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#c2410c' }}>
                      Task Deadline Expired (Due: {task.dueDate})
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#9a3412' }}>
                      Time tracking on overdue tasks requires updating the deadline or completing the task.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const baseDate = new Date();
                    baseDate.setDate(baseDate.getDate() + 3);
                    const newDate = baseDate.toISOString().split('T')[0];
                    await updateTask(task._id, { dueDate: newDate, hasNoDueDate: false });
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Extend +3 Days
                </button>
              </div>
            );
          })()}
          {/* Active Timer Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: task.timerRunning ? '#eff6ff' : '#f8fafc',
            borderRadius: '10px',
            border: `1px solid ${task.timerRunning ? '#bfdbfe' : '#e2e8f0'}`
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                {task.timerRunning ? 'Work Session In Progress' : 'Work Session Timer'}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: task.timerRunning ? '#0284c7' : '#0f172a', fontFamily: 'monospace' }}>
                {task.liveDurationText || task.hoursLoggedText || '00:00:00'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {task.timerRunning ? (
                <>
                  <button
                    onClick={() => pauseTaskTimer(task._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <Pause size={14} /> Pause
                  </button>
                  <button
                    onClick={() => {
                      stopTaskTimer(task._id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <Square size={14} /> Stop & Log
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startTaskTimer(task._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Play size={14} /> Start Tracking
                </button>
              )}

              {task.status !== 'completed' ? (
                <button
                  onClick={async () => {
                    await completeTask(task._id);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
                  }}
                >
                  <CheckCircle2 size={15} /> Complete Task
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await changeTaskStatus(task._id, 'in_progress');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Reopen Task
                </button>
              )}
            </div>
          </div>

          {/* Time Budget vs Logged Hours Progress Card */}
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="#2563eb" />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                  Task Time Allocation & Progress
                </span>
              </div>
              <span style={{
                fontSize: '11.5px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: (Number(task.hoursLogged) || 0) > Number(task.estimatedHours) ? '#fee2e2' : '#eff6ff',
                color: (Number(task.hoursLogged) || 0) > Number(task.estimatedHours) ? '#dc2626' : '#2563eb'
              }}>
                {task.estimatedHours > 0 
                  ? `${Math.round(((Number(task.hoursLogged) || 0) / Number(task.estimatedHours)) * 100)}% of Budget`
                  : 'Open Budget'}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '10px',
              fontSize: '12.5px'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>Estimated Budget:</span>
                <strong style={{ color: '#0f172a', fontSize: '13.5px' }}>
                  {task.estimatedHours ? `${task.estimatedHours}h 00m` : 'Not set'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>Actual Logged:</span>
                <strong style={{ color: '#2563eb', fontSize: '13.5px' }}>
                  {task.hoursLogged ? `${task.hoursLogged}h` : (task.hoursLoggedText || '0s')}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '11.5px', display: 'block' }}>Variance / Balance:</span>
                <strong style={{
                  color: (Number(task.hoursLogged) || 0) > Number(task.estimatedHours) ? '#d97706' : '#16a34a',
                  fontSize: '13.5px'
                }}>
                  {task.estimatedHours > 0
                    ? ((Number(task.hoursLogged) || 0) > Number(task.estimatedHours)
                      ? `+${((Number(task.hoursLogged) || 0) - Number(task.estimatedHours)).toFixed(1)}h Overtime`
                      : `${(Number(task.estimatedHours) - (Number(task.hoursLogged) || 0)).toFixed(1)}h Left`)
                    : 'Flexible'}
                </strong>
              </div>
            </div>

            {/* Progress Bar */}
            {task.estimatedHours > 0 && (
              <div style={{
                width: '100%',
                height: '7px',
                backgroundColor: '#e2e8f0',
                borderRadius: '4px',
                overflow: 'hidden',
                marginTop: '4px'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round(((Number(task.hoursLogged) || 0) / Number(task.estimatedHours)) * 100))}%`,
                  backgroundColor: (Number(task.hoursLogged) || 0) > Number(task.estimatedHours) ? '#f59e0b' : '#2563eb',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px 0' }}>
              Task Description
            </h4>
            <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              {task.description || 'No specific description provided for this task.'}
            </div>
          </div>

          {/* Meta Grid (Assignee, Assigner, Timeline, Priority, Status) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
            {/* Assigned Member (Assignee) with quick Reassign button */}
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>Assigned To</div>
                <button
                  onClick={() => setIsReassigning(!isReassigning)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: '0'
                  }}
                >
                  {isReassigning ? 'Cancel' : 'Reassign ↻'}
                </button>
              </div>

              {!isReassigning ? (
                <div>
                  {Array.isArray(task.assignees) && task.assignees.length > 1 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0284c7' }}>
                        👥 {task.assignees.length} Assigned Members:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {task.assignees.map(a => (
                          <div
                            key={a._id || a.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              padding: '2px 7px',
                              borderRadius: '16px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}
                          >
                            <img
                              src={a.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={a.name}
                              style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <span>{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={task.assignedToAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={task.assignedToName}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{task.assignedToName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{task.assignedToRole || 'Team Member'}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <select
                  value={task.assignedToId || ''}
                  onChange={(e) => handleReassign(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #3b82f6',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                >
                  <option value="" disabled>Select colleague...</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Assigned By (Creator) */}
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Assigned By</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src={task.assignedByAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={task.assignedBy || 'Creator'}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{task.assignedBy || 'Admin / Project Manager'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{task.assignedByRole || 'Assigner'}</div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Timeline</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                {task.startDate} → {task.hasNoDueDate ? 'No Due Date' : task.dueDate}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Priority: <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{task.priority || 'Medium'}</strong>
              </div>
            </div>

            {/* Status Selector */}
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>Current Status</div>
              <select
                value={task.status}
                onChange={e => changeTaskStatus(task._id, e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="incomplete">🔴 Incomplete / Pending</option>
                <option value="in_progress">🔵 In Progress</option>
                <option value="on_hold">⏸ On Hold / Paused</option>
                <option value="under_review">🟣 Under Review</option>
                <option value="completed">🟢 Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#f8fafc',
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px'
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: '500',
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
