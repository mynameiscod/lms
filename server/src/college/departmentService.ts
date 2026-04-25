import Department, { IDepartment } from '../models/Department';
import Batch from '../models/Batch';
import CollegeMembership from '../models/CollegeMembership';
import PlacementDrive from '../models/PlacementDrive';
import mongoose from 'mongoose';

// ─── List ─────────────────────────────────────────────────────────────────────
export const listDepartments = async (tenantId: string) => {
  const depts = await Department.find({ tenantId, isActive: true })
    .populate('headUserId', 'firstName lastName email')
    .sort({ name: 1 })
    .lean();

  // Attach live activeBatches count for each dept
  const deptIds = depts.map(d => d._id);
  const batchCounts = await Batch.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), departmentId: { $in: deptIds }, isActive: true } },
    { $group: { _id: '$departmentId', count: { $sum: 1 } } }
  ]);
  const countMap: Record<string, number> = {};
  batchCounts.forEach((b: any) => { countMap[String(b._id)] = b.count; });

  return depts.map(d => ({ ...d, activeBatches: countMap[String(d._id)] ?? d.activeBatches ?? 0 }));
};

// ─── Get single ───────────────────────────────────────────────────────────────
export const getDepartmentById = async (id: string, tenantId: string) => {
  return Department.findOne({ _id: id, tenantId })
    .populate('headUserId', 'firstName lastName email')
    .populate('courseIds', 'title');
};

// ─── Create ───────────────────────────────────────────────────────────────────
export const createDepartment = async (
  tenantId: string,
  data: {
    name: string;
    code: string;
    description?: string;
    headUserId?: string;
    courseIds?: string[];
  }
): Promise<IDepartment> => {
  const dept = new Department({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    name: data.name,
    code: data.code.toUpperCase(),
    description: data.description,
    headUserId: data.headUserId ? new mongoose.Types.ObjectId(data.headUserId) : null,
    courseIds: (data.courseIds || []).map((id) => new mongoose.Types.ObjectId(id))
  });
  return dept.save();
};

// ─── Update ───────────────────────────────────────────────────────────────────
export const updateDepartment = async (
  id: string,
  tenantId: string,
  data: Partial<{
    name: string;
    code: string;
    description: string;
    headUserId: string | null;
    courseIds: string[];
    totalStudents: number;
    activeBatches: number;
    isActive: boolean;
  }>
) => {
  const update: Record<string, any> = { ...data };
  if (data.code) update.code = data.code.toUpperCase();
  if (data.headUserId) update.headUserId = new mongoose.Types.ObjectId(data.headUserId);
  if (data.headUserId === null) update.headUserId = null;
  if (data.courseIds)
    update.courseIds = data.courseIds.map((cid) => new mongoose.Types.ObjectId(cid));

  return Department.findOneAndUpdate({ _id: id, tenantId }, update, {
    new: true,
    runValidators: true
  }).populate('headUserId', 'firstName lastName email');
};

// ─── Soft-delete ──────────────────────────────────────────────────────────────
export const deleteDepartment = async (id: string, tenantId: string) => {
  return Department.findOneAndUpdate(
    { _id: id, tenantId },
    { isActive: false },
    { new: true }
  );
};

// ─── Department report ────────────────────────────────────────────────────────
export const getDepartmentReport = async (tenantId: string) => {
  const tenantOid = new mongoose.Types.ObjectId(tenantId);

  const [depts, memberCounts, placedCounts, batchCounts] = await Promise.all([
    Department.find({ tenantId, isActive: true }).lean(),

    CollegeMembership.aggregate([
      { $match: { tenantId: tenantOid, isActive: true } },
      { $group: { _id: '$departmentId', total: { $sum: 1 } } }
    ]),

    // count students with 'placed' status across all drives
    PlacementDrive.aggregate([
      { $match: { tenantId: tenantOid, isActive: true } },
      { $project: { statuses: { $objectToArray: '$applicantStatuses' } } },
      { $unwind: '$statuses' },
      { $match: { 'statuses.v': 'placed' } },
      { $group: { _id: '$statuses.k' } }   // unique placed user ids
    ]),

    Batch.aggregate([
      { $match: { tenantId: tenantOid, isActive: true, departmentId: { $exists: true, $ne: null } } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } }
    ])
  ]);

  const memberMap: Record<string, number>  = {};
  memberCounts.forEach((m: any) => { memberMap[String(m._id)] = m.total; });

  const batchMap: Record<string, number>  = {};
  batchCounts.forEach((b: any) => { batchMap[String(b._id)] = b.count; });

  // placedCounts gives us user ids that are 'placed'; we need to cross-ref with memberships
  const placedUserIds = new Set(placedCounts.map((p: any) => String(p._id)));

  // Membership → dept lookup for placed students
  const memberships = await CollegeMembership.find({ tenantId: tenantOid, isActive: true })
    .select('userId departmentId')
    .lean();

  const placedPerDept: Record<string, number> = {};
  memberships.forEach(m => {
    if (placedUserIds.has(String(m.userId))) {
      const dId = String(m.departmentId);
      placedPerDept[dId] = (placedPerDept[dId] || 0) + 1;
    }
  });

  return depts.map(d => ({
    _id: d._id,
    name: d.name,
    code: d.code,
    totalStudents: memberMap[String(d._id)] || 0,
    placedStudents: placedPerDept[String(d._id)] || 0,
    activeBatches: batchMap[String(d._id)] || 0,
  }));
};
