import { Response } from 'express';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import PlacementPartner, {
  PARTNER_STAGES, PARTNER_STAGE_IDS, normalizeCompanyKey, PartnerStage, PartnerTier, PartnerPriority, FresherFit,
} from '../models/PlacementPartner';

const oid = (s: string) => new mongoose.Types.ObjectId(s);
const tId = (req: AuthenticatedRequest) => req.user!.tenantId as string;
const uId = (req: AuthenticatedRequest) => req.user!.id as string;

// ── Normalizers (tolerant of messy CSV values) ───────────────────────────────
const pick = (row: any, ...keys: string[]): string => {
  for (const k of keys) { if (row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim(); }
  return '';
};
const normTier = (v: string): PartnerTier => {
  const s = v.toLowerCase().replace(/[^0-9a-z]/g, '');
  if (/1|one|a$/.test(s)) return 'tier1';
  if (/2|two|b$/.test(s)) return 'tier2';
  return 'tier3';
};
const normLevel = (v: string, def: 'high' | 'medium' | 'low' = 'medium'): PartnerPriority | FresherFit => {
  const s = v.toLowerCase();
  if (/high|hot|h\b|p1|1/.test(s)) return 'high';
  if (/low|cold|l\b|p3|3/.test(s)) return 'low';
  if (/med|warm|m\b|p2|2/.test(s)) return 'medium';
  return def;
};

function parseCsv(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    Readable.from(buffer)
      .pipe(csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, '_') }))
      .on('data', r => rows.push(r))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// GET /placement-partners/stages — board column metadata
export const getStages = async (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, message: 'OK', data: PARTNER_STAGES });
};

// GET /placement-partners — flat list with filters
export const listPartners = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filter: any = { tenantId: oid(tId(req)) };
    if (req.query.tier) filter.tier = req.query.tier;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.stage) filter.stage = req.query.stage;
    if (req.query.search) filter.companyName = { $regex: String(req.query.search), $options: 'i' };
    const rows = await PlacementPartner.find(filter).sort({ priority: 1, updatedAt: -1 }).limit(1000).lean();
    res.json({ success: true, message: 'OK', data: rows });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /placement-partners/:id
export const getPartner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const row = await PlacementPartner.findOne({ _id: req.params.id, tenantId: oid(tId(req)) }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'OK', data: row });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners — manual add
export const createPartner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const b = req.body;
    if (!b.companyName || !String(b.companyName).trim()) return res.status(400).json({ success: false, message: 'companyName is required' });
    const companyKey = normalizeCompanyKey(b.companyName);
    const exists = await PlacementPartner.findOne({ tenantId: oid(tId(req)), companyKey });
    if (exists) return res.status(409).json({ success: false, message: 'A partner with this company name already exists' });
    const partner = await PlacementPartner.create({
      ...b,
      companyKey,
      tenantId: oid(tId(req)),
      source: 'manual',
      createdBy: oid(uId(req)),
      stageHistory: [{ to: b.stage || 'target', at: new Date(), by: oid(uId(req)) }],
    });
    res.status(201).json({ success: true, message: 'Created', data: partner });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// PATCH /placement-partners/:id — update editable fields
const EDITABLE = ['companyName', 'website', 'location', 'tier', 'priority', 'fresherFit', 'outreachAngle', 'notes',
  'contactName', 'contactEmail', 'contactTitle', 'contactPhone', 'contactLinkedin'];
export const updatePartner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partner = await PlacementPartner.findOne({ _id: req.params.id, tenantId: oid(tId(req)) });
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });
    for (const k of EDITABLE) if (req.body[k] !== undefined) (partner as any)[k] = req.body[k];
    if (req.body.companyName !== undefined) partner.companyKey = normalizeCompanyKey(req.body.companyName);
    await partner.save();
    res.json({ success: true, message: 'Updated', data: partner });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// PATCH /placement-partners/:id/stage — move on the board (records history)
export const moveStage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stage = req.body.stage as PartnerStage;
    if (!PARTNER_STAGE_IDS.includes(stage)) return res.status(400).json({ success: false, message: 'Invalid stage' });
    const partner = await PlacementPartner.findOne({ _id: req.params.id, tenantId: oid(tId(req)) });
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });
    if (partner.stage !== stage) {
      partner.stageHistory.push({ from: partner.stage, to: stage, at: new Date(), by: oid(uId(req)) });
      partner.stage = stage;
      await partner.save();
    }
    res.json({ success: true, message: 'Stage updated', data: partner });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /placement-partners/:id
export const deletePartner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const r = await PlacementPartner.deleteOne({ _id: req.params.id, tenantId: oid(tId(req)) });
    if (!r.deletedCount) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners/import — tiered CSV upload (idempotent upsert by companyKey)
export const importPartners = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file uploaded (field name: file)' });
    const rows = await parseCsv(req.file.buffer);
    if (!rows.length) return res.status(400).json({ success: false, message: 'CSV is empty or unparseable' });

    let created = 0, updated = 0, skipped = 0;
    const errors: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const companyName = pick(row, 'company', 'company_name', 'name', 'organization');
      if (!companyName) { skipped++; errors.push({ row: i + 2, reason: 'Missing company name' }); continue; }

      const doc: any = {
        companyName,
        website:  pick(row, 'website', 'url', 'domain', 'site'),
        location: pick(row, 'location', 'city', 'place'),
        tier:     normTier(pick(row, 'tier', 'tier_level', 'category')),
        priority: normLevel(pick(row, 'priority', 'temperature'), 'medium') as PartnerPriority,
        fresherFit: normLevel(pick(row, 'fresher_fit', 'fresherfit', 'fit', 'fresher_friendly'), 'medium') as FresherFit,
        outreachAngle: pick(row, 'outreach_angle', 'angle', 'pitch', 'hook'),
        notes:    pick(row, 'notes', 'remarks', 'comment'),
        contactName:  pick(row, 'contact_name', 'contact', 'hr_name', 'recruiter', 'poc'),
        contactEmail: pick(row, 'contact_email', 'email', 'hr_email').toLowerCase(),
        contactTitle: pick(row, 'contact_title', 'title', 'designation', 'role'),
        contactPhone: pick(row, 'contact_phone', 'phone', 'mobile', 'contact_number'),
        contactLinkedin: pick(row, 'contact_linkedin', 'linkedin'),
      };

      try {
        const companyKey = normalizeCompanyKey(companyName);
        const existing = await PlacementPartner.findOne({ tenantId: oid(tId(req)), companyKey });
        if (existing) {
          // Update only non-empty incoming fields; never clobber pipeline state.
          for (const k of Object.keys(doc)) if (doc[k] !== '' && doc[k] != null) (existing as any)[k] = doc[k];
          await existing.save();
          updated++;
        } else {
          await PlacementPartner.create({
            ...doc, companyKey, tenantId: oid(tId(req)), source: 'csv', createdBy: oid(uId(req)),
            stage: 'target', stageHistory: [{ to: 'target', at: new Date(), by: oid(uId(req)) }],
          });
          created++;
        }
      } catch (rowErr: any) {
        skipped++; errors.push({ row: i + 2, reason: rowErr.message });
      }
    }

    res.json({ success: true, message: `Imported ${created} new, updated ${updated}`, data: { created, updated, skipped, total: rows.length, errors: errors.slice(0, 20) } });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
