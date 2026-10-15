import { Request, Response, NextFunction } from 'express';

/**
 * Temporary development gate. OAuth token endpoints must not be enabled
 * without a registered client and reviewed consent flow.
 */
export function mcpDevOnly(_req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  return next();
}

export function validRegisteredClient(clientId: unknown): clientId is string {
  if (typeof clientId !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(clientId)) return false;
  const configured = (process.env.MCP_OAUTH_CLIENT_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  return configured.length > 0 && configured.includes(clientId);
}
