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
  in_progress: {
    label: 'In Progress',
    badgeClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40',
    dotClass: 'bg-blue-500'
  },
  not_started: {
    label: 'Not Started',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
    dotClass: 'bg-slate-400'
  },
  on_hold: {
    label: 'On Hold',
    badgeClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40',
    dotClass: 'bg-amber-500'
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400 border border-green-200/60 dark:border-green-900/40',
    dotClass: 'bg-green-500'
  },
  under_review: {
    label: 'Under Review',
    badgeClass: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/40',
    dotClass: 'bg-purple-500'
  }
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
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-14 px-5 text-center">
        <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4 text-blue-500">
          <FolderGit2 size={28} />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 mt-0">
          No Projects Found
        </h3>
        <p className="text-[13.5px] text-slate-500 dark:text-slate-400 m-0">
          Get started by creating your first client or internal project.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider">
              <th className="py-2 px-3 whitespace-nowrap">
                Project Name
              </th>
              <th className="py-2 px-3 whitespace-nowrap">
                Client
              </th>
              <th className="py-2 px-3 whitespace-nowrap">
                Department
              </th>
              <th className="py-2 px-3 whitespace-nowrap">
                Timeline & Deadline
              </th>
              <th className="py-2 px-3 whitespace-nowrap">
                Status
              </th>
              <th className="py-2 px-3 whitespace-nowrap">
                Progress
              </th>
              <th className="py-2 px-3 whitespace-nowrap">
                Members
              </th>
              <th className="py-2 px-3 text-right whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {projects.map((proj) => {
              const status = STATUS_CONFIG[proj.status] || STATUS_CONFIG.in_progress;
              const isMenuOpen = activeMenuId === proj._id;
              const isOverdue = proj.deadline && !proj.hasNoDeadline && proj.deadline < todayStr && proj.status !== 'completed';
              const isExtended = proj.hasDeadlineExtended || (Array.isArray(proj.deadlineExtensions) && proj.deadlineExtensions.length > 0);

              return (
                <tr
                  key={proj._id}
                  onClick={() => onSelectProject && onSelectProject(proj)}
                  className={`cursor-pointer transition-colors ${
                    isOverdue 
                      ? 'bg-red-50/40 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Project Name & Short Code */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded text-[10.5px] font-bold tracking-tight border border-blue-200 dark:border-blue-800">
                        {proj.projectCode || 'PRJ'}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{proj.name}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span>{proj.category || 'General'}</span>
                          {proj.creatorName && (
                            <>
                              <span>•</span>
                              <span className="text-sky-600 dark:text-sky-400 font-medium">By {proj.creatorName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Client */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {proj.client || 'Internal'}
                    </div>
                  </td>

                  {/* Department */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      {proj.department || 'General'}
                    </span>
                  </td>

                  {/* Start Date & Deadline */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Start: {proj.startDate}
                    </div>
                    <div className={`text-[11.5px] ${isOverdue ? 'font-bold text-red-600 dark:text-red-400' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                      {proj.hasNoDeadline ? 'No deadline' : `Due: ${proj.deadline || 'Ongoing'}`}
                    </div>
                    {isOverdue && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9.5px] font-extrabold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-1.5 py-[1px] rounded border border-red-300 dark:border-red-900">
                          ⚠️ OVERDUE
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExtendDeadline && onExtendDeadline(proj);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-none px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors"
                          title="Extend project deadline with reason"
                        >
                          + Extend
                        </button>
                      </div>
                    )}
                    {isExtended && (
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                        🔄 Extended ({proj.extensionCount || proj.deadlineExtensions?.length || 1}x)
                      </div>
                    )}
                  </td>

                  {/* Status Badge with colored dot */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${status.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                      {status.label}
                    </span>
                    {proj.finalApproved && proj.status === 'completed' && (
                      <div className="text-[10px] text-green-600 dark:text-green-400 font-bold mt-0.5">
                        ✅ Final Approved
                      </div>
                    )}
                    {proj.status === 'under_review' && (
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                        ⏳ Awaiting Sign-Off
                      </div>
                    )}
                    {proj.reopened && !proj.finalApproved && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5" title={proj.reopenReason}>
                        ⚠️ Reopened
                      </div>
                    )}
                  </td>

                  {/* Progress Bar */}
                  <td className="py-2 px-3 min-w-[100px] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${proj.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                          style={{ width: `${Math.min(100, Math.max(0, proj.progress || 0))}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 min-w-[28px]">
                        {proj.progress || 0}%
                      </span>
                    </div>
                  </td>

                  {/* Assigned Members (Stacked Avatars) */}
                  <td className="py-2 px-3 whitespace-nowrap">
                    <div className="flex items-center">
                      {proj.membersList && proj.membersList.length > 0 ? (
                        proj.membersList.slice(0, 3).map((m, idx) => (
                          <img
                            key={m._id || idx}
                            src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={m.name}
                            title={`${m.name} (${m.role})`}
                            className={`w-[22px] h-[22px] rounded-full object-cover border-[1.5px] border-white dark:border-slate-800 shadow-xs ${idx > 0 ? '-ml-1.5' : ''}`}
                          />
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400">Unassigned</span>
                      )}
                      {proj.membersList && proj.membersList.length > 3 && (
                        <div className="w-[22px] h-[22px] rounded-full bg-slate-200 dark:bg-slate-700 border-[1.5px] border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 -ml-1.5">
                          +{proj.membersList.length - 3}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Action Menu */}
                  <td className="py-2 px-3 text-right relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : proj._id);
                      }}
                      className="bg-transparent border-none text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-md cursor-pointer inline-flex items-center justify-center transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {isMenuOpen && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute right-5 top-10 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-50 min-w-[170px] text-left"
                      >
                        <div
                          onClick={() => {
                            onSelectProject && onSelectProject(proj);
                            setActiveMenuId(null);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded cursor-pointer transition-colors"
                        >
                          <Eye size={14} className="text-blue-500" /> View Details
                        </div>

                        <div
                          onClick={() => {
                            onExtendDeadline && onExtendDeadline(proj);
                            setActiveMenuId(null);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded cursor-pointer transition-colors"
                        >
                          <Calendar size={14} className="text-blue-600 dark:text-blue-400" /> Extend Deadline
                        </div>

                        {/* Submit for Completion */}
                        {proj.status !== 'completed' && proj.status !== 'under_review' && (
                          <div
                            onClick={async () => {
                              await submitProjectForCompletion(proj._id);
                              setActiveMenuId(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded cursor-pointer transition-colors"
                          >
                            <CheckCircle2 size={14} className="text-purple-600 dark:text-purple-400" /> Submit for Sign-Off
                          </div>
                        )}

                        {/* Admin 1-Click Final Approval */}
                        {canManageApprovals && (proj.status === 'under_review' || (proj.status === 'completed' && !proj.finalApproved)) && (
                          <div
                            onClick={async () => {
                              await approveProjectCompletion(proj._id);
                              setActiveMenuId(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40 rounded cursor-pointer transition-colors"
                          >
                            <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" /> Final Approve & Complete
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
                            className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded cursor-pointer transition-colors"
                          >
                            <span>🔄 Reopen Project</span>
                          </div>
                        )}

                        <div
                          onClick={(e) => handleDelete(proj._id, e)}
                          className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded cursor-pointer transition-colors"
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
