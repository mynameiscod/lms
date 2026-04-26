import mongoose from 'mongoose';
import LeadSourceConfig from '../models/LeadSourceConfig';
import { getDecryptedTokens } from '../controllers/leadSourceConfigController';

// Map lead source strings to LeadSourceConfig top-level keys
function mapSourceKey(source: string): string | null {
  const mapping: Record<string, string> = {
    walkin: 'walkin',
    walk_in: 'walkin',
    'walk-in': 'walkin',
    website_form: 'websiteForm',
    website: 'websiteForm',
    form: 'websiteForm',
    meta_form: 'metaAds',
    meta_ads: 'metaAds',
    facebook: 'metaAds',
    whatsapp: 'whatsApp',
    google_ads: 'googleAds',
    google: 'googleAds',
    referral: 'referral',
    google_sheet: 'googleSheet',
    csv: 'googleSheet',
    other: null,
  };
  return mapping[source?.toLowerCase()] ?? null;
}

/**
 * Send a WhatsApp welcome message to a newly created lead.
 * Reads autoActions.sendWhatsAppWelcome and whatsAppWelcomeTemplate from the source config.
 * Only fires when the WhatsApp source is connected for this tenant.
 */
export async function sendLeadWelcomeWhatsApp(
  leadName: string,
  leadPhone: string,
  leadSource: string,
  tenantId: mongoose.Types.ObjectId | string
): Promise<void> {
  if (!leadPhone) return;

  const tenantObjId = typeof tenantId === 'string'
    ? new mongoose.Types.ObjectId(tenantId)
    : tenantId;

  try {
    // 1. Get the tenant's lead source config
    const sourceConfig = await LeadSourceConfig.findOne({ tenantId: tenantObjId }).lean();
    if (!sourceConfig) return;

    // 2. Check auto-actions for the specific source
    const sourceKey = mapSourceKey(leadSource);
    let sendWelcome = false;
    let template = '';

    if (sourceKey && (sourceConfig as any)[sourceKey]?.autoActions?.sendWhatsAppWelcome) {
      sendWelcome = true;
      template = (sourceConfig as any)[sourceKey].autoActions.whatsAppWelcomeTemplate || '';
    }

    if (!sendWelcome || !template) return;

    // 3. Check WhatsApp is connected and get credentials
    if (!(sourceConfig as any).whatsApp?.isConnected) return;
    const phoneNumberId = (sourceConfig as any).whatsApp?.config?.phoneNumberId;
    if (!phoneNumberId) return;

    // 4. Get decrypted access token
    const tokens = await getDecryptedTokens(tenantObjId.toString());
    const accessToken = tokens?.whatsApp?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    if (!accessToken) return;

    // 5. Render template — replace {{name}} placeholder
    const message = template.replace(/\{\{name\}\}/gi, leadName || 'there');

    // 6. Clean phone (ensure E.164-like — no dashes/spaces)
    const cleanPhone = leadPhone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) return;

    // 7. Call WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: message },
        }),
      }
    );

    if (response.ok) {
      console.log(`[WELCOME-WA] Sent welcome to ${leadName} (${cleanPhone}) for source "${leadSource}"`);
    } else {
      const errText = await response.text();
      console.error(`[WELCOME-WA] API error for ${cleanPhone}:`, errText);
    }
  } catch (err) {
    console.error('[WELCOME-WA] Error sending welcome message:', err);
  }
}
