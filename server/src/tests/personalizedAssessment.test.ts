import {
  expandSkillScope, rankSkills, buildSlots, selectItems, validateGeneration, generationSeed,
  PoolItem, AssessmentSlot,
} from '../services/personalizedAssessmentService';
import { policyForStage, difficultyQuota, ASSESSMENT_POLICIES, DISCOVERY_SKILL_SCOPE } from '../data/assessmentPolicies';
import { CAREER_SKILL_TAXONOMY } from '../data/careerSkillTaxonomy';

/**
 * Module 6 — fairness, determinism and coverage.
 *
 * Every step is pure, so the properties that matter can be tested directly rather than
 * inferred from an end-to-end run. Fairness is the one that would rot silently: nothing in
 * a score reveals that two students sat papers of different shapes, so if it is not
 * asserted here it is not guaranteed anywhere.
 */

const SKILL = (key: string, over: any = {}) => ({
  key, name: key, domainKey: 'SOFTWARE_ENGINEERING', nodeType: 'SKILL',
  active: true, assessable: true, difficulty: 'FOUNDATION', prerequisiteKeys: [], ...over,
} as any);

const skillMap = (list: any[]) => new Map<string, any>(list.map(s => [s.key, s]));

/** A pool large enough that selection has real freedom. */
const pool = (skillKey: string, n: number, difficulty: string | null = 'EASY'): PoolItem[] =>
  Array.from({ length: n }, (_, i) => ({
    sourceType: 'assessment_item', sourceId: `${skillKey}-${i}`, difficulty: difficulty as any,
  }));

const poolsFor = (keys: string[], n = 12) => {
  const m = new Map<string, PoolItem[]>();
  for (const k of keys) {
    m.set(k, [
      ...pool(k, n, 'EASY'), ...pool(`${k}m`, n, 'MEDIUM').map(p => ({ ...p, sourceId: `${k}-m-${p.sourceId}` })),
      ...pool(`${k}h`, n, 'HARD').map(p => ({ ...p, sourceId: `${k}-h-${p.sourceId}` })),
    ]);
  }
  return m;
};

describe('skill scope — the role says where, the stage says how deep', () => {
  const skills = skillMap([
    SKILL('REST_APIS', { difficulty: 'INTERMEDIATE', prerequisiteKeys: ['HTTP'] }),
    SKILL('HTTP', { prerequisiteKeys: ['PROGRAMMING_FUNDAMENTALS'] }),
    SKILL('PROGRAMMING_FUNDAMENTALS'),
    SKILL('SYSTEM_DESIGN', { difficulty: 'ADVANCED' }),
  ]);

  it('walks back into prerequisites for a foundation student', () => {
    // A first-year aiming at Backend should be asked about HTTP, not REST API design.
    const scope = expandSkillScope(['REST_APIS'], skills, policyForStage('foundation'));
    expect(scope.map(s => s.skillKey)).toContain('HTTP');
    expect(scope.map(s => s.skillKey)).toContain('PROGRAMMING_FUNDAMENTALS');
  });

  it('does not walk back at placement — the destination IS the point', () => {
    const scope = expandSkillScope(['REST_APIS'], skills, policyForStage('placement'));
    expect(scope.map(s => s.skillKey)).toEqual(['REST_APIS']);
  });

  it('excludes skills above the stage’s allowed difficulty', () => {
    // An ADVANCED skill on a foundation paper is not a hard paper, it is an unfair one.
    const scope = expandSkillScope(['SYSTEM_DESIGN'], skills, policyForStage('foundation'));
    expect(scope).toEqual([]);
    expect(expandSkillScope(['SYSTEM_DESIGN'], skills, policyForStage('placement')).length).toBe(1);
  });

  it('never assesses an inactive, non-assessable or grouping skill', () => {
    const m = skillMap([
      SKILL('RETIRED', { active: false }),
      SKILL('GRP', { nodeType: 'GROUP', assessable: false }),
      SKILL('NOT_MEASURED', { assessable: false }),
      SKILL('FINE'),
    ]);
    const scope = expandSkillScope(['RETIRED', 'GRP', 'NOT_MEASURED', 'FINE'], m, policyForStage('foundation'));
    expect(scope.map(s => s.skillKey)).toEqual(['FINE']);
  });

  it('deduplicates and respects the depth limit', () => {
    const deep = skillMap([
      SKILL('A', { prerequisiteKeys: ['B'] }), SKILL('B', { prerequisiteKeys: ['C'] }),
      SKILL('C', { prerequisiteKeys: ['D'] }), SKILL('D'),
    ]);
    // foundation depth is 2: A, then B, then C. D is a step too far.
    const scope = expandSkillScope(['A'], deep, policyForStage('foundation'));
    expect(scope.map(s => s.skillKey).sort()).toEqual(['A', 'B', 'C']);
  });

  it('terminates on a prerequisite cycle rather than looping', () => {
    // Module 3 forbids cycles, but this must not hang if one ever existed.
    const cyclic = skillMap([SKILL('A', { prerequisiteKeys: ['B'] }), SKILL('B', { prerequisiteKeys: ['A'] })]);
    expect(expandSkillScope(['A'], cyclic, policyForStage('foundation')).length).toBe(2);
  });
});

describe('slot building — the fairness contract', () => {
  const skills = skillMap(['A', 'B', 'C', 'D'].map(k => SKILL(k)));
  const scope = ['A', 'B', 'C', 'D'].map(k => ({ skillKey: k, reason: 'role_blueprint' as const }));

  it('produces the policy’s slot count when the skills can supply it', () => {
    // Eight skills is enough for every policy's budget at its per-skill cap.
    const wide = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(k => ({ skillKey: k, reason: 'role_blueprint' as const }));
    for (const policy of ASSESSMENT_POLICIES) {
      const slots = buildSlots(wide, policy);
      // A paper short of its own specification measures less than its peers, invisibly.
      expect({ policy: policy.key, n: slots.length }).toEqual({ policy: policy.key, n: policy.skillSlots });
    }
  });

  it('caps at what the skills can supply, equally for every student', () => {
    // Four skills at four items each cannot fill a twenty-slot policy. The paper is
    // shorter — and identical for everyone with this profile, so scores stay comparable.
    const policy = policyForStage('build');
    const slots = buildSlots(scope, policy);
    expect(slots.length).toBe(Math.min(policy.skillSlots, scope.length * policy.maxItemsPerSkill));
    expect(buildSlots(scope, policy).length).toBe(slots.length);
  });

  it('is identical for two students with the same stage and role', () => {
    const a = buildSlots(scope, policyForStage('foundation'));
    const b = buildSlots(scope, policyForStage('foundation'));
    expect(a).toEqual(b);
  });

  it('respects the per-skill bounds', () => {
    const policy = policyForStage('foundation');
    const counts: Record<string, number> = {};
    for (const s of buildSlots(scope, policy)) counts[s.skillKey] = (counts[s.skillKey] || 0) + 1;
    for (const n of Object.values(counts)) {
      expect(n).toBeGreaterThanOrEqual(policy.minItemsPerSkill);
      expect(n).toBeLessThanOrEqual(policy.maxItemsPerSkill);
    }
  });

  it('spreads difficulty across skills rather than loading it onto one', () => {
    const slots = buildSlots(scope, policyForStage('build'));
    const hardSkills = new Set(slots.filter(s => s.difficulty === 'HARD').map(s => s.skillKey));
    expect(hardSkills.size).toBeGreaterThan(1);
  });

  it('gives later stages a harder paper', () => {
    const share = (stage: string) => {
      const slots = buildSlots(scope, policyForStage(stage));
      return slots.filter(s => s.difficulty === 'HARD').length / slots.length;
    };
    expect(share('placement')).toBeGreaterThan(share('foundation'));
  });

  it('returns nothing when there are no skills, rather than an empty paper', () => {
    expect(buildSlots([], policyForStage('foundation'))).toEqual([]);
  });
});

describe('difficulty quota', () => {
  it('always sums to the total, whatever the rounding', () => {
    for (let total = 1; total <= 40; total++) {
      for (const p of ASSESSMENT_POLICIES) {
        const q = difficultyQuota(total, p.difficultyMix);
        expect({ total, policy: p.key, sum: q.EASY + q.MEDIUM + q.HARD }).toEqual({ total, policy: p.key, sum: total });
      }
    }
  });

  it('never returns a negative band', () => {
    const q = difficultyQuota(3, { EASY: 0.6, MEDIUM: 0.35, HARD: 0.05 });
    expect(Math.min(q.EASY, q.MEDIUM, q.HARD)).toBeGreaterThanOrEqual(0);
  });
});

describe('deterministic selection', () => {
  const slots: AssessmentSlot[] = ['A', 'A', 'B', 'B'].map((k, i) => ({
    skillKey: k, difficulty: i % 2 ? 'MEDIUM' : 'EASY', reason: 'role_blueprint',
  })) as any;
  const pools = poolsFor(['A', 'B']);

  it('gives the same paper for the same seed', () => {
    const a = selectItems(slots, pools, 'student-1:FOUNDATION_V1:v1:a1');
    const b = selectItems(slots, pools, 'student-1:FOUNDATION_V1:v1:a1');
    expect(a.items.map(i => i.sourceId)).toEqual(b.items.map(i => i.sourceId));
  });

  it('gives a different paper to a different student', () => {
    const a = selectItems(slots, pools, generationSeed('student-1', 'FOUNDATION_V1', 1, 1));
    const b = selectItems(slots, pools, generationSeed('student-2', 'FOUNDATION_V1', 1, 1));
    expect(a.items.map(i => i.sourceId)).not.toEqual(b.items.map(i => i.sourceId));
  });

  it('gives a different paper on a retake', () => {
    const a = selectItems(slots, pools, generationSeed('student-1', 'FOUNDATION_V1', 1, 1));
    const b = selectItems(slots, pools, generationSeed('student-1', 'FOUNDATION_V1', 1, 2));
    expect(a.items.map(i => i.sourceId)).not.toEqual(b.items.map(i => i.sourceId));
  });

  it('does not depend on the order the pool arrived in', () => {
    // Relying on Mongo's natural order would make the same seed differ between servers.
    const reversed = new Map([...pools.entries()].map(([k, v]) => [k, v.slice().reverse()]));
    const a = selectItems(slots, pools, 'seed-x');
    const b = selectItems(slots, reversed, 'seed-x');
    expect(a.items.map(i => i.sourceId)).toEqual(b.items.map(i => i.sourceId));
  });

  it('never uses one item twice in a paper', () => {
    const many: AssessmentSlot[] = Array.from({ length: 10 }, () => ({ skillKey: 'A', difficulty: 'EASY', reason: 'role_blueprint' })) as any;
    const { items } = selectItems(many, poolsFor(['A'], 20), 'seed');
    expect(new Set(items.map(i => i.sourceId)).size).toBe(items.length);
  });

  it('prefers unseen items on a retake, without failing when the pool is small', () => {
    const seen = pools.get('A')!.filter(i => i.difficulty === 'EASY').slice(0, 3).map(i => i.sourceId);
    const { items, report } = selectItems(
      [{ skillKey: 'A', difficulty: 'EASY', reason: 'role_blueprint' }] as any,
      pools, 'seed', { allowDifficultyFallback: true, seenSourceIds: seen },
    );
    expect(seen).not.toContain(items[0].sourceId);
    expect(report.repeatedFromPreviousAttempt).toBe(0);
  });

  it('reuses a seen item rather than failing when nothing fresh remains', () => {
    const small = new Map([['A', pool('A', 2, 'EASY')]]);
    const seen = small.get('A')!.map(i => i.sourceId);
    const { items, report } = selectItems(
      [{ skillKey: 'A', difficulty: 'EASY', reason: 'role_blueprint' }] as any,
      small, 'seed', { allowDifficultyFallback: true, seenSourceIds: seen },
    );
    expect(items).toHaveLength(1);
    expect(report.repeatedFromPreviousAttempt).toBe(1);
  });

  it('falls back to an adjacent band and REPORTS it', () => {
    const only = new Map([['A', pool('A', 3, 'MEDIUM')]]);
    const { items, report } = selectItems(
      [{ skillKey: 'A', difficulty: 'EASY', reason: 'role_blueprint' }] as any, only, 'seed',
    );
    expect(items[0].servedDifficulty).toBe('MEDIUM');
    expect(report.difficultyFallbacks).toBe(1);
    expect(report.exactMatches).toBe(0);
  });

  it('accepts an item with no difficulty for any band', () => {
    // CareerPilot's own bank has no difficulty; those items must remain usable.
    const none = new Map([['A', pool('A', 2, null)]]);
    const { items } = selectItems([{ skillKey: 'A', difficulty: 'HARD', reason: 'role_blueprint' }] as any, none, 'seed');
    expect(items).toHaveLength(1);
  });
});

describe('coverage failure', () => {
  it('reports a shortfall rather than duplicating a question', () => {
    const slots: AssessmentSlot[] = Array.from({ length: 3 }, () => ({ skillKey: 'A', difficulty: 'EASY', reason: 'role_blueprint' })) as any;
    const { items, report } = selectItems(slots, new Map([['A', pool('A', 1, 'EASY')]]), 'seed',
      { allowDifficultyFallback: false });

    expect(items).toHaveLength(1);
    expect(report.shortfalls[0]).toEqual(expect.objectContaining({ skillKey: 'A', wanted: 2 }));
    expect(validateGeneration(report).ok).toBe(false);
  });

  it('names the skill and difficulty in the ADMIN message, so it can be fixed', () => {
    const { report } = selectItems(
      [{ skillKey: 'JAVA_OOP', difficulty: 'MEDIUM', reason: 'role_blueprint' }] as any,
      new Map(), 'seed', { allowDifficultyFallback: false },
    );
    const v = validateGeneration(report);
    expect(v.ok).toBe(false);
    expect(v.adminMessage).toMatch(/JAVA_OOP/);
    expect(v.adminMessage).toMatch(/medium/i);
  });

  it('tells the STUDENT nothing they cannot act on', () => {
    /**
     * This message used to be the admin's: it named an internal skill key, described the
     * evidence-mapping data model, and instructed the reader to "map more assessment
     * content and try again" — a thing no student can do. What a member took from it was
     * that the product was broken and that it was somehow their move.
     */
    const { report } = selectItems(
      [{ skillKey: 'JAVA_OOP', difficulty: 'MEDIUM', reason: 'role_blueprint' }] as any,
      new Map(), 'seed', { allowDifficultyFallback: false },
    );
    const v = validateGeneration(report);

    expect(v.message).toBeTruthy();
    expect(v.message).not.toMatch(/JAVA_OOP/);      // no internal key
    expect(v.message).not.toMatch(/map/i);       // no instruction they cannot follow
    expect(v.message).not.toMatch(/mapped|evidence|difficulty/i);  // no data model
    // And it should say whose problem it is, so nobody goes looking at their own account.
    expect(v.message).toMatch(/nothing.*(wrong|for you to fix)/i);
  });

  it('passes when every slot is filled', () => {
    const { report } = selectItems(
      [{ skillKey: 'A', difficulty: 'EASY', reason: 'role_blueprint' }] as any,
      poolsFor(['A']), 'seed',
    );
    expect(validateGeneration(report).ok).toBe(true);
  });
});

describe('FAIRNESS — different papers, same standard', () => {
  const skills = skillMap(['A', 'B', 'C', 'D', 'E'].map(k => SKILL(k)));
  const scope = ['A', 'B', 'C', 'D', 'E'].map(k => ({ skillKey: k, reason: 'role_blueprint' as const }));
  const pools = poolsFor(['A', 'B', 'C', 'D', 'E'], 25);

  const paperFor = (studentId: string) => {
    const policy = policyForStage('foundation');
    const slots = buildSlots(rankSkills(scope, skills, policy), policy);
    return selectItems(slots, pools, generationSeed(studentId, policy.key, policy.version, 1));
  };

  it('two students with the same profile get the same STRUCTURE', () => {
    const a = paperFor('rahul');
    const b = paperFor('priya');

    const shape = (r: typeof a) => ({
      count: r.items.length,
      skills: r.items.reduce((m: any, i) => ({ ...m, [i.skillKey]: (m[i.skillKey] || 0) + 1 }), {}),
      difficulty: r.items.reduce((m: any, i) => ({ ...m, [i.difficulty]: (m[i.difficulty] || 0) + 1 }), {}),
      points: r.items.reduce((n, i) => n + i.points, 0),
    });

    expect(shape(a)).toEqual(shape(b));
  });

  it('…but a different set of questions', () => {
    const a = paperFor('rahul');
    const b = paperFor('priya');
    expect(a.items.map(i => i.sourceId)).not.toEqual(b.items.map(i => i.sourceId));
  });

  it('100 students: equivalent structure, genuine variation, no invalid paper', () => {
    const papers = Array.from({ length: 100 }, (_, i) => paperFor(`student-${i}`));

    // Structure identical for all 100 — this is what makes their scores comparable.
    const shapes = new Set(papers.map(p => JSON.stringify({
      n: p.items.length,
      skills: p.items.map(i => i.skillKey).sort(),
      diff: p.items.map(i => i.difficulty).sort(),
    })));
    expect(shapes.size).toBe(1);

    // Every paper is valid and internally consistent.
    for (const p of papers) {
      expect(validateGeneration(p.report).ok).toBe(true);
      expect(new Set(p.items.map(i => i.sourceId)).size).toBe(p.items.length);
    }

    // Genuine variation. Not all-unique — that would need an enormous bank — but most.
    const distinct = new Set(papers.map(p => p.items.map(i => i.sourceId).sort().join(',')));
    expect(distinct.size).toBeGreaterThan(90);
  });

  it('is fast enough to generate a cohort without a per-student cost problem', () => {
    const t0 = Date.now();
    for (let i = 0; i < 100; i++) paperFor(`perf-${i}`);
    // Pure in-memory selection; the guard is against an accidental O(n²) creeping in.
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});

describe('policies and discovery scope', () => {
  it('covers every career stage', () => {
    expect(ASSESSMENT_POLICIES.map(p => p.stage).sort())
      .toEqual(['build', 'foundation', 'job_seeker', 'placement']);
  });

  it('falls back to foundation for an unknown stage rather than throwing', () => {
    expect(policyForStage('nonsense').stage).toBe('foundation');
    expect(policyForStage(null).stage).toBe('foundation');
  });

  it('the discovery scope names only real taxonomy skills', () => {
    const known = new Set(CAREER_SKILL_TAXONOMY.map(s => s.key));
    for (const k of DISCOVERY_SKILL_SCOPE) expect({ k, known: known.has(k) }).toEqual({ k, known: true });
  });

  it('the discovery scope contains no grouping nodes', () => {
    const groups = new Set(CAREER_SKILL_TAXONOMY.filter(s => s.nodeType === 'GROUP').map(s => s.key));
    for (const k of DISCOVERY_SKILL_SCOPE) expect(groups.has(k)).toBe(false);
  });

  it('the seed is stable and includes student, policy, version and attempt', () => {
    const s = generationSeed('abc', 'FOUNDATION_V1', 2, 3);
    expect(s).toBe('abc:FOUNDATION_V1:v2:a3');
    expect(generationSeed('abc', 'FOUNDATION_V1', 2, 3)).toBe(s);
  });
});
