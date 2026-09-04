/**
 * Who is allowed to run the public CareerPilot signup a second time.
 *
 * The resume branch exists for people who abandoned the form: it reuses their row and
 * reissues an OTP rather than stranding them behind a "that email is taken" wall. The
 * question is where it stops.
 *
 * It used to stop at `passport.active`, which is not "has an account" — it is "has paid",
 * written by activateMembership() from the Razorpay verify or an admin conversion. So a
 * member who had verified their OTP, completed onboarding and been career-scored still
 * looked abandoned, and signing up again quietly reissued a code for a live account. These
 * pin the boundary at verifiedAt instead: once a signup has completed, the way back in is
 * login, and only a signup that never completed may be resumed.
 *
 * SINCE DEFERRED CREATION, "resuming" no longer means reusing an account row, because
 * signup does not create one — it stores a pending signup and creates the account at
 * verification. The boundary is unchanged and is what these still test; what changed is
 * that a permitted attempt now writes a pending row instead of a User.
 */

const TENANT = '69c7723868202a8e4616ef3d';
const EMAIL = 'member@example.com';
const MOBILE = '9080706050';

let phoneOwner: any = null;
let existingUser: any = null;

const sendOtp = jest.fn();
const create = jest.fn();
const pendingCreate = jest.fn();

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    // Both probes now chain .select().lean(): signup only reads these to decide whether a
    // conflict is real, and never loads a document it intends to write.
    findOne: (q: any) => ({
      select: () => ({ lean: async () => (q && q.phone ? phoneOwner : existingUser) }),
    }),
    create: (...a: any[]) => { create(...a); return Promise.resolve({ _id: 'new-id' }); },
  },
}));

/**
 * The pending row is what signup writes now, in place of an account. Recorded so the tests
 * below can assert that a permitted attempt got as far as storing one.
 */
jest.mock('../models/PendingPassportSignup', () => ({
  __esModule: true,
  default: {
    deleteMany: async () => ({ deletedCount: 0 }),
    create: (...a: any[]) => { pendingCreate(...a); return Promise.resolve(a[0]); },
  },
}));

jest.mock('../models/PassportConfig', () => ({
  __esModule: true,
  default: { findOne: async () => ({ enabled: true, onboardingFields: [] }) },
  DEFAULT_ONBOARDING_FIELDS: [],
  DEFAULT_ENTITLEMENTS: [],
}));

jest.mock('../models/Tenant', () => ({ __esModule: true, default: { findOne: () => ({ lean: async () => null }) } }));
jest.mock('../services/settingsService', () => ({ getStr: (_k: string, fallback = '') => fallback }));
jest.mock('../services/assessmentOtpService', () => ({
  sendOtp: (...a: any[]) => { sendOtp(...a); return Promise.resolve({ sent: true, channel: 'whatsapp' }); },
  verifyOtp: jest.fn(),
}));
jest.mock('../services/careerStageService', () => ({ resolveCareerProfile: () => ({}) }));
jest.mock('../config/secrets', () => ({ jwtSecret: () => 'test-secret' }));

// Mirrors the real predicate. Inlined rather than imported so this file does not pull in
// the population service's model graph; if the real one changes, this must follow.
jest.mock('../services/careerPilotPopulation', () => ({
  isCareerPilotMember: (p: any) => !!(p && (p.product || p.active === true || p.activatedAt || p.verifiedAt)),
}));

import { signup } from '../controllers/publicPassportController';

const body = { tenant: TENANT, name: 'A Member', email: EMAIL, mobile: MOBILE, fields: {} };

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

/** An existing row for EMAIL, with whatever passport state the case needs. */
function accountWith(passport: any) {
  return {
    _id: 'existing-id', email: EMAIL, phone: MOBILE, passport,
    isModified: () => false,
    save: jest.fn(),
  };
}

beforeEach(() => {
  sendOtp.mockReset();
  create.mockReset();
  pendingCreate.mockReset();
  phoneOwner = { email: EMAIL };   // same person: the one-mobile-one-account probe passes
  existingUser = null;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('a signup that already completed', () => {
  it('sends a verified but unpaid member to log in instead of resuming', async () => {
    existingUser = accountWith({ product: 'career_passport', active: false, verifiedAt: new Date('2026-08-21T16:05:59Z') });
    const res = mockRes();

    await signup({ body } as any, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('does not reissue an OTP for that account', async () => {
    existingUser = accountWith({ product: 'career_passport', active: false, verifiedAt: new Date() });

    await signup({ body } as any, mockRes());

    expect(sendOtp).not.toHaveBeenCalled();
  });

  it('still turns away a paid, active member', async () => {
    existingUser = accountWith({ product: 'career_passport', active: true, verifiedAt: new Date() });
    const res = mockRes();

    await signup({ body } as any, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(sendOtp).not.toHaveBeenCalled();
  });
});

describe('a signup that never completed', () => {
  it('is still resumable — an abandoned row gets a fresh code, not a wall', async () => {
    existingUser = accountWith({ product: 'career_passport', active: false });  // no verifiedAt
    const res = mockRes();

    await signup({ body } as any, res);

    expect(res.status).not.toHaveBeenCalledWith(409);
    expect(sendOtp).toHaveBeenCalled();
    // No account is written on this path at all — not a new one, and not the stranded row,
    // which is only taken over once the number has actually been proved.
    expect(create).not.toHaveBeenCalled();
    expect(pendingCreate).toHaveBeenCalled();
  });

  it('does NOT create an account yet when nothing exists for that email', async () => {
    phoneOwner = null;
    existingUser = null;
    const res = mockRes();

    await signup({ body } as any, res);

    // THE FIX. Creating the account here is what let a failed OTP claim a mobile number
    // permanently. It is created at verification, once ownership is proved.
    expect(create).not.toHaveBeenCalled();
    expect(pendingCreate).toHaveBeenCalled();
    expect(sendOtp).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(409);
  });
});
