/**
 * communicationGamificationService — achievements + leaderboard for the Communication Lab.
 * Achievements are awarded on the backend (never trusted from the client); the leaderboard
 * ranks by consistency + average + streak, not a single lucky attempt.
 */
import mongoose from 'mongoose';
import CommunicationAchievement from '../models/CommunicationAchievement';
import CommunicationAttempt from '../models/CommunicationAttempt';
import CommunicationStreak from '../models/CommunicationStreak';
import User from '../models/User';
import { IEvaluation } from '../models/CommunicationAttempt';

export interface AchievementDef {
  code: string; name: string; description: string; icon: string;
  kind: 'streak' | 'score' | 'skill'; target?: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: 'first_step', name: 'First Step', description: 'Complete your first practice', icon: '🌱', kind: 'streak', target: 1 },
  { code: 'three_day', name: 'Three-Day Starter', description: 'Complete 3 consecutive days', icon: '🔥', kind: 'streak', target: 3 },
  { code: 'seven_day', name: 'Seven-Day Speaker', description: 'Complete 7 consecutive days', icon: '⚡', kind: 'streak', target: 7 },
  { code: 'thirty_day', name: 'Thirty-Day Champion', description: 'Complete 30 consecutive days', icon: '🏆', kind: 'streak', target: 30 },
  { code: 'confident', name: 'Confident Speaker', description: 'Score above 80', icon: '💪', kind: 'score', target: 80 },
  { code: 'interview_ready', name: 'Interview Ready', description: 'Score above 90', icon: '🎯', kind: 'score', target: 90 },
  { code: 'elite', name: 'Elite Communicator', description: 'Score above 95', icon: '👑', kind: 'score', target: 95 },
  { code: 'filler_free', name: 'Filler-Free', description: 'Use fewer than 3 filler words', icon: '🧯', kind: 'skill' },
  { code: 'perfect_pace', name: 'Perfect Pace', description: 'Maintain recommended speaking speed', icon: '🎚', kind: 'skill' },
  { code: 'project_expert', name: 'Project Expert', description: 'Score above 90 in project explanation', icon: '🛠', kind: 'skill', target: 90 },
];

/** Award any newly-earned achievements after a submission. */
export async function evaluateAchievements(tenantId: string, studentId: string, streak: { currentStreak: number; longestStreak: number; totalCompletedDays: number }, ev: IEvaluation): Promise<void> {
  const earnedNow: string[] = [];
  if (streak.totalCompletedDays >= 1) earnedNow.push('first_step');
  if (streak.longestStreak >= 3) earnedNow.push('three_day');
  if (streak.longestStreak >= 7) earnedNow.push('seven_day');
  if (streak.longestStreak >= 30) earnedNow.push('thirty_day');
  if (ev.overallScore >= 80) earnedNow.push('confident');
  if (ev.overallScore >= 90) earnedNow.push('interview_ready');
  if (ev.overallScore >= 95) earnedNow.push('elite');
  if ((ev.fillerWords?.total ?? 99) < 3) earnedNow.push('filler_free');
  if (ev.speakingSpeed?.status === 'GOOD') earnedNow.push('perfect_pace');
  if ((ev.projectExplanationScore ?? 0) >= 90) earnedNow.push('project_expert');

  await Promise.all(earnedNow.map((code) =>
    CommunicationAchievement.updateOne(
      { tenantId, studentId, achievementCode: code },
      { $setOnInsert: { earned: true, earnedAt: new Date() } },
      { upsert: true }
    ).catch(() => {})
  ));
}

/** All badges with earned status + rough progress for locked ones. */
export async function getAchievementsForStudent(tenantId: string, studentId: string) {
  const [rows, streak, best] = await Promise.all([
    CommunicationAchievement.find({ tenantId, studentId }).lean(),
    CommunicationStreak.findOne({ tenantId, studentId }).lean(),
    CommunicationAttempt.findOne({ tenantId, studentId, status: 'completed' }).sort({ 'evaluation.overallScore': -1 }).select('evaluation.overallScore evaluation.projectExplanationScore').lean() as any,
  ]);
  const earnedMap: Record<string, any> = {}; rows.forEach((r: any) => { earnedMap[r.achievementCode] = r; });
  const bestScore = best?.evaluation?.overallScore || 0;
  const bestProject = best?.evaluation?.projectExplanationScore || 0;
  const longest = streak?.longestStreak || 0;

  return ACHIEVEMENTS.map((a) => {
    const e = earnedMap[a.code];
    let progress = 0;
    if (e?.earned) progress = 100;
    else if (a.kind === 'streak' && a.target) progress = Math.min(100, Math.round((longest / a.target) * 100));
    else if (a.code === 'project_expert' && a.target) progress = Math.min(100, Math.round((bestProject / a.target) * 100));
    else if (a.kind === 'score' && a.target) progress = Math.min(100, Math.round((bestScore / a.target) * 100));
    return { ...a, earned: !!e?.earned, earnedAt: e?.earnedAt || null, progress };
  });
}

/** Batch leaderboard ranked by average + streak + consistency (not one lucky attempt). */
export async function computeLeaderboard(tenantId: string, callerId: string, batchId?: string) {
  const uFilter: any = { tenantId, role: 'STUDENT', isActive: { $ne: false } };
  if (batchId && mongoose.isValidObjectId(batchId)) uFilter.batchId = new mongoose.Types.ObjectId(batchId);
  const students = await User.find(uFilter).select('firstName lastName batchId').lean();
  const ids = students.map((s: any) => s._id);
  if (!ids.length) return { rows: [], me: null };

  const [agg, streaks] = await Promise.all([
    CommunicationAttempt.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), studentId: { $in: ids }, status: 'completed' } },
      { $group: { _id: '$studentId', count: { $sum: 1 }, avg: { $avg: '$evaluation.overallScore' } } },
    ]),
    CommunicationStreak.find({ tenantId, studentId: { $in: ids } }).lean(),
  ]);
  const aggMap: Record<string, any> = {}; agg.forEach((a: any) => { aggMap[String(a._id)] = a; });
  const streakMap: Record<string, any> = {}; streaks.forEach((s: any) => { streakMap[String(s.studentId)] = s; });

  const scored = students.map((s: any) => {
    const id = String(s._id);
    const a = aggMap[id] || { count: 0, avg: 0 };
    const st = streakMap[id] || { currentStreak: 0, totalCompletedDays: 0 };
    const avg = Math.round(a.avg || 0);
    const composite = Math.round(avg * 0.5 + Math.min(st.currentStreak, 30) / 30 * 100 * 0.25 + Math.min(st.totalCompletedDays, 30) / 30 * 100 * 0.25);
    return { studentId: id, name: s.firstName || 'Student', avg, count: a.count, streak: st.currentStreak, days: st.totalCompletedDays, composite };
  }).filter((r) => r.count > 0);

  scored.sort((a, b) => b.composite - a.composite || b.avg - a.avg);
  const rows = scored.map((r, i) => ({ rank: i + 1, ...r }));
  const meIdx = rows.findIndex((r) => r.studentId === callerId);
  return { rows: rows.slice(0, 10), me: meIdx >= 0 ? rows[meIdx] : null };
}
