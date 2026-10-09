/**
 * Step 4 (2026-10-09): an institute uses its OWN payment/WhatsApp/ad credentials. Only the platform
 * owner (CodeBegun) falls back to the platform values — before, every institute did, so a college's
 * fees went into CodeBegun's Razorpay account and its WhatsApp went out from CodeBegun's number.
 */
const OWNER = '69c7723868202a8e4616ef3d';
const COLLEGE = '6ac8c2f377f023a80d249660';
const HALF = '6ac8c2f377f023a80d249661';

const rows: any[] = [
  { key: 'RAZORPAY_KEY_ID', value: 'rzp_live_PLATFORM', isSecret: false },
  { key: 'RAZORPAY_KEY_SECRET', value: 'platform-secret', isSecret: false },
  { key: 'UPI_ID', value: 'codebegun@upi', isSecret: false },
  { key: 'RAZORPAY_KEY_ID', value: 'rzp_live_COLLEGE', isSecret: false, tenantId: { toString: () => COLLEGE } },
  { key: 'RAZORPAY_KEY_SECRET', value: 'college-secret', isSecret: false, tenantId: { toString: () => COLLEGE } },
  // A half-configured institute: its own key id, no secret.
  { key: 'RAZORPAY_KEY_ID', value: 'rzp_test_HALF', isSecret: false, tenantId: { toString: () => HALF } },
];
jest.mock('../models/SystemSetting', () => ({ __esModule: true, default: { find: () => ({ lean: async () => rows }) } }));
jest.mock('../models/LeadSourceConfig', () => ({ __esModule: true, default: { findOne: () => ({ lean: async () => null }) } }));
jest.mock('../controllers/leadSourceConfigController', () => ({ getDecryptedTokens: async () => null }));

import * as settings from '../services/settingsService';
import { getConfig as razorpayConfig } from '../services/razorpayService';
import { getWhatsAppCredentialCandidates } from '../services/assessmentOtpService';

beforeAll(async () => {
  await settings.loadAll(); // mirrors platform values into process.env, so set the env after it
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'platform-pid';
  process.env.WHATSAPP_ACCESS_TOKEN = 'platform-token';
  settings.setPlatformOwnerTenant(OWNER);
});

describe('Razorpay', () => {
  it('the platform owner keeps the platform keys', () => {
    expect(razorpayConfig(OWNER)?.keyId).toBe('rzp_live_PLATFORM');
  });

  it('a college with its own keys uses them', () => {
    expect(razorpayConfig(COLLEGE)).toMatchObject({ keyId: 'rzp_live_COLLEGE', keySecret: 'college-secret' });
  });

  it('a college without keys gets none — never CodeBegun\'s', () => {
    expect(razorpayConfig('6ac8c2f377f023a80d249662')).toBeNull();
  });

  it('a half-configured college never mixes its key id with the platform secret', () => {
    expect(razorpayConfig(HALF)).toBeNull();
  });
});

describe('getCredential', () => {
  it('UPI: the owner falls back to the platform value, a college does not', () => {
    expect(settings.getCredential('UPI_ID', OWNER)).toBe('codebegun@upi');
    expect(settings.getCredential('UPI_ID', COLLEGE)).toBe('');
  });

  it('system work with no institute uses the platform value', () => {
    expect(settings.getCredential('UPI_ID')).toBe('codebegun@upi');
  });

  it('with no owner configured, every institute keeps the old fallback (CodeBegun is never cut off)', () => {
    settings.setPlatformOwnerTenant(null);
    expect(settings.getCredential('UPI_ID', COLLEGE)).toBe('codebegun@upi');
    settings.setPlatformOwnerTenant(OWNER);
  });
});

describe('WhatsApp', () => {
  it('a college without its own connection gets no number (not CodeBegun\'s)', async () => {
    expect(await getWhatsAppCredentialCandidates(COLLEGE)).toEqual([]);
  });

  it('the platform owner still gets the platform number', async () => {
    expect(await getWhatsAppCredentialCandidates(OWNER)).toEqual([{ phoneNumberId: 'platform-pid', accessToken: 'platform-token' }]);
  });
});
