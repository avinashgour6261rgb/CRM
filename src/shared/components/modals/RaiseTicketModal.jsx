/**
 * @file RaiseTicketModal.jsx
 * @description Modal for raising an employee support ticket.
 */

import React, { useState } from 'react';
import {
  X,
  LifeBuoy,
  UploadCloud,
  Check,
  AlertCircle
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../../context/ToastContext';

const TICKET_CATEGORIES = [
  'IT & Infrastructure',
  'Design Tools',
  'Software & Subscriptions',
  'HR & Payroll Query',
  'Hardware & Equipment',
  'Workplace & Facilities',
  'General Support'
];

export const RaiseTicketModal = ({ isOpen, onClose }) => {
  const { createTicket } = useCRM();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    subject: '',
    category: 'IT & Infrastructure',
    priority: 'medium',
    description: '',
    fileName: ''
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim()) {
      addToast('Please enter a ticket subject', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await createTicket(formData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[580px] max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-5 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white m-0">
              Raise Support Ticket
            </h2>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1 mb-0">
              Submit an internal request to IT, HR, or Management
            </p>
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
          {/* Subject */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Ticket Subject *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. VPN Access request for staging Kubernetes cluster"
              value={formData.subject}
              onChange={e => handleChange('subject', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[13.5px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                value={formData.category}
                onChange={e => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                {TICKET_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={e => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
                <option value="urgent">🔥 Urgent</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description / Issue Details *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Describe the issue, required access permissions, error details or questions..."
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-y font-sans focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Attachment (Optional)
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 text-center bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 transition-colors cursor-pointer">
              <UploadCloud size={24} className="mx-auto mb-1 text-slate-500 dark:text-slate-400" />
              <div className="text-[12.5px] text-slate-600 dark:text-slate-400">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">Upload Screenshot / Log</span> (PNG, JPG, PDF)
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 pt-3.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white border-none px-5 py-2.5 rounded-lg text-[13.5px] font-semibold cursor-pointer shadow-md shadow-sky-600/30 transition-colors disabled:opacity-50"
            >
              <Check size={16} />
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 px-4 py-2.5 rounded-lg text-[13.5px] font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
