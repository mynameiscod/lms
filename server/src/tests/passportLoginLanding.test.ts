/**
 * Where a member lands after OTP.
 *
 * A first-time signup used to be dropped on the dashboard, where every panel is empty
 * until a role and a time commitment exist, and the actual next step sat behind a
 * dismissible strip. They now go straight to setup — but only if they need it. A member
 * who has already finished onboarding must never be sent back through it.
 *
 * The decision is the SERVER's: `onboardingCompleted` is stated on the login response so
 * the client does not infer completeness from a partial view of the record.
 */

const findByIdUser = jest.fn();
const verifyOtpMock = jest.fn();
const updateOneUser = jest.fn();

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findById: (...a: any[]) => findByIdUser(...a),
    updateOne: (...a: any[]) => { updateOneUser(...a); return Promise.resolve({}); },
  },
}));
jest.mock('../services/assessmentOtpService', () => ({
  verifyOtp: (...a: any[]) => verifyOtpMock(...a),
  sendOtp: jest.fn(),
}));
jest.mock('../config/secrets', () => ({ jwtSecret: () => 'test-secret-at-least-32-chars-long!!' }));

import { verify } from '../controllers/publicPassportController';

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function memberDoc(passport: any) {
  return {
    _id: 'student-a', email: 'a@example.com', firstName: 'Asha', lastName: 'R',
    role: 'STUDENT', tenantId: 'tenant-1', isActive: true,
    passport,
    save: jest.fn(async () => undefined),
  };
}

const run = async (doc: any) => {
  findByIdUser.mockResolvedValue(doc);
  const res = mockRes();
  await verify({ body: { token: 'student-a', code: '123456' } } as any, res);
  return res.json.mock.calls[0][0];
};

beforeEach(() => {
  findByIdUser.mockReset();
  updateOneUser.mockReset();
  verifyOtpMock.mockReset().mockResolvedValue('ok');
});

describe('a first-time CareerPilot signup', () => {
  it('is reported as not onboarded, so the client routes to setup', async () => {
    const body = await run(memberDoc({ product: 'career_passport', active: true, degree: 'B.Tech', yearOfStudy: '3rd Year' }));
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.onboardingCompleted).toBe(false);
  });

  it('still issues a working session — the landing change is additive', async () => {
    const body = await run(memberDoc({ product: 'career_passport', active: true }));
    expect(body.tenantId).toBe('tenant-1');
    expect(body.user).toMatchObject({ id: 'student-a', email: 'a@example.com', role: 'STUDENT' });
  });
});

describe('a returning member who already completed onboarding', () => {
  it('is reported as onboarded, so login behaviour is unchanged', async () => {
    const body = await run(memberDoc({
      product: 'career_passport', active: true,
      degree: 'B.Tech', yearOfStudy: '3rd Year',
      primaryRole: 'BACKEND_ENGINEER', minutesPerDay: 60,
      contextCompletedAt: new Date('2026-07-01T00:00:00Z'),
    }));
    expect(body.onboardingCompleted).toBe(true);
  });
});

describe('OTP failures are unaffected', () => {
  it('rejects a wrong code without issuing a session', async () => {
    verifyOtpMock.mockResolvedValue('invalid');
    const res = mockRes();
    await verify({ body: { token: 'student-a', code: '000000' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].success).toBe(false);
    expect(res.json.mock.calls[0][0].token).toBeUndefined();
  });

  it('refuses a deactivated account at the door', async () => {
    const doc = memberDoc({ product: 'career_passport', active: true });
    (doc as any).isActive = false;
    findByIdUser.mockResolvedValue(doc);
    const res = mockRes();
    await verify({ body: { token: 'student-a', code: '123456' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('ACCOUNT_DEACTIVATED');
  });
});
