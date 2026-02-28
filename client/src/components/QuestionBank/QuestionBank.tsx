import React, { useState, useEffect, useCallback } from 'react';
import './QuestionBank.css';
import Input from '../common/Input';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import Alert from '../common/Alert';
import { quizApi } from '../../api';

interface Question {
  _id: string;
  question: string;
  type: string;
  difficulty: string;
  difficultyLevel?: string;
  marks: number;
  tags?: string[];
  source: string;
  usageCount: number;
  createdAt: string;
}

type InputMethod = 'view' | 'manual' | 'csv' | 'ai';

interface QuestionBankProps {
  onClose?: () => void;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<InputMethod>('view');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  // Manual entry form state
  const [manualForm, setManualForm] = useState({
    question: '',
    type: 'mcq_single',
    options: ['', '', '', ''],
    correctAnswer: '0',
    marks: 1,
    difficulty: 'medium',
    tags: '',
    description: ''
  });

  // Fetch all questions and statistics
  const fetchQuestionBank = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [questionsResponse, statsResponse, tagsResponse] = await Promise.all([
        quizApi.getQuestionBank(),
        quizApi.getQuestionBankStats(),
        quizApi.getAllTags()
      ]);

      setQuestions(questionsResponse || []);
      setFilteredQuestions(questionsResponse || []);
      setStats(statsResponse);
      setTags(tagsResponse?.tags || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load Question Bank');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestionBank();
  }, [fetchQuestionBank]);

  // Apply filters whenever search term, tags, or difficulty changes
  useEffect(() => {
    let filtered = questions;

    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.question.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(q =>
        selectedTags.some(tag => (q.tags || []).includes(tag))
      );
    }

    if (difficultyFilter) {
      filtered = filtered.filter(q =>
        (q.difficultyLevel || q.difficulty) === difficultyFilter
      );
    }

    setFilteredQuestions(filtered);
  }, [searchTerm, selectedTags, difficultyFilter, questions]);

  // Handle manual question creation
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      const newQuestion = {
        question: manualForm.question,
        type: manualForm.type,
        marks: manualForm.marks,
        difficultyLevel: manualForm.difficulty,
        tags: manualForm.tags ? manualForm.tags.split(',').map(t => t.trim()) : [],
        description: manualForm.description,
        source: 'manual',
        options: manualForm.type.startsWith('mcq')
          ? manualForm.options.filter(o => o.trim() !== '')
          : undefined,
        correctAnswers: manualForm.type.startsWith('mcq')
          ? [manualForm.correctAnswer]
          : undefined
      };

      const createdQuestion = await quizApi.createQuestionBankQuestion(newQuestion);
      
      setQuestions([createdQuestion, ...questions]);
      setFilteredQuestions([createdQuestion, ...filteredQuestions]);
      setSuccessMessage('Question added successfully!');
      
      // Reset form
      setManualForm({
        question: '',
        type: 'mcq_single',
        options: ['', '', '', ''],
        correctAnswer: '0',
        marks: 1,
        difficulty: 'medium',
        tags: '',
        description: ''
      });

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV upload
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError('');

      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',');

      const uploadedQuestions = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',');
        const questionData: any = {};

        headers.forEach((header, index) => {
          questionData[header.trim()] = values[index]?.trim();
        });

        // Convert to the format expected by the API
        const newQuestion = {
          question: questionData.Question || '',
          type: 'mcq_single',
          options: [
            questionData['Option A'],
            questionData['Option B'],
            questionData['Option C'],
            questionData['Option D']
          ].filter(Boolean),
          correctAnswers: [questionData['Correct Answer'] || '0'],
          marks: parseInt(questionData.Marks) || 1,
          difficultyLevel: questionData.Difficulty || 'medium',
          tags: questionData.Tags ? questionData.Tags.split(';') : [],
          source: 'csv'
        };

        if (newQuestion.question) {
          uploadedQuestions.push(newQuestion);
        }
      }

      // Bulk create questions
      for (const q of uploadedQuestions) {
        const created = await quizApi.createQuestionBankQuestion(q);
        setQuestions(prev => [created, ...prev]);
      }

      setFilteredQuestions(questions);
      setSuccessMessage(`${uploadedQuestions.length} questions imported successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload CSV');
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Download template CSV
  const handleDownloadTemplate = () => {
    const csvContent = 'Question,Option A,Option B,Option C,Option D,Correct Answer,Difficulty,Marks,Tags\n' +
      'What is 2+2?,3,4,5,6,1,easy,1,math;basic\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Delete question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      await quizApi.deleteQuestionBankQuestion(questionId);
      setQuestions(questions.filter(q => q._id !== questionId));
      setFilteredQuestions(filteredQuestions.filter(q => q._id !== questionId));
      setSuccessMessage('Question deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete question');
    }
  };

  return (
    <div className="question-bank">
      <div className="qb-header">
        <div>
          <h1>Question Bank</h1>
          <p>Manage your reusable question library</p>
        </div>
        {onClose && (
          <Button
            onClick={onClose}
            variant="secondary"
            className="qb-close-btn"
          >
            ← Back
          </Button>
        )}
      </div>

      {error && <Alert type="error" message={error} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Stats Card */}
      {stats && (
        <div className="qb-stats-card">
          <div className="stat-item">
            <span className="stat-label">Total Questions</span>
            <span className="stat-value">{stats.totalQuestions}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Easy</span>
            <span className="stat-value">{stats.byDifficulty?.easy || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Medium</span>
            <span className="stat-value">{stats.byDifficulty?.medium || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Hard</span>
            <span className="stat-value">{stats.byDifficulty?.hard || 0}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="qb-tabs">
        <button
          className={`qb-tab ${activeTab === 'view' ? 'active' : ''}`}
          onClick={() => setActiveTab('view')}
        >
          📋 View All
        </button>
        <button
          className={`qb-tab ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          ✏️ Add Manually
        </button>
        <button
          className={`qb-tab ${activeTab === 'csv' ? 'active' : ''}`}
          onClick={() => setActiveTab('csv')}
        >
          📤 CSV Upload
        </button>
        <button
          className={`qb-tab ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          🤖 AI Generate
        </button>
      </div>

      {/* Tab Content */}
      <div className="qb-tab-content">
        {/* View All Tab */}
        {activeTab === 'view' && (
          <div className="qb-view-tab">
            <div className="qb-filters">
              <Input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="qb-search"
              />
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="qb-filter-select"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              {/* Tag filter */}
              <div className="qb-tag-filter">
                {tags.map(tag => (
                  <label key={tag} className="tag-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag]);
                        } else {
                          setSelectedTags(selectedTags.filter(t => t !== tag));
                        }
                      }}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </div>

            {loading ? (
              <Spinner />
            ) : filteredQuestions.length === 0 ? (
              <p className="qb-empty">No questions found</p>
            ) : (
              <div className="qb-questions-list">
                {filteredQuestions.map(question => (
                  <div key={question._id} className="qb-question-card">
                    <div className="qb-question-header">
                      <h3>{question.question}</h3>
                      <div className="qb-question-meta">
                        <span className="qb-badge" title={question.difficultyLevel || question.difficulty}>
                          {question.difficultyLevel || question.difficulty}
                        </span>
                        <span className="qb-badge">{question.type}</span>
                        <span className="qb-badge">{question.marks}pt</span>
                        <span className="qb-badge">Used: {question.usageCount}</span>
                      </div>
                    </div>
                    {question.tags && question.tags.length > 0 && (
                      <div className="qb-tags">
                        {question.tags.map(tag => (
                          <span key={tag} className="qb-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="qb-question-actions">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          // TODO: Edit functionality
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteQuestion(question._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manual Add Tab */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="qb-form">
            <div className="qb-form-group">
              <label>Question Text *</label>
              <textarea
                value={manualForm.question}
                onChange={(e) => setManualForm({ ...manualForm, question: e.target.value })}
                placeholder="Enter the question text"
                required
                className="qb-textarea"
              />
            </div>

            <div className="qb-form-row">
              <div className="qb-form-group">
                <label>Question Type *</label>
                <select
                  value={manualForm.type}
                  onChange={(e) => setManualForm({ ...manualForm, type: e.target.value })}
                  className="qb-select"
                >
                  <option value="mcq_single">Multiple Choice (Single)</option>
                  <option value="mcq_multiple">Multiple Choice (Multiple)</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>

              <div className="qb-form-group">
                <label>Difficulty Level *</label>
                <select
                  value={manualForm.difficulty}
                  onChange={(e) => setManualForm({ ...manualForm, difficulty: e.target.value })}
                  className="qb-select"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="qb-form-group">
                <label>Marks *</label>
                <Input
                  type="number"
                  value={manualForm.marks}
                  onChange={(e) => setManualForm({ ...manualForm, marks: parseInt(e.target.value) })}
                  min="1"
                  required
                />
              </div>
            </div>

            {manualForm.type.startsWith('mcq') && (
              <>
                <div className="qb-form-group">
                  <label>Options *</label>
                  {manualForm.options.map((option, idx) => (
                    <div key={idx} className="qb-option-input">
                      <Input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...manualForm.options];
                          newOptions[idx] = e.target.value;
                          setManualForm({ ...manualForm, options: newOptions });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="qb-form-group">
                  <label>Correct Answer *</label>
                  <select
                    value={manualForm.correctAnswer}
                    onChange={(e) => setManualForm({ ...manualForm, correctAnswer: e.target.value })}
                    className="qb-select"
                  >
                    {manualForm.options.map((option, idx) => (
                      <option key={idx} value={idx}>
                        Option {String.fromCharCode(65 + idx)}: {option || '(empty)'}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="qb-form-group">
              <label>Tags (comma-separated)</label>
              <Input
                type="text"
                value={manualForm.tags}
                onChange={(e) => setManualForm({ ...manualForm, tags: e.target.value })}
                placeholder="e.g., math, algebra, basics"
              />
            </div>

            <div className="qb-form-group">
              <label>Description (optional)</label>
              <textarea
                value={manualForm.description}
                onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                placeholder="Add explanation or notes"
                className="qb-textarea"
              />
            </div>

            <Button type="submit" disabled={loading} className="qb-submit-btn">
              {loading ? 'Adding...' : 'Add Question'}
            </Button>
          </form>
        )}

        {/* CSV Upload Tab */}
        {activeTab === 'csv' && (
          <div className="qb-csv-tab">
            <div className="qb-csv-content">
              <h3>Upload Questions from CSV</h3>
              <p>Download the template, fill it with your questions, and upload it back.</p>

              <div className="qb-csv-actions">
                <Button onClick={handleDownloadTemplate} variant="secondary">
                  📥 Download CSV Template
                </Button>
              </div>

              <div className="qb-csv-upload">
                <label htmlFor="csv-input" className="qb-csv-label">
                  {loading ? 'Uploading...' : 'Click to upload CSV or drag & drop'}
                </label>
                <input
                  id="csv-input"
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  disabled={loading}
                  className="qb-csv-input"
                />
              </div>

              <p className="qb-csv-note">
                Expected columns: Question, Option A, Option B, Option C, Option D, Correct Answer, Difficulty, Marks, Tags
              </p>
            </div>
          </div>
        )}

        {/* AI Generate Tab */}
        {activeTab === 'ai' && (
          <div className="qb-ai-tab">
            <div className="qb-ai-content">
              <h3>🤖 Generate Questions with AI</h3>
              <p className="qb-coming-soon">AI question generation feature coming soon!</p>
              <p>Generate questions based on:</p>
              <ul>
                <li>✅ Topic/Subject</li>
                <li>✅ Number of questions</li>
                <li>✅ Difficulty level(s)</li>
                <li>✅ Question types</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;
