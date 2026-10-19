/**
 * @file ProjectDetailModal.jsx
 * @description Modal showing full details, tasks, members, creator attribution, and deadline extension audit history.
 */

import React from 'react';
import {
  X,
  Calendar,
  Building,
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  Tag,
  AlertTriangle,
  History,
  Shield,
  UserCheck,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';

export const ProjectDetailModal = ({ project, onClose, onAddTaskForProject, onExtendDeadline }) => {
  const { tasks } = useWork();
  if (!project) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = project.deadline && !project.hasNoDeadline && project.deadline < todayStr && project.status !== 'completed';
  const overdueDays = isOverdue
    ? Math.max(1, Math.ceil((new Date(todayStr) - new Date(project.deadline)) / (1000 * 60 * 60 * 24)))
    : 0;

  const projectTasks = tasks.filter(t => t.projectId === project._id || t.projectCode === project.projectCode);
  const extensions = Array.isArray(project.deadlineExtensions) ? project.deadlineExtensions : [];

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
        maxWidth: '820px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: isOverdue ? '#fff1f2' : '#f8fafc',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{
                padding: '4px 8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                border: '1px solid #bfdbfe'
              }}>
                {project.projectCode}
              </span>
              <span style={{
                padding: '3px 8px',
                backgroundColor: '#f1f5f9',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#475569',
                fontWeight: '500'
              }}>
                {project.category}
              </span>
                <span style={{
                  padding: '3px 8px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#16a34a',
                  fontWeight: '700',
                  border: '1px solid #bbf7d0'
                }}>
                  👥 Team Project
                </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              {project.name}
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
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Overdue Warning Alert Banner */}
          {isOverdue && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1.5px solid #f87171',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={20} color="#dc2626" />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#991b1b' }}>
                    ⚠️ Project Deadline Passed ({overdueDays} day{overdueDays > 1 ? 's' : ''} overdue)!
                  </div>
                  <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                    Scheduled deadline was <strong>{project.deadline}</strong>. Has client approved an extension?
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onExtendDeadline && onExtendDeadline(project)}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)'
                }}
              >
                <Calendar size={14} />
                <span>Extend Deadline Now</span>
              </button>
            </div>
          )}

          {/* Summary / Description */}
          <div>
            <h4 style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px 0' }}>
              Project Summary
            </h4>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6', margin: 0, backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              {project.summary || 'No detailed summary provided for this project.'}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11.5px', marginBottom: '4px' }}>
                <Building size={14} /> Client
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>{project.client}</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: isOverdue ? '1.5px solid #fca5a5' : '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11.5px' }}>
                  <Calendar size={14} /> Timeline
                </div>
                <button
                  type="button"
                  onClick={() => onExtendDeadline && onExtendDeadline(project)}
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title="Extend project deadline"
                >
                  + Extend
                </button>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: isOverdue ? '#dc2626' : '#0f172a' }}>
                {project.startDate} → {project.hasNoDeadline ? 'Ongoing' : project.deadline}
              </div>
              {project.hasDeadlineExtended && (
                <div style={{ fontSize: '10.5px', color: '#7c3aed', fontWeight: '600', marginTop: '2px' }}>
                  🔄 Extended ({project.extensionCount || extensions.length || 1}x)
                </div>
              )}
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11.5px', marginBottom: '4px' }}>
                <UserCheck size={14} /> Creator & Owner
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                {project.creatorName || 'Administrator'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {project.creatorRole || 'Executive'}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11.5px', marginBottom: '4px' }}>
                <TrendingUp size={14} /> Progress
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#2563eb' }}>{project.progress || 0}% Completed</div>
            </div>
          </div>

          {/* Deadline Extension & Client Audit History */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={16} color="#7c3aed" />
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Deadline Extension & Client Audit History ({extensions.length})
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onExtendDeadline && onExtendDeadline(project)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: '#f5f3ff',
                  color: '#7c3aed',
                  border: '1px solid #ddd6fe',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ede9fe'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f5f3ff'}
              >
                <Calendar size={13} />
                <span>+ Request / Record Extension</span>
              </button>
            </div>

            {extensions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {extensions.map((ext, idx) => (
                  <div
                    key={ext._id || idx}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: '#faf5ff',
                      border: '1px solid #e9d5ff',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: '#7c3aed',
                          backgroundColor: '#ede9fe',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          Extension #{extensions.length - idx}
                        </span>
                        <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                          <span style={{ color: '#64748b', textDecoration: 'line-through' }}>{ext.previousDeadline}</span>
                          {' → '}
                          <span style={{ color: '#16a34a' }}>{ext.newDeadline}</span>
                        </span>
                      </div>

                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: '#475569',
                        backgroundColor: '#f1f5f9',
                        padding: '2px 7px',
                        borderRadius: '4px'
                      }}>
                        {ext.reasonCategory || 'Client Extension'}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.5', marginBottom: '6px' }}>
                      💬 <strong>Reason:</strong> "{ext.reason}"
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                      <span>👤 Extended by <strong>{ext.extendedByName}</strong> ({ext.extendedByRole})</span>
                      <span>🕒 {ext.extendedAt ? new Date(ext.extendedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '12px 14px',
                backgroundColor: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span>No timeline extensions recorded yet. All client-requested deadline extensions will be logged here with mandatory reasons.</span>
              </div>
            )}
          </div>

          {/* Assigned Members */}
          <div>
            <h4 style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px 0' }}>
              Assigned Team Members ({project.membersList?.length || 0})
            </h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {project.membersList && project.membersList.length > 0 ? (
                project.membersList.map((m, idx) => (
                  <div
                    key={m._id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    <img
                      src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={m.name}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{m.role}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>No members assigned to this project yet.</div>
              )}
            </div>
          </div>

          {/* Attached Tasks */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                Tasks Linked to this Project ({projectTasks.length})
              </h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {projectTasks.length > 0 ? (
                projectTasks.map(t => (
                  <div
                    key={t._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#2563eb', padding: '2px 6px', backgroundColor: '#eff6ff', borderRadius: '4px' }}>
                        {t.taskCode}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                        {t.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                        👤 {t.assignedToName || 'Team'}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: t.status === 'completed' ? '#f0fdf4' : '#eff6ff',
                        color: t.status === 'completed' ? '#16a34a' : '#2563eb',
                        fontWeight: '700'
                      }}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                  No tasks created yet for this project.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px'
        }}>
          <button
            type="button"
            onClick={() => onExtendDeadline && onExtendDeadline(project)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Calendar size={14} />
            <span>Extend Project Deadline</span>
          </button>

          <button
            onClick={onClose}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '7px 16px',
              borderRadius: '8px',
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

export default ProjectDetailModal;
