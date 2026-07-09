import mongoose from 'mongoose';
import Alumni from '../models/Alumni';
import AlumniReferral from '../models/AlumniReferral';
import User from '../models/User';
import { createNotifications } from '../notifications/notificationService';

export const listAlumni = (tenantId: string, filters: { year?: number; department?: string; mentoring?: boolean } = {}) => {
  const query: Record<string, any> = { tenantId, isActive: true };
  if (filters.year) query.graduationYear = filters.year;
  if (filters.department) query.department = { $regex: filters.department, $options: 'i' };
  if (filters.mentoring === true) query.isAvailableForMentoring = true;
  return Alumni.find(query).sort({ graduationYear: -1, firstName: 1 });
};

export const getAlumniById = (id: string, tenantId: string) =>
  Alumni.findOne({ _id: id, tenantId, isActive: true });

export const createAlumni = (tenantId: string, data: Record<string, any>) =>
  Alumni.create({ tenantId, ...data });

export const updateAlumni = (id: string, tenantId: string, data: Record<string, any>) =>
  Alumni.findOneAndUpdate({ _id: id, tenantId }, data, { new: true, runValidators: true });

export const deleteAlumni = (id: string, tenantId: string) =>
  Alumni.findOneAndUpdate({ _id: id, tenantId }, { isActive: false }, { new: true });

export const getAlumniStats = async (tenantId: string) => {
  const alumni = await Alumni.find({ tenantId, isActive: true }).lean();
  const total = alumni.length;
  const mentors = alumni.filter(a => a.isAvailableForMentoring).length;

  const byYear = alumni.reduce<Record<number, number>>((acc, a) => {
    acc[a.graduationYear] = (acc[a.graduationYear] || 0) + 1;
    return acc;
  }, {});

  const byDept = alumni.reduce<Record<string, number>>((acc, a) => {
    if (a.department) acc[a.department] = (acc[a.department] || 0) + 1;
    return acc;
  }, {});

  const topCompanies = alumni
    .filter(a => a.currentCompany)
    .reduce<Record<string, number>>((acc, a) => {
      acc[a.currentCompany!] = (acc[a.currentCompany!] || 0) + 1;
      return acc;
    }, {});

  return {
    total,
    mentors,
    byYear: Object.entries(byYear).map(([year, count]) => ({ year: Number(year), count })).sort((a, b) => b.year - a.year),
    byDept: Object.entries(byDept).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count),
    topCompanies: Object.entries(topCompanies).map(([company, count]) => ({ company, count })).sort((a, b) => b.count - a.count).slice(0, 10),
  };
};

// ─── Success Stories showcase ─────────────────────────────────────────────────
export const getSuccessStories = (tenantId: string) =>
  Alumni.find({ tenantId, isActive: true, $or: [{ featured: true }, { story: { $exists: true, $ne: '' } }, { testimonial: { $exists: true, $ne: '' } }] })
    .select('firstName lastName graduationYear department currentCompany currentRole ctcPackage linkedInUrl profilePicture testimonial story featured')
    .sort({ featured: -1, ctcPackage: -1, graduationYear: -1 })
    .limit(60);

// ─── Alumni Referrals ─────────────────────────────────────────────────────────
export const createReferral = (tenantId: string, userId: string, data: Record<string, any>) =>
  AlumniReferral.create({ tenantId, createdBy: userId, ...data });

export const listReferrals = (tenantId: string, opts: { openOnly?: boolean } = {}) => {
  const q: any = { tenantId };
  if (opts.openOnly) { q.status = 'open'; q.$or = [{ deadline: { $exists: false } }, { deadline: null }, { deadline: { $gte: new Date() } }]; }
  return AlumniReferral.find(q).sort({ createdAt: -1 }).limit(300);
};

export const updateReferral = (id: string, tenantId: string, data: Record<string, any>) =>
  AlumniReferral.findOneAndUpdate({ _id: id, tenantId }, data, { new: true });

export const deleteReferral = (id: string, tenantId: string) =>
  AlumniReferral.deleteOne({ _id: id, tenantId });

// A student expresses interest → recorded + admins notified.
export const expressInterest = async (id: string, tenantId: string, studentId: string) => {
  const ref: any = await AlumniReferral.findOne({ _id: id, tenantId });
  if (!ref) return { ok: false, reason: 'not_found' };
  if (ref.status !== 'open') return { ok: false, reason: 'closed' };
  if (ref.interested.some((i: any) => String(i.studentId) === String(studentId))) return { ok: true, already: true };

  const u: any = await User.findById(studentId).select('firstName lastName').lean();
  const studentName = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Student';
  ref.interested.push({ studentId: new mongoose.Types.ObjectId(studentId), studentName, at: new Date() });
  await ref.save();

  // Notify admins/placement team.
  try {
    const admins = await User.find({ tenantId, role: { $in: ['TENANT_ADMIN', 'SUPER_ADMIN', 'STAFF'] }, isActive: { $ne: false } }).select('_id').lean();
    if (admins.length) {
      await createNotifications(String(tenantId), admins.map((a: any) => String(a._id)), 'general',
        '🙋 Student interested in a referral',
        `${studentName} is interested in the ${ref.role} referral at ${ref.company}.`,
        '/admin/college/alumni');
    }
  } catch { /* non-fatal */ }
  return { ok: true };
};
