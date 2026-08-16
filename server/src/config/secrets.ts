/**
 * The application's irreducible secrets, resolved in exactly one place.
 *
 * WHY THIS FILE EXISTS. `process.env.JWT_SECRET || 'secret-key'` appeared in eight
 * independent places, including the middleware that authenticates every request. A literal
 * default for a signing key is not a fallback — it is a published key. Anyone who can read
 * this repository could mint a token for any user in any tenant, because `tenantId` and
 * `role` are claims inside the token and the verifier trusts them once the signature checks
 * out. Eight copies also meant no single place could ever refuse to start without one.
 *
 * NO DEFAULT, EVER, AND NO RANDOM ONE EITHER. A generated-at-boot secret would invalidate
 * every session on every restart and turn a security property into an availability bug, so
 * this asks for the value and fails loudly when it is absent.
 *
 * NOTHING HERE IS LOGGED. The failure messages name the variable, never the value.
 */

/** The published literal this codebase used to fall back to. Refused on sight. */
const BANNED_SECRETS = new Set([
  'secret-key',
  'fallback-key-32-chars-minimum!!',
  'codebegun-dev-secret',
]);

/** Short enough to brute-force is the same as absent. */
const MIN_SECRET_LENGTH = 16;

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

function requireSecret(name: string, value: string | undefined): string {
  const v = (value || '').trim();

  if (!v) {
    throw new Error(
      `${name} is not set. Set it in the environment before starting the server. ` +
      'There is deliberately no default — a known signing key is the same as no signing key.',
    );
  }
  if (BANNED_SECRETS.has(v)) {
    throw new Error(
      `${name} is set to a value that was published in this repository as a fallback. ` +
      'Generate a new one (openssl rand -base64 48) and set it in the environment.',
    );
  }
  if (isProduction() && v.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters in production.`);
  }
  return v;
}

/**
 * The JWT signing and verification key.
 *
 * Read per call rather than captured at import, so a test that sets the variable in its own
 * setup is not defeated by module load order, and so a process that starts without one fails
 * at the first authenticated request rather than silently accepting forgeries.
 */
export const jwtSecret = (): string => requireSecret('JWT_SECRET', process.env.JWT_SECRET);

/**
 * Whether the environment is fit to serve authenticated traffic. Called at startup so the
 * failure is a refusal to boot rather than a 500 on somebody's login.
 */
export function assertSecretsPresent(): void {
  jwtSecret();
}

/**
 * The key that encrypts stored integration secrets — DELIBERATELY UNCHANGED FOR NOW.
 *
 * ⚠️ THIS IS COUPLED TO JWT_SECRET AND MUST NOT BE DECOUPLED IN CODE ALONE.
 *
 * settingsService encrypts 22 admin-entered secrets (provider API keys, SMTP passwords,
 * OAuth client secrets) with AES-256-CBC under a key derived from
 * `ENCRYPTION_KEY || JWT_SECRET || '<published literal>'`. If a deployment never set
 * ENCRYPTION_KEY, its ciphertext is bound to whichever of the other two applied at the time
 * it was written.
 *
 * So changing JWT_SECRET — including simply SETTING it on a host that never had one — can
 * silently change the encryption key and make every stored integration secret unreadable.
 * Removing the fallback here would do the same thing, which is why this function does not
 * exist yet and settingsService is untouched by this commit.
 *
 * The safe order is operational, not code: pin ENCRYPTION_KEY to the value that is
 * *currently* effective on the host, verify the stored secrets still decrypt, and only then
 * rotate JWT_SECRET. See docs/runbooks/jwt-secret-rotation.md.
 */
export const ENCRYPTION_KEY_IS_COUPLED_TO_JWT_SECRET = true;
