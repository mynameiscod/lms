import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import * as settings from './settingsService';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import AssessmentSubmission from '../models/AssessmentSubmission';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import LearningCurriculum from '../models/LearningCurriculum';
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

    // Latest assessment — linked by candidateUserId (reliable), with candidate.email fallback.
    {
      const or: any[] = [{ candidateUserId: userId }];
      if (user?.email) or.push({ 'candidate.email': String(user.email).toLowerCase() });
      const sub: any = await AssessmentSubmission.findOne({ tenantId, $or: or })
        .sort({ createdAt: -1 }).lean();
      if (sub) {
        const tRole = sub.candidate?.targetRole || sub.targetRole || sub.roadmap?.targetRole;
        if (tRole) lines.push(`Assessed target role: ${tRole}`);
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

    // Offline / batch context: what program the student is in and how far along.
    const enr: any = await CurriculumEnrollment.findOne({ tenantId, studentId: userId, status: 'active' }).sort({ createdAt: -1 }).lean();
    if (enr) {
      const cur: any = enr.curriculumId ? await LearningCurriculum.findById(enr.curriculumId).select('title totalDays').lean() : null;
      const done = (enr.completedDays || []).length;
      lines.push(`Enrolled program: "${cur?.title || 'a curriculum'}" — currently on Day ${enr.currentDay || 1}${cur?.totalDays ? ` of ${cur.totalDays}` : ''}, ${done} day(s) completed.`);
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
- Be honest and encouraging; never invent facts about the student.

Teaching & problem-solving — VERY IMPORTANT (most students here struggle to think logically and to start coding):
- When a student is stuck on code or a logic problem, DO NOT write the full solution or complete code for them. Your job is to build their thinking, not hand them answers.
- Coach with this loop: Understand → Plan → Code → Test → Reflect. First make them restate the problem in their own words and outline the steps in PLAIN ENGLISH / pseudocode BEFORE any code. Most of the skill is built here.
- Give exactly ONE small next hint at a time, then ask a guiding question and let them attempt it. Never dump the whole approach at once.
- Break problems into tiny sub-steps; start from the simplest version. Celebrate small wins and keep them confident — many are beginners who freeze at a blank editor.
- If they say "just give me the code/answer", gently refuse and instead give the next hint + one guiding question. Only reveal a full solution after they have genuinely attempted it, and even then walk through the reasoning step by step (why, not just what).
- Use tiny concrete examples and dry-runs ("trace what happens for input 5") to build their mental model of how code executes.`;

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
  "I'm stuck on a coding problem — coach me through it (don't give the answer).",
  'Help me plan the steps in plain English before I write code.',
  'Give me a simple logic exercise to practice at my level.',
  'What should I focus on this week to improve my problem-solving?',
];
