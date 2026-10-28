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
  const { createEvent, darkMode } = useCRM();
  const isDark = !!darkMode;
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

  const dynamicInputStyle = {
    ...inputStyle,
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
    color: isDark ? '#f8fafc' : '#0f172a'
  };

  const dynamicSelectStyle = {
    ...selectStyle,
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
    color: isDark ? '#f8fafc' : '#0f172a'
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: isDark ? '#151e32' : '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '620px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: isDark ? '1px solid #243049' : '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: isDark ? '1px solid #243049' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isDark ? '#101726' : '#f8fafc',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: isDark ? '#1e293b' : '#eff6ff',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                Create Company Event
              </h2>
              <p style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', margin: '2px 0 0 0' }}>
                Schedule festivals, meetings, celebrations & annual company milestones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: isDark ? '#1e293b' : '#ffffff',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#cbd5e1' : '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Event Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Event Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Diwali Festive Gala, Q4 Strategy Sync, Annual Hackathon"
              value={formData.eventName}
              onChange={e => handleChange('eventName', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Event Type */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Event Type / Category
            </label>
            <select
              value={formData.eventType}
              onChange={e => handleChange('eventType', e.target.value)}
              style={selectStyle}
            >
              {EVENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date & End Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={e => handleChange('startDate', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={e => handleChange('endDate', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Start Time & Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Start Time
              </label>
              <input
                type="text"
                placeholder="e.g. 10:00 AM or All Day"
                value={formData.startTime}
                onChange={e => handleChange('startTime', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Location / Video Stream
              </label>
              <input
                type="text"
                placeholder="e.g. Main Auditorium / Zoom Link"
                value={formData.location}
                onChange={e => handleChange('location', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Description / Agenda
            </label>
            <textarea
              rows={3}
              placeholder="Event agenda, special instructions, dress code or details..."
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              style={{
                ...inputStyle,
                height: 'auto',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Toggles (Notification & Recurring Event) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            backgroundColor: '#f8fafc',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
              <input
                type="checkbox"
                checked={formData.notification}
                onChange={e => handleChange('notification', e.target.checked)}
                style={{ accentColor: '#2563eb' }}
              />
              <Bell size={15} color="#2563eb" />
              <span>Send Notification</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={e => handleChange('isRecurring', e.target.checked)}
                style={{ accentColor: '#2563eb' }}
              />
              <Repeat size={15} color="#16a34a" />
              <span>Recurring Yearly Event</span>
            </label>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37,99,235,0.35)'
              }}
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

const inputStyle = {
  width: '100%',
  height: '38px',
  padding: '0 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  outline: 'none',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};

const selectStyle = {
  width: '100%',
  height: '38px',
  padding: '0 10px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  outline: 'none',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  cursor: 'pointer'
};
