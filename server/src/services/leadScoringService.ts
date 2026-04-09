import mongoose from 'mongoose';
import Lead, { ILead, LeadPriority, LeadEligibility } from '../models/Lead';
import LeadPriorityConfig, {
  ILeadPriorityConfig,
  ILeadPriorityRule,
  IEligibilityRule,
  DEFAULT_PRIORITY_RULES,
  DEFAULT_THRESHOLDS
} from '../models/LeadPriorityConfig';
import LeadScoringConfig, { ILeadScoringConfig, IScoringRule, IQualificationRule } from '../models/LeadScoringConfig';

/**
 * Evaluate a single condition against a lead's data
 */
function evaluateCondition(
  fieldValue: string | undefined | null,
  operator: string,
  ruleValue: string
): boolean {
  const val = (fieldValue || '').toString().toLowerCase().trim();
  const target = (ruleValue || '').toLowerCase().trim();

  switch (operator) {
    case 'equals':
      return val === target;
    case 'not_equals':
      return val !== target;
    case 'contains':
      return val.includes(target);
    case 'not_contains':
      return !val.includes(target);
    case 'greater_than':
      return parseFloat(val) > parseFloat(target);
    case 'less_than':
      return parseFloat(val) < parseFloat(target);
    case 'greater_equal':
      return parseFloat(val) >= parseFloat(target);
    case 'less_equal':
      return parseFloat(val) <= parseFloat(target);
    case 'not_empty':
      return val.length > 0;
    case 'is_empty':
      return val.length === 0;
    case 'in': {
      const options = target.split(',').map(s => s.trim());
      return options.includes(val);
    }
    default:
      return false;
  }
}

/**
 * Get a field value from a lead document (supports standard fields + custom: prefix)
 */
function getFieldValue(lead: any, field: string): string {
  if (field.startsWith('custom:')) {
    const key = field.replace('custom:', '');
    const customFields = lead.customFields instanceof Map
      ? Object.fromEntries(lead.customFields)
      : (lead.customFields || {});
    return (customFields[key] || '').toString();
  }

  switch (field) {
    case 'name': return lead.name || '';
    case 'email': return lead.email || '';
    case 'phone': return lead.phone || '';
    case 'source': return lead.source || '';
    case 'courseInterest': return (lead.courseInterest || []).join(', ');
    case 'priority': return lead.priority || '';
    case 'notes': return lead.notes || '';
    case 'score': return (lead.score || 0).toString();
    case 'platform': return lead.sourceDetails?.platform || '';
    case 'location': return lead.interests?.location || '';
    case 'mode': return lead.interests?.mode || '';
    default: return '';
  }
}

/**
 * Calculate score for a lead based on scoring rules
 */
function calculateScore(lead: any, rules: IScoringRule[]): number {
  let score = 0;
  for (const rule of rules) {
    const fieldValue = getFieldValue(lead, rule.field);
    if (evaluateCondition(fieldValue, rule.operator, rule.value)) {
      score += rule.points;
    }
  }
  return score;
}

/**
 * Determine priority from score
 */
function determinePriority(score: number, hotThreshold: number, warmThreshold: number): 'hot' | 'warm' | 'cold' {
  if (score >= hotThreshold) return 'hot';
  if (score >= warmThreshold) return 'warm';
  return 'cold';
}

/**
 * Evaluate qualification rules
 */
function evaluateQualification(lead: any, rules: IQualificationRule[]): { eligible: boolean; reason: string } {
  if (rules.length === 0) return { eligible: true, reason: '' };

  const failedRequired: string[] = [];
  let passedCount = 0;

  for (const rule of rules) {
    const fieldValue = getFieldValue(lead, rule.field);
    const passed = evaluateCondition(fieldValue, rule.operator, rule.value);

    if (passed) {
      passedCount++;
    } else if (rule.required) {
      failedRequired.push(rule.label);
    }
  }

  if (failedRequired.length > 0) {
    return { eligible: false, reason: `Failed: ${failedRequired.join(', ')}` };
  }

  return { eligible: true, reason: `Passed ${passedCount}/${rules.length} criteria` };
}

/**
 * Get next assignee via round robin (atomic update)
 */
async function getNextRoundRobinAssignee(
  tenantId: mongoose.Types.ObjectId,
  members: mongoose.Types.ObjectId[],
  indexField: string,
  ruleIndex?: number
): Promise<mongoose.Types.ObjectId | null> {
  if (!members || members.length === 0) return null;

  let config: ILeadScoringConfig | null;

  if (indexField === 'roundRobinIndex') {
    config = await LeadScoringConfig.findOneAndUpdate(
      { tenantId },
      { $inc: { roundRobinIndex: 1 } },
      { new: true }
    );
    if (!config) return null;
    return members[(config.roundRobinIndex - 1) % members.length];
  } else if (indexField === 'fallbackIndex') {
    config = await LeadScoringConfig.findOneAndUpdate(
      { tenantId },
      { $inc: { fallbackIndex: 1 } },
      { new: true }
    );
    if (!config) return null;
    return members[(config.fallbackIndex - 1) % members.length];
  } else if (indexField === 'assignmentRule' && ruleIndex !== undefined) {
    config = await LeadScoringConfig.findOneAndUpdate(
      { tenantId },
      { $inc: { [`assignmentRules.${ruleIndex}.currentIndex`]: 1 } },
      { new: true }
    );
    if (!config || !config.assignmentRules[ruleIndex]) return null;
    const rule = config.assignmentRules[ruleIndex];
    return rule.assignToMembers[(rule.currentIndex - 1) % rule.assignToMembers.length];
  }

  return null;
}

/**
 * Find matching assignment rule for a lead
 */
function findMatchingAssignmentRule(lead: any, config: ILeadScoringConfig): { ruleIndex: number; members: mongoose.Types.ObjectId[] } | null {
  for (let i = 0; i < config.assignmentRules.length; i++) {
    const rule = config.assignmentRules[i];
    if (!rule.assignToMembers || rule.assignToMembers.length === 0) continue;

    const allMatch = rule.conditions.every(cond => {
      const fieldValue = getFieldValue(lead, cond.field);
      return evaluateCondition(fieldValue, cond.operator, cond.value);
    });

    if (allMatch) {
      return { ruleIndex: i, members: rule.assignToMembers };
    }
  }
  return null;
}

/**
 * Main function: Score, qualify, and assign a lead
 * Call this after creating/importing a lead
 */
export async function scoreAndAssignLead(lead: any, tenantId: mongoose.Types.ObjectId): Promise<{
  score: number;
  priority: 'hot' | 'warm' | 'cold';
  eligibility: 'eligible' | 'not_eligible' | 'needs_review';
  eligibilityReason: string;
  assignedTo?: mongoose.Types.ObjectId;
}> {
  const config = await LeadScoringConfig.findOne({ tenantId, isActive: true });

  if (!config) {
    return {
      score: 0,
      priority: lead.priority || 'cold',
      eligibility: 'needs_review',
      eligibilityReason: 'No scoring config active'
    };
  }

  // 1. Calculate score
  const score = calculateScore(lead, config.scoringRules);

  // 2. Determine priority
  const priority = config.scoringRules.length > 0
    ? determinePriority(score, config.hotThreshold, config.warmThreshold)
    : (lead.priority || 'cold');

  // 3. Evaluate qualification
  const qualification = evaluateQualification(lead, config.qualificationRules);
  const eligibility = qualification.eligible ? 'eligible' : 'not_eligible';

  // 4. Assignment
  let assignedTo: mongoose.Types.ObjectId | undefined;

  if (config.assignmentMode === 'round_robin') {
    const assignee = await getNextRoundRobinAssignee(tenantId, config.roundRobinMembers, 'roundRobinIndex');
    if (assignee) assignedTo = assignee;
  } else if (config.assignmentMode === 'rule_based') {
    lead.priority = priority;
    lead.score = score;

    const match = findMatchingAssignmentRule(lead, config);
    if (match) {
      const assignee = await getNextRoundRobinAssignee(tenantId, match.members, 'assignmentRule', match.ruleIndex);
      if (assignee) assignedTo = assignee;
    } else if (config.fallbackMembers && config.fallbackMembers.length > 0) {
      const assignee = await getNextRoundRobinAssignee(tenantId, config.fallbackMembers, 'fallbackIndex');
      if (assignee) assignedTo = assignee;
    }
  }

  // 5. Update lead
  const updateData: any = {
    score,
    priority,
    eligibility,
    eligibilityReason: qualification.reason
  };
  if (assignedTo) {
    updateData.assignedTo = assignedTo;
    updateData['assignment.assignedTo'] = assignedTo;
    updateData['assignment.assignedAt'] = new Date();
  }

  await lead.constructor.findByIdAndUpdate(lead._id, { $set: updateData });

  console.log(`[LEAD-SCORING] Lead ${lead._id}: score=${score}, priority=${priority}, eligibility=${eligibility}${assignedTo ? `, assigned=${assignedTo}` : ''}`);

  return { score, priority, eligibility, eligibilityReason: qualification.reason, assignedTo };
}

/**
 * Bulk re-score all leads for a tenant (for when rules change)
 */
export async function rescoreAllLeads(tenantId: mongoose.Types.ObjectId): Promise<{ processed: number; scored: number; assigned: number }> {
  const config = await LeadScoringConfig.findOne({ tenantId, isActive: true });

  if (!config) {
    return { processed: 0, scored: 0, assigned: 0 };
  }

  const leads = await Lead.find({ tenantId });
  let scored = 0;
  let assigned = 0;

  for (const lead of leads) {
    try {
      const result = await scoreAndAssignLead(lead, tenantId);
      if (result.score > 0) scored++;
      if (result.assignedTo) assigned++;
    } catch (err: any) {
      console.error(`[LEAD-SCORING] Error rescoring lead ${lead._id}:`, err.message);
    }
  }

  return { processed: leads.length, scored, assigned };
}

// ═══════════════════════════════════════════════════════════════════
//  Original LeadScoringService class (used by leadPriorityController)
// ═══════════════════════════════════════════════════════════════════

interface ScoreBreakdown {
  ruleName: string;
  ruleId: string;
  impact: number;
  matched: boolean;
  condition: string;
}

interface ScoringResult {
  score: number;
  priority: LeadPriority;
  eligibility: LeadEligibility;
  eligibilityReason?: string;
  breakdown: ScoreBreakdown[];
}

class LeadScoringService {
  async getConfig(tenantId: mongoose.Types.ObjectId): Promise<ILeadPriorityConfig> {
    let config = await LeadPriorityConfig.findOne({ tenantId });
    if (!config) {
      config = await LeadPriorityConfig.create({
        tenantId,
        rules: DEFAULT_PRIORITY_RULES,
        thresholds: DEFAULT_THRESHOLDS,
        eligibilityRules: [],
        isActive: true
      });
    }
    return config;
  }

  async calculateScore(lead: ILead): Promise<ScoringResult> {
    const config = await this.getConfig(lead.tenantId);
    let totalScore = 0;
    const breakdown: ScoreBreakdown[] = [];
    let overridePriority: LeadPriority | null = null;

    for (const rule of config.rules.filter(r => r.enabled)) {
      const matched = this.evaluateRuleCondition(lead, rule.condition);
      breakdown.push({
        ruleName: rule.name,
        ruleId: rule.id,
        impact: matched ? rule.scoreImpact : 0,
        matched,
        condition: `${rule.condition.field} ${rule.condition.operator} ${rule.condition.value}`
      });
      if (matched) {
        totalScore += rule.scoreImpact;
        if (rule.setPriority) overridePriority = rule.setPriority;
      }
    }

    let priority: LeadPriority;
    if (overridePriority) priority = overridePriority;
    else if (totalScore >= config.thresholds.hot) priority = 'hot';
    else if (totalScore >= config.thresholds.warm) priority = 'warm';
    else priority = 'cold';

    const { eligibility, reason } = this.evaluateEligibilityRules(lead, config.eligibilityRules);

    return {
      score: Math.max(0, totalScore),
      priority,
      eligibility,
      eligibilityReason: reason,
      breakdown
    };
  }

  private evaluateRuleCondition(lead: ILead, condition: ILeadPriorityRule['condition']): boolean {
    const value = this.getLeadFieldValue(lead, condition.field);
    switch (condition.operator) {
      case 'equals': return value === condition.value;
      case 'notEquals': return value !== condition.value;
      case 'contains': return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'greaterThan': return Number(value) > Number(condition.value);
      case 'lessThan': return Number(value) < Number(condition.value);
      case 'greaterThanOrEqual': return Number(value) >= Number(condition.value);
      case 'lessThanOrEqual': return Number(value) <= Number(condition.value);
      case 'in': return Array.isArray(condition.value) ? condition.value.includes(value) : false;
      case 'notIn': return Array.isArray(condition.value) ? !condition.value.includes(value) : true;
      case 'exists': return value !== undefined && value !== null && value !== '';
      case 'notExists': return value === undefined || value === null || value === '';
      case 'between': {
        const num = Number(value);
        return num >= Number(condition.value) && num <= Number(condition.secondValue);
      }
      default: return false;
    }
  }

  private getLeadFieldValue(lead: ILead, fieldPath: string): any {
    switch (fieldPath) {
      case 'noReplyHours':
        if (lead.whatsappEngagement?.initiatedAt && lead.whatsappStatus !== 'replied') {
          return Math.floor((Date.now() - new Date(lead.whatsappEngagement.initiatedAt).getTime()) / (1000 * 60 * 60));
        }
        return 0;
      case 'daysSinceCreated':
        return Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      case 'daysSinceLastAction':
        if (lead.telecallerMetrics?.lastActionAt) {
          return Math.floor((Date.now() - new Date(lead.telecallerMetrics.lastActionAt).getTime()) / (1000 * 60 * 60 * 24));
        }
        return 999;
      default: {
        const parts = fieldPath.split('.');
        let val: any = lead;
        for (const part of parts) {
          if (val === undefined || val === null) return undefined;
          if (val instanceof Map) val = val.get(part);
          else if (typeof val.get === 'function') val = val.get(part);
          else val = val[part];
        }
        return val;
      }
    }
  }

  private evaluateEligibilityRules(
    lead: ILead,
    rules: IEligibilityRule[]
  ): { eligibility: LeadEligibility; reason?: string } {
    if (!rules || rules.length === 0) return { eligibility: 'needs_review' };
    for (const rule of rules.filter(r => r.enabled)) {
      const matched = this.evaluateRuleCondition(lead, rule.condition);
      if (matched) return { eligibility: rule.result, reason: rule.reason };
    }
    return { eligibility: 'needs_review' };
  }

  async updateLeadScore(leadId: mongoose.Types.ObjectId): Promise<ScoringResult | null> {
    const lead = await Lead.findById(leadId);
    if (!lead) return null;
    const result = await this.calculateScore(lead);
    await Lead.findByIdAndUpdate(leadId, {
      score: result.score,
      priority: result.priority,
      eligibility: result.eligibility,
      eligibilityReason: result.eligibilityReason
    });
    return result;
  }

  async bulkUpdateScores(tenantId: mongoose.Types.ObjectId): Promise<number> {
    const leads = await Lead.find({ tenantId, convertedStudentId: { $exists: false } });
    let updated = 0;
    for (const lead of leads) {
      const result = await this.calculateScore(lead);
      await Lead.findByIdAndUpdate(lead._id, {
        score: result.score,
        priority: result.priority,
        eligibility: result.eligibility,
        eligibilityReason: result.eligibilityReason
      });
      updated++;
    }
    return updated;
  }

  async getScoreBreakdown(leadId: mongoose.Types.ObjectId): Promise<ScoringResult | null> {
    const lead = await Lead.findById(leadId);
    if (!lead) return null;
    return this.calculateScore(lead);
  }
}

export default new LeadScoringService();
