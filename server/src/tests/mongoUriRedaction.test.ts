/**
 * The startup line must not contain the database password.
 *
 * `MONGODB_URI` is `mongodb://user:password@host:27017/db?authSource=admin` in every deployed
 * environment — docker-compose builds it from MONGO_ROOT_USERNAME and MONGO_ROOT_PASSWORD —
 * and the connect helper printed it verbatim. That wrote the database root credential into
 * docker logs, any log shipper reading them, and every deploy transcript, on a host that has
 * been compromised twice.
 *
 * These tests pin the redaction and, more importantly, the fallback: a value that cannot be
 * parsed must produce a fixed label rather than being echoed, because "print the original if
 * we could not understand it" is how a redaction quietly stops redacting.
 */

import { redactMongoUri } from '../config/database';

const USER = 'lmsadmin';
const PASSWORD = 'S3cr3t-P4ssw0rd-Do-Not-Log';

describe('redacting a connection string', () => {
  it('keeps the host and database, which is all a startup line needs', () => {
    expect(redactMongoUri(`mongodb://${USER}:${PASSWORD}@mongodb:27017/lms-saas?authSource=admin`))
      .toBe('mongodb:27017/lms-saas');
  });

  it('drops the password', () => {
    const out = redactMongoUri(`mongodb://${USER}:${PASSWORD}@mongodb:27017/lms-saas?authSource=admin`);
    expect(out).not.toContain(PASSWORD);
  });

  it('drops the username too', () => {
    // The account name is half of a credential, and naming it helps nobody read a log.
    const out = redactMongoUri(`mongodb://${USER}:${PASSWORD}@mongodb:27017/lms-saas?authSource=admin`);
    expect(out).not.toContain(USER);
  });

  it('drops the query string, which can carry secrets of its own', () => {
    const out = redactMongoUri('mongodb://u:p@host:27017/db?authSource=admin&tlsCertificateKeyFile=/k.pem');
    expect(out).toBe('host:27017/db');
    expect(out).not.toContain('tlsCertificateKeyFile');
  });

  it('handles a password containing an @', () => {
    // Userinfo runs to the LAST @, not the first. Splitting on the first would leave the
    // tail of the password in the "host".
    const out = redactMongoUri('mongodb://user:pa@ss@mongodb:27017/lms-saas');
    expect(out).toBe('mongodb:27017/lms-saas');
    expect(out).not.toContain('ss');
  });

  it('handles a password containing a slash', () => {
    const out = redactMongoUri('mongodb://user:pa/ssw0rd@mongodb:27017/lms-saas');
    expect(out).toBe('mongodb:27017/lms-saas');
    expect(out).not.toContain('ssw0rd');
  });

  it('handles mongodb+srv', () => {
    expect(redactMongoUri('mongodb+srv://u:p@cluster0.abcd.mongodb.net/lms?retryWrites=true'))
      .toBe('cluster0.abcd.mongodb.net/lms');
  });

  it('handles a replica set with several hosts', () => {
    expect(redactMongoUri('mongodb://u:p@a:27017,b:27017,c:27017/lms?replicaSet=rs0'))
      .toBe('a:27017,b:27017,c:27017/lms');
  });

  it('passes through a URI that never had credentials', () => {
    expect(redactMongoUri('mongodb://localhost:27017/lms-saas')).toBe('localhost:27017/lms-saas');
  });
});

describe('a value it cannot parse is never echoed', () => {
  /**
   * The failure mode that matters. If redaction fell back to "print what we were given",
   * then a URI shaped in a way this does not recognise would be logged in full — which is
   * exactly the bug, reintroduced under a function whose name says it is safe.
   */
  it('refuses a string that is not a mongodb URI', () => {
    expect(redactMongoUri('postgres://user:hunter2@db:5432/app')).toBe('(unrecognised connection string)');
  });

  it('does not echo a bare secret handed to it by mistake', () => {
    expect(redactMongoUri(PASSWORD)).not.toContain(PASSWORD);
  });

  it('handles empty, null and undefined without throwing', () => {
    // Startup logging must never be the thing that stops the server booting.
    for (const v of ['', null, undefined] as any[]) {
      expect(() => redactMongoUri(v)).not.toThrow();
      expect(redactMongoUri(v)).toBe('(unrecognised connection string)');
    }
  });

  it('labels a URI with a scheme and nothing else', () => {
    expect(redactMongoUri('mongodb://')).toBe('(unknown host)');
    expect(redactMongoUri('mongodb://u:p@')).toBe('(unknown host)');
  });
});

describe('the startup line as it is actually printed', () => {
  it('contains neither half of the credential', () => {
    const uri = `mongodb://${USER}:${PASSWORD}@mongodb:27017/lms-saas?authSource=admin`;

    const line = `🔗 Connecting to MongoDB: ${redactMongoUri(uri)}`;

    expect(line).not.toContain(PASSWORD);
    expect(line).not.toContain(USER);
    expect(line).not.toContain('@');
    // Still useful: an operator can see which database the process attached to.
    expect(line).toContain('mongodb:27017/lms-saas');
  });
});
