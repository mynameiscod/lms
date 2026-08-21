/**
 * The OTP test-number allowlist.
 *
 * Exercising the signup funnel repeatedly needs a way to see the code without holding the
 * phone. The dangerous version of that is a global switch, because it removes phone
 * ownership verification for EVERY signup while it is on — anyone could register any email
 * and read the code out of the API response — and a "temporary" switch on a live product
 * outlives its reason.
 *
 * These pin the property that makes the allowlist safe instead: a number that is not on the
 * list must never have its code returned, whatever the list contains.
 */

const settingsValues: Record<string, string> = {};
jest.mock('../services/settingsService', () => ({
  getStr: (key: string, fallback = '') => settingsValues[key] ?? fallback,
  getNum: (_k: string, fallback = 0) => fallback,
}));

const findOne = jest.fn();
const findOneAndUpdate = jest.fn();
jest.mock('../models/AssessmentOtp', () => ({
  __esModule: true,
  default: {
    findOne: (...a: any[]) => findOne(...a),
    findOneAndUpdate: (...a: any[]) => { findOneAndUpdate(...a); return Promise.resolve({}); },
  },
}));

// No WhatsApp credentials anywhere, so a non-test number takes the "send failed" path.
jest.mock('../models/LeadSourceConfig', () => ({
  __esModule: true,
  default: { find: () => ({ lean: async () => [] }), findOne: () => ({ lean: async () => null }) },
}));
jest.mock('../controllers/leadSourceConfigController', () => ({ getDecryptedTokens: async () => null }));

import { sendOtp } from '../services/assessmentOtpService';

const TENANT = 't1';

beforeEach(() => {
  for (const k of Object.keys(settingsValues)) delete settingsValues[k];
  findOne.mockReset().mockResolvedValue(null);   // no throttle
  findOneAndUpdate.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('an allowlisted test number', () => {
  it('gets its code back instead of a message', async () => {
    settingsValues.OTP_TEST_NUMBERS = '9573516868';
    const r = await sendOtp(TENANT, 'tok', '9573516868');

    expect(r.testNumber).toBe(true);
    expect(r.sent).toBe(false);
    expect(r.devCode).toMatch(/^\d{6}$/);
  });

  it('matches regardless of how the number is written', async () => {
    // A list that only worked for one formatting would fail silently and look switched off.
    settingsValues.OTP_TEST_NUMBERS = '+91 95735 16868';
    for (const form of ['9573516868', '919573516868', '+91-9573516868']) {
      const r = await sendOtp(TENANT, 'tok', form);
      expect(r.testNumber).toBe(true);
    }
  });

  it('is one of several on the list', async () => {
    settingsValues.OTP_TEST_NUMBERS = '9876543210, 9573516868 ,9000000000';
    expect((await sendOtp(TENANT, 'tok', '9573516868')).testNumber).toBe(true);
  });
});

describe('everybody else', () => {
  it('is NOT treated as a test number when the list is empty', async () => {
    const r = await sendOtp(TENANT, 'tok', '9573516868');
    expect(r.testNumber).toBeUndefined();
  });

  it('is NOT treated as a test number when the list holds someone else', async () => {
    // The property that makes this safe: an allowlist cannot leak onto a real signup.
    settingsValues.OTP_TEST_NUMBERS = '9876543210';
    const r = await sendOtp(TENANT, 'tok', '9573516868');
    expect(r.testNumber).toBeUndefined();
  });

  it('is unaffected by a list of only separators or blanks', async () => {
    settingsValues.OTP_TEST_NUMBERS = ' , , ';
    const r = await sendOtp(TENANT, 'tok', '9573516868');
    expect(r.testNumber).toBeUndefined();
  });
});

describe('throttling still applies first', () => {
  it('does not hand out a code for a resend inside the throttle window', async () => {
    settingsValues.OTP_TEST_NUMBERS = '9573516868';
    findOne.mockResolvedValue({ lastSentAt: new Date() });

    const r = await sendOtp(TENANT, 'tok', '9573516868');
    expect(r.devCode).toBeUndefined();
    expect(r.throttledSeconds).toBeGreaterThan(0);
  });
});
