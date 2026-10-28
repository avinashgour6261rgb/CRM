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
          wrapper: 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-900',
          icon: <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
        };
      case 'warning':
        return {
          wrapper: 'bg-amber-100 text-amber-600 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900',
          icon: <AlertCircle size={24} className="text-amber-600 dark:text-amber-400" />
        };
      case 'success':
        return {
          wrapper: 'bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900',
          icon: <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
        };
      case 'primary':
      default:
        return {
          wrapper: 'bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900',
          icon: <HelpCircle size={24} className="text-blue-600 dark:text-blue-400" />
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}

      {dialogState.isOpen && (
        <div
          onClick={() => handleClose(false)}
          className="fixed inset-0 z-[99999] bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-[430px] p-6 relative flex flex-col gap-4"
          >
            {/* Close Cross Button */}
            <button
              onClick={() => handleClose(false)}
              className="absolute top-4 right-4 bg-transparent border-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-md flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>

            {/* Icon & Title Row */}
            <div className="flex items-start gap-3.5">
              <div className={`w-[46px] h-[46px] rounded-xl flex items-center justify-center shrink-0 ${badge.wrapper}`}>
                {badge.icon}
              </div>

              <div className="flex-1 pr-4">
                <h3 className="m-0 mb-1 text-[16.5px] font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {dialogState.title}
                </h3>
                <p className="m-0 text-[13.5px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {dialogState.message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              {dialogState.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {dialogState.cancelText}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={() => handleClose(true)}
                className={`px-[18px] py-2 rounded-lg border-0 text-white text-xs font-bold cursor-pointer transition-all shadow-md ${
                  dialogState.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/25'
                    : dialogState.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                }`}
              >
                {dialogState.confirmText}
              </button>
            </div>
          </div>
        </div>
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
