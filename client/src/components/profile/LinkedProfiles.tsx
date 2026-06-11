import React from 'react';
import './LinkedProfiles.css';

interface LinkedProfilesProps {
  data: {
    linkedin: string;
    github: string;
  };
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
}

// Prepend https:// when a user saved a URL without a protocol, so the link
// doesn't resolve as a relative path off the current page.
const extUrl = (u?: string) => !u ? '#' : (/^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, '')}`);

export const LinkedProfiles: React.FC<LinkedProfilesProps> = ({
  data,
  isEditing,
  onChange,
}) => {
  const isValidURL = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="linked-profiles">
      <div className="section-header">
        <h3>Professional Links</h3>
        <span className="section-icon">🔗</span>
      </div>

      <div className="profiles-grid">
        <div className="profile-card linkedin">
          <div className="profile-info">
            <h4>LinkedIn</h4>
            <p className="profile-description">
              Connect with professionals worldwide
            </p>
          </div>

          <div className="profile-content">
            {isEditing ? (
              <input
                type="url"
                value={data.linkedin}
                onChange={(e) => onChange('linkedin', e.target.value)}
                placeholder="https://www.linkedin.com/in/your-profile"
              />
            ) : (
              <div className="profile-display">
                {data.linkedin ? (
                  <>
                    <a
                      href={extUrl(data.linkedin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-link"
                    >
                      View Profile →
                    </a>
                    <p className="profile-url">{data.linkedin}</p>
                  </>
                ) : (
                  <p className="no-data">No LinkedIn profile added</p>
                )}
              </div>
            )}
          </div>

          {data.linkedin && isValidURL(data.linkedin) && !isEditing && (
            <div className="profile-badge">✓ Connected</div>
          )}
        </div>

        <div className="profile-card github">
          <div className="profile-info">
            <h4>GitHub</h4>
            <p className="profile-description">
              Showcase your code projects
            </p>
          </div>

          <div className="profile-content">
            {isEditing ? (
              <input
                type="url"
                value={data.github}
                onChange={(e) => onChange('github', e.target.value)}
                placeholder="https://github.com/your-username"
              />
            ) : (
              <div className="profile-display">
                {data.github ? (
                  <>
                    <a
                      href={extUrl(data.github)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-link"
                    >
                      View Profile →
                    </a>
                    <p className="profile-url">{data.github}</p>
                  </>
                ) : (
                  <p className="no-data">No GitHub profile added</p>
                )}
              </div>
            )}
          </div>

          {data.github && isValidURL(data.github) && !isEditing && (
            <div className="profile-badge">✓ Connected</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkedProfiles;
