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

// Roles we must never silently reset/repurpose when they belong to an active user.
const PRIVILEGED_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STAFF'];

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

/**
 * Ensure a Student account exists for this candidate and that they have working
 * login credentials. Returns the user id. Best-effort delivery — never throws.
 */
export async function ensureCandidateAccount(submission: IAssessmentSubmission): Promise<mongoose.Types.ObjectId | undefined> {
  if (submission.candidateUserId) return submission.candidateUserId as mongoose.Types.ObjectId;

  const c = submission.candidate;
  const email = (c.email || '').toLowerCase().trim();
  if (!email) return undefined; // can't create an account without a unique email

  const tenantOid = new mongoose.Types.ObjectId(submission.tenantId);
  const nameParts = (c.name || '').trim().split(/\s+/);

  let user = await User.findOne({ email });
  let plainPassword: string | undefined;

  if (!user) {
    // Brand-new candidate → fresh STUDENT account.
    plainPassword = genPassword();
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
  } else {
    // Email already exists. Only reuse it as a candidate account if it isn't a
    // real, active privileged user — never hijack a live staff/admin login.
    const isActivePrivileged = user.isActive && PRIVILEGED_ROLES.includes(String(user.role));
    if (isActivePrivileged) {
      console.warn(`[assessment-account] ${email} is an active ${user.role}; linking without resetting credentials.`);
    } else {
      // Make sure the candidate can actually log in as a student.
      plainPassword = genPassword();
      user.password = plainPassword;        // re-hashed by pre-save
      user.isActive = true;
      if (String(user.role) !== 'STUDENT') (user as any).role = 'STUDENT';
      if (c.phone && !user.phone) user.phone = c.phone;
      await user.save();
    }
  }

  // Deliver credentials (email-first, WhatsApp best-effort) when we set a password.
  if (plainPassword) {
    const base = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://platform.codebegun.com').replace(/\/$/, '');
    const loginUrl = `${base}/login`;
    const fullName = `${user.firstName || ''}`.trim();

    // Email — reliable primary channel.
    const emailed = await sendWelcomeEmail(submission.tenantId, email, fullName, plainPassword, loginUrl);

    // WhatsApp — best-effort (delivers only if a session is open / not blocked).
    try {
      const creds = await getWhatsAppCredentials(submission.tenantId);
      if (creds) {
        const msg =
          `🎉 Welcome to CodeBegun! Your account is ready.\n\n` +
          `Login: ${loginUrl}\nEmail: ${email}\nPassword: ${plainPassword}\n\n` +
          `Please change your password after logging in.`;
        await sendWhatsAppText(c.phone, msg, creds);
      }
    } catch { /* best-effort */ }

    if (!emailed) console.warn(`[assessment-account] welcome email not sent for ${email}; password: ${plainPassword}`);
  }

  return user._id as mongoose.Types.ObjectId;
}
