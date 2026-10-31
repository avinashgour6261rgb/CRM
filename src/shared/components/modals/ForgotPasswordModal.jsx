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
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[1200] p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[14px] w-full max-w-[440px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <HelpCircle size={17} />
            </div>
            <div>
              <h3 className="m-0 text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
                Forgot Your Password?
              </h3>
              <p className="m-0 mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                Account recovery and password reset assistance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {status === 'success' ? (
            <div className="flex flex-col gap-3.5 text-center items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="m-0 mb-1.5 text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
                  Reset Request Logged
                </h4>
                <p className="m-0 text-[12.5px] text-slate-600 dark:text-slate-300 leading-normal">
                  We found your account for <strong>{matchedEmp?.name}</strong> ({matchedEmp?.employeeCode}).
                </p>
                <div className="mt-3 p-2.5 px-3.5 bg-sky-50 dark:bg-sky-950/40 rounded-lg border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300 text-left leading-relaxed">
                  ℹ️ An urgent account request ticket has been dispatched to your Workspace Admin & HR team. Your Admin can reset your password directly from the <strong>Employee Directory</strong>.
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-[7px] bg-blue-600 hover:bg-blue-700 text-white border-0 text-[13px] font-bold cursor-pointer mt-1.5 shadow-sm transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          ) : status === 'admin_reset' ? (
            <div className="flex flex-col gap-3.5">
              <div className="p-3 px-3.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[12.5px] text-blue-800 dark:text-blue-200 leading-relaxed">
                👑 <strong>Master Administrator Account Detected</strong>
                <p className="m-0 mt-1 text-[11.5px] text-blue-700 dark:text-blue-300">
                  Please enter your new secure password below to reset your Administrator credentials.
                </p>
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">
                    New Admin Password:
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new secure password (e.g. Admin@2026)"
                    value={newAdminPass}
                    onChange={e => setNewAdminPass(e.target.value)}
                    className="w-full p-2 px-3 rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-600 box-border"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-1.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-[7px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSetAdminPassword}
                  className="px-4 py-2 rounded-[7px] border-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-sm transition-colors"
                >
                  Set New Password & Apply
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetRequest} className="flex flex-col gap-3.5">
              <p className="m-0 text-[12.5px] text-slate-500 dark:text-slate-400 leading-normal">
                Enter your registered <strong>Work Email</strong> or <strong>Employee ID</strong> (e.g. <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">EMP-001</code>). We will verify your profile and notify Admin to issue a new temporary password.
              </p>

              {status === 'not_found' && (
                <div className="p-2.5 px-3 rounded-[7px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-1.5">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>No employee found with that email or ID. Please double-check with HR.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Work Email or Employee ID <span className="text-red-500">*</span>
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
                  className="w-full py-2 px-3 rounded-[7px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 box-border transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-[7px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-[7px] border-0 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer shadow-sm transition-colors disabled:opacity-70"
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
