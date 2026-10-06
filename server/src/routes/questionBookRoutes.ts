import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as svc from '../services/questionBookService';

/**
 * Question Books — staff write topic and company books of interview questions; LMS students
 * and CareerPilot members read them notebook-style and track what they know.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

const actor = (req: Request) => ({ tenantId: String((req as any).tenantId || ''), userId: String((req as any).user?.id || ''), role: String((req as any).user?.role || '') });
const wrap = (fn: (req: Request) => Promise<any>) => async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await fn(req) }); } catch (e: any) {
    const status = e instanceof svc.BookError ? e.status : 500;
    if (status === 500) console.error('[question-books]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};
const staff = roleGuard(['manage_interview_hub', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant', 'manage_tenant_users', 'manage_interviews']);

// ── Staff ──
router.get('/admin/books', staff, wrap((req) => svc.adminBooks(actor(req))));
router.post('/admin/books', staff, wrap((req) => svc.saveBook(actor(req), null, req.body || {})));
router.get('/admin/books/:id', staff, wrap((req) => svc.adminBook(actor(req), req.params.id)));
router.put('/admin/books/:id', staff, wrap((req) => svc.saveBook(actor(req), req.params.id, req.body || {})));
router.delete('/admin/books/:id', staff, wrap((req) => svc.deleteBook(actor(req), req.params.id)));
router.put('/admin/books/:id/chapters', staff, wrap((req) => svc.saveChapters(actor(req), req.params.id, req.body?.chapters || [])));
router.post('/admin/books/:id/questions', staff, wrap((req) => svc.saveQuestion(actor(req), req.params.id, null, req.body || {})));
router.put('/admin/books/:id/questions/:qid', staff, wrap((req) => svc.saveQuestion(actor(req), req.params.id, req.params.qid, req.body || {})));
router.delete('/admin/books/:id/questions/:qid', staff, wrap((req) => svc.deleteQuestion(actor(req), req.params.id, req.params.qid)));
router.post('/admin/books/:id/reorder', staff, wrap((req) => svc.reorderQuestions(actor(req), req.params.id, String(req.body?.chapterId || ''), req.body?.ids || [])));
router.post('/admin/books/:id/bulk', staff, wrap((req) => svc.bulkAdd(actor(req), req.params.id, String(req.body?.chapterId || ''), String(req.body?.text || ''), !!req.body?.dryRun)));

// ── Readers ──
router.get('/shelf', wrap((req) => svc.shelf(actor(req).tenantId, actor(req).userId)));
router.get('/cheat-sheet', wrap((req) => svc.cheatSheet(actor(req).tenantId, actor(req).userId)));
router.get('/books/:slug', wrap((req) => svc.readBook(actor(req).tenantId, actor(req).userId, req.params.slug)));
router.post('/books/:id/progress', wrap((req) => svc.saveProgress(actor(req).tenantId, actor(req).userId, req.params.id, req.body || {})));

export default router;
