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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* User Summary Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={employee.name}
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                {employee.name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                {employee.name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {employee.role} • {employee.department} • ID: {employee.employeeCode}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              disabled={!canEdit}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: canEdit ? 'pointer' : 'not-allowed'
              }}
            >
              ✓ Grant All
            </button>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              disabled={!canEdit}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: canEdit ? 'pointer' : 'not-allowed'
              }}
            >
              ✕ Revoke All
            </button>
          </div>
        </div>

        {/* 🔐 Admin Password Management & Instant Generator */}
        <div style={{
          backgroundColor: '#f0fdf4',
          borderRadius: '10px',
          border: '1.5px solid #86efac',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Key size={15} />
              </div>
              <div>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#166534' }}>
                  Login Credentials & Password Control
                </span>
                <span style={{ fontSize: '11px', color: '#15803d', marginLeft: '8px' }}>
                  (Admin can generate or reset employee password anytime)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleGeneratePassword}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)'
                }}
              >
                <RefreshCw size={12} />
                <span>🔄 Generate New Password</span>
              </button>

              <button
                type="button"
                onClick={() => setIsChangePassModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: '#166534',
                  border: '1px solid #86efac',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Lock size={12} />
                <span>Custom Reset</span>
              </button>
            </div>
          </div>

          {generatedPass && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#ffffff',
              borderRadius: '7px',
              border: '1px solid #86efac',
              fontSize: '12px',
              marginTop: '4px'
            }}>
              <div>
                <span style={{ color: '#166534', fontWeight: '600' }}>
                  🎉 Active Temporary Password for {employee.name}:
                </span>
                <code style={{
                  marginLeft: '8px',
                  fontSize: '13px',
                  fontWeight: '800',
                  color: '#047857',
                  backgroundColor: '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}>
                  {generatedPass}
                </code>
              </div>

              <button
                type="button"
                onClick={handleCopyPass}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '5px',
                  backgroundColor: '#dcfce7',
                  border: '1px solid #86efac',
                  color: '#166534',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {passCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{passCopied ? 'Copied!' : 'Copy Pass'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Security Notice */}
        {!canEdit && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#b45309',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>You do not have delegation rights to modify permissions. Contact Admin.</span>
          </div>
        )}

        {/* Granular Toggles List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '420px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {GRANULAR_PERMISSIONS_LIST.map((item) => {
            const isChecked = !!permissions[item.key];
            return (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: isChecked ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                  backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                  cursor: canEdit ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: isChecked ? '#1d4ed8' : '#1e293b' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>

                {/* Custom Toggle Switch */}
                <div style={{
                  width: '42px',
                  height: '24px',
                  borderRadius: '12px',
                  backgroundColor: isChecked ? '#2563eb' : '#cbd5e1',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    top: '3px',
                    left: isChecked ? '21px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !canEdit}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: (isSaving || !canEdit) ? 'not-allowed' : 'pointer',
              opacity: (isSaving || !canEdit) ? 0.6 : 1,
              boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
            }}
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
