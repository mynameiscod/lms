/**
 * Provider routing in EmailService.dispatch().
 *
 * The eleven copy-pasted `if (useBrevoApi)` branches were collapsed into one
 * dispatch(); these tests pin the behaviour that collapse has to preserve —
 * every send method reaching the tenant's chosen provider, and a tenant pinned
 * to Brevo staying on Brevo after SES became the default.
 */

const sendViaSesMock = jest.fn();
jest.mock('../services/sesMailer', () => ({
  sendViaSes: (...args: any[]) => sendViaSesMock(...args),
  isTransientSesError: () => false,
  sesConfigured: () => true,
}));

const settingsValues: Record<string, string> = {};
jest.mock('../services/settingsService', () => ({
  getStr: (key: string, fallback = '') => settingsValues[key] ?? fallback,
  getNum: (_key: string, fallback = 0) => fallback,
}));

jest.mock('../services/unsubscribeService', () => ({
  isSuppressed: jest.fn().mockResolvedValue(false),
  suppress: jest.fn(),
  unsubscribeUrl: () => 'https://codebegun.com/u/x',
}));

const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'smtp-1', response: 'ok' });
jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn(() => ({ sendMail: sendMailMock })) },
}));

import { EmailService } from '../services/emailService';

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  sendViaSesMock.mockReset().mockResolvedValue('ses-1');
  sendMailMock.mockClear();
  for (const k of Object.keys(settingsValues)) delete settingsValues[k];
  settingsValues.EMAIL_FROM = 'CodeBegun <no-reply@codebegun.com>';
  settingsValues.SES_REGION = 'ap-south-1';

  fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 201,
    statusText: 'Created',
    json: async () => ({ messageId: 'brevo-1' }),
  });
  (global as any).fetch = fetchMock;
});

afterAll(() => { (global as any).fetch = originalFetch; });

describe('provider selection', () => {
  it('defaults to SES when the tenant has set nothing', async () => {
    // The cutover: unconfigured tenants must land on SES, not the old gmail default.
    await new EmailService().sendGenericEmail('a@example.com', 'Subj', '<p>Body</p>');
    expect(sendViaSesMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps a tenant pinned to Brevo on Brevo', async () => {
    // Per-tenant override is the rollback path — it must survive the default change.
    settingsValues.EMAIL_SERVICE = 'brevo';
    await new EmailService('tenant-1').sendGenericEmail('a@example.com', 'Subj', '<p>Body</p>');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('api.brevo.com');
    expect(sendViaSesMock).not.toHaveBeenCalled();
  });

  it('keeps a tenant pinned to SMTP on nodemailer', async () => {
    settingsValues.EMAIL_SERVICE = 'smtp';
    settingsValues.SMTP_HOST = 'smtp.hostinger.com';
    await new EmailService('tenant-2').sendGenericEmail('a@example.com', 'Subj', '<p>Body</p>');
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendViaSesMock).not.toHaveBeenCalled();
  });

  it('routes an unrecognised provider value to the default rather than failing', async () => {
    settingsValues.EMAIL_SERVICE = 'mailgun-typo';
    await new EmailService().sendGenericEmail('a@example.com', 'Subj', '<p>Body</p>');
    expect(sendViaSesMock).toHaveBeenCalledTimes(1);
  });
});

describe('every send method reaches the provider', () => {
  it('routes the welcome email through SES', async () => {
    await new EmailService().sendWelcomeEmail('s@example.com', 'Asha', 'https://x/setup');
    expect(sendViaSesMock).toHaveBeenCalledTimes(1);
  });

  it('routes the password reset through SES', async () => {
    await new EmailService().sendPasswordResetEmail('s@example.com', 'Asha', 'https://x/reset');
    expect(sendViaSesMock).toHaveBeenCalledTimes(1);
  });

  it('routes the test email through SES', async () => {
    await new EmailService().sendTestEmail('s@example.com');
    expect(sendViaSesMock).toHaveBeenCalledTimes(1);
  });
});

describe('payload passed to SES', () => {
  it('forwards the From header, attachments and threading opts', async () => {
    await new EmailService().sendGenericEmail(
      'a@example.com',
      'Receipt',
      '<p>Receipt</p>',
      'Receipt',
      [{ filename: 'r.pdf', content: Buffer.from('pdf') }],
      { replyTo: 'fees@codebegun.com', headers: { 'List-Unsubscribe': '<https://x>' } } as any,
    );
    const [args, tenantId] = sendViaSesMock.mock.calls[0];
    expect(args.from).toBe('CodeBegun <no-reply@codebegun.com>');
    expect(args.to).toBe('a@example.com');
    expect(args.attachments).toHaveLength(1);
    expect(args.replyTo).toBe('fees@codebegun.com');
    expect(args.headers['List-Unsubscribe']).toBe('<https://x>');
    expect(tenantId).toBeUndefined();
  });

  it('passes the tenantId through so SES credentials resolve per tenant', async () => {
    await new EmailService('tenant-9').sendGenericEmail('a@example.com', 'S', '<p>B</p>');
    expect(sendViaSesMock.mock.calls[0][1]).toBe('tenant-9');
  });
});

describe('suppression still applies', () => {
  it('does not send to a suppressed address on any provider', async () => {
    const { isSuppressed } = require('../services/unsubscribeService');
    (isSuppressed as jest.Mock).mockResolvedValueOnce(true);
    const ok = await new EmailService().sendGenericEmail('blocked@example.com', 'S', '<p>B</p>');
    expect(ok).toBe(false);
    expect(sendViaSesMock).not.toHaveBeenCalled();
  });
});
