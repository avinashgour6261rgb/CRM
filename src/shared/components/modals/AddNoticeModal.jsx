/**
 * @file AddNoticeModal.jsx
 * @description Modal allowing Admin & HR to publish official company notices with priority, target audience, and expiry dates.
 */

import React, { useState } from 'react';
import {
  X,
  BellRing,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Calendar,
  Users,
  Sparkles,
  Check
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useHR } from '../../../modules/hr/context/HRContext';
import { useToast } from '../../context/ToastContext';

export const AddNoticeModal = ({ isOpen, onClose }) => {
  const { createNotice } = useCRM();
  const { currentUser } = useHR();
  const { addToast } = useToast();

  const now = new Date().toISOString().split('T')[0];
  const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: now,
    expiryDate: defaultExpiry,
    priority: 'high',
    targetAudience: 'All Employees',
    category: 'Company Announcement',
    attachment: ''
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      addToast('Please fill in the Notice Title and Description', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await createNotice({
        ...formData,
        to: formData.targetAudience,
        shortDescription: formData.description.slice(0, 120),
        fullContent: formData.description,
        isImportant: formData.priority === 'urgent' || formData.priority === 'high'
      });

      // Reset
      setFormData({
        title: '',
        description: '',
        date: now,
        expiryDate: defaultExpiry,
        priority: 'high',
        targetAudience: 'All Employees',
        category: 'Company Announcement',
        attachment: ''
      });
      onClose();
    } catch (err) {
      console.error('Error creating notice:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full h-[38px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const selectClass = "w-full h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[580px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-5 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BellRing size={18} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white m-0">
                Publish Company Notice
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-0">
                Announcements will appear on Notice Board, Dashboards & Notifications
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          
          {/* Notice Title */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Notice Title / Subject *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 All-Hands Townhall, Festival Holiday Announcement"
              value={formData.title}
              onChange={e => handleChange('title', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Row 2: Target Audience & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                To (Target Audience)
              </label>
              <select
                value={formData.targetAudience}
                onChange={e => handleChange('targetAudience', e.target.value)}
                className={selectClass}
              >
                <option value="All Employees">All Employees (Global)</option>
                <option value="IT & Software Development">IT & Software Development</option>
                <option value="Digital Marketing">Digital Marketing & Growth</option>
                <option value="UI/UX & Creative Design">UI/UX & Creative Design</option>
                <option value="Sales & Client Servicing">Sales & Client Servicing</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance & Accounts">Finance & Accounts</option>
              </select>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          {/* Row 3: Publish Date & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Publish Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={e => handleChange('date', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={e => handleChange('expiryDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Full Notice Description / Announcement Content *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Write the full announcement text for employees..."
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-y font-sans focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-[13px] font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold cursor-pointer shadow-md shadow-blue-500/30 transition-colors disabled:opacity-50"
            >
              <Check size={16} />
              {submitting ? 'Publishing...' : 'Publish Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
