/**
 * Strips secrets and personal details out of anything about to be logged.
 *
 * Two kinds of field:
 *   - secrets (passwords, tokens, API keys, auth headers, cookies, OTPs, answers): replaced whole;
 *   - personal details (email, mobile/phone): masked, keeping just enough to tell two apart.
 * Free text is scrubbed too, because a secret pasted into a message or a URL is still a secret:
 * bearer tokens, JWTs, provider keys, e-mail addresses and Indian mobile numbers.
 *
 * It copies rather than mutates, survives cycles, and stops at a depth, so it is safe to hand
 * any request body or error to it.
 */

const SECRET_KEYS = new Set([
  'password', 'passwd', 'newpassword', 'oldpassword', 'currentpassword', 'confirmpassword',
  'token', 'accesstoken', 'refreshtoken', 'idtoken', 'resettoken', 'signuptoken', 'quiztoken', 'sharetoken',
  'secret', 'clientsecret', 'jwt', 'authorization', 'cookie', 'setcookie',
  'apikey', 'xapikey', 'privatekey', 'otp', 'code_verifier', 'codeverifier',
  'answers', 'answer', 'cvv', 'cardnumber', 'signature', 'razorpaysignature',
]);
const EMAIL_KEYS = new Set(['email', 'useremail', 'studentemail', 'requesteremail']);
const PHONE_KEYS = new Set(['mobile', 'phone', 'phonenumber', 'whatsapp', 'whatsappnumber', 'contactnumber']);

const norm = (k: string) => k.toLowerCase().replace(/[-\s]/g, '');

export const REDACTED = '[REDACTED]';

export function maskEmail(v: string): string {
  const m = /^([^@\s]{1,64})@([^@\s]+)$/.exec(v.trim());
  if (!m) return REDACTED;
  return `${m[1][0]}***@${m[2][0]}***`;
}

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '');
  return d.length >= 4 ? `******${d.slice(-2)}` : REDACTED;
}

const TEXT_RULES: [RegExp, string | ((s: string) => string)][] = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`],
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, REDACTED],     // JWTs
  [/\b(sk|rk|pk)-[A-Za-z0-9_-]{16,}/g, REDACTED],                                // provider API keys
  [/\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, REDACTED],                                     // AWS access keys
  [/([?&](?:token|access_token|refresh_token|key|apikey|api_key|password|otp|code|signature)=)[^&#\s]*/gi, `$1${REDACTED}`],
  [/[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (s: string) => maskEmail(s)],
  [/(?<![\d.])(?:\+?91[\s-]?)?[6-9]\d{9}(?![\d.])/g, (s: string) => maskPhone(s)],
];

export function redactText(s: string): string {
  let out = s;
  for (const [re, rep] of TEXT_RULES) out = out.replace(re, rep as any);
  return out;
}

const MAX_DEPTH = 8;
const MAX_ITEMS = 200;

export function redact<T = unknown>(value: T): T {
  const seen = new WeakSet<object>();
  const walk = (v: any, depth: number): any => {
    if (typeof v === 'string') return redactText(v);
    if (v == null || typeof v !== 'object') return v;
    if (v instanceof Date) return v;
    if (Buffer.isBuffer(v)) return `[Buffer ${v.length}]`;
    if (seen.has(v)) return '[Circular]';
    if (depth >= MAX_DEPTH) return '[Truncated]';
    seen.add(v);
    if (v instanceof Error) return { name: v.name, message: redactText(v.message) };
    if (Array.isArray(v)) {
      const arr = v.slice(0, MAX_ITEMS).map(x => walk(x, depth + 1));
      if (v.length > MAX_ITEMS) arr.push(`[+${v.length - MAX_ITEMS} more]`);
      return arr;
    }
    // ObjectIds and similar print as themselves.
    if (typeof v.toHexString === 'function') return v.toHexString();
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(v)) {
      const k = norm(key);
      const val = v[key];
      if (SECRET_KEYS.has(k)) out[key] = val == null || val === '' ? val : REDACTED;
      else if (EMAIL_KEYS.has(k) && typeof val === 'string') out[key] = maskEmail(val);
      else if (PHONE_KEYS.has(k) && (typeof val === 'string' || typeof val === 'number')) out[key] = maskPhone(String(val));
      else out[key] = walk(val, depth + 1);
    }
    return out;
  };
  return walk(value, 0);
}
