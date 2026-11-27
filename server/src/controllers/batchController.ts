import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { BatchService } from '../services/batchService';
import Batch from '../models/Batch';
import User from '../models/User';
import { STUDENT_FEATURE_KEYS as SHARED_STUDENT_FEATURE_KEYS } from '../data/studentFeatureKeys';
import mongoose from 'mongoose';
import { labBatchFor, LAB_KINDS, LabKind } from '../services/placementBatchService';
import { LabTrackAssignment } from '../models/LabTrack';

// The student-feature key that shows each lab in the menu.
const LAB_FEATURE: Record<LabKind, string> = { thinking: 'thinkingLab', communication: 'aiCommunicationLab' };

const batchService = new BatchService();

// The full set of per-batch controllable student-feature keys. Mirrors the
// tenant-level studentFeatures set; a batch may turn any of these OFF (never on).
export const STUDENT_FEATURE_KEYS: string[] = [...SHARED_STUDENT_FEATURE_KEYS];

// Weekly off-days: JS getDay() numbers (0=Sun … 6=Sat). Falls back to Sat+Sun off.
const sanitizeOffDays = (v: any): number[] => {
  if (!Array.isArray(v)) return [0, 6];
  const nums = [...new Set(v.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6))];
  return nums.length ? nums : [0, 6]; // never allow "all days are class days" via empty=all; empty means default
};

// Special (non-content) dates that skip a curriculum Day: holidays, mock interviews, events.
const sanitizeSpecialDays = (v: any): any[] => {
  if (!Array.isArray(v)) return [];
  const types = ['holiday', 'mock_interview', 'event', 'off'];
  return v
    .filter((s: any) => s && /^\d{4}-\d{2}-\d{2}$/.test(String(s.date)))
    .map((s: any) => ({ date: String(s.date), type: types.includes(s.type) ? s.type : 'off', label: s.label ? String(s.label).slice(0, 120) : undefined }));
};

export const createBatch = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { name, courseId, startDate, endDate, timings, instructors, capacity, departmentId, holidays, weeklyOffDays, specialDays } = req.body;

    if (!name || !startDate || !endDate || !timings || !Array.isArray(timings) || timings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'name, startDate, endDate, and at least one timing entry are required'
      });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range',
        error: 'End date must be after start date'
      });
    }

    const batchData = {
      name,
      courseId: courseId || undefined,
      startDate: start,
      endDate: end,
      timings,
      instructors: instructors || [],
      tenantId: req.tenantId!,
      capacity: capacity || 30,
      departmentId: departmentId || null,
      holidays: Array.isArray(holidays) ? holidays.filter((d: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(d))) : [],
      weeklyOffDays: sanitizeOffDays(weeklyOffDays),
      specialDays: sanitizeSpecialDays(specialDays),
    };

    const batch = await batchService.createBatch(batchData);

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getBatchesByTenant = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const batches = await batchService.getBatchesByTenant(req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Batches fetched successfully',
      data: batches
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getBatchById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;

    const batch = await batchService.getBatchById(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch fetched successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const updateBatch = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;
    const { name, courseId, startDate, endDate, timings, instructors, capacity, departmentId, holidays, weeklyOffDays, specialDays } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (courseId !== undefined) updateData.courseId = courseId || null;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (timings) updateData.timings = timings;
    if (instructors) updateData.instructors = instructors;
    if (capacity) updateData.capacity = capacity;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (Array.isArray(holidays)) updateData.holidays = holidays.filter((d: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(d)));
    if (weeklyOffDays !== undefined) updateData.weeklyOffDays = sanitizeOffDays(weeklyOffDays);
    if (specialDays !== undefined) updateData.specialDays = sanitizeSpecialDays(specialDays);

    // Validate date range if both dates are provided
    if (updateData.startDate && updateData.endDate) {
      if (updateData.startDate >= updateData.endDate) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date range',
          error: 'End date must be after start date'
        });
      }
    }

    const batch = await batchService.updateBatch(batchId, req.tenantId!, updateData);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch updated successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const deleteBatch = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;

    const batch = await batchService.deleteBatch(batchId, req.tenantId!);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const deactivateBatch = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;

    const batch = await batchService.deactivateBatch(batchId, req.tenantId!);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch deactivated successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const activateBatch = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;

    const batch = await batchService.activateBatch(batchId, req.tenantId!);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch activated successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const addInstructor = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;
    const { instructorId } = req.body;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'instructorId is required'
      });
    }

    const batch = await batchService.addInstructor(batchId, req.tenantId!, instructorId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Instructor added successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

// PATCH /batches/:batchId/modules — set which student-features this batch turns off.
// Admin only (roleGuard on the route). Only valid keys are stored.
export const updateBatchModules = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;
    const { disabledFeatures } = req.body;

    if (!Array.isArray(disabledFeatures)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
        error: 'disabledFeatures must be an array of feature keys'
      });
    }

    // Keep only known keys — silently drop anything unrecognised.
    const clean = [...new Set(
      disabledFeatures
        .map((k: any) => String(k))
        .filter((k: string) => STUDENT_FEATURE_KEYS.includes(k))
    )];

    const batch = await Batch.findOneAndUpdate(
      { _id: batchId, tenantId: req.tenantId! },
      { $set: { disabledFeatures: clean } },
      { new: true }
    ).select('name disabledFeatures');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Batch modules updated successfully',
      data: { _id: batch._id, disabledFeatures: (batch as any).disabledFeatures || [] }
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

// GET /batches/my/modules — the disabled-feature set for the *requesting* student's
// own batch. Fail-open: non-students, students with no batch, or any error → [].
// The client uses this to hide menu items the student's batch turned off.
export const getMyBatchModules = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const me = await User.findById(req.user?.id).select('batchId role');
    const batchId = me?.batchId;
    if (!batchId) {
      return res.status(200).json({ success: true, message: 'No batch', data: { disabledFeatures: [] } });
    }

    const batch = await Batch.findById(batchId).select('disabledFeatures');
    let disabled: string[] = (batch as any)?.disabledFeatures || [];
    // A placement batch that takes over a lab turns that lab back on for its members, even
    // when the home batch switched it off. (The tenant-level switch still applies.)
    if (disabled.length) {
      for (const lab of LAB_KINDS) {
        const lb = await labBatchFor(String(req.tenantId), req.user?.id, batchId, lab);
        if (lb && String(lb) !== String(batchId)) disabled = disabled.filter((k) => k !== LAB_FEATURE[lab]);
      }
    }
    res.status(200).json({
      success: true,
      message: 'Batch modules fetched successfully',
      data: { disabledFeatures: disabled }
    });
  } catch (error: any) {
    // Fail-open — never let a lookup error hide the whole menu
    res.status(200).json({ success: true, message: 'Fallback', data: { disabledFeatures: [] } });
  }
};

export const removeInstructor = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { batchId } = req.params;
    const { instructorId } = req.body;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'instructorId is required'
      });
    }

    const batch = await batchService.removeInstructor(batchId, req.tenantId!, instructorId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
        error: 'Batch does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Instructor removed successfully',
      data: batch
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

// ─────────────────────────── Placement batches ───────────────────────────
// A placement batch is a regular batch marked kind='placement'. Its members are students of other
// batches (listed in User.placementBatchIds); their home batch never changes. Labs ticked in
// takesOverLabs are supplied by this batch for its members (see placementBatchService).

const isOid = (v: any) => mongoose.isValidObjectId(String(v));

async function placementView(tenantId: string, batchId: string) {
  const batch: any = await Batch.findOne({ _id: batchId, tenantId }).select('name kind takesOverLabs isActive').lean();
  if (!batch) return null;
  const members: any[] = await User.find({ tenantId, role: 'STUDENT', placementBatchIds: new mongoose.Types.ObjectId(batchId) })
    .select('firstName lastName email phone batchId isActive').populate('batchId', 'name').lean();
  const tracks: any[] = await LabTrackAssignment.find({ tenantId: String(tenantId), batchId: new mongoose.Types.ObjectId(batchId), status: 'active' })
    .select('lab').lean();
  return {
    _id: String(batch._id), name: batch.name, kind: batch.kind || 'regular', isActive: batch.isActive !== false,
    takesOverLabs: batch.takesOverLabs || [],
    labsWithTrack: [...new Set(tracks.map((t) => t.lab))],
    members: members.map((m) => ({
      _id: String(m._id), name: [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email, email: m.email, phone: m.phone,
      isActive: m.isActive !== false, homeBatchId: m.batchId?._id ? String(m.batchId._id) : null, homeBatchName: m.batchId?.name || '',
    })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// GET /batches/:batchId/placement
export const getPlacement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isOid(req.params.batchId)) return res.status(400).json({ success: false, message: 'Invalid batch' });
    const view = await placementView(String(req.tenantId), req.params.batchId);
    if (!view) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, data: view });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

// PATCH /batches/:batchId/placement  { kind, takesOverLabs }
export const updatePlacement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    if (!isOid(batchId)) return res.status(400).json({ success: false, message: 'Invalid batch' });
    const kind = req.body?.kind === 'placement' ? 'placement' : 'regular';
    const labs = Array.isArray(req.body?.takesOverLabs)
      ? [...new Set((req.body.takesOverLabs as any[]).map(String).filter((l) => (LAB_KINDS as string[]).includes(l)))]
      : [];
    const tenantId = String(req.tenantId);
    const bid = new mongoose.Types.ObjectId(batchId);
    if (kind === 'placement') {
      // A placement batch draws students from other batches; it must not be anyone's home batch.
      const home = await User.countDocuments({ tenantId, role: 'STUDENT', batchId: bid });
      if (home) return res.status(400).json({ success: false, message: `${home} student(s) have this as their home batch. Move them to another batch first, then make it a placement batch.` });
    } else {
      const members = await User.countDocuments({ tenantId, placementBatchIds: bid });
      if (members) return res.status(400).json({ success: false, message: `Remove the ${members} placement member(s) first.` });
    }
    const batch = await Batch.findOneAndUpdate({ _id: batchId, tenantId }, { $set: { kind, takesOverLabs: kind === 'placement' ? labs : [] } }, { new: true });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, message: 'Placement settings saved', data: await placementView(tenantId, batchId) });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};

// POST /batches/:batchId/members  { studentIds }   — add (home batch unchanged)
// DELETE /batches/:batchId/members { studentIds }  — remove
const changeMembers = (add: boolean) => async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId } = req.params;
    if (!isOid(batchId)) return res.status(400).json({ success: false, message: 'Invalid batch' });
    const tenantId = String(req.tenantId);
    const batch: any = await Batch.findOne({ _id: batchId, tenantId }).select('kind').lean();
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (add && batch.kind !== 'placement') return res.status(400).json({ success: false, message: 'Only a placement batch can take members from other batches.' });
    const ids = (Array.isArray(req.body?.studentIds) ? req.body.studentIds : []).filter(isOid).slice(0, 500)
      .map((id: string) => new mongoose.Types.ObjectId(id));
    if (!ids.length) return res.status(400).json({ success: false, message: 'Pick at least one student' });
    const bid = new mongoose.Types.ObjectId(batchId);
    const filter: any = { _id: { $in: ids }, tenantId, role: 'STUDENT' };
    const r = add
      ? await User.updateMany({ ...filter, batchId: { $ne: bid } }, { $addToSet: { placementBatchIds: bid } })
      : await User.updateMany(filter, { $pull: { placementBatchIds: bid } });
    res.json({
      success: true,
      message: `${r.modifiedCount} student(s) ${add ? 'added' : 'removed'}`,
      data: await placementView(tenantId, batchId),
    });
  } catch (error: any) { res.status(400).json({ success: false, message: error.message }); }
};
export const addPlacementMembers = changeMembers(true);
export const removePlacementMembers = changeMembers(false);
