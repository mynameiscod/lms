import { Request, Response } from 'express';
import SkillEvidence, { EVIDENCE_SOURCE_TYPES, EVIDENCE_CONTRIBUTIONS } from '../models/SkillEvidence';
import CareerSkill from '../models/CareerSkill';
import AuditLog from '../models/AuditLog';
import {
  getSkillsForAssessmentItem, getEvidenceCoverage, findEvidenceCandidates,
  validateEvidenceMapping, cleanEvidence, loadSkillsFor,
} from '../services/skillEvidenceService';
import { adapterFor, SOURCE_ADAPTERS, refKey, EVIDENCE_DIFFICULTIES } from '../services/skillEvidenceSourceRegistry';
import { DEFAULT_DOMAIN } from '../services/careerDomainService';

/**
 * Admin mapping of assessment content to canonical skills.
 *
 * Additive throughout. Nothing here changes a question, an assessment, a score or a
 * student — mapping an item records what it measures and alters nothing about how it is
 * asked or marked. The live assessment generator does not read any of this, deliberately:
 * making it depend on mappings that are still being written would let incomplete
 * configuration break a working exam.
 *
 * Tenant-scoped on every path, because all four content families are. The skills
 * themselves stay global, so a mapping means the same thing everywhere while only the
 * owning tenant may edit it.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const whoOf = (req: Request): string => String((req as any).user?.email || '');

async function audit(req: Request, action: 'CREATE' | 'UPDATE' | 'DELETE', details: string, meta: any) {
  try {
    await AuditLog.create({
      tenantId: (req as any).user?.tenantId || (req as any).tenantId,
      userId: (req as any).user?.id || (req as any).user?._id,
      action, module: 'SYSTEM',
      targetType: 'SkillEvidence',
      details, metadata: meta,
    });
  } catch (e: any) {
    console.warn('[skill-evidence] audit write failed:', e?.message || e);
  }
}

/**
 * GET /passport/skill-evidence — a page of content with its mappings.
 *
 * Query: sourceType, search, filter=all|unmapped|mapped|stale, page, limit.
 *
 * One page of content, ONE evidence query for that page, one skill query. Never a query
 * per item — this screen exists to work through hundreds of questions.
 */
export const listEvidence = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const sourceType = String(req.query.sourceType || 'assessment_item');
    const adapter = adapterFor(sourceType);
    if (!adapter) return res.status(400).json({ message: `${sourceType} is not a supported content type.` });

    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 25));
    const page = Math.max(0, Number(req.query.page) || 0);
    const filter = String(req.query.filter || 'all');

    const { items, total } = await adapter.list(tenantId, {
      search: String(req.query.search || '').trim() || undefined,
      limit, skip: page * limit,
    });

    const rows = items.length
      ? await SkillEvidence.find({ tenantId, sourceType, sourceId: { $in: items.map(i => i.sourceId) } }).lean() as any[]
      : [];

    const skills = rows.length
      ? await CareerSkill.find({ key: { $in: [...new Set(rows.map(r => r.skillKey))] } }).select('key name active assessable').lean() as any[]
      : [];
    const skillByKey = new Map(skills.map(s => [s.key, s]));

    const byItem = new Map<string, any[]>();
    for (const r of rows) {
      const k = refKey(r.sourceType, r.sourceId);
      const s = skillByKey.get(r.skillKey);
      (byItem.get(k) || byItem.set(k, []).get(k)!).push({
        skillKey: r.skillKey, contribution: r.contribution, active: r.active !== false,
        skillName: s?.name || r.skillKey.replace(/_/g, ' '),
        skillActive: s ? s.active !== false : false,
        skillAssessable: s ? !!s.assessable : false,
        missing: !s,
      });
    }

    let out = items.map(i => {
      const ev = byItem.get(refKey(i.sourceType, i.sourceId)) || [];
      return {
        ...i,
        evidence: ev,
        primarySkillKey: ev.find(e => e.contribution === 'PRIMARY' && e.active)?.skillKey || null,
        stale: ev.some(e => e.missing || !e.skillActive),
      };
    });

    // Filtered after the page is assembled. Filtering unmapped items inside the content
    // query is not possible — the mapping lives in a different collection — and the
    // alternative would be a scan of every question on every request.
    if (filter === 'unmapped') out = out.filter(i => !i.evidence.length);
    if (filter === 'mapped') out = out.filter(i => i.evidence.length > 0);
    if (filter === 'stale') out = out.filter(i => i.stale);

    res.json({
      items: out,
      total, page, limit,
      filteredOnPage: filter !== 'all',
      sourceTypes: EVIDENCE_SOURCE_TYPES.map(t => ({ key: t, label: SOURCE_ADAPTERS[t].label })),
      contributions: EVIDENCE_CONTRIBUTIONS,
      difficulties: EVIDENCE_DIFFICULTIES,
    });
  } catch (e: any) {
    console.error('[skill-evidence] list:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not load assessment content' });
  }
};

/** GET /passport/skill-evidence/:sourceType/:sourceId */
export const getItemEvidence = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const { sourceType, sourceId } = req.params;
    if (!adapterFor(sourceType)) return res.status(400).json({ message: `${sourceType} is not a supported content type.` });

    res.json({ item: await getSkillsForAssessmentItem(tenantId, sourceType, String(sourceId)) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load the mapping' });
  }
};

/**
 * PUT /passport/skill-evidence/:sourceType/:sourceId — replace an item's whole mapping.
 *
 * Whole-set rather than per-row: an admin sees one item's skills together and saves once,
 * and removal becomes ordinary — a skill left out is unmapped — rather than needing its
 * own endpoint.
 */
export const saveItemEvidence = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const { sourceType, sourceId } = req.params;
    const adapter = adapterFor(sourceType);
    if (!adapter) return res.status(400).json({ message: `${sourceType} is not a supported content type.` });

    // The content must exist and belong to this tenant. The adapter's query is
    // tenant-scoped, so an id from another tenant simply does not resolve.
    const found = await adapter.loadMany(tenantId, [String(sourceId)]);
    if (!found.length) return res.status(404).json({ message: 'That assessment content does not exist.' });

    const evidence = cleanEvidence(req.body?.evidence);
    const existing = await SkillEvidence.find({ tenantId, sourceType, sourceId }).lean() as any[];
    const skills = await loadSkillsFor(evidence);

    const check = validateEvidenceMapping({
      sourceType,
      evidence,
      skills,
      existingSkillKeys: existing.map(e => e.skillKey),
    });
    if (!check.ok) return res.status(400).json({ message: check.message });

    const wanted = new Set(evidence.map(e => e.skillKey));
    const removed = existing.filter(e => !wanted.has(e.skillKey)).map(e => e.skillKey);

    // Removing a mapping removes the RELATIONSHIP. The question and the skill are both
    // untouched — nothing in this handler writes to either collection.
    if (removed.length) {
      await SkillEvidence.deleteMany({ tenantId, sourceType, sourceId, skillKey: { $in: removed } });
    }

    for (const e of evidence) {
      await SkillEvidence.findOneAndUpdate(
        { sourceType, sourceId, skillKey: e.skillKey },
        {
          $set: {
            tenantId, contribution: e.contribution, active: e.active,
            sourceParentId: found[0].sourceParentId, updatedBy: whoOf(req),
          },
          $setOnInsert: { createdBy: whoOf(req) },
        },
        { upsert: true },
      );
    }

    const primary = evidence.find(e => e.contribution === 'PRIMARY')?.skillKey;
    await audit(req, existing.length ? 'UPDATE' : 'CREATE',
      `Mapped ${sourceType} to ${evidence.length} skill(s)${primary ? `, primary ${primary}` : ''}`,
      { sourceType, sourceId, skills: evidence.map(e => e.skillKey) });

    res.json({ item: await getSkillsForAssessmentItem(tenantId, sourceType, String(sourceId)) });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'That skill is already mapped to this item.' });
    console.error('[skill-evidence] save:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not save the mapping' });
  }
};

/** GET /passport/skill-evidence/coverage — how much evidence exists per skill. */
export const coverage = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const rows = await getEvidenceCoverage(tenantId);

    res.json({
      coverage: rows,
      sourceTypes: EVIDENCE_SOURCE_TYPES.map(t => ({ key: t, label: SOURCE_ADAPTERS[t].label })),
      totals: {
        skills: rows.length,
        withEvidence: rows.filter(r => r.total > 0).length,
        withoutEvidence: rows.filter(r => r.total === 0 && r.active && r.assessable).length,
        mappings: rows.reduce((n, r) => n + r.total, 0),
      },
    });
  } catch (e: any) {
    console.error('[skill-evidence] coverage:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not load coverage' });
  }
};

/**
 * GET /passport/skill-evidence/candidates — the pool for a set of skills.
 *
 * Exposed so the shape a later generator needs can be exercised now. It returns what is
 * ELIGIBLE; choosing which items a particular student sees is a different decision, made
 * with knowledge this module does not have.
 */
export const candidates = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const skillKeys = String(req.query.skills || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!skillKeys.length) return res.status(400).json({ message: 'Name at least one skill.' });

    const pools = await findEvidenceCandidates(tenantId, {
      skillKeys,
      sourceTypes: String(req.query.sourceTypes || '').split(',').filter(Boolean),
      difficulty: (req.query.difficulty as any) || undefined,
      limitPerSkill: Math.min(50, Number(req.query.limit) || 20),
    });

    res.json({ pools: pools.map(p => ({ skillKey: p.skillKey, count: p.items.length, items: p.items })) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load candidates' });
  }
};

/** GET /passport/skill-evidence/skills — assessable skills for the picker. */
export const mappableSkills = async (_req: Request, res: Response) => {
  try {
    // Only active, assessable, non-group skills may be NEWLY mapped, so those are the only
    // ones offered. The frontend holds no skill list of its own.
    const skills = await CareerSkill.find({
      domainKey: DEFAULT_DOMAIN, nodeType: 'SKILL', active: true, assessable: true,
    }).select('key name aliases parentKey difficulty').sort({ displayOrder: 1, name: 1 }).lean() as any[];

    res.json({
      skills: skills.map(s => ({
        key: s.key, name: s.name, aliases: s.aliases || [],
        parentKey: s.parentKey || null, difficulty: s.difficulty,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load skills' });
  }
};
