/**
 * @file ProjectsPage.jsx
 * @description Main Projects Management Page with overview stats, filters, table view, and modals.
 */

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Layers,
  FolderGit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { useWork } from '../context/WorkContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { isHRorAdmin, getUserModulePermissions, canManageProjects } from '../../../shared/utils/permissionUtils';
import { ProjectsTable } from '../components/projects/ProjectsTable';
import { AddProjectModal } from '../components/projects/AddProjectModal';
import { ProjectDetailModal } from '../components/projects/ProjectDetailModal';
import { ExtendDeadlineModal } from '../components/projects/ExtendDeadlineModal';

export const ProjectsPage = () => {
  const { projects, projectFilter, setProjectFilter, loading, approveProjectCompletion, reopenProject, submitProjectForCompletion } = useWork();
  const { currentUser } = useAuth();

  const isPrivileged = React.useMemo(() => isHRorAdmin(currentUser), [currentUser]);
  const perms = React.useMemo(() => getUserModulePermissions(currentUser), [currentUser]);
  // Any team member or employee can create projects and select who can see it
  const canAddProject = true;
  const canViewAllProjects = isPrivileged || perms?.viewAllProjects;

  const canManageApprovals = React.useMemo(() => {
    if (!currentUser) return false;
    return !!(
      currentUser.isAdmin ||
      currentUser.isSuperAdmin ||
      currentUser.systemRole === 'admin' ||
      currentUser.systemRole === 'hr' ||
      currentUser.role === 'Administrator' ||
      currentUser.role === 'HR Manager' ||
      currentUser.permissions?.canApproveProjects ||
      currentUser.permissions?.manageProjects
    );
  }, [currentUser]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [extendModalProject, setExtendModalProject] = useState(null);

  const pendingApprovalProjects = React.useMemo(() => {
    return (projects || []).filter(p =>
      p.status === 'under_review' ||
      (p.status === 'completed' && !p.finalApproved && p.completionSubmittedBy)
    );
  }, [projects]);

  const reopenedProjectsForMe = React.useMemo(() => {
    if (!currentUser) return [];
    const uId = String(currentUser._id || currentUser.id || '');
    const uCode = String(currentUser.employeeCode || '');
    return (projects || []).filter(p =>
      p.reopened && !p.finalApproved && (
        p.createdBy === uId || p.createdById === uId || p.createdBy === uCode ||
        (Array.isArray(p.visibleToIds) && (p.visibleToIds.includes(uId) || p.visibleToIds.includes(uCode))) ||
        (Array.isArray(p.members) && p.members.some(m => String(m._id || m.id) === uId || String(m.employeeCode) === uCode))
      )
    );
  }, [projects, currentUser]);

  // Scoped projects based on permissions & creator visibility
  const displayProjects = React.useMemo(() => {
    let list = projects || [];
    if (!canViewAllProjects && currentUser) {
      list = list.filter(p => {
        const uId = String(currentUser._id || currentUser.id || '');
        const uCode = String(currentUser.employeeCode || '');
        const uName = (currentUser.name || '').toLowerCase().trim();
        const uEmail = (currentUser.email || '').toLowerCase().trim();

        // 1. Company-wide projects are visible to all employees
        if (p.isCompanyWide === true || p.visibility === 'all') return true;

        // 2. Project Creator ALWAYS sees their own project!
        const isCreator = (
          (p.createdBy && String(p.createdBy) === uId) ||
          (p.createdById && String(p.createdById) === uId) ||
          (p.createdBy && String(p.createdBy) === uCode) ||
          (p.creatorName && p.creatorName.toLowerCase().trim() === uName) ||
          (p.creatorEmail && p.creatorEmail.toLowerCase().trim() === uEmail)
        );
        if (isCreator) return true;

        // 3. User is in visibleToIds list
        if (Array.isArray(p.visibleToIds) && (p.visibleToIds.includes(uId) || p.visibleToIds.includes(uCode))) {
          return true;
        }

        // 4. User is an assigned member
        const isMember = (
          (Array.isArray(p.members) && p.members.some(m => String(m._id || m.id) === uId || String(m.employeeCode) === uCode || (m.email && m.email.toLowerCase() === uEmail))) ||
          (Array.isArray(p.membersList) && p.membersList.some(m => String(m._id || m.id) === uId || String(m.employeeCode) === uCode || (m.email && m.email.toLowerCase() === uEmail))) ||
          (Array.isArray(p.teamIds) && (p.teamIds.includes(uId) || p.teamIds.includes(uCode))) ||
          (Array.isArray(p.team) && p.team.some(m => String(m._id || m.id) === uId || (m.name && m.name.toLowerCase().trim() === uName)))
        );
        if (isMember) return true;

        // 5. Project lead
        const isLead = (p.leadId && (String(p.leadId) === uId || String(p.leadId) === uCode)) || (p.lead && p.lead.toLowerCase().trim() === uName);
        return isLead;
      });
    }

    if (projectFilter.status && projectFilter.status !== 'all') {
      list = list.filter(p => p.status === projectFilter.status);
    }
    if (projectFilter.department && projectFilter.department !== 'all') {
      list = list.filter(p => p.department?.toLowerCase() === projectFilter.department.toLowerCase());
    }
    if (projectFilter.search && projectFilter.search.trim()) {
      const q = projectFilter.search.toLowerCase().trim();
      list = list.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.projectCode && p.projectCode.toLowerCase().includes(q)) ||
        (p.client && p.client.toLowerCase().includes(q))
      );
    }
    return list;
  }, [projects, canViewAllProjects, currentUser, projectFilter]);

  // Statistics
  const totalProjects = displayProjects.length;
  const inProgressCount = displayProjects.filter(p => p.status === 'in_progress').length;
  const completedCount = displayProjects.filter(p => p.status === 'completed').length;
  const reviewCount = displayProjects.filter(p => p.status === 'under_review' || p.status === 'on_hold').length;

  return (
    <div className="flex flex-col gap-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-[#151e32] p-3 px-4 rounded-[10px] border border-slate-200 dark:border-[#243049] shadow-xs min-h-[68px] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Briefcase size={17} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-50 m-0 leading-tight">
              Projects Management
            </h1>
            <p className="m-0 mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
              Track enterprise client projects, milestones, deliverables, and progress.
            </p>
          </div>
        </div>

        {canAddProject && (
          <button
            id="btn-add-project"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-[5px] bg-sky-600 hover:bg-sky-700 text-white border-none px-3 rounded-md text-xs font-bold cursor-pointer shadow-sm h-[30px] transition-colors"
          >
            <Plus size={14} />
            <span>Add Project</span>
          </button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
        <div className="bg-white dark:bg-[#151e32] rounded-lg p-2.5 px-3.5 border border-slate-200 dark:border-[#243049] flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FolderGit2 size={16} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Projects</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50 leading-tight">
              {totalProjects}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#151e32] rounded-lg p-2.5 px-3.5 border border-slate-200 dark:border-[#243049] flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded-md bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">In Progress</div>
            <div className="text-lg font-extrabold text-green-600 dark:text-green-400 leading-tight">
              {inProgressCount}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#151e32] rounded-lg p-2.5 px-3.5 border border-slate-200 dark:border-[#243049] flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-500 flex items-center justify-center shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Completed</div>
            <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 leading-tight">
              {completedCount}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#151e32] rounded-lg p-2.5 px-3.5 border border-slate-200 dark:border-[#243049] flex items-center gap-2.5 shadow-xs">
          <div className="w-8 h-8 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle size={16} />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Under Review / Hold</div>
            <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 leading-tight">
              {reviewCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#151e32] rounded-lg p-2 px-3.5 border border-slate-200 dark:border-[#243049] flex items-center justify-between flex-wrap gap-2.5 shadow-xs">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md py-1 px-2.5 min-w-[220px] flex-1 h-[30px]">
          <Search size={14} className="text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by name, code, client..."
            value={projectFilter.search}
            onChange={e => setProjectFilter(prev => ({ ...prev, search: e.target.value }))}
            className="border-none bg-transparent outline-none text-xs w-full text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={projectFilter.status}
            onChange={e => setProjectFilter(prev => ({ ...prev, status: e.target.value }))}
            className="py-1 px-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 outline-none h-[30px] cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="in_progress">In Progress</option>
            <option value="not_started">Not Started</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="under_review">Under Review</option>
          </select>

          {/* Department Filter */}
          <select
            value={projectFilter.department}
            onChange={e => setProjectFilter(prev => ({ ...prev, department: e.target.value }))}
            className="py-1 px-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 outline-none h-[30px] cursor-pointer"
          >
            <option value="all">All Departments</option>
            <option value="Marketing & Growth">Marketing & Growth</option>
            <option value="Product Design">Product Design</option>
            <option value="Engineering">Engineering</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Infrastructure">Infrastructure</option>
          </select>
        </div>
      </div>

      {/* Reopened Projects Alert Banner for Assignees */}
      {reopenedProjectsForMe.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-800 rounded-[10px] p-2.5 px-3.5 flex items-center gap-2.5 shadow-xs">
          <span className="text-lg">⚠️</span>
          <div className="flex-1 text-xs text-orange-900 dark:text-orange-200">
            <strong>{reopenedProjectsForMe.length} Project{reopenedProjectsForMe.length > 1 ? 's' : ''} Reopened for Revisions: </strong>
            {reopenedProjectsForMe.map(p => `"${p.name}" (${p.reopenReason || 'Admin requested revisions'})`).join(', ')}
          </div>
        </div>
      )}

      {/* ── PROJECT COMPLETION REVIEW & APPROVALS QUEUE (ADMIN / MANAGER ACCESS) ── */}
      {canManageApprovals && pendingApprovalProjects.length > 0 && (
        <div className="bg-white dark:bg-[#151e32] rounded-xl border border-purple-300 dark:border-purple-800 shadow-md overflow-hidden">
          <div className="p-3 px-[18px] bg-purple-50/70 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <div>
                <h3 className="text-[13.5px] font-extrabold text-purple-900 dark:text-purple-200 m-0">
                  Project Completion Review Queue ({pendingApprovalProjects.length})
                </h3>
                <p className="text-[11px] text-purple-700 dark:text-purple-400 m-0 mt-px">
                  Submitted by team members for final sign-off. Approve to finalize or reopen if work remains.
                </p>
              </div>
            </div>
            <span className="py-[3px] px-2 rounded-full bg-purple-600 text-white text-[11px] font-bold">
              {pendingApprovalProjects.length} Pending Sign-Off
            </span>
          </div>

          <div className="p-3 px-4 flex flex-col gap-2.5">
            {pendingApprovalProjects.map(proj => (
              <div
                key={proj._id}
                className="flex items-center justify-between flex-wrap gap-3 p-2.5 px-3.5 rounded-lg bg-fuchsia-50/40 dark:bg-fuchsia-950/20 border border-fuchsia-200 dark:border-fuchsia-900/50"
              >
                <div className="flex items-center gap-2.5">
                  <span className="py-[3px] px-2 rounded-md bg-purple-600 text-white text-[11px] font-extrabold">
                    {proj.projectCode || 'PRJ'}
                  </span>
                  <div>
                    <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                      {proj.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Submitted by: <strong className="text-slate-600 dark:text-slate-300">{proj.completionSubmittedBy || proj.creatorName || 'Team Member'}</strong>
                      {proj.completionSubmittedAt && ` • ${new Date(proj.completionSubmittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                      {proj.department && ` • ${proj.department}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await approveProjectCompletion(proj._id);
                    }}
                    className="inline-flex items-center gap-[5px] py-1.5 px-3 rounded-md bg-green-600 hover:bg-green-700 text-white border-none text-[11.5px] font-bold cursor-pointer shadow-sm transition-colors"
                    title="Official Final Sign-off: Marks Project permanently Complete in database"
                  >
                    <CheckCircle2 size={13} />
                    <span>Final Approve & Complete</span>
                  </button>

                  <button
                    onClick={async () => {
                      const reason = window.prompt(`Enter reason to Reopen project "${proj.name}" (e.g. pending deliverables, missing documentation):`, 'Reopened by Admin for required revisions');
                      if (reason && reason.trim()) {
                        await reopenProject(proj._id, reason.trim());
                      }
                    }}
                    className="inline-flex items-center gap-[5px] py-1.5 px-3 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 text-[11.5px] font-bold cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
                    title="Send project back to in-progress with revision notes"
                  >
                    <span>🔄 Reopen / Send Back</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects Table */}
      <ProjectsTable
        projects={displayProjects}
        onSelectProject={(proj) => setSelectedProject(proj)}
        onExtendDeadline={(proj) => setExtendModalProject(proj)}
      />

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onExtendDeadline={(proj) => setExtendModalProject(proj)}
      />

      {/* Extend Deadline Modal */}
      <ExtendDeadlineModal
        isOpen={!!extendModalProject}
        project={extendModalProject}
        onClose={() => setExtendModalProject(null)}
        onSuccess={(updated) => {
          if (selectedProject && (selectedProject._id === updated._id || selectedProject.id === updated.id)) {
            setSelectedProject(updated);
          }
        }}
      />
    </div>
  );
};
