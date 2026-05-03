/**
 * Meta Lead Ads — Diagnostic Script
 * Run from server/: node diagnose-meta-leads.js
 *
 * Checks every link in the webhook→lead creation chain.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const https    = require('https');
const crypto   = require('crypto');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const ENC_KEY   = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-key-32-chars-minimum!!';

// ── Decrypt helper (mirrors leadSourceConfigController) ──────────────────────
function decrypt(text) {
  if (!text || !text.includes(':')) return text;
  try {
    const key   = crypto.scryptSync(ENC_KEY, 'salt', 32);
    const [ivHex, enc] = text.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
    return decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8');
  } catch (e) {
    return text; // not encrypted / bad key
  }
}

// ── Simple GET helper ─────────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('\n========================================');
  console.log('  META LEAD ADS — DIAGNOSTIC REPORT');
  console.log('========================================\n');

  // ── 1. ENV checks ──────────────────────────────────────────────────────────
  console.log('── [1] Environment Variables ──────────────────');
  const env = {
    MONGODB_URI:             MONGO_URI ? '✅ SET' : '❌ MISSING',
    PAGE_ACCESS_TOKEN:       process.env.PAGE_ACCESS_TOKEN       ? `✅ SET (len=${process.env.PAGE_ACCESS_TOKEN.length})` : '⚠️  not set (DB-only OK)',
    META_LEAD_VERIFY_TOKEN:  process.env.META_LEAD_VERIFY_TOKEN  ? `✅ SET → ${process.env.META_LEAD_VERIFY_TOKEN}` : '⚠️  not set',
    WHATSAPP_VERIFY_TOKEN:   process.env.WHATSAPP_VERIFY_TOKEN   ? `✅ SET → ${process.env.WHATSAPP_VERIFY_TOKEN}` : '⚠️  not set',
    DEFAULT_TENANT_ID:       process.env.DEFAULT_TENANT_ID       ? `✅ SET → ${process.env.DEFAULT_TENANT_ID}` : '⚠️  not set (needed if no DB pageId match)',
    ENCRYPTION_KEY:          process.env.ENCRYPTION_KEY          ? '✅ SET' : '⚠️  falling back to JWT_SECRET or hardcoded',
  };
  for (const [k, v] of Object.entries(env)) console.log(`  ${k.padEnd(28)} ${v}`);

  // Effective verify token (same logic as controller)
  const VERIFY_TOKEN = process.env.META_LEAD_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || 'codebegun_whatsapp_verify';
  console.log(`\n  Effective verify token used by controller: "${VERIFY_TOKEN}"`);

  if (!MONGO_URI) {
    console.log('\n❌ Cannot connect to MongoDB — MONGODB_URI / MONGO_URI not set. Exiting.');
    process.exit(1);
  }

  // ── 2. DB connection ───────────────────────────────────────────────────────
  console.log('\n── [2] MongoDB Connection ─────────────────────');
  try {
    await mongoose.connect(MONGO_URI);
    console.log('  ✅ Connected to MongoDB');
  } catch (e) {
    console.log('  ❌ Connection failed:', e.message);
    process.exit(1);
  }

  // ── 3. LeadSourceConfig — Meta Ads section ─────────────────────────────────
  console.log('\n── [3] LeadSourceConfig (all tenants) ─────────');
  const configs = await mongoose.connection.collection('leadsourceconfigs').find({}).toArray();

  if (!configs.length) {
    console.log('  ❌ NO LeadSourceConfig documents found in DB!');
    console.log('     → The tenant has never saved Meta Ads settings.');
    console.log('     → Go to Settings → Lead Sources → Meta Ads and save the config.');
  }

  for (const cfg of configs) {
    console.log(`\n  Tenant: ${cfg.tenantId}`);
    const ma = cfg.metaAds || {};
    console.log(`    metaAds.isConnected : ${ma.isConnected ? '✅ true' : '❌ false  ← must be true'}`);

    const maCfg = ma.config || {};
    const rawToken = maCfg.pageAccessToken || '';
    const decToken = decrypt(rawToken);

    console.log(`    config.pageId       : ${maCfg.pageId || '❌ MISSING'}`);
    console.log(`    config.verifyToken  : ${maCfg.verifyToken || '⚠️  not set'}`);
    console.log(`    config.formIds      : ${JSON.stringify(maCfg.formIds || [])}`);

    if (!rawToken) {
      console.log(`    config.pageAccessToken: ❌ MISSING — token never saved`);
    } else if (rawToken.includes(':')) {
      const looks_valid = decToken.length > 20;
      console.log(`    config.pageAccessToken: ${looks_valid ? '✅ encrypted, decrypts OK' : '❌ encrypted but decryption gives short string — wrong ENCRYPTION_KEY?'}`);
      console.log(`      → decrypted length: ${decToken.length}, starts with: ${decToken.substring(0,12)}...`);
    } else {
      // stored plain text (fallback path)
      console.log(`    config.pageAccessToken: ⚠️  stored as PLAIN TEXT (not encrypted) len=${rawToken.length}`);
    }

    // WhatsApp section
    const wa = cfg.whatsApp || {};
    console.log(`\n    whatsApp.isConnected    : ${wa.isConnected ? '✅ true' : '❌ false'}`);
    const waCfg = wa.config || {};
    const rawWaToken = waCfg.accessToken || '';
    const decWaToken = decrypt(rawWaToken);
    console.log(`    config.phoneNumberId    : ${waCfg.phoneNumberId || '❌ MISSING'}`);
    console.log(`    config.verifyToken      : ${waCfg.verifyToken || '⚠️  not set'}`);
    if (!rawWaToken) {
      console.log(`    config.accessToken      : ❌ MISSING`);
    } else {
      console.log(`    config.accessToken      : ${rawWaToken.includes(':') ? '✅ encrypted' : '⚠️  plain text'} (len=${decWaToken.length})`);
    }
  }

  // ── 4. Test Meta Graph API with token from DB ──────────────────────────────
  console.log('\n── [4] Meta Graph API Token Validation ────────');
  for (const cfg of configs) {
    const ma = cfg.metaAds || {};
    if (!ma.isConnected) { console.log(`  Tenant ${cfg.tenantId}: skipped (not connected)`); continue; }

    const raw = ma.config?.pageAccessToken || '';
    const token = raw.includes(':') ? decrypt(raw) : raw;

    if (!token || token.length < 20) {
      console.log(`  Tenant ${cfg.tenantId}: ❌ No valid token to test`);
      continue;
    }

    try {
      const result = await httpsGet(`https://graph.facebook.com/v19.0/me?access_token=${token}`);
      if (result.body?.error) {
        console.log(`  Tenant ${cfg.tenantId}: ❌ Meta API error → ${result.body.error.message}`);
        console.log(`    Code: ${result.body.error.code}, Type: ${result.body.error.type}`);
        console.log(`    → Token is invalid / expired. Generate a new long-lived token from Meta Developer Console.`);
      } else {
        console.log(`  Tenant ${cfg.tenantId}: ✅ Token valid — Page: "${result.body.name}" (id=${result.body.id})`);
        if (ma.config?.pageId && ma.config.pageId !== result.body.id) {
          console.log(`    ⚠️  WARNING: stored pageId "${ma.config.pageId}" ≠ actual page "${result.body.id}" — update it!`);
        }
      }
    } catch (e) {
      console.log(`  Tenant ${cfg.tenantId}: ❌ Network error calling Meta API: ${e.message}`);
    }
  }

  // ── 5. Recent Meta leads in DB ─────────────────────────────────────────────
  console.log('\n── [5] Recent Meta leads in DB (last 10) ──────');
  const recentLeads = await mongoose.connection.collection('leads')
    .find({ source: 'meta_form' })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  if (!recentLeads.length) {
    console.log('  ❌ No leads with source="meta_form" found at all.');
    console.log('     → Either no webhooks have been received, or tenant lookup is failing.');
  } else {
    console.log(`  ✅ Found ${recentLeads.length} recent meta_form leads:`);
    for (const l of recentLeads) {
      console.log(`    - ${l.createdAt?.toISOString() || '?'}  ${l.name || '?'}  ${l.phone || '?'}`);
    }
  }

  // ── 6. Webhook URL check ───────────────────────────────────────────────────
  console.log('\n── [6] Webhook Registration Summary ───────────');
  const PORT = process.env.PORT || 5000;
  const PUBLIC_URL = process.env.BASE_URL || process.env.SERVER_URL || `http://localhost:${PORT}`;
  console.log(`  Your webhook URL (register in Meta Developer Console):`);
  console.log(`  → ${PUBLIC_URL}/api/v1/meta-leads/webhook`);
  console.log(`  Verify token to enter in Meta Developer Console:`);
  console.log(`  → "${VERIFY_TOKEN}"`);
  console.log(`\n  ⚠️  The Verify Token in Meta console MUST match this exactly.`);
  console.log(`  ⚠️  Meta sends to the PUBLIC URL — ensure your server is accessible from the internet.`);

  // ── 7. Checklist summary ───────────────────────────────────────────────────
  console.log('\n── [7] Common Failure Points Checklist ─────────');
  const checks = [
    'Meta App is in LIVE mode (not Development mode) — leads only flow in Live mode',
    'Lead form is subscribed to webhook: Meta for Developers → Webhooks → Page → leadgen ✓',
    'Webhook URL is verified (GET challenge responded correctly)',
    'Page Access Token has leads_retrieval + pages_read_engagement permissions',
    'Token is not expired (User tokens expire; use long-lived Page token)',
    'metaAds.isConnected = true in DB and pageId/formIds saved',
    'Server is publicly reachable on port 443/80 (Meta cannot call localhost)',
  ];
  checks.forEach((c, i) => console.log(`  [${i+1}] ${c}`));

  console.log('\n========================================');
  console.log('  DIAGNOSIS COMPLETE');
  console.log('========================================\n');
  await mongoose.disconnect();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
