/**
 * A Content Library row as a learner may receive it.
 *
 * A hidden test case is grading material — it is how an answer is judged — so it never travels to the learner.
 * Visible cases stay: they are the worked examples a problem statement shows. Everything else on a row is what
 * the lesson is made of and is sent as authored.
 *
 * Used by the student day endpoint and by the admin's "preview as student", so the preview cannot show more
 * than a student would get.
 */
export function studentContentRow<T extends Record<string, any>>(row: T): T {
  if (!row || !Array.isArray(row.practiceQuestions)) return row;
  return {
    ...row,
    practiceQuestions: row.practiceQuestions.map((q: any) => ({
      ...q,
      testCases: (q?.testCases || []).filter((t: any) => !t?.isHidden),
    })),
  };
}
