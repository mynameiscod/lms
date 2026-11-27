import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import JobOpening, { JobOpeningMark, OPENING_KINDS, WORK_MODES, OPENING_STATUSES } from '../models/JobOpening';
import { isEntitled } from '../services/passportEntitlementService';

/**
 * Job openings for every CareerPilot member (models/JobOpening.ts).
 *
 * Posting is behind `manage_job_openings`, which only a super admin can give to a role
 * (roleController → SUPER_ADMIN_GRANTED). Members see published openings whose last date has not
 * passed, apply on the company's site, and can mark one as applied for their own tracking.
 */

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

/** Midnight today: an opening whose last date is today is still open all of today. */
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const openFilter = () => ({ status: 'PUBLISHED', $or: [{ lastDate: null }, { lastDate: { $exists: false } }, { lastDate: { $gte: startOfToday() } }] });

/** Same rule as the rest of the Job Board (companyQuestionController.gate). */
async function entitled(req: Request) {
  const [user, cfg] = await Promise.all([
    User.findById(userIdOf(req)).select('passport').lean() as any,
    PassportConfig.findOne({ tenantId: tenantOf(req) }).lean(),
  ]);
  return { ok: isEntitled((cfg as any)?.entitlements, user?.passport, 'company_questions'), cfg };
}

const memberView = (o: any, applied?: Date) => ({
  id: String(o._id), company: o.company, companyLogo: o.companyLogo || '', role: o.role, kind: o.kind,
  workMode: o.workMode, locations: o.locations || [], payMin: o.payMin ?? null, payMax: o.payMax ?? null,
  experience: o.experience || '', batches: o.batches || [], skills: o.skills || [], description: o.description || '',
  applyUrl: o.applyUrl, lastDate: o.lastDate || null, publishedAt: o.publishedAt || o.createdAt,
  appliedAt: applied || null,
});

// ─── Member ──────────────────────────────────────────────────────────────────

/** GET /careerpilot/job-openings */
export const listOpenings = async (req: Request, res: Response) => {
  try {
    const { ok, cfg } = await entitled(req);
    if (!ok) return res.json({ locked: true, priceInr: (cfg as any)?.priceInr ?? 1599, openings: [] });
    const rows = await JobOpening.find(openFilter()).sort({ publishedAt: -1 }).limit(500).lean();
    const marks = mongoose.isValidObjectId(userIdOf(req))
      ? await JobOpeningMark.find({ userId: userIdOf(req), openingId: { $in: rows.map((r) => r._id) } }).lean()
      : [];
    const byId = new Map(marks.map((m: any) => [String(m.openingId), m.appliedAt as Date]));
    res.json({ locked: false, openings: rows.map((r) => memberView(r, byId.get(String(r._id)))) });
  } catch (e: any) {
    console.error('[job-openings] list:', e);
    res.status(500).json({ message: 'Could not load the job openings.' });
  }
};

/** PUT /careerpilot/job-openings/:id/applied  { applied: boolean } */
export const markApplied = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Opening not found.' });
    const { ok } = await entitled(req);
    if (!ok) return res.status(403).json({ message: 'The Job Board is part of CareerPilot membership.' });
    const userId = userIdOf(req);
    if (req.body?.applied === false) {
      await JobOpeningMark.deleteOne({ userId, openingId: id });
      return res.json({ appliedAt: null });
    }
    if (!(await JobOpening.exists({ _id: id, status: 'PUBLISHED' }))) return res.status(404).json({ message: 'Opening not found.' });
    const m = await JobOpeningMark.findOneAndUpdate(
      { userId, openingId: id }, { $setOnInsert: { userId, openingId: id, appliedAt: new Date() } },
      { upsert: true, new: true },
    ).lean();
    res.json({ appliedAt: (m as any)?.appliedAt || new Date() });
  } catch (e: any) {
    console.error('[job-openings] mark:', e);
    res.status(500).json({ message: 'Could not save that.' });
  }
};

// ─── Admin ───────────────────────────────────────────────────────────────────

const str = (v: any, max: number) => String(v ?? '').trim().slice(0, max);
const list = (v: any, max: number, each: number) =>
  Array.from(new Set((Array.isArray(v) ? v : String(v ?? '').split(','))
    .map((x: any) => String(x).trim().slice(0, each)).filter(Boolean))).slice(0, max) as string[];
const num = (v: any) => (v === '' || v == null || !Number.isFinite(Number(v)) || Number(v) < 0 ? undefined : Number(v));

/** Checks and cleans an opening from the admin form. Returns the message to show when it is not valid. */
function clean(b: any): { data?: any; message?: string } {
  const company = str(b.company, 80);
  const role = str(b.role, 100);
  const applyUrl = str(b.applyUrl, 1000);
  if (!company) return { message: 'Enter the company name.' };
  if (!role) return { message: 'Enter the role.' };
  let url: URL | null = null;
  try { url = new URL(applyUrl); } catch { /* checked below */ }
  if (!url || !/^https?:$/.test(url.protocol)) return { message: 'Enter the company’s apply link, starting with https://' };
  const logo = str(b.companyLogo, 500);
  if (logo && !/^https?:\/\//i.test(logo) && !logo.startsWith('/')) return { message: 'The logo must be a link (https://…).' };
  const payMin = num(b.payMin), payMax = num(b.payMax);
  if (payMin != null && payMax != null && payMin > payMax) return { message: 'The lowest pay is higher than the highest.' };
  let lastDate: Date | null = null;
  if (b.lastDate) {
    lastDate = new Date(b.lastDate);
    if (Number.isNaN(lastDate.getTime())) return { message: 'The last date is not a valid date.' };
  }
  const status = OPENING_STATUSES.includes(b.status) ? b.status : 'DRAFT';
  return {
    data: {
      company, role, applyUrl, companyLogo: logo,
      kind: OPENING_KINDS.includes(b.kind) ? b.kind : 'job',
      workMode: WORK_MODES.includes(b.workMode) ? b.workMode : 'onsite',
      locations: list(b.locations, 10, 60),
      payMin, payMax,
      experience: str(b.experience, 60),
      batches: list(b.batches, 8, 4).map(Number).filter((n) => n >= 2000 && n <= 2100),
      skills: list(b.skills, 15, 40),
      description: str(b.description, 4000),
      lastDate, status,
    },
  };
}

const adminView = (o: any, applied: number) => {
  const expired = !!o.lastDate && new Date(o.lastDate) < startOfToday();
  return { ...memberView(o), status: o.status, expired, applied, createdByName: o.createdByName || '', updatedAt: o.updatedAt };
};

/** GET /careerpilot/job-openings-admin */
export const adminListOpenings = async (_req: Request, res: Response) => {
  try {
    const rows = await JobOpening.find({}).sort({ updatedAt: -1 }).limit(1000).lean();
    const counts = await JobOpeningMark.aggregate([
      { $match: { openingId: { $in: rows.map((r) => r._id) } } },
      { $group: { _id: '$openingId', n: { $sum: 1 } } },
    ]);
    const byId = new Map(counts.map((c: any) => [String(c._id), c.n as number]));
    res.json({ openings: rows.map((r) => adminView(r, byId.get(String(r._id)) || 0)) });
  } catch (e: any) {
    console.error('[job-openings] admin list:', e);
    res.status(500).json({ message: 'Could not load the job openings.' });
  }
};

/** POST /careerpilot/job-openings-admin · PUT /careerpilot/job-openings-admin/:id */
export const saveOpening = async (req: Request, res: Response) => {
  try {
    const { data, message } = clean(req.body || {});
    if (!data) return res.status(400).json({ message });
    const userId = userIdOf(req);
    const { id } = req.params;
    let doc: any;
    if (id) {
      if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Opening not found.' });
      doc = await JobOpening.findById(id);
      if (!doc) return res.status(404).json({ message: 'Opening not found.' });
    } else {
      const u: any = await User.findById(userId).select('firstName lastName email').lean();
      doc = new JobOpening({ createdBy: userId, createdByName: [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email || '' });
    }
    // The first publish dates the opening; a later edit does not push it back to the top.
    if (data.status === 'PUBLISHED' && !doc.publishedAt) data.publishedAt = new Date();
    doc.set({ ...data, updatedBy: userId });
    // Empty pay clears a value that was set before.
    if (data.payMin == null) doc.payMin = undefined;
    if (data.payMax == null) doc.payMax = undefined;
    if (!data.lastDate) doc.lastDate = undefined;
    await doc.save();
    res.json({ opening: adminView(doc.toObject(), 0) });
  } catch (e: any) {
    console.error('[job-openings] save:', e);
    res.status(500).json({ message: 'Could not save the opening.' });
  }
};

/** DELETE /careerpilot/job-openings-admin/:id */
export const deleteOpening = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Opening not found.' });
    const r = await JobOpening.deleteOne({ _id: id });
    if (!r.deletedCount) return res.status(404).json({ message: 'Opening not found.' });
    await JobOpeningMark.deleteMany({ openingId: id });
    res.json({ ok: true });
  } catch (e: any) {
    console.error('[job-openings] delete:', e);
    res.status(500).json({ message: 'Could not delete the opening.' });
  }
};
