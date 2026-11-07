import { Request, Response } from 'express';
import * as svc from '../services/thinkingDailyService';

/**
 * The CareerPilot Thinking Lab for members (services/thinkingDailyService.ts): today's set, answering,
 * hints, running code, practice and history. Mounted under /thinking-lab/member behind the lab's
 * membership gate; the LMS Thinking Lab keeps its own routes.
 */

const tId = (req: Request) => String((req as any).tenantId || (req as any).user?.tenantId || '');
const uId = (req: Request) => String((req as any).user?.id || '');

const handle = (fn: (req: Request) => Promise<any>, what: string) => async (req: Request, res: Response) => {
  try { res.json(await fn(req)); }
  catch (e: any) {
    if (e instanceof svc.LabError) return res.status(e.status).json({ message: e.message, ...(e.code ? { reason: e.code } : {}) });
    console.error(`[thinking-member] ${what}:`, e?.message || e);
    res.status(500).json({ message: `Could not ${what}.` });
  }
};

/** GET /thinking-lab/member/today — the set, the header figures and the streak calendar. */
export const today = handle(async (req) => {
  const [set, summary, calendar] = await Promise.all([
    svc.todayView(tId(req), uId(req)),
    svc.memberSummary(tId(req), uId(req)),
    svc.streakCalendar(tId(req), uId(req)),
  ]);
  return { ...set, summary, calendar };
}, 'load today’s questions');

export const answer = handle((req) => svc.submitAnswer(tId(req), uId(req), req.params.id, req.body), 'check your answer');
export const hint = handle((req) => svc.revealHint(tId(req), uId(req), req.params.id), 'show a hint');
export const run = handle((req) => svc.runCode(tId(req), uId(req), req.params.id, req.body), 'run your code');
export const practice = handle((req) => svc.practiceMore(tId(req), uId(req), req.body?.type), 'add a practice question');
export const history = handle(async (req) => ({ items: await svc.history(tId(req), uId(req), Math.max(1, Number(req.query.page) || 1)) }), 'load your history');
