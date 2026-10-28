import React from 'react';
import { LogOut, X, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

export const LogoutConfirmModal = ({ isOpen, onClose, onConfirm, user = null, isShiftActive = false }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl ring-1 ring-slate-200/80 dark:ring-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Decorative Banner */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-600" />

        <div className="p-6">
          {/* Close Button & Icon Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400">
              <LogOut size={24} />
            </div>

            <button
              onClick={onClose}
              className="bg-transparent border-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-1 rounded-lg flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Title & Message */}
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white m-0 mb-2">
            Ready to Sign Out?
          </h3>
          <p className="text-[13.5px] text-slate-500 dark:text-slate-400 leading-relaxed m-0 mb-4">
            Are you sure you want to end your current session? You can sign back in anytime with your credentials.
          </p>

          {/* User Profile Card */}
          {user && (
            <div className="flex items-center gap-3 p-3 px-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-[10px] border border-slate-200 dark:border-slate-700/80 mb-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'User'}
                  className="w-10 h-10 rounded-[10px] object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-[10px] bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                  {(user.name || 'U').charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {user.role || 'Member'} • {user.employeeCode || 'EMP'}
                </div>
              </div>
            </div>
          )}

          {/* Shift State Note */}
          {isShiftActive && (
            <div className="flex items-center gap-2 p-2.5 px-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-700 dark:text-amber-400 mb-5">
              <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Your shift timer will safely pause and your progress is preserved.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-[1fr_1.2fr] gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-[9px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13.5px] font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-all"
            >
              Stay Logged In
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-[18px] rounded-[9px] border-0 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-[13.5px] font-bold cursor-pointer shadow-md shadow-red-600/25 transition-all"
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
