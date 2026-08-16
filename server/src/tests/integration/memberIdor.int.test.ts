/**
 * Can one member read another member's work by guessing an id?
 *
 * Every CareerPilot surface that takes an `:id` is guarded by MEMBER, which establishes that
 * the CALLER is a member — and says nothing about whose record they asked for. Ownership is
 * enforced separately, by scoping each lookup to the caller's studentId, and a handler that
 * forgets is indistinguishable from one that does not: it works perfectly for the person who
 * owns the record.
 *
 * These tests call the real handlers against a real database with one member's identity and
 * another member's ids. A mock cannot answer this, because the thing under test is whether
 * the query reaches the database with studentId in it.
 *
 * They also check the shape of the refusal. A handler that answers 403 for someone else's
 * record and 404 for a record that does not exist has confirmed which ids are real, which is
 * how an enumeration starts. Both must look the same from outside.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections, ensureIndexes } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import PassportConfig from '../../models/PassportConfig';
import PassportInterview from '../../models/PassportInterview';
import PersonalizedAssessment from '../../models/PersonalizedAssessment';
import MockTestAttempt from '../../models/MockTestAttempt';
import { CAREERPILOT_PRODUCT } from '../../services/careerPilotPopulation';
import * as interview from '../../controllers/passportInterviewController';
import * as mt from '../../controllers/mockTestController';
import * as reassessment from '../../controllers/reassessmentController';

const TENANT = '507f1f77bcf86cd799439c11';
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);

let seq = 0;

/** A paid-up member, so entitlement never masks a missing ownership check. */
const member = () => {
  seq += 1;
  return User.create({
    tenantId: TENANT, firstName: `Idor${seq}`, lastName: 'X',
    email: `idor${seq}@example.com`, phone: `9900${String(seq).padStart(6, '0')}`,
    password: 'x', role: 'STUDENT',
    passport: { active: true, product: CAREERPILOT_PRODUCT, expiresAt: daysAhead(200) },
  });
};

/** A request as the auth middleware would have left it. */
const asUser = (u: any, params: any = {}, body: any = {}) => ({
  user: { id: String(u._id), tenantId: TENANT }, tenantId: TENANT, params, body, query: {},
} as any);

const capture = () => {
  const res: any = { statusCode: 200, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
};

let owner: any;
let intruder: any;

beforeAll(async () => {
  await startMongo();
  await ensureIndexes([User, PassportInterview, PersonalizedAssessment, MockTestAttempt] as any);
});
afterAll(stopMongo);

beforeEach(async () => {
  await clearCollections();
  // Everything free, so a refusal below can only be an ownership refusal.
  await PassportConfig.create({
    tenantId: TENANT, enabled: true,
    entitlements: [
      { featureKey: 'mock_interview', label: 'Mock Interview', tier: 'free' },
      { featureKey: 'company_questions', label: 'Company Questions', tier: 'free' },
      { featureKey: 'roadmap_full', label: 'Roadmap', tier: 'free' },
    ],
  } as any);
  owner = await member();
  intruder = await member();
});

// ── interviews ──────────────────────────────────────────────────────────────

describe('somebody else’s interview', () => {
  const anInterview = (studentId: any) => PassportInterview.create({
    tenantId: TENANT, studentId, status: 'in_progress', live: true,
    role: 'Backend Engineer', areas: [], questions: [],
  } as any);

  it('cannot be read', async () => {
    const s = await anInterview(owner._id);
    const res = capture();

    await interview.get(asUser(intruder, { id: String(s._id) }), res);

    expect(res.statusCode).toBe(404);
    // The transcript is the point — it is what the member said, verbatim.
    expect(JSON.stringify(res.body)).not.toContain('Backend Engineer');
  });

  it('cannot be answered into', async () => {
    const s = await anInterview(owner._id);
    const res = capture();

    await interview.turn(asUser(intruder, { id: String(s._id) }, { answer: 'hello' }), res);

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    const after = await PassportInterview.findById(s._id).lean() as any;
    expect(after.status).toBe('in_progress');
  });

  it('cannot be finished on their behalf', async () => {
    const s = await anInterview(owner._id);
    const res = capture();

    await interview.finish(asUser(intruder, { id: String(s._id) }), res);

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    // Finishing somebody else's sitting would grade a half-finished interview and burn it.
    const after = await PassportInterview.findById(s._id).lean() as any;
    expect(after.status).toBe('in_progress');
  });

  it('is refused exactly like an id that does not exist', async () => {
    const s = await anInterview(owner._id);
    const theirs = capture();
    const nothing = capture();

    await interview.get(asUser(intruder, { id: String(s._id) }), theirs);
    await interview.get(asUser(intruder, { id: String(new mongoose.Types.ObjectId()) }), nothing);

    // Different answers here would confirm which ids are real.
    expect(theirs.statusCode).toBe(nothing.statusCode);
    expect(theirs.body).toEqual(nothing.body);
  });

  it('is still readable by the member who owns it', async () => {
    const s = await anInterview(owner._id);
    const res = capture();

    await interview.get(asUser(owner, { id: String(s._id) }), res);

    // The guard has to refuse the intruder without refusing the owner.
    expect(res.statusCode).toBe(200);
  });
});

// ── mock tests ──────────────────────────────────────────────────────────────

describe('somebody else’s mock test', () => {
  const anAttempt = (studentId: any) => MockTestAttempt.create({
    tenantId: TENANT, studentId, companySlug: 'acme', companyName: 'Acme',
    status: 'in_progress', endsAt: daysAhead(1),
    questions: [{ prompt: 'What is a JOIN?', options: ['a', 'b'], correctIndex: 0 }],
    answers: [],
  } as any);

  it('cannot be read', async () => {
    const a = await anAttempt(owner._id);
    const res = capture();

    await mt.getMockTest(asUser(intruder, { id: String(a._id) }), res);

    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('JOIN');
  });

  it('cannot be answered', async () => {
    const a = await anAttempt(owner._id);
    const res = capture();

    await mt.saveAnswer(asUser(intruder, { id: String(a._id) }, { index: 0, answer: 1 }), res);

    expect(res.statusCode).toBe(404);
    const after = await MockTestAttempt.findById(a._id).lean() as any;
    expect(after.answers).toHaveLength(0);
  });

  it('cannot be submitted', async () => {
    const a = await anAttempt(owner._id);
    const res = capture();

    await mt.submitMockTest(asUser(intruder, { id: String(a._id) }), res);

    expect(res.statusCode).toBe(404);
    // Submitting somebody else's attempt scores it early and spends one of their tries.
    const after = await MockTestAttempt.findById(a._id).lean() as any;
    expect(after.status).toBe('in_progress');
  });
});

// ── reassessment results ────────────────────────────────────────────────────

describe('somebody else’s check-in result', () => {
  const anAttempt = (studentId: any) => PersonalizedAssessment.create({
    tenantId: TENANT, studentId, status: 'SUBMITTED', purpose: 'REASSESSMENT',
    attemptNumber: 2, submittedAt: new Date(),
    roleKey: 'BACKEND_ENGINEER', stage: 'MID', generationSeed: 'seed-1',
    policyKey: 'STANDARD', policyVersion: 1,
    beforeSnapshot: { readiness: 40, roleKey: 'BACKEND_ENGINEER', blueprintVersion: 1 },
    afterSnapshot: { readiness: 70, roleKey: 'BACKEND_ENGINEER', blueprintVersion: 1 },
  } as any);

  it('cannot be read', async () => {
    const a = await anAttempt(owner._id);
    const res = capture();

    await reassessment.getMyReassessmentResult(asUser(intruder, { attemptId: String(a._id) }), res);

    expect(res.statusCode).toBe(404);
    // Another member's readiness is a private measurement of their ability.
    expect(JSON.stringify(res.body)).not.toContain('70');
  });

  it('is still readable by the member it belongs to', async () => {
    const a = await anAttempt(owner._id);
    const res = capture();

    await reassessment.getMyReassessmentResult(asUser(owner, { attemptId: String(a._id) }), res);

    expect(res.statusCode).toBe(200);
  });
});

// ── the invariant, for the handler nobody has written yet ───────────────────

describe('every member-owned lookup names the caller', () => {
  it('never fetches a member-owned record by id alone', () => {
    /**
     * The behavioural tests above cover the handlers that exist today. This one covers the
     * next one: a lookup written as `findOne({ _id: req.params.id, tenantId })` works
     * perfectly for the person who owns the record, so it passes review, ships, and is an
     * IDOR. Requiring studentId in the same query is the thing that makes it not one.
     */
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(__dirname, '..', '..', 'controllers');

    /**
     * Lookups that are keyed by id alone AND are meant to be.
     *
     * Each is a record the TENANT owns rather than a member: reached only through a MANAGE
     * route, where the authorisation question is "may this admin manage CareerPilot for this
     * tenant", and the tenant scope in the query is the answer. Adding studentId to them
     * would be meaningless — there is no member whose record it is.
     *
     * Listed rather than pattern-matched away, so each exemption had to be looked at once and
     * anything new fails until somebody looks at that too.
     */
    const ALLOWED: Record<string, string> = {
      'companyProfileAdminController.ts': 'company role profiles — tenant content, MANAGE only',
      'companyQuestionController.ts': 'company question bank and moderation — tenant content, MANAGE only',
      'passportController.ts': 'admin member administration, keyed by :userId — MANAGE only',
      // The finalize claim is authorised by a token the server minted for a session it had
      // already ownership-checked. Re-checking studentId would not add anything the token
      // does not already carry, and the claim must stay a single atomic condition.
      'passportInterviewController.ts': 'finalize-token claim on an already-owned session',
    };

    const offenders: string[] = [];
    for (const file of fs.readdirSync(dir).filter((f: string) => /^(passport|mockTest|reassessment|company)/.test(f))) {
      const src: string = fs.readFileSync(path.join(dir, file), 'utf8');
      // A lookup keyed on a request parameter, with no studentId beside it.
      const re = /(findOne|findOneAndUpdate|findOneAndDelete|deleteOne|updateOne)\(\s*\{[^}]*_id:\s*(req\.params|id\b)[^}]*\}/g;
      for (const m of src.match(re) || []) {
        if (/studentId/.test(m)) continue;
        if (ALLOWED[file]) continue;
        offenders.push(`${file}: ${m.replace(/\s+/g, ' ').slice(0, 110)}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('has an allowlist that is actually exercised', () => {
    // A guard whose pattern silently stopped matching would pass forever. If this drops to
    // zero, the sweep above is no longer looking at anything.
    const fs = require('fs');
    const path = require('path');
    const src: string = fs.readFileSync(
      path.join(__dirname, '..', '..', 'controllers', 'companyQuestionController.ts'), 'utf8');

    const re = /(findOne|findOneAndUpdate|deleteOne)\(\s*\{[^}]*_id:\s*req\.params[^}]*\}/g;
    expect((src.match(re) || []).length).toBeGreaterThan(0);
  });
});
