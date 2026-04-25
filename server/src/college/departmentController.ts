import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as departmentService from './departmentService';

// GET /api/v1/college/departments
export const list = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const departments = await departmentService.listDepartments(tenantId);
    return res.json({ success: true, data: departments });
  } catch (err) {
    console.error('[DeptController.list]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/v1/college/departments/:id
export const getOne = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const dept = await departmentService.getDepartmentById(id, tenantId);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    return res.json({ success: true, data: dept });
  } catch (err) {
    console.error('[DeptController.getOne]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/v1/college/departments
export const create = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const { name, code, description, headUserId, courseIds } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'name and code are required' });
    }

    const dept = await departmentService.createDepartment(tenantId, {
      name,
      code,
      description,
      headUserId,
      courseIds
    });
    return res.status(201).json({ success: true, data: dept });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Department code already exists for this college' });
    }
    console.error('[DeptController.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/v1/college/departments/:id
export const update = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const dept = await departmentService.updateDepartment(id, tenantId, req.body);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    return res.json({ success: true, data: dept });
  } catch (err) {
    console.error('[DeptController.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/v1/college/departments/:id
export const remove = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const dept = await departmentService.deleteDepartment(id, tenantId);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    return res.json({ success: true, message: 'Department deactivated' });
  } catch (err) {
    console.error('[DeptController.remove]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/v1/college/departments/report
export const getReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const report = await departmentService.getDepartmentReport(tenantId);
    return res.json({ success: true, data: report });
  } catch (err) {
    console.error('[DeptController.report]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
