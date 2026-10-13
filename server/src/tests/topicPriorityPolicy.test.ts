import { draftPriorities, summarisePriorities, TopicFacts } from '../data/topicPriorityPolicy';

const topic = (code: string, over: Partial<TopicFacts> = {}): TopicFacts => ({
  topicCode: code, title: code, order: 0, backbone: false, mandatory: false,
  minutes: 600, hasCheckpoint: false, skillKeys: [], ...over,
});

describe('the draft of topic priorities', () => {
  it('makes Year 1’s backbone MUST, and never trims it to fit', () => {
    const topics = [topic('A', { backbone: true, minutes: 5000 }), topic('B', { mandatory: true }), topic('C')];
    const r = draftPriorities(topics, { isFoundation: true, neededByLater: new Set(), mustCapMinutes: 100 });
    expect(r.priorities.get('A')).toBe('MUST');
    expect(r.priorities.get('B')).toBe('SHOULD');
    expect(r.priorities.get('C')).toBe('OPTIONAL');
    expect(r.demoted).toEqual([]);
  });

  it('in a later year, a backbone topic is MUST when a later year builds on it or it is checked', () => {
    const topics = [
      topic('LOADBEARING', { backbone: true, skillKeys: ['OOP'] }),
      topic('CHECKED', { backbone: true, hasCheckpoint: true }),
      topic('PLAIN', { backbone: true }),
      topic('EXTRA', { mandatory: true }),
      topic('NICE'),
    ];
    const r = draftPriorities(topics, { isFoundation: false, neededByLater: new Set(['OOP']), mustCapMinutes: 1e9 });
    expect(r.priorities.get('LOADBEARING')).toBe('MUST');
    expect(r.priorities.get('CHECKED')).toBe('MUST');
    expect(r.priorities.get('PLAIN')).toBe('SHOULD');
    expect(r.priorities.get('EXTRA')).toBe('SHOULD');
    expect(r.priorities.get('NICE')).toBe('OPTIONAL');
  });

  it('in the final year, every backbone topic is a MUST candidate — nothing later depends on it', () => {
    const r = draftPriorities([topic('CAPSTONE', { backbone: true })],
      { isFoundation: false, isFinalYear: true, neededByLater: new Set(), mustCapMinutes: 1e9 });
    expect(r.priorities.get('CAPSTONE')).toBe('MUST');
  });

  /**
   * THE MUST LIST MUST FIT. Its hours may not exceed what the year can hold after the bridge, or
   * "never left out" is a promise the roadmap cannot keep. The least load-bearing go first.
   */
  it('moves the least load-bearing MUST topics to SHOULD until the list fits', () => {
    const topics = [
      topic('CORE', { backbone: true, skillKeys: ['A', 'B'], hasCheckpoint: true, order: 1 }),
      topic('SOME', { backbone: true, skillKeys: ['A'], order: 2 }),
      topic('CHECK', { backbone: true, hasCheckpoint: true, order: 3 }),
    ];
    const r = draftPriorities(topics, { isFoundation: false, neededByLater: new Set(['A', 'B']), mustCapMinutes: 1200 });
    expect(r.demoted).toEqual(['CHECK']);
    expect(r.priorities.get('CORE')).toBe('MUST');
    expect(r.priorities.get('SOME')).toBe('MUST');
    expect(r.overCap).toBe(false);
  });

  it('never changes a priority an admin set — and reports when admin MUSTs alone exceed the cap', () => {
    const topics = [
      topic('MINE', { backbone: true, priority: 'OPTIONAL', prioritySource: 'ADMIN', skillKeys: ['A'] }),
      topic('BIG', { priority: 'MUST', prioritySource: 'ADMIN', minutes: 9999 }),
    ];
    const r = draftPriorities(topics, { isFoundation: false, neededByLater: new Set(['A']), mustCapMinutes: 100 });
    expect(r.priorities.get('MINE')).toBe('OPTIONAL');
    expect(r.priorities.get('BIG')).toBe('MUST');
    expect(r.overCap).toBe(true);
  });
});

it('summarises topics and minutes per priority', () => {
  const s = summarisePriorities([{ minutes: 60, priority: 'MUST' }, { minutes: 30, priority: 'MUST' }, { minutes: 10 }]);
  expect(s.MUST).toEqual({ topics: 2, minutes: 90 });
  expect(s.UNSET).toEqual({ topics: 1, minutes: 10 });
});
