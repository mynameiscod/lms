/**
 * Make the diagnostic measure what the curriculum teaches.
 *
 * THE MISALIGNMENT THIS CLOSES. The foundation stage set and the Year-1 curriculum were authored
 * independently, so the instrument and the syllabus were looking at different things: 47 skills
 * measured, 34 taught, 23 in common. Three consequences, all of them invisible from a screen —
 * eleven taught skills could never be personalised because nothing ever asked about them,
 * twenty-four slots were spent measuring capabilities with no lesson behind them, and 47 skills
 * competing for 16 items left the paper short so a no-role first-year was refused outright.
 *
 * WHAT IT DOES. Rebuilds the stage set from the curriculum's own skill keys. Importance and
 * weight come from how the curriculum treats each skill — a mandatory topic's skills are
 * ESSENTIAL, a direction-scoped topic's are IMPORTANT — so the ranking that decides which
 * skills a paper samples follows the teaching rather than an unrelated list.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not delete the skills it drops from the set. They
 * remain in the taxonomy, still measurable by a role blueprint, still teachable. Only this
 * stage's opinion of what a first-year should be measured on changes.
 *
 * ORDER IS PRESERVED FROM THE CURRICULUM, which matters more than it looks: ranking falls back
 * to alphabetical when nothing else distinguishes equally-weighted skills, and 47 equal skills
 * yielded an all-aptitude paper with Loops and Conditionals never appearing.
 *
 *   npx ts-node src/seeds/careerPilot/alignStageSetToCurriculum.ts <tenantId> [--stage=foundation]
 *   npx ts-node src/seeds/careerPilot/alignStageSetToCurriculum.ts <tenantId> --apply
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningCurriculum from '../../models/LearningCurriculum';
import StageSkillSet from '../../models/StageSkillSet';
import CareerSkill from '../../models/CareerSkill';
import SkillEvidence from '../../models/SkillEvidence';

dotenv.config();

/**
 * How many questions a skill needs before it can hold a slot.
 *
 * Two, matching the generator's own floor. A skill with one question can be asked once and then
 * has nothing left, which is how a paper ends up short — the exact failure that refused a
 * no-role first-year.
 */
const MIN_QUESTIONS_TO_MEASURE = 2;

export interface AlignReport {
  stage: string;
  taught: number;
  measurable: number;
  unmeasurable: string[];
  kept: number;
  added: string[];
  dropped: string[];
  applied: boolean;
}

export async function alignStageSetToCurriculum(opts: {
  tenantId: string;
  stage?: string;
  apply?: boolean;
}): Promise<AlignReport> {
  const tenantId = opts.tenantId;
  const stage = opts.stage || 'foundation';

  const curriculum = await LearningCurriculum.findOne({
    tenantId, adaptiveStage: stage, isPublished: true, personalizedFor: null,
  }).lean() as any;
  if (!curriculum) throw new Error(`No curriculum claims stage "${stage}" for tenant ${tenantId}.`);

  /**
   * Skills in curriculum order, carrying how the curriculum treats them.
   *
   * First appearance wins: a skill taught by a mandatory topic early and a direction topic later
   * is essential, not optional, and the earlier position is the one a student meets first.
   */
  const taught = new Map<string, { mandatory: boolean; order: number }>();
  for (const [i, t] of ((curriculum.topics || []) as any[]).entries()) {
    for (const raw of (t.skillKeys || [])) {
      const key = String(raw).toUpperCase();
      if (!taught.has(key)) taught.set(key, { mandatory: t.mandatory !== false, order: i });
    }
  }

  const keys = [...taught.keys()];

  // Only skills that are real, assessable, and have enough questions to be asked.
  const skills = await CareerSkill.find({
    key: { $in: keys }, active: true, assessable: true, nodeType: { $ne: 'GROUP' },
  }).select('key').lean() as any[];
  const assessable = new Set(skills.map(s => String(s.key).toUpperCase()));

  const counts = await SkillEvidence.aggregate([
    { $match: { tenantId, skillKey: { $in: keys }, contribution: 'PRIMARY', active: true } },
    { $group: { _id: '$skillKey', n: { $sum: 1 } } },
  ]);
  const questionCount = new Map(counts.map((c: any) => [String(c._id).toUpperCase(), c.n]));

  const measurable: string[] = [];
  const unmeasurable: string[] = [];
  for (const key of keys) {
    const askable = assessable.has(key) && (questionCount.get(key) || 0) >= MIN_QUESTIONS_TO_MEASURE;
    (askable ? measurable : unmeasurable).push(key);
  }

  // Sorted by the order the curriculum introduces them, so the ranking follows the teaching.
  measurable.sort((a, b) => (taught.get(a)!.order - taught.get(b)!.order) || a.localeCompare(b));

  const requirements = measurable.map((key, i) => {
    const info = taught.get(key)!;
    return {
      skillKey: key,
      // Importance follows the curriculum's own judgement rather than a default.
      importance: info.mandatory ? 'ESSENTIAL' : 'IMPORTANT',
      weight: info.mandatory ? 9 : 6,
      targetLevel: 'FOUNDATION',
      active: true,
      displayOrder: (i + 1) * 10,
    };
  });

  const existing = await StageSkillSet.findOne({ tenantId, stage });
  const before = new Set(((existing?.requirements || []) as any[])
    .filter(r => r.active !== false)
    .map(r => String(r.skillKey).toUpperCase()));
  const after = new Set(measurable);

  const report: AlignReport = {
    stage,
    taught: keys.length,
    measurable: measurable.length,
    unmeasurable,
    kept: [...after].filter(k => before.has(k)).length,
    added: [...after].filter(k => !before.has(k)),
    dropped: [...before].filter(k => !after.has(k)),
    applied: false,
  };

  if (!opts.apply) return report;

  await StageSkillSet.findOneAndUpdate(
    { tenantId, stage },
    {
      tenantId, stage, enabled: true, requirements,
      label: `${stage} — aligned to ${curriculum.title}`,
      version: ((existing as any)?.version || 0) + 1,
    },
    { upsert: true, new: true },
  );

  report.applied = true;
  return report;
}

/* ------------------------------------------------------------------ */

if (require.main === module) {
  (async () => {
    const tenantId = process.argv[2];
    const stageArg = process.argv.find(a => a.startsWith('--stage='));
    const apply = process.argv.includes('--apply');
    if (!tenantId) {
      console.error('Usage: alignStageSetToCurriculum.ts <tenantId> [--stage=foundation] [--apply]');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
    const r = await alignStageSetToCurriculum({
      tenantId, stage: stageArg ? stageArg.split('=')[1] : 'foundation', apply,
    });

    console.log(`\nstage "${r.stage}"`);
    console.log(`  curriculum teaches : ${r.taught} skills`);
    console.log(`  askable now        : ${r.measurable}  (>= ${MIN_QUESTIONS_TO_MEASURE} questions each)`);
    console.log(`  already in the set : ${r.kept}`);
    console.log(`  ADDED              : ${r.added.length}${r.added.length ? '  ' + r.added.join(', ') : ''}`);
    console.log(`  DROPPED            : ${r.dropped.length}${r.dropped.length ? '  ' + r.dropped.join(', ') : ''}`);
    if (r.unmeasurable.length) {
      console.log(`\n  taught but NOT askable yet (${r.unmeasurable.length}) — needs questions before it can be measured:`);
      console.log('    ' + r.unmeasurable.join(', '));
    }
    console.log(apply ? '\n✅ stage set rewritten' : '\n(dry run — pass --apply to write)');
    await mongoose.disconnect();
  })().catch(e => { console.error('ERR', e.message); process.exit(1); });
}
