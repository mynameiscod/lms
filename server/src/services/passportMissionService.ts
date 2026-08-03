// Deterministic daily-mission generator — no per-user AI. Given a student's assessment
// result + the day number (days since journey start), produce that day's 3 missions,
// biased toward their weakest categories and their recommended pathway. Keys are stable
// per (day, slot) so completion state matches across reloads.
//
// The mission POOLS are admin-editable and live in PassportContent (per tenant); pass
// them in. Callers use ensureContent() below so a tenant that never opened the admin
// screen still gets the seeded defaults.

import PassportContent, {
  DEFAULT_MISSION_POOLS, DEFAULT_PATHWAYS,
  IMissionPool, IMissionPoolItem, IPassportPathway,
} from '../models/PassportContent';
import { appliesToMember } from './careerStageService';

export interface Mission { key: string; title: string; detail: string; category: string; type: string; xp: number; link?: string; }
export interface AttemptLite {
  careerScore: number;
  categoryScores: { key: string; label: string; score: number }[];
  weaknesses: string[];
  pathway: string;
  pathwayLabel: string;
}

export type PoolMap = Record<string, IMissionPoolItem[]>;

/** Read (and seed on first use) this tenant's editable Passport content. */
export async function ensureContent(tenantId: string) {
  let doc = await PassportContent.findOne({ tenantId });
  if (!doc) {
    doc = await PassportContent.create({
      tenantId,
      pathways: DEFAULT_PATHWAYS,
      missionPools: DEFAULT_MISSION_POOLS,
      journeyDays: 90,
    });
  }
  return doc;
}

/** Normalise a content doc's pools into a category → items map, falling back to defaults. */
export function poolMapOf(
  pools?: IMissionPool[] | null,
  member?: { stage?: string | null; background?: string | null; careerGoal?: string | null },
): PoolMap {
  const src = (pools && pools.length ? pools : DEFAULT_MISSION_POOLS);
  const out: PoolMap = {};
  // Filtering here rather than at each call site means the daily missions and the
  // 90-day roadmap read the same pool — tag a mission once and both change together.
  // A member with no stage, or an untagged mission, is unaffected.
  const keep = (it: any) => !member || appliesToMember(it, member);
  for (const p of src) {
    if (!p?.category || !p.items?.length) continue;
    const items = (p.items as IMissionPoolItem[]).filter(keep);
    if (items.length) out[p.category] = items;
  }
  // Any category the admin emptied falls back to the default so generation never yields
  // nothing — but the fallback is filtered too. Handing back the raw defaults was how a
  // first-year could still be given "Resume kickoff": their stage filter emptied the
  // employability pool, and the unfiltered default was then restored on top of it.
  // A category with nothing suitable is simply left out; the other categories cover the day.
  for (const d of DEFAULT_MISSION_POOLS) {
    if (out[d.category]?.length) continue;
    const items = (d.items as IMissionPoolItem[]).filter(keep);
    if (items.length) out[d.category] = items;
  }
  return out;
}

export function pathwayOf(
  pathways: IPassportPathway[] | undefined,
  key: string,
  stage?: string | null,
): IPassportPathway {
  const list = (pathways && pathways.length ? pathways : DEFAULT_PATHWAYS);
  // A stage-specific pathway wins when one has been authored: a foundation plan and a
  // placement plan for the same track have different WEEK THEMES, not just different
  // tasks, which is the part a member actually notices they paid for.
  const staged = stage ? list.find((p: any) => p.key === key && p.stage === stage) : null;
  return staged
    || list.find(p => p.key === key && !(p as any).stage)
    || list.find(p => p.key === key)
    || list.find(p => p.key === 'it_bridge')
    || list[0];
}

// Stable per-day hash (no Math.random — must be reproducible).
function hash(n: number): number { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; return x >>> 0; }

/** Ordered category focus: weakest categories first. */
function focusOrder(attempt: AttemptLite): string[] {
  return [...attempt.categoryScores].sort((a, b) => a.score - b.score).map(c => c.key);
}

/**
 * The 3 categories day N targets: the two weakest, plus one rotating.
 *
 * The rotating slot rotates over the categories AFTER the first two. Rotating over the
 * whole list (the original behaviour) made slot 2 land on slot 0's category every
 * `order.length` days — day 1, 7, 13… — so a third of all days served the same category
 * twice. Exported so the roadmap and the daily missions agree.
 */
export function categoriesForDay(attempt: AttemptLite, day: number): string[] {
  const order = focusOrder(attempt);
  if (order.length <= 2) return order.slice(0, 2);
  const rest = order.slice(2);
  return [order[0], order[1], rest[(day - 1) % rest.length]];
}

export function missionsForDay(attempt: AttemptLite, day: number, pools: PoolMap = poolMapOf()): Mission[] {
  const cats = categoriesForDay(attempt, day);
  if (!cats.length) return [];
  const h = hash(day);

  // Belt-and-braces against repeats: even when two slots share a category (possible
  // when a tenant has fewer than 3 categories), never serve the same title twice in a
  // day. The `slot * 7` stride alone collided whenever pool.length divided 14.
  const usedTitles = new Set<string>();

  return cats.map((cat, slot) => {
    const pool = pools[cat] || pools.career_clarity || [];
    if (!pool.length) return null;

    let idx = (h + slot * 7 + day) % pool.length;
    for (let tries = 0; tries < pool.length && usedTitles.has(pool[idx].title); tries++) {
      idx = (idx + 1) % pool.length;
    }
    const pick = pool[idx];
    usedTitles.add(pick.title);

    return {
      key: `d${day}-s${slot}`,
      title: pick.title,
      detail: pick.detail,
      category: cat,
      type: pick.type,
      xp: pick.xp,
      link: pick.link,
    } as Mission;
  }).filter(Boolean) as Mission[];
}

/** Whole-journey day number (1-based) from a start date. */
export function dayNumber(startDate: Date, now: Date): number {
  const ms = now.getTime() - new Date(startDate).getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

/** UTC 'YYYY-MM-DD' for streak bookkeeping. */
export function ymd(d: Date): string { return new Date(d).toISOString().slice(0, 10); }
