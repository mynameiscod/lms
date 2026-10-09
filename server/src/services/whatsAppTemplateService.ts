import mongoose from 'mongoose';
import WhatsAppTemplate, { IWhatsAppTemplate, IWaButton, WaTemplateCategory } from '../models/WhatsAppTemplate';
import WhatsAppBroadcast from '../models/WhatsAppBroadcast';
import LeadSourceConfig from '../models/LeadSourceConfig';
import User from '../models/User';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import WhatsAppMessageLog from '../models/WhatsAppMessageLog';
import * as settings from './settingsService';
import { getWhatsAppCredentialCandidates, waPost, normalizeTo } from './assessmentOtpService';
import { recordSend } from './whatsAppDeliveryService';
import { recordOutbound, renderTemplateBody } from './whatsAppChatStore';
import { WA_TEMPLATE_PURPOSES, WaTemplatePurpose, getPurpose } from '../config/whatsappTemplatePurposes';
import { templateShape, buildSendComponents, varIndexes } from './whatsAppTemplateShape';

export { templateShape };

/**
 * WhatsApp template management — authoring templates in the LMS instead of Meta Business
 * Manager, and wiring them to the places in the system that send them.
 *
 * Talks to the WhatsApp Business Management API on the tenant's WhatsApp Business Account
 * (WABA). The access token must carry `whatsapp_business_management` as well as
 * `whatsapp_business_messaging`; a system-user token normally has both.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export class WaTemplateError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// ── Connection ────────────────────────────────────────────────────────────────

type Conn = { wabaId: string; accessToken: string };

/** The WABA id: Platform Settings (tenant → platform → env), then the CRM WhatsApp connection. */
export async function getWabaId(tenantId: string): Promise<{ wabaId: string; source: 'settings' | 'lead_source' | 'unset' }> {
  // The platform WABA only for the platform owner — another institute must never author templates in CodeBegun's account.
  const fromSettings = settings.getCredential('WHATSAPP_BUSINESS_ACCOUNT_ID', tenantId).trim();
  if (fromSettings) return { wabaId: fromSettings, source: 'settings' };
  try {
    const cfg: any = await LeadSourceConfig.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
    const id = String(cfg?.whatsApp?.config?.businessAccountId || '').trim();
    if (id) return { wabaId: id, source: 'lead_source' };
  } catch { /* fall through */ }
  return { wabaId: '', source: 'unset' };
}

async function getConnections(tenantId: string): Promise<Conn[]> {
  const { wabaId } = await getWabaId(tenantId);
  if (!wabaId) {
    throw new WaTemplateError('WhatsApp Business Account ID is not set. Enter it under "Connection" on this page (Meta Business Manager → WhatsApp Accounts → Account ID).');
  }
  const creds = await getWhatsAppCredentialCandidates(tenantId);
  if (!creds.length) throw new WaTemplateError('No WhatsApp access token is configured (Platform Settings → Messaging, or CRM → Lead Sources → WhatsApp).');
  return creds.map((c) => ({ wabaId, accessToken: c.accessToken }));
}

async function graph(method: string, url: string, token: string, body?: any): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok || json?.error) {
    const e = json?.error || {};
    // error_user_msg is Meta's human explanation for template rejections at submit time.
    const msg = e.error_user_msg || e.message || `Meta returned HTTP ${res.status}`;
    const err = new WaTemplateError(e.error_user_title ? `${e.error_user_title}: ${msg}` : msg, 400);
    (err as any).metaCode = e.code;
    throw err;
  }
  return json;
}

/** Run `fn` with each credential until one works — a dead CRM token must not block the platform one. */
async function withConn<T>(tenantId: string, fn: (c: Conn) => Promise<T>): Promise<T> {
  const conns = await getConnections(tenantId);
  let last: any;
  for (const c of conns) {
    try { return await fn(c); } catch (e: any) {
      last = e;
      // Only an auth/permission failure is worth retrying with another token.
      const code = e?.metaCode;
      if (code !== 190 && code !== 10 && code !== 200 && code !== 100) throw e;
    }
  }
  if (last?.metaCode === 10 || last?.metaCode === 200) {
    throw new WaTemplateError(`${last.message} — the access token needs the "whatsapp_business_management" permission.`);
  }
  throw last;
}

export async function testConnection(tenantId: string) {
  return withConn(tenantId, async (c) => {
    const acct = await graph('GET', `${GRAPH}/${c.wabaId}?fields=id,name,currency,message_template_namespace`, c.accessToken);
    const tpls = await graph('GET', `${GRAPH}/${c.wabaId}/message_templates?fields=name&limit=1`, c.accessToken);
    return { ok: true, wabaId: c.wabaId, name: acct?.name || '', canManageTemplates: Array.isArray(tpls?.data) };
  });
}

// ── Shape & validation ────────────────────────────────────────────────────────

export interface TemplateInput {
  name: string;
  language: string;
  category: WaTemplateCategory;
  header?: { format: 'NONE' | 'TEXT' | 'IMAGE'; text?: string; imageUrl?: string };
  body?: string;
  bodyExamples?: string[];
  footer?: string;
  buttons?: IWaButton[];
  auth?: { securityRecommendation?: boolean; codeExpiryMinutes?: number };
}

export function validateInput(i: TemplateInput): string[] {
  const errs: string[] = [];
  if (!/^[a-z0-9_]{1,512}$/.test(i.name || '')) errs.push('Name: lowercase letters, numbers and underscores only (e.g. batch_start_reminder).');
  if (!i.language) errs.push('Language is required.');
  if (!['UTILITY', 'MARKETING', 'AUTHENTICATION'].includes(i.category)) errs.push('Category must be Utility, Marketing or Authentication.');
  if (i.category === 'AUTHENTICATION') {
    const m = i.auth?.codeExpiryMinutes;
    if (m !== undefined && m !== null && (m < 1 || m > 90)) errs.push('Code expiry must be between 1 and 90 minutes.');
    return errs;
  }

  const body = String(i.body || '');
  if (!body.trim()) errs.push('Body text is required.');
  if (body.length > 1024) errs.push(`Body is ${body.length} characters; the limit is 1024.`);
  const idx = varIndexes(body);
  const n = idx.length ? Math.max(...idx) : 0;
  for (let k = 1; k <= n; k++) if (!idx.includes(k)) errs.push(`Variables must be numbered in sequence — {{${k}}} is missing.`);
  if (/^\s*\{\{\s*\d+\s*\}\}/.test(body) || /\{\{\s*\d+\s*\}\}[\s.!?]*$/.test(body)) {
    errs.push('Meta rejects a body that starts or ends with a variable — add words before the first and after the last.');
  }
  const ex = i.bodyExamples || [];
  for (let k = 0; k < n; k++) if (!String(ex[k] || '').trim()) errs.push(`Give a sample value for {{${k + 1}}} — Meta reviews the template with it.`);

  const h = i.header || { format: 'NONE' };
  if (h.format === 'TEXT') {
    if (!String(h.text || '').trim()) errs.push('Header text is empty.');
    if ((h.text || '').length > 60) errs.push('Header text is limited to 60 characters.');
    if (/\{\{/.test(h.text || '')) errs.push('Header text cannot contain variables here — put them in the body.');
  }
  if (h.format === 'IMAGE' && !/^https:\/\//i.test(h.imageUrl || '')) {
    errs.push('Image header needs a public https image URL (JPEG or PNG, under 5 MB). It is the sample Meta reviews and the default image sent.');
  }
  if ((i.footer || '').length > 60) errs.push('Footer is limited to 60 characters.');
  if (/\{\{/.test(i.footer || '')) errs.push('Footer cannot contain variables.');

  const btns = i.buttons || [];
  if (btns.length > 10) errs.push('At most 10 buttons.');
  if (btns.filter((b) => b.type === 'URL').length > 2) errs.push('At most 2 URL buttons.');
  if (btns.filter((b) => b.type === 'PHONE_NUMBER').length > 1) errs.push('At most 1 phone button.');
  btns.forEach((b, k) => {
    const lbl = `Button ${k + 1}`;
    if (!String(b.text || '').trim()) errs.push(`${lbl}: label is required.`);
    if ((b.text || '').length > 25) errs.push(`${lbl}: label is limited to 25 characters.`);
    if (b.type === 'URL') {
      if (!/^https?:\/\//i.test(b.url || '')) errs.push(`${lbl}: URL must start with https://`);
      const vars = varIndexes(b.url || '');
      if (vars.length > 1 || (vars.length === 1 && (vars[0] !== 1 || !/\{\{\s*1\s*\}\}$/.test(b.url || '')))) {
        errs.push(`${lbl}: a dynamic URL may only end with {{1}}.`);
      }
      if (vars.length === 1 && !/^https?:\/\//i.test(b.urlExample || '')) errs.push(`${lbl}: give a full example URL for the dynamic part.`);
    }
    if (b.type === 'PHONE_NUMBER' && !/^\+?\d{8,15}$/.test((b.phoneNumber || '').replace(/[\s-]/g, ''))) {
      errs.push(`${lbl}: phone number with country code, e.g. +919876543210.`);
    }
  });
  return errs;
}

// ── Meta <-> local conversion ────────────────────────────────────────────────

async function uploadHeaderImage(c: Conn, imageUrl: string): Promise<string> {
  const img = await fetch(imageUrl);
  if (!img.ok) throw new WaTemplateError(`Could not download the header image (HTTP ${img.status}). Use a public https URL.`);
  const type = (img.headers.get('content-type') || '').split(';')[0].trim();
  if (!['image/jpeg', 'image/png', 'image/jpg'].includes(type)) throw new WaTemplateError(`Header image must be JPEG or PNG (got "${type || 'unknown'}").`);
  const buf = Buffer.from(await img.arrayBuffer());
  if (buf.length > 5 * 1024 * 1024) throw new WaTemplateError('Header image must be under 5 MB.');

  // Resumable Upload API — hangs off the Meta APP, not the WABA.
  let appId = settings.getStr('META_APP_ID', '').trim();
  if (!appId) appId = (await graph('GET', `${GRAPH}/app`, c.accessToken))?.id || '';
  if (!appId) throw new WaTemplateError('Could not determine the Meta App ID for the image upload. Set META_APP_ID in Platform Settings.');

  const session = await graph('POST',
    `${GRAPH}/${appId}/uploads?file_name=header.${type.endsWith('png') ? 'png' : 'jpg'}&file_length=${buf.length}&file_type=${encodeURIComponent(type === 'image/jpg' ? 'image/jpeg' : type)}`,
    c.accessToken);
  const res = await fetch(`${GRAPH}/${session.id}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${c.accessToken}`, file_offset: '0' },
    body: buf,
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok || !j?.h) throw new WaTemplateError(j?.error?.message || 'Meta did not accept the header image upload.');
  return j.h;
}

async function toMetaComponents(c: Conn, i: TemplateInput): Promise<any[]> {
  if (i.category === 'AUTHENTICATION') {
    const comps: any[] = [{ type: 'BODY', add_security_recommendation: i.auth?.securityRecommendation !== false }];
    if (i.auth?.codeExpiryMinutes) comps.push({ type: 'FOOTER', code_expiration_minutes: Number(i.auth.codeExpiryMinutes) });
    comps.push({ type: 'BUTTONS', buttons: [{ type: 'OTP', otp_type: 'COPY_CODE', text: 'Copy code' }] });
    return comps;
  }
  const comps: any[] = [];
  const h = i.header || { format: 'NONE' };
  if (h.format === 'TEXT') comps.push({ type: 'HEADER', format: 'TEXT', text: h.text });
  if (h.format === 'IMAGE') {
    const handle = await uploadHeaderImage(c, h.imageUrl!);
    comps.push({ type: 'HEADER', format: 'IMAGE', example: { header_handle: [handle] } });
  }
  const n = templateShape({ body: i.body || '', header: h as any, buttons: [], category: i.category }).bodyVarCount;
  const body: any = { type: 'BODY', text: i.body };
  if (n) body.example = { body_text: [(i.bodyExamples || []).slice(0, n)] };
  comps.push(body);
  if (i.footer?.trim()) comps.push({ type: 'FOOTER', text: i.footer.trim() });
  if (i.buttons?.length) {
    comps.push({
      type: 'BUTTONS',
      buttons: i.buttons.map((b) => {
        if (b.type === 'URL') {
          const dyn = /\{\{\s*1\s*\}\}/.test(b.url || '');
          return { type: 'URL', text: b.text, url: b.url, ...(dyn ? { example: [b.urlExample] } : {}) };
        }
        if (b.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: b.text, phone_number: (b.phoneNumber || '').replace(/[\s-]/g, '') };
        return { type: 'QUICK_REPLY', text: b.text };
      }),
    });
  }
  return comps;
}

function fromMeta(m: any): Partial<IWhatsAppTemplate> {
  const comps: any[] = m.components || [];
  const get = (t: string) => comps.find((x) => String(x.type).toUpperCase() === t);
  const hdr = get('HEADER');
  const body = get('BODY');
  const footer = get('FOOTER');
  const btns = get('BUTTONS');
  return {
    name: m.name,
    language: m.language,
    category: m.category,
    status: m.status,
    metaId: m.id,
    rejectedReason: m.rejected_reason && m.rejected_reason !== 'NONE' ? m.rejected_reason : undefined,
    qualityScore: m.quality_score?.score,
    header: hdr ? { format: String(hdr.format || 'TEXT').toUpperCase() as any, text: hdr.text } : { format: 'NONE' },
    body: body?.text || '',
    bodyExamples: body?.example?.body_text?.[0] || [],
    footer: footer?.text,
    buttons: (btns?.buttons || []).map((b: any) => ({
      type: String(b.type).toUpperCase(),
      text: b.text || '',
      url: b.url,
      urlExample: Array.isArray(b.example) ? b.example[0] : undefined,
      phoneNumber: b.phone_number,
    })),
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createTemplate(tenantId: string, userId: string, input: TemplateInput) {
  const errs = validateInput(input);
  if (errs.length) throw new WaTemplateError(errs.join(' '));
  const exists = await WhatsAppTemplate.findOne({ tenantId, name: input.name, language: input.language });
  if (exists && exists.status !== 'DELETED') throw new WaTemplateError(`A template "${input.name}" (${input.language}) already exists.`);

  const created = await withConn(tenantId, async (c) => {
    const components = await toMetaComponents(c, input);
    return graph('POST', `${GRAPH}/${c.wabaId}/message_templates`, c.accessToken, {
      name: input.name, language: input.language, category: input.category, components,
    });
  });

  const doc = await WhatsAppTemplate.findOneAndUpdate(
    { tenantId, name: input.name, language: input.language },
    {
      tenantId, name: input.name, language: input.language,
      category: (created.category || input.category),
      status: created.status || 'PENDING',
      metaId: created.id,
      rejectedReason: undefined,
      header: input.category === 'AUTHENTICATION' ? { format: 'NONE' } : (input.header || { format: 'NONE' }),
      body: input.category === 'AUTHENTICATION'
        ? `*{{1}}* is your verification code.${input.auth?.securityRecommendation !== false ? ' For your security, do not share this code.' : ''}`
        : input.body,
      bodyExamples: input.category === 'AUTHENTICATION' ? ['123456'] : (input.bodyExamples || []),
      footer: input.category === 'AUTHENTICATION'
        ? (input.auth?.codeExpiryMinutes ? `This code expires in ${input.auth.codeExpiryMinutes} minutes.` : undefined)
        : input.footer,
      buttons: input.category === 'AUTHENTICATION' ? [{ type: 'OTP', text: 'Copy code' }] : (input.buttons || []),
      auth: input.category === 'AUTHENTICATION' ? { securityRecommendation: input.auth?.securityRecommendation !== false, codeExpiryMinutes: input.auth?.codeExpiryMinutes } : undefined,
      source: 'lms', createdBy: userId, lastSyncedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc;
}

/** Edit an existing template. Meta re-reviews it; approved templates allow ~10 edits a month. */
export async function updateTemplate(tenantId: string, id: string, input: TemplateInput) {
  const doc = await WhatsAppTemplate.findOne({ _id: id, tenantId });
  if (!doc) throw new WaTemplateError('Template not found', 404);
  if (!doc.metaId) throw new WaTemplateError('This template is not on Meta yet — delete it and create it again.');
  const merged: TemplateInput = { ...input, name: doc.name, language: doc.language, category: input.category || doc.category };
  const errs = validateInput(merged);
  if (errs.length) throw new WaTemplateError(errs.join(' '));

  await withConn(tenantId, async (c) => {
    const components = await toMetaComponents(c, merged);
    // Category can only change while the template is not yet approved.
    const payload: any = { components };
    if (doc.status !== 'APPROVED') payload.category = merged.category;
    return graph('POST', `${GRAPH}/${doc.metaId}`, c.accessToken, payload);
  });

  if (merged.category !== 'AUTHENTICATION') {
    doc.header = (merged.header || { format: 'NONE' }) as any;
    doc.body = merged.body || '';
    doc.bodyExamples = merged.bodyExamples || [];
    doc.footer = merged.footer;
    doc.buttons = (merged.buttons || []) as any;
  }
  doc.category = merged.category;
  doc.status = 'PENDING';
  doc.rejectedReason = undefined;
  await doc.save();
  return doc;
}

export async function deleteTemplate(tenantId: string, id: string) {
  const doc = await WhatsAppTemplate.findOne({ _id: id, tenantId });
  if (!doc) throw new WaTemplateError('Template not found', 404);
  const usedBy = (await getUsage(tenantId)).filter((u) => u.assigned?.name === doc.name && u.assigned?.language === doc.language);
  if (usedBy.length) {
    throw new WaTemplateError(`In use by: ${usedBy.map((u) => u.label).join(', ')}. Assign a different template there first.`);
  }
  if (doc.metaId && doc.status !== 'DELETED') {
    try {
      await withConn(tenantId, (c) => graph('DELETE',
        `${GRAPH}/${c.wabaId}/message_templates?name=${encodeURIComponent(doc.name)}&hsm_id=${doc.metaId}`, c.accessToken));
    } catch (e: any) {
      // Already gone on Meta's side is fine — anything else is a real failure.
      if (!/not found|does not exist/i.test(e?.message || '')) throw e;
    }
  }
  await doc.deleteOne();
  return { ok: true };
}

const lastSync = new Map<string, number>();

/** Pull every template on the WABA into the local mirror. */
export async function syncTemplates(tenantId: string) {
  const all: any[] = await withConn(tenantId, async (c) => {
    /*
     * Meta caps the response SIZE, not just the count: with full components a page of 100 is
     * refused ("Please reduce the amount of data you're asking for", code 1) even for a dozen
     * templates. Start small and halve the page on that refusal instead of failing the sync.
     */
    const fields = 'id,name,language,status,category,components,rejected_reason,quality_score';
    const tooBig = (e: any) => e?.metaCode === 1 || /reduce the amount of data/i.test(e?.message || '');
    const out: any[] = [];
    let limit = 25;
    let after = '';
    let guard = 0;
    while (guard++ < 200) {
      let page: any;
      try {
        page = await graph('GET',
          `${GRAPH}/${c.wabaId}/message_templates?fields=${fields}&limit=${limit}${after ? `&after=${encodeURIComponent(after)}` : ''}`,
          c.accessToken);
      } catch (e: any) {
        if (tooBig(e) && limit > 1) { limit = Math.max(1, Math.floor(limit / 2)); continue; }
        throw e;
      }
      out.push(...(page.data || []));
      after = page.paging?.next ? (page.paging?.cursors?.after || '') : '';
      if (!after) break;
    }
    return out;
  });

  const seen = new Set<string>();
  let created = 0, updated = 0;
  for (const m of all) {
    seen.add(m.id);
    const f = fromMeta(m);
    const existing = await WhatsAppTemplate.findOne({ tenantId, name: f.name, language: f.language });
    if (existing) {
      // Keep the locally stored default header image — Meta only returns a CDN sample.
      const imageUrl = existing.header?.imageUrl;
      Object.assign(existing, f, { lastSyncedAt: new Date() });
      if (imageUrl && existing.header?.format === 'IMAGE') existing.header.imageUrl = imageUrl;
      await existing.save();
      updated++;
    } else {
      await WhatsAppTemplate.create({ ...f, tenantId, source: 'meta', lastSyncedAt: new Date() });
      created++;
    }
  }
  // Templates deleted in Business Manager.
  const gone = await WhatsAppTemplate.updateMany(
    { tenantId, metaId: { $exists: true, $nin: Array.from(seen) }, status: { $ne: 'DELETED' } },
    { $set: { status: 'DELETED' } },
  );
  lastSync.set(tenantId, Date.now());
  return { total: all.length, created, updated, markedDeleted: gone.modifiedCount || 0 };
}

export async function listTemplates(tenantId: string) {
  // Opportunistic refresh while anything awaits review — covers a webhook that isn't subscribed.
  const pending = await WhatsAppTemplate.exists({ tenantId, status: { $in: ['PENDING', 'IN_APPEAL'] } });
  if (pending && Date.now() - (lastSync.get(tenantId) || 0) > 60_000) {
    try { await syncTemplates(tenantId); } catch { /* list what we have */ }
  }
  const docs = await WhatsAppTemplate.find({ tenantId }).sort({ updatedAt: -1 }).lean();
  const usage = await getUsage(tenantId);
  return docs.map((d) => ({
    ...d,
    shape: templateShape(d as any),
    usedBy: usage.filter((u) => u.assigned?.name === d.name && u.assigned?.language === d.language).map((u) => u.label),
  }));
}

/** Apply a status webhook (message_template_status_update / category / quality). */
export async function applyStatusWebhook(field: string, value: any) {
  const metaId = String(value?.message_template_id || '');
  if (!metaId) return;
  const set: any = {};
  if (field === 'message_template_status_update') {
    set.status = String(value.event || 'UNKNOWN').toUpperCase();
    set.rejectedReason = value.reason && value.reason !== 'NONE' ? value.reason : undefined;
  } else if (field === 'template_category_update') {
    if (value.new_category) set.category = value.new_category;
  } else if (field === 'message_template_quality_update') {
    if (value.new_quality_score) set.qualityScore = value.new_quality_score;
  } else return;
  const r = await WhatsAppTemplate.updateMany({ metaId }, { $set: set });
  console.log(`[wa-templates] webhook ${field} for ${value.message_template_name || metaId} → ${JSON.stringify(set)} (${r.modifiedCount} updated)`);
}

// ── Purposes: which template each part of the system sends ──────────────────

export function checkCompatibility(t: IWhatsAppTemplate | any, p: WaTemplatePurpose) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = templateShape(t);
  if (t.status !== 'APPROVED') errors.push(`Template is ${t.status} — only APPROVED templates can be sent.`);
  if (p.requiredCategory === 'AUTHENTICATION' && t.category !== 'AUTHENTICATION') errors.push('This use needs an AUTHENTICATION (OTP) template.');
  if (p.requiredCategory !== 'AUTHENTICATION' && t.category === 'AUTHENTICATION') errors.push('Authentication templates can only be used for OTP codes.');
  if (s.bodyVarCount > p.variables.length) {
    errors.push(`Template has ${s.bodyVarCount} variables but this use only provides ${p.variables.length} (${p.variables.join(', ')}).`);
  } else if (s.bodyVarCount < p.variables.length && t.category !== 'AUTHENTICATION') {
    warnings.push(`Only the first ${s.bodyVarCount} of ${p.variables.length} values will be used (${p.variables.slice(0, s.bodyVarCount).join(', ') || 'none'}).`);
  }
  if (s.urlButtonIndex >= 0 && !p.buttonParam) errors.push('Template has a dynamic URL button, but this use has no value to put in it.');
  if (s.urlButtonIndex < 0 && p.buttonParam && t.category !== 'AUTHENTICATION') warnings.push('No dynamic URL button — recipients will not get their personal link.');
  if (s.headerHasVars) errors.push('Header text with variables is not supported — move them into the body.');
  if (['VIDEO', 'DOCUMENT'].includes(s.headerFormat)) errors.push(`${s.headerFormat} headers are not supported for system messages.`);
  if (s.headerFormat === 'IMAGE' && !p.headerImage && !t.header?.imageUrl) {
    errors.push('Template has an image header but no default image is stored — edit the template and give an image URL.');
  }
  if (t.category === 'MARKETING') warnings.push('Marketing templates are not delivered to people who opted out of marketing. Prefer UTILITY for transactional messages.');
  return { ok: errors.length === 0, errors, warnings };
}

export async function getUsage(tenantId: string) {
  return WA_TEMPLATE_PURPOSES.map((p) => {
    const name = settings.getStr(p.settingsKey, '', tenantId);
    const lang = settings.getStr(`${p.settingsKey}_LANG`, 'en', tenantId);
    return {
      ...p,
      assigned: name ? { name, language: lang, source: settings.source(p.settingsKey, tenantId) } : null,
    };
  });
}

export async function assignPurpose(tenantId: string, userId: string, purposeKey: string, templateId: string | null) {
  const p = getPurpose(purposeKey);
  if (!p) throw new WaTemplateError('Unknown use', 404);
  if (!templateId) {
    await settings.setMany([
      { key: p.settingsKey, value: '' }, { key: `${p.settingsKey}_LANG`, value: '' }, { key: `${p.settingsKey}_BUTTON`, value: '' },
    ], userId, tenantId);
    return { ok: true, warnings: [] as string[] };
  }
  const t = await WhatsAppTemplate.findOne({ _id: templateId, tenantId });
  if (!t) throw new WaTemplateError('Template not found', 404);
  const c = checkCompatibility(t, p);
  if (!c.ok) throw new WaTemplateError(c.errors.join(' '));
  await settings.setMany([
    { key: p.settingsKey, value: t.name },
    { key: `${p.settingsKey}_LANG`, value: t.language },
    { key: `${p.settingsKey}_BUTTON`, value: templateShape(t).urlButtonIndex >= 0 ? 'true' : 'false' },
  ], userId, tenantId);
  return { ok: true, warnings: c.warnings };
}

// ── Sending ───────────────────────────────────────────────────────────────────

export async function sendTemplateTo(
  tenantId: string, t: IWhatsAppTemplate, phone: string,
  opts: {
    body: string[]; urlButtonParam?: string; headerImageUrl?: string;
    /** Where the send came from, for the delivery log. */
    log?: { source: 'test' | 'broadcast' | 'system'; broadcastId?: any; sentBy?: string };
  },
): Promise<{ ok: boolean; error?: string; errorCode?: number; messageId?: string }> {
  const to = normalizeTo(phone);
  if (!to || to.length < 10) return { ok: false, error: 'invalid phone' };
  const creds = await getWhatsAppCredentialCandidates(tenantId);
  if (!creds.length) return { ok: false, error: 'WhatsApp is not configured for this tenant.' };
  const components = buildSendComponents(t, opts);
  let result: { ok: boolean; error?: string; errorCode?: number; messageId?: string } = { ok: false, error: 'send failed' };
  for (const c of creds) {
    result = await waPost(c, { messaging_product: 'whatsapp', to, type: 'template', template: { name: t.name, language: { code: t.language }, components } });
    if (result.ok) break;
  }
  // Every attempt is logged — accepted ones are later updated by Meta's delivery reports.
  await recordSend({
    tenantId, to, templateName: t.name, templateId: t._id,
    source: opts.log?.source || 'system', broadcastId: opts.log?.broadcastId, sentBy: opts.log?.sentBy, result,
  });
  // …and in the person's conversation, so the Chat tab shows what they were sent.
  await recordOutbound(tenantId, to, {
    kind: 'template', templateName: t.name, wamid: result.messageId, ok: result.ok, error: result.error,
    body: [t.header?.format === 'TEXT' ? t.header.text : '', renderTemplateBody(t.body, opts.body || [])].filter(Boolean).join('\n'),
    sentBy: opts.log?.sentBy, source: opts.log?.source || 'system',
  });
  return result;
}

export async function sendTest(tenantId: string, id: string, phone: string, values: string[], buttonParam?: string, sentBy?: string) {
  const t = await WhatsAppTemplate.findOne({ _id: id, tenantId });
  if (!t) throw new WaTemplateError('Template not found', 404);
  if (t.status !== 'APPROVED') throw new WaTemplateError(`Template is ${t.status} — Meta only sends APPROVED templates.`);
  return sendTemplateTo(tenantId, t, phone, { body: values, urlButtonParam: buttonParam, log: { source: 'test', sentBy } });
}

/** Recipients: pasted numbers, students of a batch, or CRM leads matching a filter. `{name}` in a value is personalised. */
export async function startBroadcast(
  tenantId: string, userId: string, id: string,
  input: { phones?: string; batchId?: string; leads?: LeadFilter; values: string[]; buttonParam?: string },
) {
  const t = await WhatsAppTemplate.findOne({ _id: id, tenantId });
  if (!t) throw new WaTemplateError('Template not found', 404);
  if (t.status !== 'APPROVED') throw new WaTemplateError(`Template is ${t.status} — Meta only sends APPROVED templates.`);

  let recipients: { phone: string; name: string; leadId?: any }[] = [];
  let audience = '';
  if (input.leads) {
    const r = await resolveLeadAudience(tenantId, t, input.leads);
    recipients = r.recipients;
    audience = `CRM leads: ${r.label} (${recipients.length})`;
  } else if (input.batchId) {
    const users = await User.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      batchId: new mongoose.Types.ObjectId(input.batchId),
      role: 'STUDENT', phone: { $nin: [null, ''] },
    }).select('name phone').lean();
    recipients = users.map((u: any) => ({ phone: u.phone, name: u.name || '' }));
    audience = `Batch (${recipients.length} students with a phone)`;
  } else {
    recipients = String(input.phones || '').split(/[\n,;]+/).map((l) => l.trim()).filter(Boolean).map((line) => {
      // "Name, 98765..." or "98765... Name" or just the number
      const digits = line.replace(/[^\d+]/g, '');
      const name = line.replace(/[+\d\s()-]/g, ' ').replace(/\s+/g, ' ').trim();
      return { phone: digits, name };
    });
    audience = `${recipients.length} pasted number${recipients.length === 1 ? '' : 's'}`;
  }
  // One message per number.
  const seen = new Set<string>();
  recipients = recipients.filter((r) => { const k = normalizeTo(r.phone); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  if (!recipients.length) throw new WaTemplateError('No recipients with a phone number.');
  if (recipients.length > 2000) throw new WaTemplateError('At most 2000 recipients per broadcast.');

  const b = await WhatsAppBroadcast.create({
    tenantId, templateId: t._id, templateName: t.name, audience, total: recipients.length, createdBy: userId,
  });

  (async () => {
    let sent = 0, failed = 0;
    const failures: { phone: string; error: string }[] = [];
    for (let k = 0; k < recipients.length; k++) {
      const r = recipients[k];
      const first = (r.name || '').split(' ')[0] || 'there';
      const personalise = (v: string) => String(v || '').replace(/\{name\}/gi, first);
      const res = await sendTemplateTo(tenantId, t, r.phone, {
        body: input.values.map(personalise),
        urlButtonParam: input.buttonParam ? personalise(input.buttonParam) : undefined,
        log: { source: 'broadcast', broadcastId: b._id, sentBy: userId },
      });
      if (res.ok && r.leadId) {
        // Leave a trace on the lead so a telecaller sees the message in its timeline.
        await Lead.updateOne({ _id: r.leadId }, { $push: { activities: {
          type: 'whatsapp', description: `WhatsApp template "${t.name}" sent (broadcast)`, createdBy: userId, createdAt: new Date(),
        } } }).catch(() => {});
      }
      if (res.ok) sent++; else { failed++; if (failures.length < 50) failures.push({ phone: r.phone, error: res.error || 'failed' }); }
      if (k % 10 === 9 || k === recipients.length - 1) {
        await WhatsAppBroadcast.updateOne({ _id: b._id }, { $set: { sent, failed, failures } });
      }
      await new Promise((ok) => setTimeout(ok, 120)); // stay well under Meta's per-number throughput
    }
    await WhatsAppBroadcast.updateOne({ _id: b._id }, { $set: { sent, failed, failures, status: 'done', finishedAt: new Date() } });
  })().catch(async (e) => {
    console.error('[wa-templates] broadcast failed', e);
    await WhatsAppBroadcast.updateOne({ _id: b._id }, { $set: { status: 'failed', finishedAt: new Date() } });
  });

  return b;
}

// ── CRM leads as a broadcast audience ────────────────────────────────────────

export interface LeadFilter {
  stageIds?: string[];
  sources?: string[];
  /** e.g. ["2026"]; "unknown" matches leads whose form had no passout year. */
  passoutYears?: string[];
  /** Leave out numbers this template already reached (anything but a failed send). */
  skipAlreadySent?: boolean;
}

/** Meta lead forms store the year under keys like "🎓_passout_year"; take the first 20xx found. */
export function passoutYearOf(customFields: any): string {
  if (!customFields || typeof customFields !== 'object') return '';
  for (const [k, v] of Object.entries(customFields)) {
    if (!/pass\s*_?out|graduat|year_of_pass|yop/i.test(k)) continue;
    const m = String(v ?? '').match(/20\d\d/);
    if (m) return m[0];
  }
  return '';
}

const oids = (ids?: string[]) => (ids || []).filter((x) => mongoose.isValidObjectId(x)).map((x) => new mongoose.Types.ObjectId(x));

/**
 * Leads matching a filter, one per phone number. Stage and source filter in Mongo; the passout year
 * lives in free-form customFields, so it is filtered here. `years` counts every year among the
 * stage/source matches so the UI can offer them as choices.
 */
export async function resolveLeadAudience(tenantId: string, t: IWhatsAppTemplate, f: LeadFilter) {
  const tid = new mongoose.Types.ObjectId(tenantId);
  const q: any = { tenantId: tid, phone: { $nin: [null, ''] } };
  const stageIds = oids(f.stageIds);
  if (stageIds.length) q.stageId = { $in: stageIds };
  if (f.sources?.length) q.source = { $in: f.sources };
  const leads = await Lead.find(q).select('name phone customFields').lean();

  const years: Record<string, number> = {};
  let rows = leads.map((l: any) => {
    const year = passoutYearOf(l.customFields);
    years[year || 'unknown'] = (years[year || 'unknown'] || 0) + 1;
    return { leadId: l._id, name: l.name || '', phone: String(l.phone), year };
  });
  const wanted = f.passoutYears || [];
  if (wanted.length) rows = rows.filter((r) => wanted.includes(r.year || 'unknown'));

  // One message per number.
  const seen = new Set<string>();
  rows = rows.filter((r) => { const k = normalizeTo(r.phone); if (k.length < 10 || seen.has(k)) return false; seen.add(k); return true; });

  let alreadySent = 0;
  if (f.skipAlreadySent) {
    const done = new Set<string>(await WhatsAppMessageLog.distinct('to', { tenantId: tid, templateName: t.name, status: { $ne: 'failed' } }));
    const before = rows.length;
    rows = rows.filter((r) => !done.has(normalizeTo(r.phone)));
    alreadySent = before - rows.length;
  }

  const stageNames = stageIds.length ? (await LeadStage.find({ _id: { $in: stageIds } }).select('name').lean()).map((s: any) => s.name) : [];
  const label = [
    stageNames.length ? stageNames.join(', ') : 'all stages',
    f.sources?.length ? f.sources.join(', ') : '',
    wanted.length ? `passout ${wanted.join('/')}` : '',
  ].filter(Boolean).join(' · ');

  return { recipients: rows.map(({ leadId, name, phone }) => ({ leadId, name, phone })), alreadySent, years, label };
}

/** For the send dialog: how many would get it, and a few names to sanity-check, before anything is sent. */
export async function previewLeadAudience(tenantId: string, id: string, f: LeadFilter) {
  const t = await WhatsAppTemplate.findOne({ _id: id, tenantId });
  if (!t) throw new WaTemplateError('Template not found', 404);
  const r = await resolveLeadAudience(tenantId, t, f);
  return { total: r.recipients.length, alreadySent: r.alreadySent, years: r.years, sample: r.recipients.slice(0, 5).map((x) => x.name || x.phone) };
}

/** Stages and sources with how many leads (with a phone) are in each — the filter choices. */
export async function leadFilterOptions(tenantId: string) {
  const tid = new mongoose.Types.ObjectId(tenantId);
  const match = { tenantId: tid, phone: { $nin: [null, ''] } };
  const [byStage, bySource, stages] = await Promise.all([
    Lead.aggregate([{ $match: match }, { $group: { _id: '$stageId', n: { $sum: 1 } } }]),
    Lead.aggregate([{ $match: match }, { $group: { _id: '$source', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    LeadStage.find({ tenantId: tid }).select('name order').sort({ order: 1 }).lean(),
  ]);
  const count = new Map(byStage.map((x: any) => [String(x._id), x.n as number]));
  return {
    stages: stages.map((s: any) => ({ _id: String(s._id), name: s.name as string, count: count.get(String(s._id)) || 0 })),
    sources: bySource.filter((x: any) => x._id).map((x: any) => ({ source: String(x._id), count: x.n as number })),
  };
}

export const listBroadcasts = (tenantId: string) =>
  WhatsAppBroadcast.find({ tenantId }).sort({ createdAt: -1 }).limit(20).lean();
