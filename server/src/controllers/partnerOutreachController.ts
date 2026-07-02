import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import PlacementPartner from '../models/PlacementPartner';
import PartnerOutreachMessage from '../models/PartnerOutreachMessage';
import { startSequence, draftVouch, draftCandidateProfiles, stopSequence, deliverMessage, markPartnerReplied } from '../services/partnerOutreachService';

const oid = (s: string) => new mongoose.Types.ObjectId(s);
const tId = (req: AuthenticatedRequest) => req.user!.tenantId as string;
const uId = (req: AuthenticatedRequest) => req.user!.id as string;

const findPartner = (req: AuthenticatedRequest) =>
  PlacementPartner.findOne({ _id: req.params.id, tenantId: oid(tId(req)) });

// POST /placement-partners/:id/start-outreach
export const startOutreach = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partner = await findPartner(req);
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });
    const r = await startSequence(partner, uId(req));
    res.json({ success: r.ok, message: r.ok ? (r.held ? r.reason! : 'Outreach started') : (r.reason || 'Could not start'), data: r });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners/start-outreach  { ids: [] }
export const startOutreachBulk = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ids: string[] = req.body.ids || [];
    if (!ids.length) return res.status(400).json({ success: false, message: 'No partner ids provided' });
    const partners = await PlacementPartner.find({ _id: { $in: ids.map(oid) }, tenantId: oid(tId(req)) });
    let started = 0, held = 0, skipped = 0;
    const details: any[] = [];
    for (const p of partners) {
      const r = await startSequence(p, uId(req));
      if (r.ok && !r.held) started++;
      else if (r.held) held++;
      else skipped++;
      details.push({ id: p._id, company: p.companyName, ...r, message: undefined });
    }
    res.json({ success: true, message: `Started ${started}, held ${held}, skipped ${skipped}`, data: { started, held, skipped, details } });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners/:id/mark-replied
export const markReplied = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partner = await findPartner(req);
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });
    await markPartnerReplied(partner, req.body.note, uId(req));
    res.json({ success: true, message: 'Marked as replied — sequence stopped, task created', data: partner });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners/:id/mark-bounced
export const markBounced = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partner = await findPartner(req);
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });
    await stopSequence(partner, 'bounced', req.body.note || 'Email bounced');
    res.json({ success: true, message: 'Marked as bounced — sequence stopped', data: partner });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners/:id/draft-vouch
export const draftVouchEndpoint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partner = await findPartner(req);
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });
    if (!partner.contactEmail) return res.status(400).json({ success: false, message: 'No contact email to send to' });
    const msg = await draftVouch(partner, uId(req));
    res.status(201).json({ success: true, message: 'Vouch email drafted — review it in the approval queue', data: msg });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners/:id/draft-candidate-profiles
export const draftCandidateProfilesEndpoint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partner = await findPartner(req);
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });
    const msg = await draftCandidateProfiles(partner, uId(req));
    res.status(201).json({ success: true, message: 'Candidate-profile email drafted — review & approve to send', data: msg });
  } catch (e: any) { res.status(400).json({ success: false, message: e.message }); }
};

// GET /placement-partners/:id/messages — timeline for one partner
export const getPartnerMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await PartnerOutreachMessage.find({ tenantId: oid(tId(req)), partnerId: oid(req.params.id) })
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, message: 'OK', data: rows });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /placement-partners/outreach/queue?status=pending_approval
export const getQueue = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = (req.query.status as string) || 'pending_approval';
    const rows = await PartnerOutreachMessage.find({ tenantId: oid(tId(req)), status })
      .sort({ createdAt: -1 }).limit(500).lean();
    res.json({ success: true, message: 'OK', data: rows });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// PATCH /placement-partners/outreach/messages/:mid — edit a draft before approval
export const updateMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const msg = await PartnerOutreachMessage.findOne({ _id: req.params.mid, tenantId: oid(tId(req)) });
    if (!msg) return res.status(404).json({ success: false, message: 'Not found' });
    if (msg.status !== 'pending_approval' && msg.status !== 'queued')
      return res.status(400).json({ success: false, message: `Cannot edit a ${msg.status} message` });
    if (req.body.subject !== undefined) msg.subject = req.body.subject;
    if (req.body.body !== undefined) msg.body = req.body.body;
    await msg.save();
    res.json({ success: true, message: 'Saved', data: msg });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners/outreach/messages/:mid/approve — approve & send now
export const approveMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const msg = await PartnerOutreachMessage.findOne({ _id: req.params.mid, tenantId: oid(tId(req)) });
    if (!msg) return res.status(404).json({ success: false, message: 'Not found' });
    if (msg.status !== 'pending_approval') return res.status(400).json({ success: false, message: `Message is ${msg.status}` });
    if (req.body.subject !== undefined) msg.subject = req.body.subject;
    if (req.body.body !== undefined) msg.body = req.body.body;
    msg.approvedBy = oid(uId(req));
    msg.approvedAt = new Date();
    await msg.save();
    const ok = await deliverMessage(msg._id as mongoose.Types.ObjectId);
    const fresh = await PartnerOutreachMessage.findById(msg._id).lean();
    res.json({ success: ok, message: ok ? 'Approved & sent' : 'Send failed', data: fresh });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners/outreach/messages/:mid/cancel — discard a draft/queued msg
export const cancelMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const msg = await PartnerOutreachMessage.findOneAndUpdate(
      { _id: req.params.mid, tenantId: oid(tId(req)), status: { $in: ['pending_approval', 'queued'] } },
      { $set: { status: 'cancelled', failedReason: 'Discarded by admin' } },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Not found or already processed' });
    res.json({ success: true, message: 'Discarded', data: msg });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
