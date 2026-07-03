import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User';
import LeadSourceConfig from '../models/LeadSourceConfig';
import { getDecryptedTokens } from '../controllers/leadSourceConfigController';
import { IAssessmentSubmission } from '../models/AssessmentSubmission';
import { EmailService } from './emailService';

/**
 * Auto-creates (or safely reuses) a Student LMS account for an assessment
 * candidate and delivers the login credentials.
 *
 * Credential delivery is EMAIL-first (reliable) with a best-effort WhatsApp
 * message. Email collisions are handled so the candidate can always log in:
 * an existing account is activated, made a STUDENT and given a fresh password —
 * UNLESS it's a real, active privileged account (staff/admin), which we never
 * hijack or reset (we just link to it and log a warning).
 */

const genPassword = () => crypto.randomBytes(4).toString('hex'); // 8-char temp password

async function getWhatsAppCredentials(tenantId: string): Promise<{ phoneNumberId: string; accessToken: string } | null> {
  // 1) CRM Lead-Source WhatsApp connection
  try {
    const sourceConfig = await LeadSourceConfig.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
    const wa = (sourceConfig as any)?.whatsApp;
    if (wa?.isConnected && wa?.config?.phoneNumberId) {
      const tokens = await getDecryptedTokens(tenantId);
      const accessToken = tokens?.whatsApp?.accessToken || '';
      if (accessToken) return { phoneNumberId: wa.config.phoneNumberId, accessToken };
    }
  } catch { /* fall through to env */ }
  // 2) Platform Settings / env fallback
  const pid = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const tok = process.env.WHATSAPP_ACCESS_TOKEN || '';
  if (pid && tok) return { phoneNumberId: pid, accessToken: tok };
  return null;
}

async function sendWhatsAppText(phone: string, message: string, creds: { phoneNumberId: string; accessToken: string }): Promise<boolean> {
  const cleanPhone = (phone || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
  if (!cleanPhone) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: cleanPhone, type: 'text', text: { body: message } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Returning-user email — they already have an account, so log in (no new password). */
async function sendReturningUserEmail(tenantId: string, email: string, name: string, loginUrl: string, forgotUrl: string): Promise<boolean> {
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px">
      <div style="font-weight:800;color:#051D64;font-size:20px;margin-bottom:14px">CodeBegun</div>
      <h2 style="font-size:19px;color:#0f172a;margin:0 0 8px">Your new plan is ready${name ? `, ${name}` : ''}! 🎉</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">Good news — you already have a CodeBegun account. Your fresh assessment result and personalized plan have been added to it. Just <b>log in with your existing login</b> to start.</p>
      <div style="text-align:center;margin:22px 0 8px">
        <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:10px">Log in &amp; view your plan →</a>
      </div>
      <p style="color:#94a3b8;font-size:12.5px;line-height:1.5;margin-top:16px;text-align:center">Forgot your password? <a href="${forgotUrl}" style="color:#6650d8">Reset it here</a>.</p>
    </div>
  </div>`;
  const text = `Your new CodeBegun plan is ready!\n\nYou already have an account — log in to view it: ${loginUrl}\nForgot your password? Reset it: ${forgotUrl}`;
  try {
    return await new EmailService(tenantId).sendGenericEmail(email, 'Your new CodeBegun plan is ready — log in', html, text);
  } catch {
    return false;
  }
}

/** Reliable welcome email with login details (username + temp password + link). */
async function sendWelcomeEmail(tenantId: string, email: string, name: string, password: string, loginUrl: string): Promise<boolean> {
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px">
      <div style="font-weight:800;color:#051D64;font-size:20px;margin-bottom:14px">CodeBegun</div>
      <h2 style="font-size:19px;color:#0f172a;margin:0 0 8px">Welcome${name ? `, ${name}` : ''}! 🎉</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">Your account is ready. Log in to start your personalized plan — your first lessons, a DSA problem and a sample mock interview are free.</p>
      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:16px;font-size:14px;color:#0f172a">
        <div style="margin-bottom:6px"><b>Email:</b> ${email}</div>
        <div><b>Temporary password:</b> <code style="background:#eef2ff;padding:2px 8px;border-radius:6px">${password}</code></div>
      </div>
      <div style="text-align:center;margin:22px 0 8px">
        <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:10px">Log in &amp; start →</a>
      </div>
      <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin-top:16px">For your security, please change this password after your first login. If you didn't request this, you can ignore this email.</p>
    </div>
  </div>`;
  const text = `Welcome to CodeBegun!\n\nLog in: ${loginUrl}\nEmail: ${email}\nTemporary password: ${password}\n\nPlease change your password after logging in.`;
  try {
    return await new EmailService(tenantId).sendGenericEmail(email, 'Your CodeBegun login details', html, text);
  } catch {
    return false;
  }
}

export interface CandidateAccountResult { userId: mongoose.Types.ObjectId; isNew: boolean; }

/**
 * Ensure the candidate has a usable account and gets the right message.
 *  - NEW email  → create a fresh STUDENT account + email login credentials.
 *  - EXISTING   → attach the assessment result/plan to their account and send a
 *                 "your new plan is ready — log in with your existing account"
 *                 email (+ password-reset link). We NEVER reset an existing
 *                 password, so their normal login is untouched. This lets
 *                 existing students re-assess without any login disruption.
 * Returns { userId, isNew }. Best-effort delivery — never throws.
 */
export async function ensureCandidateAccount(submission: IAssessmentSubmission): Promise<CandidateAccountResult | undefined> {
  if (submission.candidateUserId) return { userId: submission.candidateUserId as mongoose.Types.ObjectId, isNew: false };

  const c = submission.candidate;
  const email = (c.email || '').toLowerCase().trim();
  if (!email) return undefined; // can't create an account without a unique email

  const tenantOid = new mongoose.Types.ObjectId(submission.tenantId);
  const nameParts = (c.name || '').trim().split(/\s+/);
  const base = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://platform.codebegun.com').replace(/\/$/, '');
  const loginUrl = `${base}/login`;
  const forgotUrl = `${base}/forgot-password`;

  let user = await User.findOne({ email });
  let isNew = false;

  if (!user) {
    // Brand-new candidate → fresh STUDENT account + credentials.
    isNew = true;
    const plainPassword = genPassword();
    user = await User.create({
      email,
      firstName: c.firstName || nameParts[0] || 'Candidate',
      lastName: c.lastName || nameParts.slice(1).join(' ') || '-',
      password: plainPassword, // hashed by the User pre-save hook
      role: 'STUDENT',
      tenantId: tenantOid,
      phone: c.phone,
      isActive: true,
      profileComplete: false,
    });
    const fullName = `${user.firstName || ''}`.trim();
    const emailed = await sendWelcomeEmail(submission.tenantId, email, fullName, plainPassword, loginUrl);
    // WhatsApp credentials — best-effort (delivers only if a session is open).
    try {
      const creds = await getWhatsAppCredentials(submission.tenantId);
      if (creds) {
        const msg = `🎉 Welcome to CodeBegun! Your account is ready.\n\nLogin: ${loginUrl}\nEmail: ${email}\nPassword: ${plainPassword}\n\nPlease change your password after logging in.`;
        await sendWhatsAppText(c.phone, msg, creds);
      }
    } catch { /* best-effort */ }
    if (!emailed) console.warn(`[assessment-account] welcome email not sent for ${email}; password: ${plainPassword}`);
  } else {
    // EXISTING account (student / staff / admin) → attach only, never reset.
    // Reactivate a dormant one so they can log in (via reset if needed), but
    // leave the password and role alone so their normal login keeps working.
    let touched = false;
    if (!user.isActive) { user.isActive = true; touched = true; }
    if (c.phone && !user.phone) { user.phone = c.phone; touched = true; }
    if (touched) await user.save();
    console.log(`[assessment-account] ${email} already has an account (${user.role}) — attaching plan, no credential reset.`);
    await sendReturningUserEmail(submission.tenantId, email, (user.firstName || '').trim(), loginUrl, forgotUrl);
    // Best-effort WhatsApp nudge (no password — just "log in").
    try {
      const creds = await getWhatsAppCredentials(submission.tenantId);
      if (creds) {
        const msg = `🎉 Your new CodeBegun plan is ready! You already have an account — just log in to view it: ${loginUrl}\n\nForgot your password? Reset it: ${forgotUrl}`;
        await sendWhatsAppText(c.phone, msg, creds);
      }
    } catch { /* best-effort */ }
  }

  return { userId: user._id as mongoose.Types.ObjectId, isNew };
}
