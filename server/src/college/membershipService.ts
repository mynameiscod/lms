import CollegeMembership, { CollegeRole } from '../models/CollegeMembership';
import mongoose from 'mongoose';

// ─── List members by role / dept ──────────────────────────────────────────────
export const listMembers = async (
  tenantId: string,
  filters: { collegeRole?: CollegeRole; departmentId?: string; yearOfStudy?: number }
) => {
  const query: Record<string, any> = { tenantId, isActive: true };
  if (filters.collegeRole) query.collegeRole = filters.collegeRole;
  if (filters.departmentId) query.departmentId = new mongoose.Types.ObjectId(filters.departmentId);
  if (filters.yearOfStudy) query.yearOfStudy = filters.yearOfStudy;

  return CollegeMembership.find(query)
    .populate('userId', 'firstName lastName email profilePicture')
    .populate('departmentId', 'name code')
    .sort({ createdAt: -1 });
};

// ─── Get membership for a specific user ───────────────────────────────────────
export const getMembershipForUser = async (userId: string, tenantId: string) => {
  return CollegeMembership.findOne({ userId, tenantId })
    .populate('departmentId', 'name code');
};

// ─── Upsert (create or update) ────────────────────────────────────────────────
export const upsertMembership = async (
  tenantId: string,
  data: {
    userId: string;
    collegeRole: CollegeRole;
    departmentId?: string | null;
    yearOfStudy?: number | null;
    rollNumber?: string;
    academicYear?: string;
    division?: string;
    admissionType?: 'regular' | 'lateral';
    cgpa?: number;
    backlogs?: number;
    semesterGrades?: { semester: number; sgpa: number }[];
  }
) => {
  const filter = {
    userId: new mongoose.Types.ObjectId(data.userId),
    tenantId: new mongoose.Types.ObjectId(tenantId)
  };

  const update: Record<string, any> = {
    collegeRole: data.collegeRole,
    isActive: true
  };

  if (data.departmentId !== undefined)
    update.departmentId = data.departmentId ? new mongoose.Types.ObjectId(data.departmentId) : null;
  if (data.yearOfStudy !== undefined) update.yearOfStudy = data.yearOfStudy;
  if (data.rollNumber !== undefined) update.rollNumber = data.rollNumber;
  if (data.academicYear !== undefined) update.academicYear = data.academicYear;
  if (data.division !== undefined) update.division = data.division;
  if (data.admissionType !== undefined) update.admissionType = data.admissionType;
  if (data.cgpa !== undefined) update.cgpa = data.cgpa;
  if (data.backlogs !== undefined) update.backlogs = data.backlogs;
  if (data.semesterGrades !== undefined) update.semesterGrades = data.semesterGrades;

  return CollegeMembership.findOneAndUpdate(filter, { $set: update }, {
    upsert: true,
    new: true,
    runValidators: true,
    setDefaultsOnInsert: true
  }).populate('departmentId', 'name code');
};

// ─── Deactivate ───────────────────────────────────────────────────────────────
export const deactivateMembership = async (userId: string, tenantId: string) => {
  return CollegeMembership.findOneAndUpdate(
    { userId, tenantId },
    { isActive: false },
    { new: true }
  );
};

// ─── Bulk import (for CSV onboarding) ────────────────────────────────────────
export const bulkUpsertMemberships = async (
  tenantId: string,
  rows: Array<{
    userId: string;
    collegeRole: CollegeRole;
    departmentId?: string;
    yearOfStudy?: number;
    rollNumber?: string;
    academicYear?: string;
  }>
) => {
  const ops = rows.map((row) => ({
    updateOne: {
      filter: {
        userId: new mongoose.Types.ObjectId(row.userId),
        tenantId: new mongoose.Types.ObjectId(tenantId)
      },
      update: {
        $set: {
          collegeRole: row.collegeRole,
          departmentId: row.departmentId ? new mongoose.Types.ObjectId(row.departmentId) : null,
          yearOfStudy: row.yearOfStudy ?? null,
          rollNumber: row.rollNumber ?? null,
          academicYear: row.academicYear ?? null,
          isActive: true
        }
      },
      upsert: true
    }
  }));

  return CollegeMembership.bulkWrite(ops);
};

// ─── Update academic record ───────────────────────────────────────────────────
export const updateAcademicRecord = async (
  userId: string,
  tenantId: string,
  data: {
    cgpa?: number;
    backlogs?: number;
    semesterGrades?: { semester: number; sgpa: number }[];
  }
) => {
  const update: Record<string, any> = {};
  if (data.cgpa !== undefined) update.cgpa = data.cgpa;
  if (data.backlogs !== undefined) update.backlogs = data.backlogs;
  if (data.semesterGrades !== undefined) update.semesterGrades = data.semesterGrades;

  return CollegeMembership.findOneAndUpdate(
    { userId, tenantId },
    { $set: update },
    { new: true, runValidators: true }
  ).populate('departmentId', 'name code');
};
