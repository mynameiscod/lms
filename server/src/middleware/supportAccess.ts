import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { resolveSupportActor } from '../services/supportAccess';
import { can, SupportActor, SupportCapability } from '../data/supportPolicy';

export interface SupportRequest extends AuthenticatedRequest {
  supportActor?: SupportActor;
  requestId?: string;
}

/**
 * Resolves who the caller is for Help & Support (from the login and the database, never the body)
 * and refuses the request unless they hold the capability. Runs after authMiddleware.
 *
 * The actor is left on the request so every query below can be scoped with ticketScope(actor).
 */
export const requireSupport = (cap: SupportCapability) =>
  async (req: SupportRequest, res: Response, next: NextFunction) => {
    if (!req.user?.id || !req.user.tenantId) return res.status(401).json({ success: false, message: 'Please sign in again.' });
    try {
      const actor = req.supportActor || await resolveSupportActor(req.user);
      req.supportActor = actor;
      if (!can(actor, cap)) return res.status(403).json({ success: false, message: 'You do not have access to this.' });
      next();
    } catch (err) {
      next(err);
    }
  };
