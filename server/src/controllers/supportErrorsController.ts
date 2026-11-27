import { Response, NextFunction } from 'express';
import { SupportRequest } from '../middleware/supportAccess';
import * as errors from '../services/supportErrorsService';
import { SupportError } from '../services/supportTicketService';

/** /admin/errors — thin wrappers over services/supportErrorsService. Access: requireMonitor. */
const ctxOf = (req: SupportRequest) => ({ requestId: req.requestId });
const handle = (fn: (req: SupportRequest, res: Response) => Promise<unknown>) =>
  async (req: SupportRequest, res: Response, next: NextFunction) => {
    try { await fn(req, res); } catch (e: any) {
      if (e instanceof SupportError) return res.status(e.status).json({ success: false, message: e.message, code: e.code, requestId: req.requestId });
      next(e);
    }
  };
const ok = (res: Response, data: unknown) => res.json({ success: true, message: 'OK', data });

export const list = handle(async (req, res) => ok(res, await errors.listErrors(req.query)));
export const detail = handle(async (req, res) => ok(res, await errors.errorDetail(req.params.id)));
export const update = handle(async (req, res) => ok(res, await errors.updateError(req.supportActor!, req.params.id, req.body, ctxOf(req))));
export const counters = handle(async (req, res) => ok(res, await errors.counters(req.query)));
export const getConfig = handle(async (_req, res) => ok(res, await errors.getMonitoringConfig()));
export const saveConfig = handle(async (req, res) => ok(res, await errors.saveMonitoringConfig(req.supportActor!, req.body, ctxOf(req))));
