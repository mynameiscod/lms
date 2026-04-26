import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../types';
import LeadSourceConfig from '../models/LeadSourceConfig';
import Lead from '../models/Lead';
import mongoose from 'mongoose';

// ─── Encryption helpers (tokens stored encrypted in DB) ─────────────────────
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-key-32-chars-minimum!!';

function encrypt(text: string): string {
  if (!text) return '';
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch {
    return text; // fallback: store as-is if encryption fails
  }
}

function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return text;
  }
}

// Mask a token for display: show first 6 + last 4 chars
function maskToken(token: string): string {
  if (!token) return '';
  const decrypted = decrypt(token);
  if (decrypted.length <= 10) return '●'.repeat(decrypted.length);
  return decrypted.slice(0, 6) + '●'.repeat(Math.max(0, decrypted.length - 10)) + decrypted.slice(-4);
}

// Build public webhook URL for a source
function buildWebhookUrl(req: AuthenticatedRequest, path: string): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'your-server.com';
  return `${protocol}://${host}/api/v1/${path}`;
}

// ─── Get or create config for tenant ────────────────────────────────────────
async function getOrCreateConfig(tenantId: string) {
  let config = await LeadSourceConfig.findOne({ tenantId });
  if (!config) {
    config = await LeadSourceConfig.create({ tenantId });
  }
  return config;
}

// ─── GET /lead-source-config ─────────────────────────────────────────────────
export const getConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const config = await getOrCreateConfig(tenantId);

    // Build lead counts per source this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const sourceCounts = await Lead.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          createdAt: { $gte: startOfMonth }
        }
      },
      { $group: { _id: '$source', count: { $sum: 1 }, lastLead: { $max: '$createdAt' } } }
    ]);

    const sourceMap: Record<string, { count: number; lastLead: Date }> = {};
    for (const s of sourceCounts) {
      sourceMap[s._id] = { count: s.count, lastLead: s.lastLead };
    }

    // Build response — mask all tokens
    const safeConfig = {
      _id: config._id,
      metaAds: {
        isConnected: config.metaAds.isConnected,
        config: {
          pageAccessToken: maskToken(config.metaAds.config.pageAccessToken || ''),
          pageId: config.metaAds.config.pageId,
          verifyToken: config.metaAds.config.verifyToken,
          adAccountId: config.metaAds.config.adAccountId,
          webhookUrl: buildWebhookUrl(req, 'meta-leads/webhook'),
        },
        autoActions: config.metaAds.autoActions,
        stats: {
          lastLeadAt: sourceMap['meta_form']?.lastLead || null,
          leadsThisMonth: sourceMap['meta_form']?.count || 0,
          leadsTotal: await Lead.countDocuments({ tenantId, source: 'meta_form' }),
        },
      },
      whatsApp: {
        isConnected: config.whatsApp.isConnected,
        config: {
          accessToken: maskToken(config.whatsApp.config.accessToken || ''),
          phoneNumberId: config.whatsApp.config.phoneNumberId,
          verifyToken: config.whatsApp.config.verifyToken,
          businessAccountId: config.whatsApp.config.businessAccountId,
          qualificationLanguage: config.whatsApp.config.qualificationLanguage,
          enableQualificationBot: config.whatsApp.config.enableQualificationBot,
          webhookUrl: buildWebhookUrl(req, 'whatsapp/webhook'),
        },
        autoActions: config.whatsApp.autoActions,
        stats: {
          lastLeadAt: sourceMap['whatsapp']?.lastLead || null,
          leadsThisMonth: sourceMap['whatsapp']?.count || 0,
          leadsTotal: await Lead.countDocuments({ tenantId, source: 'whatsapp' }),
        },
      },
      websiteForm: {
        isConnected: config.websiteForm.isConnected,
        config: {
          allowedDomains: config.websiteForm.config.allowedDomains,
          redirectUrl: config.websiteForm.config.redirectUrl,
          webhookUrl: buildWebhookUrl(req, `public/form/${req.tenantId}`),  
          embedCode: buildEmbedCode(req),
        },
        autoActions: config.websiteForm.autoActions,
        stats: {
          lastLeadAt: sourceMap['website']?.lastLead || null,
          leadsThisMonth: sourceMap['website']?.count || 0,
          leadsTotal: await Lead.countDocuments({ tenantId, source: 'website' }),
        },
      },
      googleSheet: {
        isConnected: config.googleSheet.isConnected,
        config: config.googleSheet.config,
        autoActions: config.googleSheet.autoActions,
        stats: {
          lastLeadAt: sourceMap['google_sheet']?.lastLead || null,
          leadsThisMonth: sourceMap['google_sheet']?.count || 0,
          leadsTotal: await Lead.countDocuments({ tenantId, source: 'google_sheet' }),
        },
      },
      walkin: {
        isConnected: config.walkin.isConnected,
        config: config.walkin.config,
        autoActions: config.walkin.autoActions,
        stats: {
          lastLeadAt: sourceMap['walkin']?.lastLead || null,
          leadsThisMonth: sourceMap['walkin']?.count || 0,
          leadsTotal: await Lead.countDocuments({ tenantId, source: 'walkin' }),
        },
      },
      referral: {
        isConnected: config.referral.isConnected,
        config: config.referral.config,
        autoActions: config.referral.autoActions,
        stats: {
          lastLeadAt: sourceMap['referral']?.lastLead || null,
          leadsThisMonth: sourceMap['referral']?.count || 0,
          leadsTotal: await Lead.countDocuments({ tenantId, source: 'referral' }),
        },
      },
      googleAds: {
        isConnected: config.googleAds.isConnected,
        config: config.googleAds.config,
        autoActions: config.googleAds.autoActions,
        stats: {
          lastLeadAt: sourceMap['google_ads']?.lastLead || null,
          leadsThisMonth: sourceMap['google_ads']?.count || 0,
          leadsTotal: await Lead.countDocuments({ tenantId, source: 'google_ads' }),
        },
      },
      thirdParty: config.thirdParty.map(tp => ({
        name: tp.name,
        isActive: tp.isActive,
        fieldMapping: tp.fieldMapping,
        apiKey: maskToken(tp.apiKey || ''),
        webhookUrl: buildWebhookUrl(req, `public/webhook/${tp.name.toLowerCase().replace(/\s/g, '-')}`),
        stats: {
          lastLeadAt: sourceMap[tp.name.toLowerCase()]?.lastLead || null,
          leadsThisMonth: sourceMap[tp.name.toLowerCase()]?.count || 0,
          leadsTotal: 0,
        },
      })),
    };

    return res.json({ success: true, data: safeConfig });
  } catch (error: any) {
    console.error('getConfig error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /lead-source-config/:source ─────────────────────────────────────────
export const updateSourceConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { source } = req.params;
    const { isConnected, config: newConfig, autoActions } = req.body;

    const config = await getOrCreateConfig(tenantId);

    const validSources = ['metaAds', 'whatsApp', 'websiteForm', 'googleSheet', 'walkin', 'referral', 'googleAds'];
    if (!validSources.includes(source)) {
      return res.status(400).json({ success: false, message: 'Invalid source' });
    }

    const sourceData = (config as any)[source];
    if (!sourceData) {
      return res.status(400).json({ success: false, message: 'Source not found' });
    }

    // Update isConnected
    if (isConnected !== undefined) {
      sourceData.isConnected = isConnected;
    }

    // Update auto actions
    if (autoActions) {
      Object.assign(sourceData.autoActions, autoActions);
    }

    // Update config — encrypt sensitive tokens before saving
    if (newConfig) {
      for (const [key, value] of Object.entries(newConfig)) {
        const sensitiveFields = ['pageAccessToken', 'accessToken', 'apiKey'];
        if (sensitiveFields.includes(key) && value && typeof value === 'string') {
          // Only re-encrypt if the value has changed (not masked)
          if (!value.includes('●')) {
            sourceData.config[key] = encrypt(value as string);
          }
          // If it contains ●, it's masked — don't overwrite
        } else {
          sourceData.config[key] = value;
        }
      }
    }

    await config.save();

    return res.json({ success: true, message: `${source} configuration saved` });
  } catch (error: any) {
    console.error('updateSourceConfig error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /lead-source-config/third-party ────────────────────────────────────
export const addThirdPartySource = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { name, fieldMapping } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Source name is required' });
    }

    const config = await getOrCreateConfig(tenantId);

    // Check for duplicate
    const exists = config.thirdParty.find(tp => tp.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      return res.status(400).json({ success: false, message: 'A source with this name already exists' });
    }

    // Generate API key for webhook auth
    const apiKey = encrypt(crypto.randomBytes(32).toString('hex'));

    config.thirdParty.push({ name, apiKey, fieldMapping: fieldMapping || {}, isActive: true });
    await config.save();

    return res.status(201).json({ success: true, message: `${name} integration created` });
  } catch (error: any) {
    console.error('addThirdPartySource error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE /lead-source-config/third-party/:name ────────────────────────────
export const removeThirdPartySource = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { name } = req.params;

    const config = await getOrCreateConfig(tenantId);
    config.thirdParty = config.thirdParty.filter(tp => tp.name.toLowerCase() !== name.toLowerCase()) as any;
    await config.save();

    return res.json({ success: true, message: `${name} integration removed` });
  } catch (error: any) {
    console.error('removeThirdPartySource error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /lead-source-config/decrypted/:source — Internal helper for controllers ─
export const getDecryptedTokens = async (tenantId: string) => {
  const config = await LeadSourceConfig.findOne({ tenantId });
  if (!config) return null;

  return {
    metaAds: {
      isConnected: config.metaAds.isConnected,
      pageAccessToken: decrypt(config.metaAds.config.pageAccessToken || ''),
      pageId: config.metaAds.config.pageId,
      verifyToken: config.metaAds.config.verifyToken,
      adAccountId: config.metaAds.config.adAccountId,
      autoActions: config.metaAds.autoActions,
    },
    whatsApp: {
      isConnected: config.whatsApp.isConnected,
      accessToken: decrypt(config.whatsApp.config.accessToken || ''),
      phoneNumberId: config.whatsApp.config.phoneNumberId,
      verifyToken: config.whatsApp.config.verifyToken,
      qualificationLanguage: config.whatsApp.config.qualificationLanguage,
      enableQualificationBot: config.whatsApp.config.enableQualificationBot,
      autoActions: config.whatsApp.autoActions,
    },
    websiteForm: {
      isConnected: config.websiteForm.isConnected,
      autoActions: config.websiteForm.autoActions,
    },
    walkin: {
      config: config.walkin.config,
      autoActions: config.walkin.autoActions,
    },
    referral: {
      config: config.referral.config,
      autoActions: config.referral.autoActions,
    },
  };
};

// ─── Helper: Build embed code snippet ────────────────────────────────────────
function buildEmbedCode(req: AuthenticatedRequest): string {
  const tenantId = req.tenantId!;
  const baseUrl = buildWebhookUrl(req, `public/form/${tenantId}`);
  return `<script src="${baseUrl.replace('/api/v1', '')}/embed/lead-form.js" data-tenant="${tenantId}"></script>`;
}

// ─── POST /lead-source-config/test/:source — Test connection ─────────────────
export const testConnection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { source } = req.params;
    const tenantId = req.tenantId!;

    // Prefer credentials passed from the form (not yet saved) over DB values
    const bodyConfig: Record<string, any> = req.body?.config || {};
    const dbTokens = await getDecryptedTokens(tenantId);

    if (source === 'metaAds') {
      const token = bodyConfig.pageAccessToken && !bodyConfig.pageAccessToken.includes('\u25cf')
        ? bodyConfig.pageAccessToken
        : dbTokens?.metaAds?.pageAccessToken || '';
      if (!token) {
        return res.json({ success: false, message: 'Page Access Token is required. Enter it above and try again.' });
      }
      if (token.length < 20) {
        return res.json({ success: false, message: 'Page Access Token appears too short — please check it.' });
      }
      return res.json({ success: true, message: 'Token format looks valid. Webhook is ready to receive leads.' });
    }

    if (source === 'whatsApp') {
      const token = bodyConfig.accessToken && !bodyConfig.accessToken.includes('\u25cf')
        ? bodyConfig.accessToken
        : dbTokens?.whatsApp?.accessToken || '';
      const phoneId = bodyConfig.phoneNumberId || dbTokens?.whatsApp?.phoneNumberId || '';
      if (!token) {
        return res.json({ success: false, message: 'Access Token is required. Enter it above and try again.' });
      }
      if (!phoneId) {
        return res.json({ success: false, message: 'Phone Number ID is required. Enter it above and try again.' });
      }
      return res.json({ success: true, message: 'WhatsApp credentials look valid. Webhook is ready.' });
    }

    return res.json({ success: true, message: 'Connection test passed.' });
  } catch (error: any) {
    console.error('testConnection error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
