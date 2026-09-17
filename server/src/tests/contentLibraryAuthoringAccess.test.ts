/**
 * The Content Library is staff authoring. A learner — or a staff role without authoring permission — can
 * neither read its rows (they carry hidden grader tests and drafts) nor change them.
 *
 * These routes had no role guard at all: any signed-in student could create, edit, publish and delete the
 * lessons every other student is taught from. The controllers are replaced with stubs here, so what is under
 * test is only the route table: which requests reach a controller, for which role.
 */

import express from 'express';
import request from 'supertest';

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'u1', role: req.headers['x-test-role'], tenantId: 't1' };
    next();
  },
}));

jest.mock('../controllers/learningContentLibraryController', () => {
  const reached = (_req: any, res: any) => res.status(299).json({ reached: true });
  return new Proxy({}, { get: () => reached });
});
jest.mock('../controllers/bunnyController', () => {
  const reached = (_req: any, res: any) => res.status(299).json({ reached: true });
  return new Proxy({}, { get: () => reached });
});

import { studentContentRow } from '../services/studentContentView';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const routes = require('../routes/learningContentLibraryRoutes').default;

const app = express();
app.use(express.json());
app.use('/lib', routes);

const AUTHORING: Array<[string, string]> = [
  ['get', '/lib'],
  ['get', '/lib/abc'],
  ['post', '/lib'],
  ['put', '/lib/abc'],
  ['delete', '/lib/abc'],
  ['patch', '/lib/abc/publish'],
  ['post', '/lib/bunny/content'],
  ['post', '/lib/bunny/refresh-status'],
  ['get', '/lib/tags/topics'],
  ['get', '/lib/skill-options'],
];

const call = (method: string, path: string, role: string) =>
  (request(app) as any)[method](path).set('x-test-role', role).set('x-tenant-id', 't1').send({});

describe('Content Library route access', () => {
  it.each(['STUDENT', 'GUEST', 'ATTENDANCE_ADMIN'])('refuses %s on every authoring route', async role => {
    for (const [method, path] of AUTHORING) {
      const r = await call(method, path, role);
      expect([method, path, r.status]).toEqual([method, path, 403]);
    }
  });

  it.each(['TENANT_ADMIN', 'INSTRUCTOR', 'SUPER_ADMIN'])('lets %s reach every authoring route', async role => {
    for (const [method, path] of AUTHORING) {
      const r = await call(method, path, role);
      expect([method, path, r.status]).toEqual([method, path, 299]);
    }
  });

  it('keeps the interview recording upload slot open to a student', async () => {
    expect((await call('post', '/lib/bunny/videos', 'STUDENT')).status).toBe(299);
  });
});

describe('studentContentRow', () => {
  it('removes hidden test cases and keeps visible ones and everything else', () => {
    const row = {
      _id: 'c1', title: 'Loops practice', notesContent: 'n',
      practiceQuestions: [{
        title: 'Sum', options: [{ text: 'a', isCorrect: true }],
        testCases: [{ input: '1', expectedOutput: '1', isHidden: false }, { input: '2', expectedOutput: 'secret', isHidden: true }],
      }],
    };
    const out = studentContentRow(row);
    expect(out.practiceQuestions[0].testCases).toEqual([{ input: '1', expectedOutput: '1', isHidden: false }]);
    expect(JSON.stringify(out)).not.toContain('secret');
    expect(out.practiceQuestions[0].options).toEqual(row.practiceQuestions[0].options);
    expect(out.title).toBe('Loops practice');
    // The stored row is not mutated.
    expect(row.practiceQuestions[0].testCases).toHaveLength(2);
  });

  it('passes rows without practice through unchanged', () => {
    const row = { _id: 'v1', type: 'video', videoUrl: 'https://youtu.be/rfscVS0vtbw' };
    expect(studentContentRow(row)).toBe(row);
  });
});
