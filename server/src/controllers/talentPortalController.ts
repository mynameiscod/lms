/**
 * Talent Portal — what a placement office sees (/api/v1/talent-portal).
 *
 * Every handler starts from the signed-in user's OWN partner record. The office never names its
 * partner id, and a share id that belongs to another office simply is not found — so one office
 * can never read or change another's candidates.
 */
import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { TalentShare, PARTNER_SETTABLE, TalentStatus } from '../models/TalentPool';
import { submissionsForShare } from './talentDeskController';
import { partnerOf, shareRows, forPartner, workbookFor, STATUS_LABELS, FIELDS, DEFAULT_COLUMNS } from '../services/talentPoolService';

const fail = (res: Response, e: any) => res.status(400).json({ success: false, message: e?.message || 'Something went wrong' });

/** Loads the office into req; refuses anyone who is not an active office login. */
export const loadPartner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if ((req.user as any)?.role !== 'PLACEMENT_PARTNER') return res.status(403).json({ success: false, message: 'Only placement office logins can open the Talent Portal' });
    const p: any = await partnerOf(String((req.user as any).id || (req.user as any)._id));
    if (!p) return res.status(403).json({ success: false, message: 'This office is not active. Please contact the institute.' });
    (req as any).partner = p;
    next();
  } catch (e) { fail(res, e); }
};
const partner = (req: AuthenticatedRequest) => (req as any).partner;
const scope = (req: AuthenticatedRequest) => ({ partnerId: partner(req)._id, tenantId: partner(req).tenantId });

export const me = async (req: AuthenticatedRequest, res: Response) => {
  const p = partner(req);
  const cols = p.exportColumns?.length ? p.exportColumns : DEFAULT_COLUMNS;
  res.json({
    success: true,
    data: {
      name: p.name, contactName: p.contactName, columns: cols,
      statuses: Object.entries(STATUS_LABELS).map(([key, label]) => ({ key, label, settable: PARTNER_SETTABLE.includes(key as TalentStatus) })),
      fields: FIELDS.map(({ key, label }) => ({ key, label })),
    },
  });
};

export const listCandidates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shares: any[] = await TalentShare.find(scope(req)).sort({ sharedAt: -1 }).lean();
    const rows = await shareRows(String(partner(req).tenantId), shares);
    // The list carries the summary only; the full history comes with one candidate.
    res.json({ success: true, data: rows.map((r) => { const { statusHistory, ...rest } = forPartner(r); return rest; }) });
  } catch (e) { fail(res, e); }
};

export const getCandidate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.shareId)) return res.status(404).json({ success: false, message: 'Not found' });
    const s: any = await TalentShare.findOne({ _id: req.params.shareId, ...scope(req) });
    if (!s) return res.status(404).json({ success: false, message: 'Not found' });
    const now = new Date();
    if (!s.firstViewedAt) s.firstViewedAt = now;
    s.lastViewedAt = now;
    // First look moves a new candidate to "Viewed" — never overwrites a status someone set.
    if (s.status === 'shared') { s.status = 'viewed'; s.statusHistory.push({ status: 'viewed', byRole: 'system', at: now } as any); }
    await s.save();
    const [row] = await shareRows(String(partner(req).tenantId), [s.toObject()]);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const out = forPartner(row);
    out.statusHistory = (out.statusHistory || []).map((h: any) => ({ status: h.status, byRole: h.byRole === 'partner' ? 'you' : h.byRole === 'admin' ? 'institute' : 'system', note: h.note, at: h.at }));
    out.submissions = await submissionsForShare(partner(req)._id, partner(req).tenantId, s._id);
    res.json({ success: true, data: out });
  } catch (e) { fail(res, e); }
};

export const setStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.shareId)) return res.status(404).json({ success: false, message: 'Not found' });
    const status = String(req.body?.status || '') as TalentStatus;
    if (!PARTNER_SETTABLE.includes(status)) return res.status(400).json({ success: false, message: 'Choose Shortlisted, Interview, Selected, Rejected or On hold' });
    const note = req.body?.note ? String(req.body.note).trim().slice(0, 1000) : undefined;
    const set: any = { status };
    if (note !== undefined) set.partnerNote = note;
    const s = await TalentShare.findOneAndUpdate(
      { _id: req.params.shareId, ...scope(req) },
      { $set: set, $push: { statusHistory: { status, by: (req.user as any).id, byRole: 'partner', note, at: new Date() } } },
      { new: true },
    );
    if (!s) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: { status: s.status, partnerNote: s.partnerNote || '' } });
  } catch (e) { fail(res, e); }
};

export const exportXlsx = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shares: any[] = await TalentShare.find(scope(req)).sort({ sharedAt: -1 }).lean();
    const rows = (await shareRows(String(partner(req).tenantId), shares)).map(forPartner);
    const buf = workbookFor(rows, partner(req).exportColumns || []);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="talent_pool_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(buf);
  } catch (e) { fail(res, e); }
};
