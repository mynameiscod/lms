import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentProfile extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  
  // 1. Personal Information
  personalInfo: {
    firstName: string;
    middleName?: string;
    surname?: string;
    email: string;
    mobileNumber: string;
    country: string;
    state: string;
    city: string;
    address?: string;
    gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    dateOfBirth: Date;
    profilePhoto?: string; // URL to uploaded photo
  };
  
  // 2. Professional Profiles
  professionalProfiles: {
    linkedInUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
    resumeUrl?: string; // URL to uploaded resume PDF
  };
  
  // 3. Education Details
  education: {
    // Highest Qualification (Degree/Diploma)
    highestQualification?: string;
    degree?: {
      name: string;
      branch?: string;
      college: string;
      university?: string;
      percentage?: number;
      graduationYear?: number;
    };
    // Intermediate (12th / +2)
    intermediate?: {
      college: string;
      group: string; // MPC, BiPC, CEC, etc.
      percentage?: number;
      yearOfPassing?: number;
    };
    // 10th Class (SSC)
    tenthClass?: {
      schoolName: string;
      percentage?: number;
      yearOfPassing?: number;
    };
    currentStatus?: 'Student' | 'Graduate' | 'Working Professional';
  };
  
  // 4. Technical Background
  technicalBackground: {
    programmingLanguages: string[];
    technologies: string[];
    experienceLevel: 'Beginner' | 'Intermediate' | 'Advanced';
    previousCourses: string[];
  };
  
  // 5. Course Interest
  courseInterest: {
    interestedCourse: string;
    preferredLearningMode: 'Online' | 'Offline' | 'Hybrid';
    preferredBatchTime: 'Morning' | 'Afternoon' | 'Evening' | 'Weekend';
  };
  
  // 6. Additional Information
  additionalInfo: {
    howDidYouHear?: 'Instagram' | 'LinkedIn' | 'Friend Referral' | 'YouTube' | 'Google Search' | 'Other';
    howDidYouHearOther?: string;
    careerGoal?: string;
  };
  
  // 7. OAuth Connections (for GitHub code push & LinkedIn posts)
  oauthConnections?: {
    github?: {
      accessToken?: string;
      refreshToken?: string;
      username?: string;
      profileUrl?: string;
      connectedAt?: Date;
    };
    linkedin?: {
      accessToken?: string;
      refreshToken?: string;
      profileId?: string;
      profileUrl?: string;
      connectedAt?: Date;
    };
  };
  
  // Profile completion tracking
  profileCompletionPercentage: number;
  isProfileComplete: boolean;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StudentProfileSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    
    // 1. Personal Information
    personalInfo: {
      firstName: { type: String, required: true, trim: true },
      middleName: { type: String, trim: true },
      surname: { type: String, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      mobileNumber: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      address: { type: String, trim: true },
      gender: { 
        type: String, 
        enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
        required: true 
      },
      dateOfBirth: { type: Date, required: true },
      profilePhoto: { type: String },
    },
    
    // 2. Professional Profiles
    professionalProfiles: {
      linkedInUrl: { 
        type: String, 
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || v.includes('linkedin.com');
          },
          message: 'Please enter a valid LinkedIn URL'
        }
      },
      githubUrl: { 
        type: String, 
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || v.includes('github.com');
          },
          message: 'Please enter a valid GitHub URL'
        }
      },
      portfolioUrl: { type: String, trim: true },
      resumeUrl: { type: String },
    },
    
    // 3. Education Details
    education: {
      highestQualification: { 
        type: String, 
        enum: [
          '10th Standard',
          '12th Standard',
          'Diploma',
          'Polytechnic',
          'B.Tech/B.E.',
          'B.Sc',
          'BCA',
          'B.Com',
          'BA',
          'BBA',
          'M.Tech/M.E.',
          'M.Sc',
          'MCA',
          'MBA',
          'MA',
          'PhD',
          'Other'
        ]
      },
      // Degree/Diploma details
      degree: {
        name: { type: String, trim: true },
        branch: { type: String, trim: true },
        college: { type: String, trim: true },
        university: { type: String, trim: true },
        percentage: { type: Number, min: 0, max: 100 },
        graduationYear: { type: Number, min: 1980, max: 2035 },
      },
      // Intermediate (12th / +2)
      intermediate: {
        college: { type: String, trim: true },
        group: { type: String, trim: true }, // MPC, BiPC, CEC, etc.
        percentage: { type: Number, min: 0, max: 100 },
        yearOfPassing: { type: Number, min: 1980, max: 2035 },
      },
      // 10th Class (SSC)
      tenthClass: {
        schoolName: { type: String, trim: true },
        percentage: { type: Number, min: 0, max: 100 },
        yearOfPassing: { type: Number, min: 1980, max: 2035 },
      },
      currentStatus: { 
        type: String, 
        enum: ['Student', 'Graduate', 'Working Professional']
      },
    },
    
    // 4. Technical Background
    technicalBackground: {
      programmingLanguages: [{ 
        type: String, 
        trim: true,
        enum: [
          'Java', 'Python', 'JavaScript', 'TypeScript', 'C', 'C++', 'C#',
          'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'Scala',
          'R', 'MATLAB', 'SQL', 'HTML/CSS', 'None', 'Other'
        ]
      }],
      technologies: [{ 
        type: String, 
        trim: true,
        enum: [
          'React', 'Angular', 'Vue.js', 'Next.js', 'Node.js', 'Express.js',
          'Spring Boot', 'Django', 'Flask', 'FastAPI', 'Laravel',
          'MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Firebase',
          'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
          'Git', 'Jenkins', 'Terraform', 'GraphQL', 'REST API',
          'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
          'None', 'Other'
        ]
      }],
      experienceLevel: { 
        type: String, 
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
      },
      previousCourses: [{ type: String, trim: true }],
    },
    
    // 5. Course Interest
    courseInterest: {
      interestedCourse: { 
        type: String, 
        enum: [
          'Java Full Stack',
          'Python Full Stack',
          'MERN Stack',
          'MEAN Stack',
          'Data Science',
          'AI / ML',
          'DevOps',
          'Cloud Computing',
          'Cyber Security',
          'Mobile App Development',
          'UI/UX Design',
          'Other'
        ]
      },
      preferredLearningMode: { 
        type: String, 
        enum: ['Online', 'Offline', 'Hybrid'],
        default: 'Online'
      },
      preferredBatchTime: { 
        type: String, 
        enum: ['Morning', 'Afternoon', 'Evening', 'Weekend'],
        default: 'Evening'
      },
    },
    
    // 6. Additional Information
    additionalInfo: {
      howDidYouHear: { 
        type: String, 
        enum: ['Instagram', 'LinkedIn', 'Friend Referral', 'YouTube', 'Google Search', 'Other']
      },
      howDidYouHearOther: { type: String, trim: true },
      careerGoal: { type: String, trim: true, maxlength: 500 },
    },
    
    // 7. OAuth Connections (for GitHub code push & LinkedIn posts)
    oauthConnections: {
      github: {
        accessToken: { type: String, select: false }, // Hidden by default for security
        refreshToken: { type: String, select: false },
        username: { type: String },
        profileUrl: { type: String },
        connectedAt: { type: Date },
      },
      linkedin: {
        accessToken: { type: String, select: false },
        refreshToken: { type: String, select: false },
        profileId: { type: String },
        profileUrl: { type: String },
        connectedAt: { type: Date },
      },
    },
    
    // Profile completion tracking
    profileCompletionPercentage: { type: Number, default: 0 },
    isProfileComplete: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to calculate profile completion
StudentProfileSchema.pre('save', function(next) {
  const profile = this as IStudentProfile;
  let completedFields = 0;
  let totalFields = 0;
  
  // Personal Info (9 mandatory fields)
  const personalFields = ['firstName', 'surname', 'email', 'mobileNumber', 'country', 'state', 'city', 'gender', 'dateOfBirth'];
  personalFields.forEach(field => {
    totalFields++;
    if (profile.personalInfo && (profile.personalInfo as any)[field]) completedFields++;
  });
  
  // Professional Profiles (optional - only count if filled, don't penalize if empty)
  // We'll give bonus points but not count as mandatory
  const professionalFields = ['linkedInUrl', 'githubUrl', 'portfolioUrl', 'resumeUrl'];
  let professionalFilled = 0;
  professionalFields.forEach(field => {
    if (profile.professionalProfiles && (profile.professionalProfiles as any)[field]) professionalFilled++;
  });
  // Add 1 total field for professional section (1 point if any field is filled)
  totalFields += 1;
  if (professionalFilled > 0) completedFields++;
  
  // Education (count based on qualification level)
  totalFields += 3; // highestQualification, currentStatus, and at least 10th details
  if (profile.education?.highestQualification) completedFields++;
  if (profile.education?.currentStatus) completedFields++;
  if (profile.education?.tenthClass?.schoolName) completedFields++;
  
  // Technical Background (3 fields - removed previousCourses as mandatory)
  totalFields += 3;
  if (profile.technicalBackground?.programmingLanguages?.length > 0) completedFields++;
  if (profile.technicalBackground?.technologies?.length > 0) completedFields++;
  if (profile.technicalBackground?.experienceLevel) completedFields++;
  
  // Course Interest (3 fields)
  const courseFields = ['interestedCourse', 'preferredLearningMode', 'preferredBatchTime'];
  courseFields.forEach(field => {
    totalFields++;
    if (profile.courseInterest && (profile.courseInterest as any)[field]) completedFields++;
  });
  
  // Additional Info (optional - give bonus if filled)
  totalFields += 1;
  if (profile.additionalInfo?.howDidYouHear || profile.additionalInfo?.careerGoal) completedFields++;
  
  profile.profileCompletionPercentage = Math.round((completedFields / totalFields) * 100);
  profile.isProfileComplete = profile.profileCompletionPercentage >= 80;
  profile.lastUpdated = new Date();
  
  next();
});

// Indexes
StudentProfileSchema.index({ userId: 1 }, { unique: true });
StudentProfileSchema.index({ tenantId: 1 });
StudentProfileSchema.index({ 'personalInfo.email': 1 });
StudentProfileSchema.index({ 'courseInterest.interestedCourse': 1 });
StudentProfileSchema.index({ isProfileComplete: 1 });

export default mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);
