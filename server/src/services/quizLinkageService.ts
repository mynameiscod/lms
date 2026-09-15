/**
 * Is every curriculum checkpoint linked to its questions in BOTH directions?
 *
 * A Quiz lists its questions in `questionIds`; a Question names its quiz in `quizId`. The
 * builder, the grader and the audits read the first; the student player reads the second
 * (GET /quizzes/:quizId/questions → Question.find({ quizId })). When only one direction was
 * written, every audit reported complete checkpoints and every student opened an empty one.
 * This checks both, for every quiz bound to a curriculum unit.
 *
 * READ ONLY.
 */

import Quiz from '../models/Quiz';
import Question from '../models/Question';

export interface QuizLinkageReport {
  quizzes: number;
  questions: number;
  /** questionIds that resolve to no Question. */
  unresolvedQuestionIds: string[];
  /** Listed by a quiz, but carrying no quizId. */
  missingQuizId: string[];
  /** Listed by one quiz, but naming another. */
  wrongQuizId: string[];
  /** Listed twice in one quiz, or by more than one quiz. */
  duplicateMembership: string[];
  /** Naming a curriculum quiz that does not list them. */
  orphanedQuestions: string[];
  /** Curriculum quizzes with no questions at all. */
  emptyQuizzes: string[];
  ok: boolean;
}

export async function checkCurriculumQuizLinkage(tenantId: string, unitCodes?: string[]): Promise<QuizLinkageReport> {
  const quizzes = await Quiz.find({
    tenantId,
    unitCode: unitCodes ? { $in: unitCodes } : { $exists: true, $nin: ['', null] },
  }).select('_id unitCode questionIds').lean() as any[];

  const owners = new Map<string, string[]>();
  const duplicateMembership = new Set<string>();
  const emptyQuizzes: string[] = [];
  for (const q of quizzes) {
    const ids = (q.questionIds || []).map(String);
    if (!ids.length) emptyQuizzes.push(String(q.unitCode));
    if (new Set(ids).size !== ids.length) duplicateMembership.add(`${q.unitCode}: a question is listed twice`);
    for (const id of new Set<string>(ids)) owners.set(id, [...(owners.get(id) || []), String(q._id)]);
  }
  for (const [id, list] of owners) if (list.length > 1) duplicateMembership.add(`${id}: listed by ${list.length} quizzes`);

  const listed = [...owners.keys()];
  const quizIds = quizzes.map(q => String(q._id));
  const [rows, claimed] = await Promise.all([
    Question.find({ _id: { $in: listed } }).select('_id quizId').lean() as any,
    Question.find({ quizId: { $in: quizIds } }).select('_id quizId').lean() as any,
  ]);
  const byId = new Map<string, any>((rows as any[]).map(r => [String(r._id), r]));

  const unresolvedQuestionIds = listed.filter(id => !byId.has(id));
  const missingQuizId: string[] = [];
  const wrongQuizId: string[] = [];
  for (const [id, list] of owners) {
    const row = byId.get(id);
    if (!row) continue;
    if (!row.quizId) missingQuizId.push(id);
    else if (!list.includes(String(row.quizId))) wrongQuizId.push(id);
  }
  const orphanedQuestions = (claimed as any[]).map(r => String(r._id)).filter(id => !owners.has(id));

  return {
    quizzes: quizzes.length,
    questions: listed.length,
    unresolvedQuestionIds,
    missingQuizId,
    wrongQuizId,
    duplicateMembership: [...duplicateMembership],
    orphanedQuestions,
    emptyQuizzes,
    ok: !unresolvedQuestionIds.length && !missingQuizId.length && !wrongQuizId.length
      && !duplicateMembership.size && !orphanedQuestions.length && !emptyQuizzes.length,
  };
}
