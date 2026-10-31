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
    <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-[1100] p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[14px] w-full max-w-[460px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-[34px] h-[34px] rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Key size={18} />
            </div>
            <div>
              <h3 className="m-0 text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
                {isSelf ? 'Change Your Password' : `Reset Password for ${effectiveUser?.name || 'Employee'}`}
              </h3>
              <p className="m-0 mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                {isSelf ? 'Enter your current password to set a new password.' : 'Admin override: Set or generate a new login password.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-transparent border-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3.5">
          
          {/* Target User Info Badge */}
          <div className="p-2.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                {(effectiveUser?.name || 'U').charAt(0)}
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100">{effectiveUser?.name}</span>
                <span className="text-slate-500 dark:text-slate-400 ml-1.5">({effectiveUser?.employeeCode || 'ID: User'})</span>
              </div>
            </div>
            <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              {effectiveUser?.role || 'Member'}
            </span>
          </div>

          {/* Error / Success Banners */}
          {errorMsg && (
            <div className="p-2.5 px-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Password Field (Required for Self-Service) */}
          {isSelf && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  className="w-full py-2 pl-3 pr-9 rounded-[7px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all box-border"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Admin Fast Helper: Auto Generate Button */}
          {!isSelf && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAutoGenerate}
                className="inline-flex items-center gap-1 bg-transparent border-0 text-blue-600 dark:text-blue-400 text-[11.5px] font-bold cursor-pointer hover:underline"
              >
                <RefreshCw size={12} />
                <span>🔄 Auto-Generate Temporary Password</span>
              </button>
            </div>
          )}

          {/* New Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                New Password <span className="text-red-500">*</span>
              </label>
              {isSelf && (
                <button
                  type="button"
                  onClick={handleAutoGenerate}
                  className="bg-transparent border-0 text-blue-600 dark:text-blue-400 text-[11px] font-bold cursor-pointer hover:underline"
                >
                  Suggest Strong Pass
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full py-2 pl-3 pr-9 rounded-[7px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all box-border"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full py-2 pl-3 pr-9 rounded-[7px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all box-border"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Copy newly generated password helper if Admin */}
          {!isSelf && newPassword && (
            <div className="flex items-center justify-between p-2 px-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-[7px] border border-emerald-200 dark:border-emerald-900/50 text-xs">
              <span className="text-emerald-800 dark:text-emerald-300">
                New Password to give employee: <strong>{newPassword}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(newPassword)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-[7px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[12.5px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[7px] border-0 bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-bold cursor-pointer shadow-sm hover:shadow transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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
