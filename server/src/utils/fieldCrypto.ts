import crypto from 'crypto';

/**
 * Encrypts one personal field (PAN, Aadhaar, bank account number) before it is stored, so the
 * database alone does not reveal it. AES-256-GCM; the key comes from the same secret the platform
 * settings use. A value that cannot be decrypted (the key changed) reads as '' rather than as the
 * scrambled text.
 */
const secret = () => process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-key-32-chars-minimum!!';
const key = () => crypto.scryptSync(secret(), 'employee-fields', 32);

export function encryptField(plain?: string | null): string {
  const text = String(plain ?? '').trim();
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return `v1:${iv.toString('hex')}:${c.getAuthTag().toString('hex')}:${enc.toString('hex')}`;
}

export function decryptField(stored?: string | null): string {
  if (!stored) return '';
  const [v, iv, tag, data] = String(stored).split(':');
  if (v !== 'v1' || !iv || !tag || !data) return '';
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'hex'));
    d.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([d.update(Buffer.from(data, 'hex')), d.final()]).toString('utf8');
  } catch { return ''; }
}

/** "******1234" — enough to recognise, not enough to use. */
export function maskField(plain: string, keep = 4): string {
  const s = String(plain || '');
  if (!s) return '';
  return s.length <= keep ? '*'.repeat(s.length) : '*'.repeat(s.length - keep) + s.slice(-keep);
}
