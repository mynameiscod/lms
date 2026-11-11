import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import * as settings from './settingsService';
import { IResumeSections, IResumeScore } from '../models/Resume';
import { scoreByRubric, stripHtml, descriptionBullets } from './resumeRubric';

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
async function aiComplete(prompt: string, maxTokens = 1800, temperature = 0.3): Promise<string> {
  // Anthropic first, OpenAI as a fallback — and the fallback must cover a client that
  // EXISTS but whose call fails. The old check only fell through when the client was
  // absent, so an expired key or an exhausted credit balance took the whole feature down
  // while a working OpenAI key sat unused beside it.
  let anthropicError: Error | null = null;
  if (isAnthropicEnabled()) {
    const anth = getAnthropic();
    if (anth) {
      try {
        const model = settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6');
        const r: any = await anth.messages.create({ model, max_tokens: maxTokens, temperature, messages: [{ role: 'user', content: prompt }] });
        const block = (r.content || []).find((b: any) => b.type === 'text');
        if (block?.text) return block.text;
        anthropicError = new Error('Anthropic returned no text');
      } catch (e: any) {
        anthropicError = e;
        console.error('[resume] Anthropic failed, trying OpenAI:', e?.status || '', String(e?.message || e).slice(0, 200));
      }
    }
  }

  const openai = getOpenAI();
  if (!openai) {
    throw anthropicError
      || new Error('No AI provider configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY).');
  }
  const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
  const resp = await openai.chat.completions.create({ model, temperature, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
  return resp.choices[0]?.message?.content || '';
}

/**
 * The ATS score: computed by the rubric (resumeRubric.ts), so the same resume always gets the same number and every
 * point is a check the member can see. When an AI model is available it adds up to three wording suggestions on
 * top — specific to this resume — but it never changes the score, and the score does not need it.
 */
export async function scoreResume(sections: IResumeSections, opts: { targetRole?: string } = {}): Promise<IResumeScore> {
  const plain: any = JSON.parse(JSON.stringify(sections || {}));
  const r = scoreByRubric(plain, opts);
  const suggestions = [...r.suggestions];
  try {
    const ai = await aiWordingTips(plain);
    for (const t of ai) if (suggestions.length < 10) suggestions.push(t);
  } catch { /* the rubric's fix list stands on its own */ }
  return {
    total: r.total,
    breakdown: r.breakdown as any,
    maxes: r.maxes as any,
    fresher: r.fresher,
    checks: r.checks.map(c => ({ section: c.section, label: c.label, got: c.got, max: Math.round(c.max * 10) / 10 })),
    suggestions,
    atsWarnings: r.atsWarnings,
    keywordsFound: r.keywordsFound,
    keywordsMissing: r.keywordsMissing,
  } as any;
}

/** Up to three concrete rewording tips from the model, about lines that are actually in the resume. Best effort. */
async function aiWordingTips(sections: any): Promise<{ section: string; issue: string; fix: string }[]> {
  const lines: string[] = [
    ...(sections.experience || []).flatMap((e: any) => (e.bullets || []).map((b: string) => stripHtml(b))),
    ...(sections.projects || []).flatMap((p: any) => descriptionBullets(p.description || '')),
  ].filter(Boolean).slice(0, 30);
  if (!lines.length) return [];
  const prompt = `You are a resume coach for Indian engineering freshers. Below are lines from ONE resume. Pick the (at most) 3 weakest lines and show how to reword each one more strongly.
Rules: keep every fact true — do NOT add numbers, tools, employers or results that are not already in the line; you may reorder, tighten, and start with a strong verb. If a number would help, say "add the real number (e.g. how many users)" instead of inventing one.
Return ONLY JSON: {"tips":[{"line":"<the original line, copied exactly>","better":"<the reworded line>","why":"<one short reason>"}]}

Lines:
${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}`;
  const raw = await aiComplete(prompt, 900, 0);
  const parsed = JSON.parse(stripJson(raw));
  const known = new Set(lines.map(l => l.toLowerCase().trim()));
  return (Array.isArray(parsed?.tips) ? parsed.tips : [])
    .filter((t: any) => t && typeof t.line === 'string' && typeof t.better === 'string' && known.has(t.line.toLowerCase().trim()))
    // A tip that slips in a number the line did not have is dropped: invented metrics are never suggested.
    .filter((t: any) => { const nums = (x: string) => (String(x).match(/\d+(?:[.,]\d+)*/g) || []).map(n => n.replace(/,/g, '')); const have = new Set(nums(t.line)); return nums(t.better).every(n => have.has(n)); })
    .slice(0, 3)
    .map((t: any) => ({ section: 'wording', issue: `Reword: "${String(t.line).slice(0, 120)}${String(t.line).length > 120 ? '…' : ''}"`, fix: `Try: "${String(t.better).slice(0, 220)}"${t.why ? ` — ${String(t.why).slice(0, 120)}` : ''}` }));
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
  const prompt = `You are an expert resume writer improving a fresher's software resume for ATS and recruiters.

STRICT TRUTH RULES (the member's facts must not change):
- Do NOT invent numbers, percentages, users, scale, employers, tools, technologies, results or awards. Keep every number that is already there exactly as written. If a line has no number, rewrite it strongly WITHOUT adding one.
- Do NOT add skills the person did not list. You may regroup their existing skills into clearer categories.
- Do NOT change contact, education, certifications, company names, role titles, project names, tech lists or dates.

Improve the wording:
- summary: 2-3 sharp lines naming their target role and strongest real skills/evidence; no "I/my", no cliches.
- experience[].bullets: start each with a strong action verb, make the impact clear, keep 2-5 bullets per role, same facts.
- projects[].bullets: 2-4 bullets per project (problem, what they built with which of THEIR tech, the result they stated).
- skills: same items, grouped into clear categories (Languages, Frameworks, Databases, Tools, Cloud, ...).

Return ONLY valid JSON: {"summary":"","experience":[{"bullets":[""]}],"projects":[{"bullets":[""]}],"skills":[{"category":"","items":[""]}]}
The experience and projects arrays must be in the same order and length as the input. No markdown fences.

Current resume (JSON):
${JSON.stringify(compactForPrompt(sections), null, 1).slice(0, 12000)}`;

  let parsed: any;
  // Returning `sections` unchanged on failure meant "Improve with AI" quietly did
  // nothing, which a member reads as the AI judging their resume already perfect.
  try { parsed = JSON.parse(stripJson(await aiComplete(prompt, 4096, 0.2))); }
  catch (e: any) {
    console.error('[resume] improve failed:', String(e?.message || e).slice(0, 200));
    throw new Error('Could not improve the resume right now. Please try again shortly.');
  }

  // Guards, in code, for what the prompt asks: numbers the resume never had are refused line by line, and skills it
  // never listed are dropped. A rewrite that breaks a rule falls back to the member's own line.
  const sourceText = JSON.stringify(sections).toLowerCase();
  // Whole numbers only: "5" must be a number the resume has, not the 5 inside "2025". "10,000" and "10000" match.
  const numTokens = (t: string) => (String(t).match(/\d+(?:[.,]\d+)*/g) || []).map(n => n.replace(/,/g, ''));
  const sourceNumbers = new Set(numTokens(sourceText));
  const numbersOk = (line: string) => numTokens(line).every(n => sourceNumbers.has(n));
  const known = new Set<string>((sections.skills || []).flatMap((g: any) => g.items || []).map((x: string) => String(x).toLowerCase().trim()));
  const skillsShapeOk = Array.isArray(parsed.skills) && parsed.skills.every((g: any) => g && typeof g.category === 'string' && Array.isArray(g.items));
  const skills = skillsShapeOk
    ? parsed.skills.map((g: any) => ({ category: g.category.trim(), items: g.items.map((x: any) => String(x).trim()).filter((x: string) => known.has(x.toLowerCase())) })).filter((g: any) => g.items.length)
    : [];
  const kept = new Set(skills.flatMap((g: any) => g.items.map((x: string) => x.toLowerCase())));
  const lost = Array.from(known).filter(k => !kept.has(k));
  const summary = typeof parsed.summary === 'string' && parsed.summary.trim() && numbersOk(parsed.summary) ? parsed.summary.trim() : sections.summary;
  return {
    ...sections,
    summary,
    experience: mergeExperience(sections.experience, parsed.experience, numbersOk),
    projects: mergeProjects(sections.projects, parsed.projects, numbersOk),
    // Regrouping is welcome; losing a skill is not — if any went missing, keep the member's own grouping.
    skills: skills.length && !lost.length ? skills : sections.skills,
  };
}

/** The resume as the model needs to see it: plain text, no HTML, no ids. */
function compactForPrompt(s: any) {
  return {
    title: s.contact?.title || '',
    summary: stripHtml(s.summary || ''),
    experience: (s.experience || []).map((e: any) => ({ role: e.role, company: e.company, bullets: (e.bullets || []).map(stripHtml) })),
    projects: (s.projects || []).map((p: any) => ({ name: p.name, tech: p.tech || [], bullets: descriptionBullets(p.description || '') })),
    skills: s.skills || [],
  };
}

const escHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function mergeExperience(orig: any[], improved: any, numbersOk: (l: string) => boolean): any[] {
  if (!Array.isArray(improved)) return orig || [];
  return (orig || []).map((e, i) => {
    const im = improved[i];
    const bullets = im && Array.isArray(im.bullets) ? im.bullets.map((b: any) => String(b || '').trim()).filter(Boolean) : [];
    if (!bullets.length) return e;
    // A bullet with an invented number is replaced by the original bullet in the same position (or dropped).
    const safe = bullets.map((b: string, j: number) => (numbersOk(b) ? b : (e.bullets || [])[j])).filter(Boolean);
    return safe.length ? { ...e, bullets: safe } : e;
  });
}
function mergeProjects(orig: any[], improved: any, numbersOk: (l: string) => boolean): any[] {
  if (!Array.isArray(improved)) return orig || [];
  return (orig || []).map((p, i) => {
    const im = improved[i];
    const bullets = im && Array.isArray(im.bullets) ? im.bullets.map((b: any) => String(b || '').trim()).filter(Boolean) : [];
    if (!bullets.length) return p;
    const original = descriptionBullets(p.description || '');
    const safe = bullets.map((b: string, j: number) => (numbersOk(b) ? b : original[j])).filter(Boolean);
    return safe.length ? { ...p, description: `<ul>${safe.map((b: string) => `<li>${escHtml(b)}</li>`).join('')}</ul>` } : p;
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

/**
 * Tailor a resume to a SPECIFIC job description.
 * Returns a JD-match report: match %, matched vs missing JD keywords, a rewritten
 * summary aimed at this JD, tailored experience/project bullets, and concrete
 * gap actions — grounded in the candidate's real resume (no invented facts).
 */
export interface IResumeTailorResult {
  matchScore: number;
  jobTitle: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  tailoredSummary: string;
  tailoredBullets: string[];
  suggestions: { area: string; fix: string }[];
}

export async function tailorResume(sections: IResumeSections, jobDescription: string): Promise<IResumeTailorResult> {
  const jd = (jobDescription || '').trim();
  if (jd.length < 30) throw new Error('Paste a fuller job description (at least a few lines).');
  const prompt = `You are a senior technical recruiter + expert resume writer. Compare the candidate's resume to the TARGET JOB DESCRIPTION and tailor the resume to it. Only use facts present in the resume — do NOT invent employers, degrees, titles or technologies the candidate does not have; you may re-emphasise and re-word real experience.

TARGET JOB DESCRIPTION:
${jd.slice(0, 4000)}

CANDIDATE RESUME (JSON):
${JSON.stringify(sections).slice(0, 6000)}

Return ONLY raw JSON:
{"matchScore": <0-100 how well this resume matches THIS job today>, "jobTitle": "<role this JD is for>", "matchedKeywords": ["<JD skills/keywords the resume already has>"], "missingKeywords": ["<important JD skills/keywords absent or weak in the resume>"], "tailoredSummary": "<2-3 line professional summary rewritten to target THIS job, truthful to the resume>", "tailoredBullets": ["<5-8 impact/metric-driven experience or project bullets re-worded to hit this JD's requirements, grounded in real resume content>"], "suggestions": [{"area": "<what to strengthen>", "fix": "<specific action to close the gap for this job>"}]}`;
  let parsed: any = {};
  try { parsed = JSON.parse(stripJson(await aiComplete(prompt, 2400))); }
  catch (e: any) {
    // An empty object here produced a "tailored" result with a 0% match and no keywords,
    // which looks like a verdict on the resume rather than a failed call.
    console.error('[resume] tailor failed:', String(e?.message || e).slice(0, 200));
    throw new Error('Could not tailor the resume right now. Please try again shortly.');
  }
  const arr = (v: any): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : []);
  return {
    matchScore: clamp(parsed.matchScore, 100),
    jobTitle: typeof parsed.jobTitle === 'string' ? parsed.jobTitle : '',
    matchedKeywords: arr(parsed.matchedKeywords).slice(0, 30),
    missingKeywords: arr(parsed.missingKeywords).slice(0, 30),
    tailoredSummary: typeof parsed.tailoredSummary === 'string' ? parsed.tailoredSummary : '',
    tailoredBullets: arr(parsed.tailoredBullets).slice(0, 10),
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s: any) => s && (s.fix || s.area)).map((s: any) => ({ area: String(s.area || ''), fix: String(s.fix || '') })).slice(0, 12)
      : [],
  };
}
