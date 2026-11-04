/**
 * Code Visualizer sound engine (LMS /visualizer only).
 *
 * - Every sound is synthesised with the Web Audio API: no files, no network.
 * - OFF by default. The AudioContext is created only after the person turns sound on (a click),
 *   so browsers' autoplay rules are respected and nothing ever plays on page load.
 * - Sounds are triggered by real trace events (see Workspace.tsx). Nothing here changes timing:
 *   play() returns immediately and never awaits.
 * - A short gate drops a low-priority sound that arrives right after another one, so 4× playback
 *   of a sort never turns into noise. A higher-priority sound (a write, the finish) always wins.
 */

export type VzSoundName = 'compare' | 'swap' | 'step' | 'complete' | 'reset' | 'preview';

export interface VzSoundSettings { enabled: boolean; volume: number }

const KEY = 'cb-vz-sound';
const DEFAULTS: VzSoundSettings = { enabled: false, volume: 0.5 };

const PRIORITY: Record<VzSoundName, number> = { step: 0, compare: 1, swap: 2, reset: 3, complete: 4, preview: 4 };
const GATE_MS = 70;

let settings: VzSoundSettings = load();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let lastAt = 0;
let lastPriority = -1;
const listeners = new Set<() => void>();

function load(): VzSoundSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw);
    return {
      enabled: p.enabled === true,
      volume: typeof p.volume === 'number' ? Math.min(1, Math.max(0, p.volume)) : DEFAULTS.volume,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage unavailable: setting lasts this visit */ }
  listeners.forEach(l => l());
}

function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  const AC: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = settings.volume;
    master.connect(ctx.destination);
  } catch {
    ctx = null; master = null;
  }
  return ctx;
}

/** One enveloped oscillator note. All times are seconds from now. */
function note(freq: number, start: number, dur: number, type: OscillatorType, peak: number, glideTo?: number) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  osc.onended = () => { osc.disconnect(); g.disconnect(); };
}

const VOICES: Record<VzSoundName, () => void> = {
  // Soft digital tick
  compare: () => note(1760, 0, 0.035, 'sine', 0.18),
  // Subtle switch: a quick upward glide
  swap: () => { note(520, 0, 0.07, 'triangle', 0.22, 880); note(1320, 0.03, 0.04, 'sine', 0.08); },
  // Soft click for a manual step
  step: () => note(1100, 0, 0.018, 'square', 0.04),
  // Short completion melody (C5 E5 G5 C6)
  complete: () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.085, 0.22, 'sine', 0.2)); },
  // Subtle reset: a short downward glide
  reset: () => note(660, 0, 0.12, 'sine', 0.16, 330),
  preview: () => { note(880, 0, 0.12, 'sine', 0.18); note(1318.5, 0.09, 0.16, 'sine', 0.14); },
};

export const vzSound = {
  get: (): VzSoundSettings => settings,

  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },

  /** Must be called from a click: this is what unlocks audio in the browser. */
  setEnabled(on: boolean) {
    settings = { ...settings, enabled: on };
    if (on) { const c = ensureContext(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
    save();
  },

  setVolume(v: number) {
    settings = { ...settings, volume: Math.min(1, Math.max(0, v)) };
    if (master && ctx) master.gain.setTargetAtTime(settings.volume, ctx.currentTime, 0.02);
    save();
  },

  /** Fire and forget. Does nothing when sound is off, muted, or audio is unavailable. */
  play(name: VzSoundName) {
    if (!settings.enabled || settings.volume <= 0) return;
    if (!ensureContext() || !ctx) return;
    if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
    const now = performance.now();
    const pr = PRIORITY[name];
    if (now - lastAt < GATE_MS && pr <= lastPriority) return;
    lastAt = now; lastPriority = pr;
    try { VOICES[name](); } catch { /* audio is decoration; never let it break the page */ }
  },
};

export default vzSound;
