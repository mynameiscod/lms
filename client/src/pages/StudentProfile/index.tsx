import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../../components/common';
import ProfileHeader from '../../components/profile/ProfileHeader';
import PersonalDetails from '../../components/profile/PersonalDetails';
import EducationDetails from '../../components/profile/EducationDetails';
import ProjectsSection from '../../components/profile/ProjectsSection';
import LinkedProfiles from '../../components/profile/LinkedProfiles';
import CourseDetails from '../../components/profile/CourseDetails';
import FeeDetails from '../../components/profile/FeeDetails';
import ResumeUpload from '../../components/profile/ResumeUpload';
import ContactAddress from '../../components/profile/ContactAddress';
import TimeSpentCard from '../../components/profile/TimeSpentCard';
import './StudentProfile.css';

interface StudentProfileData {
  _id: string;
  userId: string;
  profilePicture?: string;
  personal: {
    firstName: string;
    lastName: string;
    surname: string;
    mobileNumber: string;
    email: string;
  };
  education: {
    tenthClass: {
      schoolName: string;
      marks: number;
      percentage: number;
    };
    intermediate: {
      schoolName: string;
      marks: number;
      percentage: number;
    };
    degree: {
      collegeName: string;
      universityName: string;
      branch: string;
      marks: number;
      percentage: number;
      backlogs: boolean;
    };
  };
  projects: Array<{
    _id: string;
    name: string;
    description: string;
    roles: string;
    techStack: string[];
  }>;
  linkedProfiles: {
    linkedin: string;
    github: string;
  };
  resumeUrl?: string;
  emergencyContact: {
    name: string;
    relationship: string;
    mobileNumber: string;
  };
  address: {
    presentAddress: string;
    permanentAddress: string;
  };
  courseDetails: {
    courseName: string;
    joinedDate: string;
  };
  feeDetails: {
    totalFee: number;
    paidAmount: number;
    pendingAmount: number;
  };
}

const StudentProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<StudentProfileData | null>(null);

  useEffect(() => {
    // Load profile data from localStorage or create default
    const loadProfileData = async () => {
      try {
        // Check localStorage first for saved profile data
        const profileKey = `profile_${user?._id}`;
        const savedProfile = localStorage.getItem(profileKey);
        
        if (savedProfile) {
          try {
            const parsedProfile = JSON.parse(savedProfile);
            setProfileData(parsedProfile);
            setLoading(false);
            return;
          } catch (e) {
            console.warn('Failed to parse saved profile:', e);
          }
        }

        // If no saved profile, create default mock data
        const mockData: StudentProfileData = {
          _id: '1',
          userId: user?._id || '',
          profilePicture: user?.profilePicture || '/assets/default-avatar.png',
          personal: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            surname: '',
            mobileNumber: '',
            email: user?.email || '',
          },
          education: {
            tenthClass: {
              schoolName: '',
              marks: 0,
              percentage: 0,
            },
            intermediate: {
              schoolName: '',
              marks: 0,
              percentage: 0,
            },
            degree: {
              collegeName: '',
              universityName: '',
              branch: '',
              marks: 0,
              percentage: 0,
              backlogs: false,
            },
          },
          projects: [],
          linkedProfiles: {
            linkedin: '',
            github: '',
          },
          emergencyContact: {
            name: '',
            relationship: '',
            mobileNumber: '',
          },
          address: {
            presentAddress: '',
            permanentAddress: '',
          },
          courseDetails: {
            courseName: 'Web Development',
            joinedDate: new Date().toISOString().split('T')[0],
          },
          feeDetails: {
            totalFee: 50000,
            paidAmount: 35000,
            pendingAmount: 15000,
          },
        };
        setProfileData(mockData);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      loadProfileData();
    }
    // Only depend on user ID, not all user properties
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const handleSaveProfile = (data: StudentProfileData) => {
    setProfileData(data);
    setIsEditing(false);
    
    // Save profile data to localStorage
    const profileKey = `profile_${user?._id}`;
    try {
      localStorage.setItem(profileKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save profile to localStorage:', error);
    }
    
    // Update AuthContext with profile picture and name changes
    updateProfile({
      firstName: data.personal.firstName,
      lastName: data.personal.lastName,
      profilePicture: data.profilePicture,
    });
    
    // TODO: Call API to save profile to backend
  };

  if (loading) return <Spinner fullScreen />;
  if (!profileData) return <div className="profile-error">Failed to load profile</div>;

  return (
    <div className="student-profile-page">
      <div className="profile-container">
        {/* Profile Header */}
        <ProfileHeader
          profileData={profileData}
          isEditing={isEditing}
          onEditToggle={() => setIsEditing(!isEditing)}
          onSave={handleSaveProfile}
        />

        {/* Main Content */}
        <div className="profile-content">
          {/* Left Column */}
          <div className="profile-main">
            {/* Time Spent Card */}
            <TimeSpentCard />

            {/* Personal Details */}
            <PersonalDetails
              data={profileData.personal}
              isEditing={isEditing}
              onChange={(field, value) =>
                setProfileData({
                  ...profileData,
                  personal: { ...profileData.personal, [field]: value },
                })
              }
            />

            {/* Education Details */}
            <EducationDetails
              data={profileData.education}
              isEditing={isEditing}
              onChange={(level, field, value) =>
                setProfileData({
                  ...profileData,
                  education: {
                    ...profileData.education,
                    [level]: {
                      ...profileData.education[
                        level as keyof typeof profileData.education
                      ],
                      [field]: value,
                    },
                  },
                })
              }
            />

            {/* Projects Section */}
            <ProjectsSection
              data={profileData.projects}
              isEditing={isEditing}
              onAdd={() => {
                const newProject = {
                  _id: Date.now().toString(),
                  name: '',
                  description: '',
                  roles: '',
                  techStack: [],
                };
                setProfileData({
                  ...profileData,
                  projects: [...profileData.projects, newProject],
                });
              }}
              onChange={(index, field, value) =>
                setProfileData({
                  ...profileData,
                  projects: profileData.projects.map((p, i) =>
                    i === index ? { ...p, [field]: value } : p
                  ),
                })
              }
              onRemove={(index) =>
                setProfileData({
                  ...profileData,
                  projects: profileData.projects.filter((_, i) => i !== index),
                })
              }
            />

            {/* Linked Profiles */}
            <LinkedProfiles
              data={profileData.linkedProfiles}
              isEditing={isEditing}
              onChange={(field, value) =>
                setProfileData({
                  ...profileData,
                  linkedProfiles: {
                    ...profileData.linkedProfiles,
                    [field]: value,
                  },
                })
              }
            />

            {/* Resume Upload */}
            <ResumeUpload
              data={{
                resumeUrl: profileData.resumeUrl,
              }}
              isEditing={isEditing}
              onChange={(file) => {
                // In a real app, you'd upload the file here
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    setProfileData({
                      ...profileData,
                      resumeUrl: e.target?.result as string,
                    });
                  };
                  reader.readAsDataURL(file);
                } else {
                  setProfileData({
                    ...profileData,
                    resumeUrl: undefined,
                  });
                }
              }}
            />

            {/* Contact & Address */}
            <ContactAddress
              data={{
                emergencyContact: profileData.emergencyContact,
                address: profileData.address,
              }}
              isEditing={isEditing}
              onChange={(section, field, value) => {
                if (section === 'emergencyContact') {
                  setProfileData({
                    ...profileData,
                    emergencyContact: {
                      ...profileData.emergencyContact,
                      [field]: value,
                    },
                  });
                } else if (section === 'address') {
                  setProfileData({
                    ...profileData,
                    address: {
                      ...profileData.address,
                      [field]: value,
                    },
                  });
                }
              }}
            />
          </div>

          {/* Right Column - Read Only */}
          <div className="profile-sidebar">
            {/* Course Details */}
            <CourseDetails data={profileData.courseDetails} />

            {/* Fee Details */}
            <FeeDetails data={profileData.feeDetails} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;
