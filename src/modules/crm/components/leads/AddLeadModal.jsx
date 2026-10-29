/**
 * @file AddLeadModal.jsx
 * @description Clean, easy-to-write, and responsive modal for creating and managing CRM Leads.
 */

import React, { useState } from 'react';
import {
  X,
  Users2,
  DollarSign,
  User,
  Building,
  Mail,
  Phone,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { useCRM } from '../../../../shared/context/CRMContext';
import { useHR } from '../../../hr/context/HRContext';
import { useToast } from '../../../../shared/context/ToastContext';

const LEAD_STAGES = [
  { id: 'new', label: 'New Lead' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal Sent' },
  { id: 'won', label: 'Won / Closed' }
];

const LEAD_SOURCES = [
  'Website Inquiry',
  'LinkedIn',
  'Referral / Partner',
  'Cold Outreach',
  'Google Ads',
  'Direct Call'
];

export const AddLeadModal = ({ isOpen, onClose }) => {
  const { createLead } = useCRM();
  const { employees, currentUser } = useHR();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    dealValue: '',
    currency: 'INR',
    status: 'new',
    leadSource: 'Website Inquiry',
    assignedToId: currentUser?._id || employees[0]?._id || '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Please enter the contact person or lead name', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const selectedAssignee = employees.find(e => e._id === formData.assignedToId) || currentUser;

      await createLead({
        name: formData.name.trim(),
        contactPerson: formData.name.trim(),
        companyName: formData.companyName.trim() || 'Direct Client',
        client: formData.companyName.trim() || 'Direct Client',
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        dealValue: Number(formData.dealValue) || 0,
        currency: formData.currency,
        status: formData.status,
        leadSource: formData.leadSource,
        startDate: formData.startDate,
        endDate: formData.endDate,
        createdBy: currentUser?.name || 'Avinash',
        notes: formData.notes.trim(),
        leadOwnerId: selectedAssignee?._id || 'emp_admin',
        leadOwnerName: selectedAssignee?.name || 'Team Member',
        leadOwnerRole: selectedAssignee?.role || 'Administrator',
        leadOwnerAvatar: selectedAssignee?.avatar || '',
        createdAt: new Date().toISOString()
      });

      addToast(`Lead "${formData.name}" added to pipeline!`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Failed to create lead', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[1000] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[20px] w-full max-w-[700px] max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-[18px] px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Users2 size={20} />
            </div>
            <div>
              <h2 className="text-[17px] font-extrabold text-slate-900 dark:text-slate-50 m-0">
                Add New CRM Lead
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Capture new client prospect and deal opportunity
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-[18px]">
          {/* Contact Name & Company */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Contact Person / Lead Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Vikram Singhania"
                autoFocus
                required
                className="w-full py-2.5 px-3.5 rounded-[10px] border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="e.g. Indore Infotech Solutions"
                className="w-full py-2.5 px-3.5 rounded-[10px] border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="e.g. vikram@indoreinfotech.in"
                className="w-full py-2.5 px-3 rounded-[10px] border border-slate-300 dark:border-slate-600 text-[13.5px] text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full py-2.5 px-3 rounded-[10px] border border-slate-300 dark:border-slate-600 text-[13.5px] text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Deal Value, Stage & Lead Source */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Deal Value (INR ₹)
              </label>
              <input
                type="number"
                value={formData.dealValue}
                onChange={(e) => handleChange('dealValue', e.target.value)}
                placeholder="100000"
                className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-[13px] text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Pipeline Stage
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-[13px] font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none cursor-pointer focus:border-blue-600"
              >
                {LEAD_STAGES.map(s => (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Lead Source
              </label>
              <select
                value={formData.leadSource}
                onChange={(e) => handleChange('leadSource', e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-[13px] font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none cursor-pointer focus:border-blue-600"
              >
                {LEAD_SOURCES.map(src => (
                  <option key={src} value={src} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium">
                    {src}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Owner */}
          <div>
            <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Assign Lead Owner
            </label>
            <select
              value={formData.assignedToId}
              onChange={(e) => handleChange('assignedToId', e.target.value)}
              className="w-full py-2.5 px-3 rounded-[10px] border border-slate-300 dark:border-slate-600 text-[13.5px] font-semibold text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 cursor-pointer focus:border-blue-600"
            >
              {employees.map(emp => (
                <option key={emp._id} value={emp._id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium">
                  {emp.name} — {emp.role} ({emp.department || 'General'})
                </option>
              ))}
            </select>
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full py-2.5 px-3 rounded-[10px] border border-slate-300 dark:border-slate-600 text-[13.5px] text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                End Date / Target Close
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="w-full py-2.5 px-3 rounded-[10px] border border-slate-300 dark:border-slate-600 text-[13.5px] text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Lead Requirements & Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Enter client background, initial discussion notes, key decision makers..."
              className="w-full py-3 px-3.5 rounded-[10px] border border-slate-300 dark:border-slate-600 text-[13.5px] leading-relaxed text-slate-900 dark:text-slate-100 outline-none bg-white dark:bg-slate-800 resize-y focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all font-sans"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-[18px] rounded-[10px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13.5px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="py-2.5 px-[22px] rounded-[10px] border-none bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-[13.5px] font-bold cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 size={16} />
              {submitting ? 'Adding Lead...' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLeadModal;
