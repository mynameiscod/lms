/**
 * Projection: graded answers → evidence → Skill DNA.
 *
 * The operational guarantees live here. Idempotency matters because a retried submission
 * that doubled somebody's evidence would silently raise their confidence for no reason,
 * and rebuildability matters because a projection can fail after a paper is graded — and
 * asking a student to sit it again would be indefensible.
 */

const findOneAssessment = jest.fn();
const findEvidence = jest.fn();
const bulkWriteEvidence = jest.fn();
const distinctEvidence = jest.fn();
const bulkWriteProfile = jest.fn();
const findProfile = jest.fn();
const findSkill = jest.fn();
const findMapping = jest.fn();

jest.mock('../models/PersonalizedAssessment', () => ({
  __esModule: true, default: { findOne: (...a: any[]) => findOneAssessment(...a) },
}));
jest.mock('../models/StudentSkillEvidence', () => ({
  __esModule: true,
  default: {
    find: (...a: any[]) => findEvidence(...a),
    bulkWrite: (...a: any[]) => bulkWriteEvidence(...a),
    distinct: (...a: any[]) => distinctEvidence(...a),
  },
}));
jest.mock('../models/StudentSkillProfile', () => ({
  __esModule: true,
  default: { bulkWrite: (...a: any[]) => bulkWriteProfile(...a), find: (...a: any[]) => findProfile(...a) },
}));
jest.mock('../models/CareerSkill', () => {
  const actual = jest.requireActual('../models/CareerSkill');
  return { __esModule: true, ...actual, default: { find: (...a: any[]) => findSkill(...a) } };
});
jest.mock('../models/SkillEvidence', () => {
  const actual = jest.requireActual('../models/SkillEvidence');
  return { __esModule: true, ...actual, default: { find: (...a: any[]) => findMapping(...a) } };
});

import {
  projectAssessmentToSkillDna, recomputeStudentSkills, rebuildSkillDnaForStudent,
} from '../services/skillDnaService';
import { DIFFICULTY_WEIGHT, RELATIONSHIP_WEIGHT } from '../data/skillDnaPolicy';

const chain = (rows: any[]) => ({
  sort: () => ({ lean: async () => rows }),
  select: () => ({ sort: () => ({ lean: async () => rows }), lean: async () => rows }),
  lean: async () => rows,
});
const one = (row: any) => ({ lean: async () => row });

const ASSESSMENT = (over: any = {}) => ({
  _id: 'a1', tenantId: 't1', studentId: 'stu1', attemptNumber: 1, status: 'SUBMITTED',
  submittedAt: new Date('2026-08-15'),
  items: [
    { sourceType: 'assessment_item', sourceId: 'q1', skillKey: 'JAVA_OOP', difficulty: 'EASY', order: 0, points: 1 },
    { sourceType: 'assessment_item', sourceId: 'q2', skillKey: 'JAVA_OOP', difficulty: 'HARD', order: 1, points: 1 },
    { sourceType: 'assessment_item', sourceId: 'q3', skillKey: 'DSA_ARRAYS', difficulty: 'MEDIUM', order: 2, points: 1 },
  ],
  ...over,
});

const GRADED = (over: any[] = []) => ([
  { sourceType: 'assessment_item', sourceId: 'q1', gradable: true, answered: true, earnedPoints: 1, maxPoints: 1 },
  { sourceType: 'assessment_item', sourceId: 'q2', gradable: true, answered: true, earnedPoints: 0, maxPoints: 1 },
  { sourceType: 'assessment_item', sourceId: 'q3', gradable: true, answered: true, earnedPoints: 1, maxPoints: 1 },
  ...over,
]);

const ASSESSABLE = ['JAVA_OOP', 'DSA_ARRAYS', 'PROBLEM_SOLVING'].map(key => ({
  key, assessable: true, nodeType: 'SKILL',
}));

beforeEach(() => {
  [findOneAssessment, findEvidence, bulkWriteEvidence, distinctEvidence,
   bulkWriteProfile, findProfile, findSkill, findMapping].forEach(m => m.mockReset());

  findOneAssessment.mockReturnValue(one(ASSESSMENT()));
  findEvidence.mockReturnValue(chain([]));
  bulkWriteEvidence.mockResolvedValue({ upsertedCount: 3 });
  bulkWriteProfile.mockResolvedValue({});
  distinctEvidence.mockResolvedValue([]);
  findSkill.mockReturnValue(chain(ASSESSABLE));
  findMapping.mockReturnValue(chain([]));
});

describe('extracting evidence from a graded paper', () => {
  it('creates one observation per item, using the FROZEN skill', async () => {
    const report = await projectAssessmentToSkillDna('t1', 'a1', GRADED());

    const ops = bulkWriteEvidence.mock.calls[0][0];
    expect(ops).toHaveLength(3);
    // The skill comes from the paper's snapshot, not from any live mapping.
    expect(findMapping.mock.calls[0][0].contribution).toBe('SECONDARY');
    expect(ops.map((o: any) => o.updateOne.update.$setOnInsert.skillKey))
      .toEqual(['JAVA_OOP', 'JAVA_OOP', 'DSA_ARRAYS']);
    expect(report.primary).toBe(3);
  });

  it('records an INCORRECT answer as evidence, not as an absence', async () => {
    // Storing only correct answers would bias every score upward.
    await projectAssessmentToSkillDna('t1', 'a1', GRADED());
    const wrong = bulkWriteEvidence.mock.calls[0][0][1].updateOne.update.$setOnInsert;
    expect(wrong.performance).toBe(0);
    expect(wrong.earnedPoints).toBe(0);
  });

  it('weights each observation by the difficulty the SLOT was filled at', async () => {
    await projectAssessmentToSkillDna('t1', 'a1', GRADED());
    const ops = bulkWriteEvidence.mock.calls[0][0];
    expect(ops[0].updateOne.update.$setOnInsert.evidenceWeight).toBeCloseTo(DIFFICULTY_WEIGHT.EASY);
    expect(ops[1].updateOne.update.$setOnInsert.evidenceWeight).toBeCloseTo(DIFFICULTY_WEIGHT.HARD);
  });

  it('preserves partial credit from a coding item', async () => {
    await projectAssessmentToSkillDna('t1', 'a1', [
      { sourceType: 'assessment_item', sourceId: 'q1', gradable: true, answered: true, earnedPoints: 7, maxPoints: 10 },
    ]);
    const row = bulkWriteEvidence.mock.calls[0][0][0].updateOne.update.$setOnInsert;
    expect(row.performance).toBeCloseTo(0.7);
  });

  it('creates no evidence for an ungradable item', async () => {
    // A self-report or an open coding item has no right answer; recording a zero would
    // manufacture a failure that never happened.
    const report = await projectAssessmentToSkillDna('t1', 'a1', [
      { sourceType: 'assessment_item', sourceId: 'q1', gradable: false, answered: false, earnedPoints: 0, maxPoints: 0, reason: 'self-report' },
    ]);
    expect(report.ungradable).toBe(1);
    expect(bulkWriteEvidence).not.toHaveBeenCalled();
  });

  it('ignores an answer to something that was not on the paper', async () => {
    const report = await projectAssessmentToSkillDna('t1', 'a1', [
      { sourceType: 'assessment_item', sourceId: 'not-on-paper', gradable: true, answered: true, earnedPoints: 1, maxPoints: 1 },
    ]);
    expect(report.ungradable).toBe(1);
    expect(bulkWriteEvidence).not.toHaveBeenCalled();
  });

  it('adds secondary evidence at reduced weight — Scenario L', async () => {
    findMapping.mockReturnValue(chain([
      { sourceType: 'assessment_item', sourceId: 'q3', skillKey: 'PROBLEM_SOLVING', contribution: 'SECONDARY' },
    ]));
    const report = await projectAssessmentToSkillDna('t1', 'a1', GRADED());

    expect(report.secondary).toBe(1);
    const secondary = bulkWriteEvidence.mock.calls[0][0]
      .find((o: any) => o.updateOne.update.$setOnInsert.skillKey === 'PROBLEM_SOLVING');
    expect(secondary.updateOne.update.$setOnInsert.relationship).toBe('SECONDARY');
    expect(secondary.updateOne.update.$setOnInsert.evidenceWeight)
      .toBeCloseTo(RELATIONSHIP_WEIGHT.SECONDARY * DIFFICULTY_WEIGHT.MEDIUM);
  });

  it('never creates evidence for a non-assessable grouping skill', async () => {
    findSkill.mockReturnValue(chain([{ key: 'JAVA_OOP', assessable: false, nodeType: 'GROUP' }]));
    await projectAssessmentToSkillDna('t1', 'a1', GRADED());

    const written = (bulkWriteEvidence.mock.calls[0]?.[0] || [])
      .map((o: any) => o.updateOne.update.$setOnInsert.skillKey);
    expect(written).not.toContain('JAVA_OOP');
  });

  it('does not propagate evidence up the skill graph', async () => {
    // Answering a Java OOP question must not create OOP_CONCEPTS or PROGRAMMING evidence.
    await projectAssessmentToSkillDna('t1', 'a1', GRADED());
    const written = new Set(bulkWriteEvidence.mock.calls[0][0]
      .map((o: any) => o.updateOne.update.$setOnInsert.skillKey));
    expect([...written].sort()).toEqual(['DSA_ARRAYS', 'JAVA_OOP']);
  });
});

describe('idempotency — Scenario E', () => {
  it('keys every row on assessment, item and skill', async () => {
    await projectAssessmentToSkillDna('t1', 'a1', GRADED());
    const filter = bulkWriteEvidence.mock.calls[0][0][0].updateOne.filter;

    expect(filter).toEqual({
      assessmentId: 'a1', itemSourceType: 'assessment_item', itemSourceId: 'q1', skillKey: 'JAVA_OOP',
    });
  });

  it('uses $setOnInsert so a re-run leaves existing rows untouched', async () => {
    await projectAssessmentToSkillDna('t1', 'a1', GRADED());
    const update = bulkWriteEvidence.mock.calls[0][0][0].updateOne.update;

    expect(update.$setOnInsert).toBeDefined();
    expect(update.$set).toBeUndefined();
  });

  it('reports duplicates rather than counting them as new', async () => {
    bulkWriteEvidence.mockResolvedValue({ upsertedCount: 0 });   // everything already there
    const report = await projectAssessmentToSkillDna('t1', 'a1', GRADED());

    expect(report.evidenceCreated).toBe(0);
    expect(report.duplicatesSkipped).toBe(3);
  });

  it('includes the assessment in the key, so a retake is new evidence — Scenario F', async () => {
    findOneAssessment.mockReturnValue(one(ASSESSMENT({ _id: 'a2', attemptNumber: 2 })));
    await projectAssessmentToSkillDna('t1', 'a2', GRADED());

    // Same question, different sitting — a genuinely separate observation.
    expect(bulkWriteEvidence.mock.calls[0][0][0].updateOne.filter.assessmentId).toBe('a2');
  });
});

describe('recomputing profiles', () => {
  it('reads every affected skill in one query, not one per skill', async () => {
    findEvidence.mockReturnValue(chain([
      { skillKey: 'JAVA_OOP', performance: 1, evidenceWeight: 1, itemSourceType: 'assessment_item', itemSourceId: 'q1', observedAt: new Date() },
      { skillKey: 'DSA_ARRAYS', performance: 0, evidenceWeight: 1, itemSourceType: 'assessment_item', itemSourceId: 'q3', observedAt: new Date() },
    ]));

    await recomputeStudentSkills('t1', 'stu1', ['JAVA_OOP', 'DSA_ARRAYS']);

    expect(findEvidence).toHaveBeenCalledTimes(1);
    expect(findEvidence.mock.calls[0][0].skillKey).toEqual({ $in: ['JAVA_OOP', 'DSA_ARRAYS'] });
  });

  it('only touches the skills the assessment affected', async () => {
    await projectAssessmentToSkillDna('t1', 'a1', GRADED());
    // Not every skill in the taxonomy — just the two this paper covered.
    expect(findEvidence.mock.calls[0][0].skillKey.$in.sort()).toEqual(['DSA_ARRAYS', 'JAVA_OOP']);
  });

  it('removes a profile when its last evidence is gone, rather than writing a zero', async () => {
    // No evidence means NOT ASSESSED, which is a different statement from a score of 0.
    findEvidence.mockReturnValue(chain([]));
    await recomputeStudentSkills('t1', 'stu1', ['JAVA_OOP']);

    const op = bulkWriteProfile.mock.calls[0][0][0];
    expect(op.deleteOne).toBeDefined();
    expect(op.updateOne).toBeUndefined();
  });

  it('writes score, confidence and breadth together', async () => {
    findEvidence.mockReturnValue(chain(Array.from({ length: 8 }, (_, i) => ({
      skillKey: 'JAVA_OOP', performance: 0.5, evidenceWeight: 1,
      itemSourceType: 'assessment_item', itemSourceId: `q${i}`, observedAt: new Date(),
    }))));

    await recomputeStudentSkills('t1', 'stu1', ['JAVA_OOP']);
    const set = bulkWriteProfile.mock.calls[0][0][0].updateOne.update.$set;

    expect(set.score).toBe(50);
    expect(set.confidence).toBe('HIGH');
    expect(set.distinctItems).toBe(8);
    expect(set.aggregationVersion).toBe('SKILL_DNA_V1');
  });

  it('scopes every query to the tenant and the student', async () => {
    await recomputeStudentSkills('t9', 'stu9', ['JAVA_OOP']);
    expect(findEvidence.mock.calls[0][0]).toMatchObject({ tenantId: 't9', studentId: 'stu9' });
  });

  it('does nothing when no skills are named', async () => {
    expect(await recomputeStudentSkills('t1', 'stu1', [])).toBe(0);
    expect(findEvidence).not.toHaveBeenCalled();
  });
});

describe('rebuild — Scenario I', () => {
  it('reconstructs every profile from stored evidence', async () => {
    distinctEvidence.mockResolvedValue(['JAVA_OOP', 'DSA_ARRAYS']);
    findEvidence.mockReturnValue(chain([
      { skillKey: 'JAVA_OOP', performance: 1, evidenceWeight: 1, itemSourceType: 'a', itemSourceId: 'q1', observedAt: new Date() },
    ]));

    const r = await rebuildSkillDnaForStudent('t1', 'stu1');

    expect(r.skills).toBe(2);
    expect(bulkWriteProfile).toHaveBeenCalled();
    // Raw evidence is never touched — only derived state is rewritten.
    expect(bulkWriteEvidence).not.toHaveBeenCalled();
  });

  it('is idempotent — running it twice writes the same values', async () => {
    distinctEvidence.mockResolvedValue(['JAVA_OOP']);
    findEvidence.mockReturnValue(chain([
      { skillKey: 'JAVA_OOP', performance: 0.75, evidenceWeight: 1, itemSourceType: 'a', itemSourceId: 'q1', observedAt: new Date() },
    ]));

    await rebuildSkillDnaForStudent('t1', 'stu1');
    const first = bulkWriteProfile.mock.calls[0][0][0].updateOne.update.$set;
    await rebuildSkillDnaForStudent('t1', 'stu1');
    const second = bulkWriteProfile.mock.calls[1][0][0].updateOne.update.$set;

    expect({ ...second, lastEvidenceAt: null }).toEqual({ ...first, lastEvidenceAt: null });
  });

  it('is a no-op for a student with no evidence', async () => {
    distinctEvidence.mockResolvedValue([]);
    const r = await rebuildSkillDnaForStudent('t1', 'stu1');

    expect(r.skills).toBe(0);
    expect(bulkWriteProfile).not.toHaveBeenCalled();
  });
});

describe('role and stage independence — Scenarios J and K', () => {
  it('stores nothing about the role or stage the assessment was built for', async () => {
    await projectAssessmentToSkillDna('t1', 'a1', GRADED());
    const row = bulkWriteEvidence.mock.calls[0][0][0].updateOne.update.$setOnInsert;

    // A student switching target role keeps every observation, because what they
    // demonstrated about a skill did not change when their ambition did.
    expect(row).not.toHaveProperty('roleKey');
    expect(row).not.toHaveProperty('stage');
    expect(row).not.toHaveProperty('policyKey');
  });

  it('keys profiles on student and skill alone', async () => {
    findEvidence.mockReturnValue(chain([
      { skillKey: 'SQL_BASICS', performance: 1, evidenceWeight: 1, itemSourceType: 'a', itemSourceId: 'q1', observedAt: new Date() },
    ]));
    await recomputeStudentSkills('t1', 'stu1', ['SQL_BASICS']);

    expect(bulkWriteProfile.mock.calls[0][0][0].updateOne.filter)
      .toEqual({ tenantId: 't1', studentId: 'stu1', skillKey: 'SQL_BASICS' });
  });
});

describe('a missing assessment', () => {
  it('refuses rather than writing orphan evidence', async () => {
    findOneAssessment.mockReturnValue(one(null));
    await expect(projectAssessmentToSkillDna('t1', 'nope', GRADED())).rejects.toThrow(/does not exist/i);
    expect(bulkWriteEvidence).not.toHaveBeenCalled();
  });
});
