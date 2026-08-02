import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Tenant from '../models/Tenant';
import PassportConfig, { DEFAULT_ONBOARDING_FIELDS, DEFAULT_ENTITLEMENTS } from '../models/PassportConfig';
import * as settings from '../services/settingsService';
import { sendOtp, verifyOtp } from '../services/assessmentOtpService';

// Public CareerPilot funnel: signup (Name/Mobile/Email + admin-configured onboarding
// fields) → OTP → account created (STUDENT + passport, not yet active/paid) → auto-login.

async function resolveTenantId(raw: any): Promise<string | null> {
  let t = String(raw || '').trim();
  if (t && !mongoose.isValidObjectId(t)) {
    const found = await Tenant.findOne({ slug: t.toLowerCase() }).select('_id').lean() as any;
    t = found ? String(found._id) : '';
  }
  return mongoose.isValidObjectId(t) ? t : null;
}

const normalizePhone = (p: string) => String(p || '').replace(/[^\d]/g, '');

async function ensureConfig(tenantId: string) {
  let cfg = await PassportConfig.findOne({ tenantId });
  if (!cfg) cfg = await PassportConfig.create({ tenantId, onboardingFields: DEFAULT_ONBOARDING_FIELDS, entitlements: DEFAULT_ENTITLEMENTS });
  return cfg;
}

function passportEnabled(tenantId: string, cfg: any): boolean {
  const hardOff = settings.getStr('PASSPORT_ENABLED', 'true', tenantId) === 'false';
  return !hardOff && !!cfg?.enabled;
}

/** GET /public/passport/config?tenant= — onboarding fields + price for the signup page. */
export const getPublicConfig = async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req.query.tenant);
    if (!tenantId) return res.status(400).json({ success: false, message: 'Unknown tenant' });
    const cfg = await ensureConfig(tenantId);
    res.json({
      success: true,
      enabled: passportEnabled(tenantId, cfg),
      onboardingFields: (cfg.onboardingFields || []).sort((a: any, b: any) => a.order - b.order),
      priceInr: cfg.priceInr ?? 499,
      tenantId,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load config' });
  }
};

/** GET /public/passport/card/:slug — the shareable, read-only CareerPilot card. */
export const getCard = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ success: false, message: 'Missing slug' });
    const user = await User.findOne({ 'passport.shareSlug': slug }).select('firstName lastName passport').lean() as any;
    if (!user || !user.passport?.active) return res.status(404).json({ success: false, message: 'Passport not found' });

    const p = user.passport;
    res.json({
      success: true,
      card: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'CodeBegun Learner',
        careerScore: p.careerScore ?? null,
        level: p.level || null,
        pathway: p.pathway || null,
        careerGoal: p.careerGoal || null,
        memberSince: p.activatedAt || null,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load card' });
  }
};

/** POST /public/passport/signup — create the account (unverified) and send OTP. */
export const signup = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const tenantId = await resolveTenantId(b.tenant || b.tenantId);
    if (!tenantId) return res.status(400).json({ success: false, message: 'Unknown tenant' });
    const cfg = await ensureConfig(tenantId);
    if (!passportEnabled(tenantId, cfg)) return res.status(503).json({ success: false, message: 'CareerPilot is not available yet.' });

    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const mobile = normalizePhone(b.mobile);
    const fields = b.fields || {};

    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    if (mobile.length < 10) return res.status(400).json({ success: false, message: 'A valid mobile number is required' });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ success: false, message: 'A valid email is required' });
    // Enforce admin-configured required onboarding fields (beyond the locked Name/Mobile/Email).
    for (const f of cfg.onboardingFields || []) {
      if (f.required && !f.locked && !String(fields[f.key] || '').trim()) {
        return res.status(400).json({ success: false, message: `${f.label} is required` });
      }
    }

    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ') || '-';

    let user: any = await User.findOne({ email });
    if (user) {
      // Existing account: only resume if it's a not-yet-active passport signup.
      if (user.passport?.active) return res.status(409).json({ success: false, message: 'You already have a CareerPilot — please log in.' });
      if (!user.passport) return res.status(409).json({ success: false, message: 'This email is already registered. Please log in.' });
    } else {
      user = await User.create({
        email, firstName, lastName, phone: mobile,
        password: crypto.randomBytes(16).toString('hex'), // placeholder; they use OTP login
        role: 'STUDENT', tenantId, isActive: true,
        passport: {
          active: false, product: 'career_passport', onboarded: true,
          degree: fields.degree, yearOfStudy: fields.yearOfStudy, careerGoal: fields.careerGoal, pathway: fields.pathway,
        },
      });
    }

    const otp = await sendOtp(tenantId, String(user._id), mobile);
    res.json({ success: true, token: String(user._id), otp: { sent: otp.sent, channel: otp.channel, devCode: otp.devCode, throttledSeconds: otp.throttledSeconds } });
  } catch (e: any) {
    console.error('[passport] signup failed:', e);
    res.status(500).json({ success: false, message: e.message || 'Signup failed' });
  }
};

/** Issue the standard Passport login payload (JWT + user) for a resolved user. */
function issueLogin(res: Response, user: any) {
  const secret = (process.env.JWT_SECRET || 'secret-key') as string;
  const jwtToken = jwt.sign({ id: user._id, email: user.email, role: user.role, tenantId: user.tenantId }, secret, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') } as any);
  return res.json({
    success: true,
    token: jwtToken,
    tenantId: String(user.tenantId),
    user: { id: String(user._id), email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  });
}

/** POST /public/passport/verify — verify OTP and issue a login token (signup + OTP login). */
export const verify = async (req: Request, res: Response) => {
  try {
    const { token, code } = req.body || {};
    const result = await verifyOtp(String(token), String(code));
    if (result !== 'ok') {
      const msg: any = { invalid: 'Incorrect code', expired: 'Code expired — resend', too_many_attempts: 'Too many attempts — resend', not_found: 'Start over' };
      return res.status(400).json({ success: false, message: msg[result] || 'Verification failed' });
    }
    const user: any = await User.findById(token);
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });
    return issueLogin(res, user);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Verification failed' });
  }
};

/** POST /public/passport/login-password — returning member logs in with email/mobile + password. */
export const loginPassword = async (req: Request, res: Response) => {
  try {
    const { tenant, identifier, password } = req.body || {};
    const tenantId = await resolveTenantId(tenant);
    if (!tenantId) return res.status(400).json({ success: false, message: 'Unknown tenant' });
    if (!identifier || !password) return res.status(400).json({ success: false, message: 'Enter your email/mobile and password.' });

    const id = String(identifier).trim();
    const query: any = id.includes('@')
      ? { tenantId, email: id.toLowerCase() }
      : { tenantId, phone: normalizePhone(id) };
    const user: any = await User.findOne(query);
    if (!user || !user.passport) return res.status(404).json({ success: false, message: 'No CareerPilot found for that email/mobile.' });
    if (!user.passport.passwordSet) return res.status(400).json({ success: false, message: 'You haven’t set a password yet — log in with WhatsApp OTP.', code: 'NO_PASSWORD' });

    const ok = await user.comparePassword(String(password));
    if (!ok) return res.status(401).json({ success: false, message: 'Incorrect password.' });
    return issueLogin(res, user);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Login failed' });
  }
};

/** POST /public/passport/login-otp — returning member requests a WhatsApp OTP by mobile. */
export const loginOtpStart = async (req: Request, res: Response) => {
  try {
    const { tenant, mobile } = req.body || {};
    const tenantId = await resolveTenantId(tenant);
    if (!tenantId) return res.status(400).json({ success: false, message: 'Unknown tenant' });
    const phone = normalizePhone(mobile);
    if (!phone) return res.status(400).json({ success: false, message: 'Enter your registered mobile number.' });

    const user: any = await User.findOne({ tenantId, phone });
    if (!user || !user.passport) return res.status(404).json({ success: false, message: 'No CareerPilot found for that mobile number.' });

    const otp = await sendOtp(tenantId, String(user._id), phone);
    // token = userId so the existing /verify endpoint completes the OTP login.
    res.json({ success: true, token: String(user._id), otp: { sent: otp.sent, channel: otp.channel, devCode: otp.devCode, throttledSeconds: otp.throttledSeconds } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Could not send code' });
  }
};

/** POST /public/passport/resend — resend OTP. */
export const resend = async (req: Request, res: Response) => {
  try {
    const user: any = await User.findById(String((req.body || {}).token)).select('tenantId phone');
    if (!user) return res.status(404).json({ success: false, message: 'Start over' });
    const otp = await sendOtp(String(user.tenantId), String(user._id), user.phone);
    res.json({ success: true, otp: { sent: otp.sent, channel: otp.channel, devCode: otp.devCode, throttledSeconds: otp.throttledSeconds } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Failed to resend' });
  }
};
