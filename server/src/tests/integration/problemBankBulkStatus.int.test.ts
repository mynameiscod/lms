/**
 * Problem Bank — publishing many problems at once, against a real database.
 *
 * Each problem is checked on its own: one that is not ready to publish is reported with its
 * reason while the rest still go through, and nobody can publish another institute's problem.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'problem-bank-bulk-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import CodingProblem from '../../models/CodingProblem';
import problemBankRoutes, { IMPORT_BODY_PATHS, jsonExceptImports } from '../../routes/problemBankRoutes';
import { createProblem, bulkSetStatus, MAX_BULK_STATUS, Actor } from '../../services/problemBankService';
import { SAMPLE_PROBLEM } from '../../services/problemImportService';

const ME: Actor = { userId: '507f1f77bcf86cd799439a01', tenantId: '507f1f77bcf86cd799439b01', role: 'TENANT_ADMIN' };
const OTHER: Actor = { userId: '507f1f77bcf86cd799439a02', tenantId: '507f1f77bcf86cd799439b02', role: 'TENANT_ADMIN' };

/** The import template, with every expected output filled in so it can be published. */
const ready = (a: Actor, title: string) => createProblem(a, {
  ...SAMPLE_PROBLEM, title, status: 'draft',
  tests: (SAMPLE_PROBLEM.tests || []).map((t) => ({ ...t, expectedOutput: t.expectedOutput || '2000000000' })),
} as any);
/** A draft with no tests cannot be published. */
const notReady = (a: Actor, title: string) => createProblem(a, { ...SAMPLE_PROBLEM, title, status: 'draft', tests: [] } as any);
const idOf = (r: { problem: { _id: unknown } }) => String(r.problem._id);

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

describe('bulk publish', () => {
  it('publishes every ready problem and reports the ones that are not', async () => {
    const a = idOf(await ready(ME, 'Sum of two'));
    const b = idOf(await ready(ME, 'Reverse a string'));
    const c = idOf(await notReady(ME, 'No tests yet'));

    const r = await bulkSetStatus(ME, [a, b, c], 'published');

    expect(r.changed.map((x) => x.id).sort()).toEqual([a, b].sort());
    expect(r.failed).toHaveLength(1);
    expect(r.failed[0]).toMatchObject({ id: c, title: 'No tests yet' });
    expect(r.failed[0].reason).toMatch(/Cannot publish yet/);

    const stored = await CodingProblem.find({}).select('title status publishedAt').lean() as any[];
    const byTitle = Object.fromEntries(stored.map((p) => [p.title, p]));
    expect(byTitle['Sum of two'].status).toBe('published');
    expect(byTitle['Sum of two'].publishedAt).toBeTruthy();
    expect(byTitle['No tests yet'].status).toBe('draft');
  });

  it('moves published problems back to draft', async () => {
    const a = idOf(await ready(ME, 'One'));
    await bulkSetStatus(ME, [a], 'published');
    const r = await bulkSetStatus(ME, [a], 'draft');
    expect(r.changed).toHaveLength(1);
    expect((await CodingProblem.findById(a).lean() as any).status).toBe('draft');
  });

  it('never publishes another institute\'s problem, and does not reveal its title', async () => {
    const theirs = idOf(await ready(OTHER, 'Their secret problem'));
    const r = await bulkSetStatus(ME, [theirs], 'published');
    expect(r.changed).toHaveLength(0);
    expect(r.failed[0].title).toBe(theirs);
    expect((await CodingProblem.findById(theirs).lean() as any).status).toBe('draft');
  });

  it('refuses a bad request outright', async () => {
    await expect(bulkSetStatus(ME, [], 'published')).rejects.toThrow(/at least one/);
    await expect(bulkSetStatus(ME, ['507f1f77bcf86cd799439c01'], 'archived')).rejects.toThrow(/published or draft/);
    const many = Array.from({ length: MAX_BULK_STATUS + 1 }, (_, i) => `507f1f77bcf86cd7994${String(i).padStart(5, '0')}`);
    await expect(bulkSetStatus(ME, many, 'published')).rejects.toThrow(/at most/);
  });
});

describe('import body limit', () => {
  /** The real router behind the same app-wide parser app.ts installs. */
  const app = express();
  app.use(jsonExceptImports(express.json({ limit: '10mb' })));
  app.use('/api/v1/problem-bank', problemBankRoutes);
  const signIn = async () => {
    const admin = await User.create({
      tenantId: new mongoose.Types.ObjectId(ME.tenantId), firstName: 'Bank', lastName: 'Admin',
      email: 'bank.admin@example.com', password: 'x', role: 'TENANT_ADMIN', isActive: true,
    } as any);
    return jwt.sign({ id: String(admin._id), email: admin.email, role: 'TENANT_ADMIN', tenantId: ME.tenantId }, process.env.JWT_SECRET as string);
  };
  /** A real JSON import file of about 30 MB, sent the way the dialog sends it (base64). */
  const bigFile = () => {
    const rows = Array.from({ length: 300 }, (_, i) => ({ ...SAMPLE_PROBLEM, title: `Big ${i}`, statement: 'x'.repeat(80_000) }));
    return { filename: 'big.json', data: Buffer.from(JSON.stringify(rows)).toString('base64') };
  };

  it('accepts a 30 MB import file, which the old 10 MB limit refused', async () => {
    const token = await signIn();
    const body = bigFile();
    expect(body.data.length).toBeGreaterThan(30 * 1024 * 1024);
    const r = await request(app).post('/api/v1/problem-bank/import/preview')
      .set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', ME.tenantId).send(body);
    expect(r.status).toBe(200);
    expect(r.body.data.rows).toHaveLength(300);
  });

  it('keeps the 10 MB limit on every other route', async () => {
    const token = await signIn();
    const r = await request(app).post('/api/v1/problem-bank/validate')
      .set('Authorization', `Bearer ${token}`).set('X-Tenant-Id', ME.tenantId).send({ title: 'x', statement: 'y'.repeat(11 * 1024 * 1024) });
    expect(r.status).toBe(413);
  });

  it('applies only to the two import routes', () => {
    expect(IMPORT_BODY_PATHS.test('/api/v1/problem-bank/import/preview')).toBe(true);
    expect(IMPORT_BODY_PATHS.test('/api/v1/problem-bank/import/commit')).toBe(true);
    expect(IMPORT_BODY_PATHS.test('/api/v1/problem-bank/problems')).toBe(false);
    expect(IMPORT_BODY_PATHS.test('/api/v1/problem-bank/import/template')).toBe(false);
    expect(IMPORT_BODY_PATHS.test('/api/v1/payments/webhook')).toBe(false);
  });
});
