import { Request, Response } from 'express';
import mongoose from 'mongoose';
import QualificationQuestionConfig, { 
  DEFAULT_QUALIFICATION_QUESTIONS,
  IQualificationQuestion
} from '../models/QualificationQuestionConfig';
import Lead from '../models/Lead';
import { AuthRequest } from '../types/express';

/**
 * Get qualification question configuration for tenant
 */
export const getQuestionConfig = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    let config = await QualificationQuestionConfig.findOne({ tenantId });
    
    // Create default config if doesn't exist
    if (!config) {
      config = await QualificationQuestionConfig.create({
        tenantId,
        questions: DEFAULT_QUALIFICATION_QUESTIONS,
        settings: {
          showProgressBar: true,
          allowSkip: true,
          randomizeOrder: false
        },
        whatsappSettings: {
          enabled: true,
          welcomeMessage: "Hi! Thanks for your interest in CodeBegun. I have a few quick questions to understand your needs better.",
          completionMessage: "Thank you! Our team will reach out to you shortly with more details.",
          noResponseTimeoutHours: 24,
          maxQuestions: 5
        },
        isActive: true
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error getting question config:', error);
    res.status(500).json({ message: 'Failed to get question configuration' });
  }
};

/**
 * Update qualification question configuration
 */
export const updateQuestionConfig = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const { questions, settings, whatsappSettings, isActive } = req.body;

    const config = await QualificationQuestionConfig.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          ...(questions && { questions }),
          ...(settings && { settings }),
          ...(whatsappSettings && { whatsappSettings }),
          ...(isActive !== undefined && { isActive })
        }
      },
      { new: true, upsert: true }
    );

    res.json(config);
  } catch (error) {
    console.error('Error updating question config:', error);
    res.status(500).json({ message: 'Failed to update question configuration' });
  }
};

/**
 * Add a new question
 */
export const addQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const question: IQualificationQuestion = req.body;
    
    // Generate ID if not provided
    if (!question.id) {
      question.id = `q_${Date.now()}`;
    }

    const config = await QualificationQuestionConfig.findOneAndUpdate(
      { tenantId },
      { $push: { questions: question } },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({ message: 'Question configuration not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ message: 'Failed to add question' });
  }
};

/**
 * Update a question
 */
export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { questionId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const updates = req.body;

    const config = await QualificationQuestionConfig.findOneAndUpdate(
      { tenantId, 'questions.id': questionId },
      { 
        $set: Object.keys(updates).reduce((acc, key) => {
          acc[`questions.$.${key}`] = updates[key];
          return acc;
        }, {} as Record<string, any>)
      },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Failed to update question' });
  }
};

/**
 * Delete a question
 */
export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { questionId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const config = await QualificationQuestionConfig.findOneAndUpdate(
      { tenantId },
      { $pull: { questions: { id: questionId } } },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({ message: 'Configuration not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Failed to delete question' });
  }
};

/**
 * Reorder questions
 */
export const reorderQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const { questionOrder } = req.body; // Array of { id, order }

    const config = await QualificationQuestionConfig.findOne({ tenantId });
    if (!config) {
      return res.status(404).json({ message: 'Configuration not found' });
    }

    // Update order for each question
    for (const item of questionOrder) {
      const questionIndex = config.questions.findIndex(q => q.id === item.id);
      if (questionIndex !== -1) {
        config.questions[questionIndex].order = item.order;
      }
    }

    // Sort questions by order
    config.questions.sort((a, b) => a.order - b.order);
    await config.save();

    res.json(config);
  } catch (error) {
    console.error('Error reordering questions:', error);
    res.status(500).json({ message: 'Failed to reorder questions' });
  }
};

/**
 * Save qualification answers for a lead
 */
export const saveLeadAnswers = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const { answers } = req.body; // Array of { questionId, answer, skipped }
    const userId = req.user?._id;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Initialize qualificationAnswers if not exists
    if (!lead.qualificationAnswers) {
      lead.qualificationAnswers = new Map();
    }

    // Save each answer
    for (const ans of answers) {
      lead.qualificationAnswers.set(ans.questionId, {
        questionId: ans.questionId,
        answer: ans.answer,
        answeredBy: userId,
        answeredAt: new Date(),
        skipped: ans.skipped || false
      });
    }

    // Calculate progress
    const config = await QualificationQuestionConfig.findOne({ tenantId: lead.tenantId });
    if (config) {
      const totalQuestions = config.questions.filter(q => q.enabled && q.required).length;
      const answeredQuestions = Array.from(lead.qualificationAnswers.values())
        .filter(a => !a.skipped).length;
      
      lead.qualificationProgress = {
        total: totalQuestions,
        answered: answeredQuestions,
        percentage: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
      };
    }

    await lead.save();

    res.json({
      message: 'Answers saved successfully',
      qualificationProgress: lead.qualificationProgress
    });
  } catch (error) {
    console.error('Error saving lead answers:', error);
    res.status(500).json({ message: 'Failed to save answers' });
  }
};

/**
 * Get lead's qualification answers
 */
export const getLeadAnswers = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Get question config for context
    const config = await QualificationQuestionConfig.findOne({ tenantId: lead.tenantId });

    res.json({
      answers: lead.qualificationAnswers ? Object.fromEntries(lead.qualificationAnswers) : {},
      progress: lead.qualificationProgress || { total: 0, answered: 0, percentage: 0 },
      questions: config?.questions || []
    });
  } catch (error) {
    console.error('Error getting lead answers:', error);
    res.status(500).json({ message: 'Failed to get answers' });
  }
};

/**
 * Get questions for a specific stage (for telecaller view)
 */
export const getQuestionsForStage = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { stageId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const config = await QualificationQuestionConfig.findOne({ tenantId });
    if (!config) {
      return res.status(404).json({ message: 'Configuration not found' });
    }

    // Filter questions for this stage
    const stageObjectId = new mongoose.Types.ObjectId(stageId);
    const questions = config.questions.filter(q => {
      if (!q.enabled) return false;
      if (!q.showInStages || q.showInStages.length === 0) return true;
      return q.showInStages.some(s => s.equals(stageObjectId));
    }).sort((a, b) => a.order - b.order);

    res.json({ questions });
  } catch (error) {
    console.error('Error getting questions for stage:', error);
    res.status(500).json({ message: 'Failed to get questions' });
  }
};

/**
 * Reset to default questions
 */
export const resetToDefaults = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const config = await QualificationQuestionConfig.findOneAndUpdate(
      { tenantId },
      { $set: { questions: DEFAULT_QUALIFICATION_QUESTIONS } },
      { new: true, upsert: true }
    );

    res.json(config);
  } catch (error) {
    console.error('Error resetting to defaults:', error);
    res.status(500).json({ message: 'Failed to reset to defaults' });
  }
};
