import { CompanyQuestion, CompanyMockConfig, QuestionTaxonomy } from '../models/CompanyQuestionModels';
import { aiComplete } from './aiGateway';

/**
 * Assemble a company's mock test.
 *
 * The company bank holds INTERVIEW questions — prose, no options — because that is what a
 * student remembers being asked. An online assessment needs answerable items, so the two
 * are not the same thing and pretending otherwise would produce a test nobody can sit.
 *
 * So the bank is used for what it is genuinely good at: deciding what the test is ABOUT.
 * Its topics, difficulty mix and phrasing seed the paper; the answerable MCQs are written
 * against that seed. Where a banked question already carries options — an admin can add
 * them — it is used verbatim in preference to anything generated.
 *
 * Papers are assembled per attempt rather than stored, so the test improves as the bank
 * does and two students never get an identical paper to pass between them.
 */

export interface MockQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: string;
  /** True when this item was written by the model rather than taken from the bank. */
  generated: boolean;
  explanation?: string;
}

export interface MockSection {
  name: string;
  category: string;
  durationMins: number;
  questions: MockQuestion[];
}

export const DEFAULT_SECTIONS = [
  { name: 'Aptitude', category: 'quantitative', questionCount: 10, durationMins: 15, difficulty: '' },
  { name: 'Technical', category: 'dsa', questionCount: 10, durationMins: 20, difficulty: '' },
];

const SYSTEM = `You write multiple-choice questions for an Indian campus online assessment.

Return ONLY a JSON array:
[{"text":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"one line on why"}]

RULES:
- Exactly 4 options, exactly one correct, and correctIndex must point at it.
- Pitch at a final-year engineering student sitting a company OA.
- Distractors must be plausible — wrong for a reason a student would actually fall for,
  not obviously silly. A question everyone gets right measures nothing.
- Self-contained: no "as discussed above", no reference to other questions.
- No trick questions and no ambiguity. Exactly one option must be defensible as correct.`;

/** Ask the model for items on the topics the company's own bank actually covers. */
async function generate(opts: {
  tenantId: string; companyName: string; topic: string; difficulty: string;
  count: number; seedQuestions: string[];
  /** Whose test this is being generated for — see AiUsage.studentId. */
  studentId?: string;
}): Promise<MockQuestion[]> {
  if (opts.count <= 0) return [];

  const raw = await aiComplete({
    tenantId: opts.tenantId,
    studentId: opts.studentId,
    module: 'mock_test_generate',
    product: 'careerpilot',
    system: SYSTEM,
    user: [
      `Company: ${opts.companyName}. Topic: ${opts.topic}. Difficulty: ${opts.difficulty || 'mixed'}.`,
      `Write ${opts.count} questions.`,
      opts.seedQuestions.length
        ? `For flavour, these are real questions this company has asked — match their level and subject matter, but do NOT reproduce them:\n${opts.seedQuestions.slice(0, 8).map(q => `- ${q}`).join('\n')}`
        : '',
    ].filter(Boolean).join('\n'),
    maxTokens: 2600,
  });

  const cleaned = raw.replace(/```json|```/g, '').trim();
  const a = cleaned.indexOf('[');
  const b = cleaned.lastIndexOf(']');
  if (a < 0 || b <= a) return [];

  let arr: any[];
  try { arr = JSON.parse(cleaned.slice(a, b + 1)); } catch { return []; }

  return arr
    .map((q: any, i: number): MockQuestion => ({
      id: `gen-${opts.topic}-${i}-${Date.now()}`,
      text: String(q.text || '').trim().slice(0, 1200),
      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o).slice(0, 300)) : [],
      correctIndex: Number(q.correctIndex),
      category: opts.topic,
      difficulty: opts.difficulty || 'medium',
      generated: true,
      explanation: String(q.explanation || '').slice(0, 400),
    }))
    // A malformed item is dropped rather than shown: a question with three options or an
    // out-of-range answer is unmarkable, and one bad row would make the whole score wrong.
    .filter(q => q.text.length > 8 && q.options.length === 4
      && Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4);
}

export async function assembleTest(opts: {
  tenantId: string; companySlug: string; companyName: string;
  /** Whose test this is, carried through so AI spend is attributable to a member. */
  studentId?: string;
}): Promise<{ sections: MockSection[]; generatedCount: number; bankedCount: number; passingPct: number }> {
  const [cfg, tax] = await Promise.all([
    CompanyMockConfig.findOne({ tenantId: opts.tenantId, companySlug: opts.companySlug }).lean() as any,
    QuestionTaxonomy.findOne({ tenantId: opts.tenantId }).lean() as any,
  ]);
  const sectionDefs = cfg?.sections?.length ? cfg.sections : DEFAULT_SECTIONS;
  const aiTopUp = cfg?.aiTopUp !== false;
  const catLabel = (k: string) => tax?.categories?.find((c: any) => c.key === k)?.label || k;

  const sections: MockSection[] = [];
  let generatedCount = 0;
  let bankedCount = 0;

  for (const def of sectionDefs) {
    const pool = await CompanyQuestion.find({
      tenantId: opts.tenantId, companySlug: opts.companySlug,
      status: 'published', ...(def.category ? { category: def.category } : {}),
    }).select('questionText options correctIndex category difficulty').lean() as any[];

    /**
     * Anything already answerable is used as-is; nothing beats a real item.
     *
     * The bar is "can this be marked": at least two choices and a key that indexes one of
     * them. It used to demand EXACTLY four, which quietly excluded every true/false and
     * three-option item an admin had banked — and, while the model declared no `options`
     * field at all, excluded the entire bank.
     */
    const banked: MockQuestion[] = pool
      .filter(q => Array.isArray(q.options) && q.options.length >= 2
        && Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.options.length)
      .slice(0, def.questionCount)
      .map(q => ({
        id: String(q._id), text: q.questionText, options: q.options,
        correctIndex: q.correctIndex, category: q.category, difficulty: q.difficulty,
        generated: false,
      }));
    bankedCount += banked.length;

    const short = def.questionCount - banked.length;
    let made: MockQuestion[] = [];
    if (short > 0 && aiTopUp) {
      made = await generate({
        tenantId: opts.tenantId, studentId: opts.studentId, companyName: opts.companyName,
        topic: def.category || 'general', difficulty: def.difficulty || '',
        count: short,
        // The bank steers the subject matter even when it cannot supply the items.
        seedQuestions: pool.map(q => q.questionText).slice(0, 8),
      });
      generatedCount += made.length;
    }

    sections.push({
      name: def.name || catLabel(def.category),
      category: def.category,
      durationMins: def.durationMins || 15,
      questions: [...banked, ...made],
    });
  }

  return {
    sections: sections.filter(s => s.questions.length),
    generatedCount,
    bankedCount,
    passingPct: cfg?.passingPct ?? 60,
  };
}
