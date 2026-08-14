import { Request, Response } from 'express';
import PathwayCurriculum from '../models/PathwayCurriculum';
import PassportContent from '../models/PassportContent';
import { renumber, moveDay, trackOf } from '../services/curriculumService';
import { draftCurriculumDays } from '../services/curriculumDraftService';

/**
 * Admin CRUD for a CareerPilot pathway's day-by-day curriculum.
 *
 * Named `pathwayCurriculum` because `curriculumController` already belongs to the LMS
 * LearningCurriculum feature — a different product with day plans, weekend plans and a
 * template library. The two must not be confused.
 *
 * Days are stored as one document per pathway key rather than a row per day: a
 * curriculum is always read and written whole, reordering rewrites most of it anyway,
 * and a 365-day plan is a few kilobytes.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const whoOf = (req: Request): string => String((req as any).user?.email || '');

/** Sanitise anything an admin or a model hands us before it reaches a student. */
const TYPES = ['learn', 'practice', 'aptitude', 'communication', 'resume', 'mock'];
const CATS = ['career_clarity', 'aptitude', 'logical_reasoning', 'technical', 'communication', 'employability'];

const cleanDays = (raw: any): any[] =>
  (Array.isArray(raw) ? raw : []).map((d: any, i: number) => ({
    day: Number(d?.day) || i + 1,
    theme: String(d?.theme || '').trim().slice(0, 120),
    items: (Array.isArray(d?.items) ? d.items : []).slice(0, 3).map((it: any) => ({
      title: String(it?.title || '').trim().slice(0, 160),
      detail: String(it?.detail || '').trim().slice(0, 600),
      type: TYPES.includes(String(it?.type)) ? String(it.type) : 'learn',
      xp: Math.min(500, Math.max(0, Number(it?.xp) || 20)),
      link: String(it?.link || '').trim().slice(0, 300),
      category: CATS.includes(String(it?.category)) ? String(it.category) : 'technical',
    })).filter((it: any) => it.title),
  })).filter((d: any) => d.items.length);

/** GET /passport/curriculum — every track with how many days it has. */
export const listPathwayCurricula = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [content, docs] = await Promise.all([
      PassportContent.findOne({ tenantId }).lean() as any,
      PathwayCurriculum.find({ tenantId }).select('pathwayKey days aiDraftedAt updatedAt').lean(),
    ]);

    const count = new Map(docs.map((d: any) => [d.pathwayKey, (d.days || []).length]));
    // Grouped by TRACK, because that is the unit content is written for — twenty
    // pathway variants share five bodies of work.
    const tracks = new Map<string, { key: string; label: string; variants: string[] }>();
    for (const p of (content?.pathways || [])) {
      const t = trackOf(p.key);
      if (!tracks.has(t)) tracks.set(t, { key: t, label: String(p.label).split('—')[0].trim(), variants: [] });
      tracks.get(t)!.variants.push(p.stage || 'all');
    }

    res.json({
      tracks: [...tracks.values()].map(t => ({
        ...t,
        days: count.get(t.key) || 0,
        journeyDays: content?.journeyDays || 90,
      })),
      overrides: docs.filter((d: any) => String(d.pathwayKey).includes(':'))
        .map((d: any) => ({ pathwayKey: d.pathwayKey, days: (d.days || []).length })),
    });
  } catch (e: any) {
    console.error('[pathway-curriculum] list:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not load curricula' });
  }
};

/** GET /passport/curriculum/:pathwayKey */
export const getPathwayCurriculum = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const pathwayKey = String(req.params.pathwayKey);
    const [doc, content] = await Promise.all([
      PathwayCurriculum.findOne({ tenantId, pathwayKey }).lean(),
      PassportContent.findOne({ tenantId }).lean() as any,
    ]);
    res.json({
      pathwayKey,
      days: doc?.days || [],
      aiDraftedAt: doc?.aiDraftedAt || null,
      journeyDays: content?.journeyDays || 90,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load this curriculum' });
  }
};

/** PUT /passport/curriculum/:pathwayKey — replace the whole day list. */
export const savePathwayCurriculum = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const pathwayKey = String(req.params.pathwayKey);
    const days = renumber(cleanDays(req.body?.days) as any);

    const doc = await PathwayCurriculum.findOneAndUpdate(
      { tenantId, pathwayKey },
      { $set: { days, updatedBy: whoOf(req) } },
      { new: true, upsert: true },
    );
    res.json({ pathwayKey, days: doc.days });
  } catch (e: any) {
    console.error('[pathway-curriculum] save:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not save' });
  }
};

/** POST /passport/curriculum/:pathwayKey/move — { from, to } */
export const movePathwayDay = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const pathwayKey = String(req.params.pathwayKey);
    const doc = await PathwayCurriculum.findOne({ tenantId, pathwayKey });
    if (!doc) return res.status(404).json({ message: 'No curriculum yet' });

    doc.days = moveDay(doc.days as any, Number(req.body?.from), Number(req.body?.to)) as any;
    doc.updatedBy = whoOf(req);
    await doc.save();
    res.json({ days: doc.days });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not reorder' });
  }
};

/**
 * POST /passport/curriculum/:pathwayKey/copy — { from }
 *
 * Authoring one track and copying it is what makes twenty pathways affordable. The copy
 * REPLACES rather than appends: a half-merged curriculum is worse than either original.
 */
export const copyPathwayCurriculum = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const to = String(req.params.pathwayKey);
    const from = String(req.body?.from || '');
    if (!from || from === to) return res.status(400).json({ message: 'Pick a different pathway to copy from.' });

    const src = await PathwayCurriculum.findOne({ tenantId, pathwayKey: from }).lean();
    if (!src?.days?.length) return res.status(404).json({ message: 'That pathway has no curriculum to copy.' });

    const doc = await PathwayCurriculum.findOneAndUpdate(
      { tenantId, pathwayKey: to },
      { $set: { days: src.days, updatedBy: whoOf(req) } },
      { new: true, upsert: true },
    );
    res.json({ pathwayKey: to, days: doc.days, copiedFrom: from });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not copy' });
  }
};

/**
 * POST /passport/curriculum/:pathwayKey/draft — { count, brief }
 *
 * APPENDS after whatever is already written, so asking twice continues the course
 * instead of restarting it. Nothing is published by this: the days land in the editor
 * for a human to correct, which is the only safe way to let a model near a syllabus a
 * student paid for.
 */
export const draftPathwayCurriculum = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const pathwayKey = String(req.params.pathwayKey);
    const count = Math.min(30, Math.max(1, Number(req.body?.count) || 7));

    const [content, doc] = await Promise.all([
      PassportContent.findOne({ tenantId }).lean() as any,
      PathwayCurriculum.findOne({ tenantId, pathwayKey }),
    ]);

    const track = trackOf(pathwayKey);
    const pw = (content?.pathways || []).find((p: any) => trackOf(p.key) === track);
    const existing = (doc?.days || []) as any[];
    const fromDay = existing.length + 1;
    const journeyDays = content?.journeyDays || 90;

    if (fromDay + count - 1 > journeyDays) {
      return res.status(400).json({
        message: `That would run past day ${journeyDays}, the length of the journey.`,
      });
    }

    const drafted = await draftCurriculumDays({
      tenantId,
      trackKey: track,
      trackLabel: pw?.label || track,
      stage: pathwayKey.includes(':') ? pathwayKey.split(':')[1] : null,
      fromDay,
      count,
      existingTitles: existing.flatMap((d: any) => (d.items || []).map((i: any) => i.title)),
      brief: String(req.body?.brief || '').slice(0, 400),
    });

    if (!drafted.length) return res.status(422).json({ message: 'The draft came back empty. Try again.' });

    const merged = renumber([...existing, ...drafted] as any);
    const saved = await PathwayCurriculum.findOneAndUpdate(
      { tenantId, pathwayKey },
      { $set: { days: merged, aiDraftedAt: new Date(), updatedBy: whoOf(req) } },
      { new: true, upsert: true },
    );
    res.json({ pathwayKey, days: saved.days, added: drafted.length });
  } catch (e: any) {
    console.error('[pathway-curriculum] draft:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not draft' });
  }
};
