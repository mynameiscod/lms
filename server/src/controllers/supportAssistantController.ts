import { Response, NextFunction } from 'express';
import { SupportRequest } from '../middleware/supportAccess';
import * as assistant from '../services/supportAssistantService';
import { SupportError } from '../services/supportTicketService';

/** The support assistant — thin wrappers over services/supportAssistantService. */
const handle = (fn: (req: SupportRequest, res: Response) => Promise<unknown>) =>
  async (req: SupportRequest, res: Response, next: NextFunction) => {
    try { await fn(req, res); } catch (e: any) {
      if (e instanceof SupportError) return res.status(e.status).json({ success: false, message: e.message, code: e.code, retryable: e.status === 503, requestId: req.requestId });
      next(e);
    }
  };
const ok = (res: Response, data: unknown) => res.json({ success: true, message: 'OK', data });

export const ask = handle(async (req, res) => ok(res, await assistant.ask(req.supportActor!, req.body, { requestId: req.requestId })));
export const session = handle(async (req, res) => ok(res, await assistant.getSession(req.supportActor!, req.params.id)));
export const feedback = handle(async (req, res) => ok(res, await assistant.feedback(req.supportActor!, req.params.id, req.body)));
export const close = handle(async (req, res) => ok(res, await assistant.closeSession(req.supportActor!, req.params.id)));
export const suggestions = handle(async (req, res) => ok(res, await assistant.suggestions(req.supportActor!)));
