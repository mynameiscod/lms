import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import { Company, CompanyQuestion, QuestionTaxonomy } from '../models/CompanyQuestionModels';
import { isEntitled } from '../services/passportEntitlementService';
import {
  getTaxonomy, slugify, refreshQuestionCount, structureQuestions, predictQuestions,
} from '../services/companyQuestionService';
import { awardCoins } from '../services/coinService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

const publicQuestion = (q: any) => ({
  id: String(q._id),
  role: q.role, round: q.round, category: q.category, difficulty: q.difficulty,
  year: q.year || null,
  questionText: q.questionText,
  answer: q.answer || '',
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

    const [companies, tax] = await Promise.all([
      Company.find({ tenantId, active: true }).sort({ questionCount: -1, name: 1 }).lean(),
      getTaxonomy(tenantId),
    ]);
    res.json({
      locked: false,
      companyTypes: tax.companyTypes.filter(t => t.enabled),
      companies: companies.map((c: any) => ({
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

    const tax = await getTaxonomy(tenantId);
    const filter: any = { tenantId, companySlug: company.slug, status: 'published' };
    if (req.query.round) filter.round = String(req.query.round);
    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.difficulty) filter.difficulty = String(req.query.difficulty);

    const [questions, byRound] = await Promise.all([
      CompanyQuestion.find(filter).sort({ upvotes: -1, createdAt: -1 }).limit(300).lean(),
      // Counts per round so the tabs can show them without loading every question.
      CompanyQuestion.aggregate([
        { $match: { tenantId, companySlug: company.slug, status: 'published' } },
        { $group: { _id: '$round', n: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      company: {
        id: String(company._id), name: company.name, slug: company.slug, type: company.type,
        logoUrl: company.logoUrl || '', about: company.about || '', roles: company.roles || [],
      },
      rounds: tax.rounds.filter(r => r.enabled).map(r => ({
        ...r, count: byRound.find((b: any) => b._id === r.key)?.n || 0,
      })),
      categories: tax.categories.filter(c => c.enabled),
      difficulties: tax.difficulties,
      questions: questions.map(publicQuestion),
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

// ─── Admin ───────────────────────────────────────────────────────────────────

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

    const body = {
      name,
      type: String(req.body?.type || 'service'),
      logoUrl: String(req.body?.logoUrl || '').trim().slice(0, 600),
      about: String(req.body?.about || '').trim().slice(0, 1000),
      roles: Array.isArray(req.body?.roles) ? req.body.roles.map((r: any) => String(r).slice(0, 60)).slice(0, 12) : [],
      active: req.body?.active !== false,
    };

    if (req.params.id) {
      const c = await Company.findOneAndUpdate({ _id: req.params.id, tenantId }, { $set: body }, { new: true });
      if (!c) return res.status(404).json({ message: 'Company not found' });
      return res.json({ company: c });
    }
    const c = await Company.create({ ...body, tenantId, slug: slugify(name) });
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
    await CompanyQuestion.deleteMany({ tenantId, companyId: req.params.id });
    await Company.deleteOne({ _id: req.params.id, tenantId });
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
