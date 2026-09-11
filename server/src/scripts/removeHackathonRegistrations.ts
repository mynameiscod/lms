/**
 * Remove hackathon registrations by their registration code.
 *
 * DRY RUN BY DEFAULT. It prints every row it would touch, in full, before anything happens —
 * because the only way to be sure a registration is test data is to read it, and the person
 * running this is the one who knows.
 *
 * WHY A SCRIPT AND NOT A ONE-LINER. There is no admin endpoint that deletes a registration:
 * the hackathon routes expose list, export, update, markRefunded and delete-the-whole-event,
 * and deliberately not delete-a-team. So this is the only path, and a reviewed file that
 * refuses obvious mistakes is a better one than a mongosh command typed into a production
 * shell at speed.
 *
 * ── IT REFUSES TO DESTROY A PAYMENT RECORD ────────────────────────────────────────────────
 *
 * A registration carries its Razorpay order and payment id, the amount, and whether it was
 * paid. Deleting a row whose payment reached 'paid' throws away the only record on our side
 * that money was taken — a refund dispute months later would have nothing to answer with, and
 * the gateway's record would point at an order this system no longer knows about.
 *
 * So a paid row is skipped and reported, never deleted, unless somebody passes --include-paid
 * having read what that means. Test data does not normally have a completed payment; a "test"
 * row that does is worth a second look before it disappears.
 *
 * ── CANCEL IS USUALLY BETTER THAN DELETE ──────────────────────────────────────────────────
 *
 * `--cancel` sets status to 'cancelled' instead. The row stops holding a seat and stops
 * reserving its members' phone numbers — which is what a cancelled registration means in this
 * model — while staying readable. For genuine test rows that pollute an admin list, deletion
 * is the honest answer and that is the default; for anything with a history worth keeping,
 * cancel first and delete later if it still looks right.
 *
 * ── IT IS SCOPED BY THE HACKATHON, NOT BY THE TENANT ──────────────────────────────────────
 *
 * The hackathon id is the one identifier whoever is doing this already has: it is in the admin
 * URL they are looking at. A tenant id is not — it has to be looked up, and a mistyped one on a
 * delete either silently matches nothing or, worse, matches the wrong organisation's row with
 * the same code. Scoping to one event also means a code typed from the wrong list cannot reach
 * across into another event.
 *
 * The tenant is READ from the rows rather than supplied, and a row from an unexpected tenant is
 * refused rather than deleted.
 *
 *   npx ts-node src/scripts/removeHackathonRegistrations.ts <hackathonId> <CODE> [CODE...]
 *   npx ts-node src/scripts/removeHackathonRegistrations.ts <hackathonId> <CODE> [CODE...] --apply
 *   npx ts-node src/scripts/removeHackathonRegistrations.ts <hackathonId> <CODE> [CODE...] --cancel --apply
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import HackathonRegistration from '../models/HackathonRegistration';
import Hackathon from '../models/Hackathon';

dotenv.config();

const CODE_SHAPE = /^HK-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

(async () => {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter(a => a.startsWith('--')));
  const positional = args.filter(a => !a.startsWith('--'));

  const hackathonId = positional[0];
  const codes = positional.slice(1).map(c => c.trim().toUpperCase());

  const apply = flags.has('--apply');
  const cancelOnly = flags.has('--cancel');
  const includePaid = flags.has('--include-paid');

  if (!hackathonId || !codes.length) {
    console.error('Usage: removeHackathonRegistrations.ts <hackathonId> <CODE> [CODE...] '
      + '[--apply] [--cancel] [--include-paid]');
    console.error('The hackathon id is the last part of the admin URL for the event.');
    process.exit(1);
  }
  if (!mongoose.Types.ObjectId.isValid(hackathonId)) {
    console.error(`"${hackathonId}" is not a hackathon id. Nothing was read or written.`);
    process.exit(1);
  }

  const malformed = codes.filter(c => !CODE_SHAPE.test(c));
  if (malformed.length) {
    console.error(`These do not look like registration codes: ${malformed.join(', ')}`);
    console.error('Expected the form HK-XXXX-XXXX. Nothing was read or written.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const event = await Hackathon.findById(hackathonId).select('title slug tenantId').lean() as any;
  if (!event) {
    console.error(`No hackathon with id ${hackathonId}. Nothing was read or written.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const rows = await HackathonRegistration.find({
    hackathonId: new mongoose.Types.ObjectId(hackathonId),
    registrationCode: { $in: codes },
  }).lean() as any[];

  /**
   * Every row must belong to the event's own tenant.
   *
   * It always will — a registration is created against one hackathon — so this is a guard
   * against a data state nobody expects rather than a case to handle. If it ever fires,
   * deleting would be the wrong response to something nobody understands yet.
   */
  const foreign = rows.filter(r => String(r.tenantId) !== String(event.tenantId));
  if (foreign.length) {
    console.error(`${foreign.length} row(s) belong to a different tenant than the hackathon. `
      + 'Refusing to touch anything.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const found = new Set(rows.map(r => String(r.registrationCode)));
  const missing = codes.filter(c => !found.has(c));

  console.log(`\nHACKATHON REGISTRATIONS — ${apply ? (cancelOnly ? 'CANCEL' : 'DELETE') : 'DRY RUN'}`);
  console.log(`event   ${event.title} (${event.slug})`);
  console.log(`tenant  ${event.tenantId}   — read from the event, not supplied`);
  console.log(`asked for ${codes.length}, found ${rows.length}\n`);

  if (missing.length) {
    console.log(`NOT FOUND (${missing.length}) — nothing to do for these:`);
    for (const c of missing) console.log(`  ${c}`);
    console.log('');
  }

  const paid: any[] = [];
  const actionable: any[] = [];

  for (const r of rows) {
    const p = r.payment || null;
    const isPaid = p?.status === 'paid';
    (isPaid ? paid : actionable).push(r);

    console.log(`  ${r.registrationCode}`);
    console.log(`    team       ${r.teamName}`);
    console.log(`    college    ${r.college}`);
    console.log(`    status     ${r.status}`);
    console.log(`    amount     ₹${r.amountInr}`);
    console.log(`    payment    ${p ? `${p.status}${p.paymentId ? ` · ${p.paymentId}` : ''}` : 'none'}`);
    console.log(`    members    ${(r.members || []).length}`);
    for (const m of (r.members || [])) {
      console.log(`      - ${m.name}${m.isLead ? ' (lead)' : ''}  ${m.mobile}  ${m.email || '(no email)'}`);
    }
    console.log(`    created    ${new Date(r.createdAt).toISOString()}`);
    console.log('');
  }

  if (paid.length && !includePaid) {
    console.log(`SKIPPED — ${paid.length} of these have a COMPLETED PAYMENT:`);
    for (const r of paid) {
      console.log(`  ${r.registrationCode}  ${r.teamName}  ₹${r.amountInr}  ${r.payment?.paymentId || ''}`);
    }
    console.log('  Deleting these would destroy the only record on our side that money was taken.');
    console.log('  Pass --include-paid if that is genuinely what you want.\n');
  }

  const targets = includePaid ? rows : actionable;

  if (!apply) {
    console.log(`Dry run. Nothing was written.`);
    console.log(`Would ${cancelOnly ? 'cancel' : 'delete'} ${targets.length} registration(s).`);
    await mongoose.disconnect();
    return;
  }

  if (!targets.length) {
    console.log('Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  const ids = targets.map(r => r._id);
  if (cancelOnly) {
    const res = await HackathonRegistration.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'cancelled', cancelReason: 'Removed as test data by an administrator.' } },
    );
    console.log(`cancelled: ${res.modifiedCount}`);
  } else {
    const res = await HackathonRegistration.deleteMany({ _id: { $in: ids } });
    console.log(`deleted: ${res.deletedCount}`);
  }

  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
