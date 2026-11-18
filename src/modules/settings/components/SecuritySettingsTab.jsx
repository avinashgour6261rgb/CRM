/**
 * @file SecuritySettingsTab.jsx
 * @description Real Account Security & Session Management:
 * - Backend-verified password change (never stores plaintext password in localStorage)
 * - Real current device session details (no fake devices or dummy 2FA)
 * - Real "Logout All Other Devices" via backend JWT tokenVersion revocation
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Laptop,
  LogOut,
  Eye,
  EyeOff
} from 'lucide-react';
import { useHR } from '../../hr/context/HRContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { API_BASE, getAuthHeaders } from '../../../shared/config/apiConfig';

const detectCurrentDeviceLabel = () => {
  try {
    const ua = navigator.userAgent || '';
    const os = /Windows/i.test(ua)
      ? 'Windows'
      : /Mac OS X|Macintosh/i.test(ua)
      ? 'macOS'
      : /Android/i.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/i.test(ua)
      ? 'iOS'
      : /Linux/i.test(ua)
      ? 'Linux'
      : 'Desktop';
    const browser = /Edg\//i.test(ua)
      ? 'Microsoft Edge'
      : /Chrome\//i.test(ua)
      ? 'Chrome Browser'
      : /Firefox\//i.test(ua)
      ? 'Firefox'
      : /Safari\//i.test(ua)
      ? 'Safari'
      : 'Web Browser';
    return `${os} (${browser})`;
  } catch {
    return 'Current Browser Session';
  }
};

export const SecuritySettingsTab = () => {
  const { currentUser: hrUser } = useHR();
  const { currentUser: authUser, setCurrentUser } = useAuth();
  const { addToast } = useToast();

  const currentUser = authUser || hrUser;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const currentDeviceLabel = useMemo(() => detectCurrentDeviceLabel(), []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      addToast('Please enter your current password to verify identity.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast('New password must be at least 6 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('New password and confirm password do not match.', 'error');
      return;
    }

    setPasswordUpdating(true);
    try {
      // 1. Verify current password directly against backend authentication
      const identifier = currentUser?.email || currentUser?.employeeCode;
      if (!identifier) {
        throw new Error('Could not identify your account. Please sign in again.');
      }

      const verifyRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password: currentPassword })
      });
      if (!verifyRes.ok) {
        addToast('Incorrect current password. Please verify and try again.', 'error');
        return;
      }

      // 2. Persist new password to MongoDB (backend hashes via scrypt + updates encrypted Admin Vault)
      const targetId = currentUser?._id || currentUser?.employeeCode;
      const nowIso = new Date().toISOString();
      const updateRes = await fetch(`${API_BASE}/employees/${targetId}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          password: newPassword,
          passwordUpdatedAt: nowIso
        })
      });
      if (!updateRes.ok) {
        const errJson = await updateRes.json().catch(() => null);
        throw new Error(errJson?.message || `Failed to update password (${updateRes.status})`);
      }

      // 3. Clean any legacy plaintext password from localStorage & update session metadata only
      try {
        localStorage.removeItem('ems_master_password');
        const savedAuth = localStorage.getItem('ems_auth_session');
        if (savedAuth) {
          const parsed = JSON.parse(savedAuth);
          delete parsed.password;
          parsed.passwordUpdatedAt = nowIso;
          localStorage.setItem('ems_auth_session', JSON.stringify(parsed));
          setCurrentUser?.(parsed);
        }
      } catch (_) {}

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('Password updated securely in database!', 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to update password. Please try again.', 'error');
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleLogoutOtherDevices = async () => {
    setRevokingOthers(true);
    try {
      const res = await fetch(`${API_BASE}/auth/logout-other-devices`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || `Failed to revoke sessions (${res.status})`);
      }
      if (json?.token) {
        localStorage.setItem('ems_auth_token', json.token);
      }
      addToast('All other logged-in devices have been signed out immediately!', 'success');
    } catch (err) {
      addToast(err?.message || 'Could not revoke other sessions right now.', 'error');
    } finally {
      setRevokingOthers(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-4">

      {/* ── Section 1: Change Password ── */}
      <div className="p-[22px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2.5 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <KeyRound size={18} className="text-blue-600" />
            <div>
              <h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 m-0">
                Change Account Password
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Signed in as <strong>{currentUser?.name || 'User'}</strong> ({currentUser?.employeeCode || currentUser?.email || ''})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords(v => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {showPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{showPasswords ? 'Hide' : 'Show'}</span>
          </button>
        </div>

        <form onSubmit={handleUpdatePassword} className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4 items-end">
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Current Password *
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              New Password *
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Confirm New Password *
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[13px] outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={passwordUpdating}
              className="w-full px-[18px] py-[9px] rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white border-0 text-[13px] font-bold cursor-pointer disabled:opacity-50 transition-colors"
            >
              {passwordUpdating ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 px-3.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-2.5">
          <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            <strong>Encrypted Server Authentication:</strong> Your current password is verified directly on the server, and your new password is stored hashed in MongoDB Atlas (never saved in plain text in your browser).
            {currentUser?.passwordUpdatedAt && (
              <span className="block mt-1 text-[11px] opacity-85">
                Last updated: {new Date(currentUser.passwordUpdatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Active Session & Remote Sign-Out ── */}
      <div className="p-[22px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <div>
            <h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 mb-1">
              Active Session Control
            </h4>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 m-0">
              Sign out your account from all other browsers, laptops, or phones while staying signed in here.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogoutOtherDevices}
            disabled={revokingOthers}
            className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-[12.5px] font-semibold cursor-pointer disabled:opacity-60 transition-colors"
          >
            <LogOut size={14} />
            {revokingOthers ? 'Signing out others...' : 'Logout from All Other Devices'}
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Laptop size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                <span>{currentDeviceLabel}</span>
                <span className="text-[11px] text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-950/60 px-1.5 py-0.5 rounded">
                  Current Session
                </span>
              </div>
              <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                {currentUser?.email || currentUser?.employeeCode || 'Authenticated'} • Active Now
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
