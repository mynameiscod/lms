/**
 * The per-candidate question draw.
 *
 * Three properties, and a silent failure in any of them poisons every score in the event:
 *
 *   REPRODUCIBLE. A disputed question has to be answerable with "here is exactly what that
 *   person sat, and here is why". Without it, a broken question cannot be voided fairly.
 *
 *   DIFFERENT PER PERSON. Teammates share a team average, so they are motivated to help each
 *   other. Identical papers make that trivial.
 *
 *   NEVER SHORT. A paper quietly missing its coding question is graded out of a different
 *   total from everyone else's, and drags a team average with no sign that anything happened.
 */

const mockFind = jest.fn();
jest.mock('../models/AssessmentItem', () => ({
  __esModule: true,
  default: { find: (...a: any[]) => mockFind(...a) },
}));

import {
  drawForAttempt, checkDrawCoverage, sectionFilter, newDrawSeed, clearDrawPoolCache,
} from '../services/hackathonExamDrawService';

/** The bank, as the service reads it: find().select().lean() */
const bank = (items: any[]) => {
  mockFind.mockImplementation((filter: any) => ({
    select: () => ({
      lean: async () => items.filter((i) => matches(i, filter)),
    }),
  }));
};

/** A small stand-in for the parts of the Mongo query the service actually builds. */
function matches(item: any, f: any): boolean {
  if (f.active !== undefined && item.active !== f.active) return false;
  if (f.type?.$in && !f.type.$in.includes(item.type)) return false;
  if (f.difficulty && (item.difficulty < f.difficulty.$gte || item.difficulty > f.difficulty.$lte)) return false;
  if (f.dimension?.$in && !f.dimension.$in.includes(item.dimension)) return false;
  if (f.tags?.$in && !(item.tags || []).some((t: string) => f.tags.$in.includes(t))) return false;
  if (f.languages?.$in && !f.languages.$in.includes(item.language)) return false;
  if (f.language?.$in && !f.language.$in.includes(item.language)) return false;
  return true;
}

const item = (id: string, over: any = {}) => ({
  _id: id, type: 'mcq', dimension: 'fundamentals', difficulty: 2,
  points: 1, active: true, tags: ['DSA_ARRAYS'], language: undefined, ...over,
});

const section = (over: any = {}) => ({
  key: 'mcq', label: 'Multiple choice', types: ['mcq'], drawCount: 5,
  dimensions: [], tags: [], languages: [], minDifficulty: 1, maxDifficulty: 5,
  marksPerItem: 0, ...over,
});

const exam = (sections: any[]): any => ({ _id: 'e1', tenantId: 't1', sections });

const manyMcqs = (n: number) => Array.from({ length: n }, (_, i) => item(`m${String(i).padStart(3, '0')}`));

beforeEach(() => {
  clearDrawPoolCache();
  mockFind.mockReset();
});

describe('the draw is reproducible', () => {
  it('gives the same paper for the same seed', async () => {
    bank(manyMcqs(40));
    const e = exam([section()]);
    const a = await drawForAttempt(e, 'seed-alpha');
    clearDrawPoolCache();
    const b = await drawForAttempt(e, 'seed-alpha');
    expect(a.map((d) => String(d.itemId))).toEqual(b.map((d) => String(d.itemId)));
  });

  it('gives a different paper for a different seed', async () => {
    bank(manyMcqs(40));
    const e = exam([section()]);
    const a = await drawForAttempt(e, 'seed-alpha');
    const b = await drawForAttempt(e, 'seed-beta');
    expect(a.map((d) => String(d.itemId))).not.toEqual(b.map((d) => String(d.itemId)));
  });

  /**
   * Two sections drawing from overlapping pools must not hand the candidate the same item
   * twice. The seed is combined with the section key for exactly this reason.
   */
  it('does not repeat an item across sections drawing from the same pool', async () => {
    bank(manyMcqs(40));
    const e = exam([
      section({ key: 'a', drawCount: 8 }),
      section({ key: 'b', drawCount: 8 }),
    ]);
    const drawn = await drawForAttempt(e, 'seed-alpha');
    const a = drawn.filter((d) => d.sectionKey === 'a').map((d) => String(d.itemId));
    const b = drawn.filter((d) => d.sectionKey === 'b').map((d) => String(d.itemId));
    expect(a).not.toEqual(b);
  });

  it('issues an unguessable seed of real length', () => {
    const seeds = new Set(Array.from({ length: 50 }, () => newDrawSeed()));
    expect(seeds.size).toBe(50);
    expect(newDrawSeed()).toMatch(/^[0-9a-f]{24}$/);
  });
});

describe('the draw never comes up short', () => {
  it('throws, naming the section and the shortfall, rather than drawing fewer', async () => {
    bank(manyMcqs(3));
    const e = exam([section({ label: 'Multiple choice', drawCount: 30 })]);
    await expect(drawForAttempt(e, 's')).rejects.toThrow(/Multiple choice.*30.*3/);
  });

  it('throws when a coding section has no items at all', async () => {
    bank(manyMcqs(40));
    const e = exam([section({ key: 'code', label: 'Coding', types: ['live_code'], drawCount: 1 })]);
    await expect(drawForAttempt(e, 's')).rejects.toThrow(/Coding.*1.*0/);
  });
});

describe('the draw honours the section filters', () => {
  it('draws only the requested type', async () => {
    bank([...manyMcqs(10), item('c1', { type: 'live_code', language: 'java', points: 10 })]);
    const e = exam([section({ key: 'code', types: ['live_code'], drawCount: 1 })]);
    const drawn = await drawForAttempt(e, 's');
    expect(drawn).toHaveLength(1);
    expect(drawn[0].type).toBe('live_code');
  });

  it('respects the difficulty band', async () => {
    bank([item('e1', { difficulty: 1 }), item('h1', { difficulty: 5 }), item('h2', { difficulty: 5 })]);
    const e = exam([section({ drawCount: 2, minDifficulty: 5, maxDifficulty: 5 })]);
    const drawn = await drawForAttempt(e, 's');
    expect(drawn.map((d) => String(d.itemId)).sort()).toEqual(['h1', 'h2']);
  });

  it('builds a filter with no constraint on an axis left empty', () => {
    const f = sectionFilter('t1', section() as any);
    expect(f.dimension).toBeUndefined();
    expect(f.tags).toBeUndefined();
    expect(f.language).toBeUndefined();
    expect(f.active).toBe(true);
  });
});

describe('marks', () => {
  it("uses the item's own points when the section does not override", async () => {
    bank([item('a', { points: 4 }), item('b', { points: 4 })]);
    const e = exam([section({ drawCount: 2, marksPerItem: 0 })]);
    const drawn = await drawForAttempt(e, 's');
    expect(drawn.every((d) => d.marks === 4)).toBe(true);
  });

  /**
   * The same bank item is worth three marks in a screening round and ten in a final. Editing
   * the bank to reweight one event would silently reweight every other event using it.
   */
  it('lets the section override the weighting without touching the bank', async () => {
    bank([item('a', { points: 1 }), item('b', { points: 1 })]);
    const e = exam([section({ drawCount: 2, marksPerItem: 10 })]);
    const drawn = await drawForAttempt(e, 's');
    expect(drawn.every((d) => d.marks === 10)).toBe(true);
  });
});

describe('coverage, answered before invitations go out', () => {
  it('reports a fillable exam as ok, with its totals', async () => {
    bank([...manyMcqs(40), item('c1', { type: 'live_code', language: 'java', points: 20 })]);
    const e = exam([
      section({ key: 'mcq', drawCount: 30 }),
      section({ key: 'code', types: ['live_code'], drawCount: 1 }),
    ]);
    const cov = await checkDrawCoverage(e);
    expect(cov.ok).toBe(true);
    expect(cov.totalQuestions).toBe(31);
    expect(cov.totalMarks).toBe(50); // 30 × 1 + 20
  });

  it('names the empty section rather than failing the whole check silently', async () => {
    bank(manyMcqs(40));
    const e = exam([
      section({ key: 'mcq', drawCount: 30 }),
      section({ key: 'code', label: 'Coding', types: ['live_code'], drawCount: 1 }),
    ]);
    const cov = await checkDrawCoverage(e);
    expect(cov.ok).toBe(false);
    const code = cov.sections.find((s) => s.key === 'code')!;
    expect(code.available).toBe(0);
    expect(code.problem).toMatch(/No active items match/);
    expect(cov.sections.find((s) => s.key === 'mcq')!.ok).toBe(true);
  });

  it('distinguishes "too few" from "none at all"', async () => {
    bank(manyMcqs(5));
    const e = exam([section({ drawCount: 30 })]);
    const cov = await checkDrawCoverage(e);
    expect(cov.sections[0].problem).toMatch(/Only 5 items match, and 30 are needed/);
  });
});
