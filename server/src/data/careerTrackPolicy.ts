/**
 * Career tracks — role + language roadmaps from Year 3 (e.g. Java Full Stack + AI).
 *
 * THE MODEL. A track is an ordered list of SKILL PACKS for Year 3 and of PLACEMENT PACKS for
 * Year 4. A pack is an ordered list of topics, each with a priority; the units that teach a topic
 * are found by its topicCode in any year's content, so a lesson written once (HTML, SQL, React) is
 * reused by every track whose packs name its topic — never copied.
 *
 * YEAR 3 is the track and nothing else: its skill packs, in order, fitted into the admin's days.
 *
 * YEAR 4 is the same track again, then placement:
 *   - a member who did Year 3 on the track with us gets a SHORT revision of it (weakest first,
 *     `memberTrackShare` of the days) and the rest is placement;
 *   - a fresh Year-4 joiner gets the track's essentials (`freshTrackShare` of the days, sized by
 *     their Skill DNA) and the rest is placement.
 * The shares are the admin's; the total is always exactly the admin's days.
 *
 * Pure and deterministic.
 */

export type TrackPriority = 'MUST' | 'SHOULD' | 'OPTIONAL';
export type TrackStage = 'specialize' | 'placement';
export type PackKind = 'SKILL' | 'PLACEMENT';

export const TRACK_STAGES: readonly TrackStage[] = ['specialize', 'placement'];
export const PACK_KINDS: readonly PackKind[] = ['SKILL', 'PLACEMENT'];
export const TRACK_PRIORITIES: readonly TrackPriority[] = ['MUST', 'SHOULD', 'OPTIONAL'];

/** The pool new track content is written into; existing years' units are reused where they are. */
export const TRACK_CONTENT_STAGE = 'track';

export interface PackTopic { topicCode: string; priority: TrackPriority }
export interface PackDef { key: string; title: string; kind: PackKind; topics: PackTopic[] }

export interface TrackSplit {
  /** Year 4, a member who did Year 3 on this track: share of the days given to revising it. */
  memberTrackShare: number;
  /** Year 4, a fresh joiner: share of the days given to the track's essentials. */
  freshTrackShare: number;
}
export const DEFAULT_TRACK_SPLIT: Readonly<TrackSplit> = Object.freeze({ memberTrackShare: 0.15, freshTrackShare: 0.40 });
export const MAX_TRACK_SHARE = 0.8;

export interface TrackDef {
  key: string;
  name: string;
  language: string;
  specializePacks: string[];
  placementPacks: string[];
  split?: Partial<TrackSplit> | null;
}

const clampShare = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(MAX_TRACK_SHARE, Math.max(0, n)) : fallback;
};

/** The split, made whole: anything missing or out of range falls back to the default. */
export function resolveSplit(raw: Partial<TrackSplit> | null | undefined): TrackSplit {
  return {
    memberTrackShare: clampShare(raw?.memberTrackShare, DEFAULT_TRACK_SPLIT.memberTrackShare),
    freshTrackShare: clampShare(raw?.freshTrackShare, DEFAULT_TRACK_SPLIT.freshTrackShare),
  };
}

/**
 * Year 4's days: how many go to the track, how many to placement. A member gets the short
 * revision, a fresh joiner the essentials; at least one day each when the year has two or more.
 */
export function placementSplit(programDays: number, member: boolean, raw?: Partial<TrackSplit> | null): { trackDays: number; placementDays: number } {
  const days = Math.max(0, Math.floor(programDays));
  const s = resolveSplit(raw);
  const share = member ? s.memberTrackShare : s.freshTrackShare;
  let trackDays = Math.round(days * share);
  if (days >= 2) trackDays = Math.min(days - 1, Math.max(1, trackDays));
  else trackDays = 0;
  return { trackDays, placementDays: days - trackDays };
}

const RANK: Record<TrackPriority, number> = { MUST: 0, SHOULD: 1, OPTIONAL: 2 };

/**
 * The topics of a stage, in teaching order: the packs in the track's order, each pack's topics in
 * its own order. A topic named by two packs is taught once, where it first appears, at the higher
 * of its two priorities. A pack key the catalogue does not hold is skipped (and reported by
 * `trackProblems`).
 */
export function trackTopics(packKeys: string[], packs: Map<string, PackDef>): (PackTopic & { packKey: string })[] {
  const out: (PackTopic & { packKey: string })[] = [];
  const at = new Map<string, number>();
  for (const key of packKeys) {
    const pack = packs.get(key);
    if (!pack) continue;
    for (const t of pack.topics) {
      const seen = at.get(t.topicCode);
      if (seen === undefined) {
        at.set(t.topicCode, out.length);
        out.push({ topicCode: t.topicCode, priority: t.priority, packKey: key });
      } else if (RANK[t.priority] < RANK[out[seen].priority]) {
        out[seen].priority = t.priority;
      }
    }
  }
  return out;
}

/** What stops a track from being switched on: missing packs, empty years, a pack of the wrong kind. */
export function trackProblems(track: TrackDef, packs: Map<string, PackDef>): string[] {
  const problems: string[] = [];
  const check = (keys: string[], kind: PackKind, year: string) => {
    if (!keys.length) problems.push(`${year} has no packs.`);
    for (const k of keys) {
      const p = packs.get(k);
      if (!p) problems.push(`${year}: pack "${k}" does not exist.`);
      else if (p.kind !== kind) problems.push(`${year}: pack "${p.title}" is a ${p.kind.toLowerCase()} pack, not a ${kind.toLowerCase()} pack.`);
      else if (!p.topics.length) problems.push(`${year}: pack "${p.title}" has no topics.`);
    }
  };
  check(track.specializePacks, 'SKILL', 'Year 3');
  check(track.placementPacks, 'PLACEMENT', 'Year 4 placement');
  return problems;
}

/** Keys are UPPER_SNAKE so they read the same in URLs, logs and the database. */
export const normaliseKey = (raw: unknown): string =>
  String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

/** Check an admin's track before it is stored. Refused rather than repaired. */
export function validateTrackInput(input: any): { ok: true; value: TrackDef & { split: TrackSplit } } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const key = normaliseKey(input?.key);
  if (!key) errors.push('A track needs a key, e.g. JAVA_FULLSTACK_AI.');
  const name = String(input?.name || '').trim();
  if (!name) errors.push('A track needs a name, e.g. "Java Full Stack + AI".');
  const language = String(input?.language || '').trim();
  if (!language) errors.push('A track needs a language, e.g. Java.');
  const list = (v: unknown, label: string): string[] => {
    if (v === undefined) return [];
    if (!Array.isArray(v)) { errors.push(`${label} must be a list of pack keys.`); return []; }
    return [...new Set(v.map(normaliseKey).filter(Boolean))];
  };
  const specializePacks = list(input?.specializePacks, 'Year-3 packs');
  const placementPacks = list(input?.placementPacks, 'Year-4 placement packs');
  for (const [k, label] of [['memberTrackShare', 'Member track share'], ['freshTrackShare', 'Fresh joiner track share']] as const) {
    const v = input?.split?.[k];
    if (v !== undefined && (!Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > MAX_TRACK_SHARE)) {
      errors.push(`${label} must be between 0 and ${MAX_TRACK_SHARE}.`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { key, name, language, specializePacks, placementPacks, split: resolveSplit(input?.split) } };
}

/** Check an admin's pack before it is stored. */
export function validatePackInput(input: any): { ok: true; value: PackDef } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const key = normaliseKey(input?.key);
  if (!key) errors.push('A pack needs a key, e.g. SPRING_BOOT.');
  const title = String(input?.title || '').trim();
  if (!title) errors.push('A pack needs a title.');
  const kind = String(input?.kind || 'SKILL').toUpperCase() as PackKind;
  if (!PACK_KINDS.includes(kind)) errors.push('A pack is SKILL or PLACEMENT.');
  const topics: PackTopic[] = [];
  const seen = new Set<string>();
  if (input?.topics !== undefined && !Array.isArray(input.topics)) errors.push('Topics must be a list.');
  for (const t of (Array.isArray(input?.topics) ? input.topics : []) as any[]) {
    const topicCode = String(t?.topicCode || '').trim();
    const priority = String(t?.priority || 'SHOULD').toUpperCase() as TrackPriority;
    if (!topicCode) { errors.push('Every topic needs a topicCode.'); continue; }
    if (!TRACK_PRIORITIES.includes(priority)) { errors.push(`"${topicCode}": priority must be MUST, SHOULD or OPTIONAL.`); continue; }
    if (seen.has(topicCode)) { errors.push(`"${topicCode}" is in the pack twice.`); continue; }
    seen.add(topicCode);
    topics.push({ topicCode, priority });
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { key, title, kind, topics } };
}
