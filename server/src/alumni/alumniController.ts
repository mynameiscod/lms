import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as svc from './alumniService';
import MentoringRequest from '../models/MentoringRequest';

export const list = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { year, department, mentoring } = req.query as Record<string, string>;
    const data = await svc.listAlumni(req.user!.tenantId, {
      year: year ? Number(year) : undefined,
      department,
      mentoring: mentoring === 'true' ? true : undefined,
    });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const getOne = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const alumni = await svc.getAlumniById(req.params.id, req.user!.tenantId);
    if (!alumni) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: alumni });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const create = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, graduationYear } = req.body;
    if (!firstName || !lastName || !graduationYear)
      return res.status(400).json({ success: false, message: 'firstName, lastName and graduationYear are required' });
    const alumni = await svc.createAlumni(req.user!.tenantId, req.body);
    res.status(201).json({ success: true, data: alumni });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const update = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const alumni = await svc.updateAlumni(req.params.id, req.user!.tenantId, req.body);
    if (!alumni) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: alumni });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const remove = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await svc.deleteAlumni(req.params.id, req.user!.tenantId);
    res.json({ success: true, message: 'Alumni removed' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const getStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await svc.getAlumniStats(req.user!.tenantId);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- Mentoring Requests ----

export const createMentoringRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const studentId = req.user!.id || (req.user! as any)._id;
    const { alumniId, message } = req.body;
    if (!alumniId || !message)
      return res.status(400).json({ success: false, message: 'alumniId and message are required' });

    const existing = await MentoringRequest.findOne({ tenantId, alumniId, studentId, status: 'pending' });
    if (existing)
      return res.status(409).json({ success: false, message: 'You already have a pending request to this mentor' });

    const request = await MentoringRequest.create({ tenantId, alumniId, studentId, message });
    res.status(201).json({ success: true, data: request });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const listMyMentoringRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const studentId = req.user!.id || (req.user! as any)._id;
    const requests = await MentoringRequest.find({ tenantId, studentId })
      .populate('alumniId', 'firstName lastName currentCompany currentRole linkedInUrl')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const listAlumniMentoringRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { alumniId } = req.params;
    const requests = await MentoringRequest.find({ tenantId, alumniId })
      .populate('studentId', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const respondToMentoringRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { requestId } = req.params;
    const { status, responseMessage } = req.body;
    if (!['accepted', 'declined'].includes(status))
      return res.status(400).json({ success: false, message: 'status must be accepted or declined' });

    const request = await MentoringRequest.findOneAndUpdate(
      { _id: requestId, tenantId },
      { status, responseMessage: responseMessage || null, respondedAt: new Date() },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: request });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- Success Stories ----
export const getSuccessStories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await svc.getSuccessStories(req.user!.tenantId);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ---- Referrals ----
export const listReferrals = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Students only see open (non-expired) referrals; admins see all.
    const isStudent = req.user!.role === 'STUDENT';
    const data = await svc.listReferrals(req.user!.tenantId, { openOnly: isStudent });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const createReferral = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { company, role } = req.body;
    if (!company || !role) return res.status(400).json({ success: false, message: 'company and role are required' });
    const data = await svc.createReferral(req.user!.tenantId, req.user!.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const updateReferral = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await svc.updateReferral(req.params.id, req.user!.tenantId, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const deleteReferral = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await svc.deleteReferral(req.params.id, req.user!.tenantId);
    res.json({ success: true, message: 'Referral removed' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const expressInterest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const r = await svc.expressInterest(req.params.id, req.user!.tenantId, req.user!.id || (req.user! as any)._id);
    if (!r.ok) return res.status(r.reason === 'not_found' ? 404 : 409).json({ success: false, message: r.reason === 'closed' ? 'This referral is closed.' : 'Referral not found' });
    res.json({ success: true, already: (r as any).already || false });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};
