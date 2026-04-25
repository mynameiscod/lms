import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import CollegeCurriculum from '../models/CollegeCurriculum';

// GET /api/v1/college/curriculum?departmentId=&yearOfStudy=
export const list = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const { departmentId, yearOfStudy } = req.query as Record<string, string>;

    const query: Record<string, any> = { tenantId };
    if (departmentId) query.departmentId = departmentId;
    if (yearOfStudy) query.yearOfStudy = Number(yearOfStudy);

    const curricula = await CollegeCurriculum.find(query)
      .populate('departmentId', 'name code')
      .sort({ departmentId: 1, yearOfStudy: 1 });

    return res.json({ success: true, data: curricula });
  } catch (err) {
    console.error('[CurriculumCtrl.list]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/v1/college/curriculum/:id
export const getOne = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const curriculum = await CollegeCurriculum.findOne({ _id: id, tenantId })
      .populate('departmentId', 'name code');
    if (!curriculum) return res.status(404).json({ success: false, message: 'Curriculum not found' });
    return res.json({ success: true, data: curriculum });
  } catch (err) {
    console.error('[CurriculumCtrl.getOne]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/v1/college/curriculum
export const create = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId  = req.user?.id;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const { departmentId, yearOfStudy, academicYear, semesters } = req.body;
    if (!departmentId || !yearOfStudy) {
      return res.status(400).json({ success: false, message: 'departmentId and yearOfStudy are required' });
    }

    const curriculum = await CollegeCurriculum.create({
      tenantId,
      departmentId,
      yearOfStudy: Number(yearOfStudy),
      academicYear: academicYear || null,
      semesters: semesters || [],
      createdBy: userId
    });

    return res.status(201).json({ success: true, data: curriculum });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Curriculum already exists for this department and year' });
    }
    console.error('[CurriculumCtrl.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/v1/college/curriculum/:id
export const update = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { semesters, academicYear, isActive } = req.body;

    const update: Record<string, any> = {};
    if (semesters   !== undefined) update.semesters   = semesters;
    if (academicYear !== undefined) update.academicYear = academicYear;
    if (isActive    !== undefined) update.isActive    = isActive;

    const curriculum = await CollegeCurriculum.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: update },
      { new: true }
    ).populate('departmentId', 'name code');

    if (!curriculum) return res.status(404).json({ success: false, message: 'Curriculum not found' });
    return res.json({ success: true, data: curriculum });
  } catch (err) {
    console.error('[CurriculumCtrl.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/v1/college/curriculum/:id
export const remove = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const curriculum = await CollegeCurriculum.findOneAndDelete({ _id: id, tenantId });
    if (!curriculum) return res.status(404).json({ success: false, message: 'Curriculum not found' });
    return res.json({ success: true, message: 'Curriculum deleted' });
  } catch (err) {
    console.error('[CurriculumCtrl.remove]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
