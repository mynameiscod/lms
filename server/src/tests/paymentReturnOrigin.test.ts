import { trustedOriginOf } from '../controllers/paymentController';

/**
 * Where a member lands after paying.
 *
 * CLIENT_URL is one fixed address; on a dev machine on office Wi-Fi it went stale with every new
 * IP, so a member who paid at .104 was sent to .101 — another machine. The client now sends the
 * origin it is on, and these pin that the server only follows it when it is trusted: never
 * another site, and in production only the configured app.
 */
describe('trustedOriginOf', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('follows a private-network origin in development', () => {
    process.env.NODE_ENV = 'development';
    expect(trustedOriginOf('http://192.168.0.104:3000')).toBe('http://192.168.0.104:3000');
    expect(trustedOriginOf('http://localhost:3000/anything')).toBe('http://localhost:3000');
  });

  it('never follows another site', () => {
    process.env.NODE_ENV = 'development';
    for (const bad of ['https://evil.com', 'javascript:alert(1)', '//evil.com', 'http://user:pw@192.168.0.5:3000', '', undefined]) {
      expect(trustedOriginOf(bad)).toBe('');
    }
  });

  it('in production, follows only the configured app', () => {
    process.env.NODE_ENV = 'production';
    process.env.CLIENT_URL = 'https://platform.codebegun.com';
    expect(trustedOriginOf('https://platform.codebegun.com')).toBe('https://platform.codebegun.com');
    expect(trustedOriginOf('http://192.168.0.104:3000')).toBe('');
  });
});
