/**
 * @file ProjectsTable.jsx
 * @description Modern, clean table view for Projects with status badges, team avatars, and progress metrics.
 */

import React, { useState } from 'react';
import {
  MoreVertical,
  Calendar,
  Building,
  User,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FolderGit2
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { confirmDialog } from '../../../../shared/context/ConfirmContext';

const STATUS_CONFIG = {
  in_progress: { label: 'In Progress', color: '#2563eb', bg: '#eff6ff', dot: '#3b82f6' },
  not_started: { label: 'Not Started', color: '#64748b', bg: '#f1f5f9', dot: '#94a3b8' },
  on_hold: { label: 'On Hold', color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  completed: { label: 'Completed', color: '#16a34a', bg: '#f0fdf4', dot: '#22c55e' },
  under_review: { label: 'Under Review', color: '#9333ea', bg: '#faf5ff', dot: '#a855f7' }
};

export const ProjectsTable = ({ projects: propProjects, onSelectProject, onExtendDeadline }) => {
  const { projects: contextProjects, deleteProject, updateProject, approveProjectCompletion, reopenProject, submitProjectForCompletion } = useWork();
  const { currentUser } = useAuth();
  const projects = propProjects !== undefined ? propProjects : (contextProjects || []);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const canManageApprovals = currentUser && (
    currentUser.isAdmin ||
    currentUser.isSuperAdmin ||
    currentUser.systemRole === 'admin' ||
    currentUser.systemRole === 'hr' ||
    currentUser.role === 'Administrator' ||
    currentUser.role === 'HR Manager' ||
    currentUser.permissions?.canApproveProjects ||
    currentUser.permissions?.manageProjects
  );

  const todayStr = new Date().toISOString().split('T')[0];

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setActiveMenuId(null);
    const ok = await confirmDialog({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project and all its associated tasks? This cannot be recovered.',
      confirmText: 'Delete Project',
      variant: 'danger'
    });
    if (ok) {
      deleteProject(id);
    }
  };

  const handleStatusChange = async (projectId, newStatus, e) => {
    e.stopPropagation();
    await updateProject(projectId, { status: newStatus });
    setActiveMenuId(null);
  };

  if (!projects || projects.length === 0) {
    return (
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '60px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#3b82f6'
        }}>
          <FolderGit2 size={28} />
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
          No Projects Found
        </h3>
        <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
          Get started by creating your first client or internal project.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Project Name
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Client
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Department
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Timeline & Deadline
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Status
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Progress
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Members
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((proj) => {
              const status = STATUS_CONFIG[proj.status] || STATUS_CONFIG.in_progress;
              const isMenuOpen = activeMenuId === proj._id;
              const isOverdue = proj.deadline && !proj.hasNoDeadline && proj.deadline < todayStr && proj.status !== 'completed';
              const isExtended = proj.hasDeadlineExtended || (Array.isArray(proj.deadlineExtensions) && proj.deadlineExtensions.length > 0);

              return (
                <tr
                  key={proj._id}
                  onClick={() => onSelectProject && onSelectProject(proj)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    backgroundColor: isOverdue ? 'rgba(254, 242, 242, 0.35)' : 'transparent'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = isOverdue ? '#fef2f2' : '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = isOverdue ? 'rgba(254, 242, 242, 0.35)' : 'transparent'}
                >
                  {/* Project Name & Short Code */}
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        letterSpacing: '0.02em',
                        border: '1px solid #bfdbfe'
                      }}>
                        {proj.projectCode || 'PRJ'}
                      </span>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{proj.name}</span>
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{proj.category || 'General'}</span>
                          {proj.creatorName && (
                            <>
                              <span>•</span>
                              <span style={{ color: '#0369a1' }}>By {proj.creatorName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Client */}
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '12px', color: '#334155', fontWeight: '500' }}>
                      {proj.client || 'Internal'}
                    </div>
                  </td>

                  {/* Department */}
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      padding: '2px 7px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#475569',
                      fontWeight: '500'
                    }}>
                      {proj.department || 'General'}
                    </span>
                  </td>

                  {/* Start Date & Deadline */}
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Start: {proj.startDate}
                    </div>
                    <div style={{ fontSize: '11.5px', fontWeight: isOverdue ? '700' : '500', color: isOverdue ? '#dc2626' : '#334155' }}>
                      {proj.hasNoDeadline ? 'No deadline' : `Due: ${proj.deadline || 'Ongoing'}`}
                    </div>
                    {isOverdue && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span style={{
                          fontSize: '9.5px',
                          fontWeight: '800',
                          color: '#dc2626',
                          backgroundColor: '#fee2e2',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          border: '1px solid #fca5a5'
                        }}>
                          ⚠️ OVERDUE
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExtendDeadline && onExtendDeadline(proj);
                          }}
                          style={{
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                          title="Extend project deadline with reason"
                        >
                          + Extend
                        </button>
                      </div>
                    )}
                    {isExtended && (
                      <div style={{ fontSize: '10px', color: '#7c3aed', fontWeight: '600', marginTop: '1px' }}>
                        🔄 Extended ({proj.extensionCount || proj.deadlineExtensions?.length || 1}x)
                      </div>
                    )}
                  </td>

                  {/* Status Badge with colored dot */}
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: status.bg,
                      color: status.color
                    }}>
                      <span style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: status.dot
                      }} />
                      {status.label}
                    </span>
                    {proj.finalApproved && proj.status === 'completed' && (
                      <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: '700', marginTop: '2px' }}>
                        ✅ Final Approved
                      </div>
                    )}
                    {proj.status === 'under_review' && (
                      <div style={{ fontSize: '10px', color: '#9333ea', fontWeight: '600', marginTop: '2px' }}>
                        ⏳ Awaiting Sign-Off
                      </div>
                    )}
                    {proj.reopened && !proj.finalApproved && (
                      <div style={{ fontSize: '10px', color: '#ea580c', fontWeight: '700', marginTop: '2px' }} title={proj.reopenReason}>
                        ⚠️ Reopened
                      </div>
                    )}
                  </td>

                  {/* Progress Bar */}
                  <td style={{ padding: '7px 12px', minWidth: '100px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        flex: 1,
                        height: '5px',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${proj.progress || 0}%`,
                          height: '100%',
                          backgroundColor: proj.progress >= 100 ? '#10b981' : '#2563eb',
                          borderRadius: '3px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', minWidth: '28px' }}>
                        {proj.progress || 0}%
                      </span>
                    </div>
                  </td>

                  {/* Assigned Members (Stacked Avatars) */}
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {proj.membersList && proj.membersList.length > 0 ? (
                        proj.membersList.slice(0, 3).map((m, idx) => (
                          <img
                            key={m._id || idx}
                            src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={m.name}
                            title={`${m.name} (${m.role})`}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1.5px solid #ffffff',
                              marginLeft: idx > 0 ? '-6px' : '0',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}
                          />
                        ))
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Unassigned</span>
                      )}
                      {proj.membersList && proj.membersList.length > 3 && (
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: '#e2e8f0',
                          border: '1.5px solid #ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '700',
                          color: '#475569',
                          marginLeft: '-6px'
                        }}>
                          +{proj.membersList.length - 3}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Action Menu */}
                  <td style={{ padding: '16px 20px', textAlign: 'right', position: 'relative' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : proj._id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        padding: '6px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>

                    {isMenuOpen && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          right: '20px',
                          top: '40px',
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          border: '1px solid #e2e8f0',
                          padding: '6px',
                          zIndex: 50,
                          minWidth: '170px',
                          textAlign: 'left'
                        }}
                      >
                        <div
                          onClick={() => {
                            onSelectProject && onSelectProject(proj);
                            setActiveMenuId(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            fontSize: '12.5px',
                            color: '#334155',
                            cursor: 'pointer',
                            borderRadius: '4px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Eye size={14} color="#3b82f6" /> View Details
                        </div>

                        <div
                          onClick={() => {
                            onExtendDeadline && onExtendDeadline(proj);
                            setActiveMenuId(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            fontSize: '12.5px',
                            color: '#2563eb',
                            cursor: 'pointer',
                            borderRadius: '4px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Calendar size={14} color="#2563eb" /> Extend Deadline
                        </div>

                        {/* Submit for Completion */}
                        {proj.status !== 'completed' && proj.status !== 'under_review' && (
                          <div
                            onClick={async () => {
                              await submitProjectForCompletion(proj._id);
                              setActiveMenuId(null);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              fontSize: '12.5px',
                              color: '#9333ea',
                              cursor: 'pointer',
                              borderRadius: '4px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#faf5ff'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <CheckCircle2 size={14} color="#9333ea" /> Submit for Sign-Off
                          </div>
                        )}

                        {/* Admin 1-Click Final Approval */}
                        {canManageApprovals && (proj.status === 'under_review' || (proj.status === 'completed' && !proj.finalApproved)) && (
                          <div
                            onClick={async () => {
                              await approveProjectCompletion(proj._id);
                              setActiveMenuId(null);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              fontSize: '12.5px',
                              color: '#16a34a',
                              cursor: 'pointer',
                              borderRadius: '4px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <CheckCircle2 size={14} color="#16a34a" /> Final Approve & Complete
                          </div>
                        )}

                        {/* Admin Reopen Action */}
                        {canManageApprovals && (proj.status === 'completed' || proj.status === 'under_review') && (
                          <div
                            onClick={async () => {
                              const reason = window.prompt(`Reason to reopen project "${proj.name}":`, 'Reopened by Admin for required revisions');
                              if (reason && reason.trim()) {
                                await reopenProject(proj._id, reason.trim());
                              }
                              setActiveMenuId(null);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              fontSize: '12.5px',
                              color: '#c2410c',
                              cursor: 'pointer',
                              borderRadius: '4px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fff7ed'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <span>🔄 Reopen Project</span>
                          </div>
                        )}

                        <div
                          onClick={(e) => handleDelete(proj._id, e)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            fontSize: '12.5px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            borderRadius: '4px'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Trash2 size={14} /> Delete Project
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
