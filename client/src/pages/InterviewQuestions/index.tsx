import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewQuestionApi, chapterApi } from '../../api';
import { Spinner, Alert } from '../../components/common';
import './InterviewQuestions.css';

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
}

interface StudentProgress {
  questionId: string;
  status: 'not_reviewed' | 'reviewing' | 'understood' | 'confident';
  notes?: string;
  reviewCount: number;
}

interface Chapter {
  _id: string;
  title: string;
  courseId: string;
  subjectId: string;
}

const InterviewQuestionsPage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, StudentProgress>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [savingProgress, setSavingProgress] = useState<string | null>(null);

  useEffect(() => {
    if (chapterId) {
      fetchData();
    }
  }, [chapterId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch chapter details
      const chapterRes = await chapterApi.getChapterById(chapterId!);
      setChapter(chapterRes.data);

      // Fetch questions
      const questionsRes = await interviewQuestionApi.getQuestionsByChapter(chapterId!);
      setQuestions(questionsRes.data || []);

      // Fetch student progress
      try {
        const progressRes = await interviewQuestionApi.getStudentProgress(chapterId!);
        const progressData = progressRes.data || [];
        const map: Record<string, StudentProgress> = {};
        progressData.forEach((p: any) => {
          map[p.questionId._id || p.questionId] = p;
        });
        setProgressMap(map);
      } catch (err) {
        // Progress might not exist yet
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load interview questions');
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const updateProgress = async (questionId: string, status: StudentProgress['status']) => {
    if (!chapterId) return;
    
    setSavingProgress(questionId);
    try {
      await interviewQuestionApi.updateStudentProgress(questionId, {
        status,
        chapterId
      });
      
      setProgressMap(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          questionId,
          status,
          reviewCount: (prev[questionId]?.reviewCount || 0) + 1
        }
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to update progress');
    } finally {
      setSavingProgress(null);
    }
  };

  const markHelpful = async (questionId: string) => {
    try {
      await interviewQuestionApi.markHelpful(questionId);
      setQuestions(prev => prev.map(q => 
        q._id === questionId ? { ...q, helpfulCount: q.helpfulCount + 1 } : q
      ));
    } catch (err) {
      // Silent fail
    }
  };

  const filteredQuestions = questions.filter(q => {
    // Status filter
    if (filter !== 'all') {
      const progress = progressMap[q._id];
      const status = progress?.status || 'not_reviewed';
      if (filter === 'confident' && status !== 'confident') return false;
      if (filter === 'reviewing' && status !== 'reviewing' && status !== 'understood') return false;
      if (filter === 'not_reviewed' && status !== 'not_reviewed') return false;
    }
    
    // Difficulty filter
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    
    return true;
  });

  const stats = {
    total: questions.length,
    confident: questions.filter(q => progressMap[q._id]?.status === 'confident').length,
    reviewing: questions.filter(q => ['reviewing', 'understood'].includes(progressMap[q._id]?.status || '')).length,
    notReviewed: questions.filter(q => !progressMap[q._id] || progressMap[q._id].status === 'not_reviewed').length
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'confident': return '#10b981';
      case 'understood': return '#3b82f6';
      case 'reviewing': return '#f59e0b';
      default: return '#94a3b8';
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'confident': return '✓';
      case 'understood': return '◐';
      case 'reviewing': return '○';
      default: return '○';
    }
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="interview-questions-page">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="iq-header">
        <div className="iq-header-left">
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
          <div className="iq-title-section">
            <h1>Interview Questions</h1>
            {chapter && <span className="chapter-name">{chapter.title}</span>}
          </div>
        </div>
        
        <div className="iq-stats">
          <div className="stat-item confident">
            <span className="stat-value">{stats.confident}</span>
            <span className="stat-label">Confident</span>
          </div>
          <div className="stat-item reviewing">
            <span className="stat-value">{stats.reviewing}</span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat-item not-reviewed">
            <span className="stat-value">{stats.notReviewed}</span>
            <span className="stat-label">Not Reviewed</span>
          </div>
          <div className="stat-item total">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
      </div>

      <div className="iq-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Questions</option>
            <option value="confident">Confident</option>
            <option value="reviewing">In Progress</option>
            <option value="not_reviewed">Not Reviewed</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Difficulty:</label>
          <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="questions-list">
        {filteredQuestions.length === 0 ? (
          <div className="no-questions">
            <p>No questions match your filters.</p>
          </div>
        ) : (
          filteredQuestions.map((q, index) => {
            const progress = progressMap[q._id];
            const isExpanded = expandedQuestions.has(q._id);
            
            return (
              <div key={q._id} className={`question-card ${isExpanded ? 'expanded' : ''}`}>
                <div className="question-header" onClick={() => toggleQuestion(q._id)}>
                  <div className="question-number-status">
                    <span 
                      className="status-indicator"
                      style={{ backgroundColor: getStatusColor(progress?.status) }}
                    >
                      {getStatusIcon(progress?.status)}
                    </span>
                    <span className="question-number">Q{index + 1}</span>
                  </div>
                  
                  <div className="question-preview">
                    <p className="question-text">{q.question}</p>
                    <div className="question-meta">
                      <span className={`difficulty-badge ${q.difficulty}`}>{q.difficulty}</span>
                      <span className="category-badge">{q.category}</span>
                      {q.companyTags.length > 0 && (
                        <span className="company-tags">
                          {q.companyTags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="company-tag">{tag}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <span className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>▼</span>
                </div>
                
                {isExpanded && (
                  <div className="question-body">
                    <div className="answer-section">
                      <h4>Answer:</h4>
                      <div className="answer-content">{q.answer}</div>
                    </div>
                    
                    {q.explanation && (
                      <div className="explanation-section">
                        <h4>Explanation:</h4>
                        <div className="explanation-content">{q.explanation}</div>
                      </div>
                    )}
                    
                    {q.tags.length > 0 && (
                      <div className="tags-section">
                        {q.tags.map((tag, i) => (
                          <span key={i} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                    
                    <div className="question-actions">
                      <div className="confidence-buttons">
                        <span className="confidence-label">Mark confidence:</span>
                        <button 
                          className={`confidence-btn ${progress?.status === 'reviewing' ? 'active' : ''}`}
                          onClick={() => updateProgress(q._id, 'reviewing')}
                          disabled={savingProgress === q._id}
                        >
                          🔄 Reviewing
                        </button>
                        <button 
                          className={`confidence-btn ${progress?.status === 'understood' ? 'active' : ''}`}
                          onClick={() => updateProgress(q._id, 'understood')}
                          disabled={savingProgress === q._id}
                        >
                          💡 Understood
                        </button>
                        <button 
                          className={`confidence-btn confident ${progress?.status === 'confident' ? 'active' : ''}`}
                          onClick={() => updateProgress(q._id, 'confident')}
                          disabled={savingProgress === q._id}
                        >
                          ✓ Confident
                        </button>
                      </div>
                      
                      <button 
                        className="helpful-btn"
                        onClick={() => markHelpful(q._id)}
                      >
                        👍 Helpful ({q.helpfulCount})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default InterviewQuestionsPage;
