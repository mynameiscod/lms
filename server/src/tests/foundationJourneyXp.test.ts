/**
 * Foundation journey XP — what each task is worth, and when it counts as finished.
 *
 * The amounts were agreed with the product owner ("by effort"); these pin them so a change is a decision,
 * not an accident. Finishing is the day player's rule, except that an optional task earns only when it was
 * really done (itemDone counts optional tasks as done for gating, which must not pay).
 */
import { xpForJourneyItem, journeyItemFinished, FOUNDATION_DAY_BONUS_XP } from '../services/foundationJourneyXpService';
import { xpEvent } from '../data/gamificationPolicy';

describe('foundation journey XP amounts', () => {
  it('prices tasks by effort', () => {
    expect(xpForJourneyItem({ kind: 'content', contentType: 'video' })).toBe(5);
    expect(xpForJourneyItem({ kind: 'content', contentType: 'notes' })).toBe(5);
    expect(xpForJourneyItem({ kind: 'content', contentType: 'worked_example' })).toBe(5);
    expect(xpForJourneyItem({ kind: 'content', contentType: 'practice_theory' })).toBe(10);
    expect(xpForJourneyItem({ kind: 'content', contentType: 'practice_coding' })).toBe(15);
    expect(xpForJourneyItem({ kind: 'quiz', contentType: 'quiz' })).toBe(20);
    expect(xpForJourneyItem({ kind: 'assignment', contentType: 'assignment' })).toBe(30);
    expect(FOUNDATION_DAY_BONUS_XP).toBe(25);
  });

  it('falls back by kind, and never double-pays a mock interview', () => {
    expect(xpForJourneyItem({ kind: 'quiz' })).toBe(20);
    expect(xpForJourneyItem({ kind: 'codeSnippet' })).toBe(15);
    expect(xpForJourneyItem({ kind: 'mockInterview', contentType: 'video' })).toBe(0);
    expect(xpForJourneyItem({ kind: 'content', contentType: 'something_new' })).toBe(5);
  });

  it('registers both events with the gamification policy', () => {
    expect(xpEvent('FOUNDATION_ACTIVITY_COMPLETED')?.uniqueSource).toBe(true);
    expect(xpEvent('FOUNDATION_DAY_COMPLETED')?.defaultXp).toBe(25);
  });
});

describe('foundation journey task finished', () => {
  const completed = [{ contentId: 'c1', dayNumber: 3 }];
  const modules = { q1: { attempted: true }, q2: { attempted: false } };

  it('counts a lesson marked done on that day only', () => {
    expect(journeyItemFinished({ kind: 'content', contentId: 'c1' }, 3, completed, modules)).toBe(true);
    expect(journeyItemFinished({ kind: 'content', contentId: 'c1' }, 4, completed, modules)).toBe(false);
  });

  it('counts a checkpoint once it is attempted', () => {
    expect(journeyItemFinished({ kind: 'quiz', sourceId: 'q1' }, 3, completed, modules)).toBe(true);
    expect(journeyItemFinished({ kind: 'quiz', sourceId: 'q2' }, 3, completed, modules)).toBe(false);
  });

  it('does not pay an optional task that was not done', () => {
    expect(journeyItemFinished({ kind: 'content', contentId: 'c9', required: false }, 3, completed, modules)).toBe(false);
  });
});
