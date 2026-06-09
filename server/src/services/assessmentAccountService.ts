import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User';
import LeadSourceConfig from '../models/LeadSourceConfig';
import { getDecryptedTokens } from '../controllers/leadSourceConfigController';
import { IAssessmentSubmission } from '../models/AssessmentSubmission';

/**
 * Auto-creates a Student LMS account for an assessment candidate (v2 flow) and
 * delivers the login credentials over WhatsApp. Idempotent: links to an existing
 * account if the email is already registered, and never creates twice.
 */

async function getWhatsAppCredentials(tenantId: string): Promise<{ phoneNumberId: string; accessToken: string } | null> {
  const sourceConfig = await LeadSourceConfig.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
  if (!sourceConfig) return null;
  const wa = (sourceConfig as any).whatsApp;
  if (!wa?.isConnected || !wa?.config?.phoneNumberId) return null;
  const tokens = await getDecryptedTokens(tenantId);
  const accessToken = tokens?.whatsApp?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) return null;
  return { phoneNumberId: wa.config.phoneNumberId, accessToken };
}

async function sendWhatsAppText(phone: string, message: string, creds: { phoneNumberId: string; accessToken: string }): Promise<boolean> {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
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

const genPassword = () => crypto.randomBytes(4).toString('hex'); // 8-char temp password

/**
 * Ensure a Student account exists for this candidate. Returns the user id.
 * Requires an email (User.email is unique & required). Best-effort credential
 * delivery — never throws.
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
  }

  // Deliver credentials over WhatsApp for freshly created accounts.
  if (plainPassword) {
    const base = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://platform.codebegun.com';
    const msg =
      `🎉 Welcome to CodeBegun! Your account is ready.\n\n` +
      `Login: ${base}/login\nEmail: ${email}\nPassword: ${plainPassword}\n\n` +
      `Track your assessment progress and personalized roadmap from your dashboard.`;
    try {
      const creds = await getWhatsAppCredentials(submission.tenantId);
      if (creds) await sendWhatsAppText(c.phone, msg, creds);
      else console.warn(`[assessment-account] WhatsApp unavailable; account ${email} password: ${plainPassword}`);
    } catch { /* best-effort */ }
  }

  return user._id as mongoose.Types.ObjectId;
}
