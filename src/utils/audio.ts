/**
 * Audio Synthesizer for Alarm and Notification sounds using Web Audio API.
 * Works without external MP3 files and provides clear, loud alarms for field work.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export type AlarmMelody = 'modern_chime' | 'urgent_beep' | 'radar_alert' | 'success_bell';

let activeRingtoneInterval: number | null = null;
const ringtoneListeners: Array<(isPlaying: boolean) => void> = [];

export function subscribeRingtoneState(listener: (isPlaying: boolean) => void): () => void {
  ringtoneListeners.push(listener);
  listener(activeRingtoneInterval !== null);
  return () => {
    const idx = ringtoneListeners.indexOf(listener);
    if (idx !== -1) ringtoneListeners.splice(idx, 1);
  };
}

function notifyRingtoneState(isPlaying: boolean) {
  ringtoneListeners.forEach(l => {
    try {
      l(isPlaying);
    } catch {
      // ignore
    }
  });
}

export function isAlarmRingtonePlaying(): boolean {
  return activeRingtoneInterval !== null;
}

export function startAlarmRingtoneLoop(melody: AlarmMelody = 'urgent_beep'): void {
  stopAlarmRingtoneLoop();
  
  // Play initial ring immediately
  playAlarmSound(melody);
  
  // Trigger mobile vibration if supported
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([500, 250, 500, 250, 800]);
    } catch {
      // ignore
    }
  }

  notifyRingtoneState(true);

  // Interval loop every 2.2 seconds
  activeRingtoneInterval = window.setInterval(() => {
    playAlarmSound(melody);
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([500, 250, 500, 250, 800]);
      } catch {
        // ignore
      }
    }
  }, 2200);
}

export function stopAlarmRingtoneLoop(): void {
  if (activeRingtoneInterval !== null) {
    clearInterval(activeRingtoneInterval);
    activeRingtoneInterval = null;
  }
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      // ignore
    }
  }
  notifyRingtoneState(false);
}

export function playAlarmSound(melody: AlarmMelody = 'modern_chime'): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (melody === 'modern_chime') {
      // Elegant futuristic 3-tone notification for smart lock / tech service
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);

        gain.gain.setValueAtTime(0, now + index * 0.12);
        gain.gain.linearRampToValueAtTime(0.3, now + index * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.5);
      });
    } else if (melody === 'urgent_beep') {
      // 2 double urgent alert beeps (alarm clock style)
      [0, 0.15, 0.45, 0.6].forEach((timeOffset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now + timeOffset); // A5

        gain.gain.setValueAtTime(0, now + timeOffset);
        gain.gain.linearRampToValueAtTime(0.25, now + timeOffset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.12);
      });
    } else if (melody === 'radar_alert') {
      // Sci-fi radar ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.25);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } else if (melody === 'success_bell') {
      // Completed job celebration sound
      const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.65);
      });
    }
  } catch (err) {
    console.warn('Audio Context not allowed or initialized yet:', err);
  }
}
