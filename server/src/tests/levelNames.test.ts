import { levelFromXp, levelName, xpToReachLevel } from '../services/passportGamificationService';
import { DEFAULT_LEVEL_NAMES } from '../data/gamificationPolicy';
import { ruleSentence } from '../services/badgeService';

describe('level names', () => {
  it('keeps the shipped names when the admin has named nothing', () => {
    expect(levelFromXp(0).title).toBe('Career Explorer');
    expect(levelName(3)).toBe('Rookie Coder');
    expect(levelName(20)).toBe('Placement Legend');
    expect(levelName(60)).toBe(DEFAULT_LEVEL_NAMES[DEFAULT_LEVEL_NAMES.length - 1]);
  });

  it("uses the admin's name for each level, and the last one past the end", () => {
    const names = ['Fresher', 'Learner', 'Builder'];
    const lv = levelFromXp(xpToReachLevel(2), names);
    expect(lv.level).toBe(2);
    expect(lv.title).toBe('Learner');
    expect(lv.nextTitle).toBe('Builder');
    expect(levelFromXp(xpToReachLevel(9), names).title).toBe('Builder');
  });

  it('falls back to the shipped names for an empty list', () => {
    expect(levelFromXp(0, []).title).toBe('Career Explorer');
  });
});

describe('badge rule in words', () => {
  it('says what the member has to do', () => {
    expect(ruleSentence('MOCK_INTERVIEWS', 5)).toBe('Finish 5 mock interviews');
    expect(ruleSentence('MOCK_INTERVIEWS', 1)).toBe('Finish 1 mock interview');
    expect(ruleSentence('STREAK', 7)).toBe('Hit a 7-day streak');
    expect(ruleSentence('XP_TOTAL', 5000)).toBe('Earn 5,000 XP');
  });
});
