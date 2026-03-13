import React, { useEffect, useState } from 'react';
import { interviewQuestionApi, courseApi, subjectApi, chapterApi } from '../../api';
import { Spinner, Alert, Button } from '../../components/common';
import './InterviewQuestionBank.css';

interface InterviewQuestion {
  _id: string;
  question: string;
  answer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  companyTags: string[];
  tags: string[];
  order: number;
  viewCount: number;
  helpfulCount: number;
  chapterId: { _id: string; title: string };
  subjectId: { _id: string; name: string };
  courseId: { _id: string; title: string };
  createdBy: { firstName: string; lastName: string };
  createdAt: string;
}

interface Course {
  _id: string;
  title: string;
}

interface Subject {
  _id: string;
  name: string;
  courseId: string;
}

interface Chapter {
  _id: string;
  title: string;
  subjectId: string;
}

const InterviewQuestionBankPage: React.FC = () => {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter state
  const [filterCourse, setFilterCourse] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterChapter, setFilterChapter] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<InterviewQuestion | null>(null);
  const [formData, setFormData] = useState({
    courseId: '',
    subjectId: '',
    chapterId: '',
    question: '',
    answer: '',
    explanation: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    category: 'conceptual',
    companyTags: '',
    tags: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkData, setBulkData] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch courses
      const coursesRes = await courseApi.getCourses();
      setCourses(coursesRes.data || []);
      
      // Fetch all questions
      await fetchQuestions();
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await interviewQuestionApi.getAllQuestions({
        difficulty: filterDifficulty || undefined,
        search: searchQuery || undefined
      });
      setQuestions(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load questions');
    }
  };

  const handleCourseChange = async (courseId: string) => {
    setFilterCourse(courseId);
    setFilterSubject('');
    setFilterChapter('');
    setFormData(prev => ({ ...prev, courseId, subjectId: '', chapterId: '' }));
    
    if (courseId) {
      try {
        const res = await subjectApi.getSubjectsByCourse(courseId);
        setSubjects(res.data || []);
      } catch (err) {
        setSubjects([]);
      }
    } else {
      setSubjects([]);
    }
    setChapters([]);
  };

  const handleSubjectChange = async (subjectId: string) => {
    setFilterSubject(subjectId);
    setFilterChapter('');
    setFormData(prev => ({ ...prev, subjectId, chapterId: '' }));
    
    if (subjectId) {
      try {
        const res = await chapterApi.getChaptersBySubject(subjectId);
        setChapters(res.data || []);
      } catch (err) {
        setChapters([]);
      }
    } else {
      setChapters([]);
    }
  };

  const handleChapterChange = (chapterId: string) => {
    setFilterChapter(chapterId);
    setFormData(prev => ({ ...prev, chapterId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.courseId || !formData.subjectId || !formData.chapterId || !formData.question || !formData.answer) {
      setError('Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      const questionData = {
        courseId: formData.courseId,
        subjectId: formData.subjectId,
        chapterId: formData.chapterId,
        question: formData.question,
        answer: formData.answer,
        explanation: formData.explanation || undefined,
        difficulty: formData.difficulty,
        category: formData.category,
        companyTags: formData.companyTags.split(',').map(t => t.trim()).filter(Boolean),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      
      if (editingQuestion) {
        await interviewQuestionApi.updateQuestion(editingQuestion._id, questionData);
        setSuccess('Question updated successfully');
      } else {
        await interviewQuestionApi.createQuestion(questionData);
        setSuccess('Question created successfully');
      }
      
      resetForm();
      await fetchQuestions();
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (q: InterviewQuestion) => {
    setEditingQuestion(q);
    
    // Load subjects and chapters for the question's course
    const courseId = typeof q.courseId === 'object' ? q.courseId._id : q.courseId;
    const subjectId = typeof q.subjectId === 'object' ? q.subjectId._id : q.subjectId;
    const chapterId = typeof q.chapterId === 'object' ? q.chapterId._id : q.chapterId;
    
    await handleCourseChange(courseId);
    await handleSubjectChange(subjectId);
    
    setFormData({
      courseId,
      subjectId,
      chapterId,
      question: q.question,
      answer: q.answer,
      explanation: q.explanation || '',
      difficulty: q.difficulty,
      category: q.category,
      companyTags: q.companyTags.join(', '),
      tags: q.tags.join(', ')
    });
    
    setShowForm(true);
  };

  const handleDelete = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    
    try {
      await interviewQuestionApi.deleteQuestion(questionId);
      setSuccess('Question deleted successfully');
      await fetchQuestions();
    } catch (err: any) {
      setError(err.message || 'Failed to delete question');
    }
  };

  const handleBulkUpload = async () => {
    if (!formData.chapterId) {
      setError('Please select a chapter for bulk upload');
      return;
    }
    
    try {
      const lines = bulkData.trim().split('\n');
      const questions = [];
      
      for (const line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 2) {
          questions.push({
            courseId: formData.courseId,
            subjectId: formData.subjectId,
            chapterId: formData.chapterId,
            question: parts[0],
            answer: parts[1],
            explanation: parts[2] || '',
            difficulty: (parts[3] as 'easy' | 'medium' | 'hard') || 'medium',
            category: parts[4] || 'conceptual',
            companyTags: parts[5] ? parts[5].split(',').map(t => t.trim()) : [],
            tags: parts[6] ? parts[6].split(',').map(t => t.trim()) : []
          });
        }
      }
      
      if (questions.length === 0) {
        setError('No valid questions found in the input');
        return;
      }
      
      setSubmitting(true);
      await interviewQuestionApi.bulkCreateQuestions(questions);
      setSuccess(`${questions.length} questions uploaded successfully`);
      setBulkData('');
      setShowBulkUpload(false);
      await fetchQuestions();
    } catch (err: any) {
      setError(err.message || 'Failed to upload questions');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      courseId: filterCourse,
      subjectId: filterSubject,
      chapterId: filterChapter,
      question: '',
      answer: '',
      explanation: '',
      difficulty: 'medium',
      category: 'conceptual',
      companyTags: '',
      tags: ''
    });
    setEditingQuestion(null);
    setShowForm(false);
  };

  const filteredQuestions = questions.filter(q => {
    if (filterCourse && (typeof q.courseId === 'object' ? q.courseId._id : q.courseId) !== filterCourse) return false;
    if (filterSubject && (typeof q.subjectId === 'object' ? q.subjectId._id : q.subjectId) !== filterSubject) return false;
    if (filterChapter && (typeof q.chapterId === 'object' ? q.chapterId._id : q.chapterId) !== filterChapter) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return q.question.toLowerCase().includes(query) || 
             q.answer.toLowerCase().includes(query) ||
             q.tags.some(t => t.toLowerCase().includes(query)) ||
             q.companyTags.some(t => t.toLowerCase().includes(query));
    }
    return true;
  });

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="interview-question-bank-page">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="page-header">
        <div className="header-left">
          <h1>Interview Question Bank</h1>
          <span className="question-count">{filteredQuestions.length} questions</span>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={() => setShowBulkUpload(!showBulkUpload)}>
            📤 Bulk Upload
          </Button>
          <Button variant="primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? 'Cancel' : '+ Add Question'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>Course</label>
            <select value={filterCourse} onChange={(e) => handleCourseChange(e.target.value)}>
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Subject</label>
            <select value={filterSubject} onChange={(e) => handleSubjectChange(e.target.value)} disabled={!filterCourse}>
              <option value="">All Subjects</option>
              {subjects.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Chapter</label>
            <select value={filterChapter} onChange={(e) => handleChapterChange(e.target.value)} disabled={!filterSubject}>
              <option value="">All Chapters</option>
              {chapters.map(c => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Difficulty</label>
            <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)}>
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="filter-group search">
            <label>Search</label>
            <input 
              type="text" 
              placeholder="Search questions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Bulk Upload Panel */}
      {showBulkUpload && (
        <div className="bulk-upload-panel">
          <h3>Bulk Upload Questions</h3>
          <p className="help-text">
            Enter one question per line in format:<br/>
            <code>Question | Answer | Explanation | Difficulty | Category | CompanyTags | Tags</code><br/>
            <small>Only Question and Answer are required. CompanyTags and Tags are comma-separated.</small>
          </p>
          <div className="bulk-selectors">
            <select value={formData.courseId} onChange={(e) => handleCourseChange(e.target.value)} required>
              <option value="">Select Course *</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
            <select value={formData.subjectId} onChange={(e) => handleSubjectChange(e.target.value)} disabled={!formData.courseId} required>
              <option value="">Select Subject *</option>
              {subjects.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
            <select value={formData.chapterId} onChange={(e) => setFormData(prev => ({ ...prev, chapterId: e.target.value }))} disabled={!formData.subjectId} required>
              <option value="">Select Chapter *</option>
              {chapters.map(c => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>
          <textarea
            value={bulkData}
            onChange={(e) => setBulkData(e.target.value)}
            placeholder="What is Java? | Java is a high-level programming language | medium | conceptual | Google,Amazon | java,oop"
            rows={8}
          />
          <div className="bulk-actions">
            <Button variant="secondary" onClick={() => setShowBulkUpload(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleBulkUpload} disabled={submitting || !formData.chapterId}>
              {submitting ? 'Uploading...' : 'Upload Questions'}
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="question-form-panel">
          <h3>{editingQuestion ? 'Edit Question' : 'Add New Question'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Course *</label>
                <select value={formData.courseId} onChange={(e) => handleCourseChange(e.target.value)} required>
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <select value={formData.subjectId} onChange={(e) => handleSubjectChange(e.target.value)} disabled={!formData.courseId} required>
                  <option value="">Select Subject</option>
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Chapter *</label>
                <select value={formData.chapterId} onChange={(e) => setFormData(prev => ({ ...prev, chapterId: e.target.value }))} disabled={!formData.subjectId} required>
                  <option value="">Select Chapter</option>
                  {chapters.map(c => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Question *</label>
              <textarea 
                value={formData.question} 
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                placeholder="Enter the interview question"
                rows={3}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Answer *</label>
              <textarea 
                value={formData.answer} 
                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                placeholder="Enter the answer"
                rows={5}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Explanation (Optional)</label>
              <textarea 
                value={formData.explanation} 
                onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                placeholder="Additional explanation or tips"
                rows={3}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Difficulty</label>
                <select value={formData.difficulty} onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}>
                  <option value="conceptual">Conceptual</option>
                  <option value="coding">Coding</option>
                  <option value="scenario">Scenario-based</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="system-design">System Design</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Company Tags (comma-separated)</label>
                <input 
                  type="text"
                  value={formData.companyTags}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyTags: e.target.value }))}
                  placeholder="Google, Amazon, Microsoft"
                />
              </div>
              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input 
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="java, oop, inheritance"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Saving...' : (editingQuestion ? 'Update Question' : 'Add Question')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Questions Table */}
      <div className="questions-table-container">
        {filteredQuestions.length === 0 ? (
          <div className="no-questions">
            <p>No questions found. {filterCourse || filterSubject || filterChapter ? 'Try adjusting your filters.' : 'Start by adding some questions.'}</p>
          </div>
        ) : (
          <table className="questions-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Chapter</th>
                <th>Difficulty</th>
                <th>Category</th>
                <th>Companies</th>
                <th>Stats</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((q, index) => (
                <tr key={q._id}>
                  <td>{index + 1}</td>
                  <td className="question-cell">
                    <div className="question-preview">{q.question.length > 100 ? q.question.substring(0, 100) + '...' : q.question}</div>
                    {q.tags.length > 0 && (
                      <div className="question-tags">
                        {q.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="chapter-info">
                      <span className="chapter-name">{typeof q.chapterId === 'object' ? q.chapterId.title : 'N/A'}</span>
                      <span className="subject-name">{typeof q.subjectId === 'object' ? q.subjectId.name : ''}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`difficulty-badge ${q.difficulty}`}>{q.difficulty}</span>
                  </td>
                  <td>{q.category}</td>
                  <td>
                    {q.companyTags.length > 0 ? (
                      <div className="company-tags">
                        {q.companyTags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="company-tag">{tag}</span>
                        ))}
                        {q.companyTags.length > 2 && <span className="more">+{q.companyTags.length - 2}</span>}
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <div className="stats">
                      <span title="Views">👁 {q.viewCount}</span>
                      <span title="Helpful">👍 {q.helpfulCount}</span>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="edit-btn" onClick={() => handleEdit(q)} title="Edit">✏️</button>
                      <button className="delete-btn" onClick={() => handleDelete(q._id)} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default InterviewQuestionBankPage;
