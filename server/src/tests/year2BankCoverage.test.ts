/**
 * Every skill Year 2 teaches can actually be measured.
 *
 * ── WHY THIS TEST EXISTS ──────────────────────────────────────────────────────────────────
 *
 * Six Year-2 skills once sat in the curriculum with no questions behind them. Nothing failed.
 * The seed checked skill keys against the taxonomy and passed; year2GoldenBank.test.ts checked
 * fifty-per-skill and passed, because it derives its skill list from the bank itself and so can
 * only ever check the skills that already have a file. A skill nobody had written questions for
 * was invisible to both.
 *
 * The consequence was quiet and expensive: the entry paper silently omitted those skills, so a
 * student was placed on evidence that never mentioned a third of what they were about to be
 * taught.
 *
 * This is the missing direction of the check. It starts from what the CURRICULUM claims to
 * teach and asks whether questions exist, rather than starting from the questions.
 *
 * ── WHY BOTH BANKS COUNT ──────────────────────────────────────────────────────────────────
 *
 * A Year-1 skill that Year 2 also measures keeps the questions it already has — year2Bank's own
 * header says so. PROBLEM_SOLVING is not rewritten for Year 2; the foundation bank measures it
 * perfectly well. So coverage means "in either bank", and a skill is only a failure when it is
 * in neither.
 *
 * Prerequisites are held to the same bar. The bridge decides what to re-teach a fresh joiner
 * from their Skill DNA, and a prerequisite with no questions cannot be scored, so it can never
 * be found to be a gap — it would simply be assumed known.
 */

import { buildReferencedSkillKeys, BUILD_MODULES } from '../seeds/careerPilot/year2StageMap';
import { YEAR2_BANK } from '../data/goldenBank/year2Bank';
import { FOUNDATION_BATCH1 } from '../data/goldenBank/foundationBatch1';
import { FOUNDATION_BATCH2 } from '../data/goldenBank/foundationBatch2';
import { FOUNDATION_BATCH3 } from '../data/goldenBank/foundationBatch3';
import { FOUNDATION_BATCH4 } from '../data/goldenBank/foundationBatch4';
import { FOUNDATION_BATCH5 } from '../data/goldenBank/foundationBatch5';
import { FOUNDATION_BATCH6 } from '../data/goldenBank/foundationBatch6';
import { FOUNDATION_BATCH7 } from '../data/goldenBank/foundationBatch7';
import { FOUNDATION_BATCH8 } from '../data/goldenBank/foundationBatch8';
import { FOUNDATION_BATCH9 } from '../data/goldenBank/foundationBatch9';
import { FOUNDATION_BATCH10 } from '../data/goldenBank/foundationBatch10';

const FOUNDATION_ROWS = [
  ...FOUNDATION_BATCH1, ...FOUNDATION_BATCH2, ...FOUNDATION_BATCH3, ...FOUNDATION_BATCH4,
  ...FOUNDATION_BATCH5, ...FOUNDATION_BATCH6, ...FOUNDATION_BATCH7, ...FOUNDATION_BATCH8,
  ...FOUNDATION_BATCH9, ...FOUNDATION_BATCH10,
];

/** Taken from the rows themselves, not from the BATCH*_SKILLS lists, which could drift. */
const foundationSkills = new Set(FOUNDATION_ROWS.map(r => r.skillKey));
const year2Skills = new Set(YEAR2_BANK.map(i => i.skillKey));
const measurable = (skill: string) => year2Skills.has(skill) || foundationSkills.has(skill);

/** What the topics claim to teach, separately from what they merely require. */
const taughtSkills = [...new Set(BUILD_MODULES.flatMap(m => m.topics.flatMap(t => t.skillKeys)))].sort();

describe('every Year-2 skill has questions behind it', () => {
  it('measures every skill the curriculum teaches', () => {
    expect(taughtSkills.filter(s => !measurable(s))).toEqual([]);
  });

  it('measures every Year-1 skill the curriculum treats as a prerequisite', () => {
    expect(buildReferencedSkillKeys().filter(s => !measurable(s))).toEqual([]);
  });

  /**
   * The Year-2 bank should hold no skill the Year-2 curriculum does not refer to. A file here
   * that nothing teaches is either a typo in a skill key or fifty questions written for a skill
   * that was renamed — both worth catching, and neither visible anywhere else.
   */
  it('holds no Year-2 bank file for a skill the curriculum never mentions', () => {
    const referenced = new Set(buildReferencedSkillKeys());
    expect([...year2Skills].filter(s => !referenced.has(s)).sort()).toEqual([]);
  });
});
