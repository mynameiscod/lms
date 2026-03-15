import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import LeadStage from '../models/LeadStage';
import Lead from '../models/Lead';

// Get all lead stages for tenant
export const getLeadStages = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const stages = await LeadStage.find({ tenantId: req.tenantId, isActive: true }).sort({ order: 1 });
    res.json({ success: true, message: 'Lead stages fetched', data: stages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch lead stages', error: error.message });
  }
};

// Create a new lead stage
export const createLeadStage = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { name, color } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Stage name is required' });
    }

    // Get the highest order to append at end
    const maxOrderStage = await LeadStage.findOne({ tenantId: req.tenantId }).sort({ order: -1 });
    const order = maxOrderStage ? maxOrderStage.order + 1 : 0;

    const stage = await LeadStage.create({
      name,
      color: color || '#005897',
      order,
      isDefault: false,
      tenantId: req.tenantId
    });

    res.status(201).json({ success: true, message: 'Lead stage created', data: stage });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A stage with this name already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create lead stage', error: error.message });
  }
};

// Update a lead stage
export const updateLeadStage = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { stageId } = req.params;
    const { name, color } = req.body;

    const stage = await LeadStage.findOneAndUpdate(
      { _id: stageId, tenantId: req.tenantId },
      { ...(name && { name }), ...(color && { color }) },
      { new: true, runValidators: true }
    );

    if (!stage) {
      return res.status(404).json({ success: false, message: 'Stage not found' });
    }

    res.json({ success: true, message: 'Lead stage updated', data: stage });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A stage with this name already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to update lead stage', error: error.message });
  }
};

// Delete a lead stage (soft delete)
export const deleteLeadStage = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { stageId } = req.params;

    const stage = await LeadStage.findOne({ _id: stageId, tenantId: req.tenantId });
    if (!stage) {
      return res.status(404).json({ success: false, message: 'Stage not found' });
    }
    if (stage.isDefault) {
      return res.status(400).json({ success: false, message: 'Default stages cannot be deleted' });
    }

    // Check if any leads are in this stage
    const leadsInStage = await Lead.countDocuments({ stageId, tenantId: req.tenantId });
    if (leadsInStage > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete stage: ${leadsInStage} lead(s) are still in this stage. Move them first.`
      });
    }

    await LeadStage.findByIdAndDelete(stageId);
    res.json({ success: true, message: 'Lead stage deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete lead stage', error: error.message });
  }
};

// Reorder lead stages
export const reorderLeadStages = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { stageIds } = req.body; // Array of stage IDs in new order
    if (!Array.isArray(stageIds)) {
      return res.status(400).json({ success: false, message: 'stageIds array is required' });
    }

    const bulkOps = stageIds.map((id: string, index: number) => ({
      updateOne: {
        filter: { _id: id, tenantId: req.tenantId },
        update: { order: index }
      }
    }));

    await LeadStage.bulkWrite(bulkOps);

    const stages = await LeadStage.find({ tenantId: req.tenantId, isActive: true }).sort({ order: 1 });
    res.json({ success: true, message: 'Stages reordered', data: stages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to reorder stages', error: error.message });
  }
};

// Initialize default stages for a tenant
export const initializeDefaultStages = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const existingStages = await LeadStage.countDocuments({ tenantId: req.tenantId });
    if (existingStages > 0) {
      return res.status(400).json({ success: false, message: 'Stages already exist for this tenant' });
    }

    const defaultStages = [
      { name: 'New Lead', color: '#3b82f6', order: 0, isDefault: true, tenantId: req.tenantId },
      { name: 'WhatsApp Sent', color: '#25d366', order: 1, isDefault: true, tenantId: req.tenantId },
      { name: 'Call Attempted', color: '#f97316', order: 2, isDefault: true, tenantId: req.tenantId },
      { name: 'Contacted', color: '#8b5cf6', order: 3, isDefault: true, tenantId: req.tenantId },
      { name: 'Follow-up', color: '#f59e0b', order: 4, isDefault: true, tenantId: req.tenantId },
      { name: 'Demo Scheduled', color: '#06b6d4', order: 5, isDefault: true, tenantId: req.tenantId },
      { name: 'Interested', color: '#6366f1', order: 6, isDefault: true, tenantId: req.tenantId },
      { name: 'Fee Paid', color: '#10b981', order: 7, isDefault: true, tenantId: req.tenantId },
      { name: 'Converted', color: '#059669', order: 8, isDefault: true, tenantId: req.tenantId },
      { name: 'Not Interested', color: '#6b7280', order: 9, isDefault: true, tenantId: req.tenantId },
    ];

    const stages = await LeadStage.insertMany(defaultStages);
    res.status(201).json({ success: true, message: 'Default stages created', data: stages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to initialize stages', error: error.message });
  }
};
