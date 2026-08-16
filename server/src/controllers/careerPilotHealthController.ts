import { Request, Response } from 'express';
import { buildConfigHealth } from '../services/careerPilotConfigHealthService';
import { buildLaunchReadiness } from '../services/careerPilotLaunchReadinessService';

/**
 * Configuration health and launch readiness, for the admin.
 *
 * THE TENANT COMES FROM THE TOKEN, never the request. Reading it from a query parameter
 * would let any admin point this at another organisation and read its configuration —
 * which names its roles, its companies and which of its secrets are unset.
 *
 * NOTHING HERE RETURNS A SECRET. The security findings report PRESENCE only: whether a
 * variable is configured, never its value, its length or a hash of it. A health screen that
 * leaks a key has leaked it.
 *
 * Both endpoints are reads. Neither repairs anything.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');

/** GET /passport/admin/health/configuration */
export const configuration = async (req: Request, res: Response) => {
  try {
    const health = await buildConfigHealth(tenantOf(req));
    res.json({ ...health, tenantScoped: true });
  } catch (e: any) {
    console.error('[cp-health] configuration:', e?.message || e);
    res.status(500).json({ message: 'Could not run the configuration checks.' });
  }
};

/** GET /passport/admin/health/launch-readiness */
export const launchReadiness = async (req: Request, res: Response) => {
  try {
    res.json(await buildLaunchReadiness(tenantOf(req)));
  } catch (e: any) {
    console.error('[cp-health] launch-readiness:', e?.message || e);
    res.status(500).json({ message: 'Could not work out launch readiness.' });
  }
};
