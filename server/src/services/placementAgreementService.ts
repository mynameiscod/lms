import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import PlacementCandidate, { IPlacementCandidate } from '../models/PlacementCandidate';
import PlacementEvent from '../models/PlacementEvent';
import Tenant from '../models/Tenant';
import { sendOtp, verifyOtp } from './assessmentOtpService';
import { sendByPurpose } from './purposeMessaging';
import { PlacementError } from './placementProgramService';
import { getConfig, portalUrl } from './placementPortalService';
import { istLabel } from '../data/placementSlotPolicy';

/**
 * Placement Program — Phase 4: the agreement (admin-written, e-signed by the candidate with a
 * WhatsApp code) and the security cheque (uploaded by the candidate, tracked by the admin).
 */

export const AGREEMENT_PURPOSE = 'PLACEMENT_AGREEMENT_SENT';

/** Stages from which an agreement may be sent — after the selection decision. */
const AFTER_SELECTION = ['selected', 'agreement_sent', 'agreement_signed', 'cheque_verified', 'active', 'placed'];

/**
 * Cheque photos live under the uploads volume (the only storage that survives a deploy) but in a
 * dot-folder: express.static ignores dot-paths, and app.ts refuses /uploads/.private outright too.
 * They are read only through the admin endpoint.
 */
export const PRIVATE_DIR = path.join(process.cwd(), 'uploads', '.private', 'placement-cheques');

async function event(tenantId: any, candidateId: any, kind: string, message: string, data?: any, actorId?: string) {
  await PlacementEvent.create({
    tenantId, candidateId, kind, message, data,
    actorId: actorId && mongoose.Types.ObjectId.isValid(actorId) ? actorId : undefined,
  }).catch((e) => console.error('[placement] event not recorded:', e?.message));
}

export const MERGE_FIELDS: [string, string][] = [
  ['name', 'Full name'], ['first_name', 'First name'], ['mobile', 'Mobile'], ['email', 'Email'], ['college', 'College'],
  ['fee', 'Interview fee (₹)'], ['refundable_pct', 'Refundable %'], ['refund_amount', 'Refundable amount (₹)'],
  ['date', 'Today’s date'], ['org', 'Organisation name'],
];

/** Fill an agreement's {{fields}}. Unknown fields are left visible, so a typo is noticed in preview. Pure. */
export function renderAgreement(text: string, v: Record<string, string | number | undefined>): string {
  return String(text || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (m, k) => {
    const val = v[String(k).toLowerCase()];
    return val === undefined || val === '' ? m : String(val);
  });
}

function valuesFor(c: IPlacementCandidate, fee: number, pct: number, org: string): Record<string, string | number> {
  return {
    name: c.name, first_name: c.name.split(' ')[0], mobile: `+91 ${c.mobile}`, email: c.email || '', college: c.college || '',
    fee: fee.toLocaleString('en-IN'), refundable_pct: pct, refund_amount: Math.floor((fee * pct) / 100).toLocaleString('en-IN'),
    date: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' }), org,
  };
}

/** Admin preview of the template filled with sample values. */
export async function previewAgreement(tenantId: string) {
  const cfg = await getConfig(tenantId);
  const tenant = await Tenant.findById(tenantId).select('name').lean() as any;
  const sample: any = { name: 'Ravi Kumar', mobile: '9876543210', email: 'ravi@example.com', college: 'NEC' };
  return { title: cfg.agreement?.title || '', text: renderAgreement(cfg.agreement?.body || '', valuesFor(sample, cfg.feeInr, cfg.refundablePct, tenant?.name || 'CodeBegun')), version: cfg.agreement?.version || 0 };
}

/** Admin: freeze the current agreement for this candidate and ask them to sign it. */
export async function sendAgreement(tenantId: string, id: string, actorId: string) {
  const c = await PlacementCandidate.findOne({ _id: id, tenantId });
  if (!c) throw new PlacementError('Not found', 404);
  if (!AFTER_SELECTION.includes(c.stage)) throw new PlacementError('Send the agreement after the candidate is selected.');
  if (c.agreement?.signedAt) throw new PlacementError('This candidate has already signed.');
  const cfg = await getConfig(tenantId);
  if (!String(cfg.agreement?.body || '').trim()) throw new PlacementError('Write the agreement first: Placement Program → Settings → Agreement.');
  const tenant = await Tenant.findById(tenantId).select('name').lean() as any;
  const org = tenant?.name || 'CodeBegun';
  const text = renderAgreement(cfg.agreement!.body, valuesFor(c, c.fee?.amountInr ?? cfg.feeInr, c.fee?.refundablePct ?? cfg.refundablePct, org));
  if (!c.portalToken) c.portalToken = crypto.randomBytes(24).toString('base64url');
  // The exact words they will sign, frozen now — later edits to the template never change them.
  c.agreement = { version: String(cfg.agreement!.version || 1), title: cfg.agreement!.title || 'Placement Program Agreement', text, sentAt: new Date() } as any;
  c.markModified('agreement');
  if (c.stage === 'selected') { c.stage = 'agreement_sent'; c.stageChangedAt = new Date(); }
  await c.save();
  await event(tenantId, c._id, 'stage', `Agreement v${cfg.agreement!.version || 1} sent for signature`, undefined, actorId);
  const wa = await sendByPurpose(tenantId, c.mobile, AGREEMENT_PURPOSE, [c.name.split(' ')[0], portalUrl(c.portalToken)])
    .catch((e: any) => ({ ok: false, error: e?.message }));
  await event(tenantId, c._id, 'whatsapp', wa.ok ? 'WhatsApp: agreement link sent' : `WhatsApp agreement link not sent: ${(wa as any).error}`);
  return { ok: true, link: portalUrl(c.portalToken) };
}

async function byToken(token: string) {
  const t = String(token || '').trim();
  if (t.length < 20) throw new PlacementError('This link is not valid.', 404);
  const c = await PlacementCandidate.findOne({ portalToken: t });
  if (!c) throw new PlacementError('This link is not valid.', 404);
  return c;
}

const otpKey = (c: IPlacementCandidate) => `pp-agree:${c._id}`;
const normName = (s: string) => String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

export async function portalAgreementOtp(token: string) {
  const c = await byToken(token);
  if (!c.agreement?.sentAt) throw new PlacementError('There is no agreement to sign yet.');
  if (c.agreement.signedAt) throw new PlacementError('You have already signed.');
  const r = await sendOtp(String(c.tenantId), otpKey(c), c.mobile, c.email || undefined);
  return { sent: r.sent, channel: r.channel, throttledSeconds: r.throttledSeconds, devCode: r.devCode };
}

/**
 * Sign. Three things together are the evidence: the WhatsApp code proves the mobile, the typed name
 * is their assent, and the SHA-256 of the frozen text proves exactly which words they agreed to.
 */
export async function portalSign(token: string, body: { name?: string; code?: string; agree?: boolean }, ip: string, userAgent: string) {
  const c = await byToken(token);
  if (!c.agreement?.sentAt) throw new PlacementError('There is no agreement to sign yet.');
  if (c.agreement.signedAt) throw new PlacementError('You have already signed.');
  if (body?.agree !== true) throw new PlacementError('Tick the box to confirm you have read and agree.');
  const typed = String(body?.name || '').trim().slice(0, 120);
  if (normName(typed) !== normName(c.name)) throw new PlacementError(`Type your full name exactly as registered: ${c.name}`);
  const v = await verifyOtp(otpKey(c), String(body?.code || '').trim());
  if (v !== 'ok') {
    throw new PlacementError(v === 'expired' ? 'That code has expired. Send a new one.' : v === 'too_many_attempts' ? 'Too many wrong codes. Send a new one.' : 'That code is not correct.');
  }
  const signedAt = new Date();
  c.agreement = {
    ...(c.agreement as any), signedAt, signedName: typed, signedIp: String(ip || '').slice(0, 64), userAgent: String(userAgent || '').slice(0, 300),
    otpVerified: true, textHash: crypto.createHash('sha256').update(c.agreement.text || '').digest('hex'),
  };
  c.markModified('agreement');
  if (['selected', 'agreement_sent'].includes(c.stage)) { c.stage = 'agreement_signed'; c.stageChangedAt = signedAt; }
  await c.save();
  await event(c.tenantId, c._id, 'stage', `Agreement signed by "${typed}" (WhatsApp code verified)`, { ip: c.agreement.signedIp });
  return { ok: true };
}

/** The signed (or pending) agreement as a PDF, with the evidence block. Built on demand from the frozen text. */
export function agreementPdf(c: IPlacementCandidate, org: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const a: any = c.agreement || {};
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks: Buffer[] = [];
    doc.on('data', (b: Buffer) => chunks.push(b));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(9).fillColor('#64748b').text(org, { align: 'right' });
    doc.moveDown(0.5).fontSize(17).fillColor('#0f172a').text(a.title || 'Placement Program Agreement');
    doc.fontSize(9).fillColor('#64748b').text(`Version ${a.version || '—'} · ${c.name}`);
    doc.moveDown().fontSize(10.5).fillColor('#111827').text(a.text || '', { align: 'left', lineGap: 3 });
    doc.moveDown(1.5).fontSize(11).fillColor('#0f172a').text(a.signedAt ? 'Signature' : 'Not yet signed');
    doc.moveDown(0.3).fontSize(9).fillColor('#334155');
    if (a.signedAt) {
      doc.text(`Signed by: ${a.signedName}`);
      doc.text(`Signed at: ${istLabel(new Date(a.signedAt))} IST`);
      doc.text(`Mobile verified by WhatsApp code: +91 ${c.mobile}`);
      doc.text(`IP address: ${a.signedIp || '—'}`);
      doc.text(`Document fingerprint (SHA-256 of the text above): ${a.textHash}`);
    } else {
      doc.text(`Sent for signature: ${a.sentAt ? istLabel(new Date(a.sentAt)) + ' IST' : '—'}`);
    }
    doc.end();
  });
}

export async function portalAgreementPdf(token: string) {
  const c = await byToken(token);
  if (!c.agreement?.sentAt) throw new PlacementError('There is no agreement yet.', 404);
  const tenant = await Tenant.findById(c.tenantId).select('name').lean() as any;
  return { pdf: await agreementPdf(c, tenant?.name || 'CodeBegun'), filename: `agreement-${c.name.replace(/\s+/g, '-')}.pdf` };
}

export async function adminAgreementPdf(tenantId: string, id: string) {
  const c = await PlacementCandidate.findOne({ _id: id, tenantId });
  if (!c?.agreement?.sentAt) throw new PlacementError('No agreement has been sent to this candidate.', 404);
  const tenant = await Tenant.findById(tenantId).select('name').lean() as any;
  return { pdf: await agreementPdf(c, tenant?.name || 'CodeBegun'), filename: `agreement-${c.name.replace(/\s+/g, '-')}.pdf` };
}

// ── Security cheque ──────────────────────────────────────────────────────────

const CHEQUE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** Pure checks on the cheque details the candidate typed. */
export function validateChequeFields(b: any) {
  const number = String(b?.number || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(number)) throw new PlacementError('Cheque number is the 6 digits at the bottom left of the cheque.');
  const bank = String(b?.bank || '').trim().slice(0, 80);
  if (!bank) throw new PlacementError('Enter the bank name.');
  const amountInr = Number(b?.amountInr);
  if (!Number.isFinite(amountInr) || amountInr <= 0 || amountInr > 10_000_000) throw new PlacementError('Enter the cheque amount.');
  const date = b?.date ? new Date(String(b.date)) : null;
  if (!date || isNaN(date.getTime())) throw new PlacementError('Enter the date written on the cheque.');
  return { number, bank, amountInr: Math.round(amountInr), date };
}

export async function portalUploadCheque(token: string, file: { path: string; mimetype: string; size: number } | undefined, body: any) {
  const c = await byToken(token);
  const cleanup = () => { if (file?.path) fs.promises.unlink(file.path).catch(() => undefined); };
  try {
    if (!c.agreement?.signedAt) throw new PlacementError('Please sign the agreement first.');
    if (c.cheque?.status && c.cheque.status !== 'received') throw new PlacementError('Your cheque is already verified. Contact us to change it.');
    if (!file) throw new PlacementError('Attach a clear photo of the cheque.');
    if (!CHEQUE_MIME.includes(file.mimetype)) throw new PlacementError('Upload a JPG, PNG or PDF.');
    const fields = validateChequeFields(body);
    await fs.promises.mkdir(PRIVATE_DIR, { recursive: true });
    const ext = file.mimetype === 'application/pdf' ? '.pdf' : file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const name = `${c._id}-${crypto.randomBytes(12).toString('hex')}${ext}`;
    await fs.promises.rename(file.path, path.join(PRIVATE_DIR, name));
    const old = (c.cheque as any)?.file;
    c.cheque = { ...fields, file: name, mime: file.mimetype, status: 'received', uploadedAt: new Date() } as any;
    c.markModified('cheque');
    await c.save();
    if (old && old !== name) fs.promises.unlink(path.join(PRIVATE_DIR, path.basename(old))).catch(() => undefined);
    await event(c.tenantId, c._id, 'stage', `Security cheque uploaded (No. ${fields.number}, ${fields.bank}, ₹${fields.amountInr.toLocaleString('en-IN')})`);
    return { ok: true };
  } catch (e) { cleanup(); throw e; }
}

/** The allowed cheque moves. Deposit is the only one that needs a written reason. */
const CHEQUE_MOVES: Record<string, string[]> = {
  received: ['verified'],
  verified: ['held', 'returned', 'deposited'],
  held: ['returned', 'deposited'],
  returned: [], deposited: [],
};

export async function setChequeStatus(tenantId: string, id: string, status: string, actorId: string, reason?: string) {
  const c = await PlacementCandidate.findOne({ _id: id, tenantId });
  if (!c?.cheque?.status) throw new PlacementError('No cheque has been uploaded.', 404);
  const from = c.cheque.status;
  if (!(CHEQUE_MOVES[from] || []).includes(status)) throw new PlacementError(`A ${from} cheque cannot be marked ${status}.`);
  const why = String(reason || '').trim().slice(0, 500);
  if (status === 'deposited' && why.length < 10) throw new PlacementError('Depositing a security cheque needs a written reason (what in the agreement was breached).');
  c.cheque = { ...(c.cheque as any), status, ...(status === 'verified' ? { verifiedAt: new Date() } : {}), ...(status === 'deposited' ? { depositReason: why } : {}) };
  c.markModified('cheque');
  if (status === 'verified' && ['agreement_signed', 'agreement_sent'].includes(c.stage)) { c.stage = 'cheque_verified'; c.stageChangedAt = new Date(); }
  await c.save();
  const label: Record<string, string> = { verified: 'verified', held: 'put on hold (kept as security)', returned: 'returned to the candidate', deposited: 'DEPOSITED' };
  await event(tenantId, c._id, 'stage', `Security cheque ${label[status] || status}${why ? ` — ${why}` : ''}`, { from, to: status }, actorId);
  return c;
}

export async function chequeFile(tenantId: string, id: string) {
  const c = await PlacementCandidate.findOne({ _id: id, tenantId }).select('cheque').lean() as any;
  const name = c?.cheque?.file ? path.basename(c.cheque.file) : '';
  if (!name) throw new PlacementError('No cheque has been uploaded.', 404);
  const full = path.join(PRIVATE_DIR, name);
  if (!fs.existsSync(full)) throw new PlacementError('The cheque file is missing on the server.', 404);
  return { full, mime: c.cheque.mime || 'application/octet-stream' };
}
