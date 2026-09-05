import {
  buildRoadmapPlan, allocateWeeks, PlannerSkill, PlannerGraphNode, PlannerProfile, PlannerInput,
} from '../services/roadmapPlannerService';
import { classifyGap, priorityScore, targetScoreFor } from '../data/roleReadinessPolicy';
import {
  MIN_BLOCK_MINUTES, ASSESS_BLOCK_MINUTES, MAX_SKILL_SHARE, MAX_ROADMAP_DAYS, weekBudgets, capacityFor,
} from '../data/roadmapPolicy';

/**
 * Module 9 — turning gaps, prerequisites and available time into a plan.
 *
 * Four properties carry the module, and each is a promise a student would notice being
 * broken:
 *
 *   IT FITS.            A plan that asks for more hours than they committed to is fiction,
 *                       and they find out in week one.
 *   UNKNOWN IS NOT WEAK. A skill nobody has measured earns a diagnostic, never a course from
 *                       zero. Teaching what they already know spends the 90 days on nothing.
 *   STRONG COSTS NOTHING. Demonstrated strength gets no remedial time. This is the whole of
 *                       "we don't make every student learn everything from zero".
 *   ORDER IS REAL.      A prerequisite precedes what it unblocks, whatever the priorities
 *                       say, because the alternative does not work as learning.
 *
 * Fixtures are built through Module 8's own classifyGap and priorityScore rather than by
 * hand-writing statuses, so a test can never assert against a gap verdict this system would
 * not actually produce.
 */

/** One blueprint requirement, classified exactly as Module 8 would classify it. */
function req(skillKey: string, o: {
  score?: number | null;
  confidence?: string | null;
  level?: string;
  importance?: string;
  weight?: number;
} = {}): PlannerSkill {
  const targetScore = targetScoreFor(o.level || 'PROFICIENT');
  const studentScore = o.score ?? null;
  const confidence = o.confidence === undefined ? (studentScore === null ? null : 'HIGH') : o.confidence;
  const importance = o.importance || 'IMPORTANT';
  const weight = o.weight ?? 6;
  const counted = confidence === 'HIGH' || confidence === 'MEDIUM';

  return {
    skillKey,
    skillName: skillKey.replace(/_/g, ' '),
    importance,
    weight,
    targetLevel: o.level || 'PROFICIENT',
    targetScore,
    studentScore,
    skillConfidence: confidence,
    gapPoints: studentScore === null ? null : Math.max(0, targetScore - studentScore),
    status: classifyGap({ studentScore, targetScore, confidence }),
    priorityScore: counted && studentScore !== null
      ? priorityScore({ studentScore, targetScore, weight, importance })
      : 0,
  };
}

function graphOf(
  defs: Record<string, { prereq?: string[]; type?: 'GROUP' | 'SKILL'; active?: boolean }>,
): Map<string, PlannerGraphNode> {
  const g = new Map<string, PlannerGraphNode>();
  for (const [key, d] of Object.entries(defs)) {
    g.set(key, {
      key,
      name: key.replace(/_/g, ' '),
      nodeType: d.type || 'SKILL',
      prerequisiteKeys: d.prereq || [],
      active: d.active !== false,
    });
  }
  return g;
}

function plan(over: Partial<PlannerInput> & { skills: PlannerSkill[] }) {
  const skills = over.skills;
  const graph = over.graph || graphOf(Object.fromEntries(skills.map(s => [s.skillKey, {}])));
  return buildRoadmapPlan({
    roleKey: 'BACKEND_ENGINEER',
    roleName: 'Backend Engineer',
    stage: 'foundation',
    coverage: 80,
    roleConfidence: 'HIGH',
    minutesPerDay: 60,
    daysPerWeek: 6,
    roadmapDays: MAX_ROADMAP_DAYS,
    profiles: new Map<string, PlannerProfile>(),
    ...over,
    skills,
    graph,
  });
}

const minutesFor = (p: ReturnType<typeof plan>, skillKey: string) =>
  p.objectives.filter(o => o.skillKey === skillKey).reduce((n, o) => n + o.plannedMinutes, 0);

const typesFor = (p: ReturnType<typeof plan>, skillKey: string) =>
  p.objectives.filter(o => o.skillKey === skillKey).map(o => o.workType);

const firstWeekOf = (p: ReturnType<typeof plan>, skillKey: string) =>
  Math.min(...p.objectives.filter(o => o.skillKey === skillKey).map(o => o.week));

// ─────────────────────────────────────────────────────────────────────────────
// §17, §51, §119 — the plan fits the commitment
// ─────────────────────────────────────────────────────────────────────────────

describe('the plan fits the time the student actually has', () => {
  const commitments = [
    { minutesPerDay: 30, daysPerWeek: 5 },
    { minutesPerDay: 60, daysPerWeek: 6 },
    { minutesPerDay: 120, daysPerWeek: 6 },
  ];

  const busy = [
    req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 }),
    req('DSA_ARRAYS', { score: 45, importance: 'ESSENTIAL', weight: 9 }),
    req('OOP', { score: 50, weight: 8 }),
    req('SQL', { score: 80, weight: 7 }),
    req('DOCKER', { score: null }),
    req('GIT', { score: 90, weight: 4 }),
  ];

  for (const c of commitments) {
    it(`never overbooks ${c.minutesPerDay} min × ${c.daysPerWeek} days`, () => {
      const p = plan({ skills: busy, ...c });
      expect(p.capacity.plannedMinutes).toBeLessThanOrEqual(p.capacity.plannableMinutes);
      // And below the theoretical maximum, which is the point of the buffer.
      expect(p.capacity.plannedMinutes).toBeLessThan(p.capacity.theoreticalMinutes);
    });

    it(`keeps every single week inside its budget at ${c.minutesPerDay}×${c.daysPerWeek}`, () => {
      const p = plan({ skills: busy, ...c });
      const cap = capacityFor({ ...c, roadmapDays: MAX_ROADMAP_DAYS });
      const budgets = weekBudgets(MAX_ROADMAP_DAYS, cap.weeklyPlannableMinutes);

      for (let w = 1; w <= p.weekCount; w++) {
        const load = p.objectives.filter(o => o.week === w).reduce((n, o) => n + o.plannedMinutes, 0);
        // A plan that fits overall but puts eleven hours into week three is still a plan
        // the student cannot follow.
        expect(load).toBeLessThanOrEqual(budgets[w - 1]);
      }
    });
  }

  /**
   * NARROWED TO STUDY BLOCKS, which is what the rule was always about.
   *
   * MIN_BLOCK_MINUTES exists so a plan never says "Study Java, 7 minutes" — a fragment of
   * learning is noise. A diagnostic is not a fragment: it is a whole skill check, eight
   * questions, complete in itself, and it carries its own fixed price precisely because its
   * cost has nothing to do with how much there is to learn. Holding it to the study minimum
   * was what priced an eight-question check at 45 minutes and gave a member with 22 unknowns
   * four weeks of testing before anything was taught.
   *
   * Both rules are still pinned, each to its own constant.
   */
  it('never plans a study block too small to be worth doing', () => {
    const p = plan({ skills: busy, minutesPerDay: 30, daysPerWeek: 5 });
    for (const o of p.objectives.filter(o => o.workType !== 'ASSESS')) {
      expect(o.plannedMinutes).toBeGreaterThanOrEqual(MIN_BLOCK_MINUTES);
    }
  });

  it('prices every diagnostic at the same fixed cost, whatever it measures', () => {
    const p = plan({ skills: busy, minutesPerDay: 30, daysPerWeek: 5 });
    for (const o of p.objectives.filter(o => o.workType === 'ASSESS')) {
      expect(o.plannedMinutes).toBe(ASSESS_BLOCK_MINUTES);
    }
  });

  it('keeps a week focused rather than spreading it across everything', () => {
    const p = plan({ skills: busy });
    for (let w = 1; w <= p.weekCount; w++) {
      const distinct = new Set(p.objectives.filter(o => o.week === w).map(o => o.skillKey));
      expect(distinct.size).toBeLessThanOrEqual(4);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §10, §120 — same profile on paper, different plan
// ─────────────────────────────────────────────────────────────────────────────

describe('two students with the same course and role, different Skill DNA', () => {
  const rahul = [
    req('OOP', { score: 40, weight: 8 }),
    req('DSA_ARRAYS', { score: 45, weight: 8 }),
    req('SQL', { score: 80, weight: 8 }),
    req('HTTP', { score: 35, weight: 8 }),
  ];
  const priya = [
    req('OOP', { score: 82, weight: 8 }),
    req('DSA_ARRAYS', { score: 70, weight: 8 }),
    req('SQL', { score: 42, weight: 8 }),
    req('HTTP', { score: 76, weight: 8 }),
  ];

  it('produces meaningfully different plans', () => {
    const a = plan({ skills: rahul });
    const b = plan({ skills: priya });
    expect(a.objectives).not.toEqual(b.objectives);
  });

  it('does not spend Rahul’s roadmap on the SQL he can already do', () => {
    const a = plan({ skills: rahul });
    expect(minutesFor(a, 'OOP')).toBeGreaterThan(minutesFor(a, 'SQL'));
    expect(minutesFor(a, 'HTTP')).toBeGreaterThan(minutesFor(a, 'SQL'));
  });

  it('does not spend Priya’s roadmap on the OOP she can already do', () => {
    const b = plan({ skills: priya });
    expect(minutesFor(b, 'SQL')).toBeGreaterThan(minutesFor(b, 'OOP'));
  });

  it('gives the same skill opposite treatment for the two of them', () => {
    const a = plan({ skills: rahul });
    const b = plan({ skills: priya });
    // The clearest possible statement that the plan follows the evidence: SQL is most of
    // Priya's roadmap and almost none of Rahul's.
    expect(minutesFor(b, 'SQL')).toBeGreaterThan(minutesFor(a, 'SQL'));
    expect(minutesFor(a, 'OOP')).toBeGreaterThan(minutesFor(b, 'OOP'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §11, §108, §110, §121 — different because the evidence differs, not at random
// ─────────────────────────────────────────────────────────────────────────────

describe('determinism', () => {
  const skills = [
    req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 }),
    req('OOP', { score: 55, weight: 7 }),
    req('DOCKER', { score: null }),
    req('SQL', { score: 95, confidence: 'LOW', weight: 5 }),
  ];

  it('gives the same plan for the same input, every time', () => {
    expect(plan({ skills })).toEqual(plan({ skills }));
  });

  it('gives equivalent plans to two students with equivalent inputs', () => {
    // Same numbers, different order of arrival. Nothing about a plan should depend on the
    // order rows came back from a database.
    const shuffled = [skills[2], skills[0], skills[3], skills[1]];
    const a = plan({ skills });
    const b = plan({ skills: shuffled });
    expect(b.objectives).toEqual(a.objectives);
    expect(b.phases).toEqual(a.phases);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §30–§35, §38, §122 — prerequisites
// ─────────────────────────────────────────────────────────────────────────────

describe('prerequisites', () => {
  const chain = graphOf({
    SPRING_BOOT: { prereq: ['JAVA'] },
    JAVA: { prereq: ['OOP'] },
    OOP: {},
  });

  it('schedules the chain in dependency order — C before B before A', () => {
    const p = plan({
      skills: [req('SPRING_BOOT', { score: 30, importance: 'ESSENTIAL', weight: 10 })],
      graph: chain,
      profiles: new Map([
        ['JAVA', { score: 30, confidence: 'HIGH' }],
        ['OOP', { score: 20, confidence: 'HIGH' }],
      ]),
    });

    expect(firstWeekOf(p, 'OOP')).toBeLessThan(firstWeekOf(p, 'JAVA'));
    expect(firstWeekOf(p, 'JAVA')).toBeLessThan(firstWeekOf(p, 'SPRING_BOOT'));
  });

  it('attributes each prerequisite to the skill that immediately needs it', () => {
    // "OOP comes before Java" is both truer and more useful than "OOP comes before Spring
    // Boot" — and it is what orders OOP against Java at all.
    const p = plan({
      skills: [req('SPRING_BOOT', { score: 30, importance: 'ESSENTIAL', weight: 10 })],
      graph: chain,
      profiles: new Map([
        ['JAVA', { score: 30, confidence: 'HIGH' }],
        ['OOP', { score: 20, confidence: 'HIGH' }],
      ]),
    });

    expect(p.objectives.find(o => o.skillKey === 'OOP')!.prerequisiteFor).toBe('JAVA');
    expect(p.objectives.find(o => o.skillKey === 'JAVA')!.prerequisiteFor).toBe('SPRING_BOOT');
  });

  it('says why a prerequisite is there, naming what it unblocks', () => {
    const p = plan({
      skills: [req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 })],
      graph: graphOf({ REST_API: { prereq: ['HTTP'] }, HTTP: {} }),
      profiles: new Map([['HTTP', { score: 15, confidence: 'HIGH' }]]),
    });

    const http = p.objectives.find(o => o.skillKey === 'HTTP')!;
    expect(http.reasonCode).toBe('PREREQUISITE');
    expect(http.prerequisiteFor).toBe('REST_API');
    expect(http.explanation).toContain('prerequisite');
  });

  it('does NOT teach a prerequisite the student has already demonstrated', () => {
    // §31: REST is the gap; HTTP is strong. Scheduling "HTTP fundamentals" would be three
    // weeks the student spends proving something they proved already.
    const p = plan({
      skills: [req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 })],
      graph: graphOf({ REST_API: { prereq: ['HTTP'] }, HTTP: {} }),
      profiles: new Map([['HTTP', { score: 88, confidence: 'HIGH' }]]),
    });

    expect(minutesFor(p, 'HTTP')).toBe(0);
    expect(p.report.prerequisitesSatisfiedSkipped).toBe(1);
  });

  it('MEASURES an unknown prerequisite instead of teaching it', () => {
    // §32: we do not know whether they need it, so we find out before spending the time.
    const p = plan({
      skills: [req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 })],
      graph: graphOf({ REST_API: { prereq: ['HTTP'] }, HTTP: {} }),
      profiles: new Map(),
    });

    expect(typesFor(p, 'HTTP')).toEqual(['ASSESS']);
    expect(typesFor(p, 'HTTP')).not.toContain('LEARN');
  });

  it('walks a group node through to real skills without scheduling the group', () => {
    // §117/§118: a grouping node organises the taxonomy. Nobody can sit down and learn it.
    const p = plan({
      skills: [req('REST_API', { score: 35, importance: 'ESSENTIAL', weight: 10 })],
      graph: graphOf({
        REST_API: { prereq: ['WEB_BASICS'] },
        WEB_BASICS: { type: 'GROUP', prereq: ['HTTP'] },
        HTTP: {},
      }),
      profiles: new Map([['HTTP', { score: 10, confidence: 'HIGH' }]]),
    });

    expect(p.objectives.some(o => o.skillKey === 'WEB_BASICS')).toBe(false);
    expect(minutesFor(p, 'HTTP')).toBeGreaterThan(0);
  });

  it('does not hang on a circular graph', () => {
    // §33/§123: an admin can create A → B → A, and a planner that loops takes the site down.
    const p = plan({
      skills: [req('A', { score: 30, weight: 8 }), req('B', { score: 30, weight: 8 })],
      graph: graphOf({ A: { prereq: ['B'] }, B: { prereq: ['A'] } }),
    });
    expect(p.objectives.length).toBeGreaterThan(0);
  });

  it('does not survive a self-referencing skill by looping', () => {
    const p = plan({
      skills: [req('A', { score: 30, weight: 8 })],
      graph: graphOf({ A: { prereq: ['A'] } }),
    });
    expect(p.objectives.length).toBeGreaterThan(0);
  });

  it('bounds how far back it will go', () => {
    // §34: one gap must not expand into a whole ancestry, or the 90 days go on foundations
    // for something the student never reaches.
    const deep: Record<string, { prereq?: string[] }> = { L0: { prereq: ['L1'] } };
    const profiles = new Map<string, PlannerProfile>();
    for (let i = 1; i <= 8; i++) {
      deep[`L${i}`] = { prereq: [`L${i + 1}`] };
      profiles.set(`L${i}`, { score: 10, confidence: 'HIGH' });
    }
    deep.L9 = {};

    const p = plan({
      skills: [req('L0', { score: 20, importance: 'ESSENTIAL', weight: 10 })],
      graph: graphOf(deep),
      profiles,
    });

    expect(p.report.prerequisitesAdded).toBeLessThanOrEqual(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §25, §72, §100, §124 — unknown is not weak
// ─────────────────────────────────────────────────────────────────────────────

describe('a skill nobody has measured', () => {
  const skills = [
    req('DOCKER', { score: null, importance: 'ESSENTIAL', weight: 9 }),
    req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 }),
  ];

  it('is measured, not taught from zero', () => {
    const p = plan({ skills });
    expect(typesFor(p, 'DOCKER')).toEqual(['ASSESS']);
  });

  it('is never described as a gap', () => {
    const p = plan({ skills });
    const docker = p.objectives.find(o => o.skillKey === 'DOCKER')!;
    expect(docker.reasonCode).toBe('ASSESSMENT_NEEDED');
    expect(docker.sourceGapStatus).toBe('NOT_ASSESSED');
  });

  it('is not ignored for 90 days when it is essential', () => {
    // §100: an unmeasured essential is the largest hole in the picture. It gets attention —
    // just diagnostic attention.
    const p = plan({ skills });
    expect(minutesFor(p, 'DOCKER')).toBeGreaterThan(0);
  });

  it('costs far less than a demonstrated gap of the same importance', () => {
    const p = plan({ skills });
    expect(minutesFor(p, 'DOCKER')).toBeLessThan(minutesFor(p, 'REST_API'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §73, §125 — a high score we do not trust
// ─────────────────────────────────────────────────────────────────────────────

describe('a high score on thin evidence', () => {
  it('is validated, not re-taught from the beginning', () => {
    const p = plan({
      skills: [
        req('SQL', { score: 95, confidence: 'LOW', weight: 8 }),
        req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 }),
      ],
    });

    expect(typesFor(p, 'SQL')).toEqual(['ASSESS']);
    expect(p.objectives.find(o => o.skillKey === 'SQL')!.reasonCode).toBe('LIMITED_EVIDENCE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §28, §75, §126 — strength costs nothing
// ─────────────────────────────────────────────────────────────────────────────

describe('a demonstrated strength', () => {
  const skills = [
    req('SQL', { score: 90, confidence: 'HIGH', level: 'WORKING', weight: 8 }),
    req('REST_API', { score: 40, confidence: 'HIGH', importance: 'ESSENTIAL', weight: 10 }),
  ];

  it('gets no remedial capacity at all', () => {
    const p = plan({ skills });
    expect(p.objectives.some(o => o.skillKey === 'SQL' && (o.workType === 'LEARN' || o.workType === 'PRACTICE')))
      .toBe(false);
  });

  it('leaves the roadmap free for what the student cannot do', () => {
    const p = plan({ skills });
    expect(minutesFor(p, 'REST_API')).toBeGreaterThan(minutesFor(p, 'SQL'));
    expect(p.report.strengthsSkipped).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §74, §127, §49 — a real gap gets real time, but not all of it
// ─────────────────────────────────────────────────────────────────────────────

describe('a well-evidenced essential gap', () => {
  it('gets both instruction and practice', () => {
    const p = plan({
      skills: [
        req('REST_API', { score: 40, confidence: 'HIGH', importance: 'ESSENTIAL', weight: 10 }),
        req('SQL', { score: 70, weight: 4 }),
      ],
    });
    expect(typesFor(p, 'REST_API')).toEqual(expect.arrayContaining(['LEARN', 'PRACTICE']));
  });

  it('gets the largest share of the plan', () => {
    const p = plan({
      skills: [
        req('REST_API', { score: 40, confidence: 'HIGH', importance: 'ESSENTIAL', weight: 10 }),
        req('GIT', { score: 68, importance: 'SUPPORTING', weight: 3 }),
      ],
    });
    expect(minutesFor(p, 'REST_API')).toBeGreaterThan(minutesFor(p, 'GIT'));
  });

  it('still cannot consume the whole 90 days on its own', () => {
    // §49: one enormous gap must not become the entire programme.
    const p = plan({
      skills: [
        req('REST_API', { score: 2, confidence: 'HIGH', importance: 'ESSENTIAL', weight: 10, level: 'ADVANCED' }),
        req('SQL', { score: 50, weight: 6 }),
        req('OOP', { score: 55, weight: 6 }),
      ],
    });
    expect(minutesFor(p, 'REST_API')).toBeLessThanOrEqual(p.capacity.plannableMinutes * MAX_SKILL_SHARE + 30);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §43, §77, §78, §128, §129 — coverage shapes the plan
// ─────────────────────────────────────────────────────────────────────────────

describe('how much has been measured changes the shape of the plan', () => {
  const mostlyUnknown = [
    req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 }),
    req('DOCKER', { score: null, importance: 'ESSENTIAL', weight: 9 }),
    req('SQL', { score: null, importance: 'ESSENTIAL', weight: 8 }),
    req('OOP', { score: null, importance: 'ESSENTIAL', weight: 8 }),
    req('GIT', { score: null, weight: 5 }),
  ];
  const mostlyKnown = [
    req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 }),
    req('DOCKER', { score: 45, importance: 'ESSENTIAL', weight: 9 }),
    req('SQL', { score: 50, importance: 'ESSENTIAL', weight: 8 }),
    req('OOP', { score: 55, importance: 'ESSENTIAL', weight: 8 }),
    req('GIT', { score: 60, weight: 5 }),
  ];

  it('spends more of a thinly-measured plan on finding out', () => {
    const low = plan({ skills: mostlyUnknown, coverage: 15, roleConfidence: 'LOW' });
    const high = plan({ skills: mostlyKnown, coverage: 95, roleConfidence: 'HIGH' });
    expect(low.report.diagnosticMinutes).toBeGreaterThan(high.report.diagnosticMinutes);
  });

  it('spends a well-measured plan on the gaps it already knows about', () => {
    const high = plan({ skills: mostlyKnown, coverage: 95, roleConfidence: 'HIGH' });
    expect(high.report.gapMinutes).toBeGreaterThan(high.report.diagnosticMinutes);
  });

  it('tells the student the thin plan is provisional', () => {
    // §79/§80: better to say the plan is based on limited evidence than to present a guess
    // with the same confidence as a measured plan.
    const low = plan({ skills: mostlyUnknown, coverage: 15, roleConfidence: 'LOW' });
    expect(low.planningConfidence).toBe('LOW');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §36, §37 — stage changes the activity mix and nothing else
// ─────────────────────────────────────────────────────────────────────────────

describe('career stage', () => {
  const skills = [
    req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 }),
    req('DSA_ARRAYS', { score: 45, importance: 'ESSENTIAL', weight: 9 }),
  ];

  it('moves a first-year toward instruction and a final-year toward application', () => {
    const foundation = plan({ skills, stage: 'foundation' });
    const placement = plan({ skills, stage: 'placement' });

    const learnOf = (p: ReturnType<typeof plan>) =>
      p.objectives.filter(o => o.workType === 'LEARN').reduce((n, o) => n + o.plannedMinutes, 0);

    expect(learnOf(foundation)).toBeGreaterThan(learnOf(placement));
  });

  it('never changes what the student is said to be able to do', () => {
    // §37: stage shapes activities. A score that moved because somebody is in first year
    // would make the whole measurement worthless.
    const foundation = plan({ skills, stage: 'foundation' });
    const placement = plan({ skills, stage: 'placement' });

    // Compared as a set of distinct facts, not row by row: a different mix legitimately
    // splits the same allocation into a different number of blocks. What must not move is
    // any skill's score or target, or the total time it receives.
    const scores = (p: ReturnType<typeof plan>) =>
      [...new Set(p.objectives.map(o => `${o.skillKey}:${o.studentScore}:${o.targetScore}`))].sort();

    expect(scores(foundation)).toEqual(scores(placement));
    expect(minutesFor(foundation, 'REST_API')).toBe(minutesFor(placement, 'REST_API'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §102, §103 — a shortage is prioritised, not pretended away
// ─────────────────────────────────────────────────────────────────────────────

describe('when there is far more to do than there is time', () => {
  /**
   * Grown from 14 to 32. Not to make a test pass — to keep it testing what it says.
   *
   * Repricing diagnostics from 45 minutes to 15 freed most of a diagnostic budget back into
   * the gap pool, and 14 skills stopped being "far more to do than there is time": everything
   * fitted, nothing was deferred, and the assertions below became vacuously false. The rule
   * they describe is unchanged and still worth pinning, so the scenario is restored to one
   * that genuinely overflows a 30-minute-a-day commitment. Measured rather than guessed: at
   * 32 the small commitment defers 6 and the large defers 4, which is what this describes.
   */
  const many = Array.from({ length: 32 }, (_, i) =>
    req(`SKILL_${String(i).padStart(2, '0')}`, { score: 20 + (i % 30), importance: 'ESSENTIAL', weight: 10 - (i % 5) }));

  it('plans the highest-value subset rather than overbooking', () => {
    const p = plan({ skills: many, minutesPerDay: 30, daysPerWeek: 5 });
    expect(p.capacity.plannedMinutes).toBeLessThanOrEqual(p.capacity.plannableMinutes);
    expect(p.deferred.length).toBeGreaterThan(0);
  });

  it('records what was left out, so renewal knows where to start', () => {
    const p = plan({ skills: many, minutesPerDay: 30, daysPerWeek: 5 });
    for (const d of p.deferred) {
      expect(d.skillKey).toBeTruthy();
      expect(d.reason).toBeTruthy();
    }
    expect(p.report.objectivesDeferred).toBe(p.deferred.length);
  });

  it('keeps the most urgent gap and defers the least', () => {
    const p = plan({ skills: many, minutesPerDay: 30, daysPerWeek: 5 });
    const scheduled = new Set(p.objectives.map(o => o.skillKey));
    const ranked = [...many].sort((a, b) => b.priorityScore - a.priorityScore);
    expect(scheduled.has(ranked[0].skillKey)).toBe(true);
  });

  it('gives a student with more time more of the same work, not different work', () => {
    const small = plan({ skills: many, minutesPerDay: 30, daysPerWeek: 5 });
    const large = plan({ skills: many, minutesPerDay: 120, daysPerWeek: 6 });
    expect(large.deferred.length).toBeLessThan(small.deferred.length);
    expect(large.capacity.plannedMinutes).toBeGreaterThan(small.capacity.plannedMinutes);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §40–§42, §71, §89 — structure
// ─────────────────────────────────────────────────────────────────────────────

describe('structure', () => {
  const skills = [
    req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 }),
    req('DOCKER', { score: null, importance: 'ESSENTIAL', weight: 9 }),
    req('SQL', { score: 62, weight: 6 }),
    req('GIT', { score: 78, level: 'WORKING', weight: 4 }),
  ];

  it('lays phases out in order, with no gaps and no overlaps', () => {
    const p = plan({ skills });
    let expected = 1;
    for (const ph of p.phases) {
      expect(ph.fromWeek).toBe(expected);
      expect(ph.toWeek).toBeGreaterThanOrEqual(ph.fromWeek);
      expected = ph.toWeek + 1;
    }
    expect(expected - 1).toBe(p.weekCount);
  });

  it('never runs a phase past the end of the window', () => {
    const p = plan({ skills });
    for (const ph of p.phases) expect(ph.toDay).toBeLessThanOrEqual(p.roadmapDays);
  });

  it('puts every objective inside its own phase’s weeks', () => {
    const p = plan({ skills });
    for (const o of p.objectives) {
      const ph = p.phases.find(x => x.key === o.phase)!;
      expect(o.week).toBeGreaterThanOrEqual(ph.fromWeek);
      expect(o.week).toBeLessThanOrEqual(ph.toWeek);
    }
  });

  it('schedules validation for what it actually spent time on', () => {
    // §71: without it, the next plan is built from evidence gathered before any of the work.
    const p = plan({ skills });
    const validated = p.objectives.filter(o => o.reasonCode === 'VALIDATION').map(o => o.skillKey);
    expect(validated).toContain('REST_API');
  });

  it('does not schedule validation for a skill it never worked on', () => {
    const p = plan({ skills });
    const validated = p.objectives.filter(o => o.reasonCode === 'VALIDATION').map(o => o.skillKey);
    expect(validated).not.toContain('DOCKER');
  });
});

describe('phase week allocation', () => {
  it('sums to the window exactly', () => {
    expect(allocateWeeks([600, 900, 300, 200], 13).reduce((a, b) => a + b, 0)).toBe(13);
  });

  it('gives every phase with work at least one week', () => {
    for (const span of allocateWeeks([10, 5000, 10, 10], 13)) expect(span).toBeGreaterThanOrEqual(1);
  });

  it('gives the phase carrying the most work the most weeks', () => {
    const spans = allocateWeeks([100, 2000, 100, 100], 13);
    expect(spans[1]).toBe(Math.max(...spans));
  });

  it('never hands out weeks a short window does not have', () => {
    // A membership expiring in a fortnight leaves fewer weeks than phases.
    const spans = allocateWeeks([600, 900, 300, 200], 2);
    expect(spans.reduce((a, b) => a + b, 0)).toBe(2);
  });
});

describe('a window cut short by an expiring membership', () => {
  const skills = [
    req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 }),
    req('DOCKER', { score: null, importance: 'ESSENTIAL', weight: 9 }),
    req('SQL', { score: 62, weight: 6 }),
  ];

  it('still produces a usable plan rather than an empty one', () => {
    const p = plan({ skills, roadmapDays: 12 });
    expect(p.objectives.length).toBeGreaterThan(0);
    expect(p.phases.length).toBeGreaterThan(0);
    expect(p.capacity.plannedMinutes).toBeLessThanOrEqual(p.capacity.plannableMinutes);
  });

  it('folds phases together rather than losing the work in them', () => {
    const p = plan({ skills, roadmapDays: 8 });
    expect(p.phases.length).toBeLessThanOrEqual(p.weekCount);
    for (const o of p.objectives) expect(o.week).toBeLessThanOrEqual(p.weekCount);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §14, §45, §55, §116, §145 — what an objective is allowed to say
// ─────────────────────────────────────────────────────────────────────────────

describe('objectives', () => {
  const skills = [
    req('REST_API', { score: 40, importance: 'ESSENTIAL', weight: 10 }),
    req('DOCKER', { score: null, importance: 'ESSENTIAL', weight: 9 }),
    req('GIT', { score: 78, level: 'WORKING', weight: 4 }),
  ];

  it('are identified by canonical skill key, never free text', () => {
    const p = plan({ skills });
    for (const o of p.objectives) expect(o.skillKey).toMatch(/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/);
  });

  it('reference no content, because no content is mapped to skills yet', () => {
    // §14/§55: a plausible-looking videoId that resolves to nothing is worse than no link.
    const p = plan({ skills });
    for (const o of p.objectives) {
      for (const forbidden of ['videoId', 'contentId', 'assignmentId', 'quizId', 'resourceId']) {
        expect(o).not.toHaveProperty(forbidden);
      }
    }
  });

  it('can each explain themselves without an AI', () => {
    const p = plan({ skills });
    for (const o of p.objectives) {
      expect(o.explanation.length).toBeGreaterThan(20);
      expect(o.reasonCode).toBeTruthy();
    }
  });

  it('quote the student’s real numbers in the explanation of a gap', () => {
    const p = plan({ skills });
    const rest = p.objectives.find(o => o.skillKey === 'REST_API' && o.reasonCode === 'PRIORITY_GAP')!;
    expect(rest.explanation).toContain('40');
    expect(rest.explanation).toContain('75');
  });

  it('are ordered by a sequence that never repeats', () => {
    const p = plan({ skills });
    const seqs = p.objectives.map(o => o.sequence);
    expect(new Set(seqs).size).toBe(seqs.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §20 — nothing crashes on a thin or broken input
// ─────────────────────────────────────────────────────────────────────────────

describe('degenerate inputs', () => {
  it('survives a blueprint with no skills at all', () => {
    const p = plan({ skills: [] });
    expect(p.objectives).toEqual([]);
    expect(p.capacity.plannedMinutes).toBe(0);
  });

  it('survives a student with nothing measured anywhere', () => {
    const p = plan({
      skills: [req('A', { score: null }), req('B', { score: null })],
      coverage: 0, roleConfidence: 'LOW',
    });
    // Every objective is diagnostic: we do not pretend to know what they should study.
    expect(p.objectives.every(o => o.workType === 'ASSESS')).toBe(true);
  });

  it('survives a student who is already strong at everything', () => {
    const p = plan({
      skills: [
        req('A', { score: 95, level: 'WORKING' }),
        req('B', { score: 92, level: 'WORKING' }),
      ],
    });
    expect(p.capacity.plannedMinutes).toBeLessThanOrEqual(p.capacity.plannableMinutes);
    expect(p.objectives.every(o => o.workType !== 'LEARN')).toBe(true);
  });

  it('survives a zero commitment without dividing by it', () => {
    const p = plan({ skills: [req('A', { score: 30 })], minutesPerDay: 0, daysPerWeek: 0 });
    expect(p.capacity.plannedMinutes).toBe(0);
  });

  it('ignores a requirement whose canonical skill has been retired', () => {
    // §112: history keeps what an older plan said; a new plan uses today's configuration.
    const p = plan({
      skills: [req('LIVE', { score: 30, weight: 8 }), req('RETIRED', { score: 30, weight: 8 })],
      graph: graphOf({ LIVE: {}, RETIRED: { active: false } }),
    });
    expect(p.objectives.some(o => o.skillKey === 'RETIRED')).toBe(false);
    expect(p.objectives.some(o => o.skillKey === 'LIVE')).toBe(true);
  });
});
