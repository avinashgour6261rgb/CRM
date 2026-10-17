/**
 * @file AddProjectModal.jsx
 * @description Clean, easy, and modern project creation modal.
 * Ensures projects are company-wide and immediately visible to all team members across all roles.
 */

import React, { useState } from 'react';
import {
  X,
  FolderGit2,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Plus,
  Building2,
  Globe
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useToast } from '../../../../shared/context/ToastContext';

const CATEGORIES = [
  'Web Development',
  'Digital Marketing',
  'UI/UX Design',
  'Mobile App Development',
  'Cloud Infrastructure',
  'SEO & Growth',
  'Internal / Ops'
];

const DEPARTMENTS = [
  'Engineering',
  'Marketing & Growth',
  'Product Design',
  'Sales & CRM',
  'Human Resources',
  'Executive Management'
];

export const AddProjectModal = ({ isOpen, onClose }) => {
  const { createProject, employees, projects } = useWork();
  const { addToast } = useToast();

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getOffsetMonthStr = (months = 2) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const defaultCode = `PRJ-${String((projects?.length || 0) + 1).padStart(3, '0')}`;

  const [formData, setFormData] = useState({
    name: '',
    projectCode: defaultCode,
    client: '',
    category: 'Web Development',
    department: 'Engineering',
    startDate: getTodayStr(),
    deadline: getOffsetMonthStr(2),
    budget: '50000',
    currency: 'INR',
    summary: '',
    isCompanyWide: true,
    selectedMembers: (employees || []).map(e => e._id)
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMember = (empId) => {
    setFormData(prev => {
      const exists = prev.selectedMembers.includes(empId);
      const next = exists
        ? prev.selectedMembers.filter(id => id !== empId)
        : [...prev.selectedMembers, empId];
      return {
        ...prev,
        selectedMembers: next,
        isCompanyWide: next.length === employees.length
      };
    });
  };

  const selectAllMembers = () => {
    setFormData(prev => ({
      ...prev,
      selectedMembers: employees.map(e => e._id),
      isCompanyWide: true
    }));
  };

  const clearAllMembers = () => {
    setFormData(prev => ({
      ...prev,
      selectedMembers: [],
      isCompanyWide: false
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Please enter a project name', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Determine project members: if company-wide or all selected, include all employees
      const memberList = formData.isCompanyWide || formData.selectedMembers.length === 0
        ? employees.map(e => ({ _id: e._id, name: e.name, avatar: e.avatar, role: e.role }))
        : employees
            .filter(e => formData.selectedMembers.includes(e._id))
            .map(e => ({ _id: e._id, name: e.name, avatar: e.avatar, role: e.role }));

      await createProject({
        name: formData.name.trim(),
        projectCode: (formData.projectCode || defaultCode).toUpperCase(),
        client: formData.client.trim() || 'Internal Company Project',
        category: formData.category,
        department: formData.department,
        startDate: formData.startDate,
        deadline: formData.deadline,
        budget: Number(formData.budget) || 0,
        currency: formData.currency,
        summary: formData.summary.trim(),
        status: 'in_progress',
        progress: 0,
        isCompanyWide: formData.isCompanyWide,
        members: memberList
      });

      addToast(`Project "${formData.name}" created! Visible to all company members.`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Failed to create project', 'error');
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
        maxWidth: '600px',
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
              <FolderGit2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Create New Project
              </h2>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                Add a company project accessible across Admin, HR, and team members
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Project Name & Code */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                Project Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Enterprise Cloud Dashboard, Mobile Client Portal"
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
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

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Project Code
              </label>
              <input
                type="text"
                value={formData.projectCode}
                onChange={(e) => handleChange('projectCode', e.target.value)}
                placeholder="PRJ-001"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#0284c7',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                  textTransform: 'uppercase'
                }}
              />
            </div>
          </div>

          {/* Client & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Client / Brand Name
              </label>
              <input
                type="text"
                value={formData.client}
                onChange={(e) => handleChange('client', e.target.value)}
                placeholder="e.g. Internal / Apex Solutions"
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
              />
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

          {/* Dates & Quick Presets */}
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
                  Target Deadline
                </label>
                <div style={{ display: 'flex', gap: '3px' }}>
                  <button
                    type="button"
                    onClick={() => handleChange('deadline', getOffsetMonthStr(1))}
                    style={{ fontSize: '10px', color: '#0284c7', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600' }}
                  >
                    1 Month
                  </button>
                  <span style={{ fontSize: '10px', color: '#cbd5e1' }}>•</span>
                  <button
                    type="button"
                    onClick={() => handleChange('deadline', getOffsetMonthStr(3))}
                    style={{ fontSize: '10px', color: '#0284c7', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600' }}
                  >
                    3 Months
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
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

          {/* Company-Wide Team Access (Key requirement!) */}
          <div style={{
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={15} color="#0284c7" />
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                  Company-Wide Visibility & Members
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={selectAllMembers}
                  style={{ fontSize: '10.5px', color: '#0284c7', background: '#e0f2fe', border: 'none', padding: '2px 7px', borderRadius: '4px', cursor: 'pointer', fontWeight: '700' }}
                >
                  All Employees ({employees?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={clearAllMembers}
                  style={{ fontSize: '10.5px', color: '#64748b', background: '#ffffff', border: '1px solid #cbd5e1', padding: '2px 7px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Clear
                </button>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
              All selected employees will see this project in their task assignments, project dashboard, and time tracker.
            </p>

            {/* Member Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '90px', overflowY: 'auto', paddingTop: '2px' }}>
              {employees && employees.map(emp => {
                const isSelected = formData.selectedMembers.includes(emp._id);
                return (
                  <button
                    key={emp._id}
                    type="button"
                    onClick={() => toggleMember(emp._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 8px',
                      borderRadius: '14px',
                      border: isSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      color: isSelected ? '#0369a1' : '#475569',
                      fontSize: '11px',
                      fontWeight: isSelected ? '700' : '500',
                      cursor: 'pointer'
                    }}
                  >
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span>{emp.name}</span>
                    {isSelected && <CheckCircle2 size={11} color="#0284c7" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Project Summary */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Project Summary & Scope (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.summary}
              onChange={(e) => handleChange('summary', e.target.value)}
              placeholder="Describe deliverables, key targets, or client objectives..."
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

          {/* Modal Footer Actions */}
          <div style={{
            paddingTop: '12px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px'
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
              type="submit"
              disabled={submitting}
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
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectModal;
