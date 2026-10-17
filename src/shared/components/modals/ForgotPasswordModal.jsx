/**
 * @file ForgotPasswordModal.jsx
 * @description Forgot password modal on the login page.
 * Enables employees to request a password reset from Admin, or enables Admin to restore access.
 */

import React, { useState } from 'react';
import {
  Key,
  Mail,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  X,
  ShieldCheck,
  LifeBuoy
} from 'lucide-react';
import { getCollection, saveCollection, KEYS } from '../../services/storageService';
import { useToast } from '../../context/ToastContext';

export const ForgotPasswordModal = ({ isOpen, onClose, onAutoFillAdmin }) => {
  const { addToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [status, setStatus] = useState(null); // null | 'success' | 'admin_reset' | 'not_found'
  const [matchedEmp, setMatchedEmp] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleResetRequest = (e) => {
    e.preventDefault();
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) return;

    setIsSubmitting(true);

    try {
      const employees = getCollection(KEYS.EMPLOYEES, []);
      const found = employees.find(e =>
        (e.email && e.email.toLowerCase().trim() === cleanId) ||
        (e.employeeCode && e.employeeCode.toLowerCase().trim() === cleanId) ||
        (e._id && String(e._id).toLowerCase() === cleanId)
      );

      if (!found) {
        // Check if admin identifier entered
        if (cleanId === 'admin@inforag.com' || cleanId === 'adm-001' || cleanId === 'admin') {
          setStatus('admin_reset');
          setMatchedEmp({ name: 'System Administrator', role: 'Super Admin', employeeCode: 'ADM-001', email: 'admin@inforag.com' });
        } else {
          setStatus('not_found');
          setMatchedEmp(null);
        }
        setIsSubmitting(false);
        return;
      }

      setMatchedEmp(found);

      // If it's Admin account
      if (found.isAdmin || found.employeeCode === 'ADM-001' || found.email === 'admin@inforag.com' || found.systemRole === 'admin') {
        setStatus('admin_reset');
      } else {
        // Create an official urgent ticket for Admin / HR to see
        const tickets = getCollection(KEYS.TICKETS, []);
        const newTicket = {
          _id: `tkt_reset_${Date.now()}`,
          ticketCode: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
          subject: `🔐 Password Reset Request: ${found.name} (${found.employeeCode})`,
          category: 'Account Access',
          priority: 'urgent',
          status: 'open',
          requestedById: found._id,
          requestedByName: found.name,
          requestedByEmail: found.email,
          requestedOn: new Date().toISOString().split('T')[0],
          description: `Employee ${found.name} (${found.employeeCode}, ${found.role}) has requested a password reset. Please open the Employee Directory and click 'Access Rights' or 'Reset Password' to generate a new password.`
        };
        saveCollection(KEYS.TICKETS, [newTicket, ...tickets]);
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.TICKETS } }));

        setStatus('success');
        addToast?.('Password reset request registered for Admin!', 'success');
      }
    } catch (err) {
      console.error(err);
      setStatus('not_found');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [newAdminPass, setNewAdminPass] = useState('');

  const handleSetAdminPassword = async () => {
    const finalPass = newAdminPass.trim() || 'Admin@2026';
    try {
      localStorage.removeItem('ems_master_password');
      const employees = getCollection(KEYS.EMPLOYEES, []);
      let targetAdminId = null;
      const updated = employees.map(e => {
        if (e.isAdmin || e.employeeCode === 'ADM-001' || e.email === 'admin@inforag.com' || e.systemRole === 'admin') {
          targetAdminId = e._id;
          return { ...e, password: finalPass };
        }
        return e;
      });
      saveCollection(KEYS.EMPLOYEES, updated);

      try {
        const s = JSON.parse(localStorage.getItem('ems_auth_session') || '{}');
        if (s && (s.isAdmin || s.employeeCode === 'ADM-001' || s.email === 'admin@inforag.com')) {
          localStorage.setItem('ems_auth_session', JSON.stringify({ ...s, password: finalPass }));
        }
      } catch {}

      try {
        const logs = JSON.parse(localStorage.getItem('ems_credential_backup_log') || '[]');
        logs.unshift({
          action: 'MASTER_ADMIN_PASSWORD_RESET',
          timestamp: new Date().toISOString(),
          restoredBy: 'Forgot Password Modal'
        });
        localStorage.setItem('ems_credential_backup_log', JSON.stringify(logs.slice(0, 50)));
      } catch {}

      try {
        if (targetAdminId) {
          fetch(`/api/employees/${targetAdminId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: finalPass })
          }).catch(() => {});
        }
      } catch {}

      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));
      addToast?.('Admin password updated successfully!', 'success');
      onAutoFillAdmin?.();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
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
              <HelpCircle size={17} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                Forgot Your Password?
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                Account recovery and password reset assistance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px' }}>
          {status === 'success' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center', alignItems: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  Reset Request Logged
                </h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: '1.5' }}>
                  We found your account for <strong>{matchedEmp?.name}</strong> ({matchedEmp?.employeeCode}).
                </p>
                <div style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #bae6fd',
                  fontSize: '12px',
                  color: '#0369a1',
                  textAlign: 'left',
                  lineHeight: '1.5'
                }}>
                  ℹ️ An urgent account request ticket has been dispatched to your Workspace Admin & HR team. Your Admin can reset your password directly from the <strong>Employee Directory</strong>.
                </div>
              </div>

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '9px',
                  borderRadius: '7px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginTop: '6px'
                }}
              >
                Back to Sign In
              </button>
            </div>
          ) : status === 'admin_reset' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                fontSize: '12.5px',
                color: '#1e40af',
                lineHeight: '1.5'
              }}>
                👑 <strong>Master Administrator Account Detected</strong>
                <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#1d4ed8' }}>
                  Please enter your new secure password below to reset your Administrator credentials.
                </p>
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#1e3a8a', marginBottom: '4px' }}>
                    New Admin Password:
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new secure password (e.g. Admin@2026)"
                    value={newAdminPass}
                    onChange={e => setNewAdminPass(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #93c5fd',
                      backgroundColor: '#ffffff',
                      fontSize: '13px',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSetAdminPassword}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Set New Password & Apply
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: '1.4' }}>
                Enter your registered <strong>Work Email</strong> or <strong>Employee ID</strong> (e.g. <code>EMP-001</code>). We will verify your profile and notify Admin to issue a new temporary password.
              </p>

              {status === 'not_found' && (
                <div style={{
                  padding: '9px 12px',
                  borderRadius: '7px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>No employee found with that email or ID. Please double-check with HR.</span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                  Work Email or Employee ID <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => {
                    setIdentifier(e.target.value);
                    setStatus(null);
                  }}
                  placeholder="e.g. rahul@company.com or EMP-001"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {isSubmitting ? 'Verifying...' : 'Request Reset'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
