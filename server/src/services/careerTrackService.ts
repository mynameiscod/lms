import mongoose from 'mongoose';
import CareerTrack from '../models/CareerTrack';
import SkillPack from '../models/SkillPack';
import User from '../models/User';
import { deriveTrackKey } from '../data/careerTrackPolicy';
import { PackDef, TrackDef, TrackStage, TRACK_STAGES, resolveSplit, trackProblems, stageProblems } from '../data/careerTrackPolicy';

/**
 * The career-track catalogue (tracks and their skill packs) and which track a student is on.
 * Policy lives in data/careerTrackPolicy.ts; building a roadmap from a track is
 * careerTrackComposerService.
 */

export interface ResolvedTrack {
  track: TrackDef & { status: 'DRAFT' | 'LIVE' };
  packs: Map<string, PackDef>;
}

const asPack = (p: any): PackDef => ({
  key: String(p.key), title: String(p.title), kind: p.kind,
  topics: ((p.topics || []) as any[]).map(t => ({ topicCode: String(t.topicCode), priority: t.priority })),
});

const asTrack = (t: any) => ({
  key: String(t.key), name: String(t.name), language: String(t.language), status: t.status,
  buildPacks: (t.buildPacks || []).map(String),
  specializePacks: (t.specializePacks || []).map(String), placementPacks: (t.placementPacks || []).map(String),
  split: resolveSplit(t.split),
});

/** Every pack of the tenant, by key. */
export async function loadPacks(tenantId: string): Promise<Map<string, PackDef>> {
  const rows = await SkillPack.find({ tenantId }).lean() as any[];
  return new Map(rows.map(r => [String(r.key), asPack(r)]));
}

/** One track with the packs it needs, or null. */
export async function loadTrack(tenantId: string, key: string): Promise<ResolvedTrack | null> {
  const t = await CareerTrack.findOne({ tenantId, key }).lean() as any;
  if (!t) return null;
  return { track: asTrack(t), packs: await loadPacks(tenantId) };
}

/** Tracks a student may pick: LIVE ones whose packs are all in place. */
export async function liveTracks(tenantId: string): Promise<{ key: string; name: string; language: string; description: string | null }[]> {
  const [tracks, packs] = await Promise.all([
    CareerTrack.find({ tenantId, status: 'LIVE' }).sort({ order: 1, name: 1 }).lean() as Promise<any[]>,
    loadPacks(tenantId),
  ]);
  return tracks
    .filter(t => !trackProblems(asTrack(t), packs).length)
    .map(t => ({ key: String(t.key), name: String(t.name), language: String(t.language), description: t.description || null }));
}

/**
 * The track a student's roadmap for this stage is built from, or null (they are planned as before).
 *
 * Years 2, 3 and 4 have tracks (Year 2 only when the track has Year-2 packs). The track must exist and be LIVE — or have been set by an
 * admin, which is how a DRAFT track is piloted on a few students before it opens to everyone.
 * Never throws: a failed lookup must not cost a learner their roadmap.
 */
export async function trackForStudent(tenantId: string, studentId: string | null | undefined, stageKey: string | null | undefined): Promise<ResolvedTrack | null> {
  try {
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) return null;
    if (!TRACK_STAGES.includes(String(stageKey || '') as TrackStage)) return null;
    const user = await User.findOne({ _id: studentId, tenantId }).select('passport.careerTrack passport.primaryRole passport.preferredLanguages').lean() as any;
    const chosen = user?.passport?.careerTrack;
    /*
     * A track set by an admin, or already fixed from setup, stands. A track the student picked
     * under the old free picker does not: the track now follows setup (deriveTrackKey).
     */
    const fixed = chosen?.key && chosen.chosenBy && chosen.chosenBy !== 'student';
    const key = fixed ? String(chosen.key) : deriveTrackKey(user?.passport?.primaryRole, user?.passport?.preferredLanguages);
    if (!key) return null;
    const resolved = await loadTrack(tenantId, key);
    if (!resolved) return null;
    const byAdmin = fixed && chosen.chosenBy !== 'setup';
    if (resolved.track.status !== 'LIVE' && !byAdmin) return null;
    if (stageProblems(resolved.track, resolved.packs, String(stageKey)).length) return null;
    // First roadmap built from it: fix the track, so editing setup later cannot switch it.
    if (!fixed) {
      await User.updateOne({ _id: studentId, tenantId }, { $set: { 'passport.careerTrack': { key, chosenAt: new Date(), chosenBy: 'setup' } } });
    }
    return resolved;
  } catch (e: any) {
    console.error('[career-track] could not read the student\'s track:', e?.message || e);
    return null;
  }
}

/** Put a student on a track (the student picking a LIVE one, or an admin picking any). */
export async function setStudentTrack(
  tenantId: string, studentId: string, key: string | null, by: 'student' | string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return { ok: false, reason: 'That is not a member id.' };
  if (key) {
    const t = await CareerTrack.findOne({ tenantId, key }).select('status').lean() as any;
    if (!t) return { ok: false, reason: 'No such track.' };
    if (by === 'student' && t.status !== 'LIVE') return { ok: false, reason: 'That track is not open yet.' };
  }
  const r = await User.updateOne({ _id: studentId, tenantId }, key
    ? { $set: { 'passport.careerTrack': { key, chosenAt: new Date(), chosenBy: by } } }
    : { $unset: { 'passport.careerTrack': 1 } });
  return r.matchedCount ? { ok: true } : { ok: false, reason: 'No such member in this tenant.' };
}
