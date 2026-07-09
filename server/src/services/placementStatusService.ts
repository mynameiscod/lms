import mongoose from 'mongoose';
import User from '../models/User';
import { createNotifications } from '../notifications/notificationService';
import { issueCertificate } from './certificateService';

// The single source of truth for a student's placement. Called by placement drives and
// partner placements so "who is placed" is answerable in one query (and shown on the profile).

interface MarkPlacedInput {
  company?: string;
  role?: string;
  ctc?: number;                 // LPA
  source: 'drive' | 'partner' | 'manual';
  driveId?: string | mongoose.Types.ObjectId;
  partnerId?: string | mongoose.Types.ObjectId;
}

export async function markStudentPlaced(tenantId: string, userId: string, input: MarkPlacedInput): Promise<void> {
  const user: any = await User.findOne({ _id: userId, tenantId });
  if (!user) return;

  const already = user.placement && ['placed', 'multiple_offers'].includes(user.placement.status);
  const differentCompany = already && input.company && user.placement.company &&
    String(user.placement.company).trim().toLowerCase() !== String(input.company).trim().toLowerCase();

  const offers = (user.placement?.offers || (already ? 1 : 0)) + 1;
  user.placement = {
    status: differentCompany ? 'multiple_offers' : 'placed',
    // Keep the highest-CTC offer as the headline company/role/ctc.
    company: (already && (user.placement.ctc || 0) > (input.ctc || 0)) ? user.placement.company : (input.company || user.placement?.company),
    role: (already && (user.placement.ctc || 0) > (input.ctc || 0)) ? user.placement.role : (input.role || user.placement?.role),
    ctc: Math.max(input.ctc || 0, user.placement?.ctc || 0) || input.ctc || user.placement?.ctc,
    source: input.source,
    offers,
    placedAt: user.placement?.placedAt || new Date(),
    driveId: input.driveId ? new mongoose.Types.ObjectId(String(input.driveId)) : user.placement?.driveId,
    partnerId: input.partnerId ? new mongoose.Types.ObjectId(String(input.partnerId)) : user.placement?.partnerId,
  };
  await user.save();

  try {
    const where = input.company ? ` at ${input.company}` : '';
    await createNotifications(String(tenantId), [String(userId)], 'general',
      '🎉 Congratulations — you\'re placed!',
      `You've been marked placed${where}${input.ctc ? ` · ₹${input.ctc} LPA` : ''}. Amazing work!`,
      '/my-applications');
  } catch { /* non-fatal */ }

  // Issue a persistent, verifiable placement certificate (idempotent per student+drive/partner).
  try {
    await issueCertificate({
      tenantId: String(tenantId), type: 'placement', studentId: String(userId),
      studentName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Student',
      title: 'Placement Certificate', company: input.company, role: input.role, ctc: input.ctc,
      referenceModel: input.source === 'partner' ? 'PlacementPartner' : 'PlacementDrive',
      referenceId: input.driveId ? String(input.driveId) : (input.partnerId ? String(input.partnerId) : undefined),
    });
  } catch { /* non-fatal */ }
}

// Notify a student about a drive status change (shortlisted / selected).
export async function notifyDriveStatus(tenantId: string, userId: string, status: string, driveName: string): Promise<void> {
  const map: Record<string, { title: string; body: string }> = {
    shortlisted: { title: '✅ Shortlisted!', body: `You've been shortlisted for ${driveName}. Prepare for the next round.` },
    selected: { title: '🌟 Selected!', body: `You've been selected in ${driveName}. Congratulations!` },
    rejected: { title: 'Update on your application', body: `Your application for ${driveName} didn't move forward this time. Keep going!` },
  };
  const m = map[status];
  if (!m) return;
  try { await createNotifications(String(tenantId), [String(userId)], 'general', m.title, m.body, '/my-applications'); }
  catch { /* non-fatal */ }
}

// Unified placement overview for the admin dashboard — computed from the canonical field.
export async function placementOverview(tenantId: string, opts: { batchId?: string } = {}): Promise<any> {
  const base: any = { tenantId: new mongoose.Types.ObjectId(tenantId), role: 'STUDENT', isActive: { $ne: false } };
  if (opts.batchId) base.batchId = new mongoose.Types.ObjectId(opts.batchId);
  const placedMatch = { ...base, 'placement.status': { $in: ['placed', 'multiple_offers'] } };

  const [totalStudents, placed, ctcAgg, byCompany, recent, byBatch] = await Promise.all([
    User.countDocuments(base),
    User.countDocuments(placedMatch),
    User.aggregate([
      { $match: placedMatch },
      { $group: { _id: null, avg: { $avg: '$placement.ctc' }, max: { $max: '$placement.ctc' }, total: { $sum: '$placement.offers' } } },
    ]),
    User.aggregate([
      { $match: placedMatch },
      { $group: { _id: '$placement.company', count: { $sum: 1 }, avgCtc: { $avg: '$placement.ctc' } } },
      { $sort: { count: -1 } }, { $limit: 12 },
    ]),
    User.find(placedMatch).sort({ 'placement.placedAt': -1 }).limit(15)
      .select('firstName lastName placement batchId').lean(),
    User.aggregate([
      { $match: base },
      { $group: { _id: '$batchId', total: { $sum: 1 }, placed: { $sum: { $cond: [{ $in: ['$placement.status', ['placed', 'multiple_offers']] }, 1, 0] } } } },
    ]),
  ]);

  // Batch names
  const BatchModel = mongoose.model('Batch');
  const batchIds = byBatch.map((b: any) => b._id).filter(Boolean);
  const batches = batchIds.length ? await BatchModel.find({ _id: { $in: batchIds } }).select('name').lean() : [];
  const batchName: Record<string, string> = {};
  (batches as any[]).forEach((b: any) => { batchName[String(b._id)] = b.name; });

  const ctc = ctcAgg[0] || {};
  return {
    totalStudents, placed,
    placementRate: totalStudents ? Math.round((placed / totalStudents) * 1000) / 10 : 0,
    avgCtc: ctc.avg ? Math.round(ctc.avg * 10) / 10 : 0,
    highestCtc: ctc.max || 0,
    totalOffers: ctc.total || 0,
    byCompany: byCompany.map((c: any) => ({ company: c._id || 'Unknown', count: c.count, avgCtc: Math.round((c.avgCtc || 0) * 10) / 10 })),
    byBatch: byBatch.map((b: any) => ({ batch: batchName[String(b._id)] || 'No batch', total: b.total, placed: b.placed, rate: b.total ? Math.round((b.placed / b.total) * 1000) / 10 : 0 }))
      .sort((a: any, b: any) => b.placed - a.placed),
    recent: recent.map((r: any) => ({ name: [r.firstName, r.lastName].filter(Boolean).join(' '), company: r.placement?.company, role: r.placement?.role, ctc: r.placement?.ctc, placedAt: r.placement?.placedAt })),
  };
}
