import mongoose from 'mongoose';
import Lead, { ILead, LeadPriority, LeadEligibility } from '../models/Lead';
import LeadPriorityConfig, { 
  ILeadPriorityConfig, 
  ILeadPriorityRule, 
  IEligibilityRule,
  DEFAULT_PRIORITY_RULES,
  DEFAULT_THRESHOLDS 
} from '../models/LeadPriorityConfig';

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

/**
 * Lead Scoring Service
 * Calculates lead priority scores based on configurable rules
 */
class LeadScoringService {
  
  /**
   * Get or create priority config for a tenant
   */
  async getConfig(tenantId: mongoose.Types.ObjectId): Promise<ILeadPriorityConfig> {
    let config = await LeadPriorityConfig.findOne({ tenantId });
    
    if (!config) {
      // Create default config
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

  /**
   * Calculate lead score based on rules
   */
  async calculateScore(lead: ILead): Promise<ScoringResult> {
    const config = await this.getConfig(lead.tenantId);
    
    let totalScore = 0;
    const breakdown: ScoreBreakdown[] = [];
    let overridePriority: LeadPriority | null = null;

    // Process each enabled rule
    for (const rule of config.rules.filter(r => r.enabled)) {
      const matched = this.evaluateCondition(lead, rule.condition);
      
      breakdown.push({
        ruleName: rule.name,
        ruleId: rule.id,
        impact: matched ? rule.scoreImpact : 0,
        matched,
        condition: `${rule.condition.field} ${rule.condition.operator} ${rule.condition.value}`
      });

      if (matched) {
        totalScore += rule.scoreImpact;
        
        // Check for priority override
        if (rule.setPriority) {
          overridePriority = rule.setPriority;
        }
      }
    }

    // Determine priority based on score or override
    let priority: LeadPriority;
    if (overridePriority) {
      priority = overridePriority;
    } else if (totalScore >= config.thresholds.hot) {
      priority = 'hot';
    } else if (totalScore >= config.thresholds.warm) {
      priority = 'warm';
    } else {
      priority = 'cold';
    }

    // Evaluate eligibility
    const { eligibility, reason } = this.evaluateEligibility(lead, config.eligibilityRules);

    return {
      score: Math.max(0, totalScore), // Don't go negative
      priority,
      eligibility,
      eligibilityReason: reason,
      breakdown
    };
  }

  /**
   * Evaluate a single rule condition against lead data
   */
  private evaluateCondition(lead: ILead, condition: ILeadPriorityRule['condition']): boolean {
    const value = this.getLeadValue(lead, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      
      case 'notEquals':
        return value !== condition.value;
      
      case 'contains':
        return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
      
      case 'greaterThan':
        return Number(value) > Number(condition.value);
      
      case 'lessThan':
        return Number(value) < Number(condition.value);
      
      case 'greaterThanOrEqual':
        return Number(value) >= Number(condition.value);
      
      case 'lessThanOrEqual':
        return Number(value) <= Number(condition.value);
      
      case 'in':
        if (Array.isArray(condition.value)) {
          return condition.value.includes(value);
        }
        return false;
      
      case 'notIn':
        if (Array.isArray(condition.value)) {
          return !condition.value.includes(value);
        }
        return true;
      
      case 'exists':
        return value !== undefined && value !== null && value !== '';
      
      case 'notExists':
        return value === undefined || value === null || value === '';
      
      case 'between':
        const num = Number(value);
        const min = Number(condition.value);
        const max = Number(condition.secondValue);
        return num >= min && num <= max;
      
      default:
        return false;
    }
  }

  /**
   * Get a value from the lead object by field path
   */
  private getLeadValue(lead: ILead, fieldPath: string): any {
    // Handle special calculated fields
    switch (fieldPath) {
      case 'noReplyHours':
        if (lead.whatsappEngagement?.initiatedAt && lead.whatsappStatus !== 'replied') {
          const hours = (Date.now() - new Date(lead.whatsappEngagement.initiatedAt).getTime()) / (1000 * 60 * 60);
          return Math.floor(hours);
        }
        return 0;
      
      case 'daysSinceCreated':
        return Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      
      case 'daysSinceLastAction':
        if (lead.telecallerMetrics?.lastActionAt) {
          return Math.floor((Date.now() - new Date(lead.telecallerMetrics.lastActionAt).getTime()) / (1000 * 60 * 60 * 24));
        }
        return 999;
      
      default:
        // Navigate nested paths like 'interests.mode' or 'customFields.city'
        const parts = fieldPath.split('.');
        let value: any = lead;
        
        for (const part of parts) {
          if (value === undefined || value === null) return undefined;
          
          // Handle Map objects (customFields, qualificationAnswers)
          if (value instanceof Map) {
            value = value.get(part);
          } else if (typeof value.get === 'function') {
            value = value.get(part);
          } else {
            value = value[part];
          }
        }
        
        return value;
    }
  }

  /**
   * Evaluate eligibility rules
   */
  private evaluateEligibility(
    lead: ILead, 
    rules: IEligibilityRule[]
  ): { eligibility: LeadEligibility; reason?: string } {
    
    // Default to needs_review if no rules
    if (!rules || rules.length === 0) {
      return { eligibility: 'needs_review' };
    }

    for (const rule of rules.filter(r => r.enabled)) {
      const matched = this.evaluateCondition(lead, rule.condition);
      
      if (matched) {
        return {
          eligibility: rule.result,
          reason: rule.reason
        };
      }
    }

    return { eligibility: 'needs_review' };
  }

  /**
   * Update lead score and priority
   */
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

  /**
   * Bulk update scores for a tenant
   */
  async bulkUpdateScores(tenantId: mongoose.Types.ObjectId): Promise<number> {
    const leads = await Lead.find({ 
      tenantId,
      convertedStudentId: { $exists: false } // Only non-converted leads
    });

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

  /**
   * Get score breakdown for a lead (for UI display)
   */
  async getScoreBreakdown(leadId: mongoose.Types.ObjectId): Promise<ScoringResult | null> {
    const lead = await Lead.findById(leadId);
    if (!lead) return null;

    return this.calculateScore(lead);
  }
}

export default new LeadScoringService();
