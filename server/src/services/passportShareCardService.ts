import mongoose from 'mongoose';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import PassportProgress from '../models/PassportProgress';
import PassportInterview from '../models/PassportInterview';
import PassportResume from '../models/PassportResume';
import PassportAssessment, { categoriesOf } from '../models/PassportAssessment';
import StudentSkillProfile from '../models/StudentSkillProfile';
import CareerSkill from '../models/CareerSkill';
import CareerRoadmap from '../models/CareerRoadmap';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import LearningCurriculum from '../models/LearningCurriculum';
import QuizAttempt from '../models/QuizAttempt';
import MockTestAttempt from '../models/MockTestAttempt';
import { CoinAccount } from '../models/CoinModels';
import { resolveAssessedState } from './memberAssessmentStateService';
import { ensureContent, poolMapOf, dayNumber, clampSlots } from './passportMissionService';
import { buildRoadmap } from './passportRoadmapService';
import { PRACTICE_BANK } from './passportPracticeService';
import { CAREER_STAGES, memberAxes } from './careerStageService';
import * as g from './passportGamificationService';
import { LEVELS } from './passportScoringService';

/**
 * THE SHAREABLE CAREERPILOT CARD — one payload for the public page and the in-app share dialog.
 *
 * The dialog used to draw from the dashboard payload the layout loaded once when the member
 * arrived, and the public page from the score stored on the passport. So the card never moved
 * while a member practised: the dialog showed whatever was true when they logged in, and the
 * public page showed a score that only changes when an assessment is submitted. Both now read
 * this, computed on every request.
 *
 * The coder score here is the same composite Home shows ("Coder score … / 1000"), built from the
 * same inputs in the same way as getDashboard, so the card and Home agree.
 *
 * PRIVACY: this is served without authentication to anyone holding the link. It carries the
 * member's name, optional photo and their progress figures — never email, phone, college,
 * answers, or anything else from the profile.
 */
export interface ShareCard {
  name: string;
  photo: string | null;
  stage: string | null;
  track: string | null;
  role: string | null;
  careerGoal: string | null;
  memberSince: string | null;
  /** 0–100 role readiness, from the assessment; null until measured. */
  careerScore: number | null;
  careerLevel: string | null;
  /** 0–1000 composite, the live score that moves with practice (Home's coder score). */
  coderScore: number;
  level: { level: number; title: string; progressPct: number; xpToNextLevel: number; nextTitle: string };
  stats: {
    xp: number;
    streak: number;
    longestStreak: number;
    coins: number | null;
    solved: number;
    daysCompleted: number;
    totalDays: number | null;
    testsPassed: number;
    interviews: number;
  };
  topSkills: { key: string; name: string; score: number }[];
  updatedAt: string;
}

const LEVEL_LABEL: Record<string, string> = Object.fromEntries(LEVELS.map(l => [l.key, l.label]));

const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
  try { return await p; } catch { return fallback; }
};

export async function buildShareCard(user: any): Promise<ShareCard> {
  const tenantId = String(user.tenantId || '');
  const studentId = String(user._id);
  const sid = new mongoose.Types.ObjectId(studentId);
  const p = user.passport || {};

  const [progress, content, assessment, interviews, resume, profileDoc, roadmapDoc] = await Promise.all([
    PassportProgress.findOne({ tenantId, studentId }).lean() as any,
    ensureContent(tenantId),
    PassportAssessment.findOne({ tenantId }).lean() as any,
    PassportInterview.find({ tenantId, studentId, status: 'completed' }).select('evaluation').lean() as any,
    PassportResume.findOne({ tenantId, studentId }).select('score').lean() as any,
    safe(StudentProfile.findOne({ userId: sid }).select('personalInfo.profilePhoto').lean() as any, null),
    safe(CareerRoadmap.findOne({ tenantId, studentId: sid, status: 'ACTIVE' }).select('roleName').lean() as any, null),
  ]);

  const assessed = await resolveAssessedState({
    tenantId, studentId, passport: p, categories: categoriesOf(assessment),
  });
  const attempt: any = assessed.attempt;

  const xp = progress?.xp || 0;
  const solved: string[] = progress?.solvedProblems || [];
  const totalDaysLegacy = content.journeyDays || 90;

  /* Mirrors getDashboard: the legacy roadmap's completed days feed the coder score. */
  let legacyCompletedDays = 0;
  if (attempt && progress) {
    const roadmap = buildRoadmap({
      attempt,
      pools: poolMapOf(content.missionPools, memberAxes(user)),
      pathways: content.pathways,
      totalDays: totalDaysLegacy,
      startDate: progress.startDate,
      currentDay: dayNumber(progress.startDate, new Date()),
      completedKeys: new Set((progress.completed || []).map((c: any) => c.key)),
      slotsPerDay: clampSlots((content as any)?.missionsPerDay),
    });
    legacyCompletedDays = roadmap.completedDays;
  }
  const bestInterview = (interviews as any[]).reduce<number | null>(
    (best, i: any) => Math.max(best ?? 0, i?.evaluation?.overallScore ?? 0) || null, null);
  const coder = g.coderScore({
    careerScore: attempt?.careerScore ?? null,
    solvedCount: solved.length,
    totalProblems: PRACTICE_BANK.length,
    completedDays: legacyCompletedDays,
    totalDays: totalDaysLegacy,
    interviewsCompleted: (interviews as any[]).length,
    bestInterviewScore: bestInterview,
    resumeScore: resume?.score?.total ?? null,
  });

  /* Days done in the member's plan: their journey when they have one, the legacy plan otherwise. */
  const journey = await safe(CurriculumEnrollment.findOne({ tenantId, studentId: sid, enrolledBy: 'foundation-journey' })
    .sort({ createdAt: -1 }).select('curriculumId completedDays').lean() as any, null);
  let daysCompleted = legacyCompletedDays;
  let totalDays: number | null = attempt ? totalDaysLegacy : null;
  if (journey?.curriculumId) {
    const cur: any = await safe(LearningCurriculum.findById(journey.curriculumId).select('totalDays').lean() as any, null);
    daysCompleted = new Set(((journey.completedDays || []) as number[]).map(Number)).size;
    totalDays = cur?.totalDays || null;
  }

  const [quizPassed, mocksPassed, coins, skillRows] = await Promise.all([
    safe(QuizAttempt.countDocuments({ tenantId, studentId, passed: true }), 0),
    safe(MockTestAttempt.countDocuments({ tenantId, studentId: sid, passed: true }), 0),
    safe(CoinAccount.findOne({ tenantId, studentId: sid }).select('balance').lean() as any, null),
    safe(StudentSkillProfile.find({ tenantId, studentId: sid }).select('skillKey score')
      .sort({ score: -1, updatedAt: -1 }).limit(3).lean() as any, [] as any[]),
  ]);
  const skillNames = new Map<string, string>(
    ((await safe(CareerSkill.find({ key: { $in: (skillRows as any[]).map(s => s.skillKey) } }).select('key name').lean() as any, [])) as any[])
      .map((s: any) => [s.key, s.name]),
  );

  const lv = g.levelFromXp(xp);
  const pathwayLabel = attempt?.pathwayLabel
    || (content.pathways || []).find((pw: any) => pw.key === p.pathway)?.label
    || null;
  const stageLabel = CAREER_STAGES.find(s => s.key === p.stage)?.label || null;
  const photo = profileDoc?.personalInfo?.profilePhoto || user.avatar || null;

  return {
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'CodeBegun Learner',
    photo: typeof photo === 'string' && /^(\/uploads\/|https?:\/\/)/.test(photo) ? photo : null,
    stage: stageLabel,
    track: pathwayLabel,
    role: roadmapDoc?.roleName || null,
    careerGoal: p.careerGoal || null,
    memberSince: p.activatedAt ? new Date(p.activatedAt).toISOString() : null,
    careerScore: assessed.careerScore ?? null,
    careerLevel: assessed.level ? (LEVEL_LABEL[assessed.level] || assessed.level) : null,
    coderScore: coder.score,
    level: { level: lv.level, title: lv.title, progressPct: lv.progressPct, xpToNextLevel: lv.xpToNextLevel, nextTitle: lv.nextTitle },
    stats: {
      xp,
      streak: progress?.streak || 0,
      longestStreak: Math.max(progress?.longestStreak || 0, progress?.streak || 0),
      coins: coins ? coins.balance || 0 : null,
      solved: solved.length,
      daysCompleted,
      totalDays,
      testsPassed: (quizPassed as number) + (mocksPassed as number),
      interviews: (interviews as any[]).length,
    },
    topSkills: (skillRows as any[]).map(s => ({
      key: s.skillKey,
      name: skillNames.get(s.skillKey) || String(s.skillKey).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
      score: Math.round(s.score || 0),
    })),
    updatedAt: new Date().toISOString(),
  };
}
