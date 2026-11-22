// Velvet Vault — the smallest possible sound kit.
// One job: a handful of synthesized blips (pickup, alarm, crack, win) from
// the Web Audio API. No audio files, no network, and nothing plays until
// the player has pressed a key or clicked — browsers insist on that.

let ctx = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const ac = ensure();
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function tone(freq, seconds, type, gain, when = 0) {
  if (muted) return;
  const ac = ensure();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  } catch {
    // Sound is garnish: never let it break the game.
  }
}

export const sfx = {
  pickup() {
    tone(880, 0.12, 'sine', 0.12);
    tone(1320, 0.18, 'sine', 0.1, 0.08);
  },
  crack() {
    tone(220, 0.08, 'square', 0.05);
    tone(330, 0.08, 'square', 0.05, 0.09);
  },
  vaultOpen() {
    tone(392, 0.2, 'sine', 0.12);
    tone(523, 0.2, 'sine', 0.12, 0.12);
    tone(659, 0.3, 'sine', 0.12, 0.24);
  },
  alarm() {
    tone(740, 0.16, 'sawtooth', 0.07);
    tone(554, 0.16, 'sawtooth', 0.07, 0.18);
  },
  caught() {
    tone(196, 0.4, 'sawtooth', 0.1);
    tone(147, 0.5, 'sawtooth', 0.1, 0.3);
  },
  win() {
    tone(523, 0.15, 'sine', 0.12);
    tone(659, 0.15, 'sine', 0.12, 0.12);
    tone(784, 0.15, 'sine', 0.12, 0.24);
    tone(1047, 0.35, 'sine', 0.12, 0.36);
  },
  click() {
    tone(1200, 0.05, 'sine', 0.06);
  },
};
