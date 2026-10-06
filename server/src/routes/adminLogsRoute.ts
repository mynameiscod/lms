import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { allowedByRoleOrPermission } from '../middleware/roleGuard';
import { logger } from '../utils/logger';

const router = express.Router();

// Server logs can expose other users' data — admins/instructors/staff only.
const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  // Custom roles need "API Logs & Student Activity" ticked; others keep the role rule.
  const ok = await allowedByRoleOrPermission((req as any).user, ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'],
    ['view_activity_logs', 'manage_tenant', 'manage_tenant_settings', 'view_reports']);
  if (ok) return next();
  return res.status(403).json({ error: 'Admins only' });
};

/**
 * GET /api/v1/admin/logs?type=errors|all&lines=200
 * Returns the last N lines from the server log file, newest first. Admins only.
 */
router.get('/', authMiddleware, adminOnly, (req: Request, res: Response) => {
  const lines  = Math.min(parseInt(req.query.lines as string) || 200, 1000);
  const useAll = req.query.type === 'all';
  const file   = useAll ? logger.allLogFile : logger.errorLogFile;

  try {
    if (!fs.existsSync(file)) {
      return res.json({ lines: [], total: 0, file });
    }

    const content  = fs.readFileSync(file, 'utf-8');
    const allLines = content.split('\n').filter(l => l.trim());
    const tail     = allLines.slice(-lines).reverse();      // newest first

    res.json({ lines: tail, total: allLines.length, file });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
