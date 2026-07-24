import express, { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import StudentActivityLog from '../models/StudentActivityLog';
import User from '../models/User';

const router = express.Router();

// Admin/instructor/staff only (these expose other users' activity).
const adminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const role = (req.user as any)?.role;
  if (['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'].includes(role)) return next();
  return res.status(403).json({ success: false, message: 'Admins only' });
};

// POST /activity/client-error — browser error beacon (any authenticated user posts their own).
router.post('/client-error', authMiddleware, tenantResolver, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user as any;
    const raw = Array.isArray(req.body?.errors) ? req.body.errors : (req.body ? [req.body] : []);
    const docs = raw.slice(0, 20).filter(Boolean).map((e: any) => ({
      tenantId: req.tenantId,
      userId: user.id,
      role: user.role,
      action: 'Client error',
      method: String(e.method || 'GET').slice(0, 10),
      route: String(e.url || '').slice(0, 300),
      module: 'client',
      status: Number(e.status) || 0,
      errorMessage: String(e.message || '').slice(0, 600),
      source: 'client' as const,
      userAgent: req.headers['user-agent'],
    }));
    if (docs.length) await StudentActivityLog.insertMany(docs, { ordered: false }).catch(() => {});
    res.json({ success: true });
  } catch {
    res.json({ success: true }); // never fail the client over telemetry
  }
});

// GET /activity/students?search= — admin: students to pick from.
router.get('/students', authMiddleware, tenantResolver, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q: any = { tenantId: req.tenantId, role: 'STUDENT' };
    const s = String(req.query.search || '').trim();
    if (s) q.$or = [
      { firstName: { $regex: s, $options: 'i' } },
      { lastName: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } },
    ];
    const students = await User.find(q).select('firstName lastName email batchId').sort({ firstName: 1 }).limit(50).lean();
    res.json({ success: true, data: students });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /activity?studentId=&module=&status=&from=&to=&limit= — admin: a student's timeline.
router.get('/', authMiddleware, tenantResolver, adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId, module, status, from, to } = req.query as any;
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const q: any = { tenantId: req.tenantId };
    if (studentId) q.userId = new mongoose.Types.ObjectId(String(studentId));
    if (module) q.module = module;
    if (status === 'errors') q.status = { $gte: 400 };
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(String(from));
      if (to) { const t = new Date(String(to)); t.setHours(23, 59, 59, 999); q.createdAt.$lte = t; }
    }
    const rows = await StudentActivityLog.find(q)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data: rows });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

export default router;
