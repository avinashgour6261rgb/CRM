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
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  Sparkles,
  Zap,
  Tag
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useToast } from '../../../../shared/context/ToastContext';

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

export const AddTaskModal = ({ isOpen, onClose, initialProjectId = null }) => {
  const { createTask, projects, employees, currentUser, createProject } = useWork();
  const { addToast } = useToast();

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDateOffsetStr = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // 'none' (Standalone Task) | 'existing' (Company Project) | 'new' (Create Project on the fly)
  const [projectMode, setProjectMode] = useState(
    initialProjectId ? 'existing' : (projects && projects.length > 0 ? 'existing' : 'none')
  );

  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    projectId: initialProjectId || (projects && projects[0]?._id) || '',
    customProjectName: '',
    startDate: getTodayStr(),
    dueDate: getTodayStr(),
    assignedToId: currentUser?._id || (employees && employees[0]?._id) || '',
    priority: 'medium',
    estimatedHours: 4,
    description: ''
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialProjectId) {
      setProjectMode('existing');
      setFormData(prev => ({ ...prev, projectId: initialProjectId }));
    }
  }, [initialProjectId]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

      const selectedAssignee = employees.find(e => e._id === formData.assignedToId) || currentUser || employees[0];

      await createTask({
        title: formData.title.trim(),
        category: formData.category,
        projectId: finalProjectId,
        projectName: finalProjectName,
        projectCode: finalProjectCode,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        priority: formData.priority,
        estimatedHours: Number(formData.estimatedHours) || 0,
        description: formData.description.trim(),
        assignedTo: selectedAssignee?._id || null,
        assignedToId: selectedAssignee?._id || '',
        assignedToName: selectedAssignee?.name || 'Unassigned',
        assignedToEmail: selectedAssignee?.email || '',
        assignedToAvatar: selectedAssignee?.avatar || '',
        assignedToRole: selectedAssignee?.role || '',
        assignedBy: currentUser?.name || 'Admin',
        assignedById: currentUser?._id || 'emp_admin',
        assignedByAvatar: currentUser?.avatar || '',
        assignedByRole: currentUser?.role || 'Administrator',
        status: 'incomplete',
        progress: 0,
        hoursLogged: 0,
        hoursLoggedText: '00h 00m',
        timerRunning: false,
        timerSeconds: 0
      });

      addToast(`Task "${formData.title}" assigned successfully!`, 'success');

      if (andAddMore) {
        setFormData(prev => ({
          ...prev,
          title: '',
          description: '',
          estimatedHours: 4
        }));
      } else {
        onClose();
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
            onClick={onClose}
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
                <Plus size={13} /> + New Project
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
                    backgroundColor: '#ffffff'
                  }}
                >
                  {projects && projects.length > 0 ? (
                    projects.map(p => (
                      <option key={p._id} value={p._id}>
                        [{p.projectCode || 'PRJ'}] {p.name} {p.client ? `(${p.client})` : ''}
                      </option>
                    ))
                  ) : (
                    <option value="">No projects found — creating as standalone</option>
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
                  placeholder="Enter project name (e.g. Mobile App Redesign)..."
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
              placeholder="e.g. Design Homepage Banner, Fix Auth API, Prepare Presentation"
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

          {/* 3. Assignee & Category (2 Columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                  Assign To
                </label>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => handleChange('assignedToId', currentUser._id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#0284c7',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Assign to Me
                  </button>
                )}
              </div>
              <select
                value={formData.assignedToId}
                onChange={(e) => handleChange('assignedToId', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                {employees && employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} {emp._id === currentUser?._id ? '(You)' : `— ${emp.role || 'Member'}`}
                  </option>
                ))}
              </select>
            </div>

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
                  backgroundColor: '#ffffff'
                }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Estimated Time & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Estimated Duration
              </label>
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
                {HOUR_PRESETS.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleChange('estimatedHours', h)}
                    style={{
                      padding: '4px 6px',
                      borderRadius: '5px',
                      border: formData.estimatedHours === h ? '1px solid #0284c7' : '1px solid #e2e8f0',
                      backgroundColor: formData.estimatedHours === h ? '#e0f2fe' : '#ffffff',
                      color: formData.estimatedHours === h ? '#0284c7' : '#475569',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {h}h
                  </button>
                ))}
              </div>
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
            onClick={onClose}
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
