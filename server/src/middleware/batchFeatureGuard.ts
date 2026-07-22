import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import User from '../models/User';
import Batch from '../models/Batch';

/**
 * Real (server-side) enforcement of per-batch module toggles.
 *
 * A batch can turn OFF a student-feature; when it does, students in that batch
 * must not be able to reach the feature's endpoints even by navigating directly.
 *
 * Fail-open by design — this is a *restriction* layer, never the primary gate:
 *   • non-STUDENT roles (admins/instructors) always pass
 *   • students with no batch assigned pass (tenant defaults apply)
 *   • any lookup error passes (never take down an endpoint over this check)
 * Only a STUDENT whose batch has explicitly listed `featureKey` in
 * `disabledFeatures` is blocked with 403.
 */
export const requireBatchFeature = (featureKey: string) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role !== 'STUDENT') return next();

      const me = await User.findById(req.user.id).select('batchId');
      const batchId = me?.batchId;
      if (!batchId) return next(); // no batch → tenant defaults

      const batch = await Batch.findById(batchId).select('disabledFeatures');
      const disabled: string[] = (batch as any)?.disabledFeatures || [];
      if (disabled.includes(featureKey)) {
        return res.status(403).json({
          success: false,
          message: 'This feature is not enabled for your batch.',
          code: 'BATCH_FEATURE_DISABLED'
        });
      }
      return next();
    } catch {
      return next(); // fail-open
    }
  };
