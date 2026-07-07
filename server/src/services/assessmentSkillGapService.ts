import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import * as settings from './settingsService';
import { IAssessmentSubmission, ISkillGap, ISkillGapItem } from '../models/AssessmentSubmission';
import { DIMENSION_LABELS } from '../constants/assessment';

/**
 * Skill Gap AI (Module 2) — compares the candidate's known skills (resume + assessment)
 * against their TARGET ROLE's real-world requirements and returns known / weak / missing
 * skills with why-it-matters, market-relevance % and priority. Best-effort: falls back to
 * a deterministic role-skill map + weakest sub-scores so it always produces something.
 */

// Core market skills per target role (used to guide the AI and to build the fallback).
const ROLE_SKILLS: Record<string, string[]> = {
  'Java Full Stack': ['Java', 'OOP', 'Spring Boot', 'Spring Security', 'Hibernate/JPA', 'REST APIs', 'SQL', 'React', 'DSA', 'Git', 'Docker', 'System Design', 'CI/CD', 'AWS'],
  'React Developer': ['JavaScript', 'TypeScript', 'React', 'Redux/Context', 'Hooks', 'HTML/CSS', 'REST APIs', 'Testing (Jest)', 'Git', 'Webpack/Vite', 'Performance', 'Accessibility'],
  'Backend Developer': ['Node.js/Java', 'REST APIs', 'Databases (SQL/NoSQL)', 'Authentication', 'Caching (Redis)', 'Message Queues (Kafka)', 'DSA', 'Docker', 'CI/CD', 'System Design', 'AWS', 'Testing'],
  'Frontend Developer': ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React/Vue', 'Responsive Design', 'State Management', 'REST APIs', 'Accessibility', 'Git', 'Testing', 'Performance'],
  'MERN Developer': ['MongoDB', 'Express.js', 'React', 'Node.js', 'JavaScript', 'REST APIs', 'JWT Auth', 'Redux', 'DSA', 'Git', 'Deployment', 'Testing'],
  'Python Developer': ['Python', 'OOP', 'Django/Flask/FastAPI', 'REST APIs', 'SQL', 'Pandas/NumPy', 'DSA', 'Git', 'Docker', 'Testing (pytest)', 'CI/CD', 'AWS'],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]/g, '');

const stripJson = (s: string) => s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
const clampR = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const prio = (p: any): 'High' | 'Medium' | 'Low' => (p === 'High' || p === 'Low' ? p : 'Medium');

async function ai(prompt: string, maxTokens = 1100): Promise<string> {
  if (isAnthropicEnabled()) {
    const anth = getAnthropic();
    if (anth) {
      const model = settings.getStr('ASSESSMENT_ROADMAP_MODEL', 'claude-sonnet-4-6');
      const r: any = await anth.messages.create({ model, max_tokens: maxTokens, temperature: 0.3, messages: [{ role: 'user', content: prompt }] });
      return (r.content || []).find((b: any) => b.type === 'text')?.text || '';
    }
  }
  const openai = getOpenAI();
  if (!openai) return '';
  const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
  const resp = await openai.chat.completions.create({ model, temperature: 0.3, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
  return resp.choices[0]?.message?.content || '';
}

function known(sub: IAssessmentSubmission): string[] {
  const skills = new Set<string>();
  (sub.parsedSkills || []).forEach(s => s && skills.add(s));
  (sub.candidate?.currentStack || []).forEach(s => s && skills.add(s));
  if (sub.candidate?.primaryLanguage) skills.add(sub.candidate.primaryLanguage);
  return [...skills];
}

// Deterministic fallback: known = parsed skills; missing = role skills not present;
// weak = weakest exam dimensions mapped to the role.
function fallback(sub: IAssessmentSubmission): ISkillGap {
  const role = sub.candidate?.targetRole || '';
  const roleSkills = ROLE_SKILLS[role] || ROLE_SKILLS['Java Full Stack'];
  const have = new Set(known(sub).map(norm));
  const missing: ISkillGapItem[] = roleSkills
    .filter(rs => !have.has(norm(rs)))
    .slice(0, 7)
    .map((skill, i) => ({ skill, why: `Commonly required for ${role || 'this role'}.`, marketRelevance: 85 - i * 4, priority: i < 3 ? 'High' : 'Medium' }));
  const weak: ISkillGapItem[] = [...(sub.subScores || [])]
    .sort((a, b) => a.percentage - b.percentage)
    .filter(s => s.percentage < 60)
    .slice(0, 4)
    .map(s => ({ skill: DIMENSION_LABELS[s.dimension] || s.dimension, why: `Your assessment shows ${s.percentage}% — strengthen this for ${role || 'the role'}.`, marketRelevance: 80, priority: s.percentage < 40 ? 'High' : 'Medium' }));
  return { generatedAt: new Date(), known: known(sub), weak, missing, generatedBy: 'fallback' };
}

export async function generateSkillGap(sub: IAssessmentSubmission): Promise<ISkillGap> {
  const role = sub.candidate?.targetRole || '';
  const roleSkills = ROLE_SKILLS[role] || ROLE_SKILLS['Java Full Stack'];
  const subs = (sub.subScores || []).map(x => `${DIMENSION_LABELS[x.dimension] || x.dimension}: ${x.percentage}%`).join(', ');
  const prompt = `You are a senior technical recruiter and mentor. Analyse this candidate's skill gap for their TARGET ROLE.

Target role: ${role || 'Software Developer'}
Typical market skills for this role: ${roleSkills.join(', ')}
Candidate's known skills (from resume + inputs): ${known(sub).join(', ') || '(none listed)'}
Assessment sub-scores: ${subs || '(none)'}
${sub.resumeText ? `Resume excerpt: ${sub.resumeText.replace(/\s+/g, ' ').slice(0, 1500)}` : ''}

Return ONLY valid JSON (no markdown):
{
  "known": ["skills they clearly already have"],
  "weak": [{"skill": "...", "why": "one line why it matters for this role", "marketRelevance": 0-100, "priority": "High|Medium|Low"}],
  "missing": [{"skill": "...", "why": "one line why it matters", "marketRelevance": 0-100, "priority": "High|Medium|Low"}]
}
Base weak on their lower sub-scores + skills they list but likely aren't strong at; base missing on role skills they don't have. Max 6 items in weak and 7 in missing. Set marketRelevance to how in-demand the skill is for this role in India.`;

  try {
    const raw = await ai(prompt);
    if (!raw) return fallback(sub);
    const j = JSON.parse(stripJson(raw));
    const items = (arr: any): ISkillGapItem[] => (Array.isArray(arr) ? arr : [])
      .filter((x: any) => x && x.skill)
      .slice(0, 7)
      .map((x: any) => ({ skill: String(x.skill).slice(0, 60), why: x.why ? String(x.why).slice(0, 160) : undefined, marketRelevance: x.marketRelevance != null ? clampR(x.marketRelevance) : undefined, priority: prio(x.priority) }));
    const knownList = Array.isArray(j.known) ? j.known.map((s: any) => String(s)).filter(Boolean).slice(0, 15) : known(sub);
    const weak = items(j.weak);
    const missing = items(j.missing);
    if (!weak.length && !missing.length) return fallback(sub);
    return { generatedAt: new Date(), known: knownList, weak, missing, generatedBy: settings.getStr('ASSESSMENT_ROADMAP_MODEL', 'claude') };
  } catch {
    return fallback(sub);
  }
}
