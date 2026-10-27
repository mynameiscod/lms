import {
  placementSplit, resolveSplit, trackTopics, trackProblems, stageProblems, validateTrackInput, validatePackInput, normaliseKey,
  PackDef, DEFAULT_TRACK_SPLIT,
} from '../data/careerTrackPolicy';

const pack = (key: string, kind: 'SKILL' | 'PLACEMENT', topics: [string, 'CORE' | 'MUST' | 'SHOULD' | 'OPTIONAL'][]): PackDef =>
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
  });  it('CORE outranks MUST when two packs share a topic', () => {
    const core = new Map([['A', pack('A', 'SKILL', [['RAG', 'MUST']])], ['B', pack('B', 'SKILL', [['RAG', 'CORE']])]]);
    expect(trackTopics(['A', 'B'], core)[0]).toMatchObject({ topicCode: 'RAG', priority: 'CORE' });
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
  it('a Year-3 roadmap needs only the Year-3 packs; Year 4 needs both', () => {
    const t = { key: 'J', name: 'J', language: 'Java', specializePacks: ['JAVA'], placementPacks: [] };
    expect(stageProblems(t, packs, 'specialize')).toEqual([]);
    expect(stageProblems(t, packs, 'placement').join(' ')).toMatch(/Year 4 placement has no packs/);
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

describe('the track follows setup (role + main language)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { deriveTrackKey } = require('../data/careerTrackPolicy');
  it('maps software / full stack roles by language', () => {
    expect(deriveTrackKey('FULLSTACK_ENGINEER', ['Java', 'JavaScript'])).toBe('JAVA_FULLSTACK_AI');
    expect(deriveTrackKey('SOFTWARE_ENGINEER', ['Python'])).toBe('PY_FULLSTACK_AI');
    expect(deriveTrackKey('BACKEND_ENGINEER', ['C#'])).toBe('DOTNET_FULLSTACK_AI');
  });
  it('maps the data roles whatever the language', () => {
    expect(deriveTrackKey('DATA_ANALYST', [])).toBe('DATA_ANALYTICS_AI');
    expect(deriveTrackKey('DATA_SCIENTIST', ['Python'])).toBe('DATA_SCIENCE_AI');
  });
  it('maps each AI role to its own track whatever the language', () => {
    expect(deriveTrackKey('AI_ENGINEER', ['Java'])).toBe('AI_ENGINEERING');
    expect(deriveTrackKey('GENERATIVE_AI_ENGINEER', [])).toBe('GENAI_ENGINEERING');
    expect(deriveTrackKey('AGENTIC_AI_ENGINEER', ['Python'])).toBe('AGENTIC_AI');
    expect(deriveTrackKey('MLOPS_ENGINEER', ['C#'])).toBe('MLOPS');
    expect(deriveTrackKey('AI_SECURITY_ENGINEER', ['Not Sure'])).toBe('AI_SECURITY');
  });
  it('maps the cybersecurity analyst role whatever the language', () => {
    expect(deriveTrackKey('CYBERSECURITY_ANALYST', ['Java'])).toBe('CYBERSECURITY');
    expect(deriveTrackKey('CYBERSECURITY_ANALYST', [])).toBe('CYBERSECURITY');
    expect(deriveTrackKey('CLOUD_DEVOPS', ['Python'])).toBe('CLOUD_DEVOPS');
    expect(deriveTrackKey('DEVOPS_ENGINEER', [])).toBe('CLOUD_DEVOPS');
    expect(deriveTrackKey('SITE_RELIABILITY_ENGINEER', ['Go'])).toBe('CLOUD_DEVOPS');
  });
  it('gives no track when the member is not sure or has no main language', () => {
    expect(deriveTrackKey('NOT_SURE', ['Java'])).toBeNull();
    expect(deriveTrackKey('FULLSTACK_ENGINEER', ['Not Sure'])).toBeNull();
    expect(deriveTrackKey('FULLSTACK_ENGINEER', ['JavaScript'])).toBeNull();
    expect(deriveTrackKey('QA_SDET', ['Java'])).toBeNull();
  });
});
