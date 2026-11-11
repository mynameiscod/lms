/**
 * The shipped question books (seeds/questionBooks) and who sees them.
 *
 * Every book must pass the seed's own lint (so a broken book is caught here, not on the production
 * run), and the year/track rule must send each member the books meant for them.
 */
import { ALL_BOOKS } from '../seeds/questionBooks/allBooks';
import { lintBook } from '../seeds/questionBooks/seedQuestionBooks';
import { TRACKS } from '../seeds/careerPilot/careerTrackDefinitions';
import { readerTarget } from '../services/questionBookService';

const trackKeys = new Set(TRACKS.map((t) => t.key));

describe('shipped question books', () => {
  it.each(ALL_BOOKS.map((b) => [b.slug, b] as const))('%s passes the seed lint', (_slug, book) => {
    expect(lintBook(book, trackKeys)).toEqual([]);
  });

  it('slugs are unique', () => {
    const slugs = ALL_BOOKS.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every book has about 40 questions', () => {
    for (const b of ALL_BOOKS) {
      const n = b.chapters.reduce((s, c) => s + c.questions.length, 0);
      expect([b.slug, n >= 35 && n <= 60]).toEqual([b.slug, true]);
    }
  });

  it('a career-track book is for CareerPilot members in Year 3 and 4 only', () => {
    for (const b of ALL_BOOKS.filter((x) => x.tracks.length)) {
      expect([b.slug, b.audience]).toEqual([b.slug, 'careerpilot']);
      expect([b.slug, [...b.stages].sort()]).toEqual([b.slug, ['placement', 'specialize']]);
    }
  });
});

describe('which year and track a member reads books for', () => {
  const m = (stage?: string, track?: string) => ({ passport: { stage, careerTrack: track ? { key: track } : undefined } });

  it('Year 1 and 2 read their own year', () => {
    expect(readerTarget(m('foundation'))).toEqual({ stage: 'foundation', track: null });
    expect(readerTarget(m('build'))).toEqual({ stage: 'build', track: null });
  });

  it('a member with no stage yet reads Year 1', () => {
    expect(readerTarget(m())).toEqual({ stage: 'foundation', track: null });
  });

  it('Year 3 and 4 with a track read for that track', () => {
    expect(readerTarget(m('specialize', 'JAVA_FULLSTACK_AI'))).toEqual({ stage: 'specialize', track: 'JAVA_FULLSTACK_AI' });
    expect(readerTarget(m('placement', 'DATA_ANALYTICS_AI'))).toEqual({ stage: 'placement', track: 'DATA_ANALYTICS_AI' });
  });

  it('Year 3 and 4 with no track yet read as Year 2', () => {
    expect(readerTarget(m('specialize'))).toEqual({ stage: 'build', track: null });
    expect(readerTarget(m('placement'))).toEqual({ stage: 'build', track: null });
  });

  it('a job seeker reads as Year 4', () => {
    expect(readerTarget(m('job_seeker', 'QA_SDET'))).toEqual({ stage: 'placement', track: 'QA_SDET' });
  });
});
