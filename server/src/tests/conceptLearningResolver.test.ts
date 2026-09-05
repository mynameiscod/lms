/**
 * The sequencing rules, tested without a database.
 *
 * The resolver's real value is a set of decisions — which step is next, when a journey is
 * finished, when the roadmap's verb overrides the author's order — and every one of them is
 * ordinary logic over a unit and a progress record. Exercising them through Mongo would test
 * Mongo; these tests pin the decisions.
 *
 * The one behaviour worth stating plainly, because it is the whole point of the feature: a
 * completed step is never offered again. Before this layer the orchestrator served the same
 * first-by-priority resource every morning, and a student meeting the same intro video on day
 * four had no way to tell whether the product was broken or they were.
 */
import { phasesForWorkType, workTypeForPhase, PHASE_WORK_TYPE, LEARNING_PHASES } from '../data/conceptLearningPolicy';

describe('phase to work type', () => {
  it('maps every curriculum phase to a roadmap verb', () => {
    for (const p of LEARNING_PHASES) {
      expect(['LEARN', 'PRACTICE', 'ASSESS', 'REVIEW']).toContain(PHASE_WORK_TYPE[p]);
    }
  });

  it('puts the teaching phases under LEARN', () => {
    expect(workTypeForPhase('UNDERSTAND')).toBe('LEARN');
    expect(workTypeForPhase('LEARN')).toBe('LEARN');
  });

  it('treats guided and applied work as practice', () => {
    expect(workTypeForPhase('TRY')).toBe('PRACTICE');
    expect(workTypeForPhase('PRACTICE')).toBe('PRACTICE');
    expect(workTypeForPhase('APPLY')).toBe('PRACTICE');
  });

  it('sends CHECK to the assessment engine', () => {
    expect(workTypeForPhase('CHECK')).toBe('ASSESS');
  });

  it('does not invent a verb for an unknown phase', () => {
    expect(workTypeForPhase('NONSENSE')).toBe('LEARN');
  });

  it('answers which phases satisfy a roadmap objective', () => {
    expect(phasesForWorkType('LEARN').sort()).toEqual(['LEARN', 'UNDERSTAND']);
    expect(phasesForWorkType('PRACTICE').sort()).toEqual(['APPLY', 'PRACTICE', 'TRY']);
    expect(phasesForWorkType('ASSESS')).toEqual(['CHECK']);
    expect(phasesForWorkType('REVIEW')).toEqual(['REVIEW']);
  });

  it('is case-insensitive about the roadmap verb', () => {
    expect(phasesForWorkType('learn')).toEqual(phasesForWorkType('LEARN'));
  });
});

/**
 * The selection rules, extracted from the resolver so they can be exercised directly.
 *
 * Kept as a mirror of the ordering in resolveNextStep rather than imported, because the real
 * function reaches Mongo for progress and resources. If the two ever disagree these tests
 * stop describing the product — which is why the ordering lives in one obvious block there.
 */
type Step = { stepId: string; sequence: number; phase: string; required: boolean };

function nextStep(steps: Step[], completed: Set<string>, workType: string): Step | null {
  const wanted = phasesForWorkType(workType);
  const candidates = steps
    .slice().sort((a, b) => a.sequence - b.sequence)
    .filter(s => wanted.includes(s.phase as any));
  const outstanding = candidates.filter(s => !completed.has(s.stepId));
  if (!outstanding.length) {
    return workType.toUpperCase() === 'REVIEW' && candidates.length ? candidates[0] : null;
  }
  const ordered = [...outstanding.filter(s => s.required), ...outstanding.filter(s => !s.required)];
  return ordered[0] || null;
}

const JOURNEY: Step[] = [
  { stepId: 'a', sequence: 1, phase: 'UNDERSTAND', required: true },
  { stepId: 'b', sequence: 2, phase: 'LEARN',      required: true },
  { stepId: 'c', sequence: 3, phase: 'TRY',        required: false },
  { stepId: 'd', sequence: 4, phase: 'PRACTICE',   required: true },
  { stepId: 'e', sequence: 5, phase: 'CHECK',      required: true },
  { stepId: 'f', sequence: 6, phase: 'REVIEW',     required: false },
];

describe('which step comes next', () => {
  it('starts at the beginning of the requested verb', () => {
    expect(nextStep(JOURNEY, new Set(), 'LEARN')!.stepId).toBe('a');
  });

  it('moves on once a step is done — the fault this feature exists to fix', () => {
    expect(nextStep(JOURNEY, new Set(['a']), 'LEARN')!.stepId).toBe('b');
  });

  it('never offers a completed step again', () => {
    const done = new Set(['a', 'b']);
    const next = nextStep(JOURNEY, done, 'LEARN');
    expect(next).toBeNull();
    expect(done.has('a')).toBe(true);
  });

  it('follows the roadmap verb rather than the authored order', () => {
    // Nothing in the LEARN half is finished, but the plan asked for practice this week.
    expect(nextStep(JOURNEY, new Set(), 'PRACTICE')!.stepId).toBe('d');
  });

  it('prefers a required step over an optional one that comes earlier', () => {
    // TRY (optional, seq 3) sorts before PRACTICE (required, seq 4).
    const next = nextStep(JOURNEY, new Set(), 'PRACTICE')!;
    expect(next.required).toBe(true);
    expect(next.stepId).toBe('d');
  });

  it('offers the optional step once the required ones are done', () => {
    expect(nextStep(JOURNEY, new Set(['d']), 'PRACTICE')!.stepId).toBe('c');
  });

  it('reports nothing left rather than looping, when the verb is exhausted', () => {
    expect(nextStep(JOURNEY, new Set(['c', 'd']), 'PRACTICE')).toBeNull();
  });

  it('lets REVIEW be repeated, because that is what reviewing is', () => {
    expect(nextStep(JOURNEY, new Set(['f']), 'REVIEW')!.stepId).toBe('f');
  });

  it('does not let LEARN be repeated the same way', () => {
    expect(nextStep(JOURNEY, new Set(['a', 'b']), 'LEARN')).toBeNull();
  });

  it('finds the check step for an ASSESS objective', () => {
    expect(nextStep(JOURNEY, new Set(), 'ASSESS')!.stepId).toBe('e');
  });

  it('walks a whole journey without ever repeating a step', () => {
    const seen: string[] = [];
    const done = new Set<string>();
    for (const verb of ['LEARN', 'LEARN', 'PRACTICE', 'PRACTICE', 'ASSESS']) {
      const step = nextStep(JOURNEY, done, verb);
      if (!step) break;
      seen.push(step.stepId);
      done.add(step.stepId);
    }
    expect(seen).toEqual(['a', 'b', 'd', 'c', 'e']);
    expect(new Set(seen).size).toBe(seen.length);
  });
});
