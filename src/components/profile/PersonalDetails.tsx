import React from 'react';
import './PersonalDetails.css';

interface PersonalDetailsProps {
  data: {
    firstName: string;
    lastName: string;
    surname: string;
    mobileNumber: string;
    email: string;
  };
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
}

export const PersonalDetails: React.FC<PersonalDetailsProps> = ({
  data,
  isEditing,
  onChange,
}) => {
  return (
    <div className="personal-details">
      <div className="section-header">
        <h3>Personal Information</h3>
        <span className="section-icon">👤</span>
      </div>

      <div className="details-grid">
        <div className="form-group">
          <label>First Name</label>
          {isEditing ? (
            <input
              type="text"
              value={data.firstName}
              onChange={(e) => onChange('firstName', e.target.value)}
              placeholder="Enter first name"
            />
          ) : (
            <p className="view-text">{data.firstName || '—'}</p>
          )}
        </div>

        <div className="form-group">
          <label>Last Name</label>
          {isEditing ? (
            <input
              type="text"
              value={data.lastName}
              onChange={(e) => onChange('lastName', e.target.value)}
              placeholder="Enter last name"
            />
          ) : (
            <p className="view-text">{data.lastName || '—'}</p>
          )}
        </div>

        <div className="form-group">
          <label>Surname</label>
          {isEditing ? (
            <input
              type="text"
              value={data.surname}
              onChange={(e) => onChange('surname', e.target.value)}
              placeholder="Enter surname"
            />
          ) : (
            <p className="view-text">{data.surname || '—'}</p>
          )}
        </div>

        <div className="form-group">
          <label>Mobile Number</label>
          {isEditing ? (
            <input
              type="tel"
              value={data.mobileNumber}
              onChange={(e) => onChange('mobileNumber', e.target.value)}
              placeholder="Enter mobile number"
              pattern="[0-9-+()]+"
            />
          ) : (
            <p className="view-text">{data.mobileNumber || '—'}</p>
          )}
        </div>

        <div className="form-group">
          <label>Email Address</label>
          {isEditing ? (
            <input
              type="email"
              value={data.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="Enter email address"
            />
          ) : (
            <p className="view-text">{data.email || '—'}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalDetails;
