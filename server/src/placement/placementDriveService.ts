import PlacementDrive from '../models/PlacementDrive';
import CollegeMembership from '../models/CollegeMembership';
import User from '../models/User';
import mongoose from 'mongoose';
import { eventBus } from '../utils/eventBus';
import * as placementStatus from '../services/placementStatusService';

export const listDrives = (tenantId: string, status?: string) => {
  const query: Record<string, any> = { tenantId, isActive: true };
  if (status) query.status = status;
  return PlacementDrive.find(query)
    .populate('createdBy', 'firstName lastName')
    .sort({ applyDeadline: 1 });
};

export const getDriveById = (id: string, tenantId: string) =>
  PlacementDrive.findOne({ _id: id, tenantId })
    .populate('createdBy', 'firstName lastName')
    .populate('applicants', 'firstName lastName email');

export const createDrive = async (tenantId: string, createdBy: string, data: any) => {
  const drive = await PlacementDrive.create({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    createdBy: new mongoose.Types.ObjectId(createdBy),
    ...data
  });
  // Notify eligible students
  eventBus.emit('placement.drive.created', {
    tenantId,
    driveId: String(drive._id),
    companyName: drive.companyName,
    role: drive.role,
    applyDeadline: drive.applyDeadline?.toISOString(),
    allowedBranches: drive.eligibility?.allowedBranches,
    allowedYears: drive.eligibility?.allowedYears,
    minCgpa: drive.eligibility?.minCgpa,
  });
  return drive;
};

export const updateDrive = (id: string, tenantId: string, data: any) =>
  PlacementDrive.findOneAndUpdate({ _id: id, tenantId }, data, { new: true, runValidators: true });

export const deleteDrive = (id: string, tenantId: string) =>
  PlacementDrive.findOneAndUpdate({ _id: id, tenantId }, { isActive: false }, { new: true });

export const applyToDrive = async (id: string, tenantId: string, userId: string) => {
  const drive = await PlacementDrive.findOne({ _id: id, tenantId, status: { $in: ['upcoming', 'ongoing'] } });
  if (!drive) return null;

  // CGPA eligibility check
  if (drive.eligibility?.minCgpa != null) {
    const membership = await CollegeMembership.findOne({ userId, tenantId }).lean();
    const studentCgpa = (membership as any)?.cgpa;
    if (studentCgpa == null || studentCgpa < drive.eligibility.minCgpa) {
      throw Object.assign(
        new Error(`Minimum CGPA of ${drive.eligibility.minCgpa} required (your CGPA: ${studentCgpa ?? 'not set'})`),
        { statusCode: 403 }
      );
    }
  }

  return PlacementDrive.findOneAndUpdate(
    { _id: id, tenantId, status: { $in: ['upcoming', 'ongoing'] } },
    { $addToSet: { applicants: new mongoose.Types.ObjectId(userId) } },
    { new: true }
  );
};

export const withdrawFromDrive = (id: string, tenantId: string, userId: string) =>
  PlacementDrive.findOneAndUpdate(
    { _id: id, tenantId },
    { $pull: { applicants: new mongoose.Types.ObjectId(userId) } },
    { new: true }
  );

export const getDriveStats = async (tenantId: string) => {
  const drives = await PlacementDrive.find({ tenantId, isActive: true }).lean();
  const total = drives.length;
  const byStatus = drives.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});
  const totalApplicants = drives.reduce((sum, d) => sum + (d.applicants?.length || 0), 0);
  const breakdown = drives
    .sort((a, b) => (b.applicants?.length || 0) - (a.applicants?.length || 0))
    .map(d => ({
      _id: d._id,
      companyName: d.companyName,
      role: d.role,
      status: d.status,
      applicantCount: d.applicants?.length || 0,
      driveDate: d.driveDate,
      applyDeadline: d.applyDeadline,
    }));
  return { total, byStatus, totalApplicants, breakdown };
};

// ─── Round management ────────────────────────────────────────────────────────

export const addRound = async (id: string, tenantId: string, round: { name: string; date?: string; venue?: string; description?: string }) => {
  return PlacementDrive.findOneAndUpdate(
    { _id: id, tenantId },
    { $push: { rounds: round } },
    { new: true }
  );
};

export const updateRound = async (id: string, tenantId: string, roundIndex: number, data: Partial<{ name: string; date: string; venue: string; description: string }>) => {
  const updateFields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    updateFields[`rounds.${roundIndex}.${k}`] = v;
  }
  return PlacementDrive.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: updateFields },
    { new: true }
  );
};

export const removeRound = async (id: string, tenantId: string, roundIndex: number) => {
  const drive = await PlacementDrive.findOne({ _id: id, tenantId });
  if (!drive) return null;
  (drive.rounds as any[]).splice(roundIndex, 1);
  return drive.save();
};

// ─── Applicant status management ─────────────────────────────────────────────

export const getDriveApplicants = (id: string, tenantId: string) =>
  PlacementDrive.findOne({ _id: id, tenantId })
    .populate('applicants', 'firstName lastName email profilePicture')
    .select('applicants applicantStatuses companyName role');

export const updateApplicantStatus = async (
  id: string,
  tenantId: string,
  userId: string,
  status: 'applied' | 'shortlisted' | 'selected' | 'rejected' | 'placed'
) => {
  const drive = await PlacementDrive.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: { [`applicantStatuses.${userId}`]: status } },
    { new: true }
  );
  // Sync canonical placement + notify the student.
  if (drive) {
    if (status === 'placed') {
      await placementStatus.markStudentPlaced(tenantId, userId, {
        company: drive.companyName, role: drive.role, ctc: (drive as any).ctcMax ?? (drive as any).ctcMin, source: 'drive', driveId: id,
      });
    } else {
      await placementStatus.notifyDriveStatus(tenantId, userId, status, drive.companyName);
    }
  }
  return drive;
};

// ─── College snapshot (for admin dashboard) ───────────────────────────────────
export const getCollegeSnapshot = async (tenantId: string) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const drives = await PlacementDrive.find({ tenantId, isActive: true }).lean();

  const activeDrives = drives.filter(d => d.status === 'ongoing' || d.status === 'upcoming').length;

  // Count applicants who applied this month (approximated via driveDate + applicants)
  const applicantsThisMonth = drives
    .filter(d => d.driveDate && new Date(d.driveDate) >= monthStart)
    .reduce((sum, d) => sum + (d.applicants?.length || 0), 0);

  // Count placed students across all drives
  let placedStudents = 0;
  let topCompany = '';
  let maxPlaced = 0;
  for (const d of drives) {
    if (!d.applicantStatuses) continue;
    const map = d.applicantStatuses instanceof Map ? d.applicantStatuses : new Map(Object.entries(d.applicantStatuses as any));
    const placed = [...(map as Map<string, string>).values()].filter(s => s === 'placed').length;
    placedStudents += placed;
    if (placed > maxPlaced) { maxPlaced = placed; topCompany = d.companyName; }
  }

  return { activeDrives, applicantsThisMonth, placedStudents, topCompany: topCompany || 'N/A' };
};

// ─── Bulk status import ───────────────────────────────────────────────────────
export const bulkUpdateApplicantStatuses = async (
  id: string,
  tenantId: string,
  updates: { email?: string; rollNumber?: string; status: string }[]
) => {
  const allowed = ['applied', 'shortlisted', 'selected', 'rejected', 'placed'];
  const valid = updates.filter(u => allowed.includes(u.status));
  if (!valid.length) return { updated: 0, errors: ['No valid rows'] };

  // Resolve emails to userIds
  const emails = valid.filter(u => u.email).map(u => u.email!);
  const rollNumbers = valid.filter(u => u.rollNumber).map(u => u.rollNumber!);

  const [usersByEmail, membersByRoll] = await Promise.all([
    emails.length
      ? (User as any).find({ email: { $in: emails }, tenantId }).select('_id email').lean()
      : [],
    rollNumbers.length
      ? CollegeMembership.find({ rollNumber: { $in: rollNumbers }, tenantId }).select('userId rollNumber').lean()
      : []
  ]);

  const emailToId: Record<string, string> = {};
  for (const u of usersByEmail) emailToId[u.email] = String(u._id);
  const rollToId: Record<string, string> = {};
  for (const m of membersByRoll) rollToId[(m as any).rollNumber] = String((m as any).userId);

  const setFields: Record<string, string> = {};
  const errors: string[] = [];

  for (const row of valid) {
    const uid = row.email ? emailToId[row.email] : row.rollNumber ? rollToId[row.rollNumber] : undefined;
    if (!uid) { errors.push(`Not found: ${row.email || row.rollNumber}`); continue; }
    setFields[`applicantStatuses.${uid}`] = row.status;
  }

  if (!Object.keys(setFields).length) return { updated: 0, errors };

  await PlacementDrive.updateOne({ _id: id, tenantId }, { $set: setFields });

  // Sync canonical placement + notify for each row (best-effort, doesn't block the import).
  const drive: any = await PlacementDrive.findOne({ _id: id, tenantId }).select('companyName role ctcMax ctcMin').lean();
  if (drive) {
    for (const row of valid) {
      const uid = row.email ? emailToId[row.email] : row.rollNumber ? rollToId[row.rollNumber] : undefined;
      if (!uid) continue;
      try {
        if (row.status === 'placed') {
          await placementStatus.markStudentPlaced(tenantId, uid, { company: drive.companyName, role: drive.role, ctc: drive.ctcMax ?? drive.ctcMin, source: 'drive', driveId: id });
        } else {
          await placementStatus.notifyDriveStatus(tenantId, uid, row.status, drive.companyName);
        }
      } catch { /* non-fatal */ }
    }
  }
  return { updated: Object.keys(setFields).length, errors };
};

// ─── Placement Analytics ──────────────────────────────────────────────────────
export const getPlacementAnalytics = async (tenantId: string) => {
  const drives = await PlacementDrive.find({ tenantId, isActive: true }).lean();

  // 1. Offers by company (placed count per company)
  const byCompany: Record<string, number> = {};
  let totalPlaced = 0;
  let totalApplicants = 0;
  let totalShortlisted = 0;
  let totalSelected = 0;

  for (const d of drives) {
    const map: Map<string, string> =
      d.applicantStatuses instanceof Map
        ? d.applicantStatuses
        : new Map(Object.entries(d.applicantStatuses as any ?? {}));

    const values = [...map.values()];
    const placed = values.filter(s => s === 'placed').length;
    const shortlisted = values.filter(s => s === 'shortlisted').length;
    const selected = values.filter(s => s === 'selected').length;

    if (placed > 0) byCompany[d.companyName] = (byCompany[d.companyName] || 0) + placed;
    totalPlaced += placed;
    totalShortlisted += shortlisted;
    totalSelected += selected;
    totalApplicants += d.applicants?.length || 0;
  }

  const offersByCompany = Object.entries(byCompany)
    .map(([company, offers]) => ({ company, offers }))
    .sort((a, b) => b.offers - a.offers)
    .slice(0, 10);

  // 2. Pipeline funnel
  const pipeline = [
    { stage: 'Applied',      count: totalApplicants },
    { stage: 'Shortlisted',  count: totalShortlisted },
    { stage: 'Selected',     count: totalSelected },
    { stage: 'Placed',       count: totalPlaced },
  ];

  // 3. Monthly drive trends (last 12 months)
  const monthlyMap: Record<string, { drives: number; placed: number }> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] = { drives: 0, placed: 0 };
  }
  for (const d of drives) {
    const date = d.driveDate || d.createdAt;
    if (!date) continue;
    const key = `${new Date(date).getFullYear()}-${String(new Date(date).getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) continue;
    monthlyMap[key].drives += 1;
    const map: Map<string, string> =
      d.applicantStatuses instanceof Map
        ? d.applicantStatuses
        : new Map(Object.entries(d.applicantStatuses as any ?? {}));
    monthlyMap[key].placed += [...map.values()].filter(s => s === 'placed').length;
  }
  const monthlyTrends = Object.entries(monthlyMap).map(([month, val]) => ({ month, ...val }));

  // 4. CTC distribution across placed students
  const ctcBuckets: Record<string, number> = {
    '0-5 LPA': 0, '5-10 LPA': 0, '10-15 LPA': 0, '15-20 LPA': 0, '20+ LPA': 0
  };
  for (const d of drives) {
    const ctc = d.ctcMax ?? d.ctcMin ?? 0;
    const map: Map<string, string> =
      d.applicantStatuses instanceof Map
        ? d.applicantStatuses
        : new Map(Object.entries(d.applicantStatuses as any ?? {}));
    const placed = [...map.values()].filter(s => s === 'placed').length;
    if (placed === 0) continue;
    if (ctc >= 20) ctcBuckets['20+ LPA'] += placed;
    else if (ctc >= 15) ctcBuckets['15-20 LPA'] += placed;
    else if (ctc >= 10) ctcBuckets['10-15 LPA'] += placed;
    else if (ctc >= 5) ctcBuckets['5-10 LPA'] += placed;
    else ctcBuckets['0-5 LPA'] += placed;
  }
  const ctcDistribution = Object.entries(ctcBuckets).map(([range, count]) => ({ range, count }));

  // 5. Status summary
  const statusCounts = drives.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  return {
    summary: { totalDrives: drives.length, totalApplicants, totalPlaced, totalShortlisted, totalSelected },
    offersByCompany,
    pipeline,
    monthlyTrends,
    ctcDistribution,
    statusCounts,
  };
};

// ─── Student: my applications ─────────────────────────────────────────────────
export const getMyApplications = async (userId: string, tenantId: string) => {
  const drives = await PlacementDrive.find({
    tenantId,
    isActive: true,
    applicants: new mongoose.Types.ObjectId(userId),
  })
    .populate('createdBy', 'firstName lastName')
    .lean();

  return drives.map(d => {
    const map: Map<string, string> =
      d.applicantStatuses instanceof Map
        ? d.applicantStatuses
        : new Map(Object.entries(d.applicantStatuses as any ?? {}));

    return {
      _id: d._id,
      companyName: d.companyName,
      companyLogo: d.companyLogo,
      role: d.role,
      ctcMin: d.ctcMin,
      ctcMax: d.ctcMax,
      location: d.location,
      driveType: d.driveType,
      driveDate: d.driveDate,
      applyDeadline: d.applyDeadline,
      status: map.get(userId) || 'applied',
      rounds: d.rounds || [],
      driveStatus: d.status,
    };
  });
};
