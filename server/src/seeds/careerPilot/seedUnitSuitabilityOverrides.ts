/**
 * The handful of units whose type-derived suitability is too conservative.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/seeds/careerPilot/seedUnitSuitabilityOverrides.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedUnitSuitabilityOverrides.ts <tenantId> --apply
 *
 * ── WHY ANY OVERRIDE AT ALL ───────────────────────────────────────────────────────────────
 *
 * A CONCEPT unit is derived as instruction: NOT_EXPOSED through STANDARD, and unsuitable for
 * somebody who has demonstrated the skill. That is right for almost all 246 of them — you do not
 * re-teach `for` loops to a student who writes them fluently.
 *
 * It is wrong for a small number whose educational intent is a JUDGEMENT rather than a TECHNIQUE.
 *
 * ── THE TEST ──────────────────────────────────────────────────────────────────────────────
 *
 *   Does the unit's outcome describe a judgement EXERCISED REPEATEDLY over a career,
 *   or a technique ACQUIRED ONCE?
 *
 * A technique stops paying the moment it is held: once you can simplify a boolean expression, the
 * unit that taught you has nothing left to give. A judgement is spent again on every new problem
 * — you reason about cost every time you choose an approach, and you check generated text for
 * fabrication every time you generate some. Only the second kind survives into REVISION and
 * VERIFIED, because only the second kind still has something to say to somebody fluent.
 *
 * ── HOW THE LIST WAS ARRIVED AT ───────────────────────────────────────────────────────────
 *
 * All 246 CONCEPT units were read by title and first learning outcome. Twelve read as synthesis
 * rather than first exposure; the test above kept eight and rejected four:
 *
 *   T_BOOLEAN_SIMPLIFICATION  "Simplify a boolean expression and prove it equivalent" — a
 *                             technique. Once held, held.
 *   T_AI_LITERACY_HONESTY     "State when and how you used AI" — a disclosure norm, learned once
 *                             and thereafter habitual. Worth teaching; not worth re-serving.
 *   T_CSS_RESPONSIVE          "Make a layout work at three widths" — core CSS instruction taught
 *                             to beginners.
 *   T_FORMS_ERRORS            "Write an error message somebody can act on" — standard instruction
 *                             within forms.
 *
 * A further thirteen CONCEPT units use a deciding verb inside plainly introductory material
 * ("Choose between let and const correctly", "Choose the right list type for a set of items") and
 * were rejected without reaching the test: the verb is how the instruction is phrased, not what
 * the unit is for.
 *
 * ── WHAT THIS LIST IS NOT ─────────────────────────────────────────────────────────────────
 *
 * IT IS NOT AN ATTEMPT TO MAKE A PROFILE PASS. Eight units cannot close a sixty-nine unit deficit
 * and were never going to; the strong-universal profile still fails after this is applied, and it
 * should — the shortage is a real curriculum deficit that wants new units, not a labelling
 * problem that wants new labels. If the bar had been "make the numbers work", this list would be
 * far longer and would not survive being read.
 *
 * IT IS NOT A MASS FILL. 302 of 310 units keep `suitableStates` absent and keep deriving from
 * their type. A field set on every row would be 310 guesses written down, and a guess written
 * down is indistinguishable from a decision.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CurriculumLearningUnit from '../../models/CurriculumLearningUnit';

dotenv.config();

interface Override {
  unitCode: string;
  states: string[];
  /** The recurring judgement. If this cannot be named concretely, the override does not belong. */
  why: string;
}

/**
 * A recurring judgement: keeps every instructional state it already served, and adds the two that
 * say it still pays once the skill is held.
 *
 * The instructional states stay because the unit does not stop being useful to a learner meeting
 * it for the first time — this widens suitability, it never narrows it.
 */
const JUDGEMENT: string[] =
  ['NOT_EXPOSED', 'FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD', 'REVISION', 'VERIFIED'];

/**
 * The same, plus ENRICHMENT — for the two whose material has genuinely unbounded depth, so there
 * is something past the foundation syllabus for a strong student to go and get.
 */
const JUDGEMENT_PLUS: string[] = [...JUDGEMENT, 'ENRICHMENT'];

export const SUITABILITY_OVERRIDES: Override[] = [
  {
    unitCode: 'T_ARRAYS_COMPLEXITY',
    states: JUDGEMENT_PLUS,
    why: 'Compare two solutions by cost, not by feel. Spent again on every design choice, and the '
      + 'material runs deeper than foundation ever goes.',
  },
  {
    unitCode: 'T_DECOMPOSITION_EDGE_CASES',
    states: JUDGEMENT,
    why: 'List the edge cases before coding. Spent again on every new problem; experienced '
      + 'engineers do it more deliberately, not less.',
  },
  {
    unitCode: 'T_GENAI_HALLUCINATION',
    states: JUDGEMENT,
    why: 'Spot a plausible fabrication. Spent again on every generation, and a confident user '
      + 'needs it more than a beginner because they are trusting more output.',
  },
  {
    unitCode: 'T_ML_INTRO_WHERE_IT_FAILS',
    states: JUDGEMENT,
    why: 'Identify a model\'s likely failure mode. Spent again on every model, and it is the '
      + 'judgement that separates using ML from deploying it.',
  },
  {
    unitCode: 'T_STATS_MISLEADING',
    states: JUDGEMENT,
    why: 'Identify what a misleading chart hides. Spent again on every chart, and it requires '
      + 'command of the statistics being critiqued.',
  },
  {
    unitCode: 'T_AI_CODING_OWNERSHIP',
    states: JUDGEMENT,
    why: 'What accepting generated code commits you to. Spent again on every acceptance, and '
      + 'written for somebody already using these tools.',
  },
  {
    unitCode: 'T_CAPSTONE_CHOOSING_A_PROJECT',
    states: JUDGEMENT_PLUS,
    why: 'Scope a project you can finish. Spent again on every project, and a strong student needs '
      + 'it more, because they can attempt more and so over-reach further.',
  },
  {
    unitCode: 'T_CAREER_MAP_CHOOSING',
    states: JUDGEMENT,
    why: 'Choose a direction and say what it does not rule out. Revisited as circumstances change, '
      + 'and independent of technical level.',
  },
];

/**
 * Only when run directly.
 *
 * The list above is the reviewable artefact and tests import it, so importing this file must not
 * open a database connection or read argv — a seed script that runs on import turns `import` into
 * a side effect, and the test suite would fail on a machine with no Mongo for reasons having
 * nothing to do with the code under test.
 */
const runDirectly = require.main === module;

const main = async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) {
    console.error('Usage: seedUnitSuitabilityOverrides.ts <tenantId> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const total = await CurriculumLearningUnit.countDocuments({ tenantId });
  console.log(`\nSUITABILITY OVERRIDES  ·  tenant ${tenantId}`);
  console.log(`  ${SUITABILITY_OVERRIDES.length} override(s) across ${total} units `
    + `— ${total - SUITABILITY_OVERRIDES.length} keep deriving from their type`);
  console.log(apply ? '\nAPPLYING\n' : '\nDRY RUN — pass --apply to write\n');

  let applied = 0;
  const missing: string[] = [];

  for (const o of SUITABILITY_OVERRIDES) {
    const unit = await CurriculumLearningUnit
      .findOne({ tenantId, unitCode: o.unitCode }).select('title unitType').lean() as any;

    if (!unit) { missing.push(o.unitCode); continue; }

    const added = o.states.includes('ENRICHMENT')
      ? '+REVISION, VERIFIED, ENRICHMENT' : '+REVISION, VERIFIED';
    console.log(`  ${o.unitCode.padEnd(32)}${String(unit.title).slice(0, 36).padEnd(38)}${added}`);
    console.log(`      ${o.why}`);

    if (apply) {
      await CurriculumLearningUnit.updateOne(
        { tenantId, unitCode: o.unitCode },
        { $set: { suitableStates: o.states, updatedBy: 'suitability-override' } },
      );
      applied++;
    }
  }

  console.log('');
  if (missing.length) {
    console.log(`  ${missing.length} override(s) name a unit that does not exist:`);
    for (const m of missing) console.log(`    ${m}`);
    console.log('');
  }

  if (!apply) {
    console.log(`${SUITABILITY_OVERRIDES.length - missing.length} override(s) would be written.`);
    console.log('Re-run with --apply.');
  } else {
    const withOverride = await CurriculumLearningUnit
      .countDocuments({ tenantId, suitableStates: { $exists: true } });
    console.log(`${applied} applied. ${withOverride} of ${total} units now carry an override; `
      + `${total - withOverride} still derive from unitType.`);
  }

  await mongoose.disconnect();
};

if (runDirectly) main().catch(e => { console.error(e); process.exit(1); });
