/**
 * Fix Truncated Phone Numbers — Recovery Script
 * Run from server/: node fix-truncated-phones.js          (dry run, no writes)
 *                   node fix-truncated-phones.js --apply   (applies the fix)
 *
 * Background: the old Meta lead cleaner stripped `+91` (correct) and then a
 * SECOND leading `91` (the bug). That second `91` was the genuine first two
 * digits of the real 10-digit mobile, so the original number is exactly
 * `91` + the stored 8 digits. This restores those numbers.
 *
 * Scope (intentionally narrow & deterministic):
 *   - source === 'meta_form'
 *   - phone normalizes to EXACTLY 8 digits
 *   => new phone = '91' + those 8 digits  (a valid 10-digit number)
 *
 * It deliberately ignores 9-digit values (cannot come from this bug: 10-2=8)
 * and other sources, and is idempotent (fixed numbers become 10 digits and are
 * no longer matched). On --apply it appends an audit note to each lead.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

// ── Mongo URI resolution (mirrors find-truncated-phones.js) ──────────────────
let MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (MONGO_URI && MONGO_URI.includes('@mongodb:')) {
  MONGO_URI = MONGO_URI.replace('@mongodb:', '@127.0.0.1:');
  console.log('ℹ️  Docker URI detected — replaced "mongodb" host with "127.0.0.1" for direct VPS run');
}
if (MONGO_URI && !MONGO_URI.includes('@')) {
  MONGO_URI = MONGO_URI.replace('mongodb://', 'mongodb://admin:password123@') + (MONGO_URI.includes('?') ? '&authSource=admin' : '?authSource=admin');
  console.log('ℹ️  No credentials in URI — injected default admin credentials');
}

const APPLY = process.argv.includes('--apply');

(async () => {
  if (!MONGO_URI) {
    console.error('❌ No MONGODB_URI / MONGO_URI found in environment');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log(`✅ Connected to MongoDB  —  mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  const leads = mongoose.connection.collection('leads');
  const cursor = leads.find(
    { source: 'meta_form' },
    { projection: { name: 1, phone: 1, source: 1 } }
  );

  const targets = [];
  while (await cursor.hasNext()) {
    const l = await cursor.next();
    const digits = String(l.phone || '').replace(/[^0-9]/g, '');
    if (digits.length === 8) {
      targets.push({ _id: l._id, name: l.name || '', oldPhone: l.phone, newPhone: '91' + digits });
    }
  }

  console.log(`Matched ${targets.length} lead(s) eligible for recovery (meta_form, 8-digit):\n`);
  console.table(targets.map(t => ({ name: t.name, old: t.oldPhone, new: t.newPhone, id: String(t._id) })));

  if (!APPLY) {
    console.log('\nℹ️  DRY RUN — nothing was changed. Re-run with --apply to write these values.');
    await mongoose.disconnect();
    process.exit(0);
  }

  let updated = 0;
  for (const t of targets) {
    await leads.updateOne(
      { _id: t._id },
      {
        $set: { phone: t.newPhone, updatedAt: new Date() },
        $push: {
          activities: {
            type: 'note',
            description: `Phone auto-corrected from "${t.oldPhone}" to "${t.newPhone}" (recovered from 91-truncation bug).`,
            createdAt: new Date(),
          },
        },
      }
    );
    updated++;
  }

  console.log(`\n✅ Applied. Updated ${updated} lead(s).`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
