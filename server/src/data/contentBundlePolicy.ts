import { ContentLibraryType } from '../models/LearningContentLibrary';

/**
 * The order a Learning Unit's content is taught in.
 *
 * ── THERE IS NO ORDER FIELD, AND THIS IS WHY THERE STILL ISN'T ONE ────────────────────────
 *
 * A LearningContentLibrary row carries no sequence number. The `order` that exists on the model
 * belongs to `IQAItem` — the questions inside a Q&A row — not to the row itself. So two rows in
 * the same unit have nothing to sort by except their type and their timestamps.
 *
 * The fix was NOT to add a field. A per-unit order column would be a second ordering axis living
 * on a row that can serve several units at once: the same "HTML — video" row resolves for every
 * unit of the HTML topic, and a single `unitOrder` on it could only ever be right for one of
 * them. That is the shape of bug this codebase keeps producing, and it would be invisible —
 * content would simply appear in the wrong order somewhere else.
 *
 * TYPE IS THE ORDER, because teaching order IS type order. Watch it, read it, see it done,
 * practise it, then prove it. Every unit follows that shape, which is exactly why the shape can
 * live in one place rather than being retyped per unit.
 *
 * ── IT IS FULLY DETERMINISTIC ─────────────────────────────────────────────────────────────
 *
 * Type, then canonical, then creation time, then id. The last one never ties, so two calls with
 * the same rows always produce the same order — which matters more than it sounds: a bundle that
 * reshuffles between page loads reads as broken even when every item is correct.
 *
 * ── WHAT THIS CANNOT DO ───────────────────────────────────────────────────────────────────
 *
 * It cannot order two rows of the SAME type against each other by teaching intent. Two videos in
 * one unit fall back to whichever was authored first. If an author ever needs "this video before
 * that one", the honest answer is a Learning-Unit-scoped ordering — a list of content ids on the
 * unit — rather than a number on a row that several units share.
 */

/**
 * Watch it, read it, see it done, practise it, prove it.
 *
 * Lower sorts first. A type absent from this list sorts after everything listed, rather than
 * before it: an unknown type is more likely to be something new and supplementary than the thing
 * a student should open first.
 */
export const TEACHING_ORDER: ContentLibraryType[] = [
  'video',
  'notes',
  'worked_example',
  'interactive_lesson',
  'interactive_activity',
  'tech_qa',
  'behavioral_qa',
  'practice_theory',
  'practice_coding',
  'aptitude',
];

const RANK = new Map<string, number>(TEACHING_ORDER.map((t, i) => [t, i]));

/** Where a type sits in the teaching order. Unknown types sort last, not first. */
export const teachingRank = (type: string): number =>
  RANK.has(type) ? RANK.get(type)! : TEACHING_ORDER.length;

/** The role a type plays, for a screen that wants to group rather than list. */
export type BundleRole = 'TEACH' | 'REINFORCE' | 'PRACTISE' | 'OTHER';

const ROLE: Record<string, BundleRole> = {
  video: 'TEACH',
  notes: 'TEACH',
  worked_example: 'TEACH',
  interactive_lesson: 'TEACH',
  interactive_activity: 'TEACH',
  tech_qa: 'REINFORCE',
  behavioral_qa: 'REINFORCE',
  practice_theory: 'PRACTISE',
  practice_coding: 'PRACTISE',
  aptitude: 'PRACTISE',
};

export const roleOf = (type: string): BundleRole => ROLE[type] || 'OTHER';

/** A unit needs something that teaches before it can be published. Practice alone is not a lesson. */
export const teaches = (type: string): boolean => roleOf(type) === 'TEACH';
export const practises = (type: string): boolean => roleOf(type) === 'PRACTISE';

export interface OrderableContent {
  _id?: any;
  type: string;
  canonical?: boolean;
  createdAt?: Date | string;
}

/**
 * Sort a unit's content into teaching order, deterministically.
 *
 * Returns a new array. Sorting the caller's array in place would reorder a lean() result that
 * something else is still reading, which is the kind of shared-mutation bug that only shows up
 * under load.
 */
export function inTeachingOrder<T extends OrderableContent>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const byType = teachingRank(a.type) - teachingRank(b.type);
    if (byType) return byType;

    // The row somebody marked canonical leads its type. See LearningContentLibrary.canonical:
    // AI generation has produced near-duplicates for years, and this makes the choice deliberate.
    const byCanonical = Number(!!b.canonical) - Number(!!a.canonical);
    if (byCanonical) return byCanonical;

    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (at !== bt) return at - bt;

    // Never ties. Two rows created in the same millisecond still order the same way every call.
    return String(a._id ?? '').localeCompare(String(b._id ?? ''));
  });
}
