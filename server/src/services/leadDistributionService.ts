/**
 * leadDistributionService.ts
 * Auto-assigns incoming leads to eligible team members based on tenant config.
 * Modes: round_robin | weighted | manual
 */
import Lead from '../models/Lead';
import LeadDistributionConfig from '../models/LeadDistributionConfig';
import User from '../models/User';

/**
 * Given a tenantId and a freshly created leadId, auto-assign it to an agent
 * if the tenant has auto-distribution enabled. No-op when mode=manual or disabled.
 */
export const autoAssignLead = async (tenantId: string, leadId: string): Promise<string | null> => {
  try {
    const config = await LeadDistributionConfig.findOne({ tenantId, enabled: true });
    if (!config || config.mode === 'manual') return null;

    // Build candidate user list
    let candidates = await getCandidates(tenantId, config);
    if (candidates.length === 0) return null;

    let assignedUserId: string | null = null;

    if (config.mode === 'round_robin') {
      assignedUserId = await pickRoundRobin(config, candidates, tenantId);
    } else if (config.mode === 'weighted') {
      assignedUserId = pickWeighted(config, candidates);
    }

    if (assignedUserId) {
      await Lead.findByIdAndUpdate(leadId, { assignedTo: assignedUserId });
    }
    return assignedUserId;
  } catch (err) {
    console.error('[LeadDistribution] autoAssignLead error:', err);
    return null;
  }
};

/** Get agents eligible for assignment and under their daily cap */
async function getCandidates(tenantId: string, config: any): Promise<string[]> {
  // Fetch users that belong to the tenant (role-based filter if eligibleRoles set)
  const userFilter: any = { tenantId };
  if (config.eligibleRoles?.length) {
    userFilter.role = { $in: config.eligibleRoles };
  }
  const users = await User.find(userFilter, '_id').lean();
  const userIds = users.map((u: any) => u._id.toString());

  if (userIds.length === 0) return [];

  // Apply daily cap: count leads assigned today per user
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayCounts: { _id: string; count: number }[] = await Lead.aggregate([
    { $match: { tenantId, createdAt: { $gte: todayStart }, assignedTo: { $in: userIds } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(todayCounts.map(r => [r._id, r.count]));

  return userIds.filter((uid: string) => {
    const agentCfg = config.weights?.find((w: any) => w.userId === uid);
    const cap = agentCfg?.maxLeadsPerDay ?? config.maxLeadsPerDayDefault;
    return (countMap.get(uid) ?? 0) < cap;
  });
}

/** Round-robin: pick the next agent after the last assigned one */
async function pickRoundRobin(config: any, candidates: string[], tenantId: string): Promise<string | null> {
  const ptr = config.roundRobinPointer;
  let nextIndex = 0;
  if (ptr) {
    const idx = candidates.indexOf(ptr);
    if (idx !== -1) nextIndex = (idx + 1) % candidates.length;
  }
  const chosen = candidates[nextIndex];
  await LeadDistributionConfig.findOneAndUpdate(
    { tenantId },
    { roundRobinPointer: chosen }
  );
  return chosen;
}

/** Weighted: pick probabilistically based on weights */
function pickWeighted(config: any, candidates: string[]): string | null {
  // Build weight map; default weight=1 for agents without explicit config
  const weightMap = new Map<string, number>();
  for (const uid of candidates) {
    const w = config.weights?.find((x: any) => x.userId === uid)?.weight ?? 1;
    weightMap.set(uid, Math.max(w, 0));
  }
  const total = [...weightMap.values()].reduce((s, v) => s + v, 0);
  if (total === 0) return candidates[0] || null;

  let rand = Math.random() * total;
  for (const [uid, w] of weightMap.entries()) {
    rand -= w;
    if (rand <= 0) return uid;
  }
  return candidates[candidates.length - 1];
}
