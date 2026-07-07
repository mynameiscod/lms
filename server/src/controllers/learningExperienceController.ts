import { Request, Response } from 'express';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import DayPlan from '../models/DayPlan';
import LearningContentLibrary from '../models/LearningContentLibrary';
import Submission from '../models/Submission';
import { StudentNote, StudentBookmark, TopicDiscussion } from '../models/LearningExtras';
import { getAnthropic, getOpenAI, isAnthropicEnabled } from '../services/aiClients';
import * as settings from '../services/settingsService';
import { istToday } from '../utils/planSchedule';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

// Confirm the enrollment belongs to the calling student.
async function ownedEnrollment(req: Request) {
  return CurriculumEnrollment.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
}

// ─── My Notes ────────────────────────────────────────────────────────────────
export const listNotes = async (req: Request, res: Response) => {
  try {
    const en = await ownedEnrollment(req);
    if (!en) return res.status(404).json({ message: 'Enrollment not found' });
    const notes = await StudentNote.find({ enrollmentId: en._id, studentId: uId(req) }).sort({ createdAt: -1 }).lean();
    res.json({ notes });
  } catch (err) { res.status(500).json({ message: 'Failed to load notes', error: String(err) }); }
};

export const createNote = async (req: Request, res: Response) => {
  try {
    const en = await ownedEnrollment(req);
    if (!en) return res.status(404).json({ message: 'Enrollment not found' });
    const { text, dayNumber, contentId, contentTitle } = req.body;
    if (!text || !String(text).trim()) return res.status(400).json({ message: 'Note text is required' });
    const note = await StudentNote.create({
      tenantId: tId(req), studentId: uId(req), enrollmentId: en._id,
      text: String(text).trim(), dayNumber, contentId, contentTitle,
    });
    res.status(201).json({ note });
  } catch (err) { res.status(500).json({ message: 'Failed to save note', error: String(err) }); }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    await StudentNote.deleteOne({ _id: req.params.noteId, studentId: uId(req), tenantId: tId(req) });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: 'Failed to delete note', error: String(err) }); }
};

// ─── Bookmarks ───────────────────────────────────────────────────────────────
export const listBookmarks = async (req: Request, res: Response) => {
  try {
    const en = await ownedEnrollment(req);
    if (!en) return res.status(404).json({ message: 'Enrollment not found' });
    const bookmarks = await StudentBookmark.find({ enrollmentId: en._id, studentId: uId(req) }).sort({ createdAt: -1 }).lean();
    res.json({ bookmarks });
  } catch (err) { res.status(500).json({ message: 'Failed to load bookmarks', error: String(err) }); }
};

export const toggleBookmark = async (req: Request, res: Response) => {
  try {
    const en = await ownedEnrollment(req);
    if (!en) return res.status(404).json({ message: 'Enrollment not found' });
    const { contentId, dayNumber, title } = req.body;
    if (!contentId) return res.status(400).json({ message: 'contentId required' });
    const existing = await StudentBookmark.findOne({ enrollmentId: en._id, studentId: uId(req), contentId });
    if (existing) { await existing.deleteOne(); return res.json({ bookmarked: false }); }
    await StudentBookmark.create({ tenantId: tId(req), studentId: uId(req), enrollmentId: en._id, contentId, dayNumber, title });
    res.json({ bookmarked: true });
  } catch (err) { res.status(500).json({ message: 'Failed to toggle bookmark', error: String(err) }); }
};

// ─── Discussion ──────────────────────────────────────────────────────────────
export const listDiscussion = async (req: Request, res: Response) => {
  try {
    const contentId = req.query.contentId as string;
    if (!contentId) return res.json({ comments: [] });
    const comments = await TopicDiscussion.find({ tenantId: tId(req), contentId }).sort({ createdAt: 1 }).lean();
    res.json({ comments });
  } catch (err) { res.status(500).json({ message: 'Failed to load discussion', error: String(err) }); }
};

export const postDiscussion = async (req: Request, res: Response) => {
  try {
    const en = await ownedEnrollment(req);
    if (!en) return res.status(404).json({ message: 'Enrollment not found' });
    const { contentId, dayNumber, text } = req.body;
    if (!contentId || !text?.trim()) return res.status(400).json({ message: 'contentId and text required' });
    const comment = await TopicDiscussion.create({
      tenantId: tId(req), curriculumId: en.curriculumId, dayNumber, contentId,
      authorId: uId(req), authorName: en.studentName, authorRole: (req as any).user?.role || 'STUDENT',
      text: String(text).trim(),
    });
    res.status(201).json({ comment });
  } catch (err) { res.status(500).json({ message: 'Failed to post comment', error: String(err) }); }
};

// ─── Time + streak heartbeat ─────────────────────────────────────────────────
export const heartbeat = async (req: Request, res: Response) => {
  try {
    const en = await ownedEnrollment(req);
    if (!en) return res.status(404).json({ message: 'Enrollment not found' });
    const seconds = Math.min(Math.max(Number(req.body?.seconds) || 0, 0), 600); // cap a single beat at 10 min
    const today = ymd(istToday());
    en.timeSpentSeconds = (en.timeSpentSeconds || 0) + seconds;
    if (!en.activityDates?.includes(today)) en.activityDates = [...(en.activityDates || []), today];
    en.lastActivityAt = new Date();
    await en.save();
    res.json({ timeSpentSeconds: en.timeSpentSeconds, streak: computeStreak(en.activityDates) });
  } catch (err) { res.status(500).json({ message: 'Heartbeat failed', error: String(err) }); }
};

// Consecutive-day streak ending today or yesterday.
function computeStreak(dates: string[] = []): number {
  const set = new Set(dates);
  const d = istToday();
  // allow the streak to still count if they were active yesterday but not yet today
  if (!set.has(ymd(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (set.has(ymd(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

// ─── Goals ───────────────────────────────────────────────────────────────────
export const updateGoals = async (req: Request, res: Response) => {
  try {
    const en = await ownedEnrollment(req);
    if (!en) return res.status(404).json({ message: 'Enrollment not found' });
    const clamp = (n: any, d: number) => Math.min(Math.max(parseInt(n, 10) || d, 0), 20);
    en.goalTargets = {
      videos: clamp(req.body?.videos, en.goalTargets?.videos ?? 1),
      assignments: clamp(req.body?.assignments, en.goalTargets?.assignments ?? 1),
      quizzes: clamp(req.body?.quizzes, en.goalTargets?.quizzes ?? 1),
    } as any;
    await en.save();
    res.json({ goalTargets: en.goalTargets });
  } catch (err) { res.status(500).json({ message: 'Failed to update goals', error: String(err) }); }
};

// ─── Summary: gamification + today's goal + progress donut ───────────────────
export const getSummary = async (req: Request, res: Response) => {
  try {
    const en = await ownedEnrollment(req);
    if (!en) return res.status(404).json({ message: 'Enrollment not found' });

    // Progress donut — count items across the whole plan.
    const plans = await DayPlan.find({ curriculumId: en.curriculumId }).select('items dayNumber').lean();
    let totalItems = 0;
    plans.forEach(p => { totalItems += (p.items?.length || 0); });
    const completedCount = en.completedItems.length;
    // Items on days already reached but not completed count as "in progress".
    const reachedDays = new Set([...(en.completedDays || []), en.currentDay]);
    let reachedItems = 0;
    plans.forEach(p => { if (reachedDays.has(p.dayNumber)) reachedItems += (p.items?.length || 0); });
    const inProgress = Math.max(0, Math.min(reachedItems - completedCount, totalItems - completedCount));
    const notStarted = Math.max(0, totalItems - completedCount - inProgress);

    // Today's goal — content completed today (by type) + assignment submissions today.
    const today = ymd(istToday());
    const todayIds = en.completedItems.filter(ci => ymd(new Date(ci.completedAt)) === today).map(ci => ci.contentId);
    let videosDone = 0, quizzesDone = 0;
    if (todayIds.length) {
      const contents = await LearningContentLibrary.find({ _id: { $in: todayIds } }).select('type').lean();
      contents.forEach((c: any) => {
        if (c.type === 'video') videosDone++;
        else if (['practice_theory', 'aptitude', 'practice_coding'].includes(c.type)) quizzesDone++;
      });
    }
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const assignmentsDone = await Submission.countDocuments({
      student: uId(req),
      submittedAt: { $gte: startOfDay },
    }).catch(() => 0);

    const targets = en.goalTargets || { videos: 1, assignments: 1, quizzes: 1 };
    const goal = {
      targets,
      done: { videos: videosDone, assignments: assignmentsDone, quizzes: quizzesDone },
    };

    // Badges — earned from the learner's own stats.
    const xp = en.xp || 0;
    const streak = computeStreak(en.activityDates);
    const daysDone = (en.completedDays || []).length;
    const pct = totalItems ? Math.round((completedCount / totalItems) * 100) : 0;
    const badges = [
      { id: 'first_step', icon: '🌱', label: 'First Step',    hint: 'Complete your first topic', earned: completedCount >= 1 },
      { id: 'day_one',    icon: '✅', label: 'Day One',        hint: 'Finish a full day',        earned: daysDone >= 1 },
      { id: 'streak_3',   icon: '🔥', label: 'On Fire',        hint: '3-day streak',             earned: streak >= 3 },
      { id: 'streak_7',   icon: '🚀', label: 'Week Warrior',   hint: '7-day streak',             earned: streak >= 7 },
      { id: 'xp_100',     icon: '⭐', label: 'Rising Star',     hint: 'Earn 100 XP',              earned: xp >= 100 },
      { id: 'xp_500',     icon: '🌟', label: 'XP Champion',    hint: 'Earn 500 XP',              earned: xp >= 500 },
      { id: 'days_10',    icon: '📅', label: 'Consistent',     hint: 'Complete 10 days',         earned: daysDone >= 10 },
      { id: 'halfway',    icon: '🏅', label: 'Halfway There',  hint: 'Reach 50% progress',       earned: pct >= 50 },
      { id: 'finisher',   icon: '🏆', label: 'Finisher',       hint: 'Complete your plan',       earned: pct >= 100 },
    ];

    res.json({
      xp,
      streak,
      timeSpentSeconds: en.timeSpentSeconds || 0,
      progress: { total: totalItems, completed: completedCount, inProgress, notStarted },
      goal,
      badges,
    });
  } catch (err) { res.status(500).json({ message: 'Failed to load summary', error: String(err) }); }
};

// ─── Search within the plan ──────────────────────────────────────────────────
export const searchPlan = async (req: Request, res: Response) => {
  try {
    const en = await ownedEnrollment(req);
    if (!en) return res.status(404).json({ message: 'Enrollment not found' });
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ results: [] });
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const plans = await DayPlan.find({ curriculumId: en.curriculumId }).select('items dayNumber title').lean();
    const results: any[] = [];
    for (const p of plans) {
      for (const it of (p.items || []) as any[]) {
        const title = it.title || '';
        if (rx.test(title)) results.push({ dayNumber: p.dayNumber, contentId: it.contentId ? String(it.contentId) : null, title, kind: it.kind || 'content' });
        if (results.length >= 30) break;
      }
      if (results.length >= 30) break;
    }
    res.json({ results });
  } catch (err) { res.status(500).json({ message: 'Search failed', error: String(err) }); }
};

// ─── AI Study Assistant ──────────────────────────────────────────────────────
async function aiComplete(prompt: string, maxTokens = 900): Promise<string> {
  if (isAnthropicEnabled()) {
    const anth = getAnthropic();
    if (anth) {
      const model = settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6');
      const r: any = await anth.messages.create({ model, max_tokens: maxTokens, temperature: 0.4, messages: [{ role: 'user', content: prompt }] });
      return (r.content || []).find((b: any) => b.type === 'text')?.text || '';
    }
  }
  const openai = getOpenAI();
  if (!openai) throw new Error('No AI provider configured.');
  const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini');
  const resp = await openai.chat.completions.create({ model, temperature: 0.4, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
  return resp.choices[0]?.message?.content || '';
}

export const studyAssistant = async (req: Request, res: Response) => {
  try {
    const en = await ownedEnrollment(req);
    if (!en) return res.status(404).json({ message: 'Enrollment not found' });
    const { action, contentId, question, targetLang } = req.body || {};

    // Build topic context from the content item.
    let topicTitle = req.body?.topicTitle || '';
    let context = '';
    if (contentId) {
      const c: any = await LearningContentLibrary.findById(contentId).lean();
      if (c) {
        topicTitle = topicTitle || c.title;
        context = [c.title, c.description, c.notesContent ? String(c.notesContent).replace(/<[^>]+>/g, ' ').slice(0, 2000) : '',
          (c.qaItems || []).map((q: any) => `Q: ${q.question}\nA: ${q.answer}`).join('\n').slice(0, 1500)].filter(Boolean).join('\n\n');
      }
    }
    const base = `You are a friendly, concise study assistant for a student learning "${topicTitle || 'this topic'}".\n${context ? `Topic material:\n${context}\n\n` : ''}`;

    let prompt = '';
    switch (action) {
      case 'explain': prompt = `${base}Explain this concept clearly and simply, as if to a beginner. Use short paragraphs and a small analogy if helpful.`; break;
      case 'example': prompt = `${base}Give one concrete, practical example (with a short code snippet if it's a programming topic) that illustrates this concept.`; break;
      case 'mcqs': prompt = `${base}Generate 5 multiple-choice questions (4 options each) to test understanding of this topic. After all questions, give an "Answers" section with the correct option and a one-line reason for each.`; break;
      case 'translate': prompt = `${base}Explain this topic simply, then write the explanation in ${targetLang || 'Telugu'}. Keep technical terms in English where natural.`; break;
      case 'ask':
      default:
        if (!question?.trim()) return res.status(400).json({ message: 'question required' });
        prompt = `${base}The student asks: "${question}". Answer helpfully and concisely, grounded in the topic material above when relevant.`;
    }

    const answer = await aiComplete(prompt, action === 'mcqs' ? 1200 : 900);
    res.json({ answer });
  } catch (err: any) {
    console.error('studyAssistant error:', err);
    res.status(500).json({ message: err?.message || 'Assistant failed' });
  }
};
