import PathwayCurriculum, { ICurriculumDay } from '../models/PathwayCurriculum';

/**
 * Resolving an authored day for a member.
 *
 * Two lookups, most specific first: a curriculum written for the exact pathway variant
 * (`software_dev:placement`) beats the track-wide one (`software_dev`). That is what lets
 * five curricula serve twenty pathways while still allowing one stage to differ.
 *
 * A miss is not a failure — it is the normal case. The generator handles every day nobody
 * has authored, which is how a curriculum can be thirty days long on a 365-day journey.
 */

export type DayMap = Map<number, ICurriculumDay>;

/** Track key from a pathway key: `software_dev:placement` -> `software_dev`. */
export const trackOf = (pathwayKey: string): string => String(pathwayKey || '').split(':')[0];

/**
 * The authored days that apply to one member, already merged.
 *
 * Loaded once per request and passed down, rather than queried per day — a 365-day
 * roadmap would otherwise be 365 round trips.
 */
export async function curriculumFor(
  tenantId: string,
  pathwayKey: string | null | undefined,
  stage?: string | null,
): Promise<DayMap> {
  const track = trackOf(pathwayKey || '');
  if (!track) return new Map();

  const keys = stage ? [track, `${track}:${stage}`] : [track];
  const docs = await PathwayCurriculum.find({ tenantId, pathwayKey: { $in: keys } }).lean();
  if (!docs.length) return new Map();

  const out: DayMap = new Map();
  // Track first, then the stage override on top — later writes win, so the more specific
  // curriculum replaces the track's day rather than being merged into it.
  for (const key of keys) {
    const doc = docs.find(d => d.pathwayKey === key);
    if (!doc) continue;
    for (const d of doc.days || []) {
      if (d?.day > 0 && d.items?.length) out.set(d.day, d as ICurriculumDay);
    }
  }
  return out;
}

/** Renumber to a gapless 1..n and sort, after an insert, delete or reorder. */
export function renumber(days: ICurriculumDay[]): ICurriculumDay[] {
  return [...days]
    .sort((a, b) => (a.day || 0) - (b.day || 0))
    .map((d, i) => ({ ...d, day: i + 1 }));
}

/**
 * Move one day to a new position, shifting everything between.
 *
 * Reordering by rewriting day numbers rather than storing an explicit order keeps the
 * stored shape identical to what the generator reads, so there is no second source of
 * truth about what day 12 is.
 */
export function moveDay(days: ICurriculumDay[], from: number, to: number): ICurriculumDay[] {
  const sorted = renumber(days);
  if (from < 1 || to < 1 || from > sorted.length || to > sorted.length || from === to) return sorted;
  const arr = [...sorted];
  const [moved] = arr.splice(from - 1, 1);
  arr.splice(to - 1, 0, moved);
  return arr.map((d, i) => ({ ...d, day: i + 1 }));
}
