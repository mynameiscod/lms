import { Response } from 'express';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import PlacementPartner, {
  PARTNER_STAGES, PARTNER_STAGE_IDS, normalizeCompanyKey, PartnerStage, PartnerTier, PartnerPriority, FresherFit,
} from '../models/PlacementPartner';
import StudentProfile from '../models/StudentProfile';
import User from '../models/User';
import { createPartnerTask } from '../services/partnerTaskService';
import { generateOnePager } from '../services/candidateProfilePdf';
import { EmailService } from '../services/emailService';
import * as settings from '../services/settingsService';

const oid = (s: string) => new mongoose.Types.ObjectId(s);
const tId = (req: AuthenticatedRequest) => req.user!.tenantId as string;
const uId = (req: AuthenticatedRequest) => req.user!.id as string;

// POST /placement-partners/attachments — upload a file to attach to an outreach email
export const uploadAttachment = async (req: AuthenticatedRequest, res: Response) => {
  const f = (req as any).file;
  if (!f) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.json({
    success: true,
    data: { filename: f.originalname, path: f.path, size: f.size, contentType: f.mimetype, url: `/uploads/partner-attachments/${f.filename}` },
  });
};

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
      // Interested → remind me to match & send candidate profiles.
      if (stage === 'interested') {
        await createPartnerTask(partner, 'interested',
          `🎯 ${partner.companyName} is interested — match students & send candidate profiles`,
          { userId: uId(req) });
      }
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

const DEFAULT_STACK = ['java', 'spring', 'springboot', 'react', 'sql', 'javascript', 'html', 'css', 'mysql', 'rest', 'api', 'node'];
const tokenize = (s: string) => (s || '').toLowerCase().match(/[a-z0-9+#.]{2,}/g) || [];

// GET /placement-partners/:id/match-students — rank available students by skill fit
export const matchStudents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partner = await PlacementPartner.findOne({ _id: req.params.id, tenantId: oid(tId(req)) }).lean();
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });
    const limit = Math.min(parseInt(String(req.query.limit || '12')), 50);

    // Desired skills = outreach angle keywords + default Java full-stack stack.
    const desired = Array.from(new Set([...tokenize(partner.outreachAngle || ''), ...DEFAULT_STACK]));

    // "Available" = active students in this tenant not already placed via any partner.
    const placed = await PlacementPartner.distinct('placement.studentId', { tenantId: oid(tId(req)), 'placement.studentId': { $ne: null } });
    const placedSet = new Set(placed.map((p: any) => String(p)));

    const profiles = await StudentProfile.find({ tenantId: oid(tId(req)) })
      .select('userId technicalBackground').limit(1000).lean();

    const userIds = profiles.map(p => p.userId);
    const users = await User.find({ _id: { $in: userIds }, role: 'STUDENT', isActive: true })
      .select('firstName lastName email').lean();
    const userMap = new Map(users.map((u: any) => [String(u._id), u]));

    const ranked = profiles
      .map((p: any) => {
        const u = userMap.get(String(p.userId));
        if (!u || placedSet.has(String(p.userId))) return null;
        const skills: string[] = [
          ...(p.technicalBackground?.programmingLanguages || []),
          ...(p.technicalBackground?.technologies || []),
        ];
        const skillTokens = new Set(skills.flatMap(tokenize));
        const matched = desired.filter(d => skillTokens.has(d));
        return {
          studentId: String(p.userId),
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          email: u.email,
          experienceLevel: p.technicalBackground?.experienceLevel || '',
          skills,
          matchedSkills: matched,
          score: matched.length,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit);

    res.json({ success: true, message: 'OK', data: ranked });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners/:id/candidates  { studentId }
export const addCandidate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ success: false, message: 'studentId required' });
    const partner = await PlacementPartner.findOne({ _id: req.params.id, tenantId: oid(tId(req)) });
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });
    if (partner.candidates.some(c => String(c.studentId) === String(studentId)))
      return res.json({ success: true, message: 'Already added', data: partner });
    const u: any = await User.findOne({ _id: studentId, tenantId: oid(tId(req)) }).select('firstName lastName').lean();
    partner.candidates.push({ studentId: oid(studentId), studentName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '', addedAt: new Date(), addedBy: oid(uId(req)) });
    await partner.save();
    res.json({ success: true, message: 'Candidate added', data: partner });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /placement-partners/:id/candidates/:studentId
export const removeCandidate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partner = await PlacementPartner.findOne({ _id: req.params.id, tenantId: oid(tId(req)) });
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });
    partner.candidates = partner.candidates.filter(c => String(c.studentId) !== String(req.params.studentId)) as any;
    await partner.save();
    res.json({ success: true, message: 'Candidate removed', data: partner });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /placement-partners/:id/candidate-pdf/:studentId — preview/download one-pager
export const candidatePdf = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partner = await PlacementPartner.findOne({ _id: req.params.id, tenantId: oid(tId(req)) }).lean();
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });
    const pdf = await generateOnePager(req.params.studentId, tId(req));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pdf.fileName}"`);
    res.send(pdf.buffer);
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners/:id/mark-placed  { studentId?, studentName, ctc? }
export const markPlaced = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId, studentName, ctc } = req.body;
    const partner = await PlacementPartner.findOne({ _id: req.params.id, tenantId: oid(tId(req)) });
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });

    const guaranteeDays = settings.getNum('PLACEMENT_GUARANTEE_DAYS', 90, tId(req));
    const now = new Date();
    partner.placement = {
      studentId: studentId ? oid(studentId) : undefined,
      studentName: studentName || partner.candidates.find(c => String(c.studentId) === String(studentId))?.studentName || '',
      ctc: ctc != null && ctc !== '' ? Number(ctc) : undefined,
      placedAt: now,
      guaranteeEndsAt: new Date(now.getTime() + guaranteeDays * 24 * 60 * 60 * 1000),
    };
    if (partner.stage !== 'placed') {
      partner.stageHistory.push({ from: partner.stage, to: 'placed', at: now, by: oid(uId(req)) });
      partner.stage = 'placed';
    }
    partner.outreach.status = 'stopped';
    await partner.save();
    res.json({ success: true, message: 'Marked as placed 🎉', data: partner });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// GET /placement-partners/analytics — funnel, response rate by tier, placements, est. revenue
export const analytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partners = await PlacementPartner.find({ tenantId: oid(tId(req)) })
      .select('tier stage outreach interviews placement').lean();
    const rank: Record<string, number> = { target: 0, contacted: 1, replied: 2, interested: 3, interviewing: 4, placed: 5, not_a_fit: 0 };
    const tiers = ['tier1', 'tier2', 'tier3'];
    const byTier: Record<string, { total: number; contacted: number; replied: number; placed: number }> = {};
    tiers.forEach(t => (byTier[t] = { total: 0, contacted: 0, replied: 0, placed: 0 }));
    const funnel = { total: partners.length, contacted: 0, replied: 0, interviewing: 0, placed: 0 };
    let placements = 0, sumCtc = 0;

    for (const p of partners as any[]) {
      const r = rank[p.stage] ?? 0;
      const contacted = (p.outreach?.emailsSent || 0) > 0 || r >= 1;
      const replied = !!p.outreach?.repliedAt || r >= 2;
      const interviewing = (p.interviews?.length || 0) > 0 || r >= 4;
      const placed = p.stage === 'placed' || !!p.placement?.placedAt;
      if (contacted) funnel.contacted++;
      if (replied) funnel.replied++;
      if (interviewing) funnel.interviewing++;
      if (placed) { funnel.placed++; placements++; sumCtc += p.placement?.ctc || 0; }
      const tb = byTier[p.tier];
      if (tb) { tb.total++; if (contacted) tb.contacted++; if (replied) tb.replied++; if (placed) tb.placed++; }
    }
    const feePct = settings.getNum('PLACEMENT_FEE_PERCENT', 8.33, tId(req));
    const responseRate = funnel.contacted ? Math.round((funnel.replied / funnel.contacted) * 100) : 0;
    const tierRows = tiers.map(t => ({
      tier: t, ...byTier[t],
      responseRate: byTier[t].contacted ? Math.round((byTier[t].replied / byTier[t].contacted) * 100) : 0,
    }));
    res.json({ success: true, message: 'OK', data: { funnel, responseRate, byTier: tierRows, placements, sumCtc, feePct, estRevenue: +(sumCtc * feePct / 100).toFixed(2) } });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners/:id/schedule-interview
export const scheduleInterview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { scheduledAt, mode, candidateNames, notes, notifyCompany } = req.body;
    if (!scheduledAt) return res.status(400).json({ success: false, message: 'scheduledAt is required' });
    const partner = await PlacementPartner.findOne({ _id: req.params.id, tenantId: oid(tId(req)) });
    if (!partner) return res.status(404).json({ success: false, message: 'Not found' });

    const names: string[] = Array.isArray(candidateNames) && candidateNames.length
      ? candidateNames : partner.candidates.map(c => c.studentName).filter(Boolean);
    partner.interviews.push({ scheduledAt: new Date(scheduledAt), mode: mode || 'Online', candidateNames: names, notes, createdAt: new Date(), createdBy: oid(uId(req)) });

    if (partner.stage !== 'placed' && partner.stage !== 'interviewing') {
      partner.stageHistory.push({ from: partner.stage, to: 'interviewing', at: new Date(), by: oid(uId(req)) });
      partner.stage = 'interviewing';
    }
    await partner.save();

    const when = new Date(scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    // Reminder for me the day of the interview.
    await createPartnerTask(partner, 'manual', `🗓 Interview with ${partner.companyName} — ${when}`, { userId: uId(req) });

    // Optional logistics email to the company (not a trust point → sent directly).
    if (notifyCompany && partner.contactEmail) {
      const fn = (partner.contactName || '').trim().split(/\s+/)[0] || 'there';
      const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1f2937">
        <p>Hi ${fn},</p>
        <p>Confirming the interview${names.length ? ` for ${names.join(', ')}` : ''}:</p>
        <p><b>When:</b> ${when}<br/><b>Mode:</b> ${mode || 'Online'}${notes ? `<br/><b>Notes:</b> ${notes}` : ''}</p>
        <p>Please let me know if you'd like to reschedule. Thank you!</p>
        <p>— CodeBegun Placements</p></div>`;
      await new EmailService(tId(req)).sendGenericEmail(partner.contactEmail, `Interview confirmation — ${partner.companyName}`, html);
    }

    res.json({ success: true, message: 'Interview scheduled', data: partner });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
