import { Request, Response, NextFunction } from 'express';
import { capture, count, monitoringSettings, moduleForPath } from '../services/supportMonitoring';

/**
 * Times every API request and records, once it has finished:
 *   - 5xx responses, grouped by route (an error group);
 *   - requests slower than the configured threshold (a group per route, and a count);
 *   - 401 and 403 responses as COUNTS ONLY — how many, never whose.
 *
 * It reads the matched route template (req.route) after the response, so /tickets/abc and
 * /tickets/def are the same route. Nothing here can delay or fail the response.
 */
export function requestMonitoring(req: Request, res: Response, next: NextFunction) {
  if (!req.originalUrl.startsWith('/api/')) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    try {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const status = res.statusCode;
      const route = req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : req.originalUrl;
      const label = `${req.method} ${route}`;
      const requestId = (req as any).requestId;
      const tenantId = (req as any).user?.tenantId ? String((req as any).user.tenantId) : undefined;
      if (status === 401) count('auth_401');
      else if (status === 403) count('auth_403');
      else if (status === 429) count('rate_limited');
      if (status >= 500) {
        count('http_5xx');
        // An unhandled exception was already captured with its stack; one group is enough.
        if (!(req as any).monitorCaptured) capture({ kind: 'server_5xx', title: `${label} → ${status}`, route: label, module: moduleForPath(route), requestId, tenantId, key: String(status) });
      }
      if (ms >= monitoringSettings().slowRequestMs) {
        count('slow_request');
        capture({ kind: 'slow_request', title: `Slow: ${label}`, message: `${Math.round(ms)} ms`, route: label, module: moduleForPath(route), requestId, tenantId });
      }
    } catch { /* never */ }
  });
  next();
}
