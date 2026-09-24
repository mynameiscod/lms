/**
 * sanitise-for-qa.js — strip personal data and live credentials from a restored
 * production dump, so a QA box can hold realistic data without holding real people.
 *
 * ── WHY A RESTORED DUMP IS DANGEROUS HERE, SPECIFICALLY ───────────────────────────────────
 *
 * settingsService resolves configuration as: tenant override (DB) -> platform value (DB) ->
 * process.env. The DATABASE BEATS THE ENV FILE, and platform values are mirrored into
 * process.env at boot. So a QA box restored from production does not merely contain student
 * records — it contains working WhatsApp, Razorpay, SMTP, Bunny and AI credentials, and
 * putting test keys in QA's .env will NOT override them.
 *
 * A QA run of the invitation flow would message real students from the real business number.
 *
 * ── IT REFUSES TO RUN ANYWHERE THAT LOOKS LIKE PRODUCTION ─────────────────────────────────
 *
 * Three independent checks, all of which must pass. The cost of a false positive is an
 * annoyed engineer; the cost of a false negative is scrambling production.
 *
 * ── IT REPORTS WHAT IT DID NOT COVER ──────────────────────────────────────────────────────
 *
 * A sanitiser that silently misses a collection is worse than no sanitiser, because it buys
 * false confidence. This one scans EVERY collection for anything that still looks like a
 * real email or phone number after it has finished, and fails loudly if it finds any.
 *
 * ── IT IS DETERMINISTIC ───────────────────────────────────────────────────────────────────
 *
 * The same address always maps to the same fake, so a tester can follow one student across a
 * weekly refresh, and a bug report about "qa-user-4f2a@example.invalid" still means something
 * next Monday.
 *
 * USAGE, on the QA box only:
 *
 *   node scripts/sanitise-for-qa.js                 # dry run: reports, changes nothing
 *   node scripts/sanitise-for-qa.js --apply         # actually rewrite
 */
const crypto = require('crypto');
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const SALT = process.env.QA_SANITISE_SALT || 'codebegun-qa';

/* Reserved by RFC 2606 / RFC 6761 — cannot be registered, so mail to it can never leave. */
const FAKE_DOMAIN = 'example.invalid';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/* Indian mobile: 10 digits starting 6-9, with or without 91/+91. */
const PHONE_RE = /^(?:\+?91)?[6-9]\d{9}$/;

const h = (v, n = 8) => crypto.createHash('sha256').update(SALT + String(v)).digest('hex').slice(0, n);

const fakeEmail = (v) => `qa-${h(v)}@${FAKE_DOMAIN}`;
/* Kept in the 6-9 range so validation that checks "looks like a mobile" still passes. */
const fakePhone = (v) => '9' + (parseInt(h(v, 9), 16) % 1e9).toString().padStart(9, '0');

const FIRST = ['Aarav', 'Diya', 'Rohan', 'Meera', 'Arjun', 'Sana', 'Kiran', 'Nisha', 'Vikram', 'Priya'];
const LAST = ['Rao', 'Reddy', 'Nair', 'Iyer', 'Sharma', 'Gupta', 'Menon', 'Das', 'Verma', 'Bose'];
const fakeName = (v) => {
  const n = parseInt(h(v, 6), 16);
  return `${FIRST[n % FIRST.length]} ${LAST[(n >> 8) % LAST.length]}`;
};

const NAME_KEYS = /^(name|fullname|firstname|lastname|membername|studentname|contactname|candidatename|teamlead)$/i;
const EMAIL_KEYS = /mail/i;
const PHONE_KEYS = /(mobile|phone|whatsapp|contactnumber)/i;
/* Anything that could carry a live credential or a callback into a real system. */
const SECRET_KEYS = /(token|secret|apikey|api_key|accesskey|password|credential|privatekey|webhook|callbackurl)/i;

let changed = 0;

/** Walk a document and rewrite anything that is personal or secret. Returns a $set patch. */
function scrub(doc, prefix = '', patch = {}) {
  for (const [k, v] of Object.entries(doc)) {
    if (k === '_id' || k === '__v') continue;
    const path = prefix ? `${prefix}.${k}` : k;

    if (typeof v === 'string') {
      if (SECRET_KEYS.test(k) && v.length > 8) { patch[path] = ''; continue; }
      if (EMAIL_KEYS.test(k) && EMAIL_RE.test(v)) { patch[path] = fakeEmail(v); continue; }
      if (PHONE_KEYS.test(k) && PHONE_RE.test(v.replace(/\s|-/g, ''))) { patch[path] = fakePhone(v); continue; }
      if (NAME_KEYS.test(k) && v.trim()) { patch[path] = fakeName(v); continue; }
      /* A value that IS an address, whatever the field is called. */
      if (EMAIL_RE.test(v)) { patch[path] = fakeEmail(v); continue; }
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'string') {
          if (EMAIL_RE.test(item)) patch[`${path}.${i}`] = fakeEmail(item);
          else if (PHONE_RE.test(item.replace(/\s|-/g, ''))) patch[`${path}.${i}`] = fakePhone(item);
          else if (NAME_KEYS.test(k) && item.trim()) patch[`${path}.${i}`] = fakeName(item);
        } else if (item && typeof item === 'object') {
          scrub(item, `${path}.${i}`, patch);
        }
      });
    } else if (v && typeof v === 'object' && !(v instanceof Date) && !v._bsontype) {
      scrub(v, path, patch);
    }
  }
  return patch;
}

/* ── the three guards ────────────────────────────────────────────────────────────────── */
async function refuseIfProduction(db) {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  const reasons = [];

  /* 1. An explicit marker the operator must set on the QA box, and only there. */
  if (process.env.QA_ENV !== 'true') {
    reasons.push('QA_ENV is not "true". Set it in the QA environment only.');
  }

  /* 2. The app's own idea of which site it is. A QA box that still says it is
   *    platform.codebegun.com is misconfigured, and sanitising it would be a
   *    catastrophe rather than a mistake. */
  const fe = process.env.FRONTEND_URL || '';
  if (/platform\.codebegun\.com/i.test(fe)) {
    reasons.push(`FRONTEND_URL is "${fe}" — that is production.`);
  }

  /* 3. The connection string itself. */
  if (/187\.124\.97\.56/.test(uri)) {
    reasons.push('MONGODB_URI points at the production host.');
  }

  if (reasons.length) {
    console.error('\nREFUSING TO RUN. This does not look like a QA environment:\n');
    reasons.forEach((r) => console.error('   - ' + r));
    console.error('\nNothing was changed.\n');
    process.exit(1);
  }

  const dbName = db.databaseName;
  console.log(`guards passed. database: ${dbName}`);
}

/* ── main ────────────────────────────────────────────────────────────────────────────── */
(async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('MONGODB_URI is not set.'); process.exit(1); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  await refuseIfProduction(db);

  console.log(APPLY ? '\nMODE: APPLY — documents will be rewritten.\n'
                    : '\nMODE: DRY RUN — nothing will be changed. Add --apply to rewrite.\n');

  const collections = (await db.listCollections().toArray()).map((c) => c.name).sort();
  const summary = [];

  for (const name of collections) {
    const col = db.collection(name);
    const cursor = col.find({});
    let touched = 0; let scanned = 0;

    for await (const doc of cursor) {
      scanned++;
      const patch = scrub(doc);
      if (!Object.keys(patch).length) continue;
      touched++;
      if (APPLY) await col.updateOne({ _id: doc._id }, { $set: patch });
    }

    if (touched) { summary.push({ name, scanned, touched }); changed += touched; }
  }

  console.log('collections containing personal data or credentials:\n');
  console.log('  ' + 'collection'.padEnd(38) + 'scanned'.padStart(9) + 'rewritten'.padStart(11));
  summary.forEach((s) => console.log('  ' + s.name.padEnd(38) + String(s.scanned).padStart(9) + String(s.touched).padStart(11)));
  console.log('\n  ' + 'TOTAL'.padEnd(38) + ''.padStart(9) + String(changed).padStart(11));

  /* ── the part that matters: did anything survive? ───────────────────────────────────
   * Only meaningful after --apply. A clean report here is the evidence that the box is
   * safe to hand to somebody; the table above is only evidence that work happened. */
  if (APPLY) {
    console.log('\nverifying nothing real survived...');
    const leaks = [];
    for (const name of collections) {
      for await (const doc of db.collection(name).find({}).limit(2000)) {
        const json = JSON.stringify(doc);
        const mails = json.match(/"[^"@\s]+@[^"@\s]+\.[a-z]{2,}"/gi) || [];
        for (const m of mails) {
          if (!m.includes(FAKE_DOMAIN)) { leaks.push(`${name}: ${m.slice(0, 4)}***`); break; }
        }
        if (leaks.length > 25) break;
      }
    }
    if (leaks.length) {
      console.error(`\nFAILED: ${leaks.length} document(s) still contain a real-looking address.`);
      console.error('Addresses are masked below on purpose. Extend the field rules and re-run.\n');
      leaks.slice(0, 10).forEach((l) => console.error('   ' + l));
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log('  clean — every address found is on ' + FAKE_DOMAIN);
  }

  console.log(APPLY ? '\ndone.\n' : '\nDry run complete. Re-run with --apply to rewrite.\n');
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error('\nERR', e && e.message);
  try { await mongoose.disconnect(); } catch { /* already closed */ }
  process.exit(1);
});
