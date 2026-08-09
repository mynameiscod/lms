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

// ── Emphasis model ──────────────────────────────────────────────────────────
//
// Replaces "the two weakest every day, forever". That shape had three problems a
// member actually feels:
//   1. No proportionality — 25/100 and 60/100 were both simply "in the top two",
//      so a near-total gap and a modest one got identical airtime.
//   2. No taper — the same two categories led all 90 days, long after the member
//      had worked through them.
//   3. No sense of done — a category scored 90 still surfaced on schedule.
//
// The fix stays fully deterministic (no AI, no clock, no randomness): the same
// member and day always resolve to the same categories, so the roadmap preview and
// the daily view continue to agree, and a refresh never reshuffles the day.

/** At or above this, a category stops leading the day — the member has it. */
const MASTERY = 85;
/**
 * Length of one emphasis cycle, in days. Deliberately equal to PHASE_DAYS — one whole
 * cycle per phase. Two properties depend on that:
 *
 *  - It must DIVIDE PHASE_DAYS. At 12 against 30, a phase boundary landed mid-cycle and
 *    the realised split depended on where the index happened to sit, which showed up as
 *    a category wobbling between phases (9 / 25 / 15) for no reason a member could
 *    explain.
 *  - Longer cycles resolve finer. 30 days x 3 slots = 90 appearances, so ~1% steps; at
 *    10 days it was ~3% and two categories six points apart (72 and 78) rounded to
 *    exactly the same share, throwing away the proportionality this exists to provide.
 */
const EMPHASIS_CYCLE = 30;
/** Days per taper phase — 3 phases over the 90-day journey. */
const PHASE_DAYS = 30;
/**
 * How proportional emphasis is in each phase: 1 = fully need-weighted, 0 = even
 * across categories. Early on, the weakest dominates; by the last phase the plan
 * has broadened, because by then they should have moved.
 */
const PHASE_TAPER = [1, 0.65, 0.35];

const needOf = (score: number) => Math.max(0, 100 - score);

/**
 * Categories eligible to lead a day: everything not yet mastered.
 *
 * The floor matters more than the filter. A member who scores well across the board
 * would otherwise retire every category and get an EMPTY day — the plan they paid
 * for, showing nothing. When fewer than three survive the cut, fall back to the
 * three weakest overall so a strong member still gets a full day's practice.
 */
function eligibleCategories(attempt: AttemptLite): { key: string; score: number }[] {
  const all = [...attempt.categoryScores].sort((a, b) => a.score - b.score);
  const active = all.filter(c => c.score < MASTERY);
  return active.length >= 3 ? active : all.slice(0, Math.min(3, all.length));
}

/** Mission slots in a day. */
const SLOTS_PER_DAY = 3;

/**
 * Share `total` appearances across `weights`, with no category exceeding `cap`.
 *
 * Largest-remainder, so the parts sum to exactly `total` — proportional rounding on
 * its own leaves a drift that would silently shorten or overfill the cycle. The cap
 * exists because a category cannot appear twice in one day: without it, a member with
 * one dominant weakness is allocated more days than the cycle has, and the surplus is
 * lost rather than passed to the next category.
 */
function allocate(weights: number[], total: number, cap: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);

  const exact = weights.map(w => (w / sum) * total);
  const out = exact.map(e => Math.min(cap, Math.floor(e)));
  let used = out.reduce((a, b) => a + b, 0);

  // Hand out what rounding left over, largest fractional part first, skipping anyone
  // already at the cap. Index is the tie-break so the result never depends on sort
  // stability.
  const order = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let pass = 0; used < total && pass < total + order.length; pass++) {
    const { i } = order[pass % order.length];
    if (out[i] < cap) { out[i]++; used++; }
  }
  return out;
}

/**
 * The 3 categories day N targets.
 *
 * Days — not slots — are allocated by need. An earlier attempt shared out cycle
 * *positions* and then walked forward for the next distinct category; that made a
 * category's real frequency depend on who sat next to it in the cycle rather than on
 * its weight, and the taper came out non-monotonic (one category ran 9 / 25 / 15
 * across the three phases). Allocating each category a number of DAYS, then filling
 * each day from whoever has the most days left, makes frequency match weight and the
 * taper monotonic.
 *
 * Distinctness within a day is load-bearing: two slots on one category can serve the
 * same mission title twice, which is the duplicate-mission bug fixed in 3677915b.
 * Picking the top 3 by remaining quota guarantees three different categories, so
 * `missionsForDay`'s title guard rarely has to fire.
 *
 * Fully deterministic in (attempt, day) — no clock, no randomness — so the roadmap
 * preview and the daily view agree, and a refresh never reshuffles the day.
 */
export function categoriesForDay(attempt: AttemptLite, day: number): string[] {
  const cats = eligibleCategories(attempt);
  if (cats.length <= SLOTS_PER_DAY) return cats.map(c => c.key);

  const phase = Math.min(PHASE_TAPER.length - 1, Math.max(0, Math.floor((day - 1) / PHASE_DAYS)));
  const t = PHASE_TAPER[phase];

  // Interpolate between need-proportional (t=1) and even (t=0). The total is the same
  // either way, so the taper is a genuine redistribution — the weakest gives days up
  // and the middle of the pack picks them up — rather than a rescaling.
  const needs = cats.map(c => needOf(c.score));
  const avg = needs.reduce((a, b) => a + b, 0) / needs.length;
  const weights = avg <= 0 ? needs.map(() => 1) : needs.map(n => n * t + avg * (1 - t));

  const quota = allocate(weights, EMPHASIS_CYCLE * SLOTS_PER_DAY, EMPHASIS_CYCLE);

  // Replay the cycle up to this day. EMPHASIS_CYCLE is 12, so this is a dozen cheap
  // iterations — worth it to keep the function pure rather than caching state.
  const left = [...quota];
  const idx = ((day - 1) % EMPHASIS_CYCLE + EMPHASIS_CYCLE) % EMPHASIS_CYCLE;   // day may be < 1
  let picked: number[] = [];

  for (let d = 0; d <= idx; d++) {
    picked = cats
      .map((_, i) => i)
      // Most days outstanding first; then the weaker category (cats is sorted weakest
      // first, so the lower index); then index, so ties never depend on sort stability.
      .sort((a, b) => left[b] - left[a] || a - b)
      .filter(i => left[i] > 0)
      .slice(0, SLOTS_PER_DAY);

    // Quota sums to exactly SLOTS_PER_DAY per remaining day and no category exceeds
    // the cycle length, so three are always available. Top up from the weakest anyway
    // rather than hand back a short day if that invariant ever changes.
    for (let i = 0; picked.length < SLOTS_PER_DAY && i < cats.length; i++) {
      if (!picked.includes(i)) picked.push(i);
    }
    for (const i of picked) left[i]--;
  }

  return picked.map(i => cats[i].key);
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
