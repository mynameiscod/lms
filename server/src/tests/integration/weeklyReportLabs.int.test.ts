/**
 * The weekly report with both labs (2026-11-26), against a real database.
 *
 * - Communication Lab and Thinking Lab: expected days (scheduled → practice pass → none), done,
 *   missed, AI scores; a lab with nothing expected stays out of the score.
 * - Quizzes and assignments given through Assign to Batches count as set this week, and the ones
 *   left undone by their due date are named as missed.
 * - Batch / all / automatic sends skip students with nothing that week and those already sent.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

const mails: { to: string; subject: string; html: string }[] = [];
jest.mock('../../services/emailService', () => ({
  EmailService: class {
    async sendGenericEmail(to: string, subject: string, html: string) { mails.push({ to, subject, html }); return true; }
    async sendAssignmentNotificationEmail() { return true; }
    async sendQuizNotificationEmail() { return true; }
  },
}));

import User from '../../models/User';
import Batch from '../../models/Batch';
import Tenant from '../../models/Tenant';
import Quiz from '../../models/Quiz';
import AssessmentSchedule from '../../models/AssessmentSchedule';
import CommunicationSchedule from '../../models/CommunicationSchedule';
import CommunicationAttempt from '../../models/CommunicationAttempt';
import DailyChallenge from '../../models/DailyChallenge';
import WeeklyReportSetting from '../../models/WeeklyReportSetting';
import { PlacementDeskDrive, PlacementDeskCandidate } from '../../models/PlacementDesk';
import { AssignmentType } from '../../models/Assignment';
import assignmentService from '../../services/assignmentService';
import { weeklyReportService } from '../../services/weeklyReportService';
import { communicationWeek, weekDates } from '../../services/weeklyReportLabs';
import { getWeeklyReportEmailHtml } from '../../services/weeklyReportEmailTemplate';
import { sendMany } from '../../services/weeklyReportSender';
import { runWeeklyReportTick } from '../../jobs/weeklyReportCron';

const ADMIN = new mongoose.Types.ObjectId();
let TENANT: string;
let BATCH_A: any, BATCH_B: any;
let s1: any, s3: any;

const WEEK = '2026-11-16'; // Mon 16 – Sun 22 Nov 2026
/** A local time on a day of that week (the report's week is in server-local time). */
const at = (day: number, h = 12) => new Date(2026, 10, day, h, 0, 0);

const evaluation = (overall: number) => ({
  overallScore: overall, clarityScore: 70, fluencyScore: 60, grammarScore: 90, confidenceScore: 50,
  speakingSpeed: { wordsPerMinute: 120, status: 'ok', recommendedRange: '110-150' },
  fillerWords: { total: 4, words: {} },
  strengths: ['Clear structure'], areasToImprove: ['Fewer filler words'], nextPracticeFocus: 'Slow down at the start',
});

beforeAll(startMongo);
afterAll(stopMongo);
beforeEach(async () => {
  mails.length = 0;
  const t: any = await Tenant.create({ name: 'Inst', slug: `inst-${Date.now()}`, adminId: ADMIN } as any);
  TENANT = String(t._id);
  BATCH_A = await Batch.create({ name: 'Batch A', tenantId: TENANT, startDate: at(1), endDate: at(30), isActive: true } as any);
  BATCH_B = await Batch.create({ name: 'Batch B', tenantId: TENANT, startDate: at(1), endDate: at(30), isActive: true } as any);
  s1 = await User.create({ tenantId: TENANT, firstName: 'Asha', lastName: 'K', email: 's1@x.com', password: 'x', role: 'STUDENT', isActive: true, batchId: BATCH_A._id } as any);
  s3 = await User.create({ tenantId: TENANT, firstName: 'Quiet', lastName: 'Q', email: 's3@x.com', password: 'x', role: 'STUDENT', isActive: true, batchId: BATCH_B._id } as any);

  // Communication Lab: 3 scheduled days for Batch A, done on one of them (+1 unscheduled day).
  const challengeId = new mongoose.Types.ObjectId();
  for (const d of ['2026-11-17', '2026-11-18', '2026-11-19']) {
    await CommunicationSchedule.create({ tenantId: TENANT, batchId: BATCH_A._id, date: d, challengeId });
  }
  await CommunicationAttempt.create({ tenantId: TENANT, studentId: s1._id, challengeId, practiceDate: '2026-11-17', status: 'completed', evaluation: evaluation(80) } as any);
  await CommunicationAttempt.create({ tenantId: TENANT, studentId: s1._id, challengeId, practiceDate: '2026-11-21', status: 'completed', evaluation: evaluation(60) } as any);
  // Last week, for the trend.
  await CommunicationAttempt.create({ tenantId: TENANT, studentId: s1._id, challengeId, practiceDate: '2026-11-10', status: 'completed', evaluation: evaluation(50) } as any);

  // Thinking Lab: nothing scheduled, no practice pass → practised on one day, not expected.
  await DailyChallenge.create({ tenantId: TENANT, studentId: s1._id, date: '2026-11-20', problemId: new mongoose.Types.ObjectId(), status: 'solved', passed: true, score: 90, difficulty: 'medium', hintsUsed: 1, aiFeedback: { strengths: ['Good edge cases'], weaknesses: ['Slow to start'] } } as any);

  // A quiz given to Batch A through Assign to Batches (its own audience is empty), due mid-week.
  const quiz: any = await Quiz.create({
    title: 'Arrays check', tenantId: TENANT, createdBy: String(ADMIN), startDate: at(1), endDate: at(1).getTime() + 3650 * 86_400_000,
    startTime: '00:00', endTime: '23:59', totalMarks: 10, totalTime: 10, access: 'public', accessibleTo: 'batch_wise', selectedBatches: [], isActive: true,
  } as any);
  await AssessmentSchedule.create({ tenantId: TENANT, contentType: 'quiz', contentId: quiz._id, batchId: BATCH_A._id, startAt: at(16, 9), dueAt: at(19, 18), status: 'active' } as any);

  // An assignment given to Batch A, due in the week, never handed in.
  const a: any = await assignmentService.create({
    tenant: new mongoose.Types.ObjectId(TENANT) as any, createdBy: ADMIN as any, title: 'Linked lists', type: AssignmentType.THEORY, accessibleTo: 'batch_wise', selectedBatches: [],
  } as any);
  await assignmentService.publish(a._id, new mongoose.Types.ObjectId(TENANT) as any, ADMIN as any);
  await AssessmentSchedule.create({ tenantId: TENANT, contentType: 'assignment', contentId: a._id, batchId: BATCH_A._id, startAt: at(16, 9), dueAt: at(20, 23), status: 'active' } as any);
});
afterEach(clearCollections);

describe('the report', () => {
  it('counts the labs, the batch-assigned work, and scores only what was expected', async () => {
    const r = (await weeklyReportService.getReport(String(s1._id), TENANT, WEEK))!;

    expect(r.communication.source).toBe('scheduled');
    expect(r.communication.expectedDays).toBe(3);
    expect(r.communication.doneDays).toBe(1);
    expect(r.communication.missedDays).toBe(2);
    expect(r.communication.activeDays).toBe(2);
    expect(r.communication.recordings).toBe(2);
    expect(r.communication.avgScore).toBe(70);
    expect(r.communication.lastWeekAvg).toBe(50);
    expect(r.communication.skills.map(s => s.label)).toEqual(['Clarity', 'Fluency', 'Grammar', 'Confidence']);
    expect(r.communication.focus).toBe('Slow down at the start');

    expect(r.thinking.source).toBe('none');
    expect(r.thinking.expectedDays).toBe(0);
    expect(r.thinking.activeDays).toBe(1);
    expect(r.thinking.solved).toBe(1);
    expect(r.thinking.difficulty.medium).toBe(1);

    expect(r.quizzes.assigned).toBe(1);
    expect(r.quizzes.missed).toBe(1);
    expect(r.quizzes.missedTitles).toEqual(['Arrays check']);
    expect(r.assignments.assigned).toBe(1);
    expect(r.assignments.missed).toBe(1);
    expect(r.assignments.missedTitles).toEqual(['Linked lists']);

    const g = Object.fromEntries(r.glance.map(x => [x.key, x]));
    expect(g.communication.state).toBe('partial');
    expect(g.communication.detail).toBe('1/3 days');
    expect(g.thinking.state).toBe('done');
    expect(g.thinking.detail).toBe('Practised 1 day');
    expect(g.quizzes.state).toBe('missed');
    expect(g.assignments.state).toBe('missed');
    expect(g.interview.state).toBe('none');

    // Quizzes 0 (w25) + assignments 0 (w25) + Communication Lab round(1/3 × 70) = 23 (w10).
    // The Thinking Lab had nothing expected, so it is left out.
    expect(r.overall.score).toBe(Math.round((23 * 10) / 60));
    expect(r.isEmpty).toBe(false);
  });

  it('a student with nothing set and nothing done is empty', async () => {
    const r = (await weeklyReportService.getReport(String(s3._id), TENANT, WEEK))!;
    expect(r.isEmpty).toBe(true);
    expect(r.glance.every(x => x.state === 'none')).toBe(true);
  });

  it('with no schedule, the practice pass days are the expected days', async () => {
    const dates = weekDates(WEEK);
    const practice = dates.map((d, i) => ({ date: d, excused: i >= 5 ? 'weekly_off' : null, required: { communication: 1, thinking_lab: 1 } }));
    const w = await communicationWeek(TENANT, String(s1._id), null, dates, practice);
    expect(w.source).toBe('practice');
    expect(w.expectedDays).toBe(5);       // Mon–Fri
    expect(w.doneDays).toBe(1);           // Tue 17
    expect(w.days.find(d => d.date === '2026-11-21')).toMatchObject({ expected: false, done: true }); // Sat, done anyway
  });

  it('the email shows both labs, the missed work, and the CodeBegun header', async () => {
    const r = (await weeklyReportService.getReport(String(s1._id), TENANT, WEEK))!;
    const html = getWeeklyReportEmailHtml(r);
    expect(html).toContain('data-cb-logo="header"');
    expect(html).toContain('#051D64');
    expect(html).toContain('This week at a glance');
    expect(html).toContain('AI Communication Lab');
    expect(html).toContain('Thinking Lab');
    expect(html).toContain('Arrays check');
    expect(html).toContain('Linked lists');
    expect(html).toContain('Slow down at the start');
    expect(html).toContain('Nothing was set this week for: Classes, Mock interview.');

    const empty = getWeeklyReportEmailHtml((await weeklyReportService.getReport(String(s3._id), TENANT, WEEK))!);
    expect(empty).toContain('No score this week');
  });
});

describe('placement drives', () => {
  it('shows only drives the student attended this week, never the result', async () => {
    const companyId = new mongoose.Types.ObjectId();
    const mk = (companyName: string, day: string, status = 'completed') => PlacementDeskDrive.create({
      tenantId: TENANT, companyId, companyName, date: new Date(`${day}T00:00:00Z`), day, role: 'Java Developer', mode: 'on_campus', status,
    } as any);
    const went = await mk('Acme Infotech', '2026-11-19');
    const skipped = await mk('Beta Systems', '2026-11-20');
    const cancelled = await mk('Gamma Corp', '2026-11-18', 'cancelled');
    const lastWeek = await mk('Delta Labs', '2026-11-12');
    const cand = (driveId: any, studentId: any, status: string) => PlacementDeskCandidate.create({
      tenantId: TENANT, driveId, companyId, day: '2026-11-19', kind: 'student', studentId, name: 'x', status, companyFeedback: 'Weak on SQL',
    } as any);
    await cand(went._id, s1._id, 'rejected');          // went; the result must not show
    await PlacementDeskCandidate.create({ tenantId: TENANT, driveId: skipped._id, companyId, day: '2026-11-20', kind: 'student', studentId: s1._id, name: 'x', status: 'no_show' } as any);
    await PlacementDeskCandidate.create({ tenantId: TENANT, driveId: cancelled._id, companyId, day: '2026-11-18', kind: 'student', studentId: s1._id, name: 'x', status: 'attended' } as any);
    await PlacementDeskCandidate.create({ tenantId: TENANT, driveId: lastWeek._id, companyId, day: '2026-11-12', kind: 'student', studentId: s1._id, name: 'x', status: 'attended' } as any);
    // A student with nothing else that week but a drive is not "empty".
    await PlacementDeskCandidate.create({ tenantId: TENANT, driveId: went._id, companyId, day: '2026-11-19', kind: 'student', studentId: s3._id, name: 'y', status: 'attended' } as any);

    const r = (await weeklyReportService.getReport(String(s1._id), TENANT, WEEK))!;
    expect(r.drives).toEqual([{ company: 'Acme Infotech', role: 'Java Developer', day: '2026-11-19', mode: 'On campus' }]);
    const html = getWeeklyReportEmailHtml(r);
    expect(html).toContain('Placement drives');
    expect(html).toContain('Acme Infotech');
    expect(html).not.toMatch(/Beta Systems|Gamma Corp|Delta Labs|Weak on SQL|rejected/i);

    const quiet = (await weeklyReportService.getReport(String(s3._id), TENANT, WEEK))!;
    expect(quiet.isEmpty).toBe(false);
  });

  it('no drive attended → no drives section', async () => {
    const r = (await weeklyReportService.getReport(String(s1._id), TENANT, WEEK))!;
    expect(r.drives).toEqual([]);
    expect(getWeeklyReportEmailHtml(r)).not.toContain('Placement drives');
  });
});

describe('sending', () => {
  it('skips students with nothing that week, and does not send a week twice', async () => {
    const first = await sendMany(TENANT, [String(s1._id), String(s3._id)], { weekStart: WEEK, channels: ['email'], skipEmpty: true, skipAlreadySent: true });
    expect(first).toMatchObject({ sent: 1, skippedEmpty: 1, failed: 0 });
    expect(mails.map(m => m.to)).toEqual(['s1@x.com']);
    expect(mails[0].subject).toMatch(/^Your weekly report: \d+\/100/);

    const again = await sendMany(TENANT, [String(s1._id), String(s3._id)], { weekStart: WEEK, channels: ['email'], skipEmpty: true, skipAlreadySent: true });
    expect(again).toMatchObject({ sent: 0, skippedAlreadySent: 1, skippedEmpty: 1 });
    expect(mails).toHaveLength(1);
  });

  it('the Monday run waits for 8 AM, runs once a week, and only where it is switched on', async () => {
    await WeeklyReportSetting.create({ tenantId: TENANT, autoSend: true, channels: ['email'] });
    // A Monday 07:00 IST tick does nothing.
    expect(await runWeeklyReportTick(new Date(Date.UTC(2026, 10, 30, 7, 0)))).toBe(0);
    // Tuesday: runs, and records the result.
    expect(await runWeeklyReportTick(new Date(Date.UTC(2026, 11, 1, 10, 0)))).toBe(1);
    const row: any = await WeeklyReportSetting.findOne({ tenantId: TENANT }).lean();
    expect(row.lastAutoWeek).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row.lastAutoResult).toBeTruthy();
    // Again the same week: nothing.
    expect(await runWeeklyReportTick(new Date(Date.UTC(2026, 11, 1, 11, 0)))).toBe(0);
    // Switched off: nothing even for a new week.
    await WeeklyReportSetting.updateOne({ tenantId: TENANT }, { $set: { autoSend: false, lastAutoWeek: '2000-01-03' } });
    expect(await runWeeklyReportTick(new Date(Date.UTC(2026, 11, 1, 12, 0)))).toBe(0);
  });
});
