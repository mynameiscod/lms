import crypto from 'crypto';
import { verifyHubSignature } from '../services/whatsAppWebhookSignature';

const secret = 's3cret';
const raw = Buffer.from('{"object":"page","entry":[{"id":"1"}]}');
const sign = (b: Buffer) => 'sha256=' + crypto.createHmac('sha256', secret).update(b).digest('hex');

describe('Lead Ads webhook signature (raw body, constant-time, modes)', () => {
  it('accepts the exact signed bytes', () => {
    expect(verifyHubSignature(raw, sign(raw), 'enforce', secret)).toEqual({ accept: true });
  });
  it('enforce rejects a forged or missing signature', () => {
    expect(verifyHubSignature(raw, 'sha256=' + '0'.repeat(64), 'enforce', secret).accept).toBe(false);
    expect(verifyHubSignature(raw, undefined, 'enforce', secret).accept).toBe(false);
  });
  it('log mode accepts but reports why', () => {
    expect(verifyHubSignature(raw, undefined, 'log', secret)).toEqual({ accept: true, reason: 'missing signature' });
  });
  it('a re-serialised body (different bytes) does not match — the old check could reject real events', () => {
    const reserialised = Buffer.from(JSON.stringify(JSON.parse(raw.toString()), null, 1));
    expect(verifyHubSignature(reserialised, sign(raw), 'enforce', secret).accept).toBe(false);
  });
  it('enforce without a secret does not drop everything (configuration error, not an attack)', () => {
    expect(verifyHubSignature(raw, undefined, 'enforce', '').accept).toBe(true);
  });
});
