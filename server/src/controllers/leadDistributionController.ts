import { AuthenticatedRequest } from '../types';
import LeadDistributionConfig from '../models/LeadDistributionConfig';

// GET /lead-distribution-config
export const getDistributionConfig = async (req: AuthenticatedRequest, res: any): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const config = await LeadDistributionConfig.findOne({ tenantId }).lean();
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /lead-distribution-config
export const upsertDistributionConfig = async (req: AuthenticatedRequest, res: any): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { mode, eligibleRoles, maxLeadsPerDayDefault, weights, enabled } = req.body;

    const update: any = {};
    if (mode !== undefined) update.mode = mode;
    if (eligibleRoles !== undefined) update.eligibleRoles = eligibleRoles;
    if (maxLeadsPerDayDefault !== undefined) update.maxLeadsPerDayDefault = maxLeadsPerDayDefault;
    if (weights !== undefined) update.weights = weights;
    if (enabled !== undefined) update.enabled = enabled;

    const config = await LeadDistributionConfig.findOneAndUpdate(
      { tenantId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
