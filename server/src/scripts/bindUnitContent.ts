/**
 * Bind content to Learning Units, where — and only where — the mapping is unambiguous.
 *
 * DRY RUN BY DEFAULT. Run the audit first; this shares its classifier, so the two cannot report
 * different answers.
 *
 *   npx ts-node src/scripts/auditUnitContentCoverage.ts <tenantId>
 *   npx ts-node src/scripts/bindUnitContent.ts <tenantId>
 *   npx ts-node src/scripts/bindUnitContent.ts <tenantId> --apply
 *
 * IT BINDS ONLY EXACT, AND ONLY PUBLISHED. Everything else is left to the resolver's existing
 * fallback, which already serves it correctly:
 *
 *   BROAD     topic-level material genuinely serves every unit of its topic. Binding it to one
 *             would remove it from the other eleven — a loss disguised as precision.
 *   SHARED    the same, with the ambiguity visible rather than guessed at.
 *   UNMAPPED  no relationship to invent.
 *
 * AGAINST THE CURRENT LIBRARY THIS BINDS NOTHING, and that is the correct outcome: all 368 rows
 * were authored against topics and skills, not against units. The script exists for the content
 * that has not been written yet.
 *
 * IT NEVER STEALS. A row another unit already owns is reported and skipped; reassigning it would
 * remove content from a lesson nobody was looking at.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningContentLibrary from '../models/LearningContentLibrary';
import LearningCurriculum from '../models/LearningCurriculum';
import {
  classifyContent, isAutoBindable, MappableUnit, MappingClass,
} from '../services/unitContentMappingService';

dotenv.config();

const STAGE = 'foundation';

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) {
    console.error('Usage: bindUnitContent.ts <tenantId> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const [units, library, curriculum] = await Promise.all([
    CurriculumLearningUnit.find({ tenantId, stageKey: STAGE })
      .select('unitCode title topicCode skillKeys').lean() as any,
    LearningContentLibrary.find({ tenantId })
      .select('title type topicCode skillKeys isPublished unitCode').lean() as any,
    LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).select('topics').lean() as any,
  ]);

  const topicTitleByCode = new Map<string, string>(
    ((curriculum?.topics || []) as any[]).filter(t => t.topicCode)
      .map(t => [String(t.topicCode), String(t.title)]),
  );

  const unitsByTopic = new Map<string, MappableUnit[]>();
  const unitsBySkill = new Map<string, MappableUnit[]>();
  for (const u of units as any[]) {
    const unit: MappableUnit = {
      unitCode: String(u.unitCode), title: String(u.title),
      topicCode: String(u.topicCode), skillKeys: u.skillKeys || [],
    };
    unitsByTopic.set(unit.topicCode, [...(unitsByTopic.get(unit.topicCode) || []), unit]);
    for (const k of unit.skillKeys || []) {
      unitsBySkill.set(String(k), [...(unitsBySkill.get(String(k)) || []), unit]);
    }
  }

  console.log(`\nBIND UNIT CONTENT  ·  tenant ${tenantId}`);
  console.log(apply ? 'APPLYING\n' : 'DRY RUN — pass --apply to write\n');

  const counts: Record<MappingClass, number> = { EXACT: 0, SHARED: 0, BROAD: 0, UNMAPPED: 0 };
  const toBind: { id: string; title: string; unitCode: string }[] = [];
  const alreadyOwned: string[] = [];
  const unpublishedExact: string[] = [];

  for (const row of library as any[]) {
    const result = classifyContent({
      content: row, unitsByTopic, unitsBySkill, topicTitleByCode,
    });
    counts[result.classification]++;

    if (result.classification !== 'EXACT') continue;

    if (!isAutoBindable(result, row)) {
      unpublishedExact.push(String(row.title));
      continue;
    }

    const target = result.matchedUnitCodes[0];
    const current = String(row.unitCode || '');
    if (current && current !== target) {
      alreadyOwned.push(`"${row.title}" is on ${current}, not ${target}`);
      continue;
    }
    if (current === target) continue;   // already bound where it belongs

    toBind.push({ id: String(row._id), title: String(row.title), unitCode: target });
  }

  console.log('  CLASSIFICATION');
  for (const k of ['EXACT', 'SHARED', 'BROAD', 'UNMAPPED'] as MappingClass[]) {
    console.log(`    ${k.padEnd(12)}${String(counts[k]).padStart(5)}`);
  }

  console.log('\n  BINDINGS');
  console.log(`    to write               ${toBind.length}`);
  console.log(`    EXACT but unpublished  ${unpublishedExact.length}  (a row that resolves for nothing is not bound)`);
  console.log(`    owned by another unit  ${alreadyOwned.length}  (reported, never reassigned)`);
  for (const a of alreadyOwned.slice(0, 10)) console.log(`      ${a}`);

  for (const b of toBind.slice(0, 25)) {
    console.log(`      ${b.unitCode.padEnd(32)}${b.title.slice(0, 44)}`);
  }

  if (apply && toBind.length) {
    await LearningContentLibrary.bulkWrite(toBind.map(b => ({
      updateOne: {
        filter: { tenantId, _id: new mongoose.Types.ObjectId(b.id) },
        update: { $set: { unitCode: b.unitCode } },
      },
    })));
    console.log(`\n  ${toBind.length} rows bound.`);
  } else if (apply) {
    console.log('\n  Nothing to bind.');
  } else {
    console.log(`\n  ${toBind.length} rows would be bound. Re-run with --apply.`);
  }

  const bound = await LearningContentLibrary.countDocuments({ tenantId, unitCode: { $exists: true, $ne: '' } });
  console.log(`  Library rows currently carrying a unitCode: ${bound} of ${library.length}.\n`);

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
