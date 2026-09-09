/**
 * Editing a stage's curriculum: its modules, its topics, and what each topic teaches.
 *
 * WHY NOT THE GENERIC CURRICULUM UPDATE. That endpoint replaces the whole topics array, which
 * is right for the day-planner it was built for and wrong here: two admins editing different
 * modules would each send a complete array and the later save would silently discard the
 * other's work. These operations name what they change, so concurrent edits to different
 * topics both survive.
 *
 * DAYS ARE RECOMPUTED, NEVER TYPED. Every topic occupies a span of days and the planner reads
 * them, so an admin inserting a topic in the middle would otherwise have to renumber everything
 * after it by hand — and a single wrong number produces a plan with a gap or an overlap that
 * nothing reports. Order is the admin's business; days are derived from it.
 *
 * DELETING A TOPIC LEAVES STUDENT HISTORY ALONE. Plan items reference topics by code, and a
 * student who completed one did complete it. The topic stops being scheduled; what happened
 * stays recorded.
 */

import LearningCurriculum from '../models/LearningCurriculum';
import CareerSkill from '../models/CareerSkill';

export interface TopicInput {
  title?: string;
  description?: string;
  moduleCode?: string;
  topicCode?: string;
  skillKeys?: string[];
  prerequisiteSkillKeys?: string[];
  defaultDepth?: string;
  mandatory?: boolean;
  applicableDirections?: string[];
  learningOutcomes?: string[];
  /** Where in its module the topic sits. Days follow from it. */
  order?: number;
}

const DEPTHS = ['FOUNDATION', 'GUIDED', 'STANDARD', 'REVISION', 'CHALLENGE'];
const clean = (v: any) => String(v ?? '').trim();
const upper = (v: any) => clean(v).toUpperCase();

async function loadStageCurriculum(tenantId: string, stage: string) {
  const doc = await LearningCurriculum.findOne({ tenantId, adaptiveStage: stage, personalizedFor: null });
  if (!doc) throw new Error(`No curriculum is marked as the "${stage}" stage curriculum.`);
  return doc;
}

/**
 * Lay the days out end to end, in module then topic order.
 *
 * One day per topic is the shipped shape for the adaptive stages and the planner spreads work
 * across it; what matters here is that the spans are contiguous and non-overlapping, because a
 * gap is a day with nothing scheduled and an overlap is two topics claiming one day.
 */
function relayDays(doc: any) {
  const moduleOrder = new Map<string, number>(
    ((doc.modules || []) as any[]).map(m => [String(m.moduleCode), Number(m.displayOrder) || 0]),
  );
  const topics = (doc.topics || []) as any[];
  topics.sort((a, b) => {
    const ma = moduleOrder.get(String(a.moduleCode)) ?? 9999;
    const mb = moduleOrder.get(String(b.moduleCode)) ?? 9999;
    if (ma !== mb) return ma - mb;
    if (String(a.moduleCode || '') !== String(b.moduleCode || '')) {
      return String(a.moduleCode || '').localeCompare(String(b.moduleCode || ''));
    }
    return (a.order ?? 0) - (b.order ?? 0);
  });

  let day = 1;
  for (const [i, t] of topics.entries()) {
    const span = Math.max(1, (t.endDay ?? 0) - (t.startDay ?? 0) + 1) || 1;
    t.order = i + 1;
    t.startDay = day;
    t.endDay = day + span - 1;
    day = t.endDay + 1;
  }
  doc.totalDays = Math.max(1, day - 1);
  doc.markModified('topics');
}

/** Reject skill keys that do not exist, rather than storing a mapping to nothing. */
async function validateSkillKeys(keys: string[] | undefined): Promise<string[] | undefined> {
  if (keys === undefined) return undefined;
  const wanted = [...new Set(keys.map(upper).filter(Boolean))];
  if (!wanted.length) return [];
  const found = await CareerSkill.find({ key: { $in: wanted } }).select('key').lean() as any[];
  const have = new Set(found.map(s => String(s.key).toUpperCase()));
  const missing = wanted.filter(k => !have.has(k));
  if (missing.length) {
    // Named rather than dropped: a silently ignored key looks saved and teaches nothing.
    throw new Error(`These skills do not exist: ${missing.join(', ')}`);
  }
  return wanted;
}

/* ── modules ─────────────────────────────────────────────────────────────── */

export async function saveModule(tenantId: string, stage: string, input: {
  moduleCode: string; moduleName?: string; displayOrder?: number; blurb?: string;
}) {
  const doc: any = await loadStageCurriculum(tenantId, stage);
  const code = clean(input.moduleCode);
  if (!code) throw new Error('A module needs a code.');

  const list = (doc.modules || []) as any[];
  const existing = list.find(m => String(m.moduleCode) === code);

  if (existing) {
    if (input.moduleName !== undefined) existing.moduleName = clean(input.moduleName) || existing.moduleName;
    if (input.displayOrder !== undefined) existing.displayOrder = Number(input.displayOrder) || 0;
    if (input.blurb !== undefined) existing.blurb = clean(input.blurb);
  } else {
    list.push({
      moduleCode: code,
      moduleName: clean(input.moduleName) || code,
      displayOrder: input.displayOrder !== undefined ? Number(input.displayOrder) || 0 : (list.length + 1) * 10,
      blurb: clean(input.blurb) || undefined,
    });
  }

  doc.modules = list;
  doc.markModified('modules');
  relayDays(doc);
  await doc.save();
  return { moduleCode: code };
}

/**
 * Remove a module.
 *
 * REFUSES WHILE IT STILL HAS TOPICS. Deleting the shelf and leaving the books would produce
 * topics whose moduleCode names nothing — they would vanish from a grouped view while still
 * being scheduled and taught, which is the worst of both. Move or delete them first, and the
 * error says which.
 */
export async function deleteModule(tenantId: string, stage: string, moduleCode: string) {
  const doc: any = await loadStageCurriculum(tenantId, stage);
  const code = clean(moduleCode);
  const held = ((doc.topics || []) as any[]).filter(t => String(t.moduleCode || '') === code);
  if (held.length) {
    throw new Error(`"${code}" still has ${held.length} topic${held.length === 1 ? '' : 's'}: `
      + `${held.map(t => t.title).join(', ')}. Move or delete them first.`);
  }
  doc.modules = ((doc.modules || []) as any[]).filter(m => String(m.moduleCode) !== code);
  doc.markModified('modules');
  await doc.save();
  return { deleted: code };
}

/* ── topics ──────────────────────────────────────────────────────────────── */

export async function createTopic(tenantId: string, stage: string, input: TopicInput) {
  const doc: any = await loadStageCurriculum(tenantId, stage);
  const title = clean(input.title);
  if (!title) throw new Error('A topic needs a title.');

  const skillKeys = await validateSkillKeys(input.skillKeys);
  const prereqs = await validateSkillKeys(input.prerequisiteSkillKeys);
  const moduleCode = clean(input.moduleCode) || 'UNGROUPED';

  /**
   * A topic code is generated when none is given, because everything durable points at it.
   *
   * Plan items, student history and the assignment record all reference a topic by code rather
   * than by subdocument id, so a topic created without one can never be referenced — and its
   * completion could not be recorded.
   */
  const siblings = ((doc.topics || []) as any[]).filter(t => String(t.moduleCode || '') === moduleCode);
  const topicCode = clean(input.topicCode)
    || `T_${title.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 28)}`;

  const taken = ((doc.topics || []) as any[]).some(t => clean(t.topicCode) === topicCode);
  if (taken) throw new Error(`The topic code "${topicCode}" is already used in this curriculum.`);

  doc.topics.push({
    title,
    description: clean(input.description) || undefined,
    order: input.order ?? (siblings.length + 1),
    startDay: 1, endDay: 1,                    // relayDays assigns the real span
    moduleCode,
    topicCode,
    skillKeys: skillKeys && skillKeys.length ? skillKeys : undefined,
    prerequisiteSkillKeys: prereqs && prereqs.length ? prereqs : undefined,
    defaultDepth: DEPTHS.includes(upper(input.defaultDepth)) ? upper(input.defaultDepth) : 'FOUNDATION',
    mandatory: input.mandatory !== false,
    applicableDirections: input.applicableDirections || [],
    learningOutcomes: (input.learningOutcomes || []).map(clean).filter(Boolean),
  });

  relayDays(doc);
  await doc.save();
  const created = ((doc.topics || []) as any[]).find(t => clean(t.topicCode) === topicCode);
  return { id: String(created?._id), topicCode };
}

export async function updateTopic(tenantId: string, stage: string, topicId: string, input: TopicInput) {
  const doc: any = await loadStageCurriculum(tenantId, stage);
  const topic = ((doc.topics || []) as any[]).find(t => String(t._id) === String(topicId));
  if (!topic) throw new Error('No such topic in this curriculum.');

  if (input.title !== undefined) {
    const title = clean(input.title);
    if (!title) throw new Error('A topic needs a title.');
    topic.title = title;
  }
  if (input.description !== undefined) topic.description = clean(input.description) || undefined;
  if (input.moduleCode !== undefined) topic.moduleCode = clean(input.moduleCode) || 'UNGROUPED';
  if (input.order !== undefined) topic.order = Number(input.order) || 0;
  if (input.mandatory !== undefined) topic.mandatory = !!input.mandatory;
  if (input.applicableDirections !== undefined) topic.applicableDirections = input.applicableDirections;
  if (input.learningOutcomes !== undefined) {
    topic.learningOutcomes = (input.learningOutcomes || []).map(clean).filter(Boolean);
  }
  if (input.defaultDepth !== undefined && DEPTHS.includes(upper(input.defaultDepth))) {
    topic.defaultDepth = upper(input.defaultDepth);
  }

  // An explicit empty array means "teaches nothing yet" and is a real instruction; undefined
  // means the caller did not mention skills and the mapping must survive untouched.
  const skillKeys = await validateSkillKeys(input.skillKeys);
  if (skillKeys !== undefined) topic.skillKeys = skillKeys.length ? skillKeys : undefined;
  const prereqs = await validateSkillKeys(input.prerequisiteSkillKeys);
  if (prereqs !== undefined) topic.prerequisiteSkillKeys = prereqs.length ? prereqs : undefined;

  // topicCode is deliberately not editable: durable references point at it, and renaming it
  // would orphan every plan item and completion record that names it.

  relayDays(doc);
  await doc.save();
  return { id: String(topic._id) };
}

export async function deleteTopic(tenantId: string, stage: string, topicId: string) {
  const doc: any = await loadStageCurriculum(tenantId, stage);
  const before = ((doc.topics || []) as any[]).length;
  doc.topics = ((doc.topics || []) as any[]).filter(t => String(t._id) !== String(topicId));
  if (doc.topics.length === before) throw new Error('No such topic in this curriculum.');

  relayDays(doc);
  await doc.save();
  return { deleted: String(topicId), remaining: doc.topics.length };
}
