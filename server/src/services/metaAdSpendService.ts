/**
 * Meta ad spend → AdSpendDaily (one row per ad per day), from the Marketing API insights edge:
 *   GET /<ver>/act_<AD_ACCOUNT>/insights?level=ad&time_increment=1&time_range=...
 * Credentials per institute: META_AD_ACCOUNT_ID, META_ADS_ACCESS_TOKEN (needs ads_read).
 *
 * Pages are followed by cursor (`after`), never by the `next` URL Meta returns, and the token
 * goes in a header — so it is never part of a URL that could reach a log.
 */
import mongoose from 'mongoose';
import AdSpendDaily from '../models/AdSpendDaily';
import SystemSetting from '../models/SystemSetting';
import * as settings from './settingsService';
import { META_GRAPH_VERSION } from './metaCrmEventService';

const FIELDS = 'spend,impressions,clicks,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,account_currency';
export const MAX_BACKFILL_DAYS = 90;

/** 'YYYY-MM-DD' for a moment, in IST. */
export function istDay(d: Date): string {
  return new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}
export const istDayStart = (day: string) => new Date(`${day}T00:00:00+05:30`);

export function adAccountPath(raw: string): string | null {
  const digits = String(raw || '').trim().replace(/^act_/i, '');
  return /^\d{5,20}$/.test(digits) ? `act_${digits}` : null;
}

function creds(tenantId: string) {
  return {
    account: adAccountPath(settings.getCredential('META_AD_ACCOUNT_ID', tenantId)),
    token: settings.getCredential('META_ADS_ACCESS_TOKEN', tenantId).trim(),
  };
}

async function getJson(url: string, token: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || body?.error) throw new Error(`Meta: ${body?.error?.message || `HTTP ${res.status}`}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export interface SpendSyncResult { days: number; rows: number; from: string; to: string }

/** Pull spend for [fromDay, toDay] (inclusive, 'YYYY-MM-DD') and upsert it. Idempotent. */
export async function syncSpendRange(tenantId: string, fromDay: string, toDay: string): Promise<SpendSyncResult> {
  const { account, token } = creds(tenantId);
  if (!account || !token) throw new Error('Set the ad account ID and an ads_read token first.');
  const tid = new mongoose.Types.ObjectId(tenantId);
  const base = `https://graph.facebook.com/${META_GRAPH_VERSION}/${account}/insights`;
  let after = '';
  let rows = 0;
  for (let page = 0; page < 500; page++) {
    const params = new URLSearchParams({
      level: 'ad', time_increment: '1', fields: FIELDS, limit: '500',
      time_range: JSON.stringify({ since: fromDay, until: toDay }),
      ...(after ? { after } : {}),
    });
    const body = await getJson(`${base}?${params.toString()}`, token);
    const data: any[] = Array.isArray(body?.data) ? body.data : [];
    if (data.length) {
      await AdSpendDaily.bulkWrite(data.filter(r => r.ad_id && r.date_start).map(r => ({
        updateOne: {
          filter: { tenantId: tid, day: r.date_start, adId: String(r.ad_id) },
          update: {
            $set: {
              tenantId: tid, day: r.date_start, date: istDayStart(r.date_start), adId: String(r.ad_id),
              adName: r.ad_name, campaignId: r.campaign_id ? String(r.campaign_id) : undefined, campaignName: r.campaign_name,
              adSetId: r.adset_id ? String(r.adset_id) : undefined, adSetName: r.adset_name,
              spend: Number(r.spend) || 0, impressions: Number(r.impressions) || 0, clicks: Number(r.clicks) || 0,
              currency: r.account_currency,
            },
          },
          upsert: true,
        },
      })));
      rows += data.length;
    }
    after = body?.paging?.cursors?.after && body?.paging?.next ? String(body.paging.cursors.after) : '';
    if (!after) break;
  }
  const days = Math.round((istDayStart(toDay).getTime() - istDayStart(fromDay).getTime()) / 86_400_000) + 1;
  return { days, rows, from: fromDay, to: toDay };
}

/** Last `days` days up to today (IST). Meta revises recent days, so the nightly job re-pulls 3. */
export function syncRecentSpend(tenantId: string, days = 3): Promise<SpendSyncResult> {
  const n = Math.max(1, Math.min(MAX_BACKFILL_DAYS, Math.floor(days)));
  const to = istDay(new Date());
  const from = istDay(new Date(Date.now() - (n - 1) * 86_400_000));
  return syncSpendRange(tenantId, from, to);
}

/** Institutes with an ad account saved (per-institute setting). */
export async function tenantsWithAdAccount(): Promise<string[]> {
  const rows = await SystemSetting.find({ key: 'META_AD_ACCOUNT_ID', tenantId: { $ne: null } }).select('tenantId').lean();
  return [...new Set(rows.map((r: any) => String(r.tenantId)))];
}

// ─────────────────────────── reads (dashboard contract) ───────────────────────────

/** Spend by campaign between two dates (inclusive by day). Used by the admissions dashboard. */
export async function getSpendByCampaign(tenantId: string, from: Date, to: Date): Promise<{ campaignId: string; campaignName: string; spend: number; impressions: number; clicks: number }[]> {
  const rows = await AdSpendDaily.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), day: { $gte: istDay(from), $lte: istDay(to) } } },
    { $sort: { day: -1 } },
    { $group: { _id: '$campaignId', campaignName: { $first: '$campaignName' }, spend: { $sum: '$spend' }, impressions: { $sum: '$impressions' }, clicks: { $sum: '$clicks' } } },
    { $sort: { spend: -1 } },
  ]);
  return rows.map((r: any) => ({
    campaignId: r._id || '', campaignName: r.campaignName || '(no campaign)',
    spend: Math.round(r.spend * 100) / 100, impressions: r.impressions, clicks: r.clicks,
  }));
}

/** Spend by campaign, ad set and ad, plus totals — for the Meta sync page. */
export async function getSpendSummary(tenantId: string, from: Date, to: Date) {
  const match = { tenantId: new mongoose.Types.ObjectId(tenantId), day: { $gte: istDay(from), $lte: istDay(to) } };
  const group = (key: string, name: string) => AdSpendDaily.aggregate([
    { $match: match }, { $sort: { day: -1 } },
    { $group: { _id: `$${key}`, name: { $first: `$${name}` }, campaignId: { $first: '$campaignId' }, campaignName: { $first: '$campaignName' }, adSetId: { $first: '$adSetId' }, adSetName: { $first: '$adSetName' }, spend: { $sum: '$spend' }, impressions: { $sum: '$impressions' }, clicks: { $sum: '$clicks' } } },
    { $sort: { spend: -1 } }, { $limit: 500 },
  ]);
  const [byCampaign, byAdSet, byAd, totals, last] = await Promise.all([
    group('campaignId', 'campaignName'), group('adSetId', 'adSetName'), group('adId', 'adName'),
    AdSpendDaily.aggregate([{ $match: match }, { $group: { _id: null, spend: { $sum: '$spend' }, impressions: { $sum: '$impressions' }, clicks: { $sum: '$clicks' }, currency: { $first: '$currency' } } }]),
    AdSpendDaily.findOne({ tenantId: match.tenantId }).sort({ updatedAt: -1 }).select('updatedAt day').lean(),
  ]);
  const t: any = totals[0] || { spend: 0, impressions: 0, clicks: 0 };
  return {
    from: istDay(from), to: istDay(to),
    totals: { spend: Math.round(t.spend * 100) / 100, impressions: t.impressions, clicks: t.clicks, currency: t.currency || 'INR' },
    byCampaign, byAdSet, byAd,
    lastSyncedAt: (last as any)?.updatedAt || null,
  };
}
