import type { Viseme, VisemeWeights } from './lipsync';

/**
 * Translates visemes into whatever blend shapes a given head actually has.
 *
 * There are two incompatible conventions in the wild and no way to know in advance which
 * one a model uses:
 *
 *   OCULUS / Ready Player Me — one shape per mouth position: `viseme_aa`, `viseme_O`, …
 *   ARKit (Apple, and most face-scan and capture tools) — 52 anatomical shapes with no
 *     visemes at all: `jawOpen`, `mouthPucker`, `mouthFunnel`, `mouthStretch_L`, …
 *
 * Driving only the first convention means an ARKit head loads perfectly and then sits
 * there with a frozen face, which is worse than no model at all — it looks broken rather
 * than absent. So a viseme is expressed BOTH ways: directly if the model has viseme
 * shapes, and otherwise as the combination of anatomical shapes that physically produces
 * that mouth. "oo" really is a pucker plus a funnel plus a little jaw.
 *
 * Names also differ in casing and side suffixes between exporters (`eyeBlinkLeft` vs
 * `eyeBlink_L` vs `eyeBlink.L`), so every lookup goes through an alias list resolved once
 * against the model that actually loaded.
 */

/** Anatomical recipe for each viseme, as ARKit-style shape names → weight. */
const ARKIT_RECIPE: Record<Viseme, Record<string, number>> = {
  // Jaw wide, lips relaxed and slightly spread — "father".
  viseme_aa:  { jawOpen: 0.78, mouthLowerDown: 0.25, mouthUpperUp: 0.15 },
  // Mid-open with the corners drawn back — "bed".
  viseme_E:   { jawOpen: 0.38, mouthStretch: 0.42, mouthLowerDown: 0.18 },
  // Nearly closed, corners wide, a hint of smile — "see".
  viseme_I:   { jawOpen: 0.16, mouthStretch: 0.55, mouthSmile: 0.28 },
  // Rounded and open — "so".
  viseme_O:   { jawOpen: 0.46, mouthFunnel: 0.66, mouthPucker: 0.3 },
  // Tightly rounded, jaw almost closed — "too".
  viseme_U:   { jawOpen: 0.14, mouthPucker: 0.8, mouthFunnel: 0.38 },
  // Lips pressed together — p, b, m.
  viseme_PP:  { mouthClose: 0.85, mouthPress: 0.55, mouthRollLower: 0.2, mouthRollUpper: 0.2 },
  // Teeth close, corners back, upper lip raised — s, sh, ch.
  viseme_SS:  { jawOpen: 0.1, mouthStretch: 0.5, mouthUpperUp: 0.22 },
  // Tongue behind the teeth, mouth barely open — n, ng.
  viseme_nn:  { jawOpen: 0.12, mouthClose: 0.35 },
  viseme_sil: {},
};

/**
 * Alias lists, most-specific first. `%` marks where a side suffix goes, so one entry
 * covers every casing an exporter might have chosen.
 */
const ALIASES: Record<string, string[]> = {
  jawOpen:        ['jawOpen', 'JawOpen', 'jaw_open', 'mouthOpen'],
  mouthClose:     ['mouthClose', 'MouthClose', 'mouth_close'],
  mouthFunnel:    ['mouthFunnel', 'MouthFunnel', 'mouth_funnel'],
  mouthPucker:    ['mouthPucker', 'MouthPucker', 'mouth_pucker'],
  mouthSmile:     ['mouthSmile%', 'MouthSmile%', 'mouth_smile%', 'mouthSmile'],
  mouthStretch:   ['mouthStretch%', 'MouthStretch%', 'mouth_stretch%'],
  mouthPress:     ['mouthPress%', 'MouthPress%', 'mouth_press%'],
  mouthUpperUp:   ['mouthUpperUp%', 'MouthUpperUp%', 'mouth_upper_up%'],
  mouthLowerDown: ['mouthLowerDown%', 'MouthLowerDown%', 'mouth_lower_down%'],
  mouthRollUpper: ['mouthRollUpper', 'MouthRollUpper'],
  mouthRollLower: ['mouthRollLower', 'MouthRollLower'],
  eyeBlink:       ['eyeBlink%', 'EyeBlink%', 'eye_blink%', 'eyesClosed'],
};

/** Suffix forms for paired left/right shapes, in the order exporters tend to use them. */
const SIDES = [['Left', 'Right'], ['_L', '_R'], ['.L', '.R'], ['L', 'R'], ['_l', '_r']];

/** One resolved shape: which morph indices to drive, on which meshes. */
export interface ShapeSlot { mesh: number; index: number }

export class VisemeRig {
  /** Logical name → the morph slots that implement it (both sides when paired). */
  private slots = new Map<string, ShapeSlot[]>();
  /** True when the model speaks Oculus visemes directly and needs no recipe. */
  private hasVisemes = false;

  /**
   * Resolve every shape this rig can drive against the dictionaries the model provided.
   * Called once after load — per-frame name lookups would cost more than the morphing.
   */
  constructor(dictionaries: Record<string, number>[]) {
    const add = (logical: string, mesh: number, index: number) => {
      const list = this.slots.get(logical) || [];
      list.push({ mesh, index });
      this.slots.set(logical, list);
    };

    dictionaries.forEach((dict, mesh) => {
      // Direct viseme shapes win: a model that has them was authored for exactly this.
      for (const v of Object.keys(ARKIT_RECIPE)) {
        if (dict[v] !== undefined) { add(v, mesh, dict[v]); this.hasVisemes = true; }
      }

      for (const [logical, forms] of Object.entries(ALIASES)) {
        for (const form of forms) {
          if (!form.includes('%')) {
            if (dict[form] !== undefined) { add(logical, mesh, dict[form]); break; }
            continue;
          }
          // Paired shape: accept the first side convention the model actually uses, and
          // take BOTH sides so the face stays symmetric.
          const pair = SIDES.find(([l, r]) =>
            dict[form.replace('%', l)] !== undefined && dict[form.replace('%', r)] !== undefined);
          if (pair) {
            add(logical, mesh, dict[form.replace('%', pair[0])]);
            add(logical, mesh, dict[form.replace('%', pair[1])]);
            break;
          }
        }
      }
    });
  }

  /** Did this model expose anything we can drive? False means the head cannot animate. */
  get usable(): boolean { return this.slots.size > 0; }

  /** True if the mouth is driven by viseme shapes rather than the anatomical recipe. */
  get direct(): boolean { return this.hasVisemes; }

  /**
   * Turn this frame's visemes into concrete morph weights.
   *
   * Anatomical shapes accumulate across the blended visemes and are clamped, because two
   * neighbouring vowels both asking for jaw movement should not open the jaw twice.
   */
  apply(weights: VisemeWeights, jaw: number, out: Map<string, number>): void {
    out.clear();

    if (this.hasVisemes) {
      for (const [v, w] of Object.entries(weights)) if (w) out.set(v, w);
      out.set('jawOpen', jaw * 0.7);
      return;
    }

    for (const [v, w] of Object.entries(weights)) {
      if (!w) continue;
      const recipe = ARKIT_RECIPE[v as Viseme];
      if (!recipe) continue;
      for (const [shape, amount] of Object.entries(recipe)) {
        out.set(shape, Math.min(1, (out.get(shape) || 0) + amount * w));
      }
    }
  }

  /** Write resolved weights onto the meshes. Unknown names are ignored, not an error. */
  write(values: Map<string, number>, influences: (number[] | undefined)[]): void {
    // Clear first: a shape that stopped being requested this frame must fall back to zero,
    // or the face accumulates every expression it has ever made.
    for (const list of Array.from(this.slots.values())) {
      for (const s of list) {
        const inf = influences[s.mesh];
        if (inf) inf[s.index] = 0;
      }
    }
    for (const [name, value] of Array.from(values.entries())) {
      const list = this.slots.get(name);
      if (!list) continue;
      for (const s of list) {
        const inf = influences[s.mesh];
        if (inf) inf[s.index] = value;
      }
    }
  }

  /** Blink, whatever the model calls it. Written after the mouth so it is never cleared. */
  blink(amount: number, influences: (number[] | undefined)[]): void {
    const list = this.slots.get('eyeBlink');
    if (!list) return;
    for (const s of list) {
      const inf = influences[s.mesh];
      if (inf) inf[s.index] = amount;
    }
  }
}
