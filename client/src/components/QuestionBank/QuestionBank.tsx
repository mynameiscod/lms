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
  options?: { text: string; isCorrect: boolean }[];
  correctAnswers?: string[];
  description?: string;
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
  const [dateQuickFilter, setDateQuickFilter] = useState<'all' | 'today' | 'week'>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Show 12 cards per page for better density

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState({
    question: '',
    type: 'mcq_single',
    options: ['', '', '', ''],
    correctAnswer: '0',
    marks: 1,
    difficulty: 'medium',
    tags: '',
    description: ''
  });

  // Manual entry form state
  const [manualForm, setManualForm] = useState({
    question: '',
    type: 'mcq_single',
    options: ['', '', '', ''],
    correctAnswer: '0',
    marks: 1,
    difficulty: 'medium',
    tags: '',
    description: '',
    subject: '',
    topic: ''
  });

  // AI Generate state
  const [aiForm, setAiForm] = useState({
    topic: '',
    subject: '',
    type: 'mcq_single',
    difficulty: 'medium',
    count: 10
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [selectedGenerated, setSelectedGenerated] = useState<Set<number>>(new Set());

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

  // Preview then remove duplicate bank questions (keeps one canonical per group).
  const [dedupingBusy, setDedupingBusy] = useState(false);
  const handleDedupe = async () => {
    try {
      setDedupingBusy(true); setError(''); setSuccessMessage('');
      const preview = await quizApi.dedupeQuestionBank(true);
      const n = preview?.duplicates || 0;
      if (n === 0) { setSuccessMessage('✅ No duplicate questions found.'); return; }
      if (!window.confirm(`Found ${n} duplicate question(s) across ${preview.groups} group(s). Remove the extras (keeping one of each)? Quizzes are automatically re-pointed to the kept copy.`)) return;
      const res = await quizApi.dedupeQuestionBank(false);
      setSuccessMessage(`✅ Removed ${res.removed} duplicate question(s).`);
      await fetchQuestionBank();
    } catch (err: any) {
      setError(err.message || 'De-duplication failed');
    } finally {
      setDedupingBusy(false);
    }
  };

  // Apply filters whenever search term, tags, difficulty, or date changes
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

    if (dateQuickFilter === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      filtered = filtered.filter(q => new Date(q.createdAt) >= todayStart);
    } else if (dateQuickFilter === 'week') {
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(q => new Date(q.createdAt) >= weekStart);
    }

    setFilteredQuestions(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedTags, difficultyFilter, dateQuickFilter, questions]);

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
        subject: manualForm.subject || undefined,
        topic: manualForm.topic || undefined,
        source: 'manual',
        options: manualForm.type.startsWith('mcq')
          ? manualForm.options
              .filter(o => o.trim() !== '')
              .map((text, idx) => ({ text, isCorrect: idx === parseInt(manualForm.correctAnswer) }))
          : undefined,
        correctAnswers: manualForm.type.startsWith('mcq')
          ? (() => {
              const opts = manualForm.options.filter(o => o.trim() !== '');
              const idx = parseInt(manualForm.correctAnswer);
              return [opts[idx] || opts[0] || ''];
            })()
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
        description: '',
        subject: '',
        topic: ''
      });

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  // Parse a CSV line handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { result.push(current.trim()); current = ''; }
        else { current += ch; }
      }
    }
    result.push(current.trim());
    return result;
  };

  // Normalize difficulty value to valid enum
  const normalizeDifficulty = (val: string): 'easy' | 'medium' | 'hard' => {
    const v = (val || '').toString().trim().toLowerCase();
    if (v === 'easy' || v === '1' || v === 'e') return 'easy';
    if (v === 'hard' || v === '3' || v === 'h') return 'hard';
    return 'medium'; // default for 'medium', '2', 'm', or anything else
  };

  // Resolve a CSV "Correct Answer" cell to an option index. Tolerant of every
  // common way people fill it in — otherwise no option gets marked correct and
  // the answer shows up blank:
  //   • exact option text (case-insensitive)     e.g. "O(log n)"
  //   • a letter A/B/C/D (case-insensitive)       e.g. "b"
  //   • a numeric index — 0-based per the template, with 1-based fallback
  // Returns -1 if it cannot be matched to any option.
  const resolveCorrectIndex = (raw: string, options: string[]): number => {
    const val = (raw || '').toString().trim();
    if (!val || options.length === 0) return -1;
    // 1) exact option text (case-insensitive) — most robust, unambiguous
    const textIdx = options.findIndex(o => o.trim().toLowerCase() === val.toLowerCase());
    if (textIdx >= 0) return textIdx;
    // 2) single letter A/B/C/D…
    if (/^[a-z]$/i.test(val)) {
      const li = val.toLowerCase().charCodeAt(0) - 97;
      if (li >= 0 && li < options.length) return li;
    }
    // 3) numeric — try 0-based (template contract) first, then 1-based
    if (/^\d+$/.test(val)) {
      const num = parseInt(val, 10);
      if (num >= 0 && num < options.length) return num;
      if (num >= 1 && num <= options.length) return num - 1;
    }
    return -1;
  };

  // Handle CSV upload
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError('');

      const text = await file.text();
      const lines = text.split(/\r?\n/);
      const headers = parseCSVLine(lines[0]);

      const uploadedQuestions = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = parseCSVLine(lines[i]);

        // Case/space/underscore-insensitive header lookup so "Correct Answer",
        // "correct_answer", "Answer", "OptionA" etc. all resolve.
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          const norm = header.trim().toLowerCase().replace(/[\s_]+/g, '');
          row[norm] = (values[index] || '').trim();
        });
        const pick = (...names: string[]): string => {
          for (const n of names) {
            const key = n.toLowerCase().replace(/[\s_]+/g, '');
            if (row[key]) return row[key];
          }
          return '';
        };

        const questionText = pick('question', 'q');
        if (!questionText) {
          errors.push(`Row ${i + 1}: Empty question, skipped`);
          continue;
        }

        // Convert to the format expected by the API — store options as {text, isCorrect}
        const rawOptions = [
          pick('optiona', 'a', 'option1'),
          pick('optionb', 'b', 'option2'),
          pick('optionc', 'c', 'option3'),
          pick('optiond', 'd', 'option4')
        ].filter(Boolean);

        const correctRaw = pick('correctanswer', 'correct', 'answer', 'correctoption', 'ans');
        const correctIdx = resolveCorrectIndex(correctRaw, rawOptions);
        if (correctIdx < 0) {
          errors.push(`Row ${i + 1}: couldn't match correct answer "${correctRaw}" to an option — imported without a marked answer`);
        }

        const newQuestion = {
          question: questionText,
          type: 'mcq_single' as const,
          options: rawOptions.map((text, idx) => ({ text, isCorrect: idx === correctIdx })),
          // Store the correct option's TEXT — identical shape to a manually-added
          // bank question, so quizzes built from it grade the same way.
          correctAnswers: correctIdx >= 0 ? [rawOptions[correctIdx]] : [],
          marks: parseInt(pick('marks', 'mark', 'points')) || 1,
          difficultyLevel: normalizeDifficulty(pick('difficulty', 'level')),
          tags: pick('tags', 'tag').split(';').map((t: string) => t.trim()).filter(Boolean),
          source: 'csv'
        };

        uploadedQuestions.push(newQuestion);
      }

      let imported = 0;
      for (const q of uploadedQuestions) {
        try {
          const created = await quizApi.createQuestionBankQuestion(q);
          setQuestions(prev => [created, ...prev]);
          imported++;
        } catch (err: any) {
          errors.push(`"${q.question.substring(0, 40)}...": ${err.message || 'Failed'}`);
        }
      }

      await fetchQuestionBank();
      const msg = `${imported} of ${uploadedQuestions.length} questions imported.`;
      setSuccessMessage(errors.length ? `${msg} ${errors.length} failed.` : msg);
      if (errors.length) setError(errors.join('\n'));
      setTimeout(() => setSuccessMessage(''), 5000);
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
      '"What is 2+2?",3,4,5,6,B,easy,1,math;basic\n' +
      '"Which keyword is used to create a class in Java?",class,Class,new,create,A,medium,2,java;oop\n' +
      '"What is the time complexity of binary search?","O(n)","O(log n)","O(n^2)","O(1)",B,hard,3,algorithms;search\n';
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

  // Open edit modal
  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    
    // Extract options text if they exist
    const optionTexts = question.options 
      ? question.options.map(opt => typeof opt === 'string' ? opt : opt.text)
      : ['', '', '', ''];
    
    // Find correct answer index
    let correctAnswerIndex = '0';
    if (question.options) {
      const correctIndex = question.options.findIndex(opt => 
        typeof opt === 'object' && opt.isCorrect
      );
      if (correctIndex >= 0) correctAnswerIndex = correctIndex.toString();
    }
    
    setEditForm({
      question: question.question,
      type: question.type,
      options: optionTexts.length >= 4 ? optionTexts.slice(0, 4) : [...optionTexts, ...Array(4 - optionTexts.length).fill('')],
      correctAnswer: correctAnswerIndex,
      marks: question.marks,
      difficulty: question.difficultyLevel || question.difficulty || 'medium',
      tags: (question.tags || []).join(', '),
      description: question.description || ''
    });
    setShowEditModal(true);
  };

  // Submit edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    try {
      setLoading(true);
      setError('');

      const updateData = {
        question: editForm.question,
        type: editForm.type,
        marks: editForm.marks,
        difficultyLevel: editForm.difficulty,
        tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        description: editForm.description,
        options: editForm.type.startsWith('mcq')
          ? editForm.options.filter(o => o.trim() !== '').map((text, idx) => ({
              text,
              isCorrect: idx === parseInt(editForm.correctAnswer)
            }))
          : undefined,
        correctAnswers: editForm.type.startsWith('mcq')
          ? [editForm.correctAnswer]
          : undefined
      };

      await quizApi.updateQuestionBankQuestion(editingQuestion._id, updateData);
      
      // Update local state
      const updatedQuestions = questions.map(q => 
        q._id === editingQuestion._id 
          ? { ...q, ...updateData, difficulty: updateData.difficultyLevel }
          : q
      );
      setQuestions(updatedQuestions);
      setFilteredQuestions(updatedQuestions.filter(q => {
        let match = true;
        if (searchTerm) match = match && q.question.toLowerCase().includes(searchTerm.toLowerCase());
        if (selectedTags.length > 0) match = match && selectedTags.some(tag => (q.tags || []).includes(tag));
        if (difficultyFilter) match = match && (q.difficultyLevel || q.difficulty) === difficultyFilter;
        return match;
      }));
      
      setSuccessMessage('Question updated successfully!');
      setShowEditModal(false);
      setEditingQuestion(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="question-bank">
      <div className="qb-header">
        <div>
          <h2>Question Bank</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          <button
            onClick={handleDedupe}
            disabled={dedupingBusy || loading}
            title="Find and remove duplicate questions, keeping one of each"
            style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: 13, color: '#b45309', cursor: dedupingBusy ? 'default' : 'pointer' }}
          >
            {dedupingBusy ? '⏳ Checking…' : '🧹 Remove duplicates'}
          </button>
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

              {/* Date Quick Filter */}
              <div className="qb-date-quick-filter">
                <span style={{ fontSize: 13, color: '#666', marginRight: 6 }}>Created:</span>
                {(['all', 'today', 'week'] as const).map(f => (
                  <button
                    key={f}
                    className={`qb-date-btn${dateQuickFilter === f ? ' active' : ''}`}
                    onClick={() => setDateQuickFilter(f)}
                  >
                    {f === 'all' ? 'All' : f === 'today' ? 'Today' : 'This Week'}
                  </button>
                ))}
              </div>

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
              <>
                <div className="qb-questions-list">
                  {filteredQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(question => (
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
                          onClick={() => handleEditQuestion(question)}
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

                {filteredQuestions.length > itemsPerPage && (
                  <div className="qb-pagination">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="qb-pagination-btn"
                    >
                      ← Previous
                    </Button>
                    <div className="qb-pagination-info">
                      Page {currentPage} of {Math.ceil(filteredQuestions.length / itemsPerPage)}
                            ({filteredQuestions.length} total questions)
                    </div>
                    <Button
                      onClick={() => setCurrentPage(prev => 
                        Math.min(Math.ceil(filteredQuestions.length / itemsPerPage), prev + 1)
                      )}
                      disabled={currentPage === Math.ceil(filteredQuestions.length / itemsPerPage)}
                      className="qb-pagination-btn"
                    >
                      Next →
                    </Button>
                  </div>
                )}
              </>
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

            <div className="qb-form-row">
              <div className="qb-form-group">
                <label>Subject <span style={{ color: '#ef4444' }}>*</span></label>
                <Input
                  type="text"
                  value={manualForm.subject}
                  onChange={(e) => setManualForm({ ...manualForm, subject: e.target.value })}
                  placeholder="e.g. Java, Python, DBMS"
                  required
                />
              </div>
              <div className="qb-form-group">
                <label>Topic <span style={{ color: '#ef4444' }}>*</span></label>
                <Input
                  type="text"
                  value={manualForm.topic}
                  onChange={(e) => setManualForm({ ...manualForm, topic: e.target.value })}
                  placeholder="e.g. Arrays, Joins, Inheritance"
                  required
                />
              </div>
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
                Expected columns: Question, Option A, Option B, Option C, Option D, Correct Answer, Difficulty, Marks, Tags.
                <br />
                <b>Correct Answer</b> can be the letter (A/B/C/D) or the exact answer text — either works. (The template uses letters.)
              </p>
            </div>
          </div>
        )}

        {/* AI Generate Tab */}
        {activeTab === 'ai' && (
          <div className="qb-ai-tab">
            {/* Generation Form */}
            {generatedQuestions.length === 0 ? (
              <div className="qb-ai-form-wrapper">
                <div className="qb-ai-hero">
                  <div className="qb-ai-hero-icon">🤖</div>
                  <h3>Generate Questions with AI</h3>
                  <p>Powered by GPT-4o-mini — describe your topic and get ready-to-use questions in seconds.</p>
                </div>

                <form
                  className="qb-ai-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!aiForm.subject.trim()) return;
                    try {
                      setAiGenerating(true);
                      setError('');
                      const topicStr = aiForm.topic.trim()
                        ? `${aiForm.subject.trim()} — ${aiForm.topic.trim()}`
                        : aiForm.subject.trim();
                      const res = await quizApi.generateAIQuestions({
                        topic: topicStr,
                        type: aiForm.type,
                        difficulty: aiForm.difficulty,
                        count: aiForm.count
                      });
                      setGeneratedQuestions(res.questions || []);
                      setSelectedGenerated(new Set((res.questions || []).map((_: any, i: number) => i)));
                    } catch (err: any) {
                      setError(err.message || 'Failed to generate questions');
                    } finally {
                      setAiGenerating(false);
                    }
                  }}
                >
                  <div className="qb-ai-form-row">
                    <div className="qb-ai-form-group full-width">
                      <label>Subject <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="text"
                        className="qb-ai-input"
                        placeholder="e.g. Java, Python, DBMS, Data Structures"
                        value={aiForm.subject}
                        onChange={(e) => setAiForm({ ...aiForm, subject: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="qb-ai-form-row">
                    <div className="qb-ai-form-group full-width">
                      <label>Topic / Subtopic *</label>
                      <input
                        type="text"
                        className="qb-ai-input"
                        placeholder="e.g. Java Arrays, SQL Joins, Python OOP, Data Structures"
                        value={aiForm.topic}
                        onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="qb-ai-form-row">
                    <div className="qb-ai-form-group">
                      <label>Question Type</label>
                      <select
                        className="qb-ai-select"
                        value={aiForm.type}
                        onChange={(e) => setAiForm({ ...aiForm, type: e.target.value })}
                      >
                        <option value="mcq_single">MCQ — Single Answer</option>
                        <option value="mcq_multiple">MCQ — Multiple Answers</option>
                        <option value="short_answer">Short Answer</option>
                      </select>
                    </div>

                    <div className="qb-ai-form-group">
                      <label>Difficulty</label>
                      <select
                        className="qb-ai-select"
                        value={aiForm.difficulty}
                        onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value })}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                        <option value="mixed">Mixed (Easy + Medium + Hard)</option>
                      </select>
                    </div>

                    <div className="qb-ai-form-group">
                      <label>Number of Questions</label>
                      <select
                        className="qb-ai-select"
                        value={aiForm.count}
                        onChange={(e) => setAiForm({ ...aiForm, count: parseInt(e.target.value) })}
                      >
                        {[5, 10, 15, 20].map(n => (
                          <option key={n} value={n}>{n} questions</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="qb-ai-generate-btn-row">
                    <button type="submit" className="qb-ai-generate-btn" disabled={aiGenerating || !aiForm.subject.trim()}>
                      {aiGenerating ? (
                        <><span className="qb-ai-spinner"></span> Generating {aiForm.count} questions…</>
                      ) : (
                        <> ✨ Generate {aiForm.count} Questions</>
                      )}
                    </button>
                    <p className="qb-ai-cost-note">~₹0.01 per generation • GPT-4o-mini</p>
                  </div>
                </form>
              </div>
            ) : (
              /* Preview Panel */
              <div className="qb-ai-preview">
                <div className="qb-ai-preview-header">
                  <div>
                    <h3>✨ {generatedQuestions.length} Questions Generated</h3>
                    <p>Subject: <strong>{aiForm.subject}</strong>{aiForm.topic ? ` · Topic: ${aiForm.topic}` : ''} · Review, edit inline, and save selected questions to the bank.</p>
                  </div>
                  <div className="qb-ai-preview-actions">
                    <button
                      className="qb-ai-btn-secondary"
                      onClick={() => {
                        setGeneratedQuestions([]);
                        setSelectedGenerated(new Set());
                        setError('');
                      }}
                    >
                      ← Generate Again
                    </button>
                    <button
                      className="qb-ai-btn-secondary"
                      onClick={() => {
                        if (selectedGenerated.size === generatedQuestions.length) {
                          setSelectedGenerated(new Set());
                        } else {
                          setSelectedGenerated(new Set(generatedQuestions.map((_: any, i: number) => i)));
                        }
                      }}
                    >
                      {selectedGenerated.size === generatedQuestions.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      className="qb-ai-save-btn"
                      disabled={aiSaving || selectedGenerated.size === 0}
                      onClick={async () => {
                        try {
                          setAiSaving(true);
                          setError('');
                          const toSave = generatedQuestions.filter((_: any, i: number) => selectedGenerated.has(i));
                          let saved = 0;
                          const errors: string[] = [];
                          for (const q of toSave) {
                            try {
                              const payload: any = {
                                question: q.question,
                                type: q.type,
                                difficultyLevel: q.difficultyLevel,
                                marks: q.marks,
                                tags: q.tags || [],
                                subject: aiForm.subject || undefined,
                                topic: aiForm.topic || undefined,
                                source: 'ai',
                                explanation: q.explanation || ''
                              };
                              if (q.type === 'short_answer') {
                                payload.correctAnswerText = q.correctAnswerText || '';
                              } else {
                                payload.options = (q.options || []).map((opt: any) => ({
                                  text: typeof opt === 'string' ? opt : opt.text,
                                  isCorrect: typeof opt === 'object' ? opt.isCorrect : false
                                }));
                                const correctIdx = (q.options || []).findIndex((o: any) =>
                                  typeof o === 'object' ? o.isCorrect : false
                                );
                                payload.correctAnswers = [(correctIdx >= 0 ? correctIdx : 0).toString()];
                              }
                              await quizApi.createQuestionBankQuestion(payload);
                              saved++;
                            } catch (err: any) {
                              errors.push(err.message || 'Failed to save a question');
                            }
                          }
                          await fetchQuestionBank();
                          setSuccessMessage(`${saved} question${saved !== 1 ? 's' : ''} saved to Question Bank!`);
                          if (errors.length) setError(errors.join('\n'));
                          setGeneratedQuestions([]);
                          setSelectedGenerated(new Set());
                          setActiveTab('view');
                          setTimeout(() => setSuccessMessage(''), 5000);
                        } catch (err: any) {
                          setError(err.message || 'Failed to save questions');
                        } finally {
                          setAiSaving(false);
                        }
                      }}
                    >
                      {aiSaving ? 'Saving…' : `💾 Save ${selectedGenerated.size} to Bank`}
                    </button>
                  </div>
                </div>

                <div className="qb-ai-cards">
                  {generatedQuestions.map((q: any, idx: number) => (
                    <div
                      key={idx}
                      className={`qb-ai-card ${selectedGenerated.has(idx) ? 'selected' : 'deselected'}`}
                      onClick={() => {
                        const next = new Set(selectedGenerated);
                        if (next.has(idx)) next.delete(idx); else next.add(idx);
                        setSelectedGenerated(next);
                      }}
                    >
                      <div className="qb-ai-card-check">
                        <input
                          type="checkbox"
                          checked={selectedGenerated.has(idx)}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className="qb-ai-card-body">
                        <div className="qb-ai-card-meta">
                          <span className={`qb-ai-badge diff-${q.difficultyLevel}`}>{q.difficultyLevel}</span>
                          <span className="qb-ai-badge">{q.type.replace('_', ' ')}</span>
                          <span className="qb-ai-badge">{q.marks}pt</span>
                          <span className="qb-ai-badge ai-badge">🤖 AI</span>
                        </div>

                        <p className="qb-ai-card-question">
                          <strong>Q{idx + 1}.</strong> {q.question}
                        </p>

                        {q.options && q.options.length > 0 && (
                          <div className="qb-ai-card-options">
                            {q.options.map((opt: any, oi: number) => (
                              <div
                                key={oi}
                                className={`qb-ai-option ${
                                  (typeof opt === 'object' ? opt.isCorrect : false) ? 'correct' : ''
                                }`}
                              >
                                <span className="opt-label">{String.fromCharCode(65 + oi)}.</span>
                                <span>{typeof opt === 'string' ? opt : opt.text}</span>
                                {(typeof opt === 'object' ? opt.isCorrect : false) && (
                                  <span className="opt-tick">✓</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {q.correctAnswerText && (
                          <div className="qb-ai-answer">
                            <strong>Answer:</strong> {q.correctAnswerText}
                          </div>
                        )}

                        {q.explanation && (
                          <div className="qb-ai-explanation">
                            <strong>Explanation:</strong> {q.explanation}
                          </div>
                        )}

                        {q.tags && q.tags.length > 0 && (
                          <div className="qb-ai-card-tags">
                            {q.tags.map((tag: string) => (
                              <span key={tag} className="qb-tag">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Question Modal */}
      {showEditModal && editingQuestion && (
        <div className="qb-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="qb-modal" onClick={e => e.stopPropagation()}>
            <div className="qb-modal-header">
              <h2>Edit Question</h2>
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>✕</Button>
            </div>
            <form onSubmit={handleEditSubmit} className="qb-edit-form">
              <div className="form-group">
                <label>Question Text *</label>
                <textarea
                  value={editForm.question}
                  onChange={e => setEditForm({...editForm, question: e.target.value})}
                  required
                  rows={3}
                  placeholder="Enter your question"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={editForm.type}
                    onChange={e => setEditForm({...editForm, type: e.target.value})}
                  >
                    <option value="mcq_single">MCQ (Single)</option>
                    <option value="mcq_multiple">MCQ (Multiple)</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Difficulty</label>
                  <select
                    value={editForm.difficulty}
                    onChange={e => setEditForm({...editForm, difficulty: e.target.value})}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Marks</label>
                  <Input
                    type="number"
                    value={editForm.marks}
                    onChange={e => setEditForm({...editForm, marks: parseInt(e.target.value) || 1})}
                    min={1}
                  />
                </div>
              </div>

              {editForm.type.startsWith('mcq') && (
                <div className="form-group">
                  <label>Options</label>
                  {editForm.options.map((option, idx) => (
                    <div key={idx} className="option-row">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={editForm.correctAnswer === idx.toString()}
                        onChange={() => setEditForm({...editForm, correctAnswer: idx.toString()})}
                      />
                      <Input
                        value={option}
                        onChange={e => {
                          const newOptions = [...editForm.options];
                          newOptions[idx] = e.target.value;
                          setEditForm({...editForm, options: newOptions});
                        }}
                        placeholder={`Option ${idx + 1}`}
                      />
                    </div>
                  ))}
                  <small>Select the radio button for the correct answer</small>
                </div>
              )}

              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <Input
                  value={editForm.tags}
                  onChange={e => setEditForm({...editForm, tags: e.target.value})}
                  placeholder="java, loops, basics"
                />
              </div>

              <div className="form-group">
                <label>Description/Explanation</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                  rows={2}
                  placeholder="Optional explanation or hint"
                />
              </div>

              <div className="qb-modal-actions">
                <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
