/**
 * Quiz Randomization & Anti-Cheating Service
 * Handles question shuffling, option shuffling, and integrity monitoring
 */

import Quiz from '../models/Quiz';
import Question from '../models/Question';
import QuizAttempt from '../models/QuizAttempt';

interface ShuffledQuestionSet {
  questionId: string;
  originalOrder: number;
  shuffledOrder: number;
  optionMapping?: Record<number, number>; // Maps shuffled option index to original index
}

interface IntegrityCheck {
  attemptId: string;
  tabSwitches: number;
  windowFocus: boolean;
  fullScreenMaintained: boolean;
  copyPasteDetected: boolean;
  suspiciousActivity: boolean;
}

export class QuizRandomizationService {
  /**
   * Shuffle questions for a quiz attempt
   * Creates a randomized question order while maintaining original IDs
   */
  async getShuffledQuestions(quizId: string, attemptId: string): Promise<ShuffledQuestionSet[]> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    if (!quiz.shuffleQuestions) {
      // Return questions in original order if shuffling is disabled
      return (quiz.questionIds || []).map((qid, idx) => ({
        questionId: qid,
        originalOrder: idx,
        shuffledOrder: idx
      }));
    }

    // Get questions
    const questions = await Question.find({
      _id: { $in: quiz.questionIds || [] }
    });

    // Create shuffled order
    let shuffledIndices = Array.from({ length: questions.length }, (_, i) => i);
    shuffledIndices = this.fisherYatesShuffle(shuffledIndices);

    // Map to shuffled questions
    const shuffledSet: ShuffledQuestionSet[] = shuffledIndices.map((origIdx, newIdx) => ({
      questionId: questions[origIdx]._id?.toString() || '',
      originalOrder: origIdx,
      shuffledOrder: newIdx
    }));

    // Store shuffled order in attempt for consistency
    await QuizAttempt.updateOne(
      { _id: attemptId },
      { $set: { 'metadata.shuffledQuestionOrder': shuffledSet } }
    );

    return shuffledSet;
  }

  /**
   * Shuffle options for a single question
   */
  async getShuffledOptions(questionId: string, attemptId: string): Promise<any> {
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    // MCQ type questions get shuffled options
    if (!['mcq_single', 'mcq_multiple'].includes(question.type)) {
      return question.options;
    }

    const options = question.options || [];
    if (options.length === 0) return options;

    // Create mapping of shuffled indices
    let optionIndices = Array.from({ length: options.length }, (_, i) => i);
    const shuffledIndices = this.fisherYatesShuffle([...optionIndices]);

    // Map shuffled options
    const shuffledOptions = shuffledIndices.map((origIdx) => ({
      ...options[origIdx],
      originalIndex: origIdx
    }));

    // Store mapping for later validation
    const optionMapping: Record<number, number> = {};
    shuffledIndices.forEach((origIdx, shuffledIdx) => {
      optionMapping[shuffledIdx] = origIdx;
    });

    await QuizAttempt.updateOne(
      { _id: attemptId },
      { $set: { [`metadata.optionMappings.${questionId}`]: optionMapping } }
    );

    return shuffledOptions;
  }

  /**
   * Fisher-Yates shuffle algorithm
   * Guarantees uniform random permutation
   */
  private fisherYatesShuffle(array: any[]): any[] {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Track tab switch for integrity monitoring
   */
  async recordTabSwitch(attemptId: string): Promise<number> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const newTabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
    const newWarningCount = (attempt.tabSwitchWarnings || 0) + 1;

    // Check if max warnings reached
    if (quiz.tabSwitchWarnings && newWarningCount > 3) {
      // Auto-forfeit after 4 warnings
      await QuizAttempt.updateOne(
        { _id: attemptId },
        {
          status: 'submitted',
          submittedAt: new Date(),
          $set: { 'metadata.forfeited': true, 'metadata.reason': 'excessive_tab_switches' }
        }
      );

      throw new Error('Quiz forfeited due to excessive tab switching');
    }

    // Update tab switch count and warnings
    await QuizAttempt.updateOne(
      { _id: attemptId },
      {
        tabSwitchCount: newTabSwitchCount,
        tabSwitchWarnings: newWarningCount
      }
    );

    return newTabSwitchCount;
  }

  /**
   * Check full screen status and track
   */
  async recordFullScreenStatus(attemptId: string, isFullScreen: boolean): Promise<void> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    if (!isFullScreen) {
      await QuizAttempt.updateOne(
        { _id: attemptId },
        { isFullScreenMaintained: false }
      );
    }
  }

  /**
   * Generate integrity report for an attempt
   */
  async getIntegrityReport(attemptId: string): Promise<IntegrityCheck> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const tabSwitches = attempt.tabSwitchCount || 0;
    const fullScreenMaintained = attempt.isFullScreenMaintained !== false;
    const copyPasteDetected = (attempt as any).metadata?.copyPasteDetected || false;

    // Flag as suspicious if:
    // - More than 5 tab switches
    // - Full screen not maintained
    // - Copy-paste detected
    // - Unusually fast submission
    const timeSpent = attempt.timeSpent || 0;
    const absurdlyFast = timeSpent < 30; // Less than 30 seconds for entire quiz

    const suspiciousActivity = 
      tabSwitches > 5 || 
      !fullScreenMaintained || 
      copyPasteDetected || 
      absurdlyFast;

    return {
      attemptId: attemptId,
      tabSwitches,
      windowFocus: true, // Can be improved with window focus tracking
      fullScreenMaintained,
      copyPasteDetected,
      suspiciousActivity
    };
  }

  /**
   * Mark attempt as having copy-paste activity
   */
  async recordCopyPasteAttempt(attemptId: string): Promise<void> {
    await QuizAttempt.updateOne(
      { _id: attemptId },
      { $set: { 'metadata.copyPasteDetected': true, 'metadata.copyPasteCount': { $inc: 1 } } }
    );
  }

  /**
   * Get randomized question for display
   * Combines shuffled order with shuffled options
   */
  async getQuestionForAttempt(
    attemptId: string,
    questionIndex: number
  ): Promise<any> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const shuffledOrder = (attempt as any).metadata?.shuffledQuestionOrder || [];
    if (questionIndex >= shuffledOrder.length) {
      throw new Error('Question index out of range');
    }

    const questionId = shuffledOrder[questionIndex].questionId;
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    // Get shuffled options
    const options = await this.getShuffledOptions(questionId, attemptId);

    return {
      ...question.toObject(),
      options,
      shuffledIndex: questionIndex,
      originalIndex: shuffledOrder[questionIndex].originalOrder
    };
  }

  /**
   * Map selected answer back to original option index
   * (Important for validation after shuffling)
   */
  async mapShuffledAnswerToOriginal(
    attemptId: string,
    questionId: string,
    shuffledOptionIndex: number
  ): Promise<number> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const optionMapping = (attempt as any).metadata?.optionMappings?.[questionId];
    if (!optionMapping) {
      return shuffledOptionIndex; // No mapping, return as-is
    }

    return optionMapping[shuffledOptionIndex] || shuffledOptionIndex;
  }
}

export default new QuizRandomizationService();
