/**
 * Turn the resources already mapped to a concept into a DRAFT learning journey.
 *
 *   node dist/scripts/backfillConceptLearningUnits.js <tenantId>            # plan only
 *   node dist/scripts/backfillConceptLearningUnits.js <tenantId> --apply
 *
 * WHY A BACKFILL AT ALL. An admin who has already mapped six resources to JAVA_OOP has done
 * most of the authoring; asking them to retype it into a journey would be the migration
 * telling them their existing work does not count. This reads what is there and proposes an
 * order.
 *
 * IT NEVER PUBLISHES. Every unit is created as DRAFT, whatever its readiness, because the
 * order below is a guess: it is derived from admin priority and creation date, which express
 * precedence and nothing about pedagogy. A machine ordering somebody's lesson plan and then
 * putting it live is exactly the outcome the publish gate exists to prevent — an author looks
 * at the sequence first.
 *
 * IT IS SAFE TO RE-RUN. A concept that already has a unit is left alone rather than rewritten,
 * so a second run cannot discard edits somebody made after the first.
 *
 * NOTHING IS DELETED OR MODIFIED. CareerSkillResource rows are read only. A journey references
 * them; removing every unit this writes would leave the bank exactly as it is now.
 */
import mongoose from 'mongoose';
import ConceptLearningUnit from '../models/ConceptLearningUnit';
import CareerSkillResource from '../models/CareerSkillResource';
import CareerSkill from '../models/CareerSkill';
import { evaluateReadiness, newStepId, unitEstimatedMinutes } from '../services/conceptLearningUnitService';
import { LearningPhase } from '../data/conceptLearningPolicy';

const has = (f: string) => process.argv.includes('--' + f);

/**
 * The phase a resource most likely belongs to.
 *
 * Derived from what the resource IS, then from the work types its author already chose. A
 * video opens a concept, notes carry the substance, a problem is practice. Deliberately
 * conservative: anything unrecognised becomes LEARN, which is the phase where a misplaced item
 * does least harm — it is offered for reading rather than presented as an exercise.
 */
function phaseFor(r: any): LearningPhase {
  const type = String(r.resourceType || '');
  const work = (r.workTypes || []).map((w: any) => String(w).toUpperCase());
  if (type === 'mock_interview') return 'APPLY';
  if (type === 'practice' || type === 'problem') return 'PRACTICE';
  if (type === 'video') return 'UNDERSTAND';
  if (type === 'research') return 'REVIEW';
  if (work.includes('REVIEW')) return 'REVIEW';
  if (work.includes('PRACTICE')) return 'PRACTICE';
  return 'LEARN';
}

/**
 * The order a journey reads in, when nobody has said what it should be.
 *
 * Understand → learn → try → practice → apply → review, and within a phase the admin's own
 * priority. It is a defensible default and it is still a guess, which is why the result is a
 * draft.
 */
const PHASE_ORDER: LearningPhase[] = ['UNDERSTAND', 'LEARN', 'TRY', 'PRACTICE', 'APPLY', 'CHECK', 'REVIEW'];

/** A sensible duration when the resource never carried one. */
const minutesFor = (r: any, phase: LearningPhase): number => {
  if (typeof r.estimatedMinutes === 'number' && r.estimatedMinutes > 0) return r.estimatedMinutes;
  if (phase === 'PRACTICE' || phase === 'APPLY') return 25;
  if (phase === 'UNDERSTAND') return 12;
  return 15;
};

async function main() {
  const tenantId = process.argv[2];
  if (!tenantId || tenantId.startsWith('--')) {
    console.error('Usage: backfillConceptLearningUnits.js <tenantId> [--apply]');
    process.exit(1);
  }
  const APPLY = has('apply');
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  console.log((APPLY ? '' : '[PLAN ONLY] ') + 'tenant ' + tenantId + '\n');

  const resources = await CareerSkillResource.find({ tenantId, active: true })
    .sort({ skillKey: 1, priority: 1, createdAt: 1 }).lean() as any[];
  const bySkill = new Map<string, any[]>();
  for (const r of resources) {
    const k = String(r.skillKey).toUpperCase();
    if (!bySkill.has(k)) bySkill.set(k, []);
    bySkill.get(k)!.push(r);
  }

  const skills = new Map<string, any>(
    (await CareerSkill.find({ key: { $in: [...bySkill.keys()] } }).select('key name active').lean() as any[])
      .map(s => [s.key, s]),
  );
  const existing = new Set(
    (await ConceptLearningUnit.find({ tenantId }).select('skillKey').lean() as any[])
      .map(u => String(u.skillKey).toUpperCase()),
  );

  let created = 0, skippedExisting = 0, skippedUnknown = 0, linked = 0;
  const report: { skill: string; steps: number; readiness: number; blocking: string[] }[] = [];

  console.log('concept'.padEnd(28) + 'resources  steps  readiness  status');
  for (const [skillKey, rows] of [...bySkill.entries()].sort()) {
    const skill = skills.get(skillKey);
    // A resource mapped to a key that is not a live skill cannot become a journey — and the
    // mapping itself is the thing worth fixing, so it is reported rather than papered over.
    if (!skill || skill.active === false) {
      console.log('  ' + skillKey.padEnd(26) + String(rows.length).padStart(6) + '     —      —   not a live skill');
      skippedUnknown += 1;
      continue;
    }
    if (existing.has(skillKey)) {
      console.log('  ' + skillKey.padEnd(26) + String(rows.length).padStart(6) + '     —      —   already has a unit');
      skippedExisting += 1;
      continue;
    }

    const steps = rows
      .map(r => {
        const phase = phaseFor(r);
        return {
          stepId: newStepId(),
          phase,
          resourceId: String(r._id),
          titleOverride: '',
          estimatedMinutes: minutesFor(r, phase),
          // Everything is required by default. An author demoting the optional extras is a
          // smaller job than finding the ones a migration quietly made optional.
          required: true,
          scoreWindow: { min: null, max: null },
          audience: { years: [], courses: [], branches: [], roles: [], languages: [], stages: [] },
          notes: '',
          _order: PHASE_ORDER.indexOf(phase),
          _priority: Number(r.priority) || 100,
        };
      })
      .sort((a, b) => a._order - b._order || a._priority - b._priority)
      .map(({ _order, _priority, ...s }, i) => ({ ...s, sequence: i + 1 }));

    const draft = new ConceptLearningUnit({
      tenantId, skillKey,
      title: skill.name || skillKey,
      description: '',
      learningOutcomes: [],
      steps,
      estimatedMinutes: unitEstimatedMinutes(steps as any),
      version: 1,
      status: 'DRAFT',
      createdBy: 'script:backfillConceptLearningUnits',
    });

    const ready = await evaluateReadiness(draft as any);
    report.push({ skill: skillKey, steps: steps.length, readiness: ready.percent, blocking: ready.blocking });
    console.log('  ' + skillKey.padEnd(26) + String(rows.length).padStart(6)
      + String(steps.length).padStart(7) + String(ready.percent + '%').padStart(10)
      + '   DRAFT' + (ready.publishable ? ' (publishable)' : ''));

    if (APPLY) { await draft.save(); created += 1; linked += steps.length; }
    else { created += 1; linked += steps.length; }
  }

  console.log('\n=== ' + (APPLY ? 'written' : 'would write') + ' ===');
  console.log('  units created            : ' + created);
  console.log('  resources linked         : ' + linked);
  console.log('  concepts already covered : ' + skippedExisting);
  console.log('  mappings to a dead skill : ' + skippedUnknown);
  console.log('  publishable as they are  : ' + report.filter(r => !r.blocking.length).length);
  console.log('  need an author first     : ' + report.filter(r => r.blocking.length).length);

  const needsWork = report.filter(r => r.blocking.length).slice(0, 15);
  if (needsWork.length) {
    console.log('\n=== what is missing ===');
    for (const r of needsWork) console.log('  ' + r.skill.padEnd(26) + r.blocking.join(', ').slice(0, 70));
  }

  console.log('\n  Every unit is a DRAFT. Nothing here reaches a student until somebody reviews');
  console.log('  the order and publishes it from the Learning Studio.');
  if (!APPLY) console.log('\n[PLAN ONLY] nothing was written. Re-run with --apply.');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
