import Assignment, { 
  IAssignment, 
  AssignmentType, 
  AssignmentStatus, 
  DifficultyLevel,
  ProgrammingLanguage 
} from '../models/Assignment';
import Submission, { SubmissionStatus } from '../models/Submission';
import User from '../models/User';
import Chapter from '../models/Chapter';
import { EmailService } from './emailService';
import { createNotifications } from '../notifications/notificationService';
import { schedulesMapForBatch, policyFromRow } from './assessmentDeliveryService';
import { computeStatus, DEFAULT_POLICY } from './deadlinePolicyService';
import { Types } from 'mongoose';

const emailService = new EmailService();

interface CreateAssignmentInput {
  tenant: Types.ObjectId;
  createdBy: Types.ObjectId;
  title: string;
  description?: string;
  instructions?: string;
  type: AssignmentType;
  difficulty?: DifficultyLevel;
  topics?: string[];
  tags?: string[];
  totalPoints?: number;
  passingPoints?: number;
  startDate?: Date;
  dueDate?: Date;
  lateSubmissionDeadline?: Date;
  lateSubmissionPenalty?: number;
  course?: Types.ObjectId;
  subject?: Types.ObjectId;
  chapter?: Types.ObjectId;
  batch?: Types.ObjectId;
  accessibleTo?: 'everyone' | 'batch_wise' | 'individual';
  selectedBatches?: string[];
  selectedStudents?: string[];
  allowedLanguages?: ProgrammingLanguage[];
  testCases?: any[];
  starterCode?: any[];
  timeLimit?: number;
  memoryLimit?: number;
  mcqQuestions?: any[];
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  rubric?: any[];
  maxFileSize?: number;
  allowedFileTypes?: string[];
  maxFiles?: number;
  maxAttempts?: number;
  showTestCaseResults?: boolean;
  showExpectedOutput?: boolean;
  enableHints?: boolean;
  hints?: string[];
  isInBank?: boolean;
  bankCategory?: string;
}

interface UpdateAssignmentInput extends Partial<CreateAssignmentInput> {
  updatedBy: Types.ObjectId;
  status?: AssignmentStatus;
}

interface ListAssignmentsFilter {
  tenant: Types.ObjectId;
  status?: AssignmentStatus | AssignmentStatus[];
  type?: AssignmentType;
  difficulty?: DifficultyLevel;
  course?: Types.ObjectId;
  subject?: Types.ObjectId;
  chapter?: Types.ObjectId;
  batch?: Types.ObjectId;
  createdBy?: Types.ObjectId | string;
  language?: string;
  primaryTech?: string;
  isInBank?: boolean;
  bankCategory?: string;
  search?: string;
  topics?: string[];
}

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class AssignmentService {
  // Create a new assignment
  async create(input: CreateAssignmentInput): Promise<IAssignment> {
    const assignment = new Assignment({
      ...input,
      status: AssignmentStatus.DRAFT
    });
    await assignment.save();

    // Link assignment to chapter if specified
    if (input.chapter) {
      await Chapter.findByIdAndUpdate(
        input.chapter,
        { $addToSet: { assignmentIds: assignment._id } }
      );
    }

    return assignment;
  }

  // Get assignment by ID
  async getById(id: string | Types.ObjectId, tenant: Types.ObjectId): Promise<IAssignment | null> {
    return Assignment.findOne({ _id: id, tenant })
      .populate('course', 'name')
      .populate('batch', 'name')
      .populate('createdBy', 'firstName lastName email');
  }

  // Update assignment
  async update(id: string | Types.ObjectId, tenant: Types.ObjectId, input: UpdateAssignmentInput): Promise<IAssignment | null> {
    // Get existing assignment to check chapter changes
    const existingAssignment = await Assignment.findOne({ _id: id, tenant });
    const oldChapterId = existingAssignment?.chapter?.toString();
    const newChapterId = input.chapter?.toString();

    const assignment = await Assignment.findOneAndUpdate(
      { _id: id, tenant },
      { $set: input },
      { new: true, runValidators: true }
    );

    // Handle chapter linking changes
    if (assignment && oldChapterId !== newChapterId) {
      // Remove from old chapter
      if (oldChapterId) {
        await Chapter.findByIdAndUpdate(
          oldChapterId,
          { $pull: { assignmentIds: assignment._id } }
        );
      }
      // Add to new chapter
      if (newChapterId) {
        await Chapter.findByIdAndUpdate(
          newChapterId,
          { $addToSet: { assignmentIds: assignment._id } }
        );
      }
    }

    // If a published assignment had its audience widened (e.g. edited to add an
    // individual student or a batch), email only the newly-added students.
    // Notifications otherwise only fire on publish(), so edits would silently
    // add students with no email. Fire-and-forget so it never blocks the update.
    if (assignment && assignment.status === AssignmentStatus.PUBLISHED) {
      this.notifyNewlyAddedStudents(existingAssignment, assignment, tenant).catch(err =>
        console.error('Failed to notify newly added students:', err));
    }

    return assignment;
  }

  // Delete assignment
  async delete(id: string | Types.ObjectId, tenant: Types.ObjectId): Promise<boolean> {
    // Check for existing submissions
    const submissionCount = await Submission.countDocuments({ assignment: id, tenant });
    if (submissionCount > 0) {
      throw new Error('Cannot delete assignment with existing submissions. Archive it instead.');
    }

    // Get assignment to check if linked to a chapter
    const assignment = await Assignment.findOne({ _id: id, tenant });
    if (assignment?.chapter) {
      // Remove from chapter's assignmentIds
      await Chapter.findByIdAndUpdate(
        assignment.chapter,
        { $pull: { assignmentIds: id } }
      );
    }
    
    const result = await Assignment.deleteOne({ _id: id, tenant });
    return result.deletedCount > 0;
  }

  // List assignments with filters and pagination
  async list(
    filter: ListAssignmentsFilter,
    options: PaginationOptions
  ): Promise<{ assignments: IAssignment[]; total: number; pages: number }> {
    const query: any = { tenant: filter.tenant };

    // Apply filters
    if (filter.status) {
      query.status = Array.isArray(filter.status) ? { $in: filter.status } : filter.status;
    }
    if (filter.type) query.type = filter.type;
    if (filter.difficulty) query.difficulty = filter.difficulty;
    if (filter.course) query.course = filter.course;
    if (filter.subject) query.subject = filter.subject;
    if (filter.chapter) query.chapter = filter.chapter;
    if (filter.primaryTech) query.primaryTech = filter.primaryTech;
    if (filter.createdBy) query.createdBy = filter.createdBy;
    if (filter.language) query.allowedLanguages = filter.language; // matches assignments whose allowedLanguages array contains it
    if (filter.isInBank !== undefined) query.isInBank = filter.isInBank;
    if (filter.bankCategory) query.bankCategory = filter.bankCategory;
    if (filter.topics?.length) query.topics = { $in: filter.topics };

    // Collect independent $or groups (batch scope + free-text search); combine with
    // $and when both are present so they don't overwrite each other.
    const orGroups: any[] = [];
    if (filter.batch) {
      // An assignment targets a batch if: legacy batch field matches, the batch is in
      // selectedBatches (batch-wise), or it's open to everyone.
      orGroups.push([
        { batch: filter.batch },
        { selectedBatches: String(filter.batch) },
        { accessibleTo: 'everyone' },
      ]);
    }
    if (filter.search) {
      orGroups.push([
        { title: { $regex: filter.search, $options: 'i' } },
        { description: { $regex: filter.search, $options: 'i' } },
        { tags: { $regex: filter.search, $options: 'i' } },
      ]);
    }
    if (orGroups.length === 1) query.$or = orGroups[0];
    else if (orGroups.length > 1) query.$and = orGroups.map(g => ({ $or: g }));

    // Pagination
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .populate('course', 'name')
        .populate('subject', 'title')
        .populate('chapter', 'title')
        .populate('batch', 'name')
        .populate('createdBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Assignment.countDocuments(query)
    ]);

    return {
      assignments,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  // Publish assignment
  async publish(id: string | Types.ObjectId, tenant: Types.ObjectId, userId: Types.ObjectId): Promise<IAssignment | null> {
    const assignment = await Assignment.findOne({ _id: id, tenant });
    if (!assignment) return null;

    // Validate assignment before publishing
    const validationErrors: string[] = [];
    
    if (!assignment.title) validationErrors.push('Title is required');
    if (!assignment.dueDate) validationErrors.push('Due date is required');
    
    if (assignment.type === AssignmentType.CODING) {
      if (!assignment.allowedLanguages?.length) validationErrors.push('At least one programming language is required');
      if (!assignment.testCases?.length) validationErrors.push('At least one test case is required');
    }
    
    if (assignment.type === AssignmentType.MCQ) {
      if (!assignment.mcqQuestions?.length) validationErrors.push('At least one MCQ question is required');
    }

    if (validationErrors.length > 0) {
      throw new Error(`Cannot publish: ${validationErrors.join(', ')}`);
    }

    assignment.status = AssignmentStatus.PUBLISHED;
    assignment.updatedBy = userId;
    await assignment.save();
    
    // Send email notifications to students (async, don't block)
    this.sendAssignmentNotifications(assignment, tenant).catch(err => {
      console.error('Failed to send assignment notifications:', err);
    });
    
    return assignment;
  }

  // Send email notifications to students about new assignment
  private async sendAssignmentNotifications(assignment: IAssignment, tenant: Types.ObjectId): Promise<void> {
    try {
      const accessibleTo = (assignment as any).accessibleTo || 'everyone';
      let students: any[] = [];

      if (accessibleTo === 'everyone') {
        students = await User.find({ tenantId: tenant, role: 'STUDENT', isActive: true }).select('firstName lastName email');
      } else if (accessibleTo === 'batch_wise' && (assignment as any).selectedBatches?.length) {
        students = await User.find({
          tenantId: tenant,
          role: 'STUDENT',
          isActive: true,
          batchId: { $in: (assignment as any).selectedBatches }
        }).select('firstName lastName email');
      } else if (accessibleTo === 'individual' && (assignment as any).selectedStudents?.length) {
        students = await User.find({
          _id: { $in: (assignment as any).selectedStudents },
          tenantId: tenant,
          role: 'STUDENT',
          isActive: true
        }).select('firstName lastName email');
      } else if (assignment.batch) {
        // legacy single-batch
        students = await User.find({ tenantId: tenant, role: 'STUDENT', isActive: true, batchId: assignment.batch }).select('firstName lastName email');
      }

      console.log(`📧 Sending assignment notifications to ${students.length} students (accessibleTo: ${accessibleTo})`);
      await this.emailStudents(students, assignment);
    } catch (err) {
      console.error('Error sending assignment notifications:', err);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Send the assignment notification email to a list of student docs, PACED so a large
  // batch doesn't trip the SMTP provider's outbound rate limit (Hostinger throttles bursts).
  // Delay is configurable via ASSIGNMENT_EMAIL_DELAY_MS (default 700ms between sends).
  private async emailStudents(students: any[], assignment: IAssignment): Promise<void> {
    const delayMs = Number(process.env.ASSIGNMENT_EMAIL_DELAY_MS) || 700;
    let sent = 0, failed = 0;
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      try {
        await emailService.sendAssignmentNotificationEmail(
          student.email,
          `${student.firstName} ${student.lastName}`,
          assignment.title,
          assignment.type,
          assignment.description,
          assignment.dueDate || new Date(),
          assignment.totalPoints,
          assignment.difficulty
        );
        sent++;
      } catch (err) {
        failed++;
        console.error(`Failed to send email to ${student.email}:`, err);
      }
      // Pace between sends (skip the wait after the last one).
      if (i < students.length - 1 && delayMs > 0) await this.sleep(delayMs);
    }
    if (students.length) console.log(`📧 Assignment emails for "${assignment.title}": ${sent} sent, ${failed} failed (of ${students.length}).`);
  }

  // Notify only students who were newly granted access by an edit (so editing a
  // published assignment to add an individual student / batch emails them).
  private async notifyNewlyAddedStudents(
    before: IAssignment | null,
    after: IAssignment,
    tenant: Types.ObjectId
  ): Promise<void> {
    try {
      const accessibleTo = (after as any).accessibleTo || 'everyone';

      if (accessibleTo === 'individual') {
        const beforeSet = new Set<string>(
          (before as any)?.accessibleTo === 'individual'
            ? ((before as any).selectedStudents || []).map(String)
            : []
        );
        const newIds = ((after as any).selectedStudents || [])
          .map(String)
          .filter((id: string) => !beforeSet.has(id));
        if (!newIds.length) return;
        const students = await User.find({
          _id: { $in: newIds },
          tenantId: tenant,
          role: 'STUDENT',
          isActive: true
        }).select('firstName lastName email');
        console.log(`📧 Notifying ${students.length} newly-added individual student(s) after edit`);
        await this.emailStudents(students, after);
      } else if (accessibleTo === 'batch_wise') {
        const beforeBatches = new Set<string>(
          (before as any)?.accessibleTo === 'batch_wise'
            ? ((before as any).selectedBatches || []).map(String)
            : []
        );
        const newBatches = ((after as any).selectedBatches || [])
          .map(String)
          .filter((b: string) => !beforeBatches.has(b));
        if (!newBatches.length) return;
        const students = await User.find({
          tenantId: tenant,
          role: 'STUDENT',
          isActive: true,
          batchId: { $in: newBatches }
        }).select('firstName lastName email');
        console.log(`📧 Notifying ${students.length} student(s) in newly-added batch(es) after edit`);
        await this.emailStudents(students, after);
      }
      // 'everyone' is intentionally not auto-notified on edit to avoid emailing
      // the whole tenant on an unrelated change.
    } catch (err) {
      console.error('notifyNewlyAddedStudents error:', err);
    }
  }

  // Remind specific students about a (pending) assignment — email + in-app notification.
  // Reuses the same assignment email as the original notification. Returns count notified.
  async remindStudents(assignmentId: string | Types.ObjectId, tenant: Types.ObjectId, studentIds: string[]): Promise<number> {
    const assignment = await Assignment.findOne({ _id: assignmentId, tenant });
    if (!assignment) return 0;
    const students = await User.find({
      _id: { $in: studentIds },
      tenantId: tenant,
      role: 'STUDENT',
      isActive: true,
    }).select('firstName lastName email');
    if (!students.length) return 0;

    // In-app notifications are cheap — do them now so the admin gets instant confirmation.
    try {
      const due = assignment.dueDate ? ` (due ${new Date(assignment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})` : '';
      await createNotifications(
        String(tenant),
        students.map((s: any) => String(s._id)),
        'general',
        `Reminder: ${assignment.title}`,
        `You have a pending assignment "${assignment.title}"${due}. Please complete it.`,
        '/assignments'
      );
    } catch (err) {
      console.error('remindStudents: in-app notification failed:', err);
    }

    // Emails are paced and can take a while for a big batch — send them in the background
    // so the HTTP request returns immediately. Failures are logged, not fatal.
    this.emailStudents(students, assignment).catch(err => console.error('remindStudents: email send failed:', err));

    return students.length;
  }

  // Archive assignment
  async archive(id: string | Types.ObjectId, tenant: Types.ObjectId, userId: Types.ObjectId): Promise<IAssignment | null> {
    return Assignment.findOneAndUpdate(
      { _id: id, tenant },
      { status: AssignmentStatus.ARCHIVED, updatedBy: userId },
      { new: true }
    );
  }

  // Clone assignment
  async clone(id: string | Types.ObjectId, tenant: Types.ObjectId, userId: Types.ObjectId): Promise<IAssignment | null> {
    const original = await Assignment.findOne({ _id: id, tenant });
    if (!original) return null;

    const cloned = new Assignment({
      ...original.toObject(),
      _id: undefined,
      title: `${original.title} (Copy)`,
      status: AssignmentStatus.DRAFT,
      createdBy: userId,
      updatedBy: undefined,
      stats: {
        totalSubmissions: 0,
        completedSubmissions: 0,
        averageScore: 0,
        highestScore: 0,
        averageTimeSpent: 0
      },
      createdAt: undefined,
      updatedAt: undefined
    });

    await cloned.save();
    return cloned;
  }

  // Get assignments for a student (published only)
  async getStudentAssignments(
    tenant: Types.ObjectId,
    studentId: Types.ObjectId,
    batch?: Types.ObjectId
  ): Promise<any[]> {
    const query: any = {
      tenant,
      status: AssignmentStatus.PUBLISHED
    };

    const studentIdStr = studentId.toString();

    // Resolve the student's batch: prefer explicit param, fall back to User.batchId
    let resolvedBatch = batch;
    if (!resolvedBatch) {
      const user = await User.findById(studentId).select('batchId').lean();
      if (user?.batchId) resolvedBatch = user.batchId as Types.ObjectId;
    }
    const batchIdStr = resolvedBatch ? resolvedBatch.toString() : null;

    // Access model: a student sees an assignment only if it's explicitly for them —
    // 'everyone', their batch, or them individually. Legacy records (no accessibleTo)
    // count ONLY when their `batch` matches this student's batch; a legacy assignment
    // with no batch is NOT shown to everyone (that leaked old work to fresh students).
    query.$or = [
      { accessibleTo: 'everyone' },
      { accessibleTo: 'individual', selectedStudents: studentIdStr },
      ...(batchIdStr ? [
        { accessibleTo: 'batch_wise', selectedBatches: batchIdStr },
        { accessibleTo: { $exists: false }, batch: resolvedBatch },
      ] : []),
    ];

    // Also surface assignments delivered to this batch via an AssessmentSchedule
    // (the reusable path) even if they aren't in selectedBatches on the doc.
    const schedMap = await schedulesMapForBatch(tenant.toString(), batchIdStr, 'assignment');
    if (schedMap.size) query.$or.push({ _id: { $in: [...schedMap.keys()] } });

    const assignments = await Assignment.find(query)
      .select('title description type difficulty totalPoints dueDate startDate topics')
      .sort({ dueDate: 1 });

    // Get submission status for each assignment
    const assignmentsWithStatus = await Promise.all(
      assignments.map(async (assignment) => {
        const submission = await Submission.findOne({
          assignment: assignment._id,
          student: studentId,
          tenant
        }).sort({ attemptNumber: -1 });

        // Resolve the deadline + status: schedule row for this batch wins, else baked dueDate.
        const row = schedMap.get(String(assignment._id));
        const dueAt = row?.dueAt ? new Date(row.dueAt) : (assignment.dueDate ? new Date(assignment.dueDate) : null);
        const policy = row ? policyFromRow(row) : DEFAULT_POLICY;
        const deadlineStatus = computeStatus({
          policy, dueAt,
          submission: submission ? { status: submission.status, submittedAt: submission.submittedAt as any, graded: submission.status === SubmissionStatus.GRADED } : null,
        });

        return {
          ...assignment.toObject(),
          delivery: {
            dueAt,
            startAt: row?.startAt ? new Date(row.startAt) : (assignment.startDate || null),
            source: row ? 'schedule' : 'baked',
            latePolicy: policy.latePolicy,
            status: deadlineStatus,
          },
          submission: submission ? {
            status: submission.status,
            attemptNumber: submission.attemptNumber,
            finalScore: submission.finalScore,
            percentage: submission.percentage,
            submittedAt: submission.submittedAt
          } : null
        };
      })
    );

    return assignmentsWithStatus;
  }

  // Update assignment statistics
  async updateStats(assignmentId: Types.ObjectId, tenant: Types.ObjectId): Promise<void> {
    const submissions = await Submission.find({
      assignment: assignmentId,
      tenant,
      status: { $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED] }
    });

    if (submissions.length === 0) return;

    const completedSubmissions = submissions.filter(s => s.status === SubmissionStatus.GRADED);
    const scores = completedSubmissions.map(s => s.finalScore);
    const times = submissions.map(s => s.timeSpent);

    const stats = {
      totalSubmissions: submissions.length,
      completedSubmissions: completedSubmissions.length,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      averageTimeSpent: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
    };

    await Assignment.updateOne({ _id: assignmentId, tenant }, { stats });
  }

  // Get bank assignments
  async getBankAssignments(
    tenant: Types.ObjectId,
    category?: string
  ): Promise<IAssignment[]> {
    const query: any = { tenant, isInBank: true };
    if (category) query.bankCategory = category;
    
    return Assignment.find(query)
      .select('title type difficulty topics tags totalPoints')
      .sort({ createdAt: -1 });
  }

  // Get topics for autocomplete
  async getTopics(tenant: Types.ObjectId): Promise<string[]> {
    const assignments = await Assignment.find({ tenant }).select('topics');
    const topics = new Set<string>();
    assignments.forEach(a => a.topics.forEach(t => topics.add(t)));
    return Array.from(topics).sort();
  }

  // Get tags for autocomplete
  async getTags(tenant: Types.ObjectId): Promise<string[]> {
    const assignments = await Assignment.find({ tenant }).select('tags');
    const tags = new Set<string>();
    assignments.forEach(a => a.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }
}

export default new AssignmentService();
