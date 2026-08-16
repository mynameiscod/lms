import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import { Company, CompanyQuestion, QuestionTaxonomy, InterviewExperience } from '../models/CompanyQuestionModels';
import { companyStats, questionFrequency } from '../services/companyStatsService';
import { readinessFor, readinessForAll, readySlugs } from '../services/companyReadinessService';
import { draftCompany } from '../services/companyDraftService';
import { InterviewPattern } from '../models/CompanyQuestionModels';
import { isEntitled } from '../services/passportEntitlementService';
import {
  getTaxonomy, slugify, refreshQuestionCount, structureQuestions, predictQuestions,
  normaliseChoices,
} from '../services/companyQuestionService';
import { awardCoins } from '../services/coinService';
import AuditLog from '../models/AuditLog';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

/**
 * Record an admin change to company content.
 *
 * The writes that reach students are the ones worth auditing: creating or removing a
 * company, editing its interview pattern, ticking the verification that releases salary and
 * eligibility, and editing the taxonomy every company's questions are filed under. Student
 * READS are not audited — the volume would bury the handful of rows anybody would ever look
 * for.
 *
 * Best effort, and warned rather than thrown. An audit backend that is briefly unavailable
 * must not stop an admin publishing a company.
 */
async function audit(
  req: Request,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  details: string,
  metadata: any = {},
) {
  try {
    await AuditLog.create({
      tenantId: (req as any).user?.tenantId || (req as any).tenantId,
      userId: (req as any).user?.id || (req as any).user?._id,
      action, module: 'SYSTEM',
      targetType: 'Company',
      details,
      metadata,
    });
  } catch (e: any) {
    console.warn('[companyq] audit write failed:', e?.message || e);
  }
}

const publicQuestion = (q: any) => ({
  id: String(q._id),
  role: q.role, round: q.round, category: q.category, difficulty: q.difficulty,
  year: q.year || null,
  questionText: q.questionText,
  answer: q.answer || '',
  // The choices, so a banked MCQ renders as one. `correctIndex` is deliberately absent and
  // must stay absent: this shape is what the member's browser receives, and the same rows
  // are drawn into a scored mock test.
  options: q.options || [],
  tags: q.tags || [],
  // Carried all the way to the UI so a prediction is never mistaken for a recollection.
  aiPredicted: !!q.aiPredicted,
  source: q.source,
  practiceProblemId: q.practiceProblemId || '',
  upvotes: q.upvotes || 0,
});

async function gate(req: Request) {
  const tenantId = tenantOf(req);
  const [user, cfg] = await Promise.all([
    User.findById(userIdOf(req)).select('passport').lean() as any,
    PassportConfig.findOne({ tenantId }).lean(),
  ]);
  return {
    tenantId, studentId: userIdOf(req), cfg,
    entitled: isEntitled(cfg?.entitlements as any, user?.passport, 'company_questions'),
  };
}

// ─── Member ──────────────────────────────────────────────────────────────────

/** GET /passport/companies — the grid, with published counts. */
export const listCompanies = async (req: Request, res: Response) => {
  try {
    const { tenantId, cfg, entitled } = await gate(req);
    if (!entitled) return res.json({ locked: true, priceInr: (cfg as any)?.priceInr ?? 1599 });

    // Only companies that pass the readiness bar. A member cannot reach an unready one
    // by guessing its URL either — companyDetail applies the same filter.
    const [companies, tax, ready] = await Promise.all([
      Company.find({ tenantId, active: true }).sort({ questionCount: -1, name: 1 }).lean(),
      getTaxonomy(tenantId),
      readySlugs(tenantId),
    ]);
    const readySet = new Set(ready);
    res.json({
      locked: false,
      companyTypes: tax.companyTypes.filter(t => t.enabled),
      companies: companies.filter((c: any) => readySet.has(c.slug)).map((c: any) => ({
        id: String(c._id), name: c.name, slug: c.slug, type: c.type,
        logoUrl: c.logoUrl || '', about: c.about || '', questionCount: c.questionCount || 0,
      })),
    });
  } catch (e: any) {
    console.error('[companyq] list:', e);
    res.status(500).json({ message: e.message || 'Could not load companies' });
  }
};

/** GET /passport/companies/:slug — one company, its rounds, and its questions. */
export const companyDetail = async (req: Request, res: Response) => {
  try {
    const { tenantId, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ message: 'Membership required.' });

    const company = await Company.findOne({ tenantId, slug: req.params.slug, active: true }).lean() as any;
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // The gate again, so a typed URL cannot open a half-built page.
    const rd = await readinessFor(tenantId, company.slug);
    if (!rd.ready) return res.status(404).json({ message: 'Company not found' });

    const tax = await getTaxonomy(tenantId);
    const filter: any = { tenantId, companySlug: company.slug, status: 'published' };
    if (req.query.round) filter.round = String(req.query.round);
    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.difficulty) filter.difficulty = String(req.query.difficulty);

    const [questions, byRound, stats, freq] = await Promise.all([
      CompanyQuestion.find(filter).sort({ upvotes: -1, createdAt: -1 }).limit(300).lean(),
      // Counts per round so the tabs can show them without loading every question.
      CompanyQuestion.aggregate([
        { $match: { tenantId, companySlug: company.slug, status: 'published' } },
        { $group: { _id: '$round', n: { $sum: 1 } } },
      ]),
      companyStats(tenantId, company.slug),
      questionFrequency(tenantId, company.slug),
    ]);
    const pattern = await InterviewPattern.findOne({ tenantId, companySlug: company.slug }).lean() as any;

    res.json({
      company: {
        id: String(company._id), name: company.name, slug: company.slug, type: company.type,
        logoUrl: company.logoUrl || '', about: company.about || '', roles: company.roles || [],
        location: company.location || '', industry: company.industry || '',
        employeeBand: company.employeeBand || '', website: company.website || '',
        tips: company.tips || [],
        // Flagged as the tenant's own estimate rather than surveyed data. The client
        // renders that label, and it must never be dropped in transit.
        // Withheld until a human has ticked them. An AI draft nobody checked must not
        // reach a student who will act on it.
        salaryBands: company.verified?.salary
          ? (company.salaryBands || []).map((b: any) => ({ ...b, indicative: true }))
          : [],
        eligibility: company.verified?.eligibility ? (company.eligibility || null) : null,
        hiringTimeline: company.hiringTimeline || '',
      },
      pattern: pattern ? {
        role: pattern.role || '',
        totalDurationDays: pattern.totalDurationDays || null,
        rounds: (pattern.rounds || []).slice().sort((a: any, b: any) => a.order - b.order),
      } : null,
      // Every figure carries the sample it came from, so the UI can say "from 3 reports"
      // rather than implying confidence the data does not support.
      stats,
      rounds: tax.rounds.filter(r => r.enabled).map(r => ({
        ...r, count: byRound.find((b: any) => b._id === r.key)?.n || 0,
      })),
      categories: tax.categories.filter(c => c.enabled),
      difficulties: tax.difficulties,
      questions: questions.map((q: any) => {
        const f = freq.get(String(q._id));
        return {
          ...publicQuestion(q),
          // The number of separate reports of this question, so a single admin-entered
          // row honestly reads as 1 rather than pretending to a frequency.
          askedCount: f?.asked ?? 1,
          lastAsked: f?.lastAsked ?? null,
        };
      }),
    });
  } catch (e: any) {
    console.error('[companyq] detail:', e);
    res.status(500).json({ message: e.message || 'Could not load that company' });
  }
};

/**
 * POST /passport/companies/:slug/contribute — a member adds what they were asked.
 *
 * Lands as `pending`, never published directly. Coins are awarded on APPROVAL rather than
 * on submission, in the moderation handler — paying on submission would buy noise.
 */
export const contribute = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ message: 'Membership required.' });

    const company = await Company.findOne({ tenantId, slug: req.params.slug }).lean() as any;
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const text = String(req.body?.questionText || '').trim();
    if (text.length < 12) return res.status(400).json({ message: 'Write the question out in full.' });

    await CompanyQuestion.create({
      tenantId, companyId: company._id, companySlug: company.slug,
      questionText: text.slice(0, 4000),
      round: String(req.body?.round || 'technical'),
      category: String(req.body?.category || ''),
      difficulty: String(req.body?.difficulty || 'medium'),
      role: String(req.body?.role || '').slice(0, 80),
      year: Number(req.body?.year) || undefined,
      answer: String(req.body?.answer || '').slice(0, 4000),
      source: 'student', status: 'pending', contributedBy: studentId,
    });

    res.status(201).json({
      success: true,
      message: 'Thanks — we\'ll review it and add it to the bank. You earn coins once it\'s approved.',
    });
  } catch (e: any) {
    console.error('[companyq] contribute:', e);
    res.status(500).json({ message: e.message || 'Could not submit' });
  }
};

/**
 * POST /passport/companies/:slug/experience - "I interviewed here".
 *
 * The single most valuable thing a member can submit: it is the source for average
 * rounds, duration, offer rate, rating and the freshness of every question. Held for
 * review like question contributions, and paid on approval for the same reason - paying
 * on submission buys noise.
 */
export const submitExperience = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ message: 'Membership required.' });

    const company = await Company.findOne({ tenantId, slug: req.params.slug }).lean() as any;
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const b = req.body || {};
    const when = new Date(b.interviewedOn);
    if (isNaN(when.getTime())) return res.status(400).json({ message: 'When did you interview?' });
    if (when > new Date()) return res.status(400).json({ message: 'That date is in the future.' });

    const rounds = Array.isArray(b.roundsFaced) ? b.roundsFaced.map((r: any) => String(r)).slice(0, 12) : [];
    if (!rounds.length) return res.status(400).json({ message: 'Pick at least one round you faced.' });

    await InterviewExperience.create({
      tenantId, companyId: company._id, companySlug: company.slug, studentId,
      role: String(b.role || '').slice(0, 80),
      interviewedOn: when,
      roundsFaced: rounds,
      durationDays: Number(b.durationDays) || undefined,
      outcome: ['offer', 'rejected', 'waiting', 'withdrew'].includes(b.outcome) ? b.outcome : 'waiting',
      difficultyFelt: ['easy', 'medium', 'hard'].includes(b.difficultyFelt) ? b.difficultyFelt : undefined,
      rating: Number(b.rating) >= 1 && Number(b.rating) <= 5 ? Number(b.rating) : undefined,
      review: String(b.review || '').slice(0, 2000),
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Thanks - this is what makes the page real for the next student. We will review it, and you earn coins once it is approved.',
    });
  } catch (e: any) {
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'You have already submitted an interview at this company on that date.' });
    }
    console.error('[companyq] submitExperience:', e);
    res.status(500).json({ message: e.message || 'Could not submit' });
  }
};

/** GET /passport/company-admin/experiences?status=pending */
export const listExperiences = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const filter: any = { tenantId };
    if (req.query.status) filter.status = String(req.query.status);
    const rows = await InterviewExperience.find(filter)
      .sort({ createdAt: -1 }).limit(200)
      .populate('studentId', 'firstName lastName')
      .lean() as any[];
    res.json({
      experiences: rows.map(r => ({
        id: String(r._id), companySlug: r.companySlug, role: r.role,
        interviewedOn: r.interviewedOn, roundsFaced: r.roundsFaced || [],
        durationDays: r.durationDays || null, outcome: r.outcome,
        difficultyFelt: r.difficultyFelt || '', rating: r.rating || null,
        review: r.review || '', status: r.status,
        student: r.studentId ? `${r.studentId.firstName || ''} ${r.studentId.lastName || ''}`.trim() : '',
      })),
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load experiences' });
  }
};

/** PUT /passport/company-admin/experiences/:id - approve or reject. */
export const moderateExperience = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const exp = await InterviewExperience.findOne({ _id: req.params.id, tenantId });
    if (!exp) return res.status(404).json({ message: 'Not found' });

    const wasPending = exp.status === 'pending';
    if (['pending', 'published', 'rejected'].includes(req.body?.status)) exp.status = req.body.status;
    if (req.body?.reviewNote !== undefined) exp.reviewNote = String(req.body.reviewNote).slice(0, 400);
    await exp.save();

    // Worth more than a single question - it feeds five different figures on the page.
    if (wasPending && exp.status === 'published') {
      await awardCoins({
        tenantId, studentId: String(exp.studentId),
        eventKey: 'experience_approved',
        idempotencyKey: `experience:${exp._id}`,
        note: `Interview experience - ${exp.companySlug}`,
      });
    }
    res.json({ success: true, status: exp.status });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not save' });
  }
};

/**
 * POST /passport/company-admin/bulk - create many company shells at once.
 *
 * Paste a list of names; existing slugs are skipped rather than erroring, so the same
 * list can be pasted twice without creating duplicates or losing work already done.
 */
export const bulkCreate = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const type = String(req.body?.type || 'service');
    const names: string[] = String(req.body?.names || '')
      .split(/[\n,]/)
      .map(n => n
        .trim()
        // People paste the list they already have, and that list is numbered or bulleted.
        // Without this, "17. Virtusa" becomes a company literally called "17. Virtusa"
        // with the slug 17-virtusa, and every student sees the numbering.
        .replace(/^\d+\s*[.)\]:-]\s*/, '')
        .replace(/^[-*•]\s*/, '')
        .trim())
      .filter(Boolean)
      .slice(0, 200);
    if (!names.length) return res.status(400).json({ message: 'Paste some company names first.' });

    const existing = new Set(
      (await Company.find({ tenantId }).select('slug').lean()).map((c: any) => c.slug),
    );

    const fresh = names
      .map(name => ({ name, slug: slugify(name) }))
      .filter(c => c.slug && !existing.has(c.slug))
      // A pasted list often repeats a name; dedupe within the batch too.
      .filter((c, i, arr) => arr.findIndex(x => x.slug === c.slug) === i);

    if (fresh.length) {
      await Company.insertMany(fresh.map(c => ({ ...c, tenantId, type })), { ordered: false });
    }
    res.status(201).json({ created: fresh.length, skipped: names.length - fresh.length });
  } catch (e: any) {
    console.error('[companyq] bulkCreate:', e);
    res.status(500).json({ message: e.message || 'Could not create companies' });
  }
};

/**
 * POST /passport/company-admin/:slug/draft-profile - AI-fill one company.
 *
 * Writes the draft straight onto the record but marks each drafted section, and leaves
 * eligibility and salary UNVERIFIED so they stay hidden from students until a human ticks
 * them. Nothing published, nothing shown, until someone has looked.
 */
export const draftProfile = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const company = await Company.findOne({ tenantId, slug: req.params.slug });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const tax = await getTaxonomy(tenantId);
    const typeLabel = tax.companyTypes.find(t => t.key === company.type)?.label || company.type;
    const draft = await draftCompany({
      tenantId, name: company.name, type: typeLabel,
      roundKeys: tax.rounds.filter(r => r.enabled).map(r => r.key),
    });

    // Never overwrite something a human already wrote. A re-draft is meant to fill gaps,
    // not to undo an afternoon of editing.
    if (!company.about?.trim()) { company.about = draft.about; company.aiDrafted.overview = true; }
    if (!company.hiringTimeline?.trim()) company.hiringTimeline = draft.hiringTimeline;
    if (!company.tips?.length) company.tips = draft.tips;

    const hasEligibility = company.eligibility?.cgpaMin || company.eligibility?.branches?.length;
    if (!hasEligibility) {
      company.eligibility = draft.eligibility as any;
      company.aiDrafted.eligibility = true;
      company.verified.eligibility = false;
    }
    if (!company.salaryBands?.length && draft.salaryBands.length) {
      company.salaryBands = draft.salaryBands as any;
      company.aiDrafted.salary = true;
      company.verified.salary = false;
    }
    await company.save();

    let patternRounds = 0;
    if (draft.rounds.length) {
      const existing = await InterviewPattern.findOne({ tenantId, companySlug: company.slug });
      if (!existing || !existing.rounds?.length) {
        await InterviewPattern.findOneAndUpdate(
          { tenantId, companySlug: company.slug, role: '' },
          {
            $set: {
              companyId: company._id, rounds: draft.rounds, aiDrafted: true,
              totalDurationDays: undefined,
            },
          },
          { upsert: true, new: true },
        );
        patternRounds = draft.rounds.length;
      }
    }

    const readiness = await readinessFor(tenantId, company.slug);
    res.json({ drafted: true, patternRounds, readiness });
  } catch (e: any) {
    console.error('[companyq] draftProfile:', e?.message || e);
    res.status(400).json({ message: e?.message || 'Could not draft that company.' });
  }
};

/**
 * PUT /passport/company-admin/:slug/verify - the human tick.
 *
 * The single action that lets eligibility or salary reach a student. Deliberately its own
 * endpoint rather than a field on the profile save, so it cannot be set by accident while
 * editing something else.
 */
export const verifyFields = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const company = await Company.findOne({ tenantId, slug: req.params.slug });
    if (!company) return res.status(404).json({ message: 'Company not found' });

    if (typeof req.body?.eligibility === 'boolean') company.verified.eligibility = req.body.eligibility;
    if (typeof req.body?.salary === 'boolean') company.verified.salary = req.body.salary;
    if (!company.publishedAt) {
      const rd = await readinessFor(tenantId, company.slug);
      if (rd.ready) company.publishedAt = new Date();
    }
    await company.save();
    // Ticking these is what releases salary and eligibility to students, which is the whole
    // reason they are a separate human action.
    await audit(req, 'UPDATE', `Company verification changed: ${company.name}`, {
      slug: company.slug,
      eligibility: company.verified?.eligibility, salary: company.verified?.salary,
    });
    res.json({ verified: company.verified, readiness: await readinessFor(tenantId, company.slug) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not save' });
  }
};

/** GET /passport/company-admin/readiness - the roster with what each company is missing. */
export const readinessBoard = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [companies, all] = await Promise.all([
      Company.find({ tenantId }).sort({ name: 1 }).lean() as any,
      readinessForAll(tenantId),
    ]);
    const rows = companies.map((c: any) => {
      const r = all.get(c.slug)!;
      return {
        id: String(c._id), name: c.name, slug: c.slug, type: c.type,
        ready: r.ready, score: r.score, missing: r.missing, checks: r.checks,
        aiDrafted: c.aiDrafted || {}, verified: c.verified || {},
      };
    });
    res.json({
      rows,
      liveCount: rows.filter((r: any) => r.ready).length,
      total: rows.length,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load readiness' });
  }
};

/** PUT /passport/company-admin/:slug/pattern - edit the interview pattern by hand. */
export const savePattern = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const company = await Company.findOne({ tenantId, slug: req.params.slug }).lean() as any;
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const rounds = Array.isArray(req.body?.rounds) ? req.body.rounds : [];
    const clean = rounds.map((r: any, i: number) => ({
      key: String(r.key || 'technical'),
      name: String(r.name || '').slice(0, 60),
      order: Number(r.order) || i + 1,
      durationMins: Number(r.durationMins) || undefined,
      tests: Array.isArray(r.tests) ? r.tests.map((t: any) => String(t).slice(0, 40)).slice(0, 6) : [],
      description: String(r.description || '').slice(0, 600),
      cutoff: String(r.cutoff || '').slice(0, 120),
      tip: String(r.tip || '').slice(0, 300),
    })).filter((r: any) => r.name);

    const p = await InterviewPattern.findOneAndUpdate(
      { tenantId, companySlug: company.slug, role: String(req.body?.role || '') },
      { $set: { companyId: company._id, rounds: clean, aiDrafted: false } },
      { upsert: true, new: true },
    );
    await audit(req, 'UPDATE', `Interview rounds changed: ${company.name}`, {
      slug: company.slug, role: String(req.body?.role || ''), rounds: clean.length,
    });
    res.json({ pattern: p, readiness: await readinessFor(tenantId, company.slug) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not save the pattern' });
  }
};

// --- Admin ---------------------------------------------------------------



export const getAdmin = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [tax, companies, pending] = await Promise.all([
      getTaxonomy(tenantId),
      Company.find({ tenantId }).sort({ name: 1 }).lean(),
      CompanyQuestion.countDocuments({ tenantId, status: 'pending' }),
    ]);
    res.json({
      taxonomy: {
        rounds: tax.rounds, categories: tax.categories,
        difficulties: tax.difficulties, companyTypes: tax.companyTypes,
      },
      companies: companies.map((c: any) => ({
        id: String(c._id), name: c.name, slug: c.slug, type: c.type,
        logoUrl: c.logoUrl || '', about: c.about || '', active: c.active,
        questionCount: c.questionCount || 0,
        // The profile editor seeds itself from this list and posts the whole record back,
        // so these must be present — omitting them would make every save silently wipe
        // the location, tips and salary bands.
        location: c.location || '', industry: c.industry || '',
        employeeBand: c.employeeBand || '', website: c.website || '',
        tips: c.tips || [], salaryBands: c.salaryBands || [],
      })),
      pendingCount: pending,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load' });
  }
};

/** PUT /passport/companies/admin/taxonomy — rounds, categories, difficulties, types. */
export const saveTaxonomy = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const clean = (rows: any): any[] => (Array.isArray(rows) ? rows : [])
      .map((r: any, i: number) => ({
        key: slugify(r.key || r.label).replace(/-/g, '_') || `item_${i}`,
        label: String(r.label || '').trim().slice(0, 60),
        order: Number(r.order) || i + 1,
        enabled: r.enabled !== false,
      }))
      .filter(r => r.label);

    const patch: any = {};
    for (const k of ['rounds', 'categories', 'difficulties', 'companyTypes']) {
      if (req.body?.[k]) patch[k] = clean(req.body[k]);
    }
    const tax = await QuestionTaxonomy.findOneAndUpdate({ tenantId }, { $set: patch }, { new: true, upsert: true });
    // One taxonomy governs every company's questions, so a single edit here re-files the
    // whole bank. Worth a row.
    await audit(req, 'UPDATE', 'Company question taxonomy changed', { changed: Object.keys(patch) });
    res.json({ taxonomy: tax });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not save the taxonomy' });
  }
};

export const saveCompany = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'A company name is required.' });

    const b = req.body || {};
    const body: any = {
      name,
      type: String(b.type || 'service'),
      logoUrl: String(b.logoUrl || '').trim().slice(0, 600),
      about: String(b.about || '').trim().slice(0, 1000),
      roles: Array.isArray(b.roles) ? b.roles.map((r: any) => String(r).slice(0, 60)).slice(0, 12) : [],
      active: b.active !== false,
      location: String(b.location || '').trim().slice(0, 120),
      industry: String(b.industry || '').trim().slice(0, 80),
      employeeBand: String(b.employeeBand || '').trim().slice(0, 40),
      website: String(b.website || '').trim().slice(0, 300),
      tips: Array.isArray(b.tips) ? b.tips.map((t: any) => String(t).slice(0, 400)).filter(Boolean).slice(0, 20) : [],
      // Ranges only — a band whose max is below its min would render as nonsense, and a
      // salary claim about a named employer is not the place to be sloppy.
      salaryBands: Array.isArray(b.salaryBands)
        ? b.salaryBands
            .map((x: any) => ({
              role: String(x.role || '').slice(0, 80),
              minLpa: Math.max(0, Number(x.minLpa) || 0),
              maxLpa: Math.max(0, Number(x.maxLpa) || 0),
              note: String(x.note || '').slice(0, 200),
            }))
            .filter((x: any) => x.role && x.maxLpa >= x.minLpa)
            .slice(0, 12)
        : [],
    };

    if (req.params.id) {
      const c = await Company.findOneAndUpdate({ _id: req.params.id, tenantId }, { $set: body }, { new: true });
      if (!c) return res.status(404).json({ message: 'Company not found' });
      await audit(req, 'UPDATE', `Company updated: ${c.name}`, { slug: c.slug, active: body.active });
      return res.json({ company: c });
    }
    const c = await Company.create({ ...body, tenantId, slug: slugify(name) });
    await audit(req, 'CREATE', `Company created: ${c.name}`, { slug: c.slug });
    res.status(201).json({ company: c });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'That company already exists.' });
    res.status(500).json({ message: e.message || 'Could not save' });
  }
};

export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    // Questions go with it — orphaned rows would still appear in search and could not be
    // traced back to an employer.
    const doomed = await Company.findOne({ _id: req.params.id, tenantId }).select('name slug').lean() as any;
    const removed = await CompanyQuestion.countDocuments({ tenantId, companyId: req.params.id });
    await CompanyQuestion.deleteMany({ tenantId, companyId: req.params.id });
    await Company.deleteOne({ _id: req.params.id, tenantId });
    // The most destructive action on this screen, and the one most worth being able to
    // answer "who removed Infosys and when" about.
    await audit(req, 'DELETE', `Company deleted: ${doomed?.name || req.params.id}`, {
      slug: doomed?.slug, questionsDeleted: removed,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not delete' });
  }
};

/** GET /passport/companies/admin/:slug/questions — admin view, all statuses. */
export const adminQuestions = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const filter: any = { tenantId };
    if (req.params.slug && req.params.slug !== 'all') filter.companySlug = req.params.slug;
    if (req.query.status) filter.status = String(req.query.status);

    const rows = await CompanyQuestion.find(filter)
      .sort({ createdAt: -1 }).limit(400)
      .populate('contributedBy', 'firstName lastName')
      .lean() as any[];

    res.json({
      questions: rows.map(q => ({
        ...publicQuestion(q),
        // Admin-only, and only here: the editor cannot correct an answer key it cannot see.
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : null,
        status: q.status, companySlug: q.companySlug, reviewNote: q.reviewNote || '',
        contributor: q.contributedBy
          ? `${q.contributedBy.firstName || ''} ${q.contributedBy.lastName || ''}`.trim()
          : '',
      })),
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load questions' });
  }
};

/** POST /passport/companies/admin/:slug/questions — create one or many. */
export const saveQuestions = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const company = await Company.findOne({ tenantId, slug: req.params.slug }).lean() as any;
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const rows = Array.isArray(req.body?.questions) ? req.body.questions : [req.body];
    const docs = rows
      .map((q: any) => ({
        tenantId, companyId: company._id, companySlug: company.slug,
        questionText: String(q.questionText || '').trim().slice(0, 4000),
        round: String(q.round || 'technical'),
        category: String(q.category || ''),
        difficulty: String(q.difficulty || 'medium'),
        role: String(q.role || '').slice(0, 80),
        year: Number(q.year) || undefined,
        answer: String(q.answer || '').slice(0, 4000),
        // A well-formed MCQ becomes usable by the mock test; a half-typed one stores neither
        // half and stays an ordinary prose question.
        ...normaliseChoices(q),
        tags: Array.isArray(q.tags) ? q.tags.slice(0, 6) : [],
        practiceProblemId: String(q.practiceProblemId || ''),
        source: q.aiPredicted ? 'ai' : 'admin',
        aiPredicted: !!q.aiPredicted,
        status: 'published',
      }))
      // Same threshold as the parser — a question that survives review must not then be
      // dropped on save for being short.
      .filter((q: any) => q.questionText.length >= 4);

    if (!docs.length) return res.status(400).json({ message: 'Nothing to save.' });
    await CompanyQuestion.insertMany(docs);
    await refreshQuestionCount(tenantId, company._id);
    res.status(201).json({ added: docs.length });
  } catch (e: any) {
    console.error('[companyq] saveQuestions:', e);
    res.status(500).json({ message: e.message || 'Could not save' });
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const q = await CompanyQuestion.findOne({ _id: req.params.id, tenantId });
    if (!q) return res.status(404).json({ message: 'Not found' });

    for (const k of ['questionText', 'answer', 'round', 'category', 'difficulty', 'role', 'practiceProblemId'] as const) {
      if (req.body[k] !== undefined) (q as any)[k] = String(req.body[k]).slice(0, 4000);
    }
    if (req.body.year !== undefined) q.year = Number(req.body.year) || undefined;
    if (Array.isArray(req.body.tags)) q.tags = req.body.tags.slice(0, 6);

    // Choices move together or not at all. Editing the options without re-stating the key
    // would leave a key pointing at whatever now sits in that position.
    if (req.body.options !== undefined || req.body.correctIndex !== undefined) {
      const choices = normaliseChoices({
        options: req.body.options !== undefined ? req.body.options : q.options,
        correctIndex: req.body.correctIndex !== undefined ? req.body.correctIndex : q.correctIndex,
      });
      q.options = choices.options;
      q.correctIndex = choices.correctIndex;
    }

    const wasPending = q.status === 'pending';
    if (['pending', 'published', 'rejected'].includes(req.body.status)) {
      q.status = req.body.status;
      if (req.body.reviewNote !== undefined) q.reviewNote = String(req.body.reviewNote).slice(0, 400);
    }
    await q.save();
    await refreshQuestionCount(tenantId, q.companyId);

    // Coins are paid on APPROVAL, not submission — paying for a submission buys noise,
    // paying for an approved one buys a question the bank actually needed. Keyed on the
    // question, so re-approving after an edit cannot pay twice.
    if (wasPending && q.status === 'published' && q.contributedBy) {
      await awardCoins({
        tenantId, studentId: String(q.contributedBy),
        eventKey: 'question_approved',
        idempotencyKey: `question:${q._id}`,
        note: `Question approved — ${q.companySlug}`,
      });
    }

    res.json({ question: { ...publicQuestion(q), status: q.status } });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not save' });
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const q = await CompanyQuestion.findOne({ _id: req.params.id, tenantId }).select('companyId').lean() as any;
    await CompanyQuestion.deleteOne({ _id: req.params.id, tenantId });
    if (q?.companyId) await refreshQuestionCount(tenantId, q.companyId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not delete' });
  }
};

/** POST /passport/companies/admin/:slug/import — paste notes, get structured rows back. */
export const importQuestions = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const company = await Company.findOne({ tenantId, slug: req.params.slug }).lean() as any;
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const raw = String(req.body?.raw || '').trim();
    if (raw.length < 20) return res.status(400).json({ message: 'Paste the notes first.' });

    const tax = await getTaxonomy(tenantId);
    const parsed = await structureQuestions({
      tenantId, raw, companyName: company.name,
      rounds: tax.rounds.filter(r => r.enabled),
      categories: tax.categories.filter(c => c.enabled),
      difficulties: tax.difficulties,
    });
    // Returned for review, NOT saved. The admin confirms before anything is attributed to
    // a named employer.
    res.json({ parsed });
  } catch (e: any) {
    res.status(400).json({ message: e?.message || 'Could not read those notes.' });
  }
};

/** POST /passport/companies/admin/:slug/predict — AI-suggested questions to prepare. */
export const predict = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const company = await Company.findOne({ tenantId, slug: req.params.slug }).lean() as any;
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const tax = await getTaxonomy(tenantId);
    const round = String(req.body?.round || tax.rounds[0]?.key || 'technical');
    const roundLabel = tax.rounds.find(r => r.key === round)?.label || round;
    const type = tax.companyTypes.find(t => t.key === company.type)?.label || company.type;

    const parsed = await predictQuestions({
      tenantId, companyName: company.name, companyType: type,
      role: String(req.body?.role || ''), round, roundLabel,
      count: Number(req.body?.count) || 10,
      categories: tax.categories.filter(c => c.enabled),
    });
    // Flagged here, saved flagged, and rendered flagged. A prediction must never reach a
    // member looking like something a company actually asked.
    res.json({ parsed: parsed.map(p => ({ ...p, aiPredicted: true })) });
  } catch (e: any) {
    res.status(400).json({ message: e?.message || 'Could not generate questions.' });
  }
};
