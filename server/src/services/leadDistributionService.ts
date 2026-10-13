import mongoose from 'mongoose';
import { waitsForOutpero } from './outperoPolicyService';
import { assignViaScoringConfig } from './leadScoringService';
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
export const autoAssignLead = async (tenantId: string, leadId: string, afterCall = false): Promise<string | null> => {
  try {
    const lead = await Lead.findOne({ _id: leadId, tenantId });
    if (!lead) return null;
    const existing = lead.assignedTo || lead.assignment?.assignedTo;
    if (existing) return String(existing);
    if (!afterCall && waitsForOutpero(lead, tenantId)) return null;
    const config = await LeadDistributionConfig.findOne({ tenantId, enabled: true });
    if (!config || config.mode === 'manual') {
      // A lead held for Outpero still needs an owner once its result is in: use the Lead Scoring
      // assignment settings when Lead Distribution is not what this institute uses.
      if (!afterCall) return null;
      const viaScoring = await assignViaScoringConfig(lead, new mongoose.Types.ObjectId(tenantId));
      if (!viaScoring) return null;
      await Lead.updateOne({ _id: leadId, tenantId }, { $push: { activities: { type: 'assignment', description: 'Assigned by round robin after the AI call', createdBy: lead.createdBy, createdAt: new Date() } } });
      return String(viaScoring);
    }

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
      const updated = await Lead.findOneAndUpdate({ _id: leadId, tenantId, assignedTo: null, 'assignment.assignedTo': null }, { $set: { assignedTo: assignedUserId, 'assignment.assignedTo': assignedUserId, 'assignment.assignedAt': new Date() }, $push: { activities: { type: 'assignment', description: 'Assigned automatically by lead distribution', createdBy: lead.createdBy, createdAt: new Date() } } });
      if (!updated) return null;
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
  const userFilter: any = { tenantId, isActive: true };
  if (config.eligibleRoles?.length) {
    const customIds = config.eligibleRoles.filter((r: string) => mongoose.isValidObjectId(r));
    if (customIds.length) userFilter.$or = [{ role: { $in: config.eligibleRoles } }, { customRoleId: { $in: customIds } }];
    else userFilter.role = { $in: config.eligibleRoles };
  } else {
    userFilter.role = { $in: ['TENANT_ADMIN', 'STAFF'] };
  }
  const users = await User.find(userFilter, '_id').lean();
  const userIds = users.map((u: any) => u._id.toString());

  if (userIds.length === 0) return [];

  // Apply daily cap: count leads assigned today per user
  const istNow = new Date(Date.now() + 330 * 60_000);
  const todayStart = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - 330 * 60_000);

  const todayCounts: { _id: string; count: number }[] = await Lead.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), 'assignment.assignedAt': { $gte: todayStart }, assignedTo: { $in: users.map((u: any) => u._id) } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(todayCounts.map(r => [String(r._id), r.count]));

  return userIds.filter((uid: string) => {
    const agentCfg = config.weights?.find((w: any) => w.userId === uid);
    const cap = agentCfg?.maxLeadsPerDay ?? config.maxLeadsPerDayDefault;
    return (countMap.get(uid) ?? 0) < cap;
  });
}

/** Round-robin: pick the next agent after the last assigned one */
async function pickRoundRobin(config: any, candidates: string[], tenantId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const ptr = config.roundRobinPointer;
    const idx = ptr ? candidates.indexOf(ptr) : -1;
    const chosen = candidates[(idx + 1) % candidates.length];
    const updated = await LeadDistributionConfig.findOneAndUpdate(
      { tenantId, roundRobinPointer: ptr }, { roundRobinPointer: chosen }
    );
    if (updated) return chosen;
    config = await LeadDistributionConfig.findOne({ tenantId });
    if (!config) return null;
  }
  return null;
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
