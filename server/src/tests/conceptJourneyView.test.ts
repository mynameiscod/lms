import { journeyView, stepRoute, JourneyResource } from '../services/conceptLearningResolverService';

/**
 * The syllabus a student sees for one skill.
 *
 * WHY IT HAS TO BE ITS OWN THING. A mission shows one step. A student working through fourteen
 * of them had no idea whether they were near the end of for loops or near the end of loops, what
 * was still ahead, or why any of it was in that order. Being shown one thing at a time forever
 * is how a course feels like a treadmill, and the endpoint that could have answered it had no
 * screen calling it.
 *
 * THE PROPERTY THAT MATTERS MOST is that this list and what actually opens tomorrow agree. A
 * syllabus showing steps a student will never be served, or opening a different destination
 * from the mission card, is worse than no syllabus: they would find the disagreement before we
 * did, and it would cost them trust in the whole plan.
 */

const unitWith = (steps: any[], over: any = {}) => ({
  skillKey: 'LOOPS_BASICS',
  title: 'Loops',
  description: 'Doing something more than once, without writing it more than once.',
  learningOutcomes: ['Write a for loop over a range', ''],
  version: 3,
  audience: {},
  steps,
  ...over,
}) as any;

const step = (over: any = {}) => ({
  stepId: over.stepId || 's1',
  sequence: over.sequence ?? 1,
  phase: over.phase || 'LEARN',
  estimatedMinutes: over.estimatedMinutes ?? 15,
  required: over.required !== false,
  topic: over.topic ?? '',
  subtopic: over.subtopic ?? '',
  titleOverride: over.titleOverride ?? '',
  resourceId: over.resourceId ?? '',
  audience: over.audience ?? {},
  scoreWindow: over.scoreWindow ?? { min: null, max: null },
});

const view = (steps: any[], over: any = {}) => journeyView({
  unit: unitWith(steps, over.unit || {}),
  completedStepIds: over.done || [],
  member: over.member || {},
  skillScore: over.skillScore ?? null,
  resources: over.resources || new Map<string, JourneyResource>(),
  status: over.status,
});

describe('the syllabus a student sees', () => {
  it('reads as a course: skill, topic, subtopic, steps', () => {
    const v = view([
      step({ stepId: 'a', sequence: 1, phase: 'UNDERSTAND', topic: 'For loops', subtopic: 'Counting with range' }),
      step({ stepId: 'b', sequence: 2, phase: 'PRACTICE', topic: 'For loops', subtopic: 'Counting with range' }),
      step({ stepId: 'c', sequence: 3, phase: 'LEARN', topic: 'While loops', subtopic: 'When the count is unknown' }),
    ]);
    expect(v.steps.map(s => s.topic)).toEqual(['For loops', 'For loops', 'While loops']);
    expect(v.steps.map(s => s.subtopic)).toEqual([
      'Counting with range', 'Counting with range', 'When the count is unknown',
    ]);
    expect(v.title).toBe('Loops');
    expect(v.description).toBeTruthy();
    // Blank outcomes are an artefact of the editor's empty row, not something to show.
    expect(v.learningOutcomes).toEqual(['Write a for loop over a range']);
  });

  it('always presents the steps in the authored order', () => {
    const v = view([
      step({ stepId: 'c', sequence: 3 }),
      step({ stepId: 'a', sequence: 1 }),
      step({ stepId: 'b', sequence: 2 }),
    ]);
    expect(v.steps.map(s => s.stepId)).toEqual(['a', 'b', 'c']);
  });

  /**
   * SHOWS WHAT WILL ACTUALLY BE SERVED, NOT EVERY AUTHORED STEP.
   *
   * A strong student's intro steps are skipped by the resolver. Listing them anyway would
   * promise work that never arrives and would make the progress figure unreachable.
   */
  it('hides the steps this student will never be given', () => {
    const steps = [
      step({ stepId: 'intro', sequence: 1, scoreWindow: { min: null, max: 50 } }),
      step({ stepId: 'main', sequence: 2 }),
    ];
    expect(view(steps, { skillScore: 30 }).steps.map(s => s.stepId)).toEqual(['intro', 'main']);
    expect(view(steps, { skillScore: 80 }).steps.map(s => s.stepId)).toEqual(['main']);
  });

  it('counts progress against the steps it is showing', () => {
    const v = view([
      step({ stepId: 'a', sequence: 1 }),
      step({ stepId: 'b', sequence: 2 }),
      step({ stepId: 'c', sequence: 3, required: false }),
      step({ stepId: 'd', sequence: 4 }),
    ], { done: ['a', 'c'] });
    // The optional one is done and does not count toward the requirement.
    expect(v.progress).toEqual({ completed: 1, totalRequired: 3, percent: 33 });
  });

  it('does not divide by zero on a journey with nothing required', () => {
    const v = view([step({ stepId: 'a', required: false })]);
    expect(v.progress).toEqual({ completed: 0, totalRequired: 0, percent: 0 });
  });

  /**
   * "Next" is the next thing in front of them, which is not the same as the next required
   * thing — an optional cheat sheet sitting at position three is still what comes next.
   */
  it('points at the first thing not yet done', () => {
    const steps = [
      step({ stepId: 'a', sequence: 1 }),
      step({ stepId: 'b', sequence: 2, required: false }),
      step({ stepId: 'c', sequence: 3 }),
    ];
    expect(view(steps, { done: ['a'] }).nextStepId).toBe('b');
    expect(view(steps, { done: ['a', 'b', 'c'] }).nextStepId).toBeNull();
  });

  it('totals the minutes of what it shows, so the estimate is the student’s own', () => {
    const v = view([
      step({ stepId: 'a', sequence: 1, estimatedMinutes: 12, scoreWindow: { min: null, max: 50 } }),
      step({ stepId: 'b', sequence: 2, estimatedMinutes: 20 }),
    ], { skillScore: 80 });
    expect(v.estimatedMinutes).toBe(20);
  });

  /**
   * `titleOverride` is usually empty — an author names the resource once and the step points at
   * it — so a syllabus built from the step alone was a column of phases: LEARN, LEARN, PRACTICE.
   */
  it('takes each step’s name from its material, and lets an author override it', () => {
    const resources = new Map<string, JourneyResource>([
      ['r1', { title: 'Counting with range()', resourceType: 'video', url: 'https://youtu.be/x' }],
      ['r2', { title: 'Ten loop drills', resourceType: 'practice', resourceId: 'p9' }],
    ]);
    const v = view([
      step({ stepId: 'a', sequence: 1, resourceId: 'r1' }),
      step({ stepId: 'b', sequence: 2, resourceId: 'r2', titleOverride: 'Your turn' }),
    ], { resources });
    expect(v.steps.map(s => s.title)).toEqual(['Counting with range()', 'Your turn']);
  });

  it('says when a step would open nothing, rather than letting them find out', () => {
    const resources = new Map<string, JourneyResource>([
      ['full',  { title: 'Notes', resourceType: 'notes', body: { notes: 'Something written' } }],
      ['empty', { title: 'Notes', resourceType: 'notes', body: { notes: '' } }],
    ]);
    const v = view([
      step({ stepId: 'a', sequence: 1, resourceId: 'full' }),
      step({ stepId: 'b', sequence: 2, resourceId: 'empty' }),
      // Points at a resource that is retired or gone: not in the map at all.
      step({ stepId: 'c', sequence: 3, resourceId: 'missing' }),
    ], { resources });
    expect(v.steps.map(s => s.hasContent)).toEqual([true, false, false]);
  });

  it('carries the roadmap verb, so a step reads the way the plan speaks', () => {
    const v = view([
      step({ stepId: 'a', sequence: 1, phase: 'UNDERSTAND' }),
      step({ stepId: 'b', sequence: 2, phase: 'TRY' }),
      step({ stepId: 'c', sequence: 3, phase: 'CHECK' }),
      step({ stepId: 'd', sequence: 4, phase: 'REVIEW' }),
    ]);
    expect(v.steps.map(s => s.workType)).toEqual(['LEARN', 'PRACTICE', 'ASSESS', 'REVIEW']);
  });
});

/**
 * A student who opens a step from the syllabus and then meets the same step as tomorrow's
 * mission must land in exactly the same place. Two sets of routing rules would eventually
 * disagree, and the student would be the one who found out.
 */
describe('where a step opens', () => {
  it('sends a material to the reader', () => {
    expect(stepRoute({ resourceId: 'abc', phase: 'LEARN' }, 'LOOPS_BASICS', { resourceType: 'notes' }))
      .toBe('/careerpilot/material/abc');
  });

  it('sends practice to the Practice Lab, by the problem id rather than the material id', () => {
    expect(stepRoute({ resourceId: 'abc', phase: 'PRACTICE' }, 'LOOPS_BASICS',
      { resourceType: 'practice', resourceId: 'p9' })).toBe('/careerpilot/practice/p9');
  });

  it('returns an external link whole, for the client to open in a new tab', () => {
    // Handing this to the router would produce an in-app path made out of a URL.
    expect(stepRoute({ resourceId: 'abc', phase: 'LEARN' }, 'LOOPS_BASICS',
      { resourceType: 'video', url: 'https://youtu.be/x' })).toBe('https://youtu.be/x');
  });

  it('sends a CHECK step with no material to the assessment', () => {
    expect(stepRoute({ resourceId: '', phase: 'CHECK' }, 'LOOPS_BASICS')).toContain('LOOPS_BASICS');
  });

  it('opens nothing rather than guessing, when there is nothing to open', () => {
    expect(stepRoute({ resourceId: '', phase: 'LEARN' }, 'LOOPS_BASICS')).toBe('');
    expect(stepRoute({ resourceId: 'gone', phase: 'LEARN' }, 'LOOPS_BASICS')).toBe('');
    // A practice material whose problem link was never set cannot be opened by id.
    expect(stepRoute({ resourceId: 'abc', phase: 'PRACTICE' }, 'LOOPS_BASICS',
      { resourceType: 'practice' })).toBe('');
  });
});
