import { Request, Response } from 'express';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import MockTestAttempt from '../models/MockTestAttempt';
import { Company, CompanyMockConfig } from '../models/CompanyQuestionModels';
import { isEntitled } from '../services/passportEntitlementService';
import { assembleTest } from '../services/mockTestService';
import { readinessFor } from '../services/companyReadinessService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

/**
 * Strip the answers before anything goes to the browser.
 *
 * The paper is snapshotted onto the attempt WITH its correct answers, because there is no
 * stored paper to mark against later. That makes this function the only thing standing
 * between a candidate and the answer key, so every read path goes through it.
 */
const studentView = (a: any) => ({
  id: String(a._id),
  companySlug: a.companySlug, companyName: a.companyName,
  startedAt: a.startedAt, endsAt: a.endsAt, status: a.status,
  totalQuestions: a.totalQuestions, passingPct: a.passingPct,
  sections: (a.sections || []).map((s: any) => ({
    name: s.name, category: s.category, durationMins: s.durationMins,
    questions: (s.questions || []).map((q: any) => ({
      id: q.id, text: q.text, options: q.options,
      category: q.category, difficulty: q.difficulty,
      // Surfaced so a student knows which items are practice rather than recalled.
      generated: q.generated,
    })),
  })),
  answers: a.answers || [],
});

async function gate(req: Request) {
  const tenantId = tenantOf(req);
  const [user, cfg] = await Promise.all([
    User.findById(userIdOf(req)).select('passport').lean() as any,
    PassportConfig.findOne({ tenantId }).lean(),
  ]);
  return {
    tenantId, studentId: userIdOf(req),
    entitled: isEntitled(cfg?.entitlements as any, user?.passport, 'company_questions'),
  };
}

/** POST /passport/companies/:slug/mock-test/start */
export const startMockTest = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ message: 'Membership required.' });

    const slug = req.params.slug;
    const company = await Company.findOne({ tenantId, slug, active: true }).lean() as any;
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Same gate as everything else on the company page.
    const rd = await readinessFor(tenantId, slug);
    if (!rd.ready) return res.status(404).json({ message: 'Company not found' });

    // Resume rather than start a second paper — leaving and returning must not lose the
    // clock or the answers already given.
    const open = await MockTestAttempt.findOne({ tenantId, studentId, companySlug: slug, status: 'in_progress' });
    if (open) {
      if (open.endsAt > new Date()) return res.json({ attempt: studentView(open), resumed: true });
      open.status = 'expired';
      await open.save();
    }

    const cfg = await CompanyMockConfig.findOne({ tenantId, companySlug: slug }).lean() as any;
    const maxAttempts = cfg?.maxAttempts ?? 2;
    const used = await MockTestAttempt.countDocuments({ tenantId, studentId, companySlug: slug, status: { $ne: 'in_progress' } });
    if (maxAttempts > 0 && used >= maxAttempts) {
      return res.status(403).json({ message: `You have used all ${maxAttempts} attempts for ${company.name}.` });
    }

    const built = await assembleTest({ tenantId, companySlug: slug, companyName: company.name });
    const total = built.sections.reduce((n, s) => n + s.questions.length, 0);
    if (!total) {
      return res.status(422).json({ message: 'There are not enough questions banked for a test here yet.' });
    }

    const minutes = built.sections.reduce((n, s) => n + s.durationMins, 0);
    const attempt = await MockTestAttempt.create({
      tenantId, studentId, companySlug: slug, companyName: company.name,
      sections: built.sections,
      // Server-side deadline. A browser countdown is a hint; this is what decides whether
      // a late submission counts.
      endsAt: new Date(Date.now() + minutes * 60_000),
      totalQuestions: total,
      passingPct: built.passingPct,
      generatedCount: built.generatedCount,
      bankedCount: built.bankedCount,
    });

    res.status(201).json({ attempt: studentView(attempt), generated: built.generatedCount, banked: built.bankedCount });
  } catch (e: any) {
    console.error('[mocktest] start:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not start the test' });
  }
};

/** GET /passport/mock-test/:id */
export const getMockTest = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId } = await gate(req);
    const a = await MockTestAttempt.findOne({ _id: req.params.id, tenantId, studentId });
    if (!a) return res.status(404).json({ message: 'Not found' });
    if (a.status === 'in_progress' && a.endsAt < new Date()) { a.status = 'expired'; await a.save(); }
    res.json({ attempt: studentView(a), result: a.status === 'submitted' ? result(a) : null });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load' });
  }
};

/** PUT /passport/mock-test/:id/answer — save as they go, so a refresh costs nothing. */
export const saveAnswer = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId } = await gate(req);
    const a = await MockTestAttempt.findOne({ _id: req.params.id, tenantId, studentId });
    if (!a) return res.status(404).json({ message: 'Not found' });
    if (a.status !== 'in_progress') return res.status(409).json({ message: 'This test is already finished.' });
    if (a.endsAt < new Date()) { a.status = 'expired'; await a.save(); return res.status(409).json({ message: 'Time is up.' }); }

    const qid = String(req.body?.questionId || '');
    const chosen = Number(req.body?.chosen);
    const i = a.answers.findIndex(x => x.questionId === qid);
    if (i >= 0) a.answers[i].chosen = chosen;
    else a.answers.push({ questionId: qid, chosen } as any);
    await a.save();
    res.json({ saved: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not save' });
  }
};

function result(a: any) {
  const flat = (a.sections || []).flatMap((s: any) => s.questions || []);
  const byId = new Map(flat.map((q: any) => [q.id, q]));
  const given = new Map((a.answers || []).map((x: any) => [x.questionId, x.chosen]));

  let correct = 0;
  const review = flat.map((q: any) => {
    const chosen = given.has(q.id) ? given.get(q.id) : null;
    const right = chosen !== null && chosen === q.correctIndex;
    if (right) correct++;
    return {
      id: q.id, text: q.text, options: q.options,
      chosen, correctIndex: q.correctIndex, right,
      explanation: q.explanation || '', generated: q.generated,
    };
  });

  const total = flat.length || 1;
  const score = Math.round((correct / total) * 100);
  return {
    score, correct, total,
    passed: score >= (a.passingPct ?? 60),
    passingPct: a.passingPct ?? 60,
    // Only meaningful after submission, so it lives here rather than in studentView.
    review,
    generatedCount: a.generatedCount, bankedCount: a.bankedCount,
  };
}

/** POST /passport/mock-test/:id/submit */
export const submitMockTest = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId } = await gate(req);
    const a = await MockTestAttempt.findOne({ _id: req.params.id, tenantId, studentId });
    if (!a) return res.status(404).json({ message: 'Not found' });
    if (a.status === 'submitted') return res.json({ result: result(a), alreadySubmitted: true });

    const r = result(a);
    a.status = 'submitted';
    a.submittedAt = new Date();
    a.score = r.score;
    a.correctCount = r.correct;
    a.passed = r.passed;
    await a.save();

    res.json({ result: r });
  } catch (e: any) {
    console.error('[mocktest] submit:', e);
    res.status(500).json({ message: e.message || 'Could not submit' });
  }
};

/** GET /passport/companies/:slug/mock-test/history */
export const mockTestHistory = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId } = await gate(req);
    const rows = await MockTestAttempt.find({ tenantId, studentId, companySlug: req.params.slug })
      .sort({ createdAt: -1 }).limit(10)
      .select('score correctCount totalQuestions passed status submittedAt createdAt').lean();
    res.json({ attempts: rows.map((r: any) => ({ ...r, id: String(r._id) })) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load history' });
  }
};
