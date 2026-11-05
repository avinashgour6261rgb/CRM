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
  ShieldAlert
} from 'lucide-react';
import { useTimer } from '../../../../shared/context/TimerContext';
import { useToast } from '../../../../shared/context/ToastContext';

/**
 * @file ScreenShareModal.jsx
 * @description Enterprise Live Screen Sharing Modal & Floating Viewer for Groups and 1-on-1 chats.
 * Shift-clock-in gated with fullscreen, duration tracking, and stop sharing controls.
 */
export const ScreenShareModal = ({
  isOpen,
  onClose,
  activeConv,
  currentUser,
  stream,
  isHost,
  hostInfo,
  onStopSharing
}) => {
  const { isClockedIn } = useTimer();
  const { addToast } = useToast();

  const [isMinimized, setIsMinimized] = useState(false);
  const [shareDuration, setShareDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  // Set stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isMinimized]);

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
  }, [isOpen, !!stream, hostInfo?.startedAt]);

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
                {isHost ? 'You are sharing your screen with team members' : `Viewing live screen stream`}
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

            {/* Close Modal (if viewer or minimized) */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer border border-slate-700 ml-1 transition-colors"
              title="Close window"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Video Canvas Area */}
        <div className="flex-1 min-h-[350px] bg-black relative flex items-center justify-center overflow-hidden">
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isHost}
              className="w-full h-full max-h-[75vh] object-contain"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center bg-slate-950">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg animate-pulse">
                <Monitor size={32} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white m-0">
                  {hostInfo?.hostName || 'Teammate'}'s Live Screen Stream
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Connected to real-time presentation stream. Broadcasting live to <strong>{convTitle}</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>RECEIVING BROADCAST • {formatTimer(shareDuration)}</span>
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
            <span className="font-mono text-[11px] text-slate-400">1080p • 30fps</span>
            {isHost && (
              <span className="text-amber-400 font-bold text-[11px]">
                Teammates can view this stream in real-time
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

