/**
 * Amazon SES send path.
 *
 * The two things worth pinning down are the ones that fail silently in
 * production: choosing Simple content when attachments/headers are present
 * (SES drops them without erroring), and treating a throttle as fatal.
 */

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: jest.fn().mockImplementation((input: any) => ({ input })),
}));

const settingsValues: Record<string, string> = {};
jest.mock('../services/settingsService', () => ({
  getStr: (key: string, fallback = '') => settingsValues[key] ?? fallback,
  getNum: (_key: string, fallback = 0) => fallback,
}));

import { sendViaSes, isTransientSesError, sesConfigured } from '../services/sesMailer';

beforeEach(() => {
  mockSend.mockReset();
  mockSend.mockResolvedValue({ MessageId: 'ses-msg-1' });
  for (const k of Object.keys(settingsValues)) delete settingsValues[k];
  settingsValues.SES_REGION = 'ap-south-1';
  settingsValues.SES_ACCESS_KEY_ID = 'AKIATEST';
  settingsValues.SES_SECRET_ACCESS_KEY = 'secret';
});

const base = {
  from: 'CodeBegun <no-reply@codebegun.com>',
  to: 'student@example.com',
  subject: 'Hello',
  html: '<p>Hi</p>',
  text: 'Hi',
};

describe('sendViaSes', () => {
  it('sends Simple content for a plain email', async () => {
    const id = await sendViaSes({ ...base });
    expect(id).toBe('ses-msg-1');
    const { input } = mockSend.mock.calls[0][0];
    expect(input.Content.Simple).toBeDefined();
    expect(input.Content.Raw).toBeUndefined();
    expect(input.Destination.ToAddresses).toEqual(['student@example.com']);
  });

  it('switches to Raw MIME when an attachment is present', async () => {
    // SES Simple content silently discards attachments — a fee receipt would
    // arrive with no PDF and no error anywhere.
    await sendViaSes({
      ...base,
      attachments: [{ filename: 'receipt.pdf', content: Buffer.from('%PDF-1.4 fake') }],
    });
    const { input } = mockSend.mock.calls[0][0];
    expect(input.Content.Raw).toBeDefined();
    expect(input.Content.Simple).toBeUndefined();

    const mime = Buffer.from(input.Content.Raw.Data).toString('utf8');
    expect(mime).toContain('receipt.pdf');
    expect(mime).toContain('Subject: Hello');
  });

  it('switches to Raw MIME when custom headers are present', async () => {
    // List-Unsubscribe is a deliverability requirement for bulk sends and is
    // not expressible in Simple content.
    await sendViaSes({
      ...base,
      headers: { 'List-Unsubscribe': '<https://codebegun.com/u/abc>' },
    });
    const { input } = mockSend.mock.calls[0][0];
    expect(input.Content.Raw).toBeDefined();
    const mime = Buffer.from(input.Content.Raw.Data).toString('utf8');
    expect(mime).toContain('List-Unsubscribe');
  });

  it('preserves threading headers for partner-outreach replies', async () => {
    await sendViaSes({
      ...base,
      inReplyTo: '<parent@codebegun.com>',
      references: '<parent@codebegun.com>',
    });
    const { input } = mockSend.mock.calls[0][0];
    const mime = Buffer.from(input.Content.Raw.Data).toString('utf8');
    expect(mime).toContain('In-Reply-To: <parent@codebegun.com>');
    expect(mime).toContain('References: <parent@codebegun.com>');
  });

  it('attaches the configuration set when one is configured', async () => {
    settingsValues.SES_CONFIGURATION_SET = 'codebegun-events';
    await sendViaSes({ ...base });
    const { input } = mockSend.mock.calls[0][0];
    expect(input.ConfigurationSetName).toBe('codebegun-events');
  });

  it('omits the configuration set when none is configured', async () => {
    await sendViaSes({ ...base });
    const { input } = mockSend.mock.calls[0][0];
    expect(input.ConfigurationSetName).toBeUndefined();
  });

  it('fails loudly when the region is missing', async () => {
    delete settingsValues.SES_REGION;
    await expect(sendViaSes({ ...base })).rejects.toThrow(/SES_REGION/);
  });
});

describe('sesConfigured', () => {
  it('is false without a region', () => {
    delete settingsValues.SES_REGION;
    expect(sesConfigured()).toBe(false);
  });
  it('is true with a region', () => {
    expect(sesConfigured()).toBe(true);
  });
});

describe('isTransientSesError', () => {
  it('retries throttling', () => {
    expect(isTransientSesError({ name: 'ThrottlingException' })).toBe(true);
    expect(isTransientSesError({ name: 'TooManyRequestsException' })).toBe(true);
  });

  it('retries 429 and 5xx', () => {
    expect(isTransientSesError({ $metadata: { httpStatusCode: 429 } })).toBe(true);
    expect(isTransientSesError({ $metadata: { httpStatusCode: 503 } })).toBe(true);
  });

  it('does NOT retry a rejected or unverified address', () => {
    // Retrying these burns quota and hurts reputation — they never succeed.
    expect(isTransientSesError({ name: 'MessageRejected', $metadata: { httpStatusCode: 400 } })).toBe(false);
    expect(isTransientSesError({ name: 'MailFromDomainNotVerifiedException', $metadata: { httpStatusCode: 400 } })).toBe(false);
    expect(isTransientSesError({ name: 'AccountSuspendedException', $metadata: { httpStatusCode: 400 } })).toBe(false);
  });
});
