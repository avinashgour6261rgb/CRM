/**
 * @file AddTaskModal.jsx
 * @description Clean, intuitive, and modern task creation modal.
 * Allows assigning tasks linked to an existing project, creating a new project,
 * or creating an independent standalone task without a project.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  FolderGit2,
  User,
  Users,
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  Sparkles,
  Zap,
  Tag,
  Search,
  Check
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useHR } from '../../../hr/context/HRContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { isHRorAdmin } from '../../../../shared/utils/permissionUtils';
import { getCollection, KEYS } from '../../../../shared/services/storageService';

const CATEGORIES = [
  'General',
  'Web Development',
  'UI/UX Design',
  'Digital Marketing',
  'SEO & Growth',
  'DevOps & Cloud',
  'Client Servicing',
  'QA & Testing'
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#64748b', bg: '#f1f5f9' },
  { id: 'medium', label: 'Medium', color: '#2563eb', bg: '#eff6ff' },
  { id: 'high', label: 'High', color: '#ea580c', bg: '#fff7ed' },
  { id: 'urgent', label: 'Urgent 🔥', color: '#dc2626', bg: '#fef2f2' }
];

const HOUR_PRESETS = [1, 2, 4, 6, 8];

export const AddTaskModal = ({ isOpen, onClose, initialProjectId = null, onTaskCreated = null }) => {
  const { createTask, projects, employees: workEmployees, currentUser: workUser, createProject } = useWork();
  const { employees: hrEmployees, currentUser: hrUser } = useHR();
  const { addToast } = useToast();

  const currentUser = workUser || hrUser;

  const employees = React.useMemo(() => {
    if (workEmployees && workEmployees.length > 0) return workEmployees;
    if (hrEmployees && hrEmployees.length > 0) return hrEmployees;
    return getCollection(KEYS.EMPLOYEES) || [];
  }, [workEmployees, hrEmployees]);

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDateOffsetStr = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const isPrivileged = isHRorAdmin(currentUser);

  const getInitialFormData = () => {
    // Default assignee to currentUser so user can easily self-assign or pick any team member
    const defaultEmpId = currentUser?._id || (employees && employees[0]?._id) || '';
    return {
      title: '',
      category: 'General',
      projectId: initialProjectId || (projects && projects[0]?._id) || '',
      customProjectName: '',
      startDate: getTodayStr(),
      dueDate: getTodayStr(),
      assignedToId: defaultEmpId,
      assignedToIds: defaultEmpId ? [defaultEmpId] : [],
      priority: 'medium',
      estimatedHours: 4,
      isUntimed: false,
      hasNoDueDate: false,
      description: '',
      isPersonal: false
    };
  };

  // 'none' (Standalone Task) | 'existing' (Company Project) | 'new' (Create Project on the fly)
  const [projectMode, setProjectMode] = useState(
    initialProjectId ? 'existing' : (projects && projects.length > 0 ? 'existing' : 'none')
  );

  // 'team' (Company/Team Task, default for all tasks) | 'personal' (Private to this employee)
  const [taskScope, setTaskScope] = useState('team');

  const [formData, setFormData] = useState(getInitialFormData);

  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFormData(getInitialFormData());
    setProjectMode(initialProjectId ? 'existing' : (projects && projects.length > 0 ? 'existing' : 'none'));
    setTaskScope('team');
    setMemberSearchQuery('');
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    if (onClose) onClose();
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, initialProjectId]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectAssignee = (empId) => {
    const idStr = String(empId || '');
    setFormData(prev => ({
      ...prev,
      assignedToId: String(prev.assignedToId || '') === idStr ? '' : idStr,
      assignedToIds: String(prev.assignedToId || '') === idStr ? [] : [idStr]
    }));
  };

  const handleAssignToMeOnly = () => {
    const myId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || '');
    if (!myId) return;
    setFormData(prev => ({
      ...prev,
      assignedToId: myId,
      assignedToIds: [myId]
    }));
  };

  const handleClearAssignee = () => {
    setFormData(prev => ({
      ...prev,
      assignedToId: '',
      assignedToIds: []
    }));
  };

  const handleSave = async (andAddMore = false) => {
    if (!formData.title.trim()) {
      addToast('Please enter a task title', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let finalProjectId = '';
      let finalProjectName = 'General Work';
      let finalProjectCode = 'GEN';

      if (projectMode === 'existing') {
        const selectedProject = projects.find(p => p._id === formData.projectId) || projects[0];
        if (selectedProject) {
          finalProjectId = selectedProject._id;
          finalProjectName = selectedProject.name;
          finalProjectCode = selectedProject.projectCode || 'PRJ';
        }
      } else if (projectMode === 'new') {
        const customName = formData.customProjectName.trim() || 'New Company Project';
        finalProjectName = customName;
        finalProjectCode = customName.substring(0, 3).toUpperCase();
        try {
          const newProj = await createProject({
            name: customName,
            projectCode: `PRJ-${finalProjectCode}`,
            client: 'Internal / Company Project',
            category: formData.category,
            department: 'Engineering',
            startDate: formData.startDate,
            deadline: formData.dueDate,
            budget: 0,
            summary: `Created with task: ${formData.title.trim()}`,
            status: 'in_progress',
            members: employees.map(e => ({ _id: e._id, name: e.name, avatar: e.avatar, role: e.role }))
          });
          if (newProj && newProj._id) {
            finalProjectId = newProj._id;
            finalProjectCode = newProj.projectCode || finalProjectCode;
          }
        } catch (e) {
          console.warn('Could not auto-create project, continuing with metadata:', e);
        }
      } else {
        // Standalone Task (No Project)
        finalProjectId = '';
        finalProjectName = 'Standalone / General';
        finalProjectCode = 'TASK';
      }

      // Resolve selected assignees
      const validEmpList = employees || [];
      const isPersonalTask = taskScope === 'personal';
      let primaryAssignee = null;

      if (isPersonalTask) {
        primaryAssignee = validEmpList.find(e =>
          String(e._id) === String(currentUser?._id) ||
          String(e.id) === String(currentUser?._id) ||
          String(e.employeeCode) === String(currentUser?.employeeCode)
        ) || {
          _id: currentUser?._id || 'emp_self',
          id: currentUser?._id || 'emp_self',
          name: currentUser?.name || 'Self',
          avatar: currentUser?.avatar || '',
          role: currentUser?.role || 'Team Member',
          email: currentUser?.email || '',
          employeeCode: currentUser?.employeeCode || ''
        };
      } else {
        const targetId = formData.assignedToId || (formData.assignedToIds && formData.assignedToIds[0]);
        if (!targetId) {
          addToast('Please select 1 person to assign this task to', 'error');
          setSubmitting(false);
          return;
        }

        primaryAssignee = validEmpList.find(e =>
          String(e._id) === String(targetId) ||
          String(e.id) === String(targetId) ||
          String(e.employeeCode) === String(targetId) ||
          (e.name && e.name.toLowerCase() === String(targetId).toLowerCase())
        );

        if (!primaryAssignee && currentUser && (
          String(currentUser._id) === String(targetId) ||
          String(currentUser.id) === String(targetId) ||
          String(currentUser.employeeCode) === String(targetId) ||
          (currentUser.name && currentUser.name.toLowerCase() === String(targetId).toLowerCase())
        )) {
          primaryAssignee = currentUser;
        }

        if (!primaryAssignee) {
          primaryAssignee = {
            _id: String(targetId),
            id: String(targetId),
            name: 'Assigned Member',
            avatar: '',
            role: 'Team Member',
            employeeCode: String(targetId)
          };
        }
      }

      const assigneeId = String(primaryAssignee._id || primaryAssignee.id || primaryAssignee.employeeCode || '');
      const assigneeCode = String(primaryAssignee.employeeCode || '');
      const currentUserId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || 'admin');
      const currentUserCode = String(currentUser?.employeeCode || '');
      const allAssigneeIds = [assigneeId, assigneeCode].filter(Boolean);

      const createdTask = await createTask({
        title: formData.title.trim(),
        category: formData.category,
        projectId: finalProjectId,
        projectName: finalProjectName,
        projectCode: finalProjectCode,
        startDate: formData.startDate,
        dueDate: formData.hasNoDueDate ? '' : formData.dueDate,
        hasNoDueDate: !!(formData.hasNoDueDate || formData.isUntimed),
        isUntimed: !!formData.isUntimed,
        isPersonal: isPersonalTask,
        isPrivate: isPersonalTask,
        priority: formData.priority,
        estimatedHours: formData.isUntimed ? 0 : (Number(formData.estimatedHours) || 0),
        description: formData.description.trim(),
        // 1 Task = 1 Person (Single + Multi-Assignee Architecture)
        assignedTo: primaryAssignee._id || primaryAssignee.id || assigneeId,
        assignedToId: assigneeId,
        assignedToCode: assigneeCode,
        assignedToName: primaryAssignee.name,
        assignedToEmail: primaryAssignee.email || '',
        assignedToAvatar: primaryAssignee.avatar || '',
        assignedToRole: primaryAssignee.role || 'Team Member',
        assignedToIds: allAssigneeIds,
        assignees: [{
          _id: assigneeId,
          id: assigneeId,
          name: primaryAssignee.name,
          email: primaryAssignee.email || '',
          avatar: primaryAssignee.avatar || '',
          role: primaryAssignee.role || 'Team Member',
          employeeCode: assigneeCode
        }],
        assignedBy: currentUser?.name || 'Administrator',
        assignedById: currentUserId,
        assignedByCode: currentUserCode,
        assignedByAvatar: currentUser?.avatar || '',
        assignedByRole: currentUser?.role || 'Administrator',
        status: 'incomplete',
        progress: 0,
        hoursLogged: 0,
        hoursLoggedText: '00h 00m',
        timerRunning: false,
        timerSeconds: 0
      });

      if (isPersonalTask) {
        addToast(`Personal task "${formData.title}" added to your queue! (Private)`, 'success');
      } else {
        addToast(`Task "${formData.title}" assigned to ${primaryAssignee?.name || 'team member'}!`, 'success');
      }

      if (onTaskCreated && createdTask) {
        try {
          onTaskCreated(createdTask);
        } catch (_) {}
      }

      if (andAddMore) {
        setFormData(prev => ({
          ...getInitialFormData(),
          projectId: prev.projectId,
          category: prev.category
        }));
      } else {
        handleClose();
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to create task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '580px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #bfdbfe'
            }}>
              <Plus size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Create New Task
              </h2>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                Assign work under a project or create a standalone task
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            aria-label="Close modal"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Task Type & Visibility Privacy Scope */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Task Type & Visibility
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              backgroundColor: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px'
            }}>
              <button
                type="button"
                onClick={() => {
                  setTaskScope('personal');
                  handleAssignToMeOnly();
                  setFormData(prev => ({ ...prev, isPersonal: true }));
                }}
                style={{
                  padding: '7px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: taskScope === 'personal' ? '#ffffff' : 'transparent',
                  color: taskScope === 'personal' ? '#7c3aed' : '#64748b',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: taskScope === 'personal' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <User size={13} />
                <span>👤 My Personal Task (Private)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTaskScope('team');
                  setFormData(prev => ({ ...prev, isPersonal: false }));
                }}
                style={{
                  padding: '7px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: taskScope === 'team' ? '#ffffff' : 'transparent',
                  color: taskScope === 'team' ? '#0284c7' : '#64748b',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: taskScope === 'team' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Users size={13} />
                <span>🏢 Team / Project Task</span>
              </button>
            </div>

            {taskScope === 'personal' ? (
              <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#7c3aed', fontWeight: '500' }}>
                🔒 <strong>Personal Routine Work:</strong> Visible strictly on your dashboard and personal task list. Admin and other employees won't see your personal routine to-dos to keep the workspace clean and uncluttered.
              </p>
            ) : (
              <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#0369a1', fontWeight: '500' }}>
                🌐 <strong>Team Deliverable:</strong> Shared with assigned members and company workspace to track deliverables and project milestones.
              </p>
            )}
          </div>

          {/* 1. Project Assignment Segmented Toggle */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Project Association
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              backgroundColor: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px'
            }}>
              <button
                type="button"
                onClick={() => setProjectMode('existing')}
                style={{
                  padding: '7px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: projectMode === 'existing' ? '#ffffff' : 'transparent',
                  color: projectMode === 'existing' ? '#0284c7' : '#64748b',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: projectMode === 'existing' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <FolderGit2 size={13} /> Project Task
              </button>

              <button
                type="button"
                onClick={() => setProjectMode('none')}
                style={{
                  padding: '7px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: projectMode === 'none' ? '#ffffff' : 'transparent',
                  color: projectMode === 'none' ? '#0284c7' : '#64748b',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: projectMode === 'none' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Zap size={13} /> No Project
              </button>

              <button
                type="button"
                onClick={() => setProjectMode('new')}
                style={{
                  padding: '7px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: projectMode === 'new' ? '#ffffff' : 'transparent',
                  color: projectMode === 'new' ? '#0284c7' : '#64748b',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: projectMode === 'new' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={13} /> New Project
              </button>
            </div>

            {/* Sub-inputs based on mode */}
            {projectMode === 'existing' && (
              <div style={{ marginTop: '8px' }}>
                <select
                  value={formData.projectId}
                  onChange={(e) => handleChange('projectId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    color: '#0f172a',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    colorScheme: 'light'
                  }}
                >
                  {projects && projects.length > 0 ? (
                    projects.map(p => (
                      <option key={p._id} value={p._id} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
                        [{p.projectCode || 'PRJ'}] {p.name} {p.client ? `(${p.client})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>No projects found — creating as standalone</option>
                  )}
                </select>
              </div>
            )}

            {projectMode === 'new' && (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  value={formData.customProjectName}
                  onChange={(e) => handleChange('customProjectName', e.target.value)}
                  placeholder="Enter project name (e.g. Indore Smart Portal, CRM Rollout)..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #0284c7',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>
            )}

            {projectMode === 'none' && (
              <div style={{
                marginTop: '6px',
                fontSize: '11px',
                color: '#64748b',
                backgroundColor: '#f8fafc',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px dashed #cbd5e1'
              }}>
                ⚡ Independent task without project dependencies (directly tracked under General Work).
              </div>
            )}
          </div>

          {/* 2. Task Title */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
              Task Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Design Indore Metro App UI, Prepare Client Presentation, API Integration"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13.5px',
                fontWeight: '600',
                color: '#0f172a',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* 3. Category */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '12.5px',
                color: '#0f172a',
                outline: 'none',
                backgroundColor: '#ffffff',
                colorScheme: 'light'
              }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 4. Assignee Selection */}
          {taskScope === 'personal' ? (
            <div style={{
              backgroundColor: '#faf5ff',
              border: '1.5px solid #e9d5ff',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={currentUser?.name}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #a855f7' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{currentUser?.name || 'You'}</span>
                    <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#f3e8ff', color: '#7c3aed', fontWeight: '800' }}>
                      Self Assigned
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#7e22ce' }}>
                    {currentUser?.role || 'Team Member'} • Private Routine Task (Visible only to you)
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#7c3aed',
                backgroundColor: '#ffffff',
                border: '1px solid #d8b4fe',
                padding: '4px 10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Check size={12} strokeWidth={3} />
                Private
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} color="#0284c7" />
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Assign To (1 Person Responsible)
                </label>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: formData.assignedToId ? '#0284c7' : '#ef4444',
                  backgroundColor: formData.assignedToId ? '#e0f2fe' : '#fee2e2',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {formData.assignedToId ? '1 Assigned' : 'Required *'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {currentUser && (
                  <button
                    type="button"
                    onClick={handleAssignToMeOnly}
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0284c7',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: '2px 7px',
                      borderRadius: '4px'
                    }}
                  >
                    Assign to Me
                  </button>
                )}
                {formData.assignedToId && (
                  <button
                    type="button"
                    onClick={handleClearAssignee}
                    style={{
                      border: '1px solid #fecaca',
                      background: '#fff1f2',
                      color: '#e11d48',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: '2px 7px',
                      borderRadius: '4px'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Selected Assignee Chip */}
            {formData.assignedToId && (() => {
              const emp = (employees || []).find(e =>
                String(e._id) === String(formData.assignedToId) ||
                String(e.id) === String(formData.assignedToId) ||
                String(e.employeeCode) === String(formData.assignedToId)
              ) || (currentUser && (
                String(currentUser._id) === String(formData.assignedToId) ||
                String(currentUser.id) === String(formData.assignedToId) ||
                String(currentUser.employeeCode) === String(formData.assignedToId)
              ) ? currentUser : null);
              if (!emp) return null;
              return (
                <div style={{ padding: '2px 0' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px 3px 6px',
                      backgroundColor: '#eff6ff',
                      border: '1.5px solid #93c5fd',
                      borderRadius: '20px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: '#1e40af',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}
                  >
                    <img
                      src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={emp.name}
                      style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span>{emp.name} ({emp.role || 'Member'})</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearAssignee();
                      }}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        padding: '0 2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Remove assignee"
                    >
                      <X size={12} />
                    </button>
                  </span>
                </div>
              );
            })()}

            {/* Search Input for Employees */}
            <div style={{ position: 'relative' }}>
              <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '8px' }} />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search employee by name, role or department..."
                style={{
                  width: '100%',
                  padding: '5px 8px 5px 26px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11.5px',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            {/* Scrollable Members List */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '6px',
              maxHeight: '135px',
              overflowY: 'auto',
              paddingRight: '2px'
            }}>
              {(employees || [])
                .filter(emp => {
                  if (!memberSearchQuery) return true;
                  const q = memberSearchQuery.toLowerCase();
                  return (emp.name && emp.name.toLowerCase().includes(q)) ||
                    (emp.role && emp.role.toLowerCase().includes(q)) ||
                    (emp.department && emp.department.toLowerCase().includes(q));
                })
                .map(emp => {
                  const empId = String(emp._id || emp.id || emp.employeeCode || '');
                  const isSelected = String(formData.assignedToId || '') === empId ||
                    (emp.employeeCode && String(formData.assignedToId || '') === String(emp.employeeCode)) ||
                    (emp._id && String(formData.assignedToId || '') === String(emp._id));
                  const isMe = empId === String(currentUser?._id || currentUser?.id || currentUser?.employeeCode);
                  return (
                    <div
                      key={empId}
                      onClick={() => selectAssignee(empId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 7px',
                        borderRadius: '6px',
                        border: isSelected ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Radio Selection Indicator */}
                      <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: isSelected ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#ffffff',
                        flexShrink: 0
                      }}>
                        {isSelected && (
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                        )}
                      </div>

                      <img
                        src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={emp.name}
                        style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: isSelected ? '700' : '600',
                          color: isSelected ? '#0369a1' : '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {emp.name} {isMe && '(You)'}
                        </div>
                        <div style={{
                          fontSize: '9.5px',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {emp.role || 'Member'}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          )}

          {/* 4. Estimated Time & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                  Duration / Time Limit
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      isUntimed: !prev.isUntimed,
                      estimatedHours: !prev.isUntimed ? 0 : (prev.estimatedHours || 4),
                      hasNoDueDate: !prev.isUntimed ? true : false
                    }));
                  }}
                  style={{
                    border: 'none',
                    background: formData.isUntimed ? '#ecfdf5' : '#f1f5f9',
                    color: formData.isUntimed ? '#059669' : '#64748b',
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Toggle between fixed estimated time or open/untimed normal task"
                >
                  <Zap size={11} color={formData.isUntimed ? '#059669' : '#64748b'} />
                  {formData.isUntimed ? 'Normal Task (No Time)' : 'Normal Task (Untimed)'}
                </button>
              </div>

              {formData.isUntimed ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#f0fdf4',
                  border: '1.5px dashed #86efac',
                  color: '#166534',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={13} color="#16a34a" />
                    <span>⚡ <strong>Normal Task:</strong> No fixed time limit.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isUntimed: false, estimatedHours: 4, hasNoDueDate: false }))}
                    style={{
                      border: 'none',
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: '10px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    Add Hours
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="0.25"
                    step="0.5"
                    max="100"
                    value={formData.estimatedHours}
                    onChange={(e) => handleChange('estimatedHours', parseFloat(e.target.value) || 1)}
                    style={{
                      width: '64px',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      color: '#0f172a',
                      outline: 'none',
                      textAlign: 'center'
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginRight: '4px' }}>hours</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isUntimed: true, estimatedHours: 0, hasNoDueDate: true }))}
                    style={{
                      padding: '4px 6px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '10px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                    title="No fixed time limit / Normal Task"
                  >
                    ⚡ None
                  </button>
                  {HOUR_PRESETS.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, estimatedHours: h, isUntimed: false }))}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '5px',
                        border: (!formData.isUntimed && formData.estimatedHours === h) ? '1px solid #0284c7' : '1px solid #e2e8f0',
                        backgroundColor: (!formData.isUntimed && formData.estimatedHours === h) ? '#e0f2fe' : '#ffffff',
                        color: (!formData.isUntimed && formData.estimatedHours === h) ? '#0284c7' : '#475569',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Priority
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {PRIORITIES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleChange('priority', p.id)}
                    style={{
                      flex: 1,
                      padding: '6px 2px',
                      borderRadius: '6px',
                      border: formData.priority === p.id ? `1.5px solid ${p.color}` : '1px solid #e2e8f0',
                      backgroundColor: formData.priority === p.id ? p.bg : '#ffffff',
                      color: formData.priority === p.id ? p.color : '#64748b',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Start Date & Due Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '12px',
                  color: '#0f172a',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                  Due Date
                </label>
                <div style={{ display: 'flex', gap: '3px' }}>
                  <button
                    type="button"
                    onClick={() => handleChange('dueDate', getTodayStr())}
                    style={{ fontSize: '10px', color: '#0284c7', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Today
                  </button>
                  <span style={{ fontSize: '10px', color: '#cbd5e1' }}>•</span>
                  <button
                    type="button"
                    onClick={() => handleChange('dueDate', getDateOffsetStr(1))}
                    style={{ fontSize: '10px', color: '#0284c7', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Tomorrow
                  </button>
                  <span style={{ fontSize: '10px', color: '#cbd5e1' }}>•</span>
                  <button
                    type="button"
                    onClick={() => handleChange('dueDate', getDateOffsetStr(7))}
                    style={{ fontSize: '10px', color: '#0284c7', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600' }}
                  >
                    +7d
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '12px',
                  color: '#0f172a',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* 6. Description / Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add key deliverables, task instructions, or links..."
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '12.5px',
                lineHeight: '1.4',
                color: '#0f172a',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
          backgroundColor: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '7px 14px',
              borderRadius: '7px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave(false)}
            style={{
              padding: '8px 18px',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(2, 132, 199, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <CheckCircle2 size={14} />
            {submitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;
