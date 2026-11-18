// All sound is synthesized with WebAudio: no audio files ship with the game.
// Every call is guarded, so a headless run or a muted tab never throws.
let ctx = null;
let muted = false;

function ac() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

export function setMuted(m) {
  muted = m;
}
export function isMuted() {
  return muted;
}

/** One short oscillator blip: frequency slides from `from` to `to`. */
function blip(from, to, dur, type, vol) {
  if (muted) return;
  const c = ac();
  if (!c || c.state === 'suspended') return;
  try {
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    // Sound must never break the game.
  }
}

export const sfx = {
  shoot() { blip(880, 320, 0.08, 'square', 0.05); },
  eclipse() { blip(220, 1760, 0.5, 'sawtooth', 0.08); },
  hit() { blip(300, 140, 0.06, 'triangle', 0.06); },
  kill() { blip(520, 90, 0.14, 'triangle', 0.09); },
  mote() { blip(1200, 1800, 0.07, 'sine', 0.05); },
  relic() { blip(523, 1046, 0.22, 'sine', 0.08); },
  hurt() { blip(160, 60, 0.3, 'sawtooth', 0.12); },
  boss() { blip(90, 45, 0.6, 'sawtooth', 0.12); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, f, 0.25, 'sine', 0.08), i * 110)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, f * 0.9, 0.3, 'triangle', 0.08), i * 130)); },
};
