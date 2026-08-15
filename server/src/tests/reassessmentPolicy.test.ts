import {
  REASSESSMENT_VERSION, resolveReassessmentConfig, REASSESSMENT_DEFAULTS,
  rankTargets, TargetCandidate, TARGET_WEIGHTS, MAX_TARGET_SKILLS,
  materialChanges, recommendationFrom, daysBetween,
} from '../data/reassessmentPolicy';

/**
 * REASSESSMENT_V1 — when to look again, at what, and whether the plan should change.
 *
 * Two properties carry it:
 *
 *   A CHECK-IN IS SHORT AND POINTED. Re-testing a demonstrated strength spends the student's
 *   time to learn nothing. Unknowns, uncertainties and recently-practised skills come first.
 *
 *   A RECOMMENDATION MEANS SOMETHING. Suggesting a replan for two points of drift trains
 *   students to ignore the suggestion, which costs more than never making it.
 */

const candidate = (over: Partial<TargetCandidate> & { skillKey: string }): TargetCandidate => ({
  skillName: over.skillKey,
  status: 'ON_TRACK',
  importance: 'IMPORTANT',
  weight: 5,
  recentWork: false,
  ...over,
});

describe('configuration', () => {
  it('declares one version', () => {
    expect(REASSESSMENT_VERSION).toBe('REASSESSMENT_V1');
  });

  it('falls back to the shipped defaults when a tenant has configured nothing', () => {
    const cfg = resolveReassessmentConfig(undefined);
    expect(cfg.cooldownDays).toBe(REASSESSMENT_DEFAULTS.cooldownDays);
    expect(cfg.enabled).toBe(true);
  });

  it('honours what an admin did configure', () => {
    const cfg = resolveReassessmentConfig({ cooldownDays: 30, questionBudget: 25, enabled: false });
    expect(cfg.cooldownDays).toBe(30);
    expect(cfg.questionBudget).toBe(25);
    expect(cfg.enabled).toBe(false);
  });

  it('ignores nonsense rather than adopting it', () => {
    const cfg = resolveReassessmentConfig({ cooldownDays: 'soon', questionBudget: -5 });
    expect(cfg.cooldownDays).toBe(REASSESSMENT_DEFAULTS.cooldownDays);
    expect(cfg.questionBudget).toBe(REASSESSMENT_DEFAULTS.questionBudget);
  });

  it('lets a tenant switch cooldown off entirely', () => {
    expect(resolveReassessmentConfig({ cooldownDays: 0 }).cooldownDays).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §95 — what a check-in should look at
// ─────────────────────────────────────────────────────────────────────────────

describe('choosing what to re-measure', () => {
  const student = [
    candidate({ skillKey: 'GIT', status: 'STRONG' }),
    candidate({ skillKey: 'SQL', status: 'PRIORITY_GAP', recentWork: true }),
    candidate({ skillKey: 'SPRING_BOOT', status: 'LIMITED_EVIDENCE', recentWork: true }),
    candidate({ skillKey: 'DSA', status: 'NOT_ASSESSED' }),
  ];

  it('puts the unknown, the uncertain and the recently-practised first', () => {
    const ranked = rankTargets(student).map(t => t.skillKey);
    expect(ranked.slice(0, 3).sort()).toEqual(['DSA', 'SPRING_BOOT', 'SQL']);
  });

  it('does not let a demonstrated strength dominate the paper', () => {
    const ranked = rankTargets(student);
    const git = ranked.find(t => t.skillKey === 'GIT');
    // Either dropped entirely or last. Re-testing Git is the waste this exists to avoid.
    if (git) expect(ranked[ranked.length - 1].skillKey).toBe('GIT');
  });

  it('ranks something never measured above something merely on track', () => {
    const ranked = rankTargets([
      candidate({ skillKey: 'UNKNOWN', status: 'NOT_ASSESSED' }),
      candidate({ skillKey: 'FINE', status: 'ON_TRACK' }),
    ]);
    expect(ranked[0].skillKey).toBe('UNKNOWN');
  });

  it('promotes a skill the student has actually worked on, whatever it looked like before', () => {
    // §22: only COMPLETED work counts, and when it exists it is the strongest reason to look.
    const [top] = rankTargets([
      candidate({ skillKey: 'WORKED', status: 'ON_TRACK', recentWork: true }),
      candidate({ skillKey: 'IDLE', status: 'NEEDS_WORK' }),
    ]);
    expect(top.skillKey).toBe('WORKED');
  });

  it('ranks an essential gap above an optional one of the same size', () => {
    const ranked = rankTargets([
      candidate({ skillKey: 'OPT', status: 'PRIORITY_GAP', importance: 'OPTIONAL' }),
      candidate({ skillKey: 'ESS', status: 'PRIORITY_GAP', importance: 'ESSENTIAL' }),
    ]);
    expect(ranked[0].skillKey).toBe('ESS');
  });

  it('keeps a check-in short', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      candidate({ skillKey: `S${i}`, status: 'PRIORITY_GAP' }));
    expect(rankTargets(many).length).toBeLessThanOrEqual(MAX_TARGET_SKILLS);
  });

  it('is deterministic — the same student gets the same focus', () => {
    expect(rankTargets(student)).toEqual(rankTargets(student));
  });

  it('weights an unknown above a settled strength by a wide margin', () => {
    expect(TARGET_WEIGHTS.NOT_ASSESSED).toBeGreaterThan(TARGET_WEIGHTS.STRONG * 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §40, §41, §107–§110 — what counts as a real change
// ─────────────────────────────────────────────────────────────────────────────

describe('material change', () => {
  const T = 10;

  it('ignores noise', () => {
    // §107: 71 → 72 with no classification change is not worth telling anybody about.
    expect(materialChanges({
      before: 71, after: 72, beforeStatus: 'ON_TRACK', afterStatus: 'ON_TRACK',
    }, T)).toEqual([]);
  });

  it('notices a real improvement', () => {
    const reasons = materialChanges({
      before: 42, after: 63, beforeStatus: 'PRIORITY_GAP', afterStatus: 'NEEDS_WORK',
    }, T);
    expect(reasons).toContain('SCORE_MOVED');
    expect(reasons).toContain('STATUS_CHANGED');
  });

  it('notices a target being crossed even on a modest move', () => {
    // §109: crossing the requirement changes what the plan should do, however small the step.
    const reasons = materialChanges({
      before: 72, after: 76, beforeStatus: 'NEEDS_WORK', afterStatus: 'ON_TRACK', targetScore: 75,
    }, T);
    expect(reasons).toContain('TARGET_REACHED');
  });

  it('treats a first measurement as material', () => {
    // An unknown becoming known may be the reason a whole branch of the plan existed.
    expect(materialChanges({
      before: null, after: 55, beforeStatus: 'NOT_ASSESSED', afterStatus: 'NEEDS_WORK',
    }, T)).toContain('NEWLY_MEASURED');
  });

  it('reports a regression honestly', () => {
    // §99: no floor, no max(old, new). If the evidence says 54, it says 54.
    const reasons = materialChanges({
      before: 70, after: 54, beforeStatus: 'ON_TRACK', afterStatus: 'PRIORITY_GAP',
    }, T);
    expect(reasons).toContain('REGRESSED');
    expect(reasons).toContain('SCORE_MOVED');
  });

  it('notices evidence firming up', () => {
    expect(materialChanges({
      before: 80, after: 82, beforeStatus: 'LIMITED_EVIDENCE', afterStatus: 'ON_TRACK',
    }, T)).toContain('EVIDENCE_STRENGTHENED');
  });

  it('respects a tenant’s own threshold', () => {
    const move = { before: 50, after: 58, beforeStatus: 'NEEDS_WORK', afterStatus: 'NEEDS_WORK' };
    expect(materialChanges(move, 5)).toContain('SCORE_MOVED');
    expect(materialChanges(move, 20)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §39 — how strongly to recommend
// ─────────────────────────────────────────────────────────────────────────────

describe('the recommendation', () => {
  it('is NONE when nothing meaningful moved', () => {
    expect(recommendationFrom({
      structuralReasons: [], materialSkills: 0, readinessDelta: 1, threshold: 10,
    })).toBe('NONE');
  });

  it('is SUGGESTED when skills moved materially', () => {
    expect(recommendationFrom({
      structuralReasons: [], materialSkills: 2, readinessDelta: 12, threshold: 10,
    })).toBe('SUGGESTED');
  });

  it('is SUGGESTED on a large readiness move even without a single material skill', () => {
    expect(recommendationFrom({
      structuralReasons: [], materialSkills: 0, readinessDelta: 14, threshold: 10,
    })).toBe('SUGGESTED');
  });

  it('is REQUIRED only for structural mismatch', () => {
    // §39: a changed role means the plan aims at something the student is not doing.
    expect(recommendationFrom({
      structuralReasons: ['ROLE_CHANGED'], materialSkills: 0, readinessDelta: 0, threshold: 10,
    })).toBe('REQUIRED');
  });

  it('never escalates skill movement to REQUIRED, however large', () => {
    // The work is still valid; it is simply no longer the best use of the days left. That is
    // the student's call, not ours.
    expect(recommendationFrom({
      structuralReasons: [], materialSkills: 6, readinessDelta: 40, threshold: 10,
    })).toBe('SUGGESTED');
  });

  it('lets a structural reason outrank skill movement', () => {
    expect(recommendationFrom({
      structuralReasons: ['BLUEPRINT_CHANGED'], materialSkills: 3, readinessDelta: 20, threshold: 10,
    })).toBe('REQUIRED');
  });
});

describe('day counting', () => {
  it('counts whole days the way the rest of the product does', () => {
    expect(daysBetween(new Date('2026-08-01T23:00:00Z'), new Date('2026-08-02T01:00:00Z'))).toBe(1);
    expect(daysBetween(new Date('2026-08-01T00:00:00Z'), new Date('2026-08-15T00:00:00Z'))).toBe(14);
  });
});

describe('the policy owns timing, not measurement', () => {
  it('exports nothing that could compute a skill score or a gap', () => {
    const policy = require('../data/reassessmentPolicy');
    const exported = Object.keys(policy).join(' ').toLowerCase();
    for (const forbidden of ['skilldna', 'readinessscore', 'computescore', 'gapformula', 'priorityscore']) {
      expect(exported).not.toContain(forbidden);
    }
  });
});
