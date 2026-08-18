import { Request, Response } from 'express';
import crypto from 'crypto';
import https from 'https';
import { suppress } from '../services/unsubscribeService';

/**
 * Amazon SES bounce/complaint intake, delivered over SNS.
 *
 * Why this endpoint has to verify signatures: it writes to the suppression list,
 * so an unauthenticated version would let anyone POST a fabricated "bounce" for
 * any address and permanently stop us mailing that student. Verification is what
 * makes the endpoint safe to expose publicly, which SNS requires.
 *
 * Wiring: SES configuration set → event destination → SNS topic → HTTPS
 * subscription pointing at POST /api/v1/public/ses-events.
 */

/** Cache of signing certs by URL — SNS reuses one cert for many messages. */
const _certCache = new Map<string, string>();

/**
 * SNS signing certs must come from Amazon. Without this check an attacker
 * supplies their own SigningCertURL, signs the payload with their own key, and
 * the signature "verifies" — the classic way SNS webhooks get spoofed.
 */
function isAmazonSnsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(u.hostname);
  } catch {
    return false;
  }
}

const isValidCertUrl = isAmazonSnsUrl;

function fetchCert(url: string): Promise<string> {
  const cached = _certCache.get(url);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`cert fetch failed: HTTP ${res.statusCode}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { body += c; });
      res.on('end', () => { _certCache.set(url, body); resolve(body); });
    }).on('error', reject);
  });
}

/** Fields that form the signed string, in the order AWS specifies (order matters). */
const SIGNED_FIELDS: Record<string, string[]> = {
  Notification: ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'],
  SubscriptionConfirmation: ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'],
  UnsubscribeConfirmation: ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'],
};

function canonicalString(msg: any): string {
  const fields = SIGNED_FIELDS[msg.Type];
  if (!fields) throw new Error(`unknown SNS message type: ${msg.Type}`);
  let out = '';
  for (const f of fields) {
    // Subject is optional — omitted entirely (not blank) when absent.
    if (msg[f] === undefined || msg[f] === null) continue;
    out += `${f}\n${msg[f]}\n`;
  }
  return out;
}

async function verifySnsSignature(msg: any): Promise<boolean> {
  const certUrl = String(msg.SigningCertURL || msg.SigningCertUrl || '');
  if (!isValidCertUrl(certUrl)) {
    console.warn('[SES-EVENTS] rejected: bad SigningCertURL', certUrl);
    return false;
  }
  const algo = String(msg.SignatureVersion) === '2' ? 'RSA-SHA256' : 'RSA-SHA1';
  try {
    const cert = await fetchCert(certUrl);
    const verifier = crypto.createVerify(algo);
    verifier.update(canonicalString(msg), 'utf8');
    return verifier.verify(cert, String(msg.Signature || ''), 'base64');
  } catch (err: any) {
    console.error('[SES-EVENTS] signature verification error:', err?.message);
    return false;
  }
}

/**
 * Confirm the subscription by GETting the URL SNS supplied.
 *
 * The host is re-checked even though the signature already verified: the
 * signature proves Amazon sent the message, and this proves we are not being
 * pointed at some third-party URL to make a blind request on Amazon's behalf.
 */
function confirmSubscription(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (!isAmazonSnsUrl(url)) {
      console.warn('[SES-EVENTS] refusing to confirm: SubscribeURL is not an SNS host —', url);
      return resolve();
    }
    https.get(url, res => { res.resume(); res.on('end', () => resolve()); })
      .on('error', err => { console.error('[SES-EVENTS] confirm failed:', err.message); resolve(); });
  });
}

/**
 * Extract addresses to suppress.
 *
 * Only PERMANENT bounces and complaints suppress. A Transient bounce is a full
 * mailbox or a temporary server problem — suppressing on those would quietly
 * cut off students whose inbox was briefly full.
 */
function addressesToSuppress(event: any): { email: string; reason: string }[] {
  const kind = event.eventType || event.notificationType;
  if (kind === 'Bounce' && event.bounce?.bounceType === 'Permanent') {
    return (event.bounce.bouncedRecipients || [])
      .map((r: any) => ({
        email: r.emailAddress,
        reason: `ses-hard-bounce:${event.bounce.bounceSubType || 'unknown'}`,
      }))
      .filter((r: any) => r.email);
  }
  if (kind === 'Complaint') {
    return (event.complaint?.complainedRecipients || [])
      .map((r: any) => ({
        email: r.emailAddress,
        reason: `ses-complaint:${event.complaint.complaintFeedbackType || 'unknown'}`,
      }))
      .filter((r: any) => r.email);
  }
  return [];
}

export async function sesEvents(req: Request, res: Response): Promise<void> {
  try {
    // SNS posts with Content-Type text/plain, so express.json() may hand us a
    // string (or nothing) rather than a parsed object.
    let msg: any = req.body;
    if (typeof msg === 'string') {
      msg = JSON.parse(msg);
    } else if (!msg || typeof msg !== 'object' || !msg.Type) {
      const raw = (req as any).rawBody;
      if (raw) msg = JSON.parse(raw.toString('utf8'));
    }

    if (!msg?.Type) {
      res.status(400).send('not an SNS message');
      return;
    }

    if (!(await verifySnsSignature(msg))) {
      // 403 and nothing else — do not reveal whether the topic or address exists.
      res.status(403).send('invalid signature');
      return;
    }

    if (msg.Type === 'SubscriptionConfirmation') {
      console.log('[SES-EVENTS] confirming SNS subscription for', msg.TopicArn);
      await confirmSubscription(String(msg.SubscribeURL));
      res.status(200).send('subscription confirmed');
      return;
    }

    if (msg.Type === 'Notification') {
      const event = typeof msg.Message === 'string' ? JSON.parse(msg.Message) : msg.Message;
      const targets = addressesToSuppress(event);
      for (const t of targets) {
        await suppress(t.email, 'ses', t.reason);
        console.log(`[SES-EVENTS] suppressed ${t.email} (${t.reason})`);
      }
      if (!targets.length) {
        console.log(`[SES-EVENTS] ${event?.eventType || event?.notificationType || 'event'} — no suppression needed`);
      }
    }

    // Always 200 on a verified message: a non-2xx makes SNS retry, and a
    // parse problem on our side will not fix itself on the third delivery.
    res.status(200).send('ok');
  } catch (err: any) {
    console.error('[SES-EVENTS] handler error:', err?.message);
    res.status(200).send('ok');
  }
}
