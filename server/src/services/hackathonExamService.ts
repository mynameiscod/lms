import crypto from 'crypto';
import mongoose from 'mongoose';
import HackathonExam, { IHackathonExam } from '../models/HackathonExam';
import HackathonExamAttempt, {
  IHackathonExamAttempt, IAttemptAnswer, ViolationKind,
} from '../models/HackathonExamAttempt';
import HackathonRegistration from '../models/HackathonRegistration';
import AssessmentItem from '../models/AssessmentItem';
import { drawForAttempt, newDrawSeed } from './hackathonExamDrawService';
import codeRunner from './codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';
import { languageFor } from './assessmentItemValidationService';

/**
 * The hackathon exam, from "a team registered" to "an answer is recorded".
 *
 * ── EVERYTHING DECIDED HERE IS DECIDED BY THE SERVER ──────────────────────────────────────
 *
 * The paper runs in a browser on a machine we do not own, which can send any request it likes
 * in any order. So the clock, the number of runs left, whether a violation ends the attempt,
 * and whether a submission is still allowed are all resolved from stored state and the server's
 * own `Date.now()`. The client is told what it needs to render; it is never asked what is true.
 *
 * ── AND NOTHING HERE EVER RETURNS AN ANSWER KEY ───────────────────────────────────────────
 *
 * Every payload that reaches a candidate is built field by field. `correctOptionIds`,
 * `expectedOutput` and hidden test cases are not omitted by a `.select('-x')` that a later
 * refactor could quietly drop — the candidate-facing shapes simply have nowhere to put them.
 */

export class ExamError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const newExamToken = (): string => crypto.randomBytes(16).toString('hex');

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * PROVISIONING
 * ════════════════════════════════════════════════════════════════════════════════════════ */

export interface ProvisionResult {
  teams: number;
  created: number;
  existing: number;
  skippedTeams: { registrationCode: string; reason: string }[];
}

/**
 * Create one attempt per member of every CONFIRMED team.
 *
 * ONLY CONFIRMED. A `pending_payment` team has not bought a place — inviting them would hand
 * out an exam link on the strength of a browser saying "success", which the registration
 * module deliberately refuses to treat as evidence.
 *
 * IDEMPOTENT, because this is run more than once: teams keep registering after the first
 * invitations go out, and an admin will press it again. An existing attempt is left completely
 * untouched — re-issuing a token would break the link already sitting in someone's WhatsApp,
 * and re-drawing would change the paper under a candidate who had started.
 */
export async function provisionAttempts(exam: IHackathonExam): Promise<ProvisionResult> {
  const regs = await HackathonRegistration.find({
    hackathonId: exam.hackathonId,
    status: 'confirmed',
  }).lean() as any[];

  const result: ProvisionResult = { teams: regs.length, created: 0, existing: 0, skippedTeams: [] };

  for (const reg of regs) {
    const members = (reg.members || []).filter((m: any) => m?.mobile);
    if (!members.length) {
      result.skippedTeams.push({ registrationCode: reg.registrationCode, reason: 'No members with a mobile number.' });
      continue;
    }

    for (const m of members) {
      const existing = await HackathonExamAttempt.findOne({
        examId: exam._id, memberMobile: m.mobile,
      }).select('_id').lean();
      if (existing) { result.existing++; continue; }

      const seed = newDrawSeed();
      /*
       * The paper is drawn at provisioning, not at start. Eight hundred people starting at
       * once would otherwise each pay for a draw at the single busiest moment of the event,
       * and a draw that throws — because a section cannot be filled — would fail them at the
       * gun instead of failing the admin days earlier.
       */
      const drawnItems = await drawForAttempt(exam, seed);

      await HackathonExamAttempt.create({
        tenantId: exam.tenantId,
        examId: exam._id,
        hackathonId: exam.hackathonId,
        registrationId: reg._id,
        registrationCode: reg.registrationCode,
        teamName: reg.teamName,
        memberName: m.name,
        memberMobile: m.mobile,
        memberEmail: m.email,
        isLead: !!m.isLead,
        examToken: newExamToken(),
        drawSeed: seed,
        drawnItems,
        status: 'invited',
      });
      result.created++;
    }
  }

  return result;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * LOOKUP
 * ════════════════════════════════════════════════════════════════════════════════════════ */

export const cleanToken = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/[^a-f0-9]/g, '');
export const cleanTeamCode = (v: unknown): string => String(v || '').trim().toUpperCase().replace(/\s+/g, '');

export async function attemptByToken(token: string) {
  const t = cleanToken(token);
  if (!t) throw new ExamError('NOT_FOUND', 'That exam link is not valid.', 404);
  const attempt = await HackathonExamAttempt.findOne({ examToken: t });
  if (!attempt) throw new ExamError('NOT_FOUND', 'That exam link is not valid.', 404);
  return attempt;
}

/**
 * Find a member's attempt from the team code they were given plus their own mobile.
 *
 * The team code alone is not identity — every member of the team has it, and so does anyone
 * they showed it to. The mobile picks the person, and the OTP that follows proves it is them.
 */
export async function findAttemptByTeamCode(examId: string, teamCode: string, mobile: string) {
  const code = cleanTeamCode(teamCode);
  const mob = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (!code || !mob) throw new ExamError('BAD_INPUT', 'Enter your team code and mobile number.');

  const attempt = await HackathonExamAttempt.findOne({
    examId, registrationCode: code, memberMobile: mob,
  });
  if (!attempt) {
    /*
     * One message for both "no such team" and "not on that team". Distinguishing them turns
     * this into an oracle for enumerating who is registered, from a public endpoint.
     */
    throw new ExamError('NOT_FOUND', 'We could not match that team code and mobile number.', 404);
  }
  return attempt;
}

/**
 * Find a candidate's paper from their mobile number alone.
 *
 * ── WHY THE TEAM CODE IS NOT REQUIRED ─────────────────────────────────────────────────────
 *
 * It was never the thing doing the work. A team code is shared by everybody on the team, so
 * it identifies a team and not a person; the OTP to the registered number is what proves who
 * is sitting down. Requiring both meant a candidate needed a shared non-secret in order to
 * receive the real check.
 *
 * And offline cohorts never get one. They are imported from a spreadsheet — no registration
 * confirmation, no email with a code in it — so the form was asking them for two values that
 * had never been sent to them. They could not fill it in at all.
 *
 * ── WHEN A NUMBER IS ON MORE THAN ONE PAPER ───────────────────────────────────────────────
 *
 * Somebody can sit more than one hackathon. Rather than guess, anything already submitted is
 * dropped — there is nothing to do with a finished paper — and if more than one is still
 * open the caller is told to name the event. Guessing would occasionally hand a candidate the
 * wrong exam, and they would not know until they were looking at somebody else's questions.
 */
export async function findAttemptsByMobile(mobile: string, eventHint?: string) {
  const mob = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (mob.length !== 10) throw new ExamError('BAD_INPUT', 'Enter your 10-digit mobile number.');

  const all = await HackathonExamAttempt.find({ memberMobile: mob, submittedAt: null }).limit(20);
  if (!all.length) {
    /*
     * The same message whether the number is unknown or simply has no paper drawn yet. A
     * public endpoint that distinguishes them is a way to test whether a number is registered.
     */
    throw new ExamError('NOT_FOUND', 'We could not find an exam for that mobile number.', 404);
  }
  if (all.length === 1 || !eventHint) return all;

  const hint = String(eventHint).trim().toLowerCase();
  const exams = await HackathonExam.find({ _id: { $in: all.map((a) => a.examId) } }).select('_id title').lean() as any[];
  const match = new Set(exams
    .filter((e) => String(e.title || '').toLowerCase().includes(hint))
    .map((e) => String(e._id)));
  const narrowed = all.filter((a) => match.has(String(a.examId)));
  return narrowed.length ? narrowed : all;
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * THE WINDOW
 * ════════════════════════════════════════════════════════════════════════════════════════ */

/** Why this attempt cannot be opened right now, or null if it can. */
export function windowError(exam: IHackathonExam, attempt: IHackathonExamAttempt, now = new Date()): ExamError | null {
  if (exam.status === 'draft' || exam.status === 'ready') {
    return new ExamError('NOT_YET', 'The exam has not opened yet.', 403);
  }
  if (now < new Date(exam.startAt)) return new ExamError('NOT_YET', 'The exam has not started yet.', 403);
  if (now > new Date(exam.endAt)) return new ExamError('ENDED', 'This exam has closed.', 403);

  if (!attempt.startedAt && exam.joinCutoffMins > 0) {
    const cutoff = new Date(new Date(exam.startAt).getTime() + exam.joinCutoffMins * 60000);
    if (now > cutoff) return new ExamError('JOIN_CLOSED', 'The window to start this exam has closed.', 403);
  }
  return null;
}

/** The candidate's own deadline: their duration, never past the exam's hard close. */
export function deadlineFor(exam: IHackathonExam, startedAt: Date): Date {
  return new Date(Math.min(
    startedAt.getTime() + exam.durationMins * 60000,
    new Date(exam.endAt).getTime(),
  ));
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * THE PAPER, AS THE CANDIDATE SEES IT
 * ════════════════════════════════════════════════════════════════════════════════════════ */

export interface CandidateQuestion {
  itemId: string;
  sectionKey: string;
  order: number;
  type: string;
  marks: number;
  prompt: string;
  codeSnippet?: string;
  /** mcq — text only. Which one is correct is not in this shape at all. */
  options?: { id: string; text: string }[];
  /** live_code / sql */
  language?: string;
  starterCode?: string;
  functionSignature?: string;
  /** VISIBLE cases only, capped by the run policy. Hidden cases never leave the server. */
  sampleCases?: { input: string; expectedOutput: string }[];
  /** What the candidate has entered so far, so a reload restores the paper. */
  answer?: {
    selectedOptionIds?: string[];
    code?: string;
    text?: string;
    runsUsed: number;
  };
}

/**
 * Build the paper for one attempt.
 *
 * Assembled field by field from the bank rather than filtered. The difference matters: a
 * `.select('-correctOptionIds')` is one careless refactor away from shipping the answer key,
 * whereas a shape with no field for it cannot.
 */
export async function buildPaper(
  exam: IHackathonExam,
  attempt: IHackathonExamAttempt,
): Promise<CandidateQuestion[]> {
  const ids = attempt.drawnItems.map(d => d.itemId);
  const items = await AssessmentItem.find({ _id: { $in: ids } }).lean() as any[];
  const byId = new Map(items.map(i => [String(i._id), i]));
  const answerFor = new Map(attempt.answers.map(a => [String(a.itemId), a]));
  const maxSamples = Math.max(0, exam.runPolicy?.maxSampleCases ?? 0);

  const out: CandidateQuestion[] = [];
  for (const d of attempt.drawnItems) {
    const item = byId.get(String(d.itemId));
    if (!item) continue; // an item deleted from the bank mid-event; graded via the stored draw
    const a = answerFor.get(String(d.itemId));

    const q: CandidateQuestion = {
      itemId: String(d.itemId),
      sectionKey: d.sectionKey,
      order: d.order,
      type: d.type,
      marks: d.marks,
      prompt: item.prompt,
      codeSnippet: item.codeSnippet || undefined,
    };

    if (item.type === 'mcq') {
      q.options = (item.options || []).map((o: any) => ({ id: o.id, text: o.text }));
    }
    if (item.type === 'live_code' || item.type === 'sql') {
      q.language = item.language || (item.type === 'sql' ? 'sql' : undefined);
      q.starterCode = item.starterCode || '';
      q.functionSignature = item.functionSignature || undefined;
      q.sampleCases = (item.testCases || [])
        .filter((tc: any) => tc.hidden === false)
        .slice(0, maxSamples)
        .map((tc: any) => ({ input: tc.input, expectedOutput: tc.expectedOutput }));
    }

    if (a) {
      q.answer = {
        selectedOptionIds: a.selectedOptionIds,
        code: a.code,
        text: a.text,
        runsUsed: a.runCount || 0,
      };
    }
    out.push(q);
  }

  return out.sort((x, y) => x.sectionKey.localeCompare(y.sectionKey) || x.order - y.order);
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * LIFECYCLE
 * ════════════════════════════════════════════════════════════════════════════════════════ */

export interface DeviceInfo { sessionId?: string; ip?: string; userAgent?: string; fingerprint?: string }

/**
 * Begin, or resume.
 *
 * `startedAt` is stamped ONCE. Resuming after a crash, a flat battery or a closed lid must not
 * restart the clock — the time a candidate gets is measured from the first start, or the exam
 * is a stopwatch anybody can reset.
 */
export async function startAttempt(
  exam: IHackathonExam,
  attempt: IHackathonExamAttempt,
  dev: DeviceInfo,
): Promise<{ startedAt: Date; endsAt: Date; resumed: boolean }> {
  if (attempt.submittedAt) throw new ExamError('ALREADY_SUBMITTED', 'You have already submitted this exam.', 403);
  if (!attempt.otpVerifiedAt) throw new ExamError('NOT_VERIFIED', 'Verify your mobile number first.', 403);

  const err = windowError(exam, attempt);
  if (err) throw err;

  const now = new Date();
  const resumed = !!attempt.startedAt;
  if (!attempt.startedAt) {
    attempt.startedAt = now;
    attempt.status = 'started';
    attempt.expiresAt = deadlineFor(exam, now);
  }

  attempt.activeSessionId = dev.sessionId || attempt.activeSessionId;
  attempt.lastHeartbeat = now;
  if (dev.ip) attempt.ipAddress = dev.ip;
  if (dev.userAgent) attempt.userAgent = dev.userAgent;
  if (dev.fingerprint) attempt.deviceFingerprint = dev.fingerprint;
  await attempt.save();

  return { startedAt: attempt.startedAt!, endsAt: attempt.expiresAt!, resumed };
}

/**
 * Is somebody else sitting this paper right now?
 *
 * A stale session is not a second device — people close laptops and reconnect. The lock only
 * bites while the other session is demonstrably alive, which is what the heartbeat is for.
 */
const LIVE_SESSION_MS = 45_000;

export function secondDeviceConflict(attempt: IHackathonExamAttempt, incomingSessionId?: string): boolean {
  if (!attempt.startedAt || !attempt.activeSessionId || !incomingSessionId) return false;
  if (attempt.activeSessionId === incomingSessionId) return false;
  if (!attempt.lastHeartbeat) return false;
  return Date.now() - new Date(attempt.lastHeartbeat).getTime() < LIVE_SESSION_MS;
}

/** Save one answer. Returns the runs still available for that question. */
export async function saveAnswer(
  attempt: IHackathonExamAttempt,
  itemId: string,
  patch: { selectedOptionIds?: string[]; code?: string; language?: string; text?: string },
): Promise<void> {
  if (attempt.submittedAt) throw new ExamError('ALREADY_SUBMITTED', 'You have already submitted this exam.', 403);

  const drawn = attempt.drawnItems.find(d => String(d.itemId) === String(itemId));
  if (!drawn) throw new ExamError('NOT_IN_PAPER', 'That question is not part of your paper.', 400);

  /*
   * Write ONE answer, not the whole paper.
   *
   * attempt.save() rewrote the entire document on every autosave — thirty-one drawn
   * questions and every answer, code included — to record a few characters somebody had
   * just typed. With ninety people writing at once that is what took the platform down on
   * 22 Sep: not the volume of requests, which was modest, but the size of each write.
   *
   * It also raced. Two writes to the same document meant Mongoose's version check failed
   * the loser, and a candidate's answer came back as a 500 — losing real work to a
   * concurrent heartbeat.
   *
   * A positional $set touches one element of one array and does not carry the version, so
   * it cannot fail that way and cannot overwrite an answer to a different question.
   */
  const now = new Date();
  const set: Record<string, unknown> = { 'answers.$.answeredAt': now };
  if (patch.selectedOptionIds !== undefined) set['answers.$.selectedOptionIds'] = patch.selectedOptionIds;
  if (patch.code !== undefined) set['answers.$.code'] = patch.code;
  if (patch.language !== undefined) set['answers.$.language'] = patch.language;
  if (patch.text !== undefined) set['answers.$.text'] = patch.text;

  const hit = await HackathonExamAttempt.updateOne(
    { _id: attempt._id, 'answers.itemId': drawn.itemId },
    { $set: set },
  );

  /*
   * No element yet — the first time this question is answered. Guarded on the element still
   * being absent, so two saves arriving together create it once rather than twice.
   */
  if (!hit.matchedCount) {
    await HackathonExamAttempt.updateOne(
      { _id: attempt._id, 'answers.itemId': { $ne: drawn.itemId } },
      {
        $push: {
          answers: {
            itemId: drawn.itemId,
            sectionKey: drawn.sectionKey,
            runCount: 0,
            graded: false,
            answeredAt: now,
            ...(patch.selectedOptionIds !== undefined ? { selectedOptionIds: patch.selectedOptionIds } : {}),
            ...(patch.code !== undefined ? { code: patch.code } : {}),
            ...(patch.language !== undefined ? { language: patch.language } : {}),
            ...(patch.text !== undefined ? { text: patch.text } : {}),
          } as any,
        },
      },
    );
    /* If the guard lost the race the element now exists, so apply the fields to it. */
    await HackathonExamAttempt.updateOne(
      { _id: attempt._id, 'answers.itemId': drawn.itemId },
      { $set: set },
    );
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * PROCTORING
 * ════════════════════════════════════════════════════════════════════════════════════════ */

/** Which policy counter a violation counts against, if any. */
const COUNTS_AGAINST: Partial<Record<ViolationKind, 'tabSwitch' | 'fullscreen'>> = {
  tab_switch: 'tabSwitch',
  window_blur: 'tabSwitch',
  fullscreen_exit: 'fullscreen',
};

export interface ViolationOutcome {
  recorded: boolean;
  count: number;
  /** How many of this kind remain before the server ends the attempt. */
  remaining: number | null;
  autoSubmitted: boolean;
  message?: string;
}

/**
 * Record a proctoring signal and decide what follows.
 *
 * THE DECISION IS THE SERVER'S. The previous exam counted tab switches in React state and
 * called submit from the browser — a refresh reset it to zero, devtools removed it, and an
 * admin reviewing a suspicious score had nothing to look at. Here the count is durable, the
 * threshold is the stored policy, and the browser is informed of the outcome rather than
 * producing it.
 */
export async function recordViolation(
  exam: IHackathonExam,
  attempt: IHackathonExamAttempt,
  kind: ViolationKind,
  meta?: Record<string, any>,
): Promise<ViolationOutcome> {
  if (attempt.submittedAt) return { recorded: false, count: attempt.violationCount, remaining: null, autoSubmitted: false };

  attempt.violations.push({ kind, at: new Date(), meta });
  attempt.violationCount = attempt.violations.length;

  const axis = COUNTS_AGAINST[kind];
  let remaining: number | null = null;
  let autoSubmitted = false;
  let message: string | undefined;

  if (axis === 'tabSwitch' && exam.proctoring?.tabSwitch?.enabled) {
    const max = exam.proctoring.tabSwitch.maxWarnings;
    const used = attempt.violations.filter(v => COUNTS_AGAINST[v.kind] === 'tabSwitch').length;
    remaining = Math.max(0, max - used);
    if (used >= max && exam.proctoring.tabSwitch.autoSubmit) {
      await submitAttempt(exam, attempt, 'auto', `Left the exam ${used} times.`);
      return { recorded: true, count: attempt.violationCount, remaining: 0, autoSubmitted: true,
        message: 'Your exam was submitted because you left it too many times.' };
    }
    message = remaining > 0
      ? `Leaving the exam is recorded. ${remaining} warning${remaining === 1 ? '' : 's'} left.`
      : 'This was your last warning.';
  }

  if (axis === 'fullscreen' && exam.proctoring?.fullscreen?.required) {
    const max = exam.proctoring.fullscreen.maxExits;
    const used = attempt.violations.filter(v => v.kind === 'fullscreen_exit').length;
    remaining = Math.max(0, max - used);
    if (used >= max && exam.proctoring.fullscreen.autoSubmit) {
      await submitAttempt(exam, attempt, 'auto', `Left fullscreen ${used} times.`);
      return { recorded: true, count: attempt.violationCount, remaining: 0, autoSubmitted: true,
        message: 'Your exam was submitted because you left fullscreen too many times.' };
    }
  }

  await attempt.save();
  return { recorded: true, count: attempt.violationCount, remaining, autoSubmitted, message };
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * RUNNING CODE
 * ════════════════════════════════════════════════════════════════════════════════════════ */

export interface RunOutcome {
  output: string;
  error?: string;
  executionTimeMs: number;
  runsUsed: number;
  runsLeft: number | null;
  cases?: { input: string; expectedOutput: string; actualOutput: string; passed: boolean }[];
}

/**
 * Run a candidate's code against the VISIBLE sample cases.
 *
 * ── THE LIMITS ARE THE POINT ──────────────────────────────────────────────────────────────
 *
 * One Java execution costs about seven seconds of a full core (measured, see executionQueue).
 * Eight hundred candidates with an unthrottled Run button is not a slow exam, it is an outage:
 * everybody's runs cross the kill threshold at once and correct programs start reporting
 * infinite loops. The per-question cap and the cooldown are what keep that a queue.
 *
 * ── AND HIDDEN CASES ARE NEVER RUN HERE ───────────────────────────────────────────────────
 *
 * Running a hidden case reads out the answer key one test at a time. The candidate sees what
 * the author marked visible, and their score comes from the full set at grading.
 */
export async function runCandidateCode(
  exam: IHackathonExam,
  attempt: IHackathonExamAttempt,
  itemId: string,
  code: string,
  languageOverride?: string,
): Promise<RunOutcome> {
  if (attempt.submittedAt) throw new ExamError('ALREADY_SUBMITTED', 'You have already submitted this exam.', 403);
  if (!exam.runPolicy?.enabled) throw new ExamError('RUN_DISABLED', 'Running code is switched off for this exam.', 403);

  const drawn = attempt.drawnItems.find(d => String(d.itemId) === String(itemId));
  if (!drawn) throw new ExamError('NOT_IN_PAPER', 'That question is not part of your paper.', 400);

  const item = await AssessmentItem.findById(itemId).lean() as any;
  if (!item) throw new ExamError('ITEM_GONE', 'That question could not be loaded.', 404);

  let answer = attempt.answers.find(a => String(a.itemId) === String(itemId));
  if (!answer) {
    attempt.answers.push({ itemId: drawn.itemId, sectionKey: drawn.sectionKey, runCount: 0, graded: false } as IAttemptAnswer);
    answer = attempt.answers[attempt.answers.length - 1];
  }

  const max = exam.runPolicy.maxRunsPerQuestion;
  if (max > 0 && (answer.runCount || 0) >= max) {
    await recordViolation(exam, attempt, 'run_throttled', { itemId, reason: 'limit' });
    throw new ExamError('RUN_LIMIT', `You have used all ${max} runs for this question. Your answer is still saved and will be graded.`, 429);
  }

  const cooldown = exam.runPolicy.cooldownSeconds * 1000;
  if (cooldown > 0 && answer.lastRunAt) {
    const waited = Date.now() - new Date(answer.lastRunAt).getTime();
    if (waited < cooldown) {
      const left = Math.ceil((cooldown - waited) / 1000);
      throw new ExamError('RUN_COOLDOWN', `Please wait ${left}s before running again.`, 429);
    }
  }

  /* Count and save the attempt BEFORE executing. A run that crashes the process still cost a
   * slot, and not charging for it is how a retry loop becomes free. */
  answer.runCount = (answer.runCount || 0) + 1;
  answer.lastRunAt = new Date();
  if (code !== undefined) answer.code = code;
  if (languageOverride) answer.language = languageOverride;
  await attempt.save();

  const language = languageFor(item, languageOverride) as ProgrammingLanguage;
  const samples = (item.testCases || []).filter((tc: any) => tc.hidden === false)
    .slice(0, Math.max(0, exam.runPolicy.maxSampleCases));

  const runsLeft = max > 0 ? Math.max(0, max - answer.runCount) : null;

  if (!samples.length) {
    const r = await codeRunner.execute({
      code, language, input: '', expectedOutput: '', timeLimit: 10000, memoryLimit: 256,
    }).catch((e: any) => ({ output: '', error: e?.message || 'Execution failed', executionTime: 0 } as any));
    return {
      output: r.output || '', error: r.compilationError || r.error || undefined,
      executionTimeMs: r.executionTime || 0, runsUsed: answer.runCount, runsLeft,
    };
  }

  const cases = [];
  for (const tc of samples) {
    const r: any = await codeRunner.execute({
      code, language, input: tc.input, expectedOutput: tc.expectedOutput, timeLimit: 10000, memoryLimit: 256,
    }).catch((e: any) => ({ passed: false, output: '', error: e?.message || 'Execution failed', executionTime: 0 }));
    cases.push({
      input: tc.input, expectedOutput: tc.expectedOutput,
      actualOutput: r.compilationError || r.error || r.output || '', passed: !!r.passed,
    });
  }

  return {
    output: cases.map(c => c.actualOutput).join('\n'),
    executionTimeMs: 0,
    runsUsed: answer.runCount,
    runsLeft,
    cases,
  };
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * SUBMIT
 * ════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * End the paper and queue it for grading.
 *
 * NOTHING IS GRADED HERE. A Java run costs ~7s of a core and eight hundred people submit
 * within minutes of each other; grading inline would either time out the request or saturate
 * the execution tier and tell a candidate their correct solution failed. The attempt goes to
 * `grading.status = 'pending'` and a worker takes it with retries. Results are admin-published
 * anyway, so nobody is waiting.
 *
 * `timeSpentSec` is computed from the stored `startedAt`, never from anything the client sends
 * — it is a leaderboard tiebreaker, which makes it worth lying about.
 */
export async function submitAttempt(
  exam: IHackathonExam,
  attempt: IHackathonExamAttempt,
  by: 'candidate' | 'auto',
  reason?: string,
): Promise<{ submittedAt: Date; timeSpentSec: number }> {
  if (attempt.submittedAt) {
    return { submittedAt: attempt.submittedAt, timeSpentSec: attempt.timeSpentSec || 0 };
  }

  const now = new Date();
  const started = attempt.startedAt ? new Date(attempt.startedAt) : now;
  attempt.submittedAt = now;
  attempt.timeSpentSec = Math.max(0, Math.round((now.getTime() - started.getTime()) / 1000));
  attempt.status = by === 'auto' ? 'auto_submitted' : 'submitted';
  if (by === 'auto') attempt.autoSubmitReason = reason;
  attempt.totalMarks = attempt.drawnItems.reduce((s, d) => s + d.marks, 0);
  attempt.grading.status = 'pending';
  attempt.grading.attempts = 0;
  await attempt.save();

  return { submittedAt: now, timeSpentSec: attempt.timeSpentSec };
}

/**
 * Close out everyone the window ran out on.
 *
 * Two groups, and they are not the same thing: somebody who started and never pressed submit
 * has work that must be graded, while somebody who never started is a `no_show` scoring zero
 * into their team's average. Leaving either as `started` would hold the whole event's results
 * open forever.
 */
export async function sweepExpiredAttempts(exam: IHackathonExam, now = new Date()): Promise<{ autoSubmitted: number; noShows: number }> {
  let autoSubmitted = 0;

  const running = await HackathonExamAttempt.find({
    examId: exam._id, status: 'started', submittedAt: null,
    expiresAt: { $ne: null, $lte: now },
  });
  for (const a of running) {
    await submitAttempt(exam, a, 'auto', 'Time ran out.');
    autoSubmitted++;
  }

  let noShows = 0;
  if (now >= new Date(exam.endAt)) {
    const res = await HackathonExamAttempt.updateMany(
      { examId: exam._id, status: { $in: ['invited', 'verified'] } },
      { $set: { status: 'no_show', score: 0, percentage: 0, 'grading.status': 'graded', 'grading.completedAt': now } },
    );
    noShows = res.modifiedCount || 0;
  }

  return { autoSubmitted, noShows };
}

export async function examById(examId: string): Promise<IHackathonExam> {
  const exam = await HackathonExam.findById(examId);
  if (!exam) throw new ExamError('NOT_FOUND', 'Exam not found.', 404);
  return exam;
}

export async function examForAttempt(attempt: IHackathonExamAttempt): Promise<IHackathonExam> {
  return examById(String(attempt.examId));
}

export const _internal = { newExamToken, LIVE_SESSION_MS };
