import { recordReEnquiry } from '../services/leadReEnquiryService';
import { waitsForOutpero } from '../services/outperoPolicyService';
import { recoverMetaLeads, MetaSyncBusy, withMetaImportLock } from '../services/metaRecoveryService';
import MetaSyncState from '../models/MetaSyncState';
import { Request, Response } from 'express';
import * as settings from '../services/settingsService';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import User from '../models/User';
import mongoose from 'mongoose';
import https from 'https';
import crypto from 'crypto';
import { getDecryptedTokens } from './leadSourceConfigController';
import LeadSourceConfig from '../models/LeadSourceConfig';
import { scoreAndAssignLead } from '../services/leadScoringService';
import { enqueueAICall } from '../services/aiCallQueueService';
import AICallConfig from '../models/AICallConfig';
import { AuthenticatedRequest } from '../types';
import { reviveIfArchived } from '../services/leadArchiveService';

// ===================== DEBUG LOGGER =====================

const DEBUG = true; // Set to false in production to reduce logs

function debugLog(category: string, message: string, data?: any) {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  const prefix = `[META-LEAD-DEBUG][${timestamp}][${category}]`;
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

function errorLog(category: string, message: string, error?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[META-LEAD-ERROR][${timestamp}][${category}]`;
  console.error(`${prefix} ${message}`);
  if (error) {
    console.error(`${prefix} Error details:`, error.message || error);
    if (error.stack) {
      console.error(`${prefix} Stack trace:`, error.stack);
    }
  }
}

// ===================== PHONE NORMALIZATION =====================

/**
 * Normalize a phone number coming from Meta lead forms.
 * Only strips the Indian country code (91 / +91) when doing so still leaves a
 * full-length local number. A bare `.replace(/^91/, '')` would corrupt valid
 * 10-digit mobiles that legitimately start with "91" (e.g. 9180123456 -> 80123456).
 */
function normalizeIndianPhone(raw: string): string {
  let digits = (raw || '').replace(/[^0-9]/g, '');
  // +91XXXXXXXXXX or 91XXXXXXXXXX (12 digits) -> drop country code
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 13 && digits.startsWith('091')) {
    digits = digits.slice(3);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // leading trunk-zero: 0XXXXXXXXXX -> XXXXXXXXXX
    digits = digits.slice(1);
  }
  return digits;
}

// ===================== TYPES =====================

interface MetaLeadgenPayload {
  object: string;
  entry: Array<{
    id: string; // Page ID
    time: number;
    changes: Array<{
      value: {
        form_id: string;
        leadgen_id: string;
        created_time: number;
        page_id: string;
        adgroup_id?: string;
        ad_id?: string;
        campaign_id?: string;
      };
      field: string; // 'leadgen'
    }>;
  }>;
}

interface MetaLeadData {
  id: string;
  created_time: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  form_name?: string;
}

// ===================== HELPER: Fetch Lead Data from Meta Graph API =====================

function fetchLeadFromMeta(leadgenId: string, accessToken: string): Promise<MetaLeadData> {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`;
    const maskedUrl = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=***MASKED***`;
    
    debugLog('FETCH', `Making request to Meta Graph API: ${maskedUrl}`);
    debugLog('FETCH', `Token length: ${accessToken.length}, First 10 chars: ${accessToken.substring(0, 10)}...`);

    const request = https.get(url, (resp) => {
      debugLog('FETCH', `Response status code: ${resp.statusCode}`);
      debugLog('FETCH', `Response headers:`, resp.headers);
      
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        debugLog('FETCH', `Raw response from Meta (length: ${data.length}):`, data);
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            errorLog('FETCH', `Meta API returned error`, parsed.error);
            reject(new Error(`Meta API Error: ${parsed.error.message}`));
          } else {
            debugLog('FETCH', `Successfully parsed Meta response`);
            resolve(parsed);
          }
        } catch (e: any) {
          errorLog('FETCH', `Failed to parse Meta response`, e);
          reject(new Error(`Failed to parse Meta response: ${data}`));
        }
      });
    }).on('error', (err) => {
      errorLog('FETCH', `HTTPS request error`, err);
      reject(err);
    });
  });
}

// ===================== HELPER: Extract field values from Meta lead data =====================

function extractFieldValue(fieldData: MetaLeadData['field_data'], fieldName: string): string | undefined {
  // Meta uses various field names, try common variations
  const variations: Record<string, string[]> = {
    name: ['full_name', 'name', 'first_name'],
    firstName: ['first_name', 'name'],
    lastName: ['last_name', 'surname'],
    email: ['email', 'email_address', 'work_email'],
    phone: ['phone_number', 'phone', 'mobile_number', 'mobile', 'contact_number'],
    city: ['city', 'location'],
    course: ['course', 'course_interested', 'interested_course', 'program'],
  };

  const namesToSearch = variations[fieldName] || [fieldName];
  
  debugLog('EXTRACT', `Looking for field '${fieldName}', checking: ${namesToSearch.join(', ')}`);

  for (const name of namesToSearch) {
    const field = fieldData.find(f => typeof f?.name === 'string' && f.name.toLowerCase() === name.toLowerCase());
    if (field && Array.isArray(field.values) && field.values.length > 0) {
      debugLog('EXTRACT', `Found '${fieldName}' as '${name}': ${field.values[0]}`);
      return String(field.values[0] ?? '');
    }
  }
  
  debugLog('EXTRACT', `Field '${fieldName}' not found in data`);
  return undefined;
}

// ===================== WEBHOOK VERIFICATION (GET) =====================

export const verifyMetaLeadWebhook = async (req: Request, res: Response) => {
  debugLog('VERIFY', '========== WEBHOOK VERIFICATION REQUEST ==========');
  debugLog('VERIFY', `Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  debugLog('VERIFY', `Query params:`, req.query);
  debugLog('VERIFY', `Headers:`, req.headers);
  
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.META_LEAD_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || 'codebegun_whatsapp_verify';

    debugLog('VERIFY', `Mode: ${mode}`);
    debugLog('VERIFY', `Token received: ${token}`);
    debugLog('VERIFY', `Expected token: ${VERIFY_TOKEN}`);
    debugLog('VERIFY', `Challenge: ${challenge}`);
    debugLog('VERIFY', `Token match: ${token === VERIFY_TOKEN}`);

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      debugLog('VERIFY', '✅ Verification SUCCESS - returning challenge');
      console.log('✅ Meta Lead Ads webhook verified');
      res.status(200).send(challenge);
    } else {
      errorLog('VERIFY', `❌ Verification FAILED - mode=${mode}, tokenMatch=${token === VERIFY_TOKEN}`);
      // The token is a shared secret with Meta. The line above already reports whether it
      // matched, which is the whole diagnostic value; printing the value itself puts a
      // credential in the log file.
      console.log('❌ Meta Lead Ads verification failed:', { mode });
      res.status(403).json({ error: 'Verification failed' });
    }
  } catch (error: any) {
    errorLog('VERIFY', '❌ Verification exception', error);
    console.error('❌ Meta Lead webhook verify error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===================== WEBHOOK HANDLER (POST) =====================

export const handleMetaLeadWebhook = async (req: Request, res: Response) => {
  debugLog('WEBHOOK', '========== WEBHOOK POST REQUEST RECEIVED ==========');
  debugLog('WEBHOOK', `Timestamp: ${new Date().toISOString()}`);
  debugLog('WEBHOOK', `Request IP: ${req.ip || req.connection?.remoteAddress}`);
  debugLog('WEBHOOK', `User-Agent: ${req.headers['user-agent']}`);
  debugLog('WEBHOOK', `Content-Type: ${req.headers['content-type']}`);
  debugLog('WEBHOOK', `All Headers:`, req.headers);
  debugLog('WEBHOOK', `Raw Body Type: ${typeof req.body}`);
  debugLog('WEBHOOK', `Raw Body:`, req.body);
  
  try {
    // HMAC signature verification using App Secret
    const appSecret = process.env.META_APP_SECRET;
    if (appSecret) {
      const signature = req.headers['x-hub-signature-256'] as string;
      if (signature) {
        const rawBody = JSON.stringify(req.body);
        const expectedSig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
        if (signature !== expectedSig) {
          errorLog('WEBHOOK', `❌ Signature mismatch — possible fake event. Got: ${signature.substring(0, 20)}...`);
          return res.status(200).send('EVENT_RECEIVED'); // still 200 to avoid Meta retries
        }
        debugLog('WEBHOOK', '✅ HMAC signature verified');
      }
    }

    const payload: MetaLeadgenPayload = req.body;

    console.log('📋 Meta Lead Ads webhook received:', JSON.stringify(payload, null, 2));

    // Always respond 200 quickly
    debugLog('WEBHOOK', 'Sending 200 OK response to Meta');
    res.status(200).send('EVENT_RECEIVED');

    // Process asynchronously
    debugLog('WEBHOOK', 'Starting async processing of payload');
    processMetaLeadPayload(payload).catch(err => {
      errorLog('WEBHOOK', '❌ Meta Lead processing error in async handler', err);
      console.error('❌ Meta Lead processing error:', err);
    });
  } catch (error: any) {
    errorLog('WEBHOOK', '❌ Meta Lead webhook error in main handler', error);
    console.error('❌ Meta Lead webhook error:', error);
    res.status(200).send('EVENT_RECEIVED');
  }
};

// ===================== PROCESS LEAD PAYLOAD =====================

async function processMetaLeadPayload(payload: MetaLeadgenPayload) {
  debugLog('PROCESS', '========== PROCESSING PAYLOAD ==========');
  debugLog('PROCESS', `Payload object type: ${payload.object}`);
  debugLog('PROCESS', `Number of entries: ${payload.entry?.length || 0}`);
  
  if (payload.object !== 'page') {
    debugLog('PROCESS', `⚠️ Ignoring non-page event: ${payload.object}`);
    console.log('⚠️ Ignoring non-page event:', payload.object);
    return;
  }

  for (let entryIndex = 0; entryIndex < payload.entry.length; entryIndex++) {
    const entry = payload.entry[entryIndex];
    debugLog('PROCESS', `Processing entry ${entryIndex + 1}/${payload.entry.length}`);
    debugLog('PROCESS', `Entry ID (Page ID): ${entry.id}`);
    debugLog('PROCESS', `Entry time: ${entry.time}`);
    debugLog('PROCESS', `Number of changes: ${entry.changes?.length || 0}`);
    
    for (let changeIndex = 0; changeIndex < entry.changes.length; changeIndex++) {
      const change = entry.changes[changeIndex];
      debugLog('PROCESS', `Processing change ${changeIndex + 1}/${entry.changes.length}`);
      debugLog('PROCESS', `Change field: ${change.field}`);
      debugLog('PROCESS', `Change value:`, change.value);
      
      if (change.field !== 'leadgen') {
        debugLog('PROCESS', `⚠️ Ignoring non-leadgen field: ${change.field}`);
        console.log('⚠️ Ignoring non-leadgen field:', change.field);
        continue;
      }

      const { leadgen_id, form_id, ad_id, campaign_id, page_id } = change.value;

      debugLog('PROCESS', '========== LEAD DETAILS ==========');
      debugLog('PROCESS', `leadgen_id: ${leadgen_id}`);
      debugLog('PROCESS', `form_id: ${form_id}`);
      debugLog('PROCESS', `ad_id: ${ad_id}`);
      debugLog('PROCESS', `campaign_id: ${campaign_id}`);
      debugLog('PROCESS', `page_id: ${page_id}`);

      console.log('🔄 Processing Meta lead:', { leadgen_id, form_id, ad_id, campaign_id });

      try {
        debugLog('PROCESS', `Calling fetchAndCreateLead for leadgen_id: ${leadgen_id}`);
        await fetchAndCreateLead(leadgen_id, {
          formId: form_id,
          adId: ad_id,
          campaignId: campaign_id,
          pageId: entry.id,
        });
        debugLog('PROCESS', `✅ Successfully processed lead ${leadgen_id}`);
      } catch (err: any) {
        errorLog('PROCESS', `❌ Failed to process lead ${leadgen_id}`, err);
        console.error(`❌ Failed to process lead ${leadgen_id}:`, err);
      }
    }
  }
  
  debugLog('PROCESS', '========== PAYLOAD PROCESSING COMPLETE ==========');
}

// ===================== FETCH FROM META & CREATE LEAD =====================

async function fetchAndCreateLead(
  leadgenId: string,
  meta: { formId?: string; adId?: string; campaignId?: string; pageId?: string }
) {
  debugLog('CREATE', '========== FETCH AND CREATE LEAD ==========');
  debugLog('CREATE', `leadgenId: ${leadgenId}`);
  debugLog('CREATE', `meta:`, meta);

  // ── Multi-tenant: find which tenant owns this pageId or formId ──────────────
  let accessToken: string | undefined;
  let tenantId: string | undefined;

  if (meta.pageId) {
    // Search DB for a tenant whose Meta Ads pageId matches
    const tenantConfig = await LeadSourceConfig.findOne({
      'metaAds.config.pageId': meta.pageId,
      'metaAds.isConnected': true,
    });
    if (tenantConfig) {
      const tokens = await getDecryptedTokens(tenantConfig.tenantId.toString());
      // Validate decrypted token looks like a real Facebook token (starts with EAA)
      const dbToken = tokens?.metaAds.pageAccessToken;
      if (dbToken && dbToken.startsWith('EAA')) {
        accessToken = dbToken;
        tenantId = tenantConfig.tenantId.toString();
        debugLog('CREATE', `✅ Resolved tenant from DB by pageId: ${tenantId}`);
      } else if (dbToken) {
        // Token decrypted but looks invalid — encryption key mismatch; fall through to env
        errorLog('CREATE', `⚠️ DB token for tenant ${tenantConfig.tenantId} does not start with EAA (len=${dbToken.length}) — possible encryption key mismatch, trying .env fallback`);
        tenantId = tenantConfig.tenantId.toString(); // keep tenantId even if token is bad
      }
    }
  }

  // Fallback: try matching by formId
  if (!tenantId && meta.formId) {
    const tenantConfig = await LeadSourceConfig.findOne({
      'metaAds.config.formIds': meta.formId,
      'metaAds.isConnected': true,
    });
    if (tenantConfig) {
      const tokens = await getDecryptedTokens(tenantConfig.tenantId.toString());
      const dbToken = tokens?.metaAds.pageAccessToken;
      if (dbToken && dbToken.startsWith('EAA')) {
        accessToken = dbToken;
        tenantId = tenantConfig.tenantId.toString();
        debugLog('CREATE', `✅ Resolved tenant from DB by formId: ${tenantId}`);
      } else if (dbToken) {
        errorLog('CREATE', `⚠️ DB token for tenant ${tenantConfig.tenantId} looks invalid — trying .env fallback`);
        tenantId = tenantConfig.tenantId.toString();
      }
    }
  }

  // .env fallback (legacy support, or when DB token has encryption key mismatch) — the platform
  // page token belongs to the platform owner, so it is never used for another institute's page.
  if (!accessToken && (!tenantId || settings.isPlatformOwner(tenantId))) {
    const envToken = process.env.PAGE_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
    if (envToken && envToken.startsWith('EAA')) {
      accessToken = envToken;
      debugLog('CREATE', `⚠️ Using .env PAGE_ACCESS_TOKEN fallback`);
    } else if (envToken) {
      accessToken = envToken; // use anyway, let Meta API reject if bad
      debugLog('CREATE', `⚠️ Using .env fallback (token may not start with EAA)`);
    }
  }
  if (!tenantId) {
    tenantId = process.env.DEFAULT_TENANT_ID;
    debugLog('CREATE', `⚠️ Using .env fallback for tenantId: ${tenantId || 'NOT SET'}`);
  }

  debugLog('CREATE', `Token available: ${!!accessToken}`);
  debugLog('CREATE', `Token length: ${accessToken?.length || 0}`);

  if (!accessToken) {
    errorLog('CREATE', '❌ No access token configured (DB or .env)');
    console.error('❌ No PAGE_ACCESS_TOKEN configured in DB or .env');
    return;
  }

  if (!tenantId) {
    errorLog('CREATE', '❌ Could not resolve tenantId from pageId or DEFAULT_TENANT_ID');
    console.error('❌ DEFAULT_TENANT_ID not configured in DB or .env');
    return;
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Fetch full lead data from Meta Graph API
  debugLog('CREATE', `📡 Fetching lead data from Meta for: ${leadgenId}`);
  console.log('📡 Fetching lead data from Meta for:', leadgenId);
  
  let leadData: MetaLeadData;
  try {
    leadData = await fetchLeadFromMeta(leadgenId, accessToken);
    debugLog('CREATE', '✅ Successfully fetched lead data from Meta');
    debugLog('CREATE', '📋 Meta lead data:', leadData);
    console.log('📋 Meta lead data:', JSON.stringify(leadData, null, 2));
  } catch (fetchError: any) {
    errorLog('CREATE', `Failed to fetch lead from Meta API`, fetchError);
    throw fetchError;
  }

  await createOrUpdateLeadFromData({ ...leadData, id: leadData.id || leadgenId }, meta.formId || leadData.form_id || '', tenantId);
}

// ===================== GRAPH API HELPER =====================

export function graphGet(path: string, accessToken: string, extraParams: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({ access_token: accessToken, ...extraParams });
    const url = `https://graph.facebook.com/v19.0/${path}?${params.toString()}`;
    const request = https.get(url, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(new Error(`Meta API: ${parsed.error.message} (code ${parsed.error.code})`));
          else resolve(parsed);
        } catch (e: any) {
          reject(new Error(`Invalid Meta response; recovery will retry.`));
        }
      });
    }).on('error', reject);
    request.setTimeout(30000, () => request.destroy(new Error('Meta API timed out. Recovery will retry.')));
  });
}

// ===================== SYNC LEADS FROM META PAGE =====================

export const syncMetaLeads = async (req: AuthenticatedRequest, res: Response) => {
  try { return res.json(await recoverMetaLeads(req.tenantId!)); }
  catch (e: any) { return res.status(e instanceof MetaSyncBusy ? 409 : 502).json({ success: false, message: e.message || 'Meta sync failed.' }); }
};

// ===================== SETUP META APP WEBHOOK SUBSCRIPTION =====================

export const setupMetaWebhook = async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;

  try {
    const tokens = await getDecryptedTokens(tenantId);
    const appId = tokens?.metaAds?.appId;
    const appSecret = tokens?.metaAds?.appSecret;
    const pageId = tokens?.metaAds?.pageId;
    const pageToken = tokens?.metaAds?.pageAccessToken;

    if (!appId || !appSecret || appSecret.length < 10) {
      return res.status(400).json({ success: false, message: 'App ID and App Secret are required. Save them in Lead Sources → Meta Lead Ads first.' });
    }

    if (!pageId || !pageToken) return res.status(400).json({ success: false, message: 'Page ID and Page token are required for webhook setup.' });
    // Step 1: Generate App Access Token
    const appTokenResp = await graphGet('oauth/access_token', '', {
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'client_credentials',
    });

    const appAccessToken: string = appTokenResp.access_token;
    if (!appAccessToken) {
      return res.status(400).json({ success: false, message: 'Failed to get app access token. Check your App ID and App Secret.' });
    }

    // Step 2: Check current webhook subscriptions
    const subsResp = await graphGet(`${appId}/subscriptions`, appAccessToken);
    const existingSubs: any[] = subsResp.data || [];
    const pageField = existingSubs.find(s => s.object === 'page');

    const webhookUrl = (process.env.API_PUBLIC_URL || 'https://platform.codebegun.com').replace(/\/$/, '') + '/api/v1/meta-leads/webhook';
    const verifyToken = process.env.META_LEAD_VERIFY_TOKEN || 'codebegun_verify';

    // Step 3: Subscribe / re-subscribe
    const params = new URLSearchParams({
      object: 'page',
      callback_url: webhookUrl,
      fields: 'leadgen',
      verify_token: verifyToken,
      access_token: appAccessToken,
    });
    const subResult = await new Promise<any>((resolve, reject) => {
      const https = require('https');
      const options = {
        hostname: 'graph.facebook.com',
        path: `/v19.0/${appId}/subscriptions`,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(params.toString()) },
      };
      const reqHttp = https.request(options, (resp: any) => {
        let data = '';
        resp.on('data', (c: string) => { data += c; });
        resp.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
      });
      reqHttp.setTimeout(30000, () => reqHttp.destroy(new Error('Meta subscription request timed out.')));
      reqHttp.on('error', reject);
      reqHttp.write(params.toString());
      reqHttp.end();
    });

    if (subResult.error || subResult.success !== true) {
      return res.json({ success: false, message: `Webhook subscription failed: ${subResult.error?.message || 'Meta did not confirm the subscription'}` });
    }

    // Step 4: Also subscribe the page to the app (ensure leadgen is in subscribed fields)
    if (pageId && pageToken) {
      try {
        const pageSubParams = new URLSearchParams({
          subscribed_fields: 'leadgen',
          access_token: pageToken,
        });
        const pageResult = await new Promise<any>((resolve, reject) => {
          const https = require('https');
          const options = {
            hostname: 'graph.facebook.com',
            path: `/v19.0/${pageId}/subscribed_apps`,
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(pageSubParams.toString()) },
          };
          const reqHttp = https.request(options, (resp: any) => {
            let data = '';
            resp.on('data', (c: string) => { data += c; });
            resp.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
          });
          reqHttp.setTimeout(30000, () => reqHttp.destroy(new Error('Meta subscription request timed out.')));
      reqHttp.on('error', reject);
          reqHttp.write(pageSubParams.toString());
          reqHttp.end();
        });
        if (pageResult.error || pageResult.success !== true) throw new Error(pageResult.error?.message || 'Meta did not confirm the Page subscription.');
      } catch (e: any) {
        await MetaSyncState.updateOne({ tenantId }, { $set: { webhookStatus: 'needs_setup', webhookError: e.message, webhookCheckedAt: new Date() } }, { upsert: true });
        return res.status(502).json({ success: false, message: 'Page subscription failed: ' + e.message });
      }
    }

    await MetaSyncState.updateOne({ tenantId }, { $set: { webhookStatus: 'verified', webhookError: '', webhookCheckedAt: new Date() } }, { upsert: true });
    const wasAlreadySet = pageField?.callback_url === webhookUrl;
    return res.json({
      success: true,
      message: wasAlreadySet
        ? `Webhook was already pointing to our URL. Page subscription confirmed. Meta leads should now flow automatically.`
        : `Webhook subscription created. Meta leads will now flow automatically. Previous URL was: ${pageField?.callback_url || 'none'}.`,
      previousUrl: pageField?.callback_url || null,
      newUrl: webhookUrl,
    });

  } catch (error: any) {
    console.error('[META-WEBHOOK-SETUP] Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Webhook setup failed' });
  }
};

async function getTenantAdminId(tenantObjectId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId | undefined> {
  const admin = await User.findOne({
    tenantId: tenantObjectId,
    role: { $in: ['TENANT_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'MANAGER'] },
  }).select('_id').lean();
  return admin?._id as mongoose.Types.ObjectId | undefined;
}

async function importMetaSubmission(
  leadData: MetaLeadData,
  formId: string,
  tenantId: string
): Promise<'created' | 'updated' | 'skipped'> {
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
  if (!leadData.id || !Array.isArray(leadData.field_data)) throw new Error('Meta submission is missing an ID or field data.');
  const imported = await Lead.exists({ tenantId: tenantObjectId, metaSubmissionIds: String(leadData.id) });
  if (imported) return 'skipped';
  const phone = extractFieldValue(leadData.field_data, 'phone') || '';
  const cleanPhone = normalizeIndianPhone(phone);

  if (!cleanPhone || cleanPhone.length < 7) return 'skipped';

  const existing = await Lead.findOne({
    tenantId: tenantObjectId,
    phone: { $regex: cleanPhone.slice(-10) + '$' },
  });

  if (existing) {
    if (existing.archivedAt && (!leadData.created_time || new Date(leadData.created_time) <= existing.archivedAt)) {
      await Lead.updateOne({ _id: existing._id }, { $addToSet: { metaSubmissionIds: String(leadData.id) } });
      return 'skipped';
    }
    await reviveIfArchived(existing._id, 'new Meta lead form');
    const marked = await Lead.updateOne(
      { _id: existing._id, metaSubmissionIds: { $ne: String(leadData.id) } },
      {
        $addToSet: { metaSubmissionIds: String(leadData.id) },
        $set: {
          'sourceDetails.formId': formId,
          'sourceDetails.campaignName': leadData.campaign_name || existing.get('sourceDetails.campaignName'),
        },
      }
    );
    // Only the call that actually recorded this submission reports it, so a re-delivery cannot notify twice.
    if (marked.modifiedCount) {
      await recordReEnquiry(tenantId, existing._id, {
        channel: 'meta_form', formId, adId: leadData.ad_id, adName: leadData.ad_name, campaignName: leadData.campaign_name,
        at: leadData.created_time ? new Date(leadData.created_time) : undefined,
      });
    }
    return 'updated';
  }

  const name = extractFieldValue(leadData.field_data, 'name')
    || [extractFieldValue(leadData.field_data, 'firstName'), extractFieldValue(leadData.field_data, 'lastName')].filter(Boolean).join(' ')
    || 'Unknown';
  const email = extractFieldValue(leadData.field_data, 'email') || '';
  const city = extractFieldValue(leadData.field_data, 'city') || '';
  const course = extractFieldValue(leadData.field_data, 'course') || '';

  let defaultStage = await LeadStage.findOne({
    tenantId: tenantObjectId,
    $or: [{ name: /new/i }, { order: 1 }],
  }).sort({ order: 1 });
  if (!defaultStage) {
    defaultStage = await LeadStage.findOne({ tenantId: tenantObjectId }).sort({ order: 1 });
  }

  const adminId = await getTenantAdminId(tenantObjectId);

  const newLead = new Lead({
    tenantId: tenantObjectId,
    name,
    phone: cleanPhone,
    email,
    source: 'meta_form',
    priority: 'warm',
    stageId: defaultStage?._id,
    location: city,
    courseInterest: course ? [course] : [],
    createdBy: adminId,
    metaSubmissionIds: [String(leadData.id)],
    sourceDetails: {
      platform: 'meta',
      formId,
      adId: leadData.ad_id,
      campaignName: leadData.campaign_name,
      adSetName: leadData.adset_name,
      adName: leadData.ad_name,
    },
    utmParams: { source: 'facebook', medium: 'paid', campaign: leadData.campaign_name },
    activities: [{
      type: 'created',
      description: `Lead synced from Meta Lead Form (${leadData.form_name || formId})`,
      createdBy: adminId,
      createdAt: new Date(leadData.created_time || Date.now()),
      metadata: { metaSubmissionId: String(leadData.id) },
    }],
    customFields: leadData.field_data.reduce((acc: Record<string, string>, f) => {
      if (typeof f?.name === 'string' && f.name && !f.name.includes('.') && !f.name.startsWith('$') && !['__proto__', 'constructor', 'prototype'].includes(f.name) && Array.isArray(f.values)) {
        acc[f.name] = f.values.map(value => String(value ?? '')).join(', ');
      }
      return acc;
    }, {}),
    createdAt: leadData.created_time ? new Date(leadData.created_time) : new Date(),
  });

  await newLead.save();

  scoreAndAssignLead(newLead, new mongoose.Types.ObjectId(tenantId)).catch(err =>
    console.error('[META-SYNC] Auto-score failed:', err)
  );

  AICallConfig.findOne({ tenantId: tenantObjectId, enabled: true })
    .then(cfg => {
      if (cfg && !waitsForOutpero(newLead, tenantId)) {
        Lead.findByIdAndUpdate(newLead._id, { aiCallStatus: 'pending' }).exec().catch(() => {});
        enqueueAICall(newLead._id.toString(), tenantId, 1).catch(() => {});
      }
    })
    .catch(() => {});

  return 'created';
}

export async function createOrUpdateLeadFromData(leadData: MetaLeadData, formId: string, tenantId: string): Promise<'created' | 'updated' | 'skipped'> {
  return withMetaImportLock(tenantId, () => importMetaSubmission(leadData, formId, tenantId));
}
