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

interface RequestHintInput {
  submissionId: string | Types.ObjectId;
  studentId: Types.ObjectId;
  tenant: Types.ObjectId;
  code: string;
  testCaseIndex: number;
  fail: FailingCase;
  hintLanguage: HintLanguage;
}

interface RequestHintResult {
  hint: string;
  hintsUsed: number;
  maxHints: number;
}

const LANG_INSTRUCTION: Record<HintLanguage, string> = {
  en: 'Respond in simple, encouraging English.',
  te: 'Respond ONLY in Telugu, written in Telugu (తెలుగు) script — do not switch to English or Roman letters, even for technical terms; explain technical terms in Telugu as best as you can.',
};

const FALLBACK_HINT: Record<HintLanguage, string> = {
  en: 'Trace your code by hand on that input — where does the actual output first differ from what you expected?',
  te: 'ఆ ఇన్‌పుట్‌పై మీ కోడ్‌ను చేత్తో ట్రేస్ చేయండి — మీరు ఆశించిన దాని నుండి వాస్తవ అవుట్‌పుట్ ఎక్కడ మొదట తేడాగా ఉంది?',
};

const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// Generate (or reject) an AI hint for a failing test case, enforcing the
// per-assignment quota (Assignment.maxAiHints) tracked per student attempt.
export async function requestHint(input: RequestHintInput): Promise<RequestHintResult> {
  const submission = await Submission.findOne({
    _id: input.submissionId,
    student: input.studentId,
    tenant: input.tenant,
  }).populate('assignment');

  if (!submission) throw new Error('Submission not found');

  const assignment = submission.assignment as unknown as IAssignment;
  if (!assignment) throw new Error('Assignment not found');
  if (!assignment.enableHints) throw new Error('AI hints are not enabled for this assignment');

  const maxHints = assignment.maxAiHints || 3;
  const used = submission.aiHintsUsed || 0;
  if (used >= maxHints) {
    throw new Error(`You've used all ${maxHints} AI hints available for this problem.`);
  }

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

  let hintText = '';
  try {
    hintText = (await aiComplete({
      tenantId: input.tenant.toString(),
      module: 'assignment-hint',
      system: sys,
      user: usr,
      maxTokens: 350,
    })).trim();
  } catch {
    hintText = '';
  }
  if (!hintText) hintText = FALLBACK_HINT[hintLanguage];

  submission.aiHintsUsed = used + 1;
  submission.aiHintLog = submission.aiHintLog || [];
  submission.aiHintLog.push({
    at: new Date(),
    testCaseIndex: input.testCaseIndex,
    language: hintLanguage,
    hintText,
  });
  await submission.save();

  return { hint: hintText, hintsUsed: submission.aiHintsUsed, maxHints };
}

export default { requestHint };
