import express from 'express';
import jwt from 'jsonwebtoken';
import { rateLimit } from '../middleware/rateLimit';
import { jwtSecret } from '../config/secrets';
import { ingestClientErrors } from '../services/supportErrorsService';

/**
 * Browser error reports (/api/v1/monitor). No login required — a page can break before or after
 * sign-in — but when a valid token comes with the report its institute is noted, and nothing
 * else about the person is kept. Rate-limited per person or address.
 */
const router = express.Router();

router.post('/client-errors', rateLimit('clientErrors'), (req, res) => {
  let tenantId: string | undefined;
  const h = String(req.headers.authorization || '');
  if (h.startsWith('Bearer ')) {
    try { const d: any = jwt.verify(h.slice(7), jwtSecret()); if (d?.tenantId) tenantId = String(d.tenantId); } catch { /* an anonymous report is fine */ }
  }
  const r = ingestClientErrors(req.body, { tenantId });
  res.status(202).json({ success: true, message: 'OK', data: r });
});

export default router;
