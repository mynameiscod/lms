import Submission, { 
  ISubmission, 
  SubmissionStatus,
  ITestCaseResult,
  IMCQAnswer
} from '../models/Submission';
import Assignment, { 
  IAssignment, 
  AssignmentType,
  ProgrammingLanguage 
} from '../models/Assignment';
import assignmentService from './assignmentService';
import codeRunnerService from './codeRunnerService';
import { Types } from 'mongoose';
import crypto from 'crypto';

interface StartSubmissionInput {
  tenant: Types.ObjectId;
  assignment: Types.ObjectId;
  student: Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
}

interface SaveCodeInput {
  code: string;
  language: ProgrammingLanguage;
}

interface SubmitMCQInput {
  answers: { questionIndex: number; selectedOptionIndex: number }[];
}

interface GradeSubmissionInput {
  gradedBy: Types.ObjectId;
  rubricScores?: {
    criterionIndex: number;
    pointsAwarded: number;
    feedback?: string;
  }[];
  manualScore?: number;
  overallFeedback?: string;
  privateFeedback?: string;
}

class SubmissionService {
  // Start a new submission attempt
  async startSubmission(input: StartSubmissionInput): Promise<ISubmission> {
    const { tenant, assignment, student, ipAddress, userAgent } = input;

    // Get assignment details
    const assignmentDoc = await Assignment.findOne({ _id: assignment, tenant });
    if (!assignmentDoc) {
      throw new Error('Assignment not found');
    }

    // Check if assignment is published and available
    if (assignmentDoc.status !== 'published') {
      throw new Error('Assignment is not available');
    }

    // Check start date
    if (assignmentDoc.startDate && new Date() < assignmentDoc.startDate) {
      throw new Error('Assignment has not started yet');
    }

    // Check for existing submission (any status) - return it if exists
    const existingSubmission = await Submission.findOne({
      assignment,
      student,
      tenant
    }).sort({ attemptNumber: -1 }); // Get the latest attempt

    if (existingSubmission) {
      // If in-progress, return it
      if (existingSubmission.status === SubmissionStatus.IN_PROGRESS) {
        return existingSubmission;
      }
      
      // If completed but max attempts not reached, check if we can create new attempt
      const attemptCount = existingSubmission.attemptNumber;
      if (assignmentDoc.maxAttempts > 0 && attemptCount >= assignmentDoc.maxAttempts) {
        // Return the last submission if max attempts reached
        return existingSubmission;
      }
      
      // For now, return existing submission to allow continuing/viewing
      // New attempts can be explicitly created through a different flow
      return existingSubmission;
    }

    // No existing submission - create new one
    try {
      const submission = new Submission({
        tenant,
        assignment,
        student,
        attemptNumber: 1,
        status: SubmissionStatus.IN_PROGRESS,
        startedAt: new Date(),
        ipAddress,
        userAgent
      });

      // Set initial MCQ answers if MCQ type
      if (assignmentDoc.type === AssignmentType.MCQ) {
        submission.mcqAnswers = assignmentDoc.mcqQuestions.map((_, index) => ({
          questionIndex: index,
          selectedOptionIndex: -1,
          isCorrect: false,
          pointsEarned: 0
        }));
      }

      await submission.save();
      return submission;
    } catch (error: any) {
      // Handle duplicate key error - submission exists, fetch and return it
      if (error.code === 11000) {
        const existingSub = await Submission.findOne({ assignment, student, tenant }).sort({ attemptNumber: -1 });
        if (existingSub) {
          return existingSub;
        }
      }
      throw error;
    }
  }

  // Get submission for student
  async getStudentSubmission(
    submissionId: string | Types.ObjectId,
    studentId: Types.ObjectId,
    tenant: Types.ObjectId
  ): Promise<ISubmission | null> {
    return Submission.findOne({
      _id: submissionId,
      student: studentId,
      tenant
    }).populate('assignment');
  }

  // Get student's submission for an assignment
  async getSubmissionForAssignment(
    assignmentId: string | Types.ObjectId,
    studentId: Types.ObjectId,
    tenant: Types.ObjectId
  ): Promise<ISubmission | null> {
    return Submission.findOne({
      assignment: assignmentId,
      student: studentId,
      tenant
    }).sort({ attemptNumber: -1 });
  }

  // Save code (auto-save)
  async saveCode(
    submissionId: string | Types.ObjectId,
    studentId: Types.ObjectId,
    tenant: Types.ObjectId,
    input: SaveCodeInput
  ): Promise<ISubmission | null> {
    const submission = await Submission.findOne({
      _id: submissionId,
      student: studentId,
      tenant,
      status: SubmissionStatus.IN_PROGRESS
    });

    if (!submission) {
      throw new Error('Submission not found or already submitted');
    }

    // Save code
    submission.code = input.code;
    submission.language = input.language;

    // Add to snapshots only if code is not empty (limit to last 50 snapshots)
    if (input.code && input.code.trim().length > 0) {
      submission.codeSnapshots.push({
        code: input.code,
        language: input.language,
        timestamp: new Date()
      });

      if (submission.codeSnapshots.length > 50) {
        submission.codeSnapshots = submission.codeSnapshots.slice(-50);
      }
    }

    // Update time spent
    if (submission.startedAt) {
      submission.timeSpent = Math.floor((Date.now() - submission.startedAt.getTime()) / 1000);
    }

    await submission.save();
    return submission;
  }

  // Run code against test cases
  async runCode(
    submissionId: string | Types.ObjectId,
    studentId: Types.ObjectId,
    tenant: Types.ObjectId,
    code: string,
    language: ProgrammingLanguage
  ): Promise<{ results: ITestCaseResult[]; allPassed: boolean; compilationError?: string; stdout: string; runtimeError?: string }> {
    const submission = await Submission.findOne({
      _id: submissionId,
      student: studentId,
      tenant
    }).populate('assignment');

    if (!submission) {
      throw new Error('Submission not found');
    }

    const assignment = submission.assignment as unknown as IAssignment;

    // Get assignment-level setting for showing syntax errors (defaults to true)
    const showSyntaxErrors = assignment.showSyntaxErrors ?? true;

    // Run against visible test cases only during practice
    const visibleTestCases = assignment.testCases.filter(tc => !tc.isHidden);

    const results: ITestCaseResult[] = [];
    let compilationError: string | undefined;
    // Raw program output (stdout) so the student always sees what their code printed
    let stdout = '';
    let runtimeError: string | undefined;

    for (let i = 0; i < visibleTestCases.length; i++) {
      const tc = visibleTestCases[i];
      const result = await codeRunnerService.execute({
        code,
        language,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        timeLimit: tc.timeLimit || 5000,
        memoryLimit: assignment.memoryLimit || 256
      });

      // If there's a compilation error, capture it and fail all tests
      if (result.compilationError) {
        compilationError = showSyntaxErrors 
          ? result.compilationError 
          : 'Compilation error detected. Please check your code syntax.';
        
        results.push({
          testCaseIndex: i,
          passed: false,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: '',
          executionTime: 0,
          memoryUsed: 0,
          error: showSyntaxErrors ? result.compilationError : 'Syntax error in code',
          isHidden: false
        });
        continue;
      }

      results.push({
        testCaseIndex: i,
        passed: result.passed,
        input: tc.input,
        expectedOutput: tc.expectedOutput, // Always show expected output during practice runs
        actualOutput: result.output,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        error: result.error,
        isHidden: false
      });
    }

    if (visibleTestCases.length > 0) {
      // Use the first visible test case's run as the program's console output
      stdout = results[0]?.actualOutput || '';
      runtimeError = results[0]?.error;
    } else {
      // No visible test cases — run once with empty input so the student still
      // sees their program's raw output in the console.
      const plain = await codeRunnerService.execute({
        code,
        language,
        input: '',
        expectedOutput: '',
        timeLimit: 5000,
        memoryLimit: assignment.memoryLimit || 256
      });
      if (plain.compilationError) {
        compilationError = showSyntaxErrors
          ? plain.compilationError
          : 'Compilation error detected. Please check your code syntax.';
      }
      stdout = plain.output || '';
      runtimeError = plain.error;
    }

    return {
      results,
      allPassed: results.every(r => r.passed),
      compilationError,
      stdout,
      runtimeError
    };
  }

  // Submit coding assignment
  async submitCoding(
    submissionId: string | Types.ObjectId,
    studentId: Types.ObjectId,
    tenant: Types.ObjectId
  ): Promise<ISubmission> {
    const submission = await Submission.findOne({
      _id: submissionId,
      student: studentId,
      tenant,
      status: SubmissionStatus.IN_PROGRESS
    }).populate('assignment');

    if (!submission) {
      throw new Error('Submission not found or already submitted');
    }

    if (!submission.code) {
      throw new Error('No code to submit');
    }

    const assignment = submission.assignment as unknown as IAssignment;

    // Run against ALL test cases (visible + hidden)
    const results: ITestCaseResult[] = [];
    let totalWeight = 0;
    let earnedWeight = 0;

    for (let i = 0; i < assignment.testCases.length; i++) {
      const tc = assignment.testCases[i];
      totalWeight += tc.weight;

      const result = await codeRunnerService.execute({
        code: submission.code,
        language: submission.language!,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        timeLimit: tc.timeLimit || 5000,
        memoryLimit: assignment.memoryLimit || 256
      });

      if (result.passed) {
        earnedWeight += tc.weight;
      }

      results.push({
        testCaseIndex: i,
        passed: result.passed,
        input: tc.isHidden ? '' : tc.input,
        expectedOutput: tc.isHidden ? '' : (assignment.showExpectedOutput ? tc.expectedOutput : ''),
        actualOutput: tc.isHidden ? '' : result.output,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        error: tc.isHidden ? '' : result.error,
        isHidden: tc.isHidden
      });
    }

    // Calculate score
    const autoScore = totalWeight > 0 
      ? Math.round((earnedWeight / totalWeight) * assignment.totalPoints) 
      : 0;

    // Check for late submission
    let penalty = 0;
    let status = SubmissionStatus.SUBMITTED;
    
    if (assignment.dueDate && new Date() > assignment.dueDate) {
      status = SubmissionStatus.LATE;
      if (assignment.lateSubmissionDeadline && new Date() <= assignment.lateSubmissionDeadline) {
        penalty = Math.round(autoScore * (assignment.lateSubmissionPenalty / 100));
      }
    }

    const finalScore = autoScore - penalty;

    // Persist atomically. Running the test cases can take a long time (compiled
    // languages compile + run per case), and the workspace auto-saves the code
    // every 30s — which bumps the document's version. A plain doc.save() would
    // then throw a Mongoose VersionError ("No matching document found ... version
    // N"). An atomic $set keyed on the still-IN_PROGRESS doc avoids that and also
    // guards against a double submit.
    const updated = await Submission.findOneAndUpdate(
      { _id: submissionId, student: studentId, tenant, status: SubmissionStatus.IN_PROGRESS },
      {
        $set: {
          testCaseResults: results,
          autoScore,
          penaltyApplied: penalty,
          totalScore: autoScore,
          finalScore,
          percentage: Math.round((finalScore / assignment.totalPoints) * 100),
          isPassing: finalScore >= assignment.passingPoints,
          status,
          submittedAt: new Date(),
          timeSpent: submission.startedAt
            ? Math.floor((Date.now() - submission.startedAt.getTime()) / 1000)
            : 0,
          shareToken: submission.shareToken || crypto.randomUUID()
        }
      },
      { new: true }
    );

    if (!updated) {
      // Lost the race (already submitted in another request)
      throw new Error('Submission has already been submitted');
    }

    // Update assignment stats
    await assignmentService.updateStats(assignment._id, tenant);

    return updated;
  }

  // Submit MCQ answers
  async submitMCQ(
    submissionId: string | Types.ObjectId,
    studentId: Types.ObjectId,
    tenant: Types.ObjectId,
    input: SubmitMCQInput
  ): Promise<ISubmission> {
    const submission = await Submission.findOne({
      _id: submissionId,
      student: studentId,
      tenant,
      status: SubmissionStatus.IN_PROGRESS
    }).populate('assignment');

    if (!submission) {
      throw new Error('Submission not found or already submitted');
    }

    const assignment = submission.assignment as unknown as IAssignment;
    
    // Grade MCQ answers
    const mcqAnswers: IMCQAnswer[] = [];
    let totalPoints = 0;
    let earnedPoints = 0;

    for (let i = 0; i < assignment.mcqQuestions.length; i++) {
      const question = assignment.mcqQuestions[i];
      const answer = input.answers.find(a => a.questionIndex === i);
      const selectedIndex = answer?.selectedOptionIndex ?? -1;
      
      const isCorrect = selectedIndex >= 0 && 
        selectedIndex < question.options.length && 
        question.options[selectedIndex].isCorrect;

      const pointsEarned = isCorrect ? question.points : 0;
      totalPoints += question.points;
      earnedPoints += pointsEarned;

      mcqAnswers.push({
        questionIndex: i,
        selectedOptionIndex: selectedIndex,
        isCorrect,
        pointsEarned
      });
    }

    // Calculate score
    const autoScore = totalPoints > 0 
      ? Math.round((earnedPoints / totalPoints) * assignment.totalPoints)
      : 0;

    // Check late submission
    let penalty = 0;
    let status = SubmissionStatus.GRADED; // MCQ is auto-graded
    
    if (assignment.dueDate && new Date() > assignment.dueDate) {
      status = SubmissionStatus.LATE;
      penalty = Math.round(autoScore * (assignment.lateSubmissionPenalty / 100));
    }

    // Update submission
    submission.mcqAnswers = mcqAnswers;
    submission.autoScore = autoScore;
    submission.penaltyApplied = penalty;
    submission.totalScore = autoScore;
    submission.finalScore = autoScore - penalty;
    submission.percentage = Math.round((submission.finalScore / assignment.totalPoints) * 100);
    submission.isPassing = submission.finalScore >= assignment.passingPoints;
    submission.status = status;
    submission.submittedAt = new Date();
    submission.gradedAt = new Date();
    submission.timeSpent = submission.startedAt 
      ? Math.floor((Date.now() - submission.startedAt.getTime()) / 1000)
      : 0;
    submission.shareToken = crypto.randomUUID();

    await submission.save();
    await assignmentService.updateStats(assignment._id, tenant);

    return submission;
  }

  // Submit theory/file upload
  async submitTheory(
    submissionId: string | Types.ObjectId,
    studentId: Types.ObjectId,
    tenant: Types.ObjectId,
    theoryAnswer: string
  ): Promise<ISubmission> {
    const submission = await Submission.findOne({
      _id: submissionId,
      student: studentId,
      tenant,
      status: SubmissionStatus.IN_PROGRESS
    }).populate('assignment');

    if (!submission) {
      throw new Error('Submission not found or already submitted');
    }

    const assignment = submission.assignment as unknown as IAssignment;

    // Check late submission
    let status = SubmissionStatus.SUBMITTED;
    if (assignment.dueDate && new Date() > assignment.dueDate) {
      status = SubmissionStatus.LATE;
    }

    submission.theoryAnswer = theoryAnswer;
    submission.status = status;
    submission.submittedAt = new Date();
    submission.timeSpent = submission.startedAt 
      ? Math.floor((Date.now() - submission.startedAt.getTime()) / 1000)
      : 0;
    submission.shareToken = crypto.randomUUID();

    await submission.save();
    return submission;
  }

  // Grade submission (for instructors)
  async grade(
    submissionId: string | Types.ObjectId,
    tenant: Types.ObjectId,
    input: GradeSubmissionInput
  ): Promise<ISubmission> {
    const submission = await Submission.findOne({
      _id: submissionId,
      tenant
    }).populate('assignment');

    if (!submission) {
      throw new Error('Submission not found');
    }

    const assignment = submission.assignment as unknown as IAssignment;

    // Calculate rubric scores
    let manualScore = input.manualScore ?? 0;
    
    if (input.rubricScores?.length) {
      submission.rubricScores = input.rubricScores.map(rs => {
        const criterion = assignment.rubric[rs.criterionIndex];
        return {
          criterionIndex: rs.criterionIndex,
          criterion: criterion?.criterion || '',
          maxPoints: criterion?.maxPoints || 0,
          pointsAwarded: rs.pointsAwarded,
          feedback: rs.feedback
        };
      });
      manualScore = submission.rubricScores.reduce((sum, rs) => sum + rs.pointsAwarded, 0);
    }

    submission.manualScore = manualScore;
    submission.totalScore = submission.autoScore + manualScore;
    submission.finalScore = submission.totalScore - submission.penaltyApplied;
    submission.percentage = Math.round((submission.finalScore / assignment.totalPoints) * 100);
    submission.isPassing = submission.finalScore >= assignment.passingPoints;
    submission.overallFeedback = input.overallFeedback;
    submission.privateFeedback = input.privateFeedback;
    submission.gradedBy = input.gradedBy;
    submission.gradedAt = new Date();
    submission.status = SubmissionStatus.GRADED;

    // Ensure shareToken exists for LinkedIn sharing
    if (!submission.shareToken) {
      submission.shareToken = crypto.randomUUID();
    }

    await submission.save();
    await assignmentService.updateStats(assignment._id, tenant);

    return submission;
  }

  // Get all submissions for an assignment (for instructors)
  async getAssignmentSubmissions(
    assignmentId: string | Types.ObjectId,
    tenant: Types.ObjectId,
    options?: { status?: SubmissionStatus; page?: number; limit?: number }
  ): Promise<{ submissions: ISubmission[]; total: number }> {
    const query: any = { assignment: assignmentId, tenant };
    
    if (options?.status) {
      query.status = options.status;
    }

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      Submission.find(query)
        .populate('student', 'name email')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit),
      Submission.countDocuments(query)
    ]);

    return { submissions, total };
  }

  // Get student's all submissions
  async getStudentSubmissions(
    studentId: Types.ObjectId,
    tenant: Types.ObjectId
  ): Promise<ISubmission[]> {
    return Submission.find({ student: studentId, tenant })
      .populate('assignment', 'title type difficulty totalPoints dueDate')
      .sort({ updatedAt: -1 });
  }

  // Get submission statistics
  async getSubmissionStats(
    assignmentId: string | Types.ObjectId,
    tenant: Types.ObjectId
  ): Promise<any> {
    const submissions = await Submission.find({
      assignment: assignmentId,
      tenant,
      status: { $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED, SubmissionStatus.LATE] }
    });

    const total = submissions.length;
    const graded = submissions.filter(s => s.status === SubmissionStatus.GRADED).length;
    const pending = submissions.filter(s => s.status === SubmissionStatus.SUBMITTED).length;
    const late = submissions.filter(s => s.status === SubmissionStatus.LATE).length;
    
    const scores = submissions.filter(s => s.status === SubmissionStatus.GRADED).map(s => s.finalScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    
    const passing = submissions.filter(s => s.isPassing).length;

    return {
      total,
      graded,
      pending,
      late,
      avgScore: Math.round(avgScore * 100) / 100,
      highestScore,
      lowestScore,
      passing,
      passRate: total > 0 ? Math.round((passing / total) * 100) : 0
    };
  }

  // Allow student to reattempt assignment (reset submission)
  async allowReattempt(
    submissionId: string | Types.ObjectId,
    tenant: Types.ObjectId,
    resetBy: Types.ObjectId
  ): Promise<ISubmission | null> {
    const submission = await Submission.findOne({ _id: submissionId, tenant });
    if (!submission) return null;

    // Reset the submission to allow reattempt
    submission.status = SubmissionStatus.IN_PROGRESS;
    submission.attemptNumber = (submission.attemptNumber || 1) + 1;
    submission.startedAt = new Date();
    submission.submittedAt = undefined;
    submission.gradedAt = undefined;
    submission.gradedBy = undefined;
    submission.autoScore = 0;
    submission.manualScore = 0;
    submission.totalScore = 0;
    submission.finalScore = 0;
    submission.percentage = 0;
    submission.isPassing = false;
    submission.penaltyApplied = 0;
    submission.overallFeedback = '';
    submission.privateFeedback = '';
    
    // Clear answers but keep the submission record
    submission.testCaseResults = [];
    submission.mcqAnswers = [];
    submission.codeSnapshots = [];
    
    await submission.save();
    
    // Update assignment stats
    const assignment = await Assignment.findById(submission.assignment);
    if (assignment) {
      await assignmentService.updateStats(assignment._id, tenant);
    }

    return submission;
  }
}

export default new SubmissionService();
