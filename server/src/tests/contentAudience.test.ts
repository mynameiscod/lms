/**
 * Content audience, Phase 1 — who sees a Quiz / Assignment in the LMS lists.
 *
 * LMS students and CareerPilot members share the `users` collection; `audience` on a quiz or
 * assignment decides which population lists it. The LMS list paths must show 'lms', 'all' and
 * legacy rows with no audience, and hide 'careerpilot' — and, until the backfill has run, still
 * hide anything bound to a CareerPilot unit (unitCode) whatever its audience says. An explicit
 * AssessmentSchedule still delivers either.
 */

import { Types } from 'mongoose';

/* ── Mocks ─────────────────────────────────────────────────────────────────────────────── */

let quizRows: any[] = [];
let schedules = new Map<string, any>();
let lastAssignmentQuery: any = null;

const chain = (value: any): any => {
  const p: any = Promise.resolve(value);
  p.select = () => chain(value);
  p.sort = () => chain(value);
  p.populate = () => chain(value);
  p.lean = async () => value;
  return p;
};

jest.mock('../models/Quiz', () => ({ __esModule: true, default: { find: () => chain(quizRows) } }));
jest.mock('../models/QuizAttempt', () => ({ __esModule: true, default: { find: () => chain([]) } }));
jest.mock('../models/CodeSnippetAssessment', () => ({ __esModule: true, default: {} }));
jest.mock('../models/CodeSnippetSubmission', () => ({ __esModule: true, default: {} }));
jest.mock('../models/Assignment', () => ({
  __esModule: true,
  AssignmentType: {}, DifficultyLevel: {}, ProgrammingLanguage: {},
  AssignmentStatus: { DRAFT: 'draft', PUBLISHED: 'published', ARCHIVED: 'archived' },
  default: { find: (q: any) => { lastAssignmentQuery = q; return chain([]); } },
}));
jest.mock('../models/Submission', () => ({ __esModule: true, SubmissionStatus: {}, default: {} }));
jest.mock('../models/User', () => ({ __esModule: true, default: { findById: () => chain({ batchId: null }) } }));
jest.mock('../models/Chapter', () => ({ __esModule: true, default: {} }));
jest.mock('../services/emailService', () => ({ EmailService: class {} }));
jest.mock('../notifications/notificationService', () => ({ createNotifications: jest.fn() }));
jest.mock('../services/assessmentDeliveryService', () => ({
  studentSchedulesMap: jest.fn(async () => schedules),
  policyFromRow: jest.fn(() => ({})),
}));

import { learnerAudienceOf, audienceFilterFor, audienceIncludes } from '../services/learnerAudience';
import { resolveAssignedQuizzes } from '../services/studentWorkService';
import assignmentService from '../services/assignmentService';

/* ── The learner rule ──────────────────────────────────────────────────────────────────── */

describe('learnerAudienceOf', () => {
  const now = new Date('2026-09-29T00:00:00Z').getTime();
  const future = new Date('2027-01-01');
  const past = new Date('2026-01-01');

  it('a batch student with no passport is LMS only', () => {
    expect(learnerAudienceOf({ role: 'STUDENT', batchId: 'b1' }, now)).toEqual({ lms: true, careerpilot: false });
  });
  it('a student who never came through CareerPilot is LMS even without a batch', () => {
    expect(learnerAudienceOf({ role: 'STUDENT' }, now)).toEqual({ lms: true, careerpilot: false });
  });
  it('an active member with no batch is CareerPilot only', () => {
    expect(learnerAudienceOf({ role: 'STUDENT', passport: { active: true, product: 'careerpilot', expiresAt: future } }, now))
      .toEqual({ lms: false, careerpilot: true });
  });
  it('an active member placed in a batch is both', () => {
    expect(learnerAudienceOf({ role: 'STUDENT', batchId: 'b1', passport: { active: true, product: 'careerpilot' } }, now))
      .toEqual({ lms: true, careerpilot: true });
  });
  it('an expired membership is not CareerPilot', () => {
    expect(learnerAudienceOf({ role: 'STUDENT', passport: { active: true, product: 'careerpilot', expiresAt: past } }, now).careerpilot)
      .toBe(false);
  });
  it('staff are neither, and a missing user is neither', () => {
    expect(learnerAudienceOf({ role: 'TENANT_ADMIN' }, now)).toEqual({ lms: false, careerpilot: false });
    expect(learnerAudienceOf(null, now)).toEqual({ lms: false, careerpilot: false });
  });
});

describe('audience filters', () => {
  it('the LMS list takes lms, all and legacy (missing) rows', () => {
    expect(audienceFilterFor('lms')).toEqual({ audience: { $in: ['lms', 'all', null] } });
    expect(audienceIncludes('lms', undefined)).toBe(true);
    expect(audienceIncludes('lms', 'all')).toBe(true);
    expect(audienceIncludes('lms', 'careerpilot')).toBe(false);
  });
  it('the CareerPilot list takes careerpilot and all, never legacy rows', () => {
    expect(audienceFilterFor('careerpilot')).toEqual({ audience: { $in: ['careerpilot', 'all'] } });
    expect(audienceIncludes('careerpilot', undefined)).toBe(false);
    expect(audienceIncludes('careerpilot', 'all')).toBe(true);
  });
});

/* ── Quiz list for an LMS student ──────────────────────────────────────────────────────── */

describe('resolveAssignedQuizzes (LMS student)', () => {
  const q = (id: string, extra: any = {}) => ({ _id: id, title: id, accessibleTo: 'everyone', ...extra });

  beforeEach(() => { schedules = new Map(); });

  it('lists lms, all and legacy quizzes; hides careerpilot-only and unit-bound ones', async () => {
    quizRows = [
      q('legacy'),
      q('lms', { audience: 'lms' }),
      q('both', { audience: 'all' }),
      q('cpOnly', { audience: 'careerpilot' }),
      q('unitLegacy', { unitCode: 'U-1' }),
      q('unitMarkedLms', { unitCode: 'U-2', audience: 'lms' }),
    ];
    const out = await resolveAssignedQuizzes('t1', 's1', 'b1');
    expect(out.map(r => r.quiz._id).sort()).toEqual(['both', 'legacy', 'lms']);
  });

  it('an explicit schedule still delivers a careerpilot-only quiz', async () => {
    quizRows = [q('cpOnly', { audience: 'careerpilot' })];
    schedules = new Map([['cpOnly', { dueAt: null }]]);
    const out = await resolveAssignedQuizzes('t1', 's1', 'b1');
    expect(out.map(r => r.quiz._id)).toEqual(['cpOnly']);
  });
});

/* ── Assignment list query ─────────────────────────────────────────────────────────────── */

describe('getStudentAssignments query', () => {
  it('the published branch carries the audience condition and the unitCode guard', async () => {
    schedules = new Map();
    await assignmentService.getStudentAssignments(new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId());
    const published = lastAssignmentQuery.$or.find((b: any) => b.status === 'published');
    expect(published.audience).toEqual({ $in: ['lms', 'all', null] });
    expect(published.unitCode).toEqual({ $in: [null, ''] });
  });

  it('the scheduled branch is untouched by audience', async () => {
    schedules = new Map([['a1', {}]]);
    await assignmentService.getStudentAssignments(new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId());
    const scheduled = lastAssignmentQuery.$or.find((b: any) => b._id);
    expect(scheduled).toEqual({ _id: { $in: ['a1'] } });
  });
});
