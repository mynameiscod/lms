import { Request, Response } from 'express';
import {
  buildFunnel, funnelCounts, STAGES, StageKey, MAX_FUNNEL_ROWS,
} from '../services/passportFunnelService';

/**
 * The drop-off funnel: who stopped where, and who to contact.
 *
 * This endpoint hands out member phone numbers and email addresses in bulk, which is a
 * different thing from looking one person up during a support call — hence its own
 * permission (`view_passport_funnel`) rather than riding on member viewing.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');

/** GET /passport/funnel — the whole board: stage definitions, counts and totals. */
export const getFunnel = async (req: Request, res: Response) => {
  try {
    // Counts and totals only. The board shows no names, so it loads none.
    const { counts, totals } = await funnelCounts(tenantOf(req));
    res.json({
      stages: STAGES.map(s => ({ ...s, count: counts[s.key] })),
      totals,
      // Said plainly rather than implied by a zero: a half-finished assessment leaves no
      // server-side record, so that cohort is not missing — it is unmeasurable today.
      notes: [
        'A member appears in exactly one stage — the furthest point they reached.',
        'Members who joined before drop-off tracking shipped have no verification stamp; they are placed by what they did, not when they verified.',
        'Assessments that were started but never submitted are not recorded anywhere, so there is no bucket for them.',
      ],
    });
  } catch (e: any) {
    console.error('[funnel] getFunnel:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not build the funnel' });
  }
};

/**
 * GET /passport/funnel/:stage — the people in one stage, coldest first.
 *
 * Coldest first is deliberate. Sorted newest-first, a caller works the same fresh names
 * every morning and the people who have been stuck for a month are never called at all.
 */
export const getStageMembers = async (req: Request, res: Response) => {
  try {
    const stage = String(req.params.stage) as StageKey;
    if (!STAGES.some(s => s.key === stage)) {
      return res.status(400).json({ message: `Unknown stage "${stage}".` });
    }

    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    // Filtered, sorted coldest-first and paged in the database — the whole tenant no
    // longer travels into Node so that one page of it can be shown.
    const { rows, counts } = await buildFunnel(tenantOf(req), { stage, limit, skip });

    res.json({
      stage: STAGES.find(s => s.key === stage),
      total: counts[stage],
      returned: rows.length,
      skip,
      members: rows,
    });
  } catch (e: any) {
    console.error('[funnel] getStageMembers:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not load this stage' });
  }
};

/**
 * GET /passport/funnel/:stage/export — the same list as CSV, for a calling sheet.
 *
 * Every export is logged with who took it. A file of member phone numbers leaving the
 * system should never be anonymous.
 */
export const exportStage = async (req: Request, res: Response) => {
  try {
    const stage = String(req.params.stage) as StageKey;
    const def = STAGES.find(s => s.key === stage);
    if (!def) return res.status(400).json({ message: `Unknown stage "${stage}".` });

    // Bounded like every other read now. A calling sheet is worked by a person, so
    // MAX_FUNNEL_ROWS is far more names than anyone gets through — and it is a ceiling on
    // how many contact details one request can hand out.
    const { rows: members } = await buildFunnel(tenantOf(req), { stage, limit: MAX_FUNNEL_ROWS });

    console.log(`[funnel] export "${stage}" — ${members.length} contacts by ${(req as any).user?.email || 'unknown'}`);

    const esc = (v: any) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const head = ['Name', 'Mobile', 'Email', 'Stage', 'Days stuck', 'Career score', 'Pathway', 'Joined'];
    const body = members.map(m => [
      m.name, m.phone, m.email, def.label, m.stuckDays,
      m.careerScore ?? '', m.pathway ?? '',
      new Date(m.joinedAt).toISOString().slice(0, 10),
    ].map(esc).join(','));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="careerpilot-${stage}.csv"`);
    res.send([head.join(','), ...body].join('\n'));
  } catch (e: any) {
    console.error('[funnel] exportStage:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not export' });
  }
};
