/**
 * Talent Pool — admin side (/api/v1/talent-pool). docs/design/talent-pool-sharing.md
 * Offices, outside candidates, sharing candidates with an office, and the status tracker.
 */
import { Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import { AuthenticatedRequest } from '../types';
import User from '../models/User';
import Batch from '../models/Batch';
import StudentProfile from '../models/StudentProfile';
import { TalentPartner, TalentCandidate, TalentShare, TALENT_STATUSES, TalentStatus } from '../models/TalentPool';
import {
  FIELDS, DEFAULT_COLUMNS, STATUS_LABELS, cleanColumns, studentViews, externalView, shareRows, workbookFor,
  candidateFields, expand, importRows, FIELD_PATH, importTemplate, importFromPlacementDesk,
} from '../services/talentPoolService';
import { UserService } from '../services/userService';
import { deskCountsByPartner } from './talentDeskController';
const userService = new UserService();
import { EmailService } from '../services/emailService';

const tid = (req: AuthenticatedRequest) => new mongoose.Types.ObjectId(String(req.tenantId));
const uid = (req: AuthenticatedRequest) => new mongoose.Types.ObjectId(String((req.user as any).id || (req.user as any)._id));
const isOid = (v: any) => mongoose.isValidObjectId(String(v || ''));
const str = (v: any, max = 500) => (v == null ? undefined : String(v).trim().slice(0, max) || undefined);
const fail = (res: Response, e: any, code = 400) => res.status(e?.status || code).json({ success: false, message: e?.message || 'Something went wrong' });
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const frontend = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
const rx = (s: string) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

/* ── Reference data ────────────────────────────────────────────────────── */
export const getMeta = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batches = await Batch.find({ tenantId: tid(req) } as any).select('name').sort({ name: 1 }).lean();
    res.json({ success: true, data: { fields: FIELDS.map(({ key, label }) => ({ key, label })), defaultColumns: DEFAULT_COLUMNS, statuses: TALENT_STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s] })), batches } });
  } catch (e) { fail(res, e); }
};

/* ── Offices ───────────────────────────────────────────────────────────── */
export const listPartners = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partners: any[] = await TalentPartner.find({ tenantId: tid(req) }).sort({ active: -1, name: 1 }).lean();
    const counts = await TalentShare.aggregate([
      { $match: { tenantId: tid(req) } },
      { $group: { _id: { p: '$partnerId', s: '$status' }, n: { $sum: 1 }, seen: { $max: '$lastViewedAt' } } },
    ]);
    const users: any[] = await User.find({ _id: { $in: partners.map((p) => p.userId).filter(Boolean) } }).select('isActive resetToken').lean();
    const desk = await deskCountsByPartner(tid(req));
    const umap = new Map(users.map((u) => [String(u._id), u]));
    res.json({
      success: true,
      data: partners.map((p) => {
        const byStatus: Record<string, number> = {};
        let total = 0; let lastSeenAt: Date | null = null;
        for (const c of counts) if (String(c._id.p) === String(p._id)) {
          byStatus[c._id.s] = c.n; total += c.n;
          if (c.seen && (!lastSeenAt || c.seen > lastSeenAt)) lastSeenAt = c.seen;
        }
        const u: any = p.userId ? umap.get(String(p.userId)) : null;
        return { ...p, total, byStatus, lastSeenAt, desk: desk.get(String(p._id)) || { companies: 0, openOpenings: 0, submissions: 0, placed: 0 }, login: u ? { active: u.isActive !== false, passwordSet: !u.resetToken } : null };
      }),
    });
  } catch (e) { fail(res, e); }
};

export const savePartner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const b = req.body || {};
    const body: any = {
      name: str(b.name, 120), contactName: str(b.contactName, 80), email: str(b.email, 120)?.toLowerCase(),
      phone: str(b.phone, 20), city: str(b.city, 60), notes: str(b.notes, 2000),
    };
    if (b.exportColumns !== undefined) body.exportColumns = cleanColumns(b.exportColumns);
    if (!body.name) return res.status(400).json({ success: false, message: 'Office name is required' });
    if (!body.email || !/^\S+@\S+\.\S+$/.test(body.email)) return res.status(400).json({ success: false, message: 'A valid email is required — it becomes their login' });
    let doc: any;
    if (req.params.id) {
      doc = await TalentPartner.findOne({ _id: req.params.id, tenantId: tid(req) });
      if (!doc) return res.status(404).json({ success: false, message: 'Office not found' });
      // The login email is the account's email; change both together or not at all.
      if (doc.userId && body.email !== doc.email) {
        const clash = await User.findOne({ email: body.email, _id: { $ne: doc.userId } }).select('_id').lean();
        if (clash) return res.status(400).json({ success: false, message: 'Another account already uses that email' });
        await User.updateOne({ _id: doc.userId, tenantId: tid(req), role: 'PLACEMENT_PARTNER' }, { $set: { email: body.email } });
      }
      doc.set(body);
      await doc.save();
    } else {
      doc = await TalentPartner.create({ ...body, tenantId: tid(req), createdBy: uid(req), exportColumns: body.exportColumns || [] });
    }
    res.json({ success: true, data: doc });
  } catch (e) { fail(res, e); }
};

/** Office login: a PLACEMENT_PARTNER account with a 7-day set-password link. */
async function sendInvite(tenantId: string, partner: any, user: any) {
  const token = crypto.randomBytes(32).toString('hex');
  await userService.setResetToken(String(user._id), token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const setupLink = `${frontend()}/setup-password?token=${token}&email=${encodeURIComponent(user.email)}`;
  const loginLink = `${frontend()}/login`;
  const who = partner.contactName || partner.name;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
    <h2 style="color:#051D64">Your Talent Pool access</h2>
    <p>Hello ${esc(who)},</p>
    <p>We have set up a login for <b>${esc(partner.name)}</b>. You can see the candidates we share with you, their full profiles and resumes, update their status and download the list as Excel.</p>
    <p style="margin:24px 0"><a href="${setupLink}" style="background:#359AAD;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Set your password</a></p>
    <p>This link works for 7 days. After that, sign in at <a href="${loginLink}">${loginLink}</a> with <b>${esc(user.email)}</b> (use "Forgot password" any time).</p>
  </div>`;
  let emailSent = false;
  try { emailSent = await new EmailService(tenantId).sendGenericEmail(user.email, 'Your Talent Pool login', html, undefined, undefined, { ignoreSuppression: true } as any); }
  catch { emailSent = false; }
  return { emailSent, setupLink: emailSent ? undefined : setupLink };
}

export const createLogin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const p: any = await TalentPartner.findOne({ _id: req.params.id, tenantId: tid(req) });
    if (!p) return res.status(404).json({ success: false, message: 'Office not found' });
    if (p.userId) return res.status(409).json({ success: false, message: 'This office already has a login. Use "Resend invite".' });
    if (await User.exists({ email: p.email })) return res.status(400).json({ success: false, message: `${p.email} already has an account on the platform. Use a different email for this office.` });
    const [first, ...rest] = String(p.contactName || p.name).trim().split(/\s+/);
    const user: any = await userService.createUser(p.email, first || p.name, rest.join(' ') || '-', crypto.randomBytes(18).toString('base64url'), 'PLACEMENT_PARTNER', String(tid(req)));
    p.userId = user._id;
    await p.save();
    res.json({ success: true, data: await sendInvite(String(tid(req)), p, user) });
  } catch (e) { fail(res, e); }
};

export const resendInvite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const p: any = await TalentPartner.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!p?.userId) return res.status(404).json({ success: false, message: 'This office has no login yet' });
    const user: any = await User.findOne({ _id: p.userId, tenantId: tid(req), role: 'PLACEMENT_PARTNER' });
    if (!user) return res.status(404).json({ success: false, message: 'Login not found' });
    res.json({ success: true, data: await sendInvite(String(tid(req)), p, user) });
  } catch (e) { fail(res, e); }
};

/** Switching an office off also switches its login off; the next request it makes is refused. */
export const setPartnerActive = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const active = req.body?.active !== false;
    const p: any = await TalentPartner.findOneAndUpdate({ _id: req.params.id, tenantId: tid(req) }, { $set: { active } }, { new: true });
    if (!p) return res.status(404).json({ success: false, message: 'Office not found' });
    if (p.userId) await User.updateOne({ _id: p.userId, tenantId: tid(req), role: 'PLACEMENT_PARTNER' }, { $set: { isActive: active } });
    res.json({ success: true, data: p });
  } catch (e) { fail(res, e); }
};

/* ── Candidates to choose from ─────────────────────────────────────────── */
export const listCandidates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q: any = req.query || {};
    const kind = q.kind === 'external' ? 'external' : 'student';
    let views: any[] = [];
    if (kind === 'student') {
      const uq: any = { tenantId: tid(req), role: 'STUDENT', isActive: { $ne: false }, studentStatus: { $ne: 'discontinued' } };
      if (isOid(q.batchId)) uq.$or = [{ batchId: new mongoose.Types.ObjectId(String(q.batchId)) }, { placementBatchIds: new mongoose.Types.ObjectId(String(q.batchId)) }];
      if (q.q) uq.$and = [{ $or: [{ firstName: rx(q.q) }, { lastName: rx(q.q) }, { email: rx(q.q) }, { phone: rx(q.q) }] }];
      const ids = (await User.find(uq).select('_id').limit(2000).lean()).map((u: any) => String(u._id));
      views = [...(await studentViews(String(tid(req)), ids)).values()];
    } else {
      const cq: any = { tenantId: tid(req) };
      if (q.q) cq.$or = [{ fullName: rx(q.q) }, { email: rx(q.q) }, { phone: rx(q.q) }, { 'graduation.college': rx(q.q) }];
      views = (await TalentCandidate.find(cq).sort({ createdAt: -1 }).limit(2000).lean()).map(externalView);
    }
    const year = Number(q.passoutYear) || 0;
    const minPct = Number(q.minPercent) || 0;
    if (year) views = views.filter((v) => v.graduationYear === year);
    if (q.degree) { const d = String(q.degree).toLowerCase(); views = views.filter((v) => `${v.degree || ''} ${v.branch || ''}`.toLowerCase().includes(d)); }
    if (minPct) views = views.filter((v) => (v.graduationPercent ?? -1) >= minPct);
    if (q.hasResume === 'true') views = views.filter((v) => !!v.resumeUrl);
    if (q.ready === 'true') views = views.filter((v) => !v.missing.length);

    // How many offices already have each candidate, and whether the chosen one does.
    const key = kind === 'student' ? 'studentId' : 'talentCandidateId';
    const shares: any[] = await TalentShare.find({ tenantId: tid(req), kind, [key]: { $in: views.map((v) => new mongoose.Types.ObjectId(v.candidateId)) } })
      .select(`partnerId ${key}`).lean();
    const count = new Map<string, number>(); const withPartner = new Set<string>();
    for (const s of shares) {
      const k = String(s[key]);
      count.set(k, (count.get(k) || 0) + 1);
      if (q.partnerId && String(s.partnerId) === String(q.partnerId)) withPartner.add(k);
    }
    views.sort((a, b) => a.missing.length - b.missing.length || a.fullName.localeCompare(b.fullName));
    res.json({ success: true, data: views.map((v) => ({ ...v, sharedCount: count.get(v.candidateId) || 0, alreadyShared: withPartner.has(v.candidateId) })) });
  } catch (e) { fail(res, e); }
};

/* ── Sharing ───────────────────────────────────────────────────────────── */
export const shareCandidates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const b = req.body || {};
    if (!isOid(b.partnerId)) return res.status(400).json({ success: false, message: 'Choose an office' });
    const partner: any = await TalentPartner.findOne({ _id: b.partnerId, tenantId: tid(req) }).lean();
    if (!partner) return res.status(404).json({ success: false, message: 'Office not found' });
    const studentIds = (Array.isArray(b.students) ? b.students : []).filter(isOid).slice(0, 1000);
    const externalIds = (Array.isArray(b.externals) ? b.externals : []).filter(isOid).slice(0, 1000);
    // Only candidates of this institute can be shared.
    const okStudents = (await User.find({ _id: { $in: studentIds }, tenantId: tid(req), role: 'STUDENT' }).select('_id').lean()).map((u: any) => u._id);
    const okExternal = (await TalentCandidate.find({ _id: { $in: externalIds }, tenantId: tid(req) }).select('_id').lean()).map((c: any) => c._id);
    const now = new Date();
    const entry = { status: 'shared' as TalentStatus, by: uid(req), byRole: 'admin' as const, at: now };
    const base = { tenantId: tid(req), partnerId: partner._id, status: 'shared', statusHistory: [entry], sharedBy: uid(req), sharedAt: now };
    const ops = [
      ...okStudents.map((id) => ({ updateOne: { filter: { partnerId: partner._id, studentId: id }, update: { $setOnInsert: { ...base, kind: 'student', studentId: id } }, upsert: true } })),
      ...okExternal.map((id) => ({ updateOne: { filter: { partnerId: partner._id, talentCandidateId: id }, update: { $setOnInsert: { ...base, kind: 'external', talentCandidateId: id } }, upsert: true } })),
    ];
    const r = ops.length ? await TalentShare.bulkWrite(ops as any, { ordered: false }) : { upsertedCount: 0 } as any;
    const added = r.upsertedCount || 0;
    res.json({ success: true, data: { added, alreadyShared: ops.length - added } });
  } catch (e) { fail(res, e); }
};

export const unshare = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const r = await TalentShare.deleteOne({ _id: req.params.id, tenantId: tid(req) });
    if (!r.deletedCount) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (e) { fail(res, e); }
};

export const setShareStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = String(req.body?.status || '') as TalentStatus;
    if (!TALENT_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Unknown status' });
    const note = str(req.body?.note, 1000);
    const s: any = await TalentShare.findOneAndUpdate(
      { _id: req.params.id, tenantId: tid(req) },
      { $set: { status }, $push: { statusHistory: { status, by: uid(req), byRole: 'admin', note, at: new Date() } } },
      { new: true },
    );
    if (!s) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: s });
  } catch (e) { fail(res, e); }
};

/** One office's list, exactly as the office sees it (plus the admin-only completeness bits). */
export const partnerShares = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const p: any = await TalentPartner.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!p) return res.status(404).json({ success: false, message: 'Office not found' });
    const shares: any[] = await TalentShare.find({ tenantId: tid(req), partnerId: p._id }).sort({ sharedAt: -1 }).lean();
    res.json({ success: true, data: { partner: p, rows: await shareRows(String(tid(req)), shares) } });
  } catch (e) { fail(res, e); }
};

export const exportPartner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const p: any = await TalentPartner.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!p) return res.status(404).json({ success: false, message: 'Office not found' });
    const shares: any[] = await TalentShare.find({ tenantId: tid(req), partnerId: p._id }).sort({ sharedAt: -1 }).lean();
    const buf = workbookFor(await shareRows(String(tid(req)), shares), p.exportColumns || []);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${String(p.name).replace(/[^a-z0-9]+/gi, '_')}_talent_pool.xlsx"`);
    res.send(buf);
  } catch (e) { fail(res, e); }
};

/* ── Tracker: every shared candidate × every office ────────────────────── */
export const tracker = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q: any = req.query || {};
    const sq: any = { tenantId: tid(req) };
    if (isOid(q.partnerId)) sq.partnerId = new mongoose.Types.ObjectId(String(q.partnerId));
    if (q.status && TALENT_STATUSES.includes(q.status)) sq.status = q.status;
    const matching: any[] = await TalentShare.find(sq).select('kind studentId talentCandidateId').lean();
    // Rows are candidates; once a candidate matches, show ALL of their offices, not only the matching one.
    const sIds = [...new Set(matching.filter((m) => m.kind === 'student').map((m) => String(m.studentId)))];
    const eIds = [...new Set(matching.filter((m) => m.kind === 'external').map((m) => String(m.talentCandidateId)))];
    const all: any[] = await TalentShare.find({
      tenantId: tid(req),
      $or: [{ studentId: { $in: sIds.map((x) => new mongoose.Types.ObjectId(x)) } }, { talentCandidateId: { $in: eIds.map((x) => new mongoose.Types.ObjectId(x)) } }],
    }).select('partnerId kind studentId talentCandidateId status sharedAt lastViewedAt').lean();
    const partners: any[] = await TalentPartner.find({ tenantId: tid(req) }).select('name').lean();
    const pname = new Map(partners.map((p) => [String(p._id), p.name]));
    const sv = await studentViews(String(tid(req)), sIds);
    const ev = new Map((await TalentCandidate.find({ _id: { $in: eIds }, tenantId: tid(req) }).lean()).map((c: any) => [String(c._id), externalView(c)]));
    const rows = new Map<string, any>();
    for (const s of all) {
      const id = String(s.kind === 'student' ? s.studentId : s.talentCandidateId);
      const v = s.kind === 'student' ? sv.get(id) : ev.get(id);
      if (!v) continue;
      const key = `${s.kind}:${id}`;
      if (!rows.has(key)) rows.set(key, { kind: s.kind, candidateId: id, fullName: v.fullName, phone: v.phone, email: v.email, batchName: v.batchName || '', degree: v.degree, graduationYear: v.graduationYear, shares: [] as any[] });
      rows.get(key).shares.push({ shareId: String(s._id), partnerId: String(s.partnerId), partnerName: pname.get(String(s.partnerId)) || 'Office', status: s.status, sharedAt: s.sharedAt, lastViewedAt: s.lastViewedAt });
    }
    let list = [...rows.values()];
    if (q.q) { const r = rx(q.q); list = list.filter((x) => r.test(x.fullName) || r.test(x.phone || '') || r.test(x.email || '')); }
    list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    res.json({ success: true, data: list });
  } catch (e) { fail(res, e); }
};

/* ── Outside candidates ────────────────────────────────────────────────── */
export const getExternal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const c = await TalentCandidate.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!c) return res.status(404).json({ success: false, message: 'Candidate not found' });
    res.json({ success: true, data: c });
  } catch (e) { fail(res, e); }
};

export const saveExternal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields = candidateFields(req.body || {});
    if (!req.params.id && !fields.fullName) return res.status(400).json({ success: false, message: 'Name is required' });
    if (req.params.id) {
      const doc: any = await TalentCandidate.findOne({ _id: req.params.id, tenantId: tid(req) });
      if (!doc) return res.status(404).json({ success: false, message: 'Candidate not found' });
      // Blanked boxes clear the value: every profile field the form sends is applied.
      for (const [key, path] of Object.entries(FIELD_PATH)) {
        if (!(key in (req.body || {}))) continue;
        const v = candidateFields({ [key]: req.body[key] })[path];
        doc.set(path, v !== undefined ? v : key === 'skills' ? [] : undefined);
      }
      if (!doc.fullName) return res.status(400).json({ success: false, message: 'Name is required' });
      await doc.save();
      return res.json({ success: true, data: doc });
    }
    const doc = await TalentCandidate.create({ ...expand(fields), tenantId: tid(req), source: 'manual', createdBy: uid(req) });
    res.json({ success: true, data: doc });
  } catch (e) { fail(res, e); }
};

export const deleteExternal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const r = await TalentCandidate.deleteOne({ _id: req.params.id, tenantId: tid(req) });
    if (!r.deletedCount) return res.status(404).json({ success: false, message: 'Candidate not found' });
    await TalentShare.deleteMany({ tenantId: tid(req), talentCandidateId: req.params.id });
    res.json({ success: true });
  } catch (e) { fail(res, e); }
};

export const importExternal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ success: false, message: 'Choose an Excel or CSV file' });
    const wb = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false }) as Record<string, any>[];
    if (!rows.length) return res.status(400).json({ success: false, message: 'The sheet is empty' });
    res.json({ success: true, data: await importRows(String(tid(req)), String(uid(req)), rows) });
  } catch (e) { fail(res, e); }
};

export const downloadTemplate = async (_req: AuthenticatedRequest, res: Response) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="talent_pool_candidates_template.xlsx"');
  res.send(importTemplate());
};

export const importPlacementDesk = async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, data: await importFromPlacementDesk(String(tid(req)), String(uid(req))) }); }
  catch (e) { fail(res, e); }
};

export const uploadResume = async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) return res.status(400).json({ success: false, message: 'Choose a PDF or Word file' });
  res.json({ success: true, data: { url: `/uploads/talent/${file.filename}` } });
};

/* ── Student placement preferences (also editable by the student) ──────── */
export const setStudentPreferences = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findOne({ _id: req.params.id, tenantId: tid(req), role: 'STUDENT' }).select('_id').lean();
    if (!user) return res.status(404).json({ success: false, message: 'Student not found' });
    const prefs = {
      expectedRole: str(req.body?.expectedRole, 120),
      preferredLocations: String(req.body?.preferredLocation || '').split(',').map((x) => x.trim().slice(0, 60)).filter(Boolean).slice(0, 10),
    };
    const r = await StudentProfile.updateOne({ userId: user._id, tenantId: tid(req) }, { $set: { placementPreferences: prefs } });
    if (!r.matchedCount) return res.status(400).json({ success: false, message: 'This student has not filled in a profile yet' });
    res.json({ success: true, data: prefs });
  } catch (e) { fail(res, e); }
};
