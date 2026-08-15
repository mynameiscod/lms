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
import { getOpenAI } from '../services/aiClients';
import { recordUsage } from '../services/aiGateway';
import * as settings from '../services/settingsService';
import { awardCoins } from '../services/coinService';
import { completeInterviewMissions } from '../services/passportMissionCloseService';
import {
  planInterviewCoverage, projectInterviewToEvidence, adaptPassportInterview,
} from '../services/interviewIntelligenceService';
import { Company, CompanyMockConfig, QuestionTaxonomy, CompanyQuestion } from '../models/CompanyQuestionModels';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

const INTERVIEW_XP = 60;
// Cost scales linearly with turns: every turn re-sends the history window and pays for a
// completion. Six is a real interview; the lever exists here if it ever needs trimming.
const MAX_QUESTIONS = 6;
/** Turns of transcript sent per request. The single biggest driver of interview cost. */
const HISTORY_WINDOW = 6;
const PRODUCT = 'careerpilot';
/**
 * Who the member is talking to. Read per request rather than captured at import, so the
 * name can be changed from Platform Settings alongside the voice — the two have to agree
 * or the face, the name and the sound are three different people.
 */
const interviewerName = () => settings.getStr('INTERVIEW_INTERVIEWER_NAME', 'Siva');

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
  companySlug: s.companySlug || null, companyName: s.companyName || null,
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
    let role = String(req.body?.role || preset.role);
    let areas = preset.areas;

    let skillTargets: { skillKey: string; skillName: string }[] = [];

    /**
     * Company-flavoured mock, when the member started from a company page.
     *
     * Emphasis comes from the company's own question bank where it has one — the topics
     * they actually ask about beat anything an admin would type from memory, and it keeps
     * improving as the bank grows. The configured emphasis is the fallback.
     */
    let companyBrief: any;
    const slug = String(req.body?.companySlug || '').trim();
    if (slug) {
      const company = await Company.findOne({ tenantId, slug, active: true }).lean() as any;
      if (company) {
        const [cfg2, tax, topCats] = await Promise.all([
          CompanyMockConfig.findOne({ tenantId, companySlug: slug }).lean() as any,
          QuestionTaxonomy.findOne({ tenantId }).lean() as any,
          CompanyQuestion.aggregate([
            { $match: { tenantId, companySlug: slug, status: 'published', category: { $ne: '' } } },
            { $group: { _id: '$category', n: { $sum: 1 } } },
            { $sort: { n: -1 } }, { $limit: 5 },
          ]),
        ]);
        const catLabel = (k: string) => tax?.categories?.find((c: any) => c.key === k)?.label || k;
        const fromBank = topCats.map((t: any) => catLabel(t._id));
        const emphasis = fromBank.length ? fromBank : (cfg2?.interview?.emphasis || []);

        role = cfg2?.interview?.role || role;
        if (emphasis.length) areas = emphasis;
        companyBrief = {
          name: company.name,
          type: tax?.companyTypes?.find((t: any) => t.key === company.type)?.label || company.type,
          emphasis,
          roundLabel: cfg2?.interview?.rounds?.length
            ? tax?.rounds?.find((r: any) => r.key === cfg2.interview.rounds[0])?.label
            : undefined,
        };
      }
    }

    /**
     * Role mode — an interview built from the member's own role blueprint.
     *
     * The areas ARE canonical skills, which is the only reason this sitting can later
     * produce skill evidence: a graded area maps back to exactly one skill, and that
     * mapping is recorded now rather than guessed at the end. The member cannot name the
     * skills; coverage is resolved server-side from Module 8's classification, so nobody
     * can sit an interview on the three things they already know.
     *
     * AFTER the company block, and mutually exclusive with it. A company mock replaces the
     * areas with that employer's emphasis. If both applied, the sitting would carry skill
     * targets that no graded area matches — and it would then read as a role interview
     * that scored zero, which is the one thing this module must never report.
     *
     * If the blueprint is not ready, or this is a company mock, we keep the areas already
     * chosen and record NO targets: a normal mock interview that moves no scores.
     */
    if (String(req.body?.mode || '') === 'role' && !companyBrief) {
      const plan = await planInterviewCoverage(tenantId, studentId, MAX_QUESTIONS);
      if (plan.ok && plan.targets?.length) {
        role = plan.role?.name || role;
        areas = plan.targets.map(t => t.skillName);
        skillTargets = plan.targets.map(t => ({ skillKey: t.skillKey, skillName: t.skillName }));
      }
    }

    const first = await nextInterviewerTurn({
      interviewerName: interviewerName(), role, areas,
      history: [], askedCount: 0, maxQuestions: MAX_QUESTIONS,
      candidateName: user?.firstName || '', historyWindow: HISTORY_WINDOW,
      tenantId, product: PRODUCT, company: companyBrief,
    });

    const session = await PassportInterview.create({
      tenantId, studentId, role, areas, skillTargets,
      companySlug: companyBrief ? slug : undefined,
      companyName: companyBrief?.name,
      interviewerName: interviewerName(), maxQuestions: MAX_QUESTIONS, askedCount: 1,
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
    const { tenantId, studentId, user, cfg, entitled } = await gate(req);
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
      candidateName: user?.firstName || '', historyWindow: HISTORY_WINDOW,
      tenantId, product: PRODUCT,
      // Re-sent every turn. The brief lives in the system prompt, not the transcript, so
      // without this the interviewer forgets which company it works for after turn one.
      company: session.companyName
        ? { name: session.companyName, type: '', emphasis: session.areas || [] }
        : undefined,
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
      tenantId, product: PRODUCT,
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
          questionFeedback: evalResult.questionFeedback,
        }
      : {
          // AI unavailable — still close the session honestly rather than faking a score.
          overallScore: 0,
          readinessLevel: 'needs_improvement',
          summary: 'AI feedback is not available right now, so this round was not scored. Your transcript is saved — try again once AI is configured.',
          strengths: [], improvements: [], recommendedPracticeAreas: [], areaScores: [], questionFeedback: [],
        };

    session.status = 'completed';
    session.completedAt = new Date();

    if (!session.xpAwarded) {
      const progress = await getOrCreateProgress(tenantId, studentId);
      addXp(progress, INTERVIEW_XP, true, new Date(), 'interview');
      await progress.save();
      session.xpAwarded = INTERVIEW_XP;
    }
    await session.save();

    // Close today's mock-interview mission automatically. The member has just done the
    // work; making them walk back to the dashboard and tick a box for it is the exact
    // thing that let the box be ticked WITHOUT the work. Wrapped because a missing
    // attempt or an edited pool must not cost them the interview they just completed.
    try { await completeInterviewMissions(tenantId, studentId, new Date()); }
    catch (e: any) { console.error('[passport] interview -> mission complete:', e?.message || e); }

    // Keyed on the session, so re-finishing an already-completed interview (the
    // alreadyCompleted path returns earlier anyway) can never pay a second time.
    const coin = await awardCoins({
      tenantId, studentId, eventKey: 'interview_complete',
      idempotencyKey: `interview:${session._id}`,
      note: session.role,
    });

    /**
     * What this interview says about the member's skills (Module 14).
     *
     * ONLY THROUGH MODULE 7. The projector writes evidence rows and asks Skill DNA to
     * recompute; it never sets a skill score or a readiness figure directly. A pathway
     * interview carries no canonical skill targets and so writes nothing at all.
     *
     * Wrapped, and last. A member who has just spent fifteen minutes answering questions
     * must get their transcript, feedback, XP and coins even if scoring their evidence
     * fails — this is the least important thing on the page and the only optional one.
     */
    let interviewReadiness: any = null;
    if ((session.skillTargets || []).length) {
      try {
        const adapted = adaptPassportInterview(session as any);
        interviewReadiness = await projectInterviewToEvidence({
          tenantId, studentId,
          interviewId: String(session._id),
          questions: adapted.questions,
          dimensionScores: adapted.dimensionScores,
        });
        session.evidenceProjectedAt = new Date();
        await session.save();
      } catch (e: any) {
        console.error('[passport] interview -> skill evidence:', e?.message || e);
      }
    }

    res.json({
      session: publicSession(session), scored: !!evalResult, coins: coin.awarded,
      interviewReadiness,
    });
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

/**
 * POST /passport/interview/speak — the interviewer's line as real spoken audio.
 *
 * The browser's speechSynthesis is free but unmistakably synthetic, and a robotic voice
 * undoes the thing this feature exists to create. OpenAI TTS costs roughly a rupee an
 * interview (about 900 characters across six questions) and sounds like a person.
 *
 * The client falls back to speechSynthesis whenever this fails, so a missing key, a quota
 * problem or an outage costs realism, never the interview.
 */
export const speak = async (req: Request, res: Response) => {
  try {
    const { cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ message: 'Membership required.' });

    // Bounded because this is billed per character and the body is client-supplied.
    const text = String(req.body?.text || '').trim().slice(0, 600);
    if (!text) return res.status(400).json({ message: 'Nothing to speak.' });

    const client = getOpenAI();
    if (!client) return res.status(503).json({ message: 'Voice is not configured.' });

    // gpt-4o-mini-tts, NOT tts-1. The six tts-1 voices are all American or British —
    // there is no Indian one, so the previous version returned a genuinely human voice
    // that still sounded wrong for an Indian interviewer talking to a candidate in
    // India. Only gpt-4o-mini-tts accepts `instructions`, and that is the only lever
    // OpenAI gives for accent.
    const model = settings.getStr('INTERVIEW_TTS_MODEL', 'gpt-4o-mini-tts');
    // A male voice, because the interviewer's face is a photograph of a man.
    const voice = settings.getStr('INTERVIEW_TTS_VOICE', 'onyx');
    const instructions = settings.getStr(
      'INTERVIEW_TTS_INSTRUCTIONS',
      'Speak in natural Indian English, with the rhythm and vowels of an educated Indian professional from a city like Bengaluru or Hyderabad. ' +
      'You are a warm, calm male interviewer in his mid thirties. Speak at an unhurried, conversational pace — this is a real conversation, not a reading. ' +
      'Sound genuinely interested in the answer. Do not sound like a newsreader or an announcer.',
    );

    const speech = await client.audio.speech.create({
      model, voice: voice as any, input: text, response_format: 'mp3',
      // tts-1 rejects this field, so only send it on a model that supports it — leaving
      // the older model usable as an escape hatch from Platform Settings.
      ...(/^tts-1/.test(model) ? {} : { instructions }),
    } as any);
    const buf = Buffer.from(await speech.arrayBuffer());

    // Attributed like every other CareerPilot call, so the spend screen stays honest.
    await recordUsage({
      tenantId: tenantOf(req), module: 'careerpilot_interview_tts', product: 'careerpilot',
      provider: 'openai', model, chars: text.length,
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(buf);
  } catch (e: any) {
    console.error('[passport] interview speak:', e?.message || e);
    res.status(500).json({ message: 'Voice unavailable' });
  }
};
