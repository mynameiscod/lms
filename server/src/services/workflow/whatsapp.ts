import mongoose from 'mongoose';
import WhatsAppThread from '../../models/WhatsAppThread';
import WhatsAppTemplate from '../../models/WhatsAppTemplate';
import { getWhatsAppCredentialCandidates, waPost, normalizeTo } from '../assessmentOtpService';
import { recordSend, explainWaError } from '../whatsAppDeliveryService';
import { recordOutbound } from '../whatsAppChatStore';
import { sendTemplateTo } from '../whatsAppTemplateService';
import { windowOf } from '../whatsAppChatService';

/**
 * Every WhatsApp message a workflow sends goes through here: the delivery log, the person's
 * conversation (shown as "automation" in the Chat tab) and Meta's 24-hour rule.
 */
export type SendResult = { ok: boolean; error?: string; skipped?: boolean };
const oid = (id: string) => new mongoose.Types.ObjectId(id);

export async function threadOf(tenantId: string, phone: string) {
  return WhatsAppThread.findOne({ tenantId: oid(tenantId), phone: normalizeTo(phone) })
    .select('lastInboundAt botPaused automationOptOutAt').lean() as Promise<any>;
}

export async function windowOpen(tenantId: string, phone: string): Promise<boolean> {
  return windowOf((await threadOf(tenantId, phone))?.lastInboundAt).open;
}

export async function setOptOut(tenantId: string, phone: string, out: boolean) {
  await WhatsAppThread.updateOne({ tenantId: oid(tenantId), phone: normalizeTo(phone) }, { $set: { automationOptOutAt: out ? new Date() : null } }, { upsert: true });
}

async function post(tenantId: string, to: string, payload: any, label: string, body: string, kind: any = 'text'): Promise<SendResult> {
  const creds = await getWhatsAppCredentialCandidates(tenantId);
  if (!creds.length) return { ok: false, error: 'WhatsApp is not connected for this institute' };
  let result: { ok: boolean; error?: string; errorCode?: number; messageId?: string } = { ok: false, error: 'send failed' };
  for (const c of creds) {
    result = await waPost(c, { messaging_product: 'whatsapp', to, ...payload });
    if (result.ok) break;
  }
  await recordSend({ tenantId, to, templateName: label, source: 'system', result });
  await recordOutbound(tenantId, to, { kind, body, wamid: result.messageId, ok: result.ok, error: result.error, source: 'automation' });
  return result.ok ? { ok: true } : { ok: false, error: explainWaError(result.errorCode, result.error) || result.error };
}

/** Free text — only inside the 24-hour window. */
export async function sendText(tenantId: string, phone: string, text: string): Promise<SendResult> {
  const to = normalizeTo(phone);
  if (!(await windowOpen(tenantId, to))) return { ok: false, skipped: true, error: 'the 24-hour window is closed (they have not messaged in the last 24 hours)' };
  return post(tenantId, to, { type: 'text', text: { body: text.slice(0, 4096), preview_url: true } }, '(workflow message)', text);
}

/** A question with reply buttons (≤3) or a list (≤10). Inside the window only. */
export async function sendChoices(tenantId: string, phone: string, question: string, options: string[], kind: 'buttons' | 'list', listButton = 'Choose'): Promise<SendResult> {
  const to = normalizeTo(phone);
  if (!(await windowOpen(tenantId, to))) return { ok: false, skipped: true, error: 'the 24-hour window is closed' };
  const interactive = kind === 'buttons'
    ? { type: 'button', body: { text: question.slice(0, 1024) }, action: { buttons: options.slice(0, 3).map((o, i) => ({ type: 'reply', reply: { id: `opt_${i + 1}`, title: o.slice(0, 20) } })) } }
    : { type: 'list', body: { text: question.slice(0, 1024) }, action: { button: listButton.slice(0, 20) || 'Choose', sections: [{ title: 'Options', rows: options.slice(0, 10).map((o, i) => ({ id: `opt_${i + 1}`, title: o.slice(0, 24) })) }] } };
  return post(tenantId, to, { type: 'interactive', interactive }, '(workflow question)', `${question}\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`);
}

/** A PDF / image by public link. Inside the window only. */
export async function sendMediaLink(tenantId: string, phone: string, kind: 'document' | 'image', url: string, caption?: string, fileName?: string): Promise<SendResult> {
  const to = normalizeTo(phone);
  if (!(await windowOpen(tenantId, to))) return { ok: false, skipped: true, error: 'the 24-hour window is closed' };
  const media: any = { link: url };
  if (caption) media.caption = caption.slice(0, 1024);
  if (kind === 'document') media.filename = (fileName || url.split('/').pop() || 'file.pdf').slice(0, 120);
  return post(tenantId, to, { type: kind, [kind]: media }, '(workflow file)', caption || fileName || url, kind);
}

/** An approved template — works any time, also for someone who never messaged. */
export async function sendTemplate(tenantId: string, phone: string, templateId: string, values: string[], buttonParam?: string, header?: { documentUrl?: string; fileName?: string }): Promise<SendResult> {
  if (!mongoose.isValidObjectId(templateId)) return { ok: false, error: 'no template chosen' };
  const t = await WhatsAppTemplate.findOne({ _id: templateId, tenantId });
  if (!t) return { ok: false, error: 'the template was deleted' };
  if (t.status !== 'APPROVED') return { ok: false, error: `template "${t.name}" is ${t.status}, Meta only sends APPROVED templates` };
  if (t.header?.format === 'DOCUMENT' && !t.header.documentUrl && !header?.documentUrl) return { ok: false, error: `template "${t.name}" has a PDF header but no PDF — add one to the template or to this step` };
  const r = await sendTemplateTo(tenantId, t, phone, { body: values, urlButtonParam: buttonParam || undefined, headerDocumentUrl: header?.documentUrl || undefined, headerFileName: header?.fileName || undefined, log: { source: 'system' } });
  return r.ok ? { ok: true } : { ok: false, error: explainWaError(r.errorCode, r.error) || r.error };
}

export async function templateName(tenantId: string, templateId: string): Promise<string> {
  if (!mongoose.isValidObjectId(templateId)) return '';
  const t: any = await WhatsAppTemplate.findOne({ _id: templateId, tenantId }).select('name').lean();
  return t?.name || '';
}
