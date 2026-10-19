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
  const { projects, projectFilter, setProjectFilter, loading } = useWork();
  const { currentUser } = useAuth();

  const isPrivileged = React.useMemo(() => isHRorAdmin(currentUser), [currentUser]);
  const perms = React.useMemo(() => getUserModulePermissions(currentUser), [currentUser]);
  // Any team member or employee can create projects and select who can see it
  const canAddProject = true;
  const canViewAllProjects = isPrivileged || perms?.viewAllProjects;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [extendModalProject, setExtendModalProject] = useState(null);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b', marginBottom: '1px' }}>
            <span>Work</span>
            <span>•</span>
            <span style={{ color: '#0f172a', fontWeight: '600' }}>Projects</span>
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Projects Management
          </h1>
        </div>

        {canAddProject && (
          <button
            id="btn-add-project"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
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
            Add Project
          </button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FolderGit2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Total Projects</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', lineHeight: '1.1' }}>
              {totalProjects}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>In Progress</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a', lineHeight: '1.1' }}>
              {inProgressCount}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: '#eff6ff',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Completed</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb', lineHeight: '1.1' }}>
              {completedCount}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: '#fef3c7',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertCircle size={16} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Under Review / Hold</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706', lineHeight: '1.1' }}>
              {reviewCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          padding: '4px 10px',
          minWidth: '220px',
          flex: '1',
          height: '30px'
        }}>
          <Search size={14} color="#64748b" />
          <input
            type="text"
            placeholder="Search projects by name, code, client..."
            value={projectFilter.search}
            onChange={e => setProjectFilter(prev => ({ ...prev, search: e.target.value }))}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <select
            value={projectFilter.status}
            onChange={e => setProjectFilter(prev => ({ ...prev, status: e.target.value }))}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#334155',
              outline: 'none',
              height: '30px'
            }}
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
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#334155',
              outline: 'none',
              height: '30px'
            }}
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
