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
  MessageSquare,
  Trash2
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { confirmDialog } from '../../../../shared/context/ConfirmContext';

export const ProjectDetailModal = ({ project, onClose, onAddTaskForProject, onExtendDeadline }) => {
  const { tasks, approveProjectCompletion, reopenProject, submitProjectForCompletion, deleteProject } = useWork();
  const { currentUser } = useAuth();
  if (!project) return null;

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
  const isOverdue = project.deadline && !project.hasNoDeadline && project.deadline < todayStr && project.status !== 'completed';
  const overdueDays = isOverdue
    ? Math.max(1, Math.ceil((new Date(todayStr) - new Date(project.deadline)) / (1000 * 60 * 60 * 24)))
    : 0;

  const projectTasks = tasks.filter(t => t.projectId === project._id || t.projectCode === project.projectCode);
  const extensions = Array.isArray(project.deadlineExtensions) ? project.deadlineExtensions : [];

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-4 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[820px] max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className={`p-5 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between rounded-t-2xl ${isOverdue ? 'bg-red-50 dark:bg-red-950/40' : 'bg-slate-50 dark:bg-slate-800/50'
          }`}>
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md text-xs font-bold border border-blue-200 dark:border-blue-800">
                {project.projectCode}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs text-slate-600 dark:text-slate-300 font-medium">
                {project.category}
              </span>
              <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/40 rounded-md text-[11px] text-green-600 dark:text-green-400 font-bold border border-green-200 dark:border-green-800">
                👥 Team Project
              </span>
              {project.finalApproved && project.status === 'completed' && (
                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-md text-[11px] text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-300 dark:border-emerald-800">
                  ✅ Final Approved by {project.finalApprovedBy || 'Admin'}
                </span>
              )}
              {project.status === 'under_review' && (
                <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 rounded-md text-[11px] text-purple-700 dark:text-purple-300 font-extrabold border border-purple-200 dark:border-purple-800">
                  ⏳ Awaiting Final Sign-Off
                </span>
              )}
              {project.reopened && !project.finalApproved && (
                <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-950/40 rounded-md text-[11px] text-orange-700 dark:text-orange-300 font-extrabold border border-orange-200 dark:border-orange-800" title={project.reopenReason}>
                  ⚠️ Reopened ({project.reopenedBy || 'Admin'})
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white m-0">
              {project.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 flex flex-col gap-5">
          {/* Overdue Warning Alert Banner */}
          {isOverdue && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-900 rounded-xl p-3.5 px-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
                <div>
                  <div className="text-[13.5px] font-extrabold text-red-900 dark:text-red-200">
                    ⚠️ Project Deadline Passed ({overdueDays} day{overdueDays > 1 ? 's' : ''} overdue)!
                  </div>
                  <div className="text-xs text-red-700 dark:text-red-300">
                    Scheduled deadline was <strong>{project.deadline}</strong>. Has client approved an extension?
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onExtendDeadline && onExtendDeadline(project)}
                className="bg-red-600 hover:bg-red-700 text-white border-none px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-colors"
              >
                <Calendar size={14} />
                <span>Extend Deadline Now</span>
              </button>
            </div>
          )}

          {/* Summary / Description */}
          <div>
            <h4 className="text-[12.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 mt-0">
              Project Summary
            </h4>
            <p className="text-[13.5px] text-slate-600 dark:text-slate-300 leading-relaxed m-0 bg-slate-50 dark:bg-slate-800/40 p-3.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800">
              {project.summary || 'No detailed summary provided for this project.'}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11.5px] mb-1">
                <Building size={14} /> Client
              </div>
              <div className="text-[13.5px] font-bold text-slate-900 dark:text-white">{project.client}</div>
            </div>

            <div className={`p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border ${isOverdue ? 'border-red-300 dark:border-red-900' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11.5px]">
                  <Calendar size={14} /> Timeline
                </div>
                <button
                  type="button"
                  onClick={() => onExtendDeadline && onExtendDeadline(project)}
                  className="bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer hover:bg-blue-100 transition-colors"
                  title="Extend project deadline"
                >
                  + Extend
                </button>
              </div>
              <div className={`text-[13px] font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                {project.startDate} → {project.hasNoDeadline ? 'Ongoing' : project.deadline}
              </div>
              {project.hasDeadlineExtended && (
                <div className="text-[10.5px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                  🔄 Extended ({project.extensionCount || extensions.length || 1}x)
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11.5px] mb-1">
                <UserCheck size={14} /> Creator & Owner
              </div>
              <div className="text-[13.5px] font-bold text-slate-900 dark:text-white">
                {project.creatorName || 'Administrator'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {project.creatorRole || 'Executive'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11.5px] mb-1">
                <TrendingUp size={14} /> Progress
              </div>
              <div className="text-[13.5px] font-bold text-blue-600 dark:text-blue-400">{project.progress || 0}% Completed</div>
            </div>
          </div>

          {/* Deadline Extension & Client Audit History */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <History size={16} className="text-purple-600 dark:text-purple-400" />
                <h4 className="text-[13px] font-extrabold text-slate-900 dark:text-white m-0">
                  Deadline Extension & Client Audit History ({extensions.length})
                </h4>
              </div>

              <button
                type="button"
                onClick={() => onExtendDeadline && onExtendDeadline(project)}
                className="flex items-center gap-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-2.5 py-1 rounded-md text-[11.5px] font-bold cursor-pointer transition-colors"
              >
                <Calendar size={13} />
                <span>+ Request / Record Extension</span>
              </button>
            </div>

            {extensions.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {extensions.map((ext, idx) => (
                  <div
                    key={ext._id || idx}
                    className="p-3 px-3.5 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-md">
                          Extension #{extensions.length - idx}
                        </span>
                        <span className="text-[12.5px] font-bold text-slate-900 dark:text-white">
                          <span className="text-slate-400 line-through">{ext.previousDeadline}</span>
                          {' → '}
                          <span className="text-green-600 dark:text-green-400">{ext.newDeadline}</span>
                        </span>
                      </div>

                      <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {ext.reasonCategory || 'Client Extension'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-1.5">
                      💬 <strong>Reason:</strong> "{ext.reason}"
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between flex-wrap gap-1">
                      <span>👤 Extended by <strong>{ext.extendedByName}</strong> ({ext.extendedByRole})</span>
                      <span>🕒 {ext.extendedAt ? new Date(ext.extendedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 px-3.5 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2">
                <span>No timeline extensions recorded yet. All client-requested deadline extensions will be logged here with mandatory reasons.</span>
              </div>
            )}
          </div>

          {/* Assigned Members */}
          <div>
            <h4 className="text-[12.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 mt-0">
              Assigned Team Members ({project.membersList?.length || 0})
            </h4>
            <div className="flex gap-2.5 flex-wrap">
              {project.membersList && project.membersList.length > 0 ? (
                project.membersList.map((m, idx) => (
                  <div
                    key={m._id || idx}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs"
                  >
                    <img
                      src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={m.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{m.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{m.role}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">No members assigned to this project yet.</div>
              )}
            </div>
          </div>

          {/* Attached Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-[12.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider m-0">
                Tasks Linked to this Project ({projectTasks.length})
              </h4>
            </div>

            <div className="flex flex-col gap-1.5">
              {projectTasks.length > 0 ? (
                projectTasks.map(t => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between p-2.5 px-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11.5px] font-bold text-blue-600 dark:text-blue-400 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/40 rounded">
                        {t.taskCode}
                      </span>
                      <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                        {t.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                        👤 {t.assignedToName || 'Team'}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${t.status === 'completed'
                        ? 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400'
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                        }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 italic">
                  No tasks created yet for this project.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onExtendDeadline && onExtendDeadline(project)}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-3.5 py-2 rounded-lg text-[12.5px] font-bold cursor-pointer transition-colors"
          >
            <Calendar size={14} />
            <span>Extend Project Deadline</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Submit for Completion */}
            {project.status !== 'completed' && project.status !== 'under_review' && (
              <button
                type="button"
                onClick={async () => {
                  await submitProjectForCompletion(project._id);
                  onClose();
                }}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white border-none px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer shadow-md shadow-purple-600/30 transition-colors"
              >
                <CheckCircle2 size={13} />
                <span>Submit for Final Sign-Off</span>
              </button>
            )}

            {/* Admin 1-Click Final Approval */}
            {canManageApprovals && (project.status === 'under_review' || (project.status === 'completed' && !project.finalApproved)) && (
              <button
                type="button"
                onClick={async () => {
                  await approveProjectCompletion(project._id);
                  onClose();
                }}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white border-none px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer shadow-md shadow-green-600/30 transition-colors"
              >
                <CheckCircle2 size={13} />
                <span>Final Approve & Complete</span>
              </button>
            )}

            {/* Admin Reopen Action */}
            {canManageApprovals && (project.status === 'completed' || project.status === 'under_review') && (
              <button
                type="button"
                onClick={async () => {
                  const reason = window.prompt(`Enter reason to Reopen project "${project.name}":`, 'Reopened by Admin for required revisions');
                  if (reason && reason.trim()) {
                    await reopenProject(project._id, reason.trim());
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                <span>🔄 Reopen Project</span>
              </button>
            )}

            {canManageApprovals && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: 'Delete Project',
                    message: `Are you sure you want to permanently delete project "${project.name}" (#${project.projectCode || ''})? This will also remove all associated tasks and logs.`,
                    confirmText: 'Delete Project',
                    variant: 'danger'
                  });
                  if (ok) {
                    await deleteProject(project._id || project.projectCode);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                title="Permanently delete project"
              >
                <Trash2 size={13} />
                <span>Delete Project</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-4 py-2 rounded-lg text-[12.5px] font-semibold cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailModal;
