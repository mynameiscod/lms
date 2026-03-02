/**
 * Quiz Answer Validation & Auto-Scoring Service
 * Handles answer checking and automatic score calculation
 */

import Quiz from '../models/Quiz';
import QuizAttempt from '../models/QuizAttempt';
import Question from '../models/Question';

interface StudentAnswer {
  questionId: string;
  selectedOption?: string | number; // For MCQ
  answer?: string; // For short answer/coding
  markedForReview?: boolean;
  answered: boolean;
  timeSpent?: number; // seconds spent on this question
}

interface ScoredAnswer {
  questionId: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  feedback?: string;
  selectedAnswer: string;
  correctAnswer: string;
}

interface QuizScore {
  attemptId: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  passed: boolean;
  passPercentage: number;
  scoredAnswers: ScoredAnswer[];
  summary: {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    unanswered: number;
    markedForReview: number;
  };
}

export class AnswerValidationService {
  /**
   * Validate and score a single answer
   */
  async validateAnswer(
    questionId: string,
    studentAnswer: StudentAnswer
  ): Promise<ScoredAnswer> {
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    let isCorrect = false;
    let selectedAnswerText = '';
    let correctAnswerText = '';

    // Handle different question types
    switch (question.type) {
      case 'mcq_single':
        isCorrect = this.validateMCQSingle(
          studentAnswer.selectedOption?.toString() || '',
          question
        );
        selectedAnswerText =
          question.options?.[Number(studentAnswer.selectedOption)]?.text || 'Not selected';
        correctAnswerText = question.options
          ?.find((opt) => opt.isCorrect)
          ?.text || 'Unknown';
        break;

      case 'mcq_multiple':
        isCorrect = this.validateMCQMultiple(
          Array.isArray(studentAnswer.selectedOption)
            ? studentAnswer.selectedOption
            : [studentAnswer.selectedOption?.toString() || ''],
          question
        );
        selectedAnswerText = this.getSelectedOptionsText(
          studentAnswer.selectedOption,
          question
        );
        correctAnswerText = this.getCorrectOptionsText(question);
        break;

      case 'short_answer':
        isCorrect = this.validateShortAnswer(studentAnswer.answer || '', question);
        selectedAnswerText = studentAnswer.answer || '';
        correctAnswerText = question.correctAnswerText || '';
        break;

      case 'coding':
        isCorrect = this.validateCodingAnswer(studentAnswer.answer || '', question);
        selectedAnswerText = studentAnswer.answer || '';
        correctAnswerText = question.correctAnswerText || 'See expected output';
        break;

      default:
        throw new Error(`Unknown question type: ${question.type}`);
    }

    const marksAwarded = isCorrect ? question.marks : getMarkDeduction(question);

    return {
      questionId,
      isCorrect,
      marksAwarded,
      maxMarks: question.marks,
      feedback: this.generateFeedback(isCorrect, question),
      selectedAnswer: selectedAnswerText,
      correctAnswer: correctAnswerText
    };
  }

  /**
   * Validate MCQ single answer
   */
  private validateMCQSingle(selectedIndex: string, question: any): boolean {
    const idx = Number(selectedIndex);
    if (isNaN(idx) || !question.options?.[idx]) {
      return false;
    }

    return question.options[idx].isCorrect === true;
  }

  /**
   * Validate MCQ multiple answers
   */
  private validateMCQMultiple(selectedIndices: string[], question: any): boolean {
    if (!question.options) return false;

    // Get all correct option indices
    const correctIndices = question.options
      .map((opt, idx) => (opt.isCorrect ? idx : -1))
      .filter((idx) => idx !== -1);

    // Convert selected indices to numbers
    const selectedNums = selectedIndices
      .map((idx) => Number(idx))
      .filter((idx) => !isNaN(idx))
      .sort();

    correctIndices.sort();

    // Check if they match exactly
    return (
      selectedNums.length === correctIndices.length &&
      selectedNums.every((val, idx) => val === correctIndices[idx])
    );
  }

  /**
   * Validate short answer (case-insensitive, trimmed)
   */
  private validateShortAnswer(studentAnswer: string, question: any): boolean {
    const accepted = question.acceptableAnswers || [question.correctAnswerText];

    return accepted.some((correct: string) => {
      const normalizedStudent = studentAnswer.trim().toLowerCase();
      const normalizedCorrect = correct.trim().toLowerCase();

      // Allow for minor spelling variations
      return normalizedStudent === normalizedCorrect;
    });
  }

  /**
   * Validate coding answer
   */
  private validateCodingAnswer(studentAnswer: string, question: any): boolean {
    const accepted = question.acceptableAnswers || [question.correctAnswerText];

    return accepted.some((correct: string) => {
      // Normalize whitespace for code comparison
      const normalizeCode = (code: string) =>
        code.trim().replace(/\s+/g, ' ').toLowerCase();

      return (
        normalizeCode(studentAnswer) === normalizeCode(correct)
      );
    });
  }

  /**
   * Get selected options text for display
   */
  private getSelectedOptionsText(selected: any, question: any): string {
    const indices = Array.isArray(selected) ? selected : [selected];
    return indices
      .map((idx) => question.options?.[Number(idx)]?.text || 'Unknown')
      .join(', ');
  }

  /**
   * Get correct options text for display
   */
  private getCorrectOptionsText(question: any): string {
    return question.options
      ?.filter((opt) => opt.isCorrect)
      .map((opt) => opt.text)
      .join(', ') || 'Unknown';
  }

  /**
   * Generate feedback message
   */
  private generateFeedback(isCorrect: boolean, question: any): string {
    if (isCorrect) {
      return question.explanation || 'Correct! Well done.';
    } else {
      return (
        question.explanation || 'Incorrect. Review the concept and try again.'
      );
    }
  }

  /**
   * Score entire quiz attempt
   */
  async scoreQuizAttempt(attemptId: string): Promise<QuizScore> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const studentAnswers: StudentAnswer[] = attempt.answers || [];
    const scoredAnswers: ScoredAnswer[] = [];

    let totalMarks = 0;
    let obtainedMarks = 0;

    // Score each answer
    for (const studentAnswer of studentAnswers) {
      if (!studentAnswer.answered) {
        scoredAnswers.push({
          questionId: studentAnswer.questionId,
          isCorrect: false,
          marksAwarded: 0,
          maxMarks: 0,
          feedback: 'Not answered',
          selectedAnswer: '',
          correctAnswer: ''
        });
        continue;
      }

      const scored = await this.validateAnswer(
        studentAnswer.questionId,
        studentAnswer
      );

      scoredAnswers.push(scored);
      totalMarks += scored.maxMarks;
      obtainedMarks += scored.marksAwarded;
    }

    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
    const passPercentage = quiz.passPercentage || 40;
    const passed = percentage >= passPercentage;

    // Calculate summary
    const summary = {
      totalQuestions: studentAnswers.length,
      correctAnswers: scoredAnswers.filter((s) => s.isCorrect).length,
      incorrectAnswers: scoredAnswers.filter((s) => !s.isCorrect && s.maxMarks > 0)
        .length,
      unanswered: studentAnswers.filter((s) => !s.answered).length,
      markedForReview: studentAnswers.filter((s) => s.markedForReview).length
    };

    // Update attempt in database
    await QuizAttempt.updateOne(
      { _id: attemptId },
      {
        obtainedMarks,
        totalMarks,
        percentage: Math.round(percentage * 100) / 100,
        passed,
        status: 'submitted'
      }
    );

    return {
      attemptId: attemptId,
      totalMarks,
      obtainedMarks,
      percentage: Math.round(percentage * 100) / 100,
      passed,
      passPercentage,
      scoredAnswers,
      summary
    };
  }
}

/**
 * Helper function to calculate mark deduction for wrong answers
 */
function getMarkDeduction(question: any): number {
  if (question.negativeMarks && question.negativeMarkingValue) {
    return -question.negativeMarkingValue;
  }
  return 0;
}

export default new AnswerValidationService();
