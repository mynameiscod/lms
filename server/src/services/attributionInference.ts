import mongoose from 'mongoose';
import Payment from '../models/Payment';
import CareerPilotActivity from '../models/CareerPilotActivity';
import { IAttributionTouch } from '../models/careerPilotAttribution';

/**
 * "How did this member find us?" for members who joined BEFORE sign-up sources were captured.
 *
 * Nothing is invented. Three records already hold the answer, best first:
 *   1. A payment — checkout has stored the campaign since attribution was added there.
 *   2. The join-page events — since the journey funnel, each carries meta.source (the UTM source,
 *      the referring site's host, or "direct"), and every API call from the join page recorded the
 *      page address in `referrer`, query string included, so UTM tags and ad click ids can be read.
 *   3. The first recorded visit — at the very least, the page they landed on and when.
 * Activity is kept for 90 days, so this works for members whose first visits are still on record;
 * scripts/backfillMemberAttribution.ts saves the answer permanently before those rows expire.
 */

export type InferredFrom = 'payment' | 'activity';
export interface InferredAttribution { touch: IAttributionTouch; from: InferredFrom }

const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'] as const;
const cut = (v: any) => String(v ?? '').trim().slice(0, 300);

/** UTM tags and ad click ids from a recorded page address. */
function tagsFrom(url: string): Partial<IAttributionTouch> {
  try {
    const u = new URL(url);
    const out: any = {};
    for (const k of UTM) { const v = u.searchParams.get(k); if (v) out[k] = cut(v); }
    return out;
  } catch { return {}; }
}
const pathOf = (url: string): string => { try { const u = new URL(url); return cut(u.pathname + u.search); } catch { return ''; } };
const hostOf = (url: string): string => { try { return new URL(url).host; } catch { return ''; } };

export async function inferAttribution(tenantId: string, userId: string): Promise<InferredAttribution | null> {
  const uid = new mongoose.Types.ObjectId(userId);

  // 1. A payment that carried attribution.
  const paid: any = await Payment.findOne({ studentId: uid, 'attribution': { $exists: true } }).sort({ createdAt: 1 }).select('attribution createdAt').lean();
  const pt = paid?.attribution?.first_touch || paid?.attribution?.last_touch;
  if (pt && Object.keys(pt).some(k => k !== 'captured_at' && pt[k])) return { touch: { ...pt }, from: 'payment' };

  // 2 & 3. The member's own browsers, oldest rows first (including the anonymous ones before signup).
  const tid = new mongoose.Types.ObjectId(tenantId);
  const visitorIds: string[] = await CareerPilotActivity.distinct('visitorId', { tenantId: tid, userId: uid }) as any;
  if (!visitorIds.length) return null;
  const rows: any[] = await CareerPilotActivity.find({ tenantId: tid, visitorId: { $in: visitorIds } })
    .sort({ createdAt: 1 }).limit(400).select('kind name route meta referrer createdAt').lean();
  if (!rows.length) return null;

  const touch: IAttributionTouch = {};
  // Tags read straight off a recorded page address (an API call made from a tagged join link).
  const tagged = rows.find(r => r.referrer && /[?&](utm_[a-z]+|gclid|fbclid)=/i.test(r.referrer));
  if (tagged) Object.assign(touch, tagsFrom(tagged.referrer));
  // The join page's own source label.
  const src = rows.find(r => r.meta && typeof r.meta.source === 'string' && r.meta.source);
  if (src && !touch.utm_source && !touch.gclid && !touch.fbclid) {
    const s = cut(src.meta.source);
    if (s && s !== 'direct') {
      if (s.includes('.')) touch.referrer = s;        // a hostname: the site that sent them
      else {
        touch.utm_source = s;
        if (src.meta.medium) touch.utm_medium = cut(src.meta.medium);
        if (src.meta.campaign) touch.utm_campaign = cut(src.meta.campaign);
      }
    }
  }
  // Where they landed: the first screen recorded, else the first page address seen.
  const firstPage = rows.find(r => r.kind === 'page' && r.route);
  const firstAddr = rows.find(r => r.referrer && hostOf(r.referrer));
  touch.landing_url = cut(firstPage?.route || (firstAddr ? pathOf(firstAddr.referrer) : '')) || undefined;
  touch.captured_at = rows[0].createdAt;

  if (!Object.keys(touch).some(k => k !== 'captured_at' && (touch as any)[k])) return null;
  return { touch, from: 'activity' };
}
