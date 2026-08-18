import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import MailComposer from 'nodemailer/lib/mail-composer';
import * as settings from './settingsService';

/**
 * Amazon SES (v2 API) send path.
 *
 * Kept separate from emailService so the AWS SDK stays out of the SMTP/Brevo
 * paths — importing the client is what pulls in the credential chain, and a
 * tenant on Gmail should never pay that cost or fail on a missing region.
 *
 * Clients are cached per (region + key) because SESv2Client opens and reuses an
 * HTTPS agent; rebuilding one per email throws away connection reuse, which is
 * most of the latency win over SMTP.
 */

const _clients = new Map<string, SESv2Client>();

export interface SesAttachment {
  filename: string;
  content: Buffer;
}

export interface SesSendArgs {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: SesAttachment[];
  /** Threading headers — partner-outreach replies need these to land in-thread. */
  messageId?: string;
  inReplyTo?: string;
  references?: string | string[];
}

function cfg(key: string, tenantId?: string): string {
  return settings.getStr(key, '', tenantId);
}

/** True when SES has enough configuration to be usable for this tenant. */
export function sesConfigured(tenantId?: string): boolean {
  return Boolean(cfg('SES_REGION', tenantId));
}

function clientFor(tenantId?: string): SESv2Client {
  const region = cfg('SES_REGION', tenantId);
  if (!region) {
    throw new Error('SES_REGION is not set — configure it in Platform Settings → Email.');
  }
  const accessKeyId = cfg('SES_ACCESS_KEY_ID', tenantId);
  const secretAccessKey = cfg('SES_SECRET_ACCESS_KEY', tenantId);

  // Cache key includes the access key so rotating credentials in Platform
  // Settings takes effect without a restart (same reason emailService rebuilds
  // its transporter on a config signature change).
  const sig = `${region}|${accessKeyId}`;
  const cached = _clients.get(sig);
  if (cached) return cached;

  const client = new SESv2Client({
    region,
    // Explicit keys when provided, otherwise fall back to the ambient AWS
    // credential chain (env vars / instance role). The VPS is not EC2, so in
    // practice keys are set; leaving the fallback means an EC2 migration works
    // without a code change.
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });
  _clients.set(sig, client);
  return client;
}

let _warnedBadConfigSet = false;

/**
 * A configuration set is an AWS resource NAME (letters, digits, `-`, `_`), not a
 * URL. Pasting the SNS webhook endpoint in here is an easy mistake — the two sit
 * next to each other during setup — and SES rejects the whole SendEmail call on
 * an invalid name, so one wrong secondary field would stop every email.
 *
 * Sending matters more than event tracking, so a malformed value is dropped with
 * a loud, repeated warning rather than being allowed to break all mail. Silence
 * here would be worse: bounce tracking would be off with nothing to show why.
 */
function validConfigurationSet(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^[A-Za-z0-9_-]+$/.test(value)) return value;
  if (!_warnedBadConfigSet) {
    _warnedBadConfigSet = true;
    console.error(
      `[SES] ⚠️  SES_CONFIGURATION_SET is not a valid configuration set name: "${value}". ` +
      `Expected an AWS resource name such as "codebegun-events" — a URL belongs in the SNS ` +
      `subscription, not here. Ignoring it and sending WITHOUT event tracking, which means ` +
      `bounces and complaints will NOT reach the suppression list until this is corrected ` +
      `in Platform Settings → Email.`
    );
  }
  return '';
}

/**
 * Build a raw MIME message.
 *
 * SES v2 `Simple` content cannot carry attachments, and it also drops custom
 * headers — both of which sendGenericEmail relies on (fee receipts attach a
 * PDF; partner outreach sets List-Unsubscribe and In-Reply-To). Composing the
 * MIME ourselves and sending it as `Raw` is the only path that preserves them,
 * so we use it whenever attachments or custom headers are present.
 */
async function buildRawMime(args: SesSendArgs): Promise<Buffer> {
  const composer = new MailComposer({
    from: args.from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    ...(args.headers ? { headers: args.headers } : {}),
    ...(args.messageId ? { messageId: args.messageId } : {}),
    ...(args.inReplyTo ? { inReplyTo: args.inReplyTo } : {}),
    ...(args.references ? { references: args.references } : {}),
    ...(args.attachments?.length
      ? { attachments: args.attachments.map(a => ({ filename: a.filename, content: a.content })) }
      : {}),
  });
  return await composer.compile().build();
}

function needsRaw(args: SesSendArgs): boolean {
  return Boolean(
    args.attachments?.length ||
    args.headers ||
    args.messageId ||
    args.inReplyTo ||
    args.references
  );
}

/**
 * Send one email through SES. Returns the SES message id.
 *
 * Throws on failure — the caller (emailService.dispatch) owns retry and
 * transient-error classification so every provider retries by the same rules.
 */
export async function sendViaSes(args: SesSendArgs, tenantId?: string): Promise<string> {
  const client = clientFor(tenantId);
  const configurationSet = validConfigurationSet(cfg('SES_CONFIGURATION_SET', tenantId));

  const command = new SendEmailCommand({
    FromEmailAddress: args.from,
    Destination: { ToAddresses: [args.to] },
    ...(args.replyTo && !needsRaw(args) ? { ReplyToAddresses: [args.replyTo] } : {}),
    // A configuration set is what routes bounce/complaint/delivery events to
    // SNS. Without one, SES still sends but we learn nothing about what
    // happened, and EmailSuppression never gets populated.
    ...(configurationSet ? { ConfigurationSetName: configurationSet } : {}),
    Content: needsRaw(args)
      ? { Raw: { Data: await buildRawMime(args) } }
      : {
          Simple: {
            Subject: { Data: args.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: args.html, Charset: 'UTF-8' },
              Text: { Data: args.text, Charset: 'UTF-8' },
            },
          },
        },
  });

  const res = await client.send(command);
  return res.MessageId || '';
}

/**
 * SES throttles with a distinct error name rather than an SMTP code, so
 * emailService's SMTP-oriented classifier does not recognise it. Exposed here
 * so the retry rules stay with the provider that defines them.
 */
export function isTransientSesError(err: any): boolean {
  const name = String(err?.name || '');
  if (['ThrottlingException', 'TooManyRequestsException', 'ServiceUnavailable', 'RequestTimeout', 'InternalServiceErrorException'].includes(name)) {
    return true;
  }
  const status = err?.$metadata?.httpStatusCode;
  if (status === 429 || (typeof status === 'number' && status >= 500)) return true;
  // A sending-rate breach is retryable; a sending-quota breach for the day is not.
  return /maximum sending rate|throttl/i.test(String(err?.message || ''));
}
