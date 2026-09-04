import { Request, Response } from 'express';
import { normalizePhone, mobileError } from '../utils/phone';
import { resolveCareerProfile } from '../services/careerStageService';
import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Tenant from '../models/Tenant';
import PassportConfig, { DEFAULT_ONBOARDING_FIELDS, DEFAULT_ENTITLEMENTS } from '../models/PassportConfig';
import * as settings from '../services/settingsService';
import { sendOtp, verifyOtp } from '../services/assessmentOtpService';
import { jwtSecret } from '../config/secrets';
import { isCareerPilotMember } from '../services/careerPilotPopulation';
import PendingPassportSignup from '../models/PendingPassportSignup';

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

/**
 * Canonical mobile: national digits only, country code and trunk prefix removed.
 *
 * This used to strip non-digits and stop there, which made "+91 97435 45311" and
 * "9743545311" two DIFFERENT accounts keys for the same person. Registering with the
 * country code and then logging in without it (or the reverse) found no user, so OTP
 * login answered "No CareerPilot found for that mobile number" and never sent a code —
 * and since the set-password nudge only rendered on one screen, an affected member had
 * no second way in at all.
 */

/**
 * Every shape the number may ALREADY be stored as.
 *
 * Canonicalising new writes does nothing for rows written before this fix, so lookups
 * match any of the historical forms rather than only the canonical one. Without this,
 * fixing the normaliser would lock out exactly the members it was meant to rescue.
 */
const phoneVariants = (p: string): string[] => {
  const n = normalizePhone(p);
  return n ? Array.from(new Set([n, `91${n}`, `+91${n}`, `0${n}`])) : [];
};

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
    // `< 10` accepted anything longer, so a pasted +91 number sailed through as twelve
    // digits and became a second identity for the same person.
    const mobErr = mobileError(b.mobile);
    if (mobErr) return res.status(400).json({ success: false, message: mobErr });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ success: false, message: 'A valid email is required' });
    // Enforce admin-configured required onboarding fields (beyond the locked Name/Mobile/Email).
    for (const f of cfg.onboardingFields || []) {
      if (f.required && !f.locked && !String(fields[f.key] || '').trim()) {
        return res.status(400).json({ success: false, message: `${f.label} is required` });
      }
    }

    /**
     * NOTHING IS CREATED HERE. The account begins to exist at verification, not now.
     *
     * This block used to User.create() the member before the OTP had even been sent. An
     * abandoned or failed signup therefore left a real account behind, and since one mobile
     * may own only one account, that number was claimed permanently — the member came back,
     * typed the same number, and was told it "is already registered", blocked by their own
     * failed attempt with no way to clear it. It also meant anyone could burn a stranger's
     * mobile by typing it into the form.
     *
     * A CONFLICT NOW ONLY COUNTS IF THE OTHER ACCOUNT IS PROVED. An unverified row holds no
     * claim on an email or a number: whoever proves ownership first gets it. That is what
     * clears the accounts the old flow already stranded, without deleting anything.
     */
    const proved = (u: any): boolean => !!(u?.passport?.verifiedAt || u?.passport?.active);

    // ONE MOBILE, ONE ACCOUNT — but only against an account somebody actually proved.
    const phoneOwner: any = await User.findOne({ phone: mobile, tenantId })
      .select('email passport.verifiedAt passport.active').lean();
    if (phoneOwner && proved(phoneOwner) && String(phoneOwner.email || '').toLowerCase() !== email) {
      const masked = String(phoneOwner.email || '').replace(/^(.{2})[^@]*(@.*)$/, '$1•••$2');
      return res.status(409).json({
        success: false,
        message: `This mobile number is already registered${masked ? ` to ${masked}` : ''}. Please log in with that account, or use a different number.`,
      });
    }

    const emailOwner: any = await User.findOne({ email })
      .select('passport role').lean();
    if (emailOwner) {
      /**
       * A finished signup is sent to log in. `verifiedAt` is the honest marker: `active`
       * alone means "has paid", so a member who had verified and onboarded but never
       * purchased was previously walked back through the whole funnel.
       */
      if (proved(emailOwner)) {
        return res.status(409).json({ success: false, message: 'You already have a CareerPilot — please log in.' });
      }
      /**
       * An existing account that is not a CareerPilot signup must log in instead.
       *
       * Every LMS student has a passport subdocument from the nested defaults, so this
       * cannot be `if (!user.passport)` — that guard never fired, and an ordinary student's
       * email fell through to a branch that overwrote their phone with the one typed here
       * and sent the OTP to it, handing the sender a login to somebody else's account.
       */
      if (!isCareerPilotMember(emailOwner.passport)) {
        return res.status(409).json({ success: false, message: 'This email is already registered. Please log in.' });
      }
    }

    /**
     * One live attempt per person, replaced rather than accumulated, so retrying the form
     * does not leave a trail of pending rows for the same number.
     */
    const token = crypto.randomBytes(24).toString('hex');
    await PendingPassportSignup.deleteMany({ tenantId, $or: [{ email }, { mobile }] });
    await PendingPassportSignup.create({
      token, tenantId, email, mobile, name, fields,
      // Longer than the OTP's ten minutes, so an expired code can be resent against the
      // same pending row instead of sending the member back to a form they have filled in.
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    const otp = await sendOtp(tenantId, token, mobile);
    res.json({ success: true, token, otp: { sent: otp.sent, channel: otp.channel, devCode: otp.devCode, throttledSeconds: otp.throttledSeconds } });
  } catch (e: any) {
    console.error('[passport] signup failed:', e);
    res.status(500).json({ success: false, message: e.message || 'Signup failed' });
  }
};

/** Issue the standard Passport login payload (JWT + user) for a resolved user. */
function issueLogin(res: Response, user: any) {
  // Refuse deactivated accounts HERE, so every login path (OTP verify, password,
  // OTP re-login) is covered by one check.
  //
  // Without it the funnel dead-ends in a way that looks like a broken product:
  // the OTP is accepted, a valid JWT is issued, the browser stores it and
  // reloads — and then AuthContext re-reads the account, sees isActive false and
  // wipes the session, dropping the member on /login with no explanation. Say no
  // at the door instead of one screen later.
  if (user.isActive === false) {
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_DEACTIVATED',
      message: 'This account has been deactivated. Please contact support.',
    });
  }
  // What "gone quiet" is measured from. Fire-and-forget: a failed write here must
  // never cost someone their login.
  if (user.passport) {
    User.updateOne({ _id: user._id }, { $set: { 'passport.lastSeenAt': new Date() } })
      .catch(() => { /* best effort */ });
  }

  const secret = jwtSecret();
  const jwtToken = jwt.sign({ id: user._id, email: user.email, role: user.role, tenantId: user.tenantId }, secret, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') } as any);
  return res.json({
    success: true,
    token: jwtToken,
    tenantId: String(user.tenantId),
    user: { id: String(user._id), email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
    // Where to land. A member who has finished onboarding goes to their dashboard; one who
    // has not is sent to setup rather than a dashboard whose panels have nothing to show.
    // Server-stated so the client never infers it from a partial view of the record.
    onboardingCompleted: !!user.passport?.contextCompletedAt,
  });
}

/**
 * Turn a proved pending signup into a real account.
 *
 * REUSES A STRANDED ROW RATHER THAN DELETING IT. The old flow created accounts before
 * verification, so unverified rows are already sitting on real emails and mobiles in
 * production. Deleting them would be the obvious way to clear the path and the wrong one —
 * these are `users` documents, and a delete keyed on the wrong condition removes people.
 * An unverified row has nothing worth keeping and no claim on anything, so it is written
 * over in place: same document, the answers just proved, and now stamped verified.
 *
 * Matched by email first and mobile second, because the email is what the member typed as
 * their identity; a stale row under a different email that happens to hold this mobile is
 * the second-best match and is taken over the same way.
 */
async function materialiseSignup(pending: any): Promise<any> {
  const { tenantId, email, mobile, name, fields } = pending;
  const [firstName, ...rest] = String(name || '').split(' ');
  const lastName = rest.join(' ') || '-';
  const now = new Date();

  const passportFields = {
    active: false, product: 'career_passport', onboarded: true, verifiedAt: now,
    degree: fields.degree, yearOfStudy: fields.yearOfStudy, careerGoal: fields.careerGoal, pathway: fields.pathway,
    // Career staging. Stored raw AND derived: the raw inputs are the fact, `stage` is a
    // cached read of them that is recomputed on every login so a member advances from
    // foundation to placement without anyone editing them.
    program: fields.program, branch: fields.branch,
    graduationMonth: fields.graduationMonth ? Number(fields.graduationMonth) : undefined,
    graduationYear: fields.graduationYear ? Number(fields.graduationYear) : undefined,
    graduated: fields.graduated === true || fields.graduated === 'true',
    ...resolveCareerProfile({
      degree: fields.degree, yearOfStudy: fields.yearOfStudy,
      program: fields.program, branch: fields.branch,
      graduationMonth: fields.graduationMonth ? Number(fields.graduationMonth) : null,
      graduationYear: fields.graduationYear ? Number(fields.graduationYear) : null,
      graduated: fields.graduated === true || fields.graduated === 'true',
    }),
  };

  const stranded: any =
    await User.findOne({ email })
    || await User.findOne({ tenantId, phone: mobile });

  // Only a row nobody ever proved may be taken over. Anything else is a real account and
  // signup refused it long before this point.
  if (stranded && !stranded.passport?.verifiedAt && !stranded.passport?.active) {
    stranded.email = email;
    stranded.phone = mobile;
    stranded.firstName = firstName;
    stranded.lastName = lastName;
    stranded.isActive = true;
    stranded.passport = { ...(stranded.passport?.toObject?.() || stranded.passport || {}), ...passportFields };
    await stranded.save();
    return stranded;
  }

  return User.create({
    email, firstName, lastName, phone: mobile,
    password: crypto.randomBytes(16).toString('hex'), // placeholder; they use OTP login
    role: 'STUDENT', tenantId, isActive: true,
    passport: passportFields,
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
    /**
     * THE ACCOUNT IS BORN HERE, for a signup.
     *
     * Two kinds of token reach this endpoint: a pending signup (random, from /signup) and a
     * user id (from /login-otp, where the account already exists). A pending row means the
     * member has just proved the number, so this is the first moment there is anything to
     * create.
     */
    const pending: any = await PendingPassportSignup.findOne({ token }).lean();
    if (pending) {
      const user = await materialiseSignup(pending);
      await PendingPassportSignup.deleteOne({ token });
      return issueLogin(res, user);
    }

    // A signup token is 48 hex characters, not an ObjectId, so findById would throw a
    // CastError and surface as a 500. If the pending row has expired the honest answer is
    // "start over", which is what the funnel already knows how to handle.
    const user: any = mongoose.isValidObjectId(token) ? await User.findById(token) : null;
    if (!user) {
      return res.status(404).json({
        success: false,
        message: mongoose.isValidObjectId(token) ? 'Account not found' : 'Your signup expired — please start over.',
      });
    }
    // The moment they proved they own the number. Only stamped once — it marks when
    // they crossed out of "signed up but unverified", not the most recent OTP.
    if (user.passport && !user.passport.verifiedAt) {
      user.passport.verifiedAt = new Date();
      await user.save();
    }
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
      : { tenantId, phone: { $in: phoneVariants(id) } };
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

    const user: any = await User.findOne({ tenantId, phone: { $in: phoneVariants(mobile) } });
    if (!user || !user.passport) return res.status(404).json({ success: false, message: 'No CareerPilot found for that mobile number.' });

    // Canonicalise the stored value on the way past, so a row written before this fix
    // stops needing the variant match on every future login.
    if (user.phone !== phone) { user.phone = phone; await user.save(); }

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
    const token = String((req.body || {}).token || '');

    /**
     * A signup token names a pending row, not an account — during signup there is no user
     * to look up any more. Checked first because it is the shorter-lived of the two, and a
     * random hex token can never collide with an ObjectId lookup anyway.
     */
    const pending: any = await PendingPassportSignup.findOne({ token }).select('tenantId mobile').lean();
    if (pending) {
      const otp = await sendOtp(String(pending.tenantId), token, pending.mobile);
      return res.json({ success: true, otp: { sent: otp.sent, channel: otp.channel, devCode: otp.devCode, throttledSeconds: otp.throttledSeconds } });
    }

    // findById throws on a non-ObjectId string, which a signup token is; a resend arriving
    // after the pending row has expired must read as "start over", not a 500.
    const user: any = mongoose.isValidObjectId(token)
      ? await User.findById(token).select('tenantId phone')
      : null;
    if (!user) return res.status(404).json({ success: false, message: 'Start over' });
    const otp = await sendOtp(String(user.tenantId), String(user._id), user.phone);
    res.json({ success: true, otp: { sent: otp.sent, channel: otp.channel, devCode: otp.devCode, throttledSeconds: otp.throttledSeconds } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Failed to resend' });
  }
};
