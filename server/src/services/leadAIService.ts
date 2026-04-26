import mongoose from 'mongoose';
import Lead, { ILead, IAISummary } from '../models/Lead';
import OpenAI from 'openai';

/**
 * Lead AI Service
 * Generates AI-powered summaries and insights for leads
 */
class LeadAIService {
  private openai: OpenAI | null = null;

  constructor() {
    // Initialize OpenAI client if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }

  /**
   * Generate AI summary for a lead
   */
  async generateSummary(leadId: mongoose.Types.ObjectId): Promise<IAISummary | null> {
    if (!this.openai) {
      console.warn('OpenAI API key not configured, AI summary not available');
      return null;
    }

    const lead = await Lead.findById(leadId)
      .populate('stageId', 'name category')
      .populate('assignedTo', 'name');

    if (!lead) return null;

    try {
      const prompt = this.buildPrompt(lead);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert sales analyst helping telecallers understand leads better. 
            Analyze the provided lead data and give actionable insights.
            Be concise, practical, and focus on conversion potential.
            Always respond in valid JSON format.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) return null;

      const parsed = JSON.parse(response);
      
      const aiSummary: IAISummary = {
        generatedAt: new Date(),
        summary: parsed.summary || '',
        keyInsights: parsed.keyInsights || [],
        suggestedNextAction: parsed.suggestedNextAction || '',
        seriousnessScore: Math.min(10, Math.max(1, parseInt(parsed.seriousnessScore) || 5)),
        conversionProbability: this.normalizeConversionProbability(parsed.conversionProbability),
        generatedBy: 'gpt-4-turbo-preview'
      };

      // Save to lead
      await Lead.findByIdAndUpdate(leadId, { aiSummary });

      return aiSummary;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      return null;
    }
  }

  /**
   * Build the prompt for AI analysis
   */
  private buildPrompt(lead: ILead): string {
    const stage = lead.stageId as any;
    const assignedTo = lead.assignedTo as any;
    
    // Get last 5 activities
    const recentActivities = lead.activities
      .slice(-5)
      .map(a => `- ${a.type}: ${a.description} (${new Date(a.createdAt).toLocaleDateString()})`)
      .join('\n');

    // Get qualification answers if available
    let qualificationInfo = '';
    if (lead.qualificationAnswers && lead.qualificationAnswers.size > 0) {
      const answers: string[] = [];
      lead.qualificationAnswers.forEach((value, key) => {
        if (!value.skipped) {
          answers.push(`- ${key}: ${value.answer}`);
        }
      });
      qualificationInfo = answers.join('\n');
    }

    // Get custom fields if available
    let customFieldsInfo = '';
    if (lead.customFields && lead.customFields.size > 0) {
      const fields: string[] = [];
      lead.customFields.forEach((value, key) => {
        fields.push(`- ${key}: ${value}`);
      });
      customFieldsInfo = fields.join('\n');
    }

    return `
Analyze this lead and provide insights in JSON format:

LEAD INFORMATION:
- Name: ${lead.name}
- Phone: ${lead.phone}
- Email: ${lead.email || 'Not provided'}
- Source: ${lead.source}
- Current Stage: ${stage?.name || 'Unknown'} (${stage?.category || 'Unknown'})
- Priority Score: ${lead.score || 0}
- Course Interest: ${lead.courseInterest?.join(', ') || 'Not specified'}
- Created: ${new Date(lead.createdAt).toLocaleDateString()}
- Days since creation: ${Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))}

ENGAGEMENT DATA:
- WhatsApp Status: ${lead.whatsappStatus || 'not_sent'}
${lead.whatsappRepliedAt ? `- WhatsApp Replied: ${new Date(lead.whatsappRepliedAt).toLocaleDateString()}` : ''}
${lead.firstResponseTime ? `- First Response Time: ${lead.firstResponseTime} minutes` : ''}
- Total Calls: ${lead.telecallerMetrics?.totalCalls || 0}
${lead.telecallerMetrics?.lastActionAt ? `- Last Action: ${new Date(lead.telecallerMetrics.lastActionAt).toLocaleDateString()}` : ''}

${lead.interests ? `
INTERESTS:
- Training Mode: ${lead.interests.mode || 'undecided'}
- Placement Interest: ${lead.interests.placement ? 'Yes' : 'No'}
- Urgency: ${lead.interests.urgency || 'unknown'}
- Affordability: ${lead.interests.affordability || 'unknown'}
` : ''}

${qualificationInfo ? `
QUALIFICATION ANSWERS:
${qualificationInfo}
` : ''}

${customFieldsInfo ? `
ADDITIONAL INFO:
${customFieldsInfo}
` : ''}

NOTES: ${lead.notes || 'No notes'}

${recentActivities ? `
RECENT ACTIVITIES:
${recentActivities}
` : ''}

${lead.interestConcerns?.length ? `
CONCERNS NOTED: ${lead.interestConcerns.join(', ')}
` : ''}

Please analyze and respond with this JSON structure:
{
  "summary": "2-3 sentence summary of this lead's profile and status",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "seriousnessScore": <number 1-10>,
  "conversionProbability": "high" | "medium" | "low",
  "suggestedNextAction": "Specific actionable recommendation for the telecaller"
}
`;
  }

  /**
   * Normalize conversion probability string
   */
  private normalizeConversionProbability(value: string): 'high' | 'medium' | 'low' {
    const normalized = String(value).toLowerCase().trim();
    if (normalized === 'high') return 'high';
    if (normalized === 'medium') return 'medium';
    return 'low';
  }

  /**
   * Generate quick insights without full AI call (rule-based)
   */
  async generateQuickInsights(lead: ILead): Promise<string[]> {
    const insights: string[] = [];

    // WhatsApp engagement insights
    if (lead.whatsappStatus === 'replied') {
      insights.push('✓ Actively engaged on WhatsApp - positive signal');
    } else if (lead.whatsappStatus === 'read' && !lead.whatsappRepliedAt) {
      insights.push('⚠️ Read WhatsApp but didn\'t reply - may need phone follow-up');
    }

    // Response time insights
    if (lead.firstResponseTime && lead.firstResponseTime < 30) {
      insights.push('✓ Quick responder - shows high interest');
    }

    // Source insights
    if (lead.source === 'walkin') {
      insights.push('✓ Walk-in lead - typically high conversion rate');
    } else if (lead.source === 'referral') {
      insights.push('✓ Referral lead - tends to have higher trust level');
    }

    // Urgency insights
    if (lead.interests?.urgency === 'immediate') {
      insights.push('🔥 Ready to join immediately - prioritize!');
    }

    // Affordability insights
    if (lead.interests?.affordability === 'budget_concern') {
      insights.push('💰 Has budget concerns - discuss EMI options');
    }

    // Stale lead warning
    const daysSinceAction = lead.telecallerMetrics?.lastActionAt 
      ? Math.floor((Date.now() - new Date(lead.telecallerMetrics.lastActionAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    if (daysSinceAction > 3) {
      insights.push(`⚠️ No action for ${daysSinceAction} days - needs attention`);
    }

    // Call attempts
    if (lead.telecallerMetrics?.totalCalls && lead.telecallerMetrics.totalCalls >= 3) {
      const lastActivity = lead.activities
        .filter(a => a.type === 'call')
        .slice(-1)[0];
      
      if (lastActivity?.callOutcome && lastActivity.callOutcome !== 'connected') {
        insights.push(`📞 ${lead.telecallerMetrics.totalCalls} call attempts without connection`);
      }
    }

    return insights;
  }

  /**
   * Get or generate summary (returns cached if recent)
   */
  async getOrGenerateSummary(leadId: mongoose.Types.ObjectId, maxAgeHours: number = 24): Promise<IAISummary | null> {
    const lead = await Lead.findById(leadId);
    if (!lead) return null;

    // Check if we have a recent summary
    if (lead.aiSummary?.generatedAt) {
      const ageHours = (Date.now() - new Date(lead.aiSummary.generatedAt).getTime()) / (1000 * 60 * 60);
      if (ageHours < maxAgeHours) {
        return lead.aiSummary;
      }
    }

    // Generate new summary
    return this.generateSummary(leadId);
  }

  /**
   * Generate a personalised follow-up WhatsApp message for a lead.
   * When language = 'telugu' or 'hindi', instructs GPT-4 to respond in that language.
   */
  async generateFollowUpMessage(
    leadId: mongoose.Types.ObjectId,
    language: 'english' | 'telugu' | 'hindi' = 'english'
  ): Promise<string | null> {
    const lead = await Lead.findById(leadId)
      .populate('stageId', 'name')
      .lean();
    if (!lead) return null;

    const FALLBACKS: Record<string, string> = {
      english: `Hi ${lead.name}! 👋 We noticed you were interested in ${(lead.courseInterest || []).join(', ') || 'our courses'}. Would you like to know more? Reply YES to schedule a free demo!`,
      telugu: `నమస్కారం ${lead.name} గారు! 👋 మీరు ${(lead.courseInterest || []).join(', ') || 'మా కోర్సులు'}లో ఆసక్తి చూపారు. ఒక ఉచిత డెమో షెడ్యూల్ చేయాలంటే YES అని రిప్లై చేయండి!`,
      hindi: `नमस्ते ${lead.name} जी! 👋 आप ${(lead.courseInterest || []).join(', ') || 'हमारे courses'}में रुचि रखते हैं। एक मुफ्त डेमो बुक करने के लिए YES लिखें!`,
    };

    if (!this.openai) {
      return FALLBACKS[language] || FALLBACKS.english;
    }

    const languageInstructions: Record<string, string> = {
      telugu: 'Respond ONLY in Telugu (తెలుగు) script. Use warm, respectful Telugu appropriate for an EdTech context.',
      hindi: 'Respond ONLY in Hindi (हिंदी). Use warm, respectful Hindi appropriate for an EdTech context.',
      english: 'Respond in clear, friendly English.',
    };

    const stage = (lead.stageId as any)?.name || 'Unknown';
    const courses = (lead.courseInterest || []).join(', ') || 'not specified';

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a friendly EdTech sales assistant crafting WhatsApp follow-up messages. ${languageInstructions[language] || languageInstructions.english} Keep the message under 200 characters. Use a single relevant emoji. Never use markdown. Return only the message text.`,
          },
          {
            role: 'user',
            content: `Write a follow-up WhatsApp message for this lead:
Name: ${lead.name}
Current Stage: ${stage}
Course Interest: ${courses}
Last activity: ${lead.activities?.slice(-1)[0]?.description?.substring(0, 100) || 'none'}

The message should re-engage them and invite them to schedule a free demo.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 200,
      });

      return completion.choices[0]?.message?.content?.trim() || FALLBACKS[language] || FALLBACKS.english;
    } catch (err) {
      console.error('[LeadAI] generateFollowUpMessage error:', err);
      return FALLBACKS[language] || FALLBACKS.english;
    }
  }
}

export default new LeadAIService();
