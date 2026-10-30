/**
 * Placement readiness's interview figure, against a real database: the overall score of the latest
 * role interview — the number the Coder Score reads — not the technical areas alone.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import PassportInterview from '../../models/PassportInterview';
import { getMyPlacementReadiness } from '../../controllers/placementReadinessController';

const TENANT = String(new mongoose.Types.ObjectId());
const STUDENT = new mongoose.Types.ObjectId();

const sit = (completedAt: string, overallScore: number, areaScores: any[]) => PassportInterview.create({
  tenantId: TENANT, studentId: STUDENT, status: 'completed', completedAt: new Date(completedAt),
  skillTargets: [{ skillKey: 'java', skillName: 'Java' }],
  evaluation: { overallScore, areaScores },
} as any);

const readiness = async () => {
  let body: any;
  const res: any = { status: () => res, json: (b: any) => { body = b; return res; } };
  await getMyPlacementReadiness({ user: { tenantId: TENANT, id: String(STUDENT) } } as any, res);
  if (!body?.interview) throw new Error(JSON.stringify(body));
  return body.interview;
};

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

describe('interview readiness', () => {
  it('is the overall score of the latest role interview', async () => {
    await sit('2026-10-01', 90, [{ title: 'Java', percentage: 95 }]);
    await sit('2026-10-20', 62, [{ title: 'Java', percentage: 80 }]);
    const r = await readiness();
    expect(r.available).toBe(true);
    expect(r.readiness).toBe(62);
    expect(r.dimensions).toEqual([{ dimension: 'TECHNICAL', score: 80 }]);
  });

  it('counts the overall score even when no area matched a skill', async () => {
    await sit('2026-10-20', 55, [{ title: 'Something else', percentage: 50 }]);
    expect((await readiness()).readiness).toBe(55);
  });

  it('reports an interview with nothing graded as not scored, never as 0%', async () => {
    await sit('2026-10-20', 0, []);
    const r = await readiness();
    expect(r.available).toBe(false);
    expect(r.reason).toBe('INTERVIEW_NOT_SCORED');
  });
});
