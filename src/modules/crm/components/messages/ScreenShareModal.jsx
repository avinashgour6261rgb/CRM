import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Monitor,
  MonitorOff,
  Radio,
  Users,
  Eye,
  Sparkles,
  ShieldAlert,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useTimer } from '../../../../shared/context/TimerContext';
import { useToast } from '../../../../shared/context/ToastContext';
import { emitSocketEvent, subscribeSocketEvent } from '../../../../shared/services/socketService';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' }
  ]
};

/**
 * @file ScreenShareModal.jsx
 * @description Enterprise Live Screen Sharing Modal & Floating Viewer for Groups and 1-on-1 chats.
 * Supports full WebRTC video streaming from Presenter to all Viewers with zero lag,
 * PiP floating window, fullscreen toggling, and live session duration tracking.
 */
export const ScreenShareModal = ({
  isOpen,
  onClose,
  activeConv,
  currentUser,
  stream,
  isHost,
  hostInfo,
  targetUserId,
  onStopSharing
}) => {
  const { isClockedIn } = useTimer();
  const { addToast } = useToast();

  const [isMinimized, setIsMinimized] = useState(false);
  const [shareDuration, setShareDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerStream, setViewerStream] = useState(null);
  const [viewerStatus, setViewerStatus] = useState('connecting');
  const [isAudioMuted, setIsAudioMuted] = useState(true);

  const toggleAudio = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = isHost || next;
    }
  };

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  // Host-side WebRTC connections: viewerSocketId -> RTCPeerConnection
  const viewersMapRef = useRef(new Map());
  const hostCandidatesQueue = useRef(new Map());

  // Viewer-side WebRTC connection
  const viewerPcRef = useRef(null);
  const viewerCandidatesQueue = useRef([]);

  const activeStream = isHost ? stream : viewerStream;

  // ── Host-side WebRTC Broadcasting ──
  useEffect(() => {
    if (!isOpen || !isHost || !stream || !activeConv?.id) return;

    // 1. Announce screen share session over socket
    emitSocketEvent('screen:start', {
      conversationId: activeConv.id,
      host: {
        id: currentUser?._id || currentUser?.id || currentUser?.employeeCode,
        name: currentUser?.name || 'Teammate',
        avatar: currentUser?.avatar || '',
        role: currentUser?.role || 'Team Member'
      },
      targetUserId,
      isChannel: activeConv?.type === 'channel',
      channelName: activeConv?.channelName || activeConv?.name || '',
      startedAt: hostInfo?.startedAt || Date.now()
    });

    // 2. When a viewer joins the room, host creates RTCPeerConnection and sends SDP offer
    const unsubViewerJoined = subscribeSocketEvent('screen:viewer_joined', async (data) => {
      if (!data || data.conversationId !== activeConv.id || !data.viewerSocketId) return;
      const viewerSocketId = data.viewerSocketId;

      let pc = viewersMapRef.current.get(viewerSocketId);
      if (pc) {
        try { pc.close(); } catch (_) {}
        viewersMapRef.current.delete(viewerSocketId);
      }

      try {
        pc = new RTCPeerConnection(RTC_CONFIG);
        viewersMapRef.current.set(viewerSocketId, pc);

        // Attach screen stream tracks
        stream.getTracks().forEach(track => {
          try {
            pc.addTrack(track, stream);
          } catch (err) {
            console.warn('[ScreenShare] Error adding track:', err);
          }
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            emitSocketEvent('screen:signal', {
              targetSocketId: viewerSocketId,
              signal: { candidate: event.candidate },
              conversationId: activeConv.id
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            try { pc.close(); } catch (_) {}
            viewersMapRef.current.delete(viewerSocketId);
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        emitSocketEvent('screen:signal', {
          targetSocketId: viewerSocketId,
          signal: { sdp: pc.localDescription },
          conversationId: activeConv.id
        });
      } catch (err) {
        console.error('[ScreenShare] Error creating host offer:', err);
      }
    });

    // 3. Handle incoming SDP answer and ICE candidates from viewers
    const unsubHostSignal = subscribeSocketEvent('screen:signal', async (data) => {
      if (!data || data.conversationId !== activeConv.id) return;
      const { senderSocketId, signal } = data;
      if (!senderSocketId || !signal) return;

      const pc = viewersMapRef.current.get(senderSocketId);
      if (!pc) return;

      if (signal.sdp && signal.sdp.type === 'answer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const queued = hostCandidatesQueue.current.get(senderSocketId) || [];
          for (const cand of queued) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (_) {}
          }
          hostCandidatesQueue.current.delete(senderSocketId);
        } catch (err) {
          console.warn('[ScreenShare] Host setRemoteDescription error:', err);
        }
      } else if (signal.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch (_) {}
        } else {
          const queued = hostCandidatesQueue.current.get(senderSocketId) || [];
          queued.push(signal.candidate);
          hostCandidatesQueue.current.set(senderSocketId, queued);
        }
      }
    });

    // 4. Viewer left
    const unsubViewerLeft = subscribeSocketEvent('screen:viewer_left', (data) => {
      if (!data || data.conversationId !== activeConv.id || !data.viewerSocketId) return;
      const pc = viewersMapRef.current.get(data.viewerSocketId);
      if (pc) {
        try { pc.close(); } catch (_) {}
        viewersMapRef.current.delete(data.viewerSocketId);
      }
    });

    return () => {
      unsubViewerJoined();
      unsubHostSignal();
      unsubViewerLeft();
      viewersMapRef.current.forEach(p => {
        try { p.close(); } catch (_) {}
      });
      viewersMapRef.current.clear();
      hostCandidatesQueue.current.clear();
    };
  }, [isOpen, isHost, stream, activeConv?.id, currentUser, hostInfo?.startedAt]);

  // ── Viewer-side WebRTC Receiving ──
  useEffect(() => {
    if (!isOpen || isHost || !activeConv?.id) return;

    setViewerStatus('connecting');

    // 1. Announce viewer joined to the host with auto-retry if stream hasn't connected
    const sendViewerJoin = () => {
      emitSocketEvent('screen:join', {
        conversationId: activeConv.id,
        viewer: {
          id: currentUser?._id || currentUser?.id || currentUser?.employeeCode,
          name: currentUser?.name || 'Teammate',
          avatar: currentUser?.avatar || '',
          role: currentUser?.role || 'Team Member'
        }
      });
    };
    sendViewerJoin();

    // Auto-retry join in case host socket reconnected or was still initializing
    const retryTimer = setInterval(() => {
      if (!viewerStream) {
        sendViewerJoin();
      }
    }, 2500);

    // 2. Handle host's SDP offer & ICE candidates
    const unsubViewerSignal = subscribeSocketEvent('screen:signal', async (data) => {
      if (!data || data.conversationId !== activeConv.id) return;
      const { senderSocketId, signal } = data;
      if (!senderSocketId || !signal) return;

      if (signal.sdp && signal.sdp.type === 'offer') {
        try {
          if (viewerPcRef.current) {
            try { viewerPcRef.current.close(); } catch (_) {}
          }

          const pc = new RTCPeerConnection(RTC_CONFIG);
          viewerPcRef.current = pc;

          pc.ontrack = (event) => {
            const remoteStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
            setViewerStream(remoteStream);
            setViewerStatus('connected');
            if (videoRef.current) {
              videoRef.current.srcObject = remoteStream;
              videoRef.current.play().catch(() => {
                // Guaranteed autoplay fallback for modern browser policies
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  videoRef.current.play().catch(() => {});
                }
              });
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              emitSocketEvent('screen:signal', {
                targetSocketId: senderSocketId,
                signal: { candidate: event.candidate },
                conversationId: activeConv.id
              });
            }
          };

          pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              setViewerStatus('ended');
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Flush queued candidates
          for (const cand of viewerCandidatesQueue.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (_) {}
          }
          viewerCandidatesQueue.current = [];

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          emitSocketEvent('screen:signal', {
            targetSocketId: senderSocketId,
            signal: { sdp: pc.localDescription },
            conversationId: activeConv.id
          });
        } catch (err) {
          console.error('[ScreenShare] Error answering host screen offer:', err);
        }
      } else if (signal.candidate) {
        const pc = viewerPcRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch (_) {}
        } else {
          viewerCandidatesQueue.current.push(signal.candidate);
        }
      }
    });

    // 3. Presenter stopped sharing screen
    const unsubStopped = subscribeSocketEvent('screen:stopped', (data) => {
      if (!data || data.conversationId !== activeConv.id) return;
      addToast('Screen share session ended by presenter', 'info');
      onClose();
    });

    return () => {
      clearInterval(retryTimer);
      emitSocketEvent('screen:leave', { conversationId: activeConv.id });
      unsubViewerSignal();
      unsubStopped();
      if (viewerPcRef.current) {
        try { viewerPcRef.current.close(); } catch (_) {}
        viewerPcRef.current = null;
      }
      setViewerStream(null);
      viewerCandidatesQueue.current = [];
    };
  }, [isOpen, isHost, activeConv?.id, currentUser, onClose, addToast]);

  // Set stream to video element
  useEffect(() => {
    if (videoRef.current && activeStream) {
      videoRef.current.srcObject = activeStream;
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [activeStream, isMinimized, isAudioMuted]);

  // Duration timer
  useEffect(() => {
    if (isOpen) {
      const startEpoch = hostInfo?.startedAt || Date.now();
      const initialSecs = Math.floor((Date.now() - startEpoch) / 1000);
      setShareDuration(Math.max(0, initialSecs));

      timerRef.current = setInterval(() => {
        setShareDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, !!activeStream, hostInfo?.startedAt]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleStop = () => {
    emitSocketEvent('screen:stop', {
      conversationId: activeConv?.id,
      targetUserId
    });
    if (onStopSharing) {
      onStopSharing();
    }
    onClose();
  };

  if (!isOpen) return null;

  const convTitle = activeConv?.type === 'channel'
    ? (activeConv.channelName || activeConv.name)
    : (activeConv?.participantName || '1-on-1 Chat');

  // Minimized Floating PiP Widget
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-[1050] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 overflow-hidden w-72 sm:w-80 flex flex-col animate-fadeIn">
        <div className="p-2.5 px-3 bg-slate-800/90 flex items-center justify-between border-b border-slate-700/80">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="text-xs font-bold truncate">🖥️ {convTitle}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="Expand window"
            >
              <Maximize2 size={13} />
            </button>
            {isHost && (
              <button
                onClick={handleStop}
                className="p-1 rounded bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                title="Stop sharing"
              >
                <MonitorOff size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isHost}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    );
  }

  // Full Screen Share Modal
  return (
    <div className="fixed inset-0 z-[1050] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div
        ref={containerRef}
        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header Bar */}
        <div className="p-3 sm:p-4 px-4 sm:px-6 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Monitor size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white truncate">
                  Live Screen Share: {convTitle}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  LIVE • {formatTimer(shareDuration)}
                </span>
              </div>
              <div className="text-xs text-slate-400 truncate">
                {isHost ? 'You are sharing your screen with team members' : `Viewing live screen stream from ${hostInfo?.hostName || 'Presenter'}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Minimize to PiP */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer border border-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
              title="Minimize to floating window so you can chat"
            >
              <Minimize2 size={14} />
              <span className="hidden sm:inline">Minimize</span>
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer border border-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <Maximize2 size={14} />
              <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
            </button>

            {/* Stop Sharing Button (Host only) */}
            {isHost && (
              <button
                type="button"
                onClick={handleStop}
                className="p-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer font-bold text-xs flex items-center gap-1.5 border-0 shadow-md transition-colors"
                title="Stop sharing screen"
              >
                <MonitorOff size={14} />
                <span>Stop Sharing</span>
              </button>
            )}

            {/* Viewer Mute Audio Toggle */}
            {!isHost && activeStream && (
              <button
                type="button"
                onClick={toggleAudio}
                className={`p-1.5 px-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border cursor-pointer ${
                  isAudioMuted
                    ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                }`}
                title={isAudioMuted ? 'Unmute stream audio' : 'Mute stream audio'}
              >
                {isAudioMuted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} className="text-emerald-400" />}
                <span className="hidden sm:inline">{isAudioMuted ? 'Muted' : 'Audio'}</span>
              </button>
            )}

            {/* Close Modal (if viewer or minimized; if host, stops sharing cleanly) */}
            <button
              type="button"
              onClick={isHost ? handleStop : onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer border border-slate-700 ml-1 transition-colors"
              title={isHost ? "Stop sharing and close" : "Close window"}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Video Canvas Area */}
        <div className="flex-1 min-h-[350px] bg-black relative flex items-center justify-center overflow-hidden">
          {/* Always keep video element mounted so videoRef is never null */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isHost ? true : isAudioMuted}
            className={`w-full h-full max-h-[75vh] object-contain ${activeStream ? 'block' : 'hidden'}`}
          />

          {!activeStream && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center bg-slate-950">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg animate-pulse">
                <Monitor size={32} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white m-0">
                  {isHost ? 'Preparing screen broadcast...' : `${hostInfo?.hostName || 'Presenter'}'s Live Screen Stream`}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  {isHost
                    ? `Broadcasting live to ${convTitle}. Teammates can watch your presentation in real-time.`
                    : `Establishing zero-latency peer-to-peer WebRTC video stream with ${hostInfo?.hostName || 'Presenter'}...`}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/50 text-blue-400 text-xs font-bold font-mono">
                <Loader2 size={13} className="animate-spin text-blue-400" />
                <span>{isHost ? 'BROADCASTING LIVE' : 'CONNECTING TO STREAM...'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-2.5 px-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold">
              {activeConv?.type === 'channel' ? 'Group Channel Broadcast' : 'Private Direct Screen Stream'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-slate-400">1080p • WebRTC P2P</span>
            {isHost ? (
              <span className="text-amber-400 font-bold text-[11px]">
                Teammates are viewing this stream in real-time
              </span>
            ) : (
              <span className="text-emerald-400 font-bold text-[11px]">
                Connected to presenter
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
