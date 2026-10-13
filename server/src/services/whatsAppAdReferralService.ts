import mongoose from 'mongoose';
import Lead from '../models/Lead';
import { getDecryptedTokens } from '../controllers/leadSourceConfigController';
import { graphGet } from '../controllers/metaLeadAdsController';
import { linkLeadToCampaign } from '../controllers/adCampaignController';

/**
 * A person who taps a Click-to-WhatsApp ad starts a chat, and Meta attaches a `referral` block to
 * the FIRST message of that chat saying which ad it was. This keeps it on the lead, so "which ad
 * brought this lead" is answerable — the same fields Meta Lead Ads leads already use
 * (sourceDetails + utmParams), so reports and filters treat both alike.
 *
 * The block carries the ad id and the headline the person saw. The ad's own name and its
 * campaign / ad set need a lookup with Meta, which only works when the connected token may read
 * ads; when it may not, the id and headline are still saved and nothing else is lost.
 */

export interface AdReferral {
  adId?: string;
  sourceType?: string;
  sourceUrl?: string;
  headline?: string;
  body?: string;
  ctwaClid?: string;
}

const s = (v: unknown) => (v === undefined || v === null ? undefined : String(v).trim().slice(0, 500) || undefined);

/** The ad details from one inbound WhatsApp message, or null when it did not come from an ad. */
export function extractReferral(message: any): AdReferral | null {
  const r = message?.referral;
  if (!r || typeof r !== 'object') return null;
  const ref: AdReferral = {
    adId: s(r.source_id), sourceType: s(r.source_type), sourceUrl: s(r.source_url),
    headline: s(r.headline), body: s(r.body), ctwaClid: s(r.ctwa_clid),
  };
  return ref.adId || ref.headline || ref.sourceUrl || ref.ctwaClid ? ref : null;
}

export interface AdNames { adName?: string; adSetId?: string; adSetName?: string; campaignName?: string }

/** Ad / ad set / campaign names from Meta. Best effort: any failure returns what is known (nothing). */
export async function lookupAd(tenantId: string, adId?: string): Promise<AdNames> {
  if (!adId || !/^\d+$/.test(adId)) return {};
  try {
    const token = (await getDecryptedTokens(tenantId))?.metaAds?.pageAccessToken;
    if (!token) return {};
    const ad = await Promise.race([
      graphGet(adId, token, { fields: 'name,adset{id,name},campaign{id,name}' }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timed out')), 5000)),
    ]);
    return { adName: s(ad?.name), adSetId: s(ad?.adset?.id), adSetName: s(ad?.adset?.name), campaignName: s(ad?.campaign?.name) };
  } catch (e: any) {
    console.warn('[WA-AD] could not look up ad', adId, '-', e?.message);
    return {};
  }
}

/** Field values to store on a lead for this ad (used for a new lead and for an existing one). */
export function adFields(ref: AdReferral, names: AdNames) {
  const adName = names.adName || ref.headline;
  return {
    sourceDetails: {
      platform: 'whatsapp' as const,
      adId: ref.adId, adName,
      adSetId: names.adSetId, adSetName: names.adSetName,
      campaignName: names.campaignName,
      landingPage: ref.sourceUrl,
      ctwaClid: ref.ctwaClid,
      adHeadline: ref.headline,
    },
    // The same shape Meta lead-form leads use, so the campaign reports pick these up.
    utmParams: { source: 'facebook', medium: 'click_to_whatsapp', ...(names.campaignName ? { campaign: names.campaignName } : {}) },
  };
}

const describe = (ref: AdReferral, names: AdNames) =>
  `📣 Came from a WhatsApp ad${names.campaignName ? ` — campaign “${names.campaignName}”` : ''}${names.adName || ref.headline ? ` — ad “${names.adName || ref.headline}”` : ''}${ref.adId ? ` (ad id ${ref.adId})` : ''}`;

export const referralActivity = (ref: AdReferral, names: AdNames, by: any) =>
  ({ type: 'note', description: describe(ref, names), createdAt: new Date(), createdBy: by, metadata: { adId: ref.adId, ctwaClid: ref.ctwaClid } });

/**
 * Record the ad on a lead that already exists (a known person tapping an ad). Their first-ever
 * ad stays as the lead's source; every ad tap is added to the timeline. The same tap delivered
 * twice is recorded once.
 */
export async function applyReferralToLead(tenantId: string, leadId: any, ref: AdReferral): Promise<boolean> {
  const tid = new mongoose.Types.ObjectId(tenantId);
  const lead: any = await Lead.findOne({ _id: leadId, tenantId: tid }).select('createdBy sourceDetails activities').lean();
  if (!lead) return false;
  const seen = (lead.activities || []).some((a: any) => a?.metadata && ((ref.ctwaClid && a.metadata.ctwaClid === ref.ctwaClid) || (!ref.ctwaClid && ref.adId && a.metadata.adId === ref.adId)));
  if (seen) return false;
  const names = await lookupAd(tenantId, ref.adId);
  const fields = adFields(ref, names);
  const set: Record<string, unknown> = {};
  if (!lead.sourceDetails?.adId) { set.sourceDetails = fields.sourceDetails; set.utmParams = fields.utmParams; }
  await Lead.updateOne({ _id: lead._id, tenantId: tid }, { ...(Object.keys(set).length ? { $set: set } : {}), $push: { activities: referralActivity(ref, names, lead.createdBy) } });
  if (set.utmParams && names.campaignName) await linkLeadToCampaign(lead._id, { source: 'facebook', campaign: names.campaignName }, tid);
  return true;
}
