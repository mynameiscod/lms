import { Request, Response } from 'express';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import mongoose from 'mongoose';
import https from 'https';

// ===================== TYPES =====================

interface MetaLeadgenPayload {
  object: string;
  entry: Array<{
    id: string; // Page ID
    time: number;
    changes: Array<{
      value: {
        form_id: string;
        leadgen_id: string;
        created_time: number;
        page_id: string;
        adgroup_id?: string;
        ad_id?: string;
        campaign_id?: string;
      };
      field: string; // 'leadgen'
    }>;
  }>;
}

interface MetaLeadData {
  id: string;
  created_time: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  form_name?: string;
}

// ===================== HELPER: Fetch Lead Data from Meta Graph API =====================

function fetchLeadFromMeta(leadgenId: string, accessToken: string): Promise<MetaLeadData> {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`;

    https.get(url, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`Meta API Error: ${parsed.error.message}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse Meta response: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// ===================== HELPER: Extract field values from Meta lead data =====================

function extractFieldValue(fieldData: MetaLeadData['field_data'], fieldName: string): string | undefined {
  // Meta uses various field names, try common variations
  const variations: Record<string, string[]> = {
    name: ['full_name', 'name', 'first_name'],
    firstName: ['first_name', 'name'],
    lastName: ['last_name', 'surname'],
    email: ['email', 'email_address', 'work_email'],
    phone: ['phone_number', 'phone', 'mobile_number', 'mobile', 'contact_number'],
    city: ['city', 'location'],
    course: ['course', 'course_interested', 'interested_course', 'program'],
  };

  const namesToSearch = variations[fieldName] || [fieldName];

  for (const name of namesToSearch) {
    const field = fieldData.find(f => f.name.toLowerCase() === name.toLowerCase());
    if (field && field.values && field.values.length > 0) {
      return field.values[0];
    }
  }
  return undefined;
}

// ===================== WEBHOOK VERIFICATION (GET) =====================

export const verifyMetaLeadWebhook = async (req: Request, res: Response) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.META_LEAD_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || 'codebegun_whatsapp_verify';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Meta Lead Ads webhook verified');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Meta Lead Ads verification failed:', { mode, token });
      res.status(403).json({ error: 'Verification failed' });
    }
  } catch (error: any) {
    console.error('❌ Meta Lead webhook verify error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===================== WEBHOOK HANDLER (POST) =====================

export const handleMetaLeadWebhook = async (req: Request, res: Response) => {
  try {
    const payload: MetaLeadgenPayload = req.body;

    console.log('📋 Meta Lead Ads webhook received:', JSON.stringify(payload, null, 2));

    // Always respond 200 quickly
    res.status(200).send('EVENT_RECEIVED');

    // Process asynchronously
    processMetaLeadPayload(payload).catch(err => {
      console.error('❌ Meta Lead processing error:', err);
    });
  } catch (error: any) {
    console.error('❌ Meta Lead webhook error:', error);
    res.status(200).send('EVENT_RECEIVED');
  }
};

// ===================== PROCESS LEAD PAYLOAD =====================

async function processMetaLeadPayload(payload: MetaLeadgenPayload) {
  if (payload.object !== 'page') {
    console.log('⚠️ Ignoring non-page event:', payload.object);
    return;
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'leadgen') {
        console.log('⚠️ Ignoring non-leadgen field:', change.field);
        continue;
      }

      const { leadgen_id, form_id, ad_id, campaign_id } = change.value;

      console.log('🔄 Processing Meta lead:', { leadgen_id, form_id, ad_id, campaign_id });

      try {
        await fetchAndCreateLead(leadgen_id, {
          formId: form_id,
          adId: ad_id,
          campaignId: campaign_id,
          pageId: entry.id,
        });
      } catch (err) {
        console.error(`❌ Failed to process lead ${leadgen_id}:`, err);
      }
    }
  }
}

// ===================== FETCH FROM META & CREATE LEAD =====================

async function fetchAndCreateLead(
  leadgenId: string,
  meta: { formId?: string; adId?: string; campaignId?: string; pageId?: string }
) {
  // Use PAGE_ACCESS_TOKEN (page-level token) for fetching lead data
  const accessToken = process.env.PAGE_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('❌ No PAGE_ACCESS_TOKEN or WHATSAPP_ACCESS_TOKEN configured');
    return;
  }

  // Fetch full lead data from Meta Graph API
  console.log('📡 Fetching lead data from Meta for:', leadgenId);
  const leadData = await fetchLeadFromMeta(leadgenId, accessToken);
  console.log('📋 Meta lead data:', JSON.stringify(leadData, null, 2));

  // Extract fields
  const name = extractFieldValue(leadData.field_data, 'name')
    || [extractFieldValue(leadData.field_data, 'firstName'), extractFieldValue(leadData.field_data, 'lastName')].filter(Boolean).join(' ')
    || 'Unknown';

  const phone = extractFieldValue(leadData.field_data, 'phone') || '';
  const email = extractFieldValue(leadData.field_data, 'email') || '';
  const city = extractFieldValue(leadData.field_data, 'city') || '';
  const course = extractFieldValue(leadData.field_data, 'course') || '';

  // Clean phone number
  const cleanPhone = phone.replace(/[^0-9+]/g, '').replace(/^\+91/, '').replace(/^91/, '');

  if (!cleanPhone) {
    console.error('❌ No phone number found in Meta lead data');
    return;
  }

  const tenantId = process.env.DEFAULT_TENANT_ID;
  if (!tenantId) {
    console.error('❌ DEFAULT_TENANT_ID not configured');
    return;
  }

  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

  // Check for duplicate by phone number
  const existingLead = await Lead.findOne({
    tenantId: tenantObjectId,
    phone: { $regex: cleanPhone.slice(-10) + '$' }
  });

  if (existingLead) {
    console.log('📌 Lead already exists for phone:', cleanPhone, '- Updating activity');

    // Update existing lead with $push for activity and $set for metadata
    await Lead.updateOne(
      { _id: existingLead._id },
      {
        $push: {
          activities: {
            type: 'note',
            description: `New Meta Lead Form submission (Form: ${meta.formId || 'N/A'}, Campaign: ${meta.campaignId || 'N/A'})`,
            performedBy: existingLead.assignedTo || existingLead.createdBy,
            createdAt: new Date()
          }
        },
        $set: {
          sourceDetails: {
            platform: 'meta',
            formId: meta.formId,
            adId: meta.adId,
            campaignName: leadData.campaign_name,
          },
          updatedAt: new Date()
        }
      }
    );

    console.log('✅ Existing lead updated:', existingLead._id);
    return;
  }

  // Get default stage
  let defaultStage = await LeadStage.findOne({
    tenantId: tenantObjectId,
    $or: [{ name: /new/i }, { order: 1 }]
  }).sort({ order: 1 });

  if (!defaultStage) {
    defaultStage = await LeadStage.findOne({ tenantId: tenantObjectId }).sort({ order: 1 });
  }

  // Create new lead
  const newLead = new Lead({
    tenantId: tenantObjectId,
    name: name,
    phone: cleanPhone,
    email: email,
    source: 'meta_form',
    priority: 'warm', // Meta form leads are warm (they actively filled a form)
    stageId: defaultStage?._id,
    location: city,
    courseInterest: course ? [course] : [],
    sourceDetails: {
      platform: 'meta',
      formId: meta.formId,
      adId: meta.adId,
      campaignName: leadData.campaign_name,
      adSetName: leadData.adset_name,
      adName: leadData.ad_name,
    },
    utmParams: {
      source: 'facebook',
      medium: 'paid',
      campaign: leadData.campaign_name || meta.campaignId,
    },
    activityLog: [{
      type: 'created',
      description: `Lead created from Meta Lead Form (${leadData.form_name || meta.formId || 'N/A'})`,
      timestamp: new Date()
    }],
    // Log all raw form field data
    customFields: leadData.field_data.reduce((acc: Record<string, string>, field) => {
      acc[field.name] = field.values.join(', ');
      return acc;
    }, {}),
  });

  await newLead.save();
  console.log('✅ New lead created from Meta form:', newLead._id, 'Name:', name, 'Phone:', cleanPhone);
}
