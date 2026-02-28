import React, { useRef } from 'react';
import './ResumeUpload.css';

interface ResumeUploadProps {
  data: {
    resumeUrl?: string;
    resumeName?: string;
  };
  isEditing: boolean;
  onChange: (file: File | null) => void;
}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({
  data,
  isEditing,
  onChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (!validTypes.includes(file.type)) {
        alert('Please upload PDF or Word document');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }

      onChange(file);
    }
  };

  const handleDownload = () => {
    if (data.resumeUrl) {
      window.open(data.resumeUrl, '_blank');
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className="resume-upload">
      <div className="section-header">
        <h3>Resume/CV</h3>
        <span className="section-icon">📄</span>
      </div>

      <div className="upload-container">
        {data.resumeUrl ? (
          <div className="resume-preview">
            <div className="file-icon">📄</div>
            <div className="file-info">
              <h4>{data.resumeName || 'Resume Document'}</h4>
              <p>PDF or Word document uploaded successfully</p>
            </div>
            <div className="file-actions">
              <button
                className="action-btn download"
                onClick={handleDownload}
                title="Download resume"
              >
                ⬇ Download
              </button>
              {isEditing && (
                <button
                  className="action-btn remove"
                  onClick={handleRemove}
                  title="Remove resume"
                >
                  ✕ Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="upload-zone">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
            />

            {isEditing ? (
              <div
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-icon">📤</div>
                <h4>Upload Your Resume</h4>
                <p>Drag and drop or click to select</p>
                <span className="file-types">PDF or Word (.pdf, .doc, .docx)</span>
                <span className="file-size">Max 5MB</span>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <p>No resume uploaded yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="resume-tips">
        <h4>Tips for your resume:</h4>
        <ul>
          <li>Keep it concise and focused (1-2 pages)</li>
          <li>Highlight relevant skills and experience</li>
          <li>Use clear formatting and professional fonts</li>
          <li>Include your contact information</li>
        </ul>
      </div>
    </div>
  );
};

export default ResumeUpload;
