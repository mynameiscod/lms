/**
 * Apply the Year-1 skill map to a tenant's foundation curriculum.
 *
 * IDEMPOTENT. Running it twice changes nothing the second time — it matches topics by
 * topicCode, then by title, and updates in place. A seed that duplicates on re-run is a seed
 * nobody dares run on production, which means the mapping never gets applied at all.
 *
 * IT REFUSES RATHER THAN INVENTS. Every skill key is checked against the CareerSkill taxonomy
 * before anything is written, and an unknown key aborts the whole run. A mistyped key would
 * otherwise create a mapping to a skill that has no blueprint, no questions and no meaning —
 * and it would join students' plans silently.
 *
 * DRY RUN BY DEFAULT. Nothing is written without --apply, because the first thing anyone should
 * do with a seed against real data is read what it intends to change.
 *
 *   ts-node src/seeds/careerPilot/seedFoundationCurriculum.ts --tenant=<id> --curriculum=<id>
 *   ts-node src/seeds/careerPilot/seedFoundationCurriculum.ts --tenant=<id> --curriculum=<id> --apply
 */

import mongoose from 'mongoose';
import LearningCurriculum from '../../models/LearningCurriculum';
import CareerSkill from '../../models/CareerSkill';
import { FOUNDATION_MODULES, referencedSkillKeys, isMandatoryCategory } from './foundationSkillMap';

export interface SeedReport {
  matched: number;
  updated: number;
  unmatchedTopics: string[];
  unknownSkillKeys: string[];
  applied: boolean;
}

/**
 * Match a curriculum topic to a seed topic.
 *
 * By code first — that is what codes are for. Falling back to a normalised title match is what
 * makes this usable against curricula authored before codes existed, which is all of them.
 */
const normalise = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

export async function seedFoundationCurriculum(opts: {
  tenantId: string;
  curriculumId: string;
  apply?: boolean;
}): Promise<SeedReport> {
  const report: SeedReport = {
    matched: 0, updated: 0, unmatchedTopics: [], unknownSkillKeys: [], applied: false,
  };

  // 1. Validate every skill key BEFORE touching the curriculum.
  const wanted = referencedSkillKeys();
  const known = await CareerSkill.find({ key: { $in: wanted } }).select('key').lean() as any[];
  const knownSet = new Set(known.map(k => String(k.key).toUpperCase()));
  report.unknownSkillKeys = wanted.filter(k => !knownSet.has(k.toUpperCase()));

  if (report.unknownSkillKeys.length) {
    // Refuse the whole run. A partial mapping is worse than none: the missing half looks like
    // content nobody authored rather than a seed that stopped early.
    return report;
  }

  const curriculum = await LearningCurriculum.findOne({
    _id: opts.curriculumId, tenantId: opts.tenantId,
  });
  if (!curriculum) throw new Error(`No curriculum ${opts.curriculumId} for tenant ${opts.tenantId}`);

  // 2. Index the seed by both keys we can match on.
  const byCode = new Map<string, any>();
  const byTitle = new Map<string, any>();
  for (const m of FOUNDATION_MODULES) {
    for (const t of m.topics) {
      const entry = { module: m, topic: t };
      byCode.set(t.topicCode, entry);
      byTitle.set(normalise(t.title), entry);
    }
  }

  // 3. Map each existing topic, in place.
  for (const topic of (curriculum.topics || []) as any[]) {
    const hit = (topic.topicCode && byCode.get(topic.topicCode)) || byTitle.get(normalise(topic.title));
    if (!hit) { report.unmatchedTopics.push(topic.title); continue; }

    report.matched++;
    const { module: m, topic: t } = hit;

    const next = {
      moduleCode: m.moduleCode,
      topicCode: t.topicCode,
      skillKeys: t.skillKeys,
      prerequisiteSkillKeys: t.prerequisiteSkillKeys || [],
      defaultDepth: t.defaultDepth,
      mandatory: isMandatoryCategory(t.category),
      applicableDirections: t.applicableDirections,
      learningOutcomes: t.learningOutcomes,
    };

    const changed = JSON.stringify({
      moduleCode: topic.moduleCode, topicCode: topic.topicCode,
      skillKeys: topic.skillKeys, prerequisiteSkillKeys: topic.prerequisiteSkillKeys,
      defaultDepth: topic.defaultDepth, mandatory: topic.mandatory,
      applicableDirections: topic.applicableDirections, learningOutcomes: topic.learningOutcomes,
    }) !== JSON.stringify(next);

    if (!changed) continue;
    report.updated++;
    if (opts.apply) Object.assign(topic, next);
  }

  if (opts.apply && report.updated) {
    await curriculum.save();
    report.applied = true;
  }

  return report;
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

if (require.main === module) {
  const arg = (name: string) => {
    const hit = process.argv.find(a => a.startsWith(`--${name}=`));
    return hit ? hit.split('=')[1] : '';
  };
  const apply = process.argv.includes('--apply');

  (async () => {
    const tenantId = arg('tenant');
    const curriculumId = arg('curriculum');
    if (!tenantId || !curriculumId) {
      console.error('Usage: --tenant=<id> --curriculum=<id> [--apply]');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
    const r = await seedFoundationCurriculum({ tenantId, curriculumId, apply });

    if (r.unknownSkillKeys.length) {
      console.error('\nREFUSED — these skill keys do not exist in the taxonomy:');
      for (const k of r.unknownSkillKeys) console.error('  ' + k);
      console.error('\nSeed the CareerSkill taxonomy first, or correct the map. Nothing was written.');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`\nmatched  : ${r.matched}`);
    console.log(`to update: ${r.updated}`);
    if (r.unmatchedTopics.length) {
      console.log(`\nunmatched topics (${r.unmatchedTopics.length}) — these keep their current mapping:`);
      for (const t of r.unmatchedTopics) console.log('  ' + t);
    }
    console.log(apply ? '\n✅ written' : '\n(dry run — pass --apply to write)');

    await mongoose.disconnect();
  })().catch(e => { console.error('ERR', e.message); process.exit(1); });
}
