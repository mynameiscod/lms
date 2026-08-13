/**
 * QA helper: age one member's CareerPilot activity by N days so you can test the daily
 * cycle without waiting for a real day to pass.
 *
 * Nothing in CareerPilot's daily logic is driven by a cron or a stored day counter. The
 * day is derived from the timestamps on the activity itself —
 * `dayKey = new Date(at).toISOString().slice(0,10)` — so moving those timestamps back is
 * exactly equivalent to time passing, with no clock fiddling and no effect on any other
 * member.
 *
 * Shifting by 1 day  -> today's missions and daily caps reset, and yesterday counts as
 *                       active, so the streak continues.
 * Shifting by 2 days -> leaves a gap, which is how you test that a streak BREAKS.
 *
 * Usage, inside the running server container:
 *   node scripts/qa-shift-day.js <email> [days]        # default 1 day
 *   node scripts/qa-shift-day.js <email> 1 --dry-run   # show what would change
 *
 * SAFETY: refuses to touch an account that is not clearly a test account unless you pass
 * --force. Aging a real member's history corrupts their streak and their coin caps.
 */
const m = require('mongoose');

const [, , email, daysArg, ...flags] = process.argv;
const DAYS = Number(daysArg || 1);
const DRY = flags.includes('--dry-run');
const FORCE = flags.includes('--force');
const MS = DAYS * 86400000;

if (!email) { console.error('usage: node scripts/qa-shift-day.js <email> [days] [--dry-run] [--force]'); process.exit(1); }
if (!Number.isFinite(DAYS) || DAYS < 1) { console.error('days must be a positive number'); process.exit(1); }

/** Timestamps that decide which day an activity belongs to. */
const back = d => (d ? new Date(new Date(d).getTime() - MS) : d);
const shiftEach = (arr, field = 'at') =>
  (arr || []).map(x => (x && x[field] ? { ...x, [field]: back(x[field]) } : x));

(async () => {
  await m.connect(process.env.MONGODB_URI);
  const db = m.connection.db;

  const user = await db.collection('users').findOne({ email });
  if (!user) { console.error('no user with that email'); process.exit(1); }
  if (!user.passport) { console.error('that user has no CareerPilot profile'); process.exit(1); }

  const looksLikeTest = /qa|test|\+test/i.test(email) || user.email === 'gsivaprasad2009@gmail.com';
  if (!looksLikeTest && !FORCE) {
    console.error('REFUSING: "' + email + '" does not look like a test account.');
    console.error('Aging a real member corrupts their streak and coin caps. Pass --force if you mean it.');
    process.exit(1);
  }

  const sid = user._id;
  console.log((DRY ? '[DRY RUN] ' : '') + 'aging ' + email + ' back by ' + DAYS + ' day(s)\n');

  // ── the activity log the streak and the mission day are read from ──
  // Collection name confirmed from the model: PassportProgress -> passportprogresses.
  // Mongoose pluralisation is not always guessable, so it is checked, not assumed.
  const PROGRESS = 'passportprogresses';
  const prog = await db.collection(PROGRESS).findOne({ studentId: sid });
  if (prog) {
    const patch = {
      xpLog: shiftEach(prog.xpLog),
      completed: shiftEach(prog.completed),
      practice: shiftEach(prog.practice),
    };
    if (prog.lastActiveAt) patch.lastActiveAt = back(prog.lastActiveAt);
    console.log('  progress: xpLog ' + (prog.xpLog || []).length
      + ', completed ' + (prog.completed || []).length
      + ', practice ' + (prog.practice || []).length);
    if (!DRY) await db.collection(PROGRESS).updateOne({ _id: prog._id }, { $set: patch });
  } else {
    console.log('  progress: no document yet — this member has done nothing to age');
  }

  // ── the coin ledger, which is what the daily caps are counted from ──
  const led = await db.collection('coinledgers').find({ studentId: sid }).toArray();
  console.log('  coin ledger lines: ' + led.length);
  if (!DRY) {
    for (const l of led) {
      await db.collection('coinledgers').updateOne({ _id: l._id },
        { $set: { createdAt: back(l.createdAt), ...(l.at ? { at: back(l.at) } : {}) } });
    }
  }

  // ── everything else that carries a day stamp ──
  for (const coll of ['passportinterviews', 'mocktestattempts', 'passportattempts']) {
    const docs = await db.collection(coll).find({ studentId: sid }).toArray();
    if (!docs.length) continue;
    console.log('  ' + coll + ': ' + docs.length);
    if (DRY) continue;
    for (const d of docs) {
      const set = {};
      for (const f of ['createdAt', 'startedAt', 'submittedAt', 'finishedAt', 'endsAt']) {
        if (d[f]) set[f] = back(d[f]);
      }
      if (Object.keys(set).length) await db.collection(coll).updateOne({ _id: d._id }, { $set: set });
    }
  }

  console.log('\n' + (DRY
    ? 'nothing written (dry run) — re-run without --dry-run to apply.'
    : 'done. Reload the member dashboard — the server now sees a fresh day.'));
  await m.disconnect();
})().catch(e => { console.error('FAILED ' + (e && e.message)); process.exit(1); });
