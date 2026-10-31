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
  Globe,
  Lock,
  Shield,
  Search,
  UserCheck
} from 'lucide-react';
import { useWork } from '../../context/WorkContext';
import { useAuth } from '../../../../shared/context/AuthContext';
import { useToast } from '../../../../shared/context/ToastContext';

const CATEGORIES = [
  'Web & Web App Development',
  'Mobile App Development',
  'SEO & Organic Growth',
  'Social Media Marketing (SMM)',
  'Paid Advertising (Google & Meta PPC)',
  'UI/UX & Product Design',
  'Branding & Creative Design',
  'Cloud Infrastructure & DevOps',
  'Content Marketing & Copywriting',
  'Lead Generation & Sales Funnels',
  'Maintenance & Support'
];

const DEPARTMENTS = [
  'IT & Software Development',
  'Digital Marketing',
  'UI/UX & Creative Design',
  'Content & SEO',
  'Sales & Client Servicing',
  'Human Resources',
  'Finance & Accounts',
  'Executive Management'
];

export const AddProjectModal = ({ isOpen, onClose }) => {
  const { createProject, employees, projects } = useWork();
  const { currentUser } = useAuth();
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

  const currentUserId = currentUser?._id || currentUser?.id || 'emp_001';

  const [formData, setFormData] = useState({
    name: '',
    projectCode: defaultCode,
    client: '',
    category: 'Web & Web App Development',
    department: 'IT & Software Development',
    startDate: getTodayStr(),
    deadline: getOffsetMonthStr(2),
    budget: '50000',
    currency: 'INR',
    summary: '',
    isCompanyWide: false,
    visibility: 'members',
    selectedMembers: [currentUserId]
  });

  const [memberSearch, setMemberSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMember = (empId) => {
    // Creator cannot be removed from their own project
    if (empId === currentUserId) {
      addToast('Project creator must always remain included', 'info');
      return;
    }
    setFormData(prev => {
      const exists = prev.selectedMembers.includes(empId);
      const next = exists
        ? prev.selectedMembers.filter(id => id !== empId)
        : [...prev.selectedMembers, empId];
      return {
        ...prev,
        selectedMembers: next
      };
    });
  };

  const selectAllMembers = () => {
    setFormData(prev => ({
      ...prev,
      selectedMembers: [currentUserId, ...(employees || []).map(e => e._id)]
    }));
  };

  const clearAllMembers = () => {
    // Keep creator in selected members
    setFormData(prev => ({
      ...prev,
      selectedMembers: [currentUserId]
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
      const creatorId = String(currentUserId);
      const creatorName = currentUser?.name || 'Authorized Member';
      const creatorRole = currentUser?.role || 'Team Member';
      const creatorEmail = currentUser?.email || '';

      const isCompanyWide = formData.isCompanyWide === true;
      const visibility = isCompanyWide ? 'all' : 'members';

      // Ensure creator is ALWAYS included in selected members list
      const rawSelectedIds = Array.from(new Set([
        creatorId,
        ...formData.selectedMembers
      ]));

      // Build member list based on selected members
      const allEmps = employees || [];
      const memberList = allEmps
        .filter(e => rawSelectedIds.includes(String(e._id || e.id)) || String(e._id || e.id) === creatorId)
        .map(e => ({
          _id: String(e._id || e.id),
          name: e.name,
          avatar: e.avatar,
          role: e.role,
          email: e.email,
          employeeCode: e.employeeCode
        }));

      // Ensure creator object is in memberList
      if (!memberList.some(m => String(m._id || m.id) === creatorId)) {
        memberList.unshift({
          _id: creatorId,
          name: creatorName,
          avatar: currentUser?.avatar,
          role: creatorRole,
          email: creatorEmail,
          employeeCode: currentUser?.employeeCode
        });
      }

      const teamIds = memberList.map(m => m._id);
      const visibleToIds = isCompanyWide ? [] : teamIds;

      await createProject({
        name: formData.name.trim(),
        projectCode: (formData.projectCode || defaultCode).toUpperCase(),
        client: formData.client.trim() || 'Internal Company Project',
        category: formData.category,
        department: formData.department,
        startDate: formData.startDate,
        deadline: formData.deadline,
        hasNoDeadline: false,
        budget: Number(formData.budget) || 0,
        currency: formData.currency,
        summary: formData.summary.trim(),
        status: 'in_progress',
        progress: 0,
        isCompanyWide,
        visibility,
        visibleToIds,
        createdBy: creatorId,
        createdById: creatorId,
        creatorName: creatorName,
        creatorRole: creatorRole,
        creatorEmail: creatorEmail,
        creatorAvatar: currentUser?.avatar,
        members: memberList,
        membersList: memberList,
        teamIds,
        team: memberList
      });

      addToast(`Project "${formData.name}" created successfully!`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Failed to create project', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[600px] max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <FolderGit2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white m-0">
                Create New Project
              </h2>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 mb-0">
                Add a company project accessible across Admin, HR, and team members
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:px-5 overflow-y-auto flex flex-col gap-3.5">
          
          {/* Project Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr] gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Enterprise Cloud Dashboard, Mobile Client Portal"
                autoFocus
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[13.5px] font-semibold text-slate-900 dark:text-white outline-none bg-white dark:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Project Code
              </label>
              <input
                type="text"
                value={formData.projectCode}
                onChange={(e) => handleChange('projectCode', e.target.value)}
                placeholder="PRJ-001"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] font-bold text-sky-600 dark:text-sky-400 outline-none bg-slate-50 dark:bg-slate-800 uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Client & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Client / Brand Name
              </label>
              <input
                type="text"
                value={formData.client}
                onChange={(e) => handleChange('client', e.target.value)}
                placeholder="e.g. Internal / Apex Solutions"
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-900 dark:text-white outline-none bg-white dark:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] text-slate-900 dark:text-white outline-none bg-white dark:bg-slate-800 cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates & Quick Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none bg-white dark:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Deadline
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleChange('deadline', getOffsetMonthStr(1))}
                    className="text-[10px] text-sky-600 dark:text-sky-400 border-none bg-transparent cursor-pointer font-semibold hover:underline"
                  >
                    1 Month
                  </button>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleChange('deadline', getOffsetMonthStr(3))}
                    className="text-[10px] text-sky-600 dark:text-sky-400 border-none bg-transparent cursor-pointer font-semibold hover:underline"
                  >
                    3 Months
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none bg-white dark:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Project Visibility & Team Access */}
          <div className="p-3 sm:px-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2.5">
            {/* Header & Creator Attribution */}
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div className="flex items-center gap-1.5">
                <Users size={16} className="text-sky-600 dark:text-sky-400" />
                <span className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                  Visibility & Assigned Members
                </span>
              </div>
              <div className="text-[11px] text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <UserCheck size={12} />
                Creator: {currentUser?.name || 'You'}
              </div>
            </div>

            {/* Visibility Scope Choice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isCompanyWide: false, visibility: 'members' }))}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
                  !formData.isCompanyWide
                    ? 'border-blue-600 bg-blue-50/90 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Lock size={15} className={`mt-0.5 shrink-0 ${!formData.isCompanyWide ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">Assigned Members Only</div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Only selected team members & creator can view this project.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isCompanyWide: true, visibility: 'all' }))}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
                  formData.isCompanyWide
                    ? 'border-blue-600 bg-blue-50/90 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Globe size={15} className={`mt-0.5 shrink-0 ${formData.isCompanyWide ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">Entire Company (Public)</div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Visible to all company employees across all departments.
                  </div>
                </div>
              </button>
            </div>

            {/* Member Selection Area */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Assigned Team Members ({formData.selectedMembers.length} selected):
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllMembers}
                    className="text-[10.5px] text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border-none px-2 py-0.5 rounded cursor-pointer font-bold transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAllMembers}
                    className="text-[10.5px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    Clear Others
                  </button>
                </div>
              </div>

              {/* Member Chips */}
              <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                {employees && employees.map(emp => {
                  const isCreator = String(emp._id) === String(currentUserId);
                  const isSelected = isCreator || formData.selectedMembers.includes(emp._id);

                  return (
                    <button
                      key={emp._id}
                      type="button"
                      onClick={() => toggleMember(emp._id)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] transition-all ${
                        isCreator
                          ? 'border-[1.5px] border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold cursor-default'
                          : isSelected
                            ? 'border border-sky-500 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 font-bold cursor-pointer'
                            : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium cursor-pointer hover:border-slate-400'
                      }`}
                      title={isCreator ? 'You are the project creator (always included)' : `Click to toggle visibility for ${emp.name}`}
                    >
                      <img
                        src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={emp.name}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span>{emp.name} {isCreator ? '(Creator)' : ''}</span>
                      {isSelected && <CheckCircle2 size={11} className={isCreator ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Project Summary */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Project Summary & Scope (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.summary}
              onChange={(e) => handleChange('summary', e.target.value)}
              placeholder="Describe deliverables, key targets, or client objectives..."
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[12.5px] leading-snug text-slate-900 dark:text-white outline-none resize-none font-sans bg-white dark:bg-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-[12.5px] font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[12.5px] font-bold cursor-pointer shadow-md shadow-sky-600/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
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
