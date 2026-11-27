import { Response, NextFunction } from 'express';
import { SupportRequest } from '../middleware/supportAccess';
import * as faq from '../services/supportFaqService';
import { SupportError } from '../services/supportTicketService';

/** Help Center articles — thin wrappers over services/supportFaqService. */
const ctxOf = (req: SupportRequest) => ({ requestId: req.requestId });
const handle = (fn: (req: SupportRequest, res: Response) => Promise<unknown>) =>
  async (req: SupportRequest, res: Response, next: NextFunction) => {
    try { await fn(req, res); } catch (e: any) {
      if (e instanceof SupportError) return res.status(e.status).json({ success: false, message: e.message, code: e.code, requestId: req.requestId });
      next(e);
    }
  };
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, message: 'OK', data });

/** Live suggestions while typing: not logged, or every keystroke would be a "search". */
export const suggest = handle(async (req, res) => ok(res, (await faq.searchFaqs(req.supportActor!, String(req.query.q || ''), { limit: 6 })).map(({ score, ...h }) => { void score; return h; })));
/** A search the member submitted: logged, including when nothing is found. */
export const search = handle(async (req, res) => ok(res, (await faq.searchAndLog(req.supportActor!, String(req.query.q || ''), { category: req.query.category as string, module: req.query.module as string })).map(({ score, ...h }) => { void score; return h; })));
export const categories = handle(async (req, res) => ok(res, await faq.categories(req.supportActor!)));
export const list = handle(async (req, res) => ok(res, await faq.listByCategory(req.supportActor!, req.query)));
export const get = handle(async (req, res) => ok(res, await faq.getFaq(req.supportActor!, req.params.id)));
export const vote = handle(async (req, res) => ok(res, await faq.voteFaq(req.supportActor!, req.params.id, req.body)));

export const adminList = handle(async (req, res) => ok(res, await faq.adminList(req.supportActor!, req.query)));
export const adminCreate = handle(async (req, res) => ok(res, await faq.adminCreate(req.supportActor!, req.body, ctxOf(req)), 201));
export const adminUpdate = handle(async (req, res) => ok(res, await faq.adminUpdate(req.supportActor!, req.params.id, req.body, ctxOf(req))));
export const adminStatus = handle(async (req, res) => ok(res, await faq.adminSetStatus(req.supportActor!, req.params.id, req.body, ctxOf(req))));
export const adminInsights = handle(async (req, res) => ok(res, await faq.adminInsights(req.supportActor!, req.query)));
