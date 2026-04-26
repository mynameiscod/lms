import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import { scoreAndAssignLead } from '../services/leadScoringService';
import { sendLeadWelcomeWhatsApp } from '../services/whatsAppWelcomeService';

// ── Interfaces matching Google Lead Form webhook payload ─────────────────────

interface GoogleColumnData {
  column_id: string;    // e.g. "FULL_NAME", "PHONE_NUMBER", "EMAIL", custom IDs
  string_value: string;
}

interface GoogleLeadPayload {
  google_key: string;   // Configured webhook key for verification
  lead_id: string;
  campaign_id?: string;
  adgroup_id?: string;
  creative_id?: string;
  gcl_id?: string;      // Google Click ID (GCLID)
  is_test?: boolean;
  api_version?: string;
  user_column_data: GoogleColumnData[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractField(columns: GoogleColumnData[], ...ids: string[]): string {
  for (const id of ids) {
    const col = columns.find((c) => c.column_id.toUpperCase() === id.toUpperCase());
    if (col?.string_value?.trim()) return col.string_value.trim();
  }
  return '';
}

function extractPhone(columns: GoogleColumnData[]): string {
  return extractField(columns, 'PHONE_NUMBER', 'PHONE', 'MOBILE');
}

function extractCourseFromColumns(columns: GoogleColumnData[]): string[] {
  const val = extractField(columns, 'COURSE', 'COURSE_INTEREST', 'PROGRAM', 'INTERESTED_IN');
  if (!val) return [];
  // Could be comma-separated
  return val.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Verify that the request came from Google using HMAC-SHA256.
 * Google signs the body with the configured key.
 * Webhook key is stored in env: GOOGLE_ADS_WEBHOOK_KEY
 */
function verifyGoogleSignature(req: Request): boolean {
  const expectedKey = process.env.GOOGLE_ADS_WEBHOOK_KEY;
  if (!expectedKey) return true;  // Skip verification if not configured (dev mode)

  const signature = req.headers['x-goog-signature'] as string;
  if (!signature) return false;

  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', expectedKey).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/google-leads/webhook
 * Public endpoint — no auth, verified by HMAC or google_key match.
 */
export const handleGoogleLeadWebhook = async (req: Request, res: Response) => {
  try {
    // Verify webhook key OR HMAC signature
    const body: GoogleLeadPayload = req.body;
    const configuredKey = process.env.GOOGLE_ADS_WEBHOOK_KEY;

    if (configuredKey) {
      const keyMatch = body.google_key === configuredKey;
      const sigValid = verifyGoogleSignature(req);
      if (!keyMatch && !sigValid) {
        return res.status(401).json({ success: false, message: 'Invalid webhook key' });
      }
    }

    // Skip test leads unless in development
    if (body.is_test && process.env.NODE_ENV === 'production') {
      return res.status(200).json({ success: true, message: 'Test lead ignored in production' });
    }

    const columns = body.user_column_data || [];
    const name    = extractField(columns, 'FULL_NAME', 'FIRST_NAME', 'NAME') || 'Google Lead';
    const phone   = extractPhone(columns);
    const email   = extractField(columns, 'EMAIL', 'EMAIL_ADDRESS');
    const courses = extractCourseFromColumns(columns);
    const city    = extractField(columns, 'CITY', 'LOCATION');

    if (!phone && !email) {
      return res.status(400).json({ success: false, message: 'No phone or email in lead data' });
    }

    // Determine tenant: either from subdomain header, query param, or default
    // For multi-tenant: the webhook URL should include tenantId as a path param
    // or the GOOGLE_ADS_DEFAULT_TENANT_ID env var is used for single-tenant setups
    const tenantId = (req as any).tenantId || process.env.GOOGLE_ADS_DEFAULT_TENANT_ID;
    if (!tenantId) {
      console.error('[GOOGLE-LEADS] No tenantId resolved for Google Lead webhook');
      return res.status(400).json({ success: false, message: 'Could not resolve tenant' });
    }

    // Duplicate check by phone
    if (phone) {
      const lastTen = phone.replace(/\D/g, '').slice(-10);
      const existing = await Lead.findOne({ tenantId, phone: { $regex: lastTen + '$' } }).lean();
      if (existing) {
        // Append a note that Google Ads lead came in again
        await Lead.updateOne({ _id: (existing as any)._id }, {
          $push: {
            activities: {
              type: 'note',
              description: `[Google Ads] Re-submitted lead form. Campaign: ${body.campaign_id || 'unknown'}, Ad group: ${body.adgroup_id || 'unknown'}`,
              createdAt: new Date(),
            },
          },
        });
        return res.status(200).json({ success: true, message: 'Existing lead updated', data: { leadId: (existing as any)._id, duplicate: true } });
      }
    }

    // Get first stage for this tenant
    const firstStage = await LeadStage.findOne({ tenantId, isActive: true }).sort({ order: 1 }).lean();
    if (!firstStage) {
      console.error('[GOOGLE-LEADS] No lead stages configured for tenant', tenantId);
      return res.status(500).json({ success: false, message: 'Lead stages not configured' });
    }

    // Build customFields
    const customFields: Record<string, string> = {};
    if (body.gcl_id) customFields['gclid'] = body.gcl_id;
    if (body.campaign_id) customFields['google_campaign_id'] = body.campaign_id;
    if (body.adgroup_id) customFields['google_adgroup_id'] = body.adgroup_id;
    if (city) customFields['city'] = city;

    // Extra columns as custom fields
    const standardIds = new Set(['FULL_NAME', 'FIRST_NAME', 'NAME', 'PHONE_NUMBER', 'PHONE', 'MOBILE', 'EMAIL', 'EMAIL_ADDRESS', 'COURSE', 'COURSE_INTEREST', 'PROGRAM', 'INTERESTED_IN', 'CITY', 'LOCATION']);
    for (const col of columns) {
      if (!standardIds.has(col.column_id.toUpperCase()) && col.string_value) {
        customFields[col.column_id.toLowerCase()] = col.string_value;
      }
    }

    const lead = await Lead.create({
      tenantId,
      name,
      phone: phone || '',
      email: email || undefined,
      courseInterest: courses,
      source: 'google_ads',
      stageId: (firstStage as any)._id,
      utmParams: {
        utmCampaign: body.campaign_id,
        utmSource: 'google',
        utmMedium: 'cpc',
      },
      customFields,
      activities: [
        {
          type: 'note',
          description: `Lead created from Google Ads Lead Form. Lead ID: ${body.lead_id}. Campaign: ${body.campaign_id || 'unknown'}`,
          createdAt: new Date(),
        },
      ],
    });

    // Fire-and-forget: score + assign + welcome WA
    scoreAndAssignLead(lead, tenantId).catch(console.error);
    if (phone) sendLeadWelcomeWhatsApp(name, phone, 'google_ads', tenantId).catch(console.error);

    console.log(`[GOOGLE-LEADS] Lead created: ${name} (${phone || email}), leadId=${lead._id}`);

    res.status(201).json({ success: true, message: 'Lead created from Google Ads', data: { leadId: lead._id } });
  } catch (error: any) {
    console.error('[GOOGLE-LEADS] Webhook error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/v1/google-leads/webhook  (Google verification ping)
 * Google sends a GET request to verify the webhook URL is reachable.
 */
export const verifyGoogleWebhook = async (req: Request, res: Response) => {
  res.status(200).send('OK');
};
