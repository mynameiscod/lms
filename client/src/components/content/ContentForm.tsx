import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { type AlertType } from '../common';
import contentAPI, { ContentData } from '../../api/contentAPI';
import { courseApi, subjectApi, chapterApi, topicApi } from '../../api';
import { ContentType } from './ContentManagementLayout';
import './ContentForm.css';

interface Course {
  _id: string;
  title: string;
  code: string;
}

interface Subject {
  _id: string;
  name: string;
  code: string;
}

interface Chapter {
  _id: string;
  title: string;
}

interface Topic {
  _id: string;
  title: string;
}

export interface ContentFormProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onShowAlert?: (message: string, type: AlertType) => void;
  editingContent?: any;
  onCancel?: () => void;
  defaultType?: ContentType;
}

// Content type configurations with better UX
const CONTENT_TYPES = [
  {
    key: 'announcement',
    title: '📢 Announcement',
    description: 'Share important updates and news',
    icon: '📢',
    requiresOrganization: false,
    allowFiles: true
  },
  {
    key: 'note',
    title: '📝 Study Note',
    description: 'Create educational content for students',
    icon: '📝',
    requiresOrganization: true,
    allowFiles: true
  },
  {
    key: 'assignment',
    title: '📋 Assignment',
    description: 'Create tasks and homework',
    icon: '📋',
    requiresOrganization: true,
    allowFiles: true
  },
  {
    key: 'video',
    title: '🎥 Video Content',
    description: 'Upload and share video lessons',
    icon: '🎥',
    requiresOrganization: true,
    allowFiles: true
  },
  {
    key: 'document',
    title: '📄 Document',
    description: 'Share PDFs, presentations, and docs',
    icon: '📄',
    requiresOrganization: true,
    allowFiles: true
  },
  {
    key: 'snippet',
    title: '💻 Code Snippet',
    description: 'Share code examples and solutions',
    icon: '💻',
    requiresOrganization: true,
    allowFiles: false
  }
];

const ContentForm: React.FC<ContentFormProps> = ({
  onSuccess,
  onError,
  onShowAlert,
  editingContent,
  onCancel,
  defaultType = 'announcement'
}) => {
  // Wizard steps
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedContentType, setSelectedContentType] = useState(
    editingContent ? editingContent.type : defaultType
  );

  const [formData, setFormData] = useState<ContentData & { files?: File[] }>(
    editingContent || {
      type: defaultType as 'announcement' | 'note' | 'assignment' | 'cheatsheet' | 'snippet',
      title: '',
      description: '',
      content: '',
      courseId: '',
      courseName: '',
      isPublished: false,
      visibility: 'enrolled_only',
      tags: [],
      files: [],
    }
  );

  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  
  // State for course/subject/chapter/topic dropdowns
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Get current content type config  
  const currentTypeConfig = CONTENT_TYPES.find(type => type.key === selectedContentType) || CONTENT_TYPES[0];
  const requiresOrganization = currentTypeConfig.requiresOrganization;
  
  // Fetch courses when type requires organization
  useEffect(() => {
    if (requiresOrganization) {
      const fetchCourses = async () => {
        try {
          const res = await courseApi.getCourses();
          // Handle various response formats
          let courseList: Course[] = [];
          if (Array.isArray(res)) {
            courseList = res;
          } else if (Array.isArray(res?.data?.courses)) {
            courseList = res.data.courses;
          } else if (Array.isArray(res?.courses)) {
            courseList = res.courses;
          } else if (Array.isArray(res?.data)) {
            courseList = res.data;
          }
          setCourses(courseList);
        } catch (err) {
          console.error('Failed to fetch courses:', err);
        }
      };
      fetchCourses();
    }
  }, [requiresOrganization]);
  
  // Fetch subjects when course changes
  useEffect(() => {
    if (requiresOrganization && formData.courseId) {
      const fetchSubjects = async () => {
        try {
          const res = await subjectApi.getSubjects({ courseId: formData.courseId });
          // Handle various response formats
          let subjectList: Subject[] = [];
          if (Array.isArray(res)) {
            subjectList = res;
          } else if (Array.isArray(res?.data)) {
            subjectList = res.data;
          } else if (Array.isArray(res?.subjects)) {
            subjectList = res.subjects;
          }
          setSubjects(subjectList);
        } catch (err) {
          console.error('Failed to fetch subjects:', err);
        }
      };
      fetchSubjects();
    } else {
      setSubjects([]);
      setFormData(prev => ({ ...prev, subjectId: undefined, chapterId: undefined }));
    }
  }, [requiresOrganization, formData.courseId]);
  
  // Fetch chapters when subject changes
  useEffect(() => {
    if (requiresOrganization && formData.subjectId) {
      const fetchChapters = async () => {
        try {
          const res = await chapterApi.getChapters({ subjectId: formData.subjectId });
          // Handle various response formats
          let chapterList: Chapter[] = [];
          if (Array.isArray(res)) {
            chapterList = res;
          } else if (Array.isArray(res?.data)) {
            chapterList = res.data;
          } else if (Array.isArray(res?.chapters)) {
            chapterList = res.chapters;
          }
          setChapters(chapterList);
        } catch (err) {
          console.error('Failed to fetch chapters:', err);
        }
      };
      fetchChapters();
    } else {
      setChapters([]);
      setFormData(prev => ({ ...prev, chapterId: undefined }));
    }
  }, [requiresOrganization, formData.subjectId]);

  // Fetch topics when chapter changes
  useEffect(() => {
    if (requiresOrganization && formData.chapterId) {
      const fetchTopics = async () => {
        try {
          const res = await topicApi.getTopicsByChapter(formData.chapterId);
          // Handle various response formats
          let topicList: Topic[] = [];
          if (Array.isArray(res)) {
            topicList = res;
          } else if (Array.isArray(res?.data)) {
            topicList = res.data;
          } else if (Array.isArray(res?.topics)) {
            topicList = res.topics;
          }
          setTopics(topicList);
        } catch (err) {
          console.error('Failed to fetch topics:', err);
        }
      };
      fetchTopics();
    } else {
      setTopics([]);
      setFormData(prev => ({ ...prev, topicId: undefined }));
    }
  }, [requiresOrganization, formData.chapterId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData((prev) => ({
        ...prev,
        files: [...(prev.files || []), ...newFiles],
      }));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFormData((prev) => ({
        ...prev,
        files: [...(prev.files || []), ...newFiles],
      }));
    }
  };

  const handleRemoveFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.content.trim()) {
        throw new Error('Content is required');
      }

      const { files, ...submitData } = formData;

      if (editingContent?._id) {
        await contentAPI.updateContent(
          editingContent._id,
          submitData as ContentData,
          files
        );
      } else {
        await contentAPI.createContent(
          submitData as ContentData,
          files
        );
      }

      const message = editingContent
        ? '✅ Content updated successfully!'
        : '✅ Content created successfully!';

      if (onShowAlert) {
        onShowAlert(message, 'success');
      } else if (onSuccess) {
        onSuccess(message);
      }

      // Reset form
      setFormData({
        type: 'announcement',
        title: '',
        description: '',
        content: '',
        courseId: '',
        courseName: '',
        subjectId: undefined,
        chapterId: undefined,
        isPublished: false,
        visibility: 'enrolled_only',
        tags: [],
        files: [],
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save content';
      if (onShowAlert) {
        onShowAlert(errorMessage, 'error');
      } else if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Wizard navigation functions
  const nextStep = () => {
    if (currentStep === 1 && !selectedContentType) return;
    if (currentStep === 2 && (!formData.title.trim() || !formData.content.trim())) return;
    if (currentStep === 3 && requiresOrganization && (!formData.courseId || !formData.subjectId)) return;
    
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const renderStepIndicator = () => (
    <div className="progress-steps">
      <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
        <span className="step-icon">1</span>
        <span>Choose Type</span>
      </div>
      <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
        <span className="step-icon">2</span>
        <span>Basic Info</span>
      </div>
      <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
        <span className="step-icon">3</span>
        <span>Organization</span>
      </div>
      <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
        <span className="step-icon">4</span>
        <span>Publish</span>
      </div>
    </div>
  );

  const renderContentTypeSelection = () => (
    <div className="content-type-grid">
      {CONTENT_TYPES.map((type) => (
        <div
          key={type.key}
          className={`content-type-card ${selectedContentType === type.key ? 'selected' : ''}`}
          onClick={() => {
            setSelectedContentType(type.key as ContentType);
            setFormData(prev => ({ ...prev, type: type.key } as any));
          }}
        >
          <div className="content-type-icon">{type.icon}</div>
          <div className="content-type-title">{type.title}</div>
          <div className="content-type-desc">{type.description}</div>
        </div>
      ))}
    </div>
  );

  const renderBasicInfo = () => (
    <div className="form-content">
      <div className="form-section">
        <h3 className="section-title">📝 Basic Information</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="title">Content Title *</label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder={`Enter ${currentTypeConfig.title.toLowerCase()} title...`}
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Short Description</label>
            <input
              id="description"
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Brief description for the content..."
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="content">Content *</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            placeholder={`Write your ${currentTypeConfig.title.toLowerCase()} content here...`}
            disabled={loading}
            required
          />
        </div>

        {/* Special fields for specific types */}
        {selectedContentType === 'snippet' && (
          <div className="form-group">
            <label htmlFor="language">Programming Language</label>
            <select
              id="language"
              name="language"
              value={formData.language || ''}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="">Select Language</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="sql">SQL</option>
            </select>
          </div>
        )}

        {selectedContentType === 'assignment' && (
          <div className="form-group">
            <label htmlFor="dueDate">Due Date</label>
            <input
              id="dueDate"
              type="datetime-local"
              name="dueDate"
              value={formData.dueDate || ''}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="tagInput">Tags (Optional)</label>
          <div className="tags-input-container">
            <div className="tags-display">
              {formData.tags?.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                  <span 
                    className="tag-remove" 
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ×
                  </span>
                </span>
              ))}
            </div>
            <input
              className="tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tags (press Enter)"
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderOrganization = () => (
    <div className="form-content">
      {requiresOrganization ? (
        <div className="organization-section">
          <h3 className="section-title">🏫 Course Organization</h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            Help students find your content by organizing it properly within the course structure.
          </p>
          
          <div className="form-grid two-columns">
            <div className="form-group">
              <label htmlFor="courseId">Course *</label>
              <select
                id="courseId"
                name="courseId"
                value={formData.courseId || ''}
                onChange={handleInputChange}
                disabled={loading}
                required
              >
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title} ({course.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="subjectId">Subject *</label>
              <select
                id="subjectId"
                name="subjectId"
                value={formData.subjectId || ''}
                onChange={handleInputChange}
                disabled={loading || !formData.courseId}
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="chapterId">Chapter *</label>
              <select
                id="chapterId"
                name="chapterId"
                value={formData.chapterId || ''}
                onChange={handleInputChange}
                disabled={loading || !formData.subjectId}
                required
              >
                <option value="">Select Chapter</option>
                {chapters.map((chapter) => (
                  <option key={chapter._id} value={chapter._id}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="topicId">Topic (Optional)</label>
              <select
                id="topicId"
                name="topicId"
                value={formData.topicId || ''}
                onChange={handleInputChange}
                disabled={loading || !formData.chapterId}
              >
                <option value="">Select Topic</option>
                {topics.map((topic) => (
                  <option key={topic._id} value={topic._id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="form-content">
          <div className="form-section">
            <h3 className="section-title">🏫 Course Association</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              General announcements can be associated with a course or left open to all students.
            </p>
            
            <div className="form-group">
              <label htmlFor="courseId">Course (Optional)</label>
              <input
                id="courseId"
                type="text"
                name="courseId"
                value={formData.courseId || ''}
                onChange={handleInputChange}
                placeholder="Enter course ID or name (optional)"
                disabled={loading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPublishSettings = () => (
    <div className="form-content">
      <div className="form-section">
        <h3 className="section-title">⚙️ Publishing Settings</h3>
        
        <div className="form-grid two-columns">
          <div className="form-group">
            <label htmlFor="visibility">Who can see this?</label>
            <select
              id="visibility"
              name="visibility"
              value={formData.visibility}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="enrolled_only">👥 Enrolled Students Only</option>
              <option value="all_students">🌍 All Students</option>
              <option value="specific_batch">🎓 Specific Batch</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="isPublished"
                checked={formData.isPublished}
                onChange={handleInputChange}
                disabled={loading}
              />
              <span>Publish immediately</span>
            </label>
            <small style={{ color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
              {formData.isPublished 
                ? 'Content will be visible to students right away' 
                : 'Save as draft - you can publish later'
              }
            </small>
          </div>
        </div>

        {currentTypeConfig.allowFiles && (
          <div className="form-section">
            <h3 className="section-title">📎 File Attachments</h3>
            <div
              className={`file-upload-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input
                type="file"
                id="fileInput"
                className="file-input"
                multiple
                onChange={handleFileChange}
                disabled={loading}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.xls,.xlsx,.mp4,.mp3"
              />
              <div className="upload-icon">☁️</div>
              <div className="upload-text">
                {dragOver ? 'Drop files here!' : 'Drag & drop files or click to browse'}
              </div>
              <div className="upload-hint">
                Support: Images, Documents, Videos, Audio (Max 50MB each)
              </div>
            </div>

            {formData.files && formData.files.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: '#374151', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  Attached Files ({formData.files.length})
                </h4>
                {formData.files.map((file, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.5rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{ fontSize: '0.9rem' }}>📎 {file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      disabled={loading}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        padding: '0.25rem'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="content-form-container">
      <div className="content-form-wrapper">
        <div className="form-header">
          <h1>{editingContent ? 'Edit Content' : 'Create New Content'}</h1>
          <p>Share knowledge and engage with your students</p>
        </div>

        {renderStepIndicator()}

        <form onSubmit={handleSubmit}>
          {currentStep === 1 && renderContentTypeSelection()}
          {currentStep === 2 && renderBasicInfo()}
          {currentStep === 3 && renderOrganization()}
          {currentStep === 4 && renderPublishSettings()}

          <div className="form-actions">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="btn btn-secondary"
              >
                ← Previous
              </button>
            )}
            
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={loading || (currentStep === 1 && !selectedContentType)}
                className="btn btn-primary"
              >
                Continue →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? '⏳ Saving...' : editingContent ? '✅ Update Content' : '✅ Create Content'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentForm;
