import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
  Users,
  Radio,
  Lock,
  Coffee,
  Sparkles,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useUserShiftStatus } from '../../utils/useUserShiftStatus';
import { useToast } from '../../../../shared/context/ToastContext';
import { emitSocketEvent, subscribeSocketEvent } from '../../../../shared/services/socketService';
import { ringtoneService } from '../../utils/ringtoneService';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' }
  ]
};

const formatCallDuration = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
};

const formatDigitalTimer = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * @file LiveVoiceHuddleBar.jsx
 * @description WhatsApp-Style Real-Time Voice Calling & Channel Huddle Bar.
 * Features:
 * 1. Targeted 1-on-1 Voice Calling with Outgoing Ringback & Recipient Ringing Chime.
 * 2. Shift-Gated: Both caller & recipient must be Clocked In (not on break).
 * 3. Mobile-Optimized WebRTC Audio (iOS Safari & Android Chrome compatibility).
 * 4. Lightweight Call History Logging in chat ("📞 Voice Call • 4m 12s", "📞 Missed Voice Call").
 * 5. Strict Zero Audio File Storage (zero memory bloat, zero quota overhead).
 * 6. High-Performance Decoupled Shift State (eliminates 60 re-renders/minute).
 */
export const LiveVoiceHuddleBar = ({
  activeConv,
  currentUser,
  activePartner,
  partnerShiftState,
  isChannel,
  employees,
  sendMessage
}) => {
  // Use decoupled shift status to prevent 60 full-component re-renders per minute
  const { isClockedIn, isOnBreak, breakType } = useUserShiftStatus(currentUser);
  const { addToast } = useToast();

  // Call States: 'idle' | 'outgoing_ringing' | 'connected'
  const [callState, setCallState] = useState('idle');
  const callStateRef = useRef('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const isDeafenedRef = useRef(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const activeCallIdRef = useRef(null);
  const callStartEpochRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const ringingTimeoutRef = useRef(null);

  const huddleKey = activeConv?.id ? `ems_huddle_${activeConv.id}` : null;
  const [huddleMembers, setHuddleMembers] = useState([]);

  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // WebRTC Peer Connections: targetSocketId -> RTCPeerConnection
  const peersRef = useRef(new Map());
  // HTML5 Audio Elements for remote peers: targetSocketId -> HTMLAudioElement
  const audioElementsRef = useRef(new Map());
  // Remote Peer metadata: targetSocketId -> user info
  const peerUsersRef = useRef(new Map());
  // ICE candidate queue before remote description is ready
  const iceCandidatesQueueRef = useRef(new Map());

  const myId = String(currentUser?._id || currentUser?.id || currentUser?.employeeCode || 'me');

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    isDeafenedRef.current = isDeafened;
  }, [isDeafened]);

  // Clean up peer connections and audio elements for a specific socket
  const cleanupPeer = useCallback((socketId) => {
    const pc = peersRef.current.get(socketId);
    if (pc) {
      try { pc.close(); } catch (_) {}
      peersRef.current.delete(socketId);
    }
    const audioEl = audioElementsRef.current.get(socketId);
    if (audioEl) {
      try {
        audioEl.pause();
        audioEl.srcObject = null;
        if (audioEl.parentNode) audioEl.parentNode.removeChild(audioEl);
      } catch (_) {}
      audioElementsRef.current.delete(socketId);
    }
    peerUsersRef.current.delete(socketId);
    iceCandidatesQueueRef.current.delete(socketId);
    setHuddleMembers(prev => prev.filter(m => m.socketId !== socketId));
  }, []);

  // WebRTC Peer Connection Factory (Mobile-Optimized)
  const createPeerConnection = useCallback((targetSocketId, isInitiator, peerUser) => {
    if (peersRef.current.has(targetSocketId)) {
      return peersRef.current.get(targetSocketId);
    }

    let pc;
    try {
      pc = new RTCPeerConnection(RTC_CONFIG);
    } catch (err) {
      console.error('[LiveVoice] RTCPeerConnection creation failed:', err);
      return null;
    }

    // Attach local microphone tracks
    if (audioStreamRef.current) {
      const existingTrackIds = new Set(pc.getSenders().map(s => s.track?.id).filter(Boolean));
      audioStreamRef.current.getAudioTracks().forEach(track => {
        if (!existingTrackIds.has(track.id)) {
          try {
            pc.addTrack(track, audioStreamRef.current);
          } catch (_) {}
        }
      });
    }

    // Remote audio track arrives: Create iOS & Android compatible audio player
    pc.ontrack = (event) => {
      const remoteStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      let audioEl = audioElementsRef.current.get(targetSocketId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.playsInline = true; // Essential for iOS Safari
        audioEl.volume = 1.0;
        audioEl.muted = isDeafenedRef.current;
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
        audioElementsRef.current.set(targetSocketId, audioEl);
      }
      audioEl.srcObject = remoteStream;
      audioEl.muted = isDeafenedRef.current;
      const playPromise = audioEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.warn('[LiveVoice] Remote audio playback requires user interaction:', e);
          const unlock = () => {
            audioEl.play().catch(() => {});
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
          };
          window.addEventListener('click', unlock, { once: true });
          window.addEventListener('keydown', unlock, { once: true });
          window.addEventListener('touchstart', unlock, { once: true });
        });
      }
    };

    // ICE Candidate Exchange
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        emitSocketEvent('voice:signal', {
          targetSocketId,
          signal: { candidate: event.candidate },
          conversationId: activeConv?.id
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupPeer(targetSocketId);
      }
    };

    if (peerUser) {
      peerUsersRef.current.set(targetSocketId, peerUser);
      setHuddleMembers(prev => {
        const already = prev.some(m => m.socketId === targetSocketId || (peerUser.id && String(m.id) === String(peerUser.id)));
        if (already) return prev;
        return [...prev, { ...peerUser, socketId: targetSocketId, isMuted: false }];
      });
    }

    // Initiator creates and sends SDP offer
    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true })
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          emitSocketEvent('voice:signal', {
            targetSocketId,
            signal: { sdp: pc.localDescription },
            user: {
              id: myId,
              name: currentUser?.name || 'Teammate',
              avatar: currentUser?.avatar || '',
              role: currentUser?.role || 'Team Member'
            },
            conversationId: activeConv?.id
          });
        })
        .catch(err => console.error('[LiveVoice] Error creating offer:', err));
    }

    peersRef.current.set(targetSocketId, pc);
    return pc;
  }, [activeConv?.id, myId, currentUser, cleanupPeer]);

  // Setup local microphone stream
  const setupLocalMic = async () => {
    if (audioStreamRef.current) return audioStreamRef.current;

    ringtoneService.unlock();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });
    audioStreamRef.current = stream;

    // Web Audio API for visual speaking pulse detection
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
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

    return stream;
  };

  // Stop all audio, peer connections, and timers
  const stopAllVoice = useCallback(() => {
    ringtoneService.stop();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (ringingTimeoutRef.current) {
      clearTimeout(ringingTimeoutRef.current);
      ringingTimeoutRef.current = null;
    }

    peersRef.current.forEach(pc => {
      try { pc.close(); } catch (_) {}
    });
    peersRef.current.clear();

    audioElementsRef.current.forEach(el => {
      try {
        el.pause();
        el.srcObject = null;
        if (el.parentNode) el.parentNode.removeChild(el);
      } catch (_) {}
    });
    audioElementsRef.current.clear();
    peerUsersRef.current.clear();

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    emitSocketEvent('voice:leave', {
      conversationId: activeConv?.id,
      user: { id: myId }
    });

    setCallState('idle');
    setAudioLevel(0);
    setIsSpeaking(false);
    setCallDuration(0);
    activeCallIdRef.current = null;
    callStartEpochRef.current = null;

    if (huddleKey && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(huddleKey);
        if (raw) {
          const currentList = JSON.parse(raw);
          const remaining = currentList.filter(m => String(m.id) !== myId);
          if (remaining.length > 0) {
            localStorage.setItem(huddleKey, JSON.stringify(remaining));
          } else {
            localStorage.removeItem(huddleKey);
          }
          setHuddleMembers(remaining);
          window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: huddleKey } }));
        }
      } catch (_) {}
    }
  }, [activeConv?.id, huddleKey, myId]);

  // Start Live Duration Ticker on connected call
  const startDurationTimer = () => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    callStartEpochRef.current = Date.now();
    setCallDuration(0);
    durationIntervalRef.current = setInterval(() => {
      if (callStartEpochRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartEpochRef.current) / 1000));
      }
    }, 1000);
  };

  // ── Call Initiation (WhatsApp-Style Outgoing Call) ──
  const startCall = async () => {
    if (!isClockedIn) {
      addToast('🔒 Shift Clock-In Required: You must clock into your shift to start a voice call.', 'warning');
      return;
    }
    if (isOnBreak) {
      addToast('☕ You are on break. Voice calls are unavailable during break.', 'warning');
      return;
    }

    if (!isChannel) {
      if (!partnerShiftState?.isClockedIn) {
        addToast(`🔴 ${activePartner?.name || 'Partner'} is Clocked Out. Both team members must be clocked in.`, 'warning');
        return;
      }
      if (partnerShiftState?.isOnBreak) {
        addToast(`☕ ${activePartner?.name || 'Partner'} is currently on ${partnerShiftState?.breakType || 'Break'}. Call unavailable.`, 'warning');
        return;
      }
    }

    try {
      await setupLocalMic();

      const newCallId = `call_${Date.now()}_${myId}`;
      activeCallIdRef.current = newCallId;

      if (!isChannel) {
        // 1-on-1: Outgoing Ringback Tone & Targeted Ringing
        setCallState('outgoing_ringing');
        ringtoneService.startOutgoingRingback();

        emitSocketEvent('call:initiate', {
          callId: newCallId,
          caller: {
            id: myId,
            name: currentUser?.name || 'Teammate',
            avatar: currentUser?.avatar || '',
            role: currentUser?.role || 'Team Member'
          },
          targetUserId: activePartner?._id || activePartner?.id,
          targetEmployeeCode: activePartner?.employeeCode,
          targetEmail: activePartner?.email,
          conversationId: activeConv?.id,
          isChannel: false,
          channelName: ''
        });

        // 45s Ringing Timeout if recipient doesn't answer
        if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
        ringingTimeoutRef.current = setTimeout(() => {
          if (callState === 'outgoing_ringing' || activeCallIdRef.current === newCallId) {
            cancelCall(true);
          }
        }, 45000);

        addToast(`Calling ${activePartner?.name || 'Partner'}... 📞`, 'info');
      } else {
        // Group Channel: Immediate Huddle Connection
        connectHuddleRoom();
        emitSocketEvent('call:initiate', {
          callId: newCallId,
          caller: {
            id: myId,
            name: currentUser?.name || 'Teammate',
            avatar: currentUser?.avatar || '',
            role: currentUser?.role || 'Team Member'
          },
          conversationId: activeConv?.id,
          isChannel: true,
          channelName: activeConv?.channelName || activeConv?.name || 'Channel'
        });
        addToast('🎙️ Voice Huddle started in channel', 'success');
      }
    } catch (err) {
      console.error('Call initiation error:', err);
      addToast('Could not access microphone. Please grant mic permissions.', 'error');
      stopAllVoice();
    }
  };

  // Cancel outgoing ringing call before recipient answers
  const cancelCall = (wasTimeout = false) => {
    ringtoneService.stop();
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);

    emitSocketEvent('call:cancel', {
      callId: activeCallIdRef.current,
      conversationId: activeConv?.id,
      targetUserId: activePartner?._id || activePartner?.id,
      targetEmployeeCode: activePartner?.employeeCode,
      isChannel
    });

    if (sendMessage && activeConv?.id) {
      sendMessage(activeConv.id, wasTimeout ? '📞 Missed Voice Call (No Answer)' : '📞 Missed Voice Call');
    }

    stopAllVoice();
    addToast(wasTimeout ? 'No answer' : 'Call cancelled', 'info');
  };

  // Connect to live WebRTC audio room once call is accepted
  const connectHuddleRoom = () => {
    ringtoneService.stop();
    setCallState('connected');
    startDurationTimer();

    emitSocketEvent('voice:join', {
      conversationId: activeConv?.id,
      user: {
        id: myId,
        name: currentUser?.name || 'Teammate',
        avatar: currentUser?.avatar || '',
        role: currentUser?.role || 'Team Member'
      }
    });

    const selfMember = {
      id: myId,
      name: currentUser?.name || 'Teammate',
      avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      role: currentUser?.role || 'Team Member',
      isMuted: false,
      joinedAt: Date.now()
    };

    setHuddleMembers(prev => {
      const filtered = prev.filter(m => String(m.id) !== myId);
      return [...filtered, selfMember];
    });

    if (huddleKey && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(huddleKey);
        const currentList = raw ? JSON.parse(raw) : [];
        const filtered = currentList.filter(m => String(m.id) !== myId);
        filtered.push(selfMember);
        localStorage.setItem(huddleKey, JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('hrms_storage_change', { detail: { key: huddleKey } }));
      } catch (_) {}
    }
  };

  // End active call (WhatsApp-style: posts duration text log, zero audio stored)
  const endCall = () => {
    ringtoneService.playCallEndTone();

    const elapsedSeconds = callStartEpochRef.current
      ? Math.max(1, Math.floor((Date.now() - callStartEpochRef.current) / 1000))
      : callDuration;
    const durationText = formatCallDuration(elapsedSeconds);

    emitSocketEvent('call:end', {
      callId: activeCallIdRef.current,
      conversationId: activeConv?.id,
      durationSeconds: elapsedSeconds,
      durationText,
      endedBy: { id: myId, name: currentUser?.name || 'Teammate' },
      targetUserId: activePartner?._id || activePartner?.id,
      targetEmployeeCode: activePartner?.employeeCode
    });

    // Auto-record lightweight text duration to chat (Zero audio storage!)
    if (sendMessage && activeConv?.id && elapsedSeconds > 0) {
      sendMessage(activeConv.id, `📞 Voice Call • ${durationText}`);
    }

    stopAllVoice();
    addToast(`Call ended (${durationText})`, 'info');
  };

  // ── Socket.IO & Custom Window Events Subscriptions ──
  useEffect(() => {
    // 1. Recipient Accepted Call
    const handleAccepted = (data) => {
      const callData = data?.detail || data;
      if (!callData) return;
      if (activeConv?.id && callData.conversationId === activeConv.id) {
        ringtoneService.stop();
        if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
        connectHuddleRoom();
        addToast('📞 Call connected', 'success');
      }
    };

    // 2. Recipient Declined Call
    const handleDeclined = (data) => {
      const callData = data?.detail || data;
      if (!callData) return;
      if (activeConv?.id && callData.conversationId === activeConv.id) {
        ringtoneService.playCallEndTone();
        if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
        stopAllVoice();
        if (sendMessage && activeConv?.id) {
          sendMessage(activeConv.id, '📞 Call Declined');
        }
        addToast(`${activePartner?.name || 'Partner'} declined the call.`, 'warning');
      }
    };

    // 3. Remote Ended Call
    const handleRemoteEnded = (data) => {
      const callData = data?.detail || data;
      if (!callData) return;
      if (activeConv?.id && callData.conversationId === activeConv.id) {
        ringtoneService.playCallEndTone();
        stopAllVoice();
        addToast(`Call ended (${callData.durationText || ''})`, 'info');
      }
    };

    // 4. Remote Cancelled Call
    const handleCancelled = (data) => {
      const callData = data?.detail || data;
      if (!callData) return;
      if (activeConv?.id && callData.conversationId === activeConv.id) {
        ringtoneService.stop();
        stopAllVoice();
      }
    };

    // 5. User accepted call from global IncomingCallModal
    const handleGlobalUserAccepted = async (e) => {
      const callData = e.detail;
      if (!callData || callData.conversationId !== activeConv?.id) return;
      try {
        await setupLocalMic();
        connectHuddleRoom();
      } catch (err) {
        console.error('[LiveVoice] Error joining on accepted call:', err);
      }
    };

    // 6. External Call Trigger (from Chat Header button)
    const handleTriggerCall = (e) => {
      if (e.detail?.conversationId && e.detail.conversationId !== activeConv?.id) return;
      if (callState === 'idle') {
        startCall();
      }
    };

    const unsubAccepted = subscribeSocketEvent('call:accepted', handleAccepted);
    const unsubDeclined = subscribeSocketEvent('call:declined', handleDeclined);
    const unsubEnded = subscribeSocketEvent('call:ended', handleRemoteEnded);
    const unsubCancelled = subscribeSocketEvent('call:cancelled', handleCancelled);

    window.addEventListener('ems_call_accepted', handleAccepted);
    window.addEventListener('ems_call_declined', handleDeclined);
    window.addEventListener('ems_call_ended', handleRemoteEnded);
    window.addEventListener('ems_call_cancelled', handleCancelled);
    window.addEventListener('ems_call_user_accepted', handleGlobalUserAccepted);
    window.addEventListener('ems_trigger_voice_call', handleTriggerCall);

    return () => {
      unsubAccepted();
      unsubDeclined();
      unsubEnded();
      unsubCancelled();
      window.removeEventListener('ems_call_accepted', handleAccepted);
      window.removeEventListener('ems_call_declined', handleDeclined);
      window.removeEventListener('ems_call_ended', handleRemoteEnded);
      window.removeEventListener('ems_call_cancelled', handleCancelled);
      window.removeEventListener('ems_call_user_accepted', handleGlobalUserAccepted);
      window.removeEventListener('ems_trigger_voice_call', handleTriggerCall);
    };
  }, [activeConv?.id, activePartner?.name, sendMessage, stopAllVoice, callState, startCall]);

  // Auto-connect if user accepted call from global IncomingCallModal
  useEffect(() => {
    if (!activeConv?.id) return;
    try {
      const pendingRaw = sessionStorage.getItem('ems_pending_accepted_call');
      if (pendingRaw) {
        const pendingCall = JSON.parse(pendingRaw);
        if (pendingCall && String(pendingCall.conversationId) === String(activeConv.id)) {
          sessionStorage.removeItem('ems_pending_accepted_call');
          setupLocalMic().then(() => {
            connectHuddleRoom();
          }).catch(err => {
            console.error('[LiveVoice] Error connecting to pending accepted call:', err);
          });
        }
      }
    } catch (_) {}
  }, [activeConv?.id]);

  // WebRTC Signaling Listeners
  useEffect(() => {
    const unsubJoined = subscribeSocketEvent('voice:peer_joined', (data) => {
      if (!data || data.conversationId !== activeConv?.id) return;
      if (data.socketId && (callStateRef.current === 'connected' || callStateRef.current === 'outgoing_ringing')) {
        createPeerConnection(data.socketId, true, data.user);
      }
    });

    const unsubSignal = subscribeSocketEvent('voice:signal', async (data) => {
      if (!data || data.conversationId !== activeConv?.id) return;
      const { senderSocketId, signal, user } = data;
      if (!senderSocketId || !signal) return;

      // If an incoming offer arrives, ensure local microphone is ready before creating peer connection
      if (signal?.sdp?.type === 'offer') {
        if (!audioStreamRef.current) {
          try {
            await setupLocalMic();
          } catch (micErr) {
            console.warn('[LiveVoice] Could not acquire mic for incoming call:', micErr);
          }
        }
      }

      let pc = peersRef.current.get(senderSocketId);
      if (!pc && signal?.sdp?.type === 'offer') {
        pc = createPeerConnection(senderSocketId, false, user);
      }
      if (!pc) return;

      if (signal.sdp) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Flush queued ICE candidates that arrived before remote description
          const queued = iceCandidatesQueueRef.current.get(senderSocketId) || [];
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (_) {}
          }
          iceCandidatesQueueRef.current.delete(senderSocketId);

          if (signal.sdp.type === 'offer') {
            // Guarantee local mic tracks are attached before generating the answer
            if (audioStreamRef.current) {
              const existingTrackIds = new Set(pc.getSenders().map(s => s.track?.id).filter(Boolean));
              audioStreamRef.current.getAudioTracks().forEach(track => {
                if (!existingTrackIds.has(track.id)) {
                  try { pc.addTrack(track, audioStreamRef.current); } catch (_) {}
                }
              });
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            emitSocketEvent('voice:signal', {
              targetSocketId: senderSocketId,
              signal: { sdp: pc.localDescription },
              user: {
                id: myId,
                name: currentUser?.name || 'Teammate',
                avatar: currentUser?.avatar || '',
                role: currentUser?.role || 'Team Member'
              },
              conversationId: activeConv?.id
            });
          }
        } catch (err) {
          console.warn('[LiveVoice] Error handling SDP signal:', err);
        }
      } else if (signal.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (err) {
            console.warn('[LiveVoice] Error adding ICE candidate:', err);
          }
        } else {
          // Remote description not yet set, queue candidate
          const queue = iceCandidatesQueueRef.current.get(senderSocketId) || [];
          queue.push(signal.candidate);
          iceCandidatesQueueRef.current.set(senderSocketId, queue);
        }
      }
    });

    const unsubLeft = subscribeSocketEvent('voice:peer_left', (data) => {
      if (!data || data.conversationId !== activeConv?.id) return;
      if (data.socketId) {
        cleanupPeer(data.socketId);
      }
    });

    return () => {
      unsubJoined();
      unsubSignal();
      unsubLeft();
    };
  }, [activeConv?.id, createPeerConnection, cleanupPeer, myId, currentUser]);

  // Auto-hangup if current user clocks out or starts a break
  useEffect(() => {
    if ((callState === 'connected' || callState === 'outgoing_ringing') && (!isClockedIn || isOnBreak)) {
      stopAllVoice();
      addToast('Call ended: You clocked out or went on break.', 'info');
    }
  }, [isClockedIn, isOnBreak, callState, stopAllVoice]);

  // Clean up on unmount or navigation
  useEffect(() => {
    return () => {
      stopAllVoice();
    };
  }, [activeConv?.id, stopAllVoice]);

  const toggleMute = () => {
    if (!audioStreamRef.current) return;
    const track = audioStreamRef.current.getAudioTracks()[0];
    if (track) {
      const next = !isMuted;
      track.enabled = !next;
      setIsMuted(next);
      if (next) setIsSpeaking(false);
    }
  };

  const toggleDeafen = () => {
    const next = !isDeafened;
    setIsDeafened(next);
    audioElementsRef.current.forEach(el => {
      el.muted = next;
    });
  };

  // Partner availability indicators
  const partnerIsClockedIn = Boolean(partnerShiftState?.isClockedIn);
  const partnerIsOnBreak = Boolean(partnerShiftState?.isOnBreak);
  const canICall = isClockedIn && !isOnBreak;

  return (
    <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0c1427]/90 text-xs transition-all">
      {/* ── 1. Outgoing Ringing State (Calling Partner) ── */}
      {callState === 'outgoing_ringing' ? (
        <div className="p-2 sm:p-2.5 px-3 sm:px-5 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border-l-4 border-l-blue-500 animate-fadeIn">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <span className="absolute -inset-1 rounded-full bg-blue-500/30 animate-ping" />
              <img
                src={activePartner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={activePartner?.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-blue-500 shadow-sm relative z-10"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[12.5px] text-slate-900 dark:text-slate-100 truncate">
                  Calling {activePartner?.name || 'Colleague'}...
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-sky-300 animate-pulse">
                  Ringing 📞
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Waiting for answer • Melodic ringtone active on recipient device
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => cancelCall(false)}
            className="p-1.5 px-3 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold flex items-center gap-1.5 cursor-pointer border-0 shadow-sm transition-transform active:scale-95 shrink-0"
            title="Cancel Call"
          >
            <PhoneOff size={13} />
            <span className="text-[11px]">Cancel</span>
          </button>
        </div>
      ) : callState === 'connected' ? (
        /* ── 2. Call Connected & Live WebRTC Stream Active ── */
        <div className="p-2 sm:p-2.5 px-3 sm:px-5 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border-l-4 border-l-emerald-500 animate-fadeIn">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Avatars */}
            <div className="flex items-center -space-x-2 shrink-0">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={currentUser?.name}
                className={`w-8 h-8 rounded-full object-cover ring-2 ${
                  isSpeaking ? 'ring-emerald-500 scale-105' : 'ring-slate-300 dark:ring-slate-700'
                }`}
              />
              {!isChannel && activePartner && (
                <img
                  src={activePartner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={activePartner?.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500"
                />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[12.5px] text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Radio size={14} className="text-emerald-500 animate-pulse shrink-0" />
                  <span>{isChannel ? `Group Voice Huddle (${huddleMembers.length})` : 'Live Voice Call'}</span>
                </span>
                {/* Live Digital Timer */}
                <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-xs">
                  {formatDigitalTimer(callDuration)}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isMuted ? 'Microphone Muted' : isSpeaking ? 'You are speaking...' : 'Live 2-Way Audio Stream Active'}
              </div>
            </div>
          </div>

          {/* Call Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mute Mic */}
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

            {/* Deafen Audio */}
            <button
              type="button"
              onClick={toggleDeafen}
              className={`p-1.5 px-2 rounded-lg cursor-pointer transition-colors border ${
                isDeafened
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title={isDeafened ? 'Undeafen speakers' : 'Deafen (mute incoming audio)'}
            >
              {isDeafened ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={endCall}
              className="p-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 cursor-pointer border-0 shadow-md shadow-rose-600/30 transition-transform active:scale-95"
              title="End Voice Call"
            >
              <PhoneOff size={13} />
              <span className="text-[11px]">End Call</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── 3. Idle State (Ready to Call / Shift Gate Status) ── */
        <div className="p-2 px-3 sm:px-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {canICall ? (
              !isChannel ? (
                partnerIsClockedIn && !partnerIsOnBreak ? (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-700 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>{activePartner?.name || 'Partner'} is Clocked In • Ready for Live Voice Call</span>
                  </span>
                ) : partnerIsOnBreak ? (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-amber-600 dark:text-amber-400">
                    <Coffee size={13} className="shrink-0" />
                    <span>{activePartner?.name || 'Partner'} is on {partnerShiftState?.breakType || 'Break'} (Voice Call Paused)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    <span>{activePartner?.name || 'Partner'} is Clocked Out (Both team members must be clocked in)</span>
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-slate-700 dark:text-slate-300">
                  <Users size={13} className="text-blue-600 dark:text-sky-400 shrink-0" />
                  <span>Channel Voice Huddle: Instant live audio talk for clocked-in channel members</span>
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-amber-600 dark:text-amber-400">
                <Lock size={13} className="shrink-0" />
                <span>Clock into your shift to enable Live Voice Calling</span>
              </span>
            )}
          </div>

          {/* Start Call / Huddle Button */}
          <div>
            <button
              type="button"
              onClick={startCall}
              disabled={!canICall || (!isChannel && (!partnerIsClockedIn || partnerIsOnBreak))}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-[11.5px] transition-all border ${
                canICall && (isChannel || (partnerIsClockedIn && !partnerIsOnBreak))
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer shadow-xs border-transparent hover:scale-102'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-75'
              }`}
            >
              <Phone size={13} />
              <span>{isChannel ? 'Start Voice Huddle' : 'Start Voice Call'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
