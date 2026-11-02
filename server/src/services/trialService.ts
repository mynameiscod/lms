import mongoose from 'mongoose';
import User from '../models/User';
import PassportInterview from '../models/PassportInterview';
import CommunicationAttempt from '../models/CommunicationAttempt';
import DailyChallenge from '../models/DailyChallenge';
import ProblemSubmission from '../models/ProblemSubmission';
import {
  TRIAL_ITEMS, TrialItemKey, TrialItemSetting, trialActive, trialItem, TRIAL_LIMIT_CODE,
} from '../data/trialPolicy';

/**
 * Counting a trial: what a member on one has used, and whether the next one is allowed.
 *
 * COUNTED FROM THE RECORDS THE PRODUCT ALREADY KEEPS — interviews, recordings, challenges — since
 * the trial started. No counter is stored, so nothing can drift from what actually happened, and
 * a trial given again later starts from zero by itself.
 */

const oid = (id: string): any => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);

export async function passportOf(studentId: string): Promise<any> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return null;
  const u: any = await User.findById(studentId).select('passport').lean();
  return u?.passport || null;
}

/** How many of a counted item this member has used since their trial started. */
async function usedSince(tenantId: string, studentId: string, key: TrialItemKey, since: Date, passport: any): Promise<number> {
  const sid = oid(studentId);
  switch (key) {
    case 'interview':
      return PassportInterview.countDocuments({ tenantId, studentId: sid, createdAt: { $gte: since } });
    case 'communication':
      return CommunicationAttempt.countDocuments({ tenantId, studentId: sid, createdAt: { $gte: since } });
    case 'thinkingLab':
      return DailyChallenge.countDocuments({ tenantId, studentId: sid, createdAt: { $gte: since } });
    case 'practice': {
      // Problems solved among the ones the trial shows.
      const ids = (passport?.trial?.practiceIds || []).map(String);
      if (!ids.length) return 0;
      const solved = await ProblemSubmission.distinct('problemId', { userId: String(studentId), verdict: 'AC', problemId: { $in: ids.map(oid) } });
      return solved.length;
    }
    case 'journey': {
      const { journeyCompletion } = await import('./foundationJourneyXpService');
      return (await journeyCompletion(tenantId, studentId))?.completedDays || 0;
    }
    default:
      return 0;
  }
}

/** ok, or the refusal to send (status + body). */
export interface TrialVerdict { ok: boolean; status: number; body: any }

/**
 * May this member on a trial start one more of `key`? Null when they are not on a trial (the
 * caller's ordinary rules apply). Otherwise the refusal to send, or ok.
 */
export async function trialAllowsAnother(
  tenantId: string, studentId: string, key: TrialItemKey, passport?: any,
): Promise<null | TrialVerdict> {
  const p = passport === undefined ? await passportOf(studentId) : passport;
  const s = trialItem(p, key);
  if (!s) return null;
  const label = TRIAL_ITEMS.find(i => i.key === key)!.label;
  if (!s.on) {
    return { ok: false, status: 403, body: { code: TRIAL_LIMIT_CODE, reason: TRIAL_LIMIT_CODE, locked: true, message: `${label} is not part of your trial. Take membership to use it.` } };
  }
  if (s.limit === null) return { ok: true, status: 200, body: null };
  const used = await usedSince(tenantId, studentId, key, new Date(p.trial.startedAt), p);
  if (used < s.limit) return { ok: true, status: 200, body: null };
  const unit = TRIAL_ITEMS.find(i => i.key === key)!.limit?.unit || '';
  return {
    ok: false, status: 403,
    body: { code: TRIAL_LIMIT_CODE, reason: TRIAL_LIMIT_CODE, locked: true, limit: s.limit, used,
      message: `Your trial includes ${s.limit} ${s.limit === 1 ? unit.replace(/s$/, '') : unit}, and you have used ${s.limit === 1 ? 'it' : 'them all'}. Take membership to keep going.` },
  };
}

/** The journey days a running trial opens: null = no trial or no limit; 0 = classes are off. */
export function trialJourneyDays(passport: any): number | null {
  const s = trialItem(passport, 'journey');
  if (!s) return null;
  if (!s.on) return 0;
  return s.limit;
}

export interface TrialStatus {
  planName: string;
  startedAt: string; endsAt: string; daysLeft: number;
  items: { key: TrialItemKey; label: string; icon: string; on: boolean; limit: number | null; used: number | null; unit: string | null }[];
}

/** The trial as the member and the admin see it: what it opens, and how much of each is used. */
export async function trialStatus(tenantId: string, studentId: string, passport?: any, now: Date = new Date()): Promise<TrialStatus | null> {
  const p = passport === undefined ? await passportOf(studentId) : passport;
  if (!trialActive(p, now)) return null;
  const t = p.trial;
  const since = new Date(t.startedAt);
  const items = await Promise.all(TRIAL_ITEMS.map(async it => {
    const s: TrialItemSetting = trialItem(p, it.key, now)!;
    const counts = !!it.limit && s.on && s.limit !== null;
    return {
      key: it.key, label: it.label, icon: it.icon, on: s.on, limit: it.limit ? s.limit : null,
      used: counts ? await usedSince(tenantId, studentId, it.key, since, p).catch(() => null) : null,
      unit: it.limit?.unit || null,
    };
  }));
  return {
    planName: t.planName || 'Trial',
    startedAt: new Date(t.startedAt).toISOString(),
    endsAt: new Date(t.endsAt).toISOString(),
    daysLeft: Math.max(0, Math.ceil((new Date(t.endsAt).getTime() - now.getTime()) / 86400000)),
    items,
  };
}
