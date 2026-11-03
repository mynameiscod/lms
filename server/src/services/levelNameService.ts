import { GamificationConfig } from '../models/GamificationModels';
import { DEFAULT_LEVEL_NAMES } from '../data/gamificationPolicy';

/**
 * The names a tenant gives its levels (XP & Rewards → Levels).
 *
 * Read on every dashboard, so held for a minute; a save clears its tenant at once.
 */
const TTL_MS = 60_000;
const cache = new Map<string, { names: string[]; at: number }>();

export async function levelNamesFor(tenantId: string): Promise<string[]> {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.names;
  const cfg: any = await GamificationConfig.findOne({ tenantId }).select('levelNames').lean().catch(() => null);
  const names = Array.isArray(cfg?.levelNames) && cfg.levelNames.length ? cfg.levelNames : DEFAULT_LEVEL_NAMES;
  cache.set(tenantId, { names, at: Date.now() });
  return names;
}

export const invalidateLevelNames = (tenantId: string) => { cache.delete(tenantId); };
