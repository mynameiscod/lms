/**
 * What a student may be sent of an assignment. An allow-list, not a strip-list.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────────────────────
 *
 * GET /assignments/:id returned the whole document to anyone signed in to the tenant: hidden test
 * cases and their expected outputs, stored solutions, MCQ answer keys, grading statistics and who else
 * the assignment was delivered to. The workspace only DISPLAYED the visible tests — which hid nothing
 * from anyone who opened the network tab.
 *
 * So the student view is built field by field from what doing the task needs. A field added to the
 * model later is private until someone decides a student should see it, rather than public until
 * someone remembers to remove it.
 *
 * ── WHAT IS NEVER SENT ────────────────────────────────────────────────────────────────────
 *
 * Hidden test cases in any form (only their count), stored solution code, comparison and plagiarism
 * configuration, statistics, bank and delivery lists, the author's contact, unit and skill bindings.
 * MCQ correct answers and explanations are sent only once the student's own attempt is submitted,
 * which is when the result screen has always shown them.
 *
 * The grader is unaffected: it reads the assignment from the database, never from this view.
 */

const pick = (src: any, keys: string[]): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const k of keys) if (src[k] !== undefined) out[k] = src[k];
  return out;
};

const TASK_FIELDS = [
  '_id', 'title', 'description', 'instructions', 'type', 'difficulty', 'primaryTech', 'topics',
  'totalPoints', 'passingPoints', 'status', 'startDate', 'dueDate', 'lateSubmissionDeadline', 'lateSubmissionPenalty',
  'allowedLanguages', 'timeLimit', 'memoryLimit', 'shuffleQuestions', 'shuffleOptions',
  'maxFileSize', 'allowedFileTypes', 'maxFiles', 'maxAttempts',
  'showTestCaseResults', 'showExpectedOutput', 'showSyntaxErrors', 'enableHints', 'hints', 'maxAiHints',
  'enableCamera', 'enableMicrophone', 'createdAt', 'updatedAt',
];

const nameOnly = (ref: any) => (ref && typeof ref === 'object' && !Array.isArray(ref) && (ref.name || ref.title)
  ? pick(ref, ['_id', 'name', 'title'])
  : ref);

export interface StudentAssignmentOptions {
  /** The student's attempt is submitted: MCQ answers and explanations may be reviewed. */
  revealAnswers?: boolean;
}

export function toStudentAssignment(doc: any, options: StudentAssignmentOptions = {}): Record<string, any> {
  if (!doc) return doc;
  const a = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const tests: any[] = a.testCases || [];
  return {
    ...pick(a, TASK_FIELDS),
    course: nameOnly(a.course),
    subject: nameOnly(a.subject),
    chapter: nameOnly(a.chapter),
    batch: nameOnly(a.batch),
    testCases: tests.filter(t => !t.isHidden).map(t => ({
      input: t.input, expectedOutput: t.expectedOutput, description: t.description, isHidden: false,
    })),
    hiddenTestCaseCount: tests.filter(t => t.isHidden).length,
    starterCode: (a.starterCode || []).map((s: any) => ({ language: s.language, code: s.code })),
    rubric: (a.rubric || []).map((r: any) => pick(r, ['criterion', 'description', 'maxPoints', 'order'])),
    mcqQuestions: (a.mcqQuestions || []).map((q: any) => ({
      question: q.question,
      points: q.points,
      options: (q.options || []).map((o: any) => (options.revealAnswers ? { text: o.text, isCorrect: !!o.isCorrect } : { text: o.text })),
      ...(options.revealAnswers && q.explanation ? { explanation: q.explanation } : {}),
    })),
  };
}

/** A student's own submission, with any populated assignment reduced to the student view. */
export function toStudentSubmission(doc: any): any {
  if (!doc) return doc;
  const s = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  // How the grade was produced is grading provenance for Skill DNA, not something the student acts on.
  delete s.autoGradeTrusted;
  const assignment = s.assignment;
  if (assignment && typeof assignment === 'object' && !(assignment._bsontype === 'ObjectId' || assignment._bsontype === 'ObjectID')
    && ('testCases' in assignment || 'mcqQuestions' in assignment || 'starterCode' in assignment || 'title' in assignment)) {
    s.assignment = toStudentAssignment(assignment, { revealAnswers: isSubmittedStatus(s.status) });
  }
  return s;
}

/** An attempt that has been handed in, in any state of grading. */
export const isSubmittedStatus = (status: unknown): boolean =>
  ['submitted', 'grading', 'graded', 'late'].includes(String(status));
