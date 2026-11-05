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
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen || !employee) return null;

  const loginUrl = `${window.location.origin}/login`;
  const empCode = employee.employeeCode || employee.idNumber || 'EMP-001';
  const email = employee.email || 'employee@inforag.com';
  const password = employee.password || 'emp123';
  const name = employee.name || 'Team Member';
  const role = employee.role || employee.systemRole || 'Team Member';
  const department = employee.department || 'General Operations';
  const avatar = employee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120';

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    addToast(`${fieldName} copied to clipboard!`, 'success');
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleCopyAll = () => {
    const fullText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 Inforag Management System — Employee Login Pass
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Employee:  ${name}
🆔 Employee ID: ${empCode}
💼 Role:        ${role} (${department})
🌐 Login Portal:${loginUrl}
📧 Work Email:  ${email}
🔑 Password:    ${password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Note: Please log in and change your password in Settings > Profile.`;

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

