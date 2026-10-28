/**
 * @file ConfirmContext.jsx
 * @description Beautiful enterprise-grade confirmation & alert dialog system replacing native browser popups.
 * Provides Promise-based and callback-based `confirm()` and `alert()` modals with rich aesthetics.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertTriangle, AlertCircle, HelpCircle, CheckCircle2, X } from 'lucide-react';

const ConfirmContext = createContext();

let globalConfirm = null;
let globalAlert = null;

export const confirmDialog = (options) => {
  if (globalConfirm) return globalConfirm(options);
  return new Promise((resolve) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (globalConfirm) {
        clearInterval(interval);
        globalConfirm(options).then(resolve);
      } else if (attempts > 40) {
        clearInterval(interval);
        resolve(true);
      }
    }, 50);
  });
};

export const alertDialog = (options) => {
  if (globalAlert) return globalAlert(options);
  return new Promise((resolve) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (globalAlert) {
        clearInterval(interval);
        globalAlert(options).then(resolve);
      } else if (attempts > 40) {
        clearInterval(interval);
        resolve(true);
      }
    }, 50);
  });
};

export const ConfirmProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    type: 'confirm', // 'confirm' | 'alert'
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger', // 'danger' | 'warning' | 'primary' | 'success'
    resolve: null
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      let config = {};
      if (typeof options === 'string') {
        config = { message: options };
      } else if (options && typeof options === 'object') {
        config = options;
      }

      setDialogState({
        isOpen: true,
        type: 'confirm',
        title: config.title || 'Are you sure?',
        message: config.message || 'Are you sure you want to proceed with this action?',
        confirmText: config.confirmText || 'Confirm',
        cancelText: config.cancelText || 'Cancel',
        variant: config.variant || (config.title?.toLowerCase().includes('delete') || config.message?.toLowerCase().includes('delete') || config.message?.toLowerCase().includes('purge') || config.message?.toLowerCase().includes('remove') ? 'danger' : 'primary'),
        resolve: (val) => {
          if (val && typeof config.onConfirm === 'function') {
            config.onConfirm();
          } else if (!val && typeof config.onCancel === 'function') {
            config.onCancel();
          }
          resolve(val);
        }
      });
    });
  }, []);

  const alert = useCallback((options) => {
    return new Promise((resolve) => {
      let config = {};
      if (typeof options === 'string') {
        config = { message: options };
      } else if (options && typeof options === 'object') {
        config = options;
      }

      const msg = String(config.message || '');
      const isSecurityOrDeny = msg.includes('🔒') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('security') || msg.toLowerCase().includes('restriction');
      const isWarning = isSecurityOrDeny || msg.toLowerCase().includes('please') || msg.toLowerCase().includes('required') || msg.toLowerCase().includes('empty') || msg.toLowerCase().includes('cannot') || msg.toLowerCase().includes('failed');

      setDialogState({
        isOpen: true,
        type: 'alert',
        title: config.title || (isSecurityOrDeny ? 'Security Restriction' : isWarning ? 'Attention Required' : 'Notification'),
        message: msg,
        confirmText: config.confirmText || config.okText || 'OK, Got It',
        cancelText: '',
        variant: config.variant || (isSecurityOrDeny ? 'danger' : isWarning ? 'warning' : 'primary'),
        resolve: () => {
          if (typeof config.onOk === 'function') {
            config.onOk();
          }
          resolve(true);
        }
      });
    });
  }, []);

  const handleClose = useCallback((value) => {
    if (dialogState.resolve) {
      dialogState.resolve(value);
    }
    setDialogState(prev => ({ ...prev, isOpen: false, resolve: null }));
  }, [dialogState]);

  useEffect(() => {
    globalConfirm = confirm;
    globalAlert = alert;

    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    // Intercept native browser alert & confirm so ugly native browser dialogs NEVER appear
    window.alert = (msg) => {
      alert(msg);
    };
    window.confirm = (msg) => {
      // Return custom confirm promise (or invoke dialog)
      confirm(msg);
      return false;
    };

    return () => {
      globalConfirm = null;
      globalAlert = null;
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, [confirm, alert]);

  // Handle keyboard events (Escape to cancel, Enter to confirm)
  useEffect(() => {
    if (!dialogState.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogState.isOpen, handleClose]);

  // Badge configuration based on variant
  const getBadgeStyle = () => {
    switch (dialogState.variant) {
      case 'danger':
        return {
          bg: '#fee2e2',
          border: '#fecaca',
          color: '#dc2626',
          icon: <AlertTriangle size={24} color="#dc2626" />
        };
      case 'warning':
        return {
          bg: '#fef3c7',
          border: '#fde68a',
          color: '#d97706',
          icon: <AlertCircle size={24} color="#d97706" />
        };
      case 'success':
        return {
          bg: '#d1fae5',
          border: '#a7f3d0',
          color: '#059669',
          icon: <CheckCircle2 size={24} color="#059669" />
        };
      case 'primary':
      default:
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          color: '#2563eb',
          icon: <HelpCircle size={24} color="#2563eb" />
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}

      {dialogState.isOpen && (
        <>
          <style>{`
            @keyframes fadeInDialog {
              from { opacity: 0; transform: scale(0.96); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <div
            onClick={() => handleClose(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              animation: 'fadeInDialog 0.15s ease-out'
            }}
          >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              width: '100%',
              maxWidth: '430px',
              padding: '24px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Close Cross Button */}
            <button
              onClick={() => handleClose(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#334155'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <X size={18} />
            </button>

            {/* Icon & Title Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: badge.bg,
                  border: `1.5px solid ${badge.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {badge.icon}
              </div>

              <div style={{ flex: 1, paddingRight: '18px' }}>
                <h3
                  style={{
                    margin: '0 0 5px 0',
                    fontSize: '16.5px',
                    fontWeight: '700',
                    color: '#0f172a',
                    lineHeight: '1.3'
                  }}
                >
                  {dialogState.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13.5px',
                    color: '#475569',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {dialogState.message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '8px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9'
              }}
            >
              {dialogState.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  {dialogState.cancelText}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={() => handleClose(true)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: dialogState.variant === 'danger' ? '#dc2626' : (dialogState.variant === 'warning' ? '#d97706' : '#2563eb'),
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: dialogState.variant === 'danger' ? '0 4px 12px rgba(220,38,38,0.22)' : '0 4px 12px rgba(37,99,235,0.22)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.08)'}
                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
              >
                {dialogState.confirmText}
              </button>
            </div>
          </div>
        </div>
      </>
    )}
  </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
