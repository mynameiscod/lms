/**
 * Authoring the two layers ABOVE a Learning Unit: modules and topics.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────────────────────
 *
 * Ordering is the part of curriculum authoring with no visible failure mode. A save that is
 * refused says so; an order that is silently wrong shows a curriculum in a sequence nobody
 * chose, and the only symptom is that a student is taught things in the wrong order weeks
 * later. Before P8C.0 there was no bulk reorder at all — an author edited `displayOrder`
 * numbers by hand, one module at a time, and two modules sharing a position was a typo away.
 *
 * The other half is that a topic and a Learning Unit must agree about what a valid skill is.
 * They did not: topics checked existence, units checked nothing, and the selector offered a
 * third answer again.
 */

import { AUTHORABLE_SUITABLE_STATES } from '../data/adaptiveCurriculumPolicy';
import { DIRECTION_KEYS } from '../data/careerDirectionPolicy';

let stored: any = null;

/** The registry these tests author against — the same shape the unit tests use. */
const REGISTRY = [
  { key: 'HTML', name: 'HTML', nodeType: 'SKILL', active: true },
  { key: 'CSS', name: 'CSS', nodeType: 'SKILL', active: true },
  { key: 'WEB', name: 'Web', nodeType: 'GROUP', active: true },
  { key: 'SILVERLIGHT', name: 'Silverlight', nodeType: 'SKILL', active: false },
];

const matchesQuery = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, v]: [string, any]) => {
    if (v && typeof v === 'object' && '$in' in v) return (v.$in as any[]).includes(doc[k]);
    return String(doc[k]) === String(v);
  });

const chain = (value: any): any => {
  const p: any = Promise.resolve(value);
  p.select = () => chain(value);
  p.sort = () => chain(value);
  p.limit = () => chain(value);
  p.lean = async () => value;
  return p;
};

jest.mock('../models/CareerSkill', () => ({
  __esModule: true,
  default: { find: (q: any) => chain(REGISTRY.filter(d => matchesQuery(d, q))) },
}));

jest.mock('../models/LearningCurriculum', () => ({
  __esModule: true,
  default: { findOne: () => chain(stored) },
}));

import {
  reorderModules, reorderTopics, createTopic, updateTopic, saveModule,
} from '../services/stageCurriculumEditService';

const TENANT = 't1';
const STAGE = 'foundation';

/** A document shaped like the real one, with the two mongoose hooks the service calls. */
const curriculumDoc = () => ({
  modules: [
    { moduleCode: 'M01_CS', moduleName: 'CS Fundamentals', displayOrder: 10 },
    { moduleCode: 'M02_THINK', moduleName: 'Computational Thinking', displayOrder: 20 },
    { moduleCode: 'M03_PROG', moduleName: 'Programming', displayOrder: 30 },
  ],
  topics: [
    { _id: 't1', topicCode: 'T_BINARY', title: 'Binary', moduleCode: 'M01_CS', order: 1, startDay: 1, endDay: 1 },
    { _id: 't2', topicCode: 'T_LOGIC', title: 'Logic', moduleCode: 'M01_CS', order: 2, startDay: 2, endDay: 2 },
    { _id: 't3', topicCode: 'T_GATES', title: 'Gates', moduleCode: 'M01_CS', order: 3, startDay: 3, endDay: 3 },
    { _id: 't4', topicCode: 'T_LOOPS', title: 'Loops', moduleCode: 'M03_PROG', order: 1, startDay: 4, endDay: 4 },
  ],
  totalDays: 4,
  markModified: () => {},
  save: async () => {},
});

const orderOf = (moduleCode: string) => (stored.topics as any[])
  .filter(t => t.moduleCode === moduleCode)
  .sort((a, b) => a.order - b.order)
  .map(t => t.topicCode);

const moduleOrder = () => (stored.modules as any[])
  .slice()
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map(m => m.moduleCode);

beforeEach(() => { stored = curriculumDoc(); });

// ─────────────────────────────────────────────────────────────────────────────
describe('reordering modules', () => {
  it('renumbers from the sequence sent, not from numbers the caller supplies', async () => {
    await reorderModules(TENANT, STAGE, ['M03_PROG', 'M01_CS', 'M02_THINK']);
    expect(moduleOrder()).toEqual(['M03_PROG', 'M01_CS', 'M02_THINK']);
  });

  it('leaves gaps between positions, so one can still be inserted by hand', async () => {
    await reorderModules(TENANT, STAGE, ['M03_PROG', 'M01_CS', 'M02_THINK']);
    expect((stored.modules as any[]).map(m => m.displayOrder).sort((a, b) => a - b))
      .toEqual([10, 20, 30]);
  });

  it('refuses a module that does not exist rather than ignoring it', async () => {
    // Silently dropping it would apply a DIFFERENT order from the one the author asked for.
    await expect(reorderModules(TENANT, STAGE, ['M03_PROG', 'M99_GHOST']))
      .rejects.toThrow(/M99_GHOST/);
  });

  it('refuses a module named twice, because two positions is not an order', async () => {
    await expect(reorderModules(TENANT, STAGE, ['M01_CS', 'M01_CS']))
      .rejects.toThrow(/more than once/);
  });

  it('refuses an empty order', async () => {
    await expect(reorderModules(TENANT, STAGE, [])).rejects.toThrow(/Nothing to reorder/);
  });

  it('relays the days, so a module moved earlier takes its topics with it', async () => {
    await reorderModules(TENANT, STAGE, ['M03_PROG', 'M01_CS', 'M02_THINK']);
    const loops = (stored.topics as any[]).find(t => t.topicCode === 'T_LOOPS');
    // Programming is first now, so its topic holds day one. An overlap or a gap here is a day
    // with two topics or none, and nothing downstream reports either.
    expect(loops.startDay).toBe(1);
    const days = (stored.topics as any[]).map(t => t.startDay).sort((a, b) => a - b);
    expect(days).toEqual([1, 2, 3, 4]);
  });
});

describe('reordering topics within a module', () => {
  it('applies the order given', async () => {
    await reorderTopics(TENANT, STAGE, 'M01_CS', ['T_GATES', 'T_BINARY', 'T_LOGIC']);
    expect(orderOf('M01_CS')).toEqual(['T_GATES', 'T_BINARY', 'T_LOGIC']);
  });

  it('keeps unnamed siblings after the named ones, in their existing order', async () => {
    // A partial order is a real instruction — "put this one first" — and dropping the rest to
    // position zero would scramble the module every time somebody reordered part of it.
    await reorderTopics(TENANT, STAGE, 'M01_CS', ['T_GATES']);
    expect(orderOf('M01_CS')).toEqual(['T_GATES', 'T_BINARY', 'T_LOGIC']);
  });

  it('refuses a topic belonging to another module', async () => {
    await expect(reorderTopics(TENANT, STAGE, 'M01_CS', ['T_BINARY', 'T_LOOPS']))
      .rejects.toThrow(/T_LOOPS/);
  });

  it('refuses a topic named twice', async () => {
    await expect(reorderTopics(TENANT, STAGE, 'M01_CS', ['T_BINARY', 'T_BINARY']))
      .rejects.toThrow(/more than once/);
  });

  it('does not disturb another module', async () => {
    await reorderTopics(TENANT, STAGE, 'M01_CS', ['T_GATES', 'T_LOGIC', 'T_BINARY']);
    expect(orderOf('M03_PROG')).toEqual(['T_LOOPS']);
  });

  it('refuses a module with no topics rather than reporting success', async () => {
    await expect(reorderTopics(TENANT, STAGE, 'M02_THINK', ['T_ANY']))
      .rejects.toThrow(/no topics/);
  });
});

describe('a topic validates skills the same way a Learning Unit does', () => {
  const topic = (over: any = {}) => ({
    title: 'A topic', moduleCode: 'M01_CS', topicCode: 'T_NEW', ...over,
  });

  it('accepts an active SKILL', async () => {
    await expect(createTopic(TENANT, STAGE, topic({ skillKeys: ['HTML'] }))).resolves.toBeTruthy();
  });

  it('refuses a key nothing defines', async () => {
    await expect(createTopic(TENANT, STAGE, topic({ skillKeys: ['HTMLL'] })))
      .rejects.toThrow(/HTMLL/);
  });

  it('refuses a GROUP node', async () => {
    // The rule that used to differ between topics and units. A group organises skills; it is
    // not itself something a student can be measured against.
    await expect(createTopic(TENANT, STAGE, topic({ skillKeys: ['WEB'] })))
      .rejects.toThrow(/is a group/);
  });

  it('refuses a retired skill', async () => {
    await expect(createTopic(TENANT, STAGE, topic({ skillKeys: ['SILVERLIGHT'] })))
      .rejects.toThrow(/retired/);
  });

  it('applies the same rule to prerequisite skills', async () => {
    await expect(createTopic(TENANT, STAGE, topic({ prerequisiteSkillKeys: ['WEB'] })))
      .rejects.toThrow(/is a group/);
  });

  it('leaves skills untouched when an update does not mention them', async () => {
    (stored.topics as any[])[0].skillKeys = ['HTML'];
    await updateTopic(TENANT, STAGE, 't1', { title: 'Renamed' });
    // undefined means "not talking about skills"; an empty array would mean "teaches nothing".
    expect((stored.topics as any[])[0].skillKeys).toEqual(['HTML']);
  });
});

describe('a topic validates directions against the canonical list', () => {
  it('refuses one nothing defines', async () => {
    await expect(createTopic(TENANT, STAGE, {
      title: 'A topic', moduleCode: 'M01_CS', topicCode: 'T_D',
      applicableDirections: ['SOFTWARE_DEVELOPMENT'],
    })).rejects.toThrow(/SOFTWARE_DEVELOPMENT/);
  });

  it('accepts the frozen SOFTWARE_BACKEND', async () => {
    await expect(createTopic(TENANT, STAGE, {
      title: 'A topic', moduleCode: 'M01_CS', topicCode: 'T_D',
      applicableDirections: ['SOFTWARE_BACKEND'],
    })).resolves.toBeTruthy();
  });
});

describe('modules keep working while reorder exists beside them', () => {
  it('still creates and renames one', async () => {
    await saveModule(TENANT, STAGE, { moduleCode: 'M04_NEW', moduleName: 'New' });
    expect((stored.modules as any[]).find(m => m.moduleCode === 'M04_NEW').moduleName).toBe('New');

    await saveModule(TENANT, STAGE, { moduleCode: 'M04_NEW', moduleName: 'Renamed' });
    expect((stored.modules as any[]).filter(m => m.moduleCode === 'M04_NEW')).toHaveLength(1);
  });
});

describe('the frozen vocabularies these screens author against', () => {
  it('offers seven authorable states, excluding the two that are not about material', () => {
    expect(AUTHORABLE_SUITABLE_STATES).toHaveLength(7);
    /**
     * LOCKED is a scheduling verdict the composer reaches, not a property of the material, so
     * "suitable when locked" would assert the opposite of what LOCKED means. NOT_RELEVANT is
     * about direction, which a unit already expresses through applicableDirections — two owners
     * for one decision is how they come to disagree.
     */
    expect(AUTHORABLE_SUITABLE_STATES).not.toContain('LOCKED');
    expect(AUTHORABLE_SUITABLE_STATES).not.toContain('NOT_RELEVANT');
  });

  it('keeps SOFTWARE_BACKEND and has never gained SOFTWARE_DEVELOPMENT', () => {
    expect(DIRECTION_KEYS).toContain('SOFTWARE_BACKEND');
    expect(DIRECTION_KEYS).not.toContain('SOFTWARE_DEVELOPMENT');
  });
});

describe('the Foundation backbone classification on a topic', () => {
  it('an admin can mark a mandatory, direction-independent topic as backbone, and unmark it', async () => {
    await updateTopic(TENANT, STAGE, 't4', { backbone: true });
    expect(stored.topics.find((t: any) => t._id === 't4').backbone).toBe(true);
    await updateTopic(TENANT, STAGE, 't4', { backbone: false });
    expect(stored.topics.find((t: any) => t._id === 't4').backbone).toBe(false);
  });

  it('refuses backbone on a topic that is not mandatory, or that a direction scopes', async () => {
    await expect(updateTopic(TENANT, STAGE, 't4', { backbone: true, mandatory: false })).rejects.toThrow(/mandatory/);
    stored = curriculumDoc();
    await expect(updateTopic(TENANT, STAGE, 't4', { backbone: true, applicableDirections: ['WEB_DEVELOPMENT'] }))
      .rejects.toThrow(/directions/);
  });

  it('refuses making a backbone topic optional, and creating a direction-scoped backbone topic', async () => {
    await updateTopic(TENANT, STAGE, 't4', { backbone: true });
    await expect(updateTopic(TENANT, STAGE, 't4', { mandatory: false })).rejects.toThrow(/mandatory/);
    stored = curriculumDoc();
    await expect(createTopic(TENANT, STAGE, { title: 'Web backbone', moduleCode: 'M03_PROG', backbone: true, applicableDirections: ['WEB_DEVELOPMENT'] }))
      .rejects.toThrow(/directions/);
  });
});
