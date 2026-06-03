import { Response } from 'express';
import mongoose from 'mongoose';
import StudentProfile from '../models/StudentProfile';
import User from '../models/User';
import QuizAttempt from '../models/QuizAttempt';
import Submission from '../models/Submission';
import CodeSnippetSubmission from '../models/CodeSnippetSubmission';
import Attendance from '../models/Attendance';
import { AuthRequest } from '../types/express';

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

    res.json({
      success: true,
      data: {
        ...profile.toObject(),
        exists: true,
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

    res.json({
      success: true,
      data: profile,
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

    const [attendanceRecords, quizAttempts, assignmentSubmissions, snippetSubmissions] = await Promise.all([
      Attendance.find({ studentId: userObjId, ...(tenantObjId ? { tenantId: tenantObjId } : {}) })
        .sort({ date: -1 })
        .limit(60)
        .lean(),
      QuizAttempt.find({ studentId: userId, tenantId: tenantStr })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Submission.find({ student: userObjId, ...(tenantObjId ? { tenant: tenantObjId } : {}) })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('assignment', 'title type totalPoints')
        .lean(),
      CodeSnippetSubmission.find({ studentId: userObjId, ...(tenantObjId ? { tenantId: tenantObjId } : {}) })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('assessmentId', 'title language totalMarks')
        .lean(),
    ]);

    // Compute attendance summary
    const present = attendanceRecords.filter((a: any) => a.status === 'present').length;
    const absent = attendanceRecords.filter((a: any) => a.status === 'absent').length;
    const late = attendanceRecords.filter((a: any) => a.status === 'late').length;
    const totalDays = present + absent + late;
    const attendancePercentage = totalDays > 0 ? Math.round(((present + late) / totalDays) * 100) : 0;

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
