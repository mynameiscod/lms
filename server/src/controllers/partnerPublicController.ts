import { Request, Response } from 'express';
import PlacementPartner from '../models/PlacementPartner';
import PartnerSuppression from '../models/PartnerSuppression';
import { verifyUnsubToken } from '../utils/partnerUnsub';
import { stopSequence } from '../services/partnerOutreachService';

// Simple branded confirmation page for the public unsubscribe link.
const page = (msg: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe · CodeBegun</title></head>` +
  `<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;margin:0;padding:40px">` +
  `<div style="max-width:460px;margin:40px auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:32px;text-align:center">` +
  `<div style="font-weight:800;color:#051D64;font-size:20px;margin-bottom:14px">CodeBegun</div>` +
  `<p style="color:#334155;font-size:15px;line-height:1.6;margin:0">${msg}</p></div></body></html>`;

/** GET /public/partner-unsubscribe/:token — one-click opt-out (no auth). */
export const partnerUnsubscribe = async (req: Request, res: Response) => {
  const v = verifyUnsubToken(req.params.token);
  if (!v) return res.status(400).type('html').send(page('This unsubscribe link is invalid or has expired.'));
  try {
    const partner = await PlacementPartner.findOne({ _id: v.partnerId, tenantId: v.tenantId });
    if (partner?.contactEmail) {
      await PartnerSuppression.updateOne(
        { tenantId: partner.tenantId, email: partner.contactEmail.toLowerCase() },
        { $setOnInsert: { reason: 'unsubscribed', partnerId: partner._id, createdAt: new Date() } },
        { upsert: true }
      );
      if (partner.outreach?.status === 'in_sequence') await stopSequence(partner, 'stopped', 'Unsubscribed');
    }
    res.type('html').send(page('You have been unsubscribed. You will not receive any further emails from us. Thank you.'));
  } catch {
    res.status(500).type('html').send(page('Something went wrong. Please reply to any of our emails to be removed.'));
  }
};
