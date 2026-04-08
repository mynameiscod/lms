import mongoose from 'mongoose';
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
  const Lead = mongoose.model('Lead');
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
