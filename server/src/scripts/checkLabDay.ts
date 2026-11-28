/**
 * Why does a batch's students get (or not get) today's lab question? READ ONLY; changes nothing.
 *
 * Checks, for one batch and one lab, everything that decides it:
 *   1. the batch's track for the lab: attached, published, start date, working days, cadence, window
 *   2. which day of the track today is, and whether that day has questions
 *   3. a question scheduled by hand for today (Communication Lab page), which wins over the track
 *   4. the students: how many have this batch on their account, and how many get the lab from a
 *      placement batch instead
 * and prints a verdict.
 *
 *   node dist/scripts/checkLabDay.js --batch "Alpha -06" [--lab communication|thinking] [--tenant <id>]
 *   npx ts-node src/scripts/checkLabDay.ts --batch "Alpha -06"
 *
 * --batch takes the batch name (exact, any case) or its id.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Batch from '../models/Batch';
import User from '../models/User';
import { LabTrack, LabTrackItem, LabTrackAssignment } from '../models/LabTrack';
import CommunicationSchedule from '../models/CommunicationSchedule';
import { resolveDayFor, ymdIn, windowState } from '../services/labTrackService';
import { labBatchOverrides } from '../services/placementBatchService';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  const batchArg = arg('batch');
  const lab = (arg('lab') || 'communication') as 'thinking' | 'communication';
  const tenantArg = arg('tenant');
  if (!batchArg || !['thinking', 'communication'].includes(lab)) {
    console.error('Usage: --batch "<name or id>" [--lab communication|thinking] [--tenant <id>]');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const problems: string[] = [];
  const now = new Date();
  const today = ymdIn(now);
  console.log(`Today (IST): ${today} ${DAYS[new Date(`${today}T12:00:00+05:30`).getUTCDay()]}, ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now)}`);
  console.log(`Lab: ${lab}\n`);

  // ── 1. the batch
  const q: any = mongoose.isValidObjectId(batchArg) ? { _id: batchArg } : { name: new RegExp(`^\\s*${esc(batchArg.trim())}\\s*$`, 'i') };
  if (tenantArg) q.tenantId = new mongoose.Types.ObjectId(tenantArg);
  const batches: any[] = await Batch.find(q).select('name tenantId kind takesOverLabs isActive').lean();
  if (!batches.length) { console.log(`No batch matches "${batchArg}".`); return mongoose.disconnect(); }
  if (batches.length > 1) {
    console.log('Several batches match; run again with --tenant <id> or the batch id:');
    batches.forEach(b => console.log(`  ${b._id}  "${b.name}"  tenant ${b.tenantId}`));
    return mongoose.disconnect();
  }
  const b = batches[0];
  const T = String(b.tenantId);
  console.log(`BATCH  "${b.name}"  id ${b._id}  tenant ${T}${b.isActive === false ? '  (INACTIVE)' : ''}${b.kind === 'placement' ? `  placement batch, takes over: ${(b.takesOverLabs || []).join(', ') || 'nothing'}` : ''}`);

  // ── 2. its track
  const a: any = await LabTrackAssignment.findOne({ tenantId: T, batchId: b._id, lab, status: 'active' }).lean();
  if (!a) {
    problems.push(`No ${lab} track is attached to this batch (Daily Lab Tracks → Batch Assignments).`);
  } else {
    const track: any = await LabTrack.findById(a.trackId).lean();
    console.log(`TRACK  "${track?.name || '(deleted)'}"  status ${track?.status || '-'}`);
    console.log(`       start ${ymdIn(new Date(a.startDate))}  working days ${(a.workingDays || [1, 2, 3, 4, 5]).map((d: number) => DAYS[d]).join(' ')}`
      + `  cadence ${a.cadence || 'daily'}${a.cadence === 'custom' ? ` (${(a.cadenceDays || []).map((d: number) => DAYS[d]).join(' ')})` : ''}`
      + `  window ${a.window?.startTime || '00:00'}-${a.window?.endTime || '23:59'} IST  gate ${a.gate?.mode || 'off'}`);
    if ((a.holidays || []).length) console.log(`       holidays ${(a.holidays || []).join(', ')}`);
    const days: number[] = (await LabTrackItem.distinct('dayIndex', { trackId: a.trackId })).sort((x: number, y: number) => x - y);
    console.log(`       days with questions: ${days.length ? `${days.length} (day ${days[0]} to day ${days[days.length - 1]})` : 'NONE'}`);

    const r: any = await resolveDayFor(a, now);
    if (!track) problems.push('The attached track was deleted.');
    else if (r.reason === 'track_unpublished') problems.push(`Track "${track.name}" is a DRAFT. Publish it on the Tracks tab.`);
    else if (r.reason === 'not_started') problems.push(`The track starts on ${ymdIn(new Date(a.startDate))}, after today.`);
    else if (r.reason === 'non_learning_day') problems.push(`Today is not a learning day for this batch (working days / cadence / holiday).`);
    else if (r.reason === 'no_item') {
      problems.push(r.dayIndex > (r.trackDays || 0)
        ? `Today is day ${r.dayIndex}, but the track only has questions up to day ${r.trackDays || 0}.`
        : `Today is day ${r.dayIndex} and that day of the track has NO questions. Add them on the Tracks tab.`);
    } else if (r.dayIndex) {
      console.log(`TODAY  day ${r.dayIndex}, ${r.items.length} question(s), window is ${windowState(a, now)}`);
      if (windowState(a, now) !== 'open') problems.push(`The window is ${windowState(a, now)} right now (${a.window?.startTime}-${a.window?.endTime} IST); students see it only inside the window.`);
    }
  }

  // ── 3. a question set by hand for today wins over the track
  if (lab === 'communication') {
    const sc: any = await CommunicationSchedule.findOne({ tenantId: T, batchId: b._id, date: today }).lean();
    if (sc) {
      console.log(`MANUAL A question was scheduled by hand for today (challenge ${sc.challengeId}, ${sc.startTime || '00:00'}-${sc.endTime || '23:59'}). It wins over the track.`);
      problems.push('A hand-scheduled question for today replaces the track question. Remove it on the Communication Lab page if that is not wanted.');
    }
  }

  // ── 4. the students
  const home: any[] = await User.find({ tenantId: b.tenantId, role: 'STUDENT', batchId: b._id, isActive: { $ne: false } }).select('_id placementBatchIds').lean();
  const members: any[] = b.kind === 'placement'
    ? await User.find({ tenantId: b.tenantId, role: 'STUDENT', placementBatchIds: b._id, isActive: { $ne: false } }).select('_id batchId').lean()
    : [];
  console.log(`\nSTUDENTS  ${home.length} active student(s) have this batch as their home batch${b.kind === 'placement' ? `; ${members.length} are members of this placement batch` : ''}.`);
  if (!home.length && !members.length) problems.push('No active student has this batch on their account, so nobody receives its lab. Check the students\' batch in Users.');

  if (home.length) {
    const over = await labBatchOverrides(T, home.map(s => s._id), lab);
    if (over.size) {
      const names = new Map((await Batch.find({ _id: { $in: [...new Set(over.values())] } }).select('name').lean()).map((x: any) => [String(x._id), x.name]));
      const per = new Map<string, number>();
      over.forEach(v => per.set(v, (per.get(v) || 0) + 1));
      per.forEach((n, id) => console.log(`          ${n} of them get the ${lab} lab from placement batch "${names.get(id) || id}" instead.`));
      problems.push(`${over.size} student(s) take this lab from a placement batch, not from "${b.name}" (expected if that placement batch is meant to run their lab).`);
    }
    // Placement batches ticked to take over this lab that have no live track: before the
    // 2026-11-28 fix these silently took the lab away from the home batch.
    const ids = [...new Set(home.flatMap(s => (s.placementBatchIds || []).map(String)))];
    if (ids.length) {
      const ticked: any[] = await Batch.find({ _id: { $in: ids }, kind: 'placement', isActive: true, takesOverLabs: lab }).select('name').lean();
      const live = new Set(Array.from(new Set((await labBatchOverrides(T, home.map(s => s._id), lab)).values())));
      const dead = ticked.filter(t => !live.has(String(t._id)));
      for (const d of dead) {
        const n = home.filter(s => (s.placementBatchIds || []).map(String).includes(String(d._id))).length;
        console.log(`          ${n} are in placement batch "${d.name}", ticked to take over ${lab} but with NO live ${lab} track.`);
        problems.push(`Placement batch "${d.name}" is ticked to take over ${lab} without a published ${lab} track. On the old code its ${n} member(s) here got NO question; after this release they get "${b.name}"'s track. Untick the takeover or give it a track.`);
      }
    }
  }

  console.log('\nVERDICT');
  if (!problems.length) console.log('  Nothing blocks it: students of this batch should see today\'s question.');
  else problems.forEach(p => console.log(`  - ${p}`));
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); await mongoose.disconnect(); process.exit(1); });
