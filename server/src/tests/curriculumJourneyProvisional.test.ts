/**
 * The seven-day preview has to show the curriculum, and that is harder than it sounds.
 *
 * The preview exists to sell the membership. The stored 90-day plan is gated on that same
 * membership. So the one surface whose entire job is advertising the curriculum was the one
 * surface that could never have a stored plan to read it from — and it fell through to the pool
 * journey, which is assembled from a pathway template and belongs to nobody.
 *
 * The fix is to project the curriculum for the read without writing anything. These tests hold
 * both halves of that: that a non-member sees real curriculum content, and that looking at it
 * does not quietly create the plan they have not paid for.
 */

const roadmapStore: any[] = [];
let assignmentDoc: any = null;

const matches = (doc: any, q: any) =>
  Object.entries(q).every(([k, v]) => String(doc[k]) === String(v));

let created = 0;

jest.mock('../models/CareerRoadmap', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => ({ lean: async () => roadmapStore.find(d => matches(d, q)) || null }),
    create: async (o: any) => { created++; roadmapStore.push(o); return o; },
  },
}));

jest.mock('../models/StudentCurriculumAssignment', () => ({
  __esModule: true,
  default: { findOne: () => ({ lean: async () => assignmentDoc }) },
}));

import mongoose from 'mongoose';
import { buildCurriculumJourney } from '../services/curriculumJourneyService';

const TENANT = 't1';
const STUDENT = new mongoose.Types.ObjectId().toHexString();

/**
 * A plan in the order the curriculum teaches it.
 *
 * Hardware before problem solving before variables — the order that matters, and the one the
 * pool journey replaced with aptitude drills and email practice.
 */
const curriculumPlan = () => ({
  availability: { hoursPerDay: 1, daysPerWeek: 5 },
  moduleAssignments: [
    {
      moduleCode: 'M01', moduleName: 'How computers work',
      topicAssignments: [
        { topicCode: 'T_HW', title: 'Hardware and memory', skillKeys: ['HARDWARE'], state: 'STANDARD', practiceCount: 2, mandatory: true, locked: false },
      ],
    },
    {
      moduleCode: 'M02', moduleName: 'Problem solving',
      topicAssignments: [
        { topicCode: 'T_PS', title: 'Breaking a problem down', skillKeys: ['PROBLEM_SOLVING'], state: 'GUIDED', practiceCount: 3, mandatory: true, locked: false },
      ],
    },
    {
      moduleCode: 'M03', moduleName: 'Programming basics',
      topicAssignments: [
        { topicCode: 'T_VAR', title: 'Variables and types', skillKeys: ['PYTHON_BASICS'], state: 'FOUNDATION_REQUIRED', practiceCount: 2, mandatory: true, locked: false },
      ],
    },
  ],
});

const storedCurriculumRoadmap = () => ({
  tenantId: TENANT, studentId: STUDENT, status: 'ACTIVE',
  roadmapDays: 90, weekCount: 13,
  report: { projectedFromCurriculum: 1 },
  objectives: [
    { week: 1, sequence: 1, topicCode: 'T_HW', skillKey: 'HARDWARE', skillName: 'Hardware', workType: 'LEARN', phase: 'FOUNDATION', plannedMinutes: 30 },
    { week: 1, sequence: 2, topicCode: 'T_PS', skillKey: 'PROBLEM_SOLVING', skillName: 'Problem solving', workType: 'LEARN', phase: 'FOUNDATION', plannedMinutes: 30 },
  ],
});

/** Everything a day on the journey actually displays, flattened. */
const allTitles = (r: any): string[] =>
  r.phases.flatMap((p: any) => p.weeks).flatMap((w: any) => w.days).flatMap((d: any) => d.titles);

beforeEach(() => {
  roadmapStore.length = 0;
  assignmentDoc = curriculumPlan();
  created = 0;
});

describe('a non-member with a curriculum plan and no stored roadmap', () => {
  it('is shown their own curriculum rather than nothing', async () => {
    const out = await buildCurriculumJourney({ tenantId: TENANT, studentId: STUDENT });

    // available:false was the bug. The controller reads it as "fall through to the pool
    // journey", which is how a first-year ended up being shown blood relations.
    expect(out.available).toBe(true);
    expect(out.roadmap.pathway).toBe('curriculum');
  });

  it('shows the real topics, in the order the curriculum teaches them', async () => {
    const out = await buildCurriculumJourney({ tenantId: TENANT, studentId: STUDENT });
    const titles = allTitles(out.roadmap);

    expect(titles.some(t => t.includes('Hardware and memory'))).toBe(true);
    expect(titles.some(t => t.includes('Breaking a problem down'))).toBe(true);
    expect(titles.some(t => t.includes('Variables and types'))).toBe(true);

    const first = (s: string) => titles.findIndex(t => t.includes(s));
    expect(first('Hardware and memory')).toBeLessThan(first('Breaking a problem down'));
    expect(first('Breaking a problem down')).toBeLessThan(first('Variables and types'));
  });

  /**
   * The half of this that matters commercially.
   *
   * A roadmap has a start date and a ninety-day clock; it is the paid artefact. Creating one
   * because somebody LOOKED at the preview would give away the membership and start their clock
   * running from an advert they never acted on.
   */
  it('does not create a plan as a side effect of being looked at', async () => {
    await buildCurriculumJourney({ tenantId: TENANT, studentId: STUDENT });
    await buildCurriculumJourney({ tenantId: TENANT, studentId: STUDENT });

    expect(created).toBe(0);
    expect(roadmapStore).toHaveLength(0);
  });

  it('says it is provisional, so it cannot be mistaken for a plan in force', async () => {
    const out = await buildCurriculumJourney({ tenantId: TENANT, studentId: STUDENT });
    expect(out.provisional).toBe(true);
  });

  it('paces it at the rate the curriculum plan was built at', async () => {
    // 1h/day × 5 days is what the assignment says, and the projection has to place work at that
    // rate. Advertising a week that is denser than the one they will be given is a lie the
    // student only discovers after paying.
    assignmentDoc = { ...curriculumPlan(), availability: { hoursPerDay: 3, daysPerWeek: 6 } };
    const roomy = await buildCurriculumJourney({ tenantId: TENANT, studentId: STUDENT });

    assignmentDoc = { ...curriculumPlan(), availability: { hoursPerDay: 1, daysPerWeek: 2 } };
    const tight = await buildCurriculumJourney({ tenantId: TENANT, studentId: STUDENT });

    // The same work at a slower pace takes more of the calendar, not less.
    expect(tight.roadmap.totalDays).toBeGreaterThanOrEqual(roomy.roadmap.totalDays);
  });
});

describe('a member with a stored curriculum roadmap', () => {
  beforeEach(() => { roadmapStore.push(storedCurriculumRoadmap()); });

  it('is read from the stored plan, not re-projected under them', async () => {
    const out = await buildCurriculumJourney({ tenantId: TENANT, studentId: STUDENT });

    expect(out.available).toBe(true);
    expect(out.provisional).toBe(false);

    // Only what the stored plan committed to. T_VAR is in the curriculum but not in this
    // roadmap's objectives, and a plan somebody is partway through must not gain work because
    // the projection would have placed it differently today.
    const titles = allTitles(out.roadmap);
    expect(titles.some(t => t.includes('Variables and types'))).toBe(false);
    expect(titles.some(t => t.includes('Hardware'))).toBe(true);
  });
});

describe('a roadmap the old gap planner built', () => {
  it('is treated as absent rather than rendered under the curriculum name', async () => {
    // No projectedFromCurriculum flag: this is a pre-projection plan, ordered by gap size with
    // an alphabetical tie-break. Reading it here would put the old ordering back on the screen
    // wearing the curriculum's label, which is worse than not showing it.
    roadmapStore.push({
      tenantId: TENANT, studentId: STUDENT, status: 'ACTIVE',
      roadmapDays: 90, weekCount: 13, report: {},
      objectives: [{ week: 1, sequence: 1, skillKey: 'DOCKER', skillName: 'Docker', workType: 'LEARN', phase: 'FOUNDATION', plannedMinutes: 30 }],
    });

    const out = await buildCurriculumJourney({ tenantId: TENANT, studentId: STUDENT });

    expect(out.provisional).toBe(true);
    expect(allTitles(out.roadmap).some(t => t.includes('Docker'))).toBe(false);
    expect(allTitles(out.roadmap).some(t => t.includes('Hardware and memory'))).toBe(true);
  });
});

describe('a student this has no opinion about', () => {
  it('falls through when there is neither a plan nor a curriculum', async () => {
    assignmentDoc = null;

    const out = await buildCurriculumJourney({ tenantId: TENANT, studentId: STUDENT });

    // Unavailable is correct here, and the pool journey behind it is the right answer for a
    // tenant that does not teach a curriculum at all.
    expect(out.available).toBe(false);
  });

  it('falls through for a curriculum plan with no topics in it yet', async () => {
    assignmentDoc = { availability: { hoursPerDay: 1, daysPerWeek: 5 }, moduleAssignments: [] };

    const out = await buildCurriculumJourney({ tenantId: TENANT, studentId: STUDENT });

    expect(out.available).toBe(false);
  });

  it('does not go looking when the id could not have a plan', async () => {
    const out = await buildCurriculumJourney({ tenantId: TENANT, studentId: 'not-an-object-id' });
    expect(out.available).toBe(false);
  });
});
