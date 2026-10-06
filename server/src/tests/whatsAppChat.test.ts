import crypto from 'crypto';

const settingsValues: Record<string, string> = {};
jest.mock('../services/settingsService', () => ({
  getStr: (k: string, fallback = '') => (settingsValues[k] ?? fallback),
  get: (k: string) => settingsValues[k],
}));

const threads: any = { lastInboundAt: null };
jest.mock('../models/WhatsAppThread', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(() => ({ select: () => ({ lean: async () => threads }), populate: () => ({ lean: async () => threads }) })),
    updateOne: jest.fn(async () => ({})),
  },
}));
const waPost = jest.fn(async () => ({ ok: true, messageId: 'wamid.X' }));
jest.mock('../services/assessmentOtpService', () => ({
  getWhatsAppCredentialCandidates: jest.fn(async () => [{ phoneNumberId: '1', accessToken: 't' }]),
  waPost: (...a: any[]) => (waPost as any)(...a),
  normalizeTo: (p: string) => { let to = String(p || '').replace(/[^0-9+]/g, '').replace(/^\+/, ''); if (to.length === 10) to = '91' + to; return to; },
}));
jest.mock('../services/whatsAppDeliveryService', () => ({ recordSend: jest.fn(async () => {}), explainWaError: (_c: any, f?: string) => f || 'x' }));
jest.mock('../services/whatsAppChatStore', () => {
  const actual = jest.requireActual('../services/whatsAppChatStore');
  return { ...actual, recordOutbound: jest.fn(async () => ({})) };
});

import { parseInbound, renderTemplateBody } from '../services/whatsAppChatStore';
import { windowOf, sendText, ChatError } from '../services/whatsAppChatService';
import { verifyMetaSignature } from '../services/whatsAppWebhookSignature';

const TENANT = '69c7723868202a8e4616ef3d';

describe('parseInbound — every kind of message a person can send is kept', () => {
  it('reads text and button replies, which also feed the bot', () => {
    expect(parseInbound({ type: 'text', text: { body: 'Interested' } })).toMatchObject({ kind: 'text', body: 'Interested', botText: 'Interested' });
    expect(parseInbound({ type: 'interactive', interactive: { button_reply: { id: 'a', title: 'Yes' } } })).toMatchObject({ kind: 'button', botText: 'Yes' });
    expect(parseInbound({ type: 'button', button: { text: 'Call me' } })).toMatchObject({ kind: 'button', botText: 'Call me' });
  });

  it('keeps photos and PDFs with their media id, and does not feed them to the bot', () => {
    const doc = parseInbound({ type: 'document', document: { id: 'M1', filename: 'resume.pdf', mime_type: 'application/pdf', caption: 'My CV' } });
    expect(doc).toMatchObject({ kind: 'document', body: 'My CV', botText: '', media: { metaMediaId: 'M1', fileName: 'resume.pdf' } });
    expect(parseInbound({ type: 'image', image: { id: 'M2', mime_type: 'image/jpeg' } }).kind).toBe('image');
  });

  it('turns a location into a maps link and never drops an unknown type', () => {
    expect(parseInbound({ type: 'location', location: { latitude: 17.4, longitude: 78.5, name: 'Ameerpet' } }).body).toContain('maps.google.com/?q=17.4,78.5');
    expect(parseInbound({ type: 'something_new' }).kind).toBe('unsupported');
  });
});

describe('renderTemplateBody', () => {
  it('fills {{n}} with the values sent, leaving missing ones visible', () => {
    expect(renderTemplateBody('Hi {{1}}, see you {{2}} at {{3}}', ['Ravi', 'Monday'])).toBe('Hi Ravi, see you Monday at {{3}}');
  });
});

describe('24-hour reply window', () => {
  it('is open for 24h after the last inbound message, closed after, and closed when they never wrote', () => {
    expect(windowOf(new Date(Date.now() - 23 * 3600_000)).open).toBe(true);
    expect(windowOf(new Date(Date.now() - 25 * 3600_000)).open).toBe(false);
    expect(windowOf(undefined).open).toBe(false);
  });

  it('refuses a free-text reply when the window is closed, without calling Meta', async () => {
    threads.lastInboundAt = new Date(Date.now() - 30 * 3600_000);
    waPost.mockClear();
    await expect(sendText(TENANT, '', '9876543210', 'Hello')).rejects.toBeInstanceOf(ChatError);
    expect(waPost).not.toHaveBeenCalled();
  });

  it('sends when the window is open', async () => {
    threads.lastInboundAt = new Date(Date.now() - 3600_000);
    waPost.mockClear();
    await sendText(TENANT, '', '9876543210', 'Hello');
    expect(waPost).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ to: '919876543210', type: 'text' }));
  });
});

describe('verifyMetaSignature', () => {
  const body = Buffer.from('{"object":"whatsapp_business_account"}');
  const sign = (secret: string) => 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  beforeEach(() => { for (const k of Object.keys(settingsValues)) delete settingsValues[k]; });

  it('accepts a correctly signed call in every mode', () => {
    settingsValues.WHATSAPP_APP_SECRET = 's3cret';
    settingsValues.WHATSAPP_WEBHOOK_SIGNATURE = 'enforce';
    expect(verifyMetaSignature(body, sign('s3cret'))).toEqual({ accept: true });
  });

  it('rejects a forged or unsigned call when enforcing', () => {
    settingsValues.WHATSAPP_APP_SECRET = 's3cret';
    settingsValues.WHATSAPP_WEBHOOK_SIGNATURE = 'enforce';
    expect(verifyMetaSignature(body, sign('wrong')).accept).toBe(false);
    expect(verifyMetaSignature(body, undefined).accept).toBe(false);
  });

  it('only logs a mismatch in the default "log" mode', () => {
    settingsValues.WHATSAPP_APP_SECRET = 's3cret';
    expect(verifyMetaSignature(body, sign('wrong'))).toEqual({ accept: true, reason: 'signature mismatch' });
  });

  it('never drops messages for want of a secret, even when enforcing', () => {
    settingsValues.WHATSAPP_WEBHOOK_SIGNATURE = 'enforce';
    expect(verifyMetaSignature(body, sign('x')).accept).toBe(true);
  });

  it('falls back to the Lead Ads app secret', () => {
    settingsValues.META_APP_SECRET = 'lead-ads';
    settingsValues.WHATSAPP_WEBHOOK_SIGNATURE = 'enforce';
    expect(verifyMetaSignature(body, sign('lead-ads')).accept).toBe(true);
  });
});
