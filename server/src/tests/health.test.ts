/**
 * Health has to be able to say no.
 *
 * `GET /api/health` returned `{ status: 'OK' }` without touching anything, and connectDB
 * caught a failed connection, logged "continuing anyway", and carried on. Between them, an
 * instance that could not reach MongoDB reported itself healthy — so a blue/green cutover
 * to it looked like a successful deploy and kept looking like one while every request 500'd.
 *
 * A health check that cannot fail is not a health check; it is a constant with a URL.
 */

let readyState = 1;

jest.mock('mongoose', () => ({
  __esModule: true,
  default: { get connection() { return { readyState }; } },
  get connection() { return { readyState }; },
}));

import { readiness, databaseState, queueState, aiProviderState } from '../services/healthService';

const env = { ...process.env };
beforeEach(() => {
  readyState = 1;
  process.env = { ...env };
});
afterAll(() => { process.env = env; });

describe('the database dependency', () => {
  it('is up when the driver says connected', () => {
    readyState = 1;
    expect(databaseState()).toMatchObject({ name: 'mongodb', state: 'up', required: true });
  });

  it('is down when disconnected, connecting, or disconnecting', () => {
    for (const [s, detail] of [[0, 'disconnected'], [2, 'connecting'], [3, 'disconnecting']] as const) {
      readyState = s;
      const d = databaseState();
      expect(d.state).toBe('down');
      // The reason is reported, so an operator is not left guessing between "never came up"
      // and "went away".
      expect(d.detail).toBe(detail);
    }
  });

  it('is the one dependency that can withhold traffic', () => {
    expect(databaseState().required).toBe(true);
    expect(queueState().required).toBe(false);
    expect(aiProviderState().required).toBe(false);
  });
});

describe('readiness', () => {
  it('is ready when the database is connected', () => {
    readyState = 1;
    expect(readiness().ready).toBe(true);
  });

  it('is NOT ready when the database is gone', () => {
    // The assertion the old endpoint could never make.
    readyState = 0;
    const r = readiness();
    expect(r.ready).toBe(false);
    expect(r.dependencies.find(d => d.name === 'mongodb')!.state).toBe('down');
  });

  it('stays ready when only optional dependencies are missing', () => {
    readyState = 1;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_URL;
    delete process.env.RAZORPAY_KEY_ID;

    const r = readiness();

    // An absent AI key means one feature says "temporarily unavailable". It must not stop
    // a student's roadmap being served.
    expect(r.ready).toBe(true);
    expect(r.dependencies.find(d => d.name === 'ai_provider')!.state).toBe('not_configured');
    expect(r.dependencies.find(d => d.name === 'redis')!.state).toBe('not_configured');
  });

  it('reports optional dependencies rather than hiding them', () => {
    readyState = 1;
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.REDIS_HOST = 'redis';

    const names = readiness().dependencies.map(d => d.name);
    expect(names).toEqual(['mongodb', 'redis', 'ai_provider', 'razorpay']);
    expect(readiness().dependencies.find(d => d.name === 'ai_provider')!.state).toBe('up');
  });

  it('never calls an AI provider to find out whether one is configured', () => {
    // Presence only. Calling out would bill the product for being monitored and would make
    // a vendor's outage look like ours.
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    expect(aiProviderState().detail).toMatch(/present/);
  });

  it('stamps when it was checked, so a cached answer is obvious', () => {
    expect(new Date(readiness().checkedAt).getTime()).not.toBeNaN();
  });
});

describe('liveness stays separate', () => {
  it('is not derived from any dependency', () => {
    /**
     * Liveness answers "would a restart help". If it consulted the database, a transient
     * blip would restart every instance at once and turn a recoverable wobble into a
     * guaranteed outage. The route returns a constant on purpose — this test pins that the
     * readiness logic is not wired into it.
     */
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'app.ts'), 'utf8');
    const live = src.slice(src.indexOf("'/api/health/live'"), src.indexOf("'/api/health/ready'"));
    expect(live).not.toContain('readiness(');
    expect(live).toContain('alive');
  });

  it('is a different route from readiness', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'app.ts'), 'utf8');
    expect(src).toContain("'/api/health/live'");
    expect(src).toContain("'/api/health/ready'");
    // 503 is what takes an instance out of rotation; 200-with-a-sad-body does not.
    expect(src).toContain('503');
  });
});

describe('startup', () => {
  it('refuses to continue without a database in production', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'config', 'database.ts'), 'utf8');
    expect(src).toContain("if (process.env.NODE_ENV === 'production') throw error;");
    // The old line promised the opposite.
    expect(src).not.toMatch(/Continuing anyway - database operations may fail/);
  });
});
