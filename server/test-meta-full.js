/**
 * Full Meta Lead Ads diagnostic + pipeline simulation
 * Run: node test-meta-full.js
 * 
 * This script:
 * 1. Checks DB state (pageId, token, isConnected)
 * 2. Validates token against Meta API
 * 3. Checks page subscription status
 * 4. Simulates a webhook POST to localhost to test the full pipeline
 * 5. Reports pass/fail for each step
 */

require('dotenv').config();
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-key-32-chars-minimum!!';

function decrypt(text) {
  if (!text || !text.includes(':')) return text;
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text;
  }
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    }).on('error', reject);
  });
}

function httpPost(host, port, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'User-Agent': 'facebookplatform/1.0 (+http://developers.facebook.com/docs/reference/api/realtime/)'
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('META LEAD ADS - FULL DIAGNOSTIC');
  console.log('='.repeat(60));
  console.log();

  // ── STEP 1: Check env vars ──────────────────────────────────
  console.log('[ STEP 1 ] Environment Variables');
  console.log('-'.repeat(40));
  const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN || '';
  const DEFAULT_TENANT = process.env.DEFAULT_TENANT_ID || '';
  const VERIFY_TOKEN = process.env.META_LEAD_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || 'codebegun_whatsapp_verify';
  const MONGO_URI = process.env.MONGODB_URI || '';

  console.log('PAGE_ACCESS_TOKEN:', PAGE_TOKEN ? `${PAGE_TOKEN.substring(0,12)}... (len=${PAGE_TOKEN.length})` : '❌ NOT SET');
  console.log('DEFAULT_TENANT_ID:', DEFAULT_TENANT || '❌ NOT SET');
  console.log('META_LEAD_VERIFY_TOKEN:', process.env.META_LEAD_VERIFY_TOKEN || '(not set, using WHATSAPP_VERIFY_TOKEN)');
  console.log('WHATSAPP_VERIFY_TOKEN:', process.env.WHATSAPP_VERIFY_TOKEN || '(not set)');
  console.log('Effective VERIFY_TOKEN:', VERIFY_TOKEN);
  console.log('ENCRYPTION_KEY set:', !!(process.env.ENCRYPTION_KEY || process.env.JWT_SECRET));
  console.log();

  // ── STEP 2: Check MongoDB ────────────────────────────────────
  console.log('[ STEP 2 ] MongoDB - LeadSourceConfig');
  console.log('-'.repeat(40));

  let mongoUri = MONGO_URI;
  if (mongoUri.includes('@mongodb:')) {
    mongoUri = mongoUri.replace('@mongodb:', '@localhost:');
    console.log('(Using localhost instead of mongodb for Docker URI)');
  }

  let client;
  let dbPageId = null;
  let dbToken = null;
  let dbIsConnected = false;
  let dbTenantId = null;

  try {
    client = await MongoClient.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'lms';
    const db = client.db(dbName);

    const config = await db.collection('leadsourceconfigs').findOne({
      'metaAds.isConnected': true
    });

    if (!config) {
      console.log('❌ No LeadSourceConfig with metaAds.isConnected=true found!');
      console.log('   → Go to LMS UI Settings → Lead Sources → Meta Ads → Enable toggle → Save');
    } else {
      dbTenantId = config.tenantId?.toString();
      dbPageId = config.metaAds?.config?.pageId;
      const rawToken = config.metaAds?.config?.pageAccessToken || '';
      dbIsConnected = config.metaAds?.isConnected;

      console.log('✅ Found config for tenant:', dbTenantId);
      console.log('   isConnected:', dbIsConnected);
      console.log('   pageId in DB:', dbPageId);
      console.log('   pageAccessToken (raw, first 20):', rawToken.substring(0, 20));
      console.log('   pageAccessToken has ":":', rawToken.includes(':'));

      // Decrypt
      dbToken = decrypt(rawToken);
      console.log('   pageAccessToken (decrypted, first 15):', dbToken.substring(0, 15) + '...');
      console.log('   decrypted starts with EAA:', dbToken.startsWith('EAA') ? '✅' : '❌ BAD TOKEN');
      console.log('   decrypted length:', dbToken.length);

      // Check expected page ID
      if (dbPageId === '107247129050029') {
        console.log('   pageId: ✅ Correct (107247129050029)');
      } else {
        console.log(`   pageId: ❌ WRONG! Got "${dbPageId}", expected "107247129050029"`);
        console.log('   → Fix: go to LMS UI Settings → Lead Sources → Meta Ads → set Page ID to 107247129050029 → Save');
      }
    }
    console.log();
  } catch (err) {
    console.log('❌ MongoDB connection failed:', err.message);
    console.log('   (DB check skipped — token lookup will use .env fallback in production)');
    console.log();
  }

  // ── STEP 3: Validate token against Meta API ──────────────────
  console.log('[ STEP 3 ] Meta Token Validation');
  console.log('-'.repeat(40));

  const tokenToTest = (dbToken && dbToken.startsWith('EAA')) ? dbToken : PAGE_TOKEN;
  if (!tokenToTest) {
    console.log('❌ No token available to test');
  } else {
    console.log('Testing token:', tokenToTest.substring(0, 15) + '...');
    try {
      const meResult = await httpsGet(`https://graph.facebook.com/v19.0/me?access_token=${tokenToTest}`);
      if (meResult.body.error) {
        console.log('❌ Token validation FAILED:', meResult.body.error.message);
        console.log('   Error code:', meResult.body.error.code);
        if (meResult.body.error.code === 190) {
          console.log('   → Token is EXPIRED or INVALID. Need to get a new Long-Lived Page Token.');
        }
      } else {
        console.log('✅ Token valid!');
        console.log('   Name:', meResult.body.name);
        console.log('   ID:', meResult.body.id);
        console.log('   Token type:', meResult.body.id === '107247129050029' ? '✅ PAGE TOKEN' : '⚠️  Check if this is page or user');
      }
    } catch (e) {
      console.log('❌ Token test request failed:', e.message);
    }
  }
  console.log();

  // ── STEP 4: Check page subscription status ───────────────────
  console.log('[ STEP 4 ] Page Subscription Status');
  console.log('-'.repeat(40));

  const pageTokenForSub = (dbToken && dbToken.startsWith('EAA')) ? dbToken : PAGE_TOKEN;
  if (!pageTokenForSub) {
    console.log('❌ No token to check subscription');
  } else {
    try {
      const subResult = await httpsGet(
        `https://graph.facebook.com/v19.0/107247129050029/subscribed_apps?access_token=${pageTokenForSub}`
      );
      if (subResult.body.error) {
        console.log('❌ Subscription check failed:', subResult.body.error.message);
        if (subResult.body.error.code === 190) {
          console.log('   → Token expired. Re-run /me/accounts to get fresh page token.');
        }
      } else if (subResult.body.data && subResult.body.data.length > 0) {
        const sub = subResult.body.data[0];
        console.log('✅ App IS subscribed to page!');
        console.log('   App ID:', sub.id);
        console.log('   Name:', sub.name);
        console.log('   Subscribed fields:', sub.subscribed_fields?.join(', '));
        if (!sub.subscribed_fields?.includes('leadgen')) {
          console.log('   ❌ "leadgen" is NOT in subscribed fields! Run:');
          console.log(`      POST /107247129050029/subscribed_apps?subscribed_fields=leadgen`);
        } else {
          console.log('   ✅ "leadgen" field IS subscribed');
        }
      } else {
        console.log('❌ No apps subscribed to page 107247129050029!');
        console.log('   → Run: curl -X POST "https://graph.facebook.com/v19.0/107247129050029/subscribed_apps?subscribed_fields=leadgen&access_token=PAGE_TOKEN"');
      }
    } catch (e) {
      console.log('❌ Subscription check request failed:', e.message);
    }
  }
  console.log();

  // ── STEP 5: Test webhook endpoint (GET verify) ───────────────
  console.log('[ STEP 5 ] Webhook URL Verification Test');
  console.log('-'.repeat(40));

  const challenge = 'test_challenge_' + Date.now();
  try {
    const verifyResult = await new Promise((resolve, reject) => {
      const path = `/api/v1/meta-leads/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY_TOKEN)}&hub.challenge=${challenge}`;
      http.get({ hostname: 'localhost', port: 5000, path }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }).on('error', reject);
    });

    if (verifyResult.status === 200 && verifyResult.body === challenge) {
      console.log('✅ Webhook GET verification: PASSED');
    } else {
      console.log('❌ Webhook GET verification: FAILED');
      console.log('   Status:', verifyResult.status);
      console.log('   Expected:', challenge);
      console.log('   Got:', verifyResult.body);
      if (verifyResult.status === 403) {
        console.log('   → VERIFY_TOKEN mismatch! Check META_LEAD_VERIFY_TOKEN or WHATSAPP_VERIFY_TOKEN in .env');
        console.log('   → Current effective verify token:', VERIFY_TOKEN);
        console.log('   → Make sure this EXACTLY matches what is set in Meta Developer Console webhook');
      }
    }
  } catch (e) {
    console.log('❌ Could not connect to localhost:5000 - is the server running?', e.message);
  }
  console.log();

  // ── STEP 6: Simulate webhook POST ───────────────────────────
  console.log('[ STEP 6 ] Simulate Webhook POST (Pipeline Test)');
  console.log('-'.repeat(40));
  console.log('Sending fake webhook payload to localhost:5000...');
  console.log('(This uses leadgen_id "TEST_LEAD_001" which will fail at Meta Graph API - that is expected)');
  console.log('(Watch for [META-LEAD-DEBUG] logs in: docker logs lms-server -f)');

  const fakePayload = {
    object: 'page',
    entry: [{
      id: dbPageId || '107247129050029',
      time: Math.floor(Date.now() / 1000),
      changes: [{
        field: 'leadgen',
        value: {
          form_id: 'TEST_FORM_001',
          leadgen_id: 'TEST_LEAD_001',
          created_time: Math.floor(Date.now() / 1000),
          page_id: dbPageId || '107247129050029',
          adgroup_id: 'TEST_AD_001',
          ad_id: 'TEST_AD_001',
          campaign_id: 'TEST_CAMPAIGN_001'
        }
      }]
    }]
  };

  try {
    const postResult = await httpPost('localhost', 5000, '/api/v1/meta-leads/webhook', fakePayload);
    if (postResult.status === 200 && postResult.body === 'EVENT_RECEIVED') {
      console.log('✅ Webhook POST accepted! Response: EVENT_RECEIVED');
      console.log();
      console.log('>>> NOW CHECK DOCKER LOGS:');
      console.log('   docker logs lms-server --tail=50 | grep -E "META-LEAD|PROCESS|CREATE|FETCH|ERROR"');
      console.log();
      console.log('   You should see:');
      console.log('   ✅ [META-LEAD-DEBUG][PROCESS] Processing entry 1/1');
      console.log('   ✅ [META-LEAD-DEBUG][PROCESS] Processing change 1/1');
      console.log('   ✅ [META-LEAD-DEBUG][CREATE] Resolved tenant from DB by pageId OR Using .env fallback');
      console.log('   ⚠️  [META-LEAD-ERROR][FETCH] Meta API Error: ... (expected - TEST_LEAD_001 is fake)');
      console.log();
      console.log('   If you see NO [META-LEAD-DEBUG] logs at all → webhook handler is not executing');
      console.log('   If tenant is NOT resolved from DB → pageId mismatch in DB vs webhook payload');
    } else {
      console.log('❌ Unexpected response:', postResult.status, postResult.body);
    }
  } catch (e) {
    console.log('❌ Could not POST to localhost:5000:', e.message);
    console.log('   → Is the Docker container running? Try: docker ps | grep lms-server');
  }
  console.log();

  // ── STEP 7: Check recent leads ──────────────────────────────
  if (client) {
    console.log('[ STEP 7 ] Recent Leads (last 5 meta_form)');
    console.log('-'.repeat(40));
    try {
      const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'lms';
      const db = client.db(dbName);
      const leads = await db.collection('leads').find(
        { source: 'meta_form' },
        { projection: { name: 1, phone: 1, createdAt: 1, sourceDetails: 1 } }
      ).sort({ createdAt: -1 }).limit(5).toArray();

      if (leads.length === 0) {
        console.log('❌ No meta_form leads found in DB (no leads received yet from Meta)');
      } else {
        console.log(`✅ Found ${leads.length} meta_form lead(s):`);
        leads.forEach((l, i) => {
          console.log(`   [${i+1}] ${l.name} | ${l.phone} | ${l.createdAt?.toISOString()}`);
        });
      }
    } catch (e) {
      console.log('❌ Could not query leads:', e.message);
    }
    console.log();
  }

  // ── SUMMARY ─────────────────────────────────────────────────
  console.log('='.repeat(60));
  console.log('SUMMARY & NEXT STEPS');
  console.log('='.repeat(60));
  console.log();
  console.log('1. Check STEP 5 — if verify token fails, update .env META_LEAD_VERIFY_TOKEN');
  console.log('   and make sure it matches EXACTLY what you entered in Meta Developer Console');
  console.log();
  console.log('2. After running this script, check docker logs for STEP 6 simulation:');
  console.log('   docker logs lms-server --tail=50');
  console.log();
  console.log('3. To submit a REAL test lead:');
  console.log('   → Go to Facebook Page: CODE BEGUN');
  console.log('   → Go to Meta Ads Manager → Find your Lead Ad');
  console.log('   → Click Preview → Submit a test form entry');
  console.log();
  console.log('4. If webhook never fires, check Meta Developer Console:');
  console.log('   → App Dashboard → Products → Pages → Webhooks');
  console.log('   → Confirm "leadgen" field is checked');
  console.log('   → Use "Test" button next to leadgen to send a test event');
  console.log();

  if (client) await client.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
