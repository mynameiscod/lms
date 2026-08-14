import { aiComplete } from './aiGateway';
import { ICurriculumDay } from '../models/PathwayCurriculum';

/**
 * Drafting curriculum days with AI.
 *
 * The model writes a STARTING POINT, never the published article. Everything it returns
 * lands in the same editor an admin would type into, so a wrong day is corrected in
 * place rather than discovered by a student — which is the only safe way to let a model
 * near a syllabus somebody paid for.
 *
 * It is told the track, the stage and the days already written, so asking for days 31-60
 * continues the course rather than restarting it.
 */

const TYPES = ['learn', 'practice', 'aptitude', 'communication', 'resume', 'mock'];
const CATS = ['career_clarity', 'aptitude', 'logical_reasoning', 'technical', 'communication', 'employability'];

/** Where each type of work actually happens, so a drafted day is clickable. */
const LINK_FOR: Record<string, string> = {
  practice: '/careerpilot/practice?kind=coding',
  aptitude: '/careerpilot/practice?kind=mcq',
  communication: '/careerpilot/interview',
  resume: '/careerpilot/resume',
  mock: '/careerpilot/interview',
  learn: '',
};

export interface DraftRequest {
  tenantId: string;
  trackLabel: string;
  trackKey: string;
  stage?: string | null;
  /** Day number to start at — usually one past whatever is already written. */
  fromDay: number;
  count: number;
  /** Titles already in the curriculum, so the model does not repeat them. */
  existingTitles: string[];
  /** Free-text steer from the admin, e.g. "focus on Spring Boot and REST". */
  brief?: string;
}

export async function draftCurriculumDays(req: DraftRequest): Promise<ICurriculumDay[]> {
  const { trackLabel, stage, fromDay, count, existingTitles, brief } = req;

  const system = [
    'You write day-by-day curricula for an Indian career-readiness product.',
    'Each day has 1 to 3 items. An item is one concrete task a student can finish in 20-40 minutes.',
    'Be SPECIFIC to the track: name the actual language, tool or technique.',
    'Never write filler like "keep practising" or "revise today\'s topic".',
    'Difficulty must build across the days you are given.',
  ].join(' ');

  const user = [
    `Track: ${trackLabel}`,
    stage ? `Stage: ${stage}` : '',
    `Write days ${fromDay} to ${fromDay + count - 1}.`,
    brief ? `The admin asks specifically for: ${brief}` : '',
    existingTitles.length
      ? `Do NOT repeat any of these existing titles:\n${existingTitles.slice(0, 120).join('\n')}`
      : '',
    '',
    'Return JSON only, shaped exactly:',
    '{"days":[{"day":31,"theme":"short heading","items":[',
    '  {"title":"...","detail":"one sentence saying what to do","type":"learn|practice|aptitude|communication|resume|mock","xp":20,"category":"technical"}',
    ']}]}',
  ].filter(Boolean).join('\n');

  const text = await aiComplete({
    tenantId: req.tenantId,
    module: 'curriculum_draft',
    product: 'careerpilot',
    system, user,
    maxTokens: 3000,
  });

  // Same defensive parse as the company drafter: models wrap JSON in prose or fences,
  // and a curriculum that fails to parse must say so rather than silently write nothing.
  const cleaned = text.replace(/```json|```/g, '').trim();
  const a = cleaned.indexOf('{');
  const b = cleaned.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('The draft came back unreadable. Try again.');
  let out: any;
  try { out = JSON.parse(cleaned.slice(a, b + 1)); }
  catch { throw new Error('The draft came back unreadable. Try again.'); }

  const raw = Array.isArray(out?.days) ? out.days : [];

  // Shape and clamp everything the model returns. A draft that lands in the editor with
  // a bad type or a 9,000 XP day is a draft an admin has to clean up by hand.
  return raw.slice(0, count).map((d: any, i: number): ICurriculumDay => ({
    day: fromDay + i,
    theme: String(d?.theme || '').trim().slice(0, 120),
    items: (Array.isArray(d?.items) ? d.items : []).slice(0, 3).map((it: any) => {
      const type = TYPES.includes(String(it?.type)) ? String(it.type) : 'learn';
      return {
        title: String(it?.title || '').trim().slice(0, 160),
        detail: String(it?.detail || '').trim().slice(0, 600),
        type,
        xp: Math.min(200, Math.max(5, Number(it?.xp) || 20)),
        category: CATS.includes(String(it?.category)) ? String(it.category) : 'technical',
        link: LINK_FOR[type] || '',
      };
    }).filter((it: any) => it.title),
  })).filter((d: ICurriculumDay) => d.items.length);
}
