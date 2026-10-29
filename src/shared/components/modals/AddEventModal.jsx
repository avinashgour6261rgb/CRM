/**
 * @file AddEventModal.jsx
 * @description Modal for adding company events, meetings, festivals, holidays, and work anniversaries with recurring support.
 */

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Bell,
  Repeat,
  Tag,
  Sparkles,
  Check
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const EVENT_TYPES = [
  { value: 'Personal Reminder', label: '⏰ Personal Reminder / Task Reminder', color: '#d97706', bg: '#fffbeb' },
  { value: 'Company Event', label: '🏢 Company Event / Conference', color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'Company Anniversary', label: '🏛️ Company Foundation Day / Annual Anniversary', color: '#059669', bg: '#ecfdf5' },
  { value: 'Annual Celebration', label: '🎉 Annual Celebration / Company Party', color: '#db2777', bg: '#fdf2f8' },
  { value: 'Holiday', label: '🏖️ Official Holiday (Company Declared / National)', color: '#dc2626', bg: '#fee2e2' },
  { value: 'Meeting', label: '👥 Team Meeting / Sprint Sync', color: '#2563eb', bg: '#eff6ff' },
  { value: 'Festival', label: '🪔 Festival (Diwali, Dussehra, etc.)', color: '#ea580c', bg: '#ffedd5' },
  { value: 'Work Anniversary', label: '💼 Work Anniversary', color: '#0891b2', bg: '#ecfeff' },
  { value: 'Other Important Event', label: '📌 Other Important Event', color: '#475569', bg: '#f1f5f9' }
];

export const AddEventModal = ({ isOpen, onClose }) => {
  const { createEvent } = useCRM();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const now = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    eventName: '',
    eventType: 'Personal Reminder',
    startDate: now,
    endDate: now,
    startTime: '10:00 AM',
    location: 'Office / Remote Workspace',
    description: '',
    notification: true,
    isRecurring: false
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.eventName.trim()) {
      addToast('Please enter an event or reminder title', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const selectedTypeConfig = EVENT_TYPES.find(t => t.value === formData.eventType) || EVENT_TYPES[0];

      await createEvent({
        ...formData,
        title: formData.eventName,
        date: formData.startDate,
        time: formData.startTime,
        createdBy: currentUser?._id,
        createdByName: currentUser?.name,
        isPersonal: formData.eventType === 'Personal Reminder',
        isHoliday: formData.eventType === 'Holiday',
        color: selectedTypeConfig.color,
        bgColor: selectedTypeConfig.bg
      });

      // Reset
      setFormData({
        eventName: '',
        eventType: 'Personal Reminder',
        startDate: now,
        endDate: now,
        startTime: '10:00 AM',
        location: 'Office / Remote Workspace',
        description: '',
        notification: true,
        isRecurring: false
      });
      onClose();
    } catch (err) {
      console.error('Error creating event:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full h-[38px] px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const selectClass = "w-full h-[38px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[620px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-5 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 text-sky-500 dark:text-sky-400 flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white m-0">
                Create Company Event
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-0">
                Schedule festivals, meetings, celebrations & annual company milestones
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          
          {/* Event Name */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Event Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Diwali Festive Gala, Q4 Strategy Sync, Annual Hackathon"
              value={formData.eventName}
              onChange={e => handleChange('eventName', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Event Type / Category
            </label>
            <select
              value={formData.eventType}
              onChange={e => handleChange('eventType', e.target.value)}
              className={selectClass}
            >
              {EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={e => handleChange('startDate', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e => handleChange('endDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Start Time & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Time
              </label>
              <input
                type="text"
                placeholder="e.g. 10:00 AM or All Day"
                value={formData.startTime}
                onChange={e => handleChange('startTime', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Location / Video Stream
              </label>
              <input
                type="text"
                placeholder="e.g. Main Auditorium / Zoom Link"
                value={formData.location}
                onChange={e => handleChange('location', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description / Agenda
            </label>
            <textarea
              rows={3}
              placeholder="Event agenda, special instructions, dress code or details..."
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 text-[13px] outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-y font-sans focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Toggles (Notification & Recurring Event) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-2 cursor-pointer text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formData.notification}
                onChange={e => handleChange('notification', e.target.checked)}
                className="accent-blue-600 rounded"
              />
              <Bell size={15} className="text-blue-600 dark:text-blue-400" />
              <span>Send Notification</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={e => handleChange('isRecurring', e.target.checked)}
                className="accent-blue-600 rounded"
              />
              <Repeat size={15} className="text-green-600 dark:text-green-400" />
              <span>Recurring Yearly Event</span>
            </label>
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
              {submitting ? 'Scheduling...' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
