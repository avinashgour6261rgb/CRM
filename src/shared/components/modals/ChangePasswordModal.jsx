/**
 * @file ChangePasswordModal.jsx
 * @description Secure Password Change and Reset Modal.
 * Supports:
 * 1. Self-service password change (requires entering Current Password first).
 * 2. Admin password reset/generation for any employee (with 1-click password generator).
 */

import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  X,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getCollection, saveCollection, KEYS } from '../../services/storageService';

export const ChangePasswordModal = ({ isOpen, onClose, targetUser = null }) => {
  const { currentUser, setCurrentUser } = useAuth();
  const { addToast } = useToast();

  const isSelf = !targetUser || targetUser._id === currentUser?._id || targetUser.employeeCode === currentUser?.employeeCode;
  const effectiveUser = targetUser || currentUser;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Generate random secure password (e.g. "Emp@8492")
  const handleAutoGenerate = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setConfirmPassword(pass);
    setErrorMsg('');
    addToast('New secure password generated!', 'info');
  };

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Password copied to clipboard!', 'success');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and Confirm password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const employees = getCollection(KEYS.EMPLOYEES, []);
      const uId = String(effectiveUser?._id || '');
      const uCode = String(effectiveUser?.employeeCode || '');
      const uEmail = String(effectiveUser?.email || '').toLowerCase().trim();

      // Find user index in employees list
      let empIndex = employees.findIndex(e =>
        (e._id && String(e._id) === uId) ||
        (e.employeeCode && String(e.employeeCode) === uCode) ||
        (e.email && String(e.email).toLowerCase().trim() === uEmail)
      );

      // If self-service, verify current password
      if (isSelf) {
        if (!currentPassword) {
          setErrorMsg('Please enter your current password.');
          setIsSubmitting(false);
          return;
        }

        let existingPass = 'admin123';
        if (empIndex >= 0 && employees[empIndex].password) {
          existingPass = employees[empIndex].password;
        } else if (currentUser?.password) {
          existingPass = currentUser.password;
        } else if (effectiveUser?.isAdmin || effectiveUser?.role?.toLowerCase().includes('admin')) {
          existingPass = 'admin123';
        } else {
          existingPass = 'emp123';
        }

        if (currentPassword !== existingPass) {
          setErrorMsg('Incorrect current password. Please enter your valid existing password.');
          setIsSubmitting(false);
          return;
        }
      }

      // Update employee record
      if (empIndex >= 0) {
        employees[empIndex] = {
          ...employees[empIndex],
          password: newPassword,
          passwordUpdatedAt: new Date().toISOString()
        };
      } else {
        // Fallback create / push record
        employees.push({
          ...effectiveUser,
          password: newPassword,
          passwordUpdatedAt: new Date().toISOString()
        });
      }

      saveCollection(KEYS.EMPLOYEES, employees);

      // If updating self, update active session
      if (isSelf) {
        const updatedUser = {
          ...(currentUser || {}),
          password: newPassword
        };
        setCurrentUser?.(updatedUser);
        localStorage.setItem('ems_auth_session', JSON.stringify(updatedUser));
      }

      window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: KEYS.EMPLOYEES } }));

      setSuccessMsg(`Password successfully updated for ${effectiveUser?.name || 'Account'}!`);
      addToast('Password updated successfully!', 'success');

      setTimeout(() => {
        onClose();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setErrorMsg('');
        setSuccessMsg('');
      }, 1400);

    } catch (err) {
      console.error('Password change error:', err);
      setErrorMsg('An unexpected error occurred while saving password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      zIndex: 1100,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Key size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                {isSelf ? 'Change Your Password' : `Reset Password for ${effectiveUser?.name || 'Employee'}`}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
                {isSelf ? 'Enter your current password to set a new password.' : 'Admin override: Set or generate a new login password.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Target User Info Badge */}
          <div style={{
            padding: '10px 12px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '11px'
              }}>
                {(effectiveUser?.name || 'U').charAt(0)}
              </div>
              <div>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{effectiveUser?.name}</span>
                <span style={{ color: '#64748b', marginLeft: '6px' }}>({effectiveUser?.employeeCode || 'ID: User'})</span>
              </div>
            </div>
            <span style={{
              fontSize: '10.5px',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: '#eff6ff',
              color: '#2563eb'
            }}>
              {effectiveUser?.role || 'Member'}
            </span>
          </div>

          {/* Error / Success Banners */}
          {errorMsg && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#047857',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Password Field (Required for Self-Service) */}
          {isSelf && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
                Current Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 36px 9px 12px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Admin Fast Helper: Auto Generate Button */}
          {!isSelf && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleAutoGenerate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} />
                <span>🔄 Auto-Generate Temporary Password</span>
              </button>
            </div>
          )}

          {/* New Password Field */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                New Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {isSelf && (
                <button
                  type="button"
                  onClick={handleAutoGenerate}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Suggest Strong Pass
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                style={{
                  width: '100%',
                  padding: '9px 36px 9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password Field */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '5px' }}>
              Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                style={{
                  width: '100%',
                  padding: '9px 36px 9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Copy newly generated password helper if Admin */}
          {!isSelf && newPassword && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#f0fdf4',
              borderRadius: '7px',
              border: '1px solid #bbf7d0',
              fontSize: '12px'
            }}>
              <span style={{ color: '#166534' }}>
                New Password to give employee: <strong>{newPassword}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(newPassword)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #86efac',
                  color: '#166534',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {/* Modal Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '12.5px',
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              <Lock size={13} />
              <span>{isSubmitting ? 'Saving...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
