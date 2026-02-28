import React from 'react';
import './CourseDetails.css';

interface CourseDetailsProps {
  data: {
    courseName: string;
    joinedDate: string;
  };
}

export const CourseDetails: React.FC<CourseDetailsProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="course-details">
      <div className="section-header">
        <div>
          <h3>Enrollment Details</h3>
          <p className="section-subtitle">Read-only information</p>
        </div>
        <span className="section-icon">📚</span>
      </div>

      <div className="course-grid">
        <div className="course-card">
          <div className="course-info">
            <label>Course Name</label>
            <p className="course-value">{data.courseName || '—'}</p>
            <span className="info-icon">🏫</span>
          </div>
        </div>

        <div className="course-card">
          <div className="course-info">
            <label>Enrollment Date</label>
            <p className="course-value">{formatDate(data.joinedDate)}</p>
            <span className="info-icon">📅</span>
          </div>
        </div>
      </div>

      <div className="read-only-badge">
        🔒 This information is managed by administrators and cannot be edited
      </div>
    </div>
  );
};

export default CourseDetails;
