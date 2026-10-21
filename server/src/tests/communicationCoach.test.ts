import { buildPrompt, levelFrom, readinessOf, signalTips } from '../services/communicationCoachService';
import { computeSignals } from '../services/communicationSignalsService';

const row = (day: string, overall: number, hes: number, baseline = false, area: any = 'intro') =>
  ({ _id: day + overall, practiceDate: day, createdAt: new Date(day), overall, hes, skills: null, area, baseline, step: 0 });

describe('communication coach', () => {
  it('starts everyone at the easiest level', () => expect(levelFrom([])).toBe(1));

  it('moves up as the student gets steadier and better, and back down when they freeze', () => {
    expect(levelFrom([{ overall: 30, hes: 70 }])).toBe(1);
    expect(levelFrom([{ overall: 45, hes: 50 }])).toBe(2);
    expect(levelFrom([{ overall: 60, hes: 35 }])).toBe(3);
    expect(levelFrom([{ overall: 80, hes: 15 }])).toBe(4);
  });

  it('levels 1 and 2 give help, level 3 gives none, level 4 adds a follow-up question', () => {
    const profile = { fullName: 'Asha', projectName: 'Shop', primarySkills: ['Java'] };
    expect(buildPrompt('intro', 1, profile).script).toContain('Asha');
    expect(buildPrompt('project', 2, profile).guide.length).toBeGreaterThan(0);
    const l3 = buildPrompt('hr', 3, profile); expect(l3.guide).toEqual([]); expect(l3.followUp).toBeNull();
    expect(buildPrompt('technical', 4, profile).followUp).toBeTruthy();
    expect(buildPrompt('technical', 3, profile).title).toContain('Java');
  });

  it('is the same prompt for the same day and step, so a refresh never changes the question', () => {
    expect(buildPrompt('hr', 3, {}, 20261021).ask).toBe(buildPrompt('hr', 3, {}, 20261021).ask);
  });

  it('is not ready until the baseline is done, there are enough recordings, and the student is steady', () => {
    const today = new Date().toISOString().slice(0, 10);
    const good = Array.from({ length: 6 }, () => row(today, 75, 15));
    expect(readinessOf(good, 3, 60).ready).toBe(false);
    expect(readinessOf(good, 4, 60).ready).toBe(false); // only one practice day
    const days = Array.from({ length: 6 }, (_, i) => row(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), 75, 15));
    expect(readinessOf(days, 4, 60).ready).toBe(true);
    const shaky = days.map((r) => ({ ...r, hes: 70 }));
    expect(readinessOf(shaky, 4, 60).ready).toBe(false);
  });

  it('turns measurements into advice a student can act on', () => {
    const s = computeSignals({ transcript: 'x '.repeat(20), durationSec: 20, targetSec: 90 });
    expect(signalTips(s).length).toBeGreaterThan(0);
    expect(signalTips(null)).toEqual([]);
  });
});

describe('readiness gate settings', () => {
  const load = (vals: Record<string, string>) => {
    jest.resetModules();
    jest.doMock('../services/settingsService', () => ({ getStr: (k: string, d: string) => (k in vals ? vals[k] : d) }));
    return require('../services/communicationCoachService');
  };
  afterEach(() => { jest.dontMock('../services/settingsService'); jest.resetModules(); });

  it('is on by default, from a start date, so students get time to do the baseline', () => {
    const g = load({}).gateInfo('t');
    expect(g.enabled).toBe(true);
    expect(g.startsOn).toBe('2026-10-28');
  });
  it('can be switched off, or moved, per institute', () => {
    expect(load({ COMMUNICATION_READINESS_GATE: 'false' }).gateInfo('t').active).toBe(false);
    expect(load({ COMMUNICATION_GATE_START: '2020-01-01' }).gateInfo('t').active).toBe(true);
    expect(load({ COMMUNICATION_GATE_START: '2999-01-01' }).gateInfo('t').active).toBe(false);
  });
});

describe('comparison periods', () => {
  const { aggregate, compareTwo } = require('../services/communicationCoachService');
  const att = (date: string, score: number, hes: number) => ({ practiceDate: date, evaluation: { overallScore: score }, wordsPerMinute: 120, coach: { signals: { hesitationIndex: hes, hasTiming: true, pausesPerMinute: hes / 5, timeToFirstWordSec: 2, fillerPer100Words: 3 }, skills: { fluency: score, confidence: 100 - hes, clarity: score, structure: score, content: score, language: score } } });
  const rows = [att('2026-10-20', 50, 60), att('2026-10-20', 54, 56), att('2026-10-21', 66, 35)];

  it('averages each day and marks lower hesitation as better', () => {
    const y = aggregate('Yesterday', '2026-10-20', '2026-10-20', rows);
    const t = aggregate('Today', '2026-10-21', '2026-10-21', rows);
    expect(y.recordings).toBe(2); expect(y.score).toBe(52); expect(t.score).toBe(66);
    const c = compareTwo('day', 'x', t, y, { now: 'today', before: 'yesterday' });
    expect(c.rows.find((r: any) => r.metric === 'Average score').verdict).toBe('better');
    expect(c.rows.find((r: any) => r.metric.startsWith('Hesitation')).verdict).toBe('better');
    expect(c.headline).toMatch(/up 14/); expect(c.headline).toMatch(/steadier/);
  });

  it('says so plainly when one side has no practice', () => {
    const none = aggregate('Yesterday', '2026-10-19', '2026-10-19', rows);
    const t = aggregate('Today', '2026-10-21', '2026-10-21', rows);
    expect(compareTwo('day', 'x', t, none, { now: 'today', before: 'yesterday' }).headline).toMatch(/Nothing to compare yet/);
    expect(compareTwo('day', 'x', none, t, { now: 'today', before: 'yesterday' }).headline).toMatch(/No practice today yet/);
  });
});
