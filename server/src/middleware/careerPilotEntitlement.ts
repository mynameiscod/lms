import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import { isEntitled } from '../services/passportEntitlementService';
import { isCareerPilotMember } from '../services/careerPilotPopulation';

/**
 * Refuses a CareerPilot member who has not paid for `featureKey` (PassportConfig.entitlements,
 * where the institute sets each feature free or paid).
 *
 * ONLY CareerPilot members are judged. Shared screens — Thinking Lab is one — also serve LMS
 * students, staff and admins, who have no membership to check and must not be locked out of a
 * feature their institute gives them. The member app shows its own unlock page; this is what
 * stops the data reaching a non-member who calls the API directly.
 */
export const requireCareerPilotFeature = (featureKey: string) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id || req.user.role !== 'STUDENT') return next();
      const user: any = await User.findById(req.user.id).select('passport').lean();
      if (!isCareerPilotMember(user?.passport)) return next();
      const cfg: any = await PassportConfig.findOne({ tenantId: req.user.tenantId }).select('entitlements').lean();
      if (isEntitled(cfg?.entitlements, user?.passport, featureKey)) return next();
      return res.status(403).json({ success: false, code: 'MEMBERSHIP_REQUIRED', feature: featureKey, message: 'This is part of CareerPilot membership.' });
    } catch (err) {
      next(err);
    }
  };
