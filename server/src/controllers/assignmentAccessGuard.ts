/**
 * The Foundation day gate for every student action on an assignment, and who counts as its author.
 *
 * Reading, starting, saving, running, hinting and submitting all pass through here, keyed by the
 * assignment or by the student's own submission of it. An assignment on no day of the student's
 * Foundation journey is waved through untouched, so batch schedules, learning plans and standalone
 * assignments keep exactly the rules they had.
 */

import { Response } from 'express';
import mongoose from 'mongoose';
import Submission from '../models/Submission';
import { permissionsOf } from '../middleware/roleGuard';
import { foundationAssignmentAccess, refusalBody } from '../services/foundationAssignmentAccessService';

/** Anyone who authors or grades assignments sees the whole document; everyone else gets the student view. */
const AUTHORING = ['manage_assignments', 'grade_assignments', 'grade_submissions'];

export async function isAssignmentAuthor(user: { role?: string; customRoleId?: any } | undefined): Promise<boolean> {
  if (!user?.role) return false;
  const held = await permissionsOf(user as { role: string; customRoleId?: any });
  return AUTHORING.some(p => held.includes(p));
}

/** Refuses (and answers) when this assignment sits on a Foundation day this student may not open yet. */
export async function refuseLockedAssignment(
  tenantId: string, studentId: string, assignmentId: string, res: Response,
): Promise<boolean> {
  const access = await foundationAssignmentAccess(String(tenantId), String(studentId), String(assignmentId));
  if (!access.bound || access.allowed === true) return false;
  res.status(403).json(refusalBody(access));
  return true;
}

/** The same gate for an action addressed by submission: the assignment is the one this student's submission is for. */
export async function refuseLockedSubmission(
  tenantId: string, studentId: string, submissionId: string, res: Response,
): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(String(submissionId)) || !mongoose.Types.ObjectId.isValid(String(studentId))) return false;
  const submission = await Submission.findOne({ _id: submissionId, student: studentId, tenant: tenantId })
    .select('assignment').lean() as any;
  // No such submission of theirs: the handler's own not-found answer stands.
  if (!submission?.assignment) return false;
  return refuseLockedAssignment(tenantId, studentId, String(submission.assignment), res);
}
