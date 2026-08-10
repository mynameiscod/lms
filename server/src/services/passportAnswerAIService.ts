// Coaching + extraction for the answers members write on missions that have no other
// surface ("define your target role", "name the gap you're closing").
//
// ONE call does both jobs deliberately. The feedback is what the member feels; the
// extracted fields are what makes a million answers reviewable — prose cannot be queried,
// counted, or turned into "4,200 members want system design and we have four missions on
// it". Splitting them into two calls would double the cost and the latency for output the
// model has already worked out.

import { aiComplete } from './aiGateway';

/** Structured read of one answer. Every field may be absent — members write freely. */
export interface AnswerExtract {
  /** The role they named, normalised ("backend developer", not "i wanna do backend"). */
  targetRole?: string | null;
  /** Skills or tools they named as things they have or are learning. */
  skills?: string[];
  /** Gaps they named, or that their answer plainly implies. */
  gaps?: string[];
  /** 1 = vague, 2 = partly specific, 3 = concrete and actionable. */
  specificity?: number;
  /** Anything a human should look at. `none` for the overwhelming majority. */
  flag?: 'none' | 'too_vague' | 'off_topic' | 'needs_human';
}

export interface AnswerAIResult {
  feedback: string;
  extract: AnswerExtract;
}

const SYSTEM = `You are a career coach reading one short answer a student wrote for a daily task.

Return ONLY a JSON object, no prose around it, with exactly these keys:
{
  "feedback": "2-3 sentences, addressed to the student as 'you'",
  "targetRole": "normalised job title they named, or null",
  "skills": ["skills or tools they named"],
  "gaps": ["gaps they named or clearly implied"],
  "specificity": 1,
  "flag": "none"
}

feedback rules:
- Say what is good FIRST and specifically — name the thing they got right.
- Then ONE concrete improvement. Not three. The next thing they should do.
- If the answer is vague, ask the single question that would sharpen it most.
- Never invent detail they did not write. If they named no skills, do not praise their skills.
- Plain, warm, direct. No headings, no bullet points, no emoji.

specificity: 1 = vague ("i want a good job"), 2 = partly specific ("backend developer"),
3 = concrete and actionable ("backend developer at a product company, Node and Postgres").

flag: "none" normally. "too_vague" when there is almost nothing to work with.
"off_topic" when the answer does not address the task. "needs_human" ONLY for distress,
abuse, or something a person genuinely needs to see.`;

/** Pull the JSON object out of a model response that may be fenced or padded with prose. */
function parseJson(raw: string): any | null {
  const cleaned = raw.replace(/```json\s*|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

const asStrings = (v: any, max: number): string[] =>
  (Array.isArray(v) ? v : [])
    .map(x => String(x || '').trim())
    .filter(Boolean)
    .slice(0, max);

/**
 * Coach one answer and read it into fields.
 *
 * Returns null rather than throwing when AI is unavailable or the response cannot be
 * parsed. The mission is already complete by the time this runs — a provider outage must
 * cost the member their feedback, never their progress or their XP.
 */
export async function reviewAnswer(opts: {
  tenantId: string;
  missionTitle: string;
  missionDetail: string;
  answer: string;
}): Promise<AnswerAIResult | null> {
  try {
    const raw = await aiComplete({
      tenantId: opts.tenantId,
      module: 'careerpilot_mission_answer',
      product: 'careerpilot',
      system: SYSTEM,
      user: `Task: ${opts.missionTitle}\nWhat it asked for: ${opts.missionDetail}\n\nTheir answer:\n${opts.answer}`,
      maxTokens: 500,
    });

    const j = parseJson(raw);
    if (!j || typeof j.feedback !== 'string' || !j.feedback.trim()) return null;

    const spec = Number(j.specificity);
    const flag = ['none', 'too_vague', 'off_topic', 'needs_human'].includes(j.flag) ? j.flag : 'none';

    return {
      feedback: String(j.feedback).trim().slice(0, 1200),
      extract: {
        // Caps on every field: this is model output going into a document that is read
        // back on the dashboard and aggregated by the admin screens.
        targetRole: j.targetRole ? String(j.targetRole).trim().slice(0, 120) : null,
        skills: asStrings(j.skills, 12).map(x => x.slice(0, 60)),
        gaps: asStrings(j.gaps, 12).map(x => x.slice(0, 60)),
        specificity: Number.isFinite(spec) ? Math.min(3, Math.max(1, Math.round(spec))) : undefined,
        flag,
      },
    };
  } catch (e: any) {
    console.error('[careerpilot] answer review failed:', e?.message || e);
    return null;
  }
}
