import mongoose from 'mongoose';
import LeadStageHistory from '../models/LeadStageHistory';
import LeadStage from '../models/LeadStage';
import Lead from '../models/Lead';

// Check for SLA breaches every 30 minutes
const SLA_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Find leads that have been in a stage longer than the SLA allows and flag them.
 * Emits a socket event to the tenant room for each breach.
 */
export async function checkSlaBreaches(io: any): Promise<void> {
  try {
    const now = new Date();

    // Get all open stage history entries (exitedAt is null = still in stage)
    const openHistories = await LeadStageHistory.find({ exitedAt: null }).lean();
    if (openHistories.length === 0) return;

    // Group by stageId to avoid repeated DB lookups
    const stageIds = [...new Set(openHistories.map(h => h.stageId.toString()))];
    const stages = await LeadStage.find({ _id: { $in: stageIds } })
      .select('_id sla tenantId name')
      .lean();
    const stageMap = new Map(stages.map((s: any) => [s._id.toString(), s]));

    const breachLeadIds: mongoose.Types.ObjectId[] = [];
    const breachNotifications: Array<{
      tenantId: string;
      leadId: string;
      stageName: string;
      hoursInStage: number;
      maxHours: number;
    }> = [];

    for (const history of openHistories as any[]) {
      const stage = stageMap.get(history.stageId.toString());
      if (!stage) continue;

      const alertAfterHours: number = stage.sla?.alertAfterHours || stage.sla?.maxDurationHours || 0;
      if (!alertAfterHours) continue; // No SLA configured for this stage

      const hoursInStage = (now.getTime() - new Date(history.enteredAt).getTime()) / 3_600_000;
      if (hoursInStage < alertAfterHours) continue;

      breachLeadIds.push(history.leadId);
      breachNotifications.push({
        tenantId: history.tenantId.toString(),
        leadId: history.leadId.toString(),
        stageName: history.stageName || stage.name,
        hoursInStage: Math.round(hoursInStage),
        maxHours: alertAfterHours,
      });
    }

    if (breachLeadIds.length === 0) return;

    console.log(`[SLA-CRON] Found ${breachLeadIds.length} SLA breach(es)`);

    // Bulk-flag leads that haven't already been flagged
    await Lead.updateMany(
      { _id: { $in: breachLeadIds }, slaBreach: { $ne: true } },
      { $set: { slaBreach: true, slaBreachAt: now } }
    );

    // Emit socket notifications (per tenant room)
    if (io) {
      for (const n of breachNotifications) {
        io.to(`tenant_${n.tenantId}`).emit('sla_breach', {
          leadId: n.leadId,
          stageName: n.stageName,
          hoursInStage: n.hoursInStage,
          maxHours: n.maxHours,
        });
      }
    }
  } catch (err) {
    console.error('[SLA-CRON] Error checking SLA breaches:', err);
  }
}

export function startSlaCronScheduler(io: any): NodeJS.Timeout {
  // Run once 30 seconds after startup to catch any existing breaches
  setTimeout(() => checkSlaBreaches(io).catch(console.error), 30_000);

  const handle = setInterval(() => {
    checkSlaBreaches(io).catch(console.error);
  }, SLA_CHECK_INTERVAL_MS);

  console.log(`[SLA-CRON] SLA breach checker scheduled every ${SLA_CHECK_INTERVAL_MS / 60000} minutes`);
  return handle;
}
