import express, { Request, Response, NextFunction } from 'express';
import * as judge from '../services/codeJudgeService';

/**
 * CodeBegun Judge for Interview Pilot — mounted at /api/v1/judge, so Interview Pilot's
 * "Judge URL" is https://<platform>/api/v1/judge and it calls /v1/languages, /v1/submissions.
 *
 * No user session: every request must carry Interview Pilot's HMAC signature, and without a
 * configured JUDGE_SIGNING_SECRET every request is refused (503). The signed path is the full
 * request path as Interview Pilot sends it (base path + route + query), i.e. originalUrl.
 */
const router = express.Router();

const signed = (req: Request, res: Response, next: NextFunction) => {
  const raw: Buffer | undefined = (req as any).rawBody;
  const v = judge.verifyRequest({
    method: req.method,
    path: req.originalUrl,
    body: raw ? raw.toString('utf8') : '',
    timestamp: req.header('x-cb-timestamp') || undefined,
    signature: req.header('x-cb-signature') || undefined,
  });
  if (v.ok === false) {
    const { status, reason } = v as { status: number; reason: string };
    console.warn(`[judge] ${req.method} ${req.originalUrl} refused: ${reason}`);
    return res.status(status).json({ error: reason });
  }
  next();
};

const wrap = (fn: (req: Request) => Promise<any> | any) => async (req: Request, res: Response) => {
  try {
    res.json(await fn(req));
  } catch (e: any) {
    const status = e instanceof judge.JudgeError ? e.status : 502;
    if (status >= 500) console.error('[judge]', e?.message);
    res.status(status).json({ error: e?.message || 'judge error' });
  }
};

router.use(signed);
router.get('/v1/languages', wrap(async () => ({ languages: await judge.listLanguages() })));
router.post('/v1/submissions', wrap((req) => judge.submit(req.body)));
router.get('/v1/submissions/:token', wrap((req) => judge.status(req.params.token)));

export default router;
