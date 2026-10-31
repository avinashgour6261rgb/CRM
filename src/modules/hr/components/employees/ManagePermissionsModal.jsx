import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ShieldCheck, Check, Sparkles, AlertCircle, Key, RefreshCw, Copy, Lock } from 'lucide-react';
import { useToast } from '../../../../shared/context/ToastContext';
import {
  GRANULAR_PERMISSIONS_LIST,
  getUserModulePermissions,
  setUserPermissions,
  canUserGrantPermissions
} from '../../../../shared/utils/permissionUtils';
import { useHR } from '../../context/HRContext';
import { ChangePasswordModal } from '../../../../shared/components/modals/ChangePasswordModal';

export const ManagePermissionsModal = ({ isOpen, onClose, employee }) => {
  const { addToast } = useToast();
  const { updateEmployee, currentUser } = useHR();

  const [permissions, setPermissions] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPass, setGeneratedPass] = useState('');
  const [passCopied, setPassCopied] = useState(false);
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);

  const canEdit = canUserGrantPermissions(currentUser);

  useEffect(() => {
    if (employee && isOpen) {
      const active = getUserModulePermissions(employee);
      setPermissions(active || {});
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const handleToggle = (key) => {
    if (!canEdit) {
      addToast('Only Admin or authorized managers can alter permissions', 'error');
      return;
    }
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectAll = (grantAll) => {
    if (!canEdit) return;
    const updated = {};
    GRANULAR_PERMISSIONS_LIST.forEach(p => {
      updated[p.key] = grantAll;
    });
    setPermissions(prev => ({ ...prev, ...updated }));
  };

  const handleGeneratePassword = async () => {
    if (!canEdit) return;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#';
    let newPass = '';
    for (let i = 0; i < 8; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPass(newPass);
    try {
      await updateEmployee(employee._id, {
        ...employee,
        password: newPass,
        passwordUpdatedAt: new Date().toISOString()
      });
      addToast(`New password generated and saved for ${employee.name}!`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Error saving generated password', 'error');
    }
  };

  const handleCopyPass = () => {
    navigator.clipboard?.writeText(generatedPass);
    setPassCopied(true);
    setTimeout(() => setPassCopied(false), 2000);
    addToast('Password copied to clipboard!', 'info');
  };

  const handleSave = async () => {
    if (!canEdit) {
      addToast('Unauthorized: You do not have permission to grant access', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const userKey = employee.employeeCode || employee._id;
      // 1. Save to global permissions map
      setUserPermissions(userKey, permissions);
      if (employee._id) setUserPermissions(employee._id, permissions);
      if (employee.email) setUserPermissions(employee.email, permissions);

      // 2. Persist directly onto the employee profile
      await updateEmployee(employee._id, {
        ...employee,
        permissions
      });

      addToast(`Access permissions updated for ${employee.name}!`, 'success');
      onClose();
    } catch (err) {
      addToast('Failed to save permissions: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Access & Permissions: ${employee.name}`}
      subtitle={`Configure granular module access for ${employee.role} (#${employee.employeeCode || employee._id})`}
      maxWidth="680px"
    >
      <div className="flex flex-col gap-4">
        {/* User Summary Pill */}
        <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2.5">
            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={employee.name}
                className="w-[38px] h-[38px] rounded-full object-cover"
              />
            ) : (
              <div className="w-[38px] h-[38px] rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                {employee.name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-slate-900">
                {employee.name}
              </div>
              <div className="text-xs text-slate-500">
                {employee.role} • {employee.department} • ID: {employee.employeeCode}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              disabled={!canEdit}
              className={`py-1 px-2.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 text-[11.5px] font-bold ${canEdit ? 'cursor-pointer hover:bg-blue-100' : 'cursor-not-allowed opacity-60'}`}
            >
              ✓ Grant All
            </button>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              disabled={!canEdit}
              className={`py-1 px-2.5 rounded-md bg-red-50 text-red-600 border border-red-200 text-[11.5px] font-bold ${canEdit ? 'cursor-pointer hover:bg-red-100' : 'cursor-not-allowed opacity-60'}`}
            >
              ✕ Revoke All
            </button>
          </div>
        </div>

        {/* 🔐 Admin Password Management & Instant Generator */}
        <div className="bg-green-50/70 rounded-xl border border-green-300 p-3 px-4 flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-green-100 text-green-600 flex items-center justify-center">
                <Key size={15} />
              </div>
              <div>
                <span className="text-[13px] font-extrabold text-green-800">
                  Login Credentials & Password Control
                </span>
                <span className="text-[11px] text-green-700 ml-2">
                  (Admin can generate or reset employee password anytime)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-md bg-green-600 text-white border-0 text-[11.5px] font-bold cursor-pointer shadow-[0_1px_2px_rgba(22,163,74,0.2)] hover:bg-green-700"
              >
                <RefreshCw size={12} />
                <span>🔄 Generate New Password</span>
              </button>

              <button
                type="button"
                onClick={() => setIsChangePassModalOpen(true)}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-md bg-white dark:bg-slate-800 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800 text-[11.5px] font-bold cursor-pointer hover:bg-green-50 dark:hover:bg-green-950/40"
              >
                <Lock size={12} />
                <span>Custom Reset</span>
              </button>
            </div>
          </div>

          {generatedPass && (
            <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-800 rounded-lg border border-green-300 dark:border-green-800 text-xs mt-1">
              <div>
                <span className="text-green-800 font-semibold">
                  🎉 Active Temporary Password for {employee.name}:
                </span>
                <code className="ml-2 text-[13px] font-extrabold text-emerald-700 bg-green-100 py-0.5 px-2 rounded font-mono">
                  {generatedPass}
                </code>
              </div>

              <button
                type="button"
                onClick={handleCopyPass}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded bg-green-100 border border-green-300 text-green-800 text-[11px] font-bold cursor-pointer hover:bg-green-200"
              >
                {passCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{passCopied ? 'Copied!' : 'Copy Pass'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Security Notice */}
        {!canEdit && (
          <div className="py-2.5 px-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>You do not have delegation rights to modify permissions. Contact Admin.</span>
          </div>
        )}

        {/* Granular Toggles List */}
        <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
          {GRANULAR_PERMISSIONS_LIST.map((item) => {
            const isChecked = !!permissions[item.key];
            return (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className={`flex items-center justify-between p-3 px-3.5 rounded-xl transition-all duration-150 border ${isChecked ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'} ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-lg leading-none">{item.icon}</span>
                  <div>
                    <div className={`text-[13px] font-bold ${isChecked ? 'text-blue-700' : 'text-slate-800'}`}>
                      {item.label}
                    </div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                </div>

                {/* Custom Toggle Switch */}
                <div className={`w-[42px] h-6 rounded-full relative transition-colors duration-200 shrink-0 ${isChecked ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <div className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-[left] duration-200 shadow-sm ${isChecked ? 'left-[21px]' : 'left-[3px]'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[13px] font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !canEdit}
            className={`py-2 px-5 rounded-lg border-0 bg-blue-600 text-white text-[13px] font-bold shadow-[0_2px_6px_rgba(37,99,235,0.3)] hover:bg-blue-700 ${isSaving || !canEdit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            {isSaving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isChangePassModalOpen}
        onClose={() => setIsChangePassModalOpen(false)}
        targetUser={employee}
      />
    </Modal>
  );
};
export default ManagePermissionsModal;
