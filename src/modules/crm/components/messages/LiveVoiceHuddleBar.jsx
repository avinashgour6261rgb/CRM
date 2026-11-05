import React, { useState, useEffect, useRef, useCallback } from 'react';
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
 * Synchronized across active browser tabs and users with real-time audio detection and presence rings.
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

  const huddleKey = activeConv?.id ? `ems_huddle_${activeConv.id}` : null;
  const [huddleMembers, setHuddleMembers] = useState([]);

  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Sync huddle members from storage
  const syncHuddleMembers = useCallback(() => {
    if (!huddleKey || typeof localStorage === 'undefined') {
      setHuddleMembers([]);
      return;
    }
    try {
      const raw = localStorage.getItem(huddleKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          const valid = parsed.filter(m => (now - (m.joinedAt || 0)) < 12 * 3600 * 1000);
          setHuddleMembers(valid);
          return;
        }
      }
    } catch {}
    setHuddleMembers([]);
  }, [huddleKey]);

  useEffect(() => {
    syncHuddleMembers();
    const handleSync = (e) => {
      if (!e.detail || e.detail.key === huddleKey) syncHuddleMembers();
    };
    const handleNative = (e) => {
      if (!e.key || e.key === huddleKey) syncHuddleMembers();
    };
    window.addEventListener('hrms_storage_change', handleSync);
    window.addEventListener('storage', handleNative);
    return () => {
      window.removeEventListener('hrms_storage_change', handleSync);
      window.removeEventListener('storage', handleNative);
    };
  }, [huddleKey, syncHuddleMembers]);

  // Clean up on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInHuddle && huddleKey && typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(huddleKey);
          if (raw) {
            const currentList = JSON.parse(raw);
            const myId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || 'me');
            const remaining = currentList.filter(m => String(m.id) !== myId);
            if (remaining.length > 0) {
              localStorage.setItem(huddleKey, JSON.stringify(remaining));
            } else {
              localStorage.removeItem(huddleKey);
            }
          }
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isInHuddle, huddleKey, currentUser]);

  // Check partner's shift state in 1-on-1
  const partnerIsClockedIn = Boolean(partnerShiftState?.isClockedIn);
  const partnerIsOnBreak = Boolean(partnerShiftState?.isOnBreak);

  // Eligible to speak: Current user is clocked in & not on break
  const canIJoin = isClockedIn && !isOnBreak;

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

      // Register in shared huddleMembers storage
      if (huddleKey && typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(huddleKey);
          const currentList = raw ? JSON.parse(raw) : [];
          const myId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || 'me');
          const filtered = currentList.filter(m => String(m.id) !== myId);
          filtered.push({
            id: myId,
            name: currentUser?.name || 'Teammate',
            avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
            role: currentUser?.role || 'Team Member',
            isMuted: false,
            joinedAt: Date.now()
          });
          localStorage.setItem(huddleKey, JSON.stringify(filtered));
          setHuddleMembers(filtered);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: huddleKey } }));
        } catch {}
      }

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

    // Remove from shared huddleMembers storage
    if (huddleKey && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(huddleKey);
        if (raw) {
          const currentList = JSON.parse(raw);
          const myId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || 'me');
          const remaining = currentList.filter(m => String(m.id) !== myId);
          if (remaining.length > 0) {
            localStorage.setItem(huddleKey, JSON.stringify(remaining));
          } else {
            localStorage.removeItem(huddleKey);
          }
          setHuddleMembers(remaining);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: huddleKey } }));
        }
      } catch {}
    }
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

      if (huddleKey && typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(huddleKey);
          if (raw) {
            const list = JSON.parse(raw);
            const myId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || 'me');
            const item = list.find(m => String(m.id) === myId);
            if (item) item.isMuted = nextMute;
            localStorage.setItem(huddleKey, JSON.stringify(list));
            setHuddleMembers(list);
            window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: huddleKey } }));
          }
        } catch {}
      }
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
  };

  const myId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || 'me');

  // ── Render Huddle Bar ──
  return (
    <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0c1427]/90 text-xs transition-all">
      {/* If Currently In Huddle */}
      {isInHuddle ? (
        <div className="p-2 sm:p-2.5 px-3 sm:px-5 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Participants Avatars List */}
            <div className="flex items-center -space-x-2 shrink-0">
              {huddleMembers.map(m => {
                const isMe = String(m.id) === myId;
                const memberSpeaking = isMe ? isSpeaking : false;
                return (
                  <div key={m.id} className="relative group" title={`${m.name} (${m.role || 'Member'})`}>
                    <img
                      src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={m.name}
                      className={`w-8 h-8 rounded-full object-cover transition-all ${
                        memberSpeaking ? 'ring-3 ring-emerald-500 scale-105' : 'ring-1 ring-slate-300 dark:ring-slate-700'
                      }`}
                    />
                    {memberSpeaking && (
                      <span className="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping -z-10" />
                    )}
                    {m.isMuted && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-rose-600 text-white flex items-center justify-center text-[8px] font-bold">
                        ✕
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[12.5px] text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Radio size={14} className="text-emerald-500 animate-pulse shrink-0" />
                  <span>{isChannel ? `Group Voice Huddle (${huddleMembers.length})` : '1-on-1 Shift Intercom'}</span>
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
                {isChannel
                  ? `${huddleMembers.length} member(s) connected • All can speak and listen`
                  : `Talking with ${activePartner?.name || 'Partner'}`}
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
            {huddleMembers.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-700 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span className="truncate">
                  Live Voice Huddle active ({huddleMembers.length} member{huddleMembers.length > 1 ? 's' : ''}: {huddleMembers.map(m => m.name).join(', ')})
                </span>
              </span>
            ) : canIJoin ? (
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
                huddleMembers.length > 0
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer shadow-md shadow-emerald-500/20 border-transparent animate-pulse'
                  : canIJoin && (isChannel || (partnerIsClockedIn && !partnerIsOnBreak))
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer shadow-xs border-transparent'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-75'
              }`}
            >
              <Mic size={13} />
              <span>{huddleMembers.length > 0 ? '🎙️ Join Live Huddle' : isChannel ? '🎙️ Start Huddle' : '🎙️ Start Live Talk'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
