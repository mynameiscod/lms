import mongoose from 'mongoose';
import { Agreement, AgreementAcceptance, IAgreement } from '../models/Agreement';
import User from '../models/User';
import Batch from '../models/Batch';

/**
 * Terms & agreements (models/Agreement.ts): admin authoring + rollout, what each student still has to
 * accept, and the acceptance record (with signature when asked for).
 */

export class AgreementError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const oid = (v: any) => new mongoose.Types.ObjectId(String(v));
const isId = (v: any) => mongoose.isValidObjectId(String(v || ''));
const MAX_POINTS = 100;
const MAX_SIGNATURE = 300_000; // characters of PNG data URL — a hand-drawn signature is ~10–40 KB

/* ── Who an agreement is for ─────────────────────────────────────────────────────────────── */

interface Who { _id: any; role: string; batchId?: any; placementBatchIds?: any[]; lmsDemo?: any; isActive?: boolean }

/** Students only: real LMS accounts, never demo accounts. "All" means every student in a batch. */
export function appliesTo(ag: Pick<IAgreement, 'audience'>, user: Who): boolean {
  if (!user || user.role !== 'STUDENT' || user.lmsDemo?.at) return false;
  const a = ag.audience || ({ mode: 'all' } as any);
  if (a.mode === 'students') return (a.studentIds || []).some((s: any) => String(s) === String(user._id));
  if (a.mode === 'batches') {
    const mine = [user.batchId, ...(user.placementBatchIds || [])].filter(Boolean).map(String);
    return (a.batchIds || []).some((b: any) => mine.includes(String(b)));
  }
  return !!user.batchId;
}

/** The same rule as a database filter, for counting and listing the people an agreement covers. */
function audienceFilter(tenantId: string, ag: Pick<IAgreement, 'audience'>): any {
  const base: any = { tenantId: oid(tenantId), role: 'STUDENT', isActive: true, 'lmsDemo.at': { $exists: false } };
  const a = ag.audience || ({ mode: 'all' } as any);
  if (a.mode === 'students') return { ...base, _id: { $in: a.studentIds || [] } };
  if (a.mode === 'batches') return { ...base, $or: [{ batchId: { $in: a.batchIds || [] } }, { placementBatchIds: { $in: a.batchIds || [] } }] };
  return { ...base, batchId: { $ne: null } };
}

/* ── Caches: the gate asks on every student request ──────────────────────────────────────── */

const liveCache = new Map<string, { list: IAgreement[]; at: number }>();
const pendingCache = new Map<string, { blocking: number; at: number }>();
const TTL = 60_000;

function forget(tenantId: string) {
  liveCache.delete(tenantId);
  for (const k of pendingCache.keys()) if (k.startsWith(`${tenantId}:`)) pendingCache.delete(k);
}

async function liveAgreements(tenantId: string): Promise<IAgreement[]> {
  const hit = liveCache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL) return hit.list;
  const list = await Agreement.find({ tenantId, status: 'live' }).sort({ publishedAt: 1, createdAt: 1 }).lean<IAgreement[]>();
  liveCache.set(tenantId, { list, at: Date.now() });
  return list;
}

/* ── Student side ────────────────────────────────────────────────────────────────────────── */

const studentView = (a: any) => ({
  id: String(a._id), title: a.title, kind: a.kind, intro: a.intro || '', points: a.points || [],
  document: a.document?.url ? a.document : null, requireSignature: !!a.requireSignature, blockLms: !!a.blockLms, version: a.version,
});

/** Live agreements this student still has to accept (and the ones already accepted, for their records). */
export async function mine(tenantId: string, userId: string) {
  const user = await User.findById(userId).select('role batchId placementBatchIds lmsDemo').lean<Who>();
  if (!user) return { pending: [], accepted: [] };
  const mineAll = (await liveAgreements(tenantId)).filter((a) => appliesTo(a, user));
  if (!mineAll.length) { pendingCache.set(`${tenantId}:${userId}`, { blocking: 0, at: Date.now() }); return { pending: [], accepted: [] }; }
  const acc = await AgreementAcceptance.find({ tenantId, userId, agreementId: { $in: mineAll.map((a: any) => a._id) } })
    .select('agreementId version acceptedAt').lean<any[]>();
  const done = new Map<string, any>();
  for (const r of acc) done.set(`${r.agreementId}:${r.version}`, r);
  const pending: any[] = [];
  const accepted: any[] = [];
  for (const a of mineAll as any[]) {
    const r = done.get(`${a._id}:${a.version}`);
    if (r) accepted.push({ ...studentView(a), acceptedAt: r.acceptedAt }); else pending.push(studentView(a));
  }
  pendingCache.set(`${tenantId}:${userId}`, { blocking: pending.filter((p) => p.blockLms).length, at: Date.now() });
  return { pending, accepted };
}

/** How many live, LMS-holding agreements the student has not accepted. Cheap: cached a minute. */
export async function blockingCount(tenantId: string, userId: string): Promise<number> {
  const live = await liveAgreements(tenantId);
  if (!live.some((a) => a.blockLms)) return 0;
  const hit = pendingCache.get(`${tenantId}:${userId}`);
  if (hit && Date.now() - hit.at < TTL) return hit.blocking;
  const m = await mine(tenantId, userId);
  return m.pending.filter((p) => p.blockLms).length;
}

export async function accept(tenantId: string, userId: string, agreementId: string, body: any, meta: { ip?: string; userAgent?: string }) {
  if (!isId(agreementId)) throw new AgreementError(404, 'Agreement not found.');
  const ag = await Agreement.findOne({ _id: agreementId, tenantId }).lean<any>();
  if (!ag || ag.status !== 'live') throw new AgreementError(404, 'This agreement is no longer open.');
  const user = await User.findById(userId).select('role batchId placementBatchIds lmsDemo').lean<Who>();
  if (!user || !appliesTo(ag, user)) throw new AgreementError(403, 'This agreement is not for your account.');
  if (body?.version && Number(body.version) !== ag.version) throw new AgreementError(409, 'This agreement was just updated. Please read it again.');

  let signature: string | undefined;
  let signedName: string | undefined;
  if (ag.requireSignature) {
    signature = String(body?.signature || '');
    signedName = String(body?.signedName || '').trim().slice(0, 120);
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature)) throw new AgreementError(400, 'Please sign in the box before agreeing.');
    if (signature.length > MAX_SIGNATURE) throw new AgreementError(400, 'That signature is too large. Please clear it and sign again.');
    if (signedName.length < 2) throw new AgreementError(400, 'Please type your full name under your signature.');
  }

  try {
    await AgreementAcceptance.create({
      tenantId, agreementId: ag._id, version: ag.version, userId, acceptedAt: new Date(),
      ip: meta.ip, userAgent: String(meta.userAgent || '').slice(0, 300), signature, signedName,
      snapshot: { title: ag.title, intro: ag.intro, points: ag.points || [], document: ag.document?.url ? { url: ag.document.url, name: ag.document.name } : undefined },
    });
  } catch (e: any) {
    if (e?.code !== 11000) throw e; // already accepted this version — fine
  }
  pendingCache.delete(`${tenantId}:${userId}`);
  return { ok: true };
}

/* ── Admin side ──────────────────────────────────────────────────────────────────────────── */

function clean(body: any) {
  const title = String(body?.title || '').trim();
  if (!title) throw new AgreementError(400, 'Give it a title.');
  const points = (Array.isArray(body?.points) ? body.points : []).map((p: any) => String(p || '').trim()).filter(Boolean);
  if (points.length > MAX_POINTS) throw new AgreementError(400, `At most ${MAX_POINTS} points.`);
  const mode = ['all', 'batches', 'students'].includes(body?.audience?.mode) ? body.audience.mode : 'all';
  const batchIds = (body?.audience?.batchIds || []).filter(isId).map(oid);
  const studentIds = (body?.audience?.studentIds || []).filter(isId).map(oid);
  const doc = body?.document?.url && String(body.document.url).startsWith('/uploads/agreements/')
    ? { url: String(body.document.url), name: String(body.document.name || 'Document').slice(0, 200), size: Number(body.document.size) || undefined }
    : undefined;
  return {
    title: title.slice(0, 160),
    kind: body?.kind === 'agreement' ? 'agreement' : 'terms',
    intro: String(body?.intro || '').trim().slice(0, 4000),
    points,
    document: doc,
    requireSignature: !!body?.requireSignature,
    blockLms: !!body?.blockLms,
    audience: { mode, batchIds, studentIds },
  };
}

function checkReady(a: { points: string[]; document?: any; audience: any }) {
  if (!a.points.length && !a.document) throw new AgreementError(400, 'Add at least one point or attach a document before going live.');
  if (a.audience.mode === 'batches' && !a.audience.batchIds.length) throw new AgreementError(400, 'Pick at least one batch.');
  if (a.audience.mode === 'students' && !a.audience.studentIds.length) throw new AgreementError(400, 'Pick at least one student.');
}

export async function list(tenantId: string) {
  const rows = await Agreement.find({ tenantId }).sort({ status: 1, updatedAt: -1 }).lean<any[]>();
  const out = [];
  for (const a of rows) {
    const [targets, acceptedIds] = await Promise.all([
      User.find(audienceFilter(tenantId, a)).select('_id').lean<any[]>(),
      AgreementAcceptance.distinct('userId', { agreementId: a._id, version: a.version }),
    ]);
    const ids = new Set(targets.map((t) => String(t._id)));
    const accepted = acceptedIds.filter((x: any) => ids.has(String(x))).length;
    out.push({ ...a, id: String(a._id), counts: { targeted: ids.size, accepted, pending: ids.size - accepted } });
  }
  return out;
}

export async function get(tenantId: string, id: string) {
  if (!isId(id)) throw new AgreementError(404, 'Agreement not found.');
  const a = await Agreement.findOne({ _id: id, tenantId }).lean<any>();
  if (!a) throw new AgreementError(404, 'Agreement not found.');
  const [batches, students] = await Promise.all([
    Batch.find({ _id: { $in: a.audience?.batchIds || [] }, tenantId }).select('name').lean<any[]>(),
    User.find({ _id: { $in: a.audience?.studentIds || [] }, tenantId }).select('firstName lastName email').lean<any[]>(),
  ]);
  return {
    ...a, id: String(a._id),
    batchLabels: batches.map((b) => ({ id: String(b._id), name: b.name })),
    studentLabels: students.map((s) => ({ id: String(s._id), name: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email, email: s.email })),
  };
}

export async function create(tenantId: string, userId: string, body: any) {
  const data = clean(body);
  const live = body?.status === 'live';
  if (live) checkReady(data);
  const a = await Agreement.create({
    ...data, tenantId, status: live ? 'live' : 'draft', version: 1, publishedAt: live ? new Date() : undefined, createdBy: userId, updatedBy: userId,
  });
  forget(tenantId);
  return get(tenantId, String(a._id));
}

/**
 * Save edits. On a live agreement, `reask: true` asks everyone to agree again (new version); without
 * it, earlier acceptances keep counting — for typo fixes.
 */
export async function update(tenantId: string, userId: string, id: string, body: any) {
  if (!isId(id)) throw new AgreementError(404, 'Agreement not found.');
  const cur = await Agreement.findOne({ _id: id, tenantId });
  if (!cur) throw new AgreementError(404, 'Agreement not found.');
  const data = clean(body);
  if (cur.status === 'live') checkReady(data);
  const hasAcceptances = await AgreementAcceptance.exists({ agreementId: cur._id, version: cur.version });
  const bump = cur.status !== 'draft' && !!body?.reask && !!hasAcceptances;
  Object.assign(cur, data, { updatedBy: userId });
  if (bump) cur.version += 1;
  await cur.save();
  forget(tenantId);
  return get(tenantId, id);
}

export async function setStatus(tenantId: string, userId: string, id: string, status: string) {
  if (!['draft', 'live', 'closed'].includes(status)) throw new AgreementError(400, 'Unknown status.');
  if (!isId(id)) throw new AgreementError(404, 'Agreement not found.');
  const cur = await Agreement.findOne({ _id: id, tenantId });
  if (!cur) throw new AgreementError(404, 'Agreement not found.');
  if (status === 'live') {
    checkReady({ points: cur.points, document: cur.document?.url ? cur.document : undefined, audience: cur.audience });
    if (!cur.publishedAt) cur.publishedAt = new Date();
  }
  cur.status = status as any;
  cur.updatedBy = oid(userId);
  await cur.save();
  forget(tenantId);
  return get(tenantId, id);
}

export async function remove(tenantId: string, id: string) {
  if (!isId(id)) throw new AgreementError(404, 'Agreement not found.');
  if (await AgreementAcceptance.exists({ agreementId: id, tenantId })) {
    throw new AgreementError(400, 'Students have already accepted this. Close it instead, so their signed records are kept.');
  }
  await Agreement.deleteOne({ _id: id, tenantId });
  forget(tenantId);
  return { ok: true };
}

/** Everyone the agreement covers, with who accepted the current version and when. */
export async function responses(tenantId: string, id: string) {
  const a = await get(tenantId, id);
  const students = await User.find(audienceFilter(tenantId, a)).select('firstName lastName email phone batchId').sort({ firstName: 1 }).lean<any[]>();
  const batches = await Batch.find({ _id: { $in: [...new Set(students.map((s) => String(s.batchId)).filter((x) => isId(x)))] } }).select('name').lean<any[]>();
  const bName = new Map(batches.map((b) => [String(b._id), b.name]));
  const acc = await AgreementAcceptance.find({ agreementId: a._id, userId: { $in: students.map((s) => s._id) } })
    .select('userId version acceptedAt signedName ip').lean<any[]>();
  const latest = new Map<string, any>();
  for (const r of acc) {
    const k = String(r.userId);
    const prev = latest.get(k);
    if (!prev || r.version > prev.version) latest.set(k, r);
  }
  return {
    agreement: { id: a.id, title: a.title, version: a.version, requireSignature: a.requireSignature },
    rows: students.map((s) => {
      const r = latest.get(String(s._id));
      return {
        studentId: String(s._id),
        name: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email,
        email: s.email, phone: s.phone || '', batch: bName.get(String(s.batchId)) || '',
        status: r && r.version === a.version ? 'accepted' : r ? 'old_version' : 'pending',
        acceptedAt: r?.acceptedAt || null, version: r?.version || null, signedName: r?.signedName || '', ip: r?.ip || '',
        acceptanceId: r ? String(r._id) : null,
      };
    }),
  };
}

/** One signed record, exactly as the student saw it — for printing or a dispute. */
export async function acceptanceRecord(tenantId: string, acceptanceId: string, forUserId?: string) {
  if (!isId(acceptanceId)) throw new AgreementError(404, 'Record not found.');
  const q: any = { _id: acceptanceId, tenantId };
  if (forUserId) q.userId = forUserId;
  const r = await AgreementAcceptance.findOne(q).lean<any>();
  if (!r) throw new AgreementError(404, 'Record not found.');
  const u = await User.findById(r.userId).select('firstName lastName email phone').lean<any>();
  return {
    id: String(r._id), version: r.version, acceptedAt: r.acceptedAt, ip: r.ip, userAgent: r.userAgent,
    signedName: r.signedName, signature: r.signature, snapshot: r.snapshot,
    student: { name: [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email, email: u?.email, phone: u?.phone },
  };
}

/** The student's own signed copy of an agreement (latest version they accepted). */
export async function myRecord(tenantId: string, userId: string, agreementId: string) {
  if (!isId(agreementId)) throw new AgreementError(404, 'Record not found.');
  const r = await AgreementAcceptance.findOne({ tenantId, userId, agreementId }).sort({ version: -1 }).select('_id').lean<any>();
  if (!r) throw new AgreementError(404, 'You have not accepted this yet.');
  return acceptanceRecord(tenantId, String(r._id), userId);
}

/** Pickers for the audience: batches, and students found by name / email / phone. */
export async function audienceOptions(tenantId: string, q: string) {
  const batches = await Batch.find({ tenantId, isActive: { $ne: false } }).select('name').sort({ createdAt: -1 }).limit(300).lean<any[]>();
  let students: any[] = [];
  const s = String(q || '').trim();
  if (s.length >= 2) {
    const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    students = await User.find({ tenantId, role: 'STUDENT', isActive: true, 'lmsDemo.at': { $exists: false }, $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { phone: rx }] })
      .select('firstName lastName email').limit(20).lean<any[]>();
  }
  return {
    batches: batches.map((b) => ({ id: String(b._id), name: b.name })),
    students: students.map((u) => ({ id: String(u._id), name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email, email: u.email })),
  };
}
