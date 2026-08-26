import { Response } from 'express';
import mongoose from 'mongoose';
import { LabTrack, LabTrackItem, LabTrackAssignment } from '../models/LabTrack';
import ThinkingProblem, { audienceFilter } from '../models/ThinkingProblem';
import CommunicationChallenge from '../models/CommunicationChallenge';
import { AuthRequest } from '../types/express';
import { resolveLabDay, dayIndexFor, expectedDaysSoFar } from '../services/labTrackService';
import { resolveLabGate } from '../services/labGateService';
import { expectedDaysSoFar as _expected, ymdIn } from '../services/labTrackService';
import User from '../models/User';
import DailyChallenge from '../models/DailyChallenge';
import CommunicationAttempt from '../models/CommunicationAttempt';
import StudentGameStats from '../models/StudentGameStats';
import Batch from '../models/Batch';

/** Admin API for lab tracks: author a plan once, attach it to any batch. */

const tid = (req: AuthRequest) => String(req.user?.tenantId || '');
const oid = (v: any) => (v && mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : null);
const fail = (res: Response, code: number, message: string) => res.status(code).json({ success: false, message });

// ── Tracks ──────────────────────────────────────────────────────────────────

export const listTracks = async (req: AuthRequest, res: Response) => {
  try {
    const q: any = { tenantId: tid(req) };
    if (req.query.lab) q.lab = req.query.lab;
    const tracks = await LabTrack.find(q).sort({ createdAt: -1 }).lean();

    // Item counts come from one grouped query, not one per track.
    const counts = await LabTrackItem.aggregate([
      { $match: { trackId: { $in: tracks.map((t: any) => t._id) } } },
      { $group: { _id: '$trackId', n: { $sum: 1 } } },
    ]);
    const byTrack = new Map(counts.map((c: any) => [String(c._id), c.n]));

    res.json({
      success: true,
      data: tracks.map((t: any) => ({
        ...t,
        filledDays: byTrack.get(String(t._id)) || 0,
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
        const filled = await LabTrackItem.countDocuments({ trackId: track._id });
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

    const items = await LabTrackItem.find({ trackId: track._id }).sort({ dayIndex: 1 }).lean();
    const ids = items.map((i: any) => i.contentId);
    const bank: any[] = track.lab === 'thinking'
      ? await ThinkingProblem.find({ _id: { $in: ids } }).select('title category difficulty').lean()
      : await CommunicationChallenge.find({ _id: { $in: ids } }).select('title challengeType').lean();
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
        filledDays: items.length,
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
      // The admin assigns Thinking Lab work, so the pickable list is the LMS audience.
      const q: any = { tenantId: tid(req), ...audienceFilter('lms') };
      if (rx) q.title = rx;
      const rows = await ThinkingProblem.find(q).select('title category difficulty').sort({ title: 1 }).limit(500).lean();
      return res.json({ success: true, data: rows });
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
 * Set days in bulk — the builder saves a week, or a whole plan, in one call.
 * Body: { items: [{ dayIndex, contentId, concept?, optional? }] }
 */
export const setTrackItems = async (req: AuthRequest, res: Response) => {
  try {
    const track: any = await LabTrack.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!track) return fail(res, 404, 'Track not found');

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) return fail(res, 400, 'items must be a non-empty array');

    const ops: any[] = [];
    for (const it of items) {
      const day = Number(it.dayIndex);
      if (!Number.isInteger(day) || day < 1 || day > track.totalDays) {
        return fail(res, 400, `dayIndex ${it.dayIndex} is outside 1..${track.totalDays}`);
      }
      // A null contentId clears the day, which is how the builder removes an item.
      if (it.contentId === null) {
        ops.push({ deleteOne: { filter: { trackId: track._id, dayIndex: day } } });
        continue;
      }
      if (!oid(it.contentId)) return fail(res, 400, `Invalid contentId on day ${day}`);
      ops.push({
        updateOne: {
          filter: { trackId: track._id, dayIndex: day },
          update: {
            $set: {
              tenantId: tid(req), trackId: track._id, dayIndex: day,
              contentId: oid(it.contentId), concept: it.concept || undefined,
              optional: !!it.optional,
            },
          },
          upsert: true,
        },
      });
    }
    await LabTrackItem.bulkWrite(ops, { ordered: false });
    const filled = await LabTrackItem.countDocuments({ trackId: track._id });
    res.json({ success: true, data: { filledDays: filled, totalDays: track.totalDays } });
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
    const { batchId, lab } = req.query as any;
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

/**
 * Per-student progress for one batch and lab: what has been done, what is owed, and
 * whether today is finished.
 *
 * Staff had no way to answer "is this batch actually doing the daily lab?" — the only
 * signal was a streak buried on an individual profile. `expected` comes from the batch's
 * own calendar (working days, holidays, cadence), so a batch that has had two holidays
 * is not judged against a batch that has not.
 */
export const labProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { batchId, lab } = req.query as any;
    if (!oid(batchId)) return fail(res, 400, 'batchId is required');
    if (!['thinking', 'communication'].includes(lab)) return fail(res, 400, 'lab must be thinking or communication');

    const tenantId = tid(req);
    const a: any = await LabTrackAssignment.findOne({
      tenantId, batchId: oid(batchId), lab, status: 'active',
    }).populate('trackId', 'name totalDays').lean();
    if (!a) return res.json({ success: true, data: { assigned: false, students: [] } });

    const expected = _expected(a);
    const today = ymdIn(new Date(), a.window?.tz || 'Asia/Kolkata');

    // Students match on batch; tenantId is stored inconsistently across collections, so
    // the batch is the reliable key here.
    const students: any[] = await User.find({ batchId: oid(batchId), role: 'STUDENT', isActive: true })
      .select('firstName lastName email').lean();
    const ids = students.map((s: any) => s._id);
    if (!ids.length) return res.json({ success: true, data: { assigned: true, expected, students: [] } });

    const done = new Map<string, { total: number; today: boolean; last?: Date }>();

    if (lab === 'thinking') {
      const rows = await DailyChallenge.find({
        studentId: { $in: ids }, status: { $in: ['submitted', 'solved'] },
      }).select('studentId date updatedAt').lean();
      for (const r of rows as any[]) {
        const k = String(r.studentId);
        const cur = done.get(k) || { total: 0, today: false };
        cur.total++;
        if (r.date === today) cur.today = true;
        if (!cur.last || r.updatedAt > cur.last) cur.last = r.updatedAt;
        done.set(k, cur);
      }
    } else {
      const rows = await CommunicationAttempt.find({
        studentId: { $in: ids }, status: 'completed',
      }).select('studentId practiceDate createdAt').lean();
      for (const r of rows as any[]) {
        const k = String(r.studentId);
        const cur = done.get(k) || { total: 0, today: false };
        cur.total++;
        const d = r.practiceDate || ymdIn(new Date(r.createdAt));
        if (d === today) cur.today = true;
        if (!cur.last || r.createdAt > cur.last) cur.last = r.createdAt;
        done.set(k, cur);
      }
    }

    const rows = students.map((s: any) => {
      const d = done.get(String(s._id)) || { total: 0, today: false };
      const completed = Math.min(d.total, expected);
      return {
        _id: String(s._id),
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email,
        email: s.email,
        completed, expected,
        missed: Math.max(0, expected - completed),
        rate: expected ? Math.round((completed / expected) * 100) : 0,
        doneToday: d.today,
        lastActivity: d.last || null,
      };
    }).sort((x, y) => x.rate - y.rate);   // worst first — that is who needs attention

    res.json({
      success: true,
      data: {
        assigned: true,
        track: a.trackId, startDate: a.startDate, gate: a.gate?.mode,
        currentDay: dayIndexFor(a), expected,
        summary: {
          students: rows.length,
          doneToday: rows.filter(r => r.doneToday).length,
          onTrack: rows.filter(r => r.missed === 0).length,
          behind: rows.filter(r => r.missed > 0).length,
          avgRate: rows.length ? Math.round(rows.reduce((s, r) => s + r.rate, 0) / rows.length) : 0,
        },
        students: rows,
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
