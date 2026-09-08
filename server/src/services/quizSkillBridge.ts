/**
 * Turn a finished quiz attempt into skill evidence.
 *
 * THE WIRE THAT MAKES COURSEWORK COUNT. The adaptive engine could already record module
 * assessments; nothing called it. A student could pass every quiz in a module and their plan
 * would still be built on the diagnostic they took in week one, because no quiz had ever
 * reached Skill DNA.
 *
 * ONLY MAPPED QUESTIONS COUNT. A question earns its way in by having a canonical skill in the
 * SkillEvidence mapping table — the same entry requirement every other source meets. An
 * unmapped quiz produces no evidence at all, silently and correctly: it has not been classified,
 * so nothing can honestly be concluded from it. This means the feature switches itself on per
 * quiz, as questions get mapped, with no flag and no migration.
 *
 * NEVER FATAL. Called after the attempt is already saved and the student already has their
 * result. Every failure is caught: a projection problem must not turn a completed quiz into an
 * error, because the quiz is the thing that matters and it is already done.
 */

import QuizAttempt from '../models/QuizAttempt';
import QuizSubmission from '../models/QuizSubmission';
import Question from '../models/Question';
import SkillEvidence from '../models/SkillEvidence';
import { projectModuleAssessment, GradedModuleAnswer } from './moduleAssessmentEvidenceService';
import { publish } from './adaptiveCurriculumEvents';

/** Quiz difficulty words to the evidence vocabulary. */
const DIFFICULTY: Record<string, 'EASY' | 'MEDIUM' | 'HARD'> = {
  easy: 'EASY', medium: 'MEDIUM', hard: 'HARD',
};

export interface BridgeResult {
  projected: boolean;
  recorded: number;
  skillKeys: string[];
  reason?: string;
}

/**
 * Project one attempt, then announce it.
 *
 * The announcement is separate from the recording on purpose: recording is a fact, and whether
 * the plan should react to it is a different question with a different owner.
 */
export async function projectQuizAttemptToSkills(attemptId: string): Promise<BridgeResult> {
  try {
    const attempt = await QuizAttempt.findById(attemptId).lean() as any;
    if (!attempt) return { projected: false, recorded: 0, skillKeys: [], reason: 'attempt not found' };

    // Only a finished attempt is evidence. A half-done one says nothing about what the student
    // can do, and projecting it would record their unanswered questions as failures.
    if (!attempt.submittedAt) {
      return { projected: false, recorded: 0, skillKeys: [], reason: 'not submitted' };
    }

    const submissions = await QuizSubmission.find({ quizAttemptId: String(attemptId) })
      .select('questionId isCorrect marksAwarded').lean() as any[];
    if (!submissions.length) return { projected: false, recorded: 0, skillKeys: [], reason: 'no submissions' };

    const questionIds = submissions.map(s => String(s.questionId));

    // The item→skill mapping. PRIMARY only here; secondary skills are read per item inside the
    // evidence service, from the same table, so the two cannot disagree.
    const mappings = await SkillEvidence.find({
      tenantId: attempt.tenantId,
      sourceType: 'question',
      sourceId: { $in: questionIds },
      contribution: 'PRIMARY',
      active: true,
    }).select('sourceId skillKey').lean() as any[];

    if (!mappings.length) {
      // Not an error. This quiz has not been classified, so it teaches us nothing about any
      // named skill, and inventing an attribution would be worse than recording nothing.
      return { projected: false, recorded: 0, skillKeys: [], reason: 'no skill mappings' };
    }

    const skillByQuestion = new Map<string, string>();
    for (const m of mappings) skillByQuestion.set(String(m.sourceId), String(m.skillKey).toUpperCase());

    const questions = await Question.find({ _id: { $in: questionIds } })
      .select('_id difficultyLevel marks').lean() as any[];
    const questionById = new Map(questions.map(q => [String(q._id), q]));

    const answers: GradedModuleAnswer[] = [];
    for (const s of submissions) {
      const qid = String(s.questionId);
      const skillKey = skillByQuestion.get(qid);
      if (!skillKey) continue;                       // unmapped question, skipped

      const q = questionById.get(qid);
      const maxPoints = Math.max(1, Number(q?.marks) || 1);
      /**
       * marksAwarded is authoritative where it exists; isCorrect is the fallback for older
       * rows written before partial credit. Falling back to a boolean loses nuance but never
       * invents it — a correct answer scores full marks and an incorrect one scores none.
       */
      const earned = typeof s.marksAwarded === 'number'
        ? Math.max(0, s.marksAwarded)
        : (s.isCorrect ? maxPoints : 0);

      answers.push({
        itemId: qid,
        itemSourceType: 'question',
        skillKey,
        difficulty: DIFFICULTY[String(q?.difficultyLevel || 'medium').toLowerCase()] || 'MEDIUM',
        earnedPoints: earned,
        maxPoints,
      });
    }

    if (!answers.length) return { projected: false, recorded: 0, skillKeys: [], reason: 'no mapped answers' };

    const result = await projectModuleAssessment({
      tenantId: String(attempt.tenantId),
      studentId: String(attempt.studentId),
      // Attempt id, not quiz id: a retake is a different attempt and therefore new evidence,
      // which the weighted average blends rather than letting it overwrite the first try.
      assessmentRef: String(attemptId),
      answers,
    });

    await publish({
      name: 'MODULE_ASSESSMENT_COMPLETED',
      tenantId: String(attempt.tenantId),
      studentId: String(attempt.studentId),
      skillKeys: result.skillKeys,
      meta: { attemptId: String(attemptId), moduleScore: result.moduleScore },
    });

    return { projected: true, recorded: result.recorded, skillKeys: result.skillKeys };
  } catch (e: any) {
    console.error('[adaptive] quiz→skill projection failed:', e?.message || e);
    return { projected: false, recorded: 0, skillKeys: [], reason: e?.message || 'failed' };
  }
}
