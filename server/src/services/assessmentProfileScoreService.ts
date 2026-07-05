import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import * as settings from './settingsService';
import { IProfileScores } from '../models/AssessmentSubmission';

/**
 * Profile-level scores that merge with the exam dimensions to form the 8 named
 * Career-Readiness sub-scores. All best-effort — any failure returns undefined
 * (shown as "pending" on the result) and never blocks submission.
 */

const clampScore = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

async function ai(prompt: string, maxTokens = 12): Promise<string> {
  if (isAnthropicEnabled()) {
    const anth = getAnthropic();
    if (anth) {
      const model = settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6');
      const r: any = await anth.messages.create({ model, max_tokens: maxTokens, temperature: 0, messages: [{ role: 'user', content: prompt }] });
      return (r.content || []).find((b: any) => b.type === 'text')?.text || '';
    }
  }
  const openai = getOpenAI();
  if (!openai) return '';
  const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
  const resp = await openai.chat.completions.create({ model, temperature: 0, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
  return resp.choices[0]?.message?.content || '';
}

const firstNumber = (s: string): number | undefined => {
  const m = s.match(/\d{1,3}/);
  return m ? clampScore(m[0]) : undefined;
};

export async function scoreResumeTextAI(text?: string): Promise<number | undefined> {
  if (!text || text.trim().length < 40) return undefined;
  const prompt = `You are a strict ATS and senior technical recruiter. Give a single integer 0-100 for how ATS-ready and strong this resume is for a software role — judge structure, quantified impact, relevant keywords and completeness (be honest; a weak resume scores 35-55). Reply with ONLY the number.\n\nResume:\n${text.slice(0, 4000)}`;
  return firstNumber(await ai(prompt).catch(() => ''));
}

export async function scoreCommunicationAI(text?: string): Promise<number | undefined> {
  if (!text || text.trim().length < 15) return undefined;
  const prompt = `Rate this candidate's written communication 0-100 for clarity, structure, grammar and how well they articulate a technical idea. Reply with ONLY the number.\n\nText:\n"${text.slice(0, 1500)}"`;
  return firstNumber(await ai(prompt).catch(() => ''));
}

const ghUser = (url?: string): string | null => {
  if (!url) return null;
  const m = url.match(/github\.com\/([A-Za-z0-9-]+)/i);
  return m && m[1].toLowerCase() !== 'orgs' ? m[1] : null;
};

// Public GitHub heuristic (unauthenticated, best-effort).
export async function scoreGithub(url?: string): Promise<number | undefined> {
  const user = ghUser(url);
  if (!user) return undefined;
  try {
    const token = settings.getStr('GITHUB_API_TOKEN');
    const headers: Record<string, string> = { 'User-Agent': 'codebegun-careerdna', Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`; // 60/hr → 5,000/hr
    const [uRes, rRes] = await Promise.all([
      fetch(`https://api.github.com/users/${user}`, { headers }),
      fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=updated`, { headers }),
    ]);
    if (!uRes.ok || !rRes.ok) return undefined;
    const u: any = await uRes.json();
    const repos = (await rRes.json()) as any[];
    if (!Array.isArray(repos)) return undefined;
    const own = repos.filter(r => !r.fork);
    let score = 28;
    if (u.bio) score += 8;
    if (u.name) score += 4;
    score += Math.min(own.length, 10) * 3;                        // up to +30 for real projects
    score += Math.min(own.filter(r => r.description).length, 6) * 3; // up to +18 for documented repos
    if (own.some(r => (r.stargazers_count || 0) > 0)) score += 6;
    if (own.some(r => r.homepage)) score += 6;                    // a deployed project
    return clampScore(score);
  } catch {
    return undefined;
  }
}

export async function computeProfileScores(sub: any): Promise<IProfileScores> {
  const [resume, github, communication] = await Promise.all([
    scoreResumeTextAI(sub.resumeText),
    scoreGithub(sub.candidate?.githubUrl),
    scoreCommunicationAI(sub.communicationText),
  ]);
  // linkedin (needs manual profile data — Module 7) and interviewReadiness (needs a
  // mock interview — Interview module) stay undefined → shown as "pending".
  return { resume, github, communication };
}

// Composite Career-Readiness: the exam readiness is the backbone (weighted 3×); the
// available profile scores nudge it. Missing scores simply don't count.
export function computeCareerReadiness(examReadiness: number, p: IProfileScores): number {
  const parts: Array<[number, number]> = [[examReadiness, 3]];
  if (p.resume != null) parts.push([p.resume, 1]);
  if (p.github != null) parts.push([p.github, 1]);
  if (p.communication != null) parts.push([p.communication, 1]);
  const wsum = parts.reduce((a, [, w]) => a + w, 0);
  const vsum = parts.reduce((a, [v, w]) => a + v * w, 0);
  return wsum ? Math.round(vsum / wsum) : examReadiness;
}
