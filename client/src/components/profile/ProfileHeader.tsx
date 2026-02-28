import React, { useRef, useState } from 'react';
import './ProfileHeader.css';

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
  [key: string]: any;
}

interface ProfileHeaderProps {
  profileData: StudentProfileData;
  isEditing: boolean;
  onEditToggle: () => void;
  onSave: (data: StudentProfileData) => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profileData,
  isEditing,
  onEditToggle,
  onSave,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profilePicture, setProfilePicture] = useState(profileData.profilePicture);

  const handlePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfilePicture(base64String);
        // Update profile data
        onSave({ ...profileData, profilePicture: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="profile-header">
      <div className="header-background"></div>
      
      <div className="header-content">
        <div className="profile-picture-container">
          <img
            src={profilePicture || '/assets/default-avatar.png'}
            alt="Profile"
            className="profile-picture"
          />
          {isEditing && (
            <button
              className="picture-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Change profile picture"
            >
              📷
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePictureUpload}
            style={{ display: 'none' }}
          />
        </div>

        <div className="profile-info">
          <h1 className="profile-name">
            {profileData.personal.firstName} {profileData.personal.lastName}
          </h1>
          <p className="profile-email">{profileData.personal.email}</p>
          <p className="profile-status">Student</p>
        </div>

        <div className="header-actions">
          <button
            className={`edit-btn ${isEditing ? 'editing' : ''}`}
            onClick={onEditToggle}
          >
            {isEditing ? '✓ Done' : '✎ Edit Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
