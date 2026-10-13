import crypto from 'crypto';
import MetaSyncState from '../models/MetaSyncState';
import LeadSourceConfig from '../models/LeadSourceConfig';
import { getDecryptedTokens } from '../controllers/leadSourceConfigController';

export class MetaSyncBusy extends Error {}
async function ensureState(tenantId: string) {
  try { await MetaSyncState.updateOne({ tenantId }, { $setOnInsert: { tenantId } }, { upsert: true }); }
  catch (e: any) { if (e.code !== 11000) throw e; }
}
/** Webhooks and recovery serialize lead creation within an institute. */
export async function withMetaImportLock<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  await ensureState(tenantId);
  const token = crypto.randomBytes(16).toString('hex');
  let locked = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    const state = await MetaSyncState.findOneAndUpdate({ tenantId, $or: [{ importUntil: { $exists: false } }, { importUntil: { $lt: new Date() } }] }, { $set: { importToken: token, importUntil: new Date(Date.now() + 120000) } });
    if (state) { locked = true; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!locked) throw new MetaSyncBusy('Another Meta submission is being imported; recovery will retry.');
  try { return await work(); }
  finally { await MetaSyncState.updateOne({ tenantId, importToken: token }, { $unset: { importUntil: '', importToken: '' } }); }
}
/** Read all pages using fixed Graph paths; never follow a supplied paging URL. */
export async function* graphPages(get: (path: string, token: string, params?: Record<string, string>) => Promise<any>, path: string, token: string, params: Record<string, string>) {
  const seen = new Set<string>();
  let after: string | undefined;
  for (let page = 0; page < 1000; page++) {
    const result = await get(path, token, { ...params, ...(after ? { after } : {}) });
    if (!Array.isArray(result.data)) throw new Error('Meta returned an invalid list response.');
    yield result.data;
    if (!result.paging?.next) return;
    const cursor = result.paging?.cursors?.after;
    if (typeof cursor !== 'string' || !cursor || seen.has(cursor)) throw new Error('Meta pagination did not advance; sync will retry.');
    seen.add(cursor); after = cursor;
  }
  throw new Error('Meta pagination limit reached; checkpoint was not advanced.');
}
async function checkWebhook(tenantId: string, config: any, get: any) {
  const now = new Date();
  const state = await MetaSyncState.findOne({ tenantId }).lean();
  if (state?.webhookCheckedAt && now.getTime() - state.webhookCheckedAt.getTime() < 3600000) return;
  const set: any = { webhookCheckedAt: now };
  try {
    if (!config.appId || !config.appSecret) throw new Error('App ID and App Secret are needed to verify webhook setup. Recovery sync remains active.');
    const auth = await get('oauth/access_token', '', { client_id: config.appId, client_secret: config.appSecret, grant_type: 'client_credentials' });
    if (!auth.access_token) throw new Error('Could not verify the Meta app.');
    const subscriptions = await get(config.appId + '/subscriptions', auth.access_token);
    const callback = (process.env.API_PUBLIC_URL || 'https://platform.codebegun.com').replace(/\/$/, '') + '/api/v1/meta-leads/webhook';
    const page = subscriptions.data?.find((s: any) => s.object === 'page' && s.callback_url === callback && s.fields?.some((f: any) => (typeof f === 'string' ? f : f.name) === 'leadgen'));
    let subscribed = false;
    for await (const apps of graphPages(get, config.pageId + '/subscribed_apps', config.pageAccessToken, { fields: 'id,subscribed_fields', limit: '100' })) {
      subscribed ||= apps.some((a: any) => String(a.id) === String(config.appId) && a.subscribed_fields?.includes('leadgen'));
    }
    set.webhookStatus = page && subscribed ? 'verified' : 'needs_setup';
    set.webhookError = page && subscribed ? '' : 'Meta leadgen webhook or Page subscription is missing. Use Configure > Set up webhook.';
    const debug = await get('debug_token', auth.access_token, { input_token: config.pageAccessToken });
    if (debug.data?.is_valid === false) throw new Error('Meta Page token is invalid or expired. Reconnect Meta.');
    set.tokenExpiresAt = debug.data?.expires_at > 0 ? new Date(debug.data.expires_at * 1000) : null;
  } catch (e: any) { set.webhookStatus = 'needs_attention'; set.webhookError = e.message; }
  await MetaSyncState.updateOne({ tenantId }, { $set: set });
}
export async function recoverMetaLeads(tenantId: string) {
  await ensureState(tenantId);
  const token = crypto.randomBytes(16).toString('hex');
  const startedAt = new Date();
  const state: any = await MetaSyncState.findOneAndUpdate({ tenantId, $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lt: startedAt } }] }, { $set: { leaseToken: token, leaseUntil: new Date(Date.now() + 900000), status: 'syncing', lastAttemptAt: startedAt } }, { new: true });
  if (!state) throw new MetaSyncBusy('Meta sync is already running.');
  const counts = { created: 0, updated: 0, skipped: 0 };
  try {
    const config = (await getDecryptedTokens(tenantId))?.metaAds;
    if (!config?.pageAccessToken || !config.pageId) throw new Error('Save a valid Meta Page token and Page ID in Configure.');
    const { graphGet, createOrUpdateLeadFromData } = await import('../controllers/metaLeadAdsController');
    const key = JSON.stringify([config.pageId, [...(config.formIds || [])].sort()]);
    const since = state.connectionKey === key && state.checkpoint ? new Date(state.checkpoint.getTime() - 10 * 60000) : new Date(Date.now() - 30 * 86400000);
    const renew = async () => {
      const result = await MetaSyncState.updateOne({ tenantId, leaseToken: token }, { $set: { leaseUntil: new Date(Date.now() + 900000) } });
      if (!result.matchedCount) throw new MetaSyncBusy('Meta sync ownership changed; checkpoint was not advanced.');
    };
    await checkWebhook(tenantId, config, graphGet);
    const foundForms = new Set<string>();
    for await (const forms of graphPages(graphGet, config.pageId + '/leadgen_forms', config.pageAccessToken, { fields: 'id,name', limit: '100' })) {
      for (const form of forms) {
        if (config.formIds?.length && !config.formIds.includes(String(form.id))) continue;
        foundForms.add(String(form.id));
        await renew();
        for await (const leads of graphPages(graphGet, form.id + '/leads', config.pageAccessToken, { fields: 'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id', limit: '100', since: String(Math.floor(since.getTime() / 1000)) })) {
          for (const lead of leads) {
            if (lead.created_time && new Date(lead.created_time) < since) continue;
            await renew();
            const result = await createOrUpdateLeadFromData(lead, form.id, tenantId);
            counts[result]++;
          }
        }
      }
    }
    if (config.formIds?.some(id => !foundForms.has(String(id)))) throw new Error('A configured Meta form was not found on this Page. Review your form IDs.');
    await MetaSyncState.updateOne({ tenantId, leaseToken: token }, { $set: { ...counts, connectionKey: key, checkpoint: startedAt, lastSuccessAt: new Date(), lastError: '', status: 'healthy' } });
    return { success: true, ...counts, message: 'Sync complete: ' + counts.created + ' new leads, ' + counts.updated + ' new submissions on existing leads, ' + counts.skipped + ' already imported or without a valid phone.' };
  } catch (e: any) {
    await MetaSyncState.updateOne({ tenantId, leaseToken: token }, { $set: { status: 'needs_attention', lastError: e.message } });
    throw e;
  } finally {
    await MetaSyncState.updateOne({ tenantId, leaseToken: token }, { $unset: { leaseUntil: '', leaseToken: '' } });
  }
}
export async function syncConnectedMetaSources() {
  const configs = await LeadSourceConfig.find({ 'metaAds.isConnected': true }).select('tenantId').lean();
  for (const config of configs) {
    try { await recoverMetaLeads(String(config.tenantId)); }
    catch (e: any) { if (!(e instanceof MetaSyncBusy)) console.error('[META-RECOVERY]', String(config.tenantId), e.message); }
  }
}
