/**
 * Skill DNA evidence calibration audit — report.
 *
 * READ ONLY, NO DATABASE. Prints how many checkpoint answers move a skill between states from realistic priors, and
 * replays twelve learners through ninety days: every checkpoint's evidence, the focus skills' score, confidence and
 * state before and after, and what each resulting recomposition did to the curriculum. All rules are production's;
 * see tests/evidenceCalibration/simulator.
 *
 *   npx ts-node src/scripts/auditEvidenceCalibration.ts            summary for every learner
 *   npx ts-node src/scripts/auditEvidenceCalibration.ts --timeline  also each learner's day-by-day focus-skill moves
 */

import {
  answerLadder, firstReached, skillCheckRows, SIM_LEARNERS, simulate, FOCUS_SKILLS, EvidenceRow,
} from '../tests/evidenceCalibration/simulator';
import { REAL_SKILL_CHECK_PAPER } from '../services/composerCertificationService';
import { evidenceWeightFor, CONFIDENCE_THRESHOLDS, HIGH_CONFIDENCE_MIN_DISTINCT_ITEMS } from '../data/skillDnaPolicy';

const timeline = process.argv.includes('--timeline');
const say = (s: string) => console.log(s);
const STATES = ['FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD', 'REVISION', 'VERIFIED'] as const;
const fmt = (b: any) => (b ? `${b.score}/${b.confidence[0]} ${b.state}` : 'unmeasured');

say('SKILL DNA EVIDENCE CALIBRATION AUDIT');
say(`  checkpoint answer weight: PRIMARY × MEDIUM × MODULE_ASSESSMENT = ${evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'MODULE_ASSESSMENT' })}`);
say(`  Skill Check item weight: EASY ${evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'EASY', sourceType: 'PERSONALIZED_ASSESSMENT' })}, MEDIUM 1, HARD 1.15`);
say(`  confidence: MEDIUM at effective weight ${CONFIDENCE_THRESHOLDS.MEDIUM}; HIGH at ${CONFIDENCE_THRESHOLDS.HIGH} with ${HIGH_CONFIDENCE_MIN_DISTINCT_ITEMS}+ distinct items; LOW caps the state at STANDARD`);

say('\nQUESTION LEVEL — consecutive checkpoint answers (MEDIUM) needed to first reach each state');
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
    for (const correct of [true, false]) {
      const f = firstReached(answerLadder(rows, correct));
      say(`  ${skill.padEnd(26)} ${label.padEnd(46)} ${correct ? 'all right' : 'all wrong'}  `
        + STATES.map(s => `${s} ${f.states[s] ?? '—'}`).join(' · ')
        + `  ·  confidence LOW ${f.confidence.LOW ?? '—'} MEDIUM ${f.confidence.MEDIUM ?? '—'} HIGH ${f.confidence.HIGH ?? '—'}`);
    }
  }
}

for (const learner of SIM_LEARNERS) {
  const r = simulate(learner);
  say(`\n${'='.repeat(110)}\n${learner.key} — ${learner.note}`);
  say(`  recompositions ${r.totals.recompositions} · lessons removed ${r.totals.lessonsRemoved} · practice removed ${r.totals.practiceRemoved}`
    + ` · debugging added ${r.totals.debuggingAdded} · backbone treatment changes ${r.totals.backboneModeChanges}`
    + ` · coding assignments removed ${r.totals.codingAssignmentsRemoved.join(', ') || 'none'}`
    + ` · backbone ever missing ${r.totals.backboneMissingEver.join(', ') || 'never'}`);
  say(`  coding assignments on the initial plan ${['T_VARIABLES_COMPUTE_PRACTICE', 'T_CONDITIONS_PRACTICE', 'T_LOOPS_PRACTICE', 'T_FUNCTIONS_CALL_RETURN_PRACTICE', 'T_ARRAYS_TRAVERSAL_PRACTICE'].filter(c => r.initialPlan.includes(c)).length}/5, on the final plan ${['T_VARIABLES_COMPUTE_PRACTICE', 'T_CONDITIONS_PRACTICE', 'T_LOOPS_PRACTICE', 'T_FUNCTIONS_CALL_RETURN_PRACTICE', 'T_ARRAYS_TRAVERSAL_PRACTICE'].filter(c => r.finalPlan.includes(c)).length}/5`);
  say(`  backbone modes initial ${r.backboneInitial.requirements.map(q => `${q.requirement.replace('T_', '')}:${q.mode}`).join(' ')}`);
  say(`  backbone modes final   ${r.backboneFinal.requirements.map(q => `${q.requirement.replace('T_', '')}:${q.mode}`).join(' ')}`);
  for (const k of FOCUS_SKILLS) {
    const days = r.firstDay[k] || {};
    say(`  ${k.padEnd(26)} final ${fmt(r.finalBeliefs[k]).padEnd(28)} first day at ${STATES.map(s => `${s.slice(0, 4)} ${days[s] ?? '—'}`).join(' ')}`);
  }
  if (timeline) {
    for (const e of r.events) {
      const focus = e.moves.filter(m => FOCUS_SKILLS.includes(m.skill));
      const c = e.consequence;
      if (!focus.length && !c) continue;
      const moves = focus.map(m => `${m.skill} ${m.right}/${m.answered}: ${fmt(m.before)} → ${fmt(m.after)}`).join('; ');
      const cons = c ? ` ⇒ recomposed: -lessons ${c.lessonsRemoved.length} +lessons ${c.lessonsAdded.length} -practice ${c.practiceRemoved.length}`
        + ` -coding ${c.codingAssignmentsRemoved.map(x => x.replace('T_', '')).join(',') || 0} +coding ${c.codingAssignmentsAdded.map(x => x.replace('T_', '')).join(',') || 0}`
        + ` +debug ${c.debuggingAdded.length}${c.backboneModeChanges.length ? ` backbone ${c.backboneModeChanges.join(', ')}` : ''}` : '';
      say(`    day ${String(e.day).padStart(2)} ${e.unitType.slice(0, 4)} ${e.unit.padEnd(40)} ${moves}${cons}`);
    }
  }
}
