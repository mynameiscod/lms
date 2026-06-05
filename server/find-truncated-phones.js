/**
 * Find Truncated Phone Numbers — Diagnostic Script
 * Run from server/: node find-truncated-phones.js
 *
 * Background: the old Meta lead phone cleaner used `.replace(/^91/, '')`, which
 * blindly stripped a leading "91" from any number. A valid 10-digit Indian
 * mobile that legitimately starts with "91" (e.g. 9180123456) lost its first two
 * digits and was saved as 8 digits (80123456). Those digits are gone from the DB
 * and cannot be reconstructed — this script LISTS the suspect leads so they can
 * be re-collected / verified manually. It does NOT modify anything.
 *
 * Pass --csv to write the results to truncated-phones.csv as well.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ── Mongo URI resolution (mirrors diagnose-meta-leads.js) ────────────────────
let MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (MONGO_URI && MONGO_URI.includes('@mongodb:')) {
  MONGO_URI = MONGO_URI.replace('@mongodb:', '@localhost:');
  console.log('ℹ️  Docker URI detected — replaced "mongodb" host with "localhost" for direct VPS run');
}
if (MONGO_URI && !MONGO_URI.includes('@')) {
  MONGO_URI = MONGO_URI.replace('mongodb://', 'mongodb://admin:password123@') + (MONGO_URI.includes('?') ? '&authSource=admin' : '?authSource=admin');
  console.log('ℹ️  No credentials in URI — injected default admin credentials');
}

const WRITE_CSV = process.argv.includes('--csv');

(async () => {
  if (!MONGO_URI) {
    console.error('❌ No MONGODB_URI / MONGO_URI found in environment');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // Use the raw collection so we don't depend on the TS model compiling.
  const leads = mongoose.connection.collection('leads');

  // A normal Indian mobile is 10 local digits (or 12 with country code).
  // Anything whose digit count is 7-9 is almost certainly truncated. We surface
  // <10-digit numbers, prioritising the classic 8-digit "91" victims.
  const cursor = leads.find(
    {},
    { projection: { name: 1, phone: 1, email: 1, source: 1, createdAt: 1, tenantId: 1 } }
  );

  const suspects = [];
  while (await cursor.hasNext()) {
    const l = await cursor.next();
    const digits = String(l.phone || '').replace(/[^0-9]/g, '');
    // 10 (local), 11 (trunk-zero), 12 (with 91), 13 (with 091) are all valid lengths.
    if (digits.length > 0 && digits.length < 10) {
      suspects.push({
        _id: String(l._id),
        tenantId: String(l.tenantId || ''),
        name: l.name || '',
        phone: l.phone || '',
        digits,
        digitLen: digits.length,
        email: l.email || '',
        source: l.source || '',
        createdAt: l.createdAt ? new Date(l.createdAt).toISOString().slice(0, 10) : '',
      });
    }
  }

  suspects.sort((a, b) => a.digitLen - b.digitLen);

  const eightDigit = suspects.filter(s => s.digitLen === 8);
  console.log(`Found ${suspects.length} lead(s) with a phone shorter than 10 digits.`);
  console.log(`  → ${eightDigit.length} are exactly 8 digits (the classic "91" truncation pattern).\n`);

  if (suspects.length) {
    console.table(suspects.map(s => ({
      name: s.name, phone: s.phone, digits: s.digitLen, source: s.source, created: s.createdAt, id: s._id,
    })));
  }

  if (WRITE_CSV && suspects.length) {
    const header = 'leadId,tenantId,name,phone,digitLen,email,source,createdAt\n';
    const csvEsc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const body = suspects.map(s =>
      [s._id, s.tenantId, s.name, s.phone, s.digitLen, s.email, s.source, s.createdAt].map(csvEsc).join(',')
    ).join('\n');
    const outPath = path.join(__dirname, 'truncated-phones.csv');
    fs.writeFileSync(outPath, header + body + '\n');
    console.log(`\n📄 Wrote ${suspects.length} row(s) to ${outPath}`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Done. (No records were modified.)');
  process.exit(0);
})().catch((err) => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
