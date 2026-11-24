import React, { useEffect } from 'react';
import { Phone, PhoneOff, Radio, Lock } from 'lucide-react';
import { ringtoneService } from '../../utils/ringtoneService';

/**
 * @file IncomingCallModal.jsx
 * @description WhatsApp-Style Incoming Live Voice Call Modal.
 * Displays targeted incoming call notification with concentric pulse waves,
 * caller identity card, ringtone playback, and instant Accept / Decline actions.
 */
export const IncomingCallModal = ({
  incomingCall,
  onAccept,
  onDecline
}) => {
  // Keyboard accessibility: Enter = Accept, Escape = Decline
  useEffect(() => {
    if (!incomingCall) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDecline();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        ringtoneService.unlock();
        onAccept();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [incomingCall, onAccept, onDecline]);

  if (!incomingCall) return null;

  const { caller, isChannel, channelName } = incomingCall;
  const callerName = caller?.name || 'Colleague';
  const callerAvatar = caller?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
  const callerRole = caller?.role || 'Team Member';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#111c35] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
        {/* Subtle decorative glowing background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

        {/* Call Type Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 text-[11px] font-extrabold mb-5 shadow-xs">
          <Radio size={12} className="text-emerald-500 animate-pulse" />
          <span>{isChannel ? `Voice Huddle • #${channelName || 'channel'}` : 'Incoming Live Voice Call'}</span>
        </div>

        {/* Caller Avatar with Concentric Ringing Waves */}
        <div className="relative mb-6 my-2">
          {/* Animated concentric pulse rings */}
          <span className="absolute -inset-3 rounded-full bg-emerald-500/20 animate-ping duration-1000" />
          <span className="absolute -inset-6 rounded-full bg-emerald-500/10 animate-pulse duration-1500" />

          <img
            src={callerAvatar}
            alt={callerName}
            className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-[#111c35] shadow-xl relative z-10"
          />

          <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111c35] flex items-center justify-center text-white z-20 shadow-md">
            <Phone size={12} />
          </span>
        </div>

        {/* Caller Identity */}
        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight m-0">
          {callerName}
        </h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 mb-1">
          {callerRole}
        </p>
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
          Ringing... Live WebRTC Audio Call
        </p>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-6 mt-6 w-full pt-2">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={onDecline}
              className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center cursor-pointer border-0 shadow-lg shadow-rose-500/30 transition-all hover:scale-105"
              title="Decline Call (Esc)"
            >
              <PhoneOff size={22} />
            </button>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Decline
            </span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                ringtoneService.unlock();
                onAccept();
              }}
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center cursor-pointer border-0 shadow-lg shadow-emerald-500/30 transition-all hover:scale-110 animate-bounce duration-700"
              title="Accept Live Call (Enter)"
            >
              <Phone size={22} className="animate-pulse" />
            </button>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              Accept
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
