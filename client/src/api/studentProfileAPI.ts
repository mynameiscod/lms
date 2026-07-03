import axios from 'axios';

const API_BASE_URL = (typeof window !== 'undefined' 
  ? window.location.origin 
  : 'http://localhost:5000') + '/api/v1/student-profile';

const OAUTH_BASE_URL = (typeof window !== 'undefined' 
  ? window.location.origin 
  : 'http://localhost:5000') + '/api/v1/oauth';

// Types
export interface PersonalInfo {
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
  dateOfBirth: string;
  profilePhoto?: string;
}

export interface ProfessionalProfiles {
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
}

export interface DegreeDetails {
  name?: string;
  branch?: string;
  college?: string;
  university?: string;
  percentage?: number;
  graduationYear?: number;
}

export interface IntermediateDetails {
  college?: string;
  group?: string; // MPC, BiPC, CEC, etc.
  percentage?: number;
  yearOfPassing?: number;
}

export interface TenthClassDetails {
  schoolName?: string;
  percentage?: number;
  yearOfPassing?: number;
}

export interface Education {
  highestQualification?: string;
  degree?: DegreeDetails;
  intermediate?: IntermediateDetails;
  tenthClass?: TenthClassDetails;
  currentStatus?: 'Student' | 'Graduate' | 'Working Professional';
}

export interface TechnicalBackground {
  programmingLanguages: string[];
  technologies: string[];
  experienceLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  previousCourses: string[];
}

export interface CourseInterest {
  interestedCourse: string;
  preferredLearningMode: 'Online' | 'Offline' | 'Hybrid';
  preferredBatchTime: 'Morning' | 'Afternoon' | 'Evening' | 'Weekend';
}

export interface AdditionalInfo {
  howDidYouHear?: 'Instagram' | 'LinkedIn' | 'Friend Referral' | 'YouTube' | 'Google Search' | 'Other';
  howDidYouHearOther?: string;
  careerGoal?: string;
}

export interface StudentProfileData {
  _id?: string;
  userId?: string;
  personalInfo: Partial<PersonalInfo>;
  professionalProfiles: Partial<ProfessionalProfiles>;
  education: Partial<Education>;
  technicalBackground: Partial<TechnicalBackground>;
  courseInterest: Partial<CourseInterest>;
  additionalInfo: Partial<AdditionalInfo>;
  profileCompletionPercentage?: number;
  isProfileComplete?: boolean;
  exists?: boolean;
}

// Constants for dropdowns
export const QUALIFICATIONS = [
  { value: '10th Standard', label: '10th Standard (SSC/CBSE/ICSE)' },
  { value: '12th Standard', label: '12th Standard (HSC/CBSE/ICSE)' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Polytechnic', label: 'Polytechnic' },
  { value: 'B.Tech/B.E.', label: 'B.Tech / B.E.' },
  { value: 'B.Sc', label: 'B.Sc' },
  { value: 'BCA', label: 'BCA' },
  { value: 'B.Com', label: 'B.Com' },
  { value: 'BA', label: 'BA' },
  { value: 'BBA', label: 'BBA' },
  { value: 'M.Tech/M.E.', label: 'M.Tech / M.E.' },
  { value: 'M.Sc', label: 'M.Sc' },
  { value: 'MCA', label: 'MCA' },
  { value: 'MBA', label: 'MBA' },
  { value: 'MA', label: 'MA' },
  { value: 'PhD', label: 'PhD' },
  { value: 'Other', label: 'Other' },
];

export const BRANCHES: { [key: string]: string[] } = {
  'B.Tech/B.E.': [
    'Computer Science & Engineering (CSE)',
    'Information Technology (IT)',
    'Electronics & Communication (ECE)',
    'Electrical Engineering (EE)',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Biotechnology',
    'Aerospace Engineering',
    'Data Science',
    'Artificial Intelligence & Machine Learning',
    'Other',
  ],
  'M.Tech/M.E.': [
    'Computer Science & Engineering',
    'Information Technology',
    'Software Engineering',
    'Data Science',
    'Artificial Intelligence',
    'Machine Learning',
    'Cyber Security',
    'Cloud Computing',
    'Other',
  ],
  'B.Sc': [
    'Computer Science',
    'Information Technology',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Statistics',
    'Data Science',
    'Other',
  ],
  'M.Sc': [
    'Computer Science',
    'Information Technology',
    'Data Science',
    'Mathematics',
    'Statistics',
    'Other',
  ],
  'BCA': ['Computer Applications'],
  'MCA': ['Computer Applications'],
  'Diploma': [
    'Computer Engineering',
    'Information Technology',
    'Electronics',
    'Electrical',
    'Mechanical',
    'Other',
  ],
  'Polytechnic': [
    'Computer Engineering',
    'Information Technology',
    'Electronics',
    'Electrical',
    'Mechanical',
    'Other',
  ],
};

// Intermediate (12th) groups
export const INTERMEDIATE_GROUPS = [
  { value: 'MPC', label: 'MPC (Maths, Physics, Chemistry)' },
  { value: 'BiPC', label: 'BiPC (Biology, Physics, Chemistry)' },
  { value: 'MEC', label: 'MEC (Maths, Economics, Commerce)' },
  { value: 'CEC', label: 'CEC (Civics, Economics, Commerce)' },
  { value: 'HEC', label: 'HEC (History, Economics, Civics)' },
  { value: 'Science', label: 'Science' },
  { value: 'Commerce', label: 'Commerce' },
  { value: 'Arts', label: 'Arts / Humanities' },
  { value: 'Other', label: 'Other' },
];

export const PROGRAMMING_LANGUAGES = [
  'Java', 'Python', 'JavaScript', 'TypeScript', 'C', 'C++', 'C#',
  'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'Scala',
  'R', 'MATLAB', 'SQL', 'HTML/CSS', 'None', 'Other',
];

export const TECHNOLOGIES = [
  'React', 'Angular', 'Vue.js', 'Next.js', 'Node.js', 'Express.js',
  'Spring Boot', 'Django', 'Flask', 'FastAPI', 'Laravel',
  'MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Firebase',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'Git', 'Jenkins', 'Terraform', 'GraphQL', 'REST API',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
  'None', 'Other',
];

export const INTERESTED_COURSES = [
  { value: 'Java Full Stack', label: 'Java Full Stack Development' },
  { value: 'Python Full Stack', label: 'Python Full Stack Development' },
  { value: 'MERN Stack', label: 'MERN Stack (MongoDB, Express, React, Node)' },
  { value: 'MEAN Stack', label: 'MEAN Stack (MongoDB, Express, Angular, Node)' },
  { value: 'Data Science', label: 'Data Science & Analytics' },
  { value: 'AI / ML', label: 'Artificial Intelligence / Machine Learning' },
  { value: 'DevOps', label: 'DevOps Engineering' },
  { value: 'Cloud Computing', label: 'Cloud Computing (AWS/Azure/GCP)' },
  { value: 'Cyber Security', label: 'Cyber Security' },
  { value: 'Mobile App Development', label: 'Mobile App Development' },
  { value: 'UI/UX Design', label: 'UI/UX Design' },
  { value: 'Other', label: 'Other' },
];

export const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Other'];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Puducherry', 'Other',
];

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
  'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia', 'Other',
];

export const STATES_BY_COUNTRY: Record<string, string[]> = {
  'India': INDIAN_STATES,
  'United States': US_STATES,
};

export const HOW_DID_YOU_HEAR = [
  { value: 'Instagram', label: 'Instagram' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Friend Referral', label: 'Friend Referral' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'Google Search', label: 'Google Search' },
  { value: 'Other', label: 'Other' },
];

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
  };
};

export const studentProfileAPI = {
  // Get my profile
  getMyProfile: async (): Promise<{ success: boolean; data: StudentProfileData }> => {
    const response = await axios.get(`${API_BASE_URL}/me`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Save/Update my profile
  saveProfile: async (
    profileData: StudentProfileData,
    profilePhoto?: File,
    resume?: File
  ): Promise<{ success: boolean; message: string; data: StudentProfileData }> => {
    const formData = new FormData();
    
    // Add profile data as JSON
    formData.append('personalInfo', JSON.stringify(profileData.personalInfo));
    formData.append('professionalProfiles', JSON.stringify(profileData.professionalProfiles));
    formData.append('education', JSON.stringify(profileData.education));
    formData.append('technicalBackground', JSON.stringify(profileData.technicalBackground));
    formData.append('courseInterest', JSON.stringify(profileData.courseInterest));
    formData.append('additionalInfo', JSON.stringify(profileData.additionalInfo));

    // Add files if present
    if (profilePhoto) {
      formData.append('profilePhoto', profilePhoto);
    }
    if (resume) {
      formData.append('resume', resume);
    }

    const response = await axios.post(`${API_BASE_URL}/me`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Admin: Get all profiles
  getAllProfiles: async (params?: {
    page?: number;
    limit?: number;
    interestedCourse?: string;
    experienceLevel?: string;
    currentStatus?: string;
    isComplete?: boolean;
    search?: string;
    batchId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.interestedCourse) queryParams.append('interestedCourse', params.interestedCourse);
    if (params?.experienceLevel) queryParams.append('experienceLevel', params.experienceLevel);
    if (params?.currentStatus) queryParams.append('currentStatus', params.currentStatus);
    if (params?.isComplete !== undefined) queryParams.append('isComplete', String(params.isComplete));
    if (params?.search) queryParams.append('search', params.search);
    if (params?.batchId) queryParams.append('batchId', params.batchId);

    const response = await axios.get(`${API_BASE_URL}/admin/all?${queryParams}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Admin: Get profile stats
  getProfileStats: async () => {
    const response = await axios.get(`${API_BASE_URL}/admin/stats`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Admin: Get profile by user ID
  getProfileByUserId: async (userId: string) => {
    const response = await axios.get(`${API_BASE_URL}/admin/${userId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Admin: Delete profile
  deleteProfile: async (profileId: string) => {
    const response = await axios.delete(`${API_BASE_URL}/admin/${profileId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Admin: Get student activity (attendance, quizzes, assignments, code snippets)
  getStudentActivity: async (userId: string) => {
    const response = await axios.get(`${API_BASE_URL}/admin/${userId}/activity`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Admin: Add a note about a student
  addStudentNote: async (userId: string, text: string) => {
    const response = await axios.post(`${API_BASE_URL}/admin/${userId}/notes`, { text }, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Admin: Delete a note
  deleteStudentNote: async (userId: string, noteId: string) => {
    const response = await axios.delete(`${API_BASE_URL}/admin/${userId}/notes/${noteId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Admin: Email the student their missing profile items
  sendProfileReminder: async (userId: string) => {
    const response = await axios.post(`${API_BASE_URL}/admin/${userId}/send-reminder`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Admin: Email every student with an incomplete profile
  sendBulkProfileReminders: async () => {
    const response = await axios.post(`${API_BASE_URL}/admin/send-bulk-reminders`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // ============ OAuth Methods ============
  
  // Get OAuth connection status
  getOAuthStatus: async () => {
    const response = await axios.get(`${OAUTH_BASE_URL}/status`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Initiate GitHub OAuth connection
  connectGitHub: async () => {
    const response = await axios.get(`${OAUTH_BASE_URL}/github/connect`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Disconnect GitHub account
  disconnectGitHub: async () => {
    const response = await axios.post(`${OAUTH_BASE_URL}/github/disconnect`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Initiate LinkedIn OAuth connection
  connectLinkedIn: async () => {
    const response = await axios.get(`${OAUTH_BASE_URL}/linkedin/connect`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Disconnect LinkedIn account
  disconnectLinkedIn: async () => {
    const response = await axios.post(`${OAUTH_BASE_URL}/linkedin/disconnect`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },
};

export default studentProfileAPI;
