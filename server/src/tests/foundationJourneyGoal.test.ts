/**
 * Today's goal for a Foundation member is the journey day they are on — its tasks plus the day bonus — not the
 * topic planner's missions (which they do not have, and which left the goal at "1 XP").
 */
const findEnrollment = jest.fn();
const findPlan = jest.fn();
const chain = (value: any) => ({ sort: () => chain(value), select: () => chain(value), lean: async () => value });
jest.mock('../models/CurriculumEnrollment', () => ({ __esModule: true, default: { findOne: (...a: any[]) => chain(findEnrollment(...a)) } }));
jest.mock('../models/DayPlan', () => ({ __esModule: true, default: { findOne: (...a: any[]) => chain(findPlan(...a)) } }));
jest.mock('../services/gamificationEngine', () => ({ processGamificationEvent: jest.fn() }));

import { journeyDayTargetXp } from '../services/foundationJourneyXpService';

const STUDENT = '64b000000000000000000001';

describe("today's goal for a Foundation member", () => {
  beforeEach(() => { findEnrollment.mockReset(); findPlan.mockReset(); });

  it('is the current day\'s task XP plus the day bonus', async () => {
    findEnrollment.mockReturnValue({ curriculumId: 'c1', currentDay: 2 });
    findPlan.mockReturnValue({ items: [
      { kind: 'content', contentType: 'video' }, { kind: 'content', contentType: 'notes' },
      { kind: 'content', contentType: 'practice_theory' }, { kind: 'quiz', contentType: 'quiz' },
    ] });
    await expect(journeyDayTargetXp('t1', STUDENT)).resolves.toBe(5 + 5 + 10 + 20 + 25);
    expect(findPlan.mock.calls[0][0]).toEqual({ curriculumId: 'c1', dayNumber: 2 });
  });

  it('is null without a Foundation journey, so the caller keeps the topic figure', async () => {
    findEnrollment.mockReturnValue(null);
    await expect(journeyDayTargetXp('t1', STUDENT)).resolves.toBeNull();
  });

  it('is null when the day has no tasks', async () => {
    findEnrollment.mockReturnValue({ curriculumId: 'c1', currentDay: 91 });
    findPlan.mockReturnValue(null);
    await expect(journeyDayTargetXp('t1', STUDENT)).resolves.toBeNull();
  });
});
