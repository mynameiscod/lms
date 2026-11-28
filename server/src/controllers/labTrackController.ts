import { Response } from 'express';
import mongoose from 'mongoose';
import { LabTrack, LabTrackItem, LabTrackAssignment } from '../models/LabTrack';
import ThinkingQuestion from '../models/ThinkingQuestion';
import ThinkingProblem, { audienceFilter } from '../models/ThinkingProblem';
import CommunicationChallenge from '../models/CommunicationChallenge';
import { AuthRequest } from '../types/express';
import { resolveLabDay, resolveDayFor, dayIndexFor, expectedDaysSoFar } from '../services/labTrackService';
import { resolveLabGate } from '../services/labGateService';
import { ymdIn, learningDates, questionsPerDay, questionsDoneByDate } from '../services/labTrackService';
import User from '../models/User';
import DailyChallenge from '../models/DailyChallenge';
import CommunicationAttempt from '../models/CommunicationAttempt';
import StudentGameStats from '../models/StudentGameStats';
import Batch from '../models/Batch';

/** Admin API for lab tracks: author a plan once, attach it to any batch. */

const tid = (req: AuthRequest) => String(req.user?.tenantId || '');
const oid = (v: any) => (v && mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : null);
const fail = (res: Response, code: number, message: string) => res.status(code).json({ success: false, message });
/** A day may hold several questions: a track's days are filled when each has at least one. */
const filledDaysOf = async (trackId: any) => (await LabTrackItem.distinct('dayIndex', { trackId })).length;
/** Most questions one day may hold. */
const MAX_PER_DAY = 5;

// ── Tracks ──────────────────────────────────────────────────────────────────

export const listTracks = async (req: AuthRequest, res: Response) => {
  try {
    const q: any = { tenantId: tid(req) };
    if (req.query.lab) q.lab = req.query.lab;
    const tracks = await LabTrack.find(q).sort({ createdAt: -1 }).lean();

    // Item counts come from one grouped query, not one per track.
    const counts = await LabTrackItem.aggregate([
      { $match: { trackId: { $in: tracks.map((t: any) => t._id) } } },
      { $group: { _id: { t: '$trackId', d: '$dayIndex' }, q: { $sum: 1 } } },
      { $group: { _id: '$_id.t', n: { $sum: 1 }, questions: { $sum: '$q' } } },
    ]);
    const byTrack = new Map(counts.map((c: any) => [String(c._id), c.n]));
    const questionsOf = new Map(counts.map((c: any) => [String(c._id), c.questions]));

    res.json({
      success: true,
      data: tracks.map((t: any) => ({
        ...t,
        filledDays: byTrack.get(String(t._id)) || 0,
        questions: questionsOf.get(String(t._id)) || 0,
        // Publishing a plan with gaps would show students an empty day.
        isComplete: (byTrack.get(String(t._id)) || 0) >= t.totalDays,
      })),
    });
  } catch (e: any) { fail(res, 500, e.message); }
};

export const createTrack = async (req: AuthRequest, res: Response) => {
  try {
    const { name, lab, description, totalDays, daysPerWeek } = req.body;
    if (!String(name || '').trim()) return fail(res, 400, 'Track name is required');
    if (!['thinking', 'communication'].includes(lab)) return fail(res, 400, 'lab must be thinking or communication');

    const track = await LabTrack.create({
      tenantId: tid(req), name: String(name).trim(), lab,
      description, totalDays: Number(totalDays) || 145,
      daysPerWeek: Number(daysPerWeek) || 5,
      createdBy: oid(req.user?.id),
    });
    res.status(201).json({ success: true, data: track });
  } catch (e: any) { fail(res, 500, e.message); }
};

export const updateTrack = async (req: AuthRequest, res: Response) => {
  try {
    const track: any = await LabTrack.findOne({ _id: req.params.id, tenantId: tid(req) });
    if (!track) return fail(res, 404, 'Track not found');

    for (const k of ['name', 'description', 'totalDays', 'daysPerWeek'] as const) {
      if (req.body[k] !== undefined) (track as any)[k] = req.body[k];
    }

    if (req.body.status !== undefined) {
      if (req.body.status === 'published') {
        // A published track is served to students, so refuse to publish one with holes
        // rather than let a student open the app to an empty day.
        const filled = await filledDaysOf(track._id);
        if (filled < track.totalDays) {
          return fail(res, 400, `Cannot publish: ${filled} of ${track.totalDays} days filled. Fill every day first.`);
        }
      }
      track.status = req.body.status;
    }
    await track.save();
    res.json({ success: true, data: track });
  } catch (e: any) { fail(res, 500, e.message); }
};

export const deleteTrack = async (req: AuthRequest, res: Response) => {
  try {
    const id = oid(req.params.id);
    // Refuse while a batch still depends on it — deleting would silently empty their lab.
    const inUse = await LabTrackAssignment.countDocuments({ trackId: id, status: 'active' });
    if (inUse) return fail(res, 409, `In use by ${inUse} batch(es). Pause those assignments first.`);

    const gone = await LabTrack.findOneAndDelete({ _id: id, tenantId: tid(req) });
    if (!gone) return fail(res, 404, 'Track not found');
    await LabTrackItem.deleteMany({ trackId: id });
    res.json({ success: true, message: 'Track deleted' });
  } catch (e: any) { fail(res, 500, e.message); }
};

/** Track plus its days, with content titles resolved for the builder grid. */
export const getTrack = async (req: AuthRequest, res: Response) => {
  try {
    const track: any = await LabTrack.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!track) return fail(res, 404, 'Track not found');

    const items = await LabTrackItem.find({ trackId: track._id }).sort({ dayIndex: 1, position: 1, _id: 1 }).lean();
    const ids = items.map((i: any) => i.contentId);
    let bank: any[];
    if (track.lab === 'thinking') {
      // A day names either a shared-bank question or an LMS problem; both are shown with a title, type and level.
      const qIds = items.filter((i: any) => i.contentKind === 'question').map((i: any) => i.contentId);
      const pIds = items.filter((i: any) => i.contentKind !== 'question').map((i: any) => i.contentId);
      const [qs, ps] = await Promise.all([
        ThinkingQuestion.find({ _id: { $in: qIds } }).select('title type subCategory difficulty years status').lean(),
        ThinkingProblem.find({ _id: { $in: pIds } }).select('title category difficulty').lean(),
      ]);
      bank = [
        ...qs.map((q: any) => ({ ...q, kind: 'question', category: q.subCategory || q.type })),
        ...ps.map((x: any) => ({ ...x, kind: 'problem', type: 'coding' })),
      ];
    } else {
      bank = await CommunicationChallenge.find({ _id: { $in: ids } }).select('title challengeType').lean();
    }
    const byId = new Map(bank.map((b: any) => [String(b._id), b]));

    res.json({
      success: true,
      data: {
        track,
        items: items.map((i: any) => ({
          ...i,
          week: Math.ceil(i.dayIndex / (track.daysPerWeek || 5)),
          content: byId.get(String(i.contentId)) || null,
          // Content deleted from the library leaves a hole the admin must see.
          missing: !byId.has(String(i.contentId)),
        })),
        filledDays: new Set(items.map((i: any) => i.dayIndex)).size,
        maxPerDay: MAX_PER_DAY,
      },
    });
  } catch (e: any) { fail(res, 500, e.message); }
};

/** The content library for the builder's picker. */
export const libraryFor = async (req: AuthRequest, res: Response) => {
  try {
    const lab = String(req.query.lab || '');
    const search = String(req.query.q || '').trim();
    const rx = search ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    if (lab === 'thinking') {
      if (String(req.query.source || 'bank') === 'lms') {
        // The institute's own LMS problems (the older library).
        const q: any = { tenantId: tid(req), ...audienceFilter('lms') };
        if (rx) q.title = rx;
        const rows = await ThinkingProblem.find(q).select('title category difficulty').sort({ title: 1 }).limit(500).lean();
        return res.json({ success: true, data: rows.map((r: any) => ({ ...r, kind: 'problem', type: 'coding' })) });
      }
      // The shared Thinking Lab bank (the same questions CareerPilot uses), published only.
      const q: any = { status: 'PUBLISHED' };
      if (rx) q.$or = [{ title: rx }, { statement: rx }, { subCategory: rx }];
      for (const [k, field] of [['type', 'type'], ['difficulty', 'difficulty'], ['subCategory', 'subCategory']] as const) {
        const v = String(req.query[k] || '').trim();
        if (v) q[field] = v;
      }
      const year = String(req.query.year || '').trim();
      if (year) q.$and = [{ $or: [{ years: { $size: 0 } }, { years: year }] }];
      const rows = await ThinkingQuestion.find(q).select('title type subCategory difficulty years number').sort({ type: 1, difficulty: 1, number: 1 }).limit(300).lean();
      const total = await ThinkingQuestion.countDocuments(q);
      return res.json({ success: true, data: rows.map((r: any) => ({ ...r, kind: 'question', category: r.subCategory || r.type })), total });
    }
    if (lab === 'communication') {
      const q: any = { tenantId: oid(tid(req)) };
      if (rx) q.title = rx;
      const rows = await CommunicationChallenge.find(q).select('title challengeType').sort({ title: 1 }).limit(500).lean();
      return res.json({ success: true, data: rows });
    }
    return fail(res, 400, 'lab must be thinking or communication');
  } catch (e: any) { fail(res, 500, e.message); }
};

/**
 * Set days in bulk — the builder saves a day, a week, or a whole plan in one call.
 *
 * Body, either form:
 *   { days:  [{ dayIndex, items: [{ contentId, contentKind?, concept?, optional? }] }] }  — REPLACES each day's
 *            questions with that list, in that order (an empty list clears the day). Up to MAX_PER_DAY a day.
 *   { items: [{ dayIndex, position?, contentId, ... }] }  — sets one slot (position 0 by default);
 *            contentId null clears that slot. Kept so older callers keep working.
 */
export const setTrackItems = async (req: AuthRequest, res: Response) => {
  try {
    const track: any = await LabTrack.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!track) return fail(res, 404, 'Track not found');
    const kindOf = (it: any) => (track.lab === 'thinking' ? { contentKind: it?.contentKind === 'question' ? 'question' : 'problem' } : {});
    const slot = (day: number, position: number, it: any) => ({
      tenantId: tid(req), trackId: track._id, dayIndex: day, position,
      contentId: oid(it.contentId), concept: it.concept || undefined, optional: !!it.optional, ...kindOf(it),
    });
    const badDay = (day: number) => !Number.isInteger(day) || day < 1 || day > track.totalDays;

    if (Array.isArray(req.body.days)) {
      if (!req.body.days.length) return fail(res, 400, 'days must be a non-empty array');
      const ops: any[] = [];
      for (const d of req.body.days) {
        const day = Number(d?.dayIndex);
        if (badDay(day)) return fail(res, 400, `dayIndex ${d?.dayIndex} is outside 1..${track.totalDays}`);
        const list = Array.isArray(d.items) ? d.items : [];
        if (list.length > MAX_PER_DAY) return fail(res, 400, `Day ${day}: at most ${MAX_PER_DAY} questions a day.`);
        const seen = new Set<string>();
        for (const it of list) {
          if (!oid(it?.contentId)) return fail(res, 400, `Invalid contentId on day ${day}`);
          if (seen.has(String(it.contentId))) return fail(res, 400, `Day ${day} has the same question twice.`);
          seen.add(String(it.contentId));
        }
        ops.push({ deleteMany: { filter: { trackId: track._id, dayIndex: day } } });
        list.forEach((it: any, position: number) => ops.push({ insertOne: { document: slot(day, position, it) } }));
      }
      await LabTrackItem.bulkWrite(ops, { ordered: true });
    } else {
      const items = Array.isArray(req.body.items) ? req.body.items : [];
      if (!items.length) return fail(res, 400, 'items must be a non-empty array');
      const ops: any[] = [];
      for (const it of items) {
        const day = Number(it.dayIndex);
        if (badDay(day)) return fail(res, 400, `dayIndex ${it.dayIndex} is outside 1..${track.totalDays}`);
        const position = Math.max(0, Math.min(MAX_PER_DAY - 1, Math.round(Number(it.position) || 0)));
        // A null contentId clears the slot, which is how the builder removes an item.
        if (it.contentId === null) {
          ops.push({ deleteOne: { filter: { trackId: track._id, dayIndex: day, position } } });
          continue;
        }
        if (!oid(it.contentId)) return fail(res, 400, `Invalid contentId on day ${day}`);
        ops.push({ updateOne: { filter: { trackId: track._id, dayIndex: day, position }, update: { $set: slot(day, position, it) }, upsert: true } });
      }
      await LabTrackItem.bulkWrite(ops, { ordered: false });
    }
    const filled = await filledDaysOf(track._id);
    res.json({ success: true, data: { filledDays: filled, totalDays: track.totalDays } });
  } catch (e: any) { fail(res, 500, e.message); }
};


/*
 * POST /lab-tracks/:id/autofill — "Fill the track for me".
 * Body: { year, mix: { math, logical, critical, coding }, ramp?: true, onlyEmpty?: true, perDay?: 1..5 }
 *
 * Fills the track's days from the shared Thinking Lab bank: questions for that year only, the types in the asked
 * mix (a weighted rotation, so the mix holds across every week), easy → medium → hard across the track when ramp is
 * on, and never the same question twice in one track. Year 1 gets no coding. Days already filled are kept unless
 * onlyEmpty is false. The admin can still swap any day by hand afterwards.
 */
export const autofillTrack = async (req: AuthRequest, res: Response) => {
  try {
    const track: any = await LabTrack.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!track) return fail(res, 404, 'Track not found');
    if (track.lab !== 'thinking') return fail(res, 400, 'Only Thinking Lab tracks can be filled from the question bank.');
    const YEARS = ['foundation', 'build', 'specialize', 'placement'];
    const year = String(req.body?.year || '');
    if (!YEARS.includes(year)) return fail(res, 400, 'Choose the year this track is for.');
    const onlyEmpty = req.body?.onlyEmpty !== false;
    // Questions each filled day gets (a day may hold several).
    const perDay = Math.max(1, Math.min(MAX_PER_DAY, Math.round(Number(req.body?.perDay) || 1)));
    const ramp = req.body?.ramp !== false;
    const rawMix = req.body?.mix || {};
    const types = ['math', 'logical', 'critical', 'coding'] as const;
    const mix: Record<string, number> = {};
    for (const t of types) mix[t] = Math.max(0, Math.min(10, Math.round(Number(rawMix[t]) || 0)));
    if (year === 'foundation') mix.coding = 0;
    if (!types.some(t => mix[t] > 0)) return fail(res, 400, 'Pick at least one type of question.');

    const existing: any[] = await LabTrackItem.find({ trackId: track._id }).select('dayIndex contentId contentKind').lean();
    const filledDays = new Set(existing.map((i: any) => i.dayIndex));
    const used = new Set(existing.filter((i: any) => i.contentKind === 'question' && (onlyEmpty || false)).map((i: any) => String(i.contentId)));
    const days: number[] = [];
    for (let d = 1; d <= track.totalDays; d++) if (!onlyEmpty || !filledDays.has(d)) days.push(d);
    if (!days.length) return res.json({ success: true, data: { filled: 0, message: 'Every day already has a question.' } });

    // The pool: published, for this year, by type and difficulty, in a stable shuffled order (seeded by the track).
    const pool: any[] = await ThinkingQuestion.find({ status: 'PUBLISHED', type: { $in: types.filter(t => mix[t] > 0) }, $or: [{ years: { $size: 0 } }, { years: year }] })
      .select('_id type difficulty number').lean();
    let seed = 0; for (const ch of String(track._id)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const buckets: Record<string, Record<string, any[]>> = {};
    for (const t of types) buckets[t] = { easy: [], medium: [], hard: [] };
    for (const q of pool) if (!used.has(String(q._id)) && buckets[q.type]?.[q.difficulty]) buckets[q.type][q.difficulty].push(q);
    for (const t of types) for (const d of ['easy', 'medium', 'hard']) buckets[t][d].sort(() => rnd() - 0.5);

    // Weighted rotation of types: each day goes to the type furthest behind its share.
    const total = types.reduce((n, t) => n + mix[t], 0);
    const given: Record<string, number> = { math: 0, logical: 0, critical: 0, coding: 0 };
    const order = ['easy', 'medium', 'hard'];
    const target = (pos: number) => (!ramp ? null : pos < 0.4 ? 'easy' : pos < 0.8 ? 'medium' : 'hard');
    const take = (type: string, want: string | null) => {
      const prefs = want ? [want, ...order.filter(x => x !== want).sort((a, b) => Math.abs(order.indexOf(a) - order.indexOf(want)) - Math.abs(order.indexOf(b) - order.indexOf(want)))] : order.slice().sort(() => rnd() - 0.5);
      for (const d of prefs) { const q = buckets[type][d].shift(); if (q) return q; }
      return null;
    };
    const ops: any[] = [];
    const byType: Record<string, number> = {}; const byLevel: Record<string, number> = {};
    let short = 0; let filledNow = 0;
    days.forEach((day, i) => {
      const pos = days.length > 1 ? i / (days.length - 1) : 0;
      const picked: any[] = [];
      for (let k = 0; k < perDay; k++) {
        const ranked = types.filter(t => mix[t] > 0).sort((a, b) => (given[a] / mix[a]) - (given[b] / mix[b]) || mix[b] - mix[a]);
        let q: any = null;
        for (const t of ranked) { q = take(t, target(pos)); if (q) { given[t]++; break; } }
        if (!q) break;
        picked.push(q);
        byType[q.type] = (byType[q.type] || 0) + 1; byLevel[q.difficulty] = (byLevel[q.difficulty] || 0) + 1;
      }
      if (!picked.length) { short++; return; }
      filledNow++;
      // The day is replaced as a whole, so a refill never leaves an old question in a later slot.
      ops.push({ deleteMany: { filter: { trackId: track._id, dayIndex: day } } });
      picked.forEach((q, position) => ops.push({ insertOne: { document: {
        tenantId: tid(req), trackId: track._id, dayIndex: day, position, contentId: q._id, contentKind: 'question', optional: false,
      } } }));
    });
    if (ops.length) await LabTrackItem.bulkWrite(ops, { ordered: true });
    const filled = await filledDaysOf(track._id);
    void total;
    res.json({ success: true, data: {
      filled: filledNow, filledDays: filled, totalDays: track.totalDays, byType, byLevel,
      short, message: short ? `${short} day(s) could not be filled — the bank has no more unused questions of the chosen types for this year.` : undefined,
    } });
  } catch (e: any) { fail(res, 500, e.message); }
};

// ── Batch assignments ───────────────────────────────────────────────────────

export const listAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const q: any = { tenantId: tid(req) };
    if (req.query.batchId) q.batchId = oid(req.query.batchId);
    const rows = await LabTrackAssignment.find(q).populate('trackId', 'name lab totalDays status').lean();

    res.json({
      success: true,
      data: rows.map((a: any) => ({
        ...a,
        // Show where each batch actually is today — the number staff will ask for.
        currentDay: dayIndexFor(a),
        expectedSoFar: expectedDaysSoFar(a),
      })),
    });
  } catch (e: any) { fail(res, 500, e.message); }
};

/** Attach a track to a batch, or update that attachment. One active plan per lab. */
export const upsertAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { batchId, trackId, lab, startDate } = req.body;
    if (!oid(batchId) || !oid(trackId)) return fail(res, 400, 'batchId and trackId are required');
    if (!['thinking', 'communication'].includes(lab)) return fail(res, 400, 'lab must be thinking or communication');
    if (!startDate || isNaN(new Date(startDate).getTime())) return fail(res, 400, 'A valid startDate is required');

    const track: any = await LabTrack.findOne({ _id: oid(trackId), tenantId: tid(req) }).lean();
    if (!track) return fail(res, 404, 'Track not found');
    if (track.lab !== lab) return fail(res, 400, `That track is a ${track.lab} track`);

    const existing: any = await LabTrackAssignment.findOne({
      tenantId: tid(req), batchId: oid(batchId), lab, status: 'active',
    });
    const doc: any = existing || new LabTrackAssignment({ tenantId: tid(req), batchId: oid(batchId), lab });

    doc.trackId = oid(trackId);
    doc.startDate = new Date(startDate);
    for (const k of ['workingDays', 'holidays', 'cadence', 'cadenceDays', 'status'] as const) {
      if (req.body[k] !== undefined) doc[k] = req.body[k];
    }
    if (req.body.window) doc.window = { ...(doc.window || {}), ...req.body.window };
    if (req.body.gate) doc.gate = { ...(doc.gate?.toObject?.() || doc.gate || {}), ...req.body.gate };

    await doc.save();
    res.json({ success: true, data: doc, currentDay: dayIndexFor(doc) });
  } catch (e: any) { fail(res, 500, e.message); }
};

export const deleteAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const gone = await LabTrackAssignment.findOneAndDelete({ _id: req.params.id, tenantId: tid(req) });
    if (!gone) return fail(res, 404, 'Assignment not found');
    res.json({ success: true, message: 'Assignment removed' });
  } catch (e: any) { fail(res, 500, e.message); }
};

/** Preview what a batch gets today — lets an admin confirm before students see it. */
export const previewToday = async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query as any;
    const { batchId, lab } = q;
    // The form's own values: preview what WILL happen once saved, not what is saved now.
    if (q.trackId) {
      if (!oid(q.trackId) || !q.startDate) return fail(res, 400, 'trackId and startDate are required');
      const track: any = await LabTrack.findOne({ _id: q.trackId, tenantId: tid(req) }).select('_id').lean();
      if (!track) return fail(res, 404, 'Track not found');
      const nums = (v: any) => String(v || '').split(',').filter(x => x !== '').map(Number).filter(n => n >= 0 && n <= 6);
      const draft = {
        trackId: track._id,
        startDate: new Date(q.startDate),
        workingDays: q.workingDays !== undefined ? nums(q.workingDays) : [1, 2, 3, 4, 5],
        cadence: q.cadence === 'custom' ? 'custom' : 'daily',
        cadenceDays: nums(q.cadenceDays),
        holidays: [],
        window: { startTime: q.startTime || '00:00', endTime: q.endTime || '23:59', tz: 'Asia/Kolkata' },
      };
      if (isNaN(draft.startDate.getTime())) return fail(res, 400, 'Invalid start date');
      return res.json({ success: true, data: await resolveDayFor(draft) });
    }
    if (!oid(batchId)) return fail(res, 400, 'batchId is required');
    const resolved = await resolveLabDay(tid(req), String(batchId), lab);
    res.json({ success: true, data: resolved });
  } catch (e: any) { fail(res, 500, e.message); }
};


// ── Gate ────────────────────────────────────────────────────────────────────

/**
 * The signed-in student's own gate state. The client shell calls this to decide whether
 * to show a banner, an interstitial, or hold a section shut.
 *
 * This is the ADVISORY read. It is never the enforcement: a client can simply not call
 * it, so anything that actually matters must check isAreaBlocked() on its own route.
 */
export const myGate = async (req: AuthRequest, res: Response) => {
  try {
    const gate = await resolveLabGate(String(req.user?.id || ''), tid(req));
    res.json({ success: true, data: gate });
  } catch (e: any) {
    // A gate that errors must FAIL OPEN. A bug in this file must never be the reason a
    // student cannot reach their lessons.
    res.json({ success: true, data: { mode: 'off', blockedAreas: [], neverBlock: [], pending: [], reason: 'gate_error' } });
  }
};

/** Admin view of any student's gate — for answering "why am I locked out?". */
export const studentGate = async (req: AuthRequest, res: Response) => {
  try {
    const gate = await resolveLabGate(String(req.params.userId), tid(req));
    res.json({ success: true, data: gate });
  } catch (e: any) { fail(res, 500, e.message); }
};

/** Release one student from the gate (broken mic, connectivity, anything). */
export const setBypass = async (req: AuthRequest, res: Response) => {
  try {
    const { batchId, lab, userId, enabled } = req.body;
    if (!oid(batchId) || !oid(userId)) return fail(res, 400, 'batchId and userId are required');
    const a: any = await LabTrackAssignment.findOne({ tenantId: tid(req), batchId: oid(batchId), lab, status: 'active' });
    if (!a) return fail(res, 404, 'No active plan for that batch and lab');

    const list = (a.gate.bypassStudentIds || []).map(String).filter((x: string) => x !== String(userId));
    if (enabled !== false) list.push(String(userId));
    a.gate.bypassStudentIds = list.map((x: string) => oid(x));
    await a.save();
    res.json({ success: true, data: { bypassed: enabled !== false, count: list.length } });
  } catch (e: any) { fail(res, 500, e.message); }
};


// ── Progress ────────────────────────────────────────────────────────────────

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const ymdPlus = (ymd: string, days: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const fullName = (s: any) => `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email;

/** The date range asked for, clamped to sane values: default the last 30 days, never past today, at most ~2 years. */
function rangeOf(q: any, todayKey: string): { from: string; to: string } {
  let to = YMD.test(String(q.to || '')) ? String(q.to) : todayKey;
  if (to > todayKey) to = todayKey;
  let from = YMD.test(String(q.from || '')) ? String(q.from) : ymdPlus(to, -29);
  if (from > to) from = to;
  if (from < ymdPlus(to, -730)) from = ymdPlus(to, -730);
  return { from, to };
}

/** Last time each student did any daily lab work (all time, not only the range). */
async function lastActivityOf(lab: 'thinking' | 'communication', ids: any[]): Promise<Map<string, Date>> {
  const rows: any[] = lab === 'thinking'
    ? await DailyChallenge.aggregate([
      { $match: { studentId: { $in: ids }, status: { $in: ['submitted', 'solved'] } } },
      { $group: { _id: '$studentId', at: { $max: '$updatedAt' } } },
    ])
    : await CommunicationAttempt.aggregate([
      { $match: { studentId: { $in: ids }, status: 'completed', kind: { $ne: 'coach' } } },
      { $group: { _id: '$studentId', at: { $max: '$createdAt' } } },
    ]);
  return new Map(rows.map((r) => [String(r._id), r.at]));
}

/**
 * Per-student progress for one batch (or every batch with a plan for this lab) over a date range.
 *
 * GET /lab-tracks/progress?lab=thinking|communication&batchId=<id>|all&from=YYYY-MM-DD&to=YYYY-MM-DD[&format=xlsx]
 *
 * A day counts as DONE only when every question it holds was answered that day; a day with some of its
 * questions answered is PARTLY done. `expected` comes from each batch's own calendar (working days,
 * holidays, cadence) inside the range, so a batch with two holidays is not judged against one without.
 * Students come back worst first — the list exists to find the people who have stopped.
 */
export const labProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { lab } = req.query as any;
    const batchParam = String(req.query.batchId || '');
    if (!['thinking', 'communication'].includes(lab)) return fail(res, 400, 'lab must be thinking or communication');
    const all = batchParam === 'all';
    if (!all && !oid(batchParam)) return fail(res, 400, 'batchId is required');

    const tenantId = tid(req);
    const assignments: any[] = await LabTrackAssignment.find({
      tenantId, lab, status: 'active', ...(all ? {} : { batchId: oid(batchParam) }),
    }).populate('trackId', 'name totalDays').lean();
    if (!assignments.length) return res.json({ success: true, data: { assigned: false, students: [], batches: [] } });

    const todayKey = ymdIn(new Date(), 'Asia/Kolkata');
    const { from, to } = rangeOf(req.query, todayKey);
    const batchNames = new Map((await Batch.find({ _id: { $in: assignments.map((a) => a.batchId) } }).select('name').lean())
      .map((b: any) => [String(b._id), b.name]));

    // Students match on batch; tenantId is stored inconsistently across collections, so the batch is the key.
    const students: any[] = await User.find({ batchId: { $in: assignments.map((a) => a.batchId) }, role: 'STUDENT', isActive: true })
      .select('firstName lastName email batchId').lean();
    const ids = students.map((s) => s._id);
    const [done, last] = await Promise.all([questionsDoneByDate(lab, ids, from, to), lastActivityOf(lab, ids)]);

    const rows: any[] = [];
    const batches: any[] = [];
    for (const a of assignments) {
      const tz = a.window?.tz || 'Asia/Kolkata';
      const dates = learningDates(a, new Date(`${to}T12:00:00Z`)).filter((d) => d.date >= from && d.date <= to);
      const perDay = await questionsPerDay(a.trackId?._id || a.trackId);
      const need = (dayIndex: number) => Math.max(1, perDay.get(dayIndex) || 1);
      const today = dates.find((d) => d.date === ymdIn(new Date(), tz));
      const mine = students.filter((s) => String(s.batchId) === String(a.batchId));
      const bRows = mine.map((s) => {
        const byDate = done.get(String(s._id));
        let completed = 0; let partial = 0;
        for (const d of dates) {
          const n = byDate?.get(d.date) || 0;
          if (n >= need(d.dayIndex)) completed++; else if (n > 0) partial++;
        }
        const expected = dates.length;
        const lastAt = last.get(String(s._id)) || null;
        const doneToday = !!today && (byDate?.get(today.date) || 0) >= need(today.dayIndex);
        const missed = Math.max(0, expected - completed);
        return {
          _id: String(s._id), name: fullName(s), email: s.email,
          batchId: String(a.batchId), batchName: batchNames.get(String(a.batchId)) || '',
          completed, partial, expected, missed,
          rate: expected ? Math.round((completed / expected) * 100) : 0,
          doneToday,
          today: today ? { done: Math.min(byDate?.get(today.date) || 0, need(today.dayIndex)), total: need(today.dayIndex) } : null,
          lastActivity: lastAt,
          status: !lastAt ? 'never' : doneToday ? 'done_today' : missed === 0 ? 'on_track' : 'behind',
        };
      });
      rows.push(...bRows);
      batches.push({
        batchId: String(a.batchId), batchName: batchNames.get(String(a.batchId)) || '',
        track: a.trackId, startDate: a.startDate, gate: a.gate?.mode, currentDay: dayIndexFor(a),
        expected: dates.length, students: bRows.length,
        questionsToday: today ? need(today.dayIndex) : 0,
        avgRate: bRows.length ? Math.round(bRows.reduce((n, r) => n + r.rate, 0) / bRows.length) : 0,
      });
    }
    rows.sort((x, y) => x.rate - y.rate || y.missed - x.missed || x.name.localeCompare(y.name));
    batches.sort((x, y) => x.batchName.localeCompare(y.batchName));

    const summary = {
      students: rows.length,
      doneToday: rows.filter((r) => r.doneToday).length,
      onTrack: rows.filter((r) => r.missed === 0).length,
      behind: rows.filter((r) => r.missed > 0).length,
      never: rows.filter((r) => r.status === 'never').length,
      avgRate: rows.length ? Math.round(rows.reduce((s, r) => s + r.rate, 0) / rows.length) : 0,
    };

    if (req.query.format === 'xlsx') {
      const XLSX = await import('xlsx');
      const labName = lab === 'thinking' ? 'Thinking Lab' : 'Communication Lab';
      const sheet = XLSX.utils.aoa_to_sheet([
        [`${labName} progress`, `${from} to ${to}`, all ? 'All batches' : (batches[0]?.batchName || '')],
        [],
        ['Student', 'Email', 'Batch', 'Days done', 'Partly done', 'Expected', 'Missed', 'Completion %', 'Today', 'Last activity'],
        ...rows.map((r) => [r.name, r.email, r.batchName, r.completed, r.partial, r.expected, r.missed, r.rate,
          r.today ? `${r.today.done}/${r.today.total}` : '—',
          r.lastActivity ? new Date(r.lastActivity).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : 'Never']),
      ]);
      sheet['!cols'] = [28, 30, 22, 10, 11, 10, 9, 13, 8, 15].map((wch) => ({ wch }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, 'Progress');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${lab}-lab-progress-${from}-to-${to}.xlsx"`);
      return res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    }

    const one = !all ? batches[0] : null;
    res.json({
      success: true,
      data: {
        assigned: true, from, to, batches, summary, students: rows,
        // One batch: the same header fields the panel showed before.
        ...(one ? { track: one.track, startDate: one.startDate, gate: one.gate, currentDay: one.currentDay, expected: one.expected } : {}),
      },
    });
  } catch (e: any) { fail(res, 500, e.message); }
};

/**
 * One student's daily lab, day by day, over a date range: each day's questions, which were answered,
 * and the score. GET /lab-tracks/progress/student?lab=&studentId=&from=&to=
 */
export const labStudentProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { lab } = req.query as any;
    if (!['thinking', 'communication'].includes(lab)) return fail(res, 400, 'lab must be thinking or communication');
    const sid = oid(req.query.studentId);
    if (!sid) return fail(res, 400, 'studentId is required');
    const tenantId = tid(req);
    const s: any = await User.findOne({ _id: sid, role: 'STUDENT' }).select('firstName lastName email batchId tenantId').lean();
    if (!s || String(s.tenantId) !== tenantId) return fail(res, 404, 'Student not found');
    const a: any = s.batchId ? await LabTrackAssignment.findOne({ tenantId, batchId: s.batchId, lab, status: 'active' }).populate('trackId', 'name').lean() : null;
    if (!a) return res.json({ success: true, data: { assigned: false, student: { _id: String(s._id), name: fullName(s), email: s.email }, days: [] } });

    const tz = a.window?.tz || 'Asia/Kolkata';
    const todayKey = ymdIn(new Date(), tz);
    const { from, to } = rangeOf(req.query, todayKey);
    const dates = learningDates(a, new Date(`${to}T12:00:00Z`)).filter((d) => d.date >= from && d.date <= to);
    const items: any[] = await LabTrackItem.find({ trackId: a.trackId._id, dayIndex: { $in: dates.map((d) => d.dayIndex) } })
      .sort({ dayIndex: 1, position: 1 }).lean();

    // What the student answered in the range, by date and question.
    type Rec = { contentId: string; score: number | null; solved?: boolean; at: Date };
    const recs = new Map<string, Rec[]>();
    const push = (date: string, r: Rec) => recs.set(date, [...(recs.get(date) || []), r]);
    if (lab === 'thinking') {
      const rows: any[] = await DailyChallenge.find({ studentId: sid, date: { $gte: from, $lte: to }, status: { $in: ['submitted', 'solved'] } })
        .select('date problemId score status passed updatedAt').lean();
      for (const r of rows) push(r.date, { contentId: String(r.problemId), score: typeof r.score === 'number' ? r.score : null, solved: r.status === 'solved' || !!r.passed, at: r.updatedAt });
    } else {
      const rows: any[] = await CommunicationAttempt.find({ studentId: sid, practiceDate: { $gte: from, $lte: to }, status: 'completed', kind: { $ne: 'coach' } })
        .select('practiceDate challengeId evaluation.overallScore overriddenScore createdAt').lean();
      for (const r of rows) push(r.practiceDate, { contentId: String(r.challengeId), score: typeof r.overriddenScore === 'number' ? r.overriddenScore : (r.evaluation?.overallScore ?? null), at: r.createdAt });
    }

    // Titles for every question involved (the day's, and any answered that is no longer on the day).
    const allIds = [...new Set([...items.map((i) => String(i.contentId)), ...[...recs.values()].flat().map((r) => r.contentId)])];
    const titles = new Map<string, string>();
    if (lab === 'thinking') {
      const [qs, ps] = await Promise.all([
        ThinkingQuestion.find({ _id: { $in: allIds } }).select('title').lean(),
        ThinkingProblem.find({ _id: { $in: allIds } }).select('title').lean(),
      ]);
      [...qs, ...ps].forEach((x: any) => titles.set(String(x._id), x.title));
    } else {
      (await CommunicationChallenge.find({ _id: { $in: allIds } }).select('title').lean()).forEach((x: any) => titles.set(String(x._id), x.title));
    }

    const days = dates.slice().reverse().map((d) => {
      const planned = items.filter((i) => i.dayIndex === d.dayIndex);
      const answered = recs.get(d.date) || [];
      const byId = new Map(answered.map((r) => [r.contentId, r]));
      const questions = planned.map((i) => {
        const r = byId.get(String(i.contentId));
        return { title: titles.get(String(i.contentId)) || 'Question (deleted)', done: !!r, score: r?.score ?? null, solved: r?.solved };
      });
      // Answered, but not (or no longer) on this day of the plan — a day set by hand, or an edited track.
      for (const r of answered) if (!planned.some((i) => String(i.contentId) === r.contentId)) {
        questions.push({ title: titles.get(r.contentId) || 'Question', done: true, score: r.score, solved: r.solved });
      }
      const total = Math.max(1, planned.length);
      const doneN = new Set(answered.map((r) => r.contentId)).size;
      const status = doneN >= total ? 'done' : d.date === todayKey ? 'today' : doneN > 0 ? 'partial' : 'missed';
      const scores = questions.map((q) => q.score).filter((x): x is number => typeof x === 'number');
      return { date: d.date, dayIndex: d.dayIndex, total, done: Math.min(doneN, total), status, questions,
        avgScore: scores.length ? Math.round(scores.reduce((n, x) => n + x, 0) / scores.length) : null };
    });

    res.json({
      success: true,
      data: {
        assigned: true, from, to,
        student: { _id: String(s._id), name: fullName(s), email: s.email },
        track: a.trackId,
        summary: {
          expected: days.length,
          done: days.filter((d) => d.status === 'done').length,
          partial: days.filter((d) => d.status === 'partial').length,
          missed: days.filter((d) => d.status === 'missed').length,
        },
        days,
      },
    });
  } catch (e: any) { fail(res, 500, e.message); }
};


// ── XP leaderboard ──────────────────────────────────────────────────────────

/**
 * Top XP earners, shown on everyone's dashboard as a motivator.
 *
 * Eligibility is checked live rather than trusted from the stats row: a student must
 * still be ACTIVE and sit in an ACTIVE batch. Someone who left, or a batch that has
 * finished, would otherwise sit at the top of a board they can no longer compete on —
 * and since prizes hang off this, a stale name is worse than an empty board.
 *
 * Only first name plus a last initial is returned. This is shown to every student in the
 * tenant, so it needs to identify a winner without publishing a full roster of names and
 * nothing more than the ranking requires.
 */
export const xpLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tid(req);
    const limit = Math.min(Number(req.query.limit) || 3, 20);

    const activeBatches = await Batch.find({ isActive: true }).select('_id').lean();
    const batchIds = activeBatches.map((b: any) => b._id);
    if (!batchIds.length) return res.json({ success: true, data: { top: [], me: null } });

    const students: any[] = await User.find({
      role: 'STUDENT', isActive: true, batchId: { $in: batchIds },
    }).select('firstName lastName batchId').lean();
    if (!students.length) return res.json({ success: true, data: { top: [], me: null } });

    const byId = new Map(students.map((s: any) => [String(s._id), s]));
    const stats: any[] = await StudentGameStats.find({
      tenantId, studentId: { $in: students.map((s: any) => s._id) },
    }).select('studentId xpTotal level currentStreak').lean();

    const ranked = stats
      .filter(r => (r.xpTotal || 0) > 0)          // zero XP is not a placing
      .sort((a, b) => (b.xpTotal || 0) - (a.xpTotal || 0));

    const shortName = (u: any) =>
      `${u?.firstName || ''} ${(u?.lastName || '').charAt(0)}${u?.lastName ? '.' : ''}`.trim() || 'Student';

    const top = ranked.slice(0, limit).map((r, i) => ({
      rank: i + 1,
      name: shortName(byId.get(String(r.studentId))),
      xp: r.xpTotal || 0,
      level: r.level || 1,
      streak: r.currentStreak || 0,
    }));

    // The viewer's own standing, so the board means something to someone outside the top.
    const meId = String(req.user?.id || '');
    const meIdx = ranked.findIndex(r => String(r.studentId) === meId);
    const me = meIdx >= 0
      ? { rank: meIdx + 1, xp: ranked[meIdx].xpTotal || 0, of: ranked.length }
      : null;

    res.json({ success: true, data: { top, me, totalRanked: ranked.length } });
  } catch (e: any) { fail(res, 500, e.message); }
};
