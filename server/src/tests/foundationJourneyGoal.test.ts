/**
 * Today's goal for a Foundation member is the journey day they are working on: its tasks plus the day bonus as the
 * target, and only the XP paid for THAT day as earned — not every point that happened to land today.
 */
const findEnrollment = jest.fn();
const findPlan = jest.fn();
const findLedger = jest.fn();
const chain = (value: any) => ({ sort: () => chain(value), select: () => chain(value), lean: async () => value });
jest.mock('../models/CurriculumEnrollment', () => ({ __esModule: true, default: { findOne: (...a: any[]) => chain(findEnrollment(...a)) } }));
jest.mock('../models/DayPlan', () => ({ __esModule: true, default: { findOne: (...a: any[]) => chain(findPlan(...a)) } }));
jest.mock('../models/GamificationModels', () => ({ XpLedger: { find: (...a: any[]) => chain(findLedger(...a)) } }));
jest.mock('../services/gamificationEngine', () => ({ processGamificationEvent: jest.fn() }));

import { journeyDayGoal } from '../services/foundationJourneyXpService';

const STUDENT = '64b000000000000000000001';
const DAY_ITEMS = [
  { kind: 'content', contentType: 'video' }, { kind: 'content', contentType: 'notes' },
  { kind: 'content', contentType: 'practice_theory' }, { kind: 'quiz', contentType: 'quiz' },
];

describe("today's goal for a Foundation member", () => {
  beforeEach(() => { findEnrollment.mockReset(); findPlan.mockReset(); findLedger.mockReset(); findPlan.mockReturnValue({ items: DAY_ITEMS }); });

  it("on Day 2, the goal is Day 2 — Day 1's XP (whenever it was credited) does not count: 0 / 65", async () => {
    findEnrollment.mockReturnValue({ _id: 'e1', curriculumId: 'c1', currentDay: 2 });
    findLedger.mockReturnValue([]);   // nothing paid for day 2
    await expect(journeyDayGoal('t1', STUDENT)).resolves.toEqual({ day: 2, target: 65, earned: 0 });
    expect(findPlan.mock.calls[0][0]).toEqual({ curriculumId: 'c1', dayNumber: 2 });
    expect(findLedger.mock.calls[0][0].sourceId).toEqual({ $regex: '^e1:2(:|$)' });
  });

  it('counts only what the current day has paid', async () => {
    findEnrollment.mockReturnValue({ _id: 'e1', curriculumId: 'c1', currentDay: 2 });
    findLedger.mockReturnValue([{ amount: 5 }, { amount: 10 }]);
    await expect(journeyDayGoal('t1', STUDENT)).resolves.toEqual({ day: 2, target: 65, earned: 15 });
  });

  it('finishing a day moves the goal to the next day, with the missions card', async () => {
    findEnrollment.mockReturnValue({ _id: 'e1', curriculumId: 'c1', currentDay: 3 });
    findLedger.mockReturnValue([]);
    await expect(journeyDayGoal('t1', STUDENT)).resolves.toEqual({ day: 3, target: 65, earned: 0 });
  });

  it('is null without a Foundation journey, so the caller keeps the topic goal', async () => {
    findEnrollment.mockReturnValue(null);
    await expect(journeyDayGoal('t1', STUDENT)).resolves.toBeNull();
  });
});
