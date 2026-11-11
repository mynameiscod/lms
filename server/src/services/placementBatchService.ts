/**
 * Placement batches — an extra group drawn from students of several regular batches.
 *
 * A student keeps their home batch (User.batchId): curriculum, attendance, fees, quizzes and
 * reports all stay there. Membership of a placement batch lives in User.placementBatchIds.
 * A placement batch may TAKE OVER a lab (Thinking / Communication): for its members that lab's
 * daily challenge, window, gate and reports then come from the placement batch, and the home
 * batch's track for that lab is paused for them only.
 *
 * Each student therefore still has exactly one source per lab per day, so the one-record-per-day
 * rules, the single streak and the lab gate stay correct. Every lab code path asks
 * labBatchFor() instead of reading User.batchId directly.
 */
import mongoose from 'mongoose';
import Batch from '../models/Batch';
import User from '../models/User';

export type LabKind = 'thinking' | 'communication';
export const LAB_KINDS: LabKind[] = ['thinking', 'communication'];

const oid = (v: any) => (v instanceof mongoose.Types.ObjectId ? v : new mongoose.Types.ObjectId(String(v)));

/** The placement batch that takes over `lab` for a student, among the given memberships. */
async function takeoverBatch(tenantId: string, placementIds: any[], lab: LabKind): Promise<any | null> {
  const ids = (placementIds || []).filter((x) => mongoose.isValidObjectId(String(x))).map(oid);
  if (!ids.length) return null;
  const b: any = await Batch.findOne({
    _id: { $in: ids }, tenantId: oid(tenantId), isActive: true, kind: 'placement', takesOverLabs: lab,
  }).sort({ createdAt: -1 }).select('_id').lean();
  return b?._id || null;
}

/**
 * The batch that supplies `lab` for this student: a placement batch that takes the lab over,
 * else the home batch. `homeBatchId` is what the caller already loaded (User.batchId); pass it
 * so a student with no placement batch costs one small indexed read.
 */
export async function labBatchFor(tenantId: string, studentId: any, homeBatchId: any, lab: LabKind): Promise<any> {
  try {
    const u: any = await User.findById(studentId).select('placementBatchIds').lean();
    const taken = await takeoverBatch(tenantId, u?.placementBatchIds || [], lab);
    return taken || homeBatchId || null;
  } catch {
    return homeBatchId || null; // never take a lab screen down over this lookup
  }
}

/**
 * For reports over many students at once: studentId → lab batch, for those whose lab is taken
 * over by a placement batch. Students not in the map use their home batch.
 */
export async function labBatchOverrides(tenantId: string, studentIds: any[], lab: LabKind): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const users: any[] = await User.find({ _id: { $in: studentIds.map(oid) }, 'placementBatchIds.0': { $exists: true } })
    .select('placementBatchIds').lean();
  if (!users.length) return out;
  const allIds = [...new Set(users.flatMap((u) => (u.placementBatchIds || []).map(String)))];
  const batches: any[] = await Batch.find({
    _id: { $in: allIds.map(oid) }, tenantId: oid(tenantId), isActive: true, kind: 'placement', takesOverLabs: lab,
  }).sort({ createdAt: -1 }).select('_id').lean();
  const order = batches.map((b) => String(b._id)); // newest first, as labBatchFor picks
  for (const u of users) {
    const mine = new Set((u.placementBatchIds || []).map(String));
    const hit = order.find((id) => mine.has(id));
    if (hit) out.set(String(u._id), hit);
  }
  return out;
}

/** Members of a placement batch (students in this tenant who list it). */
export function placementMemberFilter(tenantId: string, batchId: any) {
  return { tenantId: oid(tenantId), role: 'STUDENT', placementBatchIds: oid(batchId) };
}

/**
 * Students whose `lab` is supplied by `batchId`: its own home students minus any taken over by a
 * placement batch, plus — when it is a placement batch that takes the lab over — its members
 * whose newest takeover is this batch. Used by lab reports so each student is counted once.
 */
export async function labStudentIds(tenantId: string, batchId: any, lab: LabKind, extra: Record<string, any> = {}): Promise<string[]> {
  const base = { tenantId: oid(tenantId), role: 'STUDENT', isActive: { $ne: false }, ...extra };
  const [home, members]: any[][] = await Promise.all([
    User.find({ ...base, batchId: oid(batchId) }).select('_id').lean(),
    User.find({ ...base, placementBatchIds: oid(batchId) }).select('_id').lean(),
  ]);
  const ids = [...new Set([...home, ...members].map((u) => String(u._id)))];
  if (!ids.length) return [];
  const over = await labBatchOverrides(tenantId, ids, lab);
  return ids.filter((id) => (over.get(id) || null) === String(batchId) || (!over.has(id) && home.some((h) => String(h._id) === id)));
}

/**
 * Every batch a student belongs to: home batch first, then placement batches. Quizzes,
 * assignments and live classes delivered to any of these reach the student.
 */
export async function studentBatchIds(studentId: any, homeBatchId?: any): Promise<string[]> {
  try {
    const u: any = await User.findById(studentId).select('batchId placementBatchIds').lean();
    const home = homeBatchId ? String(homeBatchId) : (u?.batchId ? String(u.batchId) : '');
    return [...new Set([home, ...((u?.placementBatchIds || []).map(String))].filter(Boolean))];
  } catch {
    return homeBatchId ? [String(homeBatchId)] : [];
  }
}
