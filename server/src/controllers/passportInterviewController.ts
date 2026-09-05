import { Request, Response } from 'express';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import PassportAttempt from '../models/PassportAttempt';
import PassportInterview from '../models/PassportInterview';
import { isEntitled } from '../services/passportEntitlementService';
import { processGamificationEvent, resolveRule } from '../services/gamificationEngine';
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
import {
  resolvePlanForMember, summariseEntitlement,
  ROUND_FOCUS, ROUND_AREAS, QUOTA_WINDOW_DAYS, MemberEntitlement,
} from '../services/interviewPlanService';
import { Company, CompanyMockConfig, QuestionTaxonomy, CompanyQuestion } from '../models/CompanyQuestionModels';
import { resolveCompanyProfile } from '../services/companyFitService';
import * as bunny from '../services/bunnyStorageService';
import fs from 'fs';
import crypto from 'crypto';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

// What finishing an interview pays now lives in Module 11's event catalogue, as
// MOCK_INTERVIEW_COMPLETED's default. Keeping a copy of the number here would be a second
// source of truth that nothing reads and nobody would notice drifting.
// Cost scales linearly with turns: every turn re-sends the history window and pays for a
// completion. Six is a real interview; the lever exists here if it ever needs trimming.
const MAX_QUESTIONS = 6;
/**
 * `mode=intro` — the short self-introduction round the daily mission asks for.
 *
 * The mission said "a 2-minute self-intro round" while the only thing the product could
 * start was a six-question role interview, so the member was promised one sitting and given
 * a different, much longer one. Two questions is the intro plus one follow-up, which is what
 * two minutes actually holds.
 */
const INTRO_QUESTIONS = 1;
/**
 * The wall-clock cap for an intro round. The mission says two minutes, so two minutes is
 * what it runs — the sitting ends itself rather than relying on the member to stop.
 */
const INTRO_LIMIT_SEC = 120;
/**
 * After this, an `in_progress` session is abandoned in fact whatever the row says — nobody
 * returns to a mock interview the next day. Without this the one-live-session lock turns a
 * single forgotten sitting into a permanent block on ever starting another.
 */
const STALE_LIVE_HOURS = 6;
/**
 * How long a session recording is kept before the retention sweep deletes it from Bunny.
 * This is a student's face and voice, so it expires on a schedule rather than living
 * forever by default.
 */
const RECORDING_RETENTION_DAYS = 365;
/** Refuse anything larger rather than streaming it to Bunny and paying for it. */
const MAX_RECORDING_BYTES = 200 * 1024 * 1024;
const INTRO_FOCUS = 'a two-minute self-introduction — who they are, what they are studying or working on, and what role they are aiming for';
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

/**
 * The statuses that mean "this member already has an interview open".
 *
 * `finalizing` is one of them. A member who hits finish and immediately asks for a new
 * interview would otherwise open a second one while the first is still being graded, and end
 * up with two sessions where they meant to have one. Kept next to the model's `live` flag —
 * the two describe the same set and must not drift apart.
 */
const LIVE_STATUSES = ['in_progress', 'finalizing'];

const findLiveSession = (tenantId: string, studentId: string) =>
  PassportInterview.findOne({ tenantId, studentId, status: { $in: LIVE_STATUSES } });

/** MongoDB's duplicate-key error, however the driver happens to have wrapped it. */
const isDuplicateKey = (e: any): boolean =>
  e?.code === 11000 || e?.cause?.code === 11000 || /E11000/.test(String(e?.message || ''));

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

const audienceOf = (user: any) => ({
  yearOfStudy:   user?.passport?.yearOfStudy,
  degree:        user?.passport?.degree,
  program:       user?.passport?.program,
  branch:        user?.passport?.branch,
  primaryRole:   user?.passport?.primaryRole,
  secondaryRole: user?.passport?.secondaryRole,
  stage:         user?.passport?.stage,
});

/**
 * What this member's plan gives them, and what is left of it.
 *
 * ONE FUNCTION FOR BOTH THE SCREEN AND THE GATE. The list endpoint shows "2 of 4 left" and
 * start() refuses the fifth — if those were computed separately they would eventually
 * disagree, and the member would be told they had an interview left and then denied it.
 */
async function entitlementFor(tenantId: string, studentId: string, user: any): Promise<MemberEntitlement> {
  const since = new Date(Date.now() - QUOTA_WINDOW_DAYS * 86400_000);
  const [resolved, sittings] = await Promise.all([
    resolvePlanForMember(tenantId, audienceOf(user)),
    PassportInterview.find({ tenantId, studentId, createdAt: { $gte: since } })
      .select('planRoundKey createdAt transcript.role').lean(),
  ]);
  return summariseEntitlement(
    resolved,
    (sittings as any[]).map(s => ({
      planRoundKey: s.planRoundKey,
      createdAt: s.createdAt,
      engaged: (s.transcript || []).some((t: any) => t.role === 'candidate'),
    })),
  );
}

const publicSession = (s: any) => ({
  id: String(s._id), role: s.role, areas: s.areas,
  interviewerName: s.interviewerName, maxQuestions: s.maxQuestions,
  // What this sitting was CALLED when it was sat. Read from the row rather than resolved
  // from the plan, so a renamed round does not retitle a member's interview history.
  planRoundKey: s.planRoundKey || null,
  planRoundLabel: s.planRoundLabel || null,
  askedCount: s.askedCount, status: s.status,
  companySlug: s.companySlug || null, companyName: s.companyName || null,
  transcript: (s.transcript || []).map((t: any) => ({ role: t.role, text: t.text, at: t.at })),
  evaluation: s.evaluation || null,
  xpAwarded: s.xpAwarded, startedAt: s.startedAt, completedAt: s.completedAt,
  // Presence only. The key is a path into a private bucket and never leaves the server.
  hasRecording: !!s.recordingKey,
  timeLimitSec: s.timeLimitSec ?? null,
  recordingDurationSec: s.recordingDurationSec || null,
});

/** GET /passport/interview — past sessions + whether one is still open. */
export const list = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, user, cfg, entitled } = await gate(req);
    if (!entitled) return res.json({ locked: true, priceInr: cfg?.priceInr ?? 499 });

    const [sessions, entitlement] = await Promise.all([
      PassportInterview.find({ tenantId, studentId }).sort({ createdAt: -1 }).limit(20).lean(),
      entitlementFor(tenantId, studentId, user),
    ]);
    const open = sessions.find((s: any) => s.status === 'in_progress');
    res.json({
      locked: false,
      aiAvailable: isInterviewAIEnabled(),
      sessions: sessions.map(publicSession),
      openSessionId: open ? String((open as any)._id) : null,
      // What the member has been given and what is left of it. The screen builds one card
      // per round from this, so an admin's plan is visible to the student it was written for.
      entitlement,
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

    /**
     * Only one live session at a time — resume it instead of stacking sessions.
     *
     * This read is the fast path, not the guarantee. It answers "does this member already
     * have an interview open", which is the right question for the ordinary case of somebody
     * coming back to a half-finished sitting. It cannot answer "is somebody opening one right
     * now", because between this line and the insert below there is an AI call and two
     * simultaneous requests both get here having seen nothing. The database settles that —
     * see the create below.
     */
    const wantMode = String(req.body?.mode || '');
    const wantCompany = String(req.body?.companySlug || '');
    const wantRound = String(req.body?.round || '');

    const existing = await findLiveSession(tenantId, studentId);
    if (existing) {
      /**
       * Resuming is right for somebody coming back to a half-finished sitting. It is WRONG
       * when the live session is not the sitting that was asked for — which is what a
       * mission link does. "Record a self-introduction" opened ?mode=intro and was handed a
       * fifteen-day-old generic six-question interview instead, because this fast path
       * returned before the mode was ever read. The member asked for one thing and got
       * another, with no way to tell that had happened.
       *
       * So the live session only wins when it is BOTH current and the thing being asked for.
       */
      const startedAt = new Date((existing as any).startedAt || (existing as any).createdAt || Date.now());
      const stale = Date.now() - startedAt.getTime() > STALE_LIVE_HOURS * 3600_000;
      const engaged = ((existing as any).transcript || []).some((t: any) => t.role === 'candidate');
      /**
       * A plan round is its OWN mode, checked before `focus`.
       *
       * Round sittings set `focus` too — it is how a round is pinned to its type — so
       * without this line every technical round would report itself as `intro`, and a daily
       * mission asking for a self-introduction would resume a live technical round believing
       * it had found one.
       */
      const liveMode = (existing as any).planRoundKey ? 'round'
        : (existing as any).focus ? 'intro'
        : ((existing as any).skillTargets?.length ? 'role' : '');
      const mismatched = (!!wantMode && wantMode !== liveMode)
        || (!!wantCompany && wantCompany !== ((existing as any).companySlug || ''))
        // Same reasoning as the mode check above: tapping the HR card and being handed a
        // half-finished technical round is the member asking for one thing and getting
        // another. The round is part of what was requested, so it belongs in the comparison.
        || (!!wantRound && wantRound !== ((existing as any).planRoundKey || ''));

      /**
       * Discarded only when nothing would be lost: a sitting older than STALE_LIVE_HOURS is
       * abandoned in fact whatever its status says, and one the member never answered has
       * nothing in it to come back to. A session they actually engaged with today is kept
       * and resumed — but `mismatched` tells the client it is not the round that was
       * requested, so the screen can say so instead of quietly running the wrong interview.
       */
      if (stale || (mismatched && !engaged)) {
        await PassportInterview.updateOne(
          { _id: (existing as any)._id },
          { $set: { status: 'abandoned', finalizeToken: null, finalizingAt: null, live: false } },
        );
      } else {
        return res.json({
          session: publicSession(existing),
          resumed: true,
          finalizing: existing.status === 'finalizing',
          mismatched: mismatched || undefined,
        });
      }
    }

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
    /**
     * Provenance for a company sitting, recorded at start and read by nothing that scores.
     *
     * The round comes from the company's own mock configuration rather than the request:
     * a member choosing which round they are being interviewed for could choose the easy one.
     */
    let roundKey: string | null = null;
    let companyProfileVersion: number | null = null;
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
        roundKey = cfg2?.interview?.rounds?.[0] || null;
        // The member's stored role, already loaded by the gate — not a second context read
        // on a path that is otherwise three queries and an AI call.
        const { profile } = await resolveCompanyProfile(tenantId, slug, user?.passport?.primaryRole || '');
        companyProfileVersion = profile?.version ?? null;
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

    /**
     * Intro mode — one short sitting pinned to the self-introduction.
     *
     * Mutually exclusive with a company mock for the same reason role mode is: a company
     * round and a two-question intro are different sittings, and merging them would grade
     * an employer's emphasis against an interview that never asked about it.
     */
    const introMode = String(req.body?.mode || '') === 'intro' && !companyBrief;
    let maxQuestions = MAX_QUESTIONS;
    let timeLimitSec: number | null = null;
    if (introMode) {
      areas = ['Self-introduction', 'Communication'];
      // ONE question. The member is asked to introduce themselves and that is the whole
      // round — a follow-up turns a two-minute intro into a conversation, which is the
      // longer sitting this mode exists to avoid.
      maxQuestions = INTRO_QUESTIONS;
      timeLimitSec = INTRO_LIMIT_SEC;
    }

    /**
     * The member's plan — the shape of this sitting, and whether they may sit it at all.
     *
     * Resolved on EVERY start, not only when a round was named, because the quota applies to
     * the whole product: a member with four interviews a month has four, whether they spend
     * them on their own plan's rounds or on company mocks.
     */
    const ent = await entitlementFor(tenantId, studentId, user);
    let planRound: (typeof ent.rounds)[number] | null = null;
    if (wantRound) {
      planRound = ent.rounds.find(r => r.key === wantRound) || null;
      if (!planRound) {
        return res.status(400).json({
          message: 'That interview is not part of your plan any more. Refresh and pick one of the rounds shown.',
        });
      }
    }

    /**
     * The quota gate. BEFORE the AI call below, or a refused start still bills a turn.
     *
     * THE MISSION-DRIVEN INTRO IS COUNTED BUT NEVER BLOCKED. A daily mission tells the member
     * to record a two-minute self-introduction; a product that sets that task and then refuses
     * to let them do it is broken in a way no quota setting justifies. It still consumes an
     * attempt, so the allowance stays honest — it just cannot be the thing that stops a
     * member completing work the product asked of them.
     */
    if (!ent.canStart && !introMode) {
      return res.status(429).json({
        message: ent.blockedReason,
        quota: {
          perThirtyDays: ent.perThirtyDays, used: ent.used, remaining: ent.remaining,
          nextAvailableAt: ent.nextAvailableAt, windowResetsAt: ent.windowResetsAt,
        },
      });
    }

    /**
     * A round replaces the shape, and for HR and communication it replaces the topics too.
     *
     * A technical round KEEPS whatever was resolved above — the role blueprint's canonical
     * skills, a company's emphasis, or the pathway preset — because that resolution is the
     * only reason its answers can become skill evidence. The other two must not inherit it:
     * grading "Spring Boot" against a question about handling a setback would write evidence
     * for a skill nobody asked about, which is the one thing Module 14 must never do. Hence
     * the skillTargets are dropped with the areas.
     */
    if (planRound) {
      maxQuestions = planRound.questions;
      timeLimitSec = planRound.minutes * 60;
      if (planRound.type !== 'technical') {
        areas = ROUND_AREAS[planRound.type];
        skillTargets = [];
      }
    }

    const first = await nextInterviewerTurn({
      interviewerName: interviewerName(), role, areas,
      history: [], askedCount: 0, maxQuestions,
      candidateName: user?.firstName || '', historyWindow: HISTORY_WINDOW,
      tenantId, product: PRODUCT, company: companyBrief,
      // A round is pinned to its type the same way the intro round is pinned to its subject,
      // so an "HR" card cannot open on a technical question.
      focus: planRound ? ROUND_FOCUS[planRound.type] : introMode ? INTRO_FOCUS : undefined,
    });

    /**
     * The insert IS the lock.
     *
     * `live: true` puts this document into the partial unique index on (tenantId, studentId),
     * so of any number of simultaneous starts exactly one insert survives — MongoDB decides,
     * in the same operation that writes the row, which is the part the read above cannot do.
     *
     * The loser is not an error. Its member asked for an interview and there is one: the
     * winner's, which is the very interview they would have got had their two clicks arrived
     * a second apart. So it reads the winner back and returns it as `resumed`, exactly as the
     * fast path above would have.
     *
     * TWO ATTEMPTS, AND NO MORE. The winner is normally still live when we look, so the first
     * catch returns it. Only if that winner ALSO reached a terminal status in the microseconds
     * since does the slot fall open again, and the second attempt takes it. A third collision
     * would need yet another racer to both win and finish inside the same window; at that
     * point the member is better served by being told to try again than by a loop.
     */
    const insert = () => PassportInterview.create({
      tenantId, studentId, role, areas, skillTargets,
      companySlug: companyBrief ? slug : undefined,
      companyName: companyBrief?.name,
      roundKey, companyProfileVersion,
      interviewerName: interviewerName(), maxQuestions,
      focus: planRound ? ROUND_FOCUS[planRound.type] : introMode ? INTRO_FOCUS : null,
      timeLimitSec, askedCount: 1,
      // Provenance, copied rather than looked up: the label is what this member was told
      // they were sitting, and it must survive an admin renaming the round tomorrow.
      planId: ent.planId || null,
      planRoundKey: planRound?.key || null,
      planRoundLabel: planRound ? (planRound.label || planRound.title) : null,
      status: 'in_progress',
      live: true,
      transcript: [{ role: 'interviewer', text: first.say, at: new Date() }],
    });

    let session: any = null;
    for (let attempt = 0; attempt < 2 && !session; attempt += 1) {
      try {
        session = await insert();
      } catch (e: any) {
        if (!isDuplicateKey(e)) throw e;
        const winner = await findLiveSession(tenantId, studentId);
        // The same shape the fast path above returns, because it is the same answer: here is
        // your live interview. Nothing downstream should be able to tell which path it took.
        if (winner) {
          return res.json({
            session: publicSession(winner),
            resumed: true,
            finalizing: winner.status === 'finalizing',
          });
        }
      }
    }

    if (!session) {
      return res.status(409).json({ message: 'Another interview was just opened. Please try again.' });
    }

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
      // Keep a single-purpose round on its one subject for every turn, not just the opener.
      focus: session.focus || undefined,
      // On a capped round the interviewer needs to know the clock, or it will open a fresh
      // question with twenty seconds left and be cut off mid-thought by the auto-finish.
      timeLeftSeconds: session.timeLimitSec
        ? Math.max(0, session.timeLimitSec - Math.round((Date.now() - new Date(session.startedAt || (session as any).createdAt).getTime()) / 1000))
        : undefined,
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

/**
 * How long a finalization claim is trusted before another request may take it over.
 *
 * Long enough that a slow AI evaluation is never mistaken for a dead process — the call
 * usually returns in seconds and the gateway gives up well before this. Short enough that a
 * member whose server was killed mid-grading is not locked out of their own interview for
 * the rest of the day.
 */
const FINALIZE_STALE_MS = 3 * 60 * 1000;

/** A fresh owner identity per claim. Never reused, so a zombie can always be told apart. */
const newFinalizeToken = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * POST /passport/interview/:id/finish — grade the transcript, once.
 *
 * WHY THIS IS NOT read → evaluate → save. Grading needs an AI call, so finalization cannot
 * be a single atomic write. Two clicks, a retry after a timeout, or a client that fires the
 * request twice would each load the same in_progress session, both see it as unfinished, and
 * both run the whole tail: two evaluations, two lots of XP, a mission closed twice.
 * `status === 'completed'` checked in application memory is a sequential guard, not a
 * concurrency one.
 *
 * SO THE DATABASE DECIDES THE OWNER. One conditional update moves the session out of
 * `in_progress`, and MongoDB guarantees exactly one caller matches. That request evaluates
 * and writes the result; every other request observes the claim rather than racing it.
 *
 * AND A DEAD OWNER CANNOT STRAND THE INTERVIEW. A claim older than FINALIZE_STALE_MS may be
 * taken over — atomically, so the takeover has exactly one winner too. The claim carries a
 * token and the final write is conditioned on it, so an owner that stalled past the window
 * and then woke up cannot overwrite the result its successor already stored.
 *
 * EVERY SIDE EFFECT INHERITS THIS. XP, coins, mission closure and skill evidence are each
 * independently idempotent, but they are also only ever reached by the one request holding
 * the claim — belt and braces, because several of them are shared with older code paths
 * whose own guarantees are only sequential.
 */
/**
 * POST /passport/interview/:id/recording — store the session video.
 *
 * Uploaded once at the END of the sitting rather than streamed live: a mock interview is a
 * few minutes, and one PUT that either works or does not is far easier to reason about than
 * a chunked session that can half-fail and leave an unplayable file on the bill.
 *
 * A failure here must never cost the member their interview. The transcript, the score, the
 * XP and the streak are all already saved by finish(); the recording is an extra. So this is
 * a separate call the client makes after finishing, and every error path leaves the graded
 * session exactly as it was.
 */
export const uploadRecording = async (req: Request, res: Response) => {
  const file = (req as any).file;
  const cleanup = () => { if (file?.path) { try { fs.unlinkSync(file.path); } catch { /* gone */ } } };
  try {
    const { tenantId, studentId, entitled } = await gate(req);
    if (!entitled) { cleanup(); return res.status(403).json({ message: 'Membership required.' }); }
    if (!file) return res.status(400).json({ message: 'No recording received.' });
    if (file.size > MAX_RECORDING_BYTES) { cleanup(); return res.status(413).json({ message: 'That recording is too large to store.' }); }
    if (!bunny.isBunnyStorageConfigured()) {
      // Said plainly rather than swallowed: without this the feature looks like it works and
      // silently keeps nothing, which is worse than not offering it.
      cleanup();
      return res.status(503).json({ message: 'Recording storage is not configured on this tenant.' });
    }

    // Ownership is the whole access check — scoping the query by studentId means a member
    // cannot attach a recording to somebody else's interview by guessing an id.
    const session = await PassportInterview.findOne({ _id: req.params.id, tenantId, studentId });
    if (!session) { cleanup(); return res.status(404).json({ message: 'Interview not found.' }); }
    if ((session as any).recordingKey) { cleanup(); return res.status(409).json({ message: 'This interview already has a recording.' }); }

    const key = `careerpilot/interviews/${tenantId}/${studentId}/${session._id}-${crypto.randomBytes(4).toString('hex')}.webm`;
    await bunny.uploadStream(key, fs.createReadStream(file.path), file.mimetype || 'video/webm', file.size);
    cleanup();

    const durationSec = Math.max(0, Math.round(Number(req.body?.durationSec) || 0)) || null;
    await PassportInterview.updateOne({ _id: session._id }, {
      $set: {
        recordingKey: key,
        recordingMime: file.mimetype || 'video/webm',
        recordingBytes: file.size,
        recordingDurationSec: durationSec,
        recordingExpiresAt: new Date(Date.now() + RECORDING_RETENTION_DAYS * 86400_000),
      },
    });

    res.json({ ok: true, durationSec, bytes: file.size });
  } catch (e: any) {
    cleanup();
    console.error('[passport] interview recording upload:', e);
    res.status(500).json({ message: e.message || 'Could not save the recording.' });
  }
};

/**
 * GET /passport/interview/:id/recording — stream it back through the app.
 *
 * Gated rather than served from a CDN URL. The bucket is private and the key never leaves
 * the server, so the only way to watch a recording is to be the member it belongs to.
 */
export const playRecording = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    const session = await PassportInterview.findOne({ _id: req.params.id, tenantId, studentId })
      .select('recordingKey recordingMime').lean() as any;
    if (!session?.recordingKey) return res.status(404).json({ message: 'No recording for this interview.' });

    const { stream, size } = await bunny.getFileStream(session.recordingKey);
    res.setHeader('Content-Type', session.recordingMime || 'video/webm');
    if (size != null) res.setHeader('Content-Length', String(size));
    // Private media: never let a shared cache hold a student's face.
    res.setHeader('Cache-Control', 'private, no-store');
    stream.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
    stream.pipe(res);
  } catch (e: any) {
    console.error('[passport] interview recording play:', e);
    if (!res.headersSent) res.status(500).json({ message: e.message || 'Could not load the recording.' });
  }
};

export const finish = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required.' });

    const id = req.params.id;
    const now = new Date();
    const token = newFinalizeToken();

    /**
     * The claim.
     *
     * `status: 'in_progress'` in the FILTER is the whole mechanism. Of any number of
     * simultaneous finish requests, exactly one update matches a document that is still
     * in progress; the rest match nothing and fall through to read what happened.
     */
    let session: any = await PassportInterview.findOneAndUpdate(
      { _id: id, tenantId, studentId, status: 'in_progress' },
      { $set: { status: 'finalizing', finalizeToken: token, finalizingAt: now } },
      { new: true },
    );

    if (!session) {
      // We did not get the claim. Either this interview is finished, somebody else is
      // finishing it, or it does not exist. Read it and answer honestly.
      const current: any = await PassportInterview.findOne({ _id: id, tenantId, studentId });
      if (!current) return res.status(404).json({ message: 'Interview not found' });

      // The retry case, and the common one: return what was stored rather than doing any
      // of it again.
      if (current.status === 'completed') {
        return res.json({ session: publicSession(current), alreadyCompleted: true });
      }
      if (current.status === 'abandoned') {
        return res.json({ session: publicSession(current), message: 'Interview closed — no answers were given.' });
      }

      /**
       * Somebody else holds the claim. If it is fresh, say so and let the client ask again
       * in a moment; grading takes seconds, not minutes.
       *
       * If it is stale, the process that took it is not coming back — so take it over,
       * again with a conditional update, so a stampede of retries still produces one owner.
       * This is the crash-recovery path, and it needs no operator intervention.
       */
      const staleBefore = new Date(now.getTime() - FINALIZE_STALE_MS);
      const reclaimed: any = await PassportInterview.findOneAndUpdate(
        {
          _id: id, tenantId, studentId, status: 'finalizing',
          $or: [{ finalizingAt: { $lte: staleBefore } }, { finalizingAt: null }],
        },
        { $set: { finalizeToken: token, finalizingAt: now } },
        { new: true },
      );

      if (!reclaimed) {
        return res.status(202).json({
          finalizing: true,
          session: publicSession(current),
          message: 'We are still grading this interview. Give it a few seconds.',
        });
      }
      session = reclaimed;
    }

    /**
     * Nothing was said, so there is nothing to grade.
     *
     * Conditioned on our token like every other write here: if our claim was taken over
     * while we were deciding, the new owner is authoritative and we return what it stored.
     */
    const answered = session.transcript.filter((t: any) => t.role === 'candidate').length;
    if (answered === 0) {
      const closed = await PassportInterview.findOneAndUpdate(
        { _id: id, status: 'finalizing', finalizeToken: token },
        // `live: false` releases the one-live-interview lock. It rides with the status
        // change, in the same atomic write, because the two must never disagree: a sitting
        // left live after reaching a terminal status locks its member out for good.
        { $set: { status: 'abandoned', finalizeToken: null, finalizingAt: null, live: false } },
        { new: true },
      );
      const out: any = closed || await PassportInterview.findOne({ _id: id, tenantId, studentId });
      return res.json({ session: publicSession(out), message: 'Interview closed — no answers were given.' });
    }

    const evalResult = await evaluateTranscript({
      role: session.role,
      areas: session.areas.map((a: string) => ({ title: a, type: 'mixed' })),
      transcript: session.transcript.map((t: any) => ({ role: t.role, text: t.text })),
      tenantId, product: PRODUCT,
    });

    const evaluation = evalResult
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

    /**
     * Completion XP, through Module 11.
     *
     * The ledger's unique (tenantId, studentId, idempotencyKey) index is the durable
     * guarantee: the key names the EVENT — this interview — so a replay writes nothing and
     * is refused as a duplicate. The legacy in-memory `addXp` had no such record and would
     * happily pay twice for two loads of the same document.
     *
     * The amount is unchanged. MOCK_INTERVIEW_COMPLETED's default is the 60 this controller
     * already paid, uncapped and streak-qualifying exactly as before, so nobody's XP moves
     * because of this fix.
     */
    const xp = await processGamificationEvent({
      tenantId, studentId,
      eventKey: 'MOCK_INTERVIEW_COMPLETED',
      sourceType: 'interview',
      sourceId: String(session._id),
      now,
    });

    /**
     * What to record as this interview's XP when the ledger refused a replay.
     *
     * A duplicate means an earlier attempt already paid; if it died before storing the
     * amount, reading the configured rule reports what was actually paid rather than
     * guessing from a constant that an admin may since have re-priced.
     */
    let xpAwarded = xp.awarded;
    if (!xpAwarded && xp.refused === 'duplicate') {
      const rule = await resolveRule(tenantId, 'MOCK_INTERVIEW_COMPLETED');
      xpAwarded = rule?.xp || 0;
    }

    /**
     * The one write that ends the finalization.
     *
     * Conditioned on our token: if a slow evaluation ran past the stale window and another
     * request took the claim over, this matches nothing and we discard our result instead of
     * overwriting theirs. Last writer must not win.
     */
    const saved = await PassportInterview.findOneAndUpdate(
      { _id: id, status: 'finalizing', finalizeToken: token },
      {
        $set: {
          evaluation,
          status: 'completed',
          completedAt: now,
          xpAwarded,
          finalizeToken: null,
          finalizingAt: null,
          // Releases the one-live-interview lock, in the same write that ends the sitting.
          live: false,
        },
      },
      { new: true },
    );

    if (!saved) {
      // Our claim was taken over mid-grading. Somebody else owns the outcome.
      const current: any = await PassportInterview.findOne({ _id: id, tenantId, studentId });
      return res.json({ session: publicSession(current), alreadyCompleted: true });
    }

    // Close today's mock-interview mission automatically. The member has just done the
    // work; making them walk back to the dashboard and tick a box for it is the exact
    // thing that let the box be ticked WITHOUT the work. Wrapped because a missing
    // attempt or an edited pool must not cost them the interview they just completed.
    try { await completeInterviewMissions(tenantId, studentId, now); }
    catch (e: any) { console.error('[passport] interview -> mission complete:', e?.message || e); }

    // Keyed on the session, so a replay can never pay a second time.
    const coin = await awardCoins({
      tenantId, studentId, eventKey: 'interview_complete',
      idempotencyKey: `interview:${saved._id}`,
      note: saved.role,
    });

    /**
     * What this interview says about the member's skills (Module 14).
     *
     * ONLY THROUGH MODULE 7. The projector writes evidence rows and asks Skill DNA to
     * recompute; it never sets a skill score or a readiness figure directly. A pathway
     * interview carries no canonical skill targets and so writes nothing at all.
     *
     * `evidenceProjectedAt` is the marker for a projection that fully succeeded. A run that
     * wrote rows and then died leaves it unset, so a later recovery run recomputes Skill DNA
     * even though its evidence rows are all duplicates — the rows alone do not move a score.
     *
     * Wrapped, and last. A member who has just spent fifteen minutes answering questions
     * must get their transcript, feedback, XP and coins even if scoring their evidence
     * fails — this is the least important thing on the page and the only optional one.
     */
    let interviewReadiness: any = null;
    if ((saved.skillTargets || []).length) {
      try {
        const adapted = adaptPassportInterview(saved as any);
        interviewReadiness = await projectInterviewToEvidence({
          tenantId, studentId,
          interviewId: String(saved._id),
          questions: adapted.questions,
          dimensionScores: adapted.dimensionScores,
          // Nothing new to write does not mean nothing to recompute, if the run that wrote
          // the rows never got as far as recomputing.
          forceRecompute: !saved.evidenceProjectedAt,
          now,
        });
        await PassportInterview.updateOne({ _id: saved._id }, { $set: { evidenceProjectedAt: new Date() } });
      } catch (e: any) {
        console.error('[passport] interview -> skill evidence:', e?.message || e);
      }
    }

    res.json({
      session: publicSession(saved), scored: !!evalResult, coins: coin.awarded,
      xpAwarded, interviewReadiness,
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
      tenantId: tenantOf(req), studentId: userIdOf(req),
      module: 'careerpilot_interview_tts', product: 'careerpilot',
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
