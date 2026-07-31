import { Response } from 'express';
import mongoose from 'mongoose';
import StudentProfile from '../models/StudentProfile';
import User from '../models/User';
import QuizAttempt from '../models/QuizAttempt';
import Quiz from '../models/Quiz';
import Submission from '../models/Submission';
import CodeSnippetSubmission from '../models/CodeSnippetSubmission';
import Attendance from '../models/Attendance';
import Assignment from '../models/Assignment';
import CodeSnippetAssessment from '../models/CodeSnippetAssessment';
import StudentGameStats from '../models/StudentGameStats';
import DailyChallenge from '../models/DailyChallenge';
import ThinkingProfile from '../models/ThinkingProfile';
import CommunicationAttempt from '../models/CommunicationAttempt';
import CommunicationStreak from '../models/CommunicationStreak';
import { AuthRequest } from '../types/express';
import { computeProfileCompleteness, computeProfileMissing } from '../utils/profileCompleteness';
import { EmailService } from '../services/emailService';
import { resolveAssignedQuizzes, resolveAssignedSnippets, tallyStatuses } from '../services/studentWorkService';
import assignmentService from '../services/assignmentService';

// GET - Get current user's student profile
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    let profile = await StudentProfile.findOne({ userId, tenantId });

    // If profile doesn't exist, create a basic one with user data
    if (!profile) {
      const user = await User.findById(userId).select('firstName lastName email mobile');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Return empty profile structure with user's basic info
      return res.json({
        success: true,
        data: {
          exists: false,
          personalInfo: {
            firstName: user.firstName || '',
            middleName: '',
            surname: user.lastName || '',
            email: user.email || '',
            mobileNumber: user.phone || '',
            address: '',
          },
          professionalProfiles: {},
          education: {},
          technicalBackground: {
            programmingLanguages: [],
            technologies: [],
            experienceLevel: 'Beginner',
            previousCourses: [],
          },
          courseInterest: {
            preferredLearningMode: 'Online',
            preferredBatchTime: 'Evening',
          },
          additionalInfo: {},
          profileCompletionPercentage: 0,
          isProfileComplete: false,
        },
      });
    }

    const myObj = profile.toObject();
    res.json({
      success: true,
      data: {
        ...myObj,
        exists: true,
        completeness: myObj.profileCompletionPercentage ?? computeProfileCompleteness(myObj),
        missing: computeProfileMissing(myObj),
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: (error as Error).message,
    });
  }
};

// POST/PUT - Create or update student profile
export const saveProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    // Parse FormData JSON strings
    const parseField = (field: any) => {
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }
      return field || {};
    };

    // Remove empty strings from objects (they fail enum validation)
    const cleanEmptyStrings = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      const cleaned: any = {};
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value === '' || value === null || value === undefined) {
          continue; // Skip empty values
        }
        if (Array.isArray(value)) {
          cleaned[key] = value.filter(v => v !== '' && v !== null && v !== undefined);
        } else {
          cleaned[key] = value;
        }
      }
      return cleaned;
    };

    const profileData = {
      personalInfo: cleanEmptyStrings(parseField(req.body.personalInfo)),
      professionalProfiles: cleanEmptyStrings(parseField(req.body.professionalProfiles)),
      education: cleanEmptyStrings(parseField(req.body.education)),
      technicalBackground: cleanEmptyStrings(parseField(req.body.technicalBackground)),
      courseInterest: cleanEmptyStrings(parseField(req.body.courseInterest)),
      additionalInfo: cleanEmptyStrings(parseField(req.body.additionalInfo)),
    };

    // Validate required fields
    if (!profileData.personalInfo?.firstName || !profileData.personalInfo?.surname) {
      return res.status(400).json({
        success: false,
        message: 'First name and surname are required',
      });
    }

    if (!profileData.personalInfo?.email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // DEBUG: Log req.files to see what's being received
    console.log('📁 DEBUG req.files:', req.files);

    // Handle file uploads if present
    // When using upload.fields(), req.files is an object with field names as keys
    if (req.files && typeof req.files === 'object' && !Array.isArray(req.files)) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files.profilePhoto && files.profilePhoto[0]) {
        const file = files.profilePhoto[0];
        console.log('📁 DEBUG profilePhoto file:', file.filename);
        profileData.personalInfo = {
          ...profileData.personalInfo,
          profilePhoto: `/uploads/profiles/${file.filename}`,
        };
      }
      if (files.resume && files.resume[0]) {
        const file = files.resume[0];
        console.log('📁 DEBUG resume file:', file.filename);
        profileData.professionalProfiles = {
          ...profileData.professionalProfiles,
          resumeUrl: `/uploads/profiles/${file.filename}`,
        };
      }
    }

    // Check if profile exists
    let profile = await StudentProfile.findOne({ userId, tenantId });

    // DEBUG: Log profileData before save
    console.log('📸 DEBUG profileData.personalInfo:', JSON.stringify(profileData.personalInfo, null, 2));
    console.log('📸 DEBUG profilePhoto value:', profileData.personalInfo?.profilePhoto);

    if (profile) {
      // Update existing profile - convert to plain objects using spread to handle Mongoose subdocuments
      const existingPersonalInfo = { ...(profile.personalInfo as any || {}) };
      const existingProfessionalProfiles = { ...(profile.professionalProfiles as any || {}) };
      const existingEducation = { ...(profile.education as any || {}) };
      const existingTechnicalBackground = { ...(profile.technicalBackground as any || {}) };
      const existingCourseInterest = { ...(profile.courseInterest as any || {}) };
      const existingAdditionalInfo = { ...(profile.additionalInfo as any || {}) };

      // Preserve existing profilePhoto and resumeUrl if no new file was uploaded
      const newPersonalInfo = { ...profileData.personalInfo };
      if (!newPersonalInfo.profilePhoto && existingPersonalInfo.profilePhoto) {
        newPersonalInfo.profilePhoto = existingPersonalInfo.profilePhoto;
      }
      
      const newProfessionalProfiles = { ...profileData.professionalProfiles };
      if (!newProfessionalProfiles.resumeUrl && existingProfessionalProfiles.resumeUrl) {
        newProfessionalProfiles.resumeUrl = existingProfessionalProfiles.resumeUrl;
      }

      const mergedPersonalInfo = { ...existingPersonalInfo, ...newPersonalInfo };
      console.log('📸 DEBUG mergedPersonalInfo:', JSON.stringify(mergedPersonalInfo, null, 2));
      
      profile.personalInfo = mergedPersonalInfo;
      profile.professionalProfiles = { ...existingProfessionalProfiles, ...newProfessionalProfiles };
      profile.education = { ...existingEducation, ...profileData.education };
      profile.technicalBackground = { ...existingTechnicalBackground, ...profileData.technicalBackground };
      profile.courseInterest = { ...existingCourseInterest, ...profileData.courseInterest };
      profile.additionalInfo = { ...existingAdditionalInfo, ...profileData.additionalInfo };
      
      // Mark nested paths as modified to ensure Mongoose saves them
      profile.markModified('personalInfo');
      profile.markModified('professionalProfiles');
      profile.markModified('education');
      profile.markModified('technicalBackground');
      profile.markModified('courseInterest');
      profile.markModified('additionalInfo');
      
      await profile.save();
    } else {
      // Create new profile
      profile = new StudentProfile({
        userId,
        tenantId,
        ...profileData,
      });
      
      await profile.save();
    }

    // Also update the User model with basic info
    await User.findByIdAndUpdate(userId, {
      firstName: profileData.personalInfo.firstName,
      lastName: profileData.personalInfo.surname,
      phone: profileData.personalInfo.mobileNumber,
    });

    res.json({
      success: true,
      message: 'Profile saved successfully',
      data: profile,
    });
  } catch (error: any) {
    console.error('Save profile error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message).join(', ');
      return res.status(400).json({
        success: false,
        message: messages || 'Validation failed',
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to save profile',
      error: error.message,
    });
  }
};

// GET - Get profile by user ID (Admin only)
export const getProfileByUserId = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    const profile = await StudentProfile.findOne({ 
      userId: new mongoose.Types.ObjectId(userId), 
      tenantId 
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const obj = profile.toObject();
    res.json({
      success: true,
      data: { ...obj, completeness: obj.profileCompletionPercentage ?? computeProfileCompleteness(obj), missing: computeProfileMissing(obj) },
    });
  } catch (error) {
    console.error('Get profile by user ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: (error as Error).message,
    });
  }
};

// GET - Get all student profiles (Admin only)
export const getAllProfiles = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { 
      page = 1, 
      limit = 10, 
      interestedCourse, 
      experienceLevel,
      currentStatus,
      isComplete,
      search,
      batchId
    } = req.query;

    const query: any = { tenantId };

    if (interestedCourse) {
      query['courseInterest.interestedCourse'] = interestedCourse;
    }

    if (experienceLevel) {
      query['technicalBackground.experienceLevel'] = experienceLevel;
    }

    if (currentStatus) {
      query['education.currentStatus'] = currentStatus;
    }

    if (isComplete !== undefined) {
      query.isProfileComplete = isComplete === 'true';
    }

    if (search) {
      query.$or = [
        { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
        { 'personalInfo.surname': { $regex: search, $options: 'i' } },
        { 'personalInfo.email': { $regex: search, $options: 'i' } },
      ];
    }

    // Batch filter: find users in the given batch, then filter profiles by userId
    if (batchId && mongoose.Types.ObjectId.isValid(batchId as string)) {
      const batchUsers = await User.find({ batchId: new mongoose.Types.ObjectId(batchId as string), tenantId }).select('_id');
      const batchUserIds = batchUsers.map((u) => u._id);
      query.userId = { $in: batchUserIds };
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [profiles, total] = await Promise.all([
      StudentProfile.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StudentProfile.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        profiles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get all profiles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profiles',
      error: (error as Error).message,
    });
  }
};

// DELETE - Delete student profile (Admin only)
export const deleteProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile ID',
      });
    }

    const result = await StudentProfile.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(profileId),
      tenantId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    res.json({
      success: true,
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile',
      error: (error as Error).message,
    });
  }
};

// GET - Profile statistics (Admin only)
export const getProfileStats = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    const [
      totalProfiles,
      completeProfiles,
      profilesWithResume,
      avgCompletionResult,
      courseInterestStats,
      experienceLevelStats,
      learningModeStats,
    ] = await Promise.all([
      StudentProfile.countDocuments({ tenantId }),
      StudentProfile.countDocuments({ tenantId, isProfileComplete: true }),
      StudentProfile.countDocuments({ tenantId, 'professionalProfiles.resumeUrl': { $exists: true, $ne: '' } }),
      StudentProfile.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId as string) } },
        { $group: { _id: null, avg: { $avg: '$profileCompletionPercentage' } } },
      ]),
      StudentProfile.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId as string) } },
        { $group: { _id: '$courseInterest.interestedCourse', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      StudentProfile.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId as string) } },
        { $group: { _id: '$technicalBackground.experienceLevel', count: { $sum: 1 } } },
      ]),
      StudentProfile.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId as string) } },
        { $group: { _id: '$courseInterest.preferredLearningMode', count: { $sum: 1 } } },
      ]),
    ]);

    const averageCompletion = Math.round(avgCompletionResult[0]?.avg || 0);

    res.json({
      success: true,
      data: {
        // Short names used by admin UI
        total: totalProfiles,
        complete: completeProfiles,
        withResume: profilesWithResume,
        averageCompletion,
        // Verbose names for backwards compat
        totalProfiles,
        completeProfiles,
        incompleteProfiles: totalProfiles - completeProfiles,
        completionRate: totalProfiles > 0 ? Math.round((completeProfiles / totalProfiles) * 100) : 0,
        courseInterestStats,
        experienceLevelStats,
        learningModeStats,
      },
    });
  } catch (error) {
    console.error('Get profile stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: (error as Error).message,
    });
  }
};

// GET - Student activity overview for admin (attendance, quizzes, assignments, code snippets)
export const getStudentActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    const tenantStr = tenantId as string;
    const tenantObjId = mongoose.Types.ObjectId.isValid(tenantStr) ? new mongoose.Types.ObjectId(tenantStr) : null;

    // Who is this student — their batch drives what's ASSIGNED to them.
    const student: any = await User.findById(userObjId).select('batchId').lean();
    const batchId = student?.batchId ? new mongoose.Types.ObjectId(String(student.batchId)) : null;
    const batchStr = batchId ? String(batchId) : '';

    // "Assigned to this student" is resolved by the SHARED service — the same code the
    // student's own screens use. This used to be a hand-rolled query here that only
    // knew about batch_wise/individual targeting, so anything delivered through an
    // AssessmentSchedule was invisible to staff while the student saw it every day.
    const [attendanceRecords, assignedQuizzes, assignedAssignments, assignedSnippets] = await Promise.all([
      Attendance.find({ studentId: userObjId, ...(tenantObjId ? { tenantId: tenantObjId } : {}) }).sort({ date: -1 }).limit(60).lean(),
      resolveAssignedQuizzes(tenantStr, userId, batchStr || null),
      tenantObjId
        ? assignmentService.getStudentAssignments(tenantObjId, userObjId, batchId || undefined)
        : Promise.resolve([] as any[]),
      resolveAssignedSnippets(tenantStr, userId, batchStr || null),
    ]);

    // Quizzes → every assigned quiz with its real delivery status.
    const quizAttempts = assignedQuizzes.map((a) => {
      const at = a.latestAttempt;
      return {
        ...(at ? (typeof at.toObject === 'function' ? at.toObject() : at) : {}),
        quizId: String(a.quiz._id),
        quizTitle: a.quiz.title,
        totalMarks: at?.totalMarks ?? a.quiz.totalMarks,
        obtainedMarks: at?.obtainedMarks ?? null,
        status: a.status,                 // not_started | in_progress | submitted | late | graded | overdue | missed
        attempted: a.attemptCount > 0 || a.hasInProgress,
        attemptCount: a.attemptCount,
        assigned: true,
        dueAt: a.dueAt,
        source: a.source,                 // 'schedule' | 'baked' — how it reached them
      };
    });

    // Assignments → straight from the student-facing resolver, so the two agree.
    const assignmentSubmissions = (assignedAssignments as any[]).map((asg: any) => ({
      assignmentId: String(asg._id),
      assignment: {
        _id: asg._id, title: asg.title, type: asg.type,
        totalPoints: asg.totalPoints, dueDate: asg.dueDate,
      },
      status: asg.delivery?.status || 'not_started',
      attempted: !!asg.submission,
      obtainedPoints: asg.submission?.finalScore ?? null,
      percentage: asg.submission?.percentage ?? null,
      submittedAt: asg.submission?.submittedAt || null,
      assigned: true,
      dueAt: asg.delivery?.dueAt || asg.dueDate || null,
      source: asg.delivery?.source || 'baked',
    }));

    // Code snippets → same resolver as the student's list.
    const snippetSubmissions = assignedSnippets.map((s) => ({
      assessmentId: {
        _id: s.assessment._id, title: s.assessment.title,
        language: s.assessment.language, totalMarks: s.assessment.totalMarks,
      },
      status: s.status,
      attempted: !!s.submission,
      totalMarksAwarded: s.submission?.totalMarksAwarded ?? null,
      assigned: true,
    }));

    // Attendance summary
    const present = attendanceRecords.filter((a: any) => a.status === 'present').length;
    const absent = attendanceRecords.filter((a: any) => a.status === 'absent').length;
    const late = attendanceRecords.filter((a: any) => a.status === 'late').length;
    const totalDays = present + absent + late;
    const attendancePercentage = totalDays > 0 ? Math.round(((present + late) / totalDays) * 100) : 0;

    // ── Student labs — previously untrackable from the admin side at all ────────
    const [gameStats, challenges, thinkingProfile, commAttempts, commStreak] = await Promise.all([
      StudentGameStats.findOne({ tenantId: tenantStr, studentId: userObjId }).lean(),
      DailyChallenge.find({ tenantId: tenantStr, studentId: userObjId }).sort({ date: -1 }).limit(30).lean(),
      ThinkingProfile.findOne({ tenantId: tenantStr, studentId: userObjId }).lean(),
      tenantObjId
        ? CommunicationAttempt.find({ tenantId: tenantObjId, studentId: userObjId }).sort({ createdAt: -1 }).limit(30).lean()
        : Promise.resolve([] as any[]),
      tenantObjId
        ? CommunicationStreak.findOne({ tenantId: tenantObjId, studentId: userObjId }).lean()
        : Promise.resolve(null as any),
    ]);

    const gs: any = gameStats;
    const solved = (challenges as any[]).filter(c => c.status === 'solved');
    const thinkingLab = {
      summary: {
        xp: gs?.xpTotal || 0,
        level: gs?.level || 1,
        solvedTotal: gs?.solvedTotal || 0,
        currentStreak: gs?.currentStreak || 0,
        longestStreak: gs?.longestStreak || 0,
        badges: (gs?.badges || []).length,
        lastSolvedDate: gs?.lastSolvedDate || null,
        assignedRecent: challenges.length,
        solvedRecent: solved.length,
      },
      traits: (thinkingProfile as any)?.traits || [],
      strengths: (thinkingProfile as any)?.strengths || [],
      weaknesses: (thinkingProfile as any)?.weaknesses || [],
      recent: (challenges as any[]).slice(0, 15).map(c => ({
        date: c.date, difficulty: c.difficulty, status: c.status,
        score: c.evaluation?.overall ?? null, hintsUsed: c.hintsUsed ?? 0,
      })),
    };

    const completedComm = (commAttempts as any[]).filter(a => a.status === 'completed');
    const avg = (pick: (a: any) => number) => completedComm.length
      ? Math.round(completedComm.reduce((s, a) => s + (pick(a) || 0), 0) / completedComm.length)
      : 0;
    const communicationLab = {
      summary: {
        attempts: commAttempts.length,
        completed: completedComm.length,
        averageOverall: avg(a => a.overallScore),
        averageFluency: avg(a => a.fluencyScore),
        averageConfidence: avg(a => a.confidenceScore),
        averageGrammar: avg(a => a.grammarScore),
        currentStreak: (commStreak as any)?.currentStreak || 0,
        longestStreak: (commStreak as any)?.longestStreak || 0,
        completedDays: (commStreak as any)?.totalCompletedDays || 0,
        missedDays: (commStreak as any)?.totalMissedDays || 0,
      },
      recent: (commAttempts as any[]).slice(0, 15).map(a => ({
        date: a.practiceDate || a.createdAt, status: a.status,
        overall: a.overallScore ?? null, fluency: a.fluencyScore ?? null,
        confidence: a.confidenceScore ?? null, grammar: a.grammarScore ?? null,
      })),
    };

    res.json({
      success: true,
      data: {
        attendance: {
          summary: { present, absent, late, totalDays, percentage: attendancePercentage },
          recent: attendanceRecords.slice(0, 15),
        },
        quizAttempts,
        assignmentSubmissions,
        snippetSubmissions,
        thinkingLab,
        communicationLab,
        // Headline counts so every screen agrees on "assigned vs done".
        totals: {
          quizzes: tallyStatuses(assignedQuizzes.map(a => a.status)),
          assignments: tallyStatuses((assignedAssignments as any[]).map(a => a.delivery?.status || 'not_started')),
          snippets: tallyStatuses(assignedSnippets.map(s => s.status)),
        },
      },
    });
  } catch (error) {
    console.error('Get student activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student activity',
      error: (error as Error).message,
    });
  }
};

// Build the "complete your profile" email HTML from a missing-items list.
function missingEmailHtml(name: string, missing: { section: string; fields: string[] }[], completeness: number): string {
  const rows = missing.map(m => `
    <tr><td style="padding:8px 12px;font-weight:600;color:#0f172a;border-bottom:1px solid #eef1f6;">${m.section}</td>
    <td style="padding:8px 12px;color:#475569;border-bottom:1px solid #eef1f6;">${m.fields.join(', ')}</td></tr>`).join('');
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#334155;">
      <h2 style="color:#0f172a;">Hi ${name}, let's complete your profile 🎯</h2>
      <p>Your CodeBegun profile is <b>${completeness}%</b> complete. A complete profile helps us match you to the right opportunities and share it with hiring partners. Please add the following:</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eef1f6;border-radius:8px;overflow:hidden;margin:14px 0;">
        <thead><tr style="background:#f8fafc;"><th style="text-align:left;padding:8px 12px;font-size:12px;color:#64748b;">SECTION</th><th style="text-align:left;padding:8px 12px;font-size:12px;color:#64748b;">MISSING</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <a href="https://platform.codebegun.com/profile" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:700;">Complete my profile →</a>
      <p style="color:#94a3b8;font-size:12px;margin-top:18px;">— Team CodeBegun</p>
    </div>`;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// POST - Email the student the list of profile items they still need to complete.
export const sendProfileReminderEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user?.tenantId as string;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    const profile = await StudentProfile.findOne({ userId: new mongoose.Types.ObjectId(userId), tenantId });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    const obj = profile.toObject();
    const missing = computeProfileMissing(obj);
    const completeness = computeProfileCompleteness(obj);
    const email = (obj as any).personalInfo?.email;
    const name = (obj as any).personalInfo?.firstName || 'there';
    if (!email) return res.status(400).json({ success: false, message: 'Student has no email on file.' });
    if (!missing.length) return res.json({ success: true, message: 'Profile is already 100% complete — nothing to send.' });

    const emailService = new EmailService(tenantId);
    await emailService.sendGenericEmail(email, 'Complete your CodeBegun profile', missingEmailHtml(name, missing, completeness));
    res.json({ success: true, message: `Reminder sent to ${email}.`, missing });
  } catch (error) {
    console.error('Send profile reminder error:', error);
    res.status(500).json({ success: false, message: 'Failed to send reminder', error: (error as Error).message });
  }
};

// POST - Email EVERY student with an incomplete profile their missing items.
// Emails are paced + sent in the background so the request returns immediately and the
// SMTP provider's burst limit isn't tripped.
export const sendBulkProfileReminders = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId as string;
    const profiles = await StudentProfile.find({ tenantId }).lean();
    const targets: { email: string; name: string; missing: any[]; completeness: number }[] = [];
    for (const p of profiles) {
      const missing = computeProfileMissing(p);
      const email = (p as any).personalInfo?.email;
      if (missing.length && email) {
        targets.push({ email, name: (p as any).personalInfo?.firstName || 'there', missing, completeness: computeProfileCompleteness(p) });
      }
    }
    if (!targets.length) return res.json({ success: true, message: 'All student profiles are complete — nothing to send.', count: 0 });

    // Fire in the background, paced ~700ms apart.
    (async () => {
      const emailService = new EmailService(tenantId);
      let sent = 0;
      for (let i = 0; i < targets.length; i++) {
        try { await emailService.sendGenericEmail(targets[i].email, 'Complete your CodeBegun profile', missingEmailHtml(targets[i].name, targets[i].missing, targets[i].completeness)); sent++; }
        catch (e) { console.error(`bulk profile reminder failed for ${targets[i].email}:`, e); }
        if (i < targets.length - 1) await sleep(700);
      }
      console.log(`📧 Bulk profile reminders: ${sent}/${targets.length} sent.`);
    })().catch(e => console.error('bulk profile reminder loop failed:', e));

    res.json({ success: true, message: `Sending reminders to ${targets.length} student(s) with incomplete profiles — emails are being delivered.`, count: targets.length });
  } catch (error) {
    console.error('Bulk profile reminder error:', error);
    res.status(500).json({ success: false, message: 'Failed to send bulk reminders', error: (error as Error).message });
  }
};

// POST - Add an admin note to a student's profile
export const addStudentNote = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user?.tenantId;
    const text = (req.body?.text || '').trim();
    if (!text) return res.status(400).json({ success: false, message: 'Note text is required' });

    const profile = await StudentProfile.findOne({ userId, tenantId });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    const author = await User.findById(req.user?.id).select('firstName lastName role');
    (profile as any).adminNotes.push({
      text,
      authorId: req.user?.id,
      authorName: author ? `${author.firstName || ''} ${author.lastName || ''}`.trim() : 'Admin',
      authorRole: (author as any)?.role || '',
      createdAt: new Date(),
    });
    await profile.save();
    res.json({ success: true, data: (profile as any).adminNotes });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message || 'Failed to add note' });
  }
};

// DELETE - Remove an admin note from a student's profile
export const deleteStudentNote = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, noteId } = req.params;
    const tenantId = req.user?.tenantId;
    const profile = await StudentProfile.findOne({ userId, tenantId });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    (profile as any).adminNotes = (profile as any).adminNotes.filter((n: any) => String(n._id) !== noteId);
    await profile.save();
    res.json({ success: true, data: (profile as any).adminNotes });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message || 'Failed to delete note' });
  }
};
