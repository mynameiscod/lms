import { Request, Response } from 'express';
import LeadDisposition from '../models/LeadDisposition';
import { AuthenticatedRequest } from '../types';

export const getDispositions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dispositions = await LeadDisposition.find({ tenantId: req.tenantId, isActive: true })
      .sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: dispositions });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getAllDispositions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dispositions = await LeadDisposition.find({ tenantId: req.tenantId })
      .sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: dispositions });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const createDisposition = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, color, stageIds, order } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
    const count = await LeadDisposition.countDocuments({ tenantId: req.tenantId });
    const disposition = await LeadDisposition.create({
      tenantId: req.tenantId,
      name: name.trim(),
      color: color || '#6366f1',
      stageIds: stageIds || [],
      order: order ?? count
    });
    res.status(201).json({ success: true, data: disposition });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const updateDisposition = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, stageIds, order, isActive } = req.body;
    const disposition = await LeadDisposition.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(stageIds !== undefined && { stageIds }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true }
    );
    if (!disposition) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: disposition });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const deleteDisposition = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await LeadDisposition.deleteOne({ _id: id, tenantId: req.tenantId });
    res.json({ success: true, message: 'Deleted' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};
