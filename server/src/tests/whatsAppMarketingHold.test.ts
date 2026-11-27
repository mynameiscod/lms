/**
 * Meta error 131049: a MARKETING message held back by the per-person marketing limit. A test send of a
 * marketing template to a number that was just held back, and has not messaged us since, is stopped
 * with a clear reason (409 MARKETING_HELD) unless the admin chooses to send anyway.
 */
const state: { held: any; thread: any; template: any } = { held: null, thread: null, template: null };
const lean = (v: () => any) => ({ sort: () => ({ select: () => ({ lean: async () => v() }) }), select: () => ({ lean: async () => v() }) });

jest.mock('../models/WhatsAppMessageLog', () => ({ __esModule: true, default: { findOne: jest.fn(() => lean(() => state.held)) } }));
jest.mock('../models/WhatsAppThread', () => ({ __esModule: true, default: { findOne: jest.fn(() => lean(() => state.thread)) } }));
jest.mock('../models/WhatsAppTemplate', () => ({ __esModule: true, default: { findOne: jest.fn(async () => state.template) } }));
jest.mock('../services/assessmentOtpService', () => ({
  getWhatsAppCredentialCandidates: jest.fn(async () => [{ phoneNumberId: 'p', accessToken: 't' }]),
  waPost: jest.fn(async () => ({ ok: true, messageId: 'wamid.1' })),
  normalizeTo: (p: string) => { let to = String(p || '').replace(/[^0-9+]/g, '').replace(/^\+/, ''); if (to.length === 10) to = '91' + to; return to; },
}));
jest.mock('../services/whatsAppDeliveryService', () => ({ recordSend: jest.fn(async () => {}) }));
jest.mock('../services/whatsAppChatStore', () => ({ recordOutbound: jest.fn(async () => {}), renderTemplateBody: () => '' }));
jest.mock('../services/whatsAppTemplateShape', () => ({ templateShape: jest.fn(), buildSendComponents: () => [], varIndexes: () => [] }));

import { sendTest, marketingHeldFor, WaTemplateError } from '../services/whatsAppTemplateService';
import { waPost } from '../services/assessmentOtpService';

const TENANT = '64b000000000000000000001';
const tpl = (category: string) => ({ _id: 'x', name: 'brand', language: 'en', status: 'APPROVED', category, body: '' });

beforeEach(() => {
  state.held = null; state.thread = null; state.template = tpl('MARKETING');
  (waPost as jest.Mock).mockClear();
});

describe('marketingHeldFor', () => {
  it('is null when nothing was held back', async () => {
    expect(await marketingHeldFor(TENANT, '7330624595')).toBeNull();
  });

  it('reports the hold when there is no reply since', async () => {
    state.held = { createdAt: new Date(Date.now() - 60_000) };
    expect(await marketingHeldFor(TENANT, '7330624595')).toEqual(state.held.createdAt);
  });

  it('a message from the person after the hold clears it', async () => {
    state.held = { createdAt: new Date(Date.now() - 60_000) };
    state.thread = { lastInboundAt: new Date() };
    expect(await marketingHeldFor(TENANT, '7330624595')).toBeNull();
  });
});

describe('sendTest', () => {
  it('stops a repeat marketing test with 409 MARKETING_HELD and sends nothing', async () => {
    state.held = { createdAt: new Date(Date.now() - 60_000) };
    const err = await sendTest(TENANT, 'x', '+917330624595', []).catch((e) => e);
    expect(err).toBeInstanceOf(WaTemplateError);
    expect(err).toMatchObject({ status: 409, code: 'MARKETING_HELD' });
    expect(err.message).toMatch(/131049/);
    expect(waPost).not.toHaveBeenCalled();
  });

  it('sends anyway when forced', async () => {
    state.held = { createdAt: new Date(Date.now() - 60_000) };
    const r = await sendTest(TENANT, 'x', '+917330624595', [], undefined, undefined, true);
    expect(r.ok).toBe(true);
    expect(waPost).toHaveBeenCalledTimes(1);
  });

  it('never blocks a UTILITY template', async () => {
    state.template = tpl('UTILITY');
    state.held = { createdAt: new Date(Date.now() - 60_000) };
    const r = await sendTest(TENANT, 'x', '+917330624595', []);
    expect(r.ok).toBe(true);
  });
});
