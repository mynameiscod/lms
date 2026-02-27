import React, { useState } from 'react';
import { Button, Input, Alert } from '../common';
import { Batch } from '../../types';
import './QuizWizard.css';

interface QuizFormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  totalMarks: number;
  totalTime: number;
  access: 'public' | 'private';
  accessibleTo: 'everyone' | 'batch_wise' | 'individual';
  selectedBatches: string[];
  selectedStudents: string[];
  passingMarks: number;
  negativeMarking: boolean;
  negativeMarkingValue: number;
  shuffleQuestions: boolean;
  showAnswersAfterSubmit: boolean;
  showScoreAfterSubmit: boolean;
  allowReview: boolean;
  multipleAttempts: boolean;
  maxAttempts: number;
  canCopyPaste: boolean;
  requireFullScreen: boolean;
  tabSwitchWarnings: boolean;
}

interface QuizWizardProps {
  initialData?: Partial<QuizFormData>;
  batches: Batch[];
  isEditing?: boolean;
  onSubmit: (data: QuizFormData) => Promise<void>;
  onClose: () => void;
}

const QuizWizard: React.FC<QuizWizardProps> = ({
  initialData,
  batches,
  isEditing = false,
  onSubmit,
  onClose
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<QuizFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    startTime: initialData?.startTime || '09:00',
    endTime: initialData?.endTime || '10:00',
    totalMarks: initialData?.totalMarks || 100,
    totalTime: initialData?.totalTime || 60,
    access: initialData?.access || 'public',
    accessibleTo: initialData?.accessibleTo || 'everyone',
    selectedBatches: initialData?.selectedBatches || [],
    selectedStudents: initialData?.selectedStudents || [],
    passingMarks: initialData?.passingMarks || 50,
    negativeMarking: initialData?.negativeMarking || false,
    negativeMarkingValue: initialData?.negativeMarkingValue || 0,
    shuffleQuestions: initialData?.shuffleQuestions || false,
    showAnswersAfterSubmit: initialData?.showAnswersAfterSubmit !== false,
    showScoreAfterSubmit: initialData?.showScoreAfterSubmit !== false,
    allowReview: initialData?.allowReview !== false,
    multipleAttempts: initialData?.multipleAttempts || false,
    maxAttempts: initialData?.maxAttempts || 1,
    canCopyPaste: initialData?.canCopyPaste || false,
    requireFullScreen: initialData?.requireFullScreen || false,
    tabSwitchWarnings: initialData?.tabSwitchWarnings !== false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleBatchToggle = (batchId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedBatches: prev.selectedBatches.includes(batchId)
        ? prev.selectedBatches.filter(id => id !== batchId)
        : [...prev.selectedBatches, batchId]
    }));
  };

  const validateStep = (currentStep: number): boolean => {
    setError('');
    
    switch (currentStep) {
      case 1:
        if (!formData.title.trim()) {
          setError('Quiz title is required');
          return false;
        }
        if (!formData.startDate || !formData.endDate) {
          setError('Start and end dates are required');
          return false;
        }
        return true;
      case 2:
        if (formData.totalMarks < 1) {
          setError('Total marks must be at least 1');
          return false;
        }
        if (formData.totalTime < 1) {
          setError('Duration must be at least 1 minute');
          return false;
        }
        if (formData.passingMarks < 0 || formData.passingMarks > formData.totalMarks) {
          setError('Passing marks must be between 0 and total marks');
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        if (formData.accessibleTo === 'batch_wise' && formData.selectedBatches.length === 0) {
          setError('Please select at least one batch');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    
    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-wizard">
      <div className="wizard-header">
        <h2>{isEditing ? 'Edit Quiz' : 'Create New Quiz'}</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Progress Indicator */}
      <div className="wizard-progress">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`progress-step ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`}>
            <div className="step-number">{s}</div>
            <div className="step-label">
              {s === 1 && 'Basic Info'}
              {s === 2 && 'Parameters'}
              {s === 3 && 'Settings'}
              {s === 4 && 'Access'}
            </div>
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {error && <Alert type="error" message={error} />}

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <div className="wizard-step">
          <h3>📋 Basic Information</h3>
          <div className="step-content">
            <div className="form-group full">
              <label>Quiz Title *</label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter an engaging quiz title"
                autoFocus
              />
            </div>

            <div className="form-group full">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of what this quiz covers"
                rows={3}
                className="textarea-input"
              />
            </div>

            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="date-input"
              />
            </div>

            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="date-input"
              />
            </div>

            <div className="form-group">
              <label>Start Time</label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                className="time-input"
              />
            </div>

            <div className="form-group">
              <label>End Time</label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                className="time-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Quiz Parameters */}
      {step === 2 && (
        <div className="wizard-step">
          <h3>📊 Quiz Parameters</h3>
          <div className="step-content">
            <div className="form-group">
              <label>Total Marks *</label>
              <Input
                type="number"
                name="totalMarks"
                value={String(formData.totalMarks)}
                onChange={handleInputChange}
                min="1"
                placeholder="e.g., 100"
              />
            </div>

            <div className="form-group">
              <label>Duration (minutes) *</label>
              <Input
                type="number"
                name="totalTime"
                value={String(formData.totalTime)}
                onChange={handleInputChange}
                min="1"
                placeholder="e.g., 60"
              />
            </div>

            <div className="form-group">
              <label>Passing Marks</label>
              <Input
                type="number"
                name="passingMarks"
                value={String(formData.passingMarks)}
                onChange={handleInputChange}
                min="0"
                placeholder="Minimum marks to pass"
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="negativeMarking"
                  checked={formData.negativeMarking}
                  onChange={handleInputChange}
                />
                <span>Enable Negative Marking</span>
              </label>
            </div>

            {formData.negativeMarking && (
              <div className="form-group">
                <label>Negative Marking Value</label>
                <Input
                  type="number"
                  name="negativeMarkingValue"
                  value={String(formData.negativeMarkingValue)}
                  onChange={handleInputChange}
                  min="0"
                  step="0.5"
                  placeholder="e.g., 0.5"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Quiz Settings */}
      {step === 3 && (
        <div className="wizard-step">
          <h3>⚙️ Quiz Settings</h3>
          <div className="step-content">
            <div className="settings-grid">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="shuffleQuestions"
                  checked={formData.shuffleQuestions}
                  onChange={handleInputChange}
                />
                <span>Shuffle Questions</span>
                <small>Randomize question order for each student</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="showAnswersAfterSubmit"
                  checked={formData.showAnswersAfterSubmit}
                  onChange={handleInputChange}
                />
                <span>Show Answers After Submit</span>
                <small>Students can see correct answers</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="showScoreAfterSubmit"
                  checked={formData.showScoreAfterSubmit}
                  onChange={handleInputChange}
                />
                <span>Show Score After Submit</span>
                <small>Display immediate feedback</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="allowReview"
                  checked={formData.allowReview}
                  onChange={handleInputChange}
                />
                <span>Allow Review</span>
                <small>Students can review their answers</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="multipleAttempts"
                  checked={formData.multipleAttempts}
                  onChange={handleInputChange}
                />
                <span>Multiple Attempts</span>
                <small>Allow students to retake the quiz</small>
              </label>

              {formData.multipleAttempts && (
                <div className="form-group">
                  <label>Maximum Attempts</label>
                  <Input
                    type="number"
                    name="maxAttempts"
                    value={String(formData.maxAttempts)}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="Unlimited if empty"
                  />
                </div>
              )}

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="requireFullScreen"
                  checked={formData.requireFullScreen}
                  onChange={handleInputChange}
                />
                <span>Require Full Screen</span>
                <small>Proctoring feature</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="tabSwitchWarnings"
                  checked={formData.tabSwitchWarnings}
                  onChange={handleInputChange}
                />
                <span>Tab Switch Warnings</span>
                <small>Warn students about switching tabs</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="canCopyPaste"
                  checked={formData.canCopyPaste}
                  onChange={handleInputChange}
                />
                <span>Allow Copy/Paste</span>
                <small>Students can copy text during quiz</small>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Access Control */}
      {step === 4 && (
        <div className="wizard-step">
          <h3>🔒 Access Control</h3>
          <div className="step-content">
            <div className="form-group">
              <label>Access Level</label>
              <select
                name="access"
                value={formData.access}
                onChange={handleInputChange}
                className="select-input"
              >
                <option value="public">Public (Everyone can see)</option>
                <option value="private">Private (Restricted)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Accessible To</label>
              <select
                name="accessibleTo"
                value={formData.accessibleTo}
                onChange={handleInputChange}
                className="select-input"
              >
                <option value="everyone">Everyone in Tenant</option>
                <option value="batch_wise">Specific Batches</option>
                <option value="individual">Individual Students</option>
              </select>
            </div>

            {formData.accessibleTo === 'batch_wise' && (
              <div className="form-group full">
                <label>Select Batches *</label>
                <div className="batch-list">
                  {batches.length > 0 ? (
                    batches.map(batch => (
                      <label key={batch._id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.selectedBatches.includes(batch._id)}
                          onChange={() => handleBatchToggle(batch._id)}
                        />
                        <span>{batch.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="no-batches">No batches available</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="wizard-footer">
        <Button
          onClick={handlePrevious}
          className="btn-secondary"
          disabled={step === 1}
        >
          ← Previous
        </Button>

        <div className="step-indicator">Step {step} of 4</div>

        {step < 4 ? (
          <Button
            onClick={handleNext}
            className="btn-primary"
          >
            Next →
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="btn-success"
            disabled={loading}
          >
            {loading ? '⏳ Creating...' : '✓ Create Quiz'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizWizard;
