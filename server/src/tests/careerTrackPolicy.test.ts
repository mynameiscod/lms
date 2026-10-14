import {
  placementSplit, resolveSplit, trackTopics, trackProblems, validateTrackInput, validatePackInput, normaliseKey,
  PackDef, DEFAULT_TRACK_SPLIT,
} from '../data/careerTrackPolicy';

const pack = (key: string, kind: 'SKILL' | 'PLACEMENT', topics: [string, 'MUST' | 'SHOULD' | 'OPTIONAL'][]): PackDef =>
  ({ key, title: key, kind, topics: topics.map(([topicCode, priority]) => ({ topicCode, priority })) });

describe('Year 4: track days and placement days', () => {
  it('a member who did Year 3 on the track gets a short revision; the rest is placement', () => {
    expect(placementSplit(150, true)).toEqual({ trackDays: 23, placementDays: 127 });
  });
  it('a fresh joiner gets the track essentials first', () => {
    expect(placementSplit(150, false)).toEqual({ trackDays: 60, placementDays: 90 });
  });
  it('always adds up to the admin\'s days and leaves each part at least a day', () => {
    for (const days of [2, 7, 90, 150, 200]) {
      for (const member of [true, false]) {
        const s = placementSplit(days, member, { memberTrackShare: 0, freshTrackShare: 0.8 });
        expect(s.trackDays + s.placementDays).toBe(days);
        expect(s.trackDays).toBeGreaterThanOrEqual(1);
        expect(s.placementDays).toBeGreaterThanOrEqual(1);
      }
    }
  });
  it('the admin\'s shares are used, and nonsense falls back to the defaults', () => {
    expect(placementSplit(100, false, { freshTrackShare: 0.3 }).trackDays).toBe(30);
    expect(resolveSplit({ memberTrackShare: 'x' as any, freshTrackShare: 9 })).toEqual({ memberTrackShare: DEFAULT_TRACK_SPLIT.memberTrackShare, freshTrackShare: 0.8 });
  });
});

describe('a stage\'s topics, in teaching order', () => {
  const packs = new Map([
    ['WEB', pack('WEB', 'SKILL', [['HTML', 'MUST'], ['CSS', 'SHOULD']])],
    ['REACT', pack('REACT', 'SKILL', [['CSS', 'MUST'], ['REACT_HOOKS', 'MUST']])],
  ]);
  it('packs in the track\'s order, topics in each pack\'s order', () => {
    expect(trackTopics(['WEB', 'REACT'], packs).map(t => t.topicCode)).toEqual(['HTML', 'CSS', 'REACT_HOOKS']);
  });
  it('a topic two packs share is taught once, where it first appears, at the higher priority', () => {
    const css = trackTopics(['WEB', 'REACT'], packs).find(t => t.topicCode === 'CSS')!;
    expect(css).toMatchObject({ packKey: 'WEB', priority: 'MUST' });
  });
  it('skips a pack the catalogue does not hold', () => {
    expect(trackTopics(['NOPE', 'WEB'], packs).map(t => t.topicCode)).toEqual(['HTML', 'CSS']);
  });
});

describe('what stops a track from going live', () => {
  const packs = new Map([
    ['JAVA', pack('JAVA', 'SKILL', [['JAVA_BASICS', 'MUST']])],
    ['JAVA_INTERVIEW', pack('JAVA_INTERVIEW', 'PLACEMENT', [['JAVA_IQ', 'MUST']])],
    ['EMPTY', pack('EMPTY', 'SKILL', [])],
  ]);
  it('a complete track has no problems', () => {
    expect(trackProblems({ key: 'J', name: 'J', language: 'Java', specializePacks: ['JAVA'], placementPacks: ['JAVA_INTERVIEW'] }, packs)).toEqual([]);
  });
  it('names a missing pack, an empty pack, a pack of the wrong kind and an empty year', () => {
    const p = trackProblems({ key: 'J', name: 'J', language: 'Java', specializePacks: ['MISSING', 'EMPTY', 'JAVA_INTERVIEW'], placementPacks: [] }, packs);
    expect(p.join(' | ')).toMatch(/MISSING/);
    expect(p.join(' | ')).toMatch(/no topics/);
    expect(p.join(' | ')).toMatch(/placement pack, not a skill pack/);
    expect(p.join(' | ')).toMatch(/Year 4 placement has no packs/);
  });
});

describe('admin input', () => {
  it('keys are UPPER_SNAKE', () => {
    expect(normaliseKey(' java full-stack + ai ')).toBe('JAVA_FULL_STACK_AI');
  });
  it('a track needs a key, name and language; packs are de-duplicated', () => {
    expect(validateTrackInput({}).ok).toBe(false);
    const ok = validateTrackInput({ key: 'java fullstack ai', name: 'Java Full Stack + AI', language: 'Java', specializePacks: ['web', 'WEB', 'java'] });
    expect(ok.ok && ok.value.specializePacks).toEqual(['WEB', 'JAVA']);
  });
  it('refuses a share above the maximum', () => {
    expect(validateTrackInput({ key: 'J', name: 'J', language: 'Java', split: { freshTrackShare: 0.95 } }).ok).toBe(false);
  });
  it('a pack refuses a topic twice or a bad priority', () => {
    expect(validatePackInput({ key: 'P', title: 'P', topics: [{ topicCode: 'A' }, { topicCode: 'A' }] }).ok).toBe(false);
    expect(validatePackInput({ key: 'P', title: 'P', topics: [{ topicCode: 'A', priority: 'HIGH' }] }).ok).toBe(false);
    const ok = validatePackInput({ key: 'spring boot', title: 'Spring Boot', kind: 'skill', topics: [{ topicCode: 'SB_REST', priority: 'must' }] });
    expect(ok.ok && ok.value).toEqual({ key: 'SPRING_BOOT', title: 'Spring Boot', kind: 'SKILL', topics: [{ topicCode: 'SB_REST', priority: 'MUST' }] });
  });
});
