/**
 * The canonical L4 curriculum node.
 *
 * The rules that matter here are all about a unit being part of a MASTER curriculum rather than
 * part of anybody's schedule. A unit that quietly acquired a day number, or a code that moved when
 * somebody renamed a title, would break the same way: a student's completed work would stop
 * pointing at the thing they completed, and nothing would report an error.
 */

const units: any[] = [];
let library: any[] = [];
let curriculum: any = null;

/** A query result that answers whichever chain the caller happens to use. */
const chain = (value: any): any => {
  const p: any = Promise.resolve(value);
  p.select = () => chain(value);
  p.sort = () => chain(value);
  p.lean = async () => value;
  return p;
};

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, v]) => {
    const got = doc[k];
    if (v && typeof v === 'object' && '$in' in (v as any)) {
      const want = (v as any).$in as any[];
      return Array.isArray(got) ? got.some(g => want.includes(g)) : want.includes(got);
    }
    return String(got) === String(v);
  });

/** The candidate query uses $or / $and / $exists, which the plain matcher does not model. */
const matchesLibrary = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, v]: [string, any]) => {
    if (k === '$or') return (v as any[]).some(cond => matchesLibrary(doc, cond));
    if (k === '$and') return (v as any[]).every(cond => matchesLibrary(doc, cond));
    if (v && typeof v === 'object' && '$exists' in v) return (doc[k] !== undefined) === v.$exists;
    if (v && typeof v === 'object' && '$in' in v) {
      const want = v.$in as any[];
      return Array.isArray(doc[k]) ? doc[k].some((g: any) => want.includes(g)) : want.includes(doc[k]);
    }
    if (v === null) return doc[k] === null || doc[k] === undefined;
    return String(doc[k]) === String(v);
  });

jest.mock('../models/CurriculumLearningUnit', () => {
  const TYPES = ['CONCEPT', 'WORKED_EXAMPLE', 'PRACTICE', 'DEBUG', 'PROJECT', 'CHECKPOINT', 'REVIEW'];
  const CATS = ['UNIVERSAL', 'DIRECTION', 'ACADEMIC', 'EXPLORATION', 'ENRICHMENT'];
  return {
    __esModule: true,
    LEARNING_UNIT_TYPES: TYPES,
    LEARNING_UNIT_CATEGORIES: CATS,
    default: {
      find: (q: any) => chain(units.filter(d => matches(d, q))),
      findOne: (q: any) => {
        const found = units.find(d => matches(d, q));
        if (!found) return chain(null);
        const doc: any = {
          ...found,
          toObject: () => ({ ...found }),
          save: async () => { Object.assign(found, doc); return doc; },
        };
        return chain(doc);
      },
      findOneAndUpdate: async (q: any, update: any) => {
        const set = update.$set || {};
        const insert = update.$setOnInsert || {};
        let row = units.find(d => matches(d, q));
        if (!row) { row = { ...insert }; units.push(row); }
        Object.assign(row, set);
        return { ...row, toObject: () => ({ ...row }) };
      },
      deleteOne: async (q: any) => {
        const i = units.findIndex(d => matches(d, q));
        if (i >= 0) units.splice(i, 1);
        return { deletedCount: i >= 0 ? 1 : 0 };
      },
      bulkWrite: async (ops: any[]) => {
        for (const op of ops) {
          const row = units.find(d => matches(d, op.updateOne.filter));
          if (row) Object.assign(row, op.updateOne.update.$set);
        }
        return { modifiedCount: ops.length };
      },
    },
  };
});

jest.mock('../models/LearningContentLibrary', () => ({
  __esModule: true,
  default: {
    find: (q: any) => chain(library.filter(d => matchesLibrary(d, q))),
    findOne: (q: any) => chain(library.find(d => matchesLibrary(d, q)) || null),
    updateOne: async (q: any, up: any) => {
      const row = library.find(d => matchesLibrary(d, q));
      if (!row) return { matchedCount: 0, modifiedCount: 0 };
      if (up.$set) Object.assign(row, up.$set);
      if (up.$unset) for (const k of Object.keys(up.$unset)) delete row[k];
      return { matchedCount: 1, modifiedCount: 1 };
    },
    updateMany: async (q: any, up: any) => {
      const rows = library.filter(d => matchesLibrary(d, q));
      for (const row of rows) {
        if (up.$unset) for (const k of Object.keys(up.$unset)) delete row[k];
      }
      return { matchedCount: rows.length, modifiedCount: rows.length };
    },
  },
}));

jest.mock('../models/LearningCurriculum', () => ({
  __esModule: true,
  default: { findOne: () => chain(curriculum) },
}));

/**
 * listUnits counts checkpoints from the existing engines rather than a tenth content type.
 *
 * Mocked empty: these tests are about structure and content binding, and a unit's assessment
 * count is covered where the readiness rule lives.
 */
jest.mock('../models/Quiz', () => ({
  __esModule: true,
  default: { find: () => chain([]) },
}));

jest.mock('../models/Assignment', () => ({
  __esModule: true,
  default: { find: () => chain([]) },
}));

jest.mock('../models/CareerSkill', () => ({
  __esModule: true,
  default: { find: () => chain([{ key: 'JAVA_OOP', name: 'Java OOP' }]) },
}));

import * as ctrl from '../controllers/curriculumLearningUnitController';

const TENANT = 't1';

const reqOf = (over: any = {}): any => ({
  params: {}, body: {}, query: {},
  user: { id: 'u1', email: 'author@test.com', tenantId: TENANT },
  ...over,
});

const resOf = () => {
  const out: any = { status: 200, body: null };
  const res: any = {
    json: (b: any) => { out.body = b; return res; },
    status: (c: number) => { out.status = c; return res; },
  };
  return { res, out };
};

/** A published lesson tagged only by skill — the shape all 368 existing rows have. */
const skillTaggedVideo = () => ({
  tenantId: TENANT, isPublished: true, type: 'video',
  title: 'OOP overview', estimatedDuration: 30,
  skillKeys: ['JAVA_OOP'], topicCode: undefined, unitCode: undefined,
});

const body = (over: any = {}) => ({
  stageKey: 'foundation', moduleCode: 'M03_PROGRAMMING', topicCode: 'T_OOP',
  title: 'Inheritance', skillKeys: ['JAVA_OOP'], ...over,
});

const save = async (unitCode: string, b: any = body()) => {
  const { res, out } = resOf();
  await ctrl.saveUnit(reqOf({ params: { unitCode }, body: b }), res);
  return out;
};

beforeEach(() => {
  units.length = 0;
  library = [skillTaggedVideo()];
  curriculum = {
    title: 'Year 1 Foundation',
    modules: [{ moduleCode: 'M03_PROGRAMMING', moduleName: 'Programming', displayOrder: 3 }],
    topics: [
      { topicCode: 'T_OOP', title: 'Object-Oriented Programming', moduleCode: 'M03_PROGRAMMING', skillKeys: ['JAVA_OOP'] },
      { topicCode: 'T_LOOPS', title: 'Loops', moduleCode: 'M03_PROGRAMMING', skillKeys: ['LOOPS'] },
    ],
  };
});

// ─────────────────────────────────────────────────────────────────────────────
describe('a unit belongs to the master curriculum, not to a schedule', () => {
  it('has nowhere to store a day number', async () => {
    const out = await save('T_OOP_INHERITANCE', body({
      // Everything a scheduler would try to smuggle in. All of it must be ignored.
      dayNumber: 34, scheduledDay: 34, scheduledDate: '2026-10-01',
      startTime: '09:00', endTime: '10:00', studentId: 'abc123',
    } as any));

    const u = out.body.unit;
    expect(u.dayNumber).toBeUndefined();
    expect(u.scheduledDay).toBeUndefined();
    expect(u.scheduledDate).toBeUndefined();
    expect(u.startTime).toBeUndefined();
    expect(u.studentId).toBeUndefined();
  });

  it('keeps its code when its title changes', async () => {
    await save('T_OOP_INHERITANCE');
    await save('T_OOP_INHERITANCE', body({ title: 'Inheritance and subclassing', unitCode: 'SOMETHING_ELSE' }));

    // The code is read from the URL and never from the body: a student's completed work is
    // keyed on it, so an edit that moved it would orphan their history.
    expect(units).toHaveLength(1);
    expect(units[0].unitCode).toBe('T_OOP_INHERITANCE');
    expect(units[0].title).toBe('Inheritance and subclassing');
  });
});

describe('create, read, update, order', () => {
  it('creates a unit under its topic', async () => {
    const out = await save('T_OOP_CLASSES');
    expect(out.body.created).toBe(true);
    expect(units[0].topicCode).toBe('T_OOP');
    expect(units[0].status).toBe('DRAFT');
  });

  it('updates rather than duplicating when saved twice', async () => {
    await save('T_OOP_CLASSES');
    const out = await save('T_OOP_CLASSES', body({ title: 'Classes and Objects' }));
    expect(out.body.created).toBe(false);
    expect(units).toHaveLength(1);
  });

  it('orders units within their topic', async () => {
    await save('T_OOP_A', body({ title: 'A', displayOrder: 10 }));
    await save('T_OOP_B', body({ title: 'B', displayOrder: 20 }));

    const { res } = resOf();
    await ctrl.reorderUnits(reqOf({
      body: { order: [{ unitCode: 'T_OOP_B', displayOrder: 10 }, { unitCode: 'T_OOP_A', displayOrder: 20 }] },
    }), res);

    expect(units.find(u => u.unitCode === 'T_OOP_B').displayOrder).toBe(10);
    expect(units.find(u => u.unitCode === 'T_OOP_A').displayOrder).toBe(20);
  });

  it('will not let a unit be its own prerequisite', async () => {
    const out = await save('T_OOP_A', body({ prerequisiteUnitCodes: ['T_OOP_A', 'T_OOP_CLASSES'] }));
    // Easy to type when duplicating a unit, and it would lock the unit forever for a reason
    // nobody could read off the screen.
    expect(out.body.unit.prerequisiteUnitCodes).toEqual(['T_OOP_CLASSES']);
  });
});

describe('a topic knows the units it breaks into', () => {
  it('groups units under their topic, and shows topics that have none', async () => {
    await save('T_OOP_CLASSES', body({ title: 'Classes', displayOrder: 10 }));
    await save('T_OOP_INHERIT', body({ title: 'Inheritance', displayOrder: 20 }));

    const { res, out } = resOf();
    await ctrl.listUnits(reqOf({ query: { stage: 'foundation' } }), res);

    const oop = out.body.rows.find((r: any) => r.topicCode === 'T_OOP');
    expect(oop.units.map((u: any) => u.title)).toEqual(['Classes', 'Inheritance']);

    // A topic nobody has divided yet is still listed — that is the backlog.
    const loops = out.body.rows.find((r: any) => r.topicCode === 'T_LOOPS');
    expect(loops.units).toHaveLength(0);
    expect(out.body.summary.topicsWithUnits).toBe(1);
  });

  it('surfaces a unit whose topic was deleted rather than hiding it', async () => {
    await save('T_GONE_X', body({ topicCode: 'T_GONE' }));

    const { res, out } = resOf();
    await ctrl.listUnits(reqOf(), res);

    expect(out.body.orphaned.map((u: any) => u.unitCode)).toEqual(['T_GONE_X']);
  });
});

describe('metadata survives a round trip', () => {
  it('keeps skills and both kinds of prerequisite', async () => {
    const out = await save('T_OOP_POLY', body({
      skillKeys: ['java_oop', 'JAVA_BASICS'],
      prerequisiteSkillKeys: ['java_basics'],
      prerequisiteUnitCodes: ['t_oop_inherit'],
    }));

    const u = out.body.unit;
    expect(u.skillKeys).toEqual(['JAVA_OOP', 'JAVA_BASICS']);
    expect(u.prerequisiteSkillKeys).toEqual(['JAVA_BASICS']);
    // Unit prerequisites are distinct from skill prerequisites: Polymorphism needs Inheritance
    // TAUGHT, which no skill graph expresses.
    expect(u.prerequisiteUnitCodes).toEqual(['T_OOP_INHERIT']);
  });

  it('keeps direction, depth, category, type and outcomes', async () => {
    const out = await save('T_OOP_ABS', body({
      applicableDirections: ['web_development'],
      defaultDepth: 'guided',
      category: 'direction',
      unitType: 'worked_example',
      learningOutcomes: ['Explain an abstract class', 'Choose between abstract and interface'],
      mandatory: false,
    }));

    const u = out.body.unit;
    expect(u.applicableDirections).toEqual(['WEB_DEVELOPMENT']);
    expect(u.defaultDepth).toBe('GUIDED');
    expect(u.category).toBe('DIRECTION');
    expect(u.unitType).toBe('WORKED_EXAMPLE');
    expect(u.learningOutcomes).toHaveLength(2);
    expect(u.mandatory).toBe(false);
  });

  it('rejects a type, category or band that is not in the vocabulary', async () => {
    expect((await save('X1', body({ unitType: 'SOMETHING' }))).status).toBe(400);
    expect((await save('X2', body({ category: 'SOMETHING' }))).status).toBe(400);
    expect((await save('X3', body({ band: 'SOMETHING' }))).status).toBe(400);
    expect(units).toHaveLength(0);
  });
});

describe('content resolution', () => {
  it('prefers content written for the unit over the topic and the skill', async () => {
    library = [
      skillTaggedVideo(),
      { ...skillTaggedVideo(), title: 'OOP topic notes', type: 'notes', topicCode: 'T_OOP' },
      { ...skillTaggedVideo(), title: 'Inheritance video', unitCode: 'T_OOP_INHERIT' },
    ];
    await save('T_OOP_INHERIT');

    const { res, out } = resOf();
    await ctrl.getUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    expect(out.body.bundle.via).toBe('unitCode');
    expect(out.body.bundle.items.map((i: any) => i.title)).toEqual(['Inheritance video']);
  });

  it('falls back to the topic when no content names the unit', async () => {
    library = [{ ...skillTaggedVideo(), title: 'OOP topic notes', topicCode: 'T_OOP' }];
    await save('T_OOP_INHERIT');

    const { res, out } = resOf();
    await ctrl.getUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);
    expect(out.body.bundle.via).toBe('topicCode');
  });

  /**
   * The backward-compatibility case, and the reason nothing was migrated.
   *
   * All 368 existing rows are tagged by skill alone. They must keep serving, or adding this layer
   * would have silently emptied the library.
   */
  it('still resolves a library row that has no unit and no topic', async () => {
    library = [skillTaggedVideo()];
    await save('T_OOP_INHERIT');

    const { res, out } = resOf();
    await ctrl.getUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    expect(out.body.bundle.via).toBe('skillKeys');
    expect(out.body.bundle.hasTeaching).toBe(true);
  });
});

describe('publishing earns the composer’s trust', () => {
  it('refuses a unit that resolves no content at all', async () => {
    library = [];
    await save('T_OOP_INHERIT');

    const { res, out } = resOf();
    await ctrl.publishUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    expect(out.status).toBe(400);
    expect(units[0].status).toBe('DRAFT');
  });

  it('refuses a unit that resolves only practice, with nothing teaching it', async () => {
    library = [{ ...skillTaggedVideo(), type: 'practice_coding', title: 'OOP exercises' }];
    await save('T_OOP_INHERIT');

    const { res, out } = resOf();
    await ctrl.publishUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    expect(out.status).toBe(400);
    expect(out.body.message).toMatch(/none of them teach/);
  });

  it('publishes a unit that can teach, and fills in minutes it was never given', async () => {
    await save('T_OOP_INHERIT', body({ estimatedMinutes: 0 }));

    const { res, out } = resOf();
    await ctrl.publishUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    expect(out.body.published).toBe(true);
    expect(out.body.unit.estimatedMinutes).toBe(30);
  });

  it('does not overwrite a duration the author set deliberately', async () => {
    await save('T_OOP_INHERIT', body({ estimatedMinutes: 90 }));

    const { res, out } = resOf();
    await ctrl.publishUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    // An author may know the unit runs longer than its material suggests.
    expect(out.body.unit.estimatedMinutes).toBe(90);
  });

  it('warns on save without refusing it', async () => {
    library = [];
    const out = await save('T_OOP_INHERIT');
    expect(out.status).toBe(200);
    expect(out.body.warning).toMatch(/Nothing in the Content Library resolves/);
  });
});

describe('what cannot be undone', () => {
  it('will not delete a published unit', async () => {
    await save('T_OOP_INHERIT');
    const { res: r1 } = resOf();
    await ctrl.publishUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), r1);

    const { res, out } = resOf();
    await ctrl.deleteUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    expect(out.status).toBe(409);
    expect(units).toHaveLength(1);
  });

  it('does not unpublish a live unit when it is edited', async () => {
    await save('T_OOP_INHERIT');
    const { res: r1 } = resOf();
    await ctrl.publishUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), r1);

    await save('T_OOP_INHERIT', body({ title: 'Renamed' }));

    // Editing a live unit must not pull it out of every plan mid-week.
    expect(units[0].status).toBe('PUBLISHED');
    expect(units[0].title).toBe('Renamed');
  });
});

/* ------------------------------------------------------------------ *
 * P2 — content binding
 * ------------------------------------------------------------------ */

describe('attaching content to a unit', () => {
  const note = (over: any = {}) => ({
    _id: 'c_note', tenantId: TENANT, isPublished: true, type: 'notes',
    title: 'OOP notes', estimatedDuration: 20, skillKeys: ['JAVA_OOP'],
    createdAt: new Date('2026-01-02T00:00:00Z'), ...over,
  });

  beforeEach(async () => {
    library = [skillTaggedVideo(), note()];
    await save('T_OOP_INHERIT');
  });

  it('offers rows that serve this topic or skill, and never one another unit owns', async () => {
    library.push(note({ _id: 'c_taken', title: 'Taken', unitCode: 'SOME_OTHER_UNIT' }));

    const { res, out } = resOf();
    await ctrl.unitContent(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    const ids = out.body.candidates.map((c: any) => c._id);
    // A row another unit owns is that unit's. Offering it would let one click silently remove
    // content from a lesson nobody was looking at.
    expect(ids).not.toContain('c_taken');
    expect(ids).toContain('c_note');
  });

  it('makes an attachment win over content inherited from the topic', async () => {
    library.push(note({ _id: 'c_topic', title: 'Topic notes', topicCode: 'T_OOP' }));

    let probe = resOf();
    await ctrl.unitContent(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), probe.res);
    expect(probe.out.body.resolved.via).toBe('topicCode');

    const a = resOf();
    await ctrl.attachContent(reqOf({ params: { unitCode: 'T_OOP_INHERIT', contentId: 'c_note' } }), a.res);

    probe = resOf();
    await ctrl.unitContent(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), probe.res);
    expect(probe.out.body.resolved.via).toBe('unitCode');
    expect(probe.out.body.resolved.items.map((i: any) => i._id)).toEqual(['c_note']);
  });

  it('refuses a row another unit already owns', async () => {
    library.push(note({ _id: 'c_taken', title: 'Taken', unitCode: 'SOME_OTHER_UNIT' }));

    const { res, out } = resOf();
    await ctrl.attachContent(reqOf({ params: { unitCode: 'T_OOP_INHERIT', contentId: 'c_taken' } }), res);

    expect(out.status).toBe(409);
    expect(library.find(r => r._id === 'c_taken').unitCode).toBe('SOME_OTHER_UNIT');
  });

  it('detaches by releasing the row, never by deleting it', async () => {
    const a = resOf();
    await ctrl.attachContent(reqOf({ params: { unitCode: 'T_OOP_INHERIT', contentId: 'c_note' } }), a.res);

    const d = resOf();
    await ctrl.detachContent(reqOf({ params: { unitCode: 'T_OOP_INHERIT', contentId: 'c_note' } }), d.res);

    // Detaching is a demotion, not a removal: the row goes back to serving its topic and skills.
    expect(d.out.body.detached).toBe(true);
    expect(library.find(r => r._id === 'c_note').unitCode).toBeUndefined();
    expect(library).toHaveLength(2);
  });

  it('says when attached content is unpublished and therefore teaches nobody', async () => {
    library.push(note({ _id: 'c_draft', title: 'Draft notes', isPublished: false }));

    const a = resOf();
    await ctrl.attachContent(reqOf({ params: { unitCode: 'T_OOP_INHERIT', contentId: 'c_draft' } }), a.res);

    const { res, out } = resOf();
    await ctrl.unitContent(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    // Attaching an unpublished row looks like it worked and then does nothing, because the
    // resolver filters on isPublished. Reported rather than left to be noticed.
    expect(out.body.attachedButUnpublished).toEqual(['Draft notes']);
  });

  it('releases attached content when the unit is deleted', async () => {
    const a = resOf();
    await ctrl.attachContent(reqOf({ params: { unitCode: 'T_OOP_INHERIT', contentId: 'c_note' } }), a.res);

    const { res, out } = resOf();
    await ctrl.deleteUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    // Left pointing at a unit that no longer exists, the row would serve nothing AND be filtered
    // out of every other unit's candidate list. Invisible content is worse than orphaned content.
    expect(out.body.contentReleased).toBe(1);
    expect(library.find(r => r._id === 'c_note').unitCode).toBeUndefined();
  });

  it('returns the bundle in teaching order, with roles', async () => {
    library = [
      note({ _id: 'p', type: 'practice_coding', title: 'Practice' }),
      note({ _id: 'n', type: 'notes', title: 'Notes' }),
      note({ _id: 'v', type: 'video', title: 'Video' }),
    ];

    const { res, out } = resOf();
    await ctrl.unitContent(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    expect(out.body.resolved.items.map((i: any) => i._id)).toEqual(['v', 'n', 'p']);
    expect(out.body.resolved.items.map((i: any) => i.role)).toEqual(['TEACH', 'TEACH', 'PRACTISE']);
  });
});
