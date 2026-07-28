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
export function poolMapOf(pools?: IMissionPool[] | null): PoolMap {
  const src = (pools && pools.length ? pools : DEFAULT_MISSION_POOLS);
  const out: PoolMap = {};
  for (const p of src) if (p?.category && p.items?.length) out[p.category] = p.items as IMissionPoolItem[];
  // Any category the admin emptied falls back to the default so generation never yields nothing.
  for (const d of DEFAULT_MISSION_POOLS) if (!out[d.category]?.length) out[d.category] = d.items;
  return out;
}

export function pathwayOf(pathways: IPassportPathway[] | undefined, key: string): IPassportPathway {
  const list = (pathways && pathways.length ? pathways : DEFAULT_PATHWAYS);
  return list.find(p => p.key === key) || list.find(p => p.key === 'it_bridge') || list[0];
}

// Stable per-day hash (no Math.random — must be reproducible).
function hash(n: number): number { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; return x >>> 0; }

/** Ordered category focus: weakest categories first. */
function focusOrder(attempt: AttemptLite): string[] {
  return [...attempt.categoryScores].sort((a, b) => a.score - b.score).map(c => c.key);
}

/** The 3 categories day N targets: two weakest + one rotating. Exported so the roadmap agrees. */
export function categoriesForDay(attempt: AttemptLite, day: number): string[] {
  const order = focusOrder(attempt);
  if (!order.length) return [];
  return [order[0], order[1] || order[0], order[(day - 1) % order.length]];
}

export function missionsForDay(attempt: AttemptLite, day: number, pools: PoolMap = poolMapOf()): Mission[] {
  const cats = categoriesForDay(attempt, day);
  if (!cats.length) return [];
  const h = hash(day);

  return cats.map((cat, slot) => {
    const pool = pools[cat] || pools.career_clarity || [];
    if (!pool.length) return null;
    const pick = pool[(h + slot * 7 + day) % pool.length];
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
