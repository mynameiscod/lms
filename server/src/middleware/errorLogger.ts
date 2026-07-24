import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import StudentActivityLog from '../models/StudentActivityLog';

const SENSITIVE = new Set(['password', 'token', 'secret', 'answers', 'answer', 'jwt']);

function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const safe: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    safe[key] = SENSITIVE.has(key.toLowerCase()) ? '[REDACTED]' : obj[key];
  }
  return safe;
}

// Classify a request into a module + (optional) key learning action.
function classify(method: string, path: string): { module: string; keyAction: string | null } {
  const p = path.split('?')[0];
  const m = method.toUpperCase();
  let module = 'other';
  if (/\/assignments|\/submissions/.test(p)) module = 'assignment';
  else if (/\/quiz/.test(p)) module = 'quiz';
  else if (/\/interview/.test(p)) module = 'interview';
  else if (/\/thinking-lab|\/communication|\/drill|\/speaking-practice|\/speaking/.test(p)) module = 'lab';
  else if (/\/attendance|\/leave/.test(p)) module = 'attendance';
  else if (/\/auth\//.test(p)) module = 'auth';
  else if (/\/playground/.test(p)) module = 'playground';
  else if (/\/dashboard/.test(p)) module = 'dashboard';

  let keyAction: string | null = null;
  if (m === 'POST') {
    if (module === 'assignment' && /\/submit(coding|mcq|theory)?$/i.test(p)) keyAction = 'Submitted assignment';
    else if (module === 'assignment' && /\/run$/i.test(p)) keyAction = 'Ran assignment code';
    else if (module === 'assignment' && /\/hint$/i.test(p)) keyAction = 'Requested AI hint';
    else if (module === 'quiz' && /(\/submit|\/attempt|\/start)/i.test(p)) keyAction = 'Attempted quiz';
    else if (module === 'interview' && /\/start/i.test(p)) keyAction = 'Started interview';
    else if (module === 'interview' && /\/submit/i.test(p)) keyAction = 'Submitted interview';
    else if (module === 'lab' && /\/submit/i.test(p)) keyAction = 'Submitted lab challenge';
    else if (module === 'playground' && /\/run/i.test(p)) keyAction = 'Ran playground code';
    else if (module === 'auth' && /login/i.test(p)) keyAction = 'Logged in';
  }
  return { module, keyAction };
}

// Persist a per-user activity/error entry (fire-and-forget). Skips unauthenticated
// requests and the activity/log endpoints themselves (avoid noise/recursion).
function captureActivity(req: Request, status: number, body: any) {
  try {
    const user = (req as any).user;
    const path = (req.originalUrl || '').split('?')[0];
    if (!user?.id) return;
    if (/\/admin\/(activity|logs)/.test(path) || /\/health/.test(path)) return;

    const tenantId = user.tenantId || req.headers['x-tenant-id'];
    if (!tenantId) return;

    const isError = status >= 400;
    const { module, keyAction } = classify(req.method, path);
    if (!isError && !keyAction) return; // only errors + key actions

    const errMsg = isError ? (body?.message || body?.error || `HTTP ${status}`) : undefined;
    StudentActivityLog.create({
      tenantId,
      userId: user.id,
      role: user.role,
      action: isError ? (keyAction ? `${keyAction} — failed` : 'Request failed') : keyAction!,
      method: req.method,
      route: path,
      module,
      status,
      errorMessage: errMsg ? String(errMsg).slice(0, 600) : undefined,
      meta: isError ? { reqBody: sanitize(req.body) } : undefined,
      source: 'server',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => { /* never let telemetry break a request */ });
  } catch { /* ignore */ }
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

    // Per-user activity/error capture (errors + key learning actions)
    captureActivity(req, status, body);

    return origJson(body);
  };

  next();
}
