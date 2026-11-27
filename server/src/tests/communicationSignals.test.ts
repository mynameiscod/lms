import { computeSignals, countRestarts, labelFor, TimedWord } from '../services/communicationSignalsService';

const speak = (n: number, gapAfter: Record<number, number> = {}, startAt = 0.3): TimedWord[] => {
  const out: TimedWord[] = []; let t = startAt;
  for (let i = 0; i < n; i++) { out.push({ word: `w${i}`, start: t, end: t + 0.3 }); t += 0.3 + 0.1 + (gapAfter[i] || 0); }
  return out;
};

describe('communication signals', () => {
  it('a steady speaker is calm', () => {
    const words = speak(120);
    const s = computeSignals({ words, transcript: words.map((w) => w.word).join(' '), durationSec: 60, targetSec: 60 });
    expect(s.hasTiming).toBe(true);
    expect(s.pauseCount).toBe(0);
    expect(s.label).toBe('calm');
    expect(s.hesitationIndex).toBeLessThan(25);
  });

  it('long silences, a late start and stopping early read as freezing', () => {
    const words = speak(40, { 5: 4, 12: 5, 20: 3.5, 28: 6 }, 7);
    const s = computeSignals({ words, transcript: words.map((w) => w.word).join(' '), durationSec: 50, targetSec: 120, fillerTotal: 8 });
    expect(s.longPauseCount).toBe(4);
    expect(s.longestPauseSec).toBeCloseTo(6.1, 1);
    expect(s.timeToFirstWordSec).toBe(7);
    expect(s.stoppedEarly).toBe(true);
    expect(s.hesitationIndex).toBeGreaterThanOrEqual(50);
  });

  it('counts only the pauses a listener would notice', () => {
    const words = speak(30, { 4: 0.5, 9: 1.2, 15: 2 });
    const s = computeSignals({ words, transcript: 'x '.repeat(30), durationSec: 30 });
    expect(s.pauseCount).toBe(2);
  });

  it('still returns something useful with no word timings', () => {
    const s = computeSignals({ transcript: 'um um I I mean sorry', durationSec: 10, targetSec: 60, fillerTotal: 3 });
    expect(s.hasTiming).toBe(false);
    expect(s.pauseCount).toBe(0);
    expect(s.stoppedEarly).toBe(true);
    expect(s.hesitationIndex).toBeGreaterThan(0);
  });

  it('counts restarts and stutters', () => {
    expect(countRestarts('I I went to the the college, sorry, let me start again')).toBe(4);
    expect(countRestarts('I went to college and studied computer science')).toBe(0);
  });

  it('labels the bands', () => {
    expect(labelFor(10)).toBe('calm'); expect(labelFor(30)).toBe('some_hesitation');
    expect(labelFor(60)).toBe('high_hesitation'); expect(labelFor(90)).toBe('freezing');
  });
});
