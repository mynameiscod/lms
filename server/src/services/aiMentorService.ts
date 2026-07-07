import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import * as settings from './settingsService';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import AssessmentSubmission from '../models/AssessmentSubmission';
import { IMentorMessage } from '../models/MentorChat';

/**
 * aiMentorService — a context-aware AI career mentor.
 * Pulls the student's profile, assessment scores, skill gaps and target role so
 * the mentor's advice is personalised, then answers conversationally.
 */

// Build a compact context block grounding the mentor in this student's real data.
export async function buildStudentContext(userId: string, tenantId: string): Promise<string> {
  const lines: string[] = [];
  try {
    const user: any = await User.findById(userId).lean();
    const name = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';
    if (name) lines.push(`Student name: ${name}`);

    const profile: any = await StudentProfile.findOne({ userId, tenantId }).lean();
    if (profile) {
      const tb = profile.technicalBackground || {};
      if (profile.courseInterest?.interestedCourse) lines.push(`Interested track / target: ${profile.courseInterest.interestedCourse}`);
      if (tb.experienceLevel) lines.push(`Experience level: ${tb.experienceLevel}`);
      const skills = [...(tb.programmingLanguages || []), ...(tb.technologies || [])];
      if (skills.length) lines.push(`Known skills: ${skills.slice(0, 25).join(', ')}`);
    }

    // Latest assessment (linked by email) — scores, gaps, readiness, roadmap.
    if (user?.email) {
      const sub: any = await AssessmentSubmission.findOne({ tenantId, email: String(user.email).toLowerCase() })
        .sort({ createdAt: -1 }).lean();
      if (sub) {
        if (sub.targetRole) lines.push(`Assessed target role: ${sub.targetRole}`);
        if (typeof sub.careerReadinessScore === 'number') lines.push(`Career readiness score: ${sub.careerReadinessScore}/100`);
        if (Array.isArray(sub.subScores) && sub.subScores.length) {
          lines.push('Sub-scores: ' + sub.subScores.map((s: any) => `${s.label || s.key}=${s.score}`).join(', '));
        }
        if (sub.skillGap) {
          const weak = (sub.skillGap.weak || []).map((s: any) => s.skill).filter(Boolean);
          const missing = (sub.skillGap.missing || []).map((s: any) => s.skill).filter(Boolean);
          if (weak.length) lines.push(`Weak skills to strengthen: ${weak.slice(0, 10).join(', ')}`);
          if (missing.length) lines.push(`Missing skills to learn: ${missing.slice(0, 10).join(', ')}`);
        }
        if (sub.roadmap?.phases?.length) {
          lines.push(`Roadmap phases: ${sub.roadmap.phases.map((p: any) => p.title || p.name).filter(Boolean).slice(0, 8).join(' → ')}`);
        }
      }
    }
  } catch { /* best-effort; context is optional */ }

  return lines.length ? lines.join('\n') : 'No profile/assessment data on file yet — ask the student about their goals.';
}

const SYSTEM = `You are "CareerPilot Mentor", a warm, practical AI career mentor for software students at CodeBegun.
You help with career direction, skill-building priorities, interview prep, resume/GitHub/LinkedIn, project ideas, job search strategy and staying motivated.
Guidelines:
- Be specific and actionable. Prefer concrete next steps over generic pep talk.
- Ground advice in the student's context (target role, scores, skill gaps, known skills) when relevant.
- Point them to the platform's tools when useful: Skill Assessment, Learning Plan, Project Builder, Resume Builder, Career Profile (GitHub/LinkedIn review), AI Mock Interviews (Practice tab) and the Job Tracker.
- Keep replies concise and scannable (short paragraphs or bullet points). Ask a clarifying question when the request is vague.
- Be honest and encouraging; never invent facts about the student.`;

// Generate the mentor's next reply given the running history + the new user message.
export async function mentorReply(context: string, history: IMentorMessage[], userMessage: string): Promise<string> {
  const convo = [...history, { role: 'user' as const, content: userMessage, at: new Date() }]
    .slice(-16) // keep the last ~8 turns
    .map((m) => ({ role: m.role, content: m.content }));

  const system = `${SYSTEM}\n\n--- Student context ---\n${context}`;

  if (isAnthropicEnabled()) {
    const anth = getAnthropic();
    if (anth) {
      const model = settings.getStr('ASSESSMENT_ROADMAP_MODEL', 'claude-sonnet-4-6');
      const r: any = await anth.messages.create({
        model, max_tokens: 1024, system,
        messages: convo as any,
      });
      const block = (r.content || []).find((b: any) => b.type === 'text');
      return (block?.text || '').trim() || 'Sorry, I could not generate a reply just now. Please try again.';
    }
  }
  const openai = getOpenAI();
  if (!openai) throw new Error('No AI provider configured. Add an Anthropic or OpenAI key in Platform Settings.');
  const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
  const r = await openai.chat.completions.create({
    model, max_tokens: 1024,
    messages: [{ role: 'system', content: system }, ...convo] as any,
  });
  return (r.choices?.[0]?.message?.content || '').trim() || 'Sorry, I could not generate a reply just now. Please try again.';
}

// A few starter prompts shown when the chat is empty.
export const MENTOR_SUGGESTIONS = [
  'What should I focus on this week to get job-ready?',
  'Review my weak areas and give me a 30-day plan.',
  'Help me prepare for a technical interview for my target role.',
  'What projects should I build to stand out to recruiters?',
];
