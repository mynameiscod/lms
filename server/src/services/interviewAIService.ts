import Anthropic from '@anthropic-ai/sdk';

/**
 * Interview AI brain — the real LLM layer behind the structured Interview Module.
 *
 * Two responsibilities:
 *   1. evaluateAnswer()   — score an open (text/voice/code) answer against the
 *      question's expected points + rubric, returning per-criterion category
 *      scores that match the InterviewAttempt schema.
 *   2. summarizeAttempt() — turn a finished attempt into an overall verdict
 *      (feedback, strengths, weaknesses, practice areas, readiness level).
 *   3. generateQuestions()— author question-bank items (open or MCQ) for a topic,
 *      reused by admin "AI-generate" authoring and the public funnel later.
 *
 * Every function is best-effort: if ANTHROPIC_API_KEY is missing or a call
 * fails/parses badly, it returns null so the caller can fall back to the
 * existing deterministic logic. Mirrors the pattern in
 * assessmentQuestionGeneratorService.ts.
 */

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const MODEL = process.env.INTERVIEW_AI_MODEL || 'claude-sonnet-4-6';

export const isInterviewAIEnabled = () => !!client;

// Category keys per section — MUST match InterviewAttempt.{communication,hr,technical}Scores
export const CATEGORY_KEYS: Record<string, string[]> = {
  communication: ['confidence', 'fluency', 'clarity', 'vocabulary', 'structure', 'grammar', 'listeningAbility'],
  hr:            ['relevance', 'maturity', 'attitude', 'ownership', 'honesty', 'situationalThinking'],
  technical:     ['correctness', 'depth', 'logicalThinking', 'structuredExplanation', 'debuggingAbility', 'practicalUnderstanding'],
};

// ─── Shared Claude call (returns parsed JSON, or null) ───────────────────────

async function callClaudeJSON(system: string, user: string, maxTokens = 1500): Promise<any | null> {
  if (!client) return null;
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const text = resp.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

const clamp = (n: any, lo: number, hi: number, dflt = 0): number => {
  const v = Number(n);
  if (!isFinite(v)) return dflt;
  return Math.max(lo, Math.min(hi, v));
};
const strArr = (a: any): string[] => (Array.isArray(a) ? a.map((x) => String(x)).filter(Boolean).slice(0, 8) : []);

// ─── 1. Evaluate one open answer ─────────────────────────────────────────────

export interface AIEvalInput {
  questionText: string;
  questionType?: string;
  sectionType: 'communication' | 'hr' | 'technical';
  answer: string;
  maxScore: number;
  expectedAnswerPoints?: string[];
  sampleStrongAnswer?: string;
  evaluationRubric?: { criterionName: string; maxScore: number }[];
  keywordsForMatching?: string[];
  codeLanguage?: string;
}

export interface AIEvalResult {
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  missedPoints: string[];
  keywordsCovered: string[];
  keywordsMissed: string[];
  categoryScores: Record<string, number>;
}

export async function evaluateAnswer(input: AIEvalInput): Promise<AIEvalResult | null> {
  if (!client) return null;

  const answer = (input.answer || '').trim();
  if (!answer) return null; // nothing to grade — let caller handle (skip/zero)

  const catKeys = CATEGORY_KEYS[input.sectionType] || CATEGORY_KEYS.technical;
  const expected = (input.expectedAnswerPoints || []).filter(Boolean);
  const keywords = (input.keywordsForMatching || []).filter(Boolean);
  const rubric = (input.evaluationRubric || []).map((r) => r.criterionName).filter(Boolean);

  const system =
    'You are a strict but fair senior interviewer. You evaluate a candidate\'s spoken/typed answer ' +
    'objectively against the expected points and award partial credit. Output ONLY raw JSON, no markdown.';

  const user = [
    `Section type: ${input.sectionType}.`,
    input.questionType ? `Question type: ${input.questionType}.` : '',
    input.codeLanguage ? `Programming language: ${input.codeLanguage}.` : '',
    `QUESTION:\n${input.questionText}`,
    expected.length ? `EXPECTED KEY POINTS (ideal answer should touch these):\n- ${expected.join('\n- ')}` : '',
    input.sampleStrongAnswer ? `SAMPLE STRONG ANSWER (reference):\n${input.sampleStrongAnswer}` : '',
    rubric.length ? `RUBRIC CRITERIA: ${rubric.join(', ')}.` : '',
    `CANDIDATE ANSWER:\n${answer}`,
    '',
    `Score the answer from 0 to ${input.maxScore} (decimals allowed). Be realistic: a vague or off-topic answer scores low; a thorough, correct answer scores high.`,
    `Also rate these sub-skills from 0 to 10 each: ${catKeys.join(', ')}.`,
    'Return ONLY this JSON object:',
    `{"score": <0-${input.maxScore}>, "feedback": "<2-3 sentence constructive feedback addressed to the candidate>", "strengths": ["..."], "weaknesses": ["..."], "missedPoints": ["expected points the answer failed to cover"], "keywordsCovered": ["..."], "keywordsMissed": ["..."], "categoryScores": {${catKeys.map((k) => `"${k}": <0-10>`).join(', ')}}}`,
  ].filter(Boolean).join('\n');

  const raw = await callClaudeJSON(system, user, 1200);
  if (!raw || typeof raw !== 'object') return null;

  const categoryScores: Record<string, number> = {};
  for (const k of catKeys) categoryScores[k] = clamp(raw.categoryScores?.[k], 0, 10, 0);

  return {
    score: Math.round(clamp(raw.score, 0, input.maxScore, 0) * 10) / 10,
    feedback: String(raw.feedback || '').slice(0, 1200),
    strengths: strArr(raw.strengths),
    weaknesses: strArr(raw.weaknesses),
    missedPoints: strArr(raw.missedPoints).length ? strArr(raw.missedPoints) : keywords.filter((k) => !answer.toLowerCase().includes(k.toLowerCase())).slice(0, 5),
    keywordsCovered: strArr(raw.keywordsCovered),
    keywordsMissed: strArr(raw.keywordsMissed),
    categoryScores,
  };
}

// ─── 2. Summarize a finished attempt ─────────────────────────────────────────

export interface AISummarySection {
  sectionTitle: string;
  sectionType: string;
  percentage: number;
  passed: boolean;
  status: string;
  notableFeedback?: string[];
}

export interface AISummaryResult {
  overallFeedback: string;
  topStrengths: string[];
  topWeaknesses: string[];
  recommendedPracticeAreas: string[];
  readinessLevel: 'not_ready' | 'needs_improvement' | 'almost_ready' | 'interview_ready';
}

const READINESS = new Set(['not_ready', 'needs_improvement', 'almost_ready', 'interview_ready']);

export async function summarizeAttempt(input: {
  overallPercentage: number;
  sections: AISummarySection[];
}): Promise<AISummaryResult | null> {
  if (!client) return null;

  const sectionLines = input.sections.map((s) =>
    `- ${s.sectionTitle} [${s.sectionType}]: ${s.percentage}% (${s.passed ? 'passed' : 'not passed'}, ${s.status})` +
    (s.notableFeedback?.length ? ` — notes: ${s.notableFeedback.slice(0, 2).join('; ')}` : '')
  ).join('\n');

  const system =
    'You are a career coach summarizing a mock interview for a candidate. Be specific, encouraging, ' +
    'and actionable. Output ONLY raw JSON, no markdown.';

  const user = [
    `Overall score: ${input.overallPercentage}%.`,
    `Section results:\n${sectionLines}`,
    '',
    'Write an overall verdict. Return ONLY this JSON object:',
    '{"overallFeedback": "<3-4 sentence summary addressed to the candidate>", "topStrengths": ["..."], "topWeaknesses": ["..."], "recommendedPracticeAreas": ["concrete topics/skills to practice"], "readinessLevel": "not_ready|needs_improvement|almost_ready|interview_ready"}',
  ].join('\n');

  const raw = await callClaudeJSON(system, user, 900);
  if (!raw || typeof raw !== 'object') return null;

  const readiness = String(raw.readinessLevel || '').trim();
  return {
    overallFeedback: String(raw.overallFeedback || '').slice(0, 1500),
    topStrengths: strArr(raw.topStrengths),
    topWeaknesses: strArr(raw.topWeaknesses),
    recommendedPracticeAreas: strArr(raw.recommendedPracticeAreas),
    readinessLevel: (READINESS.has(readiness) ? readiness : 'needs_improvement') as AISummaryResult['readinessLevel'],
  };
}

// ─── 3. Generate question-bank items ─────────────────────────────────────────

export interface QGenSpec {
  interviewCategory: 'communication' | 'hr' | 'technical';
  topic: string;                       // 'Java', 'Aptitude', 'Logical Reasoning', 'Behavioral'...
  questionType?: string;               // InterviewQuestionBank.questionType
  difficulty: 'easy' | 'medium' | 'hard';
  answerMode: 'text' | 'mcq';
  count: number;
  roleTarget?: string;
  experienceLevel?: string;
  context?: string;                    // e.g. resume/stack flavor
}

/**
 * Returns plain objects shaped like InterviewQuestionBank (NOT persisted —
 * caller adds tenantId/createdBy and inserts). Empty array on failure.
 */
export async function generateQuestions(spec: QGenSpec): Promise<any[]> {
  if (!client || spec.count <= 0) return [];

  const isMCQ = spec.answerMode === 'mcq';
  const schema = isMCQ
    ? `{"questionText","mcqOptions":[{"label":"A","text":"...","isCorrect":true|false} x4 with exactly ONE correct],"questionHint","difficulty":"${spec.difficulty}"}`
    : `{"questionText","expectedAnswerPoints":["3-6 key points a strong answer covers"],"sampleStrongAnswer","weakAnswerIndicators":["phrases signalling a weak answer"],"evaluationRubric":[{"criterionName","maxScore":10}],"keywordsForMatching":["..."],"suggestedTimeSeconds":120,"difficulty":"${spec.difficulty}"}`;

  const system =
    'You are an expert interviewer building a reusable interview question bank. ' +
    'Questions must be clear, unambiguous, and realistic for a real interview. Output ONLY a raw JSON array.';

  const user = [
    `Generate ${spec.count} interview question(s).`,
    `Category: ${spec.interviewCategory}. Topic: ${spec.topic}. Difficulty: ${spec.difficulty}.`,
    spec.questionType ? `Question style: ${spec.questionType}.` : '',
    spec.roleTarget ? `Target role: ${spec.roleTarget}.` : '',
    spec.experienceLevel ? `Experience level: ${spec.experienceLevel}.` : '',
    spec.context ? `Tailor to: ${spec.context}.` : '',
    isMCQ
      ? 'These are auto-graded multiple-choice questions (aptitude/logical/technical). Each needs exactly 4 options and exactly one correct answer.'
      : 'These are open-ended questions the candidate answers by speaking or typing; an AI grades them against the expected points.',
    `Return ONLY a raw JSON array. Each element matches: ${schema}.`,
  ].filter(Boolean).join('\n');

  const arr = await callClaudeJSON(system, user, 3000);
  const items = Array.isArray(arr) ? arr : arr ? [arr] : [];
  const out: any[] = [];

  for (const raw of items.slice(0, spec.count + 2)) {
    const questionText = String(raw?.questionText || '').trim();
    if (!questionText) continue;

    const base: any = {
      interviewCategory: spec.interviewCategory,
      questionType: spec.questionType || (isMCQ ? 'technical' : spec.interviewCategory === 'technical' ? 'technical' : 'behavioral'),
      topic: spec.topic,
      difficulty: spec.difficulty,
      roleTarget: spec.roleTarget,
      experienceLevel: spec.experienceLevel || 'any',
      tags: ['ai-generated'],
      questionText,
      questionHint: raw.questionHint ? String(raw.questionHint) : undefined,
      answerMode: spec.answerMode,
      maxScore: 10,
      suggestedTimeSeconds: clamp(raw.suggestedTimeSeconds, 30, 600, isMCQ ? 60 : 120),
      isActive: true,
    };

    if (isMCQ) {
      const opts = Array.isArray(raw.mcqOptions) ? raw.mcqOptions : [];
      const mapped = opts
        .map((o: any, i: number) => ({
          label: String(o.label || String.fromCharCode(65 + i)),
          text: String(o.text || '').trim(),
          isCorrect: !!o.isCorrect,
        }))
        .filter((o: any) => o.text);
      if (mapped.length < 2 || mapped.filter((o: any) => o.isCorrect).length !== 1) continue; // unusable MCQ
      base.mcqOptions = mapped;
    } else {
      base.expectedAnswerPoints = strArr(raw.expectedAnswerPoints);
      base.sampleStrongAnswer = raw.sampleStrongAnswer ? String(raw.sampleStrongAnswer) : undefined;
      base.weakAnswerIndicators = strArr(raw.weakAnswerIndicators);
      base.keywordsForMatching = strArr(raw.keywordsForMatching);
      base.evaluationRubric = Array.isArray(raw.evaluationRubric)
        ? raw.evaluationRubric.map((r: any) => ({ criterionName: String(r.criterionName || 'Quality'), maxScore: clamp(r.maxScore, 1, 100, 10) }))
        : [];
    }

    out.push(base);
    if (out.length >= spec.count) break;
  }

  return out;
}

export default { isInterviewAIEnabled, evaluateAnswer, summarizeAttempt, generateQuestions, CATEGORY_KEYS };
