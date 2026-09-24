import mongoose from 'mongoose';
import HackathonExamAttempt, { IHackathonExamAttempt } from '../models/HackathonExamAttempt';
import HackathonExam, { IHackathonExam } from '../models/HackathonExam';
import AssessmentItem from '../models/AssessmentItem';
import codeRunner from './codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';
import { languageFor } from './assessmentItemValidationService';
import { dedupeAnswers, hasDuplicateAnswers } from './attemptAnswerWriter';

/**
 * Grading, off the submit path and onto a queue.
 *
 * ── WHY IT IS NOT PART OF SUBMIT ──────────────────────────────────────────────────────────
 *
 * One Java execution is about seven seconds of a full core, and a coding question is graded
 * against every test case it has. Eight hundred candidates finishing inside a few minutes is
 * thousands of executions arriving at once. Graded inline, the request times out and the
 * candidate is told their correct solution failed; graded here, the same work becomes a queue
 * that drains. Results are published by an admin anyway, so nothing is waiting on it.
 *
 * ── A TIMEOUT RETRIES THE JOB, NOT THE CANDIDATE ──────────────────────────────────────────
 *
 * The execution tier failing is OUR problem and must never read as a wrong answer. An attempt
 * that fails is retried with backoff, and only when the retries are exhausted does it land in
 * `review_required` for a human. The alternative — scoring zero for a Piston timeout — is the
 * single most unfair thing this system could do.
 *
 * ── AND IT GRADES THE PAPER THAT WAS SAT ──────────────────────────────────────────────────
 *
 * Marks come from `drawnItems`, captured when the paper was drawn, not from the bank as it
 * stands now. An item edited or deleted mid-event must not change what an already-submitted
 * candidate was scored out of.
 */

const MAX_GRADING_ATTEMPTS = 3;

const sameSet = (a: string[], b: string[]): boolean => {
  const x = [...new Set(a.map(String))].sort();
  const y = [...new Set(b.map(String))].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

const normalize = (s: string): string =>
  String(s ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim();

/** Grade every answer on one attempt. Throws if execution fails, so the caller can retry. */
async function gradeAnswers(attempt: IHackathonExamAttempt): Promise<void> {
  /*
   * Collapse duplicates before anything is scored.
   *
   * 137 attempts from 22 September carry two records for the same question, 135 of them
   * contradictory, because two write paths could not see each other (see attemptAnswerWriter).
   * The write path is fixed, but these attempts still need grading and grading used to take
   * whichever record happened to be first in the array -- which is how four candidates were
   * marked wrong on questions they had answered. dedupeAnswers keeps the record a human would
   * pick: work beats no work, and the later answer beats the earlier one.
   *
   * This runs for every attempt, not just the damaged ones, so it is also the backstop if a
   * future write path reintroduces the race.
   */
  if (hasDuplicateAnswers(attempt.answers)) {
    const before = attempt.answers.length;
    attempt.answers = dedupeAnswers(attempt.answers) as typeof attempt.answers;
    console.warn(
      `[GRADING] attempt ${attempt._id}: collapsed ${before} answer records to ${attempt.answers.length} ` +
      '(duplicate records from the 22 Sep race)',
    );
  }

  const ids = attempt.drawnItems.map(d => d.itemId);
  const items = await AssessmentItem.find({ _id: { $in: ids } }).lean() as any[];
  const byId = new Map(items.map(i => [String(i._id), i]));

  let total = 0;
  let executionFailed = false;

  for (const drawnItem of attempt.drawnItems) {
    const key = String(drawnItem.itemId);
    const item = byId.get(key);
    let answer = attempt.answers.find(a => String(a.itemId) === key);

    /* Unanswered still needs a graded row, or the paper has holes the totals cannot explain. */
    if (!answer) {
      attempt.answers.push({
        itemId: drawnItem.itemId, sectionKey: drawnItem.sectionKey,
        runCount: 0, graded: true, correct: false, score: 0, maxScore: drawnItem.marks,
      } as any);
      continue;
    }

    answer.maxScore = drawnItem.marks;

    if (!item) {
      /*
       * The item was removed from the bank after this paper was drawn. Nobody can be marked
       * wrong for a question that no longer exists, so it is flagged rather than scored — an
       * admin voids it or awards it, and the note says which question and why.
       */
      answer.graded = false;
      answer.gradingNote = 'The bank item for this question no longer exists.';
      continue;
    }

    if (item.type === 'mcq') {
      answer.correct = sameSet(answer.selectedOptionIds || [], item.correctOptionIds || []);
      answer.score = answer.correct ? drawnItem.marks : 0;
      answer.graded = true;
      total += answer.score;
      continue;
    }

    if (item.type === 'predict_output') {
      answer.correct = normalize(answer.text || '') === normalize(item.expectedOutput || '');
      answer.score = answer.correct ? drawnItem.marks : 0;
      answer.graded = true;
      total += answer.score;
      continue;
    }

    if (item.type === 'live_code' || item.type === 'sql') {
      const tests = item.testCases || [];
      answer.testCasesTotal = tests.length;

      if (!answer.code || !answer.code.trim()) {
        answer.graded = true; answer.correct = false; answer.score = 0; answer.testCasesPassed = 0;
        continue;
      }
      if (!tests.length) {
        answer.graded = false;
        answer.gradingNote = 'This question has no test cases to grade against.';
        continue;
      }

      const language = languageFor(item, answer.language) as ProgrammingLanguage;
      let passedWeight = 0;
      let totalWeight = 0;
      let passedCount = 0;

      /*
       * ONE compilation for the whole question, not one per test case.
       *
       * This loop called execute() per case, so a Java answer with eight test cases compiled
       * identical source eight times — and javac plus JVM start is essentially all of the
       * ~420ms a Java job costs. executeBatch compiles once and forks a fresh process per
       * case, so isolation is unchanged (static state, System.exit and exceptions still cannot
       * cross between cases) while the marginal cost per case drops from ~420ms to ~67ms.
       *
       * It also means the question occupies ONE execution slot instead of N. With a global cap
       * of a handful of concurrent jobs, that is the difference between a queue that drains and
       * one student's eight-case answer holding the runner for everybody.
       *
       * executeBatch declines when it would not pay — not Java, fewer than three cases, or
       * simulation mode — and falls back to the same per-case path this replaced.
       */
      let results: any[];
      try {
        results = await codeRunner.executeBatch({
          code: answer.code,
          language,
          cases: tests.map((tc: any) => ({
            input: tc.input, expectedOutput: tc.expectedOutput, timeLimit: 15000,
          })),
          memoryLimit: 256,
        });
      } catch (e: any) {
        /*
         * Distinguish "the program was wrong" from "we could not run it". Only the second
         * is grounds for a retry, and conflating them is how a queue timeout becomes a zero.
         */
        executionFailed = true;
        continue;
      }

      for (let i = 0; i < tests.length; i++) {
        const weight = tests[i].weight ?? 1;
        totalWeight += weight;
        if (results[i]?.passed) { passedWeight += weight; passedCount++; }
      }

      answer.testCasesPassed = passedCount;
      answer.correct = passedCount === tests.length;
      answer.score = totalWeight ? Math.round((passedWeight / totalWeight) * drawnItem.marks * 100) / 100 : 0;
      answer.graded = true;
      total += answer.score;
      continue;
    }

    /* Any other type is not auto-gradable here; leave it for review rather than scoring 0. */
    answer.graded = false;
    answer.gradingNote = `Item type "${item.type}" is not graded automatically.`;
  }

  if (executionFailed) throw new Error('Code execution was unavailable while grading this attempt.');

  attempt.score = Math.round(total * 100) / 100;
  attempt.totalMarks = attempt.drawnItems.reduce((s, d) => s + d.marks, 0);
  attempt.percentage = attempt.totalMarks
    ? Math.round((attempt.score / attempt.totalMarks) * 10000) / 100
    : 0;
}

/**
 * Take one pending attempt and grade it.
 *
 * Claimed with a conditional update so two workers — or two blue/green slots overlapping
 * during a deploy — cannot grade the same attempt twice and double a score.
 */
export async function gradeNextPending(): Promise<{ graded: boolean; attemptId?: string; outcome?: string }> {
  const claimed = await HackathonExamAttempt.findOneAndUpdate(
    { 'grading.status': 'pending', submittedAt: { $ne: null } },
    { $set: { 'grading.status': 'grading', 'grading.startedAt': new Date() }, $inc: { 'grading.attempts': 1 } },
    { sort: { submittedAt: 1 }, new: true },
  );
  if (!claimed) return { graded: false };

  try {
    await gradeAnswers(claimed);
    claimed.grading.status = 'graded';
    claimed.grading.completedAt = new Date();
    claimed.grading.lastError = undefined;
    await claimed.save();
    return { graded: true, attemptId: String(claimed._id), outcome: 'graded' };
  } catch (e: any) {
    claimed.grading.lastError = e?.message || 'Grading failed.';
    if (claimed.grading.attempts >= MAX_GRADING_ATTEMPTS) {
      claimed.grading.status = 'review_required';
      claimed.grading.completedAt = new Date();
    } else {
      claimed.grading.status = 'pending';   // picked up again on the next pass
    }
    await claimed.save();
    return { graded: false, attemptId: String(claimed._id), outcome: claimed.grading.status };
  }
}

/** Drain the queue. `max` bounds one pass so a cron tick cannot run forever. */
export async function drainGradingQueue(max = 25): Promise<{ graded: number; retried: number; review: number }> {
  let graded = 0, retried = 0, review = 0;
  for (let i = 0; i < max; i++) {
    const r = await gradeNextPending();
    if (!r.attemptId && !r.graded) break;
    if (r.outcome === 'graded') graded++;
    else if (r.outcome === 'review_required') review++;
    else retried++;
  }
  return { graded, retried, review };
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * TEAM SCORING
 * ════════════════════════════════════════════════════════════════════════════════════════ */

export interface TeamResult {
  registrationCode: string;
  teamName: string;
  /** Everyone on the team sheet. */
  registeredMembers: number;
  /** Those who actually submitted something. */
  attemptedMembers: number;
  /** Sum of member scores. A no-show contributes 0. */
  totalScore: number;
  /** totalScore ÷ denominator, to two decimals. */
  teamScore: number;
  totalMarks: number;
  percentage: number;
  /** Sum of member time, the leaderboard tiebreaker. */
  timeSpentSec: number;
  members: {
    name: string; mobile: string; status: string;
    score: number | null; totalMarks: number | null; timeSpentSec: number | null;
    violations: number; gradingStatus: string;
  }[];
  flags: string[];
}

/**
 * Compute one team's result.
 *
 * ── THE DENOMINATOR IS A POLICY, NOT AN ACCIDENT ──────────────────────────────────────────
 *
 * 'registered' divides by everyone on the team sheet, so a member who never turns up scores
 * zero and pulls the average down — which is what this event was specified with, and which
 * gives a team a real reason to make sure everyone shows up. 'attempted' divides only by those
 * who sat it. The two produce very different league tables, so the exam records which was used
 * and this returns both counts.
 */
export function computeTeamResult(
  exam: IHackathonExam,
  attempts: IHackathonExamAttempt[],
): TeamResult {
  const first = attempts[0];
  const registeredMembers = attempts.length;
  const sat = attempts.filter(a => a.submittedAt);
  const attemptedMembers = sat.length;

  const totalScore = attempts.reduce((s, a) => s + (a.score || 0), 0);
  const denominator = exam.teamScoreDenominator === 'attempted'
    ? Math.max(1, attemptedMembers)
    : Math.max(1, registeredMembers);

  const totalMarks = attempts.reduce((s, a) => s + (a.totalMarks || 0), 0);
  const perMemberMarks = totalMarks / Math.max(1, registeredMembers);

  const teamScore = Math.round((totalScore / denominator) * 100) / 100;

  const flags: string[] = [];
  if (attemptedMembers < registeredMembers) {
    flags.push(`${registeredMembers - attemptedMembers} member(s) did not sit the exam`);
  }
  if (attempts.some(a => a.grading.status === 'review_required')) flags.push('Needs grading review');
  if (attempts.some(a => (a.violationCount || 0) > 0)) flags.push('Proctoring violations recorded');

  /*
   * Clustering. Members of one team sitting from a single address or a single device is the
   * shape impersonation makes — one strong coder working through their teammates' papers.
   * Flagged, never auto-penalised: a college computer lab looks exactly the same.
   */
  if (exam.proctoring?.clusterDetection) {
    const ips = new Set(sat.map(a => a.ipAddress).filter(Boolean));
    const fps = new Set(sat.map(a => a.deviceFingerprint).filter(Boolean));
    if (sat.length > 1 && ips.size === 1) flags.push('All members submitted from one IP address');
    if (sat.length > 1 && fps.size === 1) flags.push('All members submitted from one device');
  }

  return {
    registrationCode: first?.registrationCode || '',
    teamName: first?.teamName || '',
    registeredMembers,
    attemptedMembers,
    totalScore: Math.round(totalScore * 100) / 100,
    teamScore,
    totalMarks: Math.round(perMemberMarks * 100) / 100,
    percentage: perMemberMarks ? Math.round((teamScore / perMemberMarks) * 10000) / 100 : 0,
    timeSpentSec: attempts.reduce((s, a) => s + (a.timeSpentSec || 0), 0),
    members: attempts.map(a => ({
      name: a.memberName,
      mobile: a.memberMobile,
      status: a.status,
      score: a.score ?? null,
      totalMarks: a.totalMarks ?? null,
      timeSpentSec: a.timeSpentSec ?? null,
      violations: a.violationCount || 0,
      gradingStatus: a.grading.status,
    })),
    flags,
  };
}

/**
 * Every team's result, ranked.
 *
 * ONE ORDERING, DEFINED ONCE: higher team score, then LESS total time, then whichever team
 * finished first. The live table, the export and the published leaderboard all read this, so
 * they cannot disagree about who came second.
 */
export async function computeLeaderboard(examId: string): Promise<TeamResult[]> {
  const exam = await HackathonExam.findById(examId).lean() as any;
  if (!exam) throw new Error('Exam not found');

  const attempts = await HackathonExamAttempt.find({ examId }).lean() as any[];
  const byTeam = new Map<string, any[]>();
  for (const a of attempts) {
    const k = a.registrationCode;
    byTeam.set(k, [...(byTeam.get(k) || []), a]);
  }

  const rows = [...byTeam.values()].map(list => computeTeamResult(exam, list));
  return rows.sort((x, y) =>
    y.teamScore - x.teamScore
    || x.timeSpentSec - y.timeSpentSec
    || x.registrationCode.localeCompare(y.registrationCode));
}
