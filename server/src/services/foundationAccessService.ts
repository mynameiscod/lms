/**
 * What a Foundation learner may see of their ninety-day roadmap: all of it, a preview, or nothing.
 *
 * ── MEMBERSHIP IS THE WHOLE RULE ──────────────────────────────────────────────────────────
 *
 * The tenant's own entitlement settings decide it, the same keys the rest of CareerPilot uses:
 *
 *   FULL     `roadmap_full` is open to this learner — a member, or the tenant made it free. Their
 *            ninety days are generated and every day can be worked through.
 *   PREVIEW  `roadmap_preview` is open. They see the first N days of their own plan (N is the
 *            admin's `roadmapPreviewDays`) as topics, and are asked to unlock the rest.
 *   LOCKED   neither is open. They are asked to take membership.
 */

import mongoose from 'mongoose';
import PassportConfig from '../models/PassportConfig';
import User from '../models/User';
import { isEntitled } from './passportEntitlementService';
import { clampPreviewDays } from '../data/foundationAccessPolicy';
import { trialJourneyDays } from './trialService';

export type FoundationAccessLevel = 'FULL' | 'PREVIEW' | 'LOCKED';

export interface FoundationAccess {
  level: FoundationAccessLevel;
  /** The admin's preview length, clamped. Meaningful for PREVIEW. */
  previewDays: number;
  /**
   * A TRIAL's class days: FULL, but only days 1..trialDays open. Absent for a member and for a
   * trial with no day limit. A trial with classes switched off is LOCKED instead.
   */
  trialDays?: number;
}

export async function foundationAccess(tenantId: string, studentId: string, now: Date = new Date()): Promise<FoundationAccess> {
  const [cfg, user] = await Promise.all([
    PassportConfig.findOne({ tenantId }).select('entitlements roadmapPreviewDays').lean() as any,
    mongoose.Types.ObjectId.isValid(studentId)
      ? User.findOne({ _id: studentId, tenantId }).select('passport.active passport.expiresAt passport.trial').lean() as any
      : Promise.resolve(null),
  ]);
  const previewDays = clampPreviewDays(cfg?.roadmapPreviewDays);
  if (isEntitled(cfg?.entitlements, user?.passport, 'roadmap_full', now)) {
    // isEntitled said yes for a trial only when its classes are on; their day limit rides along.
    const trialDays = trialJourneyDays(user?.passport);
    return trialDays ? { level: 'FULL', previewDays, trialDays } : { level: 'FULL', previewDays };
  }
  if (isEntitled(cfg?.entitlements, user?.passport, 'roadmap_preview', now)) return { level: 'PREVIEW', previewDays };
  return { level: 'LOCKED', previewDays };
}
