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
import AssessmentItem from '../../models/AssessmentItem';
import { policyForStage } from '../../data/assessmentPolicies';

dotenv.config();

/**
 * How many questions a skill needs before it can hold a slot.
 *
 * Read from the policy that will draw on this set, never written down again here. A skill in the
 * set is one the paper may choose, and buildSlots chooses before it looks at any content — so a
 * skill admitted with fewer questions than the policy asks per skill produces a shortfall, and a
 * shortfall refuses the whole assessment. That is the failure that turned away a no-role
 * first-year, and it came back the moment the policy went from two items per skill to four while
 * this number stayed at two. Deriving it means raising the policy can no longer outrun the gate.
 */
const minQuestionsToMeasure = (stage: string): number => policyForStage(stage).minItemsPerSkill;

export interface AlignReport {
  stage: string;
  taught: number;
  measurable: number;
  /** The per-skill question floor this stage's policy requires. */
  minItems: number;
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

  /**
   * WHAT IS COUNTED IS DISTINCT FACTS, NOT MAPPED ROWS.
   *
   * The generated foundation bank carries about a hundred and twenty rows per fact, so counting
   * rows would report a skill with three facts as having 1,200 questions and admit it to the
   * set. The paper would then ask that skill four times, get the same knowledge back three
   * times over, and record a confident measurement of something it barely probed. An item with
   * no factKeys — anything hand-authored — counts as its own fact, which is exactly right:
   * there, one question really is one question.
   */
  const evidence = await SkillEvidence.find({
    tenantId, skillKey: { $in: keys }, contribution: 'PRIMARY', active: true,
  }).select('skillKey sourceType sourceId').lean() as any[];

  const itemIds = [...new Set(evidence
    .filter(e => e.sourceType === 'assessment_item')
    .map(e => String(e.sourceId)))]
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));

  const factsById = new Map<string, string[]>();
  if (itemIds.length) {
    const items = await AssessmentItem.find({ _id: { $in: itemIds } })
      .select('factKeys').lean() as any[];
    for (const i of items) factsById.set(String(i._id), i.factKeys || []);
  }

  const factsBySkill = new Map<string, Set<string>>();
  for (const e of evidence) {
    const key = String(e.skillKey).toUpperCase();
    let set = factsBySkill.get(key);
    if (!set) { set = new Set(); factsBySkill.set(key, set); }
    const facts = factsById.get(String(e.sourceId));
    if (facts?.length) facts.forEach(f => set!.add(f));
    else set.add(`${e.sourceType}:${e.sourceId}`);   // authored item: one question, one fact
  }
  const questionCount = new Map([...factsBySkill].map(([k, v]) => [k, v.size]));

  const minItems = minQuestionsToMeasure(stage);
  const measurable: string[] = [];
  const unmeasurable: string[] = [];
  for (const key of keys) {
    const askable = assessable.has(key) && (questionCount.get(key) || 0) >= minItems;
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
    minItems,
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
    console.log(`  askable now        : ${r.measurable}  (>= ${r.minItems} distinct FACTS each)`);
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
