import { Types } from 'mongoose';
import Submission, { ISubmission } from '../models/Submission';
import { IAssignment } from '../models/Assignment';
import { aiComplete } from './aiGateway';

export type HintLanguage = 'en' | 'te';

interface FailingCase {
  input: string;
  expected: string;
  actual: string;
}

interface RequestTestCaseHintInput {
  submissionId: string | Types.ObjectId;
  studentId: Types.ObjectId;
  tenant: Types.ObjectId;
  code: string;
  testCaseIndex: number;
  fail: FailingCase;
  hintLanguage: HintLanguage;
}

interface RequestConceptHintInput {
  submissionId: string | Types.ObjectId;
  studentId: Types.ObjectId;
  tenant: Types.ObjectId;
  hintLanguage: HintLanguage;
}

interface HintResult {
  hint: string;
  hintsUsed: number;
  maxHints: number;
}

// Sentinel testCaseIndex for a "before I even start" concept hint (not tied to a run).
const CONCEPT_HINT_INDEX = -1;

const LANG_INSTRUCTION: Record<HintLanguage, string> = {
  en: 'Respond in simple, encouraging English.',
  te: 'Respond ONLY in Telugu, written in Telugu (తెలుగు) script — do not switch to English or Roman letters, even for technical terms; explain technical terms in Telugu as best as you can.',
};

const FALLBACK_DEBUG_HINT: Record<HintLanguage, string> = {
  en: 'Trace your code by hand on that input — where does the actual output first differ from what you expected?',
  te: 'ఆ ఇన్‌పుట్‌పై మీ కోడ్‌ను చేత్తో ట్రేస్ చేయండి — మీరు ఆశించిన దాని నుండి వాస్తవ అవుట్‌పుట్ ఎక్కడ మొదట తేడాగా ఉంది?',
};

const FALLBACK_CONCEPT_HINT: Record<HintLanguage, string> = {
  en: 'Re-read the problem statement slowly and look up any term you are not 100% sure about — the key concept is usually named right in the title or first sentence.',
  te: 'సమస్య వివరణను నెమ్మదిగా మళ్లీ చదవండి మరియు మీకు పూర్తిగా తెలియని పదాన్ని వెతకండి — ముఖ్యమైన కాన్సెప్ట్ సాధారణంగా టైటిల్ లేదా మొదటి వాక్యంలోనే ఉంటుంది.',
};

const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// Load the submission + assignment, and enforce the shared per-attempt hint
// quota (Assignment.maxAiHints). Both hint types (debug + concept) draw from
// this one pool — admin configures a single "how many hints total" number.
async function loadAndCheckQuota(
  submissionId: string | Types.ObjectId,
  studentId: Types.ObjectId,
  tenant: Types.ObjectId
): Promise<{ submission: ISubmission; assignment: IAssignment; used: number; maxHints: number }> {
  const submission = await Submission.findOne({ _id: submissionId, student: studentId, tenant }).populate('assignment');
  if (!submission) throw new Error('Submission not found');

  const assignment = submission.assignment as unknown as IAssignment;
  if (!assignment) throw new Error('Assignment not found');
  if (!assignment.enableHints) throw new Error('AI hints are not enabled for this assignment');

  const maxHints = assignment.maxAiHints || 3;
  const used = submission.aiHintsUsed || 0;
  if (used >= maxHints) {
    throw new Error(`You've used all ${maxHints} AI hints available for this problem.`);
  }

  return { submission, assignment, used, maxHints };
}

async function callAi(tenant: Types.ObjectId, system: string, user: string, fallback: string): Promise<string> {
  try {
    const text = (await aiComplete({
      tenantId: tenant.toString(),
      module: 'assignment-hint',
      system,
      user,
      maxTokens: 350,
    })).trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

async function logHintAndSave(
  submission: ISubmission,
  testCaseIndex: number,
  hintLanguage: HintLanguage,
  hintText: string
): Promise<number> {
  submission.aiHintsUsed = (submission.aiHintsUsed || 0) + 1;
  submission.aiHintLog = submission.aiHintLog || [];
  submission.aiHintLog.push({ at: new Date(), testCaseIndex, language: hintLanguage, hintText });
  await submission.save();
  return submission.aiHintsUsed;
}

// A hint for a failing test case — explains the likely bug in the student's
// code, never the fix/solution.
export async function requestTestCaseHint(input: RequestTestCaseHintInput): Promise<HintResult> {
  const { submission, assignment, maxHints } = await loadAndCheckQuota(input.submissionId, input.studentId, input.tenant);

  const hintLanguage: HintLanguage = input.hintLanguage === 'te' ? 'te' : 'en';
  const langInstruction = LANG_INSTRUCTION[hintLanguage];

  const sys = `You are a patient, encouraging coding tutor helping a beginner student who is stuck on a practice problem. ${langInstruction}
Explain WHY their code produced the wrong output in a way a beginner can understand — walk through the likely misconception or bug in 2-4 short sentences, teaching the underlying concept.
Never rewrite their code, never give the corrected code, and never state the exact line-by-line fix — guide them to discover it themselves.`;

  const usr = `Problem: ${assignment.title}
${stripHtml(assignment.description).slice(0, 800)}

Student's code:
"""${(input.code || '').slice(0, 2500)}"""

Failing test case —
Input: ${input.fail.input}
Expected Output: ${input.fail.expected}
Actual Output: ${input.fail.actual}

Explain the likely bug and the concept behind it, without giving the fix or corrected code.`;

  const hintText = await callAi(input.tenant, sys, usr, FALLBACK_DEBUG_HINT[hintLanguage]);
  const hintsUsed = await logHintAndSave(submission, input.testCaseIndex, hintLanguage, hintText);
  return { hint: hintText, hintsUsed, maxHints };
}

// A hint for BEFORE the student has written or run anything — explains any
// domain concept the problem assumes (e.g. what "even number" means) with one
// concrete example, and names the general programming concepts/tools typically
// needed to solve this kind of problem. Never the algorithm or code.
export async function requestConceptHint(input: RequestConceptHintInput): Promise<HintResult> {
  const { submission, assignment, maxHints } = await loadAndCheckQuota(input.submissionId, input.studentId, input.tenant);

  const hintLanguage: HintLanguage = input.hintLanguage === 'te' ? 'te' : 'en';
  const langInstruction = LANG_INSTRUCTION[hintLanguage];

  const sys = `You are a patient coding tutor helping a complete beginner understand a problem BEFORE they start writing any code. ${langInstruction}
The student may not know a key domain concept the problem assumes (for example, if the problem says "write a program to check if a number is even", the student may not actually know what an even number is).
Do exactly two things, in order:
1. Identify that key concept and explain it in plain language with ONE simple, concrete, real-world-style example (numbers or everyday items — not code).
2. In one short sentence, name the general programming tools/concepts usually used to solve this kind of problem (e.g. "the modulo operator (%) and an if-else check") — just name them, do not explain how to use them together.
Do NOT write any code, do NOT give the step-by-step algorithm, and do NOT solve the problem. Keep the whole answer to 4-6 short sentences.`;

  const usr = `Problem title: ${assignment.title}
Description: ${stripHtml(assignment.description).slice(0, 800)}
Instructions: ${stripHtml((assignment as any).instructions || '').slice(0, 800)}

Explain the key concept behind this problem with one simple example, and name the general tools/concepts typically used to solve it — without solving it.`;

  const hintText = await callAi(input.tenant, sys, usr, FALLBACK_CONCEPT_HINT[hintLanguage]);
  const hintsUsed = await logHintAndSave(submission, CONCEPT_HINT_INDEX, hintLanguage, hintText);
  return { hint: hintText, hintsUsed, maxHints };
}

export default { requestTestCaseHint, requestConceptHint };
