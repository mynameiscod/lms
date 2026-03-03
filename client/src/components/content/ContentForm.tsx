import React, { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { type AlertType } from '../common';
import contentAPI, { ContentData } from '../../api/contentAPI';
import './ContentForm.css';

export interface ContentFormProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onShowAlert?: (message: string, type: AlertType) => void;
  editingContent?: any;
  onCancel?: () => void;
}

const ContentForm: React.FC<ContentFormProps> = ({
  onSuccess,
  onError,
  onShowAlert,
  editingContent,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ContentData & { files?: File[] }>(
    editingContent || {
      type: 'announcement',
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

  return (
    <Card className="content-form-card">
      <h2>{editingContent ? 'Edit Content' : 'Create New Content'}</h2>

      <form onSubmit={handleSubmit} className="content-form">
        {/* Type Selection */}
        <div className="form-group">
          <label htmlFor="type">Content Type *</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            disabled={loading}
          >
            <option value="announcement">📢 Announcement</option>
            <option value="note">📝 Note</option>
            <option value="assignment">✓ Assignment</option>
            <option value="cheatsheet">⚡ Cheatsheet</option>
            <option value="snippet">💻 Snippet</option>
          </select>
        </div>

        {/* Title */}
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <Input
            id="title"
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter content title"
            disabled={loading}
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <Input
            id="description"
            type="text"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Brief description of the content"
            disabled={loading}
          />
        </div>

        {/* Course ID */}
        <div className="form-group">
          <label htmlFor="courseId">Course ID *</label>
          <Input
            id="courseId"
            type="text"
            name="courseId"
            value={formData.courseId || ''}
            onChange={handleInputChange}
            placeholder="Enter the course ID or name"
            disabled={loading}
            required
          />
        </div>

        {/* Main Content */}
        <div className="form-group">
          <label htmlFor="content">Content *</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            placeholder="Enter your content here..."
            rows={8}
            disabled={loading}
            required
          />
        </div>

        {/* Conditional: Code Editor for Snippets */}
        {formData.type === 'snippet' && (
          <>
            <div className="form-group">
              <label htmlFor="language">Programming Language</label>
              <Input
                id="language"
                type="text"
                name="language"
                value={formData.language || ''}
                onChange={handleInputChange}
                placeholder="e.g., JavaScript, Python, Java"
                disabled={loading}
              />
            </div>
          </>
        )}

        {/* Conditional: Due Date for Assignments */}
        {formData.type === 'assignment' && (
          <div className="form-group">
            <label htmlFor="dueDate">Due Date</label>
            <Input
              id="dueDate"
              type="datetime-local"
              name="dueDate"
              value={formData.dueDate || ''}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
        )}

        {/* Tags */}
        <div className="form-group">
          <label htmlFor="tagInput">Tags</label>
          <div className="tag-input-container">
            <Input
              id="tagInput"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add a tag and press Enter"
              disabled={loading}
            />
            <Button
              onClick={() => handleAddTag()}
              disabled={loading}
              type="button"
            >
              Add Tag
            </Button>
          </div>
          <div className="tags-list">
            {formData.tags?.map((tag) => (
              <span key={tag} className="tag">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  disabled={loading}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* File Upload */}
        <div className="form-group">
          <label>Attachments (Max 5 files, 50MB each)</label>
          <div
            className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="fileInput"
              multiple
              onChange={handleFileChange}
              disabled={loading}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.xls,.xlsx"
              style={{ display: 'none' }}
            />
            <label htmlFor="fileInput" className="file-input-label">
              {dragOver ? '📥 Drop files here' : '📤 Drag files here or click to select'}
            </label>
          </div>
          <div className="files-list">
            {formData.files?.map((file, index) => (
              <div key={index} className="file-item">
                <span>📎 {file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Visibility & Publishing */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="visibility">Visibility</label>
            <select
              id="visibility"
              name="visibility"
              value={formData.visibility}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="enrolled_only">👥 Enrolled Only</option>
              <option value="all_students">🌍 All Students</option>
              <option value="specific_batch">🎓 Specific Batch</option>
            </select>
            
            {/* Batch Selector - Show when "Specific Batch" is selected */}
            {formData.visibility === 'specific_batch' && (
              <div className="batch-selector-group active">
                <label htmlFor="batchId" style={{ display: 'block', marginTop: '8px' }}>
                  Select Batch *
                </label>
                <Input
                  id="batchId"
                  type="text"
                  name="batchId"
                  value={formData.batchId || ''}
                  onChange={handleInputChange}
                  placeholder="Enter batch ID or select from list"
                  disabled={loading}
                  required={formData.visibility === 'specific_batch'}
                />
              </div>
            )}
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isPublished"
                checked={formData.isPublished}
                onChange={handleInputChange}
                disabled={loading}
              />
              <span>Publish Now</span>
            </label>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="form-actions">
          <Button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? <Spinner /> : editingContent ? 'Update Content' : 'Create Content'}
          </Button>
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};

export default ContentForm;
