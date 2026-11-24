import React, { useEffect } from 'react';
import { Monitor, X, Eye, Sparkles } from 'lucide-react';

/**
 * @file IncomingScreenShareModal.jsx
 * @description Non-intrusive App-Wide Incoming Screen Share Alert Modal.
 * Appears whenever a teammate initiates a screen share session targeted to the user or their channel.
 * Provides instant "Watch Screen" and "Dismiss" actions with zero page disruption.
 */
export const IncomingScreenShareModal = ({
  incomingSession,
  onWatch,
  onDismiss
}) => {
  // Keyboard accessibility: Enter = Watch, Escape = Dismiss
  useEffect(() => {
    if (!incomingSession) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onWatch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [incomingSession, onWatch, onDismiss]);

  if (!incomingSession) return null;

  const { host, isChannel, channelName } = incomingSession;
  const hostName = host?.name || 'Teammate';
  const hostAvatar = host?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
  const hostRole = host?.role || 'Team Member';

  return (
    <div className="fixed top-5 right-5 z-[9998] max-w-sm w-full animate-slideIn select-none">
      <div className="bg-slate-900/95 dark:bg-[#111c35]/95 backdrop-blur-md border border-indigo-500/40 shadow-2xl rounded-2xl p-4 text-white overflow-hidden relative">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

        {/* Top bar with close button */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-extrabold uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            <span>{isChannel ? `Screen Share • #${channelName || 'channel'}` : 'Live Screen Stream'}</span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer border-0 transition-colors"
            title="Dismiss (Esc)"
          >
            <X size={14} />
          </button>
        </div>

        {/* Presenter Information */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative shrink-0">
            <img
              src={hostAvatar}
              alt={hostName}
              className="w-11 h-11 rounded-full object-cover border-2 border-indigo-400/50 shadow-md"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-600 border border-white flex items-center justify-center text-white shadow-xs">
              <Monitor size={9} />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white truncate m-0">
              {hostName}
            </h4>
            <p className="text-[11px] text-slate-400 truncate m-0 mt-0.5">
              {hostRole} • started sharing screen
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs cursor-pointer border border-slate-700 transition-colors"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onWatch}
            className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs cursor-pointer border-0 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Eye size={13} />
            <span>Watch Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
