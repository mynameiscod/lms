import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { tenantResolver } from './tenantResolver';

/**
 * The institute a request acts on — THE LOGIN TOKEN DECIDES, never the X-Tenant-Id header.
 *
 * This middleware used to set req.tenantId straight from the header, on 46 route files (users,
 * leads, fees, payments, placement program, WhatsApp chat, …), so a user of one institute could
 * send another institute's id and read or change its data. tenantResolver was fixed for the same
 * hole earlier (see its comment); this now makes exactly the same decision, so the two can never
 * drift apart again:
 *   - signed-in request  → the token's institute (a different header is logged and ignored);
 *   - no token (public)  → the header, as before.
 *
 * Every router that uses this runs authMiddleware first (checked 2026-10-09), so the token is
 * always available when it matters.
 */
export const tenantMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
  tenantResolver(req, res, next);
