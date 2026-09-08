/**
 * The rules that decide what a student is taught.
 *
 * These are the product's promises, not implementation details: a web student is not handed
 * Java, an ambitious student does not skip the prerequisites their ambition depends on, a busy
 * student learns the same things more slowly rather than learning fewer of them, and somebody
 * who has never programmed is never told they failed programming.
 *
 * Each of those is one line of code away from silently reversing, and every reversal looks like
 * a working product from the outside — the plan still renders, the student still has work to do,
 * and the damage only shows months later in what they cannot do. So they are pinned here.
 */

import {
  personalizeCurriculum, PlannableTopic, SkillBelief, PersonalizationInput,
} from '../services/curriculumPersonalizationService';
import {
  stateForScore, depthFor, paceFor, weeksFor, isSignificantChange, explainReason,
} from '../data/adaptiveCurriculumPolicy';
import {
  appliesToDirection, directionForRole, wantsExploration, isDirectionKey,
} from '../data/careerDirectionPolicy';

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

const topic = (over: Partial<PlannableTopic> = {}): PlannableTopic => ({
  topicCode: 'T1',
  title: 'A topic',
  moduleCode: 'M1',
  moduleOrder: 1,
  order: 1,
  skillKeys: ['SKILL_A'],
  prerequisiteSkillKeys: [],
  applicableDirections: [],
  mandatory: false,
  estimatedMinutes: 120,
  ...over,
});

const belief = (score: number | null, confidence: SkillBelief['confidence'] = 'MEDIUM'): SkillBelief =>
  ({ skillKey: 'x', score, confidence });

const input = (over: Partial<PersonalizationInput> = {}): PersonalizationInput => ({
  topics: [],
  beliefs: new Map(),
  graphPrerequisites: new Map(),
  priorities: new Map(),
  skillNames: new Map(),
  selectedDirection: null,
  directionStatus: 'UNDECIDED',
  explorationDirections: [],
  availability: { hoursPerDay: 2, daysPerWeek: 5 },
  ...over,
});

const run = (over: Partial<PersonalizationInput>) => personalizeCurriculum(input(over));
const only = (over: Partial<PersonalizationInput>) => run(over).decisions[0];

/* ================================================================== *
 * NOT_EXPOSED is not a failure
 * ================================================================== */

describe('a student who has never met a subject', () => {
  /**
   * The distinction the whole first-year experience rests on. Nobody has asked these students
   * the question, and reporting a zero says they got it wrong.
   */
  it('is NOT_EXPOSED, not scored zero', () => {
    expect(stateForScore({ score: null, confidence: null })).toBe('NOT_EXPOSED');
  });

  it('is not the same state as a measured student who did badly', () => {
    expect(stateForScore({ score: null, confidence: null }))
      .not.toBe(stateForScore({ score: 0, confidence: 'MEDIUM' }));
    expect(stateForScore({ score: 0, confidence: 'MEDIUM' })).toBe('FOUNDATION_REQUIRED');
  });

  it('is taught from the beginning, exactly like a measured gap', () => {
    // The NEED is identical; only the label differs, because one of them is a lie.
    expect(depthFor('NOT_EXPOSED')).toEqual(depthFor('FOUNDATION_REQUIRED'));
  });

  it('is explained without blame', () => {
    const text = explainReason('NOT_YET_EXPOSED', { skillName: 'Python' });
    expect(text).toMatch(/have not covered/i);
    expect(text).not.toMatch(/fail|weak|poor|bad/i);
  });

  it('governs a topic even when its other skills are strong', () => {
    // A topic covering three skills where one has never been measured must be taught for that
    // one. Averaging would hide the only gap that matters.
    const d = only({
      topics: [topic({ skillKeys: ['KNOWN_A', 'KNOWN_B', 'NEVER_SEEN'] })],
      beliefs: new Map([
        ['KNOWN_A', belief(90)],
        ['KNOWN_B', belief(88)],
      ]),
    });
    expect(d.state).toBe('NOT_EXPOSED');
  });
});

/* ================================================================== *
 * Score → state
 * ================================================================== */

describe('turning a score into a teaching decision', () => {
  it.each([
    [0, 'FOUNDATION_REQUIRED'], [39, 'FOUNDATION_REQUIRED'],
    [40, 'GUIDED'],             [59, 'GUIDED'],
    [60, 'STANDARD'],           [74, 'STANDARD'],
    [75, 'REVISION'],           [84, 'REVISION'],
    [85, 'VERIFIED'],           [100, 'VERIFIED'],
  ])('scores %i as %s', (score, expected) => {
    expect(stateForScore({ score, confidence: 'MEDIUM' })).toBe(expected);
  });

  /**
   * A 90 from one question is real, and is shown — but it must not buy a shortcut past material
   * the student has never actually demonstrated.
   */
  it('will not let a thinly-evidenced high score skip the teaching', () => {
    expect(stateForScore({ score: 95, confidence: 'LOW' })).toBe('STANDARD');
    expect(stateForScore({ score: 80, confidence: 'LOW' })).toBe('STANDARD');
  });

  it('does not turn thin evidence into a weakness either', () => {
    // Low confidence caps the ceiling; it never pushes somebody down into remediation.
    expect(stateForScore({ score: 30, confidence: 'LOW' })).toBe('FOUNDATION_REQUIRED');
    expect(stateForScore({ score: 50, confidence: 'LOW' })).toBe('GUIDED');
  });
});

/* ================================================================== *
 * Mastery is marked, never deleted
 * ================================================================== */

describe('a topic the student has already mastered', () => {
  const mastered = () => only({
    topics: [topic({ title: 'Python Variables', skillKeys: ['PY_VAR'] })],
    beliefs: new Map([['PY_VAR', belief(92, 'HIGH')]]),
  });

  /**
   * The current personalizer DELETES a topic scoring 90+. A plan that silently drops what you
   * are good at reads as a plan that lost your work, and leaves the student unable to see what
   * they were excused from.
   */
  it('stays in the plan rather than disappearing', () => {
    expect(mastered().title).toBe('Python Variables');
    expect(mastered().state).toBe('VERIFIED');
  });

  it('requires nothing', () => {
    expect(mastered().mandatory).toBe(false);
    expect(mastered().practiceCount).toBe(0);
  });

  it('offers a challenge rather than a lesson', () => {
    expect(mastered().contentDepth).toBe('CHALLENGE');
  });

  it('costs the student no time in the estimate', () => {
    expect(mastered().estimatedMinutes).toBe(0);
  });

  it('says why, using their own score', () => {
    expect(mastered().reasonText).toMatch(/already shown/i);
    expect(mastered().reasonText).toContain('92');
  });
});

/* ================================================================== *
 * Direction filtering
 * ================================================================== */

describe('teaching only what is relevant', () => {
  const java = topic({ title: 'Java Basics', skillKeys: ['JAVA'], applicableDirections: ['SOFTWARE_BACKEND'] });
  const git  = topic({ title: 'Git Basics', skillKeys: ['GIT'], mandatory: true, applicableDirections: [] });
  const dom  = topic({ title: 'DOM', skillKeys: ['DOM'], applicableDirections: ['WEB_DEVELOPMENT'] });

  /** The headline promise: do not teach every technology to every student. */
  it('does not give a web student Java', () => {
    const r = run({
      topics: [java, dom, git],
      selectedDirection: 'WEB_DEVELOPMENT',
      directionStatus: 'SELECTED',
      beliefs: new Map([['JAVA', belief(50)], ['DOM', belief(50)], ['GIT', belief(50)]]),
    });
    const byTitle = Object.fromEntries(r.decisions.map(d => [d.title, d]));
    expect(byTitle['Java Basics'].state).toBe('NOT_RELEVANT');
    expect(byTitle['Java Basics'].mandatory).toBe(false);
    expect(byTitle['DOM'].state).not.toBe('NOT_RELEVANT');
  });

  /** Marked, not hidden — the student can see what was set aside and why. */
  it('keeps the irrelevant topic visible with an explanation', () => {
    const r = run({
      topics: [java],
      selectedDirection: 'WEB_DEVELOPMENT', directionStatus: 'SELECTED',
      beliefs: new Map([['JAVA', belief(50)]]),
    });
    expect(r.decisions).toHaveLength(1);
    expect(r.decisions[0].reason).toBe('OUTSIDE_DIRECTION');
    expect(r.decisions[0].reasonText).toMatch(/Web Development/);
  });

  /** Git does not stop mattering because a student chose AI. */
  it('never removes mandatory foundation for direction', () => {
    const r = run({
      topics: [git],
      selectedDirection: 'AI_ML', directionStatus: 'SELECTED',
      beliefs: new Map([['GIT', belief(50)]]),
    });
    expect(r.decisions[0].state).not.toBe('NOT_RELEVANT');
    expect(r.decisions[0].mandatory).toBe(true);
  });

  it('shows an undecided student everything that is not direction-specific', () => {
    const generic = topic({ title: 'Problem Solving', skillKeys: ['PS'], applicableDirections: [] });
    const r = run({ topics: [generic], directionStatus: 'UNDECIDED', beliefs: new Map([['PS', belief(50)]]) });
    expect(r.decisions[0].state).not.toBe('NOT_RELEVANT');
  });

  it('lets an exploring student sample the directions they are considering', () => {
    const r = run({
      topics: [dom],
      directionStatus: 'EXPLORING',
      selectedDirection: null,
      explorationDirections: ['WEB_DEVELOPMENT', 'DATA'],
      beliefs: new Map([['DOM', belief(50)]]),
    });
    expect(r.decisions[0].state).not.toBe('NOT_RELEVANT');
  });

  it('treats empty applicability as everyone, so old content never vanishes', () => {
    expect(appliesToDirection([], 'AI_ML')).toBe(true);
    expect(appliesToDirection(undefined, null)).toBe(true);
    expect(appliesToDirection(['ALL'], 'AI_ML')).toBe(true);
  });

  it('is case and whitespace insensitive, because humans author these', () => {
    expect(appliesToDirection([' web_development '], 'WEB_DEVELOPMENT')).toBe(true);
  });
});

/* ================================================================== *
 * Prerequisites outrank ambition
 * ================================================================== */

describe('a student aiming beyond what they are ready for', () => {
  const ml = topic({ title: 'Machine Learning', skillKeys: ['ML'], applicableDirections: ['AI_ML'] });

  /**
   * The rule that protects students from their own ambition. Choosing AI does not make somebody
   * ready for AI, and a plan that honours the choice over the readiness produces a student who
   * has "done machine learning" and cannot write a loop.
   */
  it('does not let the target direction unlock a topic they are not ready for', () => {
    const d = only({
      topics: [ml],
      selectedDirection: 'AI_ML', directionStatus: 'SELECTED',
      graphPrerequisites: new Map([['ML', ['PY_LOOP']]]),
      beliefs: new Map([['ML', belief(70)], ['PY_LOOP', belief(20)]]),
      skillNames: new Map([['PY_LOOP', 'Python Loops']]),
    });
    expect(d.state).toBe('LOCKED');
    expect(d.locked).toBe(true);
    expect(d.lockedBy).toBe('PY_LOOP');
  });

  it('names the one thing to finish first, not a list', () => {
    const d = only({
      topics: [ml],
      selectedDirection: 'AI_ML', directionStatus: 'SELECTED',
      graphPrerequisites: new Map([['ML', ['PY_LOOP', 'PY_FUNC', 'MATH']]]),
      beliefs: new Map([['ML', belief(70)]]),
      skillNames: new Map([['PY_LOOP', 'Python Loops']]),
    });
    expect(d.reasonText).toContain('Python Loops');
    expect(d.reasonText).not.toContain('MATH');
  });

  it('unlocks once the prerequisite is genuinely reached', () => {
    const d = only({
      topics: [ml],
      selectedDirection: 'AI_ML', directionStatus: 'SELECTED',
      graphPrerequisites: new Map([['ML', ['PY_LOOP']]]),
      beliefs: new Map([['ML', belief(70)], ['PY_LOOP', belief(65)]]),
    });
    expect(d.locked).toBe(false);
    expect(d.state).toBe('STANDARD');
  });

  /** A thinly-evidenced pass is not a foundation to build on. */
  it('stays locked when the prerequisite was only measured once', () => {
    const d = only({
      topics: [ml],
      graphPrerequisites: new Map([['ML', ['PY_LOOP']]]),
      beliefs: new Map([['ML', belief(70)], ['PY_LOOP', belief(95, 'LOW')]]),
      selectedDirection: 'AI_ML', directionStatus: 'SELECTED',
    });
    expect(d.locked).toBe(true);
  });

  it('stays locked when the prerequisite was never measured at all', () => {
    const d = only({
      topics: [ml],
      selectedDirection: 'AI_ML', directionStatus: 'SELECTED',
      graphPrerequisites: new Map([['ML', ['PY_LOOP']]]),
      beliefs: new Map([['ML', belief(70)]]),
    });
    expect(d.locked).toBe(true);
  });

  it('ignores a prerequisite the topic itself teaches', () => {
    // A topic covering loops cannot be blocked on loops; that would never open.
    const d = only({
      topics: [topic({ skillKeys: ['PY_LOOP'], prerequisiteSkillKeys: ['PY_LOOP'] })],
      beliefs: new Map([['PY_LOOP', belief(30)]]),
    });
    expect(d.locked).toBe(false);
  });

  it('checks readiness before the score, so a lucky pass cannot unlock it', () => {
    const d = only({
      topics: [ml],
      selectedDirection: 'AI_ML', directionStatus: 'SELECTED',
      graphPrerequisites: new Map([['ML', ['PY_LOOP']]]),
      beliefs: new Map([['ML', belief(95, 'HIGH')], ['PY_LOOP', belief(10)]]),
    });
    expect(d.state).toBe('LOCKED');
  });
});

/* ================================================================== *
 * Availability changes pace, never content
 * ================================================================== */

describe('two students with the same gaps and different time', () => {
  const topics = [
    topic({ title: 'Loops', skillKeys: ['LOOP'], mandatory: true, estimatedMinutes: 180 }),
    topic({ title: 'Functions', skillKeys: ['FUNC'], mandatory: true, estimatedMinutes: 240 }),
  ];
  const beliefs = new Map([['LOOP', belief(35)], ['FUNC', belief(45)]]);

  const busy  = run({ topics, beliefs, availability: { hoursPerDay: 1, daysPerWeek: 3 } });
  const free  = run({ topics, beliefs, availability: { hoursPerDay: 2, daysPerWeek: 6 } });

  /** The difference between a plan and a discount. */
  it('are taught exactly the same things', () => {
    expect(busy.decisions.map(d => d.title)).toEqual(free.decisions.map(d => d.title));
    expect(busy.decisions.map(d => d.state)).toEqual(free.decisions.map(d => d.state));
    expect(busy.totalAssignedMinutes).toBe(free.totalAssignedMinutes);
  });

  it('differ only in how long it takes', () => {
    expect(busy.estimatedWeeks).toBeGreaterThan(free.estimatedWeeks);
  });

  it('never plans anybody to the full time they offered', () => {
    // The first bad week destroys a plan built to 100% of stated capacity.
    expect(free.pace.weeklyPlannableMinutes).toBeLessThan(free.pace.weeklyCapacityMinutes);
  });

  it('carries fewer topics at once on a narrow week', () => {
    expect(busy.pace.activeTopicsPerWeek).toBeLessThanOrEqual(free.pace.activeTopicsPerWeek);
  });

  it('clamps an implausible answer rather than planning against it', () => {
    const p = paceFor({ hoursPerDay: 24, daysPerWeek: 7 });
    expect(p.weeklyCapacityMinutes).toBeLessThanOrEqual(12 * 60 * 7);
  });

  it('reports an honest number of weeks rather than a flattering one', () => {
    // 900 minutes of work at 255 plannable minutes a week is four weeks, not three.
    expect(weeksFor(900, paceFor({ hoursPerDay: 1, daysPerWeek: 5 }))).toBe(4);
  });
});

/* ================================================================== *
 * Timeline honesty
 * ================================================================== */

describe('what counts toward the estimate', () => {
  it('excludes optional enrichment', () => {
    const r = run({
      topics: [
        topic({ title: 'Needed', skillKeys: ['A'], mandatory: true, estimatedMinutes: 100 }),
        topic({ title: 'Mastered', skillKeys: ['B'], mandatory: true, estimatedMinutes: 100 }),
      ],
      beliefs: new Map([['A', belief(40)], ['B', belief(95, 'HIGH')]]),
    });
    // Counting the mastered topic would make a student who is doing well look further behind.
    expect(r.totalAssignedMinutes).toBe(100);
  });

  it('excludes work the student cannot start yet', () => {
    const r = run({
      topics: [topic({ title: 'Blocked', skillKeys: ['ML'], mandatory: true, estimatedMinutes: 300 })],
      graphPrerequisites: new Map([['ML', ['BASICS']]]),
      beliefs: new Map([['ML', belief(50)]]),
    });
    expect(r.totalAssignedMinutes).toBe(0);
  });
});

/* ================================================================== *
 * Ordering
 * ================================================================== */

describe('the order the plan is presented in', () => {
  it('puts what needs attention first', () => {
    const r = run({
      topics: [
        topic({ title: 'Verified', skillKeys: ['V'] }),
        topic({ title: 'Weak', skillKeys: ['W'] }),
        topic({ title: 'Fine', skillKeys: ['F'] }),
      ],
      beliefs: new Map([['V', belief(95, 'HIGH')], ['W', belief(20)], ['F', belief(70)]]),
    });
    expect(r.decisions.map(d => d.title)).toEqual(['Weak', 'Fine', 'Verified']);
  });

  it('keeps modules in their authored order regardless of urgency', () => {
    const r = run({
      topics: [
        topic({ title: 'Later module gap', moduleCode: 'M2', moduleOrder: 2, skillKeys: ['A'] }),
        topic({ title: 'Earlier module fine', moduleCode: 'M1', moduleOrder: 1, skillKeys: ['B'] }),
      ],
      beliefs: new Map([['A', belief(10)], ['B', belief(70)]]),
    });
    expect(r.decisions[0].title).toBe('Earlier module fine');
  });

  it('is deterministic — the same input twice gives the same plan', () => {
    const args = {
      topics: [topic({ title: 'B', skillKeys: ['X'] }), topic({ title: 'A', skillKeys: ['Y'] })],
      beliefs: new Map([['X', belief(50)], ['Y', belief(50)]]),
    };
    expect(run(args).decisions.map(d => d.title)).toEqual(run(args).decisions.map(d => d.title));
  });
});

/* ================================================================== *
 * Replanning
 * ================================================================== */

describe('when the remaining plan should be rebuilt', () => {
  const s = (score: number | null, state: any) => ({ score, state });

  it('rebuilds when a score moves enough to change the teaching', () => {
    expect(isSignificantChange({
      beforeScore: 40, afterScore: 55, beforeState: 'GUIDED', afterState: 'GUIDED',
    })).toBe(true);
  });

  /** A plan that reshuffles on every answer is one nobody can learn to trust. */
  it('does not rebuild for a small movement', () => {
    expect(isSignificantChange({
      beforeScore: 40, afterScore: 45, beforeState: 'GUIDED', afterState: 'GUIDED',
    })).toBe(false);
  });

  it('always rebuilds when the state itself changed', () => {
    expect(isSignificantChange({
      beforeScore: 58, afterScore: 62, beforeState: 'GUIDED', afterState: 'STANDARD',
    })).toBe(true);
  });

  it('rebuilds the first time a skill is measured at all', () => {
    expect(isSignificantChange({
      beforeScore: null, afterScore: 30, beforeState: 'NOT_EXPOSED', afterState: 'FOUNDATION_REQUIRED',
    })).toBe(true);
  });
});

/* ================================================================== *
 * Directions
 * ================================================================== */

describe('the direction taxonomy', () => {
  it('recognises its own keys and rejects invented ones', () => {
    expect(isDirectionKey('AI_ML')).toBe(true);
    expect(isDirectionKey('BLOCKCHAIN_WIZARDRY')).toBe(false);
  });

  it('resolves a chosen role to the direction it sits in', () => {
    expect(directionForRole('BACKEND_ENGINEER')?.key).toBe('SOFTWARE_BACKEND');
    expect(directionForRole('ML_ENGINEER')?.key).toBe('AI_ML');
  });

  it('resolves a role shared by two directions to the more specific one', () => {
    expect(directionForRole('FULLSTACK_ENGINEER')?.key).toBe('WEB_DEVELOPMENT');
  });

  it('offers breadth to students who have not chosen, and not to those who have', () => {
    expect(wantsExploration('UNDECIDED')).toBe(true);
    expect(wantsExploration('EXPLORING')).toBe(true);
    expect(wantsExploration('SELECTED')).toBe(false);
  });
});

/* ================================================================== *
 * Worked cases from the brief
 * ================================================================== */

describe('Case A — first year, web developer, weak JavaScript', () => {
  const plan = run({
    topics: [
      topic({ title: 'Computer Fundamentals', skillKeys: ['CF'], mandatory: true }),
      topic({ title: 'Computational Thinking', skillKeys: ['CT'], mandatory: true }),
      topic({ title: 'JavaScript', skillKeys: ['JS'], applicableDirections: ['WEB_DEVELOPMENT'] }),
      topic({ title: 'Java Basics', skillKeys: ['JAVA'], applicableDirections: ['SOFTWARE_BACKEND'] }),
      topic({ title: 'Git', skillKeys: ['GIT'], mandatory: true }),
    ],
    selectedDirection: 'WEB_DEVELOPMENT',
    directionStatus: 'SELECTED',
    beliefs: new Map([
      ['CF', belief(81)], ['CT', belief(58)], ['JS', belief(35)], ['JAVA', belief(20)], ['GIT', belief(65)],
    ]),
    availability: { hoursPerDay: 2, daysPerWeek: 5 },
  });
  const by = Object.fromEntries(plan.decisions.map(d => [d.title, d]));

  it('revises what they already know', () => expect(by['Computer Fundamentals'].state).toBe('REVISION'));
  it('guides where they are shaky', () => expect(by['Computational Thinking'].state).toBe('GUIDED'));
  it('rebuilds JavaScript from the foundation', () => expect(by['JavaScript'].state).toBe('FOUNDATION_REQUIRED'));
  it('does not assign Java at all', () => expect(by['Java Basics'].state).toBe('NOT_RELEVANT'));
  it('keeps Git, which every student needs', () => expect(by['Git'].mandatory).toBe(true));
});

describe('Case C — first year, AI target, strong maths, weak problem solving', () => {
  const plan = run({
    topics: [
      topic({ title: 'Python Basics', skillKeys: ['PY'], mandatory: true }),
      topic({ title: 'Problem Solving', skillKeys: ['PS'], mandatory: true }),
      topic({ title: 'Maths', skillKeys: ['MATH'], mandatory: true }),
      topic({ title: 'Machine Learning', skillKeys: ['ML'], applicableDirections: ['AI_ML'] }),
    ],
    selectedDirection: 'AI_ML',
    directionStatus: 'SELECTED',
    graphPrerequisites: new Map([['ML', ['PY', 'PS']]]),
    beliefs: new Map([
      ['PY', belief(84, 'HIGH')], ['PS', belief(61)], ['MATH', belief(91, 'HIGH')],
    ]),
  });
  const by = Object.fromEntries(plan.decisions.map(d => [d.title, d]));

  it('puts verified Python on revision, not teaching', () => expect(by['Python Basics'].state).toBe('REVISION'));
  it('keeps problem solving as real work', () => expect(by['Problem Solving'].state).toBe('STANDARD'));
  it('marks mastered maths verified and optional', () => {
    expect(by['Maths'].state).toBe('VERIFIED');
    expect(by['Maths'].mandatory).toBe(false);
  });
  it('unlocks ML once both prerequisites are genuinely evidenced', () => {
    // Python 84 (HIGH) and Problem Solving 61 (MEDIUM) both clear the foundation bar, so the
    // ambition is now backed by readiness. Locking here would punish a student who did the work.
    expect(by['Machine Learning'].locked).toBe(false);
  });

  it('would have locked ML had that problem-solving score been thin', () => {
    const thin = run({
      topics: [topic({ title: 'Machine Learning', skillKeys: ['ML'], applicableDirections: ['AI_ML'] })],
      selectedDirection: 'AI_ML', directionStatus: 'SELECTED',
      graphPrerequisites: new Map([['ML', ['PY', 'PS']]]),
      beliefs: new Map([['ML', belief(70)], ['PY', belief(84, 'HIGH')], ['PS', belief(61, 'LOW')]]),
    });
    expect(thin.decisions[0].locked).toBe(true);
  });
});

/* ================================================================== *
 * The trap this test run exposed
 * ================================================================== */

describe('an undecided student whose exploration list was never populated', () => {
  /**
   * Found by four of these tests failing for a reason that had nothing to do with what they were
   * testing. Direction filtering runs before everything else, so a student with no direction AND
   * no exploration list had every direction-specific topic marked NOT_RELEVANT — leaving bare
   * foundation and no way to discover anything. It rendered as a perfectly healthy plan, which
   * is exactly what makes it worth pinning.
   */
  it('is shown direction-specific topics anyway, rather than none', () => {
    const d = only({
      topics: [topic({ title: 'DOM', skillKeys: ['DOM'], applicableDirections: ['WEB_DEVELOPMENT'] })],
      directionStatus: 'UNDECIDED',
      explorationDirections: [],
      beliefs: new Map([['DOM', belief(50)]]),
    });
    expect(d.state).not.toBe('NOT_RELEVANT');
  });

  it('still respects an explicit exploration list when one is given', () => {
    const d = only({
      topics: [topic({ title: 'Security', skillKeys: ['SEC'], applicableDirections: ['CYBERSECURITY'] })],
      directionStatus: 'UNDECIDED',
      explorationDirections: ['WEB_DEVELOPMENT', 'DATA'],
      beliefs: new Map([['SEC', belief(50)]]),
    });
    expect(d.state).toBe('NOT_RELEVANT');
  });

  it('does not widen the plan for a student who HAS chosen', () => {
    const d = only({
      topics: [topic({ title: 'Java', skillKeys: ['JAVA'], applicableDirections: ['SOFTWARE_BACKEND'] })],
      selectedDirection: 'WEB_DEVELOPMENT',
      directionStatus: 'SELECTED',
      explorationDirections: [],
      beliefs: new Map([['JAVA', belief(50)]]),
    });
    expect(d.state).toBe('NOT_RELEVANT');
  });
});

/* ================================================================== *
 * The unreachable plan
 * ================================================================== */

describe('a topic whose prerequisite the direction filtered away', () => {
  /**
   * Found by generating a real plan, not by reasoning about one. A backend student had "How the
   * Web Talks" LOCKED behind HTML — and HTML had been marked NOT_RELEVANT, because it is web
   * work. The lock could never be satisfied: the student was told to finish something their own
   * plan would never teach them, for the life of the plan.
   *
   * A skill your plan depends on is relevant to you whatever your direction says.
   */
  const http = topic({ title: 'How the Web Talks', skillKeys: ['HTTP'] });
  const html = topic({ title: 'HTML', skillKeys: ['HTML'], applicableDirections: ['WEB_DEVELOPMENT'] });

  const plan = run({
    topics: [http, html],
    selectedDirection: 'SOFTWARE_BACKEND',
    directionStatus: 'SELECTED',
    graphPrerequisites: new Map([['HTTP', ['HTML']]]),
    beliefs: new Map([['HTTP', belief(50)]]),
  });
  const by = Object.fromEntries(plan.decisions.map(d => [d.title, d]));

  it('pulls the prerequisite back into the plan', () => {
    expect(by['HTML'].state).not.toBe('NOT_RELEVANT');
  });

  it('so the lock on the dependent topic can actually be satisfied', () => {
    expect(by['How the Web Talks'].locked).toBe(true);
    expect(by['How the Web Talks'].lockedBy).toBe('HTML');
    // The thing it names is present and teachable, which is what makes the lock honest.
    expect(by['HTML'].mandatory || by['HTML'].state !== 'NOT_RELEVANT').toBe(true);
  });

  it('does not drag in unrelated direction work', () => {
    const withCss = run({
      topics: [http, html, topic({ title: 'CSS', skillKeys: ['CSS'], applicableDirections: ['WEB_DEVELOPMENT'] })],
      selectedDirection: 'SOFTWARE_BACKEND',
      directionStatus: 'SELECTED',
      graphPrerequisites: new Map([['HTTP', ['HTML']]]),
      beliefs: new Map([['HTTP', belief(50)]]),
    });
    const m = Object.fromEntries(withCss.decisions.map(d => [d.title, d]));
    expect(m['CSS'].state).toBe('NOT_RELEVANT');
  });

  it('terminates on a curriculum with a prerequisite cycle', () => {
    const a = topic({ title: 'A', skillKeys: ['A_SKILL'], applicableDirections: ['WEB_DEVELOPMENT'] });
    const b = topic({ title: 'B', skillKeys: ['B_SKILL'], applicableDirections: ['WEB_DEVELOPMENT'] });
    const cyc = run({
      topics: [a, b, topic({ title: 'Root', skillKeys: ['ROOT'], mandatory: true })],
      selectedDirection: 'SOFTWARE_BACKEND', directionStatus: 'SELECTED',
      graphPrerequisites: new Map([['ROOT', ['A_SKILL']], ['A_SKILL', ['B_SKILL']], ['B_SKILL', ['A_SKILL']]]),
      beliefs: new Map([['ROOT', belief(50)]]),
    });
    expect(cyc.decisions).toHaveLength(3);
  });
});

describe('topics that share an identifier', () => {
  /**
   * Relevance is tracked by object, not by code or title. Two topics can share a title across
   * modules, and topicCode is optional on curricula authored before codes existed — either
   * collision would mark an irrelevant topic relevant, which is how a web student was briefly
   * assigned Java.
   */
  it('does not leak relevance between two topics with the same code', () => {
    const plan = run({
      topics: [
        topic({ topicCode: 'DUP', title: 'Git', skillKeys: ['GIT'], mandatory: true }),
        topic({ topicCode: 'DUP', title: 'Java', skillKeys: ['JAVA'], applicableDirections: ['SOFTWARE_BACKEND'] }),
      ],
      selectedDirection: 'WEB_DEVELOPMENT', directionStatus: 'SELECTED',
      beliefs: new Map([['GIT', belief(50)], ['JAVA', belief(50)]]),
    });
    const by = Object.fromEntries(plan.decisions.map(d => [d.title, d]));
    expect(by['Java'].state).toBe('NOT_RELEVANT');
    expect(by['Git'].state).not.toBe('NOT_RELEVANT');
  });
});
