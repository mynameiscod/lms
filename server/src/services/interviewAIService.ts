import { getAnthropic, isAnthropicEnabled } from './aiClients';
import { aiComplete } from './aiGateway';
import * as settings from './settingsService';

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

// Try the configured model first, then resilient fallbacks if the API reports the
// model name is unknown (model ids drift over time). The first one that works is
// cached for the rest of the process. Keys & models resolve live from
// settingsService (UI value → .env fallback), so the Platform Settings UI takes
// effect without a redeploy.
const modelFallbacks = (): string[] =>
  [
    settings.get('INTERVIEW_AI_MODEL'),
    settings.get('ASSESSMENT_GEN_MODEL'),
    'claude-sonnet-4-6',
    'claude-sonnet-4-5',
    'claude-3-7-sonnet-latest',
    'claude-3-5-sonnet-latest',
  ].filter((m, i, a): m is string => !!m && a.indexOf(m) === i);
let workingModel: string | null = null;

// Pricing (USD per 1M tokens) — override from the UI/.env. Defaults ≈ Claude Sonnet.
export type Usage = { inputTokens: number; outputTokens: number };
export const costOf = (u?: Usage | null): number => {
  const priceIn = settings.getNum('INTERVIEW_AI_PRICE_IN', 3) / 1e6;
  const priceOut = settings.getNum('INTERVIEW_AI_PRICE_OUT', 15) / 1e6;
  return u ? +((u.inputTokens * priceIn) + (u.outputTokens * priceOut)).toFixed(6) : 0;
};

export const isInterviewAIEnabled = () => isAnthropicEnabled();

// Category keys per section — MUST match InterviewAttempt.{communication,hr,technical}Scores
export const CATEGORY_KEYS: Record<string, string[]> = {
  communication: ['confidence', 'fluency', 'clarity', 'vocabulary', 'structure', 'grammar', 'listeningAbility'],
  hr:            ['relevance', 'maturity', 'attitude', 'ownership', 'honesty', 'situationalThinking'],
  technical:     ['correctness', 'depth', 'logicalThinking', 'structuredExplanation', 'debuggingAbility', 'practicalUnderstanding'],
};

// ─── Shared Claude call (returns parsed JSON, or null) ───────────────────────

/** Call Claude and return raw text. Throws on API error; tries model fallbacks
 *  only when the error looks like an unknown-model error. */
async function callClaudeText(system: string, user: string, maxTokens = 1500): Promise<{ text: string; usage: Usage }> {
  const client = getAnthropic();
  if (!client) throw new Error('AI is not configured (ANTHROPIC_API_KEY missing).');
  const models = workingModel ? [workingModel] : modelFallbacks();
  let lastErr: any;
  for (const model of models) {
    try {
      const resp = await client.messages.create({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
      workingModel = model;
      const text = resp.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
      const usage: Usage = { inputTokens: resp.usage?.input_tokens || 0, outputTokens: resp.usage?.output_tokens || 0 };
      return { text, usage };
    } catch (e: any) {
      lastErr = e;
      const status = e?.status;
      const isModelIssue = status === 404 || /not_found|model/i.test(e?.message || '');
      if (!isModelIssue) throw e;   // auth / rate-limit / other — don't burn fallbacks
      // otherwise try the next model id
    }
  }
  throw lastErr || new Error('No usable Claude model.');
}

function parseJSONLoose(text: string): any {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); }
  catch {
    const m = cleaned.match(/[[{][\s\S]*[\]}]/);   // first JSON array/object in the text
    if (m) return JSON.parse(m[0]);
    throw new Error('AI did not return valid JSON.');
  }
}

/**
 * Salvage as many complete top-level {…} objects as possible from text that may
 * be a truncated/garbled JSON array (e.g. when the model hit the token limit
 * mid-array). String- and escape-aware brace matching; drops the trailing
 * partial object.
 */
function extractObjects(text: string): any[] {
  const out: any[] = [];
  let i = text.indexOf('{');
  while (i !== -1) {
    let depth = 0, inStr = false, esc = false, end = -1;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = j; break; } }
    }
    if (end === -1) break;                       // last object is truncated → stop
    try { out.push(JSON.parse(text.slice(i, end + 1))); } catch { /* skip */ }
    i = text.indexOf('{', end + 1);
  }
  return out;
}

/** Graceful variant: returns null (+ logs) on any failure. For grading paths that
 *  must never block a submission. */
async function callClaudeJSON(system: string, user: string, maxTokens = 1500): Promise<{ data: any; usage: Usage } | null> {
  if (!isInterviewAIEnabled()) return null;
  try {
    const r = await callClaudeText(system, user, maxTokens);
    return { data: parseJSONLoose(r.text), usage: r.usage };
  } catch (e: any) {
    console.error('[interviewAI] call failed:', e?.status || '', (e?.message || '').slice(0, 200));
    return null;
  }
}

/**
 * JSON call routed through the shared AI gateway.
 *
 * The direct-to-Anthropic path above has no failover and writes nothing to the AiUsage
 * ledger, which is why the mock interview was the ONLY feature to go down when the
 * Anthropic balance ran out, and why its cost has never appeared on the AI Spend screen.
 * The gateway gives it both: OpenAI takes over when Anthropic fails, and every call is
 * priced and attributed.
 *
 * `prefer: 'anthropic'` because interview quality is the product here — OpenAI is the
 * safety net, not the default.
 */
async function gatewayJSON(
  system: string, user: string, maxTokens: number,
  o: { tenantId?: string; module: string; product?: string },
): Promise<any | null> {
  try {
    const text = await aiComplete({
      tenantId: o.tenantId, module: o.module, product: o.product,
      system, user, maxTokens, prefer: 'anthropic',
    });
    return parseJSONLoose(text);
  } catch (e: any) {
    console.error(`[interviewAI] ${o.module} failed:`, e?.status || '', (e?.message || '').slice(0, 200));
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
  usage?: Usage;
}

export async function evaluateAnswer(input: AIEvalInput): Promise<AIEvalResult | null> {
  if (!isInterviewAIEnabled()) return null;

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

  const resp = await callClaudeJSON(system, user, 1200);
  if (!resp || typeof resp.data !== 'object') return null;
  const raw = resp.data;

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
    usage: resp.usage,
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
  usage?: Usage;
}

const READINESS = new Set(['not_ready', 'needs_improvement', 'almost_ready', 'interview_ready']);

export async function summarizeAttempt(input: {
  overallPercentage: number;
  sections: AISummarySection[];
}): Promise<AISummaryResult | null> {
  if (!isInterviewAIEnabled()) return null;

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

  const resp = await callClaudeJSON(system, user, 900);
  if (!resp || typeof resp.data !== 'object') return null;
  const raw = resp.data;

  const readiness = String(raw.readinessLevel || '').trim();
  return {
    overallFeedback: String(raw.overallFeedback || '').slice(0, 1500),
    topStrengths: strArr(raw.topStrengths),
    topWeaknesses: strArr(raw.topWeaknesses),
    recommendedPracticeAreas: strArr(raw.recommendedPracticeAreas),
    readinessLevel: (READINESS.has(readiness) ? readiness : 'needs_improvement') as AISummaryResult['readinessLevel'],
    usage: resp.usage,
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
  if (!isInterviewAIEnabled() || spec.count <= 0) return [];

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

  // Generous token budget; open-ended items (rubric + sample answer) are large.
  // Let API errors propagate so the admin UI can show why generation failed,
  // but salvage complete objects if the JSON array gets truncated.
  const { text } = await callClaudeText(system, user, 8000);
  let items: any[];
  try {
    const arr = parseJSONLoose(text);
    items = Array.isArray(arr) ? arr : arr ? [arr] : [];
  } catch {
    items = extractObjects(text);
  }
  if (!items.length) throw new Error('AI did not return any parseable questions — please try again.');
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

// ─── 4. Live conversational interviewer (drives the real-time AI interview) ──

export interface ConvTurn { role: 'interviewer' | 'candidate'; text: string; }
export interface NextTurnInput {
  interviewerName: string;
  role: string;                         // e.g. "Java Full Stack Developer"
  areas: string[];                      // topics to cover (from template sections)
  history: ConvTurn[];                  // full conversation so far
  askedCount: number;                   // interviewer questions asked so far
  maxQuestions: number;                 // soft budget
  timeLeftSeconds?: number;
  /** Spend attribution — 'careerpilot' or 'lms' (default). */
  product?: string;
  tenantId?: string;
  /** Candidate's first name, so the interviewer can use it like a person would. */
  candidateName?: string;
  /**
   * How many past turns to send. Every turn re-sends this window, so it is the single
   * biggest driver of interview cost. Six is ample for "probe the last answer or move
   * on"; twelve was re-sending most of the interview to decide one follow-up.
   */
  historyWindow?: number;
}
export interface NextTurnResult {
  say: string;
  kind: 'intro' | 'question' | 'followup' | 'transition' | 'closing';
  endInterview: boolean;
  usage?: Usage;
}

/**
 * Produce the interviewer's next spoken line for a live interview. Uses the
 * candidate's last answer to ask a natural follow-up when valuable, otherwise
 * moves to the next area. Returns a short, conversational, spoken-style line.
 * Falls back to a sensible scripted line if AI is unavailable.
 */
export async function nextInterviewerTurn(input: NextTurnInput): Promise<NextTurnResult> {
  const { interviewerName, role, areas, history, askedCount, maxQuestions, timeLeftSeconds, candidateName } = input;
  const nearEnd = askedCount >= maxQuestions || (timeLeftSeconds !== undefined && timeLeftSeconds <= 30);

  if (!isInterviewAIEnabled()) {
    // Scripted fallback so the interview still flows without AI.
    if (history.length === 0) return { say: `Hi, I'm ${interviewerName}. Thanks for joining — tell me a bit about yourself and what you've been working on.`, kind: 'intro', endInterview: false };
    if (nearEnd) return { say: `That's all I had — thanks for your time today. We'll share your feedback shortly.`, kind: 'closing', endInterview: true };
    const topic = areas[Math.min(askedCount, areas.length - 1)] || 'your experience';
    return { say: `Thanks. Let's talk about ${topic} — walk me through how you'd approach it.`, kind: 'question', endInterview: false };
  }

  const transcript = history.slice(-12).map(t => `${t.role === 'interviewer' ? interviewerName : 'Candidate'}: ${t.text}`).join('\n');
  // Written for SPEECH — this line is read aloud to the candidate, so anything that only
  // works on a page (markdown, lists, restating the question, "as I mentioned above")
  // sounds wrong out loud.
  const system = [
    `You are ${interviewerName}, a real interviewer running a LIVE SPOKEN mock interview for a ${role} role.`,
    candidateName ? `The candidate's name is ${candidateName}. Use it occasionally, the way a person would — not every turn.` : '',
    `Your line will be READ ALOUD. Write how people talk: ONE turn, 1–2 sentences, no markdown, no lists, no bullet points, no emoji.`,
    ``,
    `How to behave like a person:`,
    `- React to what they actually SAID before asking anything. A short, specific acknowledgement ("that's a fair point about the caching") — never a generic "great answer".`,
    `- PROBE when an answer is thin, vague, or claims something without evidence. Ask for the specific: a number, a trade-off they weighed, what broke. Probe the same answer up to TWICE before moving on.`,
    `- Move to a new area once an answer is genuinely covered. Do not interrogate a point they have already made well.`,
    `- If they say they don't know, accept it warmly and move on. Do not punish it or ask the same thing again.`,
    `- Never restate the question you just asked, and never number your questions.`,
    ``,
    `Cover these areas across the interview: ${areas.join(', ') || 'background, technical skills, problem solving'}.`,
    `Ask exactly one question per turn. Output ONLY raw JSON.`,
  ].filter(Boolean).join('\n');
  const user = [
    `Interviewer questions asked so far: ${askedCount} (aim for about ${maxQuestions}).`,
    timeLeftSeconds !== undefined ? `Time left: ~${Math.round(timeLeftSeconds / 60)} min.` : '',
    nearEnd ? 'You are near the end — wrap up warmly after this.' : '',
    history.length === 0 ? 'The interview is just starting — greet the candidate by introducing yourself and ask an opening question.' : '',
    '',
    `Conversation so far:\n${transcript || '(none yet)'}`,
    '',
    'Return ONLY this JSON: {"say":"<your next spoken line>","kind":"intro|question|followup|transition|closing","endInterview":<true|false>}',
  ].filter(Boolean).join('\n');

  const data = await gatewayJSON(system, user, 300, {
    tenantId: input.tenantId, module: 'interview_turn', product: input.product,
  });
  if (!data || typeof data !== 'object' || !data.say) {
    // Mid-interview this filler is a reasonable safety net — one flaky turn should not
    // destroy a session the member is part-way through. On the OPENING turn it is not:
    // it greets the candidate with "Thanks. Can you tell me more about that?" before they
    // have said anything, and the member sits through a whole interview with a broken
    // interviewer believing that is the product. Better to refuse to start.
    console.error('[interview] AI turn failed', history.length === 0 ? '(opening — refusing to start)' : '(mid-interview — using fallback)');
    if (history.length === 0) {
      throw new Error('The interviewer is unavailable right now. Please try again in a few minutes.');
    }
    return { say: nearEnd ? 'Thanks for your time today — that wraps up our interview.' : 'Thanks. Can you tell me more about that?', kind: nearEnd ? 'closing' : 'followup', endInterview: nearEnd };
  }
  const kind = ['intro', 'question', 'followup', 'transition', 'closing'].includes(data.kind) ? data.kind : 'question';
  return {
    say: String(data.say).slice(0, 600),
    kind,
    endInterview: !!data.endInterview || kind === 'closing',
    // Token usage now lands in the AiUsage ledger via the gateway rather than being
    // returned here — the caller no longer has to tally it to know what this cost.
  };
}

// ─── 5. Evaluate a full conversational transcript → per-area scores + verdict ──

export interface TranscriptEvalArea { title: string; type: string; }
export interface TranscriptEvalResult {
  overallPercentage: number;
  overallFeedback: string;
  topStrengths: string[];
  topWeaknesses: string[];
  recommendedPracticeAreas: string[];
  readinessLevel: AISummaryResult['readinessLevel'];
  areaScores: { title: string; percentage: number; feedback: string }[];
  usage?: Usage;
}

export async function evaluateTranscript(input: {
  role: string;
  areas: TranscriptEvalArea[];
  transcript: ConvTurn[];
  /** Spend attribution — 'careerpilot' or 'lms' (default). */
  product?: string;
  tenantId?: string;
}): Promise<TranscriptEvalResult | null> {
  const convo = input.transcript.map(t => `${t.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${t.text}`).join('\n').slice(0, 9000);
  const areaList = input.areas.map(a => `${a.title} (${a.type})`).join(', ') || 'overall performance';

  const system =
    'You are a strict but fair senior interviewer grading a completed mock interview from its transcript. ' +
    'Judge ONLY the candidate\'s answers. Be specific and actionable. Output ONLY raw JSON, no markdown.';
  const user = [
    `Role: ${input.role}.`,
    `Assessment areas: ${areaList}.`,
    '',
    `Transcript:\n${convo}`,
    '',
    'Return ONLY this JSON:',
    '{"overallPercentage":<0-100>,"overallFeedback":"<3-4 sentences to the candidate>","topStrengths":["..."],"topWeaknesses":["..."],"recommendedPracticeAreas":["..."],"readinessLevel":"not_ready|needs_improvement|almost_ready|interview_ready","areaScores":[{"title":"<one of the areas>","percentage":<0-100>,"feedback":"<1-2 sentences>"}]}',
  ].join('\n');

  // Through the gateway: the evaluation is the part a member reads and judges the
  // product on, so it must survive one provider being down, and its cost belongs on the
  // CareerPilot line of the spend screen like every other call.
  const d0 = await gatewayJSON(system, user, 1200, {
    tenantId: input.tenantId, module: 'interview_evaluation', product: input.product,
  });
  const resp = d0 ? { data: d0, usage: { inputTokens: 0, outputTokens: 0 } } : null;
  if (!resp || typeof resp.data !== 'object') return null;
  const d = resp.data;
  const readiness = String(d.readinessLevel || '').trim();
  return {
    overallPercentage: clamp(d.overallPercentage, 0, 100, 0),
    overallFeedback: String(d.overallFeedback || '').slice(0, 1500),
    topStrengths: strArr(d.topStrengths),
    topWeaknesses: strArr(d.topWeaknesses),
    recommendedPracticeAreas: strArr(d.recommendedPracticeAreas),
    readinessLevel: (READINESS.has(readiness) ? readiness : 'needs_improvement') as AISummaryResult['readinessLevel'],
    areaScores: Array.isArray(d.areaScores)
      ? d.areaScores.map((a: any) => ({ title: String(a.title || ''), percentage: clamp(a.percentage, 0, 100, 0), feedback: String(a.feedback || '').slice(0, 600) }))
      : [],
    usage: resp.usage,
  };
}

export default { isInterviewAIEnabled, evaluateAnswer, summarizeAttempt, generateQuestions, nextInterviewerTurn, evaluateTranscript, CATEGORY_KEYS };
