import express, { Request, Response } from 'express';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /api/v1/admin/logs?type=errors|all&lines=200
 * Returns the last N lines from the server log file, newest first.
 * Requires authentication (any logged-in user — restrict to admins in the future if needed).
 */
router.get('/', authMiddleware, (req: Request, res: Response) => {
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
