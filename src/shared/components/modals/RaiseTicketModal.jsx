/**
 * @file RaiseTicketModal.jsx
 * @description Modal for raising an employee support ticket.
 */

import React, { useState, useRef } from 'react';
import {
  X,
  LifeBuoy,
  UploadCloud,
  Check,
  AlertCircle,
  FileText,
  Trash2,
  Paperclip
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useToast } from '../../context/ToastContext';
import { useModalUX } from '../../hooks/useModalUX';

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
  const { handleBackdropClick, handleCardClick } = useModalUX({ onClose, isOpen });
  const { createTicket = async () => {} } = useCRM() || {};
  const { addToast = () => {} } = useToast() || {};
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    subject: '',
    category: 'IT & Infrastructure',
    priority: 'medium',
    description: '',
    fileName: '',
    attachment: ''
  });

  const [fileMeta, setFileMeta] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast('File size must be under 5 MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setFileMeta({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type
      });
      setFormData(prev => ({
        ...prev,
        fileName: file.name,
        attachment: base64
      }));
      addToast(`Attached: ${file.name}`, 'info');
    };
    reader.onerror = () => {
      addToast('Failed to read selected file', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFileMeta(null);
    setFormData(prev => ({
      ...prev,
      fileName: '',
      attachment: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      setFormData({
        subject: '',
        category: 'IT & Infrastructure',
        priority: 'medium',
        description: '',
        fileName: '',
        attachment: ''
      });
      setFileMeta(null);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-3 sm:p-5 animate-fade-in" onClick={handleBackdropClick}>
      <div className="popup-spring bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[580px] max-h-[92vh] sm:max-h-[88vh] overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col" onClick={handleCardClick}>
        {/* Header */}
        <div className="shrink-0 p-5 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex-1 overflow-y-auto flex flex-col gap-4">
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt,.log,.json,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {fileMeta ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                    <Paperclip size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100 truncate">
                      {fileMeta.name}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {fileMeta.size} • Attached
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-500 dark:text-rose-400 border-none cursor-pointer transition-colors"
                  title="Remove attachment"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 text-center bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
              >
                <UploadCloud size={24} className="mx-auto mb-1 text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
                <div className="text-[12.5px] text-slate-600 dark:text-slate-400">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold underline">Click to upload screenshot or log</span> (PNG, JPG, PDF, TXT)
                </div>
                <div className="text-[10.5px] text-slate-400 mt-0.5">Maximum size: 5 MB</div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="shrink-0 flex items-center gap-2.5 pt-3.5 border-t border-slate-100 dark:border-slate-800">
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
