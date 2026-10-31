import { GamificationConfig, XpTaskOverride } from '../models/GamificationModels';
import { resolveRule } from './gamificationEngine';
import { TASK_XP_TYPES, TASK_XP_FALLBACK, TASK_XP_MAX } from '../data/gamificationPolicy';

/**
 * What a journey task is worth, for one tenant.
 *
 * ONE PRICE LIST, READ EVERYWHERE. The day player, Home's daily goal, the XP the ledger pays and the
 * Content Builder's "+5 XP" all price a task through xpForTask, so an admin's change is what a member
 * sees and what a member is paid — never a copy that drifts.
 *
 * Precedence: a price set on the task itself (XpTaskOverride), then the admin's price for its type
 * (GamificationConfig.taskXp), then the shipped default (TASK_XP_TYPES). A mock interview is always 0
 * here, because MOCK_INTERVIEW_COMPLETED already pays it.
 *
 * Cached briefly per tenant: a day page reads it on every open. A save clears this server's copy at
 * once; another server instance picks the change up within CACHE_MS.
 */

export interface XpPricing {
  byType: Record<string, number>;
  /** 'content:<id>' or 'module:<id>' → XP. */
  overrides: Map<string, number>;
  /** The day bonus — the FOUNDATION_DAY_COMPLETED rule's amount, 0 when that rule is switched off. */
  dayBonus: number;
  /** False when an admin switched task XP off altogether (FOUNDATION_ACTIVITY_COMPLETED disabled). */
  tasksEnabled: boolean;
}

const CACHE_MS = 30_000;
const cache = new Map<string, { at: number; pricing: XpPricing }>();

export const invalidateXpPricing = (tenantId?: string) => {
  if (tenantId) cache.delete(tenantId); else cache.clear();
};

export const defaultTaskXp = (): Record<string, number> =>
  Object.fromEntries(TASK_XP_TYPES.map(t => [t.key, t.defaultXp]));

/** The shipped prices, for code that has no tenant to ask (tests, and a fallback when a read fails). */
export const DEFAULT_PRICING: XpPricing = {
  byType: defaultTaskXp(), overrides: new Map(), dayBonus: 25, tasksEnabled: true,
};

/** A whole, non-negative amount no larger than TASK_XP_MAX, or null when the input is not a number. */
export const cleanXp = (v: unknown): number | null => {
  const n = Number(v);
  if (v === '' || v === null || v === undefined || !Number.isFinite(n) || n < 0) return null;
  return Math.min(TASK_XP_MAX, Math.round(n));
};

export const overrideKey = (refKind: 'content' | 'module', refId: string) => `${refKind}:${refId}`;

/** The override key for a day item: its library content, or the quiz/assignment/code task it points at. */
export const itemOverrideKey = (item: { kind?: string; contentId?: any; sourceId?: any }): string | null => {
  const kind = item.kind || 'content';
  if (kind === 'content') return item.contentId ? overrideKey('content', String(item.contentId)) : null;
  return item.sourceId ? overrideKey('module', String(item.sourceId)) : null;
};

export async function loadXpPricing(tenantId: string): Promise<XpPricing> {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.pricing;
  try {
    const [cfg, rows, activityRule, dayRule] = await Promise.all([
      GamificationConfig.findOne({ tenantId }).select('taskXp').lean() as any,
      XpTaskOverride.find({ tenantId }).select('refKind refId xp').lean() as any,
      resolveRule(tenantId, 'FOUNDATION_ACTIVITY_COMPLETED'),
      resolveRule(tenantId, 'FOUNDATION_DAY_COMPLETED'),
    ]);
    const byType = defaultTaskXp();
    for (const [k, v] of Object.entries(cfg?.taskXp || {})) {
      const xp = cleanXp(v);
      if (xp !== null) byType[k] = xp;
    }
    const pricing: XpPricing = {
      byType,
      overrides: new Map((rows as any[]).map(r => [overrideKey(r.refKind, r.refId), Number(r.xp) || 0])),
      dayBonus: dayRule?.enabled ? Math.max(0, Number(dayRule.xp) || 0) : 0,
      tasksEnabled: activityRule ? !!activityRule.enabled : true,
    };
    cache.set(tenantId, { at: Date.now(), pricing });
    return pricing;
  } catch (e: any) {
    console.error('[xp-pricing]', e?.message || e);
    return DEFAULT_PRICING;
  }
}

/** The type-level price of a day item, ignoring any override on the task itself. */
export const typeXpFor = (item: { kind?: string; contentType?: string; type?: string }, pricing: XpPricing): number => {
  const kind = item.kind || 'content';
  if (kind === 'mockInterview') return 0;
  const type = item.contentType || item.type || '';
  if (type in pricing.byType) return pricing.byType[type];
  // Module items carry their kind as the type; a code task is priced as coding practice.
  if (kind === 'codeSnippet') return pricing.byType.practice_coding ?? TASK_XP_FALLBACK;
  if (kind in pricing.byType) return pricing.byType[kind];
  return TASK_XP_FALLBACK;
};

/** What a day item pays: its own price when an admin set one, else its type's. */
export const xpForTask = (
  item: { kind?: string; contentType?: string; type?: string; contentId?: any; sourceId?: any },
  pricing: XpPricing,
): number => {
  if (!pricing.tasksEnabled) return 0;
  if ((item.kind || 'content') === 'mockInterview') return 0;
  const key = itemOverrideKey(item);
  if (key && pricing.overrides.has(key)) return pricing.overrides.get(key)!;
  return typeXpFor(item, pricing);
};
