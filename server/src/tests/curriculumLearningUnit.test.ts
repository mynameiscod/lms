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
let quizzes: any[] = [];
let assignments: any[] = [];

/**
 * The skill graph these tests author against.
 *
 * Three usable skills, one GROUP and one retired skill, because "authorable" is not the same
 * question as "exists" and each wrong answer has its own message.
 */
let skillRegistry: any[] = [];
const REGISTRY = () => ([
  { key: 'JAVA_OOP', name: 'Java OOP', nodeType: 'SKILL', active: true },
  { key: 'JAVA_BASICS', name: 'Java Basics', nodeType: 'SKILL', active: true },
  { key: 'LOOPS', name: 'Loops', nodeType: 'SKILL', active: true },
  { key: 'PROGRAMMING', name: 'Programming', nodeType: 'GROUP', active: true },
  { key: 'FLASH', name: 'Adobe Flash', nodeType: 'SKILL', active: false },
]);

/** A query result that answers whichever chain the caller happens to use. */
const chain = (value: any): any => {
  const p: any = Promise.resolve(value);
  p.select = () => chain(value);
  p.sort = () => chain(value);
  p.limit = () => chain(value);
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
        // $unset is how an emptied suitableStates override returns the unit to derivation, so
        // a mock that ignored it could not tell "cleared" from "never set".
        if (update.$unset) for (const k of Object.keys(update.$unset)) delete row[k];
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
 * The assessment engines, backed by arrays so binding can actually be exercised.
 *
 * They used to answer "nothing, ever", which was enough while nothing could bind. It is not
 * enough now: a CHECKPOINT's readiness is entirely a question about what is bound to it, so a
 * mock that cannot hold a binding cannot test the rule that matters most.
 */
jest.mock('../models/Quiz', () => ({
  __esModule: true,
  default: {
    find: (q: any) => chain(quizzes.filter(d => matchesLibrary(d, q))),
    findOne: (q: any) => chain(quizzes.find(d => matchesLibrary(d, q)) || null),
    countDocuments: async (q: any) => quizzes.filter(d => matchesLibrary(d, q)).length,
    create: async (doc: any) => { const row = { _id: `q${quizzes.length + 1}`, ...doc }; quizzes.push(row); return row; },
    updateOne: async (q: any, up: any) => {
      const row = quizzes.find(d => matchesLibrary(d, q));
      if (!row) return { matchedCount: 0, modifiedCount: 0 };
      if (up.$set) Object.assign(row, up.$set);
      if (up.$unset) for (const k of Object.keys(up.$unset)) delete row[k];
      return { matchedCount: 1, modifiedCount: 1 };
    },
    updateMany: async (q: any, up: any) => {
      const rows = quizzes.filter(d => matchesLibrary(d, q));
      for (const row of rows) if (up.$unset) for (const k of Object.keys(up.$unset)) delete row[k];
      return { matchedCount: rows.length, modifiedCount: rows.length };
    },
  },
}));

jest.mock('../models/Assignment', () => ({
  __esModule: true,
  AssignmentType: { PROJECT: 'project', CODING: 'coding' },
  AssignmentStatus: { DRAFT: 'draft', PUBLISHED: 'published', ARCHIVED: 'archived' },
  default: {
    find: (q: any) => chain(assignments.filter(d => matchesLibrary(d, q))),
    findOne: (q: any) => chain(assignments.find(d => matchesLibrary(d, q)) || null),
    countDocuments: async (q: any) => assignments.filter(d => matchesLibrary(d, q)).length,
    create: async (doc: any) => { const row = { _id: `a${assignments.length + 1}`, ...doc }; assignments.push(row); return row; },
    updateOne: async (q: any, up: any) => {
      const row = assignments.find(d => matchesLibrary(d, q));
      if (!row) return { matchedCount: 0, modifiedCount: 0 };
      if (up.$set) Object.assign(row, up.$set);
      if (up.$unset) for (const k of Object.keys(up.$unset)) delete row[k];
      return { matchedCount: 1, modifiedCount: 1 };
    },
    updateMany: async (q: any, up: any) => {
      const rows = assignments.filter(d => matchesLibrary(d, q));
      for (const row of rows) if (up.$unset) for (const k of Object.keys(up.$unset)) delete row[k];
      return { matchedCount: rows.length, modifiedCount: rows.length };
    },
  },
}));

/**
 * The canonical registry, mocked WITH ITS FILTERS HONOURED.
 *
 * The first version of this mock ignored its query and returned the same three keys whatever it
 * was asked, which meant it could never refuse anything — so the validation added in P8C.0 was
 * untestable, and consequently untested. The rule has three distinct failure modes and the mock
 * has to be able to produce all three: a key nothing defines, a GROUP node, and a retired skill.
 */
jest.mock('../models/CareerSkill', () => ({
  __esModule: true,
  default: {
    find: (q: any) => chain(skillRegistry.filter(d => matchesLibrary(d, q))),
  },
}));

import * as ctrl from '../controllers/curriculumLearningUnitController';

/**
 * A REAL ObjectId, not 't1'.
 *
 * Assignment scopes by `tenant` (ObjectId), and the service refuses outright when the tenant id
 * is not a valid one. With a fake id every assignment query would return nothing and the
 * submission tests would pass without ever touching an assignment.
 */
const TENANT = '5f9d1b2c3a4b5c6d7e8f9012';

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

/**
 * Teaching material belonging to THIS unit, as opposed to reached through its topic or skills.
 *
 * Since P8C.0 the publish bar is enforced, and inherited content caps readiness at PARTIAL by
 * frozen policy — so a unit has to own teaching before it can be published. Tests that publish
 * need this; tests about inheritance deliberately do not have it.
 */
const ownVideo = () => ({
  ...skillTaggedVideo(), title: 'Inheritance, explained', unitCode: 'T_OOP_INHERIT',
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
  quizzes = [];
  assignments = [];
  skillRegistry = REGISTRY();
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
    await save('T_OOP_CLASSES', body({ title: 'Classes' }));
    const out = await save('T_OOP_A', body({ prerequisiteUnitCodes: ['T_OOP_A', 'T_OOP_CLASSES'] }));
    // Easy to type when duplicating a unit, and it would lock the unit forever for a reason
    // nobody could read off the screen. Dropped rather than refused: the author's INTENT is
    // legible and the rest of the save is perfectly good.
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
    // The prerequisite has to exist before it can be named — see the validation tests below.
    await save('T_OOP_INHERIT', body({ title: 'Inheritance' }));
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

  it('refuses a unit whose only material is inherited', async () => {
    /**
     * The publish bar, which existed as policy and was never called. Resolving SOMETHING that
     * teaches is not enough: material shared with eleven siblings makes a unit PARTIAL, and
     * publishing a PARTIAL unit looked like progress while moving nothing.
     */
    library = [skillTaggedVideo()];
    await save('T_OOP_INHERIT');

    const { res, out } = resOf();
    await ctrl.publishUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    expect(out.status).toBe(400);
    expect(out.body.message).toMatch(/PARTIAL|at least TEACHABLE/);
    expect(units[0].status).toBe('DRAFT');
  });

  it('publishes a unit that can teach, and fills in minutes it was never given', async () => {
    library = [ownVideo()];
    await save('T_OOP_INHERIT', body({ estimatedMinutes: 0 }));

    const { res, out } = resOf();
    await ctrl.publishUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    expect(out.body.published).toBe(true);
    expect(out.body.unit.estimatedMinutes).toBe(30);
  });

  it('does not overwrite a duration the author set deliberately', async () => {
    library = [ownVideo()];
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
    library = [ownVideo()];
    await save('T_OOP_INHERIT');
    const { res: r1 } = resOf();
    await ctrl.publishUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), r1);

    const { res, out } = resOf();
    await ctrl.deleteUnit(reqOf({ params: { unitCode: 'T_OOP_INHERIT' } }), res);

    expect(out.status).toBe(409);
    expect(units).toHaveLength(1);
  });

  it('does not unpublish a live unit when it is edited', async () => {
    library = [ownVideo()];
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

// ─────────────────────────────────────────────────────────────────────────────
describe('P8C.0 — a skill key must name something a student can be measured against', () => {
  it('refuses a key the registry does not contain', async () => {
    const out = await save('T_OOP_X', body({ skillKeys: ['JAVA_OOPS'] }));
    expect(out.status).toBe(400);
    expect(out.body.message).toMatch(/JAVA_OOPS/);
    expect(units).toHaveLength(0);
  });

  it('refuses an unknown PREREQUISITE skill too, and says which field', async () => {
    const out = await save('T_OOP_X', body({ prerequisiteSkillKeys: ['NOT_A_SKILL'] }));
    expect(out.status).toBe(400);
    expect(out.body.message).toMatch(/prerequisite skill/);
    expect(out.body.message).toMatch(/NOT_A_SKILL/);
  });

  it('refuses a GROUP, because a group is not a capability anybody can hold', async () => {
    const out = await save('T_OOP_X', body({ skillKeys: ['PROGRAMMING'] }));
    expect(out.status).toBe(400);
    // The message has to distinguish this from a typo, or the author hunts for a misspelling
    // that is not there.
    expect(out.body.message).toMatch(/is a group/);
  });

  it('refuses a retired skill for NEW authoring', async () => {
    const out = await save('T_OOP_X', body({ skillKeys: ['FLASH'] }));
    expect(out.status).toBe(400);
    expect(out.body.message).toMatch(/retired/);
  });

  it('accepts an active SKILL, in any case the author types it', async () => {
    const out = await save('T_OOP_X', body({ skillKeys: ['java_oop'] }));
    expect(out.status).toBe(200);
    expect(out.body.unit.skillKeys).toEqual(['JAVA_OOP']);
  });

  it('reports every bad key at once rather than one per attempt', async () => {
    const out = await save('T_OOP_X', body({ skillKeys: ['NOPE', 'PROGRAMMING', 'FLASH'] }));
    expect(out.status).toBe(400);
    expect(out.body.message).toMatch(/NOPE/);
    expect(out.body.message).toMatch(/PROGRAMMING/);
    expect(out.body.message).toMatch(/FLASH/);
  });
});

describe('P8C.0 — suitable states are a closed, server-owned vocabulary', () => {
  it('round-trips an override', async () => {
    const out = await save('T_OOP_S', body({ suitableStates: ['standard', 'VERIFIED'] }));
    expect(out.status).toBe(200);
    expect(out.body.unit.suitableStates).toEqual(['STANDARD', 'VERIFIED']);
  });

  it('clears the override when an empty list is sent, rather than storing []', async () => {
    await save('T_OOP_S', body({ suitableStates: ['STANDARD'] }));
    await save('T_OOP_S', body({ suitableStates: [] }));
    // Absent and empty are different: absent means "derive from unitType", which is what all
    // but eight of the real 337 units do.
    expect(units[0].suitableStates).toBeUndefined();
  });

  it('leaves an existing override alone when the field is not mentioned at all', async () => {
    await save('T_OOP_S', body({ suitableStates: ['STANDARD'] }));
    await save('T_OOP_S', body({ title: 'Renamed' }));
    /**
     * The one that protects the eight real overrides.
     *
     * An edit to a title must not silently revert a suitability decision somebody made
     * deliberately — the seed already refuses to reassert author-controlled fields for exactly
     * this reason, and the screen must not undo through the front door what the seed protects.
     */
    expect(units[0].suitableStates).toEqual(['STANDARD']);
    expect(units[0].title).toBe('Renamed');
  });

  it('refuses a state that is not in the taxonomy at all', async () => {
    const out = await save('T_OOP_S', body({ suitableStates: ['ENTHUSIASTIC'] }));
    expect(out.status).toBe(400);
    expect(out.body.message).toMatch(/ENTHUSIASTIC/);
  });

  it('refuses LOCKED and NOT_RELEVANT without pretending they do not exist', async () => {
    for (const state of ['LOCKED', 'NOT_RELEVANT']) {
      const out = await save('T_OOP_S', body({ suitableStates: [state] }));
      expect(out.status).toBe(400);
      /**
       * Both ARE real AssignmentStates, so "not a state" would be untrue and would send an
       * author looking for a typo. LOCKED is a scheduling verdict, not a property of material;
       * NOT_RELEVANT is about direction, which the unit already expresses elsewhere.
       */
      expect(out.body.message).toMatch(/cannot be authored/);
    }
  });
});

describe('P8C.0 — directions are checked against the canonical list', () => {
  it('refuses a direction nothing defines', async () => {
    const out = await save('T_OOP_D', body({ applicableDirections: ['SOFTWARE_DEVELOPMENT'] }));
    expect(out.status).toBe(400);
    expect(out.body.message).toMatch(/SOFTWARE_DEVELOPMENT/);
  });

  it('accepts the frozen SOFTWARE_BACKEND spelling', async () => {
    // The name is frozen and the near-miss above is the exact mistake it invites.
    const out = await save('T_OOP_D', body({ applicableDirections: ['SOFTWARE_BACKEND'] }));
    expect(out.status).toBe(200);
    expect(out.body.unit.applicableDirections).toEqual(['SOFTWARE_BACKEND']);
  });

  it('lists the real directions in the error, so the fix is on screen', async () => {
    const out = await save('T_OOP_D', body({ applicableDirections: ['WEB'] }));
    expect(out.body.message).toMatch(/WEB_DEVELOPMENT/);
  });
});

describe('P8C.0 — a prerequisite must name a real unit and must not close a loop', () => {
  it('refuses a prerequisite that names nothing', async () => {
    const out = await save('T_OOP_P', body({ prerequisiteUnitCodes: ['T_NOT_A_UNIT'] }));
    expect(out.status).toBe(400);
    expect(out.body.message).toMatch(/T_NOT_A_UNIT/);
  });

  it('accepts one that exists', async () => {
    await save('T_OOP_BASE', body({ title: 'Base' }));
    const out = await save('T_OOP_P', body({ prerequisiteUnitCodes: ['T_OOP_BASE'] }));
    expect(out.status).toBe(200);
    expect(out.body.unit.prerequisiteUnitCodes).toEqual(['T_OOP_BASE']);
  });

  it('refuses a direct A -> B -> A loop', async () => {
    await save('T_A', body({ title: 'A' }));
    await save('T_B', body({ title: 'B', prerequisiteUnitCodes: ['T_A'] }));

    const out = await save('T_A', body({ title: 'A', prerequisiteUnitCodes: ['T_B'] }));
    expect(out.status).toBe(400);
    expect(out.body.message).toMatch(/loop/);
  });

  it('refuses a loop that runs through units the author never touched', async () => {
    await save('T_A', body({ title: 'A' }));
    await save('T_B', body({ title: 'B', prerequisiteUnitCodes: ['T_A'] }));
    await save('T_C', body({ title: 'C', prerequisiteUnitCodes: ['T_B'] }));

    /**
     * The case a "check only what changed" implementation would miss, and the reason the walk
     * covers the whole graph: A -> C -> B -> A is created by editing A alone.
     */
    const out = await save('T_A', body({ title: 'A', prerequisiteUnitCodes: ['T_C'] }));
    expect(out.status).toBe(400);
    expect(out.body.message).toMatch(/loop/);
  });

  it('leaves a long but acyclic chain alone', async () => {
    await save('T_A', body({ title: 'A' }));
    await save('T_B', body({ title: 'B', prerequisiteUnitCodes: ['T_A'] }));
    const out = await save('T_C', body({ title: 'C', prerequisiteUnitCodes: ['T_B', 'T_A'] }));
    expect(out.status).toBe(200);
  });

  it('collapses a code repeated twice rather than treating it as an error', async () => {
    await save('T_A', body({ title: 'A' }));
    const out = await save('T_B', body({ prerequisiteUnitCodes: ['T_A', 'T_A'] }));
    expect(out.status).toBe(200);
    expect(out.body.unit.prerequisiteUnitCodes).toEqual(['T_A']);
  });
});

describe('P8C.0 — binding what measures a unit', () => {
  /**
   * Real ObjectId-shaped ids. The binding routes refuse anything else before they touch the
   * database, so ids like "quiz-1" would make every one of these tests pass as a 404.
   */
  const oid = (n: number, tag: string) => `${tag}${String(n).padStart(24 - tag.length, '0')}`;
  const quiz = (over: any = {}) => {
    const row = {
      _id: oid(quizzes.length + 1, 'aaaa'), tenantId: TENANT,
      title: 'Checkpoint quiz', isActive: true, ...over,
    };
    quizzes.push(row);
    return row;
  };
  const assignment = (over: any = {}) => {
    const row = {
      _id: oid(assignments.length + 1, 'bbbb'), tenant: TENANT,
      title: 'Build it', type: 'project', status: 'draft', ...over,
    };
    assignments.push(row);
    return row;
  };

  const call = async (fn: any, over: any) => {
    const { res, out } = resOf();
    await fn(reqOf(over), res);
    return out;
  };

  it('binds a quiz to a unit', async () => {
    await save('T_CHK', body({ unitType: 'CHECKPOINT' }));
    const q = quiz();

    const out = await call(ctrl.bindUnitQuiz, { params: { unitCode: 'T_CHK', quizId: q._id } });
    expect(out.status).toBe(200);
    expect(quizzes[0].unitCode).toBe('T_CHK');
  });

  it('refuses a quiz another unit already owns', async () => {
    await save('T_CHK', body({ unitType: 'CHECKPOINT' }));
    await save('T_CHK2', body({ unitType: 'CHECKPOINT', title: 'Other' }));
    const q = quiz({ unitCode: 'T_CHK2' });

    const out = await call(ctrl.bindUnitQuiz, { params: { unitCode: 'T_CHK', quizId: q._id } });
    // Reassigning silently would remove another unit's checkpoint, and the author who lost it
    // would have no way to find out why.
    expect(out.status).toBe(409);
    expect(out.body.message).toMatch(/T_CHK2/);
  });

  it('unbinds without destroying the quiz, because it may hold attempts', async () => {
    await save('T_CHK', body({ unitType: 'CHECKPOINT' }));
    const q = quiz({ unitCode: 'T_CHK' });

    const out = await call(ctrl.unbindUnitQuiz, { params: { unitCode: 'T_CHK', quizId: q._id } });
    expect(out.status).toBe(200);
    expect(quizzes).toHaveLength(1);
    expect(quizzes[0].unitCode).toBeUndefined();
  });

  it('binds and unbinds an assignment, which scopes by tenant and not tenantId', async () => {
    await save('T_PROJ', body({ unitType: 'PROJECT' }));
    const a = assignment();

    const bound = await call(ctrl.bindUnitAssignment,
      { params: { unitCode: 'T_PROJ', assignmentId: a._id } });
    expect(bound.status).toBe(200);
    expect(assignments[0].unitCode).toBe('T_PROJ');

    const freed = await call(ctrl.unbindUnitAssignment,
      { params: { unitCode: 'T_PROJ', assignmentId: a._id } });
    expect(freed.status).toBe(200);
    expect(assignments[0].unitCode).toBeUndefined();
  });

  it('reports what is bound, and tells assessment from submission', async () => {
    await save('T_PROJ', body({ unitType: 'PROJECT' }));
    quiz({ unitCode: 'T_PROJ' });
    assignment({ unitCode: 'T_PROJ' });

    const out = await call(ctrl.unitAssessments, { params: { unitCode: 'T_PROJ' } });
    expect(out.body.bound).toHaveLength(2);
    expect(out.body.hasAssessment).toBe(true);
    expect(out.body.hasSubmission).toBe(true);
    expect(out.body.bound.find((b: any) => b.kind === 'QUIZ').countsAsSubmission).toBe(false);
    expect(out.body.bound.find((b: any) => b.kind === 'ASSIGNMENT').countsAsSubmission).toBe(true);
  });

  it('never offers an assessment another unit has claimed', async () => {
    await save('T_CHK', body({ unitType: 'CHECKPOINT' }));
    await save('T_OTHER', body({ title: 'Other' }));
    quiz({ unitCode: 'T_OTHER', title: 'Taken' });
    quiz({ title: 'Free' });

    const out = await call(ctrl.unitAssessments, { params: { unitCode: 'T_CHK' } });
    expect(out.body.candidates.map((c: any) => c.title)).toEqual(['Free']);
  });

  it('creates a quiz shell already bound, and leaves it not live', async () => {
    await save('T_CHK', body({ unitType: 'CHECKPOINT' }));

    const out = await call(ctrl.createUnitAssessment, {
      params: { unitCode: 'T_CHK' }, body: { kind: 'QUIZ' },
    });
    expect(out.status).toBe(200);
    expect(quizzes[0].unitCode).toBe('T_CHK');
    // An empty quiz students could open would be worse than no quiz at all.
    expect(quizzes[0].isActive).toBe(false);
  });

  it('releases bound assessments when the unit is deleted, never deleting them', async () => {
    await save('T_CHK', body({ unitType: 'CHECKPOINT' }));
    quiz({ unitCode: 'T_CHK' });
    assignment({ unitCode: 'T_CHK' });

    const { res } = resOf();
    await ctrl.deleteUnit(reqOf({ params: { unitCode: 'T_CHK' } }), res);

    expect(quizzes).toHaveLength(1);
    expect(quizzes[0].unitCode).toBeUndefined();
    expect(assignments[0].unitCode).toBeUndefined();
  });
});

/** The coverage block listUnits reports for one unit. */
const coverageOf = async (unitCode: string) => {
  const { res, out } = resOf();
  await ctrl.listUnits(reqOf({ query: { stage: 'foundation' } }), res);
  return (out.body.rows as any[])
    .flatMap(r => r.units)
    .find((u: any) => u.unitCode === unitCode)?.coverage;
};

describe('P8C.0 — readiness follows what is bound, and the publish bar holds', () => {
  it('a CHECKPOINT is EMPTY with nothing bound and cannot be published', async () => {
    library = [];
    await save('T_CHK', body({ unitType: 'CHECKPOINT' }));

    expect((await coverageOf('T_CHK'))?.readiness).toBe('EMPTY');

    const { res, out } = resOf();
    await ctrl.publishUnit(reqOf({ params: { unitCode: 'T_CHK' } }), res);
    expect(out.status).toBe(400);
    expect(units[0].status).toBe('DRAFT');
  });

  it('a CHECKPOINT becomes READY the moment a quiz is bound', async () => {
    library = [];
    await save('T_CHK', body({ unitType: 'CHECKPOINT' }));
    quizzes.push({
      _id: 'q1', tenantId: TENANT, title: 'Checkpoint', unitCode: 'T_CHK', isActive: true,
    });

    /**
     * The whole point of P8C.0's assessment binding. Its rule is `assessment` at every rung, so
     * before binding existed a checkpoint could not reach TEACHABLE, could not be published, and
     * nothing on the screen said why. The RULE is unchanged — only the way to satisfy it is new.
     */
    expect((await coverageOf('T_CHK'))?.readiness).toBe('READY');
  });

  it('a PROJECT with only a quiz is not READY — a quiz cannot receive what was built', async () => {
    library = [{ ...skillTaggedVideo(), unitCode: 'T_PROJ', title: 'Brief' }];
    await save('T_PROJ', body({ unitType: 'PROJECT' }));
    quizzes.push({
      _id: 'q1', tenantId: TENANT, title: 'Quick check', unitCode: 'T_PROJ', isActive: true,
    });

    const cov = await coverageOf('T_PROJ');
    expect(cov?.readiness).not.toBe('READY');
    expect(cov?.ownSubmission).toBe(0);
  });

  it('the same PROJECT is READY once an assignment is bound', async () => {
    library = [{ ...skillTaggedVideo(), unitCode: 'T_PROJ', title: 'Brief' }];
    await save('T_PROJ', body({ unitType: 'PROJECT' }));
    assignments.push({
      _id: 'a1', tenant: TENANT, title: 'Build it', unitCode: 'T_PROJ', type: 'project',
    });

    const cov = await coverageOf('T_PROJ');
    expect(cov?.ownSubmission).toBe(1);
    expect(cov?.readiness).toBe('READY');
  });

  it('a CONCEPT needs teaching, practice AND an assessment to be READY', async () => {
    library = [
      { ...skillTaggedVideo(), unitCode: 'T_C', title: 'Lesson' },
      { ...skillTaggedVideo(), unitCode: 'T_C', type: 'practice_coding', title: 'Drill' },
    ];
    await save('T_C', body({ unitType: 'CONCEPT' }));

    // Teachable on its own material, but not yet provable.
    expect((await coverageOf('T_C'))?.readiness).toBe('TEACHABLE');

    quizzes.push({
      _id: 'q1', tenantId: TENANT, title: 'Check', unitCode: 'T_C', isActive: true,
    });
    expect((await coverageOf('T_C'))?.readiness).toBe('READY');
  });

  it('inheritance never lifts a unit above PARTIAL, however much it resolves', async () => {
    library = [
      skillTaggedVideo(),
      { ...skillTaggedVideo(), type: 'practice_coding', title: 'Shared drill' },
    ];
    await save('T_C', body({ unitType: 'CONCEPT' }));

    /**
     * Nothing bound here on purpose. A bound quiz would be the unit's OWN assessment — which is
     * the point of binding — and the unit would no longer be inherited-only. What is under test
     * is that a full topic bundle, teaching and practice both, still caps at PARTIAL.
     */
    const cov = await coverageOf('T_C');
    // Frozen policy. Material shared with eleven siblings is not material written for this unit.
    expect(cov?.readiness).toBe('PARTIAL');
    expect(cov?.inheritedOnly).toBe(true);
    expect(cov?.publishable).toBe(false);
  });
});

describe('P8C.0 — PUBLISHED and COMPOSER_READY are different claims', () => {
  it('a published unit that is not READY is not composer eligible', async () => {
    library = [{ ...skillTaggedVideo(), unitCode: 'T_C', title: 'Lesson' }];
    await save('T_C', body({ unitType: 'CONCEPT' }));

    const { res } = resOf();
    await ctrl.publishUnit(reqOf({ params: { unitCode: 'T_C' } }), res);
    expect(units[0].status).toBe('PUBLISHED');

    const cov = await coverageOf('T_C');
    // TEACHABLE clears the publish bar; only READY clears the composer's.
    expect(cov?.readiness).toBe('TEACHABLE');
    expect(cov?.composerReady).toBe(false);
  });

  it('a READY unit that was never published is not composer eligible either', async () => {
    library = [];
    await save('T_CHK', body({ unitType: 'CHECKPOINT' }));
    quizzes.push({
      _id: 'q1', tenantId: TENANT, title: 'Checkpoint', unitCode: 'T_CHK', isActive: true,
    });

    const cov = await coverageOf('T_CHK');
    expect(cov?.readiness).toBe('READY');
    expect(units[0].status).toBe('DRAFT');
    expect(cov?.composerReady).toBe(false);
  });

  it('is eligible only when it is both', async () => {
    library = [];
    await save('T_CHK', body({ unitType: 'CHECKPOINT' }));
    quizzes.push({
      _id: 'q1', tenantId: TENANT, title: 'Checkpoint', unitCode: 'T_CHK', isActive: true,
    });

    const { res } = resOf();
    await ctrl.publishUnit(reqOf({ params: { unitCode: 'T_CHK' } }), res);

    const cov = await coverageOf('T_CHK');
    expect(cov?.composerReady).toBe(true);
  });
});

describe('P8C.0 — the authoring vocabularies are served, not guessed', () => {
  it('offers the seven authorable states and never LOCKED or NOT_RELEVANT', async () => {
    const { res, out } = resOf();
    await ctrl.unitOptions(reqOf({ query: { stage: 'foundation' } }), res);

    expect(out.body.suitableStates).toEqual([
      'NOT_EXPOSED', 'FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD',
      'REVISION', 'VERIFIED', 'ENRICHMENT',
    ]);
    expect(out.body.suitableStates).not.toContain('LOCKED');
    expect(out.body.suitableStates).not.toContain('NOT_RELEVANT');
  });

  it('offers the canonical directions, including the frozen SOFTWARE_BACKEND', async () => {
    const { res, out } = resOf();
    await ctrl.unitOptions(reqOf({ query: { stage: 'foundation' } }), res);

    const keys = out.body.directions.map((d: any) => d.key);
    expect(keys).toContain('SOFTWARE_BACKEND');
    expect(keys).not.toContain('SOFTWARE_DEVELOPMENT');
  });

  it('offers exactly the skills the backend would accept — no groups, nothing retired', async () => {
    const { res, out } = resOf();
    await ctrl.unitOptions(reqOf({ query: { stage: 'foundation' } }), res);

    const keys = out.body.skills.map((s: any) => s.key);
    // The selector and the validator disagreeing is a screen an author cannot trust: it either
    // hides a legal choice or offers one that will be refused.
    expect(keys).toEqual(expect.arrayContaining(['JAVA_OOP', 'JAVA_BASICS', 'LOOPS']));
    expect(keys).not.toContain('PROGRAMMING');
    expect(keys).not.toContain('FLASH');
  });
});
