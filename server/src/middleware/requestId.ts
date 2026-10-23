import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Gives every request an id, returns it as X-Request-Id, and keeps it on req.requestId.
 *
 * The id ties together a log line, an error report and a support ticket ("my request failed,
 * here is the reference"). A caller-supplied X-Request-Id is kept only if it looks like one of
 * ours — anything else is replaced, so a header cannot be used to inject text into the logs.
 */
const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
  (req as any).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

export const requestIdOf = (req: Request): string | undefined => (req as any).requestId;
