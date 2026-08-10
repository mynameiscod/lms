import { aiComplete } from './aiGateway';
import {
  QuestionTaxonomy, Company, CompanyQuestion, IQuestionTaxonomy,
} from '../models/CompanyQuestionModels';

/** The taxonomy for a tenant, created with defaults on first use. */
export async function getTaxonomy(tenantId: string): Promise<IQuestionTaxonomy> {
  const existing = await QuestionTaxonomy.findOne({ tenantId });
  if (existing) return existing;
  return QuestionTaxonomy.create({ tenantId });
}

export const slugify = (s: string): string =>
  String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/**
 * Keep `questionCount` honest.
 *
 * It exists so the company grid does not run an aggregate per company on every page load,
 * and a denormalised counter is only worth having if it is recomputed rather than
 * incremented — an increment drifts the first time a question is deleted, bulk-imported
 * or rejected, and a wrong count is worse than a slow one.
 */
export async function refreshQuestionCount(tenantId: string, companyId: any): Promise<void> {
  const n = await CompanyQuestion.countDocuments({ tenantId, companyId, status: 'published' });
  await Company.updateOne({ _id: companyId, tenantId }, { $set: { questionCount: n } });
}

export interface ParsedQuestion {
  questionText: string;
  round?: string;
  category?: string;
  difficulty?: string;
  role?: string;
  year?: number;
  answer?: string;
  tags?: string[];
}

/**
 * Turn a messy paste into structured rows.
 *
 * What a trainer actually has is a WhatsApp message or a page of notes — "TCS NQT 2025,
 * they asked about joins, then a DSA question on arrays, then why TCS" — not a CSV.
 * Retyping that into a form is the reason a question bank never gets filled, so the model
 * does the structuring and the admin reviews a table.
 *
 * The model is told to SPLIT and CLASSIFY, never to invent. Anything it adds here would be
 * a fabricated interview question attributed to a real company.
 */
export async function structureQuestions(opts: {
  tenantId: string;
  raw: string;
  companyName: string;
  rounds: { key: string; label: string }[];
  categories: { key: string; label: string }[];
  difficulties: { key: string; label: string }[];
}): Promise<ParsedQuestion[]> {
  const system = [
    'You convert rough notes about a company interview into structured rows.',
    '',
    'CRITICAL: split and classify what is written. NEVER invent a question that is not in',
    'the notes, never expand one question into several, and never add questions you think',
    'are likely. These are published as questions a real company actually asked — anything',
    'you make up becomes a false claim about a named employer.',
    '',
    'EQUALLY IMPORTANT: extract EVERY question in the notes, including the short ones.',
    'A sentence listing several ("asked why TCS and whether I can relocate") contains TWO',
    'questions and must produce two rows. Brief questions like "why this company", "tell me',
    'about yourself" or "any questions for us" are real interview questions and are exactly',
    'the ones most often dropped — do not skip them for being short.',
    '',
    'Return ONLY a JSON array. Each element:',
    '{"questionText":"...","round":"<key>","category":"<key>","difficulty":"<key>","role":"","year":null,"answer":"","tags":[]}',
    '',
    `round must be one of: ${opts.rounds.map(r => r.key).join(', ')}`,
    `category must be one of: ${opts.categories.map(c => c.key).join(', ')}`,
    `difficulty must be one of: ${opts.difficulties.map(d => d.key).join(', ')}`,
    'If the notes do not say, choose the most likely value from the lists — that is a',
    'classification, not an invention. Leave answer empty unless the notes contain one.',
  ].join('\n');

  const raw = await aiComplete({
    tenantId: opts.tenantId,
    module: 'company_questions_import',
    product: 'careerpilot',
    system,
    user: `Company: ${opts.companyName}\n\nNotes:\n${opts.raw.slice(0, 12000)}`,
    maxTokens: 3000,
  });

  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('Could not read any questions from that text.');

  let arr: any[];
  try { arr = JSON.parse(cleaned.slice(start, end + 1)); }
  catch { throw new Error('The AI returned something unreadable — try a smaller paste.'); }

  const roundKeys = new Set(opts.rounds.map(r => r.key));
  const catKeys = new Set(opts.categories.map(c => c.key));
  const diffKeys = new Set(opts.difficulties.map(d => d.key));

  return arr
    .map((q: any): ParsedQuestion => ({
      questionText: String(q.questionText || '').trim().slice(0, 4000),
      // Fall back rather than reject: a row with an odd round is still a real question,
      // and the admin is about to review every one of them anyway.
      round: roundKeys.has(q.round) ? q.round : (opts.rounds[0]?.key || 'technical'),
      category: catKeys.has(q.category) ? q.category : '',
      difficulty: diffKeys.has(q.difficulty) ? q.difficulty : 'medium',
      role: String(q.role || '').trim().slice(0, 80),
      year: Number.isFinite(Number(q.year)) && Number(q.year) > 2000 ? Number(q.year) : undefined,
      answer: String(q.answer || '').trim().slice(0, 4000),
      tags: Array.isArray(q.tags) ? q.tags.map((t: any) => String(t).toLowerCase().trim().slice(0, 24)).filter(Boolean).slice(0, 5) : [],
    }))
    .filter(q => q.questionText.length > 8)
    .slice(0, 200);
}

/**
 * Ask the model for questions a company is LIKELY to ask.
 *
 * Every row this produces is flagged aiPredicted and must stay labelled all the way to the
 * member's screen. It is a study aid, not a record of what anyone was asked, and the two
 * must never look the same.
 */
export async function predictQuestions(opts: {
  tenantId: string;
  companyName: string;
  companyType: string;
  role: string;
  round: string;
  roundLabel: string;
  count: number;
  categories: { key: string; label: string }[];
}): Promise<ParsedQuestion[]> {
  const system = [
    `You suggest interview questions a candidate should PREPARE for a ${opts.roundLabel} round`,
    `at a ${opts.companyType} company, for a ${opts.role || 'fresher engineering'} role.`,
    '',
    'These are predictions for study, and will be shown to students labelled as such. Do',
    'not claim or imply any specific company asked them. Aim at the level a recent',
    'graduate in India would actually face.',
    '',
    'Return ONLY a JSON array of:',
    '{"questionText":"...","category":"<key>","difficulty":"easy|medium|hard","answer":"<2-4 sentence model answer>","tags":[]}',
    `category must be one of: ${opts.categories.map(c => c.key).join(', ')}`,
  ].join('\n');

  const raw = await aiComplete({
    tenantId: opts.tenantId,
    module: 'company_questions_predict',
    product: 'careerpilot',
    system,
    user: `Company: ${opts.companyName} (${opts.companyType}). Round: ${opts.roundLabel}. Produce ${Math.min(20, Math.max(1, opts.count))} questions.`,
    maxTokens: 3000,
  });

  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('The AI did not return any questions.');

  const catKeys = new Set(opts.categories.map(c => c.key));
  let arr: any[];
  try { arr = JSON.parse(cleaned.slice(start, end + 1)); } catch { throw new Error('The AI returned something unreadable.'); }

  return arr
    .map((q: any): ParsedQuestion => ({
      questionText: String(q.questionText || '').trim().slice(0, 4000),
      round: opts.round,
      category: catKeys.has(q.category) ? q.category : '',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      role: opts.role,
      answer: String(q.answer || '').trim().slice(0, 4000),
      tags: Array.isArray(q.tags) ? q.tags.map((t: any) => String(t).toLowerCase().trim().slice(0, 24)).filter(Boolean).slice(0, 5) : [],
    }))
    .filter(q => q.questionText.length > 8);
}
