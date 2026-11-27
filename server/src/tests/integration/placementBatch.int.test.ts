/**
 * Placement batches, against a real database.
 *
 * A student keeps their home batch and may also belong to a placement batch. A lab the placement
 * batch takes over comes from it; every other lab, and everything else, stays with the home batch.
 * Each student must have exactly one source per lab, so lab cohorts never count anyone twice.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import Batch from '../../models/Batch';
import AssessmentSchedule from '../../models/AssessmentSchedule';
import { labBatchFor, labStudentIds, labBatchOverrides, studentBatchIds } from '../../services/placementBatchService';
import { studentSchedulesMap } from '../../services/assessmentDeliveryService';

const TENANT = new mongoose.Types.ObjectId();
const T = String(TENANT);

const batch = (name: string, extra: any = {}) => Batch.create({
  name, tenantId: TENANT, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
  timings: [{ day: 'Monday', startTime: '10:00', endTime: '11:00' }], ...extra,
} as any);
const student = (email: string, batchId: any, placementBatchIds?: any[]) => User.create({
  tenantId: TENANT, firstName: 'S', lastName: email, email, password: 'x', role: 'STUDENT', isActive: true, batchId,
  ...(placementBatchIds ? { placementBatchIds } : {}),
} as any);
const sorted = (a: string[]) => [...a].sort();

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

describe('labBatchFor', () => {
  it('uses the home batch when the student has no placement batch', async () => {
    const alpha = await batch('Alpha-5');
    const s = await student('a@x.com', alpha._id);
    expect(String(await labBatchFor(T, s._id, alpha._id, 'thinking'))).toBe(String(alpha._id));
  });

  it('gives only the taken-over lab to the placement batch', async () => {
    const alpha = await batch('Alpha-5');
    const place = await batch('Placement', { kind: 'placement', takesOverLabs: ['thinking'] });
    const s = await student('a@x.com', alpha._id, [place._id]);
    expect(String(await labBatchFor(T, s._id, alpha._id, 'thinking'))).toBe(String(place._id));
    expect(String(await labBatchFor(T, s._id, alpha._id, 'communication'))).toBe(String(alpha._id));
  });

  it('ignores an inactive placement batch and a batch not marked placement', async () => {
    const alpha = await batch('Alpha-5');
    const off = await batch('Old placement', { kind: 'placement', takesOverLabs: ['thinking'], isActive: false });
    const regular = await batch('Regular', { takesOverLabs: ['thinking'] });
    const s = await student('a@x.com', alpha._id, [off._id, regular._id]);
    expect(String(await labBatchFor(T, s._id, alpha._id, 'thinking'))).toBe(String(alpha._id));
  });

  it('does not let another institute\'s batch take over', async () => {
    const alpha = await batch('Alpha-5');
    const foreign = await Batch.create({
      name: 'Foreign', tenantId: new mongoose.Types.ObjectId(), startDate: new Date(), endDate: new Date(Date.now() + 864e5),
      timings: [{ day: 'Monday', startTime: '10:00', endTime: '11:00' }], kind: 'placement', takesOverLabs: ['thinking'],
    } as any);
    const s = await student('a@x.com', alpha._id, [foreign._id]);
    expect(String(await labBatchFor(T, s._id, alpha._id, 'thinking'))).toBe(String(alpha._id));
  });
});

describe('lab cohorts count each student once', () => {
  it('moves taken-over students out of the home cohort and into the placement cohort', async () => {
    const alpha = await batch('Alpha-5');
    const omega = await batch('Omega-6');
    const place = await batch('Placement', { kind: 'placement', takesOverLabs: ['thinking'] });
    const a = await student('a@x.com', alpha._id, [place._id]);
    const b = await student('b@x.com', alpha._id);
    const c = await student('c@x.com', omega._id, [place._id]);

    expect(sorted(await labStudentIds(T, alpha._id, 'thinking'))).toEqual([String(b._id)]);
    expect(sorted(await labStudentIds(T, place._id, 'thinking'))).toEqual(sorted([String(a._id), String(c._id)]));
    // Communication is not taken over: everyone stays with their home batch.
    expect(sorted(await labStudentIds(T, alpha._id, 'communication'))).toEqual(sorted([String(a._id), String(b._id)]));
    expect(await labStudentIds(T, place._id, 'communication')).toEqual([]);

    const over = await labBatchOverrides(T, [a._id, b._id, c._id], 'thinking');
    expect(over.get(String(a._id))).toBe(String(place._id));
    expect(over.has(String(b._id))).toBe(false);
  });
});

describe('quizzes and assignments assigned to a placement batch', () => {
  it('reach its members, and the home batch row wins when both assigned the same content', async () => {
    const alpha = await batch('Alpha-5');
    const place = await batch('Placement', { kind: 'placement' });
    const s = await student('a@x.com', alpha._id, [place._id]);
    expect(sorted(await studentBatchIds(s._id, alpha._id))).toEqual(sorted([String(alpha._id), String(place._id)]));

    const onlyPlacement = new mongoose.Types.ObjectId();
    const both = new mongoose.Types.ObjectId();
    await AssessmentSchedule.create([
      { tenantId: T, contentType: 'quiz', contentId: onlyPlacement, batchId: place._id, status: 'active' },
      { tenantId: T, contentType: 'quiz', contentId: both, batchId: place._id, status: 'active' },
      { tenantId: T, contentType: 'quiz', contentId: both, batchId: alpha._id, status: 'active' },
    ] as any);

    const map = await studentSchedulesMap(T, String(s._id), String(alpha._id), 'quiz');
    expect(map.has(String(onlyPlacement))).toBe(true);
    expect(String(map.get(String(both)).batchId)).toBe(String(alpha._id));

    // A classmate who is not in the placement batch does not get it.
    const other = await student('b@x.com', alpha._id);
    const theirs = await studentSchedulesMap(T, String(other._id), String(alpha._id), 'quiz');
    expect(theirs.has(String(onlyPlacement))).toBe(false);
  });
});
