import { Request, Response } from 'express';
import * as svc from '../services/questionPoolService';
import { Actor } from '../services/problemBankService';
import { checkPoolExam } from '../services/poolExamService';
import { csvTemplate } from '../services/problemImportService';

const actor = (req: Request): Actor => ({
  userId: String((req as any).user?.id || ''),
  tenantId: String((req as any).tenantId || ''),
  role: String((req as any).user?.role || ''),
});

/** Validation and permission problems carry their own message and status; nothing else leaks. */
const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { await fn(req, res); } catch (e: any) {
    const status = e instanceof svc.PoolError ? e.status : 500;
    if (status === 500) console.error('[question-pools]', e);
    res.status(status).json({ success: false, message: status === 500 ? 'Something went wrong' : e.message });
  }
};

export const list = wrap(async (req, res) => { res.json({ success: true, data: await svc.listPools(actor(req)) }); });
export const get = wrap(async (req, res) => { res.json({ success: true, data: await svc.getPool(actor(req), req.params.id) }); });
export const create = wrap(async (req, res) => { res.status(201).json({ success: true, data: await svc.createPool(actor(req), req.body) }); });
export const update = wrap(async (req, res) => { res.json({ success: true, data: await svc.updatePool(actor(req), req.params.id, req.body) }); });
export const remove = wrap(async (req, res) => { res.json({ success: true, data: await svc.deletePool(actor(req), req.params.id) }); });
export const addQuestions = wrap(async (req, res) => { res.json({ success: true, data: await svc.addQuestions(actor(req), req.params.id, req.body?.ids) }); });
export const removeQuestions = wrap(async (req, res) => { res.json({ success: true, data: await svc.removeQuestions(actor(req), req.params.id, req.body?.ids) }); });
export const browseBank = wrap(async (req, res) => { res.json({ success: true, data: await svc.browseBank(actor(req), req.params.id, req.query) }); });
export const importMcqs = wrap(async (req, res) => { res.json({ success: true, data: await svc.importMcqs(actor(req), req.params.id, req.body?.rows) }); });
export const importFile = wrap(async (req, res) => { res.json({ success: true, data: await svc.importFile(actor(req), req.params.id, req.body) }); });
/** The spreadsheet template for a pool kind: the Problem Bank's columns for coding, MCQ columns otherwise. */
export const importTemplate = wrap(async (req, res) => {
  const coding = req.query.kind === 'coding';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${coding ? 'coding' : 'mcq'}-pool-template.csv"`);
  res.send(coding ? csvTemplate({ complete: true }) : svc.MCQ_TEMPLATE);
});
export const checkExam =wrap(async (req, res) => { res.json({ success: true, data: await checkPoolExam(actor(req), req.body?.sections) }); });
