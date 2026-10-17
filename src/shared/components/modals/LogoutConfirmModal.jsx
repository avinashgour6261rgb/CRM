import React from 'react';
import { LogOut, X, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

export const LogoutConfirmModal = ({ isOpen, onClose, onConfirm, user = null, isShiftActive = false }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          overflow: 'hidden',
          animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Decorative Banner */}
        <div
          style={{
            height: '6px',
            background: 'linear-gradient(90deg, #ef4444 0%, #f97316 50%, #dc2626 100%)'
          }}
        />

        <div style={{ padding: '24px' }}>
          {/* Close Button & Icon Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626'
              }}
            >
              <LogOut size={24} />
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Title & Message */}
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
            Ready to Sign Out?
          </h3>
          <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5', margin: '0 0 16px 0' }}>
            Are you sure you want to end your current session? You can sign back in anytime with your credentials.
          </p>

          {/* User Profile Card */}
          {user && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px'
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'User'}
                  style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    color: '#475569'
                  }}
                >
                  {(user.name || 'U').charAt(0)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {user.role || 'Member'} • {user.employeeCode || 'EMP'}
                </div>
              </div>
            </div>
          )}

          {/* Shift State Note */}
          {isShiftActive && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: '#fffbeb',
                borderRadius: '8px',
                border: '1px solid #fef3c7',
                fontSize: '12px',
                color: '#b45309',
                marginBottom: '20px'
              }}
            >
              <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0 }} />
              <span>Your shift timer will safely pause and your progress is preserved.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 16px',
                borderRadius: '9px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '13.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Stay Logged In
            </button>

            <button
              type="button"
              onClick={onConfirm}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px 18px',
                borderRadius: '9px',
                border: 'none',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <LogOut size={16} />
              <span>Yes, Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
