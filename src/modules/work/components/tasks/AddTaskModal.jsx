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
import { isHRorAdmin, isProjectVisibleToUser } from '../../../../shared/utils/permissionUtils';
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
  { id: 'low', label: 'Low', activeClass: 'border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { id: 'medium', label: 'Medium', activeClass: 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400' },
  { id: 'high', label: 'High', activeClass: 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400' },
  { id: 'urgent', label: 'Urgent 🔥', activeClass: 'border-red-500 bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400' }
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

  // Filter projects visible to this employee (unless admin/privileged)
  const userProjects = React.useMemo(() => {
    if (isPrivileged) return projects || [];
    return (projects || []).filter(p => isProjectVisibleToUser(p, currentUser));
  }, [projects, isPrivileged, currentUser]);

  const getInitialFormData = () => {
    // Default assignee to currentUser so user can easily self-assign or pick any team member
    const defaultEmpId = currentUser?._id || (employees && employees[0]?._id) || '';
    return {
      title: '',
      category: 'General',
      projectId: initialProjectId || (userProjects && userProjects[0]?._id) || '',
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
    initialProjectId ? 'existing' : (userProjects && userProjects.length > 0 ? 'existing' : 'none')
  );

  // 'team' (Company/Team Task, default for all tasks) | 'personal' (Private to this employee)
  const [taskScope, setTaskScope] = useState('team');

  const [formData, setFormData] = useState(getInitialFormData);

  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFormData(getInitialFormData());
    setProjectMode(initialProjectId ? 'existing' : (userProjects && userProjects.length > 0 ? 'existing' : 'none'));
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
        const selectedProject = userProjects.find(p => p._id === formData.projectId) || userProjects[0];
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
            isCompanyWide: false,
            visibility: 'members',
            visibleToIds: [currentUser?._id].filter(Boolean),
            teamIds: [currentUser?._id].filter(Boolean),
            members: [{ _id: currentUser?._id, name: currentUser?.name, avatar: currentUser?.avatar, role: currentUser?.role }]
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[580px] max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900 shrink-0">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 m-0">
                Create New Task
              </h2>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 m-0">
                Assign work under a project or create a standalone task
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            aria-label="Close modal"
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 p-1.5 rounded-lg flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-3.5">
          {/* Task Type & Visibility Privacy Scope */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Task Type & Visibility
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setTaskScope('personal');
                  handleAssignToMeOnly();
                  setFormData(prev => ({ ...prev, isPersonal: true }));
                }}
                className={`py-[7px] px-2 rounded-md border-0 text-[11.5px] font-bold cursor-pointer flex items-center justify-center gap-[5px] transition-all ${
                  taskScope === 'personal'
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
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
                className={`py-[7px] px-2 rounded-md border-0 text-[11.5px] font-bold cursor-pointer flex items-center justify-center gap-[5px] transition-all ${
                  taskScope === 'team'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Users size={13} />
                <span>🏢 Team / Project Task</span>
              </button>
            </div>

            {taskScope === 'personal' ? (
              <p className="mt-[5px] mb-0 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                🔒 <strong>Personal Routine Work:</strong> Visible strictly on your dashboard and personal task list. Admin and other employees won't see your personal routine to-dos to keep the workspace clean and uncluttered.
              </p>
            ) : (
              <p className="mt-[5px] mb-0 text-[11px] text-sky-700 dark:text-sky-400 font-medium">
                🌐 <strong>Team Deliverable:</strong> Shared with assigned members and company workspace to track deliverables and project milestones.
              </p>
            )}
          </div>

          {/* 1. Project Assignment Segmented Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Project Association
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setProjectMode('existing')}
                className={`py-[7px] px-2 rounded-md border-0 text-[11.5px] font-bold cursor-pointer flex items-center justify-center gap-1 transition-all ${
                  projectMode === 'existing'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <FolderGit2 size={13} /> Project Task
              </button>

              <button
                type="button"
                onClick={() => setProjectMode('none')}
                className={`py-[7px] px-2 rounded-md border-0 text-[11.5px] font-bold cursor-pointer flex items-center justify-center gap-1 transition-all ${
                  projectMode === 'none'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Zap size={13} /> No Project
              </button>

              <button
                type="button"
                onClick={() => setProjectMode('new')}
                className={`py-[7px] px-2 rounded-md border-0 text-[11.5px] font-bold cursor-pointer flex items-center justify-center gap-1 transition-all ${
                  projectMode === 'new'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Plus size={13} /> New Project
              </button>
            </div>

            {/* Sub-inputs based on mode */}
            {projectMode === 'existing' && (
              <div className="mt-2">
                <select
                  value={formData.projectId}
                  onChange={(e) => handleChange('projectId', e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800"
                >
                  {userProjects && userProjects.length > 0 ? (
                    userProjects.map(p => (
                      <option key={p._id} value={p._id}>
                        [{p.projectCode || 'PRJ'}] {p.name} {p.client ? `(${p.client})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="">No visible projects found — creating as standalone</option>
                  )}
                </select>
              </div>
            )}

            {projectMode === 'new' && (
              <div className="mt-2">
                <input
                  type="text"
                  value={formData.customProjectName}
                  onChange={(e) => handleChange('customProjectName', e.target.value)}
                  placeholder="Enter project name (e.g. Indore Smart Portal, CRM Rollout)..."
                  className="w-full px-2.5 py-2 rounded-lg border border-sky-600 dark:border-sky-500 text-[12.5px] text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800"
                />
              </div>
            )}

            {projectMode === 'none' && (
              <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-md border border-dashed border-slate-300 dark:border-slate-700">
                ⚡ Independent task without project dependencies (directly tracked under General Work).
              </div>
            )}
          </div>

          {/* 2. Task Title */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Design Indore Metro App UI, Prepare Client Presentation, API Integration"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[13.5px] font-semibold text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 focus:border-sky-500 transition-colors"
            />
          </div>

          {/* 3. Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 4. Assignee Selection */}
          {taskScope === 'personal' ? (
            <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-[10px] px-3.5 py-3 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={currentUser?.name}
                  className="w-8 h-8 rounded-full object-cover border border-purple-400"
                />
                <div>
                  <div className="text-[13px] font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <span>{currentUser?.name || 'You'}</span>
                    <span className="text-[10.5px] px-1.5 py-[1px] rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-extrabold">
                      Self Assigned
                    </span>
                  </div>
                  <div className="text-[11px] text-purple-700 dark:text-purple-400">
                    {currentUser?.role || 'Team Member'} • Private Routine Task (Visible only to you)
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-bold text-purple-600 dark:text-purple-300 bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Check size={12} strokeWidth={3} />
                Private
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-[10px] px-3.5 py-3 flex flex-col gap-2">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-sky-600 dark:text-sky-400" />
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 m-0">
                    Assign To (1 Person Responsible)
                  </label>
                  <span className={`text-[10px] font-bold px-1.5 py-[1px] rounded-full ${
                    formData.assignedToId
                      ? 'text-sky-600 bg-sky-100 dark:bg-sky-950/60 dark:text-sky-400'
                      : 'text-red-600 bg-red-100 dark:bg-red-950/60 dark:text-red-400'
                  }`}>
                    {formData.assignedToId ? '1 Assigned' : 'Required *'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {currentUser && (
                    <button
                      type="button"
                      onClick={handleAssignToMeOnly}
                      className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 text-[10.5px] font-bold cursor-pointer px-[7px] py-0.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700/60"
                    >
                      Assign to Me
                    </button>
                  )}
                  {formData.assignedToId && (
                    <button
                      type="button"
                      onClick={handleClearAssignee}
                      className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-rose-600 dark:text-rose-400 text-[10.5px] font-bold cursor-pointer px-[7px] py-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/40"
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
                  <div className="py-0.5">
                    <span className="inline-flex items-center gap-1.5 py-[3px] pr-2.5 pl-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800 rounded-full text-[11.5px] font-bold text-blue-800 dark:text-blue-300 shadow-sm">
                      <img
                        src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={emp.name}
                        className="w-[18px] h-[18px] rounded-full object-cover"
                      />
                      <span>{emp.name} ({emp.role || 'Member'})</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearAssignee();
                        }}
                        className="border-0 bg-transparent text-blue-500 hover:text-blue-700 dark:text-blue-400 cursor-pointer px-0.5 flex items-center"
                        title="Remove assignee"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  </div>
                );
              })()}

              {/* Search Input for Employees */}
              <div className="relative">
                <Search size={13} className="text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search employee by name, role or department..."
                  className="w-full py-[5px] pr-2 pl-[26px] rounded-md border border-slate-300 dark:border-slate-700 text-[11.5px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Scrollable Members List */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-1.5 max-h-[135px] overflow-y-auto pr-0.5">
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
                        className={`flex items-center gap-1.5 px-[7px] py-[5px] rounded-md cursor-pointer transition-all border ${
                          isSelected
                            ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/50'
                            : 'border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        {/* Radio Selection Indicator */}
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 bg-white dark:bg-slate-900 border ${
                          isSelected ? 'border-2 border-sky-600' : 'border border-slate-300 dark:border-slate-600'
                        }`}>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                          )}
                        </div>

                        <img
                          src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={emp.name}
                          className="w-[22px] h-[22px] rounded-full object-cover shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <div className={`text-[11px] whitespace-nowrap overflow-hidden text-ellipsis ${
                            isSelected ? 'font-bold text-sky-700 dark:text-sky-300' : 'font-semibold text-slate-900 dark:text-slate-100'
                          }`}>
                            {emp.name} {isMe && '(You)'}
                          </div>
                          <div className="text-[9.5px] text-slate-500 dark:text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">
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
          <div className="grid grid-cols-[1.2fr_1fr] gap-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
                  className={`border-0 text-[10px] font-bold cursor-pointer px-[7px] py-0.5 rounded inline-flex items-center gap-1 transition-colors ${
                    formData.isUntimed
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                  title="Toggle between fixed estimated time or open/untimed normal task"
                >
                  <Zap size={11} className={formData.isUntimed ? 'text-emerald-600' : 'text-slate-500'} />
                  {formData.isUntimed ? 'Normal Task (No Time)' : 'Normal Task (Untimed)'}
                </button>
              </div>

              {formData.isUntimed ? (
                <div className="flex items-center justify-between px-2.5 py-[7px] rounded-md bg-emerald-50/60 dark:bg-emerald-950/40 border border-dashed border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                  <div className="flex items-center gap-[5px]">
                    <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <span>⚡ <strong>Normal Task:</strong> No fixed time limit.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isUntimed: false, estimatedHours: 4, hasNoDueDate: false }))}
                    className="border-0 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold cursor-pointer px-1.5 py-0.5 rounded hover:bg-emerald-200 transition-colors"
                  >
                    Add Hours
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0.25"
                    step="0.5"
                    max="100"
                    value={formData.estimatedHours}
                    onChange={(e) => handleChange('estimatedHours', parseFloat(e.target.value) || 1)}
                    className="w-16 px-2 py-[7px] rounded-md border border-slate-300 dark:border-slate-700 text-[12.5px] font-bold text-slate-900 dark:text-slate-100 outline-none text-center bg-white dark:bg-slate-800"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">hours</span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isUntimed: true, estimatedHours: 0, hasNoDueDate: true }))}
                    className="px-1.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-[10px] font-bold cursor-pointer hover:bg-slate-100"
                    title="No fixed time limit / Normal Task"
                  >
                    ⚡ None
                  </button>
                  {HOUR_PRESETS.map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, estimatedHours: h, isUntimed: false }))}
                      className={`px-1.5 py-1 rounded text-[10.5px] font-bold cursor-pointer transition-colors border ${
                        (!formData.isUntimed && formData.estimatedHours === h)
                          ? 'border-sky-600 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <div className="flex gap-1">
                {PRIORITIES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleChange('priority', p.id)}
                    className={`flex-1 py-1.5 px-0.5 rounded-md text-[11px] font-bold cursor-pointer text-center transition-all border ${
                      formData.priority === p.id
                        ? p.activeClass
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Start Date & Due Date */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full px-2.5 py-[7px] rounded-md border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Due Date
                </label>
                <div className="flex gap-1 items-center">
                  <button
                    type="button"
                    onClick={() => handleChange('dueDate', getTodayStr())}
                    className="text-[10px] text-sky-600 dark:text-sky-400 border-0 bg-transparent cursor-pointer font-semibold"
                  >
                    Today
                  </button>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleChange('dueDate', getDateOffsetStr(1))}
                    className="text-[10px] text-sky-600 dark:text-sky-400 border-0 bg-transparent cursor-pointer font-semibold"
                  >
                    Tomorrow
                  </button>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleChange('dueDate', getDateOffsetStr(7))}
                    className="text-[10px] text-sky-600 dark:text-sky-400 border-0 bg-transparent cursor-pointer font-semibold"
                  >
                    +7d
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className="w-full px-2.5 py-[7px] rounded-md border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* 6. Description / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add key deliverables, task instructions, or links..."
              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] leading-snug text-slate-900 dark:text-slate-100 outline-none resize-none font-sans bg-white dark:bg-slate-800 focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={handleClose}
            className="px-3.5 py-[7px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12.5px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave(false)}
            className="px-[18px] py-2 rounded-md border-0 bg-sky-600 hover:bg-sky-700 text-white text-[12.5px] font-bold cursor-pointer shadow-sm flex items-center gap-[5px] transition-colors disabled:opacity-50"
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
