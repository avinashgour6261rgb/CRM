/**
 * @file ringtoneService.js
 * @description Web Audio API synthesis for WhatsApp-style call ringtones, ringbacks, and chimes.
 * Works 100% offline and cross-platform without external MP3 files or network latency.
 * Safe for mobile browsers (iOS Safari, Android Chrome) with touch-unlocked AudioContext.
 */

class RingtoneEngine {
  constructor() {
    this.audioCtx = null;
    this.intervalId = null;
    this.isPlaying = false;
    this.type = null;
  }

  getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Unlock AudioContext on user interaction (critical for iOS Safari and Android Chrome)
   */
  unlock() {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  /**
   * Play WhatsApp-style melodic incoming ringtone (repeating gentle chords)
   */
  startIncomingRingtone() {
    this.stop();
    this.isPlaying = true;
    this.type = 'incoming';

    const playChimeSequence = () => {
      if (!this.isPlaying) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Melodic Notes: E5 (659Hz), G#5 (830Hz), B5 (987Hz), E6 (1318Hz)
      const notes = [
        { freq: 659.25, time: 0, dur: 0.14 },
        { freq: 830.61, time: 0.16, dur: 0.14 },
        { freq: 987.77, time: 0.32, dur: 0.16 },
        { freq: 1318.51, time: 0.50, dur: 0.28 },
        // Second melodic phrase
        { freq: 987.77, time: 0.88, dur: 0.14 },
        { freq: 1318.51, time: 1.04, dur: 0.36 }
      ];

      notes.forEach(({ freq, time, dur }) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);

          // Soft attack and decay envelope
          gain.gain.setValueAtTime(0.0001, now + time);
          gain.gain.exponentialRampToValueAtTime(0.18, now + time + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + dur + 0.05);
        } catch (_) {}
      });
    };

    playChimeSequence();
    this.intervalId = setInterval(playChimeSequence, 2400);
  }

  /**
   * Play standard phone ringback tone for caller ("tuuu... tuuu...")
   */
  startOutgoingRingback() {
    this.stop();
    this.isPlaying = true;
    this.type = 'outgoing';

    const playRingback = () => {
      if (!this.isPlaying) return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Dual-tone: 440Hz + 480Hz for realistic phone ringback
      [440, 480].forEach(freq => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
          gain.gain.setValueAtTime(0.08, now + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 1.45);
        } catch (_) {}
      });
    };

    playRingback();
    this.intervalId = setInterval(playRingback, 3200);
  }

  /**
   * Play short call end / declined chime
   */
  playCallEndTone() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [
      { freq: 480, time: 0, dur: 0.15 },
      { freq: 360, time: 0.18, dur: 0.25 }
    ].forEach(({ freq, time, dur }) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.0001, now + time);
        gain.gain.linearRampToValueAtTime(0.12, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      } catch (_) {}
    });
  }

  stop() {
    this.isPlaying = false;
    this.type = null;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const ringtoneService = new RingtoneEngine();
