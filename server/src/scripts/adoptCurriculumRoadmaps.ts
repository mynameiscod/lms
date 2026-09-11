/**
 * Move every student still on a gap-planner roadmap onto the one their curriculum decides.
 *
 * DRY RUN BY DEFAULT.
 *
 * WHY THIS IS NEEDED. The curriculum projection replaced the gap planner as the thing that
 * orders a roadmap, but `generateRoadmap` is idempotent: a plan that already exists is handed
 * back untouched, so every roadmap built before the projection kept its old ordering forever.
 * The journey screen then refused to render it as a curriculum journey — correctly — and fell
 * through to the pool journey, which is composed from a pathway template and is not the
 * student’s plan at all. Students saw blood relations and email practice while the plan they
 * had actually been given taught hardware, problem solving and variables.
 *
 * The read paths now repair this themselves (see `ensureCurriculumRoadmap`), so this script is
 * not what makes the fix work. It exists so the repair happens at a moment somebody is watching,
 * rather than scattered across whenever each student next opens a page — and so the result can
 * be counted before a deploy instead of discovered after one.
 *
 * WHAT IT DOES. For each student with an ACTIVE curriculum assignment whose active roadmap is
 * missing or was not projected from the curriculum, runs the same upgrade the read path runs.
 * A replaced plan is superseded, never deleted.
 *
 * WHAT IT DOES NOT DO. It does not touch a roadmap that is already projected, a student with no
 * curriculum assignment, or a finished programme — that last one is refused by generateRoadmap
 * and reported here as COULD_NOT, because rolling somebody into a second ninety days is a
 * commercial decision and not a migration.
 *
 *   npx ts-node src/scripts/adoptCurriculumRoadmaps.ts <tenantId>
 *   npx ts-node src/scripts/adoptCurriculumRoadmaps.ts <tenantId> --apply
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User';
import CareerRoadmap from '../models/CareerRoadmap';
import StudentCurriculumAssignment from '../models/StudentCurriculumAssignment';
import { ensureCurriculumRoadmap, CurriculumRoadmapEnsure } from '../services/careerRoadmapService';

dotenv.config();

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) {
    console.error('Usage: adoptCurriculumRoadmaps.ts <tenantId> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const assignments = await StudentCurriculumAssignment.find({
    tenantId, status: 'ACTIVE',
  }).select('studentId').lean() as any[];

  console.log(`\ntenant ${tenantId}  ·  ${assignments.length} students with an active curriculum plan`);
  console.log(apply ? 'APPLYING\n' : 'DRY RUN — pass --apply to write\n');

  const counts: Record<string, number> = {};
  let needed = 0;

  for (const a of assignments) {
    const studentId = String(a.studentId);
    const [user, roadmap] = await Promise.all([
      User.findById(studentId).select('email').lean() as any,
      CareerRoadmap.findOne({ tenantId, studentId: a.studentId, status: 'ACTIVE' })
        .select('report roadmapVersion').lean() as any,
    ]);

    const projected = roadmap?.report?.projectedFromCurriculum === 1;
    const was = !roadmap ? 'no roadmap' : projected ? 'curriculum' : 'gap planner';
    const who = String(user?.email || studentId).padEnd(34);

    if (projected) {
      counts.ALREADY_CURRICULUM = (counts.ALREADY_CURRICULUM || 0) + 1;
      console.log(`  ${who} ${was.padEnd(12)} → already correct`);
      continue;
    }

    needed += 1;

    if (!apply) {
      console.log(`  ${who} ${was.padEnd(12)} → WOULD ${roadmap ? 'upgrade' : 'build'}`);
      continue;
    }

    /**
     * One student failing is not the run failing.
     *
     * A roadmap needs readiness, which needs a role blueprint and measured evidence. Any of those
     * can be missing for one student and present for the rest, and aborting the migration on the
     * first of them would leave the tenant half-moved with no record of where it stopped.
     */
    let outcome: CurriculumRoadmapEnsure | 'ERROR' = 'ERROR';
    try {
      outcome = await ensureCurriculumRoadmap(tenantId, studentId);
    } catch (e: any) {
      console.log(`  ${who} ${was.padEnd(12)} → ERROR  ${e?.message || e}`);
    }
    counts[outcome] = (counts[outcome] || 0) + 1;
    if (outcome !== 'ERROR') console.log(`  ${who} ${was.padEnd(12)} → ${outcome}`);
  }

  console.log('');
  if (!apply) {
    console.log(`${needed} of ${assignments.length} students are on the wrong roadmap.`);
    console.log('Re-run with --apply to move them.');
  } else {
    for (const [k, v] of Object.entries(counts).sort()) console.log(`  ${k.padEnd(20)} ${v}`);
    const left = await CareerRoadmap.countDocuments({
      tenantId, status: 'ACTIVE', 'report.projectedFromCurriculum': { $ne: 1 },
    });
    console.log(`\nactive roadmaps still not curriculum-projected: ${left}`);
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
