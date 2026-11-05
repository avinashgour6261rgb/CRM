import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Radio } from 'lucide-react';
import { useTimer } from '../../../../shared/context/TimerContext';
import { useToast } from '../../../../shared/context/ToastContext';

/**
 * @file ChatVoiceRecorder.jsx
 * @description Shift-verified Walkie-Talkie & voice memo recorder with live audio levels & cancel/send controls.
 */
export const ChatVoiceRecorder = ({ onSendAudio, disabled }) => {
  const { isClockedIn, isOnBreak, breakType } = useTimer();
  const { addToast } = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const streamRef = useRef(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const startRecording = async () => {
    // Clock-in verification check
    if (!isClockedIn) {
      addToast('🔒 Shift Clock-In Required: You must clock into your shift to use the Walkie-Talkie & voice messages.', 'warning');
      return;
    }
    if (isOnBreak) {
      addToast(`☕ On ${breakType || 'Break'}: Voice communication is paused during breaks. End your break to record.`, 'warning');
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addToast('Microphone access is not supported on this browser.', 'error');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      addToast('Microphone permission denied or device not found.', 'error');
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordDuration(0);
    addToast('Voice memo cancelled', 'info');
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const finalDurationSecs = recordDuration;

    mediaRecorderRef.current.onstop = () => {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (audioBlob.size < 100) {
        addToast('Voice memo was too short.', 'warning');
        setIsRecording(false);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const attachment = {
          id: `att_audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: `Voice_Memo_${Date.now()}.webm`,
          category: 'audio',
          mimeType,
          dataUrl,
          sizeBytes: audioBlob.size,
          sizeFormatted: `${Math.round(audioBlob.size / 1024)} KB`,
          durationSecs: finalDurationSecs,
          durationFormatted: formatTimer(finalDurationSecs)
        };

        if (onSendAudio) {
          onSendAudio(attachment);
        }
        setIsRecording(false);
        setRecordDuration(0);
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
  };

  // If currently recording, show sticky recording overlay in place of mic button
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/80 rounded-xl px-3 py-1.5 animate-pulse shadow-sm">
        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-extrabold text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping inline-block" />
          <Radio size={14} className="animate-spin text-rose-500" />
          <span className="tracking-wide">WALKIE-TALKIE</span>
          <span className="font-mono text-xs tabular-nums bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
            {formatTimer(recordDuration)}
          </span>
        </div>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={cancelRecording}
          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-100 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
          title="Cancel recording"
        >
          <Trash2 size={14} />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={stopAndSendRecording}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer border-0 shadow-xs transition-colors"
          title="Send voice memo"
        >
          <Send size={12} />
          <span>Send</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all border shadow-xs shrink-0 ${
        isClockedIn && !isOnBreak
          ? 'bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400'
          : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-75'
      }`}
      title={
        !isClockedIn
          ? '🔒 Shift Clock-In Required to speak or send voice memos'
          : isOnBreak
          ? `☕ Paused on ${breakType || 'Break'}`
          : 'Walkie-Talkie & Voice Memo (Click to speak)'
      }
    >
      <Mic size={18} />
    </button>
  );
};
