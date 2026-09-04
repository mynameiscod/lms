import mongoose from 'mongoose';
import SkillEvidence from '../models/SkillEvidence';
import Question from '../models/Question';
import AssessmentItem from '../models/AssessmentItem';
import CareerSkill from '../models/CareerSkill';
import PersonalizedAssessment from '../models/PersonalizedAssessment';

/**
 * The CareerPilot assessment bank, as one browsable, editable list.
 *
 * WHY THIS EXISTS. Targeting could only ever be set at the moment a question was approved.
 * After that there was no screen that listed approved questions at all — Question Drafting
 * shows only what is still pending, and Skill Evidence edits the skill mapping and nothing
 * else. So 638 of 640 questions sat untargeted with no way to tag them, and a question with
 * a typo could not be corrected without rejecting and rewriting it.
 *
 * THE UNIT IS A QUESTION, NOT A MAPPING. Evidence rows are per question-per-skill, so 640
 * rows describe 619 questions — 21 measure two skills each and would otherwise appear twice
 * in the list. They are grouped here, and their skills shown together.
 *
 * TARGETING IS WRITTEN TO EVERY MAPPING OF A QUESTION. It is stored per mapping, so a
 * two-skill question can hold two audiences that disagree — a state nothing in the product
 * can render honestly and nobody asked for. One question, one audience.
 */

/** Only these two families are CareerPilot assessment content. */
export const BANK_SOURCE_TYPES = ['question', 'assessment_item'] as const;

const oid = (v: string) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

/**
 * LMS questions grade `difficultyLevel` as easy/medium/hard; assessment items use their own
 * `difficulty`. The bank speaks one vocabulary, exactly as the coverage matrix already does.
 */
export const normalizeDifficulty = (v: any): 'EASY' | 'MEDIUM' | 'HARD' | null => {
  const s = String(v ?? '').trim().toUpperCase();
  if (s === 'EASY' || s === 'MEDIUM' || s === 'HARD') return s;
  // Numeric scales (assessment items grade 1-5) folded into the three bands the bank shows.
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return n <= 2 ? 'EASY' : n >= 4 ? 'HARD' : 'MEDIUM';
  return null;
};

/**
 * Authored for CareerPilot, or borrowed from the LMS quiz bank?
 *
 * Load-bearing rather than a badge. A borrowed question lives in the `questions` collection
 * shared with 293 LMS quizzes, so editing its text edits it for the LMS too. The bank
 * refuses to do that: it copies first (see `copyForCareerPilot`) and edits the copy.
 */
export const isOwned = (q: any): boolean =>
  (q?.tags || []).some((t: any) => /careerpilot/i.test(String(t)));

export interface BankFilters {
  skillKey?: string;
  difficulty?: string;
  /** 'owned' | 'borrowed' */
  provenance?: string;
  /** 'active' | 'inactive' */
  status?: string;
  /** 'targeted' | 'untargeted' — the filter that matters most while the bank is untagged. */
  targeting?: string;
  year?: string;
  course?: string;
  branch?: string;
  role?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Mongo conditions for the audience filters, applied to the evidence rows. */
function audienceConditions(f: BankFilters): any[] {
  const and: any[] = [];
  if (f.year)   and.push({ audienceYears: f.year });
  if (f.course) and.push({ audienceCourses: String(f.course).toUpperCase() });
  if (f.branch) and.push({ audienceBranches: f.branch });
  if (f.role)   and.push({ audienceRoles: String(f.role).toUpperCase() });

  if (f.targeting === 'untargeted') {
    // Untargeted means every axis is empty. Reaches everyone, which is the state 638 of the
    // bank is in and the reason this filter exists.
    and.push({
      $and: ['audienceRoles', 'audienceYears', 'audienceCourses', 'audienceBranches']
        .map(k => ({ $or: [{ [k]: { $size: 0 } }, { [k]: { $exists: false } }] })),
    });
  } else if (f.targeting === 'targeted') {
    and.push({
      $or: ['audienceRoles', 'audienceYears', 'audienceCourses', 'audienceBranches']
        .map(k => ({ [k]: { $exists: true, $ne: [] } })),
    });
  }
  return and;
}

/**
 * How many recorded answers reference a set of questions.
 *
 * THE CONSTRAINT THE EDITOR IS BUILT AROUND. An answer stores the option's ARRAY INDEX
 * (`response: ["3"]`) because options carry no id of their own. Adding, deleting or
 * reordering an option on an answered question therefore rewrites what every past answer
 * meant — a student who chose C silently becomes one who chose D, and their skill score is
 * wrong with nothing to show for it. So the bank counts answers and refuses structural
 * option edits where there are any.
 */
export async function answerCounts(pairs: { sourceType: string; sourceId: string }[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!pairs.length) return out;

  const rows = await PersonalizedAssessment.aggregate([
    { $match: { 'answers.sourceId': { $in: pairs.map(p => p.sourceId) } } },
    { $unwind: '$answers' },
    { $match: { 'answers.sourceId': { $in: pairs.map(p => p.sourceId) } } },
    { $group: { _id: { t: '$answers.sourceType', i: '$answers.sourceId' }, n: { $sum: 1 } } },
  ]).catch(() => [] as any[]);

  for (const r of rows) out.set(`${r._id.t}:${r._id.i}`, r.n);
  return out;
}

export interface BankRow {
  sourceType: string;
  sourceId: string;
  question: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  difficulty: string | null;
  owned: boolean;
  /**
   * Where the content lives, which decides what may be done to it:
   *   'careerpilot' — ours, fully editable
   *   'lms'         — shared with the LMS quiz bank; copy before editing
   *   'exam'        — the skill-assessment exam bank, edited in its own screen
   */
  origin: 'careerpilot' | 'lms' | 'exam';
  active: boolean;
  /** Every skill this question measures, because one question can measure several. */
  skills: { skillKey: string; skillName: string; contribution: string }[];
  audience: {
    audienceRoles: string[]; audienceYears: string[];
    audienceCourses: string[]; audienceBranches: string[];
  };
  /** Zero means the whole editor is open; anything else locks option structure. */
  answerCount: number;
  editable: { text: boolean; optionText: boolean; optionStructure: boolean; hardDelete: boolean };
}

export async function listBank(tenantId: string, f: BankFilters): Promise<{
  rows: BankRow[]; total: number; page: number; pageSize: number;
}> {
  const page = Math.max(0, Number(f.page) || 0);
  const pageSize = Math.min(100, Math.max(5, Number(f.pageSize) || 25));

  const evMatch: any = { tenantId, sourceType: { $in: BANK_SOURCE_TYPES } };
  if (f.skillKey) evMatch.skillKey = String(f.skillKey).toUpperCase();
  if (f.status === 'active') evMatch.active = { $ne: false };
  if (f.status === 'inactive') evMatch.active = false;
  const aud = audienceConditions(f);
  if (aud.length) evMatch.$and = aud;

  // Every mapping that survives the filters, then grouped to one entry per question — the
  // filters are properties of a mapping, the list is a list of questions.
  const evidence = await SkillEvidence.find(evMatch).lean() as any[];
  const byQuestion = new Map<string, any[]>();
  for (const e of evidence) {
    const key = `${e.sourceType}:${e.sourceId}`;
    (byQuestion.get(key) || byQuestion.set(key, []).get(key)!).push(e);
  }

  // The source documents, for text, options and difficulty.
  const qIds = [...byQuestion.keys()]
    .filter(k => k.startsWith('question:'))
    .map(k => oid(k.split(':')[1]))
    .filter(Boolean) as mongoose.Types.ObjectId[];
  const questions = qIds.length
    ? await Question.find({ _id: { $in: qIds } }).lean() as any[]
    : [];
  const qById = new Map(questions.map(q => [String(q._id), q]));

  /**
   * Exam-bank items are loaded too, and this is not optional polish: 18 of the mappings
   * point at AssessmentItem rather than Question, and reading only the Question collection
   * rendered every one of them as "(source content missing)" with no options and no
   * difficulty — then labelled them Borrowed and offered a copy that would have failed.
   * They carry `prompt` and their own option shape, so they are read on their own terms.
   */
  const aIds = [...byQuestion.keys()]
    .filter(k => k.startsWith('assessment_item:'))
    .map(k => oid(k.split(':')[1]))
    .filter(Boolean) as mongoose.Types.ObjectId[];
  const items = aIds.length
    ? await AssessmentItem.find({ _id: { $in: aIds } }).lean() as any[]
    : [];
  const aById = new Map(items.map(i => [String(i._id), i]));

  const skills = await CareerSkill.find({
    key: { $in: [...new Set(evidence.map(e => e.skillKey))] },
  }).select('key name').lean() as any[];
  const skillName = new Map(skills.map(s => [s.key, s.name]));

  let rows: BankRow[] = [];
  for (const [key, maps] of byQuestion) {
    const [sourceType, sourceId] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    const isExam = sourceType === 'assessment_item';
    const q = isExam ? aById.get(sourceId) : qById.get(sourceId);
    // A mapping whose source has since been deleted. Surfaced rather than hidden — it is a
    // broken row an admin needs to see, not a row to quietly drop.
    const text = (isExam ? q?.prompt : q?.question) ?? '(source content missing)';
    const owned = !isExam && isOwned(q);
    const origin: 'careerpilot' | 'lms' | 'exam' = isExam ? 'exam' : owned ? 'careerpilot' : 'lms';

    const first = maps[0];
    rows.push({
      sourceType, sourceId,
      question: text,
      // Three option shapes across two collections: plain strings and {text,isCorrect} in
      // the LMS bank, {id,text} plus a separate correctOptionIds list in the exam bank.
      options: (q?.options || []).map((o: any) => {
        if (typeof o === 'string') return { text: o, isCorrect: false };
        const correct = isExam
          ? (q?.correctOptionIds || []).includes(o?.id)
          : o?.isCorrect === true;
        return { text: String(o?.text ?? ''), isCorrect: correct };
      }),
      explanation: q?.explanation || '',
      difficulty: normalizeDifficulty(q?.difficultyLevel ?? q?.difficulty),
      owned,
      origin,
      active: maps.every(m => m.active !== false),
      skills: maps.map(m => ({
        skillKey: m.skillKey,
        skillName: skillName.get(m.skillKey) || m.skillKey,
        contribution: m.contribution || 'PRIMARY',
      })),
      audience: {
        audienceRoles: first.audienceRoles || [],
        audienceYears: first.audienceYears || [],
        audienceCourses: first.audienceCourses || [],
        audienceBranches: first.audienceBranches || [],
      },
      answerCount: 0,
      editable: { text: true, optionText: true, optionStructure: true, hardDelete: true },
    });
  }

  // Text search and difficulty live on the SOURCE, not the mapping, so they are applied
  // after the join rather than in the evidence query.
  if (f.search) {
    const needle = String(f.search).trim().toLowerCase();
    rows = rows.filter(r => r.question.toLowerCase().includes(needle)
      || r.options.some(o => o.text.toLowerCase().includes(needle)));
  }
  if (f.difficulty) {
    const want = normalizeDifficulty(f.difficulty);
    rows = rows.filter(r => r.difficulty === want);
  }
  if (f.provenance === 'owned') rows = rows.filter(r => r.origin === 'careerpilot');
  // 'borrowed' means shared with the LMS quiz bank specifically. Exam-bank items are not
  // borrowed from anywhere and lumping them in overstated the count by 18.
  if (f.provenance === 'borrowed') rows = rows.filter(r => r.origin === 'lms');
  if (f.provenance === 'exam') rows = rows.filter(r => r.origin === 'exam');

  // Stable order: the newest questions first is what an author expects, and _id carries it.
  rows.sort((a, b) => (a.sourceId < b.sourceId ? 1 : a.sourceId > b.sourceId ? -1 : 0));

  const total = rows.length;
  const pageRows = rows.slice(page * pageSize, page * pageSize + pageSize);

  // Counted for the page only. Over the whole filtered set this would be a large aggregate
  // on every keystroke, and the answer only matters for rows being looked at.
  const counts = await answerCounts(pageRows.map(r => ({ sourceType: r.sourceType, sourceId: r.sourceId })));
  for (const r of pageRows) {
    r.answerCount = counts.get(`${r.sourceType}:${r.sourceId}`) || 0;
    const answered = r.answerCount > 0;
    r.editable = {
      // Text and explanation are safe on an answered question: they do not change what any
      // recorded response referred to.
      text: r.owned,
      optionText: r.owned,
      // The rule that protects recorded scores. Also closed on borrowed questions, which
      // must be copied into CareerPilot before any edit, and on exam-bank items, which are
      // authored in their own screen. Targeting stays editable on all three — it lives on
      // the mapping and touches no content.
      optionStructure: r.owned && !answered,
      hardDelete: !answered,
    };
  }

  return { rows: pageRows, total, page, pageSize };
}

/**
 * Copy a borrowed LMS question into CareerPilot so it can be edited safely.
 *
 * The borrowed original stays exactly as it is and the LMS keeps using it; the evidence
 * mappings are repointed at the copy, so CareerPilot's pools serve the copy from now on.
 * Past answers still name the original id and remain readable — nothing that was recorded
 * changes meaning, which is the whole reason this is a copy and not an edit.
 */
export async function copyForCareerPilot(o: {
  tenantId: string; sourceId: string; actor: string;
}): Promise<{ sourceId: string }> {
  const id = oid(o.sourceId);
  if (!id) throw new Error('Unknown question.');
  const original: any = await Question.findOne({ _id: id, tenantId: o.tenantId }).lean();
  if (!original) throw new Error('Question not found.');
  if (isOwned(original)) return { sourceId: o.sourceId };   // already ours; nothing to copy

  const maps = await SkillEvidence.find({
    tenantId: o.tenantId, sourceType: 'question', sourceId: o.sourceId,
  }).lean() as any[];

  const { _id, createdAt, updatedAt, __v, ...rest } = original;
  const copy: any = await Question.create({
    ...rest,
    tenantId: o.tenantId,
    createdBy: o.actor,
    usageCount: 0,
    tags: [...new Set([...(original.tags || []), 'careerpilot-owned', `copied-from:${o.sourceId}`])],
  });

  try {
    await SkillEvidence.updateMany(
      { tenantId: o.tenantId, sourceType: 'question', sourceId: o.sourceId },
      { $set: { sourceId: String(copy._id) } },
    );
  } catch (err) {
    await Question.deleteOne({ _id: copy._id }).catch(() => {});
    throw err;
  }

  if (!maps.length) {
    // No mapping to repoint means the copy would be invisible to CareerPilot. Better to
    // fail loudly than leave an orphan in the shared LMS bank.
    await Question.deleteOne({ _id: copy._id }).catch(() => {});
    throw new Error('That question has no CareerPilot skill mapping to move.');
  }

  return { sourceId: String(copy._id) };
}

/** Write one audience to every mapping of a question, so they cannot disagree. */
export async function setTargeting(o: {
  tenantId: string;
  targets: { sourceType: string; sourceId: string }[];
  audience: {
    audienceRoles?: string[]; audienceYears?: string[];
    audienceCourses?: string[]; audienceBranches?: string[];
  };
}): Promise<number> {
  const up = (v: any[] | undefined) => (v || []).map(x => String(x).trim()).filter(Boolean);
  const $set: any = {
    audienceRoles:    up(o.audience.audienceRoles).map(v => v.toUpperCase()),
    audienceYears:    up(o.audience.audienceYears),
    audienceCourses:  up(o.audience.audienceCourses).map(v => v.toUpperCase()),
    audienceBranches: up(o.audience.audienceBranches),
  };

  let touched = 0;
  for (const t of o.targets) {
    const r = await SkillEvidence.updateMany(
      { tenantId: o.tenantId, sourceType: t.sourceType, sourceId: t.sourceId },
      { $set },
    );
    touched += r.modifiedCount ?? 0;
  }
  return touched;
}
