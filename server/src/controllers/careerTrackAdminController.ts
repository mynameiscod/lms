import { deriveTrackKey } from '../data/careerTrackPolicy';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import CareerTrack from '../models/CareerTrack';
import SkillPack from '../models/SkillPack';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningContentLibrary from '../models/LearningContentLibrary';
import LearningCurriculum from '../models/LearningCurriculum';
import Quiz from '../models/Quiz';
import User from '../models/User';
import {
  validateTrackInput, validatePackInput, trackProblems, normaliseKey, resolveSplit,
} from '../data/careerTrackPolicy';
import { loadPacks, liveTracks, setStudentTrack } from '../services/careerTrackService';
import { rebuildRoadmap } from '../services/roadmapRebuildService';
import { FOUNDATION_JOURNEY_KIND } from '../services/foundationJourneyService';
import CurriculumEnrollment from '../models/CurriculumEnrollment';

/**
 * Admin: career tracks (role + language roadmaps from Year 3), their skill packs, and which track
 * a student is on. Student side: the LIVE tracks to pick from, and the pick.
 */
const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const actorOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || 'admin');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');
const tenantIds = (t: string): any[] => (mongoose.Types.ObjectId.isValid(t) ? [t, new mongoose.Types.ObjectId(t)] : [t]);
const fail = (res: Response, e: any, what: string) => {
  console.error(`[career-track] ${what}:`, e);
  res.status(500).json({ message: `Could not ${what}.` });
};

/**
 * A new track reaches a roadmap the student has not started at once: it is rebuilt from the track.
 * One already started is left as it is — an admin rebuilds it (completed days kept) when they choose.
 */
async function rebuildIfNotStarted(tenantId: string, studentId: string, by: string): Promise<boolean> {
  try {
    const sid = new mongoose.Types.ObjectId(studentId);
    const journeys = await LearningCurriculum.find({ tenantId, personalizedFor: sid, journeyKind: FOUNDATION_JOURNEY_KIND, adaptiveStage: { $in: ['build', 'specialize', 'placement'] } })
      .select('_id').lean() as any[];
    if (!journeys.length) return false;
    const started = await CurriculumEnrollment.exists({ curriculumId: { $in: journeys.map(j => j._id) }, studentId: sid, 'completedDays.0': { $exists: true } });
    if (started) return false;
    const r = await rebuildRoadmap(tenantId, studentId, { apply: true, by });
    return r.ok;
  } catch (e: any) {
    console.error('[career-track] rebuild after a track change failed:', e?.message || e);
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Tracks
 * ------------------------------------------------------------------ */

/** GET /passport/admin/career-tracks — every track, its problems, its students; every pack. */
export const listTracks = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [tracks, packs, packRows, students] = await Promise.all([
      CareerTrack.find({ tenantId }).sort({ order: 1, name: 1 }).lean() as Promise<any[]>,
      loadPacks(tenantId),
      SkillPack.find({ tenantId }).sort({ kind: 1, title: 1 }).lean() as Promise<any[]>,
      /* An aggregate does not cast: the tenant is matched as stored, string or ObjectId. */
      User.aggregate([{ $match: { tenantId: { $in: tenantIds(tenantId) }, 'passport.careerTrack.key': { $exists: true } } }, { $group: { _id: '$passport.careerTrack.key', n: { $sum: 1 } } }]),
    ]);
    const studentsOn = new Map(students.map((s: any) => [String(s._id), s.n]));
    res.json({
      tracks: tracks.map(t => ({
        key: t.key, name: t.name, language: t.language, description: t.description || '', status: t.status, order: t.order || 0,
        specializePacks: t.specializePacks || [], placementPacks: t.placementPacks || [], split: resolveSplit(t.split),
        problems: trackProblems({ key: t.key, name: t.name, language: t.language, specializePacks: t.specializePacks || [], placementPacks: t.placementPacks || [] }, packs),
        students: studentsOn.get(String(t.key)) || 0,
      })),
      packs: packRows.map(p => ({ key: p.key, title: p.title, kind: p.kind, description: p.description || '', topics: p.topics || [] })),
    });
  } catch (e) { fail(res, e, 'load the career tracks'); }
};

/** POST /passport/admin/career-tracks — a new track (always DRAFT). */
export const createTrack = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const v = validateTrackInput(req.body);
    if (!v.ok) return res.status(400).json({ message: 'The track was not saved.', errors: (v as { ok: false; errors: string[] }).errors });
    if (await CareerTrack.exists({ tenantId, key: v.value.key })) return res.status(409).json({ message: `A track ${v.value.key} already exists.` });
    await CareerTrack.create({ ...v.value, tenantId, description: req.body?.description || '', status: 'DRAFT', order: Number(req.body?.order) || 0, createdBy: actorOf(req), updatedBy: actorOf(req) });
    return listTracks(req, res);
  } catch (e) { fail(res, e, 'create the track'); }
};

/** PUT /passport/admin/career-tracks/:key — edit; LIVE only when nothing is missing. */
export const updateTrack = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const key = normaliseKey(req.params.key);
    const current = await CareerTrack.findOne({ tenantId, key }).lean() as any;
    if (!current) return res.status(404).json({ message: 'No such track.' });
    const v = validateTrackInput({ ...current, ...req.body, key });
    if (!v.ok) return res.status(400).json({ message: 'The track was not saved.', errors: (v as { ok: false; errors: string[] }).errors });
    const status = req.body?.status === 'LIVE' || req.body?.status === 'DRAFT' ? req.body.status : current.status;
    if (status === 'LIVE') {
      const problems = trackProblems(v.value, await loadPacks(tenantId));
      if (problems.length) return res.status(400).json({ message: 'This track cannot go live yet.', errors: problems });
    }
    await CareerTrack.updateOne({ tenantId, key }, { $set: {
      name: v.value.name, language: v.value.language, specializePacks: v.value.specializePacks, placementPacks: v.value.placementPacks,
      split: v.value.split, status, description: req.body?.description ?? current.description ?? '',
      order: req.body?.order !== undefined ? Number(req.body.order) || 0 : current.order, updatedBy: actorOf(req),
    } });
    return listTracks(req, res);
  } catch (e) { fail(res, e, 'save the track'); }
};

/** DELETE /passport/admin/career-tracks/:key — only while no student is on it. */
export const deleteTrack = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const key = normaliseKey(req.params.key);
    const on = await User.countDocuments({ tenantId, 'passport.careerTrack.key': key });
    if (on) return res.status(409).json({ message: `${on} student(s) are on this track. Move them to another track first.` });
    await CareerTrack.deleteOne({ tenantId, key });
    return listTracks(req, res);
  } catch (e) { fail(res, e, 'delete the track'); }
};

/* ------------------------------------------------------------------ *
 * Packs
 * ------------------------------------------------------------------ */

/** POST /passport/admin/skill-packs and PUT /passport/admin/skill-packs/:key — create or replace a pack. */
export const savePack = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const key = req.params.key ? normaliseKey(req.params.key) : normaliseKey(req.body?.key);
    const v = validatePackInput({ ...req.body, key });
    if (!v.ok) return res.status(400).json({ message: 'The pack was not saved.', errors: (v as { ok: false; errors: string[] }).errors });
    const exists = await SkillPack.exists({ tenantId, key });
    if (!req.params.key && exists) return res.status(409).json({ message: `A pack ${key} already exists.` });
    if (req.params.key && !exists) return res.status(404).json({ message: 'No such pack.' });
    const titles = new Map(((req.body?.topics || []) as any[]).map(t => [String(t?.topicCode || ''), t?.title ? String(t.title) : undefined]));
    await SkillPack.updateOne({ tenantId, key }, {
      $set: { title: v.value.title, kind: v.value.kind, description: req.body?.description || '',
        topics: v.value.topics.map(t => ({ ...t, title: titles.get(t.topicCode) })), updatedBy: actorOf(req) },
      $setOnInsert: { tenantId, key, createdBy: actorOf(req) },
    }, { upsert: true });
    return listTracks(req, res);
  } catch (e) { fail(res, e, 'save the pack'); }
};

/** DELETE /passport/admin/skill-packs/:key — only when no track uses it. */
export const deletePack = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const key = normaliseKey(req.params.key);
    const users = await CareerTrack.find({ tenantId, $or: [{ specializePacks: key }, { placementPacks: key }] }).select('name').lean() as any[];
    if (users.length) return res.status(409).json({ message: `Used by ${users.map(u => u.name).join(', ')}. Take it out of those tracks first.` });
    await SkillPack.deleteOne({ tenantId, key });
    return listTracks(req, res);
  } catch (e) { fail(res, e, 'delete the pack'); }
};

/**
 * GET /passport/admin/skill-packs/:key/coverage — for each topic of a pack: the lessons that teach
 * it (from any year) and what each still lacks. What an admin checks before a track goes live.
 */
export const packCoverage = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const pack = await SkillPack.findOne({ tenantId, key: normaliseKey(req.params.key) }).lean() as any;
    if (!pack) return res.status(404).json({ message: 'No such pack.' });
    const codes = ((pack.topics || []) as any[]).map(t => String(t.topicCode));
    const units = await CurriculumLearningUnit.find({ tenantId, topicCode: { $in: codes } })
      .select('unitCode title topicCode unitType stageKey status').sort({ displayOrder: 1 }).lean() as any[];
    const unitCodes = units.map(u => u.unitCode);
    const [content, quizzes] = await Promise.all([
      LearningContentLibrary.find({ tenantId, unitCode: { $in: unitCodes }, isPublished: true }).select('unitCode type title').lean() as Promise<any[]>,
      Quiz.find({ tenantId, unitCode: { $in: unitCodes } }).select('unitCode').lean() as Promise<any[]>,
    ]);
    const typesOf = new Map<string, Set<string>>();
    for (const c of content) {
      const k = String(c.unitCode);
      if (!typesOf.has(k)) typesOf.set(k, new Set());
      typesOf.get(k)!.add(/placeholder/i.test(String(c.title || '')) && c.type === 'video' ? 'video_placeholder' : String(c.type));
    }
    const quizOf = new Set(quizzes.map(q => String(q.unitCode)));
    res.json({
      key: pack.key,
      topics: ((pack.topics || []) as any[]).map(t => {
        const mine = units.filter(u => u.topicCode === t.topicCode);
        return {
          topicCode: t.topicCode, title: t.title || null, priority: t.priority,
          units: mine.map(u => {
            const types = typesOf.get(String(u.unitCode)) || new Set<string>();
            return {
              unitCode: u.unitCode, title: u.title, unitType: u.unitType, stageKey: u.stageKey, status: u.status,
              video: types.has('video') ? 'REAL' : types.has('video_placeholder') ? 'PLACEHOLDER' : 'NONE',
              notes: types.has('notes'), practice: [...types].some(x => x.startsWith('practice')), checkpoint: quizOf.has(String(u.unitCode)),
            };
          }),
        };
      }),
    });
  } catch (e) { fail(res, e, 'read the pack coverage'); }
};

/** GET /passport/admin/career-topics?q= — topics from every year's curriculum and the track pool, to add to a pack. */
export const searchTopics = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const q = String(req.query.q || '').trim().toLowerCase();
    const curricula = await LearningCurriculum.find({ tenantId, personalizedFor: null, adaptiveStage: { $in: ['foundation', 'build', 'specialize', 'placement', 'track'] } })
      .select('adaptiveStage topics.topicCode topics.title topics.moduleCode').lean() as any[];
    const found = new Map<string, { topicCode: string; title: string; stageKey: string; moduleCode: string }>();
    for (const c of curricula) for (const t of (c.topics || []) as any[]) {
      if (!t.topicCode || found.has(t.topicCode)) continue;
      found.set(t.topicCode, { topicCode: t.topicCode, title: t.title || t.topicCode, stageKey: c.adaptiveStage, moduleCode: t.moduleCode || '' });
    }
    // Track content written straight into the pool may have no curriculum row yet: its units name it.
    const pool = await CurriculumLearningUnit.aggregate([{ $match: { tenantId, stageKey: 'track' } }, { $group: { _id: '$topicCode', title: { $first: '$title' } } }]);
    for (const p of pool) if (p._id && !found.has(p._id)) found.set(p._id, { topicCode: p._id, title: p.title, stageKey: 'track', moduleCode: '' });
    const all = [...found.values()].filter(t => !q || t.title.toLowerCase().includes(q) || t.topicCode.toLowerCase().includes(q));
    res.json({ topics: all.slice(0, 200) });
  } catch (e) { fail(res, e, 'search the topics'); }
};

/** PUT /passport/admin/students/:studentId/career-track { key | null } — an admin puts a student on a track (any, even DRAFT). */
export const setStudentTrackAdmin = async (req: Request, res: Response) => {
  try {
    const key = req.body?.key ? normaliseKey(req.body.key) : null;
    const studentId = String(req.params.studentId || '');
    const r = await setStudentTrack(tenantOf(req), studentId, key, actorOf(req));
    if (!r.ok) return res.status(400).json({ message: r.reason });
    res.json({ ok: true, key, rebuilt: await rebuildIfNotStarted(tenantOf(req), studentId, actorOf(req)) });
  } catch (e) { fail(res, e, 'set the student\'s track'); }
};

/* ------------------------------------------------------------------ *
 * Student
 * ------------------------------------------------------------------ */

/**
 * GET /passport/me/career-tracks — the member's track, read only.
 *
 * The track follows the role and main language chosen in setup (deriveTrackKey); once a roadmap
 * is built from it, it is fixed. `current` is the fixed track if there is one, else the one setup
 * points to (shown before the roadmap is built), else null.
 */
export const myTracks = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const me = await User.findOne({ _id: userIdOf(req), tenantId }).select('passport.careerTrack passport.stage passport.primaryRole passport.preferredLanguages').lean() as any;
    const stored = me?.passport?.careerTrack;
    const fixed = stored?.key && stored.chosenBy && stored.chosenBy !== 'student';
    const current = fixed ? String(stored.key) : deriveTrackKey(me?.passport?.primaryRole, me?.passport?.preferredLanguages);
    const tracks = await liveTracks(tenantId);
    res.json({ stage: me?.passport?.stage || null, current, fixed: !!fixed, tracks, canChange: false });
  } catch (e) { fail(res, e, 'load the tracks'); }
};

/** PUT /passport/me/career-track — no longer open to members: the track follows setup. */
export const pickMyTrack = async (_req: Request, res: Response) => {
  res.status(403).json({ ok: false, message: 'Your career track comes from the role and language you chose in setup. To change it, raise a ticket in Help & Support.' });
};
