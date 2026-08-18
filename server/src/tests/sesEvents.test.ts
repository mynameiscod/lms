/**
 * SES bounce/complaint intake.
 *
 * This endpoint is public and writes to the suppression list, so the property
 * that matters most is that a forged POST cannot stop us mailing a student.
 * The tests sign with a real throwaway RSA key and stub the cert fetch, which
 * exercises the actual crypto path rather than a mocked-away one.
 */

import crypto from 'crypto';
import https from 'https';
import { EventEmitter } from 'events';

const suppressMock = jest.fn();
jest.mock('../services/unsubscribeService', () => ({
  suppress: (...args: any[]) => suppressMock(...args),
  isSuppressed: jest.fn().mockResolvedValue(false),
}));

import { sesEvents } from '../controllers/sesEventsController';

// A real keypair — the controller verifies with genuine crypto, so a fake
// signature has to actually fail verification, not just look wrong.
const { privateKey, certPem } = (() => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  return { privateKey, certPem: publicKey.export({ type: 'spki', format: 'pem' }).toString() };
})();

const CERT_URL = 'https://sns.ap-south-1.amazonaws.com/SimpleNotificationService-abc123.pem';

/** Stub https.get for both the cert fetch and the SubscribeURL confirmation. */
let httpsGetSpy: jest.SpyInstance;
let confirmedUrls: string[] = [];

beforeEach(() => {
  suppressMock.mockReset();
  confirmedUrls = [];
  httpsGetSpy = jest.spyOn(https, 'get').mockImplementation(((url: any, cb: any) => {
    const res: any = new EventEmitter();
    res.statusCode = 200;
    res.setEncoding = () => {};
    res.resume = () => { res.emit('end'); };
    const urlStr = String(url);
    if (urlStr.includes('.pem')) {
      process.nextTick(() => { cb(res); res.emit('data', certPem); res.emit('end'); });
    } else {
      confirmedUrls.push(urlStr);
      process.nextTick(() => { cb(res); res.emit('end'); });
    }
    return new EventEmitter() as any;
  }) as any);
});

afterEach(() => httpsGetSpy.mockRestore());

const SIGNED_FIELDS: Record<string, string[]> = {
  Notification: ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'],
  SubscriptionConfirmation: ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'],
};

function sign(msg: any): any {
  let canonical = '';
  for (const f of SIGNED_FIELDS[msg.Type]) {
    if (msg[f] === undefined || msg[f] === null) continue;
    canonical += `${f}\n${msg[f]}\n`;
  }
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(canonical, 'utf8');
  return { ...msg, SignatureVersion: '1', SigningCertURL: CERT_URL, Signature: signer.sign(privateKey, 'base64') };
}

function notification(event: any, overrides: any = {}): any {
  return sign({
    Type: 'Notification',
    MessageId: 'm-1',
    TopicArn: 'arn:aws:sns:ap-south-1:1234:codebegun-events',
    Message: JSON.stringify(event),
    Timestamp: '2026-08-18T10:00:00.000Z',
    ...overrides,
  });
}

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

const run = async (body: any) => {
  const res = mockRes();
  await sesEvents({ body } as any, res);
  return res;
};

const hardBounce = {
  eventType: 'Bounce',
  bounce: {
    bounceType: 'Permanent',
    bounceSubType: 'NoEmail',
    bouncedRecipients: [{ emailAddress: 'gone@example.com' }],
  },
};

describe('signature verification', () => {
  it('rejects a forged bounce and suppresses nobody', async () => {
    // The whole point: without this, anyone can silence mail to any student.
    const forged = { ...notification(hardBounce), Signature: Buffer.from('nonsense').toString('base64') };
    const res = await run(forged);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(suppressMock).not.toHaveBeenCalled();
  });

  it('rejects a signing cert hosted off Amazon', async () => {
    // An attacker-supplied cert URL would otherwise let them sign their own
    // payload with their own key and have it verify cleanly.
    const msg = { ...notification(hardBounce), SigningCertURL: 'https://evil.example.com/cert.pem' };
    const res = await run(msg);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(suppressMock).not.toHaveBeenCalled();
  });

  it('rejects a tampered payload that keeps a valid signature', async () => {
    const msg = notification(hardBounce);
    msg.Message = JSON.stringify({
      ...hardBounce,
      bounce: { ...hardBounce.bounce, bouncedRecipients: [{ emailAddress: 'victim@example.com' }] },
    });
    const res = await run(msg);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(suppressMock).not.toHaveBeenCalled();
  });

  it('accepts a correctly signed message', async () => {
    const res = await run(notification(hardBounce));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(suppressMock).toHaveBeenCalledWith('gone@example.com', 'ses', 'ses-hard-bounce:NoEmail');
  });
});

describe('suppression rules', () => {
  it('suppresses a complaint', async () => {
    await run(notification({
      eventType: 'Complaint',
      complaint: {
        complaintFeedbackType: 'abuse',
        complainedRecipients: [{ emailAddress: 'angry@example.com' }],
      },
    }));
    expect(suppressMock).toHaveBeenCalledWith('angry@example.com', 'ses', 'ses-complaint:abuse');
  });

  it('does NOT suppress a transient bounce', async () => {
    // A full mailbox is temporary; suppressing would cut the student off for good.
    await run(notification({
      eventType: 'Bounce',
      bounce: {
        bounceType: 'Transient',
        bounceSubType: 'MailboxFull',
        bouncedRecipients: [{ emailAddress: 'full@example.com' }],
      },
    }));
    expect(suppressMock).not.toHaveBeenCalled();
  });

  it('does NOT suppress on a successful delivery', async () => {
    await run(notification({ eventType: 'Delivery', delivery: { recipients: ['ok@example.com'] } }));
    expect(suppressMock).not.toHaveBeenCalled();
  });

  it('handles the legacy notificationType field', async () => {
    // SNS destinations configured the older way send notificationType, not eventType.
    await run(notification({
      notificationType: 'Bounce',
      bounce: {
        bounceType: 'Permanent',
        bounceSubType: 'General',
        bouncedRecipients: [{ emailAddress: 'old@example.com' }],
      },
    }));
    expect(suppressMock).toHaveBeenCalledWith('old@example.com', 'ses', 'ses-hard-bounce:General');
  });

  it('suppresses every recipient of a multi-recipient bounce', async () => {
    await run(notification({
      eventType: 'Bounce',
      bounce: {
        bounceType: 'Permanent',
        bounceSubType: 'General',
        bouncedRecipients: [{ emailAddress: 'a@example.com' }, { emailAddress: 'b@example.com' }],
      },
    }));
    expect(suppressMock).toHaveBeenCalledTimes(2);
  });
});

describe('subscription confirmation', () => {
  it('confirms a signed subscription request', async () => {
    const msg = sign({
      Type: 'SubscriptionConfirmation',
      MessageId: 'm-2',
      Token: 'tok',
      TopicArn: 'arn:aws:sns:ap-south-1:1234:codebegun-events',
      Message: 'You have chosen to subscribe',
      SubscribeURL: 'https://sns.ap-south-1.amazonaws.com/?Action=ConfirmSubscription&Token=tok',
      Timestamp: '2026-08-18T10:00:00.000Z',
    });
    const res = await run(msg);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(confirmedUrls).toHaveLength(1);
  });

  it('refuses to fetch a SubscribeURL pointing off Amazon', async () => {
    // Prevents the endpoint being used to make blind requests to arbitrary hosts.
    const msg = sign({
      Type: 'SubscriptionConfirmation',
      MessageId: 'm-3',
      Token: 'tok',
      TopicArn: 'arn:aws:sns:ap-south-1:1234:codebegun-events',
      Message: 'You have chosen to subscribe',
      SubscribeURL: 'https://evil.example.com/steal',
      Timestamp: '2026-08-18T10:00:00.000Z',
    });
    await run(msg);
    expect(confirmedUrls).toHaveLength(0);
  });
});

describe('malformed input', () => {
  it('400s on a body that is not an SNS message', async () => {
    const res = await run({ hello: 'world' });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('parses a JSON string body (SNS posts text/plain)', async () => {
    const res = await run(JSON.stringify(notification(hardBounce)));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(suppressMock).toHaveBeenCalled();
  });
});
