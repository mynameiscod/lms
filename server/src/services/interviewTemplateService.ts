import mongoose from 'mongoose';
import InterviewTemplate, { IInterviewTemplate } from '../models/InterviewTemplate';
import InterviewQuestionBankModel, { IInterviewQuestionBank } from '../models/InterviewQuestionBankModel';
import InterviewAttempt, { IInterviewAttempt, ISectionAttempt, ISectionQuestionResponse } from '../models/InterviewAttempt';
import InterviewAssignment, { IInterviewAssignment } from '../models/InterviewAssignment';
import User from '../models/User';
import { v4 as uuidv4 } from 'uuid';
import * as interviewAI from './interviewAIService';
import * as settings from './settingsService';

// ─── Template Service ────────────────────────────────────────────────────────

class InterviewTemplateService {

  // ── Templates ────────────────────────────────────────────────────────────

  async createTemplate(data: Partial<IInterviewTemplate>, tenantId: string, userId: string): Promise<IInterviewTemplate> {
    // Validate sections have questions or random config
    if (data.sections) {
      for (const section of data.sections) {
        if (section.questionSource === 'question_bank' && (!section.questionIds || section.questionIds.length === 0)) {
          throw new Error(`Section "${section.sectionTitle}" has no questions selected from question bank`);
        }
        if (section.questionSource === 'random' && (!section.randomQuestionCount || section.randomQuestionCount < 1)) {
          throw new Error(`Section "${section.sectionTitle}" needs randomQuestionCount for random source`);
        }
      }
    }

    const template = new InterviewTemplate({
      ...data,
      tenantId,
      createdBy: userId,
    });
    return template.save();
  }

  async getTemplates(tenantId: string, filters: {
    status?: string;
    category?: string;
    difficulty?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ templates: IInterviewTemplate[]; total: number }> {
    const query: any = { tenantId };

    if (filters.status) query.status = filters.status;
    if (filters.category) query.interviewCategories = filters.category;
    if (filters.difficulty) query.difficultyLevel = filters.difficulty;
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      InterviewTemplate.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'firstName lastName email')
        .lean(),
      InterviewTemplate.countDocuments(query),
    ]);

    return { templates: templates as IInterviewTemplate[], total };
  }

  async getTemplateById(templateId: string, tenantId: string): Promise<IInterviewTemplate | null> {
    return InterviewTemplate.findOne({ _id: templateId, tenantId })
      .populate('createdBy', 'firstName lastName email')
      .populate('sections.questionIds');
  }

  async updateTemplate(templateId: string, tenantId: string, data: Partial<IInterviewTemplate>): Promise<IInterviewTemplate | null> {
    // Don't allow status change via update — use dedicated methods
    delete (data as any).status;
    delete (data as any).tenantId;
    delete (data as any).createdBy;

    return InterviewTemplate.findOneAndUpdate(
      { _id: templateId, tenantId },
      { $set: data },
      { new: true }
    );
  }

  async publishTemplate(templateId: string, tenantId: string): Promise<IInterviewTemplate | null> {
    const template = await InterviewTemplate.findOne({ _id: templateId, tenantId });
    if (!template) return null;

    // Validate: must have at least one section with questions
    if (!template.sections || template.sections.length === 0) {
      throw new Error('Template must have at least one section before publishing');
    }

    for (const section of template.sections) {
      if (section.questionSource === 'question_bank' && (!section.questionIds || section.questionIds.length === 0)) {
        throw new Error(`Section "${section.sectionTitle}" has no questions. Add questions or switch to random source.`);
      }
    }

    template.status = template.scheduleType === 'scheduled' ? 'scheduled' : 'active';
    template.publishedAt = new Date();
    return template.save();
  }

  async archiveTemplate(templateId: string, tenantId: string): Promise<IInterviewTemplate | null> {
    return InterviewTemplate.findOneAndUpdate(
      { _id: templateId, tenantId },
      { $set: { status: 'archived', archivedAt: new Date() } },
      { new: true }
    );
  }

  async duplicateTemplate(templateId: string, tenantId: string, userId: string): Promise<IInterviewTemplate> {
    const original = await InterviewTemplate.findOne({ _id: templateId, tenantId }).lean();
    if (!original) throw new Error('Template not found');

    const { _id, createdAt, updatedAt, publishedAt, archivedAt, ...rest } = original as any;

    const duplicate = new InterviewTemplate({
      ...rest,
      title: `${rest.title} (Copy)`,
      status: 'draft',
      createdBy: userId,
      version: 1,
      publishedAt: undefined,
      archivedAt: undefined,
    });

    return duplicate.save();
  }

  // ── Question Bank ────────────────────────────────────────────────────────

  async createQuestion(data: Partial<IInterviewQuestionBank>, tenantId: string, userId: string): Promise<IInterviewQuestionBank> {
    const question = new InterviewQuestionBankModel({
      ...data,
      tenantId,
      createdBy: userId,
    });
    return question.save();
  }

  async bulkCreateQuestions(questions: Partial<IInterviewQuestionBank>[], tenantId: string, userId: string): Promise<IInterviewQuestionBank[]> {
    const docs = questions.map(q => ({
      ...q,
      tenantId,
      createdBy: userId,
    }));
    return InterviewQuestionBankModel.insertMany(docs) as unknown as IInterviewQuestionBank[];
  }

  /**
   * AI-generate question-bank items and persist them. Best-effort: returns the
   * questions actually created (empty if the LLM is unavailable). `persist=false`
   * returns the drafts without saving (for preview).
   */
  async aiGenerateQuestions(
    specs: interviewAI.QGenSpec[],
    tenantId: string,
    userId: string,
    opts: { persist?: boolean } = { persist: true }
  ): Promise<{ created: IInterviewQuestionBank[]; generated: number; aiEnabled: boolean; error?: string }> {
    if (!interviewAI.isInterviewAIEnabled()) {
      return { created: [], generated: 0, aiEnabled: false };
    }

    const drafts: any[] = [];
    let lastError = '';
    for (const spec of specs) {
      try {
        const items = await interviewAI.generateQuestions(spec);
        drafts.push(...items);
      } catch (e: any) {
        lastError = e?.message || 'AI generation failed';
        console.error('[aiGenerateQuestions] spec failed:', spec.topic, e?.status || '', lastError);
      }
    }

    if (!drafts.length) return { created: [], generated: 0, aiEnabled: true, error: lastError || 'The AI returned no usable questions. Try a different topic or run again.' };
    if (opts.persist === false) {
      return { created: drafts as any, generated: drafts.length, aiEnabled: true };
    }

    const created = await this.bulkCreateQuestions(drafts, tenantId, userId);
    return { created, generated: created.length, aiEnabled: true };
  }

  async getQuestions(tenantId: string, filters: {
    interviewCategory?: string;
    questionType?: string;
    topic?: string;
    difficulty?: string;
    roleTarget?: string;
    experienceLevel?: string;
    tags?: string[];
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ questions: IInterviewQuestionBank[]; total: number }> {
    const query: any = { tenantId };

    if (filters.interviewCategory) query.interviewCategory = filters.interviewCategory;
    if (filters.questionType) query.questionType = filters.questionType;
    if (filters.topic) query.topic = { $regex: filters.topic, $options: 'i' };
    if (filters.difficulty) query.difficulty = filters.difficulty;
    if (filters.roleTarget) query.roleTarget = filters.roleTarget;
    if (filters.experienceLevel) query.experienceLevel = filters.experienceLevel;
    if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    else query.isActive = true;
    if (filters.search) {
      query.$or = [
        { questionText: { $regex: filters.search, $options: 'i' } },
        { topic: { $regex: filters.search, $options: 'i' } },
        { tags: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [questions, total] = await Promise.all([
      InterviewQuestionBankModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InterviewQuestionBankModel.countDocuments(query),
    ]);

    return { questions: questions as IInterviewQuestionBank[], total };
  }

  async getQuestionById(questionId: string, tenantId: string): Promise<IInterviewQuestionBank | null> {
    return InterviewQuestionBankModel.findOne({ _id: questionId, tenantId });
  }

  async updateQuestion(questionId: string, tenantId: string, data: Partial<IInterviewQuestionBank>): Promise<IInterviewQuestionBank | null> {
    delete (data as any).tenantId;
    delete (data as any).createdBy;
    return InterviewQuestionBankModel.findOneAndUpdate(
      { _id: questionId, tenantId },
      { $set: data },
      { new: true }
    );
  }

  async deactivateQuestion(questionId: string, tenantId: string): Promise<IInterviewQuestionBank | null> {
    return InterviewQuestionBankModel.findOneAndUpdate(
      { _id: questionId, tenantId },
      { $set: { isActive: false } },
      { new: true }
    );
  }

  async getQuestionTopics(tenantId: string, category?: string): Promise<string[]> {
    const query: any = { tenantId, isActive: true };
    if (category) query.interviewCategory = category;
    return InterviewQuestionBankModel.distinct('topic', query);
  }

  async getQuestionTags(tenantId: string): Promise<string[]> {
    return InterviewQuestionBankModel.distinct('tags', { tenantId, isActive: true });
  }

  // ── Assignments (Push-based) ─────────────────────────────────────────────

  async pushAssignment(
    templateId: string,
    studentIds: string[],
    tenantId: string,
    assignedBy: string,
    options: {
      pushReason?: string;
      pushNote?: string;
      dueDate?: Date;
      expiresAt?: Date;
      maxAttempts?: number;
    } = {}
  ): Promise<{ created: number; duplicates: number }> {
    const template = await InterviewTemplate.findOne({ _id: templateId, tenantId });
    if (!template) throw new Error('Template not found');
    if (!['active', 'published', 'scheduled'].includes(template.status)) {
      throw new Error('Template must be active or published to assign');
    }

    let created = 0;
    let duplicates = 0;

    for (const studentId of studentIds) {
      try {
        await InterviewAssignment.create({
          tenantId,
          templateId,
          assignedBy,
          studentId,
          pushReason: options.pushReason || 'manual',
          pushNote: options.pushNote,
          availableFrom: new Date(),
          dueDate: options.dueDate,
          expiresAt: options.expiresAt || template.expiryDate,
          maxAttempts: options.maxAttempts || template.maxAttempts,
          status: 'assigned',
        });
        created++;
      } catch (err: any) {
        if (err.code === 11000) {
          duplicates++;
        } else {
          throw err;
        }
      }
    }

    return { created, duplicates };
  }

  async pushAssignmentToBatch(
    templateId: string,
    batchIds: string[],
    tenantId: string,
    assignedBy: string,
    options: { pushReason?: string; pushNote?: string; dueDate?: Date; expiresAt?: Date; maxAttempts?: number } = {}
  ): Promise<{ created: number; duplicates: number }> {
    // Find all students in these batches
    const students = await User.find({
      tenantId,
      batchId: { $in: batchIds },
      role: 'STUDENT',
      isActive: true,
    }).select('_id');

    const studentIds = students.map(s => s._id.toString());
    return this.pushAssignment(templateId, studentIds, tenantId, assignedBy, options);
  }

  async pushAssignmentToCourse(
    templateId: string,
    courseIds: string[],
    tenantId: string,
    assignedBy: string,
    options: { pushReason?: string; pushNote?: string; dueDate?: Date; expiresAt?: Date; maxAttempts?: number } = {}
  ): Promise<{ created: number; duplicates: number }> {
    // Find all students enrolled in these courses
    const students = await User.find({
      tenantId,
      courseId: { $in: courseIds },
      role: 'STUDENT',
      isActive: true,
    }).select('_id');

    const studentIds = students.map(s => s._id.toString());
    return this.pushAssignment(templateId, studentIds, tenantId, assignedBy, options);
  }

  async getAssignments(tenantId: string, filters: {
    studentId?: string;
    templateId?: string;
    assignedBy?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ assignments: IInterviewAssignment[]; total: number }> {
    const query: any = { tenantId };

    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.templateId) query.templateId = filters.templateId;
    if (filters.assignedBy) query.assignedBy = filters.assignedBy;
    if (filters.status) query.status = filters.status;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [assignments, total] = await Promise.all([
      InterviewAssignment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('templateId', 'title interviewCategories difficultyLevel totalDuration')
        .populate('studentId', 'firstName lastName email')
        .populate('assignedBy', 'firstName lastName')
        .lean(),
      InterviewAssignment.countDocuments(query),
    ]);

    return { assignments: assignments as IInterviewAssignment[], total };
  }

  async cancelAssignment(assignmentId: string, tenantId: string): Promise<IInterviewAssignment | null> {
    return InterviewAssignment.findOneAndUpdate(
      { _id: assignmentId, tenantId, status: 'assigned' },
      { $set: { status: 'cancelled' } },
      { new: true }
    );
  }

  // ── Student Assignment View ──────────────────────────────────────────────

  async getStudentAssignments(studentId: string, tenantId: string, filters: {
    status?: string;
  } = {}): Promise<IInterviewAssignment[]> {
    const query: any = {
      tenantId,
      studentId,
      availableFrom: { $lte: new Date() },
    };

    if (filters.status) {
      query.status = filters.status;
    } else {
      query.status = { $in: ['assigned', 'in_progress'] };
    }

    return InterviewAssignment.find(query)
      .sort({ createdAt: -1 })
      .populate('templateId', 'title description interviewCategories difficultyLevel totalDuration experienceLevel interviewMode sections')
      .lean();
  }

  // ── Attempt Management ───────────────────────────────────────────────────

  async startAttempt(
    templateId: string,
    studentId: string,
    tenantId: string,
    assignmentId?: string,
    mode: 'structured' | 'conversational' = 'structured'
  ): Promise<IInterviewAttempt> {
    const template = await InterviewTemplate.findOne({ _id: templateId, tenantId });
    if (!template) throw new Error('Interview template not found');

    // Check expiry
    if (template.expiryDate && new Date() > template.expiryDate) {
      throw new Error('This interview has expired');
    }

    // Check if assignment exists and is valid
    let assignment: IInterviewAssignment | null = null;
    if (assignmentId) {
      assignment = await InterviewAssignment.findOne({ _id: assignmentId, tenantId, studentId });
      if (!assignment) throw new Error('Assignment not found');
      if (assignment.status === 'expired') throw new Error('This assignment has expired');
      if (assignment.status === 'cancelled') throw new Error('This assignment has been cancelled');
      if (assignment.attemptsUsed >= assignment.maxAttempts) {
        throw new Error('Maximum attempts reached for this assignment');
      }
    }

    // Check max attempts
    const existingAttemptCount = await InterviewAttempt.countDocuments({
      templateId,
      studentId,
      tenantId,
      status: { $nin: ['cancelled'] },
    });

    if (existingAttemptCount >= template.maxAttempts) {
      throw new Error(`Maximum ${template.maxAttempts} attempt(s) allowed`);
    }

    // Check reattempt cooldown
    if (template.reattemptCooldownHours > 0 && existingAttemptCount > 0) {
      const lastAttempt = await InterviewAttempt.findOne({
        templateId, studentId, tenantId,
      }).sort({ createdAt: -1 });

      if (lastAttempt && lastAttempt.submittedAt) {
        const cooldownEnd = new Date(lastAttempt.submittedAt.getTime() + template.reattemptCooldownHours * 60 * 60 * 1000);
        if (new Date() < cooldownEnd) {
          throw new Error(`Please wait until ${cooldownEnd.toISOString()} before reattempting`);
        }
      }
    }

    // Check for in-progress attempt (resume logic)
    const existingInProgress = await InterviewAttempt.findOne({
      templateId, studentId, tenantId, status: 'in_progress',
    });

    if (existingInProgress) {
      if (template.allowResume) {
        // Check resume window
        const lastActive = existingInProgress.lastActiveAt || existingInProgress.startedAt;
        if (lastActive) {
          const resumeDeadline = new Date(lastActive.getTime() + template.resumeWindowMinutes * 60 * 1000);
          if (new Date() > resumeDeadline) {
            // Auto-submit expired attempt
            existingInProgress.status = 'submitted';
            existingInProgress.submittedAt = new Date();
            await existingInProgress.save();
          } else {
            // Resume
            existingInProgress.lastActiveAt = new Date();
            existingInProgress.disconnectCount += 1;
            await existingInProgress.save();
            return existingInProgress;
          }
        }
      } else {
        // No resume — auto-submit
        existingInProgress.status = 'submitted';
        existingInProgress.submittedAt = new Date();
        await existingInProgress.save();
      }
    }

    // Build section attempts from template
    const sectionAttempts: Partial<ISectionAttempt>[] = [];

    for (const section of template.sections) {
      let questions: any[] = [];

      if (section.questionSource === 'question_bank' && section.questionIds.length > 0) {
        questions = await InterviewQuestionBankModel.find({
          _id: { $in: section.questionIds },
          tenantId,
          isActive: true,
        }).lean();
      } else if (section.questionSource === 'random') {
        const randomQuery: any = {
          tenantId,
          isActive: true,
          interviewCategory: section.sectionType,
        };
        if (section.randomFilters?.topics?.length) randomQuery.topic = { $in: section.randomFilters.topics };
        if (section.randomFilters?.difficulty?.length) randomQuery.difficulty = { $in: section.randomFilters.difficulty };
        if (section.randomFilters?.tags?.length) randomQuery.tags = { $in: section.randomFilters.tags };

        questions = await InterviewQuestionBankModel.aggregate([
          { $match: randomQuery },
          { $sample: { size: section.randomQuestionCount || 5 } },
        ]);
      }

      if (section.questionOrder === 'random') {
        questions = questions.sort(() => Math.random() - 0.5);
      }

      const questionResponses: Partial<ISectionQuestionResponse>[] = questions.map(q => ({
        questionId: q._id,
        questionText: q.questionText,
        questionType: q.questionType,
        answerMode: q.answerMode || section.answerMode || 'text',
        // display metadata — no correct answers leaked
        questionHint: q.questionHint,
        difficulty: q.difficulty,
        topic: q.topic,
        mcqOptions: (q.mcqOptions || []).map((o: any) => ({ label: o.label, text: o.text })),
        codeLanguage: q.codeLanguage,
        codeStarterTemplate: q.codeStarterTemplate,
        suggestedTimeSeconds: q.suggestedTimeSeconds,
        status: 'not_started' as const,
        responseTimeSeconds: 0,
        pauseCount: 0,
        retryCount: 0,
        score: 0,
        maxScore: q.maxScore || 10,
        feedback: '',
        strengths: [],
        weaknesses: [],
        missedPoints: [],
        keywordsCovered: [],
        keywordsMissed: [],
      }));

      sectionAttempts.push({
        sectionId: (section as any)._id,
        sectionTitle: section.sectionTitle,
        sectionType: section.sectionType,
        sectionOrder: section.sectionOrder,
        avatarImageUrl: (section as any).avatarImageUrl,
        status: 'not_started',
        currentQuestionIndex: 0,
        questionResponses: questionResponses as ISectionQuestionResponse[],
        totalScore: 0,
        maxScore: section.maxScore || 100,
        percentage: 0,
        passed: false,
        passingThreshold: section.passingThreshold || 50,
      });
    }

    const attempt = new InterviewAttempt({
      tenantId,
      studentId,
      templateId,
      assignmentId,
      attemptNumber: existingAttemptCount + 1,
      status: 'in_progress',
      startedAt: new Date(),
      lastActiveAt: new Date(),
      sessionId: uuidv4(),
      sectionAttempts,
      currentSectionIndex: 0,
      mode,
      overallMaxScore: sectionAttempts.reduce((sum, s) => sum + (s.maxScore || 0), 0),
    });

    const saved = await attempt.save();

    // Update assignment
    if (assignment) {
      assignment.attemptsUsed += 1;
      assignment.lastAttemptId = saved._id as mongoose.Types.ObjectId;
      assignment.status = 'in_progress';
      await assignment.save();
    }

    return saved;
  }

  async saveAttemptRecording(
    attemptId: string,
    tenantId: string,
    studentId: string,
    data: { bunnyVideoId?: string; bunnyLibraryId?: string; status?: string }
  ): Promise<IInterviewAttempt | null> {
    const update: any = {};
    if (data.bunnyVideoId) update.recordingBunnyVideoId = data.bunnyVideoId;
    if (data.bunnyLibraryId) update.recordingBunnyLibraryId = String(data.bunnyLibraryId);
    update.recordingStatus = data.status && ['recording', 'uploaded', 'failed', 'none'].includes(data.status)
      ? data.status
      : (data.bunnyVideoId ? 'uploaded' : 'failed');
    return InterviewAttempt.findOneAndUpdate(
      { _id: attemptId, tenantId, studentId },
      { $set: update },
      { new: true }
    );
  }

  /**
   * Live conversational turn: append the candidate's last answer (if any) to the
   * transcript, then produce the interviewer's next spoken line. Drives the
   * hands-free real-time AI interview.
   */
  async converseTurn(
    attemptId: string, tenantId: string, studentId: string, lastAnswer?: string
  ): Promise<{ say: string; kind: string; endInterview: boolean }> {
    const attempt = await InterviewAttempt.findOne({ _id: attemptId, tenantId, studentId, status: 'in_progress' });
    if (!attempt) throw new Error('Active attempt not found');
    const template = await InterviewTemplate.findById(attempt.templateId);

    attempt.conversation = attempt.conversation || [];
    if (lastAnswer && lastAnswer.trim()) {
      attempt.conversation.push({ role: 'candidate', text: lastAnswer.trim().slice(0, 4000), at: new Date() });
    }

    const areas = (template?.sections || []).map(s => s.sectionTitle).filter(Boolean);
    const askedCount = attempt.conversation.filter(t => t.role === 'interviewer').length;
    const maxQuestions = Math.max(5, Math.min(12, (template?.sections?.length || 3) * 2));
    const startedAt = attempt.startedAt ? attempt.startedAt.getTime() : Date.now();
    const totalSec = (template?.totalDuration || 20) * 60;
    const timeLeftSeconds = Math.max(0, totalSec - (Date.now() - startedAt) / 1000);
    const interviewerName = settings.getStr('INTERVIEW_INTERVIEWER_NAME', 'Maya', tenantId);

    const turn = await interviewAI.nextInterviewerTurn({
      interviewerName,
      role: template?.title || 'this role',
      areas,
      history: attempt.conversation.map(t => ({ role: t.role, text: t.text })),
      askedCount, maxQuestions, timeLeftSeconds,
    });

    attempt.conversation.push({ role: 'interviewer', text: turn.say, at: new Date() });
    attempt.lastActiveAt = new Date();
    attempt.markModified('conversation');
    await attempt.save();

    return { say: turn.say, kind: turn.kind, endInterview: turn.endInterview };
  }

  /** Score a finished conversational attempt from its transcript (fills section + overall). */
  private async evaluateConversationalAttempt(attempt: IInterviewAttempt): Promise<void> {
    const template = await InterviewTemplate.findById(attempt.templateId);
    const areas = attempt.sectionAttempts.map(s => ({ title: s.sectionTitle, type: s.sectionType }));
    const evalRes = await interviewAI.evaluateTranscript({
      role: template?.title || 'this role',
      areas,
      transcript: (attempt.conversation || []).map(t => ({ role: t.role, text: t.text })),
    });

    for (const s of attempt.sectionAttempts) {
      const match = evalRes?.areaScores.find(a => a.title.toLowerCase().trim() === s.sectionTitle.toLowerCase().trim());
      const pct = match ? match.percentage : (evalRes?.overallPercentage ?? 0);
      s.maxScore = 100;
      s.totalScore = pct;
      s.percentage = pct;
      s.passed = pct >= (s.passingThreshold || 50);
      s.status = 'completed';
      s.completedAt = new Date();
    }
    if (evalRes) {
      attempt.overallFeedback = evalRes.overallFeedback;
      attempt.topStrengths = evalRes.topStrengths;
      attempt.topWeaknesses = evalRes.topWeaknesses;
      attempt.recommendedPracticeAreas = evalRes.recommendedPracticeAreas;
      attempt.readinessLevel = evalRes.readinessLevel as IInterviewAttempt['readinessLevel'];
    } else {
      attempt.overallFeedback = 'Your interview has been recorded. Automated scoring was unavailable this time — an instructor can review your transcript.';
    }
    attempt.markModified('sectionAttempts');
  }

  async getAttempt(attemptId: string, tenantId: string): Promise<IInterviewAttempt | null> {
    return InterviewAttempt.findOne({ _id: attemptId, tenantId })
      .populate('templateId', 'title interviewCategories totalDuration sectionNavigationMode allowResume blockMultipleTabs')
      .populate('studentId', 'firstName lastName email');
  }

  async saveAnswer(
    attemptId: string,
    tenantId: string,
    studentId: string,
    sectionIndex: number,
    questionIndex: number,
    answerData: {
      answerText?: string;
      answerCode?: string;
      selectedMCQOption?: string;
      answerAudioUrl?: string;
      responseTimeSeconds?: number;
    }
  ): Promise<IInterviewAttempt | null> {
    const attempt = await InterviewAttempt.findOne({
      _id: attemptId, tenantId, studentId, status: 'in_progress',
    });

    if (!attempt) throw new Error('Active attempt not found');

    const section = attempt.sectionAttempts[sectionIndex];
    if (!section) throw new Error('Section not found');

    const qr = section.questionResponses[questionIndex];
    if (!qr) throw new Error('Question not found');

    // Update the answer
    if (answerData.answerText !== undefined) qr.answerText = answerData.answerText;
    if (answerData.answerCode !== undefined) qr.answerCode = answerData.answerCode;
    if (answerData.selectedMCQOption !== undefined) qr.selectedMCQOption = answerData.selectedMCQOption;
    if (answerData.answerAudioUrl !== undefined) qr.answerAudioUrl = answerData.answerAudioUrl;
    if (answerData.responseTimeSeconds !== undefined) qr.responseTimeSeconds = answerData.responseTimeSeconds;

    qr.answeredAt = new Date();
    qr.status = 'answered';

    // Auto-evaluate
    const evaluation = await this.evaluateQuestionResponse(qr, section.sectionType);
    qr.score = evaluation.score;
    qr.feedback = evaluation.feedback;
    qr.strengths = evaluation.strengths;
    qr.weaknesses = evaluation.weaknesses;
    qr.missedPoints = evaluation.missedPoints;
    qr.keywordsCovered = evaluation.keywordsCovered;
    qr.keywordsMissed = evaluation.keywordsMissed;
    qr.categoryScores = evaluation.categoryScores;

    // Accumulate AI cost for this attempt
    if (evaluation.usage) {
      attempt.aiInputTokens = (attempt.aiInputTokens || 0) + (evaluation.usage.inputTokens || 0);
      attempt.aiOutputTokens = (attempt.aiOutputTokens || 0) + (evaluation.usage.outputTokens || 0);
      attempt.aiCostUsd = interviewAI.costOf({ inputTokens: attempt.aiInputTokens, outputTokens: attempt.aiOutputTokens });
    }

    // Mark section in progress if not already
    if (section.status === 'not_started') {
      section.status = 'in_progress';
      section.startedAt = new Date();
    }

    attempt.lastActiveAt = new Date();
    attempt.markModified('sectionAttempts');
    return attempt.save();
  }

  async skipQuestion(
    attemptId: string,
    tenantId: string,
    studentId: string,
    sectionIndex: number,
    questionIndex: number
  ): Promise<IInterviewAttempt | null> {
    const attempt = await InterviewAttempt.findOne({
      _id: attemptId, tenantId, studentId, status: 'in_progress',
    });

    if (!attempt) throw new Error('Active attempt not found');

    const qr = attempt.sectionAttempts[sectionIndex]?.questionResponses[questionIndex];
    if (!qr) throw new Error('Question not found');

    qr.status = 'skipped';
    qr.answeredAt = new Date();

    attempt.lastActiveAt = new Date();
    attempt.markModified('sectionAttempts');
    return attempt.save();
  }

  async completeSection(
    attemptId: string,
    tenantId: string,
    studentId: string,
    sectionIndex: number
  ): Promise<IInterviewAttempt | null> {
    const attempt = await InterviewAttempt.findOne({
      _id: attemptId, tenantId, studentId, status: 'in_progress',
    });

    if (!attempt) throw new Error('Active attempt not found');

    const section = attempt.sectionAttempts[sectionIndex];
    if (!section) throw new Error('Section not found');

    // Calculate section score
    let totalScore = 0;
    let maxPossible = 0;

    for (const qr of section.questionResponses) {
      totalScore += qr.score;
      maxPossible += qr.maxScore;
    }

    section.totalScore = totalScore;
    section.maxScore = maxPossible;
    section.percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
    section.passed = section.percentage >= section.passingThreshold;
    section.status = 'completed';
    section.completedAt = new Date();

    // Calculate category-specific aggregated scores
    this.calculateSectionCategoryScores(section);

    attempt.lastActiveAt = new Date();
    attempt.markModified('sectionAttempts');
    return attempt.save();
  }

  async submitAttempt(
    attemptId: string,
    tenantId: string,
    studentId: string
  ): Promise<IInterviewAttempt | null> {
    const attempt = await InterviewAttempt.findOne({
      _id: attemptId, tenantId, studentId, status: 'in_progress',
    });

    if (!attempt) throw new Error('Active attempt not found');

    // Conversational interviews are scored from the transcript, not per-question.
    if (attempt.mode === 'conversational') {
      await this.evaluateConversationalAttempt(attempt);
    }

    // Auto-complete any in-progress sections
    for (const section of attempt.sectionAttempts) {
      if (section.status === 'in_progress' || section.status === 'not_started') {
        let totalScore = 0;
        let maxPossible = 0;

        for (const qr of section.questionResponses) {
          if (qr.status === 'not_started') qr.status = 'skipped';
          totalScore += qr.score;
          maxPossible += qr.maxScore;
        }

        section.totalScore = totalScore;
        section.maxScore = maxPossible;
        section.percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
        section.passed = section.percentage >= section.passingThreshold;
        section.status = section.status === 'not_started' ? 'skipped' : 'completed';
        section.completedAt = new Date();

        this.calculateSectionCategoryScores(section);
      }
    }

    // Calculate overall scores
    let overallScore = 0;
    let overallMax = 0;
    const allStrengths: string[] = [];
    const allWeaknesses: string[] = [];

    for (const section of attempt.sectionAttempts) {
      overallScore += section.totalScore;
      overallMax += section.maxScore;
    }

    attempt.overallScore = overallScore;
    attempt.overallMaxScore = overallMax;
    attempt.overallPercentage = overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : 0;

    // Determine pass/fail
    const allPassed = attempt.sectionAttempts.every(s => s.passed || s.status === 'skipped');
    const anyAnswered = attempt.sectionAttempts.some(s => s.status === 'completed');

    if (!anyAnswered) {
      attempt.passStatus = 'incomplete';
    } else if (allPassed && attempt.overallPercentage >= 50) {
      attempt.passStatus = 'pass';
    } else {
      attempt.passStatus = 'fail';
    }

    // Generate overall feedback (AI summary, deterministic fallback inside).
    // Conversational attempts already have transcript-based feedback.
    if (attempt.mode !== 'conversational') {
      await this.aiGenerateOverallFeedback(attempt);
    }

    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.markModified('sectionAttempts');

    const saved = await attempt.save();

    // Update assignment if exists
    if (attempt.assignmentId) {
      const assignment = await InterviewAssignment.findById(attempt.assignmentId);
      if (assignment) {
        assignment.latestScore = attempt.overallPercentage;
        if (!assignment.bestScore || attempt.overallPercentage > assignment.bestScore) {
          assignment.bestScore = attempt.overallPercentage;
        }
        if (assignment.attemptsUsed >= assignment.maxAttempts) {
          assignment.status = 'completed';
        }
        await assignment.save();
      }
    }

    // Check if template requires review
    const template = await InterviewTemplate.findById(attempt.templateId);
    if (template && !template.requireReviewBeforePublish) {
      attempt.status = 'evaluated';
      attempt.evaluatedAt = new Date();
      if (template.showResultImmediately) {
        attempt.status = 'published';
        attempt.publishedAt = new Date();
      }
      await attempt.save();
    }

    return saved;
  }

  async evaluateAttempt(
    attemptId: string,
    tenantId: string,
    evaluatorId: string,
    data: {
      evaluatorComments?: string;
      sectionOverrides?: Array<{
        sectionIndex: number;
        totalScore?: number;
        passed?: boolean;
      }>;
    }
  ): Promise<IInterviewAttempt | null> {
    const attempt = await InterviewAttempt.findOne({
      _id: attemptId, tenantId, status: { $in: ['submitted', 'under_review'] },
    });

    if (!attempt) throw new Error('Attempt not found or not in reviewable state');

    attempt.evaluatedBy = new mongoose.Types.ObjectId(evaluatorId);
    attempt.evaluatorComments = data.evaluatorComments;

    // Apply section score overrides if provided
    if (data.sectionOverrides) {
      for (const override of data.sectionOverrides) {
        const section = attempt.sectionAttempts[override.sectionIndex];
        if (section) {
          if (override.totalScore !== undefined) {
            section.totalScore = override.totalScore;
            section.percentage = section.maxScore > 0
              ? Math.round((override.totalScore / section.maxScore) * 100) : 0;
          }
          if (override.passed !== undefined) section.passed = override.passed;
        }
      }

      // Recalculate overall
      let overallScore = 0;
      let overallMax = 0;
      for (const section of attempt.sectionAttempts) {
        overallScore += section.totalScore;
        overallMax += section.maxScore;
      }
      attempt.overallScore = overallScore;
      attempt.overallMaxScore = overallMax;
      attempt.overallPercentage = overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : 0;

      this.generateOverallFeedback(attempt);
    }

    attempt.status = 'evaluated';
    attempt.evaluatedAt = new Date();
    attempt.markModified('sectionAttempts');
    return attempt.save();
  }

  async publishAttemptResult(attemptId: string, tenantId: string): Promise<IInterviewAttempt | null> {
    return InterviewAttempt.findOneAndUpdate(
      { _id: attemptId, tenantId, status: 'evaluated' },
      { $set: { status: 'published', publishedAt: new Date() } },
      { new: true }
    );
  }

  // ── Student Attempt Views ────────────────────────────────────────────────

  async getStudentAttempts(studentId: string, tenantId: string, filters: {
    templateId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ attempts: IInterviewAttempt[]; total: number }> {
    const query: any = { tenantId, studentId };

    if (filters.templateId) query.templateId = filters.templateId;
    if (filters.status) query.status = filters.status;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [attempts, total] = await Promise.all([
      InterviewAttempt.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('templateId', 'title interviewCategories difficultyLevel totalDuration')
        .select('-sectionAttempts.questionResponses.keywordsCovered -sectionAttempts.questionResponses.keywordsMissed')
        .lean(),
      InterviewAttempt.countDocuments(query),
    ]);

    return { attempts: attempts as IInterviewAttempt[], total };
  }

  async getAttemptReport(attemptId: string, tenantId: string, studentId?: string): Promise<any> {
    const query: any = { _id: attemptId, tenantId };
    if (studentId) query.studentId = studentId;

    // Only show published results to students
    if (studentId) {
      query.status = { $in: ['published', 'evaluated'] };
    }

    const attempt: any = await InterviewAttempt.findOne(query)
      .populate('templateId', 'title description interviewCategories difficultyLevel')
      .populate('studentId', 'firstName lastName email')
      .populate('evaluatedBy', 'firstName lastName')
      .lean();
    if (!attempt) return null;

    // Enrich each answered question with its model / correct answer (report is
    // post-submission, so revealing the answer key here is intended).
    const ids: any[] = [];
    (attempt.sectionAttempts || []).forEach((s: any) => (s.questionResponses || []).forEach((qr: any) => qr.questionId && ids.push(qr.questionId)));
    if (ids.length) {
      const qs = await InterviewQuestionBankModel.find({ _id: { $in: ids } })
        .select('mcqOptions sampleStrongAnswer expectedAnswerPoints').lean();
      const map = new Map(qs.map((q: any) => [String(q._id), q]));
      (attempt.sectionAttempts || []).forEach((s: any) => (s.questionResponses || []).forEach((qr: any) => {
        const q: any = map.get(String(qr.questionId));
        if (!q) return;
        if (q.mcqOptions?.length) {
          const c = q.mcqOptions.find((o: any) => o.isCorrect);
          if (c) qr.correctAnswer = `${c.label}. ${c.text}`;
        }
        if (q.sampleStrongAnswer) qr.sampleStrongAnswer = q.sampleStrongAnswer;
        if (q.expectedAnswerPoints?.length) qr.expectedAnswerPoints = q.expectedAnswerPoints;
      }));
    }
    return attempt;
  }

  // ── Analytics ────────────────────────────────────────────────────────────

  async getAdminAnalytics(tenantId: string): Promise<any> {
    const [
      totalTemplates,
      activeTemplates,
      totalAssignments,
      totalAttempts,
      completedAttempts,
      pendingReview,
      expiredAssignments,
    ] = await Promise.all([
      InterviewTemplate.countDocuments({ tenantId }),
      InterviewTemplate.countDocuments({ tenantId, status: { $in: ['active', 'published'] } }),
      InterviewAssignment.countDocuments({ tenantId }),
      InterviewAttempt.countDocuments({ tenantId }),
      InterviewAttempt.countDocuments({ tenantId, status: { $in: ['submitted', 'evaluated', 'published'] } }),
      InterviewAttempt.countDocuments({ tenantId, status: { $in: ['submitted', 'under_review'] } }),
      InterviewAssignment.countDocuments({ tenantId, status: 'expired' }),
    ]);

    // Average scores by section type
    const sectionScores = await InterviewAttempt.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: { $in: ['evaluated', 'published'] } } },
      { $unwind: '$sectionAttempts' },
      { $group: {
        _id: '$sectionAttempts.sectionType',
        avgPercentage: { $avg: '$sectionAttempts.percentage' },
        count: { $sum: 1 },
      }},
    ]);

    // Completion rate
    const completionRate = totalAssignments > 0
      ? Math.round((completedAttempts / totalAssignments) * 100) : 0;

    // Top performers
    const topPerformers = await InterviewAttempt.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: { $in: ['evaluated', 'published'] } } },
      { $group: {
        _id: '$studentId',
        avgScore: { $avg: '$overallPercentage' },
        totalAttempts: { $sum: 1 },
        bestScore: { $max: '$overallPercentage' },
      }},
      { $sort: { avgScore: -1 } },
      { $limit: 10 },
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'student',
      }},
      { $unwind: '$student' },
      { $project: {
        studentName: { $concat: ['$student.firstName', ' ', '$student.lastName'] },
        email: '$student.email',
        avgScore: 1,
        totalAttempts: 1,
        bestScore: 1,
      }},
    ]);

    // Low performers
    const lowPerformers = await InterviewAttempt.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: { $in: ['evaluated', 'published'] } } },
      { $group: {
        _id: '$studentId',
        avgScore: { $avg: '$overallPercentage' },
        totalAttempts: { $sum: 1 },
      }},
      { $sort: { avgScore: 1 } },
      { $limit: 10 },
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'student',
      }},
      { $unwind: '$student' },
      { $project: {
        studentName: { $concat: ['$student.firstName', ' ', '$student.lastName'] },
        email: '$student.email',
        avgScore: 1,
        totalAttempts: 1,
      }},
    ]);

    // Attempt trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attemptTrends = await InterviewAttempt.aggregate([
      { $match: {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        createdAt: { $gte: thirtyDaysAgo },
      }},
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        avgScore: { $avg: '$overallPercentage' },
      }},
      { $sort: { _id: 1 } },
    ]);

    // AI usage / cost rollup
    const costAgg = await InterviewAttempt.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
      { $group: { _id: null, totalCost: { $sum: '$aiCostUsd' }, totalIn: { $sum: '$aiInputTokens' }, totalOut: { $sum: '$aiOutputTokens' } } },
    ]);
    const aiAgg = costAgg[0] || { totalCost: 0, totalIn: 0, totalOut: 0 };

    return {
      totalTemplates,
      activeTemplates,
      aiTotalCost: +(aiAgg.totalCost || 0).toFixed(4),
      aiTotalInputTokens: aiAgg.totalIn || 0,
      aiTotalOutputTokens: aiAgg.totalOut || 0,
      totalAssignments,
      totalAttempts,
      completedAttempts,
      pendingReview,
      expiredAssignments,
      completionRate,
      sectionScores,
      topPerformers,
      lowPerformers,
      attemptTrends,
    };
  }

  async getStudentAnalytics(studentId: string, tenantId: string): Promise<any> {
    const [
      totalAssigned,
      completedCount,
      pendingCount,
    ] = await Promise.all([
      InterviewAssignment.countDocuments({ tenantId, studentId }),
      InterviewAttempt.countDocuments({ tenantId, studentId, status: { $in: ['evaluated', 'published'] } }),
      InterviewAssignment.countDocuments({ tenantId, studentId, status: { $in: ['assigned', 'in_progress'] } }),
    ]);

    // Best & latest scores
    const bestAttempt = await InterviewAttempt.findOne({
      tenantId, studentId, status: { $in: ['evaluated', 'published'] },
    }).sort({ overallPercentage: -1 }).select('overallPercentage templateId').lean();

    const latestAttempt = await InterviewAttempt.findOne({
      tenantId, studentId, status: { $in: ['evaluated', 'published'] },
    }).sort({ createdAt: -1 }).select('overallPercentage templateId readinessLevel').lean();

    // Section-wise average performance
    const sectionPerformance = await InterviewAttempt.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), studentId: new mongoose.Types.ObjectId(studentId), status: { $in: ['evaluated', 'published'] } } },
      { $unwind: '$sectionAttempts' },
      { $group: {
        _id: '$sectionAttempts.sectionType',
        avgPercentage: { $avg: '$sectionAttempts.percentage' },
        count: { $sum: 1 },
      }},
    ]);

    // Improvement trend (last 10 attempts)
    const recentAttempts = await InterviewAttempt.find({
      tenantId, studentId, status: { $in: ['evaluated', 'published'] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('overallPercentage createdAt')
      .lean();

    // Weak areas
    const weakAreas = await InterviewAttempt.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), studentId: new mongoose.Types.ObjectId(studentId), status: { $in: ['evaluated', 'published'] } } },
      { $unwind: '$sectionAttempts' },
      { $match: { 'sectionAttempts.passed': false } },
      { $group: {
        _id: '$sectionAttempts.sectionType',
        avgPercentage: { $avg: '$sectionAttempts.percentage' },
        failCount: { $sum: 1 },
      }},
      { $sort: { avgPercentage: 1 } },
    ]);

    // Upcoming & missed
    const upcomingAssignments = await InterviewAssignment.find({
      tenantId, studentId, status: 'assigned',
      dueDate: { $gte: new Date() },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .populate('templateId', 'title interviewCategories')
      .lean();

    const missedAssignments = await InterviewAssignment.countDocuments({
      tenantId, studentId, status: 'expired',
    });

    return {
      totalAssigned,
      completedCount,
      pendingCount,
      bestScore: bestAttempt?.overallPercentage || 0,
      latestScore: latestAttempt?.overallPercentage || 0,
      readinessLevel: latestAttempt?.readinessLevel || 'not_ready',
      sectionPerformance,
      recentAttempts: recentAttempts.reverse(),
      weakAreas,
      upcomingAssignments,
      missedAssignments,
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private async evaluateQuestionResponse(
    qr: ISectionQuestionResponse,
    sectionType: string
  ): Promise<{
    score: number;
    feedback: string;
    strengths: string[];
    weaknesses: string[];
    missedPoints: string[];
    keywordsCovered: string[];
    keywordsMissed: string[];
    categoryScores: Record<string, number>;
    usage?: interviewAI.Usage;
  }> {
    // Get question details for evaluation
    const question = await InterviewQuestionBankModel.findById(qr.questionId).lean();
    if (!question) {
      return {
        score: 0, feedback: 'Question data not found for evaluation',
        strengths: [], weaknesses: [], missedPoints: [],
        keywordsCovered: [], keywordsMissed: [], categoryScores: {},
      };
    }

    const answer = qr.answerText || qr.answerCode || qr.selectedMCQOption || '';
    const answerLower = answer.toLowerCase();

    // MCQ evaluation
    if (qr.answerMode === 'mcq' && question.mcqOptions) {
      const correct = question.mcqOptions.find(o => o.isCorrect);
      const isCorrect = correct && qr.selectedMCQOption === correct.label;
      return {
        score: isCorrect ? question.maxScore : 0,
        feedback: isCorrect ? 'Correct answer!' : `Incorrect. The correct answer is: ${correct?.text || 'N/A'}`,
        strengths: isCorrect ? ['Correct selection'] : [],
        weaknesses: isCorrect ? [] : ['Incorrect answer'],
        missedPoints: [],
        keywordsCovered: [],
        keywordsMissed: [],
        categoryScores: {},
      };
    }

    // AI evaluation (real LLM) — preferred for open/text/code/voice answers.
    // Falls through to the deterministic keyword-based logic below when the
    // ANTHROPIC_API_KEY is missing or the call fails.
    if (answer.trim()) {
      const ai = await interviewAI.evaluateAnswer({
        questionText: question.questionText,
        questionType: question.questionType,
        sectionType: sectionType as 'communication' | 'hr' | 'technical',
        answer,
        maxScore: question.maxScore || qr.maxScore || 10,
        expectedAnswerPoints: question.expectedAnswerPoints,
        sampleStrongAnswer: question.sampleStrongAnswer,
        evaluationRubric: question.evaluationRubric,
        keywordsForMatching: question.keywordsForMatching,
        codeLanguage: question.codeLanguage,
      });
      if (ai) return ai;
    }

    // Keyword-based evaluation (fallback)
    const keywords = question.keywordsForMatching || question.expectedAnswerPoints || [];
    const covered: string[] = [];
    const missed: string[] = [];

    keywords.forEach(kw => {
      if (answerLower.includes(kw.toLowerCase())) {
        covered.push(kw);
      } else {
        missed.push(kw);
      }
    });

    const coverage = keywords.length > 0 ? covered.length / keywords.length : 0;
    const lengthScore = Math.min(answer.length / 200, 1);
    const rawScore = (coverage * 0.7 + lengthScore * 0.3) * question.maxScore;
    const score = Math.round(Math.min(rawScore, question.maxScore) * 10) / 10;

    // Strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const missedPoints: string[] = [];

    if (covered.length > 0) strengths.push(`Covered key points: ${covered.slice(0, 3).join(', ')}`);
    if (answer.length > 300) strengths.push('Detailed response');
    if (answer.length > 100) strengths.push('Adequate response length');

    if (missed.length > 0) {
      weaknesses.push(`Missing topics: ${missed.slice(0, 3).join(', ')}`);
      missedPoints.push(...missed.slice(0, 5));
    }
    if (answer.length < 50) weaknesses.push('Response too brief');

    // Weak answer indicator checks
    if (question.weakAnswerIndicators) {
      for (const indicator of question.weakAnswerIndicators) {
        if (answerLower.includes(indicator.toLowerCase())) {
          weaknesses.push(`Weak indicator: "${indicator}"`);
        }
      }
    }

    // Generate feedback
    let feedback = '';
    if (score >= question.maxScore * 0.8) {
      feedback = 'Excellent response! You covered the key points well.';
    } else if (score >= question.maxScore * 0.5) {
      feedback = 'Good attempt, but there are areas for improvement.';
    } else {
      feedback = 'Needs significant improvement. Review the topic and try again.';
    }

    if (question.sampleStrongAnswer) {
      feedback += ` A strong answer would include: ${question.sampleStrongAnswer.substring(0, 200)}...`;
    }

    // Category-specific scores
    const categoryScores: Record<string, number> = {};
    const baseScore = Math.round((score / question.maxScore) * 10);

    if (sectionType === 'communication') {
      categoryScores.confidence = Math.min(10, baseScore + (answer.length > 200 ? 1 : 0));
      categoryScores.fluency = baseScore;
      categoryScores.clarity = Math.min(10, coverage > 0.5 ? baseScore + 1 : baseScore - 1);
      categoryScores.vocabulary = Math.min(10, covered.length > 3 ? baseScore + 1 : baseScore);
      categoryScores.structure = answer.includes('.') && answer.includes(',') ? Math.min(10, baseScore + 1) : baseScore;
    } else if (sectionType === 'hr') {
      categoryScores.relevance = Math.min(10, coverage > 0.5 ? baseScore + 1 : baseScore);
      categoryScores.maturity = baseScore;
      categoryScores.attitude = Math.min(10, baseScore + (answer.length > 100 ? 1 : 0));
      categoryScores.ownership = baseScore;
      categoryScores.honesty = baseScore;
      categoryScores.situationalThinking = Math.min(10, coverage > 0.6 ? baseScore + 1 : baseScore);
    } else if (sectionType === 'technical') {
      categoryScores.correctness = Math.min(10, coverage > 0.7 ? baseScore + 2 : baseScore);
      categoryScores.depth = Math.min(10, answer.length > 300 ? baseScore + 1 : baseScore);
      categoryScores.logicalThinking = baseScore;
      categoryScores.structuredExplanation = answer.includes('.') ? Math.min(10, baseScore + 1) : baseScore;
      categoryScores.debuggingAbility = baseScore;
      categoryScores.practicalUnderstanding = Math.min(10, coverage > 0.5 ? baseScore + 1 : baseScore);
    }

    return {
      score,
      feedback,
      strengths,
      weaknesses,
      missedPoints,
      keywordsCovered: covered,
      keywordsMissed: missed,
      categoryScores,
    };
  }

  private calculateSectionCategoryScores(section: ISectionAttempt): void {
    const responses = section.questionResponses.filter(qr => qr.status === 'answered');
    if (responses.length === 0) return;

    const avgCategoryScore = (key: string) => {
      const scores = responses
        .map(qr => qr.categoryScores?.[key])
        .filter((s): s is number => s !== undefined);
      return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0;
    };

    if (section.sectionType === 'communication') {
      section.communicationScores = {
        confidence: avgCategoryScore('confidence'),
        fluency: avgCategoryScore('fluency'),
        clarity: avgCategoryScore('clarity'),
        vocabulary: avgCategoryScore('vocabulary'),
        structure: avgCategoryScore('structure'),
        grammar: avgCategoryScore('grammar') || avgCategoryScore('structure'),
        listeningAbility: avgCategoryScore('listeningAbility') || avgCategoryScore('relevance'),
      };
    } else if (section.sectionType === 'hr') {
      section.hrScores = {
        relevance: avgCategoryScore('relevance'),
        maturity: avgCategoryScore('maturity'),
        attitude: avgCategoryScore('attitude'),
        ownership: avgCategoryScore('ownership'),
        honesty: avgCategoryScore('honesty'),
        situationalThinking: avgCategoryScore('situationalThinking'),
      };
    } else if (section.sectionType === 'technical') {
      section.technicalScores = {
        correctness: avgCategoryScore('correctness'),
        depth: avgCategoryScore('depth'),
        logicalThinking: avgCategoryScore('logicalThinking'),
        structuredExplanation: avgCategoryScore('structuredExplanation'),
        debuggingAbility: avgCategoryScore('debuggingAbility'),
        practicalUnderstanding: avgCategoryScore('practicalUnderstanding'),
      };
    }
  }

  /**
   * AI-written overall verdict. Falls back to the deterministic
   * generateOverallFeedback() when the LLM is unavailable or fails.
   */
  private async aiGenerateOverallFeedback(attempt: IInterviewAttempt): Promise<void> {
    try {
      const summary = await interviewAI.summarizeAttempt({
        overallPercentage: attempt.overallPercentage,
        sections: attempt.sectionAttempts.map((s) => ({
          sectionTitle: s.sectionTitle,
          sectionType: s.sectionType,
          percentage: s.percentage,
          passed: s.passed,
          status: s.status,
          notableFeedback: s.questionResponses
            .map((qr) => qr.feedback)
            .filter((f): f is string => !!f)
            .slice(0, 2),
        })),
      });

      if (summary) {
        if (summary.usage) {
          attempt.aiInputTokens = (attempt.aiInputTokens || 0) + (summary.usage.inputTokens || 0);
          attempt.aiOutputTokens = (attempt.aiOutputTokens || 0) + (summary.usage.outputTokens || 0);
          attempt.aiCostUsd = interviewAI.costOf({ inputTokens: attempt.aiInputTokens, outputTokens: attempt.aiOutputTokens });
        }
        attempt.overallFeedback = summary.overallFeedback;
        attempt.topStrengths = summary.topStrengths;
        attempt.topWeaknesses = summary.topWeaknesses;
        attempt.recommendedPracticeAreas = summary.recommendedPracticeAreas.length
          ? summary.recommendedPracticeAreas
          : [...new Set(attempt.sectionAttempts.filter((s) => !s.passed && s.status === 'completed').map((s) => s.sectionType))];
        attempt.readinessLevel = summary.readinessLevel;
        return;
      }
    } catch {
      /* fall through to deterministic */
    }
    this.generateOverallFeedback(attempt);
  }

  private generateOverallFeedback(attempt: IInterviewAttempt): void {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const practiceAreas: string[] = [];

    for (const section of attempt.sectionAttempts) {
      if (section.passed) {
        strengths.push(`Strong performance in ${section.sectionTitle} (${section.percentage}%)`);
      } else if (section.status === 'completed') {
        weaknesses.push(`Needs improvement in ${section.sectionTitle} (${section.percentage}%)`);
        practiceAreas.push(section.sectionType);
      }
    }

    attempt.topStrengths = strengths;
    attempt.topWeaknesses = weaknesses;
    attempt.recommendedPracticeAreas = [...new Set(practiceAreas)];

    // Readiness level
    const pct = attempt.overallPercentage;
    if (pct >= 80) {
      attempt.readinessLevel = 'interview_ready';
      attempt.overallFeedback = 'Excellent performance! You are well-prepared for interviews.';
    } else if (pct >= 60) {
      attempt.readinessLevel = 'almost_ready';
      attempt.overallFeedback = 'Good progress! Focus on weak areas to become fully interview-ready.';
    } else if (pct >= 40) {
      attempt.readinessLevel = 'needs_improvement';
      attempt.overallFeedback = 'You have a foundation but need more practice. Focus on the recommended areas.';
    } else {
      attempt.readinessLevel = 'not_ready';
      attempt.overallFeedback = 'Significant preparation needed. Start with fundamentals and practice regularly.';
    }
  }
}

export default new InterviewTemplateService();
