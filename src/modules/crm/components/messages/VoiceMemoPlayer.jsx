import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Mic } from 'lucide-react';

/**
 * @file VoiceMemoPlayer.jsx
 * @description Sleek inline audio waveform & voice memo player for chat messages.
 */
export const VoiceMemoPlayer = ({ attachment, isOutgoing }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);

  const formatSecs = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const seekTime = Number(e.target.value);
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-2.5 p-2 px-3 rounded-xl min-w-[240px] max-w-[320px] select-none ${
      isOutgoing
        ? 'bg-white/15 text-white border border-white/20'
        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700'
    }`}>
      <audio ref={audioRef} src={attachment.dataUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shrink-0 border-0 ${
          isOutgoing
            ? 'bg-white text-blue-600 shadow-md'
            : 'bg-blue-600 text-white shadow-md'
        }`}
        title={isPlaying ? 'Pause' : 'Play voice memo'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      {/* Track & Time */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="flex items-center gap-1 opacity-90 truncate">
            <Mic size={12} className={isOutgoing ? 'text-white' : 'text-blue-500'} />
            <span>Voice Memo</span>
          </span>
          <span className="text-[10px] tabular-nums font-mono opacity-80">
            {formatSecs(currentTime)} / {formatSecs(duration || attachment.durationSecs || 0)}
          </span>
        </div>

        {/* Progress Slider Bar */}
        <div className="relative w-full flex items-center h-2">
          <input
            type="range"
            min={0}
            max={duration || attachment.durationSecs || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-300 dark:bg-slate-700 accent-blue-500"
          />
        </div>
      </div>

      {/* Playback Speed Button */}
      <button
        type="button"
        onClick={cycleSpeed}
        className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold cursor-pointer border shrink-0 transition-colors ${
          isOutgoing
            ? 'bg-white/20 border-white/30 text-white hover:bg-white/30'
            : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
        }`}
        title="Toggle playback speed"
      >
        {playbackRate}x
      </button>
    </div>
  );
};

