/**
 * @file soundUtils.js
 * @description Subtle Web Audio API chimes for shift clock & task timer actions.
 * Respects user preference in localStorage['ems_pref_sound'] (default enabled).
 */

let sharedAudioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
};

export const isTimerSoundEnabled = () => {
  try {
    return localStorage.getItem('ems_pref_sound') !== 'false';
  } catch {
    return true;
  }
};

export const playTimerChime = (kind = 'start') => {
  if (!isTimerSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes =
      kind === 'stop' ? [660, 520] :
      kind === 'pause' ? [540, 440] :
      [523.25, 659.25]; // C5 -> E5 gentle chime for start/resume

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.06, now + idx * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.18);
    });
  } catch (_) {}
};
