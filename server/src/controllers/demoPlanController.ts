import { Request, Response } from 'express';
import mongoose from 'mongoose';
import DemoPlan from '../models/DemoPlan';
import User from '../models/User';
import CodingProblem from '../models/CodingProblem';
import ThinkingQuestion from '../models/ThinkingQuestion';
import { QUESTION_TYPE_LABEL } from '../data/thinkingBankPolicy';
import { QuestionBook } from '../models/QuestionBook';
import CareerTrack from '../models/CareerTrack';
import { DEMO_YEARS, DEMO_YEAR_KEYS, DEMO_ROUND_TYPES, DEMO_MAX_PER_LIST, emptyYear } from '../data/demoPolicy';

/**
 * Super Admin → CareerPilot → Demo plans.
 *
 * A plan says, for each of the four years, what a demo account shows: the track, the day it opens
 * on, and the exact Practice problems, Thinking Lab questions, interview rounds and question books.
 * Plans are global (only a super admin makes them), and demo accounts link to them, so an edit
 * here reaches every demo account on the plan at once.
 */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const actorOf = (req: Request) => {
  const a: any = (req as any).user || {};
  return { id: String(a.id || a._id || ''), name: [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || 'admin' };
};
const ids = (raw: any): string[] =>
  [...new Set((Array.isArray(raw) ? raw : []).map(String))].filter((i) => mongoose.isValidObjectId(i)).slice(0, DEMO_MAX_PER_LIST);

/** The items each list names, as an admin reads them, keyed by id. */
async function lookups(plans: any[]) {
  const all = (field: string) => [...new Set(plans.flatMap((p) => DEMO_YEAR_KEYS.flatMap((k) => (p.years?.[k]?.[field] || []).map(String))))];
  const [problems, thinking, books] = await Promise.all([
    CodingProblem.find({ _id: { $in: all('practiceIds') } }).select('number title difficulty status').lean(),
    // A plan saved before the shared bank holds old ids; those questions were copied in with migratedFrom.
    ThinkingQuestion.find({ $or: [{ _id: { $in: all('thinkingIds') } }, { migratedFrom: { $in: all('thinkingIds') } }] }).select('title type subCategory difficulty status migratedFrom number').lean(),
    QuestionBook.find({ _id: { $in: all('bookIds') } }).select('title status').lean(),
  ]);
  return {
    problems: new Map((problems as any[]).map((r) => [String(r._id), { id: String(r._id), number: r.number, title: r.title, difficulty: r.difficulty, live: r.status === 'published' }])),
    thinking: new Map((thinking as any[]).flatMap((r) => {
      const item = { id: String(r._id), number: r.number, title: r.title, category: [QUESTION_TYPE_LABEL[r.type as keyof typeof QUESTION_TYPE_LABEL], r.subCategory].filter(Boolean).join(' · '), difficulty: r.difficulty, live: r.status === 'PUBLISHED' };
      return [[String(r._id), item], ...(r.migratedFrom ? [[String(r.migratedFrom), item]] : [])] as [string, any][];
    })),
    books: new Map((books as any[]).map((r) => [String(r._id), { id: String(r._id), title: r.title, live: r.status === 'published' }])),
  };
}

/** How many accounts hold each plan now. */
async function accountsByPlan(): Promise<Map<string, number>> {
  const rows: any[] = await User.aggregate([
    { $match: { 'passport.demo.planId': { $exists: true, $ne: null } } },
    { $group: { _id: '$passport.demo.planId', n: { $sum: 1 } } },
  ]).catch(() => []);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

const planRow = (p: any, accounts: number, look: Awaited<ReturnType<typeof lookups>>) => ({
  id: String(p._id), name: p.name, description: p.description || '', startYear: p.startYear, active: !!p.active,
  accounts, updatedAt: p.updatedAt,
  years: Object.fromEntries(DEMO_YEAR_KEYS.map((k) => {
    const y = { ...emptyYear(), ...(p.years?.[k] || {}) };
    const pick = (list: string[], m: Map<string, any>) => list.map(String).filter((i) => m.has(i)).map((i) => m.get(i));
    return [k, {
      enabled: !!y.enabled, track: y.track || '', landingDay: y.landingDay || 1, interviewTypes: y.interviewTypes || [],
      practice: pick(y.practiceIds || [], look.problems),
      thinking: pick(y.thinkingIds || [], look.thinking),
      books: pick(y.bookIds || [], look.books),
    }];
  })),
});

/**
 * What the plan says is missing, year by year. A plan with any of these cannot be given to an account,
 * so a demo is never handed over half-ready.
 */
export function planProblems(p: any): string[] {
  const out: string[] = [];
  const on = DEMO_YEARS.filter((y) => p.years?.[y.key]?.enabled);
  if (!on.length) return ['Switch on at least one year.'];
  if (!p.years?.[p.startYear]?.enabled) out.push('The year a demo opens on must be switched on.');
  for (const y of on) {
    const c = p.years[y.key];
    if (y.key !== 'foundation' && !c.track) out.push(`${y.label}: choose a track.`);
    if (!(c.practiceIds || []).length) out.push(`${y.label}: choose the Practice problems.`);
    if (!(c.interviewTypes || []).length) out.push(`${y.label}: choose at least one interview round.`);
  }
  return out;
}

/** Gaps that do not stop a demo, but are worth knowing before a college visit. */
export function planWarnings(p: any): string[] {
  return DEMO_YEARS.filter((y) => p.years?.[y.key]?.enabled).flatMap((y) => {
    const c = p.years[y.key]; const w: string[] = [];
    if (!(c.thinkingIds || []).length) w.push(`${y.label}: no Thinking Lab questions chosen — Thinking Lab shows its usual problems.`);
    if (!(c.bookIds || []).length) w.push(`${y.label}: no question books chosen — Question Books shows its usual books.`);
    return w;
  });
}

/** GET /passport/demo-plans — every plan, with what its lists name and who holds it. */
export const listDemoPlans = async (_req: Request, res: Response) => {
  try {
    const [plans, accounts] = await Promise.all([DemoPlan.find({}).sort({ createdAt: 1 }).lean(), accountsByPlan()]);
    const look = await lookups(plans as any[]);
    res.json({
      plans: (plans as any[]).map((p) => ({ ...planRow(p, accounts.get(String(p._id)) || 0, look), missing: planProblems(p), warnings: planWarnings(p) })),
      years: DEMO_YEARS, roundTypes: DEMO_ROUND_TYPES, maxPerList: DEMO_MAX_PER_LIST,
    });
  } catch (e: any) {
    console.error('[demo] list:', e?.message || e);
    res.status(500).json({ message: 'Could not load the demo plans.' });
  }
};

/** A plan from the admin's form. Saving a plan with gaps is allowed; giving it to an account is not. */
function cleanPlan(b: any): { plan: any } | { error: string } {
  const name = String(b?.name || '').trim().slice(0, 60);
  if (!name) return { error: 'Give the plan a name.' };
  const startYear = DEMO_YEAR_KEYS.includes(String(b?.startYear)) ? String(b.startYear) : 'foundation';
  const years: any = {};
  for (const k of DEMO_YEAR_KEYS) {
    const y = b?.years?.[k] || {};
    const day = Math.round(Number(y.landingDay));
    years[k] = {
      enabled: !!y.enabled,
      track: k === 'foundation' ? '' : String(y.track || '').trim().slice(0, 60),
      landingDay: Number.isFinite(day) && day >= 1 ? Math.min(day, 400) : 1,
      practiceIds: ids(y.practiceIds),
      thinkingIds: ids(y.thinkingIds),
      interviewTypes: [...new Set<string>((Array.isArray(y.interviewTypes) ? y.interviewTypes : []).map(String))].filter((t) => (DEMO_ROUND_TYPES as readonly string[]).includes(t)),
      bookIds: ids(y.bookIds),
    };
  }
  return { plan: { name, description: String(b?.description || '').trim().slice(0, 300), startYear, years, active: b?.active !== false } };
}

/** POST /passport/demo-plans and PUT /passport/demo-plans/:id. */
export const saveDemoPlan = async (req: Request, res: Response) => {
  try {
    const c = cleanPlan(req.body);
    if ('error' in c) return res.status(400).json({ message: c.error });
    const by = actorOf(req).id;
    let doc: any;
    if (req.params.id) {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Plan not found.' });
      doc = await DemoPlan.findByIdAndUpdate(req.params.id, { $set: { ...c.plan, updatedBy: by } }, { new: true }).lean();
      if (!doc) return res.status(404).json({ message: 'Plan not found.' });
    } else {
      doc = (await DemoPlan.create({ ...c.plan, updatedBy: by })).toObject();
    }
    res.json({ id: String(doc._id), missing: planProblems(doc), warnings: planWarnings(doc) });
  } catch (e: any) {
    console.error('[demo] save:', e?.message || e);
    res.status(500).json({ message: 'Could not save the plan.' });
  }
};

/** DELETE /passport/demo-plans/:id — refused while an account still holds it. */
export const deleteDemoPlan = async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Plan not found.' });
    const held = await User.countDocuments({ 'passport.demo.planId': new mongoose.Types.ObjectId(req.params.id) });
    if (held) return res.status(409).json({ message: `${held} demo ${held === 1 ? 'account is' : 'accounts are'} on this plan. End their demo access first.` });
    await DemoPlan.deleteOne({ _id: req.params.id });
    res.json({ deleted: true });
  } catch (e: any) {
    console.error('[demo] delete:', e?.message || e);
    res.status(500).json({ message: 'Could not delete the plan.' });
  }
};

// ── What a plan can name ─────────────────────────────────────────────────────────────────────

/** GET /passport/demo-plans/options/problems?q= — published Problem Bank problems, from any library. */
export const searchDemoProblems = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const and: any[] = [{ status: 'published' }];
    if (q) {
      const or: any[] = [{ title: new RegExp(escapeRe(q), 'i') }, { topics: new RegExp(escapeRe(q), 'i') }];
      if (/^#?\d{1,9}$/.test(q)) or.push({ number: Number(q.replace('#', '')) });
      and.push({ $or: or });
    }
    const rows: any[] = await CodingProblem.find({ $and: and }).sort({ number: 1, _id: 1 }).limit(40).select('number title difficulty').lean();
    res.json({ items: rows.map((r) => ({ id: String(r._id), number: r.number, title: r.title, difficulty: r.difficulty, live: true })) });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not search the problems.' });
  }
};

/** GET /passport/demo-plans/options/thinking?q= — published questions from the shared Thinking Lab bank. */
export const searchDemoThinking = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const f: any = { status: 'PUBLISHED' };
    if (q) f.$or = [{ title: new RegExp(escapeRe(q), 'i') }, { subCategory: new RegExp(escapeRe(q), 'i') }, { type: q.toLowerCase() }];
    const rows: any[] = await ThinkingQuestion.find(f).sort({ type: 1, number: 1 }).limit(40).select('title type subCategory difficulty number').lean();
    res.json({ items: rows.map((r) => ({ id: String(r._id), number: r.number, title: r.title, category: [QUESTION_TYPE_LABEL[r.type as keyof typeof QUESTION_TYPE_LABEL], r.subCategory].filter(Boolean).join(' · '), difficulty: r.difficulty, live: true })) });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not search the Thinking Lab questions.' });
  }
};

/** GET /passport/demo-plans/options/books?q= — published question books. */
export const searchDemoBooks = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const f: any = { status: 'published' };
    if (q) f.title = new RegExp(escapeRe(q), 'i');
    const rows: any[] = await QuestionBook.find(f).sort({ title: 1 }).limit(40).select('title').lean();
    res.json({ items: rows.map((r) => ({ id: String(r._id), title: r.title, live: true })) });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not search the question books.' });
  }
};

/** GET /passport/demo-plans/options/tracks — every track key any institute has, named once. */
export const listDemoTracks = async (_req: Request, res: Response) => {
  try {
    const rows: any[] = await CareerTrack.aggregate([
      { $sort: { status: -1 } },
      { $group: { _id: '$key', name: { $first: '$name' } } },
      { $sort: { name: 1 } },
    ]);
    res.json({ tracks: rows.map((r) => ({ key: r._id, name: r.name })) });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not load the tracks.' });
  }
};
