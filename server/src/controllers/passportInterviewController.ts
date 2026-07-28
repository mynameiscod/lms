import { Request, Response } from 'express';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import PassportAttempt from '../models/PassportAttempt';
import PassportInterview from '../models/PassportInterview';
import { isEntitled } from '../services/passportEntitlementService';
import { getOrCreateProgress, addXp } from '../services/passportXpService';
import {
  nextInterviewerTurn, evaluateTranscript, isInterviewAIEnabled, ConvTurn,
} from '../services/interviewAIService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

const INTERVIEW_XP = 60;
const MAX_QUESTIONS = 6;

// Which areas a mock covers, per pathway. Keeps the interview relevant to what the
// member's roadmap is actually preparing them for.
const AREAS_BY_PATHWAY: Record<string, { role: string; areas: string[] }> = {
  software_dev:   { role: 'Software Developer (Fresher)', areas: ['Introduction & background', 'Programming fundamentals', 'Projects you built', 'Problem solving approach', 'Learning mindset'] },
  data_analytics: { role: 'Data Analyst (Fresher)',       areas: ['Introduction & background', 'SQL and data handling', 'Analytical thinking', 'Communicating insights', 'Tools you know'] },
  ai_ready:       { role: 'AI-Ready Associate (Fresher)', areas: ['Introduction & background', 'Python fundamentals', 'Working with AI tools', 'Projects you built', 'Curiosity & learning'] },
  it_bridge:      { role: 'IT Associate (Fresher)',       areas: ['Introduction & background', 'Communication', 'Basic technical awareness', 'Attitude & ownership', 'Career goals'] },
};

async function gate(req: Request) {
  const tenantId = tenantOf(req);
  const studentId = userIdOf(req);
  const [user, cfg] = await Promise.all([
    User.findById(studentId).select('passport firstName lastName').lean() as any,
    PassportConfig.findOne({ tenantId }).lean(),
  ]);
  return {
    tenantId, studentId, user, cfg,
    entitled: isEntitled(cfg?.entitlements as any, user?.passport, 'mock_interview'),
  };
}

const publicSession = (s: any) => ({
  id: String(s._id), role: s.role, areas: s.areas,
  interviewerName: s.interviewerName, maxQuestions: s.maxQuestions,
  askedCount: s.askedCount, status: s.status,
  transcript: (s.transcript || []).map((t: any) => ({ role: t.role, text: t.text, at: t.at })),
  evaluation: s.evaluation || null,
  xpAwarded: s.xpAwarded, startedAt: s.startedAt, completedAt: s.completedAt,
});

/** GET /passport/interview — past sessions + whether one is still open. */
export const list = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    if (!entitled) return res.json({ locked: true, priceInr: cfg?.priceInr ?? 499 });

    const sessions = await PassportInterview.find({ tenantId, studentId }).sort({ createdAt: -1 }).limit(20).lean();
    const open = sessions.find((s: any) => s.status === 'in_progress');
    res.json({
      locked: false,
      aiAvailable: isInterviewAIEnabled(),
      sessions: sessions.map(publicSession),
      openSessionId: open ? String((open as any)._id) : null,
    });
  } catch (e: any) {
    console.error('[passport] interview list:', e);
    res.status(500).json({ message: e.message || 'Failed to load interviews' });
  }
};

/** POST /passport/interview/start — open a session and get the interviewer's first line. */
export const start = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, user, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required for mock interviews.' });

    // Only one live session at a time — resume it instead of stacking sessions.
    const existing = await PassportInterview.findOne({ tenantId, studentId, status: 'in_progress' });
    if (existing) return res.json({ session: publicSession(existing), resumed: true });

    const attempt = await PassportAttempt.findOne({ tenantId, studentId }).sort({ createdAt: -1 }).lean() as any;
    const preset = AREAS_BY_PATHWAY[attempt?.pathway] || AREAS_BY_PATHWAY.it_bridge;
    const role = String(req.body?.role || preset.role);

    const first = await nextInterviewerTurn({
      interviewerName: 'Priya', role, areas: preset.areas,
      history: [], askedCount: 0, maxQuestions: MAX_QUESTIONS,
    });

    const session = await PassportInterview.create({
      tenantId, studentId, role, areas: preset.areas,
      interviewerName: 'Priya', maxQuestions: MAX_QUESTIONS, askedCount: 1,
      status: 'in_progress',
      transcript: [{ role: 'interviewer', text: first.say, at: new Date() }],
    });

    res.json({ session: publicSession(session), aiAvailable: isInterviewAIEnabled(), candidateName: user?.firstName || '' });
  } catch (e: any) {
    console.error('[passport] interview start:', e);
    res.status(500).json({ message: e.message || 'Could not start the interview' });
  }
};

/** POST /passport/interview/:id/turn — submit the candidate's answer, get the next line. */
export const turn = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required.' });

    const session = await PassportInterview.findOne({ _id: req.params.id, tenantId, studentId });
    if (!session) return res.status(404).json({ message: 'Interview not found' });
    if (session.status !== 'in_progress') return res.status(409).json({ message: 'This interview is already finished.' });

    const answer = String(req.body?.answer || '').trim();
    if (!answer) return res.status(400).json({ message: 'Type or speak your answer first.' });

    session.transcript.push({ role: 'candidate', text: answer.slice(0, 4000), at: new Date() } as any);

    const history: ConvTurn[] = session.transcript.map(t => ({ role: t.role, text: t.text }));
    const next = await nextInterviewerTurn({
      interviewerName: session.interviewerName, role: session.role, areas: session.areas,
      history, askedCount: session.askedCount, maxQuestions: session.maxQuestions,
    });

    session.transcript.push({ role: 'interviewer', text: next.say, at: new Date() } as any);
    if (!next.endInterview) session.askedCount += 1;
    await session.save();

    res.json({ say: next.say, kind: next.kind, endInterview: next.endInterview, session: publicSession(session) });
  } catch (e: any) {
    console.error('[passport] interview turn:', e);
    res.status(500).json({ message: e.message || 'Could not continue the interview' });
  }
};

/** POST /passport/interview/:id/finish — grade the transcript and award XP once. */
export const finish = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required.' });

    const session = await PassportInterview.findOne({ _id: req.params.id, tenantId, studentId });
    if (!session) return res.status(404).json({ message: 'Interview not found' });
    if (session.status === 'completed') return res.json({ session: publicSession(session), alreadyCompleted: true });

    const answered = session.transcript.filter(t => t.role === 'candidate').length;
    if (answered === 0) {
      session.status = 'abandoned';
      await session.save();
      return res.json({ session: publicSession(session), message: 'Interview closed — no answers were given.' });
    }

    const evalResult = await evaluateTranscript({
      role: session.role,
      areas: session.areas.map(a => ({ title: a, type: 'mixed' })),
      transcript: session.transcript.map(t => ({ role: t.role, text: t.text })),
    });

    session.evaluation = evalResult
      ? {
          overallScore: evalResult.overallPercentage,
          readinessLevel: evalResult.readinessLevel,
          summary: evalResult.overallFeedback,
          strengths: evalResult.topStrengths,
          improvements: evalResult.topWeaknesses,
          recommendedPracticeAreas: evalResult.recommendedPracticeAreas,
          areaScores: evalResult.areaScores,
        }
      : {
          // AI unavailable — still close the session honestly rather than faking a score.
          overallScore: 0,
          readinessLevel: 'needs_improvement',
          summary: 'AI feedback is not available right now, so this round was not scored. Your transcript is saved — try again once AI is configured.',
          strengths: [], improvements: [], recommendedPracticeAreas: [], areaScores: [],
        };

    session.status = 'completed';
    session.completedAt = new Date();

    if (!session.xpAwarded) {
      const progress = await getOrCreateProgress(tenantId, studentId);
      addXp(progress, INTERVIEW_XP, true);
      await progress.save();
      session.xpAwarded = INTERVIEW_XP;
    }
    await session.save();

    res.json({ session: publicSession(session), scored: !!evalResult });
  } catch (e: any) {
    console.error('[passport] interview finish:', e);
    res.status(500).json({ message: e.message || 'Could not finish the interview' });
  }
};

/** GET /passport/interview/:id — one session with its full transcript + feedback. */
export const get = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499 });
    const session = await PassportInterview.findOne({ _id: req.params.id, tenantId, studentId }).lean();
    if (!session) return res.status(404).json({ message: 'Interview not found' });
    res.json({ session: publicSession(session) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to load interview' });
  }
};
