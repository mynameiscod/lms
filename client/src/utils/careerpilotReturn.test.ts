import { careerpilotReturn, withReturn, returnLabel } from './careerpilotReturn';

describe('careerpilotReturn', () => {
  it('honours a CareerPilot day', () => {
    expect(careerpilotReturn('?returnTo=%2Fcareerpilot%2Fjourney%2Fday%2F2')).toBe('/careerpilot/journey/day/2');
  });

  it('ignores anything that is not a CareerPilot path', () => {
    for (const bad of ['https://evil.example', '//evil.example/careerpilot/', '/quizzes', '/careerpilot\\..\\x', 'javascript:alert(1)', '']) {
      expect(careerpilotReturn(`?returnTo=${encodeURIComponent(bad)}`)).toBe('');
    }
    expect(careerpilotReturn('')).toBe('');
  });
});

describe('withReturn', () => {
  it('adds the return address, and leaves the path alone without one', () => {
    expect(withReturn('/quiz/q1/take', '/careerpilot/journey/day/2')).toBe('/quiz/q1/take?returnTo=%2Fcareerpilot%2Fjourney%2Fday%2F2');
    expect(withReturn('/a?x=1', '/careerpilot/journey/day/3')).toBe('/a?x=1&returnTo=%2Fcareerpilot%2Fjourney%2Fday%2F3');
    expect(withReturn('/quiz/q1/take', '')).toBe('/quiz/q1/take');
  });
});

describe('returnLabel', () => {
  it('names the day it goes back to', () => {
    expect(returnLabel('/careerpilot/journey/day/12')).toBe('Back to Day 12');
    expect(returnLabel('/careerpilot/roadmap')).toBe('Back to CareerPilot');
  });
});
