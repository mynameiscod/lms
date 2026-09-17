/**
 * P8B1 — materialise the approved P8A expansion: 6 topics and 27 Learning Units.
 *
 * DRY RUN BY DEFAULT, and it VALIDATES BEFORE IT WRITES ANYTHING.
 *
 *   npx ts-node src/seeds/careerPilot/seedYear1Expansion.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedYear1Expansion.ts <tenantId> --apply
 *
 * ── VALIDATE FIRST, ALL OF IT, THEN WRITE ─────────────────────────────────────────────────
 *
 * Every check below runs against the real database before the first write, and a single failure
 * stops the run with nothing written. Validating as it goes would be worse than not validating:
 * a failure at unit nineteen leaves eighteen inserted and a curriculum in a state nobody
 * designed, which is exactly the kind of half-applied migration that is hardest to reason about
 * afterwards. All-or-nothing is cheap here because the dataset is small and known.
 *
 * ── WHAT IT REFUSES TO TOUCH ──────────────────────────────────────────────────────────────
 *
 * Author-controlled fields — status, category, defaultDepth, applicableDirections, suitableStates
 * — are written ONLY on insert, via $setOnInsert. Re-running this after somebody has published a
 * unit, rescoped it, or given it an explicit suitability must not quietly undo their decision;
 * a seed that overwrites author intent on every run makes the admin screen a lie. The same
 * convention the Year-1 mega seed already uses, for the same reason.
 *
 * The existing 310 units are not modified at all. The only writes to existing documents are the
 * six new entries appended to the curriculum's topics array.
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CurriculumLearningUnit from '../../models/CurriculumLearningUnit';
import { buildPrerequisiteGraph, findPrerequisiteCycles } from '../../data/unitPrerequisiteGraph';
import LearningCurriculum from '../../models/LearningCurriculum';
import CareerSkill from '../../models/CareerSkill';
import { PROPOSED_UNITS, PROPOSED_TOPICS } from './year1ExpansionSpec';

dotenv.config();

const STAGE = 'foundation';

interface Problem { check: string; detail: string; }

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

/**
 * Nine checks, every one of which has a real failure mode behind it.
 *
 * These are not ceremony. The Year-1 import silently SKIPS any unit whose topic is not in the
 * curriculum, so a missing topic would have produced a partial expansion with no error at all —
 * which is precisely the check that matters most here, since six of the topics are new.
 */
async function validate(tenantId: string): Promise<Problem[]> {
  const problems: Problem[] = [];
  const fail = (check: string, detail: string) => problems.push({ check, detail });

  const existingUnits = await CurriculumLearningUnit
    .find({ tenantId })
    .select('unitCode topicCode moduleCode displayOrder skillKeys createdBy').lean() as any[];
  const curriculum = await LearningCurriculum.findOne({ tenantId }).lean() as any;

  if (!curriculum) {
    fail('curriculum exists', `no LearningCurriculum for tenant ${tenantId}`);
    return problems;
  }

  const existingByCode = new Map(existingUnits.map(u => [String(u.unitCode), u]));
  const existingTopics = new Map<string, any>(
    (curriculum.topics || []).map((t: any) => [String(t.topicCode), t]),
  );
  const moduleCodes = new Set((curriculum.modules || []).map((m: any) => String(m.moduleCode)));

  /* ---- 1. unitCode uniqueness ------------------------------------- */
  /**
   * A code this seed already owns is a RE-RUN, not a collision.
   *
   * The first draft failed both of these on the second run, which meant an "idempotent" seed
   * could be applied exactly once. What must never happen is silently taking over a unit somebody
   * ELSE created under a code we want — that is a genuine clash, and it is what is still checked.
   */
  const MINE = 'year1-expansion-seed';
  const seenUnit = new Set<string>();
  for (const u of PROPOSED_UNITS) {
    if (seenUnit.has(u.unitCode)) fail('unitCode uniqueness', `${u.unitCode} appears twice in the spec`);
    seenUnit.add(u.unitCode);
    const clash = existingByCode.get(u.unitCode);
    if (clash && String(clash.createdBy) !== MINE) {
      fail('unitCode uniqueness',
        `${u.unitCode} already exists and was created by ${clash.createdBy || 'unknown'}`);
    }
  }

  /* ---- 2. topicCode uniqueness ------------------------------------ */
  const specTopics = new Set(PROPOSED_TOPICS.map(t => t.topicCode));
  const seenTopic = new Set<string>();
  for (const t of PROPOSED_TOPICS) {
    if (seenTopic.has(t.topicCode)) fail('topicCode uniqueness', `${t.topicCode} appears twice in the spec`);
    seenTopic.add(t.topicCode);
    const already = existingTopics.get(t.topicCode);
    // Present and identical is this seed having run before; present and different is a clash.
    if (already && String(already.moduleCode) !== t.moduleCode) {
      fail('topicCode uniqueness',
        `${t.topicCode} already exists in the curriculum under module ${already.moduleCode}`);
    }
  }

  /* ---- 3. displayOrder collisions --------------------------------- */
  const orderTaken = new Map<string, Set<number>>();
  for (const u of existingUnits) {
    // A unit cannot collide with itself on a re-run.
    if (seenUnit.has(String(u.unitCode))) continue;
    const k = String(u.topicCode);
    if (!orderTaken.has(k)) orderTaken.set(k, new Set());
    orderTaken.get(k)!.add(Number(u.displayOrder));
  }
  for (const u of PROPOSED_UNITS) {
    const taken = orderTaken.get(u.topicCode) || new Set<number>();
    if (taken.has(u.displayOrder)) {
      fail('displayOrder collision', `${u.unitCode} wants order ${u.displayOrder} in ${u.topicCode}, already used`);
    }
    if (!orderTaken.has(u.topicCode)) orderTaken.set(u.topicCode, new Set());
    orderTaken.get(u.topicCode)!.add(u.displayOrder);
  }

  /* ---- 4. module/topic relationships ------------------------------ */
  for (const t of PROPOSED_TOPICS) {
    if (!moduleCodes.has(t.moduleCode)) {
      fail('module exists', `topic ${t.topicCode} names module ${t.moduleCode}, which the curriculum does not have`);
    }
  }
  const topicModule = new Map<string, string>([
    ...[...existingTopics.entries()].map(([c, t]) => [c, String(t.moduleCode)] as [string, string]),
    ...PROPOSED_TOPICS.map(t => [t.topicCode, t.moduleCode] as [string, string]),
  ]);
  for (const u of PROPOSED_UNITS) {
    const owner = topicModule.get(u.topicCode);
    if (!owner) {
      // The failure mode the whole run is most exposed to: the importer would skip it silently.
      fail('topic exists', `${u.unitCode} is placed in ${u.topicCode}, which exists neither in the curriculum nor in the spec`);
    } else if (owner !== u.moduleCode) {
      fail('module/topic agree', `${u.unitCode} says module ${u.moduleCode} but ${u.topicCode} belongs to ${owner}`);
    }
  }

  /* ---- 5. prerequisite unit existence ------------------------------ */
  const allCodes = new Set<string>([...existingByCode.keys(), ...PROPOSED_UNITS.map(u => u.unitCode)]);
  for (const u of PROPOSED_UNITS) {
    for (const p of u.prerequisiteUnitCodes) {
      if (!allCodes.has(p)) fail('prerequisite unit exists', `${u.unitCode} needs ${p}, which does not exist`);
    }
  }

  /* ---- 6. prerequisite skill existence ----------------------------- */
  /**
   * Checked against the SKILL REGISTRY, which is GLOBAL and has no tenant.
   *
   * An earlier version of this check queried CareerSkill by tenantId — a field the model
   * deliberately does not have, because a skill key means the same thing everywhere ("if JAVA_OOP
   * meant two different things at two colleges, neither could be measured"). It therefore matched
   * nothing, reported the registry as empty, and silently fell back to validating against the
   * curriculum's own keys, which can only catch a typo that nothing else uses.
   *
   * The registry was never empty: all 127 skills exist and every one of the Year-1 canonical 55
   * is among them. Querying it correctly is the check.
   *
   * A skill key no CareerSkill defines is a typo that survives every other check — the unit
   * imports, composes, and simply never matches a student's profile. Unteachable rather than
   * visibly broken.
   */
  const registered = new Set(
    ((await CareerSkill.find({}).select('key').lean()) as any[]).map(s => String(s.key).toUpperCase()),
  );
  if (!registered.size) {
    fail('skill exists', 'the CareerSkill registry is empty — seed the canonical taxonomy first');
  }

  for (const u of PROPOSED_UNITS) {
    for (const k of [...u.skillKeys, ...u.prerequisiteSkillKeys]) {
      if (registered.size && !registered.has(k)) {
        fail('skill exists', `${u.unitCode} references ${k}, which no CareerSkill defines`);
      }
    }
  }
  for (const t of PROPOSED_TOPICS) {
    for (const k of [...t.skillKeys, ...t.prerequisiteSkillKeys]) {
      if (registered.size && !registered.has(k)) {
        fail('skill exists', `topic ${t.topicCode} references ${k}, which no CareerSkill defines`);
      }
    }
  }

  /* ---- 7. prerequisite cycles -------------------------------------- */
  /**
   * Walked over the WHOLE graph, existing units included.
   *
   * A cycle introduced by a new unit usually runs through old ones — A(new) needs B(old) needs
   * C(old) needs A — so checking only the 27 proposals would miss exactly the cycles this change
   * can create. A cycle is unrecoverable for the composer: nothing in the loop is ever takeable,
   * so the units silently vanish from every plan.
   */
  /**
   * The walk itself now lives in data/unitPrerequisiteGraph, and the Admin save path uses the
   * SAME one. It was inline here first; leaving a copy behind would eventually let this seed
   * and the authoring screen disagree about what a cycle is, and the curriculum would then
   * depend on which door a change came through.
   */
  const fullExisting = await CurriculumLearningUnit
    .find({ tenantId }).select('unitCode prerequisiteUnitCodes').lean() as any[];

  const deps = buildPrerequisiteGraph([
    ...existingUnits.map((u: any) => ({ unitCode: String(u.unitCode), prerequisiteUnitCodes: [] })),
    ...fullExisting.map(u => ({
      unitCode: String(u.unitCode),
      prerequisiteUnitCodes: (u.prerequisiteUnitCodes || []).map(String),
    })),
    ...PROPOSED_UNITS.map(u => ({
      unitCode: u.unitCode, prerequisiteUnitCodes: u.prerequisiteUnitCodes,
    })),
  ]);

  for (const c of findPrerequisiteCycles(deps)) fail('no prerequisite cycles', c);

  /* ---- 8. learning outcomes present -------------------------------- */
  for (const u of PROPOSED_UNITS) {
    if (!u.learningOutcomes?.length) fail('learning outcomes', `${u.unitCode} has none`);
    for (const o of u.learningOutcomes || []) {
      if (o.trim().length < 10) fail('learning outcomes', `${u.unitCode} has an empty-ish outcome: "${o}"`);
    }
    if (!u.title?.trim() || !u.description?.trim()) {
      fail('learning outcomes', `${u.unitCode} is missing a title or description`);
    }
    // The rule the Year-1 dataset set for itself: no unit hides several lessons behind a vague name.
    if (/\bbasics\b/i.test(u.title) && u.unitType === 'CONCEPT') {
      fail('no placeholder names', `${u.unitCode} is called "${u.title}"`);
    }
  }

  /* ---- 9. duration plausible --------------------------------------- */
  /**
   * One sitting, not one course. The composer treats a unit as a day, so a 300-minute "unit" is
   * really several and would distort every plan it landed in.
   */
  for (const u of PROPOSED_UNITS) {
    if (!(u.estimatedMinutes >= 30 && u.estimatedMinutes <= 180)) {
      fail('duration plausible', `${u.unitCode} is ${u.estimatedMinutes} minutes (expected 30-180)`);
    }
  }

  return problems;
}

/* ------------------------------------------------------------------ *
 * Apply
 * ------------------------------------------------------------------ */

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) {
    console.error('Usage: seedYear1Expansion.ts <tenantId> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const pad = (s: any, n: number) => String(s).padEnd(n);
  console.log(`\nYEAR-1 EXPANSION  ·  tenant ${tenantId}`);
  console.log(`  ${PROPOSED_TOPICS.length} topics, ${PROPOSED_UNITS.length} units`);

  /* ---- validate ---------------------------------------------------- */

  console.log('\nVALIDATING');
  const problems = await validate(tenantId);

  const CHECKS = [
    'curriculum exists', 'unitCode uniqueness', 'topicCode uniqueness', 'displayOrder collision',
    'module exists', 'topic exists', 'module/topic agree', 'prerequisite unit exists',
    'skill exists', 'no prerequisite cycles', 'learning outcomes', 'no placeholder names',
    'duration plausible',
  ];
  for (const c of CHECKS) {
    const hits = problems.filter(p => p.check === c);
    console.log(`  ${pad(c, 28)}${hits.length ? `FAIL (${hits.length})` : 'ok'}`);
    for (const h of hits.slice(0, 8)) console.log(`      ${h.detail}`);
    if (hits.length > 8) console.log(`      … and ${hits.length - 8} more`);
  }

  if (problems.length) {
    console.log(`\n${problems.length} problem(s). NOTHING WRITTEN.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('\n  all checks passed');

  if (!apply) {
    console.log('\nDRY RUN — pass --apply to write.\n');
    await mongoose.disconnect();
    return;
  }

  /* ---- topics ------------------------------------------------------ */

  console.log('\nAPPLYING\n');

  const curriculum = await LearningCurriculum.findOne({ tenantId }) as any;
  const have = new Set((curriculum.topics || []).map((t: any) => String(t.topicCode)));
  let topicsInserted = 0;
  let topicsSkipped = 0;

  /** Appended after the existing topics, keeping their authored order untouched. */
  let order = Math.max(0, ...(curriculum.topics || []).map((t: any) => Number(t.order) || 0));

  /**
   * Day ranges are appended past the existing ones, and they do NOT express placement.
   *
   * `startDay`/`endDay` are required by the topic schema and are legacy scheduling metadata from
   * the topic-based journey — the era this whole programme exists to replace. The unit composer
   * never reads them: a unit carries no day number, and which day a student meets it is decided
   * per student by the composer, from moduleCode, topicCode and displayOrder.
   *
   * The alternative was to interleave these six into the existing 1-117 sequence, which would
   * mean renumbering all 39 existing topics — a structural change to material nobody approved
   * changing, to satisfy a field the new engine ignores. So they are appended instead, one day
   * each, and the milestone's real placement is its module.
   *
   * IF THE LEGACY TOPIC JOURNEY IS EVER RUN AGAINST THIS CURRICULUM, these ranges need revisiting
   * — a programming checkpoint would appear after the capstone rather than after programming.
   */
  let day = Math.max(0, ...(curriculum.topics || []).map((t: any) => Number(t.endDay) || 0));

  for (const t of PROPOSED_TOPICS) {
    if (have.has(t.topicCode)) { topicsSkipped++; continue; }
    order += 1;
    day += 1;
    curriculum.topics.push({
      /**
       * A stable id. The Foundation curriculum step rewrites the topic list from its own modules, so
       * these six are re-appended on every provisioning run; a fresh id each time made a re-run a
       * change, and left any open Admin screen editing a topic id that no longer existed.
       */
      _id: new mongoose.Types.ObjectId(crypto.createHash('md5').update(`${tenantId}:stage-topic:${t.topicCode}`).digest('hex').slice(0, 24)),
      title: t.title,
      description: t.description,
      order,
      startDay: day,
      endDay: day,
      color: '#6366f1',
      moduleCode: t.moduleCode,
      topicCode: t.topicCode,
      skillKeys: t.skillKeys,
      prerequisiteSkillKeys: t.prerequisiteSkillKeys,
      defaultDepth: t.defaultDepth,
      mandatory: t.mandatory,
      applicableDirections: t.applicableDirections,
      learningOutcomes: [t.description],
    });
    topicsInserted++;
    console.log(`  topic  + ${pad(t.topicCode, 30)}${t.moduleCode}`);
  }
  if (topicsInserted) await curriculum.save();

  /* ---- units ------------------------------------------------------- */

  let created = 0;
  let updated = 0;

  for (const u of PROPOSED_UNITS) {
    const existing = await CurriculumLearningUnit
      .findOne({ tenantId, unitCode: u.unitCode }).select('_id').lean();

    await CurriculumLearningUnit.updateOne(
      { tenantId, unitCode: u.unitCode },
      {
        /**
         * Re-runnable content. Fixing a typo in a title or outcome should reach the database on
         * the next run; these are the seed's to own.
         */
        $set: {
          stageKey: STAGE,
          moduleCode: u.moduleCode,
          topicCode: u.topicCode,
          title: u.title,
          description: u.description,
          displayOrder: u.displayOrder,
          skillKeys: u.skillKeys,
          prerequisiteSkillKeys: u.prerequisiteSkillKeys,
          prerequisiteUnitCodes: u.prerequisiteUnitCodes,
          learningOutcomes: u.learningOutcomes,
          estimatedMinutes: u.estimatedMinutes,
          unitType: u.unitType,
          updatedBy: 'year1-expansion-seed',
        },
        /**
         * AUTHOR-CONTROLLED. Written once and never again.
         *
         * Publishing a unit, rescoping its directions, changing its depth or giving it an explicit
         * suitability are decisions a person makes on the admin screen. A seed that reasserted its
         * own values on every run would silently revert them, and the screen would be showing
         * something that stops being true the next time anybody runs a seed.
         */
        $setOnInsert: {
          tenantId,
          unitCode: u.unitCode,
          category: u.category,
          applicableDirections: u.applicableDirections,
          defaultDepth: u.defaultDepth,
          audience: { languages: [], years: [], branches: [] },
          mandatory: u.mandatory,
          status: 'DRAFT',
          createdBy: 'year1-expansion-seed',
          ...(u.suitableStates?.length ? { suitableStates: u.suitableStates } : {}),
        },
      },
      { upsert: true },
    );

    if (existing) { updated++; } else { created++; console.log(`  unit   + ${pad(u.unitCode, 36)}${u.unitType}`); }
  }

  /* ---- report ------------------------------------------------------ */

  const total = await CurriculumLearningUnit.countDocuments({ tenantId, stageKey: STAGE });
  console.log(`\n  topics   ${topicsInserted} inserted, ${topicsSkipped} already present`);
  console.log(`  units    ${created} created, ${updated} updated (re-run)`);
  console.log(`  total    ${total} Learning Units on this tenant`);

  const byType = new Map<string, number>();
  for (const u of await CurriculumLearningUnit.find({ tenantId, stageKey: STAGE })
    .select('unitType').lean() as any[]) {
    byType.set(String(u.unitType), (byType.get(String(u.unitType)) || 0) + 1);
  }
  console.log('\n  by type');
  for (const t of ['CONCEPT', 'PRACTICE', 'DEBUG', 'PROJECT', 'CHECKPOINT', 'REVIEW']) {
    console.log(`    ${pad(t, 14)}${byType.get(t) || 0}`);
  }

  console.log('\n  Nothing published. No content authored. UNIT mode untouched. No DayPlans.\n');
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
