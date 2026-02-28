import React, { useState } from 'react';
import './EducationDetails.css';

interface EducationLevel {
  schoolName?: string;
  university?: string;
  branch?: string;
  marks?: string | number;
  percentage?: string | number;
  backlogs?: string | boolean;
  collegeName?: string;
  universityName?: string;
}

interface EducationDetailsProps {
  data: {
    tenthClass: EducationLevel;
    intermediate: EducationLevel;
    degree: EducationLevel & { backlogs?: string | boolean };
  };
  isEditing: boolean;
  onChange: (level: string, field: string, value: string | number | boolean) => void;
}

export const EducationDetails: React.FC<EducationDetailsProps> = ({
  data,
  isEditing,
  onChange,
}) => {
  const [expandedLevel, setExpandedLevel] = useState<string>('tenthClass');

  const renderEducationLevel = (
    level: string,
    title: string,
    fields: string[],
    levelData: EducationLevel
  ) => {
    return (
      <div className="education-card">
        <div
          className="education-header"
          onClick={() =>
            setExpandedLevel(expandedLevel === level ? '' : level)
          }
        >
          <h4>{title}</h4>
          <span className={`toggle-icon ${expandedLevel === level ? 'open' : ''}`}>
            ▼
          </span>
        </div>

        {expandedLevel === level && (
          <div className="education-content">
            <div className="education-grid">
              {fields.map((field) => (
                <div key={field} className="form-group">
                  <label>{field.replace(/([A-Z])/g, ' $1').trim()}</label>
                  {field === 'backlogs' ? (
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        checked={Boolean(levelData[field as keyof EducationLevel])}
                        onChange={(e) =>
                          onChange(level, field, e.target.checked)
                        }
                      />
                      <span>{levelData[field as keyof EducationLevel] ? 'Yes' : 'No'}</span>
                    </div>
                  ) : isEditing ? (
                    <input
                      type={
                        field === 'marks' || field === 'percentage'
                          ? 'number'
                          : 'text'
                      }
                      value={String(levelData[field as keyof EducationLevel] || '')}
                      onChange={(e) =>
                        onChange(level, field, e.target.value)
                      }
                      placeholder={`Enter ${field}`}
                    />
                  ) : (
                    <p className="view-text">
                      {String(levelData[field as keyof EducationLevel] || '—')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="education-details">
      <div className="section-header">
        <h3>Education Qualification</h3>
        <span className="section-icon">🎓</span>
      </div>

      <div className="education-levels">
        {renderEducationLevel(
          'tenthClass',
          '10th Class',
          ['schoolName', 'marks', 'percentage'],
          data.tenthClass
        )}

        {renderEducationLevel(
          'intermediate',
          'Intermediate (12th)',
          ['schoolName', 'marks', 'percentage'],
          data.intermediate
        )}

        {renderEducationLevel(
          'degree',
          'Degree',
          ['university', 'branch', 'marks', 'percentage', 'backlogs'],
          data.degree
        )}
      </div>
    </div>
  );
};

export default EducationDetails;
