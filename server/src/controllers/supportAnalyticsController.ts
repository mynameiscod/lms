import { Response, NextFunction } from 'express';
import { SupportRequest } from '../middleware/supportAccess';
import * as analytics from '../services/supportAnalyticsService';
import { SupportError } from '../services/supportTicketService';

/** Help & Support dashboard, incidents and settings — thin wrappers over services/supportAnalyticsService. */
const ctxOf = (req: SupportRequest) => ({ requestId: req.requestId });
const handle = (fn: (req: SupportRequest, res: Response) => Promise<unknown>) =>
  async (req: SupportRequest, res: Response, next: NextFunction) => {
    try { await fn(req, res); } catch (e: any) {
      if (e instanceof SupportError) return res.status(e.status).json({ success: false, message: e.message, code: e.code, requestId: req.requestId });
      next(e);
    }
  };
const ok = (res: Response, data: unknown) => res.json({ success: true, message: 'OK', data });

export const summary = handle(async (req, res) => ok(res, await analytics.summary(req.supportActor!, req.query)));
export const trends = handle(async (req, res) => ok(res, await analytics.trends(req.supportActor!, req.query)));
export const breakdown = handle(async (req, res) => ok(res, await analytics.breakdown(req.supportActor!, req.query)));
export const incidents = handle(async (req, res) => ok(res, await analytics.incidents(req.supportActor!, req.query)));
export const confirmIncident = handle(async (req, res) => ok(res, await analytics.confirmIncident(req.supportActor!, req.body, ctxOf(req))));
export const resolveIncident = handle(async (req, res) => ok(res, await analytics.resolveIncident(req.supportActor!, req.params.id, ctxOf(req))));
export const getConfig = handle(async (req, res) => ok(res, await analytics.getConfig(req.supportActor!, req.query)));
export const saveConfig = handle(async (req, res) => ok(res, await analytics.saveConfig(req.supportActor!, req.body, ctxOf(req))));
