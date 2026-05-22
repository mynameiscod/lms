import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const SENSITIVE = new Set(['password', 'token', 'secret', 'answers', 'answer', 'jwt']);

function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const safe: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    safe[key] = SENSITIVE.has(key.toLowerCase()) ? '[REDACTED]' : obj[key];
  }
  return safe;
}

/**
 * Middleware that intercepts res.json() to log all 4xx / 5xx responses with
 * full request context: method, path, status, request body, error message.
 * Mount BEFORE route handlers so every route is covered.
 */
export function apiErrorLogger(req: Request, res: Response, next: NextFunction) {
  const startMs = Date.now();
  const origJson = res.json.bind(res);

  (res as any).json = function (body: any) {
    const status = res.statusCode;
    const ms     = Date.now() - startMs;
    const method = req.method;
    const url    = req.originalUrl;

    if (status >= 500) {
      logger.error(`${method} ${url} → ${status} (${ms}ms)`, {
        reqBody:  sanitize(req.body),
        response: body,
        ip:       req.ip,
        tenant:   req.headers['x-tenant-id'],
      });
    } else if (status >= 400) {
      logger.warn(`${method} ${url} → ${status} (${ms}ms)`, {
        reqBody:  sanitize(req.body),
        response: body,
        ip:       req.ip,
        tenant:   req.headers['x-tenant-id'],
      });
    } else {
      logger.info(`${method} ${url} → ${status} (${ms}ms)`);
    }

    return origJson(body);
  };

  next();
}
