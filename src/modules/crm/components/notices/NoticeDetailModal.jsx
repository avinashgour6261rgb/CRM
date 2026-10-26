/**
 * @file NoticeDetailModal.jsx
 * @description Modal showing full content of a company announcement / HR notice.
 */

import React from 'react';
import {
  X,
  Bell,
  Calendar,
  User,
  Tag,
  AlertTriangle
} from 'lucide-react';

export const NoticeDetailModal = ({ notice, onClose }) => {
  if (!notice) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
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
        maxWidth: '620px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 26px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                padding: '3px 8px',
                backgroundColor: notice.isImportant ? '#fee2e2' : '#eff6ff',
                color: notice.isImportant ? '#dc2626' : '#2563eb',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: '700'
              }}>
                {notice.isImportant ? '🔥 High Priority' : '📢 Notice'}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {notice.category}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, lineHeight: '1.4' }}>
              {notice.title}
            </h2>
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

        {/* Content */}
        <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            fontSize: '12.5px',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} /> Posted By: <strong style={{ color: '#334155' }}>{notice.postedBy}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> {notice.date}
            </div>
          </div>

          {/* Full Content */}
          <div style={{
            fontSize: '14px',
            color: '#334155',
            lineHeight: '1.7',
            whiteSpace: 'pre-line',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '18px'
          }}>
            {notice.fullContent || notice.shortDescription}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 26px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#f8fafc',
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px'
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
