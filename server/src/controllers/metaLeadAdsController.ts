import { Request, Response } from 'express';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import mongoose from 'mongoose';
import https from 'https';

// ===================== DEBUG LOGGER =====================

const DEBUG = true; // Set to false in production to reduce logs

function debugLog(category: string, message: string, data?: any) {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  const prefix = `[META-LEAD-DEBUG][${timestamp}][${category}]`;
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

function errorLog(category: string, message: string, error?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[META-LEAD-ERROR][${timestamp}][${category}]`;
  console.error(`${prefix} ${message}`);
  if (error) {
    console.error(`${prefix} Error details:`, error.message || error);
    if (error.stack) {
      console.error(`${prefix} Stack trace:`, error.stack);
    }
  }
}

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
    const maskedUrl = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=***MASKED***`;
    
    debugLog('FETCH', `Making request to Meta Graph API: ${maskedUrl}`);
    debugLog('FETCH', `Token length: ${accessToken.length}, First 10 chars: ${accessToken.substring(0, 10)}...`);

    https.get(url, (resp) => {
      debugLog('FETCH', `Response status code: ${resp.statusCode}`);
      debugLog('FETCH', `Response headers:`, resp.headers);
      
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        debugLog('FETCH', `Raw response from Meta (length: ${data.length}):`, data);
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            errorLog('FETCH', `Meta API returned error`, parsed.error);
            reject(new Error(`Meta API Error: ${parsed.error.message}`));
          } else {
            debugLog('FETCH', `Successfully parsed Meta response`);
            resolve(parsed);
          }
        } catch (e: any) {
          errorLog('FETCH', `Failed to parse Meta response`, e);
          reject(new Error(`Failed to parse Meta response: ${data}`));
        }
      });
    }).on('error', (err) => {
      errorLog('FETCH', `HTTPS request error`, err);
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
  
  debugLog('EXTRACT', `Looking for field '${fieldName}', checking: ${namesToSearch.join(', ')}`);

  for (const name of namesToSearch) {
    const field = fieldData.find(f => f.name.toLowerCase() === name.toLowerCase());
    if (field && field.values && field.values.length > 0) {
      debugLog('EXTRACT', `Found '${fieldName}' as '${name}': ${field.values[0]}`);
      return field.values[0];
    }
  }
  
  debugLog('EXTRACT', `Field '${fieldName}' not found in data`);
  return undefined;
}

// ===================== WEBHOOK VERIFICATION (GET) =====================

export const verifyMetaLeadWebhook = async (req: Request, res: Response) => {
  debugLog('VERIFY', '========== WEBHOOK VERIFICATION REQUEST ==========');
  debugLog('VERIFY', `Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  debugLog('VERIFY', `Query params:`, req.query);
  debugLog('VERIFY', `Headers:`, req.headers);
  
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.META_LEAD_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || 'codebegun_whatsapp_verify';

    debugLog('VERIFY', `Mode: ${mode}`);
    debugLog('VERIFY', `Token received: ${token}`);
    debugLog('VERIFY', `Expected token: ${VERIFY_TOKEN}`);
    debugLog('VERIFY', `Challenge: ${challenge}`);
    debugLog('VERIFY', `Token match: ${token === VERIFY_TOKEN}`);

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      debugLog('VERIFY', '✅ Verification SUCCESS - returning challenge');
      console.log('✅ Meta Lead Ads webhook verified');
      res.status(200).send(challenge);
    } else {
      errorLog('VERIFY', `❌ Verification FAILED - mode=${mode}, tokenMatch=${token === VERIFY_TOKEN}`);
      console.log('❌ Meta Lead Ads verification failed:', { mode, token });
      res.status(403).json({ error: 'Verification failed' });
    }
  } catch (error: any) {
    errorLog('VERIFY', '❌ Verification exception', error);
    console.error('❌ Meta Lead webhook verify error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===================== WEBHOOK HANDLER (POST) =====================

export const handleMetaLeadWebhook = async (req: Request, res: Response) => {
  debugLog('WEBHOOK', '========== WEBHOOK POST REQUEST RECEIVED ==========');
  debugLog('WEBHOOK', `Timestamp: ${new Date().toISOString()}`);
  debugLog('WEBHOOK', `Request IP: ${req.ip || req.connection?.remoteAddress}`);
  debugLog('WEBHOOK', `User-Agent: ${req.headers['user-agent']}`);
  debugLog('WEBHOOK', `Content-Type: ${req.headers['content-type']}`);
  debugLog('WEBHOOK', `All Headers:`, req.headers);
  debugLog('WEBHOOK', `Raw Body Type: ${typeof req.body}`);
  debugLog('WEBHOOK', `Raw Body:`, req.body);
  
  try {
    const payload: MetaLeadgenPayload = req.body;

    console.log('📋 Meta Lead Ads webhook received:', JSON.stringify(payload, null, 2));

    // Log environment status
    debugLog('ENV', '========== ENVIRONMENT CHECK ==========');
    debugLog('ENV', `PAGE_ACCESS_TOKEN set: ${!!process.env.PAGE_ACCESS_TOKEN}`);
    debugLog('ENV', `PAGE_ACCESS_TOKEN length: ${process.env.PAGE_ACCESS_TOKEN?.length || 0}`);
    debugLog('ENV', `WHATSAPP_ACCESS_TOKEN set: ${!!process.env.WHATSAPP_ACCESS_TOKEN}`);
    debugLog('ENV', `DEFAULT_TENANT_ID: ${process.env.DEFAULT_TENANT_ID || 'NOT SET'}`);
    debugLog('ENV', `META_LEAD_VERIFY_TOKEN set: ${!!process.env.META_LEAD_VERIFY_TOKEN}`);
    debugLog('ENV', `WHATSAPP_VERIFY_TOKEN set: ${!!process.env.WHATSAPP_VERIFY_TOKEN}`);

    // Always respond 200 quickly
    debugLog('WEBHOOK', 'Sending 200 OK response to Meta');
    res.status(200).send('EVENT_RECEIVED');

    // Process asynchronously
    debugLog('WEBHOOK', 'Starting async processing of payload');
    processMetaLeadPayload(payload).catch(err => {
      errorLog('WEBHOOK', '❌ Meta Lead processing error in async handler', err);
      console.error('❌ Meta Lead processing error:', err);
    });
  } catch (error: any) {
    errorLog('WEBHOOK', '❌ Meta Lead webhook error in main handler', error);
    console.error('❌ Meta Lead webhook error:', error);
    res.status(200).send('EVENT_RECEIVED');
  }
};

// ===================== PROCESS LEAD PAYLOAD =====================

async function processMetaLeadPayload(payload: MetaLeadgenPayload) {
  debugLog('PROCESS', '========== PROCESSING PAYLOAD ==========');
  debugLog('PROCESS', `Payload object type: ${payload.object}`);
  debugLog('PROCESS', `Number of entries: ${payload.entry?.length || 0}`);
  
  if (payload.object !== 'page') {
    debugLog('PROCESS', `⚠️ Ignoring non-page event: ${payload.object}`);
    console.log('⚠️ Ignoring non-page event:', payload.object);
    return;
  }

  for (let entryIndex = 0; entryIndex < payload.entry.length; entryIndex++) {
    const entry = payload.entry[entryIndex];
    debugLog('PROCESS', `Processing entry ${entryIndex + 1}/${payload.entry.length}`);
    debugLog('PROCESS', `Entry ID (Page ID): ${entry.id}`);
    debugLog('PROCESS', `Entry time: ${entry.time}`);
    debugLog('PROCESS', `Number of changes: ${entry.changes?.length || 0}`);
    
    for (let changeIndex = 0; changeIndex < entry.changes.length; changeIndex++) {
      const change = entry.changes[changeIndex];
      debugLog('PROCESS', `Processing change ${changeIndex + 1}/${entry.changes.length}`);
      debugLog('PROCESS', `Change field: ${change.field}`);
      debugLog('PROCESS', `Change value:`, change.value);
      
      if (change.field !== 'leadgen') {
        debugLog('PROCESS', `⚠️ Ignoring non-leadgen field: ${change.field}`);
        console.log('⚠️ Ignoring non-leadgen field:', change.field);
        continue;
      }

      const { leadgen_id, form_id, ad_id, campaign_id, page_id } = change.value;

      debugLog('PROCESS', '========== LEAD DETAILS ==========');
      debugLog('PROCESS', `leadgen_id: ${leadgen_id}`);
      debugLog('PROCESS', `form_id: ${form_id}`);
      debugLog('PROCESS', `ad_id: ${ad_id}`);
      debugLog('PROCESS', `campaign_id: ${campaign_id}`);
      debugLog('PROCESS', `page_id: ${page_id}`);

      console.log('🔄 Processing Meta lead:', { leadgen_id, form_id, ad_id, campaign_id });

      try {
        debugLog('PROCESS', `Calling fetchAndCreateLead for leadgen_id: ${leadgen_id}`);
        await fetchAndCreateLead(leadgen_id, {
          formId: form_id,
          adId: ad_id,
          campaignId: campaign_id,
          pageId: entry.id,
        });
        debugLog('PROCESS', `✅ Successfully processed lead ${leadgen_id}`);
      } catch (err: any) {
        errorLog('PROCESS', `❌ Failed to process lead ${leadgen_id}`, err);
        console.error(`❌ Failed to process lead ${leadgen_id}:`, err);
      }
    }
  }
  
  debugLog('PROCESS', '========== PAYLOAD PROCESSING COMPLETE ==========');
}

// ===================== FETCH FROM META & CREATE LEAD =====================

async function fetchAndCreateLead(
  leadgenId: string,
  meta: { formId?: string; adId?: string; campaignId?: string; pageId?: string }
) {
  debugLog('CREATE', '========== FETCH AND CREATE LEAD ==========');
  debugLog('CREATE', `leadgenId: ${leadgenId}`);
  debugLog('CREATE', `meta:`, meta);
  
  // Use PAGE_ACCESS_TOKEN (page-level token) for fetching lead data
  const accessToken = process.env.PAGE_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

  debugLog('CREATE', `Using PAGE_ACCESS_TOKEN: ${!!process.env.PAGE_ACCESS_TOKEN}`);
  debugLog('CREATE', `Using WHATSAPP_ACCESS_TOKEN as fallback: ${!process.env.PAGE_ACCESS_TOKEN && !!process.env.WHATSAPP_ACCESS_TOKEN}`);
  debugLog('CREATE', `Token available: ${!!accessToken}`);
  debugLog('CREATE', `Token length: ${accessToken?.length || 0}`);

  if (!accessToken) {
    errorLog('CREATE', '❌ No PAGE_ACCESS_TOKEN or WHATSAPP_ACCESS_TOKEN configured');
    console.error('❌ No PAGE_ACCESS_TOKEN or WHATSAPP_ACCESS_TOKEN configured');
    return;
  }

  // Fetch full lead data from Meta Graph API
  debugLog('CREATE', `📡 Fetching lead data from Meta for: ${leadgenId}`);
  console.log('📡 Fetching lead data from Meta for:', leadgenId);
  
  let leadData: MetaLeadData;
  try {
    leadData = await fetchLeadFromMeta(leadgenId, accessToken);
    debugLog('CREATE', '✅ Successfully fetched lead data from Meta');
    debugLog('CREATE', '📋 Meta lead data:', leadData);
    console.log('📋 Meta lead data:', JSON.stringify(leadData, null, 2));
  } catch (fetchError: any) {
    errorLog('CREATE', `Failed to fetch lead from Meta API`, fetchError);
    throw fetchError;
  }

  // Extract fields
  debugLog('CREATE', '========== EXTRACTING FIELDS ==========');
  debugLog('CREATE', `field_data from Meta:`, leadData.field_data);
  
  const name = extractFieldValue(leadData.field_data, 'name')
    || [extractFieldValue(leadData.field_data, 'firstName'), extractFieldValue(leadData.field_data, 'lastName')].filter(Boolean).join(' ')
    || 'Unknown';

  const phone = extractFieldValue(leadData.field_data, 'phone') || '';
  const email = extractFieldValue(leadData.field_data, 'email') || '';
  const city = extractFieldValue(leadData.field_data, 'city') || '';
  const course = extractFieldValue(leadData.field_data, 'course') || '';

  debugLog('CREATE', `Extracted name: ${name}`);
  debugLog('CREATE', `Extracted phone: ${phone}`);
  debugLog('CREATE', `Extracted email: ${email}`);
  debugLog('CREATE', `Extracted city: ${city}`);
  debugLog('CREATE', `Extracted course: ${course}`);

  // Clean phone number
  const cleanPhone = phone.replace(/[^0-9+]/g, '').replace(/^\+91/, '').replace(/^91/, '');
  debugLog('CREATE', `Cleaned phone: ${cleanPhone}`);

  if (!cleanPhone) {
    errorLog('CREATE', '❌ No phone number found in Meta lead data');
    console.error('❌ No phone number found in Meta lead data');
    return;
  }

  const tenantId = process.env.DEFAULT_TENANT_ID;
  debugLog('CREATE', `DEFAULT_TENANT_ID: ${tenantId || 'NOT SET'}`);
  
  if (!tenantId) {
    errorLog('CREATE', '❌ DEFAULT_TENANT_ID not configured');
    console.error('❌ DEFAULT_TENANT_ID not configured');
    return;
  }

  const tenantObjectId = new mongoose.Types.ObjectId(tenantId);
  debugLog('CREATE', `Tenant ObjectId: ${tenantObjectId}`);

  // Check for duplicate by phone number
  debugLog('CREATE', `Checking for existing lead with phone ending in: ${cleanPhone.slice(-10)}`);
  const existingLead = await Lead.findOne({
    tenantId: tenantObjectId,
    phone: { $regex: cleanPhone.slice(-10) + '$' }
  });

  if (existingLead) {
    debugLog('CREATE', `📌 Lead already exists: ${existingLead._id}`);
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

    debugLog('CREATE', '✅ Existing lead updated successfully');
    console.log('✅ Existing lead updated:', existingLead._id);
    return;
  }

  debugLog('CREATE', 'No existing lead found, creating new lead');

  // Get default stage
  debugLog('CREATE', 'Looking for default stage');
  let defaultStage = await LeadStage.findOne({
    tenantId: tenantObjectId,
    $or: [{ name: /new/i }, { order: 1 }]
  }).sort({ order: 1 });

  if (!defaultStage) {
    defaultStage = await LeadStage.findOne({ tenantId: tenantObjectId }).sort({ order: 1 });
  }
  
  debugLog('CREATE', `Default stage: ${defaultStage?._id} (${defaultStage?.name || 'none'})`);

  // Create new lead
  const leadPayload = {
    tenantId: tenantObjectId,
    name: name,
    phone: cleanPhone,
    email: email,
    source: 'meta_form',
    priority: 'warm',
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
    customFields: leadData.field_data.reduce((acc: Record<string, string>, field) => {
      acc[field.name] = field.values.join(', ');
      return acc;
    }, {}),
  };
  
  debugLog('CREATE', 'Creating lead with payload:', leadPayload);
  
  const newLead = new Lead(leadPayload);

  await newLead.save();
  
  debugLog('CREATE', `✅ NEW LEAD CREATED SUCCESSFULLY`);
  debugLog('CREATE', `Lead ID: ${newLead._id}`);
  debugLog('CREATE', `Name: ${name}`);
  debugLog('CREATE', `Phone: ${cleanPhone}`);
  console.log('✅ New lead created from Meta form:', newLead._id, 'Name:', name, 'Phone:', cleanPhone);
}
