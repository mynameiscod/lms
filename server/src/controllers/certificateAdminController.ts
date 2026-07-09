import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as certs from '../services/certificateService';

// PUBLIC — GET /public/certificate/:code  (no auth; the code is the secret)
export const verifyCertificate = async (req: Request, res: Response) => {
  try {
    const result = await certs.verifyByCode(String(req.params.code));
    res.json({ success: true, ...result });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ADMIN — GET /certificates?type=&search=
export const listCertificates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await certs.listCertificates(req.user!.tenantId, { type: req.query.type as string, search: req.query.search as string });
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ADMIN — POST /certificates/:id/revoke  { revoked, reason }
export const revokeCertificate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const revoked = req.body?.revoked !== false; // default true
    const c = await certs.revokeCertificate(req.user!.tenantId, req.params.id, revoked, req.body?.reason);
    if (!c) return res.status(404).json({ success: false, message: 'Certificate not found' });
    res.json({ success: true, data: { id: String(c._id), revoked: c.revoked } });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
