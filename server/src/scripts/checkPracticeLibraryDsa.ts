/**
 * Read-only: what the CareerPilot practice library will show once it lists only DSA problems.
 *
 * WHY. The library now lists published problems tagged DSA (any case) that are available to
 * CareerPilot (see problemLibraryService.visible). Before, it listed every published problem. If
 * the problems an institute relied on are not tagged DSA, its library looks empty after the deploy.
 * This prints, per scope, how many published problems there are, how many the library keeps, and
 * a few titles it drops, so they can be tagged DSA in the Problem Bank. It changes nothing.
 *
 *   npx ts-node src/scripts/checkPracticeLibraryDsa.ts
 *   node dist/scripts/checkPracticeLibraryDsa.js        # in the container
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import CodingProblem, { availableTo, DSA_TAG } from '../models/CodingProblem';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);

  const groups = await CodingProblem.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: { scope: '$scope', tenantId: '$tenantId' }, n: { $sum: 1 } } },
    { $sort: { '_id.scope': 1, n: -1 } },
  ]);
  console.log('\n=== CareerPilot practice library: DSA only (read-only check) ===\n');
  let dropped = 0;
  for (const g of groups) {
    const base = { status: 'published', scope: g._id.scope, ...(g._id.scope === 'global' ? {} : { tenantId: g._id.tenantId }) };
    const kept = await CodingProblem.countDocuments({ ...base, tags: DSA_TAG, ...availableTo('careerpilot') });
    const lost = await CodingProblem.find({ ...base, $nor: [{ tags: DSA_TAG }] }).select('number title').sort({ number: 1 }).limit(5).lean() as any[];
    const label = g._id.scope === 'global' ? 'CodeBegun shared library' : `institute ${g._id.tenantId}`;
    console.log(`${label}: ${g.n} published · ${kept} stay in the library · ${g.n - kept} leave it`);
    if (lost.length) console.log(`   not tagged DSA, e.g.: ${lost.map(p => `#${p.number} ${p.title}`).join(' | ')}`);
    dropped += g.n - kept;
  }
  console.log(dropped
    ? `\n${dropped} published problem(s) will no longer show in the practice library. Tag the ones members should practise "DSA" in the Problem Bank (they stay usable in exams and problem sets either way).\n`
    : '\nEvery published problem is tagged DSA: the library keeps all of them.\n');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
