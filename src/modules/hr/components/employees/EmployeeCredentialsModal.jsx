/**
 * @file EmployeeCredentialsModal.jsx
 * @description Official Employee Onboarding Pass & Login Credentials Modal.
 * Allows Admin and HR to view, copy, and print login credentials for any employee.
 */

import React, { useState } from 'react';
import {
  X,
  Key,
  Mail,
  User,
  Copy,
  Check,
  Printer,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Building,
  Calendar,
  Lock,
  Share2
} from 'lucide-react';
import { useToast } from '../../../../shared/context/ToastContext';

export const EmployeeCredentialsModal = ({ isOpen, onClose, employee }) => {
  const { addToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showHistPass, setShowHistPass] = useState({});
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen || !employee) return null;

  // Real-time lookup of freshest employee data from localStorage so updated passwords & history appear instantly
  const targetEmp = (() => {
    try {
      const emps = JSON.parse(localStorage.getItem('hrms_employees') || '[]');
      const found = emps.find(e =>
        (e._id && employee._id && String(e._id) === String(employee._id)) ||
        (e.employeeCode && employee.employeeCode && String(e.employeeCode).toUpperCase() === String(employee.employeeCode).toUpperCase()) ||
        (e.email && employee.email && e.email.toLowerCase() === employee.email.toLowerCase())
      );
      return found ? { ...employee, ...found } : employee;
    } catch (_) {
      return employee;
    }
  })();

  const loginUrl = `${window.location.origin}/login`;
  const empCode = targetEmp.employeeCode || targetEmp.idNumber || 'EMP-001';
  const email = targetEmp.email || 'employee@inforag.com';
  const password = targetEmp.password || 'emp123';
  const name = targetEmp.name || 'Team Member';
  const role = targetEmp.role || targetEmp.systemRole || 'Team Member';
  const department = targetEmp.department || 'General Operations';
  const shiftTiming = targetEmp.shiftTiming || '10:00 AM - 07:00 PM';
  const avatar = targetEmp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120';
  const passwordHistory = Array.isArray(targetEmp.passwordHistory) ? targetEmp.passwordHistory : [];
  const passwordUpdatedAt = targetEmp.passwordUpdatedAt;

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    addToast(`${fieldName} copied to clipboard!`, 'success');
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleCopyAll = () => {
    const histSummary = passwordHistory.length > 0
      ? `\n📜 Past Passwords Archived: ${passwordHistory.length} previous record(s)`
      : '';
    const fullText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 Inforag Management System — Employee Login Pass
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Employee:  ${name}
🆔 Employee ID: ${empCode}
💼 Role:        ${role} (${department})
⏰ Shift:       ${shiftTiming}
🌐 Login Portal:${loginUrl}
📧 Work Email:  ${email}
🔑 Password:    ${password}${histSummary}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Note: Super Admin retains audit access to all credentials & password revision history.`;

    navigator.clipboard.writeText(fullText);
    setCopiedField('all');
    addToast('Full login pass copied to clipboard! Ready to share.', 'success');
    setTimeout(() => {
      setCopiedField(null);
    }, 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[1100] p-4 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-[560px] max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 px-5 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Key size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 m-0">
                  Employee Login Credentials
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-extrabold uppercase tracking-wider">
                  Access Pass
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Official onboarding credentials for system authentication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 flex flex-col gap-5">
          {/* Employee Identity Banner */}
          <div className="flex items-center justify-between p-3.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={avatar}
                alt={name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate m-0">
                    {name}
                  </h3>
                  <span className="text-[10.5px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold shrink-0">
                    {empCode}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                  <span>{role}</span>
                  <span>•</span>
                  <span>{department}</span>
                  {shiftTiming && (
                    <>
                      <span>•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{shiftTiming}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Credentials Detail Card */}
          <div className="flex flex-col gap-3">
            {/* Field 1: Login Portal URL */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <ExternalLink size={13} className="text-blue-600 dark:text-blue-400" />
                  Web Login Portal URL
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(loginUrl, 'Login URL')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0 text-xs"
                >
                  {copiedField === 'Login URL' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  {copiedField === 'Login URL' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="font-mono text-xs text-slate-900 dark:text-slate-100 font-bold bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg break-all">
                {loginUrl}
              </div>
            </div>

            {/* Field 2: Email / Login ID */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-blue-600 dark:text-blue-400" />
                  Work Email (Primary Login ID)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(email, 'Email')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0 text-xs"
                >
                  {copiedField === 'Email' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  {copiedField === 'Email' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="font-mono text-xs text-slate-900 dark:text-slate-100 font-bold bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg select-all">
                {email}
              </div>
            </div>

            {/* Field 3: Employee ID */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-blue-600 dark:text-blue-400" />
                  Employee ID (Alternative Login ID)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(empCode, 'Employee ID')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0 text-xs"
                >
                  {copiedField === 'Employee ID' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  {copiedField === 'Employee ID' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="font-mono text-xs text-slate-900 dark:text-slate-100 font-bold bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg select-all">
                {empCode}
              </div>
            </div>

            {/* Field 4: Password */}
            <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Lock size={13} className="text-blue-600 dark:text-blue-400" />
                  Assigned Login Password
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold flex items-center gap-1 cursor-pointer bg-transparent border-0 text-xs"
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(password, 'Password')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0 text-xs"
                  >
                    {copiedField === 'Password' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    {copiedField === 'Password' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="font-mono text-sm text-blue-950 dark:text-blue-100 font-black bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
                <span>{showPassword ? password : '••••••••••••'}</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                  Live DB Password
                </span>
              </div>
            </div>

            {/* Field 5: Super Admin Vault & Historical Passwords Audit */}
            <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/50 to-indigo-50/30 dark:from-purple-950/30 dark:to-indigo-950/20 flex flex-col gap-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">👑</span>
                  <div>
                    <div className="text-xs font-black text-purple-950 dark:text-purple-200">
                      Super Admin Password Vault & Archive
                    </div>
                    <div className="text-[11px] text-purple-700 dark:text-purple-300">
                      {passwordHistory.length > 0
                        ? `User has updated password ${passwordHistory.length} time(s). All past and current passwords are permanently archived.`
                        : 'Initial password active. Whenever employee updates password, past passwords are saved here.'}
                    </div>
                  </div>
                </div>
                {passwordUpdatedAt && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-bold shrink-0">
                    Updated: {new Date(passwordUpdatedAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {passwordHistory.length > 0 ? (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <span>Archived Previous Passwords ({passwordHistory.length}):</span>
                    <span className="text-[10px] text-slate-500 font-normal">Stored for Super Admin recovery</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 pr-1">
                    {passwordHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900/60 text-xs font-mono shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[9.5px] font-black text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-1.5 py-0.5 rounded">
                            v{passwordHistory.length - idx}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {showHistPass[idx] ? item.password : '••••••••••••'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="hidden sm:inline font-sans text-[10.5px]">
                            {item.changedAt ? new Date(item.changedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Previous'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowHistPass(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer bg-transparent border-0 p-0.5"
                            title={showHistPass[idx] ? 'Hide' : 'Show password'}
                          >
                            {showHistPass[idx] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.password, `Previous Password v${passwordHistory.length - idx}`)}
                            className="text-purple-600 hover:text-purple-700 dark:text-purple-400 cursor-pointer bg-transparent border-0 p-0.5"
                            title="Copy previous password"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-purple-800 dark:text-purple-300 bg-white/70 dark:bg-slate-800/70 p-2 rounded-lg border border-purple-200 dark:border-purple-900/40">
                  🔒 No previous passwords yet. Current password is the only active password. If employee or admin updates it, the old one will be safely kept in this vault.
                </div>
              )}
            </div>
          </div>

          {/* Security Instruction Notice */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 m-0 leading-relaxed">
              <strong>Employee Instruction:</strong> The employee can sign in using either their Work Email or Employee ID with this password. Advise them to update their password upon first login in <em>Settings → Profile</em>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between flex-wrap gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Printer size={14} />
              Print Slip
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-sm shadow-blue-500/25 transition-colors"
              >
                {copiedField === 'all' ? <Check size={14} /> : <Share2 size={14} />}
                {copiedField === 'all' ? 'Copied Full Pass!' : 'Copy Full Pass'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

