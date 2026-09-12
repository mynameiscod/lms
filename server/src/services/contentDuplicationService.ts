/**
 * Finding content that is the same thing wearing different unit codes.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 *
 * The readiness ladder rewards a unit for owning content. That is the correct incentive and it
 * is trivially gameable: generate one lesson, copy it across twelve sibling units with the title
 * swapped, and every one of them reports READY. Nothing downstream would notice — the counts are
 * real, the bindings are real, and the student meets the same page twelve times with a different
 * heading on it.
 *
 * So the guard is not a nicety. It is the check that stops "READY" from meaning "somebody ran a
 * template", and it is deliberately run as part of authoring rather than as an occasional audit.
 *
 * ── WHAT SIMILARITY MEANS HERE ────────────────────────────────────────────────────────────
 *
 * Not string equality. Templated content differs in exactly the places a template substitutes —
 * the unit's name, its skill — and is identical everywhere else. So comparison is on NORMALISED
 * text with the identifying words removed, which is what makes "Loops are important. Practise
 * loops." and "Functions are important. Practise functions." register as the same asset.
 *
 * Jaccard over word sets rather than edit distance: it is order-insensitive, cheap at this size,
 * and a reordered template is still a template.
 *
 * ── IT REPORTS, IT DOES NOT DELETE ────────────────────────────────────────────────────────
 *
 * Two units can legitimately share a phrasing — "Read the error before changing anything" belongs
 * in several debugging units. The guard surfaces candidates for a human to judge; a version that
 * deleted on its own would eventually remove the one sentence that was right twice.
 */

export type DuplicationKind =
  | 'IDENTICAL_TITLE'
  | 'IDENTICAL_BODY'
  | 'NEAR_IDENTICAL_BODY'
  | 'DUPLICATE_QUESTION_STEM'
  | 'DUPLICATE_PRACTICE_INSTRUCTION';

export interface DuplicationFinding {
  kind: DuplicationKind;
  /** How alike, 0–1. Exactly 1 for the identical kinds. */
  similarity: number;
  /** The content ids involved, always at least two. */
  contentIds: string[];
  unitCodes: string[];
  /** Enough of the offending text to recognise it. */
  sample: string;
}

export interface ComparableContent {
  _id: any;
  unitCode?: string;
  title: string;
  type?: string;
  notesContent?: string;
  practiceQuestions?: { title?: string; description?: string }[];
}

/**
 * Words stripped before comparison because a template substitutes exactly these.
 *
 * Unit and topic names are supplied by the caller rather than hard-coded: the whole trick is
 * removing what the template varies, and only the caller knows what the codes are.
 */
const normalise = (text: string, strip: Set<string>): string[] =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !strip.has(w));

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (!a.size && !b.size) return 1;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
};

/** Below this, two assets are different work. At or above, somebody should look. */
export const NEAR_DUPLICATE_THRESHOLD = 0.82;

/** Too short to judge. Two ten-word notes can be legitimately alike. */
const MIN_WORDS_TO_COMPARE = 25;

export function findDuplication(input: {
  rows: ComparableContent[];
  /** Words that identify a unit — its title words and code parts. Removed before comparing. */
  identifyingWords?: Set<string>;
  threshold?: number;
}): DuplicationFinding[] {
  const strip = input.identifyingWords || new Set<string>();
  const threshold = input.threshold ?? NEAR_DUPLICATE_THRESHOLD;
  const rows = input.rows || [];
  const findings: DuplicationFinding[] = [];

  const group = <T>(keyOf: (r: ComparableContent) => T | null) => {
    const m = new Map<string, ComparableContent[]>();
    for (const r of rows) {
      const k = keyOf(r);
      if (k === null || k === undefined || k === '') continue;
      const key = String(k);
      m.set(key, [...(m.get(key) || []), r]);
    }
    return [...m.entries()].filter(([, v]) => v.length > 1);
  };

  /* ---- identical titles -------------------------------------------------- */
  for (const [key, group_] of group(r => r.title?.trim().toLowerCase())) {
    findings.push({
      kind: 'IDENTICAL_TITLE',
      similarity: 1,
      contentIds: group_.map(r => String(r._id)),
      unitCodes: group_.map(r => String(r.unitCode || '')),
      sample: key.slice(0, 90),
    });
  }

  /* ---- identical bodies -------------------------------------------------- */
  for (const [, group_] of group(r => (r.notesContent || '').trim() || null)) {
    findings.push({
      kind: 'IDENTICAL_BODY',
      similarity: 1,
      contentIds: group_.map(r => String(r._id)),
      unitCodes: group_.map(r => String(r.unitCode || '')),
      sample: String(group_[0].notesContent || '').slice(0, 90).replace(/\s+/g, ' '),
    });
  }

  /* ---- duplicate question stems ------------------------------------------ */
  const stems = new Map<string, ComparableContent[]>();
  for (const r of rows) {
    for (const q of r.practiceQuestions || []) {
      const stem = String(q.title || '').trim().toLowerCase();
      if (stem.length < 12) continue;
      stems.set(stem, [...(stems.get(stem) || []), r]);
    }
  }
  for (const [stem, group_] of stems) {
    const distinct = [...new Set(group_.map(r => String(r._id)))];
    if (distinct.length < 2) continue;
    findings.push({
      kind: 'DUPLICATE_QUESTION_STEM',
      similarity: 1,
      contentIds: distinct,
      unitCodes: [...new Set(group_.map(r => String(r.unitCode || '')))],
      sample: stem.slice(0, 90),
    });
  }

  /* ---- duplicate practice instructions ----------------------------------- */
  const instructions = new Map<string, ComparableContent[]>();
  for (const r of rows) {
    for (const q of r.practiceQuestions || []) {
      const body = String(q.description || '').trim().toLowerCase();
      if (body.length < 40) continue;
      instructions.set(body, [...(instructions.get(body) || []), r]);
    }
  }
  for (const [body, group_] of instructions) {
    const distinct = [...new Set(group_.map(r => String(r._id)))];
    if (distinct.length < 2) continue;
    findings.push({
      kind: 'DUPLICATE_PRACTICE_INSTRUCTION',
      similarity: 1,
      contentIds: distinct,
      unitCodes: [...new Set(group_.map(r => String(r.unitCode || '')))],
      sample: body.slice(0, 90).replace(/\s+/g, ' '),
    });
  }

  /* ---- near-identical bodies --------------------------------------------- */

  /**
   * Compared pairwise WITHIN a type, and only for bodies long enough to judge.
   *
   * Across types is noise: a notes row and a worked example about the same idea share vocabulary
   * by necessity. Within a type, two long bodies that agree on 82% of their words after the unit
   * names are stripped are the same asset.
   */
  const byType = new Map<string, { row: ComparableContent; words: Set<string> }[]>();
  for (const r of rows) {
    const body = r.notesContent || '';
    const w = normalise(body, strip);
    if (w.length < MIN_WORDS_TO_COMPARE) continue;
    const t = String(r.type || 'unknown');
    byType.set(t, [...(byType.get(t) || []), { row: r, words: new Set(w) }]);
  }

  const alreadyIdentical = new Set(
    findings.filter(f => f.kind === 'IDENTICAL_BODY').flatMap(f => f.contentIds),
  );

  for (const list of byType.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (alreadyIdentical.has(String(a.row._id)) && alreadyIdentical.has(String(b.row._id))) continue;
        const score = jaccard(a.words, b.words);
        if (score < threshold) continue;
        findings.push({
          kind: 'NEAR_IDENTICAL_BODY',
          similarity: Math.round(score * 100) / 100,
          contentIds: [String(a.row._id), String(b.row._id)],
          unitCodes: [String(a.row.unitCode || ''), String(b.row.unitCode || '')],
          sample: `${a.row.title} ≈ ${b.row.title}`.slice(0, 90),
        });
      }
    }
  }

  return findings.sort((x, y) => y.similarity - x.similarity);
}

/**
 * The words that identify a unit, for stripping before comparison.
 *
 * A template varies the unit's name and leaves everything else. Removing those words is what
 * makes the copy visible; keeping them would let a find-and-replace pass as original work.
 */
export function identifyingWordsFor(units: { unitCode: string; title: string }[]): Set<string> {
  const out = new Set<string>();
  for (const u of units) {
    for (const w of String(u.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)) {
      if (w.length > 2) out.add(w);
    }
    for (const part of String(u.unitCode || '').toLowerCase().split('_')) {
      if (part.length > 2) out.add(part);
    }
  }
  return out;
}
