import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import * as settings from './settingsService';
import { IResumeSections, IResumeScore } from '../models/Resume';

/**
 * Resume ATS scoring + AI auto-improve.
 *
 * Scoring is intentionally STRICT and honest (a weak resume should score low,
 * matching what a real ATS / ChatGPT would say) — the old prompt anchored the
 * model with an example "total": 72, so every resume came back ~72. The number
 * is now computed from the breakdown so it can't be faked, and Claude is used
 * when available for better judgement.
 */

const stripJson = (s: string) => s.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
const clamp = (n: any, max: number) => Math.max(0, Math.min(Number(n) || 0, max));

/** Call the best available model (Claude preferred, OpenAI fallback) → raw text. */
async function aiComplete(prompt: string, maxTokens = 1800): Promise<string> {
  if (isAnthropicEnabled()) {
    const anth = getAnthropic();
    if (anth) {
      const model = settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6');
      const r: any = await anth.messages.create({ model, max_tokens: maxTokens, temperature: 0.3, messages: [{ role: 'user', content: prompt }] });
      const block = (r.content || []).find((b: any) => b.type === 'text');
      return block?.text || '';
    }
  }
  const openai = getOpenAI();
  if (!openai) throw new Error('No AI provider configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY).');
  const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
  const resp = await openai.chat.completions.create({ model, temperature: 0.3, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
  return resp.choices[0]?.message?.content || '';
}

export async function scoreResume(sections: IResumeSections): Promise<IResumeScore> {
  const prompt = `You are a STRICT, real-world ATS (Applicant Tracking System) and senior technical recruiter. Score this resume HONESTLY and harshly, exactly as a real ATS + recruiter would for a software role. Most junior/student resumes genuinely score 35-60. Do NOT be generous and do NOT default to a middle score.

Score each section against these criteria (partial credit; be critical):
- contact (max 10): name, professional email, phone; LinkedIn + GitHub links present.
- summary (max 15): a sharp 2-3 line summary naming the target role + key skills. Generic, filler, or repeated text scores near 0.
- experience (max 20): strong action verbs AND quantified impact (%, numbers, scale). Vague duties with no metrics score low.
- education (max 15): degree, institution, year, CGPA/%.
- skills (max 20): relevant, grouped, enough breadth + depth; role-relevant keywords.
- projects (max 10): real projects with tech stack AND outcomes/impact; links a plus.
- ats (max 10): single-column, parseable, standard headings, role keywords, no fluff.

Penalise missing quantification, filler/duplicate text, missing keywords and thin content. A weak resume should total 30-55, an average one 55-75, and only a genuinely excellent, metric-rich, keyword-optimised resume should exceed 85.

Return ONLY valid JSON (no markdown, no commentary) in exactly this shape — compute EVERY number yourself from THIS resume; never copy an example:
{"breakdown": {"contact": <0-10>, "summary": <0-15>, "experience": <0-20>, "education": <0-15>, "skills": <0-20>, "projects": <0-10>, "ats": <0-10>}, "suggestions": [{"section": "<section>", "issue": "<specific problem>", "fix": "<specific, actionable fix>"}], "atsWarnings": ["<warning>"], "keywordsFound": ["<kw>"], "keywordsMissing": ["<kw>"]}

Give max 6 of the most impactful, specific suggestions; flag only real issues.

Resume data (JSON):
${JSON.stringify(sections, null, 2).slice(0, 5000)}`;

  let parsed: any;
  try { parsed = JSON.parse(stripJson(await aiComplete(prompt))); }
  catch { return getZeroScore(); }

  const b = parsed.breakdown || {};
  const breakdown = {
    contact: clamp(b.contact, 10), summary: clamp(b.summary, 15), experience: clamp(b.experience, 20),
    education: clamp(b.education, 15), skills: clamp(b.skills, 20), projects: clamp(b.projects, 10), ats: clamp(b.ats, 10),
  };
  // The total is the sum of the (clamped) breakdown — it can't be inflated or anchored.
  const total = Math.min(100, Object.values(breakdown).reduce((a, n) => a + n, 0));
  return {
    total,
    breakdown,
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 6) : [],
    atsWarnings: Array.isArray(parsed.atsWarnings) ? parsed.atsWarnings : [],
    keywordsFound: Array.isArray(parsed.keywordsFound) ? parsed.keywordsFound : [],
    keywordsMissing: Array.isArray(parsed.keywordsMissing) ? parsed.keywordsMissing : [],
  };
}

/**
 * AI-rewrite the weak parts of a resume to be ATS-optimised (summary, experience
 * bullets, project descriptions, skills grouping). Facts/structure preserved —
 * contact, education, certifications, company/role/project names, dates and tech
 * lists are untouched. Returns the improved sections (same shape).
 */
export async function improveResume(sectionsInput: IResumeSections): Promise<IResumeSections> {
  // sectionsInput may be a Mongoose subdocument — spreading that copies internal props,
  // not the real fields (which dropped e.g. certifications and crashed the client).
  // Round-trip to a plain object first so { ...sections } keeps every field.
  const sections: any = JSON.parse(JSON.stringify(sectionsInput || {}));
  const prompt = `You are an expert resume writer optimising a software-role resume for ATS and recruiters. Rewrite ONLY the wording to be sharp, keyword-rich and impact/metric-driven — WITHOUT inventing false facts (no fake companies, degrees or projects). Keep everything truthful to the person's real experience.

Rewrite:
- summary: a crisp 2-3 line professional summary for their target role + key skills.
- experience[].bullets: strong action-verb, impact/metric bullets (same jobs; 2-4 bullets per role).
- projects[].description: 1-2 impactful lines each (what it does + outcome/impact).
- skills: keep the person's real skills, grouped well; you may add clearly-implied relevant keywords.

Do NOT change: contact, education, certifications, company/role names, project names, tech lists, or dates.

Return ONLY valid JSON with the SAME structure as the input (include all fields), containing the improved content. No markdown.

Current resume (JSON):
${JSON.stringify(sections, null, 2).slice(0, 6000)}`;

  let parsed: any;
  try { parsed = JSON.parse(stripJson(await aiComplete(prompt, 3000))); }
  catch { return sections; }

  const skillsOk = Array.isArray(parsed.skills) && parsed.skills.every((g: any) => g && typeof g.category === 'string' && Array.isArray(g.items));
  return {
    ...sections,
    summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary : sections.summary,
    experience: mergeExperience(sections.experience, parsed.experience),
    projects: mergeProjects(sections.projects, parsed.projects),
    skills: skillsOk && parsed.skills.length ? parsed.skills : sections.skills,
  };
}

function mergeExperience(orig: any[], improved: any): any[] {
  if (!Array.isArray(improved)) return orig || [];
  return (orig || []).map((e, i) => {
    const im = improved[i];
    return im && Array.isArray(im.bullets) && im.bullets.filter(Boolean).length ? { ...e, bullets: im.bullets.filter(Boolean) } : e;
  });
}
function mergeProjects(orig: any[], improved: any): any[] {
  if (!Array.isArray(improved)) return orig || [];
  return (orig || []).map((p, i) => {
    const im = improved[i];
    return im && typeof im.description === 'string' && im.description.trim() ? { ...p, description: im.description } : p;
  });
}

function getZeroScore(): IResumeScore {
  return {
    total: 0,
    breakdown: { contact: 0, summary: 0, experience: 0, education: 0, skills: 0, projects: 0, ats: 0 },
    suggestions: [],
    atsWarnings: [],
    keywordsFound: [],
    keywordsMissing: [],
  };
}
