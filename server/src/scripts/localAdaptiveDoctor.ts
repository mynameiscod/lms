/**
 * Why can this student not sit an assessment, and what is the next command to run?
 *
 * WHAT IT IS FOR. Setting CareerPilot up on a fresh local database means getting four separate
 * things right — a skill taxonomy, a stage set, a question bank, and mappings from questions to
 * skills — and the only feedback when one is missing is a student-facing message that says
 * "check back shortly" and names nothing. This checks all four, in dependency order, and stops
 * at the first genuine problem with the command that fixes it.
 *
 * READ ONLY unless --fix is passed, and --fix does exactly one thing: mark behaviour skills
 * unassessable. Everything else is reported as a command for you to run and read first.
 *
 *   npx ts-node src/scripts/localAdaptiveDoctor.ts <tenantId>
 *   npx ts-node src/scripts/localAdaptiveDoctor.ts <tenantId> --fix
 */

import mongoose from 'mongoose';
import CareerSkill from '../models/CareerSkill';
import StageSkillSet from '../models/StageSkillSet';
import SkillEvidence from '../models/SkillEvidence';
import RoleSkillBlueprint from '../models/RoleSkillBlueprint';

/**
 * Skills that describe a HABIT rather than a capability.
 *
 * You cannot honestly measure "practises daily" with a multiple-choice question — the answer is
 * a self-report, and admitting self-reports into Skill DNA is the thing the evidence model
 * exists to prevent. They are real and worth teaching, so they stay learnable; they simply must
 * not sit in a paper. Left assessable they have no questions, can never have good ones, and
 * block every first-year's assessment forever.
 */
const BEHAVIOUR_SKILLS = ['DAILY_PRACTICE_HABIT', 'SELF_LEARNING', 'TYPING_SPEED'];

/** Roughly what one skill needs before it can carry a slot. */
const MIN_PER_SKILL = 3;

const line = (s = '') => console.log(s);
const step = (n: number, title: string) => line(`\n[${n}] ${title}`);
const fixIt = (cmd: string) => line(`    → ${cmd}`);

(async () => {
  const tenantId = process.argv[2];
  const doFix = process.argv.includes('--fix');
  if (!tenantId) {
    console.error('Usage: localAdaptiveDoctor.ts <tenantId> [--fix]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms');
  line(`checking tenant ${tenantId}`);

  let blocked = false;

  /* ---- 1. taxonomy ---- */
  step(1, 'Skill taxonomy');
  const skillCount = await CareerSkill.countDocuments({ active: true });
  if (!skillCount) {
    line('    MISSING — no skills exist, so nothing can be measured or taught.');
    fixIt('npx ts-node src/scripts/seedCareerSkills.ts            # dry run');
    fixIt('npx ts-node src/scripts/seedCareerSkills.ts --apply');
    blocked = true;
  } else {
    line(`    ok — ${skillCount} active skills`);
  }

  /* ---- 2. stage sets ---- */
  if (!blocked) {
    step(2, 'Foundation stage set (what a 1st year is measured against)');
    const foundation = await StageSkillSet.findOne({ tenantId, stage: 'foundation' }).lean() as any;
    if (!foundation) {
      line('    MISSING — a 1st year with no target role gets ROLE_NOT_SELECTED, not a paper.');
      line('    Create it in admin, or copy the document from a working tenant.');
      blocked = true;
    } else if (!foundation.enabled) {
      line('    DISABLED — set enabled: true on the foundation StageSkillSet.');
      blocked = true;
    } else {
      const active = (foundation.requirements || []).filter((r: any) => r.active !== false);
      line(`    ok — enabled, ${active.length} skills`);
    }
  }

  /* ---- 3. behaviour skills that can never be measured ---- */
  if (!blocked) {
    step(3, 'Skills that cannot be measured by a question');
    const stuck = await CareerSkill.find({
      key: { $in: BEHAVIOUR_SKILLS }, assessable: true,
    }).select('key name').lean() as any[];

    if (!stuck.length) {
      line('    ok — none of them are marked assessable');
    } else {
      line(`    ${stuck.length} behaviour skill(s) are marked assessable and have no questions:`);
      for (const s of stuck) line(`      ${s.key}  (${s.name})`);
      line('    These block every first-year paper and cannot be fixed by writing questions —');
      line('    a multiple-choice question about study habits measures self-report, not ability.');
      if (doFix) {
        const r = await CareerSkill.updateMany(
          { key: { $in: stuck.map(s => s.key) } },
          { $set: { assessable: false } },
        );
        line(`    FIXED — ${r.modifiedCount} marked assessable: false (still learnable).`);
      } else {
        fixIt('re-run with --fix to mark them assessable: false');
      }
    }
  }

  /* ---- 4. the question pool ---- */
  if (!blocked) {
    step(4, 'Question pool');
    const maps = await SkillEvidence.find({ tenantId, contribution: 'PRIMARY', active: true })
      .select('skillKey').lean() as any[];

    if (!maps.length) {
      line('    EMPTY — questions may exist, but nothing maps them to a skill,');
      line('    so the generator can find no item for any slot.');
      fixIt('npx ts-node src/scripts/seedStagedQuestions.ts ' + tenantId);
      fixIt('npx ts-node src/scripts/draftForStageAndRoleGaps.ts --tenant=' + tenantId + ' --empty');
      fixIt('  ...then the same command with --apply');
      blocked = true;
    } else {
      const per = new Map<string, number>();
      for (const m of maps) {
        const k = String(m.skillKey).toUpperCase();
        per.set(k, (per.get(k) || 0) + 1);
      }
      const assessable = await CareerSkill.find({ active: true, assessable: true, nodeType: { $ne: 'GROUP' } })
        .select('key').lean() as any[];
      const empty = assessable.filter(s => !per.get(String(s.key).toUpperCase())).map(s => s.key);
      const thin = assessable.filter(s => {
        const n = per.get(String(s.key).toUpperCase()) || 0;
        return n > 0 && n < MIN_PER_SKILL;
      }).map(s => s.key);

      line(`    ${maps.length} mapped questions across ${per.size} skills`);
      if (empty.length) line(`    ${empty.length} assessable skills have NONE: ${empty.slice(0, 12).join(', ')}`
        + (empty.length > 12 ? ` …+${empty.length - 12}` : ''));
      if (thin.length) line(`    ${thin.length} are thin (<${MIN_PER_SKILL}): ${thin.slice(0, 12).join(', ')}`);
      if (!empty.length && !thin.length) line('    ok — every assessable skill has a usable pool');
    }
  }

  /* ---- 5. roles ---- */
  if (!blocked) {
    step(5, 'Published roles');
    const roles = await RoleSkillBlueprint.find({ tenantId, published: true }).select('roleKey').lean() as any[];
    line(roles.length ? `    ok — ${roles.length} published` : '    none published (a 1st year can still use the stage set)');
  }

  /* ---- what to do next ---- */
  line('\n' + '-'.repeat(70));
  if (blocked) {
    line('Run the command above, then run this again. It stops at the first real problem.');
  } else {
    line('Configuration looks serviceable. The definitive check is the generator itself:');
    fixIt(`npx ts-node src/scripts/fitCareerPilotToPool.ts ${tenantId}`);
    line('    It builds a paper for every role at every stage and reports what actually works,');
    line('    then --apply reconciles the configuration to match. Nothing else knows for certain.');
  }
  line('-'.repeat(70) + '\n');

  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
