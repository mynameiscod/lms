import { Request, Response } from 'express';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import PassportResume from '../models/PassportResume';
import { IResumeSections } from '../models/Resume';
import { isEntitled } from '../services/passportEntitlementService';
import { scoreResume, improveResume } from '../services/resumeScoringService';
import { getOrCreateProgress, addXp } from '../services/passportXpService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

const SCORE_XP = 25;   // first time you get your resume scored
const GOOD_SCORE = 75; // "ATS-ready" bar the roadmap sets in week 9

const EMPTY_SECTIONS = (): IResumeSections => ({
  contact: { name: '', title: '', email: '', phone: '', linkedin: '', github: '', portfolio: '', location: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
});

async function gate(req: Request) {
  const tenantId = tenantOf(req);
  const studentId = userIdOf(req);
  const [user, cfg] = await Promise.all([
    User.findById(studentId).select('passport firstName lastName email phone').lean() as any,
    PassportConfig.findOne({ tenantId }).lean(),
  ]);
  return {
    tenantId, studentId, user, cfg,
    entitled: isEntitled(cfg?.entitlements as any, user?.passport, 'resume'),
  };
}

/** GET /passport/resume — the member's resume, seeded from their signup details on first open. */
export const get = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, user, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required for the Resume Center.' });

    let doc = await PassportResume.findOne({ tenantId, studentId });
    if (!doc) {
      const sections = EMPTY_SECTIONS();
      sections.contact.name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
      sections.contact.email = user?.email || '';
      sections.contact.phone = user?.phone || '';
      doc = await PassportResume.create({ tenantId, studentId, sections });
    }
    res.json({ resume: { sections: doc.sections, score: doc.score, scoredAt: doc.scoredAt, version: doc.version } });
  } catch (e: any) {
    console.error('[passport] resume get:', e);
    res.status(500).json({ message: e.message || 'Failed to load resume' });
  }
};

/** PUT /passport/resume — save edited sections. */
export const save = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required.' });

    const sections = req.body?.sections;
    if (!sections || typeof sections !== 'object') return res.status(400).json({ message: 'Nothing to save.' });

    const doc = await PassportResume.findOneAndUpdate(
      { tenantId, studentId },
      { $set: { sections }, $inc: { version: 1 } },
      { new: true, upsert: true },
    );
    res.json({ resume: { sections: doc!.sections, score: doc!.score, scoredAt: doc!.scoredAt, version: doc!.version } });
  } catch (e: any) {
    console.error('[passport] resume save:', e);
    res.status(500).json({ message: e.message || 'Failed to save resume' });
  }
};

/** POST /passport/resume/score — ATS score + fix list. Awards XP the first time. */
export const score = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required.' });

    const doc = await PassportResume.findOne({ tenantId, studentId });
    if (!doc) return res.status(404).json({ message: 'Fill in your resume first.' });
    if (!doc.sections?.contact?.name) return res.status(400).json({ message: 'Add at least your name and contact details before scoring.' });

    const result = await scoreResume(doc.sections);
    const firstScore = !doc.score;
    doc.score = result as any;
    doc.scoredAt = new Date();
    await doc.save();

    let xpAwarded = 0;
    if (firstScore) {
      const progress = await getOrCreateProgress(tenantId, studentId);
      addXp(progress, SCORE_XP, true);
      await progress.save();
      xpAwarded = SCORE_XP;
    }

    res.json({ score: result, xpAwarded, atsReady: (result?.total || 0) >= GOOD_SCORE, goodScore: GOOD_SCORE });
  } catch (e: any) {
    console.error('[passport] resume score:', e);
    res.status(500).json({ message: e.message || 'Could not score the resume. AI may not be configured yet.' });
  }
};

/**
 * POST /passport/resume/improve — AI rewrite of the wording only (facts preserved).
 * Returns the improved sections WITHOUT saving, so the member reviews before accepting.
 */
export const improve = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, cfg, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ locked: true, priceInr: cfg?.priceInr ?? 499, message: 'Membership required.' });

    const doc = await PassportResume.findOne({ tenantId, studentId });
    if (!doc) return res.status(404).json({ message: 'Fill in your resume first.' });

    const improved = await improveResume(doc.sections);
    res.json({ sections: improved });
  } catch (e: any) {
    console.error('[passport] resume improve:', e);
    res.status(500).json({ message: e.message || 'Could not improve the resume. AI may not be configured yet.' });
  }
};
