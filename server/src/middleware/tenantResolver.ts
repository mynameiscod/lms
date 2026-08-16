import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

/**
 * Decide which tenant a request acts on.
 *
 * THE TOKEN DECIDES, NOT THE CALLER. This used to read
 *
 *     req.headers['x-tenant-id'] || req.user?.tenantId
 *
 * with the header winning, and `x-tenant-id` is explicitly allow-listed in the CORS config,
 * so it was a designed path rather than an oversight. Any authenticated user could set one
 * header and have every `req.tenantId`-scoped query — 39 controllers' worth — read and write
 * another organisation's data. CORS does not help: it is a browser convention, not an
 * authorisation boundary, and it does nothing about a request that is not sent by a browser.
 *
 * The client does send the header on nearly every call, but always with the user's OWN
 * tenant, copied from the login response into localStorage. So ignoring it for authenticated
 * requests changes no legitimate behaviour: the value it carried is the value the token
 * already proves.
 *
 * NO TENANT-SWITCHING FLOW EXISTS TODAY, so none is built here. There is no impersonation UI
 * and nothing writes another tenant's id into localStorage. If cross-tenant administration is
 * ever wanted it needs its own explicit permission, a check that the target tenant exists,
 * and an AuditLog row for every switch — not a header any caller can set.
 *
 * The header still resolves the tenant for UNAUTHENTICATED routes, which is the only case
 * where there is no token to ask. Those endpoints are public by design and carry no
 * user-scoped authority.
 */
export const tenantResolver = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const headerTenant = (req.headers['x-tenant-id'] as string) || '';
  const tokenTenant = req.user?.tenantId ? String(req.user.tenantId) : '';

  /**
   * A mismatch is worth knowing about. It is the signature of somebody probing, and it is
   * also what a stale localStorage looks like after a tenant change — so it is logged
   * rather than rejected, and the token wins either way.
   */
  if (tokenTenant && headerTenant && headerTenant !== tokenTenant) {
    console.warn(
      `[tenant] ignoring x-tenant-id that does not match the token: ` +
      `header=${headerTenant} token=${tokenTenant} ${req.method} ${req.path}`,
    );
  }

  const tenantId = tokenTenant || headerTenant;

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      message: 'Tenant ID not provided',
    });
  }

  req.tenantId = tenantId;
  req.userId = req.user?.id;
  next();
};
