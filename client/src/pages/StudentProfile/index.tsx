import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  studentProfileAPI,
  StudentProfileData,
  QUALIFICATIONS,
  BRANCHES,
  INTERMEDIATE_GROUPS,
  PROGRAMMING_LANGUAGES,
  TECHNOLOGIES,
  INTERESTED_COURSES,
  COUNTRIES,
  STATES_BY_COUNTRY,
  HOW_DID_YOU_HEAR,
} from '../../api/studentProfileAPI';
import './StudentProfile.css';

interface OAuthStatus {
  github: { connected: boolean; username?: string; profileUrl?: string; connectedAt?: string };
  linkedin: { connected: boolean; profileId?: string; profileUrl?: string; connectedAt?: string };
}

const StudentProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [oauthStatus, setOAuthStatus] = useState<OAuthStatus>({ 
    github: { connected: false }, 
    linkedin: { connected: false } 
  });
  const [connectingOAuth, setConnectingOAuth] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [profile, setProfile] = useState<StudentProfileData>({
    personalInfo: {
      firstName: '',
      middleName: '',
      surname: '',
      email: '',
      mobileNumber: '',
      country: 'India',
      state: '',
      city: '',
      address: '',
      gender: undefined,
      dateOfBirth: '',
      profilePhoto: '',
    },
    professionalProfiles: {
      linkedInUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      resumeUrl: '',
    },
    education: {
      highestQualification: '',
      degree: {
        name: '',
        branch: '',
        college: '',
        university: '',
        percentage: undefined,
        graduationYear: new Date().getFullYear(),
      },
      intermediate: {
        college: '',
        group: '',
        percentage: undefined,
        yearOfPassing: undefined,
      },
      tenthClass: {
        schoolName: '',
        percentage: undefined,
        yearOfPassing: undefined,
      },
      currentStatus: undefined,
    },
    technicalBackground: {
      programmingLanguages: [],
      technologies: [],
      experienceLevel: 'Beginner',
      previousCourses: [],
    },
    courseInterest: {
      interestedCourse: '',
      preferredLearningMode: 'Online',
      preferredBatchTime: 'Evening',
    },
    additionalInfo: {
      howDidYouHear: undefined,
      howDidYouHearOther: '',
      careerGoal: '',
    },
    profileCompletionPercentage: 0,
  });

  const totalSteps = 6;

  useEffect(() => {
    fetchProfile();
    fetchOAuthStatus();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await studentProfileAPI.getMyProfile();
      if (response.success && response.data) {
        setProfile(prev => ({
          ...prev,
          ...response.data,
          personalInfo: { ...prev.personalInfo, ...response.data.personalInfo },
          professionalProfiles: { ...prev.professionalProfiles, ...response.data.professionalProfiles },
          education: { ...prev.education, ...response.data.education },
          technicalBackground: { ...prev.technicalBackground, ...response.data.technicalBackground },
          courseInterest: { ...prev.courseInterest, ...response.data.courseInterest },
          additionalInfo: { ...prev.additionalInfo, ...response.data.additionalInfo },
        }));
        if (response.data.personalInfo?.profilePhoto) {
          // Use relative path - proxy will forward to backend in development
          const photoUrl = response.data.personalInfo.profilePhoto;
          setProfilePhotoPreview(photoUrl);
          // Update navbar profile picture if not already set
          if (!user?.profilePicture) {
            updateProfile({ profilePicture: photoUrl });
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      // Pre-fill with user data if available
      if (user) {
        setProfile(prev => ({
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
          },
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOAuthStatus = async () => {
    try {
      const response = await studentProfileAPI.getOAuthStatus();
      if (response.success && response.data) {
        setOAuthStatus(response.data);
      }
    } catch (err) {
      console.error('Error fetching OAuth status:', err);
    }
  };

  const handleOAuthConnect = async (provider: 'github' | 'linkedin') => {
    try {
      setConnectingOAuth(provider);
      const connectFn = provider === 'github' 
        ? studentProfileAPI.connectGitHub 
        : studentProfileAPI.connectLinkedIn;
      
      const response = await connectFn();
      if (response.success && response.authUrl) {
        // Redirect to OAuth provider
        window.location.href = response.authUrl;
      }
    } catch (err: any) {
      setError(`Failed to connect ${provider}: ${err.message}`);
    } finally {
      setConnectingOAuth(null);
    }
  };

  const handleOAuthDisconnect = async (provider: 'github' | 'linkedin') => {
    if (!window.confirm(`Are you sure you want to disconnect your ${provider === 'github' ? 'GitHub' : 'LinkedIn'} account?`)) {
      return;
    }
    
    try {
      setConnectingOAuth(provider);
      const disconnectFn = provider === 'github' 
        ? studentProfileAPI.disconnectGitHub 
        : studentProfileAPI.disconnectLinkedIn;
      
      const response = await disconnectFn();
      if (response.success) {
        setOAuthStatus(prev => ({
          ...prev,
          [provider]: { connected: false }
        }));
        setSuccess(`${provider === 'github' ? 'GitHub' : 'LinkedIn'} account disconnected successfully`);
      }
    } catch (err: any) {
      setError(`Failed to disconnect ${provider}: ${err.message}`);
    } finally {
      setConnectingOAuth(null);
    }
  };

  const handleInputChange = (
    section: keyof StudentProfileData,
    field: string,
    value: any
  ) => {
    setProfile(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value,
      },
    }));
  };

  const handleArrayChange = (
    section: keyof StudentProfileData,
    field: string,
    value: string,
    checked: boolean
  ) => {
    setProfile(prev => {
      const currentArray = ((prev[section] as any)[field] as string[]) || [];
      const newArray = checked
        ? [...currentArray, value]
        : currentArray.filter(item => item !== value);
      return {
        ...prev,
        [section]: {
          ...(prev[section] as any),
          [field]: newArray,
        },
      };
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePhoto(file);
      setProfilePhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResume(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await studentProfileAPI.saveProfile(
        profile,
        profilePhoto || undefined,
        resume || undefined
      );

      if (response.success) {
        setSuccess('Profile saved successfully!');
        setProfile(prev => ({
          ...prev,
          ...response.data,
          profileCompletionPercentage: response.data.profileCompletionPercentage,
        }));
        
        // Update profile photo preview with the server URL after save
        if (response.data.personalInfo?.profilePhoto) {
          const photoUrl = response.data.personalInfo.profilePhoto;
          setProfilePhotoPreview(photoUrl);
          // Update navbar profile picture
          updateProfile({ profilePicture: photoUrl });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      const errors = validateStep(currentStep);
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setError('Please fill in all required fields before proceeding.');
        window.scrollTo(0, 0);
        return;
      }
      setValidationErrors({});
      setError(null);
      // Auto-save before moving to next step
      await handleSave();
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const validateStep = (step: number): Record<string, string> => {
    const errors: Record<string, string> = {};
    switch (step) {
      case 1: {
        const p = profile.personalInfo;
        if (!p?.firstName?.trim()) errors['personalInfo.firstName'] = 'First name is required';
        if (!p?.surname?.trim()) errors['personalInfo.surname'] = 'Surname is required';
        if (!p?.mobileNumber?.trim()) errors['personalInfo.mobileNumber'] = 'Mobile number is required';
        if (!p?.gender) errors['personalInfo.gender'] = 'Gender is required';
        if (!p?.dateOfBirth) errors['personalInfo.dateOfBirth'] = 'Date of birth is required';
        if (!p?.country?.trim()) errors['personalInfo.country'] = 'Country is required';
        if (!p?.state?.trim()) errors['personalInfo.state'] = 'State is required';
        if (!p?.city?.trim()) errors['personalInfo.city'] = 'City is required';
        break;
      }
      case 3: {
        const e = profile.education;
        if (!e?.currentStatus) errors['education.currentStatus'] = 'Current status is required';
        if (!e?.highestQualification) errors['education.highestQualification'] = 'Highest qualification is required';
        if (!e?.tenthClass?.schoolName?.trim()) errors['education.tenthClass.schoolName'] = 'School name is required';
        break;
      }
      case 4: {
        if (!profile.technicalBackground?.experienceLevel) errors['technicalBackground.experienceLevel'] = 'Experience level is required';
        break;
      }
      case 5: {
        const c = profile.courseInterest;
        if (!c?.interestedCourse) errors['courseInterest.interestedCourse'] = 'Interested course is required';
        if (!c?.preferredLearningMode) errors['courseInterest.preferredLearningMode'] = 'Learning mode is required';
        if (!c?.preferredBatchTime) errors['courseInterest.preferredBatchTime'] = 'Batch time is required';
        break;
      }
    }
    return errors;
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // Handle nested education object changes
  const handleEducationNestedChange = (
    nestedField: 'degree' | 'intermediate' | 'tenthClass',
    field: string,
    value: any
  ) => {
    setProfile(prev => ({
      ...prev,
      education: {
        ...prev.education,
        [nestedField]: {
          ...(prev.education as any)?.[nestedField],
          [field]: value,
        },
      },
    }));
  };

  const getBranchOptions = () => {
    const qualification = profile.education?.highestQualification || '';
    return BRANCHES[qualification] || [];
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear + 5; year >= 1990; year--) {
      years.push(year);
    }
    return years;
  };

  // Check if qualification requires degree details
  const showDegreeDetails = () => {
    const qual = profile.education?.highestQualification || '';
    return ['B.Tech/B.E.', 'B.Sc', 'BCA', 'B.Com', 'BA', 'BBA', 
            'M.Tech/M.E.', 'M.Sc', 'MCA', 'MBA', 'MA', 'PhD',
            'Diploma', 'Polytechnic'].includes(qual);
  };

  // Check if should show intermediate details
  const showIntermediateDetails = () => {
    const qual = profile.education?.highestQualification || '';
    return qual && qual !== '10th Standard';
  };

  if (loading) {
    return (
      <div className="student-profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-profile-page">
      {/* Score Banner */}
      {(() => {
        const pct = profile.profileCompletionPercentage || 0;
        const r = 44;
        const circ = 2 * Math.PI * r;
        const offset = circ - (pct / 100) * circ;
        const scoreColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : pct >= 30 ? '#f97316' : '#ef4444';
        const scoreLabel = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 30 ? 'Basic' : 'Incomplete';
        const hasResume = !!(profile.professionalProfiles?.resumeUrl || resume);
        const hasLinkedIn = !!profile.professionalProfiles?.linkedInUrl;
        const hasPhoto = !!(profilePhotoPreview || profile.personalInfo?.profilePhoto);
        return (
          <div className="score-banner">
            <div className="score-ring-wrap">
              <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="55" cy="55" r={r} fill="none"
                  stroke={scoreColor} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                  transform="rotate(-90 55 55)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <div className="score-ring-label">
                <span className="score-pct" style={{ color: scoreColor }}>{pct}%</span>
                <span className="score-level" style={{ color: scoreColor }}>{scoreLabel}</span>
              </div>
            </div>
            <div className="score-details">
              <h2 className="score-title">Profile Completion Score</h2>
              <p className="score-subtitle">Complete your profile to get noticed by recruiters</p>
              <div className="score-checklist">
                <div className={`score-check ${profile.personalInfo?.firstName ? 'done' : ''}`}>
                  {profile.personalInfo?.firstName ? '✅' : '⬜'} Personal Info
                </div>
                <div className={`score-check ${profile.education?.highestQualification ? 'done' : ''}`}>
                  {profile.education?.highestQualification ? '✅' : '⬜'} Education Details
                </div>
                <div className={`score-check ${hasResume ? 'done' : ''}`}>
                  {hasResume ? '✅' : '⬜'} Resume Uploaded
                </div>
                <div className={`score-check ${hasLinkedIn ? 'done' : ''}`}>
                  {hasLinkedIn ? '✅' : '⬜'} LinkedIn Profile
                </div>
                <div className={`score-check ${profile.courseInterest?.interestedCourse ? 'done' : ''}`}>
                  {profile.courseInterest?.interestedCourse ? '✅' : '⬜'} Course Interest
                </div>
                <div className={`score-check ${hasPhoto ? 'done' : ''}`}>
                  {hasPhoto ? '✅' : '⬜'} Profile Photo
                </div>
              </div>
            </div>
            <div className="score-recruiter-status">
              <div className={`recruiter-badge ${pct >= 80 ? 'visible' : 'hidden'}`}>
                {pct >= 80 ? '🔍 Visible to Recruiters' : '🔒 Not yet visible to Recruiters'}
              </div>
              <p className="recruiter-hint">
                {pct >= 80
                  ? 'Your profile is complete and visible to admin/recruiters'
                  : `Complete ${80 - pct}% more to become visible to recruiters`}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Step Indicators */}
      <div className="step-indicators">
        {[
          { num: 1, label: 'Personal Info' },
          { num: 2, label: 'Professional' },
          { num: 3, label: 'Education' },
          { num: 4, label: 'Technical' },
          { num: 5, label: 'Course Interest' },
          { num: 6, label: 'Additional' },
        ].map(step => (
          <div 
            key={step.num}
            className={`step-indicator ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}`}
            onClick={() => {
              if (step.num <= currentStep) {
                setValidationErrors({});
                setError(null);
                setCurrentStep(step.num);
              }
            }}
            style={{ cursor: step.num <= currentStep ? 'pointer' : 'default', opacity: step.num > currentStep ? 0.6 : 1 }}
          >
            <div className="step-number">{currentStep > step.num ? '✓' : step.num}</div>
            <span className="step-label">{step.label}</span>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error">❌ {error}</div>}
      {success && <div className="alert alert-success">✅ {success}</div>}

      <div className="profile-form-container">
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="form-step">
            <h2>1️⃣ Personal Information</h2>
            <p className="step-description">Tell us about yourself - this information helps personalize your experience</p>

            {/* Photo Upload */}
            <div className="form-row">
              <div className="form-group photo-section">
                <label>Profile Photo</label>
                <div className="photo-upload-container">
                  <div className="photo-preview">
                    {profilePhotoPreview ? (
                      <img src={profilePhotoPreview} alt="Profile Preview" />
                    ) : (
                      <div className="photo-placeholder">
                        <span>👤</span>
                        <small>No Photo</small>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    id="profilePhoto"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="profilePhoto" className="file-upload-btn">
                    📷 {profilePhotoPreview ? 'Change Photo' : 'Upload Photo'}
                  </label>
                </div>
              </div>
            </div>

            {/* Row 1: First Name, Middle Name, Surname */}
            <div className="form-row three-columns">
              <div className={`form-group ${validationErrors['personalInfo.firstName'] ? 'has-error' : ''}`}>
                <label>First Name <span className="required">*</span></label>
                <input
                  type="text"
                  value={profile.personalInfo?.firstName || ''}
                  onChange={e => handleInputChange('personalInfo', 'firstName', e.target.value)}
                  placeholder="First Name"
                  required
                />
                {validationErrors['personalInfo.firstName'] && <small className="error-text">{validationErrors['personalInfo.firstName']}</small>}
              </div>

              <div className="form-group">
                <label>Middle Name</label>
                <input
                  type="text"
                  value={profile.personalInfo?.middleName || ''}
                  onChange={e => handleInputChange('personalInfo', 'middleName', e.target.value)}
                  placeholder="Middle Name (optional)"
                />
              </div>

              <div className={`form-group ${validationErrors['personalInfo.surname'] ? 'has-error' : ''}`}>
                <label>Surname <span className="required">*</span></label>
                <input
                  type="text"
                  value={profile.personalInfo?.surname || ''}
                  onChange={e => handleInputChange('personalInfo', 'surname', e.target.value)}
                  placeholder="Surname"
                  required
                />
                {validationErrors['personalInfo.surname'] && <small className="error-text">{validationErrors['personalInfo.surname']}</small>}
              </div>
            </div>

            {/* Row 2: Email Address (non-editable), Mobile Number */}
            <div className="form-row two-columns">
              <div className="form-group">
                <label>Email Address <span className="required">*</span></label>
                <input
                  type="email"
                  value={profile.personalInfo?.email || ''}
                  placeholder="yourname@example.com"
                  disabled
                  className="input-disabled"
                />
                <small className="field-hint">Email cannot be changed</small>
              </div>

              <div className={`form-group ${validationErrors['personalInfo.mobileNumber'] ? 'has-error' : ''}`}>
                <label>Mobile Number <span className="required">*</span></label>
                <input
                  type="tel"
                  value={profile.personalInfo?.mobileNumber || ''}
                  onChange={e => handleInputChange('personalInfo', 'mobileNumber', e.target.value)}
                  placeholder="+91 9876543210"
                  required
                />
                {validationErrors['personalInfo.mobileNumber'] && <small className="error-text">{validationErrors['personalInfo.mobileNumber']}</small>}
              </div>
            </div>

            {/* Row 3: Gender, Date of Birth */}
            <div className="form-row two-columns">
              <div className={`form-group ${validationErrors['personalInfo.gender'] ? 'has-error' : ''}`}>
                <label>Gender <span className="required">*</span></label>
                <select
                  value={profile.personalInfo?.gender || ''}
                  onChange={e => handleInputChange('personalInfo', 'gender', e.target.value)}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                {validationErrors['personalInfo.gender'] && <small className="error-text">{validationErrors['personalInfo.gender']}</small>}
              </div>

              <div className={`form-group ${validationErrors['personalInfo.dateOfBirth'] ? 'has-error' : ''}`}>
                <label>Date of Birth <span className="required">*</span></label>
                <input
                  type="date"
                  value={profile.personalInfo?.dateOfBirth?.toString().split('T')[0] || ''}
                  onChange={e => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
                  required
                />
                {validationErrors['personalInfo.dateOfBirth'] && <small className="error-text">{validationErrors['personalInfo.dateOfBirth']}</small>}
              </div>
            </div>

            {/* Row 4: Country, State, City */}
            <div className="form-row three-columns">
              <div className={`form-group ${validationErrors['personalInfo.country'] ? 'has-error' : ''}`}>
                <label>Country <span className="required">*</span></label>
                <select
                  value={profile.personalInfo?.country || 'India'}
                  onChange={e => {
                    handleInputChange('personalInfo', 'country', e.target.value);
                    handleInputChange('personalInfo', 'state', ''); // Reset state when country changes
                  }}
                  required
                >
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className={`form-group ${validationErrors['personalInfo.state'] ? 'has-error' : ''}`}>
                <label>State <span className="required">*</span></label>
                {STATES_BY_COUNTRY[profile.personalInfo?.country || 'India'] ? (
                  <select
                    value={profile.personalInfo?.state || ''}
                    onChange={e => handleInputChange('personalInfo', 'state', e.target.value)}
                    required
                  >
                    <option value="">Select State</option>
                    {(STATES_BY_COUNTRY[profile.personalInfo?.country || 'India'] || []).map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={profile.personalInfo?.state || ''}
                    onChange={e => handleInputChange('personalInfo', 'state', e.target.value)}
                    placeholder="Enter your state/province"
                    required
                  />
                )}
              </div>

              <div className={`form-group ${validationErrors['personalInfo.city'] ? 'has-error' : ''}`}>
                <label>City <span className="required">*</span></label>
                <input
                  type="text"
                  value={profile.personalInfo?.city || ''}
                  onChange={e => handleInputChange('personalInfo', 'city', e.target.value)}
                  placeholder="Enter your city"
                  required
                />
                {validationErrors['personalInfo.city'] && <small className="error-text">{validationErrors['personalInfo.city']}</small>}
              </div>
            </div>

            {/* Row 5: Address */}
            <div className="form-row">
              <div className="form-group full-width">
                <label>Address</label>
                <textarea
                  value={profile.personalInfo?.address || ''}
                  onChange={e => handleInputChange('personalInfo', 'address', e.target.value)}
                  placeholder="Enter your full address (House No, Street, Locality)"
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Professional Profiles */}
        {currentStep === 2 && (
          <div className="form-step">
            <h2>2️⃣ Professional Profiles</h2>
            <p className="step-description">Share your professional presence online - helps recruiters find you</p>

            <div className="form-grid">
              <div className="form-group full-width">
                <label>🔗 LinkedIn Profile URL</label>
                <div className="input-with-icon">
                  <input
                    type="url"
                    value={profile.professionalProfiles?.linkedInUrl || ''}
                    onChange={e => handleInputChange('professionalProfiles', 'linkedInUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <small className="field-hint">Your LinkedIn profile helps employers connect with you</small>
              </div>

              <div className="form-group full-width">
                <label>🐙 GitHub Profile URL</label>
                <div className="input-with-icon">
                  <input
                    type="url"
                    value={profile.professionalProfiles?.githubUrl || ''}
                    onChange={e => handleInputChange('professionalProfiles', 'githubUrl', e.target.value)}
                    placeholder="https://github.com/yourusername"
                  />
                </div>
                <small className="field-hint">Showcase your coding projects and contributions</small>
              </div>

              <div className="form-group full-width">
                <label>🌐 Portfolio Website URL</label>
                <div className="input-with-icon">
                  <input
                    type="url"
                    value={profile.professionalProfiles?.portfolioUrl || ''}
                    onChange={e => handleInputChange('professionalProfiles', 'portfolioUrl', e.target.value)}
                    placeholder="https://yourportfolio.com"
                  />
                </div>
                <small className="field-hint">Personal website or portfolio to showcase your work</small>
              </div>

              <div className="form-group full-width">
                <label>📄 Resume (PDF)</label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleResumeChange}
                    id="resume"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="resume" className="file-upload-btn large">
                    📤 {resume ? resume.name : (profile.professionalProfiles?.resumeUrl ? 'Resume Uploaded - Click to Replace' : 'Upload Resume (PDF only)')}
                  </label>
                  {profile.professionalProfiles?.resumeUrl && !resume && (
                    <a 
                      href={profile.professionalProfiles.resumeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="view-resume-link"
                    >
                      📥 View Current Resume
                    </a>
                  )}
                </div>
                <small className="field-hint">Upload your latest resume in PDF format (max 10MB)</small>
              </div>
            </div>

            {/* OAuth Connections Section */}
            <div className="oauth-section">
              <h3>Connect Your Accounts</h3>
              <p className="section-description">Link your GitHub and LinkedIn accounts to enable code sharing and professional updates</p>
              
              <div className="oauth-cards">
                {/* GitHub Connection */}
                <div className={`oauth-card ${oauthStatus.github.connected ? 'connected' : ''}`}>
                  <div className="oauth-icon github">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
                    </svg>
                  </div>
                  <div className="oauth-info">
                    <h4>GitHub</h4>
                    {oauthStatus.github.connected ? (
                      <>
                        <p className="connected-text">
                          Connected as <strong>{oauthStatus.github.username}</strong>
                        </p>
                        <a href={oauthStatus.github.profileUrl} target="_blank" rel="noopener noreferrer" className="profile-link">
                          View Profile →
                        </a>
                      </>
                    ) : (
                      <p className="not-connected-text">Connect to push code to repositories</p>
                    )}
                  </div>
                  <button 
                    className={`oauth-btn ${oauthStatus.github.connected ? 'disconnect' : 'connect'}`}
                    onClick={() => oauthStatus.github.connected ? handleOAuthDisconnect('github') : handleOAuthConnect('github')}
                    disabled={connectingOAuth === 'github'}
                  >
                    {connectingOAuth === 'github' 
                      ? 'Connecting...' 
                      : oauthStatus.github.connected 
                        ? 'Disconnect' 
                        : 'Connect'}
                  </button>
                </div>

                {/* LinkedIn Connection */}
                <div className={`oauth-card ${oauthStatus.linkedin.connected ? 'connected' : ''}`}>
                  <div className="oauth-icon linkedin">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <div className="oauth-info">
                    <h4>LinkedIn</h4>
                    {oauthStatus.linkedin.connected ? (
                      <>
                        <p className="connected-text">Account Connected</p>
                        <a href={oauthStatus.linkedin.profileUrl} target="_blank" rel="noopener noreferrer" className="profile-link">
                          View Profile →
                        </a>
                      </>
                    ) : (
                      <p className="not-connected-text">Connect to share updates on LinkedIn</p>
                    )}
                  </div>
                  <button 
                    className={`oauth-btn ${oauthStatus.linkedin.connected ? 'disconnect' : 'connect'}`}
                    onClick={() => oauthStatus.linkedin.connected ? handleOAuthDisconnect('linkedin') : handleOAuthConnect('linkedin')}
                    disabled={connectingOAuth === 'linkedin'}
                  >
                    {connectingOAuth === 'linkedin' 
                      ? 'Connecting...' 
                      : oauthStatus.linkedin.connected 
                        ? 'Disconnect' 
                        : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Education Details */}
        {currentStep === 3 && (
          <div className="form-step">
            <h2>3️⃣ Education Details</h2>
            <p className="step-description">Help us understand your academic background</p>

            {/* Current Status */}
            <div className={`form-section ${validationErrors['education.currentStatus'] ? 'has-error' : ''}`}>
              <label>Current Status <span className="required">*</span></label>
              <div className="status-cards small">
                {[
                  { value: 'Student', label: 'Student' },
                  { value: 'Graduate', label: 'Graduate' },
                  { value: 'Working Professional', label: 'Working Professional' },
                ].map(status => (
                  <div 
                    key={status.value}
                    className={`status-card ${profile.education?.currentStatus === status.value ? 'selected' : ''}`}
                    onClick={() => handleInputChange('education', 'currentStatus', status.value)}
                  >
                    {status.label}
                  </div>
                ))}
              </div>
              {validationErrors['education.currentStatus'] && <small className="error-text">{validationErrors['education.currentStatus']}</small>}
            </div>

            {/* Highest Qualification & Degree Details */}
            <div className="form-section education-section">
              <h3>Education Details</h3>
              <div className="form-grid">
                <div className={`form-group ${validationErrors['education.highestQualification'] ? 'has-error' : ''}`}>
                  <label>Highest Qualification <span className="required">*</span></label>
                  <select
                    value={profile.education?.highestQualification || ''}
                    onChange={e => handleInputChange('education', 'highestQualification', e.target.value)}
                    required
                  >
                    <option value="">Select Qualification</option>
                    {QUALIFICATIONS.map(q => (
                      <option key={q.value} value={q.value}>{q.label}</option>
                    ))}
                  </select>
                </div>

                {showDegreeDetails() && getBranchOptions().length > 0 && (
                  <div className="form-group">
                    <label>Branch / Specialization</label>
                    <select
                      value={profile.education?.degree?.branch || ''}
                      onChange={e => handleEducationNestedChange('degree', 'branch', e.target.value)}
                    >
                      <option value="">Select Branch</option>
                      {getBranchOptions().map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>
                )}

                {showDegreeDetails() && (
                  <>
                    <div className="form-group">
                      <label>College Name</label>
                      <input
                        type="text"
                        value={profile.education?.degree?.college || ''}
                        onChange={e => handleEducationNestedChange('degree', 'college', e.target.value)}
                        placeholder="e.g., JNTU, IIT Delhi"
                      />
                    </div>

                    <div className="form-group">
                      <label>University Name</label>
                      <input
                        type="text"
                        value={profile.education?.degree?.university || ''}
                        onChange={e => handleEducationNestedChange('degree', 'university', e.target.value)}
                        placeholder="e.g., JNTU Hyderabad"
                      />
                    </div>

                    <div className="form-group">
                      <label>Percentage / CGPA</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={profile.education?.degree?.percentage || ''}
                        onChange={e => handleEducationNestedChange('degree', 'percentage', parseFloat(e.target.value) || undefined)}
                        placeholder="e.g., 75.5"
                      />
                    </div>

                    <div className="form-group">
                      <label>Year of Graduation</label>
                      <select
                        value={profile.education?.degree?.graduationYear || ''}
                        onChange={e => handleEducationNestedChange('degree', 'graduationYear', parseInt(e.target.value) || undefined)}
                      >
                        <option value="">Select Year</option>
                        {getYearOptions().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Intermediate (12th) Details */}
            {showIntermediateDetails() && (
              <div className="form-section education-section">
                <h3>Intermediate / 12th Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>College / School Name</label>
                    <input
                      type="text"
                      value={profile.education?.intermediate?.college || ''}
                      onChange={e => handleEducationNestedChange('intermediate', 'college', e.target.value)}
                      placeholder="e.g., Sri Chaitanya Junior College"
                    />
                  </div>

                  <div className="form-group">
                    <label>Group / Stream</label>
                    <select
                      value={profile.education?.intermediate?.group || ''}
                      onChange={e => handleEducationNestedChange('intermediate', 'group', e.target.value)}
                    >
                      <option value="">Select Group</option>
                      {INTERMEDIATE_GROUPS.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Percentage</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={profile.education?.intermediate?.percentage || ''}
                      onChange={e => handleEducationNestedChange('intermediate', 'percentage', parseFloat(e.target.value) || undefined)}
                      placeholder="e.g., 85.5"
                    />
                  </div>

                  <div className="form-group">
                    <label>Year of Passing</label>
                    <select
                      value={profile.education?.intermediate?.yearOfPassing || ''}
                      onChange={e => handleEducationNestedChange('intermediate', 'yearOfPassing', parseInt(e.target.value) || undefined)}
                    >
                      <option value="">Select Year</option>
                      {getYearOptions().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 10th Class Details - Always shown */}
            <div className="form-section education-section">
              <h3>10th Class (SSC) Details</h3>
              <div className="form-grid">
                <div className={`form-group ${validationErrors['education.tenthClass.schoolName'] ? 'has-error' : ''}`}>
                  <label>School Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={profile.education?.tenthClass?.schoolName || ''}
                    onChange={e => handleEducationNestedChange('tenthClass', 'schoolName', e.target.value)}
                    placeholder="e.g., Kendriya Vidyalaya"
                    required
                  />
                  {validationErrors['education.tenthClass.schoolName'] && <small className="error-text">{validationErrors['education.tenthClass.schoolName']}</small>}
                </div>

                <div className="form-group">
                  <label>Percentage</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={profile.education?.tenthClass?.percentage || ''}
                    onChange={e => handleEducationNestedChange('tenthClass', 'percentage', parseFloat(e.target.value) || undefined)}
                    placeholder="e.g., 90.5"
                  />
                </div>

                <div className="form-group">
                  <label>Year of Passing</label>
                  <select
                    value={profile.education?.tenthClass?.yearOfPassing || ''}
                    onChange={e => handleEducationNestedChange('tenthClass', 'yearOfPassing', parseInt(e.target.value) || undefined)}
                  >
                    <option value="">Select Year</option>
                    {getYearOptions().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Technical Background */}
        {currentStep === 4 && (
          <div className="form-step">
            <h2>4️⃣ Technical Background</h2>
            <p className="step-description">Help us understand your technical skills - we'll recommend the right course track</p>

            <div className="form-section">
              <h3>💻 Programming Languages Known</h3>
              <p className="section-hint">Select all languages you're familiar with</p>
              <div className="checkbox-grid">
                {PROGRAMMING_LANGUAGES.map(lang => (
                  <label key={lang} className={`checkbox-item ${profile.technicalBackground?.programmingLanguages?.includes(lang) ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={profile.technicalBackground?.programmingLanguages?.includes(lang) || false}
                      onChange={e => handleArrayChange('technicalBackground', 'programmingLanguages', lang, e.target.checked)}
                    />
                    <span>{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-section">
              <h3>🛠️ Technologies & Frameworks Known</h3>
              <p className="section-hint">Select all technologies you've worked with</p>
              <div className="checkbox-grid">
                {TECHNOLOGIES.map(tech => (
                  <label key={tech} className={`checkbox-item ${profile.technicalBackground?.technologies?.includes(tech) ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={profile.technicalBackground?.technologies?.includes(tech) || false}
                      onChange={e => handleArrayChange('technicalBackground', 'technologies', tech, e.target.checked)}
                    />
                    <span>{tech}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-grid">
              <div className={`form-group full-width ${validationErrors['technicalBackground.experienceLevel'] ? 'has-error' : ''}`}>
                <label>Experience Level <span className="required">*</span></label>
                <div className="experience-cards small">
                  {[
                    { value: 'Beginner', label: 'Beginner' },
                    { value: 'Intermediate', label: 'Intermediate' },
                    { value: 'Advanced', label: 'Advanced' },
                  ].map(level => (
                    <div 
                      key={level.value}
                      className={`experience-card ${profile.technicalBackground?.experienceLevel === level.value ? 'selected' : ''}`}
                      onClick={() => handleInputChange('technicalBackground', 'experienceLevel', level.value)}
                    >
                      {level.label}
                    </div>
                  ))}
                </div>
                {validationErrors['technicalBackground.experienceLevel'] && <small className="error-text">{validationErrors['technicalBackground.experienceLevel']}</small>}
              </div>

              <div className="form-group full-width">
                <label>Previous Courses Taken</label>
                <input
                  type="text"
                  value={profile.technicalBackground?.previousCourses?.join(', ') || ''}
                  onChange={e => handleInputChange('technicalBackground', 'previousCourses', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="e.g., Java Basics, Web Dev Bootcamp, React Course (comma separated)"
                />
                <small className="field-hint">List any courses or certifications you've completed</small>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Course Interest */}
        {currentStep === 5 && (
          <div className="form-step">
            <h2>5️⃣ Course Interest</h2>
            <p className="step-description">What would you like to learn at CodeBegun?</p>

            <div className="form-grid">
              <div className={`form-group full-width ${validationErrors['courseInterest.interestedCourse'] ? 'has-error' : ''}`}>
                <label>Interested Course <span className="required">*</span></label>
                <div className="course-cards">
                  {INTERESTED_COURSES.map(course => (
                    <div 
                      key={course.value}
                      className={`course-card ${profile.courseInterest?.interestedCourse === course.value ? 'selected' : ''}`}
                      onClick={() => handleInputChange('courseInterest', 'interestedCourse', course.value)}
                    >
                      <span className="course-name">{course.label}</span>
                    </div>
                  ))}
                </div>
                {validationErrors['courseInterest.interestedCourse'] && <small className="error-text">{validationErrors['courseInterest.interestedCourse']}</small>}
              </div>

              <div className={`form-group full-width ${validationErrors['courseInterest.preferredLearningMode'] ? 'has-error' : ''}`}>
                <label>Preferred Learning Mode <span className="required">*</span></label>
                <div className="mode-cards small">
                  {[
                    { value: 'Online', label: 'Online' },
                    { value: 'Offline', label: 'Offline' },
                    { value: 'Hybrid', label: 'Hybrid' },
                  ].map(mode => (
                    <div 
                      key={mode.value}
                      className={`mode-card ${profile.courseInterest?.preferredLearningMode === mode.value ? 'selected' : ''}`}
                      onClick={() => handleInputChange('courseInterest', 'preferredLearningMode', mode.value)}
                    >
                      {mode.label}
                    </div>
                  ))}
                </div>
                {validationErrors['courseInterest.preferredLearningMode'] && <small className="error-text">{validationErrors['courseInterest.preferredLearningMode']}</small>}
              </div>

              <div className={`form-group full-width ${validationErrors['courseInterest.preferredBatchTime'] ? 'has-error' : ''}`}>
                <label>Preferred Batch Time <span className="required">*</span></label>
                <div className="time-cards small">
                  {[
                    { value: 'Morning', label: 'Morning (6AM-12PM)' },
                    { value: 'Afternoon', label: 'Afternoon (12PM-5PM)' },
                    { value: 'Evening', label: 'Evening (5PM-10PM)' },
                    { value: 'Weekend', label: 'Weekend' },
                  ].map(time => (
                    <div 
                      key={time.value}
                      className={`time-card ${profile.courseInterest?.preferredBatchTime === time.value ? 'selected' : ''}`}
                      onClick={() => handleInputChange('courseInterest', 'preferredBatchTime', time.value)}
                    >
                      {time.label}
                    </div>
                  ))}
                </div>
                {validationErrors['courseInterest.preferredBatchTime'] && <small className="error-text">{validationErrors['courseInterest.preferredBatchTime']}</small>}
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Additional Information */}
        {currentStep === 6 && (
          <div className="form-step">
            <h2>6️⃣ Additional Information</h2>
            <p className="step-description">A few more details to help us serve you better</p>

            <div className="form-grid">
              <div className="form-group">
                <label>How did you hear about CodeBegun?</label>
                <select
                  value={profile.additionalInfo?.howDidYouHear || ''}
                  onChange={e => handleInputChange('additionalInfo', 'howDidYouHear', e.target.value)}
                >
                  <option value="">Select Option</option>
                  {HOW_DID_YOU_HEAR.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {profile.additionalInfo?.howDidYouHear === 'Other' && (
                <div className="form-group">
                  <label>Please Specify</label>
                  <input
                    type="text"
                    value={profile.additionalInfo?.howDidYouHearOther || ''}
                    onChange={e => handleInputChange('additionalInfo', 'howDidYouHearOther', e.target.value)}
                    placeholder="How did you hear about us?"
                  />
                </div>
              )}

              <div className="form-group full-width">
                <label>🎯 Career Goal</label>
                <textarea
                  value={profile.additionalInfo?.careerGoal || ''}
                  onChange={e => handleInputChange('additionalInfo', 'careerGoal', e.target.value)}
                  placeholder="Tell us about your career aspirations...&#10;&#10;Examples:&#10;• Become a Full Stack Developer&#10;• Switch to IT from non-tech background&#10;• Get placed in a top MNC&#10;• Start my own tech startup"
                  rows={5}
                  maxLength={500}
                />
                <small className="char-count">
                  {profile.additionalInfo?.careerGoal?.length || 0}/500 characters
                </small>
              </div>
            </div>

            {/* Profile Summary */}
            <div className="profile-summary">
              <h3>📋 Profile Summary</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Name</span>
                  <span className="summary-value">{profile.personalInfo?.firstName} {profile.personalInfo?.middleName} {profile.personalInfo?.surname}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Qualification</span>
                  <span className="summary-value">{profile.education?.highestQualification || 'Not specified'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Experience</span>
                  <span className="summary-value">{profile.technicalBackground?.experienceLevel || 'Not specified'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Interested In</span>
                  <span className="summary-value">{profile.courseInterest?.interestedCourse || 'Not specified'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="form-navigation">
          <div className="nav-left">
            {currentStep > 1 && (
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handlePrevious}
              >
                ← Previous
              </button>
            )}
          </div>
          
          <div className="nav-center">
            <button 
              type="button" 
              className="btn btn-outline save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '⏳ Saving...' : '💾 Save Progress'}
            </button>
          </div>

          <div className="nav-right">
            {currentStep < totalSteps ? (
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleNext}
              >
                Next →
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn-success"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '⏳ Submitting...' : '✅ Complete Profile'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;
