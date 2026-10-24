/**
 * The CareerPilot journey: every step from "opened the sign-up page" to "still here in week two",
 * how many people reach each, how long it takes, and where the rest were last seen.
 *
 * TWO HALVES, BECAUSE THE DATA HAS TWO HALVES.
 *  - Before an account exists there is only a browser. Those steps count VISITORS, from the activity
 *    beacon the sign-up page now sends (client/src/pages/Passport/journeyTrack.ts). A visitor's furthest
 *    stage is their highest event, so the funnel can only go down.
 *  - From the moment the OTP is verified there is an account, and every later step is read from the
 *    records the product already keeps (assessments, payments, practice, activity). Those steps count
 *    PEOPLE in the cohort "accounts created in this range", each as a share of that cohort, because
 *    people do not take them in one order: some pay before they practise.
 *
 * Counts are exact (aggregations over the whole range). Lists of people are capped.
 */
import mongoose from 'mongoose';
import User from '../models/User';
import CareerPilotActivity from '../models/CareerPilotActivity';

const col = (n: string) => mongoose.connection.collection(n);
const oid = (s: any) => new mongoose.Types.ObjectId(String(s));
/** Ids are stored as ObjectIds in some collections and strings in others. Ask for both. */
const bothForms = (ids: any[]) => [...ids.map((i) => oid(i)), ...ids.map(String)];

/** The events the sign-up page sends. One list, so the page and this file cannot drift. */
export const JOIN_EVENTS = {
  view: 'Join: sign-up form',
  started: 'Join: started the form',
  pressed: 'Join: pressed Create',
  sent: 'Join: OTP sent',
  otpScreen: 'Join: OTP screen',
  verified: 'Join: verified',
  left: 'Join: left the page',
  errors: 'Join: form has errors',
  rejected: 'Join: sign-up rejected',
  wrongOtp: 'Join: wrong OTP',
  resent: 'Join: OTP resent',
} as const;

/** A visitor's furthest stage, from the highest event they produced. */
export const VISITOR_STAGE: Record<string, number> = {
  [JOIN_EVENTS.view]: 1, [JOIN_EVENTS.started]: 2, [JOIN_EVENTS.pressed]: 3,
  [JOIN_EVENTS.sent]: 4, [JOIN_EVENTS.otpScreen]: 4, [JOIN_EVENTS.verified]: 5,
};

export const median = (v: number[]): number | null => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};

/** "Opened /careerpilot/practice/6ac4…" → "Opened /careerpilot/practice/:id": ids are noise when counting. */
export const tidyName = (n: string): string => String(n || '').replace(/[0-9a-f]{24}/gi, ':id').slice(0, 90);

/** Cumulative funnel counts from each visitor's furthest stage: stage i counts everyone who got to i OR FURTHER. */
export function cumulative(furthest: number[], stages = 5): number[] {
  const out: number[] = [];
  for (let s = 1; s <= stages; s++) out.push(furthest.filter((f) => f >= s).length);
  return out;
}

export interface Range { from: Date; to: Date }

export function parseRange(q: { from?: any; to?: any; preset?: any }): Range {
  const now = new Date();
  const to = q.to ? new Date(String(q.to)) : now;
  let from: Date;
  if (q.from) from = new Date(String(q.from));
  else {
    const days = ({ today: 0, '7d': 7, '30d': 30, all: 3650 } as Record<string, number>)[String(q.preset || '7d')] ?? 7;
    from = new Date(now);
    if (days === 0) from.setUTCHours(-5, -30, 0, 0); // start of today, IST
    else from = new Date(now.getTime() - days * 86400000);
  }
  return { from: isNaN(+from) ? new Date(now.getTime() - 7 * 86400000) : from, to: isNaN(+to) ? now : to };
}

const memberFilter = (tenantId: string, r: Range) => ({
  tenantId: oid(tenantId), 'passport.product': { $exists: true, $nin: [null, ''] }, 'passport.verifiedAt': { $gte: r.from, $lte: r.to },
});

interface Fact { key: string; label: string; ids: Set<string>; at: Map<string, Date> }

/** For a cohort of members: who did each thing, and when they first did it. */
async function memberFacts(cohort: any[]): Promise<Fact[]> {
  const ids = cohort.map((u) => String(u._id));
  const forms = bothForms(ids);
  const fact = (key: string, label: string): Fact => ({ key, label, ids: new Set(), at: new Map() });
  const setAt = (f: Fact, id: any, d: any) => { const k = String(id); const t = d ? new Date(d) : null; if (!f.ids.has(k)) f.ids.add(k); if (t && (!f.at.get(k) || t < (f.at.get(k) as Date))) f.at.set(k, t); };
  const first = async (f: Fact, collection: string, idField: string, match: any, dateField: string) => {
    const rows = await col(collection).aggregate([{ $match: { [idField]: { $in: forms }, ...match } }, { $group: { _id: `$${idField}`, at: { $min: `$${dateField}` } } }]).toArray().catch(() => []);
    rows.forEach((r: any) => setAt(f, r._id, r.at));
  };

  const setup = fact('setup', 'Finished setup (told us their goal)');
  cohort.forEach((u) => { if (u.passport?.contextCompletedAt) setAt(setup, u._id, u.passport.contextCompletedAt); });

  const home = fact('home', 'Opened Mission Control (their home)');
  const act = await CareerPilotActivity.aggregate([
    { $match: { userId: { $in: ids.map(oid) } } },
    { $group: { _id: '$userId', homeAt: { $min: { $cond: [{ $eq: ['$name', 'Mission Control'] }, '$createdAt', null] } }, days: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }, last: { $max: '$createdAt' } } },
  ]);
  const activeDays = new Map<string, { days: number; last: Date }>();
  act.forEach((a: any) => { if (a.homeAt) setAt(home, a._id, a.homeAt); activeDays.set(String(a._id), { days: (a.days || []).length, last: a.last }); });

  const orientation = fact('orientation', 'Started orientation / day 1');
  await first(orientation, 'orientationprogresses', 'studentId', {}, 'startedAt');
  const assessStart = fact('assessStart', 'Started the skill assessment');
  await first(assessStart, 'personalizedassessments', 'studentId', { startedAt: { $exists: true, $ne: null } }, 'startedAt');
  const assessDone = fact('assessDone', 'Finished the skill assessment');
  await first(assessDone, 'personalizedassessments', 'studentId', { submittedAt: { $exists: true, $ne: null } }, 'submittedAt');

  const practice = fact('practice', 'Did a first practice task');
  for (const [c, f, d] of [['problemsubmissions', 'userId', 'createdAt'], ['quizattempts', 'studentId', 'createdAt'], ['communicationattempts', 'studentId', 'createdAt'], ['playgroundprograms', 'userId', 'createdAt'], ['dailychallenges', 'studentId', 'createdAt']] as const) {
    await first(practice, c, f, {}, d);
  }

  const checkout = fact('checkout', 'Opened checkout');
  await first(checkout, 'payments', 'studentId', { purpose: 'passport_membership' }, 'createdAt');
  const paid = fact('paid', 'Paid for membership');
  await first(paid, 'payments', 'studentId', { purpose: 'passport_membership', status: 'paid' }, 'updatedAt');
  cohort.forEach((u) => { if (u.passport?.activatedAt) setAt(paid, u._id, u.passport.activatedAt); });

  const back = fact('back', 'Came back on another day');
  const week2 = fact('week2', 'Still active in week two');
  cohort.forEach((u) => {
    const a = activeDays.get(String(u._id)); if (!a) return;
    // No time recorded for these two: a median to the LAST activity would read as "how long until they came back".
    if (a.days >= 2) setAt(back, u._id, null);
    const verified = new Date(u.passport?.verifiedAt || 0).getTime();
    if (a.last && new Date(a.last).getTime() >= verified + 7 * 86400000) setAt(week2, u._id, null);
  });
  return [setup, home, orientation, assessStart, assessDone, practice, checkout, paid, back, week2];
}

export async function journey(tenantId: string, range: Range) {
  const T = oid(tenantId);
  const inRange = { tenantId: T, createdAt: { $gte: range.from, $lte: range.to } };

  // ── visitors: furthest stage reached before an account exists
  const names = Object.keys(VISITOR_STAGE);
  const visitors = await CareerPilotActivity.aggregate([
    { $match: { ...inRange, name: { $in: names } } },
    { $group: { _id: '$visitorId', stage: { $max: { $switch: { branches: names.map((n) => ({ case: { $eq: ['$name', n] }, then: VISITOR_STAGE[n] })), default: 0 } } } } },
  ]);
  const [v1, v2, v3, v4, v5] = cumulative(visitors.map((v: any) => v.stage), 5);

  // ── accounts created in the range = the member cohort
  const cohort: any[] = await User.find(memberFilter(tenantId, range)).select('firstName lastName email phone passport').lean();
  const accounts = cohort.length;
  const facts = await memberFacts(cohort);
  const verifiedAt = new Map(cohort.map((u) => [String(u._id), new Date(u.passport.verifiedAt).getTime()]));
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);

  const steps: any[] = [
    { key: 'v1', group: 'visitor', label: 'Opened the sign-up page', count: v1, pctOfPrev: null, pctOfTop: v1 ? 100 : null },
    { key: 'v2', group: 'visitor', label: 'Started filling the form', count: v2, pctOfPrev: pct(v2, v1), pctOfTop: pct(v2, v1) },
    { key: 'v3', group: 'visitor', label: 'Pressed "Create account"', count: v3, pctOfPrev: pct(v3, v2), pctOfTop: pct(v3, v1) },
    { key: 'v4', group: 'visitor', label: 'Got the OTP on WhatsApp', count: v4, pctOfPrev: pct(v4, v3), pctOfTop: pct(v4, v1) },
    { key: 'v5', group: 'visitor', label: 'Entered the OTP (verified)', count: v5, pctOfPrev: pct(v5, v4), pctOfTop: pct(v5, v1) },
    { key: 'account', group: 'member', label: 'Account created', count: accounts, pctOfPrev: null, pctOfAccounts: accounts ? 100 : null, medianMinutes: 0 },
    ...facts.map((f) => {
      const mins = [...f.at.entries()].map(([id, t]) => Math.max(0, Math.round((t.getTime() - (verifiedAt.get(id) || t.getTime())) / 60000)));
      return { key: f.key, group: 'member', label: f.label, count: f.ids.size, pctOfAccounts: pct(f.ids.size, accounts), medianMinutes: median(mins) };
    }),
  ];

  // ── how much of the sign-ups the page tracking actually saw (older sign-ups predate it)
  const tracking = { accounts, verifiedSeen: v5, coverage: accounts ? Math.min(100, Math.round((v5 / accounts) * 100)) : null };

  // ── where the form loses people
  const leaks = await CareerPilotActivity.aggregate([
    { $match: { ...inRange, name: { $in: [JOIN_EVENTS.left, JOIN_EVENTS.errors, JOIN_EVENTS.rejected, JOIN_EVENTS.wrongOtp, JOIN_EVENTS.resent] } } },
    { $group: { _id: { n: '$name', f: { $ifNull: ['$meta.lastField', { $ifNull: ['$errorMessage', '$meta.fields'] }] } }, visitors: { $addToSet: '$visitorId' } } },
    { $project: { visitors: { $size: '$visitors' } } },
  ]);
  const leak = (name: string) => leaks.filter((l: any) => l._id.n === name).map((l: any) => ({ what: Array.isArray(l._id.f) ? l._id.f.join(', ') : String(l._id.f ?? '(unknown)'), visitors: l.visitors })).sort((a: any, b: any) => b.visitors - a.visitors).slice(0, 8);
  const formLeaks = {
    leftAfterField: leak(JOIN_EVENTS.left), blockedByErrors: leak(JOIN_EVENTS.errors), rejectedByServer: leak(JOIN_EVENTS.rejected),
    wrongOtpVisitors: leak(JOIN_EVENTS.wrongOtp).reduce((s: number, x: any) => s + x.visitors, 0),
    resentOtpVisitors: leak(JOIN_EVENTS.resent).reduce((s: number, x: any) => s + x.visitors, 0),
  };

  // ── by source and by device
  const view = await CareerPilotActivity.aggregate([
    { $match: { ...inRange, name: JOIN_EVENTS.view } },
    { $group: { _id: '$visitorId', source: { $first: { $ifNull: ['$meta.source', 'direct'] } }, device: { $first: { $ifNull: ['$device.deviceType', 'unknown'] } } } },
  ]);
  const stageOf = new Map(visitors.map((v: any) => [String(v._id), v.stage as number]));
  const group = (key: 'source' | 'device') => {
    const m = new Map<string, { visitors: number; gotOtp: number; verified: number }>();
    view.forEach((v: any) => {
      const k = String(v[key] || 'unknown'); const row = m.get(k) || { visitors: 0, gotOtp: 0, verified: 0 }; const st = stageOf.get(String(v._id)) || 1;
      row.visitors++; if (st >= 4) row.gotOtp++; if (st >= 5) row.verified++; m.set(k, row);
    });
    return [...m.entries()].map(([name, r]) => ({ name, ...r, pctVerified: pct(r.verified, r.visitors) })).sort((a, b) => b.visitors - a.visitors).slice(0, 10);
  };
  const paidIds = facts.find((f) => f.key === 'paid')?.ids || new Set<string>();
  const accountsBySource = new Map<string, { accounts: number; paid: number }>();
  cohort.forEach((u) => {
    const a = u.passport?.attribution; const src = (a?.last_touch?.utm_source || a?.first_touch?.utm_source || 'direct') as string;
    const r = accountsBySource.get(src) || { accounts: 0, paid: 0 }; r.accounts++; if (paidIds.has(String(u._id))) r.paid++; accountsBySource.set(src, r);
  });

  return {
    range, steps, tracking, formLeaks,
    bySource: group('source'), byDevice: group('device'),
    accountsBySource: [...accountsBySource.entries()].map(([name, r]) => ({ name, ...r, pctPaid: pct(r.paid, r.accounts) })).sort((a, b) => b.accounts - a.accounts).slice(0, 10),
  };
}

/** Members in the cohort who did NOT reach a step, and the last thing each was seen doing. */
export async function dropped(tenantId: string, range: Range, stepKey: string, limit = 300) {
  const cohort: any[] = await User.find(memberFilter(tenantId, range)).select('firstName lastName email phone passport').lean();
  const facts = await memberFacts(cohort);
  const f = facts.find((x) => x.key === stepKey);
  if (!f) return { people: [], lastSeen: [], total: 0 };
  const stuck = cohort.filter((u) => !f.ids.has(String(u._id)));
  const last = await CareerPilotActivity.aggregate([
    { $match: { userId: { $in: stuck.map((u) => oid(u._id)) } } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: '$userId', name: { $last: '$name' }, at: { $last: '$createdAt' } } },
  ]);
  const lastBy = new Map(last.map((l: any) => [String(l._id), l]));
  const counts = new Map<string, number>();
  const now = Date.now();
  const people = stuck.map((u) => {
    const l: any = lastBy.get(String(u._id));
    const seen = l ? tidyName(l.name) : '(never opened the app)';
    counts.set(seen, (counts.get(seen) || 0) + 1);
    return {
      id: String(u._id), name: `${u.firstName || ''} ${u.lastName && u.lastName !== '-' ? u.lastName : ''}`.trim() || u.email, email: u.email, phone: u.phone || '',
      joinedAt: u.passport.verifiedAt, lastSeen: seen, lastSeenAt: l?.at || null,
      daysSince: Math.floor((now - new Date(l?.at || u.passport.verifiedAt).getTime()) / 86400000),
    };
  }).sort((a, b) => a.daysSince - b.daysSince).slice(0, limit);
  return { total: stuck.length, lastSeen: [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10), people };
}
