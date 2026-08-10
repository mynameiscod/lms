/**
 * Real-time viseme extraction from the interviewer's speech.
 *
 * WHY NOT PHONEME TIMINGS FROM THE TTS PROVIDER: OpenAI's speech endpoint returns audio
 * and nothing else — no word boundaries, no alignment track. Azure and ElevenLabs do emit
 * viseme events, but switching provider for the mouth alone would cost the Indian-English
 * `instructions` steering that made the voice right in the first place.
 *
 * So the mouth shape is recovered from the audio itself. This is not "loudness drives jaw"
 * — that gives a flapping puppet. Vowels are identified the way a phonetician does, by
 * their first two formants:
 *
 *   F1 (250-900 Hz)  tracks how OPEN the jaw is      — low F1 = closed (ee, oo)
 *   F2 (900-2500 Hz) tracks tongue FRONT vs BACK     — high F2 = front (ee), low = back (oo)
 *
 * Plot a frame in (F1, F2) space and the five vowel visemes fall in separate regions, so
 * "aa" and "oo" produce genuinely different mouths rather than the same hole at different
 * sizes. Consonants come from two other cues: energy concentrated above 4 kHz is a sibilant
 * (s, sh, ch), and a sharp drop to near-silence in the middle of a phrase is a lip closure
 * (p, b, m) rather than the end of the sentence.
 *
 * Everything here is per-frame and allocation-free — it runs inside a requestAnimationFrame
 * loop alongside a WebGL render on phones.
 */

/** Morph target names as authored by Ready Player Me / ARKit. */
export type Viseme =
  | 'viseme_sil' | 'viseme_aa' | 'viseme_E' | 'viseme_I' | 'viseme_O' | 'viseme_U'
  | 'viseme_PP' | 'viseme_SS' | 'viseme_nn';

export type VisemeWeights = Partial<Record<Viseme, number>>;

/** Formant centres (Hz) for the vowels we distinguish, as spoken in Indian English. */
const VOWEL_TARGETS: { viseme: Viseme; f1: number; f2: number }[] = [
  { viseme: 'viseme_aa', f1: 750, f2: 1250 },   // "father"
  { viseme: 'viseme_E',  f1: 550, f2: 1900 },   // "bed"
  { viseme: 'viseme_I',  f1: 320, f2: 2300 },   // "see"
  { viseme: 'viseme_O',  f1: 500, f2: 900  },   // "so"
  { viseme: 'viseme_U',  f1: 330, f2: 820  },   // "too"
];

const F1_LO = 250, F1_HI = 900;
const F2_LO = 900, F2_HI = 2500;
const SIB_LO = 4000, SIB_HI = 9000;

/** Below this RMS the mouth is closed. Above it, we are looking at speech. */
const SILENCE = 0.012;
/** How fast the mouth moves toward its target. Lower = softer, higher = snappier. */
const ATTACK = 0.45;
const RELEASE = 0.22;

export class LipSync {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freq: Uint8Array = new Uint8Array(0);
  private time: Uint8Array = new Uint8Array(0);
  private binHz = 0;
  /** Elements already routed through the graph — a second MediaElementSource throws. */
  private wired = new WeakSet<HTMLMediaElement>();
  private current: VisemeWeights = {};
  /** Speech seen recently, so a gap can be read as a lip closure rather than the end. */
  private lastVoiceAt = 0;

  /** Jaw opening 0..1, exposed separately because it drives bone rotation, not a morph. */
  jaw = 0;

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;                       // no Web Audio → avatar idles, audio still plays
    this.ctx = new AC();
    this.analyser = this.ctx!.createAnalyser();
    this.analyser.fftSize = 2048;
    // Some smoothing in the analyser itself; the rest is done on the weights, which
    // sounds redundant but keeps single-frame spikes from ever reaching the classifier.
    this.analyser.smoothingTimeConstant = 0.5;
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.time = new Uint8Array(this.analyser.fftSize);
    this.binHz = this.ctx!.sampleRate / this.analyser.fftSize;
    return this.ctx;
  }

  /**
   * Route an audio element through the analyser.
   *
   * The element is also connected to the speakers — once it has a MediaElementSource, the
   * graph is the ONLY path to the output, so forgetting this makes the interviewer mute.
   */
  attach(el: HTMLMediaElement): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.analyser) return;
    // Browsers start the context suspended until a gesture; the member clicked "Start
    // interview" to get here, so this resolves immediately in practice.
    if (ctx.state === 'suspended') ctx.resume().catch(() => { /* audio still plays */ });
    if (this.wired.has(el)) return;
    try {
      const src = ctx.createMediaElementSource(el);
      src.connect(this.analyser);
      this.analyser.connect(ctx.destination);
      this.wired.add(el);
    } catch { /* already wired elsewhere, or cross-origin — leave audio untouched */ }
  }

  /** Energy-weighted mean frequency inside a band — the formant estimate. */
  private centroid(loHz: number, hiHz: number): { hz: number; energy: number } {
    const lo = Math.max(1, Math.floor(loHz / this.binHz));
    const hi = Math.min(this.freq.length - 1, Math.ceil(hiHz / this.binHz));
    let num = 0, den = 0;
    for (let i = lo; i <= hi; i++) {
      const v = this.freq[i] / 255;
      const w = v * v;                          // square: let the peak dominate the mean
      num += w * (i * this.binHz);
      den += w;
    }
    return { hz: den > 0 ? num / den : 0, energy: den };
  }

  /**
   * Read the mouth shape for this frame. Call once per rAF; returns a stable object that
   * is mutated in place rather than a fresh allocation.
   */
  read(): VisemeWeights {
    const target: VisemeWeights = {};
    let openness = 0;

    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.freq as any);
      this.analyser.getByteTimeDomainData(this.time as any);

      // RMS from the time domain — a truer loudness than summing FFT bins.
      let sum = 0;
      for (let i = 0; i < this.time.length; i++) {
        const s = (this.time[i] - 128) / 128;
        sum += s * s;
      }
      const rms = Math.sqrt(sum / this.time.length);
      const now = performance.now();

      if (rms < SILENCE) {
        // A brief gap inside a phrase is a lip closure (p/b/m). A long one is the end of
        // the sentence, and the mouth should simply rest.
        const gap = now - this.lastVoiceAt;
        if (gap < 220) target.viseme_PP = 1;
        else target.viseme_sil = 1;
      } else {
        this.lastVoiceAt = now;

        const f1 = this.centroid(F1_LO, F1_HI);
        const f2 = this.centroid(F2_LO, F2_HI);
        const sib = this.centroid(SIB_LO, SIB_HI);

        // Sibilants sit far above the vowel bands, so a high ratio is unambiguous.
        const voiced = f1.energy + f2.energy;
        const sibRatio = voiced > 0 ? sib.energy / (voiced + sib.energy) : 0;

        if (sibRatio > 0.38) {
          target.viseme_SS = Math.min(1, sibRatio * 1.6);
          openness = 0.15;                      // teeth close together, jaw barely open
        } else {
          // Nearest vowel in (F1, F2) space, scaled so both axes count equally despite
          // F2 spanning a far wider range of hertz.
          let best = VOWEL_TARGETS[0], bestD = Infinity, second = VOWEL_TARGETS[0], secondD = Infinity;
          for (const v of VOWEL_TARGETS) {
            const d1 = (f1.hz - v.f1) / (F1_HI - F1_LO);
            const d2 = (f2.hz - v.f2) / (F2_HI - F2_LO);
            const d = d1 * d1 + d2 * d2;
            if (d < bestD) { secondD = bestD; second = best; bestD = d; best = v; }
            else if (d < secondD) { secondD = d; second = v; }
          }
          // Blend the two nearest vowels. Snapping to one makes the mouth tick between
          // shapes; real speech slides through the space between them.
          const total = bestD + secondD;
          const wBest = total > 0 ? 1 - bestD / total : 1;
          const loud = Math.min(1, rms / 0.16);
          target[best.viseme] = wBest * loud;
          target[second.viseme] = (1 - wBest) * loud * 0.6;
          // Open vowels drop the jaw further than close ones.
          openness = loud * (f1.hz > 600 ? 1 : f1.hz > 430 ? 0.62 : 0.3);
        }
      }
    }

    // Ease toward the target. Opening fast and closing slower matches how a jaw moves and
    // hides the occasional misclassified frame.
    const keys: Viseme[] = ['viseme_sil', 'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U', 'viseme_PP', 'viseme_SS', 'viseme_nn'];
    for (const k of keys) {
      const want = target[k] || 0;
      const have = this.current[k] || 0;
      this.current[k] = have + (want - have) * (want > have ? ATTACK : RELEASE);
    }
    this.jaw += (openness - this.jaw) * (openness > this.jaw ? ATTACK : RELEASE);
    return this.current;
  }

  /** Close the mouth immediately — used when speech is cut off mid-line. */
  reset(): void {
    for (const k of Object.keys(this.current) as Viseme[]) this.current[k] = 0;
    this.current.viseme_sil = 1;
    this.jaw = 0;
  }
}

/** One analyser for the whole page: a second AudioContext per interview is wasteful. */
export const lipSync = new LipSync();
