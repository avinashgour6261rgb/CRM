import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle2, Send, Building2, Gift, Bell } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getCompanySettings } from '../../services/companySettingsService';

export const EmailNotificationModal = ({ isOpen, onClose, emailData }) => {
  const { addToast } = useToast();
  const [companyInfo, setCompanyInfo] = useState(getCompanySettings());

  useEffect(() => {
    const updateInfo = () => setCompanyInfo(getCompanySettings());
    window.addEventListener('company-settings-updated', updateInfo);
    return () => window.removeEventListener('company-settings-updated', updateInfo);
  }, []);

  if (!isOpen || !emailData) return null;

  const {
    type = 'notice', // 'notice' | 'birthday' | 'leave'
    subject = 'Notice: Company Update',
    to = 'all-employees@company.com',
    sender = `${companyInfo.shortName || 'HR Dept'} <${companyInfo.hrEmail || companyInfo.email}>`,
    title = 'Important Announcement',
    body = '',
    actionText = 'View in EMS Portal'
  } = emailData;

  const handleSendLive = () => {
    addToast({
      title: 'Company Emails Dispatched 📬',
      message: `Delivered to all registered employee inboxes: "${subject}"`,
      type: 'success'
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '620px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Modal Top Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0f172a',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={18} color="#60a5fa" />
            <span style={{ fontSize: '14px', fontWeight: '700' }}>
              Automated Email Dispatch System
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Email Headers */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '12.5px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div><strong style={{ color: '#475569' }}>From:</strong> <span style={{ color: '#0f172a' }}>{sender}</span></div>
          <div><strong style={{ color: '#475569' }}>To:</strong> <span style={{ color: '#0f172a' }}>{to}</span></div>
          <div><strong style={{ color: '#475569' }}>Subject:</strong> <span style={{ color: '#2563eb', fontWeight: '700' }}>{subject}</span></div>
        </div>

        {/* Formatted HTML Email Body Preview */}
        <div style={{ padding: '24px 28px', backgroundColor: '#ffffff' }}>
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            backgroundColor: type === 'birthday' ? '#fdf4ff' : '#f8fafc',
            borderTop: `4px solid ${type === 'birthday' ? '#c026d3' : '#2563eb'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              {type === 'birthday' ? (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fae8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c026d3' }}>
                  <Gift size={20} />
                </div>
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <Bell size={20} />
                </div>
              )}
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {title}
              </h2>
            </div>

            <div style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.6', marginBottom: '20px' }}>
              {body || 'All registered employees will receive this official company notification directly in their inbox with deep links to the EMS portal.'}
            </div>

            <div style={{
              display: 'inline-block',
              padding: '10px 20px',
              borderRadius: '8px',
              backgroundColor: type === 'birthday' ? '#c026d3' : '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none'
            }}>
              {actionText}
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: '11px', color: '#64748b' }}>
              {companyInfo.companyName || 'Corporate HR System'} • Automated HR Notification Service
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            ✅ SMTP & Cloud Webhook Configured
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <button
              onClick={handleSendLive}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.25)'
              }}
            >
              <Send size={14} /> Send Email Blast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
