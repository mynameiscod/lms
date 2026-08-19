/**
 * Assessment preflight for the onboarding CTA.
 *
 * Onboarding now ends on "Start my personalized assessment". That button must not exist
 * unless the assessment can actually start: on a tenant with no published blueprint and no
 * skill graph — which is the state this product ships in — start() answers 400/409 AFTER
 * the click, so the student finishes setup and is handed an error.
 *
 * These pin the states the UI switches on. The rules stay in the service; the client only
 * renders the answer.
 */

const getCareerContextMock = jest.fn();
const getRoleSkillBlueprintMock = jest.fn();
const findEvidenceCandidatesMock = jest.fn();
const countCareerSkillsMock = jest.fn();
const findOpenAttemptMock = jest.fn();

jest.mock('../services/careerContextService', () => ({
  getCareerContext: (...a: any[]) => getCareerContextMock(...a),
}));
jest.mock('../services/roleSkillBlueprintService', () => ({
  getRoleSkillBlueprint: (...a: any[]) => getRoleSkillBlueprintMock(...a),
}));
jest.mock('../services/skillEvidenceService', () => ({
  findEvidenceCandidates: (...a: any[]) => findEvidenceCandidatesMock(...a),
}));
jest.mock('../models/CareerSkill', () => ({
  __esModule: true,
  default: {
    countDocuments: (...a: any[]) => countCareerSkillsMock(...a),
    find: () => ({ lean: async () => [] }),
  },
}));
jest.mock('../models/PersonalizedAssessment', () => ({
  __esModule: true,
  default: {
    findOne: () => ({ select: () => ({ lean: async () => findOpenAttemptMock() }) }),
  },
}));

import { getPersonalizedAssessmentAvailability } from '../services/personalizedAssessmentService';

/** A member who has finished onboarding and is otherwise ready. */
const readyContext = (primaryRole: string) => ({
  status: { onboardingCompleted: true, missing: [], completedAt: new Date() },
  derived: { stage: 'FOUNDATION' },
  career: { primaryRole },
  education: {}, availability: {},
});

const publishedBlueprint = {
  roleName: 'Backend Engineer', published: true, version: 3,
  requirements: [{ skillKey: 'JAVA', active: true, skillActive: true, missing: false }],
};

beforeEach(() => {
  getCareerContextMock.mockReset();
  getRoleSkillBlueprintMock.mockReset();
  findEvidenceCandidatesMock.mockReset();
  countCareerSkillsMock.mockReset();
  findOpenAttemptMock.mockReset();

  findOpenAttemptMock.mockReturnValue(null);
  countCareerSkillsMock.mockResolvedValue(1);
  findEvidenceCandidatesMock.mockResolvedValue([{ skillKey: 'JAVA', items: [{ sourceType: 'QUIZ', sourceId: 'q1' }] }]);
  getRoleSkillBlueprintMock.mockResolvedValue(publishedBlueprint);
});

describe('a fully configured role', () => {
  it('is available, so the CTA may be shown', async () => {
    getCareerContextMock.mockResolvedValue(readyContext('BACKEND_ENGINEER'));
    const r = await getPersonalizedAssessmentAvailability('t1', 's1');
    expect(r.assessmentAvailable).toBe(true);
    expect(r.reasonCode).toBeUndefined();
    expect(r.discovery).toBe(false);
  });

  it('reports an open attempt so the CTA can say "continue" instead of "start"', async () => {
    getCareerContextMock.mockResolvedValue(readyContext('BACKEND_ENGINEER'));
    findOpenAttemptMock.mockReturnValue({ _id: 'a1' });
    const r = await getPersonalizedAssessmentAvailability('t1', 's1');
    expect(r).toMatchObject({ assessmentAvailable: true, inProgress: true });
  });
});

describe('an unconfigured role', () => {
  it('is unavailable when no blueprint exists — the shipped state', async () => {
    getCareerContextMock.mockResolvedValue(readyContext('BACKEND_ENGINEER'));
    getRoleSkillBlueprintMock.mockResolvedValue(null);
    const r = await getPersonalizedAssessmentAvailability('t1', 's1');
    expect(r.assessmentAvailable).toBe(false);
    expect(r.reasonCode).toBe('ROLE_NOT_CONFIGURED');
  });

  it('is unavailable when the blueprint is still a draft', async () => {
    getCareerContextMock.mockResolvedValue(readyContext('BACKEND_ENGINEER'));
    getRoleSkillBlueprintMock.mockResolvedValue({ ...publishedBlueprint, published: false });
    const r = await getPersonalizedAssessmentAvailability('t1', 's1');
    expect(r.assessmentAvailable).toBe(false);
    expect(r.reasonCode).toBe('BLUEPRINT_UNPUBLISHED');
  });

  it('is unavailable when the skill graph is empty', async () => {
    getCareerContextMock.mockResolvedValue(readyContext('BACKEND_ENGINEER'));
    countCareerSkillsMock.mockResolvedValue(0);
    const r = await getPersonalizedAssessmentAvailability('t1', 's1');
    expect(r.assessmentAvailable).toBe(false);
    expect(r.reasonCode).toBe('SKILLS_NOT_CONFIGURED');
  });

  it('is unavailable when skills exist but nothing can be asked about them', async () => {
    getCareerContextMock.mockResolvedValue(readyContext('BACKEND_ENGINEER'));
    findEvidenceCandidatesMock.mockResolvedValue([{ skillKey: 'JAVA', items: [] }]);
    const r = await getPersonalizedAssessmentAvailability('t1', 's1');
    expect(r.assessmentAvailable).toBe(false);
    expect(r.reasonCode).toBe('QUESTION_POOL_EMPTY');
  });

  it('never leaks internal detail in the student-facing message', async () => {
    getCareerContextMock.mockResolvedValue(readyContext('BACKEND_ENGINEER'));
    countCareerSkillsMock.mockResolvedValue(0);
    const r = await getPersonalizedAssessmentAvailability('t1', 's1');
    expect(r.message).toBe('This career path is not ready for assessment yet.');
  });
});

describe('NOT_SURE', () => {
  it('is available only when discovery actually has skills and questions', async () => {
    getCareerContextMock.mockResolvedValue(readyContext('NOT_SURE'));
    const r = await getPersonalizedAssessmentAvailability('t1', 's1');
    expect(r).toMatchObject({ assessmentAvailable: true, discovery: true });
    // No blueprint is consulted for discovery — that is the existing behaviour.
    expect(getRoleSkillBlueprintMock).not.toHaveBeenCalled();
  });

  it('is UNAVAILABLE when the tenant has no skills configured', async () => {
    // The case that used to fail after the click: discovery scopes to a broad skill set,
    // which is just as absent on a tenant that never configured one.
    getCareerContextMock.mockResolvedValue(readyContext('NOT_SURE'));
    countCareerSkillsMock.mockResolvedValue(0);
    const r = await getPersonalizedAssessmentAvailability('t1', 's1');
    expect(r).toMatchObject({ assessmentAvailable: false, reasonCode: 'SKILLS_NOT_CONFIGURED', discovery: true });
  });
});

describe('an incomplete member', () => {
  it('is unavailable until onboarding is finished', async () => {
    getCareerContextMock.mockResolvedValue({
      ...readyContext('BACKEND_ENGINEER'),
      status: { onboardingCompleted: false, missing: ['availability.minutesPerDay'], completedAt: null },
    });
    const r = await getPersonalizedAssessmentAvailability('t1', 's1');
    expect(r).toMatchObject({ assessmentAvailable: false, reasonCode: 'CONTEXT_INCOMPLETE' });
  });

  it('is unavailable when the academic stage cannot be derived', async () => {
    getCareerContextMock.mockResolvedValue({ ...readyContext('BACKEND_ENGINEER'), derived: { stage: null } });
    const r = await getPersonalizedAssessmentAvailability('t1', 's1');
    expect(r).toMatchObject({ assessmentAvailable: false, reasonCode: 'STAGE_UNKNOWN' });
  });
});
