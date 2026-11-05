import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Users,
  Radio,
  Lock,
  Coffee,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useTimer } from '../../../../shared/context/TimerContext';
import { useToast } from '../../../../shared/context/ToastContext';

/**
 * @file LiveVoiceHuddleBar.jsx
 * @description Shift-verified real-time Voice Huddle & Walkie-Talkie Intercom for 1-on-1 and Group Channels.
 * Both users must be actively clocked in with running shift timers to communicate.
 */
export const LiveVoiceHuddleBar = ({
  activeConv,
  currentUser,
  activePartner,
  partnerShiftState,
  isChannel,
  employees
}) => {
  const { isClockedIn, isOnBreak, breakType } = useTimer();
  const { addToast } = useToast();

  const [isInHuddle, setIsInHuddle] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Check partner's shift state in 1-on-1
  const partnerIsClockedIn = Boolean(partnerShiftState?.isClockedIn);
  const partnerIsOnBreak = Boolean(partnerShiftState?.isOnBreak);

  // Eligible to speak: Current user is clocked in & not on break
  const canIJoin = isClockedIn && !isOnBreak;

  // In 1-on-1, both must be clocked in
  const canStart1on1 = canIJoin && partnerIsClockedIn && !partnerIsOnBreak;

  // Disconnect if user clocks out or goes on break
  useEffect(() => {
    if (isInHuddle && (!isClockedIn || isOnBreak)) {
      leaveHuddle();
      addToast('Left Live Voice Huddle: You clocked out or went on break.', 'info');
    }
  }, [isClockedIn, isOnBreak]);

  // Clean up on conversation switch or unmount
  useEffect(() => {
    return () => {
      stopAudioMonitoring();
    };
  }, [activeConv?.id]);

  const startAudioMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudio = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(avg);
          setIsSpeaking(avg > 15 && !isMuted);

          animFrameRef.current = requestAnimationFrame(checkAudio);
        };
        checkAudio();
      }

      setIsInHuddle(true);
      addToast('🎙️ Connected to Live Voice Huddle', 'success');
    } catch (err) {
      console.error('Microphone error in Voice Huddle:', err);
      addToast('Could not access microphone for Voice Huddle.', 'error');
      setIsInHuddle(false);
    }
  };

  const stopAudioMonitoring = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsInHuddle(false);
    setAudioLevel(0);
    setIsSpeaking(false);
  };

  const joinHuddle = () => {
    if (!canIJoin) {
      addToast('🔒 Shift Clock-In Required: You must clock into your shift to join voice talk.', 'warning');
      return;
    }
    if (!isChannel && !partnerIsClockedIn) {
      addToast(`🔴 ${activePartner?.name || 'Partner'} is Clocked Out. Both team members must be clocked in.`, 'warning');
      return;
    }
    if (!isChannel && partnerIsOnBreak) {
      addToast(`☕ ${activePartner?.name || 'Partner'} is currently on ${partnerShiftState?.breakType || 'Break'}.`, 'warning');
      return;
    }
    startAudioMonitoring();
  };

  const leaveHuddle = () => {
    stopAudioMonitoring();
    addToast('Left voice huddle', 'info');
  };

  const toggleMute = () => {
    if (!audioStreamRef.current) return;
    const audioTrack = audioStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const nextMute = !isMuted;
      audioTrack.enabled = !nextMute;
      setIsMuted(nextMute);
      if (nextMute) setIsSpeaking(false);
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
  };

  // ── Render Huddle Bar ──
  return (
    <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0c1427]/90 text-xs transition-all">
      {/* If Currently In Huddle */}
      {isInHuddle ? (
        <div className="p-2 sm:p-2.5 px-3 sm:px-5 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Pulsing Avatar */}
            <div className="relative shrink-0">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={currentUser?.name}
                className={`w-8 h-8 rounded-full object-cover transition-all ${
                  isSpeaking ? 'ring-3 ring-emerald-500 scale-105' : 'ring-1 ring-slate-300 dark:ring-slate-700'
                }`}
              />
              {isSpeaking && (
                <span className="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping -z-10" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[12.5px] text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Radio size={14} className="text-emerald-500 animate-pulse shrink-0" />
                  <span>{isChannel ? 'Group Voice Huddle' : '1-on-1 Shift Intercom'}</span>
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  isSpeaking
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {isMuted ? 'Muted' : isSpeaking ? 'Speaking...' : 'Listening'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isChannel ? 'All clocked-in teammates can speak and listen' : `Talking with ${activePartner?.name || 'Partner'}`}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mute Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              className={`p-1.5 px-2.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                isMuted
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff size={14} /> : <Mic size={14} className="text-emerald-600" />}
              <span className="hidden sm:inline text-[11px]">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {/* Deafen Toggle */}
            <button
              type="button"
              onClick={toggleDeafen}
              className={`p-1.5 px-2 rounded-lg cursor-pointer transition-colors border ${
                isDeafened
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title={isDeafened ? 'Undeafen audio' : 'Deafen (mute incoming)'}
            >
              {isDeafened ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            {/* Leave Button */}
            <button
              type="button"
              onClick={leaveHuddle}
              className="p-1.5 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1 cursor-pointer border-0 shadow-xs transition-colors"
              title="Leave Voice Huddle"
            >
              <PhoneOff size={13} />
              <span className="text-[11px]">Leave</span>
            </button>
          </div>
        </div>
      ) : (
        /* Not In Huddle - Prompt / Status Banner */
        <div className="p-2 px-3 sm:px-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {canIJoin ? (
              !isChannel ? (
                // 1-on-1 check
                partnerIsClockedIn && !partnerIsOnBreak ? (
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-emerald-700 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{activePartner?.name || 'Partner'} is Clocked In • Ready for Live Talk</span>
                  </span>
                ) : partnerIsOnBreak ? (
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-amber-600 dark:text-amber-400">
                    <Coffee size={13} />
                    <span>{activePartner?.name || 'Partner'} is on {partnerShiftState?.breakType || 'Break'} (Voice Intercom Paused)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>{activePartner?.name || 'Partner'} is Clocked Out (Both users must be clocked in)</span>
                  </span>
                )
              ) : (
                // Channel Info
                <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-slate-700 dark:text-slate-300">
                  <Users size={13} className="text-blue-600 dark:text-sky-400" />
                  <span>Team Voice Huddle: Instant voice room for clocked-in channel members</span>
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-amber-600 dark:text-amber-400">
                <Lock size={13} />
                <span>Clock into your shift to enable Live Voice Talk & Walkie-Talkie</span>
              </span>
            )}
          </div>

          {/* Join / Start Button */}
          <div>
            <button
              type="button"
              onClick={joinHuddle}
              disabled={!canIJoin || (!isChannel && (!partnerIsClockedIn || partnerIsOnBreak))}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-[11.5px] transition-all border ${
                canIJoin && (isChannel || (partnerIsClockedIn && !partnerIsOnBreak))
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer shadow-xs border-transparent'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-75'
              }`}
            >
              <Mic size={13} />
              <span>{isChannel ? '🎙️ Join Huddle' : '🎙️ Start Live Talk'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
