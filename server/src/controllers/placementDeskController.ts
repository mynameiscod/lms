import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import User from '../models/User';
import {
  PlacementDeskOfficer, PlacementDeskCompany, PlacementDeskDrive, PlacementDeskCandidate, PlacementDeskSettings,
  DRIVE_JOB_TYPES, DRIVE_MODES, DRIVE_STATUSES, CANDIDATE_STATUSES,
} from '../models/PlacementDesk';
import {
  buildReport, publicSummary, eligibleStudents, studentHistory, reportWorkbook, isDay, istDateOf, emptyCounts, addTo,
} from '../services/placementDeskService';

/* ── helpers ───────────────────────────────────────────────────────────── */
const tid = (req: AuthenticatedRequest) => new mongoose.Types.ObjectId(String(req.tenantId));
const isOid = (v: any) => mongoose.isValidObjectId(String(v || ''));
const str = (v: any, max = 500) => (v == null ? undefined : String(v).trim().slice(0, max) || undefined);
const num = (v: any) => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Math.max(0, Number(v)));
const list = (v: any, max = 30) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x: any) => String(x).trim()).filter(Boolean).slice(0, max);
const nameKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const fail = (res: Response, e: any) => res.status(400).json({ success: false, message: e?.message || 'Something went wrong' });
const contact = (c: any) => (c && str(c.name, 80) ? { name: str(c.name, 80)!, designation: str(c.designation, 80), phone: str(c.phone, 20), email: str(c.email, 120) } : null);

/* ── Officers ──────────────────────────────────────────────────────────── */
export const listOfficers = async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, data: await PlacementDeskOfficer.find({ tenantId: tid(req) }).sort({ active: -1, name: 1 }).lean() }); }
  catch (e) { fail(res, e); }
};
export const saveOfficer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = { name: str(req.body?.name, 80), phone: str(req.body?.phone, 20), email: str(req.body?.email, 120), active: req.body?.active !== false };
    if (!body.name) return res.status(400).json({ success: false, message: 'Name is required' });
    const doc = req.params.id
      ? await PlacementDeskOfficer.findOneAndUpdate({ _id: req.params.id, tenantId: tid(req) }, { $set: body }, { new: true })
      : await PlacementDeskOfficer.create({ ...body, tenantId: tid(req) });
    if (!doc) return res.status(404).json({ success: false, message: 'Officer not found' });
    res.json({ success: true, data: doc });
  } catch (e) { fail(res, e); }
};

/* ── Companies ─────────────────────────────────────────────────────────── */
export const listCompanies = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q: any = { tenantId: tid(req) };
    if (req.query.q) q.nameKey = { $regex: nameKey(String(req.query.q)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') };
    const companies: any[] = await PlacementDeskCompany.find(q).sort({ name: 1 }).limit(500).lean();
    const stats = await PlacementDeskDrive.aggregate([
      { $match: { tenantId: tid(req), companyId: { $in: companies.map((c) => c._id) } } },
      { $group: { _id: '$companyId', drives: { $sum: 1 }, lastDay: { $max: '$day' } } },
    ]);
    const sm = new Map(stats.map((s: any) => [String(s._id), s]));
    res.json({ success: true, data: companies.map((c) => ({ ...c, drives: sm.get(String(c._id))?.drives || 0, lastDay: sm.get(String(c._id))?.lastDay || null })) });
  } catch (e) { fail(res, e); }
};
export const saveCompany = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const b = req.body || {};
    const name = str(b.name, 120);
    if (!name) return res.status(400).json({ success: false, message: 'Company name is required' });
    const body: any = {
      name, nameKey: nameKey(name), website: str(b.website, 300), careersUrl: str(b.careersUrl, 500), address: str(b.address, 500),
      city: str(b.city, 60), industry: str(b.industry, 60), notes: str(b.notes, 2000),
      contacts: (Array.isArray(b.contacts) ? b.contacts : []).map(contact).filter(Boolean).slice(0, 10),
    };
    const clash: any = await PlacementDeskCompany.findOne({ tenantId: tid(req), nameKey: body.nameKey }).select('_id').lean();
    if (clash && String(clash._id) !== String(req.params.id || '')) return res.status(400).json({ success: false, message: `${name} is already in the list` });
    const doc = req.params.id
      ? await PlacementDeskCompany.findOneAndUpdate({ _id: req.params.id, tenantId: tid(req) }, { $set: body }, { new: true })
      : await PlacementDeskCompany.create({ ...body, tenantId: tid(req) });
    if (!doc) return res.status(404).json({ success: false, message: 'Company not found' });
    if (req.params.id) await PlacementDeskDrive.updateMany({ tenantId: tid(req), companyId: doc._id }, { $set: { companyName: doc.name } });
    res.json({ success: true, data: doc });
  } catch (e) { fail(res, e); }
};
export const getCompany = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid company' });
    const company = await PlacementDeskCompany.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    const drives: any[] = await PlacementDeskDrive.find({ tenantId: tid(req), companyId: company._id }).sort({ day: -1 }).lean();
    const cands: any[] = await PlacementDeskCandidate.find({ driveId: { $in: drives.map((d) => d._id) } }).select('driveId status').lean();
    const total = emptyCounts();
    const per = new Map<string, any>();
    cands.forEach((c) => { addTo(total, c.status); const k = String(c.driveId); const x = per.get(k) || emptyCounts(); addTo(x, c.status); per.set(k, x); });
    res.json({ success: true, data: { company, totals: total, drives: drives.map((d) => ({ ...d, counts: per.get(String(d._id)) || emptyCounts() })) } });
  } catch (e) { fail(res, e); }
};

/* ── Drives ────────────────────────────────────────────────────────────── */
async function driveBody(req: AuthenticatedRequest): Promise<any> {
  const b = req.body || {};
  if (!isOid(b.companyId)) throw new Error('Pick a company');
  const company: any = await PlacementDeskCompany.findOne({ _id: b.companyId, tenantId: tid(req) }).select('name').lean();
  if (!company) throw new Error('Company not found');
  if (!isDay(b.day)) throw new Error('Pick the drive date');
  if (!str(b.role, 120)) throw new Error('Role is required');
  const packageMin = num(b.packageMin), packageMax = num(b.packageMax);
  if (packageMin != null && packageMax != null && packageMin > packageMax) throw new Error('Minimum package is more than the maximum');
  let officerName: string | undefined;
  if (isOid(b.officerId)) {
    const o: any = await PlacementDeskOfficer.findOne({ _id: b.officerId, tenantId: tid(req) }).select('name').lean();
    if (!o) throw new Error('Placement officer not found');
    officerName = o.name;
  }
  const el = b.eligibility || {};
  return {
    companyId: company._id, companyName: company.name, day: String(b.day), date: istDateOf(String(b.day)),
    role: str(b.role, 120), openings: num(b.openings),
    jobType: (DRIVE_JOB_TYPES as readonly string[]).includes(b.jobType) ? b.jobType : 'full_time',
    mode: (DRIVE_MODES as readonly string[]).includes(b.mode) ? b.mode : 'on_campus',
    location: str(b.location, 120), packageMin, packageMax, salaryNotes: str(b.salaryNotes, 1000),
    bond: { required: !!b.bond?.required, months: b.bond?.required ? num(b.bond?.months) : undefined, amount: b.bond?.required ? num(b.bond?.amount) : undefined, notes: b.bond?.required ? str(b.bond?.notes, 500) : undefined },
    conditions: str(b.conditions, 2000),
    eligibility: {
      passoutYears: list(el.passoutYears, 10).map(Number).filter((n) => n > 1990 && n < 2100),
      degrees: list(el.degrees, 20), minPercent: num(el.minPercent), skills: list(el.skills, 30),
      batchIds: list(el.batchIds, 30).filter(isOid).map((x) => new mongoose.Types.ObjectId(x)), notes: str(el.notes, 1000),
    },
    officerId: officerName ? new mongoose.Types.ObjectId(String(b.officerId)) : undefined, officerName,
    companyContact: contact(b.companyContact),
    rounds: list(b.rounds, 10),
    status: (DRIVE_STATUSES as readonly string[]).includes(b.status) ? b.status : 'upcoming',
    notes: str(b.notes, 2000),
  };
}

export const listDrives = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q: any = { tenantId: tid(req) };
    if (isDay(req.query.from) || isDay(req.query.to)) q.day = { ...(isDay(req.query.from) ? { $gte: String(req.query.from) } : {}), ...(isDay(req.query.to) ? { $lte: String(req.query.to) } : {}) };
    if (req.query.status) q.status = String(req.query.status);
    if (isOid(req.query.officerId)) q.officerId = new mongoose.Types.ObjectId(String(req.query.officerId));
    if (isOid(req.query.companyId)) q.companyId = new mongoose.Types.ObjectId(String(req.query.companyId));
    if (req.query.q) { const re = { $regex: String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }; q.$or = [{ companyName: re }, { role: re }]; }
    const drives: any[] = await PlacementDeskDrive.find(q).sort({ day: -1, createdAt: -1 }).limit(300).lean();
    const cands: any[] = await PlacementDeskCandidate.find({ driveId: { $in: drives.map((d) => d._id) } }).select('driveId status').lean();
    const per = new Map<string, any>();
    cands.forEach((c) => { const k = String(c.driveId); const x = per.get(k) || emptyCounts(); addTo(x, c.status); per.set(k, x); });
    res.json({ success: true, data: drives.map((d) => ({ ...d, counts: per.get(String(d._id)) || emptyCounts() })) });
  } catch (e) { fail(res, e); }
};
export const getDrive = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid drive' });
    const drive = await PlacementDeskDrive.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    const [company, candidates] = await Promise.all([
      PlacementDeskCompany.findById(drive.companyId).lean(),
      PlacementDeskCandidate.find({ driveId: drive._id }).sort({ name: 1 }).lean(),
    ]);
    res.json({ success: true, data: { drive, company, candidates } });
  } catch (e) { fail(res, e); }
};
export const createDrive = async (req: AuthenticatedRequest, res: Response) => {
  try { res.status(201).json({ success: true, data: await PlacementDeskDrive.create({ ...(await driveBody(req)), tenantId: tid(req), createdBy: req.user?.id }) }); }
  catch (e) { fail(res, e); }
};
export const updateDrive = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid drive' });
    const body = await driveBody(req);
    const doc = await PlacementDeskDrive.findOneAndUpdate({ _id: req.params.id, tenantId: tid(req) }, { $set: body }, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Drive not found' });
    await PlacementDeskCandidate.updateMany({ driveId: doc._id }, { $set: { day: doc.day, companyId: doc.companyId } });
    res.json({ success: true, data: doc });
  } catch (e) { fail(res, e); }
};
export const deleteDrive = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid drive' });
    const doc: any = await PlacementDeskDrive.findOneAndDelete({ _id: req.params.id, tenantId: tid(req) });
    if (!doc) return res.status(404).json({ success: false, message: 'Drive not found' });
    const r = await PlacementDeskCandidate.deleteMany({ driveId: doc._id });
    res.json({ success: true, message: `Drive deleted with ${r.deletedCount} candidate record(s)` });
  } catch (e) { fail(res, e); }
};

/* ── Candidates ────────────────────────────────────────────────────────── */
export const suggestCandidates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid drive' });
    const drive = await PlacementDeskDrive.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    res.json({ success: true, data: await eligibleStudents(String(req.tenantId), drive, { batchId: isOid(req.query.batchId) ? String(req.query.batchId) : undefined }) });
  } catch (e) { fail(res, e); }
};

// POST /drives/:id/candidates  { studentIds?: string[], externals?: {name, phone, email, college, degree, passoutYear}[] }
export const addCandidates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid drive' });
    const drive: any = await PlacementDeskDrive.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    const base = { tenantId: tid(req), driveId: drive._id, companyId: drive.companyId, day: drive.day, status: 'eligible' };

    const ids = (Array.isArray(req.body?.studentIds) ? req.body.studentIds : []).filter(isOid).slice(0, 500);
    const students: any[] = ids.length ? await User.find({ _id: { $in: ids }, tenantId: tid(req), role: 'STUDENT' }).select('firstName lastName email phone').lean() : [];
    const have = new Set((await PlacementDeskCandidate.find({ driveId: drive._id, studentId: { $exists: true } }).distinct('studentId')).map(String));
    const studentDocs = students.filter((s) => !have.has(String(s._id))).map((s) => ({
      ...base, kind: 'student', studentId: s._id, name: [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email, email: s.email, phone: s.phone,
    }));

    const haveExt = new Set((await PlacementDeskCandidate.find({ driveId: drive._id, kind: 'external' }).select('phone email').lean() as any[])
      .flatMap((c) => [c.phone, c.email]).filter(Boolean).map(String));
    const extDocs = (Array.isArray(req.body?.externals) ? req.body.externals : []).slice(0, 200)
      .map((x: any) => ({ ...base, kind: 'external', name: str(x?.name, 120), phone: str(x?.phone, 20), email: str(x?.email, 120)?.toLowerCase(), college: str(x?.college, 160), degree: str(x?.degree, 80), passoutYear: num(x?.passoutYear) }))
      .filter((x: any) => {
        // Skip anyone already on the drive, or repeated within this same list, by phone or email.
        if (!x.name || (x.phone && haveExt.has(x.phone)) || (x.email && haveExt.has(x.email))) return false;
        if (x.phone) haveExt.add(x.phone);
        if (x.email) haveExt.add(x.email);
        return true;
      });

    const docs = [...studentDocs, ...extDocs];
    if (docs.length) await PlacementDeskCandidate.insertMany(docs, { ordered: false });
    const skipped = ids.length + (req.body?.externals?.length || 0) - docs.length;
    res.json({ success: true, message: `${docs.length} added${skipped > 0 ? `, ${skipped} already on this drive` : ''}`, data: await PlacementDeskCandidate.find({ driveId: drive._id }).sort({ name: 1 }).lean() });
  } catch (e) { fail(res, e); }
};

const candidatePatch = (b: any) => {
  const set: any = {};
  if (b.status !== undefined) {
    if (!(CANDIDATE_STATUSES as readonly string[]).includes(b.status)) throw new Error('Unknown status');
    set.status = b.status; set.statusAt = new Date();
  }
  if (b.roundReached !== undefined) set.roundReached = str(b.roundReached, 80) || '';
  if (b.offerCtc !== undefined) set.offerCtc = num(b.offerCtc) ?? null;
  if (b.companyFeedback !== undefined) set.companyFeedback = str(b.companyFeedback, 2000) || '';
  if (b.internalRemarks !== undefined) set.internalRemarks = str(b.internalRemarks, 2000) || '';
  for (const k of ['name', 'phone', 'email', 'college', 'degree']) if (b[k] !== undefined) set[k] = str(b[k], 160) || '';
  if (b.passoutYear !== undefined) set.passoutYear = num(b.passoutYear) ?? null;
  return set;
};
export const updateCandidate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isOid(req.params.cid)) return res.status(400).json({ success: false, message: 'Invalid candidate' });
    const set = candidatePatch(req.body || {});
    if (set.name === '') delete set.name;
    const doc = await PlacementDeskCandidate.findOneAndUpdate({ _id: req.params.cid, tenantId: tid(req) }, { $set: set }, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Candidate not found' });
    res.json({ success: true, data: doc });
  } catch (e) { fail(res, e); }
};
// PATCH /drives/:id/candidates  { ids: string[], status }
export const bulkStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.body?.status;
    if (!(CANDIDATE_STATUSES as readonly string[]).includes(status)) return res.status(400).json({ success: false, message: 'Unknown status' });
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(isOid);
    if (!ids.length) return res.status(400).json({ success: false, message: 'Pick at least one candidate' });
    const r = await PlacementDeskCandidate.updateMany({ _id: { $in: ids }, driveId: req.params.id, tenantId: tid(req) }, { $set: { status, statusAt: new Date() } });
    res.json({ success: true, message: `${r.modifiedCount} updated`, data: await PlacementDeskCandidate.find({ driveId: req.params.id, tenantId: tid(req) }).sort({ name: 1 }).lean() });
  } catch (e) { fail(res, e); }
};
export const removeCandidate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isOid(req.params.cid)) return res.status(400).json({ success: false, message: 'Invalid candidate' });
    const doc = await PlacementDeskCandidate.findOneAndDelete({ _id: req.params.cid, tenantId: tid(req) });
    if (!doc) return res.status(404).json({ success: false, message: 'Candidate not found' });
    res.json({ success: true, message: 'Removed' });
  } catch (e) { fail(res, e); }
};

/* ── Reports ───────────────────────────────────────────────────────────── */
export const getReport = async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, data: await buildReport(String(req.tenantId), req.query.from, req.query.to) }); }
  catch (e) { fail(res, e); }
};
export const exportReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buffer, filename } = await reportWorkbook(String(req.tenantId), req.query.from, req.query.to);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) { fail(res, e); }
};
export const getStudentHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isOid(req.params.studentId)) return res.status(400).json({ success: false, message: 'Invalid student' });
    res.json({ success: true, data: await studentHistory(String(req.tenantId), req.params.studentId) });
  } catch (e) { fail(res, e); }
};

/* ── Public summary ────────────────────────────────────────────────────── */
async function settingsFor(tenantId: mongoose.Types.ObjectId) {
  return (await PlacementDeskSettings.findOne({ tenantId }))
    || PlacementDeskSettings.create({ tenantId, publicToken: crypto.randomBytes(12).toString('hex') });
}
export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, data: await settingsFor(tid(req)) }); } catch (e) { fail(res, e); }
};
export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const s: any = await settingsFor(tid(req));
    if (req.body?.publicEnabled !== undefined) s.publicEnabled = !!req.body.publicEnabled;
    if (req.body?.publicTitle !== undefined) s.publicTitle = str(req.body.publicTitle, 120) || '';
    if (req.body?.regenerate) s.publicToken = crypto.randomBytes(12).toString('hex');
    await s.save();
    res.json({ success: true, data: s });
  } catch (e) { fail(res, e); }
};
// GET /placement-desk/public/:token?from&to — no login. Company-level counts only.
export const getPublicSummary = async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token || '');
    if (!/^[a-f0-9]{24}$/.test(token)) return res.status(404).json({ success: false, message: 'Not found' });
    const s: any = await PlacementDeskSettings.findOne({ publicToken: token, publicEnabled: true }).lean();
    if (!s) return res.status(404).json({ success: false, message: 'This placement summary is not published.' });
    const data = await publicSummary(String(s.tenantId), req.query.from, req.query.to);
    res.json({ success: true, data: { title: s.publicTitle || 'Placement Updates', ...data } });
  } catch (e) { fail(res, e); }
};
