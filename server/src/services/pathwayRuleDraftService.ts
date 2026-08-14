import { aiComplete } from './aiGateway';
import { IPathwayMatch } from '../models/PassportContent';

/**
 * Turning "final-year non-CS students who want data roles but have weak SQL" into a rule.
 *
 * The model translates; it does not decide. What it returns lands in the rules editor for
 * an admin to read and correct, and the preview then shows exactly who it would catch
 * before anything is saved. Runtime assignment stays deterministic — a model choosing
 * each member's pathway live would be un-auditable, cost money per member, and break the
 * guarantee that the roadmap preview and the daily view agree.
 *
 * Everything coming back is clamped against the tenant's OWN vocabulary. A model that
 * invents a goal string students are never offered, or a category that does not exist,
 * writes a rule that silently matches nobody — the single most confusing outcome here,
 * because it looks exactly like a rule that works.
 */

export interface RuleDraftRequest {
  tenantId: string;
  pathwayLabel: string;
  audience: string;
  /** The tenant's real vocabulary — anything outside these lists is dropped. */
  goals: string[];
  stages: string[];
  categories: string[];
}

export async function draftPathwayRule(req: RuleDraftRequest): Promise<IPathwayMatch> {
  const { pathwayLabel, audience, goals, stages, categories } = req;

  const system = [
    'You translate a plain-English description of an audience into a routing rule.',
    'You may ONLY use the exact values offered to you. Never invent a goal, stage or category.',
    'Omit a field entirely rather than guessing at it — an empty field means "no constraint",',
    'which is safer than a wrong one.',
    'Score ranges are 0-100. Use them only when the description actually mentions ability.',
  ].join(' ');

  const user = [
    `Pathway: ${pathwayLabel}`,
    `Who it is for: ${audience}`,
    '',
    `Allowed goals: ${goals.length ? goals.join(' | ') : '(none configured)'}`,
    `Allowed stages: ${stages.join(' | ')}`,
    'Allowed backgrounds: cs | non_cs',
    `Allowed score categories: overall | ${categories.join(' | ')}`,
    '',
    'Return JSON only, shaped exactly:',
    '{"goals":[],"stages":[],"backgrounds":[],"scores":[{"category":"technical","min":0,"max":40}],"priority":10}',
    '',
    'priority 1-100: higher wins when two rules both match. A narrow, specific rule should',
    'outrank a broad one.',
  ].filter(Boolean).join('\n');

  const text = await aiComplete({
    tenantId: req.tenantId,
    module: 'pathway_rule_draft',
    product: 'careerpilot',
    system, user,
    maxTokens: 800,
  });

  // Same defensive parse as the other drafters: models wrap JSON in prose or fences, and
  // a rule that fails to parse must say so rather than quietly produce a match-nobody rule.
  const cleaned = text.replace(/```json|```/g, '').trim();
  const a = cleaned.indexOf('{');
  const b = cleaned.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('The draft came back unreadable. Try rewording it.');
  let out: any;
  try { out = JSON.parse(cleaned.slice(a, b + 1)); }
  catch { throw new Error('The draft came back unreadable. Try rewording it.'); }

  // Clamp to the tenant's vocabulary, case-insensitively — the model tends to title-case
  // goals it was given in lower case, and a case mismatch is a rule that matches nobody.
  const pick = (raw: any, allowed: string[]): string[] => {
    const byLower = new Map(allowed.map(v => [v.toLowerCase(), v]));
    return [...new Set((Array.isArray(raw) ? raw : [])
      .map((x: any) => byLower.get(String(x).trim().toLowerCase()))
      .filter(Boolean) as string[])];
  };

  const clampScore = (n: any): number | null => {
    if (n === null || n === undefined || n === '') return null;
    const v = Number(n);
    return Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : null;
  };

  const allowedCats = ['overall', ...categories];
  const scores = (Array.isArray(out?.scores) ? out.scores : [])
    .map((s: any) => ({
      category: allowedCats.find(c => c.toLowerCase() === String(s?.category).trim().toLowerCase()) || '',
      min: clampScore(s?.min),
      max: clampScore(s?.max),
    }))
    .filter((s: any) => s.category && (s.min !== null || s.max !== null))
    // A reversed band satisfies nothing. Dropping it beats saving a rule that can never
    // match, which an admin would have no reason to suspect.
    .filter((s: any) => !(typeof s.min === 'number' && typeof s.max === 'number' && s.min > s.max));

  return {
    enabled: true,
    priority: Math.min(100, Math.max(1, Number(out?.priority) || 10)),
    goals: pick(out?.goals, goals),
    stages: pick(out?.stages, stages),
    backgrounds: pick(out?.backgrounds, ['cs', 'non_cs']),
    scores,
    // Never drafted. Which pathway catches everyone else is a deliberate choice about the
    // product, not something to infer from one audience description.
    fallback: false,
  };
}
