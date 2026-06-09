import Anthropic from '@anthropic-ai/sdk';
import AssessmentSubmission, { IAssessmentSubmission } from '../models/AssessmentSubmission';
import { DEFAULT_BLUEPRINTS } from './assessmentBlueprintService';
import { ensureBankCoverage } from './assessmentQuestionGeneratorService';
import {
  ASSESSMENT_DIMENSIONS,
  ASSESSMENT_ITEM_TYPES,
  AssessmentDimension,
  AssessmentItemType,
} from '../constants/assessment';

/**
 * AI Exam Designer — reads a candidate's profile + resume and designs a
 * per-person assessment blueprint (which dimensions, difficulty, and question
 * mix). This is what makes a fresher's exam different from a 15-year veteran's
 * (no system design for freshers; no aptitude for seniors).
 *
 * Claude DESIGNS the blueprint; a deterministic per-segment default is the
 * fallback, so a candidate always gets a sensible exam. The questions
 * themselves come from the bank / AI generator (Phase 3).
 */

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const MODEL = process.env.ASSESSMENT_DESIGN_MODEL || 'claude-sonnet-4-6';

const DIM_SET = new Set<string>(ASSESSMENT_DIMENSIONS as unknown as string[]);
const TYPE_SET = new Set<string>(ASSESSMENT_ITEM_TYPES as unknown as string[]);

const SYSTEM_PROMPT = `You design adaptive coding-assessment blueprints. You do NOT write questions.
Given a candidate profile, output a blueprint tuned to their level and goals.

Hard rules:
- Allowed dimensions: aptitude, fundamentals, dsa, core_stack, problem_solving, system_design.
- Allowed item types: mcq, predict_output, debug, complete_code, live_code, sql.
- Freshers / 1st–2nd year: emphasize aptitude + fundamentals; basic dsa; NO system_design.
- Final year / graduates: fundamentals + dsa + core_stack + problem_solving; little/no aptitude.
- Professionals 3–7 yrs: dsa + core_stack + problem_solving + light system_design; NO aptitude.
- Professionals 8+ yrs: system_design + core_stack + dsa + problem_solving; NO aptitude, NO basic fundamentals.
- Difficulty 1–5 scales with seniority. 2 stages, the 2nd harder than the 1st.
- Bias item types toward the candidate's primary language where relevant.

Return ONLY raw JSON (no markdown) with this exact schema:
{
  "title": "string",
  "timeLimitMinutes": number,
  "dimensions": [{"dimension": "<allowed>", "weight": number}],
  "stages": [
    {"order": 1, "label": "string", "difficultyBand": [min,max], "adaptive": true,
     "mix": [{"type": "<allowed>", "dimension": "<allowed>", "count": number}]}
  ]
}`;

function buildProfile(s: IAssessmentSubmission): string {
  const c = s.candidate;
  return [
    `Segment: ${c.segment}`,
    c.year ? `Year: ${c.year}` : '',
    c.yearsExperience != null ? `Experience: ${c.yearsExperience} years` : '',
    c.primaryLanguage ? `Primary language: ${c.primaryLanguage}` : '',
    c.currentStack?.length ? `Stack: ${c.currentStack.join(', ')}` : '',
    s.parsedSkills?.length ? `Resume skills: ${s.parsedSkills.slice(0, 30).join(', ')}` : '',
    s.resumeText ? `Resume excerpt: ${s.resumeText.slice(0, 1500)}` : '',
  ].filter(Boolean).join('\n');
}

/** Validate + coerce an AI blueprint; return null if unusable. */
function sanitizeBlueprint(bp: any): any | null {
  if (!bp || !Array.isArray(bp.stages) || !bp.stages.length) return null;
  const dimensions = (Array.isArray(bp.dimensions) ? bp.dimensions : [])
    .filter((d: any) => DIM_SET.has(d?.dimension))
    .map((d: any) => ({ dimension: d.dimension as AssessmentDimension, weight: Number(d.weight) || 1 }));
  if (!dimensions.length) return null;

  const stages = bp.stages
    .map((st: any, i: number) => {
      const band = Array.isArray(st.difficultyBand) && st.difficultyBand.length === 2
        ? [Math.max(1, Math.min(5, Number(st.difficultyBand[0]) || 1)), Math.max(1, Math.min(5, Number(st.difficultyBand[1]) || 3))]
        : [2, 3];
      const mix = (Array.isArray(st.mix) ? st.mix : [])
        .filter((m: any) => TYPE_SET.has(m?.type) && DIM_SET.has(m?.dimension))
        .map((m: any) => ({ type: m.type as AssessmentItemType, dimension: m.dimension as AssessmentDimension, count: Math.max(1, Math.min(6, Number(m.count) || 1)) }));
      return { order: i + 1, label: String(st.label || `Stage ${i + 1}`), difficultyBand: band as [number, number], adaptive: i === 0, mix };
    })
    .filter((st: any) => st.mix.length);

  if (!stages.length) return null;
  return {
    title: String(bp.title || 'Personalized Assessment'),
    timeLimitMinutes: Math.max(10, Math.min(45, Number(bp.timeLimitMinutes) || 25)),
    dimensions,
    stages,
  };
}

/**
 * Design (and persist) the exam blueprint for a submission. Best-effort; on any
 * failure it stores the per-segment default so the exam still works.
 */
export async function designExamForSubmission(submissionId: string): Promise<void> {
  const submission = await AssessmentSubmission.findById(submissionId);
  if (!submission || submission.designedBlueprint) return; // already designed or gone

  await AssessmentSubmission.updateOne({ _id: submissionId }, { $set: { examDesignStatus: 'pending' } });

  const def = DEFAULT_BLUEPRINTS[submission.candidate.segment];
  let designed: any = null;

  if (client) {
    try {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 1100,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Candidate profile:\n${buildProfile(submission)}\n\nReturn the blueprint JSON.` }],
      });
      const text = resp.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
      designed = sanitizeBlueprint(JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim()));
    } catch { /* fall through to default */ }
  }

  const blueprint = designed || { title: def.title, timeLimitMinutes: def.timeLimitMinutes, dimensions: def.dimensions, stages: def.stages };
  await AssessmentSubmission.updateOne(
    { _id: submissionId },
    { $set: { designedBlueprint: blueprint, examDesignStatus: designed ? 'ready' : 'failed' } }
  );

  // Warm the question bank for this blueprint in the background (AI-generates +
  // validates any missing items). Doesn't block exam start — gaps are covered by
  // the resilient sampler and benefit the next candidate too.
  const ctx = [submission.candidate.primaryLanguage && `primary language ${submission.candidate.primaryLanguage}`, submission.parsedSkills?.length && `skills: ${submission.parsedSkills.slice(0, 10).join(', ')}`].filter(Boolean).join('; ');
  ensureBankCoverage(submission.tenantId, blueprint, { language: submission.candidate.primaryLanguage, context: ctx || undefined }).catch(() => { /* best-effort */ });
}
