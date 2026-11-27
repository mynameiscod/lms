import { Request, Response } from 'express';
import * as svc from '../services/poolExamRuntimeService';
import * as admin from '../services/poolExamAdminService';

const student = (req: Request): svc.Student => ({
  userId: String((req as any).user?.id || ''),
  tenantId: String((req as any).tenantId || ''),
});

/** Rule problems carry their own message and status; nothing else leaks. */
const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { await fn(req, res); } catch (e: any) {
    const status = e instanceof svc.ExamError ? e.status : 500;
    if (status === 500) console.error('[pool-exam]', e);
    res.status(status).json({ success: false, message: status === 500 ? 'Something went wrong' : e.message });
  }
};

export const overview = wrap(async (req, res) => { res.json({ success: true, data: await svc.overview(student(req), req.params.assignmentId) }); });
export const start = wrap(async (req, res) => { res.json({ success: true, data: await svc.start(student(req), req.params.assignmentId) }); });
export const paper = wrap(async (req, res) => { res.json({ success: true, data: await svc.paper(student(req), req.params.attemptId) }); });
export const save = wrap(async (req, res) => { res.json({ success: true, data: await svc.saveAnswer(student(req), req.params.attemptId, req.params.key, req.body) }); });
export const run = wrap(async (req, res) => { res.json({ success: true, data: await svc.run(student(req), req.params.attemptId, req.params.key, req.body) }); });
export const violation = wrap(async (req, res) => { res.json({ success: true, data: await svc.violation(student(req), req.params.attemptId, req.body?.type) }); });
export const submit = wrap(async (req, res) => { res.json({ success: true, data: await svc.submit(student(req), req.params.attemptId) }); });

/* ── Teacher side ── */
const tenantOf = (req: Request) => String((req as any).tenantId || '');

export const results = wrap(async (req, res) => { res.json({ success: true, data: await admin.results(tenantOf(req), req.params.assignmentId) }); });
export const questionStats = wrap(async (req, res) => { res.json({ success: true, data: await admin.questionStats(tenantOf(req), req.params.assignmentId) }); });
export const attemptDetail = wrap(async (req, res) => { res.json({ success: true, data: await admin.attemptDetail(tenantOf(req), req.params.attemptId) }); });
export const release = wrap(async (req, res) => { res.json({ success: true, data: await admin.setReleased(tenantOf(req), req.params.assignmentId, req.body?.released !== false) }); });
export const regrade = wrap(async (req, res) => { res.json({ success: true, data: await admin.regrade(tenantOf(req), req.params.attemptId) }); });
export const exportResults = wrap(async (req, res) => {
  const { filename, buffer } = await admin.exportWorkbook(tenantOf(req), req.params.assignmentId);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
  res.send(buffer);
});
