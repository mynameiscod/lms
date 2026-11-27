/**
 * Talent Desk — the office's own companies, openings and submissions (/api/v1/talent-portal/...).
 *
 * Same rule as the rest of the portal: every query starts from the signed-in office's partner
 * record (set by loadPartner). An id that belongs to another office is simply "not found".
 * The institute admin reads this data through workspaceForAdmin — it never writes it.
 */
import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { TalentShare, TalentPartner, TalentStatus } from '../models/TalentPool';
import {
  TalentCompany, TalentOpening, TalentSubmission, COMPANY_STAGES, OPENING_STATUSES, WORK_MODES,
  SUBMISSION_STATUSES, SUBMISSION_LABELS, SubmissionStatus,
} from '../models/TalentDesk';
import { shareRows, forPartner, workbookFor, DEFAULT_COLUMNS } from '../services/talentPoolService';

const fail = (res: Response, e: any) => res.status(400).json({ success: false, message: e?.message || 'Something went wrong' });
const notFound = (res: Response) => res.status(404).json({ success: false, message: 'Not found' });
const partner = (req: AuthenticatedRequest) => (req as any).partner;
const scope = (req: AuthenticatedRequest) => ({ partnerId: partner(req)._id, tenantId: partner(req).tenantId });
const uid = (req: AuthenticatedRequest) => (req.user as any).id || (req.user as any)._id;
const valid = (id: any) => mongoose.isValidObjectId(String(id || ''));

/** Text field: undefined = not sent (leave alone); '' = clear. */
const txt = (v: any, max: number) => (v === undefined ? undefined : String(v ?? '').trim().slice(0, max));
const num = (v: any, max: number) => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) throw new Error('Numbers must be zero or more');
  return Math.min(n, max);
};
const date = (v: any) => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  return d;
};
const pick = (obj: Record<string, any>) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
const webUrl = (v: any) => { const t = txt(v, 500); return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t; };

/* ── Share status follows the furthest company result ──────────────────── */
const SHARE_RANK: Partial<Record<TalentStatus, number>> = { shared: 0, viewed: 1, on_hold: 1, shortlisted: 2, interview: 3, selected: 4 };
const SHARE_FOR: Partial<Record<SubmissionStatus, TalentStatus>> = { sent: 'shortlisted', shortlisted: 'shortlisted', interview: 'interview', selected: 'selected', offered: 'selected', joined: 'selected' };
/** Moves the office's own status for this candidate forward (never back, never off "Rejected"). */
async function advanceShare(shareId: any, to: SubmissionStatus, by: any, why: string) {
  const target = SHARE_FOR[to];
  if (!target) return;
  const s: any = await TalentShare.findById(shareId);
  if (!s) return;
  const cur = SHARE_RANK[s.status as TalentStatus];
  if (cur === undefined || cur >= (SHARE_RANK[target] as number)) return;
  s.status = target;
  s.statusHistory.push({ status: target, by, byRole: 'partner', note: why.slice(0, 1000), at: new Date() });
  await s.save();
}

/* ── Companies ─────────────────────────────────────────────────────────── */
function companyBody(b: any) {
  const stage = b.stage === undefined ? undefined : String(b.stage);
  if (stage !== undefined && !COMPANY_STAGES.includes(stage as any)) throw new Error('Unknown stage');
  return pick({
    name: txt(b.name, 140), website: webUrl(b.website), industry: txt(b.industry, 80), location: txt(b.location, 120),
    contactName: txt(b.contactName, 100), contactDesignation: txt(b.contactDesignation, 80),
    contactEmail: txt(b.contactEmail, 140)?.toLowerCase(), contactPhone: txt(b.contactPhone, 30),
    stage, notes: txt(b.notes, 5000),
  });
}

/** Per-company counts: openings, positions, submissions by status. */
async function companyStats(match: Record<string, any>) {
  const [ops, subs] = await Promise.all([
    TalentOpening.aggregate([{ $match: match }, { $group: { _id: '$companyId', openings: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } }, positions: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, { $ifNull: ['$positions', 0] }, 0] } }, total: { $sum: 1 } } }]),
    TalentSubmission.aggregate([{ $match: match }, { $group: { _id: { c: '$companyId', s: '$status' }, n: { $sum: 1 } } }]),
  ]);
  const out = new Map<string, any>();
  const get = (id: any) => { const k = String(id); if (!out.has(k)) out.set(k, { openings: 0, positions: 0, totalOpenings: 0, sent: 0, byStatus: {} }); return out.get(k); };
  for (const o of ops) Object.assign(get(o._id), { openings: o.openings, positions: o.positions, totalOpenings: o.total });
  for (const x of subs) { const c = get(x._id.c); c.byStatus[x._id.s] = x.n; c.sent += x.n; }
  return out;
}

export const listCompanies = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list: any[] = await TalentCompany.find(scope(req)).sort({ name: 1 }).lean();
    const stats = await companyStats(scope(req));
    res.json({ success: true, data: list.map((c) => ({ ...c, stats: stats.get(String(c._id)) || { openings: 0, positions: 0, totalOpenings: 0, sent: 0, byStatus: {} } })) });
  } catch (e) { fail(res, e); }
};

export const getCompany = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!valid(req.params.id)) return notFound(res);
    const c: any = await TalentCompany.findOne({ _id: req.params.id, ...scope(req) }).lean();
    if (!c) return notFound(res);
    const stats = await companyStats({ ...scope(req), companyId: c._id });
    res.json({ success: true, data: { ...c, stats: stats.get(String(c._id)) || { openings: 0, positions: 0, totalOpenings: 0, sent: 0, byStatus: {} } } });
  } catch (e) { fail(res, e); }
};

export const saveCompany = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = companyBody(req.body || {});
    if (req.params.id) {
      if (!valid(req.params.id)) return notFound(res);
      if (body.name === '') throw new Error('Company name is required');
      const c = await TalentCompany.findOneAndUpdate({ _id: req.params.id, ...scope(req) }, { $set: body }, { new: true, runValidators: true });
      if (!c) return notFound(res);
      return res.json({ success: true, data: c });
    }
    if (!body.name) throw new Error('Company name is required');
    const c = await TalentCompany.create({ ...body, ...scope(req), createdBy: uid(req) });
    res.json({ success: true, data: c });
  } catch (e) { fail(res, e); }
};

export const deleteCompany = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!valid(req.params.id)) return notFound(res);
    const c: any = await TalentCompany.findOneAndDelete({ _id: req.params.id, ...scope(req) });
    if (!c) return notFound(res);
    await Promise.all([
      TalentOpening.deleteMany({ ...scope(req), companyId: c._id }),
      TalentSubmission.deleteMany({ ...scope(req), companyId: c._id }),
    ]);
    res.json({ success: true });
  } catch (e) { fail(res, e); }
};

/* ── Follow-ups (embedded in the company) ──────────────────────────────── */
export const addFollowUp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!valid(req.params.id)) return notFound(res);
    const dueAt = date(req.body?.dueAt);
    if (!dueAt) throw new Error('Pick a follow-up date');
    const c: any = await TalentCompany.findOne({ _id: req.params.id, ...scope(req) });
    if (!c) return notFound(res);
    c.followUps.push({ dueAt, note: txt(req.body?.note, 1000) || undefined, done: false, createdAt: new Date() });
    await c.save();
    res.json({ success: true, data: c });
  } catch (e) { fail(res, e); }
};

export const updateFollowUp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!valid(req.params.id) || !valid(req.params.fid)) return notFound(res);
    const c: any = await TalentCompany.findOne({ _id: req.params.id, ...scope(req) });
    const f = c?.followUps.id(req.params.fid);
    if (!f) return notFound(res);
    const b = req.body || {};
    if (b.dueAt !== undefined) { const d = date(b.dueAt); if (!d) throw new Error('Pick a follow-up date'); f.dueAt = d; }
    if (b.note !== undefined) f.note = txt(b.note, 1000);
    if (b.outcome !== undefined) f.outcome = txt(b.outcome, 1000);
    if (b.done !== undefined) { f.done = !!b.done; f.doneAt = f.done ? new Date() : undefined; }
    await c.save();
    res.json({ success: true, data: c });
  } catch (e) { fail(res, e); }
};

export const deleteFollowUp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!valid(req.params.id) || !valid(req.params.fid)) return notFound(res);
    const c: any = await TalentCompany.findOne({ _id: req.params.id, ...scope(req) });
    const f = c?.followUps.id(req.params.fid);
    if (!f) return notFound(res);
    f.deleteOne();
    await c.save();
    res.json({ success: true, data: c });
  } catch (e) { fail(res, e); }
};

/** Every open follow-up across the office's companies, earliest first. */
export const listFollowUps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const showDone = req.query.done === '1';
    const list: any[] = await TalentCompany.find(scope(req)).select('name contactName contactPhone contactEmail stage followUps').lean();
    const rows = list.flatMap((c) => (c.followUps || [])
      .filter((f: any) => showDone || !f.done)
      .map((f: any) => ({ ...f, companyId: c._id, companyName: c.name, contactName: c.contactName, contactPhone: c.contactPhone, contactEmail: c.contactEmail, stage: c.stage })));
    rows.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    res.json({ success: true, data: rows });
  } catch (e) { fail(res, e); }
};

/* ── Openings ──────────────────────────────────────────────────────────── */
function openingBody(b: any) {
  const status = b.status === undefined ? undefined : String(b.status);
  if (status !== undefined && !OPENING_STATUSES.includes(status as any)) throw new Error('Unknown opening status');
  const workMode = b.workMode === undefined ? undefined : (b.workMode ? String(b.workMode) : null);
  if (workMode && !WORK_MODES.includes(workMode as any)) throw new Error('Unknown work mode');
  const out = pick({
    title: txt(b.title, 140), jd: txt(b.jd, 20000), jdUrl: webUrl(b.jdUrl),
    positions: num(b.positions, 100000), expMin: num(b.expMin, 60), expMax: num(b.expMax, 60),
    salaryMin: num(b.salaryMin, 10000), salaryMax: num(b.salaryMax, 10000),
    bond: txt(b.bond, 300), location: txt(b.location, 160), workMode,
    qualification: txt(b.qualification, 300), skills: txt(b.skills, 1000), interviewProcess: txt(b.interviewProcess, 5000),
    deadline: date(b.deadline), status,
  });
  if (out.expMin != null && out.expMax != null && out.expMin > out.expMax) throw new Error('Minimum experience is more than the maximum');
  if (out.salaryMin != null && out.salaryMax != null && out.salaryMin > out.salaryMax) throw new Error('Minimum salary is more than the maximum');
  return out;
}

async function openingRows(req: AuthenticatedRequest, filter: Record<string, any>) {
  const list: any[] = await TalentOpening.find({ ...scope(req), ...filter }).sort({ status: 1, updatedAt: -1 }).lean();
  const companies: any[] = await TalentCompany.find({ ...scope(req), _id: { $in: list.map((o) => o.companyId) } }).select('name').lean();
  const cname = new Map(companies.map((c) => [String(c._id), c.name]));
  const subs = await TalentSubmission.aggregate([{ $match: { ...scope(req), openingId: { $in: list.map((o) => o._id) } } }, { $group: { _id: { o: '$openingId', s: '$status' }, n: { $sum: 1 } } }]);
  return list.map((o) => {
    const byStatus: Record<string, number> = {}; let sent = 0;
    for (const x of subs) if (String(x._id.o) === String(o._id)) { byStatus[x._id.s] = x.n; sent += x.n; }
    return { ...o, companyName: cname.get(String(o.companyId)) || '—', sent, byStatus };
  });
}

export const listOpenings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.companyId) { if (!valid(req.query.companyId)) return res.json({ success: true, data: [] }); filter.companyId = new mongoose.Types.ObjectId(String(req.query.companyId)); }
    if (req.query.status) filter.status = String(req.query.status);
    res.json({ success: true, data: await openingRows(req, filter) });
  } catch (e) { fail(res, e); }
};

export const saveOpening = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body: any = openingBody(req.body || {});
    if (req.params.id) {
      if (!valid(req.params.id)) return notFound(res);
      if (body.title === '') throw new Error('Job title is required');
      const o: any = await TalentOpening.findOne({ _id: req.params.id, ...scope(req) });
      if (!o) return notFound(res);
      o.set(body);
      if (o.expMin != null && o.expMax != null && o.expMin > o.expMax) throw new Error('Minimum experience is more than the maximum');
      if (o.salaryMin != null && o.salaryMax != null && o.salaryMin > o.salaryMax) throw new Error('Minimum salary is more than the maximum');
      await o.save();
      return res.json({ success: true, data: o });
    }
    if (!body.title) throw new Error('Job title is required');
    if (!valid(req.body?.companyId)) throw new Error('Pick the company');
    const company = await TalentCompany.findOne({ _id: req.body.companyId, ...scope(req) }).select('_id stage');
    if (!company) throw new Error('Pick the company');
    const o = await TalentOpening.create({ ...body, ...scope(req), companyId: company._id });
    // A company with a live opening is hiring.
    if (['prospect', 'contacted'].includes((company as any).stage)) await TalentCompany.updateOne({ _id: company._id }, { $set: { stage: 'active' } });
    res.json({ success: true, data: o });
  } catch (e) { fail(res, e); }
};

export const deleteOpening = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!valid(req.params.id)) return notFound(res);
    const o: any = await TalentOpening.findOneAndDelete({ _id: req.params.id, ...scope(req) });
    if (!o) return notFound(res);
    await TalentSubmission.deleteMany({ ...scope(req), openingId: o._id });
    res.json({ success: true });
  } catch (e) { fail(res, e); }
};

/* ── Submissions ───────────────────────────────────────────────────────── */
/** Submissions joined to candidate name/contact, company name and opening title. */
async function submissionRows(tenantId: string, subs: any[], { full = false } = {}) {
  const shares: any[] = await TalentShare.find({ _id: { $in: subs.map((x) => x.shareId) } }).lean();
  const rows = await shareRows(tenantId, shares);
  const byShare = new Map(rows.map((r) => [r.shareId, r]));
  const [companies, openings]: any[][] = await Promise.all([
    TalentCompany.find({ _id: { $in: subs.map((x) => x.companyId) } }).select('name').lean(),
    TalentOpening.find({ _id: { $in: subs.map((x) => x.openingId).filter(Boolean) } }).select('title').lean(),
  ]);
  const cn = new Map(companies.map((c) => [String(c._id), c.name]));
  const on = new Map(openings.map((o) => [String(o._id), o.title]));
  const out: any[] = [];
  for (const x of subs) {
    const r = byShare.get(String(x.shareId));
    if (!r) continue;
    const cand = full ? forPartner(r) : {
      fullName: r.fullName, phone: r.phone, email: r.email, degree: r.degree, branch: r.branch,
      graduationYear: r.graduationYear, graduationPercent: r.graduationPercent, resumeUrl: r.resumeUrl, skills: r.skills, expectedRole: r.expectedRole,
    };
    out.push({
      ...cand, _id: String(x._id), shareId: String(x.shareId), companyId: String(x.companyId), companyName: cn.get(String(x.companyId)) || '—',
      openingId: x.openingId ? String(x.openingId) : null, openingTitle: x.openingId ? (on.get(String(x.openingId)) || '—') : null,
      status: x.status, note: x.note || '', interviewAt: x.interviewAt || null, sentAt: x.sentAt, updatedAt: x.updatedAt,
      statusHistory: x.statusHistory || [],
    });
  }
  return out;
}

function submissionFilter(q: any) {
  const f: any = {};
  for (const k of ['companyId', 'openingId', 'shareId']) {
    if (q[k]) { if (!valid(q[k])) throw new Error(`Bad ${k}`); f[k] = new mongoose.Types.ObjectId(String(q[k])); }
  }
  if (q.status) { if (!SUBMISSION_STATUSES.includes(String(q.status) as any)) throw new Error('Unknown status'); f.status = String(q.status); }
  return f;
}

export const listSubmissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subs: any[] = await TalentSubmission.find({ ...scope(req), ...submissionFilter(req.query) }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: await submissionRows(String(partner(req).tenantId), subs) });
  } catch (e) { fail(res, e); }
};

/** Send one or more shared candidates to a company (and optionally one of its openings). */
export const createSubmissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const b = req.body || {};
    if (!valid(b.companyId)) throw new Error('Pick the company');
    const company: any = await TalentCompany.findOne({ _id: b.companyId, ...scope(req) }).select('name stage');
    if (!company) throw new Error('Pick the company');
    let opening: any = null;
    if (b.openingId) {
      if (!valid(b.openingId)) throw new Error('Pick the opening');
      opening = await TalentOpening.findOne({ _id: b.openingId, companyId: company._id, ...scope(req) }).select('title');
      if (!opening) throw new Error('That opening is not at this company');
    }
    const ids = Array.from(new Set((Array.isArray(b.shareIds) ? b.shareIds : []).map(String))).filter(valid).slice(0, 500);
    if (!ids.length) throw new Error('Pick at least one candidate');
    const shares: any[] = await TalentShare.find({ _id: { $in: ids }, ...scope(req) }).select('_id').lean();
    const note = txt(b.note, 1000) || undefined;
    const now = new Date();
    const r = await TalentSubmission.bulkWrite(shares.map((s) => ({
      updateOne: {
        filter: { shareId: s._id, companyId: company._id, openingId: opening?._id || null },
        update: { $setOnInsert: { ...scope(req), shareId: s._id, companyId: company._id, openingId: opening?._id || null, status: 'sent', note, sentAt: now, statusHistory: [{ status: 'sent', by: uid(req), note, at: now }] } },
        upsert: true,
      },
    })), { ordered: false });
    const added = r.upsertedCount || 0;
    const newIds = Object.values(r.upsertedIds || {});
    if (newIds.length) {
      const fresh: any[] = await TalentSubmission.find({ _id: { $in: newIds } }).select('shareId').lean();
      const why = `Sent to ${company.name}${opening ? ` — ${opening.title}` : ''}`;
      for (const f of fresh) await advanceShare(f.shareId, 'sent', uid(req), why);
    }
    if (added && company.stage === 'prospect') await TalentCompany.updateOne({ _id: company._id }, { $set: { stage: 'contacted' } });
    res.json({ success: true, data: { added, alreadySent: shares.length - added, skipped: ids.length - shares.length } });
  } catch (e) { fail(res, e); }
};

export const setSubmissionStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!valid(req.params.id)) return notFound(res);
    const b = req.body || {};
    const status = String(b.status || '') as SubmissionStatus;
    if (!SUBMISSION_STATUSES.includes(status)) throw new Error('Unknown status');
    const s: any = await TalentSubmission.findOne({ _id: req.params.id, ...scope(req) });
    if (!s) return notFound(res);
    const note = txt(b.note, 1000) || undefined;
    s.status = status;
    if (note !== undefined) s.note = note;
    if (b.interviewAt !== undefined) s.interviewAt = date(b.interviewAt);
    s.statusHistory.push({ status, by: uid(req), note, at: new Date() });
    await s.save();
    const company: any = await TalentCompany.findById(s.companyId).select('name').lean();
    await advanceShare(s.shareId, status, uid(req), `${SUBMISSION_LABELS[status]} at ${company?.name || 'company'}`);
    const [row] = await submissionRows(String(partner(req).tenantId), [s.toObject()]);
    res.json({ success: true, data: row });
  } catch (e) { fail(res, e); }
};

export const deleteSubmission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!valid(req.params.id)) return notFound(res);
    const s = await TalentSubmission.findOneAndDelete({ _id: req.params.id, ...scope(req) });
    if (!s) return notFound(res);
    res.json({ success: true });
  } catch (e) { fail(res, e); }
};

/** Excel of the candidates sent to one company, in the office's column format + company status. */
export const exportCompany = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!valid(req.params.id)) return notFound(res);
    const company: any = await TalentCompany.findOne({ _id: req.params.id, ...scope(req) }).lean();
    if (!company) return notFound(res);
    const subs: any[] = await TalentSubmission.find({ ...scope(req), companyId: company._id }).sort({ sentAt: 1 }).lean();
    const rows = (await submissionRows(String(partner(req).tenantId), subs, { full: true })).map((r) => ({
      ...r, opening: r.openingTitle || '', companyStatus: SUBMISSION_LABELS[r.status as SubmissionStatus] || r.status,
      companyNote: r.note || '', sentOn: r.sentAt ? new Date(r.sentAt).toISOString().slice(0, 10) : '',
      interviewOn: r.interviewAt ? new Date(r.interviewAt).toISOString().slice(0, 16).replace('T', ' ') : '',
    }));
    const base = (partner(req).exportColumns?.length ? partner(req).exportColumns : DEFAULT_COLUMNS).filter((c: any) => c.field !== 'status');
    const cols = [...base, { field: 'opening', label: 'Position' }, { field: 'companyStatus', label: 'Status' }, { field: 'interviewOn', label: 'Interview' }, { field: 'companyNote', label: 'Remarks' }, { field: 'sentOn', label: 'Sent on' }];
    const safe = String(company.name).replace(/[^a-z0-9]+/gi, '_').slice(0, 40) || 'company';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safe}_candidates_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(workbookFor(rows, cols));
  } catch (e) { fail(res, e); }
};

/* ── Dashboard ─────────────────────────────────────────────────────────── */
async function dashboardFor(sc: { partnerId: any; tenantId: any }) {
  const now = new Date();
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
  const [shareCounts, subCounts, companies, openings, upcoming] = await Promise.all([
    TalentShare.aggregate([{ $match: sc }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    TalentSubmission.aggregate([{ $match: sc }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    TalentCompany.find(sc).select('name stage followUps nextFollowUpAt').lean(),
    TalentOpening.aggregate([{ $match: { ...sc, status: 'open' } }, { $group: { _id: null, n: { $sum: 1 }, positions: { $sum: { $ifNull: ['$positions', 0] } } } }]),
    TalentSubmission.find({ ...sc, status: 'interview', interviewAt: { $gte: new Date(now.getTime() - 12 * 3600e3) } }).sort({ interviewAt: 1 }).limit(8).lean(),
  ]);
  const toMap = (a: any[]) => Object.fromEntries(a.map((x) => [x._id, x.n]));
  const followUps = (companies as any[]).flatMap((c) => (c.followUps || []).filter((f: any) => !f.done && new Date(f.dueAt) <= endToday)
    .map((f: any) => ({ _id: f._id, companyId: c._id, companyName: c.name, dueAt: f.dueAt, note: f.note, overdue: new Date(f.dueAt) < new Date(new Date(now).setHours(0, 0, 0, 0)) })))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const stageCounts: Record<string, number> = {};
  for (const c of companies as any[]) stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
  return {
    candidates: toMap(shareCounts),
    submissions: toMap(subCounts),
    companies: { total: companies.length, byStage: stageCounts },
    openings: { open: openings[0]?.n || 0, positions: openings[0]?.positions || 0 },
    followUpsDue: followUps.slice(0, 20),
    followUpsDueCount: followUps.length,
    upcomingInterviews: upcoming,
  };
}

export const dashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const d: any = await dashboardFor(scope(req));
    d.upcomingInterviews = await submissionRows(String(partner(req).tenantId), d.upcomingInterviews);
    const recent: any[] = await TalentSubmission.find(scope(req)).sort({ updatedAt: -1 }).limit(8).lean();
    d.recent = await submissionRows(String(partner(req).tenantId), recent);
    res.json({ success: true, data: d });
  } catch (e) { fail(res, e); }
};

/* ── Admin: read-only view of one office's workspace ───────────────────── */
export const workspaceForAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = new mongoose.Types.ObjectId(String((req as any).tenantId));
    if (!valid(req.params.id)) return notFound(res);
    const p: any = await TalentPartner.findOne({ _id: req.params.id, tenantId }).lean();
    if (!p) return notFound(res);
    const sc = { partnerId: p._id, tenantId: p.tenantId };
    const [summary, companies, openings, subs] = await Promise.all([
      dashboardFor(sc),
      TalentCompany.find(sc).sort({ name: 1 }).lean(),
      TalentOpening.find(sc).sort({ status: 1, updatedAt: -1 }).lean(),
      TalentSubmission.find(sc).sort({ updatedAt: -1 }).lean(),
    ]);
    const stats = await companyStats(sc);
    const cname = new Map((companies as any[]).map((c) => [String(c._id), c.name]));
    res.json({
      success: true,
      data: {
        partner: { _id: p._id, name: p.name },
        summary: { ...summary, upcomingInterviews: undefined },
        companies: (companies as any[]).map((c) => ({ ...c, stats: stats.get(String(c._id)) || { openings: 0, positions: 0, totalOpenings: 0, sent: 0, byStatus: {} } })),
        openings: (openings as any[]).map((o) => ({ ...o, companyName: cname.get(String(o.companyId)) || '—' })),
        submissions: await submissionRows(String(p.tenantId), subs),
      },
    });
  } catch (e) { fail(res, e); }
};

/** Submissions of one candidate (for the candidate drawer in the portal). */
export async function submissionsForShare(partnerId: any, tenantId: any, shareId: any) {
  const subs: any[] = await TalentSubmission.find({ partnerId, tenantId, shareId }).sort({ sentAt: -1 }).lean();
  const [companies, openings]: any[][] = await Promise.all([
    TalentCompany.find({ _id: { $in: subs.map((x) => x.companyId) } }).select('name').lean(),
    TalentOpening.find({ _id: { $in: subs.map((x) => x.openingId).filter(Boolean) } }).select('title').lean(),
  ]);
  const cn = new Map(companies.map((c) => [String(c._id), c.name]));
  const on = new Map(openings.map((o) => [String(o._id), o.title]));
  return subs.map((x) => ({
    _id: String(x._id), companyId: String(x.companyId), companyName: cn.get(String(x.companyId)) || '—',
    openingId: x.openingId ? String(x.openingId) : null, openingTitle: x.openingId ? on.get(String(x.openingId)) || '—' : null,
    status: x.status, note: x.note || '', interviewAt: x.interviewAt || null, sentAt: x.sentAt,
  }));
}

/** Per-office counts for the admin's office list. */
export async function deskCountsByPartner(tenantId: any) {
  const [c, o, s] = await Promise.all([
    TalentCompany.aggregate([{ $match: { tenantId } }, { $group: { _id: '$partnerId', n: { $sum: 1 } } }]),
    TalentOpening.aggregate([{ $match: { tenantId, status: 'open' } }, { $group: { _id: '$partnerId', n: { $sum: 1 } } }]),
    TalentSubmission.aggregate([{ $match: { tenantId } }, { $group: { _id: '$partnerId', n: { $sum: 1 }, placed: { $sum: { $cond: [{ $in: ['$status', ['selected', 'offered', 'joined']] }, 1, 0] } } } }]),
  ]);
  const out = new Map<string, { companies: number; openOpenings: number; submissions: number; placed: number }>();
  const get = (id: any) => { const k = String(id); if (!out.has(k)) out.set(k, { companies: 0, openOpenings: 0, submissions: 0, placed: 0 }); return out.get(k)!; };
  for (const x of c) get(x._id).companies = x.n;
  for (const x of o) get(x._id).openOpenings = x.n;
  for (const x of s) { get(x._id).submissions = x.n; get(x._id).placed = x.placed; }
  return out;
}
