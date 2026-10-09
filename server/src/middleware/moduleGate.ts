import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Tenant from '../models/Tenant';
import { jwtSecret } from '../config/secrets';
import { effectiveModules, moduleForApiPath, ModuleKey } from '../config/tenantModules';

/**
 * Server-side module switches. A module the SaaS admin turned off for an institute is refused
 * here (403 MODULE_DISABLED) — before, turning one off only hid its menu items.
 *
 * Mounted once, ahead of every API router. The institute comes from the VERIFIED login token,
 * never a header. Requests without a valid token pass through untouched: public pages and
 * webhooks keep working, and the route's own auth still answers 401 where it must.
 * A failure to read the tenant fails OPEN (logged) — a database blip must not take the LMS down.
 */

const CACHE_MS = 30_000;
const cache = new Map<string, { at: number; modules: Record<ModuleKey, boolean> }>();

export function invalidateModuleCache(tenantId?: string) {
  if (tenantId) cache.delete(String(tenantId)); else cache.clear();
}

export async function modulesForTenant(tenantId: string): Promise<Record<ModuleKey, boolean>> {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.modules;
  const t: any = await Tenant.findById(tenantId).select('modules').lean();
  const modules = effectiveModules(t?.modules);
  cache.set(tenantId, { at: Date.now(), modules });
  return modules;
}

export async function moduleGate(req: Request, res: Response, next: NextFunction) {
  const key = moduleForApiPath(req.path);
  if (!key) return next();
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  if (!token) return next();
  let decoded: any;
  try { decoded = jwt.verify(token, jwtSecret()); } catch { return next(); }
  if (decoded?.role === 'SUPER_ADMIN' || !decoded?.tenantId) return next();
  try {
    const modules = await modulesForTenant(String(decoded.tenantId));
    if (modules[key] === false) {
      return res.status(403).json({
        success: false, code: 'MODULE_DISABLED', module: key,
        message: 'This feature is not enabled for your institute. Contact the platform administrator.',
      });
    }
  } catch (e: any) {
    console.warn('[module-gate] could not read tenant modules — allowing', e?.message);
  }
  next();
}
