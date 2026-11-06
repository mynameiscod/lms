/*
 * Visualizer sound engine.
 *
 * Fixes over the DevNexus version:
 *  - Sound is ON by default. It used to start muted, and the workspace screen had no toggle,
 *    so students who never pressed "Unmute" on the hub heard nothing at all.
 *  - Louder: voices feed a master gain and a compressor instead of going straight to the
 *    speakers at ~0.1 gain, so peaks are about 3x higher without clipping when cues overlap.
 *  - Volume changes ramp the master gain; they no longer cut off the notes already playing.
 *  - A context the browser suspended (tab switch, Safari "interrupted") is resumed on the next cue.
 */
const STORAGE_KEY = 'codebegun:dsa-visualizer:muted';
const VOLUME_KEY = 'codebegun:dsa-visualizer:volume';
const FLOOR = 0.0001; // Exponential ramps require a strictly positive destination.
const MAX_VOICES = 8;
interface Voice { readonly oscillator: OscillatorNode; readonly gain: GainNode }

/** Dependency-free, best-effort audio. Unsupported/blocked audio never breaks a lesson. */
export class SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<Voice>();
  private listeners = new Set<() => void>();
  private muted = false;
  private volume = 1;
  private resuming: Promise<void> | null = null;

  constructor() {
    try { this.muted = localStorage.getItem(STORAGE_KEY) === 'true'; } catch { /* Storage can be blocked. */ }
    try {
      const saved = localStorage.getItem(VOLUME_KEY);
      if (saved !== null && Number.isFinite(Number(saved))) this.volume = Math.max(0, Math.min(1, Number(saved)));
    } catch { /* Use default volume. */ }
  }
  readonly getMuted = (): boolean => this.muted;
  readonly getVolume = (): number => this.volume;
  setVolume(value: number): void {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(1, value));
    try { localStorage.setItem(VOLUME_KEY, String(this.volume)); } catch { /* In-memory preference still works. */ }
    this.applyMasterVolume();
    this.listeners.forEach(listener => listener());
  }
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  setMuted(muted: boolean): void {
    if (this.muted === muted) return;
    this.muted = muted;
    try { localStorage.setItem(STORAGE_KEY, String(muted)); } catch { /* In-memory state still works. */ }
    if (muted) this.silence();
    this.listeners.forEach(listener => listener());
  }

  /** Call from a click/key gesture: browsers only allow audio to start inside one. */
  async unlock(): Promise<void> {
    if (this.muted || typeof window === 'undefined') return;
    try {
      if (!this.context || this.context.state === 'closed') {
        const AudioConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioConstructor) return;
        // iOS: play through the ringer/silent switch, like a media player rather than a ringtone.
        try { const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession; if (session) session.type = 'playback'; } catch { /* Optional API. */ }
        const context = new AudioConstructor();
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -14; compressor.knee.value = 8; compressor.ratio.value = 4;
        compressor.attack.value = 0.003; compressor.release.value = 0.15;
        const master = context.createGain();
        master.gain.value = this.masterLevel();
        master.connect(compressor); compressor.connect(context.destination);
        this.context = context; this.master = master;
      }
      if (this.context.state !== 'running') {
        this.resuming ??= this.context.resume().catch(() => undefined).finally(() => { this.resuming = null; });
        await this.resuming;
      }
    } catch { /* Autoplay policy, missing devices, and unavailable APIs are nonfatal. */ }
  }

  /** Clamp finite values into an audible, monotonically increasing pitch range. */
  playTone(value: number, minVal = 0, maxVal = 100): void {
    if (![value, minVal, maxVal].every(Number.isFinite)) return;
    const low = Math.min(minVal, maxVal), high = Math.max(minVal, maxVal);
    const scaled = high === low ? .5 : Math.max(0, Math.min(1, (value - low) / (high - low)));
    this.tone(260 + 620 * scaled, 'triangle', .2, .55);
  }
  playSelect(): void { this.tone(700, 'triangle', .11, .45); }
  playSuccess(): void {
    // An overlapping ascending C-major triad: C5, E5, G5.
    [523.251, 659.255, 783.991].forEach((frequency, i) => this.tone(frequency, 'triangle', .38, .42, i * .1));
  }
  playError(): void { this.tone(150, 'square', .24, .32); }

  /** Volume slider is perceptual: square it so the lower half of the slider is still usable. */
  private masterLevel(): number { return this.volume * this.volume * 1.6; }
  private applyMasterVolume(): void {
    const { context, master } = this;
    if (!context || !master) return;
    try { master.gain.setTargetAtTime(this.masterLevel(), context.currentTime, .02); } catch { /* Closed context. */ }
  }

  private tone(frequency: number, type: OscillatorType, duration: number, volume: number, delay = 0): void {
    const { context, master } = this;
    if (this.muted || !context || !master || this.volume === 0 || (typeof document !== 'undefined' && document.hidden)) return;
    if (context.state !== 'running') {
      // Suspended by the browser since the last gesture: resume for the next cue, skip this one
      // so a burst of stale cues never plays at once.
      if (context.state !== 'closed') void this.unlock();
      return;
    }
    // Bound resource use when sliders or high-speed simulations generate many cues.
    if (this.voices.size >= MAX_VOICES) return;
    let oscillator: OscillatorNode | undefined, gain: GainNode | undefined;
    try {
      oscillator = context.createOscillator(); gain = context.createGain();
      const start = context.currentTime + delay, end = start + duration;
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(FLOOR, context.currentTime);
      gain.gain.setValueAtTime(FLOOR, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(FLOOR, volume), start + .01);
      gain.gain.exponentialRampToValueAtTime(FLOOR, end);
      oscillator.connect(gain); gain.connect(master);
      const voice: Voice = { oscillator, gain }; this.voices.add(voice);
      oscillator.onended = () => { oscillator!.disconnect(); gain!.disconnect(); this.voices.delete(voice); };
      oscillator.start(start); oscillator.stop(end + .02);
    } catch {
      oscillator?.disconnect(); gain?.disconnect();
      this.voices.forEach(voice => { if (voice.oscillator === oscillator) this.voices.delete(voice); });
    }
  }
  /** Fade scheduled voices too, preventing a queued success chord after muting. */
  private silence(): void {
    const now = this.context?.currentTime ?? 0;
    this.voices.forEach(voice => {
      try {
        const parameter = voice.gain.gain;
        if (typeof parameter.cancelAndHoldAtTime === 'function') parameter.cancelAndHoldAtTime(now);
        else parameter.cancelScheduledValues(now);
        parameter.setTargetAtTime(FLOOR, now, .003);
        voice.oscillator.stop(now + .02);
      } catch { /* A voice may already have ended. */ }
    });
  }
  /** Optional host teardown; the singleton normally lives for the app's lifetime. */
  async dispose(): Promise<void> {
    const context = this.context; this.context = null; this.master = null;
    this.voices.forEach(voice => { try { voice.oscillator.stop(); voice.oscillator.disconnect(); voice.gain.disconnect(); } catch { /* Already stopped. */ } });
    this.voices.clear(); this.resuming = null;
    try { await context?.close(); } catch { /* Already closed. */ }
  }
}

export const soundFx = new SoundEngine();

/** Invoke from actual input handlers only; context creation remains gesture-bound. */
export function playSelectionSound(): void {
  void soundFx.unlock().then(() => soundFx.playSelect());
}
