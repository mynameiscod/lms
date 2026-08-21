import AssessmentItem from '../models/AssessmentItem';
import PassportAssessment from '../models/PassportAssessment';
import Question from '../models/Question';
import ThinkingProblem from '../models/ThinkingProblem';
import { EvidenceSourceType } from '../models/SkillEvidence';

/**
 * One adapter per assessment content family.
 *
 * The four families agree on nothing. AssessmentItem grades difficulty 1-5 across six item
 * types; Question uses easy/medium/hard across four; ThinkingProblem has five bands of its
 * own; CareerPilot's questions are embedded subdocuments with no difficulty and a category
 * instead. Every one is tenant-scoped, and no two address their rows the same way.
 *
 * Rather than let those differences leak into the model, the service and the screen, each
 * is normalised here into one shape. Everything else in Module 5 deals with a
 * NormalisedItem and never asks which collection it came from.
 *
 * DIFFICULTY IS NORMALISED ON READ, NOT COPIED INTO THE MAPPING. A band stored on the
 * evidence row would be a second copy that silently goes stale the moment somebody edits
 * the question, and nothing would report the drift. Reading it costs one batched query per
 * source type — at most four for any request, however many skills are involved.
 *
 * Adding a fifth family is an entry in this map. Nothing else changes.
 */

/** A common difficulty vocabulary, so a request can ask for MEDIUM across all four. */
export type EvidenceDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export const EVIDENCE_DIFFICULTIES: EvidenceDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

/**
 * One choice a student can pick, and nothing else.
 *
 * `id` is whatever the GRADER for that family expects back — option id for the assessment
 * bank, subdocument id (or position) for quiz questions, plain index for CareerPilot's own
 * bank. Inventing a friendlier id here would round-trip to a grader that does not recognise
 * it, and every answer would score zero.
 *
 * There is deliberately no `isCorrect`, no weight and no explanation. The answer key stays
 * on the server: this shape is built to be safe to hand to the person sitting the paper.
 */
export interface NormalisedOption {
  id: string;
  text: string;
}

export interface NormalisedItem {
  sourceType: EvidenceSourceType;
  sourceId: string;
  sourceParentId?: string;
  /** What an admin reads to recognise the item. Trimmed — some are long. */
  text: string;
  /** The content's own type, in its own words. Shown, never interpreted. */
  itemType: string;
  difficulty: EvidenceDifficulty | null;
  /** The source's own tag or category. NOT a skill — see the note in the service. */
  sourceTag: string | null;
  /**
   * The code the question is ABOUT, for the families that have one.
   *
   * AssessmentItem carries this for predict_output, debug and complete_code, and for
   * eighteen of its multiple-choice items. It used to be dropped here, so a student was
   * asked "which line has the bug?" with no code on the screen — unanswerable, and
   * indistinguishable from a broken page.
   */
  codeSnippet?: string;
  /** Language of `codeSnippet`, for syntax presentation. */
  language?: string;
  /**
   * The choices, for families that have them. Loaded only by loadMany — the admin mapping
   * screen lists items to be tagged and has no use for options.
   */
  options?: NormalisedOption[];
  tenantId: string;
}

export interface SourceAdapter {
  type: EvidenceSourceType;
  label: string;
  /** One query for many ids. Never called per item. */
  loadMany(tenantId: string, ids: string[]): Promise<NormalisedItem[]>;
  /** A page of items for the mapping screen. */
  list(tenantId: string, opts: { search?: string; limit: number; skip: number }): Promise<{ items: NormalisedItem[]; total: number }>;
}

const trim = (s: any, n = 240): string => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * Option ids MUST match what each family's grader compares against, or a correct answer
 * scores zero. The three shapes are not interchangeable and are written out here rather
 * than guessed at each call site:
 *
 *   assessment_item    the option's own `id`, checked against correctOptionIds[]
 *   question           `_id` when the option is a subdocument, otherwise its position
 *   passport_question  the position, compared numerically with correctIndex
 *
 * Every one strips the key. `isCorrect`, `correctOptionIds` and `correctIndex` never leave
 * the server through this path.
 */
const assessmentItemOptions = (r: any): NormalisedOption[] | undefined =>
  Array.isArray(r?.options) && r.options.length
    ? r.options.map((o: any) => ({ id: String(o?.id ?? ''), text: trim(o?.text, 400) }))
    : undefined;

const questionOptions = (r: any): NormalisedOption[] | undefined =>
  Array.isArray(r?.options) && r.options.length
    ? r.options.map((o: any, i: number) => ({
        id: String(o?._id ?? i),
        // The quiz bank stores plain strings in some rows and subdocuments in others.
        text: trim(typeof o === 'string' ? o : (o?.text ?? ''), 400),
      }))
    : undefined;

const passportQuestionOptions = (q: any): NormalisedOption[] | undefined =>
  Array.isArray(q?.options) && q.options.length
    ? q.options.map((t: any, i: number) => ({ id: String(i), text: trim(t, 400) }))
    : undefined;

/** AssessmentItem grades 1-5; the middle band is 3, so 1-2 easy, 3 medium, 4-5 hard. */
const bandFromNumber = (n: any): EvidenceDifficulty | null => {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  if (v <= 2) return 'EASY';
  if (v === 3) return 'MEDIUM';
  return 'HARD';
};

/** Word-based scales. 'expert' and 'interview' both sit above 'hard' in practice. */
const bandFromWord = (s: any): EvidenceDifficulty | null => {
  const v = String(s ?? '').toLowerCase();
  if (!v) return null;
  if (v === 'easy') return 'EASY';
  if (v === 'medium') return 'MEDIUM';
  if (v === 'hard' || v === 'expert' || v === 'interview') return 'HARD';
  return null;
};

const assessmentItemAdapter: SourceAdapter = {
  type: 'assessment_item',
  label: 'Assessment bank',
  async loadMany(tenantId, ids) {
    const rows = await AssessmentItem.find({ tenantId, _id: { $in: ids } }).lean() as any[];
    return rows.map(r => ({
      sourceType: 'assessment_item' as const,
      sourceId: String(r._id),
      text: trim(r.prompt || r.text || r.title),
      itemType: r.type || 'mcq',
      difficulty: bandFromNumber(r.difficulty),
      sourceTag: r.dimension || null,
      codeSnippet: r.codeSnippet || undefined,
      language: r.language || undefined,
      options: assessmentItemOptions(r),
      tenantId,
    }));
  },
  async list(tenantId, { search, limit, skip }) {
    const q: any = { tenantId };
    if (search) q.$or = [{ prompt: new RegExp(search, 'i') }, { text: new RegExp(search, 'i') }];
    const [rows, total] = await Promise.all([
      AssessmentItem.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean() as any,
      AssessmentItem.countDocuments(q),
    ]);
    return {
      items: rows.map((r: any) => ({
        sourceType: 'assessment_item' as const,
        sourceId: String(r._id),
        text: trim(r.prompt || r.text || r.title),
        itemType: r.type || 'mcq',
        difficulty: bandFromNumber(r.difficulty),
        sourceTag: r.dimension || null,
        tenantId,
      })),
      total,
    };
  },
};

/**
 * CareerPilot's own bank — questions embedded in one document per tenant.
 *
 * The only family whose items are not top-level documents, which is why the evidence row
 * carries sourceParentId: the subdocument id identifies the question, but finding it again
 * means loading the assessment it lives in.
 */
const passportQuestionAdapter: SourceAdapter = {
  type: 'passport_question',
  label: 'CareerPilot assessment',
  async loadMany(tenantId, ids) {
    const doc: any = await PassportAssessment.findOne({ tenantId }).lean();
    const want = new Set(ids.map(String));
    return (doc?.questions || [])
      .filter((q: any) => want.has(String(q._id)))
      .map((q: any) => ({
        sourceType: 'passport_question' as const,
        sourceId: String(q._id),
        sourceParentId: String(doc._id),
        text: trim(q.text),
        itemType: q.selfReport ? 'self_report' : 'mcq',
        difficulty: null,                       // this bank has no difficulty of its own
        sourceTag: q.category || null,
        options: passportQuestionOptions(q),
        tenantId,
      }));
  },
  async list(tenantId, { search, limit, skip }) {
    const doc: any = await PassportAssessment.findOne({ tenantId }).lean();
    let qs = (doc?.questions || []);
    if (search) qs = qs.filter((q: any) => new RegExp(search, 'i').test(q.text || ''));
    return {
      items: qs.slice(skip, skip + limit).map((q: any) => ({
        sourceType: 'passport_question' as const,
        sourceId: String(q._id),
        sourceParentId: String(doc._id),
        text: trim(q.text),
        itemType: q.selfReport ? 'self_report' : 'mcq',
        difficulty: null,
        sourceTag: q.category || null,
        tenantId,
      })),
      total: qs.length,
    };
  },
};

/**
 * The Question document stores its prompt in `question`. `text` belongs to the OPTION
 * subdocument, so reading `r.text` here returned undefined for every row: not one of the
 * 3,868 quiz questions in production has a `text` field.
 *
 * That was not cosmetic. loadMany feeds studentShape, so a personalized paper built from
 * this bank rendered its questions BLANK to the student, and the admin mapping screen
 * listed them blank too — while `list`'s search filtered on the same absent field and
 * therefore matched nothing, making the bank unmappable and unreadable at once.
 *
 * `r.question || r.text` rather than a bare rename because the other three adapters in
 * this file legitimately carry `text`, and a future source may too.
 */
const questionText = (r: any): string => trim(r.question || r.text);

const questionAdapter: SourceAdapter = {
  type: 'question',
  label: 'Quiz questions',
  async loadMany(tenantId, ids) {
    const rows = await Question.find({ tenantId, _id: { $in: ids } }).lean() as any[];
    return rows.map(r => ({
      sourceType: 'question' as const,
      sourceId: String(r._id),
      text: questionText(r),
      itemType: r.type || 'mcq_single',
      difficulty: bandFromWord(r.difficultyLevel),
      sourceTag: null,
      options: questionOptions(r),
      tenantId,
    }));
  },
  async list(tenantId, { search, limit, skip }) {
    const q: any = { tenantId };
    // Search the field the prompt actually lives in. Subject and topic are included
    // because that is how this bank is organised and how an admin looks for "JDBC".
    if (search) {
      const re = new RegExp(search, 'i');
      q.$or = [{ question: re }, { subject: re }, { topic: re }];
    }
    const [rows, total] = await Promise.all([
      Question.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean() as any,
      Question.countDocuments(q),
    ]);
    return {
      items: rows.map((r: any) => ({
        sourceType: 'question' as const,
        sourceId: String(r._id),
        text: questionText(r),
        itemType: r.type || 'mcq_single',
        difficulty: bandFromWord(r.difficultyLevel),
        sourceTag: null,
        tenantId,
      })),
      total,
    };
  },
};

const thinkingProblemAdapter: SourceAdapter = {
  type: 'thinking_problem',
  label: 'Thinking problems',
  async loadMany(tenantId, ids) {
    const rows = await ThinkingProblem.find({ tenantId, _id: { $in: ids } }).lean() as any[];
    return rows.map(r => ({
      sourceType: 'thinking_problem' as const,
      sourceId: String(r._id),
      text: trim(r.title),
      itemType: 'thinking',
      difficulty: bandFromWord(r.difficulty),
      sourceTag: r.category || null,
      tenantId,
    }));
  },
  async list(tenantId, { search, limit, skip }) {
    const q: any = { tenantId };
    if (search) q.title = new RegExp(search, 'i');
    const [rows, total] = await Promise.all([
      ThinkingProblem.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean() as any,
      ThinkingProblem.countDocuments(q),
    ]);
    return {
      items: rows.map((r: any) => ({
        sourceType: 'thinking_problem' as const,
        sourceId: String(r._id),
        text: trim(r.title),
        itemType: 'thinking',
        difficulty: bandFromWord(r.difficulty),
        sourceTag: r.category || null,
        tenantId,
      })),
      total,
    };
  },
};

export const SOURCE_ADAPTERS: Record<EvidenceSourceType, SourceAdapter> = {
  assessment_item: assessmentItemAdapter,
  passport_question: passportQuestionAdapter,
  question: questionAdapter,
  thinking_problem: thinkingProblemAdapter,
};

export const adapterFor = (t: string): SourceAdapter | null =>
  (SOURCE_ADAPTERS as any)[t] || null;

/**
 * Load many items across many source types — one batched query per type, never per item.
 *
 * A later generator asking for evidence across twenty skills will touch at most four
 * content collections regardless, which is the difference between this being usable at
 * scale and being a fan-out.
 */
export async function loadItems(
  tenantId: string,
  refs: { sourceType: string; sourceId: string }[],
): Promise<Map<string, NormalisedItem>> {
  const byType = new Map<string, string[]>();
  for (const r of refs) {
    if (!adapterFor(r.sourceType)) continue;
    const list = byType.get(r.sourceType) || [];
    list.push(r.sourceId);
    byType.set(r.sourceType, list);
  }

  const out = new Map<string, NormalisedItem>();
  await Promise.all([...byType.entries()].map(async ([type, ids]) => {
    const items = await adapterFor(type)!.loadMany(tenantId, [...new Set(ids)]).catch(() => []);
    for (const i of items) out.set(`${i.sourceType}:${i.sourceId}`, i);
  }));
  return out;
}

export const refKey = (sourceType: string, sourceId: string): string => `${sourceType}:${sourceId}`;
