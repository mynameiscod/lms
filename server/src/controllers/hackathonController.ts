import { Request, Response } from 'express';
import Hackathon, { TEAM_SIZE_BOUNDS, DEFAULT_TEAM_SIZE } from '../models/Hackathon';
import HackathonRegistration from '../models/HackathonRegistration';
import { confirmedTeamCount } from '../services/hackathonRegistrationService';

/**
 * Admin side of hackathons — create the event, watch who registered, get the list out.
 *
 * The public funnel validates against whatever is saved here, so this screen is where the
 * team size, the fee, the college dropdown and the capacity are actually decided.
 */

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');

const slugify = (s: string): string =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

const clampInt = (v: any, lo: number, hi: number, dflt: number): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
};

const str = (v: any, max = 5000): string => String(v ?? '').trim().slice(0, max);
const dateOrNull = (v: any): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

/** Read an event off the request body, clamped to what the public funnel can honour. */
function readBody(body: any, existing?: any) {
  const title = str(body?.title, 140) || existing?.title || '';
  const min = clampInt(body?.minTeamSize, TEAM_SIZE_BOUNDS.min, TEAM_SIZE_BOUNDS.max, existing?.minTeamSize ?? DEFAULT_TEAM_SIZE.min);
  // The maximum can never fall below the minimum, or no team is registerable at all.
  const max = Math.max(min, clampInt(body?.maxTeamSize, TEAM_SIZE_BOUNDS.min, TEAM_SIZE_BOUNDS.max, existing?.maxTeamSize ?? DEFAULT_TEAM_SIZE.max));

  return {
    title,
    slug: slugify(body?.slug || existing?.slug || title),
    description: str(body?.description, 20000),
    process: str(body?.process, 20000),
    venue: str(body?.venue, 300),
    bannerUrl: str(body?.bannerUrl, 600),
    startAt: dateOrNull(body?.startAt) || existing?.startAt,
    endAt: dateOrNull(body?.endAt),
    prizes: {
      first:  str(body?.prizes?.first, 200),
      second: str(body?.prizes?.second, 200),
      third:  str(body?.prizes?.third, 200),
      others: Array.isArray(body?.prizes?.others) ? body.prizes.others.map((x: any) => str(x, 200)).filter(Boolean).slice(0, 10) : [],
    },
    feeInr: Math.max(0, Math.round(Number(body?.feeInr) || 0)),
    minTeamSize: min,
    maxTeamSize: max,
    registerOpensAt: dateOrNull(body?.registerOpensAt),
    registerClosesAt: dateOrNull(body?.registerClosesAt),
    maxTeams: Math.max(0, Math.round(Number(body?.maxTeams) || 0)),
    colleges: Array.isArray(body?.colleges)
      ? [...new Set(body.colleges.map((c: any) => str(c, 160)).filter(Boolean))].slice(0, 500) as string[]
      : (existing?.colleges || []),
    allowOtherCollege: body?.allowOtherCollege !== false,
    status: ['draft', 'published', 'closed'].includes(body?.status) ? body.status : (existing?.status || 'draft'),
  };
}

/** GET /hackathons */
export const list = async (req: Request, res: Response) => {
  try {
    const rows = await Hackathon.find({ tenantId: tenantOf(req) }).sort({ startAt: -1 }).lean();
    // Registration counts in one aggregate rather than one query per event.
    const counts = await HackathonRegistration.aggregate([
      { $match: { tenantId: tenantOf(req) } },
      { $group: { _id: { h: '$hackathonId', s: '$status' }, n: { $sum: 1 } } },
    ]);
    const byId = new Map<string, { confirmed: number; pending: number; refundDue: number }>();
    for (const c of counts) {
      const k = String(c._id.h);
      const cur = byId.get(k) || { confirmed: 0, pending: 0, refundDue: 0 };
      if (c._id.s === 'confirmed') cur.confirmed += c.n;
      else if (c._id.s === 'pending_payment') cur.pending += c.n;
      else if (c._id.s === 'refund_due') cur.refundDue += c.n;
      byId.set(k, cur);
    }
    res.json({
      success: true,
      hackathons: rows.map(h => ({ ...h, counts: byId.get(String(h._id)) || { confirmed: 0, pending: 0, refundDue: 0 } })),
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Could not load hackathons' });
  }
};

/** GET /hackathons/:id */
export const getOne = async (req: Request, res: Response) => {
  try {
    const h = await Hackathon.findOne({ _id: req.params.id, tenantId: tenantOf(req) }).lean();
    if (!h) return res.status(404).json({ success: false, message: 'Hackathon not found' });
    res.json({ success: true, hackathon: h, confirmedTeams: await confirmedTeamCount((h as any)._id) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Could not load hackathon' });
  }
};

/** POST /hackathons */
export const create = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const doc = readBody(req.body);
    if (!doc.title) return res.status(400).json({ success: false, message: 'Give the hackathon a title.' });
    if (!doc.startAt) return res.status(400).json({ success: false, message: 'Set the date and time it starts.' });
    if (!doc.slug) return res.status(400).json({ success: false, message: 'Could not build a URL from that title — set a slug.' });

    const h = await Hackathon.create({ ...doc, tenantId, createdBy: String((req as any).user?.id || '') });
    res.json({ success: true, hackathon: h });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ success: false, message: 'A hackathon with that URL slug already exists.' });
    res.status(500).json({ success: false, message: e.message || 'Could not create hackathon' });
  }
};

/** PUT /hackathons/:id */
export const update = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const existing = await Hackathon.findOne({ _id: req.params.id, tenantId }).lean();
    if (!existing) return res.status(404).json({ success: false, message: 'Hackathon not found' });

    const doc = readBody(req.body, existing);
    if (!doc.startAt) return res.status(400).json({ success: false, message: 'Set the date and time it starts.' });

    const h = await Hackathon.findOneAndUpdate({ _id: req.params.id, tenantId }, { $set: doc }, { new: true });
    res.json({ success: true, hackathon: h });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ success: false, message: 'A hackathon with that URL slug already exists.' });
    res.status(500).json({ success: false, message: e.message || 'Could not save hackathon' });
  }
};

/**
 * DELETE /hackathons/:id
 *
 * Refused once anyone has paid. Deleting the event would orphan money that was taken for it,
 * and the row is the only record of what those teams bought. Close it instead.
 */
export const remove = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const paid = await HackathonRegistration.countDocuments({
      hackathonId: req.params.id, status: { $in: ['confirmed', 'refund_due'] },
    });
    if (paid > 0) {
      return res.status(409).json({
        success: false,
        message: `${paid} team(s) have already registered. Set the hackathon to "closed" instead of deleting it.`,
      });
    }
    const r = await Hackathon.deleteOne({ _id: req.params.id, tenantId });
    if (!r.deletedCount) return res.status(404).json({ success: false, message: 'Hackathon not found' });
    await HackathonRegistration.deleteMany({ hackathonId: req.params.id, tenantId });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Could not delete hackathon' });
  }
};

/** GET /hackathons/:id/registrations?status= */
export const listRegistrations = async (req: Request, res: Response) => {
  try {
    const q: any = { hackathonId: req.params.id, tenantId: tenantOf(req) };
    if (req.query.status) q.status = String(req.query.status);
    const rows = await HackathonRegistration.find(q).sort({ createdAt: -1 }).limit(2000).lean();
    res.json({ success: true, registrations: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Could not load registrations' });
  }
};

/**
 * GET /hackathons/:id/registrations.csv — the list, for the desk on the day.
 *
 * One row per MEMBER, not per team: this is printed and used to tick people off at the
 * door, and a row per team would put five names in one cell.
 */
export const exportRegistrations = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const h = await Hackathon.findOne({ _id: req.params.id, tenantId }).select('title slug').lean() as any;
    if (!h) return res.status(404).json({ success: false, message: 'Hackathon not found' });

    const q: any = { hackathonId: req.params.id, tenantId };
    if (req.query.status) q.status = String(req.query.status);
    const rows = await HackathonRegistration.find(q).sort({ createdAt: 1 }).lean() as any[];

    const esc = (v: any): string => {
      const s = String(v ?? '');
      // A leading =, +, - or @ makes a spreadsheet treat the cell as a formula.
      const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
      return `"${safe.replace(/"/g, '""')}"`;
    };

    const head = ['Registration Code', 'Team', 'College', 'Status', 'Fee (INR)', 'Payment ID', 'Registered At', 'Member', 'Role', 'Mobile', 'Email'];
    const lines = [head.join(',')];
    for (const r of rows) {
      for (const m of (r.members || [])) {
        lines.push([
          r.registrationCode, r.teamName, r.college, r.status, r.amountInr,
          r.payment?.paymentId || '', new Date(r.createdAt).toISOString(),
          m.name, m.isLead ? 'Team lead' : 'Member', m.mobile, m.email,
        ].map(esc).join(','));
      }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${h.slug || 'hackathon'}-registrations.csv"`);
    // BOM so Excel opens UTF-8 names correctly rather than as mojibake.
    res.send('﻿' + lines.join('\n'));
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Could not export registrations' });
  }
};

/**
 * POST /hackathons/:id/registrations/:regId/refunded — mark a refund as settled.
 *
 * The money is moved in the Razorpay dashboard; this records that an admin did it, so a
 * `refund_due` row stops appearing on the list of things still owed.
 */
export const markRefunded = async (req: Request, res: Response) => {
  try {
    const reg = await HackathonRegistration.findOne({
      _id: req.params.regId, hackathonId: req.params.id, tenantId: tenantOf(req),
    });
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    if (reg.status !== 'refund_due') {
      return res.status(409).json({ success: false, message: 'Only a registration awaiting a refund can be marked refunded.' });
    }
    reg.status = 'cancelled';
    if (reg.payment) reg.payment.status = 'refunded';
    reg.cancelReason = `${reg.cancelReason || 'Refund'} — marked refunded by admin.`;
    await reg.save();
    res.json({ success: true, registration: reg });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Could not update registration' });
  }
};
