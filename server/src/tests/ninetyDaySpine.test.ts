import {
  SPINE_BANDS, SPINE_DAYS, bandFor, bandByKey, depthFor, PHASES_AT_DEPTH, audienceServes,
} from '../data/ninetyDayPolicy';
import {
  selectNinetyDays, spineCoverage, SelectableDayUnit, SelectorInput,
} from '../services/ninetyDaySelectorService';

/**
 * Every first-year gets exactly ninety days.
 *
 * The plan used to be packed by capacity, so its length varied: a real student opened a roadmap
 * sold as ninety days and found twenty-eight. That was not a bug — the curriculum holds 1,560
 * minutes of work and ninety days of their stated capacity is 3,900 — but it was unexplainable,
 * which amounts to the same thing from where they were sitting.
 *
 * Ninety is now a STRUCTURE rather than an arithmetic outcome: seven bands of fixed length, and
 * personalisation happens inside each one. These tests exist to hold that line, because the
 * failure mode is silent — a plan that is quietly seventy-eight days long looks exactly like a
 * plan that is ninety until somebody counts.
 */

const unit = (over: Partial<SelectableDayUnit> & { band: any }): SelectableDayUnit => ({
  dayUnitId: over.dayUnitId || `du_${Math.random().toString(36).slice(2, 9)}`,
  band: over.band,
  displayOrder: over.displayOrder ?? 100,
  title: over.title || 'A day',
  skillKey: over.skillKey || 'SKILL',
  journeyTopic: over.journeyTopic || '',
  subtopics: over.subtopics || [],
  audience: over.audience,
  estimatedMinutes: over.estimatedMinutes ?? 45,
});

/** Enough authored days to fill every band, with nothing narrowed to anybody. */
const fullPool = (): SelectableDayUnit[] =>
  SPINE_BANDS.flatMap(b => Array.from({ length: b.days }, (_, i) =>
    unit({
      band: b.key, displayOrder: i, dayUnitId: `${b.key}_${i}`,
      title: `${b.label} ${i + 1}`, skillKey: `${b.key}_SKILL_${i}`,
    })));

const select = (over: Partial<SelectorInput> = {}) => selectNinetyDays({
  units: over.units || fullPool(),
  student: over.student || {},
  states: over.states,
  weakestSkills: over.weakestSkills,
});

describe('the spine itself', () => {
  it('adds up to ninety', () => {
    expect(SPINE_BANDS.reduce((n, b) => n + b.days, 0)).toBe(SPINE_DAYS);
  });

  it('runs day 1 to day 90 with no gap and no overlap', () => {
    // Ranges are derived from the band lengths rather than typed, so they cannot disagree with
    // them — this proves the derivation rather than the typing.
    expect(SPINE_BANDS[0].fromDay).toBe(1);
    expect(SPINE_BANDS[SPINE_BANDS.length - 1].toDay).toBe(SPINE_DAYS);
    for (let i = 1; i < SPINE_BANDS.length; i++) {
      expect(SPINE_BANDS[i].fromDay).toBe(SPINE_BANDS[i - 1].toDay + 1);
    }
  });

  it('puts every day in exactly one band', () => {
    for (let d = 1; d <= SPINE_DAYS; d++) expect(bandFor(d)).not.toBeNull();
    expect(bandFor(0)).toBeNull();
    expect(bandFor(SPINE_DAYS + 1)).toBeNull();
  });

  /**
   * Half the curriculum is foundations, and every later band is shorter than what it builds on.
   * That is the shape a first year should have, and it is the first thing that would erode if
   * somebody added a band without taking days from somewhere.
   */
  it('spends half of it on foundations', () => {
    const foundations = bandByKey('ORIENTATION')!.days + bandByKey('PROGRAMMING')!.days;
    expect(foundations).toBe(45);
    expect(foundations / SPINE_DAYS).toBe(0.5);
  });

  it('gives AI and the resume work to everybody', () => {
    // Shared bands never get a language or direction variant, which is why they are the cheapest
    // to author and the first that can ship.
    expect(bandByKey('AI')!.variance).toBe('SHARED');
    expect(bandByKey('SHOW_YOUR_WORK')!.variance).toBe('SHARED');
  });

  it('places showing your work straight after the project', () => {
    // On purpose: they have just built something, so there is finally something true to write
    // down. A resume band anywhere earlier is an exercise in inventing achievements.
    expect(bandByKey('SHOW_YOUR_WORK')!.fromDay).toBe(bandByKey('PROJECT')!.toDay + 1);
  });
});

describe('how deep a day goes', () => {
  it('gives a demonstrated topic a review rather than the lesson again', () => {
    expect(depthFor('VERIFIED')).toBe('REVIEW');
    expect(PHASES_AT_DEPTH.REVIEW).not.toContain('LEARN');
    expect(PHASES_AT_DEPTH.REVIEW).toContain('PRACTICE');
  });

  it('gives a measured gap the long version', () => {
    expect(depthFor('FOUNDATION_REQUIRED')).toBe('FULL');
    expect(PHASES_AT_DEPTH.FULL).toBeNull();   // null means every phase
  });

  /**
   * UNMEASURED IS NOT WEAK. Assuming the worst about somebody we never tested is the same
   * mistake as assuming the best, and it is the more insulting of the two.
   */
  it('treats unmeasured as ordinary, not as remedial', () => {
    expect(depthFor(undefined)).toBe('STANDARD');
    expect(depthFor('NOT_EXPOSED')).toBe('STANDARD');
    expect(depthFor('')).toBe('STANDARD');
  });

  it('never drops a day for being known — only shortens it', () => {
    const r = select({ states: new Map([['ORIENTATION_SKILL_0', 'VERIFIED']]) });
    expect(r.ok).toBe(true);
    expect(r.days).toHaveLength(SPINE_DAYS);
    expect(r.days.find(d => d.skillKey === 'ORIENTATION_SKILL_0')!.depth).toBe('REVIEW');
  });
});

describe('selecting a student’s ninety days', () => {
  it('returns exactly ninety, numbered 1 to 90', () => {
    const r = select();
    expect(r.ok).toBe(true);
    expect(r.days.map(d => d.day)).toEqual(Array.from({ length: SPINE_DAYS }, (_, i) => i + 1));
  });

  it('gives the same student the same plan every time', () => {
    // Pure in, pure out. Without the id tie-break this would depend on row order.
    const units = fullPool();
    const a = selectNinetyDays({ units, student: { language: 'python' } });
    const b = selectNinetyDays({ units: units.slice().reverse(), student: { language: 'python' } });
    expect(a.days.map(d => d.dayUnitId)).toEqual(b.days.map(d => d.dayUnitId));
  });

  it('keeps each band in its own day range', () => {
    const r = select();
    for (const d of r.days) {
      const band = bandByKey(d.band)!;
      expect(d.day).toBeGreaterThanOrEqual(band.fromDay);
      expect(d.day).toBeLessThanOrEqual(band.toDay);
    }
  });

  /**
   * A surplus in one band must not spill into the next. Letting programming run thirty-four days
   * because somebody authored four extra would push the project past day ninety and quietly cut
   * the checkpoint, which is how a structure stops being a structure.
   */
  it('does not let a generous band eat the one after it', () => {
    const pool = [...fullPool(), ...Array.from({ length: 8 }, (_, i) =>
      unit({ band: 'PROGRAMMING', displayOrder: 900 + i, dayUnitId: `EXTRA_${i}` }))];
    const r = selectNinetyDays({ units: pool, student: {} });
    expect(r.ok).toBe(true);
    expect(r.days.filter(d => d.band === 'PROGRAMMING')).toHaveLength(bandByKey('PROGRAMMING')!.days);
    expect(r.days.some(d => d.dayUnitId.startsWith('EXTRA_'))).toBe(false);
  });

  /**
   * THE FAILURE THAT HAS TO BE LOUD. A band it cannot fill is reported; it never quietly ships a
   * shorter plan. A silently seventy-eight-day roadmap is the exact bug this model replaces, and
   * it took a screenshot from a real student to notice it last time.
   */
  it('refuses rather than shipping a short plan', () => {
    const pool = fullPool().filter(u => !(u.band === 'AI' && u.displayOrder >= 6));
    const r = selectNinetyDays({ units: pool, student: {} });
    expect(r.ok).toBe(false);
    expect(r.shortfalls).toEqual([{ band: 'AI', needed: 10, available: 6 }]);
  });

  it('names every band it cannot fill, not just the first', () => {
    const r = selectNinetyDays({ units: [], student: {} });
    expect(r.ok).toBe(false);
    expect(r.shortfalls.map(s => s.band)).toEqual(SPINE_BANDS.map(b => b.key));
  });

  it('leaves a short band’s days as a hole rather than pulling the next band forward', () => {
    // So the shortfall is visible at the place it happened, instead of shifting everything after
    // it and making the plan look complete but wrong.
    const pool = fullPool().filter(u => !(u.band === 'ORIENTATION' && u.displayOrder >= 10));
    const r = selectNinetyDays({ units: pool, student: {} });
    expect(r.days.filter(d => d.band === 'ORIENTATION')).toHaveLength(10);
    const firstProgramming = r.days.find(d => d.band === 'PROGRAMMING')!;
    expect(firstProgramming.day).toBe(bandByKey('PROGRAMMING')!.fromDay);
  });
});

describe('who a day is for', () => {
  it('is for everyone when it names nobody', () => {
    expect(audienceServes(undefined, { language: 'c' })).toBe(true);
    expect(audienceServes({ languages: [] }, { language: 'c' })).toBe(true);
  });

  it('matches a language however it was typed', () => {
    expect(audienceServes({ languages: ['Python'] }, { language: 'python' })).toBe(true);
    expect(audienceServes({ languages: ['python'] }, { language: 'C' })).toBe(false);
  });

  it('requires every stated axis to hold, not just one', () => {
    const a = { languages: ['python'], directions: ['DATA'] };
    expect(audienceServes(a, { language: 'python', direction: 'DATA' })).toBe(true);
    expect(audienceServes(a, { language: 'python', direction: 'WEB_DEVELOPMENT' })).toBe(false);
  });

  /**
   * The point of the whole model: two students, the same ninety days, different content.
   */
  it('gives a C student and a Python student different days and the same count', () => {
    const shared = SPINE_BANDS.filter(b => b.key !== 'PROGRAMMING')
      .flatMap(b => Array.from({ length: b.days }, (_, i) =>
        unit({ band: b.key, displayOrder: i, dayUnitId: `${b.key}_${i}` })));
    const perLanguage = (lang: string) => Array.from({ length: 30 }, (_, i) =>
      unit({
        band: 'PROGRAMMING', displayOrder: i, dayUnitId: `PROG_${lang}_${i}`,
        title: `${lang} day ${i + 1}`, audience: { languages: [lang] },
      }));
    const units = [...shared, ...perLanguage('c'), ...perLanguage('python')];

    const c = selectNinetyDays({ units, student: { language: 'c' } });
    const py = selectNinetyDays({ units, student: { language: 'python' } });

    expect(c.ok).toBe(true);
    expect(py.ok).toBe(true);
    expect(c.days).toHaveLength(SPINE_DAYS);
    expect(py.days).toHaveLength(SPINE_DAYS);

    const progOf = (r: any) => r.days.filter((d: any) => d.band === 'PROGRAMMING').map((d: any) => d.dayUnitId);
    expect(progOf(c).every((id: string) => id.includes('_c_'))).toBe(true);
    expect(progOf(py).every((id: string) => id.includes('_python_'))).toBe(true);
    expect(progOf(c)).not.toEqual(progOf(py));
  });
});

describe('the checkpoint is computed, not chosen', () => {
  it('revisits the days they did worst at', () => {
    const pool = fullPool().filter(u => u.band !== 'CHECKPOINT');
    const r = selectNinetyDays({
      units: pool,
      student: {},
      weakestSkills: ['PROGRAMMING_SKILL_3', 'PROGRAMMING_SKILL_7'],
    });
    expect(r.ok).toBe(true);
    const checkpoint = r.days.filter(d => d.band === 'CHECKPOINT');
    expect(checkpoint).toHaveLength(5);
    expect(checkpoint.map(d => d.skillKey)).toContain('PROGRAMMING_SKILL_3');
  });

  it('only ever revisits days already in this student’s own plan', () => {
    const pool = fullPool().filter(u => u.band !== 'CHECKPOINT');
    const r = selectNinetyDays({ units: pool, student: {}, weakestSkills: ['NEVER_IN_THE_PLAN'] });
    const earlier = new Set(r.days.filter(d => d.band !== 'CHECKPOINT').map(d => d.dayUnitId));
    for (const d of r.days.filter(d => d.band === 'CHECKPOINT')) {
      // A checkpoint on material they never met is not a checkpoint.
      expect(earlier.has(d.dayUnitId)).toBe(true);
    }
  });

  /**
   * The one band that can never be the short one. Every other band needs somebody to have
   * authored enough; this revisits days the student already has, and eighty-five of them come
   * before it.
   */
  it('fills itself from the plan, with no authored days at all', () => {
    const pool = fullPool().filter(u => u.band !== 'CHECKPOINT');
    const r = selectNinetyDays({ units: pool, student: {}, weakestSkills: ['PROGRAMMING_SKILL_3'] });
    expect(r.ok).toBe(true);
    expect(r.days.filter(d => d.band === 'CHECKPOINT')).toHaveLength(5);
    expect(r.shortfalls).toEqual([]);
  });

  it('still fills the band for a student with no evidence at all', () => {
    const r = select({ weakestSkills: [] });
    expect(r.ok).toBe(true);
    expect(r.days.filter(d => d.band === 'CHECKPOINT')).toHaveLength(5);
  });
});

describe('coverage, for the people authoring it', () => {
  /**
   * Nobody could see the shortfall until a student complained, which is exactly how a
   * twenty-eight-day plan reached production. A content team needs the number on a screen.
   */
  it('says how much of the spine is authored, band by band', () => {
    const pool = fullPool().filter(u => !(u.band === 'AI' && u.displayOrder >= 4));
    const c = spineCoverage({ units: pool, student: {} });
    expect(c.total).toBe(SPINE_DAYS);
    expect(c.filled).toBe(SPINE_DAYS - 6);
    expect(c.rows.find(r => r.band === 'AI')).toMatchObject({ needed: 10, available: 4, complete: false });
    expect(c.rows.find(r => r.band === 'PROGRAMMING')!.complete).toBe(true);
  });

  it('does not count a surplus as more than the band needs', () => {
    const pool = [...fullPool(), ...Array.from({ length: 20 }, (_, i) =>
      unit({ band: 'AI', displayOrder: 500 + i, dayUnitId: `AI_EXTRA_${i}` }))];
    expect(spineCoverage({ units: pool, student: {} }).filled).toBe(SPINE_DAYS);
  });

  it('reports coverage for the student it is asked about', () => {
    // A track with no Python days is not "90 authored" for a Python student, however much C
    // material exists. Coverage that ignored audience would tell an author they were finished.
    const units = fullPool().map(u => (u.band === 'PROGRAMMING'
      ? { ...u, audience: { languages: ['c'] } } : u));
    expect(spineCoverage({ units, student: { language: 'c' } }).filled).toBe(SPINE_DAYS);
    expect(spineCoverage({ units, student: { language: 'python' } }).filled).toBe(SPINE_DAYS - 30);
  });
});
