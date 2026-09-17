/**
 * Skill DNA evidence calibration audit — report.
 *
 * SIMULATION (default) — READ ONLY, NO DATABASE. Prints how many checkpoint answers move a skill between states from
 * realistic priors, and replays twelve learners through ninety days under both evidence models: BEFORE (58b248b6, no
 * kinds, no applied evidence) and AFTER (production now: kinds, the understanding-only cap, graded coding assignments
 * and projects as APPLIED evidence). For every focus skill it shows the raw score, confidence, the state the score
 * alone buys, the state the plan uses, the kind mix by weight and whether the cap applied. All rules are
 * production's; see tests/evidenceCalibration/simulator.
 *
 *   npx ts-node src/scripts/auditEvidenceCalibration.ts                summary for every learner, BEFORE and AFTER
 *   npx ts-node src/scripts/auditEvidenceCalibration.ts --timeline     also each learner's day-by-day moves (AFTER)
 *
 * ONE REAL STUDENT — READ ONLY. Every skill in their Skill DNA, with the same columns and every source row behind it.
 *
 *   npx ts-node src/scripts/auditEvidenceCalibration.ts --student <tenantId> <studentId>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  answerLadder, firstReached, skillCheckRows, SIM_LEARNERS, simulate, FOCUS_SKILLS, EvidenceRow, CODING_ASSIGNMENT_UNITS,
  criticalCase, CRITICAL_CASES, Belief, Model,
} from '../tests/evidenceCalibration/simulator';
import { REAL_SKILL_CHECK_PAPER } from '../services/composerCertificationService';
import {
  evidenceWeightFor, CONFIDENCE_THRESHOLDS, HIGH_CONFIDENCE_MIN_DISTINCT_ITEMS, aggregate, evidenceBasis, evidenceKindOf,
} from '../data/skillDnaPolicy';
import { stateForScore } from '../data/adaptiveCurriculumPolicy';

const say = (s: string) => console.log(s);
const STATES = ['FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD', 'REVISION', 'VERIFIED'] as const;
const kindMix = (k: Record<string, number>) => `D ${k.DIAGNOSTIC} U ${k.UNDERSTANDING} A ${k.APPLIED}`;
const fmt = (b: Belief | null) => (b ? `${b.score}/${b.confidence[0]} ${b.rawState}${b.state !== b.rawState ? `→${b.state}` : ''}` : 'unmeasured');
const short = (c: string) => c.replace(/^T_|_PRACTICE$|_CALL_RETURN|_TRAVERSAL|_COMPUTE/g, '');

async function auditStudent(tenantId: string, studentId: string): Promise<void> {
  dotenv.config();
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas');
  const StudentSkillEvidence = (await import('../models/StudentSkillEvidence')).default;
  const rows = await StudentSkillEvidence.find({ tenantId, studentId }).sort({ skillKey: 1, observedAt: 1 }).lean() as any[];
  const bySkill = new Map<string, any[]>();
  for (const r of rows) bySkill.set(r.skillKey, [...(bySkill.get(r.skillKey) || []), r]);
  say(`SKILL DNA EVIDENCE — tenant ${tenantId}, student ${studentId}: ${rows.length} rows, ${bySkill.size} skills`);
  for (const [skill, rs] of bySkill) {
    const agg = aggregate(rs.map(r => ({ performance: r.performance, evidenceWeight: r.evidenceWeight, itemKey: `${r.itemSourceType}:${r.itemSourceId}` })));
    const basis = evidenceBasis(rs);
    const raw = stateForScore({ score: agg.score, confidence: agg.confidence });
    const effective = stateForScore({ score: agg.score, confidence: agg.confidence, understandingOnly: basis.understandingOnly });
    say(`\n${skill}  raw score ${agg.score} · confidence ${agg.confidence} · raw state ${raw} · effective state ${effective} · cap applied ${raw !== effective ? 'YES' : 'NO'}`);
    say(`  kinds by weight: DIAGNOSTIC ${basis.weights.DIAGNOSTIC} · UNDERSTANDING ${basis.weights.UNDERSTANDING} · APPLIED ${basis.weights.APPLIED}  (rows ${basis.rows.DIAGNOSTIC}/${basis.rows.UNDERSTANDING}/${basis.rows.APPLIED})`);
    for (const r of rs) {
      say(`    ${evidenceKindOf(r).padEnd(13)} ${String(r.sourceType).padEnd(23)} ${`${r.itemSourceType}:${r.itemSourceId}`.padEnd(46)} perf ${Math.round(r.performance * 100)}% × ${r.evidenceWeight}`
        + `${r.submissionId ? `  ${r.evaluation} ${r.unitCode} submission ${r.submissionId} attempt ${r.attemptNumber}` : ''}  ${new Date(r.observedAt).toISOString()}`);
    }
  }
  await mongoose.disconnect();
}

function auditSimulation(timeline: boolean): void {
  say('SKILL DNA EVIDENCE CALIBRATION AUDIT');
  say(`  checkpoint answer weight: PRIMARY × MEDIUM × MODULE_ASSESSMENT = ${evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'MODULE_ASSESSMENT' })}`);
  say(`  Skill Check item weight: EASY ${evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'EASY', sourceType: 'PERSONALIZED_ASSESSMENT' })}, MEDIUM 1, HARD 1.15`);
  say(`  applied evidence weight: coding assignment ${evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'CODING_ASSIGNMENT' })}, project ${evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'PROJECT_EVALUATION' })}`);
  say(`  confidence: MEDIUM at effective weight ${CONFIDENCE_THRESHOLDS.MEDIUM}; HIGH at ${CONFIDENCE_THRESHOLDS.HIGH} with ${HIGH_CONFIDENCE_MIN_DISTINCT_ITEMS}+ distinct items; LOW caps the state at STANDARD`);
  say('  AFTER only: a skill whose every row is a checkpoint answer (UNDERSTANDING) is planned at STANDARD at most; score and confidence unchanged');

  say('\nQUESTION LEVEL — consecutive checkpoint answers (MEDIUM) needed to first reach each state (BEFORE → AFTER)');
  const priors: [string, (k: string) => EvidenceRow[]][] = [
    ['no prior evidence', () => []],
    ['Skill Check 0 of 4 (real paper difficulties)', k => skillCheckRows(REAL_SKILL_CHECK_PAPER.map(() => 0), k)],
    ['Skill Check 2 of 4', k => skillCheckRows(REAL_SKILL_CHECK_PAPER.map((it, i) => (REAL_SKILL_CHECK_PAPER.filter((x, j) => j < i && x.skillKey === it.skillKey).length < 2 ? 1 : 0)), k)],
    ['Skill Check 4 of 4', k => skillCheckRows(REAL_SKILL_CHECK_PAPER.map(() => 1), k)],
  ];
  for (const skill of ['PROGRAMMING_FUNDAMENTALS', 'SHELL_COMMANDS', 'CONDITIONALS_BASICS']) {
    for (const [label, prior] of priors) {
      const rows = prior(skill);
      if (label !== 'no prior evidence' && !rows.length) continue;
      for (const model of ['BEFORE', 'AFTER'] as Model[]) {
        const f = firstReached(answerLadder(rows, true, 80, 'MEDIUM', model));
        say(`  ${skill.padEnd(26)} ${label.padEnd(46)} all right ${model.padEnd(6)} `
          + STATES.map(s => `${s} ${f.states[s] ?? '—'}`).join(' · '));
      }
    }
  }

  say('\nCRITICAL CASE — a beginner answers every checkpoint right (learner D); the day checkpoint answers alone first make the skill VERIFIED by score');
  for (const [skill, unit] of CRITICAL_CASES) {
    const c = criticalCase(skill, unit);
    say(`  ${skill.padEnd(20)} ${c.day === null ? 'never VERIFIED from checkpoints alone' : `day ${c.day} after ${c.answers} answers: raw ${c.score}, ${c.confidence}, raw state ${c.rawState}, effective ${c.effectiveState}, cap ${c.capped ? 'YES' : 'NO'}`}`);
    say(`  ${''.padEnd(20)} ${short(unit)} coding assignment: BEFORE ${c.codingAssignmentBefore ? 'kept' : 'REMOVED'} · AFTER ${c.codingAssignmentAfter ? `kept, worked day ${c.codingAssignmentDayAfter}` : 'REMOVED'}`
      + ` · six answers from scratch ${c.sixAnswersFromScratch.rawState}→${c.sixAnswersFromScratch.effectiveState}, in plan BEFORE ${c.sixAnswersFromScratch.before} AFTER ${c.sixAnswersFromScratch.after}`
      + ` · STANDARD by diagnostic keeps it ${c.standardFromScratchKeepsCoding}`);
  }

  for (const learner of SIM_LEARNERS) {
    const results = { BEFORE: simulate(learner, 'BEFORE'), AFTER: simulate(learner, 'AFTER') };
    say(`\n${'='.repeat(110)}\n${learner.key} — ${learner.note}`);
    for (const model of ['BEFORE', 'AFTER'] as Model[]) {
      const r = results[model];
      say(`  ${model.padEnd(6)} recompositions ${r.totals.recompositions} · lessons removed ${r.totals.lessonsRemoved} · practice removed ${r.totals.practiceRemoved}`
        + ` · debugging added ${r.totals.debuggingAdded} · coding assignments ${CODING_ASSIGNMENT_UNITS.filter(c => r.initialPlan.includes(c)).length}/5 → ${CODING_ASSIGNMENT_UNITS.filter(c => r.finalPlan.includes(c)).length}/5`
        + ` removed ${r.totals.codingAssignmentsRemoved.map(short).join(', ') || 'none'}`
        + (model === 'AFTER' ? ` · worked ${r.totals.codingAssignmentsWorked.length} · applied rows ${r.totals.appliedRows} (${r.totals.failedApplied} graded below 50%)` : '')
        + ` · backbone ever missing ${r.totals.backboneMissingEver.join(', ') || 'never'}`);
    }
    for (const k of FOCUS_SKILLS) {
      const b = results.BEFORE.finalBeliefs[k];
      const a = results.AFTER.finalBeliefs[k];
      say(`    ${k.padEnd(26)} BEFORE ${fmt(b).padEnd(34)} AFTER ${fmt(a).padEnd(34)} ${a ? `kinds ${kindMix(a.kinds).padEnd(20)} cap ${a.capped ? 'YES' : 'NO'}` : ''}`);
    }
    if (timeline) {
      for (const e of results.AFTER.events) {
        const focus = e.moves.filter(m => FOCUS_SKILLS.includes(m.skill));
        const c = e.consequence;
        if (!focus.length && !c) continue;
        const moves = focus.map(m => `${m.skill} ${m.right}/${m.answered}: ${fmt(m.before)} → ${fmt(m.after)}`).join('; ');
        const graded = e.applied ? ` [${e.applied.source === 'CODING_ASSIGNMENT' ? 'coding' : 'project'} graded ${Math.round(e.applied.performance * 100)}%]` : '';
        const cons = c ? ` ⇒ recomposed: -lessons ${c.lessonsRemoved.length} +lessons ${c.lessonsAdded.length} -practice ${c.practiceRemoved.length}`
          + ` -coding ${c.codingAssignmentsRemoved.map(short).join(',') || 0} +coding ${c.codingAssignmentsAdded.map(short).join(',') || 0}`
          + ` +debug ${c.debuggingAdded.length}${c.backboneModeChanges.length ? ` backbone ${c.backboneModeChanges.join(', ')}` : ''}` : '';
        say(`    day ${String(e.day).padStart(2)} ${e.unitType.slice(0, 4)} ${e.unit.padEnd(40)}${graded} ${moves}${cons}`);
      }
    }
  }
}

const i = process.argv.indexOf('--student');
if (i >= 0) {
  const [tenantId, studentId] = process.argv.slice(i + 1, i + 3);
  if (!tenantId || !studentId) { console.error('usage: --student <tenantId> <studentId>'); process.exit(1); }
  auditStudent(tenantId, studentId).catch(e => { console.error(e); process.exit(1); });
} else {
  auditSimulation(process.argv.includes('--timeline'));
}
