/**
 * @file EditLeadModal.jsx
 * @description Modal for editing all properties of an existing lead.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Briefcase,
  Layers,
  Sparkles,
  Check,
  Flame,
  UserCheck
} from 'lucide-react';
import { useCRM } from '../../../../shared/context/CRMContext';
import { useHR } from '../../../hr/context/HRContext';

export const EditLeadModal = ({ lead, isOpen, onClose }) => {
  const { updateLead } = useCRM();
  const { employees, currentUser } = useHR();

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    leadType: 'Enterprise',
    client: '',
    leadOwnerId: '',
    startDate: '',
    endDate: '',
    status: 'new',
    priority: 'medium',
    leadSource: 'Website Inquiry',
    dealValue: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        companyName: lead.companyName || lead.client || '',
        contactPerson: lead.contactPerson || lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        leadType: lead.leadType || 'Enterprise',
        client: lead.client || lead.companyName || '',
        leadOwnerId: lead.leadOwnerId || employees[0]?._id || 'emp_001',
        startDate: lead.startDate || '',
        endDate: lead.endDate || '',
        status: lead.status || 'new',
        priority: lead.priority || 'medium',
        leadSource: lead.leadSource || 'Website Inquiry',
        dealValue: lead.dealValue || '',
        notes: lead.notes || ''
      });
    }
  }, [lead, isOpen, employees]);

  if (!isOpen || !lead) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Please provide at least a Lead Name and Work Email');
      return;
    }

    try {
      setSubmitting(true);
      const selectedOwner = employees.find(e => e._id === formData.leadOwnerId) || currentUser;

      await updateLead(lead._id, {
        ...formData,
        contactPerson: formData.contactPerson || formData.name,
        companyName: formData.companyName || formData.client || 'Enterprise Client',
        client: formData.client || formData.companyName || 'Enterprise Client',
        leadOwnerId: selectedOwner?._id || currentUser?._id || 'emp_001',
        leadOwnerName: selectedOwner?.name || currentUser?.name || 'Lead Owner',
        leadOwnerRole: selectedOwner?.role || 'Senior Director',
        leadOwnerAvatar: selectedOwner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        dealValue: Number(formData.dealValue) || 0
      });

      onClose();
    } catch (err) {
      console.error('Error updating lead:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-[1000] p-5">
      <div className="bg-white dark:bg-[#151e32] rounded-2xl w-full max-w-[680px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-[#243049] flex flex-col">
        {/* Header */}
        <div className="p-5 px-6 border-b border-slate-100 dark:border-[#243049] flex items-center justify-between bg-slate-50 dark:bg-[#18233c] rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50 m-0">
                Edit Lead: {lead.leadCode || `#${lead.idNumber}`}
              </h2>
            </div>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 m-0 mt-1 ml-10">
              Update prospect contact info, stage status, and owner assignment
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          
          {/* Row 1: Lead Name & Company Name */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lead / Deal Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Company / Client Name *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={e => {
                  handleChange('companyName', e.target.value);
                  handleChange('client', e.target.value);
                }}
                className={inputClass}
              />
            </div>
          </div>

          {/* Row 2: Contact Person, Work Email & Phone */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={e => handleChange('contactPerson', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Work Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Row 3: Lead Owner & Created By */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lead Owner (Assigned Team Member) *
              </label>
              <select
                value={formData.leadOwnerId}
                onChange={e => handleChange('leadOwnerId', e.target.value)}
                className={selectClass}
              >
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} — {emp.role} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Originally Created By
              </label>
              <div className="flex items-center gap-2 py-2 px-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <UserCheck size={16} className="text-green-600" />
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                  {lead.createdByName || 'Team Member'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  on {lead.createdDate || '09-12-2026'}
                </span>
              </div>
            </div>
          </div>

          {/* Row 4: Lead Type, Status, Priority, Deal Value */}
          <div className="grid grid-cols-4 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lead Type / Category
              </label>
              <select
                value={formData.leadType}
                onChange={e => handleChange('leadType', e.target.value)}
                className={selectClass}
              >
                <option value="Enterprise">Enterprise</option>
                <option value="Inbound Web">Inbound Web</option>
                <option value="Referral">Referral</option>
                <option value="Outbound Sales">Outbound Sales</option>
                <option value="Partner">Partner</option>
                <option value="Cold Campaign">Cold Campaign</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lead Status
              </label>
              <select
                value={formData.status}
                onChange={e => handleChange('status', e.target.value)}
                className={selectClass}
              >
                <option value="new">New Inquiry</option>
                <option value="active">Active Contact</option>
                <option value="in_progress">In Progress</option>
                <option value="negotiation">In Negotiation</option>
                <option value="converted">Converted (Won)</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Priority Level
              </label>
              <select
                value={formData.priority}
                onChange={e => handleChange('priority', e.target.value)}
                className={selectClass}
              >
                <option value="urgent">⚡ Urgent</option>
                <option value="high">🔥 High</option>
                <option value="medium">⚖️ Medium</option>
                <option value="low">💤 Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Deal Value (₹)
              </label>
              <input
                type="number"
                value={formData.dealValue}
                onChange={e => handleChange('dealValue', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Row 5: Start Date, Target End Date & Lead Source */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Start / Inquiry Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={e => handleChange('startDate', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Close / Deadline
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e => handleChange('endDate', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lead Source
              </label>
              <select
                value={formData.leadSource}
                onChange={e => handleChange('leadSource', e.target.value)}
                className={selectClass}
              >
                <option value="Website Inquiry">Website Inquiry</option>
                <option value="LinkedIn Campaign">LinkedIn Campaign</option>
                <option value="Executive Referral">Executive Referral</option>
                <option value="Cold Outreach">Cold Outreach</option>
                <option value="Trade Show / Conference">Trade Show / Conference</option>
                <option value="Google Search Ads">Google Search Ads</option>
                <option value="Strategic Partnership">Strategic Partnership</option>
              </select>
            </div>
          </div>

          {/* Row 6: Description & Requirements */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Notes & Deal Requirements
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 text-[13px] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none resize-y focus:border-blue-600 font-sans transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 mt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="py-[9px] px-[18px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 py-[9px] px-[22px] rounded-lg border-none bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold cursor-pointer shadow-md transition-colors"
            >
              <Check size={16} />
              {submitting ? 'Updating Lead...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputClass = "w-full h-[38px] px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-600 transition-colors";
const selectClass = "w-full h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer focus:border-blue-600 transition-colors";
