import { Request, Response } from 'express';
import * as svc from '../services/problemBankService';
import * as importer from '../services/problemImportService';
import { generateProblems } from '../services/problemAiService';
import { migrationSummary, runMigration } from '../services/problemMigrationService';
import { runCustom } from '../services/problemJudgeService';
import { PB_DIFFICULTIES, PB_DEFAULT_MARKS, PB_LANGUAGES, PB_TOPICS } from '../config/problemBankTaxonomy';

const actor = (req: Request): svc.Actor => ({
  userId: String((req as any).user?.id || ''),
  tenantId: String((req as any).tenantId || ''),
  role: String((req as any).user?.role || ''),
});

/** Validation and permission problems carry their own message and status; nothing else leaks. */
const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { await fn(req, res); } catch (e: any) {
    const status = e instanceof svc.PbError ? e.status : 500;
    if (status === 500) console.error('[problem-bank]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong', ...(e?.details ? { details: e.details } : {}) });
  }
};

export const meta = wrap(async (req, res) => {
  res.json({ success: true, data: {
    languages: PB_LANGUAGES, topics: PB_TOPICS, difficulties: PB_DIFFICULTIES, defaultMarks: PB_DEFAULT_MARKS,
    canEditGlobal: svc.isSuperAdmin(actor(req)),
    stats: await svc.bankStats(actor(req)),
  } });
});

export const list = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.listProblems(actor(req), req.query as any) });
});

export const get = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.getProblem(actor(req), req.params.id) });
});

export const create = wrap(async (req, res) => {
  const r = await svc.createProblem(actor(req), req.body || {});
  res.status(201).json({ success: true, data: { id: r.problem._id, warnings: r.warnings, publishErrors: r.publishErrors } });
});

export const update = wrap(async (req, res) => {
  const r = await svc.updateProblem(actor(req), req.params.id, req.body || {});
  res.json({ success: true, data: { id: r.problem._id, version: r.problem.version, verification: r.problem.verification, warnings: r.warnings, publishErrors: r.publishErrors } });
});

export const validate = wrap(async (req, res) => {
  const n = svc.normalizeInput(req.body || {});
  res.json({ success: true, data: { errors: n.errors, warnings: n.warnings, publishErrors: n.publishErrors } });
});

export const setStatus = wrap(async (req, res) => {
  const p = await svc.setStatus(actor(req), req.params.id, req.body?.status);
  res.json({ success: true, data: { status: p.status } });
});

export const remove = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.deleteProblem(actor(req), req.params.id) });
});

export const duplicate = wrap(async (req, res) => {
  const r = await svc.duplicateProblem(actor(req), req.params.id, req.body?.scope === 'global' ? 'global' : 'tenant');
  res.status(201).json({ success: true, data: { id: r.problem._id } });
});

export const promote = wrap(async (req, res) => {
  const p = await svc.promoteToGlobal(actor(req), req.params.id);
  res.json({ success: true, data: { id: p._id, number: p.number } });
});

export const run = wrap(async (req, res) => {
  const b = req.body || {};
  if (b.mode === 'custom') {
    const n = svc.normalizeInput(b.draft || { title: 'x' });
    res.json({ success: true, data: await runCustom(n.clean as any, b.language, b.code, String(b.stdin || '')) });
    return;
  }
  res.json({ success: true, data: await svc.runForAuthor(actor(req), b) });
});

export const fillOutputs = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.fillOutputsFromSolution(req.body || {}) });
});

export const verify = wrap(async (req, res) => {
  res.status(202).json({ success: true, data: await svc.queueVerification(actor(req), req.params.id) });
});

export const verification = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.getVerification(actor(req), req.params.id) });
});

export const importPreview = wrap(async (req, res) => {
  const { filename, data, text } = req.body || {};
  const items = importer.parseImport(filename || '', data, text);
  res.json({ success: true, data: { rows: importer.previewImport(items).map((r) => ({ ...r, problem: undefined })), items } });
});

export const importCommit = wrap(async (req, res) => {
  const { items, scope, verify } = req.body || {};
  if (!Array.isArray(items) || !items.length) throw new svc.PbError('Nothing to import.');
  res.json({ success: true, data: await importer.commitImport(actor(req), items, { scope, verify }) });
});

export const importTemplate = wrap(async (req, res) => {
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="problem-bank-template.csv"');
    res.send(importer.csvTemplate());
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="problem-bank-template.json"');
  res.send(JSON.stringify([importer.SAMPLE_PROBLEM], null, 2));
});

/**
 * AI generation runs as a job: writing a problem and judging its solutions in several
 * languages takes minutes, far past what a proxied HTTP request survives. The client polls.
 * Jobs live in memory for an hour — only one server slot is live at a time.
 */
const aiJobs = new Map<string, { owner: string; status: 'running' | 'done' | 'failed'; drafts?: any[]; error?: string; startedAt: number }>();

export const aiGenerate = wrap(async (req, res) => {
  const b = req.body || {};
  const a = actor(req);
  for (const [k, j] of aiJobs) if (Date.now() - j.startedAt > 3_600_000) aiJobs.delete(k);
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  aiJobs.set(id, { owner: a.userId, status: 'running', startedAt: Date.now() });
  generateProblems({
    topic: String(b.topic || 'array'), difficulty: ['easy', 'medium', 'hard'].includes(b.difficulty) ? b.difficulty : 'medium',
    languages: Array.isArray(b.languages) ? b.languages : ['python', 'java'], count: Number(b.count) || 1,
    instructions: String(b.instructions || '').slice(0, 2000),
  }, a.tenantId)
    .then((drafts) => aiJobs.set(id, { ...aiJobs.get(id)!, status: 'done', drafts }))
    .catch((e) => aiJobs.set(id, { ...aiJobs.get(id)!, status: 'failed', error: e?.message || 'Generation failed' }));
  res.status(202).json({ success: true, data: { jobId: id } });
});

export const aiJob = wrap(async (req, res) => {
  const j = aiJobs.get(req.params.jobId);
  if (!j || j.owner !== actor(req).userId) throw new svc.PbError('That generation job has expired.', 404);
  res.json({ success: true, data: { status: j.status, drafts: j.drafts, error: j.error, elapsedSec: Math.round((Date.now() - j.startedAt) / 1000) } });
});

export const migrationInfo = wrap(async (req, res) => {
  res.json({ success: true, data: await migrationSummary(actor(req).tenantId) });
});

export const migrate = wrap(async (req, res) => {
  res.json({ success: true, data: await runMigration(actor(req), Array.isArray(req.body?.sources) ? req.body.sources : []) });
});
