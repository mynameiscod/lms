// Entitlement gating for CareerPilot. Free features are always available; paid
// features require an active, non-expired membership. The entitlement list is admin-
// configured on PassportConfig, so tiers are data, not hard-coded.

interface EntitlementCfg { featureKey: string; label: string; tier: 'free' | 'paid'; }
interface PassportSub { active?: boolean; expiresAt?: Date | string | null; }

/** Is the membership currently active (flagged active AND not past expiry)? */
export function membershipActive(passport?: PassportSub | null, now: Date = new Date()): boolean {
  if (!passport?.active) return false;
  if (passport.expiresAt && new Date(passport.expiresAt).getTime() < now.getTime()) return false;
  return true;
}

/** Can this user use `featureKey`? Unknown features default to paid (fail closed). */
export function isEntitled(
  entitlements: EntitlementCfg[] | undefined,
  passport: PassportSub | null | undefined,
  featureKey: string,
  now: Date = new Date(),
): boolean {
  const ent = (entitlements || []).find(e => e.featureKey === featureKey);
  const tier = ent?.tier || 'paid';
  if (tier === 'free') return true;
  return membershipActive(passport, now);
}

/** A compact map of every feature → unlocked?, for the client to reflect UI state. */
export function entitlementMap(
  entitlements: EntitlementCfg[] | undefined,
  passport: PassportSub | null | undefined,
  now: Date = new Date(),
): Record<string, boolean> {
  const active = membershipActive(passport, now);
  const out: Record<string, boolean> = {};
  for (const e of entitlements || []) out[e.featureKey] = e.tier === 'free' ? true : active;
  return out;
}
