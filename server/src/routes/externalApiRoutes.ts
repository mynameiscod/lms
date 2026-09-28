import express, { Response } from 'express';
import * as api from '../services/externalApiService';
import { PbError } from '../services/problemBankService';

/**
 * External Problem Bank API — /api/v1/external. Authenticated by API key (X-API-Key), not by a
 * user session. Errors are `{ error: { code, message } }` with a real HTTP status, the shape
 * API consumers expect, rather than the app's internal `{ success, message }`.
 */
const router = express.Router();

const handle = (fn: (req: api.ApiRequest) => Promise<any>) => async (req: api.ApiRequest, res: Response) => {
  try {
    res.json(await fn(req));
  } catch (e: any) {
    const status = e instanceof PbError ? e.status : 500;
    if (status === 500) console.error('[external-api]', e);
    const code = status === 404 ? 'not_found' : status === 429 ? 'quota_exceeded' : status === 403 ? 'forbidden' : status === 400 ? 'invalid_request' : 'server_error';
    res.status(status).json({ error: { code, message: status === 500 ? 'Something went wrong.' : e.message } });
  }
};

router.use(api.authenticateApiKey);

router.get('/usage', handle((req) => api.usage(req.apiClient!)));
router.get('/problems', api.requireScope('problems:read'), handle((req) => api.listProblems(req.apiClient!, req.query as any)));
router.get('/problems/random', api.requireScope('problems:read'), handle((req) => api.randomProblem(req.apiClient!, req.query as any)));
router.get('/problems/:id', api.requireScope('problems:read'), handle((req) => api.getProblem(req.apiClient!, req.params.id)));
router.post('/problems/:id/run', api.requireScope('judge:run'), handle((req) => api.run(req.apiClient!, req.params.id, req.body || {})));
router.post('/problems/:id/submissions', api.requireScope('judge:submit'), handle((req) => api.submit(req.apiClient!, req.params.id, req.body || {})));
router.get('/submissions', api.requireScope('submissions:read'), handle((req) => api.listSubmissions(req.apiClient!, req.query as any)));
router.get('/submissions/:id', api.requireScope('submissions:read'), handle((req) => api.getSubmission(req.apiClient!, req.params.id)));

router.use((_req, res) => res.status(404).json({ error: { code: 'not_found', message: 'Unknown endpoint. See the API reference in Problem Bank → API access.' } }));

export default router;
