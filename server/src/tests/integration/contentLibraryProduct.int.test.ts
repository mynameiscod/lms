/**
 * The Content Library's LMS / CareerPilot tabs (services/contentProductService.ts).
 *
 * Library rows carry no audience; a CareerPilot row is bound to a unit or a topic, or was written
 * by the funnel generator. These tests go through the real route against a real database and hold:
 *   - with no `product` the list is exactly what it was (the Curriculum Builder's picker relies
 *     on this, so CareerPilot content stays reusable in LMS curricula);
 *   - `product=lms` lists only rows with no unit, no topic and not generated;
 *   - `product=careerpilot` lists the rest, each with the year/track and unit it is taught in;
 *   - `stage` narrows CareerPilot rows to one year or track, topic-only rows included.
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'content-library-product-integration-secret-0123456789';

import User from '../../models/User';
import LearningContentLibrary from '../../models/LearningContentLibrary';
import CurriculumLearningUnit from '../../models/CurriculumLearningUnit';
import libraryRoutes from '../../routes/learningContentLibraryRoutes';

const TENANT = '507f1f77bcf86cd799439e31';

const app = express();
app.use(express.json());
app.use('/api/v1/learning-library', libraryRoutes);

let token = '';
const list = async (q: string) => {
  const r = await request(app).get(`/api/v1/learning-library?${q}`)
    .set('Authorization', `Bearer ${token}`).set('x-tenant-id', TENANT);
  expect(r.status).toBe(200);
  return r.body as { items: any[]; total: number; stages?: any[] };
};
const titles = (b: { items: any[] }) => b.items.map(i => i.title).sort();

const row = (title: string, over: any = {}) => ({
  tenantId: TENANT, title, type: 'video', isPublished: true, estimatedDuration: 5,
  topicTags: [], courseTags: [], createdBy: 'admin', createdAt: new Date(), updatedAt: new Date(), ...over,
});

beforeAll(async () => { await startMongo(); });
afterAll(stopMongo);
beforeEach(async () => {
  await clearCollections();
  const admin = await User.create({
    tenantId: new mongoose.Types.ObjectId(TENANT), firstName: 'A', lastName: 'Dmin',
    email: 'admin@example.com', password: 'x', role: 'TENANT_ADMIN', isActive: true,
  } as any);
  token = jwt.sign({ id: String(admin._id), email: admin.email, role: 'TENANT_ADMIN', tenantId: TENANT }, process.env.JWT_SECRET as string);

  // Raw inserts: the rows as the seeders and the admin screens leave them.
  await CurriculumLearningUnit.collection.insertMany([
    { tenantId: TENANT, stageKey: 'foundation', moduleCode: 'M_HW', topicCode: 'T_HW', unitCode: 'T_HW_INTRO', title: 'What a computer is' },
    { tenantId: TENANT, stageKey: 'track', moduleCode: 'M_JAVA', topicCode: 'JT_JAVA', unitCode: 'JT_JAVA_START', title: 'Your first Java program' },
  ]);
  await LearningContentLibrary.collection.insertMany([
    row('LMS class recording'),
    row('LMS notes', { type: 'notes' }),
    row('Year 1 unit video', { unitCode: 'T_HW_INTRO', createdBy: 'year1-mega-seed' }),
    row('Year 1 topic video', { topicCode: 'T_HW', createdBy: 'year1-mega-seed' }),
    row('Java track video', { unitCode: 'JT_JAVA_START', createdBy: 'career-track-content-seed' }),
    row('Funnel lesson', { createdBy: 'ai-day-gen' }),
  ]);
});

describe('the Content Library list', () => {
  it('with no product, lists what it always did (every row but the generated ones)', async () => {
    expect(titles(await list(''))).toEqual(['Java track video', 'LMS class recording', 'LMS notes', 'Year 1 topic video', 'Year 1 unit video']);
    expect(titles(await list('source=generated'))).toEqual(['Funnel lesson']);
  });

  it('LMS tab: only rows with no unit, no topic and not generated', async () => {
    expect(titles(await list('product=lms'))).toEqual(['LMS class recording', 'LMS notes']);
    expect(titles(await list('product=lms&type=notes'))).toEqual(['LMS notes']);
  });

  it('CareerPilot tab: the lessons, each saying where it is taught', async () => {
    const b = await list('product=careerpilot');
    expect(titles(b)).toEqual(['Java track video', 'Year 1 topic video', 'Year 1 unit video']);
    const by = Object.fromEntries(b.items.map(i => [i.title, i.cpUnit]));
    expect(by['Year 1 unit video']).toEqual({ unitCode: 'T_HW_INTRO', title: 'What a computer is', stageKey: 'foundation', stageLabel: 'Year 1 · Foundation' });
    expect(by['Year 1 topic video']).toMatchObject({ stageKey: 'foundation', stageLabel: 'Year 1 · Foundation' });
    expect(by['Java track video']).toMatchObject({ title: 'Your first Java program', stageLabel: 'Career tracks' });
    expect(b.stages?.map(s => s.key)).toEqual(['foundation', 'build', 'specialize', 'placement', 'track']);
    expect(b.items.every(i => i._id && i.id)).toBe(true);
  });

  it('CareerPilot tab, AI-generated view: the funnel lessons', async () => {
    expect(titles(await list('product=careerpilot&source=generated'))).toEqual(['Funnel lesson']);
  });

  it('CareerPilot tab, one year or track', async () => {
    expect(titles(await list('product=careerpilot&stage=foundation'))).toEqual(['Year 1 topic video', 'Year 1 unit video']);
    expect(titles(await list('product=careerpilot&stage=track'))).toEqual(['Java track video']);
    expect(titles(await list('product=careerpilot&stage=build'))).toEqual([]);
    // An unknown stage is ignored rather than emptying the list.
    expect(titles(await list('product=careerpilot&stage=nonsense'))).toHaveLength(3);
  });

  it('an unknown product is ignored', async () => {
    expect(titles(await list('product=other'))).toHaveLength(5);
  });
});
