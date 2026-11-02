import { Request, Response } from 'express';
import crypto from 'crypto';
import Tenant from '../models/Tenant';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import WebsiteVerification, { IWebsiteVerification } from '../models/WebsiteVerification';
import { sendOtp, verifyOtp } from '../services/assessmentOtpService';
import { recordReEnquiry } from '../services/leadReEnquiryService';
import { WEBSITE_COURSES } from '../config/websiteCourses';

/**
 * Website APIs for the course landing pages (FDE first):
 *   POST /api/v1/public/:tenantSlug/otp/send      send (and resend) a WhatsApp code
 *   POST /api/v1/public/:tenantSlug/otp/verify    check the code, get a verificationToken
 *   POST /api/v1/public/:tenantSlug/course-lead   create the lead — refused without a verified phone
 *
 * No account or session is created by the two OTP calls; they only prove a phone number is real.
 */

const OTP_TTL_SEC = 10 * 60;
const RESEND_AFTER_SEC = 30;
const MAX_SENDS_PER_REQUEST = 5;       // sends for one requestId (first + resends)
const MAX_NEW_REQUESTS_PER_HOUR = 5;   // fresh requests for one phone
const TOKEN_TTL_MS = 30 * 60 * 1000;   // how long a verified phone may be used to submit

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const fail = (res: Response, status: number, message: string, data?: any) =>
  res.status(status).json({ success: false, message, ...(data ? { data } : {}) });

/** Last ten digits of an Indian mobile, however it was typed. Empty when it cannot be one. */
const normalizePhone = (raw: unknown): string => {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 13 && d.startsWith('091')) d = d.slice(3);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : '';
};

const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

async function tenantBySlug(slug: string) {
  return Tenant.findOne({ slug: String(slug || '').toLowerCase(), isActive: true });
}

// ── POST /otp/send ────────────────────────────────────────────────────────────────────────────
export const sendWebsiteOtp = async (req: Request, res: Response) => {
  try {
    const tenant = await tenantBySlug(req.params.tenantSlug);
    if (!tenant) return fail(res, 404, 'Invalid form endpoint.');
    const tenantId = String(tenant._id);
    const phone = normalizePhone(req.body?.phone ?? req.body?.mobile);
    if (!phone) return fail(res, 400, 'Enter a valid 10-digit mobile number.');

    // A resend names the requestId it was given; it must belong to this phone.
    let doc: IWebsiteVerification | null = null;
    const given = clip(req.body?.requestId, 64);
    if (given) {
      doc = await WebsiteVerification.findOne({ requestId: given, tenantId, phone });
      if (!doc) return fail(res, 400, 'This verification request has expired. Please start again.');
      if (doc.sendCount >= MAX_SENDS_PER_REQUEST) return fail(res, 429, 'Too many codes requested. Please try again later.');
    } else {
      const recent = await WebsiteVerification.countDocuments({ tenantId, phone, createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } });
      if (recent >= MAX_NEW_REQUESTS_PER_HOUR) return fail(res, 429, 'Too many attempts for this number. Please try again in an hour.');
      doc = await WebsiteVerification.create({
        tenantId, phone, requestId: crypto.randomBytes(16).toString('hex'),
        purpose: clip(req.body?.purpose, 40) || 'lead', expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
    }

    const r = await sendOtp(tenantId, doc.requestId, phone);   // WhatsApp only: no email is passed
    if (r.throttledSeconds) {
      return fail(res, 429, `Please wait ${r.throttledSeconds} seconds before asking for another code.`,
        { requestId: doc.requestId, resendAfterSec: r.throttledSeconds });
    }
    if (!r.sent && !r.devCode) {
      return fail(res, 502, 'We could not send the code on WhatsApp. Check the number has WhatsApp and try again.');
    }
    doc.sendCount += 1;
    await doc.save();
    return res.json({ success: true, message: 'Code sent on WhatsApp', data: {
      requestId: doc.requestId, channel: 'whatsapp', expiresInSec: OTP_TTL_SEC, resendAfterSec: RESEND_AFTER_SEC,
      ...(r.devCode ? { devCode: r.devCode } : {}),   // only outside production or for a test number
    } });
  } catch (e) {
    console.error('[website-otp/send]', e);
    return fail(res, 500, 'Something went wrong. Please try again.');
  }
};

// ── POST /otp/verify ──────────────────────────────────────────────────────────────────────────
const REASON: Record<string, string> = { invalid: 'wrong_code', expired: 'expired', too_many_attempts: 'too_many_attempts', not_found: 'not_found' };

export const verifyWebsiteOtp = async (req: Request, res: Response) => {
  try {
    const tenant = await tenantBySlug(req.params.tenantSlug);
    if (!tenant) return fail(res, 404, 'Invalid form endpoint.');
    const requestId = clip(req.body?.requestId, 64);
    const code = clip(req.body?.code, 12);
    if (!requestId || !code) return fail(res, 400, 'requestId and code are required.');

    const doc = await WebsiteVerification.findOne({ requestId, tenantId: String(tenant._id) });
    if (!doc) return fail(res, 400, 'This verification request has expired. Please start again.', { reason: 'not_found' });

    const result = await verifyOtp(requestId, code);
    if (result !== 'ok') {
      const messages: Record<string, string> = {
        wrong_code: 'That code is not correct.', expired: 'That code has expired. Request a new one.',
        too_many_attempts: 'Too many wrong attempts. Request a new code.', not_found: 'Request a new code.',
      };
      const reason = REASON[result] || 'wrong_code';
      return fail(res, 400, messages[reason], { reason });
    }
    const token = crypto.randomBytes(24).toString('hex');
    doc.verifiedAt = new Date();
    doc.tokenHash = sha(token);
    doc.tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await doc.save();
    return res.json({ success: true, message: 'Phone verified', data: { verified: true, verificationToken: token, expiresInSec: TOKEN_TTL_MS / 1000 } });
  } catch (e) {
    console.error('[website-otp/verify]', e);
    return fail(res, 500, 'Something went wrong. Please try again.');
  }
};

// ── POST /course-lead ─────────────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const submitCourseLead = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    // Hidden "website" field: people never fill it, bots do. Pretend success and store nothing.
    if (clip(b.website, 200)) return res.status(201).json({ success: true, message: 'Thank you! We will call you within 24 hours.' });

    const tenant = await tenantBySlug(req.params.tenantSlug);
    if (!tenant) return fail(res, 404, 'Invalid form endpoint.');
    const tenantId = String(tenant._id);

    const course = WEBSITE_COURSES[clip(b.course, 40).toLowerCase()];
    if (!course) return fail(res, 400, 'Unknown course.');

    const name = clip(b.name, 120);
    const email = clip(b.email, 200).toLowerCase();
    const phone = normalizePhone(b.phone ?? b.mobile);
    const degree = clip(b.degree, 100);
    const designation = clip(b.designation, 100);
    const gradYear = Number(String(b.graduationYear ?? '').trim());
    const maxYear = new Date().getFullYear() + 6;

    const missing: Record<string, string> = {};
    if (!name) missing.name = 'Full name is required';
    if (!EMAIL_RE.test(email)) missing.email = 'A valid email is required';
    if (!phone) missing.phone = 'A valid 10-digit mobile number is required';
    if (!degree) missing.degree = 'Degree is required';
    if (!designation) missing.designation = 'Designation is required';
    if (!Number.isInteger(gradYear) || gradYear < 1980 || gradYear > maxYear) missing.graduationYear = 'Enter a valid graduation year';
    if (Object.keys(missing).length) return fail(res, 400, 'Please correct the highlighted fields.', { fields: missing });

    // The phone must have been verified by OTP, and the proof is spent by this submit.
    const token = clip(b.verificationToken, 128);
    if (!token) return fail(res, 401, 'Please verify your mobile number first.', { reason: 'not_verified' });
    const proof = await WebsiteVerification.findOneAndUpdate(
      { tenantId, phone, tokenHash: sha(token), usedAt: { $exists: false }, tokenExpiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } }, { new: true });
    if (!proof) return fail(res, 401, 'Your mobile verification has expired. Please verify again.', { reason: 'not_verified' });
    const releaseProof = () => WebsiteVerification.updateOne({ _id: proof._id }, { $unset: { usedAt: 1 } }).catch(() => undefined);

    // Where it came from: the page the form sat on, taken from the page itself or the browser's referer.
    const pageUrl = clip(b.pageUrl, 500) || clip(req.headers.referer, 500);
    let pagePath = '';
    try { pagePath = pageUrl ? new URL(pageUrl, 'https://x.invalid').pathname : ''; } catch { /* no usable path */ }
    const utm = { source: clip(b.utm_source, 100), medium: clip(b.utm_medium, 100), campaign: clip(b.utm_campaign, 100), content: clip(b.utm_content, 100), term: clip(b.utm_term, 100) };
    const detail = `Course: ${course.name}. Page: ${pagePath || 'unknown'}. Degree ${degree}, graduated ${gradYear}, ${designation}. Phone verified by WhatsApp OTP.`;
    const profile = { degree, graduationYear: String(gradYear), designation, phoneVerified: 'yes', landingPath: pagePath, program: course.key };

    try {
      const existing: any = await Lead.findOne({ tenantId, $or: [{ phone }, { email }] }).select('_id').lean();
      if (existing) {
        const set: any = { archivedAt: null, 'customFields.phoneVerified': 'yes', 'customFields.program': course.key, 'customFields.landingPath': pagePath };
        await Lead.updateOne({ _id: existing._id }, { $set: set, $addToSet: { courseInterest: course.name } });
        await recordReEnquiry(tenantId, existing._id, { channel: 'website', note: detail.slice(0, 300) });
        return res.status(200).json({ success: true, message: 'Thank you! We will call you within 24 hours.', isExisting: true });
      }

      const stage = await LeadStage.findOne({ tenantId: tenant._id, isDefault: true }) || await LeadStage.findOne({ tenantId: tenant._id });
      if (!stage) { await releaseProof(); return fail(res, 500, 'Lead pipeline not configured. Please contact support.'); }
      const adminId = (tenant as any).adminId;
      await new Lead({
        tenantId: tenant._id, createdBy: adminId, name, phone, email,
        source: 'website', priority: 'hot', stageId: stage._id,
        courseInterest: [course.name],
        sourceDetails: { platform: 'website', landingPage: pagePath, referrerUrl: pageUrl, formId: `${course.key}-callback` },
        customFields: new Map(Object.entries(profile)),
        utmParams: utm,
        activities: [{ type: 'created', description: `Hot lead from website. ${detail}`, createdBy: adminId, createdAt: new Date() }],
      }).save();
      return res.status(201).json({ success: true, message: 'Thank you! We will call you within 24 hours.', isExisting: false });
    } catch (e) {
      await releaseProof();   // the visitor keeps their verification and can press submit again
      throw e;
    }
  } catch (e) {
    console.error('[course-lead]', e);
    return fail(res, 500, 'Something went wrong. Please try again.');
  }
};
