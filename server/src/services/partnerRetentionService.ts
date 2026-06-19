import PlacementPartner from '../models/PlacementPartner';
import * as settings from './settingsService';
import { createPartnerTask } from './partnerTaskService';

/**
 * Retention pass (run daily). For each placed partner:
 *  - alert me ~7 days before a placement's guarantee window expires (once per placement),
 *  - remind me to check in every quarter (deduped by a rolling window).
 * Idempotent — re-running never duplicates tasks.
 */
export async function runRetention(): Promise<void> {
  const now = Date.now();
  const placed = await PlacementPartner.find({ 'placement.placedAt': { $ne: null } });

  for (const p of placed) {
    const tid = p.tenantId.toString();

    // ── 90-day guarantee expiry alert ──
    const ends = p.placement?.guaranteeEndsAt ? new Date(p.placement.guaranteeEndsAt).getTime() : 0;
    if (ends) {
      const daysLeft = (ends - now) / (24 * 60 * 60 * 1000);
      if (daysLeft <= 7 && daysLeft >= -1) {
        const dateStr = new Date(ends).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        await createPartnerTask(p, 'guarantee',
          `⏳ Guarantee for ${p.companyName} (${p.placement?.studentName || 'placed student'}) ends ${dateStr} — confirm the student is retained`,
          { dueInDays: Math.max(0, Math.floor(daysLeft)) });
      }
    }

    // ── Quarterly retention check-in ──
    const checkinDays = settings.getNum('PLACEMENT_CHECKIN_DAYS', 90, tid);
    await createPartnerTask(p, 'checkin',
      `📞 Quarterly check-in with ${p.companyName} — how are our placed students doing?`,
      { dedupeWindowDays: checkinDays });
  }
}
