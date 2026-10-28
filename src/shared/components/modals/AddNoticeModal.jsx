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

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '580px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BellRing size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Publish Company Notice
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Announcements will appear on Notice Board, Dashboards & Notifications
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Notice Title */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Notice Title / Subject *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 All-Hands Townhall, Festival Holiday Announcement"
              value={formData.title}
              onChange={e => handleChange('title', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Row 2: Target Audience & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                To (Target Audience)
              </label>
              <select
                value={formData.targetAudience}
                onChange={e => handleChange('targetAudience', e.target.value)}
                style={selectStyle}
              >
                <option value="All Employees">All Employees (Global)</option>
                <option value="Engineering Team">Engineering & Tech</option>
                <option value="Product & Design">Product & Design</option>
                <option value="Marketing & Sales">Marketing & Sales</option>
                <option value="Human Resources">Human Resources</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Priority Level
              </label>
              <select
                value={formData.priority}
                onChange={e => handleChange('priority', e.target.value)}
                style={selectStyle}
              >
                <option value="urgent">⚡ Urgent</option>
                <option value="high">🔥 High</option>
                <option value="medium">⚖️ Medium</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          {/* Row 3: Publish Date & Expiry Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Publish Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={e => handleChange('date', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={e => handleChange('expiryDate', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Full Notice Description / Announcement Content *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Write the full announcement text for employees..."
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
              {submitting ? 'Publishing...' : 'Publish Notice'}
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
