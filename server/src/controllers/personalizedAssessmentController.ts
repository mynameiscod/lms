import { Request, Response } from 'express';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import {
  resolvePersonalizedAssessmentContext, buildPersonalizedAssessment,
  getPersonalizedAssessmentAvailability,
} from '../services/personalizedAssessmentService';
import { loadItems, refKey } from '../services/skillEvidenceSourceRegistry';
import { hashSeed, rng, shuffle } from '../services/paperBuilderService';

/**
 * Present the choices in a different order per attempt, WITHOUT moving their ids.
 *
 * The generator's prompt listed the correct answer first, so 189 of 196 drafted questions
 * had their answer at option A. A student who always picked A scored around 96%, and a 100%
 * score means no measured gaps — which quietly empties the roadmap, the Skill DNA and every
 * readiness figure built on them.
 *
 * Generation is fixed, but these questions store options as plain `{text, isCorrect}` with
 * no `_id`, so the id a student answers with IS the array position. Reordering the stored
 * rows would therefore change what each answer means and invalidate anything already
 * recorded. Shuffling the PRESENTED order while each option keeps its original id fixes
 * every existing question at once and leaves grading untouched.
 *
 * Seeded on the attempt, so a reload shows the same order — a reshuffle mid-question reads
 * as the paper changing underneath you.
 */
const presentOptions = (options: any[] | undefined, seed: string): any[] | undefined => {
  if (!Array.isArray(options) || options.length < 2) return options;
  return shuffle(options.slice(), rng(hashSeed(seed)));
};
import { policyForStage, ASSESSMENT_POLICIES } from '../data/assessmentPolicies';
import { getCareerContext } from '../services/careerContextService';

/**
 * Starting a personalised CareerPilot assessment.
 *
 * ADDITIVE. The existing assessment flow is untouched and still serves every student who
 * uses it; this is a separate endpoint, so incomplete skill-evidence mapping can never
 * break a working exam. Nothing here changes scoring, roadmaps, missions or any student
 * record beyond creating the attempt itself.
 *
 * THE STUDENT DECIDES NOTHING ABOUT THEIR OWN PAPER. Role, stage, skills, counts,
 * difficulty and the questions themselves are all resolved server-side from Module 1's
 * context. A request that could name its own role would let somebody sit an easier paper
 * whose score was still presented as comparable.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/**
 * What a student is allowed to see.
 *
 * Correct answers, hidden tests and expected output are never included — the item text
 * comes from the content's own record, and everything else is metadata about the slot.
 * The seed, the unused pools and the other candidates are all withheld: between them they
 * would let somebody reconstruct another student's paper.
 */
const studentShape = (a: any, texts: Map<string, any>) => {
  // Answers already saved, so a resumed paper comes back filled in. Keyed the same way the
  // grader matches them, which is also how the client addresses a question.
  const saved = new Map<string, any>(
    (a.answers || []).map((x: any) => [refKey(x.sourceType, x.sourceId), x.response]),
  );

  return {
    id: String(a._id),
    attemptNumber: a.attemptNumber,
    status: a.status,
    startedAt: a.startedAt,
    totalQuestions: a.items.length,
    /**
     * The clock, if this stage has one. `startedAt` is the server's, so a reload resumes
     * with the time actually remaining rather than a fresh countdown — the obvious way to
     * get unlimited time otherwise.
     */
    timeLimitMinutes: a.timeLimitMinutes || 0,
    secondsRemaining: a.timeLimitMinutes
      ? Math.max(0, Math.round((new Date(a.startedAt).getTime() + a.timeLimitMinutes * 60_000 - Date.now()) / 1000))
      : null,
    items: (a.items || []).slice().sort((x: any, y: any) => x.order - y.order).map((i: any) => {
      const key = refKey(i.sourceType, i.sourceId);
      const src = texts.get(key);
      return {
        order: i.order,
        sourceType: i.sourceType,
        sourceId: i.sourceId,
        text: src?.text || '',
        itemType: src?.itemType || 'mcq',
        // The code the question is about. Without it "which line has the bug?" is
        // unanswerable, which is exactly how it reached students.
        codeSnippet: src?.codeSnippet,
        language: src?.language,
        // Choices only — the key stays on the server. See NormalisedOption.
        // Order varies per attempt and question; each option keeps the id it is graded by.
        options: presentOptions(src?.options, `${String(a._id)}:${key}`),
        points: i.points,
        response: saved.has(key) ? saved.get(key) : undefined,
      };
    }),
  };
};

/**
 * POST /passport/me/assessment/personalized/start
 *
 * Idempotent. An open attempt is RETURNED rather than replaced, so a double-clicked button
 * or a retried request after a dropped connection cannot cost somebody the answers they
 * have already given.
 */
export const startPersonalizedAssessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    /**
     * A daily plan item asks for ONE skill.
     *
     * "Database Fundamentals — Check, 15 min" used to open this endpoint bare, which builds
     * a paper across every skill in the role blueprint — so the member was told they were
     * confirming one score and handed a full twenty-question role assessment measuring
     * everything. The skill was never carried, so it could not have done anything else.
     */
    const wantSkill = String(req.body?.skillKey || '').trim();

    const open = await PersonalizedAssessment.findOne({ tenantId, studentId, status: 'IN_PROGRESS' }).lean() as any;
    if (open) {
      /**
       * Resume only what was actually asked for.
       *
       * There is one open paper per member (partial unique index), so without this a member
       * mid-way through a full assessment who clicks a daily skill check is silently handed
       * the full paper back — the same substitution this change exists to remove. A paper
       * they have not answered has nothing worth keeping, so it gives way; one they have
       * started is kept and the client is told it is not the check they asked for.
       */
      const openSkills: string[] = open.purpose === 'SKILL_CHECK' ? (open.targetSkillKeys || []) : [];
      const matches = wantSkill
        ? (openSkills.length === 1 && openSkills[0] === wantSkill)
        : open.purpose !== 'SKILL_CHECK';
      const answered = (open.answers || []).some(
        (a: any) => a?.response !== undefined && a?.response !== null && a?.response !== '',
      );

      if (matches || answered) {
        const texts = await loadItems(tenantId, open.items.map((i: any) => ({ sourceType: i.sourceType, sourceId: i.sourceId })));
        return res.json({ assessment: studentShape(open, texts), resumed: true, mismatched: !matches || undefined });
      }
      // Untouched and not what was requested — release the slot and build the right paper.
      // updateOne rather than a loaded document: this read stays lean so it costs one
      // projection, and abandoning is a single field write with nothing to validate.
      await PersonalizedAssessment.updateOne({ _id: open._id }, { $set: { status: 'ABANDONED' } });
    }

    const ctx = await resolvePersonalizedAssessmentContext(tenantId, studentId);
    if (!ctx.ok) {
      /**
       * The reason travels with the message.
       *
       * It was resolved and then dropped, so the screen could only show a sentence. Some of
       * these refusals are things the member can fix — CONTEXT_INCOMPLETE means "finish
       * setup", which is one click away — and without the code the client would have to
       * match on the message text to know that, which breaks the moment the wording
       * changes. The code names no internal data and is safe to send.
       */
      return res.status(400).json({ message: ctx.message, reasonCode: ctx.reasonCode });
    }

    const prior = await PersonalizedAssessment.find({ tenantId, studentId })
      .select('attemptNumber items').sort({ attemptNumber: -1 }).lean() as any[];
    const attemptNumber = (prior[0]?.attemptNumber || 0) + 1;
    const seen = prior.flatMap((p: any) => (p.items || []).map((i: any) => i.sourceId));

    /**
     * The narrowing — the same lever a reassessment uses, aimed at one skill.
     *
     * Validated against the role's own skills rather than trusted: a key the blueprint does
     * not contain would generate an empty paper, and the member would meet a coverage
     * failure they cannot act on. An unknown key falls back to the full paper, which is the
     * behaviour that existed before and is never worse than an error.
     */
    const scopedSkill = wantSkill && (ctx.roleSkillKeys || []).includes(wantSkill) ? wantSkill : '';

    // Built in full BEFORE anything is written. A half-generated attempt would be a paper
    // that quietly measures less than its peers, and the score would not show it.
    const built = await buildPersonalizedAssessment({
      tenantId, studentId,
      stage: ctx.stage!, roleKey: ctx.roleKey!,
      roleSkillKeys: scopedSkill ? [scopedSkill] : ctx.roleSkillKeys!,
      // The member's own role, year and course — so a question an admin aimed at, say,
      // 2nd-year CSE backend students reaches exactly them, and untagged questions still
      // reach everybody.
      audience: (ctx as any).audience,
      blueprintVersion: ctx.blueprintVersion!,
      attemptNumber,
      seenSourceIds: seen,
      policy: ctx.policy,
    });

    if (!built.ok) {
      /**
       * A coverage failure is OUR configuration problem, not the student's.
       *
       * The comment here used to claim it exposed nothing internal while returning
       * `shortfalls` — which is a list of internal skill keys and difficulty bands. No
       * student surface reads it, so it was leaking the data model to the browser for
       * nobody's benefit. The member gets the member-facing message and nothing else.
       *
       * The diagnostic is not lost: it is logged for whoever has to fix it, and the admin
       * preview screen returns it in full.
       */
      console.warn('[personalized-assessment] generation blocked for', studentId, '-', built.adminMessage || built.message);
      return res.status(409).json({ message: built.message });
    }

    let created: any;
    try {
      created = await PersonalizedAssessment.create({
        tenantId, studentId, attemptNumber, status: 'IN_PROGRESS',
        /**
         * Recorded as its own kind, NOT as a reassessment. A check-in carries a cooldown,
         * freezes before/after snapshots and re-measures a ranked set of skills; none of
         * that should follow from working through today's plan.
         *
         * Skill DNA still updates correctly and only for this skill — the projection writes
         * exactly the skills mentioned on the paper, so a one-skill paper cannot disturb the
         * rest of the profile.
         */
        purpose: scopedSkill ? 'SKILL_CHECK' : 'INITIAL',
        targetSkillKeys: scopedSkill ? [scopedSkill] : [],
        policyKey: built.specification!.policyKey,
        policyVersion: built.specification!.policyVersion,
        stage: ctx.stage, roleKey: ctx.roleKey,
        blueprintVersion: ctx.blueprintVersion, discovery: !!ctx.discovery,
        // Captured at start so an admin changing the limit mid-paper cannot shorten one
        // already in progress.
        timeLimitMinutes: (ctx.policy as any)?.timeLimitMinutes || 0,
        generationSeed: built.seed,
        specification: {
          slots: built.specification!.slots,
          skillCoverage: built.specification!.skillCoverage,
          difficultyCoverage: built.specification!.difficultyCoverage,
          totalPoints: built.specification!.totalPoints,
        },
        items: built.items,
        generationReport: {
          requestedSlots: built.report!.requestedSlots,
          filled: built.report!.filled,
          exactMatches: built.report!.exactMatches,
          difficultyFallbacks: built.report!.difficultyFallbacks,
          repeatedFromPreviousAttempt: built.report!.repeatedFromPreviousAttempt,
        },
      });
    } catch (e: any) {
      // Two concurrent starts raced and the partial unique index refused the second. The
      // other request won; return its paper rather than an error the student cannot act on.
      if (e?.code === 11000) {
        const existing = await PersonalizedAssessment.findOne({ tenantId, studentId, status: 'IN_PROGRESS' }).lean() as any;
        if (existing) {
          const texts = await loadItems(tenantId, existing.items.map((i: any) => ({ sourceType: i.sourceType, sourceId: i.sourceId })));
          return res.json({ assessment: studentShape(existing, texts), resumed: true });
        }
      }
      throw e;
    }

    const texts = await loadItems(tenantId, created.items.map((i: any) => ({ sourceType: i.sourceType, sourceId: i.sourceId })));
    res.status(201).json({ assessment: studentShape(created, texts), resumed: false });
  } catch (e: any) {
    console.error('[personalized-assessment] start:', e?.message || e);
    res.status(500).json({ message: 'Could not start your assessment. Please try again.' });
  }
};

/** GET /passport/me/assessment/personalized — the open attempt, if there is one. */
export const getMyPersonalizedAssessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    const open = await PersonalizedAssessment.findOne({ tenantId, studentId, status: 'IN_PROGRESS' }).lean() as any;
    if (!open) return res.json({ assessment: null });

    const texts = await loadItems(tenantId, open.items.map((i: any) => ({ sourceType: i.sourceType, sourceId: i.sourceId })));
    res.json({ assessment: studentShape(open, texts) });
  } catch (e: any) {
    res.status(500).json({ message: 'Could not load your assessment.' });
  }
};

/**
 * PUT /passport/me/assessment/personalized/answers — save progress without submitting.
 *
 * WHY THE SERVER HOLDS THESE. React state dies on refresh and localStorage dies on the
 * other device, the cleared browser and the shared lab machine. A student twenty questions
 * into a diagnostic who loses the lot will not sit it again, and the whole downstream
 * pipeline — Skill DNA, readiness, roadmap — never happens for them.
 *
 * SAVING IS NOT SUBMITTING. Status is untouched, nothing is graded, and no evidence is
 * written. The same `answers` field Module 7 already stores at submit is reused, so a
 * submitted paper still carries exactly what it carried before; this only fills it in
 * earlier. Grading re-reads every item from the frozen paper regardless, so a partially
 * saved paper cannot bias a score.
 *
 * Answers are matched against the frozen paper and anything else is dropped — a client
 * cannot introduce a question it prefers, and cannot answer on behalf of another attempt.
 */
export const savePersonalizedAnswers = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    // Scoped to the caller's own OPEN attempt. A submitted paper is closed to edits, which
    // is what stops somebody rewriting answers after seeing their result.
    const open: any = await PersonalizedAssessment.findOne({ tenantId, studentId, status: 'IN_PROGRESS' });
    if (!open) return res.status(404).json({ message: 'You have no assessment in progress.' });

    const onPaper = new Map<string, any>(
      (open.items || []).map((i: any) => [refKey(i.sourceType, i.sourceId), i]),
    );

    const incoming = (Array.isArray(req.body?.answers) ? req.body.answers : [])
      .map((a: any) => ({
        sourceType: String(a?.sourceType || ''),
        sourceId: String(a?.sourceId || ''),
        response: a?.response,
      }))
      .filter((a: any) => onPaper.has(refKey(a.sourceType, a.sourceId)));

    // Merged rather than replaced: the client may save one question at a time, and a
    // partial save must not erase the twenty answers it did not mention.
    const merged = new Map<string, any>(
      (open.answers || []).map((x: any) => [refKey(x.sourceType, x.sourceId), x]),
    );
    for (const a of incoming) merged.set(refKey(a.sourceType, a.sourceId), a);

    open.answers = [...merged.values()];
    await open.save();

    res.json({ saved: true, answered: open.answers.filter((a: any) => a.response !== undefined && a.response !== null && a.response !== '').length });
  } catch (e: any) {
    console.error('[personalized-assessment] save answers:', e?.message || e);
    res.status(500).json({ message: 'Could not save your answers.' });
  }
};

/**
 * POST /passport/assessment/personalized/preview — admin diagnostic.
 *
 * Runs the SAME pipeline a student would, and persists nothing: no attempt, no history, no
 * effect on anybody's paper. Sharing the code path is the point — a preview that
 * approximated generation would eventually disagree with it, and the disagreement would
 * only surface as a student complaint.
 */
export const previewPersonalizedAssessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.body?.studentId || '').trim();
    if (!studentId) return res.status(400).json({ message: 'Choose a member to preview for.' });

    const ctx = await resolvePersonalizedAssessmentContext(tenantId, studentId);
    if (!ctx.ok) return res.status(400).json({ message: ctx.message });

    const built = await buildPersonalizedAssessment({
      tenantId, studentId,
      stage: ctx.stage!, roleKey: ctx.roleKey!,
      roleSkillKeys: ctx.roleSkillKeys!,
      blueprintVersion: ctx.blueprintVersion!,
      attemptNumber: Number(req.body?.attemptNumber) || 1,
      policy: ctx.policy,
    });

    const context = await getCareerContext(tenantId, studentId);
    const policy = policyForStage(ctx.stage);

    if (!built.ok) {
      // The admin screen is the audience that can act on this, so it gets the full
      // diagnostic — skill keys, difficulty bands and every shortfall, not just the first.
      return res.json({
        ok: false, message: built.adminMessage || built.message,
        studentMessage: built.message,
        context: { stage: ctx.stage, roleKey: ctx.roleKey, discovery: !!ctx.discovery, policy: policy.label },
        shortfalls: built.report?.shortfalls || [],
      });
    }

    // The admin sees the shape and the chosen items; the seed stays server-side even here,
    // because an admin screen is not a place to publish something that predicts papers.
    const texts = await loadItems(tenantId, built.items!.map(i => ({ sourceType: i.sourceType, sourceId: i.sourceId })));

    res.json({
      ok: true,
      context: {
        name: context ? `${context.education.degree || ''} ${context.education.currentAcademicYear || ''}`.trim() : '',
        stage: ctx.stage, roleKey: ctx.roleKey, discovery: !!ctx.discovery,
        policy: policy.label, policyKey: policy.key, policyVersion: policy.version,
        blueprintVersion: ctx.blueprintVersion,
      },
      specification: built.specification,
      report: built.report,
      items: built.items!.map(i => ({
        order: i.order, skillKey: i.skillKey, difficulty: i.difficulty,
        servedDifficulty: i.servedDifficulty, reason: i.reason,
        sourceType: i.sourceType,
        text: texts.get(refKey(i.sourceType, i.sourceId))?.text || '',
      })),
    });
  } catch (e: any) {
    console.error('[personalized-assessment] preview:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not build a preview' });
  }
};

/** GET /passport/assessment/personalized/policies — the configured shapes, for admin. */
export const listPolicies = async (_req: Request, res: Response) => {
  res.json({
    policies: ASSESSMENT_POLICIES.map(p => ({
      key: p.key, stage: p.stage, label: p.label, version: p.version,
      skillSlots: p.skillSlots, maxSkills: p.maxSkills,
      difficultyMix: p.difficultyMix,
      prerequisiteDepth: p.prerequisiteDepth,
      allowedSkillDifficulty: p.allowedSkillDifficulty,
    })),
  });
};

/**
 * GET /me/assessment/personalized/availability
 *
 * Preflight for the onboarding CTA: may this member start an assessment right now, and if
 * not, why. Read-only and cheap enough to call on render — it deliberately does not
 * generate a paper. Always 200: "not ready" is a state the UI renders, not an error.
 */
export const checkPersonalizedAssessmentAvailability = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });
    return res.json(await getPersonalizedAssessmentAvailability(tenantId, studentId));
  } catch {
    // A preflight that fails must not present as a broken page. Unavailable is the safe
    // answer: the worst case is a student sees "not ready" and retries.
    return res.json({
      assessmentAvailable: false,
      reasonCode: 'SKILLS_NOT_CONFIGURED',
      message: 'This career path is not ready for assessment yet.',
      discovery: false,
      inProgress: false,
    });
  }
};

/** GET /passport/assessment/policies/editable — every stage, defaults and current values. */
export const getEditablePolicies = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(401).json({ message: 'Not authenticated' });
    const { listEditablePolicies, POLICY_BOUNDS } = await import('../services/assessmentPolicyService');
    res.json({ policies: await listEditablePolicies(tenantId), bounds: POLICY_BOUNDS });
  } catch (e: any) {
    console.error('[assessment-policy] list:', e?.message || e);
    res.status(500).json({ message: 'Could not load assessment policies.' });
  }
};

/**
 * PUT /passport/assessment/policies/editable
 *
 * Values are clamped rather than rejected: the bounds exist so the generator can satisfy
 * the request, and an admin discovering a limit through a failed generation — after a
 * student has clicked start — is a worse way to learn it.
 */
export const saveEditablePolicies = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(401).json({ message: 'Not authenticated' });
    const { saveAssessmentPolicies, POLICY_BOUNDS } = await import('../services/assessmentPolicyService');
    const policies = await saveAssessmentPolicies(tenantId, req.body?.policies || []);
    res.json({ policies, bounds: POLICY_BOUNDS });
  } catch (e: any) {
    console.error('[assessment-policy] save:', e?.message || e);
    res.status(500).json({ message: 'Could not save assessment policies.' });
  }
};
