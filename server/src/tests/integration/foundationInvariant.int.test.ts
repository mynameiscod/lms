/**
 * A Foundation learner can never be handed the topic roadmap — on any tenant, provisioned or not.
 *
 * Against a real database and the real handlers: a tenant with no configuration and no curriculum,
 * which is exactly what a new institute or another machine's database looks like. The learner is
 * on the unit engine, the topic roadmap API refuses to build them a plan, and the journey says
 * NOT_CONFIGURED. Once the tenant can serve the journey, the same learner is told their journey is
 * simply not created yet. A later-stage learner keeps the topic roadmap throughout.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import * as journeyCtrl from '../../controllers/foundationJourneyController';
import * as roadmapCtrl from '../../controllers/passportRoadmapController';
import { resolveCurriculumEngine } from '../../services/curriculumEngineService';
import { foundationReadiness } from '../../services/foundationReadinessService';

const TENANT = '507f1f77bcf86cd799439f31';

const capture = () => {
  const res: any = { statusCode: 200, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
};
const asMember = (id: string) => ({ user: { id, tenantId: TENANT, role: 'STUDENT' }, tenantId: TENANT, headers: {}, params: {}, query: {}, body: {} } as any);
const call = async (handler: (req: any, res: any) => Promise<any>, req: any) => { const res = capture(); await handler(req, res); return res; };

let seq = 0;
const member = async (stage: string) => {
  seq += 1;
  const u = await User.create({
    tenantId: TENANT, firstName: `M${seq}`, lastName: 'X', email: `m${seq}@example.com`,
    phone: `9822${String(seq).padStart(6, '0')}`, password: 'x', role: 'STUDENT',
    passport: { active: true, stage, primaryRole: 'NOT_SURE' },
  } as any);
  return String(u._id);
};

/** The two facts provisioning establishes: ninety published Foundation units and a skill-check mapping. */
const provisionFloor = async () => {
  const db = mongoose.connection.db!;
  await db.collection('curriculumlearningunits').insertMany(Array.from({ length: 90 }, (_, i) => ({
    tenantId: TENANT, stageKey: 'foundation', unitCode: `T_U_${i}`, status: 'PUBLISHED', title: `Unit ${i}`,
  })));
  await db.collection('skillevidences').insertOne({ tenantId: TENANT, skillKey: 'LOOPS', sourceType: 'assessment_item', sourceId: 'x', active: true, contribution: 'PRIMARY' });
};

beforeAll(async () => { await startMongo(); });
afterAll(stopMongo);
beforeEach(clearCollections);

describe('a Foundation learner on a tenant that was never provisioned', () => {
  it('is on the unit engine, is refused the topic roadmap, and is told NOT_CONFIGURED', async () => {
    const id = await member('foundation');

    expect((await resolveCurriculumEngine({ tenantId: TENANT, studentId: id })).engine).toBe('UNIT');

    const roadmap = await call(roadmapCtrl.getRoadmap, asMember(id));
    expect(roadmap.statusCode).toBe(200);
    expect(roadmap.body).toMatchObject({ engine: 'UNIT', roadmap: null, foundation: { configured: false, reason: 'NO_PRODUCTION_CURRICULUM' } });
    // Nothing of a topic plan: no days, no weeks, no length.
    expect(JSON.stringify(roadmap.body)).not.toMatch(/totalDays|phases|weeks/);

    const journey = await call(journeyCtrl.getMyJourney, asMember(id));
    expect(journey.body).toMatchObject({ available: false, reason: 'NOT_CONFIGURED', engine: 'UNIT', totalDays: 90 });
  });

  it('is told the journey is not created yet once the tenant can serve it', async () => {
    const id = await member('foundation');
    await provisionFloor();
    expect(await foundationReadiness(TENANT)).toMatchObject({ configured: true, publishedUnits: 90, skillCheckMappings: 1 });

    const journey = await call(journeyCtrl.getMyJourney, asMember(id));
    expect(journey.body).toMatchObject({ available: false, reason: 'NO_JOURNEY', engine: 'UNIT' });

    const roadmap = await call(roadmapCtrl.getRoadmap, asMember(id));
    expect(roadmap.body).toMatchObject({ engine: 'UNIT', roadmap: null, foundation: { configured: true } });
  });
});

describe('a later-stage learner', () => {
  it('stays on the topic engine and is not refused the topic roadmap', async () => {
    const id = await member('build');
    expect((await resolveCurriculumEngine({ tenantId: TENANT, studentId: id })).engine).toBe('TOPIC');
    const roadmap = await call(roadmapCtrl.getRoadmap, asMember(id));
    expect(roadmap.body?.engine).not.toBe('UNIT');
  });
});

describe('Foundation readiness', () => {
  it('needs ninety published Foundation units before anything else', async () => {
    const db = mongoose.connection.db!;
    await db.collection('curriculumlearningunits').insertMany(Array.from({ length: 89 }, (_, i) => ({
      tenantId: TENANT, stageKey: 'foundation', unitCode: `T_U_${i}`, status: 'PUBLISHED',
    })));
    await db.collection('curriculumlearningunits').insertOne({ tenantId: TENANT, stageKey: 'foundation', unitCode: 'T_DRAFT', status: 'DRAFT' });
    await db.collection('skillevidences').insertOne({ tenantId: TENANT, skillKey: 'LOOPS', active: true, contribution: 'PRIMARY' });
    expect(await foundationReadiness(TENANT)).toMatchObject({ configured: false, reason: 'NO_PRODUCTION_CURRICULUM', publishedUnits: 89 });
  });

  it('needs a skill check to measure learners with, and counts only this tenant', async () => {
    await provisionFloor();
    await mongoose.connection.db!.collection('skillevidences').deleteMany({});
    await mongoose.connection.db!.collection('skillevidences').insertOne({ tenantId: 'another-tenant', skillKey: 'LOOPS', active: true, contribution: 'PRIMARY' });
    expect(await foundationReadiness(TENANT)).toMatchObject({ configured: false, reason: 'NO_SKILL_CHECK' });
  });
});
