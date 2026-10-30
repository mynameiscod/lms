/**
 * Read-only: who the Problem Bank's published problems are given to, and so what the CareerPilot
 * practice library shows.
 *
 * WHY. The library lists published problems given to CareerPilot ("Available to" in the Problem
 * Bank). Problems written before that setting existed read as LMS only, and new ones start as not
 * assigned, so after this release an institute's library is empty until an admin gives problems to
 * CareerPilot: Problem Bank → filter → tick the page → "Select all N that match the filters" → Available to → Give to CareerPilot.
 * This prints, per institute and for the CodeBegun shared library, how many published problems
 * are in each state. It changes nothing.
 *
 *   npx ts-node src/scripts/checkPracticeLibrary.ts
 *   node dist/scripts/checkPracticeLibrary.js          # in the container
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import CodingProblem, { availableTo, notAssigned } from '../models/CodingProblem';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);

  const groups = await CodingProblem.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: { scope: '$scope', tenantId: '$tenantId' }, n: { $sum: 1 } } },
    { $sort: { '_id.scope': 1, n: -1 } },
  ]);
  console.log('\n=== Who published problems are given to (read-only) ===\n');
  let inLibrary = 0;
  for (const g of groups) {
    const base = { status: 'published', scope: g._id.scope, ...(g._id.scope === 'global' ? {} : { tenantId: g._id.tenantId }) };
    const cp = await CodingProblem.countDocuments({ ...base, ...availableTo('careerpilot') });
    const lms = await CodingProblem.countDocuments({ ...base, ...availableTo('lms') });
    const none = await CodingProblem.countDocuments({ ...base, ...notAssigned() });
    const legacy = await CodingProblem.countDocuments({ ...base, audiences: { $exists: false } });
    const label = g._id.scope === 'global' ? 'CodeBegun shared library' : `institute ${g._id.tenantId}`;
    console.log(`${label}: ${g.n} published`);
    console.log(`   in the CareerPilot practice library (given to CareerPilot): ${cp}`);
    console.log(`   usable in LMS sets and exams: ${lms}${legacy ? ` (${legacy} of them older problems with no setting yet, read as LMS only)` : ''}`);
    if (none) console.log(`   not assigned to anyone yet: ${none}`);
    inLibrary += cp;
  }
  console.log(inLibrary
    ? `\n${inLibrary} published problem(s) are in the CareerPilot practice library.\n`
    : '\nThe CareerPilot practice library is empty. In the Problem Bank, filter the problems members should practise, tick the page, choose "Select all N that match the filters", then Available to → Give to CareerPilot.\n');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
