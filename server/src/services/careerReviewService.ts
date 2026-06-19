import { getAnthropic, getOpenAI } from './aiClients';
import * as settings from './settingsService';
import Resume from '../models/Resume';
import mongoose from 'mongoose';

/**
 * careerReviewService — AI review/improve for the Career Profile Builder.
 * One function per pillar (resume / github / linkedin); each returns
 * { score, issues[], improved } as structured JSON. Uses the configured AI
 * provider (Anthropic first, OpenAI fallback) via Platform Settings.
 */

function parseJSON(text: string): any {
  const c = (text || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(c); }
  catch {
    const m = c.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('AI did not return valid JSON.');
  }
}

async function callAIJSON(system: string, user: string, maxTokens = 2200): Promise<any> {
  const anthropic = getAnthropic();
  if (anthropic) {
    const model = settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6');
    const r = await anthropic.messages.create({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
    const text = r.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
    return parseJSON(text);
  }
  const openai = getOpenAI();
  if (openai) {
    const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
    const r = await openai.chat.completions.create({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] });
    return parseJSON(r.choices?.[0]?.message?.content || '');
  }
  throw new Error('No AI provider configured. Add an Anthropic or OpenAI key in Platform Settings.');
}

export const parseGithubUsername = (urlOrName: string): string => {
  if (!urlOrName) return '';
  const m = urlOrName.match(/github\.com\/([A-Za-z0-9-]+)/i);
  if (m) return m[1];
  return urlOrName.trim().replace(/^@/, '').replace(/\/.*$/, '');
};

// ── GitHub: fetch public profile + repos via REST API (token optional) ────────
export async function fetchGithub(username: string, token?: string): Promise<{ user: any; repos: any[] }> {
  const headers: any = { Accept: 'application/vnd.github+json', 'User-Agent': 'codebegun-career-builder' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const u = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
  if (!u.ok) throw new Error(u.status === 404 ? 'GitHub user not found.' : `GitHub API error (${u.status}).`);
  const user = await u.json();
  const r = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`, { headers });
  const repos = (r.ok ? await r.json() : []) as any[];
  return { user, repos };
}

// Fetch a repo's README as raw markdown (best-effort).
async function fetchReadme(owner: string, repo: string, token?: string): Promise<string> {
  try {
    const headers: any = { Accept: 'application/vnd.github.raw+json', 'User-Agent': 'codebegun-career-builder' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
    if (!r.ok) return '';
    return (await r.text()).slice(0, 1500);
  } catch { return ''; }
}

// Summarise a GitHub account into job-readiness stats (used to ground the AI).
function githubStats(repos: any[]) {
  const owned = (repos || []).filter((r: any) => !r.fork);
  const languages: Record<string, number> = {};
  owned.forEach((r: any) => { if (r.language) languages[r.language] = (languages[r.language] || 0) + 1; });
  const lastPush = owned.map((r: any) => r.pushed_at).filter(Boolean).sort().slice(-1)[0] || null;
  return {
    ownedRepos: owned.length,
    withDescription: owned.filter((r: any) => r.description).length,
    totalStars: owned.reduce((s: number, r: any) => s + (r.stargazers_count || 0), 0),
    languages, lastPush, owned,
  };
}

// ── Pillar reviews ────────────────────────────────────────────────────────────

export async function reviewResume(targetRole: string, studentId: string, tenantId: string) {
  const resume = await Resume.findOne({ userId: new mongoose.Types.ObjectId(studentId), tenantId: new mongoose.Types.ObjectId(tenantId) })
    .sort({ updatedAt: -1 }).lean();
  if (!resume) {
    return { score: 0, issues: [{ area: 'Resume', problem: 'No resume found', fix: 'Create/upload a resume in Resume Builder first.', severity: 'high' }], improved: {}, resumeId: undefined, missing: true };
  }
  const sections = resume.sections || {};
  const existing = resume.score;
  const sys = 'You are an expert ATS resume reviewer and career coach. Output ONLY raw JSON.';
  const usr = `Target role: ${targetRole || 'software engineer'}\n\nResume JSON:\n${JSON.stringify(sections).slice(0, 6000)}\n\nReturn JSON exactly:\n{"score": <0-100 ATS readiness for the target role>, "issues":[{"area":"","problem":"","fix":"","severity":"high|medium|low"}], "improved":{"summary":"<rewritten 2-3 line summary>","skills":["..."],"bullets":["<impact-driven, metric-rich experience/project bullets>"]}}`;
  const ai = await callAIJSON(sys, usr);
  return {
    score: typeof ai.score === 'number' ? ai.score : ((existing as any)?.overall ?? 0),
    issues: Array.isArray(ai.issues) ? ai.issues : (existing?.suggestions || []).map((s: any) => ({ area: s.section, problem: s.issue, fix: s.fix })),
    improved: ai.improved || {},
    resumeId: resume._id,
  };
}

export async function reviewGithub(targetRole: string, username: string, token?: string) {
  const { user, repos } = await fetchGithub(username, token);
  const stats = githubStats(repos);
  // Phase 2 deep-dive: pull READMEs for the top repos so suggestions are grounded.
  const top = [...stats.owned].sort((a: any, b: any) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0, 5);
  const readmes = await Promise.all(top.map(async (r: any) => ({
    name: r.name, hasReadme: false as boolean, readme: await fetchReadme(user.login, r.name, token),
  })));
  readmes.forEach(rd => { rd.hasReadme = !!rd.readme; });
  const repoSummary = stats.owned.slice(0, 30).map((r: any) => ({
    name: r.name, description: r.description || '', language: r.language || '', stars: r.stargazers_count || 0,
    topics: r.topics || [], hasDescription: !!r.description, pushedAt: r.pushed_at,
  }));
  const sys = 'You are a senior engineer reviewing a candidate\'s GitHub for job-readiness. Be specific and ground every suggestion in the actual repos/READMEs provided. Output ONLY raw JSON.';
  const usr = `Target role: ${targetRole || 'software engineer'}

Profile: name=${user.name || ''} bio="${user.bio || ''}" publicRepos=${user.public_repos} followers=${user.followers}
Stats: ownedRepos=${stats.ownedRepos} withDescription=${stats.withDescription} totalStars=${stats.totalStars} lastPush=${stats.lastPush} languages=${JSON.stringify(stats.languages)}

Repos:\n${JSON.stringify(repoSummary)}

Top repo READMEs (truncated; empty = repo has NO README):\n${JSON.stringify(readmes)}

Return JSON exactly:
{"score":<0-100 for the target role>,"issues":[{"area":"","problem":"","fix":"","severity":"high|medium|low"}],"improved":{"bio":"<improved GitHub bio>","profileReadme":"<a strong profile README in markdown for the special username/username repo>","repoSuggestions":[{"repo":"","newDescription":"","newName":"","readmeTips":"<concrete README improvements for this repo>"}],"activityTips":["<contribution/commit-activity advice based on lastPush & repo count>"],"postIdeas":["<2 'build in public' ideas to showcase these repos>"]}}`;
  const ai = await callAIJSON(sys, usr, 2600);
  return {
    score: typeof ai.score === 'number' ? ai.score : 0,
    issues: Array.isArray(ai.issues) ? ai.issues : [],
    improved: ai.improved || {},
    profile: { login: user.login, name: user.name, bio: user.bio, publicRepos: user.public_repos },
  };
}

export async function reviewLinkedin(targetRole: string, pasted: string) {
  if (!pasted || pasted.trim().length < 20) {
    return { score: 0, issues: [{ area: 'LinkedIn', problem: 'No LinkedIn content provided', fix: 'Paste your headline, About, and experience text.', severity: 'high' }], improved: {} };
  }
  const sys = 'You are a LinkedIn personal-branding expert and recruiter. Output ONLY raw JSON.';
  const usr = `Target role: ${targetRole || 'software engineer'}\n\nStudent's pasted LinkedIn content:\n${pasted.slice(0, 6000)}\n\nReturn JSON exactly:\n{"score":<0-100 for the target role>,"issues":[{"area":"","problem":"","fix":"","severity":"high|medium|low"}],"improved":{"headline":"<punchy headline>","about":"<rewritten About section>","skills":["..."],"projectsBullets":["..."],"experienceBullets":["..."],"postIdeas":["<5 daily post ideas>"]}}`;
  const ai = await callAIJSON(sys, usr);
  return {
    score: typeof ai.score === 'number' ? ai.score : 0,
    issues: Array.isArray(ai.issues) ? ai.issues : [],
    improved: ai.improved || {},
  };
}

// ── Phase 2: regenerate a single section of one pillar's improved content ──────
export interface RegenCtx {
  targetRole: string;
  studentId: string;
  tenantId: string;
  githubUsername?: string;
  githubToken?: string;
  linkedinPasted?: string;
  currentImproved?: any;
}

export async function regenerateSection(pillar: 'resume' | 'github' | 'linkedin', section: string, ctx: RegenCtx): Promise<any> {
  let source = '';
  if (pillar === 'resume') {
    const resume = await Resume.findOne({ userId: new mongoose.Types.ObjectId(ctx.studentId), tenantId: new mongoose.Types.ObjectId(ctx.tenantId) }).sort({ updatedAt: -1 }).lean();
    source = JSON.stringify(resume?.sections || {}).slice(0, 5000);
  } else if (pillar === 'github') {
    if (ctx.githubUsername) {
      const { user, repos } = await fetchGithub(ctx.githubUsername, ctx.githubToken);
      const summary = (repos || []).filter((r: any) => !r.fork).slice(0, 20).map((r: any) => ({ name: r.name, description: r.description, language: r.language, stars: r.stargazers_count }));
      source = JSON.stringify({ name: user.name, bio: user.bio, repos: summary }).slice(0, 5000);
    }
  } else {
    source = (ctx.linkedinPasted || '').slice(0, 5000);
  }
  const current = ctx.currentImproved?.[section];
  const sys = 'You regenerate ONE section of a candidate career profile. Match the data type of the current value (string or array of strings/objects). Output ONLY raw JSON.';
  const usr = `Target role: ${ctx.targetRole || 'software engineer'}\nPillar: ${pillar}\nSection to regenerate: "${section}"\n\nSource context:\n${source}\n\nCurrent value:\n${JSON.stringify(current ?? '')}\n\nReturn JSON exactly: {"value": <a fresh, improved value for this section, same type as the current value>}`;
  const ai = await callAIJSON(sys, usr, 1400);
  return ai.value;
}
