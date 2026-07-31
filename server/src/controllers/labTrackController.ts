import { Response } from 'express';
import mongoose from 'mongoose';
import { LabTrack, LabTrackItem, LabTrackAssignment } from '../models/LabTrack';
import ThinkingProblem from '../models/ThinkingProblem';
import CommunicationChallenge from '../models/CommunicationChallenge';
import { AuthRequest } from '../types/express';
import { resolveLabDay, dayIndexFor, expectedDaysSoFar } from '../services/labTrackService';

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
      const q: any = { tenantId: tid(req) };
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
