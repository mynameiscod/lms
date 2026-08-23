import crypto from 'crypto';
import SkillQuestionDraft, { ISkillQuestionDraft, IDraftOption } from '../models/SkillQuestionDraft';
import Question from '../models/Question';
import SkillEvidence from '../models/SkillEvidence';
import CareerSkill from '../models/CareerSkill';
import { aiComplete } from './aiGateway';

/**
 * AI DRAFTS. A PERSON APPROVES. ONLY THEN DOES IT BECOME A QUESTION.
 *
 * The constraint this exists to fix is supply: the pilot papers draw 16-20 questions from a
 * pool of 44 hand-authored items, so a member who retakes sees most of the bank again and
 * the difficulty mix has almost no room to move. Authoring by hand is the bottleneck.
 *
 * WHAT AI IS AND IS NOT ALLOWED TO DO HERE.
 *
 * It drafts, offline, in batches. It is never called while a student is sitting a paper.
 * That line is not caution for its own sake — the whole value of Skill DNA is that two
 * members at the same stage sit papers of the same shape, so their scores mean the same
 * thing. Generating per student would destroy exactly that, and would also mean grading
 * against an answer key no one has ever read.
 *
 * WHAT THE MACHINE CHECKS BEFORE A HUMAN LOOKS.
 *
 * Reviewing is the real bottleneck, not generating, so anything a machine can decide should
 * not cost a reviewer's attention. Malformed items are dropped outright and never reach the
 * queue. Items that are merely SUSPECT are kept and flagged, because the reviewer is better
 * placed to judge them and a silent drop hides a systematic problem with a prompt.
 *
 * The checks target how language models actually fail at multiple choice, which is not
 * usually the stem — it is the distractors. A model writes one carefully-worded correct
 * answer and three throwaways, and the result is a question every student gets right, which
 * measures nothing and quietly compresses the whole cohort's score distribution.
 */

/** Bump when the prompt changes, so a bad batch can be found by what produced it. */
export const PROMPT_VERSION = 1;

const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// ── Prompt ──────────────────────────────────────────────────────────────────

function systemPrompt(): string {
  return [
    'You write multiple-choice questions that measure a named technical skill for an',
    'assessment used to place students on a learning path. Your questions are reviewed by a',
    'human before any student sees them.',
    '',
    'The hard part is the WRONG answers, not the right one. Each wrong option must be the',
    'answer a student would give if they held one specific, common misunderstanding. State',
    'that misunderstanding for each. An option nobody would ever pick is wasted — it makes',
    'the question look harder while making it easier, and the result measures nothing.',
    '',
    'Rules:',
    '- Exactly ONE option is correct.',
    '- 4 options. All roughly the same length — never make the correct one the longest or',
    '  the most qualified, which gives it away without any knowledge of the subject.',
    '- Never use "All of the above", "None of the above", or "Both A and B".',
    '- Test understanding, not recall of trivia or version numbers.',
    '- The explanation says why the right answer is right AND why the tempting wrong one is',
    '  wrong. One short paragraph.',
    '- If the question needs code, put it in codeSnippet, not in the question text, and set',
    '  language. Keep it under 20 lines.',
    '- NEVER write "the following code", "the snippet below" or "the output of this program"',
    '  unless codeSnippet actually contains that code. A stem pointing at code that is not',
    '  there is unanswerable, and it will be rejected.',
    '',
    'Reply with JSON only. No prose, no markdown fence. Shape:',
    '{"questions":[{"question":"...","codeSnippet":null,"language":null,',
    '"options":[{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},',
    '{"text":"...","isCorrect":false},{"text":"...","isCorrect":false}],',
    '"explanation":"...","distractorRationale":["why someone picks option 2","...","..."]}]}',
  ].join('\n');
}

function userPrompt(o: {
  skillKey: string; skillName: string; skillDescription?: string;
  difficulty: string; count: number; avoid: string[];
}): string {
  const lines = [
    `Skill: ${o.skillName} (${o.skillKey})`,
    o.skillDescription ? `What it means: ${o.skillDescription}` : '',
    `Difficulty: ${o.difficulty}`,
    `Write ${o.count} questions.`,
  ].filter(Boolean);

  /**
   * The existing bank goes into the prompt so the model can avoid restating it.
   *
   * This is a nudge, not the guarantee — the duplicate check after generation is what
   * actually enforces it. Capped because a long list crowds out the instructions that
   * matter and costs tokens on every call.
   */
  if (o.avoid.length) {
    lines.push('', 'Questions already in the bank for this skill. Do NOT restate these, and',
      'do not write a trivially reworded version of one:');
    for (const q of o.avoid.slice(0, 25)) lines.push(`- ${q.slice(0, 160)}`);
  }
  return lines.join('\n');
}

// ── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Pull the JSON out of whatever came back.
 *
 * Models add a markdown fence or a sentence of preamble often enough that failing on it
 * would throw away good batches. Anything that cannot be read as JSON is a failed call, not
 * a silent empty batch, so the caller can say so.
 */
export function parseDraftResponse(text: string): any[] {
  let raw = String(text || '').trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();
  if (!raw.startsWith('{') && !raw.startsWith('[')) {
    const start = raw.search(/[[{]/);
    if (start >= 0) raw = raw.slice(start);
  }
  const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
  if (end >= 0) raw = raw.slice(0, end + 1);

  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(list)) throw new Error('Response contained no question list');
  return list;
}

// ── The quality gate ────────────────────────────────────────────────────────

export interface CheckResult {
  /** Unusable. Dropped before it costs a reviewer any attention. */
  fatal: string | null;
  /** Usable but suspect. Kept, shown to the reviewer, and counted per batch. */
  warnings: string[];
}

/**
 * Everything a machine can decide about one drafted question.
 *
 * `existing` is the normalised text of what this skill's pool already holds — both approved
 * questions and drafts still in the queue, because two identical drafts in one batch is the
 * common case when a prompt is run twice.
 */
export function checkDraft(d: any, existing: Set<string>): CheckResult {
  const warnings: string[] = [];
  const fail = (m: string): CheckResult => ({ fatal: m, warnings });

  const stem = String(d?.question || '').trim();
  if (!stem) return fail('empty question text');
  if (stem.length < 15) return fail('question text is too short to be a question');

  const opts: IDraftOption[] = Array.isArray(d?.options)
    ? d.options.map((o: any) => ({ text: String(o?.text ?? '').trim(), isCorrect: o?.isCorrect === true }))
    : [];
  if (opts.length < 3) return fail(`only ${opts.length} options`);
  if (opts.length > 6) return fail(`${opts.length} options is too many`);
  if (opts.some(o => !o.text)) return fail('an option is blank');

  const correct = opts.filter(o => o.isCorrect);
  if (correct.length === 0) return fail('no option is marked correct');
  if (correct.length > 1) return fail(`${correct.length} options are marked correct`);

  const seen = new Set<string>();
  for (const o of opts) {
    const k = norm(o.text);
    if (seen.has(k)) return fail('two options say the same thing');
    seen.add(k);
  }

  if (existing.has(norm(stem))) return fail('duplicate of a question already in the pool');

  /**
   * A stem that points at code which is not there.
   *
   * "What will be the output of the following code snippet?" with no snippet is not a hard
   * question, it is an unanswerable one — and a student who guesses is marked wrong for a
   * question that never existed. The model does this readily: asked for a code question it
   * writes the stem and then omits the code, because the stem alone reads complete.
   *
   * Fatal rather than flagged. There is no version of this a reviewer can salvage without
   * writing the code themselves, at which point they have authored the question.
   */
  const refersToCode = /\b(following|below|this|above)\s+(code|snippet|program|function|method|output)\b|\boutput of the\b|\bcode snippet\b/i.test(stem);
  const hasCode = !!String(d?.codeSnippet || '').trim();
  if (refersToCode && !hasCode) return fail('the question refers to code that was not provided');

  // The mirror of the above: code nobody is asked about is noise on the screen.
  if (hasCode && !refersToCode && !/code|snippet|program|output/i.test(stem)) {
    warnings.push('A code snippet is attached but the question does not refer to it.');
  }

  /**
   * The length tell.
   *
   * A model that is being careful writes a fully-qualified correct answer and three casual
   * wrong ones. A student who knows nothing can then score well above chance by picking the
   * longest option — so the question measures test-taking, not the skill. Flagged rather
   * than dropped, because a genuinely long correct answer is sometimes unavoidable.
   */
  const lens = opts.map(o => o.text.length);
  const correctLen = correct[0].text.length;
  const otherMax = Math.max(...opts.filter(o => !o.isCorrect).map(o => o.text.length));
  if (correctLen > otherMax * 1.6 && correctLen - otherMax > 18) {
    warnings.push('The correct option is much longer than the others — a student can guess it without knowing the answer.');
  }
  if (Math.min(...lens) * 3 < Math.max(...lens)) {
    warnings.push('Option lengths are very uneven.');
  }

  for (const o of opts) {
    if (/^(all|none) of the above$|^both [ab] and [ab]$/i.test(o.text.trim())) {
      warnings.push(`Lazy distractor: "${o.text}".`);
    }
  }

  if (!String(d?.explanation || '').trim()) {
    warnings.push('No explanation — a student who gets this wrong learns nothing from it.');
  }
  const rat = Array.isArray(d?.distractorRationale) ? d.distractorRationale.filter(Boolean) : [];
  if (rat.length < opts.length - 1) {
    warnings.push('Not every wrong option has a stated misconception behind it.');
  }

  if (stem.length > 600) warnings.push('Very long question stem.');

  return { fatal: null, warnings };
}

// ── Generation ──────────────────────────────────────────────────────────────

export interface GenerateOpts {
  tenantId: string;
  skillKey: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
  generatedBy: string;
}

export interface GenerateReport {
  batchId: string;
  skillKey: string;
  requested: number;
  returned: number;
  stored: number;
  dropped: { reason: string; question: string }[];
  flagged: number;
}

/** The text already in this skill's pool, so a batch does not restate it. */
async function existingStems(tenantId: string, skillKey: string): Promise<{ set: Set<string>; sample: string[] }> {
  const refs = await SkillEvidence.find({ tenantId, skillKey, sourceType: 'question', active: true })
    .select('sourceId').lean() as any[];
  const ids = refs.map(r => r.sourceId);

  const [approved, pending] = await Promise.all([
    ids.length
      ? Question.find({ _id: { $in: ids } }).select('question').lean() as any
      : Promise.resolve([] as any[]),
    SkillQuestionDraft.find({ tenantId, skillKey, status: 'pending' }).select('question').lean() as any,
  ]);

  const texts = [...approved, ...pending].map((r: any) => String(r.question || '')).filter(Boolean);
  return { set: new Set(texts.map(norm)), sample: texts };
}

export async function generateDrafts(o: GenerateOpts): Promise<GenerateReport> {
  const count = Math.max(1, Math.min(20, Math.round(o.count || 5)));

  const skill: any = await CareerSkill.findOne({ key: o.skillKey }).lean();
  if (!skill) throw new Error(`Unknown skill: ${o.skillKey}`);
  if (skill.assessable === false) throw new Error(`${skill.name} is not marked assessable.`);

  const { set: avoidSet, sample } = await existingStems(o.tenantId, o.skillKey);

  const text = await aiComplete({
    tenantId: o.tenantId,
    module: 'careerpilot_question_drafting',
    product: 'careerpilot',
    system: systemPrompt(),
    user: userPrompt({
      skillKey: skill.key, skillName: skill.name, skillDescription: skill.description,
      difficulty: o.difficulty, count, avoid: sample,
    }),
    // Room for `count` questions with four options, an explanation and rationales each.
    maxTokens: 600 * count + 400,
  });

  const list = parseDraftResponse(text);

  const batchId = crypto.randomBytes(8).toString('hex');
  const report: GenerateReport = {
    batchId, skillKey: o.skillKey, requested: count, returned: list.length,
    stored: 0, dropped: [], flagged: 0,
  };

  // Seeded from the pool, then grown as the batch is walked, so a batch cannot duplicate
  // itself — which is the usual way the same question arrives twice.
  const seen = new Set(avoidSet);

  for (const d of list) {
    const { fatal, warnings } = checkDraft(d, seen);
    if (fatal) {
      report.dropped.push({ reason: fatal, question: String(d?.question || '').slice(0, 120) });
      continue;
    }
    seen.add(norm(String(d.question)));
    if (warnings.length) report.flagged += 1;

    await SkillQuestionDraft.create({
      tenantId: o.tenantId,
      skillKey: o.skillKey,
      difficulty: o.difficulty,
      question: String(d.question).trim(),
      options: d.options.map((x: any) => ({ text: String(x.text).trim(), isCorrect: x.isCorrect === true })),
      explanation: String(d.explanation || '').trim(),
      codeSnippet: d.codeSnippet ? String(d.codeSnippet) : undefined,
      language: d.language ? String(d.language) : undefined,
      distractorRationale: Array.isArray(d.distractorRationale) ? d.distractorRationale.map(String) : [],
      status: 'pending',
      promptVersion: PROMPT_VERSION,
      batchId,
      generatedBy: o.generatedBy,
      warnings,
    });
    report.stored += 1;
  }

  return report;
}

// ── Review ──────────────────────────────────────────────────────────────────

/**
 * Approve one draft: it becomes a real Question AND the SkillEvidence row that puts it in
 * the pool, in that order.
 *
 * Both, or neither that matters. A Question with no evidence row is invisible to CareerPilot
 * — harmless, but it would sit in the LMS bank untagged and confuse a later search. An
 * evidence row pointing at nothing would be worse: the generator would count a slot as
 * fillable and then find nothing there. So the evidence row is written second and its
 * failure rolls the Question back.
 *
 * The reviewer's edits are taken as the truth. They have just read it; the draft is only
 * what the model proposed.
 */
export async function approveDraft(o: {
  tenantId: string;
  draftId: string;
  reviewedBy: string;
  edits?: Partial<Pick<ISkillQuestionDraft, 'question' | 'options' | 'explanation' | 'difficulty' | 'codeSnippet' | 'language'>>;
  note?: string;
}): Promise<{ questionId: string }> {
  const draft: any = await SkillQuestionDraft.findOne({ _id: o.draftId, tenantId: o.tenantId });
  if (!draft) throw new Error('Draft not found');
  if (draft.status !== 'pending') throw new Error(`This draft was already ${draft.status}.`);

  if (o.edits) {
    for (const k of ['question', 'explanation', 'difficulty', 'codeSnippet', 'language'] as const) {
      if (o.edits[k] !== undefined) (draft as any)[k] = o.edits[k];
    }
    if (o.edits.options) draft.options = o.edits.options;
  }

  // Re-checked AFTER the edits, against the live pool. A reviewer can introduce a problem
  // while fixing another, and the check is cheap.
  const { set } = await existingStems(o.tenantId, draft.skillKey);
  set.delete(norm(draft.question));   // its own pending row is not a duplicate of itself
  const { fatal } = checkDraft(draft.toObject(), set);
  if (fatal) throw new Error(`Cannot approve: ${fatal}`);

  const question: any = await Question.create({
    tenantId: o.tenantId,
    createdBy: o.reviewedBy,
    type: 'mcq_single',
    question: draft.question,
    options: draft.options.map((x: any) => ({ text: x.text, isCorrect: x.isCorrect })),
    marks: 1,
    difficultyLevel: draft.difficulty,
    explanation: draft.explanation,
    subject: draft.skillKey,
    // `source: 'ai'` is why this field exists. A question that turns out to be wrong should
    // be traceable to the batch that wrote it without anyone having to remember.
    source: 'ai',
    tags: ['careerpilot-drafted', draft.skillKey, `batch:${draft.batchId}`],
    usageCount: 0,
    ...(draft.codeSnippet ? { description: draft.codeSnippet } : {}),
  });

  try {
    await SkillEvidence.create({
      tenantId: o.tenantId,
      sourceType: 'question',
      sourceId: String(question._id),
      skillKey: draft.skillKey,
      contribution: 'PRIMARY',
      active: true,
      createdBy: o.reviewedBy,
    });
  } catch (err) {
    // Leaving an unmapped question behind would be a slow leak into the LMS bank.
    await Question.deleteOne({ _id: question._id }).catch(() => {});
    throw err;
  }

  draft.status = 'approved';
  draft.reviewedBy = o.reviewedBy;
  draft.reviewedAt = new Date();
  draft.reviewNote = o.note;
  draft.approvedQuestionId = String(question._id);
  await draft.save();

  return { questionId: String(question._id) };
}

export async function rejectDraft(o: {
  tenantId: string; draftId: string; reviewedBy: string; note?: string;
}): Promise<void> {
  const draft: any = await SkillQuestionDraft.findOne({ _id: o.draftId, tenantId: o.tenantId });
  if (!draft) throw new Error('Draft not found');
  if (draft.status !== 'pending') throw new Error(`This draft was already ${draft.status}.`);

  // Kept, not deleted. A rejected draft plus its note is the record of what a prompt gets
  // wrong, and that is the only way to tell whether a prompt change helped.
  draft.status = 'rejected';
  draft.reviewedBy = o.reviewedBy;
  draft.reviewedAt = new Date();
  draft.reviewNote = o.note;
  await draft.save();
}

/**
 * How much of the pool each assessable skill actually has.
 *
 * The number that matters is not the total but the count per skill: a paper draws slots per
 * skill, so five hundred questions concentrated on two skills still produces a repetitive
 * paper. This is what tells an admin where to point the next batch.
 */
export async function poolCoverage(tenantId: string): Promise<{
  skillKey: string; skillName: string; approved: number; pending: number;
}[]> {
  const [skills, evidence, drafts] = await Promise.all([
    CareerSkill.find({ active: true, assessable: true, nodeType: 'SKILL' }).select('key name').lean() as any,
    SkillEvidence.aggregate([
      { $match: { tenantId, active: true } },
      { $group: { _id: '$skillKey', n: { $sum: 1 } } },
    ]),
    SkillQuestionDraft.aggregate([
      { $match: { tenantId, status: 'pending' } },
      { $group: { _id: '$skillKey', n: { $sum: 1 } } },
    ]),
  ]);

  const ev = new Map(evidence.map((r: any) => [r._id, r.n]));
  const dr = new Map(drafts.map((r: any) => [r._id, r.n]));

  return (skills as any[])
    .map(s => ({
      skillKey: s.key,
      skillName: s.name,
      approved: Number(ev.get(s.key) || 0),
      pending: Number(dr.get(s.key) || 0),
    }))
    .sort((a, b) => a.approved - b.approved || a.skillName.localeCompare(b.skillName));
}
