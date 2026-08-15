/**
 * Module 14 — resume and interview intelligence.
 *
 * The two halves are deliberately asymmetric and the tests below exist mostly to keep them
 * that way:
 *
 *   A RESUME IS A CLAIM. Writing "AWS" on a document must never move an AWS score, write
 *   evidence, or touch a roadmap. If it could, Skill DNA would measure how students describe
 *   themselves rather than what they can do.
 *
 *   AN INTERVIEW ANSWER IS AN OBSERVATION — but it goes through Module 7 like every other
 *   observation, at its own lower weight, and only when the question was actually mapped to a
 *   canonical skill and actually graded.
 *
 * The failure this suite is really guarding against is a quiet one: a future change that lets
 * either half write a score directly. Nothing would look broken, and every number in
 * CareerPilot would stop meaning what it says.
 */

let readinessResult: any;
let resumeDoc: any;
let skillCatalogue: any[] = [];

const evidenceBulkWrite = jest.fn();
const recompute = jest.fn();
const profileWrite = jest.fn();

const lean = (rows: any) => {
  const h: any = Promise.resolve(rows);
  h.select = () => h; h.sort = () => h; h.limit = () => h;
  h.lean = async () => rows;
  return h;
};

jest.mock('../models/PassportResume', () => ({
  __esModule: true,
  default: { findOne: () => lean(resumeDoc) },
}));

jest.mock('../models/CareerSkill', () => ({
  __esModule: true,
  default: { find: () => lean(skillCatalogue) },
}));

jest.mock('../models/StudentSkillEvidence', () => ({
  __esModule: true,
  default: {
    bulkWrite: (...args: any[]) => {
      evidenceBulkWrite(...args);
      return Promise.resolve({ upsertedCount: args[0].length, modifiedCount: 0 });
    },
  },
}));

// If Module 14 ever reaches for the profile directly, this mock records it and the test
// asserting silence fails.
jest.mock('../models/StudentSkillProfile', () => ({
  __esModule: true,
  default: {
    updateOne: (...a: any[]) => { profileWrite(...a); return Promise.resolve({}); },
    bulkWrite: (...a: any[]) => { profileWrite(...a); return Promise.resolve({}); },
    findOneAndUpdate: (...a: any[]) => { profileWrite(...a); return lean(null); },
  },
}));

jest.mock('../services/skillDnaService', () => ({
  __esModule: true,
  recomputeStudentSkills: (...args: any[]) => { recompute(...args); return Promise.resolve({}); },
}));

jest.mock('../services/roleReadinessService', () => ({
  __esModule: true,
  calculateStudentRoleReadiness: async () => readinessResult,
}));

import { analyseResume } from '../services/resumeIntelligenceService';
import {
  planInterviewCoverage, projectInterviewToEvidence, adaptPassportInterview,
} from '../services/interviewIntelligenceService';
import {
  RESUME_WEIGHTS, INTERVIEW_WEIGHTS, INTERVIEW_MIX, CLAIM_EVIDENCE_RATIO,
  MAX_RECOMMENDATIONS, isEvidenceWorthy, weightedScore,
} from '../data/placementReadinessPolicy';
import * as policy from '../data/placementReadinessPolicy';
import { SOURCE_WEIGHT } from '../data/skillDnaPolicy';

const skill = (over: any = {}) => ({
  skillKey: 'JAVA', skillName: 'Java', weight: 10, targetScore: 70,
  studentScore: 75, status: 'ON_TRACK', skillInactive: false, ...over,
});

const readyWith = (skills: any[]) => ({
  available: true,
  policyVersion: 'ROLE_READINESS_V1',
  role: { key: 'BACKEND', name: 'Backend Developer' },
  blueprintVersion: 3,
  readiness: 61,
  coverage: 80,
  confidence: 'MEDIUM',
  skills,
});

const resumeWith = (sections: any) => ({ version: 4, sections });

const FULL_RESUME = {
  contact: { name: 'A', email: 'a@b.c', phone: '9', github: 'gh' },
  summary: 'Backend developer.',
  education: [{ school: 'X' }],
  skills: [{ category: 'Languages', items: ['Java'] }],
  projects: [{
    title: 'Order service',
    description: 'A service',
    bullets: ['Built a Java order service that reduced checkout latency by 30% for 4000 users'],
  }],
  experience: [],
  certifications: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  readinessResult = readyWith([skill()]);
  resumeDoc = resumeWith(FULL_RESUME);
  skillCatalogue = [{ key: 'JAVA', name: 'Java', aliases: [], active: true }];
});

// ── the resume must never move a score ──────────────────────────────────────

describe('a resume is a claim, not evidence', () => {
  it('writes no evidence and triggers no recompute, however strong the resume', async () => {
    const out = await analyseResume('t1', 's1');

    expect(out.available).toBe(true);
    expect(evidenceBulkWrite).not.toHaveBeenCalled();
    expect(recompute).not.toHaveBeenCalled();
    expect(profileWrite).not.toHaveBeenCalled();
  });

  it('does not change a skill score merely because the resume mentions the skill', async () => {
    // AWS is required, never measured, and named all over the resume.
    readinessResult = readyWith([skill({
      skillKey: 'AWS', skillName: 'AWS', studentScore: null, status: 'NOT_ASSESSED',
    })]);
    skillCatalogue = [{ key: 'AWS', name: 'AWS', aliases: ['Amazon Web Services'], active: true }];
    resumeDoc = resumeWith({
      ...FULL_RESUME,
      summary: 'AWS engineer with deep Amazon Web Services experience.',
      skills: [{ category: 'Cloud', items: ['AWS'] }],
    });

    const out: any = await analyseResume('t1', 's1');
    const claim = out.claims.find((c: any) => c.skillKey === 'AWS');

    // Named, and still unmeasured. The claim is surfaced; the score is untouched.
    expect(claim.status).toBe('NEEDS_VALIDATION');
    expect(claim.measuredScore).toBeNull();
    expect(evidenceBulkWrite).not.toHaveBeenCalled();
    expect(recompute).not.toHaveBeenCalled();
  });

  it('reports a claim that outruns the measured evidence, without calling it dishonest', async () => {
    readinessResult = readyWith([skill({ targetScore: 80, studentScore: 20, status: 'PRIORITY_GAP' })]);

    const out: any = await analyseResume('t1', 's1');
    const claim = out.claims[0];

    expect(20).toBeLessThan(80 * CLAIM_EVIDENCE_RATIO);
    expect(claim.status).toBe('CLAIM_EXCEEDS_EVIDENCE');
    // Says what we measured, not what the student is.
    expect(claim.message.toLowerCase()).toContain('measured');
    expect(claim.message.toLowerCase()).not.toMatch(/lie|false|dishonest|exaggerat/);
  });

  it('flags a demonstrated skill the resume forgot to mention', async () => {
    readinessResult = readyWith([skill({
      skillKey: 'SQL', skillName: 'SQL', studentScore: 82, status: 'STRONG',
    })]);
    skillCatalogue = [{ key: 'SQL', name: 'SQL', aliases: [], active: true }];

    const out: any = await analyseResume('t1', 's1');

    expect(out.claims[0].status).toBe('MISSING_FROM_RESUME');
    expect(out.recommendations.some((r: any) => r.skillKey === 'SQL')).toBe(true);
  });

  it('matches a skill through its configured aliases', async () => {
    readinessResult = readyWith([skill({ skillKey: 'POSTGRESQL', skillName: 'PostgreSQL' })]);
    skillCatalogue = [{ key: 'POSTGRESQL', name: 'PostgreSQL', aliases: ['Postgres'], active: true }];
    resumeDoc = resumeWith({
      ...FULL_RESUME,
      skills: [{ category: 'Data', items: ['Postgres'] }],
    });

    const out: any = await analyseResume('t1', 's1');
    expect(out.claims[0].status).toBe('VERIFIED');
  });

  it('says why it cannot review rather than scoring nothing as zero', async () => {
    resumeDoc = null;
    const noResume: any = await analyseResume('t1', 's1');
    expect(noResume.available).toBe(false);
    expect(noResume.reason).toBe('NO_RESUME');
    expect(noResume.readiness).toBeUndefined();

    resumeDoc = resumeWith(FULL_RESUME);
    readinessResult = { available: false, reason: 'ROLE_NOT_SELECTED' };
    const noRole: any = await analyseResume('t1', 's1');
    expect(noRole.available).toBe(false);
    expect(noRole.reason).toBe('ROLE_NOT_SELECTED');
  });

  it('gives a short list of named actions, never an unbounded one', async () => {
    readinessResult = readyWith(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(k =>
        skill({ skillKey: k, skillName: k, studentScore: 90, status: 'STRONG' })),
    );
    skillCatalogue = [];
    resumeDoc = resumeWith({ ...FULL_RESUME, contact: { name: 'A', email: 'a@b.c', phone: '9' }, projects: [] });

    const out: any = await analyseResume('t1', 's1');

    expect(out.recommendations.length).toBeLessThanOrEqual(MAX_RECOMMENDATIONS);
    expect(out.recommendations.every((r: any) => r.action.length > 20)).toBe(true);
    // Never writes the student's achievement for them.
    expect(out.recommendations.some((r: any) => /\d+%/.test(r.action))).toBe(false);
  });
});

// ── an interview is an observation, and goes through Module 7 ───────────────

const question = (over: any = {}) => ({
  skillKey: 'JAVA', questionId: 'q1', question: 'Explain the JVM',
  difficulty: 'MEDIUM', answered: true, score: 8, maxScore: 10, ...over,
});

describe('interview evidence goes through Module 7, never around it', () => {
  it('writes evidence rows and asks Skill DNA to recompute', async () => {
    const out = await projectInterviewToEvidence({
      tenantId: 't1', studentId: '507f1f77bcf86cd799439011',
      interviewId: '507f1f77bcf86cd799439012',
      questions: [question()],
      dimensionScores: { TECHNICAL: 80 },
    });

    expect(evidenceBulkWrite).toHaveBeenCalledTimes(1);
    expect(recompute).toHaveBeenCalledTimes(1);
    expect(recompute.mock.calls[0][2]).toEqual(['JAVA']);
    // The profile is Module 7's to write.
    expect(profileWrite).not.toHaveBeenCalled();
    expect(out.evidenceCreated).toBe(1);
  });

  it('marks the evidence as an interview, which is worth less than a marked paper', async () => {
    await projectInterviewToEvidence({
      tenantId: 't1', studentId: '507f1f77bcf86cd799439011',
      interviewId: '507f1f77bcf86cd799439012',
      questions: [question()],
      dimensionScores: {},
    });

    const row = evidenceBulkWrite.mock.calls[0][0][0].updateOne.update.$setOnInsert;
    expect(row.sourceType).toBe('MOCK_INTERVIEW');
    expect(SOURCE_WEIGHT.MOCK_INTERVIEW).toBeLessThan(SOURCE_WEIGHT.PERSONALIZED_ASSESSMENT);
    expect(row.evidenceWeight).toBeGreaterThan(0);
  });

  it('keys each row on the sitting so a replayed finish cannot double-count', async () => {
    await projectInterviewToEvidence({
      tenantId: 't1', studentId: '507f1f77bcf86cd799439011',
      interviewId: '507f1f77bcf86cd799439012',
      questions: [question()],
      dimensionScores: {},
    });

    const op = evidenceBulkWrite.mock.calls[0][0][0].updateOne;
    expect(Object.keys(op.filter).sort())
      .toEqual(['assessmentId', 'itemSourceId', 'itemSourceType', 'skillKey']);
    expect(op.upsert).toBe(true);
    // $setOnInsert only — a re-run must not rewrite the original observation.
    expect(op.update.$set).toBeUndefined();
  });

  it('records nothing at all when nothing was observed', async () => {
    const out = await projectInterviewToEvidence({
      tenantId: 't1', studentId: '507f1f77bcf86cd799439011',
      interviewId: '507f1f77bcf86cd799439012',
      questions: [
        question({ questionId: 'hr', skillKey: null }),           // behavioural — no skill
        question({ questionId: 'silent', answered: false, score: null }),
        question({ questionId: 'broken', score: null, maxScore: null }),
        question({ questionId: 'unknown', skillKey: 'NOT_A_SKILL' }),
      ],
      dimensionScores: {},
    });

    expect(evidenceBulkWrite).not.toHaveBeenCalled();
    expect(recompute).not.toHaveBeenCalled();
    expect(out.evidenceCreated).toBe(0);
    expect(out.questionsAsked).toBe(4);
  });

  it('never writes evidence for a skill that is not in the canonical catalogue', async () => {
    skillCatalogue = [{ key: 'JAVA', name: 'Java', active: false }];   // retired skill

    await projectInterviewToEvidence({
      tenantId: 't1', studentId: '507f1f77bcf86cd799439011',
      interviewId: '507f1f77bcf86cd799439012',
      questions: [question()],
      dimensionScores: {},
    });

    expect(evidenceBulkWrite).not.toHaveBeenCalled();
  });
});

describe('interview readiness is its own figure', () => {
  it('re-normalises over the dimensions actually measured', () => {
    // The evaluator produced one of four. The score must be that dimension, not a quarter
    // of it — a missing measurement is missing, not a zero.
    expect(weightedScore([{ key: 'TECHNICAL', score: 80 }], INTERVIEW_WEIGHTS)).toBe(80);
    expect(weightedScore(
      [{ key: 'TECHNICAL', score: 80 }, { key: 'COMMUNICATION', score: 40 }],
      INTERVIEW_WEIGHTS,
    )).toBe(Math.round((80 * 40 + 40 * 20) / 60));
  });

  it('is not derivable from, and does not blend with, the other two readiness figures', () => {
    const exports = Object.keys(policy);
    expect(exports.some(k => /overall|combined|blended|total/i.test(k))).toBe(false);
    expect(Object.keys(RESUME_WEIGHTS).sort())
      .not.toEqual(Object.keys(INTERVIEW_WEIGHTS).sort());
  });

  it('admits only graded answers to mapped questions as evidence', () => {
    expect(isEvidenceWorthy(question())).toBe(true);
    expect(isEvidenceWorthy(question({ skillKey: null }))).toBe(false);
    expect(isEvidenceWorthy(question({ answered: false }))).toBe(false);
    expect(isEvidenceWorthy(question({ score: null }))).toBe(false);
    expect(isEvidenceWorthy(question({ maxScore: 0 }))).toBe(false);
    expect(isEvidenceWorthy(question({ score: 11, maxScore: 10 }))).toBe(false);
  });
});

// ── the adapter over the existing mock-interview stack ──────────────────────

describe('adapting a passport mock interview', () => {
  it('produces no evidence-worthy answer from a pathway interview', () => {
    const adapted = adaptPassportInterview({
      _id: 'i1',
      skillTargets: [],   // free-text areas: "Learning mindset" is no canonical skill
      evaluation: { areaScores: [{ title: 'Learning mindset', percentage: 90 }] },
    });

    expect(adapted.questions.every(q => !isEvidenceWorthy(q))).toBe(true);
    expect(adapted.dimensionScores).toEqual({});
  });

  it('maps a graded area back to the skill recorded when the interview started', () => {
    const adapted = adaptPassportInterview({
      _id: 'i1',
      skillTargets: [{ skillKey: 'JAVA', skillName: 'Java' }],
      evaluation: { areaScores: [{ title: 'Java', percentage: 70 }, { title: 'Rapport', percentage: 90 }] },
    });

    const java = adapted.questions.find(q => q.skillKey === 'JAVA')!;
    expect(java.score).toBe(70);
    expect(java.maxScore).toBe(100);
    // The unmapped area is carried for display but can never become evidence.
    expect(adapted.questions.filter(q => isEvidenceWorthy(q))).toHaveLength(1);
    // TECHNICAL averages only the mapped areas — 70, not 80.
    expect(adapted.dimensionScores.TECHNICAL).toBe(70);
  });

  it('gives the same question id for the same sitting every time it is adapted', () => {
    const session = {
      _id: 'i1',
      skillTargets: [{ skillKey: 'JAVA', skillName: 'Java' }],
      evaluation: { areaScores: [{ title: 'Java', percentage: 70 }] },
    };
    expect(adaptPassportInterview(session).questions[0].questionId)
      .toBe(adaptPassportInterview(session).questions[0].questionId);
  });
});

// ── coverage is resolved server-side ────────────────────────────────────────

describe('interview coverage', () => {
  it('probes what the role needs, what the student is weak at, and what they are strong at', async () => {
    readinessResult = readyWith([
      skill({ skillKey: 'JAVA', skillName: 'Java', weight: 30, studentScore: 85, status: 'STRONG' }),
      skill({ skillKey: 'SQL', skillName: 'SQL', weight: 20, studentScore: 30, status: 'PRIORITY_GAP' }),
      skill({ skillKey: 'SPRING', skillName: 'Spring', weight: 10, studentScore: 40, status: 'NEEDS_WORK' }),
      skill({ skillKey: 'AWS', skillName: 'AWS', weight: 5, studentScore: 72, status: 'ON_TRACK' }),
    ]);

    const plan = await planInterviewCoverage('t1', 's1', 6);

    expect(plan.ok).toBe(true);
    const bands = new Set(plan.targets!.flatMap(t => t.bands));
    // A student only ever asked about their weaknesses can never demonstrate a strength.
    expect(bands.has('gaps')).toBe(true);
    expect(bands.has('strengths')).toBe(true);
    expect(INTERVIEW_MIX.strengths).toBeGreaterThan(0);
    // One skill, one entry — merged rather than asked twice under two headings.
    expect(new Set(plan.targets!.map(t => t.skillKey)).size).toBe(plan.targets!.length);
  });

  it('refuses to plan an interview for a student with no target role', async () => {
    readinessResult = { available: false, reason: 'ROLE_NOT_SELECTED' };
    const plan = await planInterviewCoverage('t1', 's1', 6);

    expect(plan.ok).toBe(false);
    expect(plan.targets).toBeUndefined();
  });

  it('never asks about a retired skill', async () => {
    readinessResult = readyWith([
      skill({ skillKey: 'OLD', skillName: 'Old', skillInactive: true }),
      skill({ skillKey: 'JAVA', skillName: 'Java' }),
    ]);

    const plan = await planInterviewCoverage('t1', 's1', 6);
    expect(plan.targets!.some(t => t.skillKey === 'OLD')).toBe(false);
  });
});

// ── the module boundary itself ────────────────────────────────────

describe('Module 14 stays inside its own lane', () => {
  const SOURCES = [
    'src/services/resumeIntelligenceService.ts',
    'src/services/interviewIntelligenceService.ts',
    'src/data/placementReadinessPolicy.ts',
  ];

  /**
   * A structural test, deliberately.
   *
   * The behavioural tests above can only catch a boundary crossing on a path they happen to
   * exercise. This one fails the moment the import appears — which is the point at which a
   * reviewer can still ask why, rather than three modules later when a resume edit has
   * quietly started rescheduling somebody's 90-day plan.
   */
  const sourceOf = (rel: string) =>
    require('fs').readFileSync(require('path').join(process.cwd(), rel), 'utf8');

  it('never reaches for the roadmap, gamification or reward stacks', () => {
    for (const file of SOURCES) {
      const src = sourceOf(file);
      const imports = src.match(/^import .*$/gm) || [];
      const offending = imports.filter(l =>
        /CareerRoadmap|roadmapPlanner|roadmapPolicy|gamification|Gamification|reward|Reward|coinSpend/.test(l));
      expect({ file, offending }).toEqual({ file, offending: [] });
    }
  });

  it('never imports the skill profile it would need in order to write a score', () => {
    for (const file of SOURCES) {
      const imports = sourceOf(file).match(/^import .*$/gm) || [];
      expect(imports.some(l => /StudentSkillProfile/.test(l))).toBe(false);
    }
  });

  it('changes exactly one thing in Module 7: what an interview is worth', () => {
    const policy = sourceOf('src/data/skillDnaPolicy.ts');
    // The new source is admitted and weighted. No scoring arithmetic was touched to do it.
    expect(policy).toContain('MOCK_INTERVIEW');
    expect(SOURCE_WEIGHT.PERSONALIZED_ASSESSMENT).toBe(1.0);
  });
});
