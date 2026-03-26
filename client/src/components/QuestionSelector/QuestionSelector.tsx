import React, { useState, useEffect, useCallback } from 'react';
import './QuestionSelector.css';
import Input from '../common/Input';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import Alert from '../common/Alert';
import { quizApi } from '../../api';

interface Question {
  _id: string;
  question: string;
  type: string;
  difficulty?: string;
  difficultyLevel?: string;
  marks: number;
  tags?: string[];
  usageCount: number;
  subject?: string;
  topic?: string;
  source?: string;
}

interface QuestionSelectorProps {
  quizId: string;
  onQuestionsLinked?: (count: number, totalMarks: number) => void;
  onClose?: () => void;
}

const QuestionSelector: React.FC<QuestionSelectorProps> = ({
  quizId,
  onQuestionsLinked,
  onClose
}) => {
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [filters, setFilters] = useState({
    search: '',
    difficulty: '',
    tags: [] as string[],
    source: '',
    subject: '',
    topic: '',
    dateFrom: '',
    dateTo: ''
  });

  const [stats, setStats] = useState({
    totalMarks: 0,
    questionCount: 0
  });

  // Fetch available questions
  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [questionsResponse] = await Promise.all([
        quizApi.getAvailableQuestions(quizId, {
          difficulty: filters.difficulty || undefined,
          type: undefined,
          tags: filters.tags.length > 0 ? filters.tags : undefined,
          source: filters.source || undefined,
          subject: filters.subject || undefined,
          topic: filters.topic || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined
        })
      ]);

      // Handle response data format (might be wrapped in .data or .questions)
      const questions = Array.isArray(questionsResponse) 
        ? questionsResponse 
        : questionsResponse?.data || questionsResponse?.questions || [];
      
      setAvailableQuestions(questions);
    } catch (err: any) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [quizId, filters]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Apply search filter
  useEffect(() => {
    let filtered = availableQuestions;

    if (filters.search) {
      filtered = filtered.filter(q =>
        q.question.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredQuestions(filtered);
  }, [filters.search, availableQuestions]);

  // Handle question selection
  const toggleQuestion = (questionId: string, marks: number) => {
    const newSelected = new Set(selectedQuestions);

    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
      setStats({
        totalMarks: Math.max(stats.totalMarks - marks, 0),
        questionCount: stats.questionCount - 1
      });
    } else {
      newSelected.add(questionId);
      setStats({
        totalMarks: stats.totalMarks + marks,
        questionCount: stats.questionCount + 1
      });
    }

    setSelectedQuestions(newSelected);
  };

  // Link selected questions to quiz
  const handleLinkQuestions = async () => {
    if (selectedQuestions.size === 0) {
      setError('Please select at least one question');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const questionIds = Array.from(selectedQuestions);
      await quizApi.linkQuestionsToQuiz(quizId, questionIds);

      setSuccessMessage(`Successfully linked ${selectedQuestions.size} questions`);
      onQuestionsLinked?.(stats.questionCount, stats.totalMarks);

      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to link questions');
    } finally {
      setLoading(false);
    }
  };

  // Select all/none
  const handleSelectAll = () => {
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set());
      setStats({ totalMarks: 0, questionCount: 0 });
    } else {
      const allIds = new Set(filteredQuestions.map(q => q._id));
      setSelectedQuestions(allIds);
      const totalMarks = filteredQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
      setStats({ totalMarks, questionCount: filteredQuestions.length });
    }
  };

  return (
    <div className="question-selector">
      <div className="qs-header">
        <h2>Select Questions from Question Bank</h2>
        <p>Choose which questions to include in this quiz</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage('')} />}

      {/* Stats */}
      <div className="qs-stats">
        <div className="qs-stat">
          <span>Selected Questions:</span>
          <strong>{stats.questionCount}</strong>
        </div>
        <div className="qs-stat">
          <span>Total Marks:</span>
          <strong>{stats.totalMarks}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="qs-filters">
        <Input
          type="text"
          placeholder="Search questions..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="qs-search"
        />

        <select
          value={filters.difficulty}
          onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
          className="qs-select"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select
          value={filters.source}
          onChange={(e) => setFilters({ ...filters, source: e.target.value })}
          className="qs-select"
        >
          <option value="">All Sources</option>
          <option value="manual">Manual</option>
          <option value="csv">CSV Import</option>
          <option value="ai">AI Generated</option>
        </select>

        <Input
          type="text"
          placeholder="Filter by subject..."
          value={filters.subject}
          onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
          className="qs-search"
        />

        <Input
          type="text"
          placeholder="Filter by topic..."
          value={filters.topic}
          onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
          className="qs-search"
        />

        <div className="qs-date-range">
          <Input
            type="date"
            placeholder="From date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
          <Input
            type="date"
            placeholder="To date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
        </div>

        <Button
          onClick={handleSelectAll}
          variant="secondary"
        >
          {selectedQuestions.size === filteredQuestions.length && filteredQuestions.length > 0
            ? 'Deselect All'
            : 'Select All'}
        </Button>
      </div>

      {/* Questions List */}
      {loading ? (
        <Spinner />
      ) : filteredQuestions.length === 0 ? (
        <p className="qs-empty">No questions available</p>
      ) : (
        <div className="qs-questions-list">
          {filteredQuestions.map(question => (
            <div key={question._id} className="qs-question-item">
              <label className="qs-question-checkbox">
                <input
                  type="checkbox"
                  checked={selectedQuestions.has(question._id)}
                  onChange={() => toggleQuestion(question._id, question.marks || 0)}
                />
                <div className="qs-question-content">
                  <h4>{question.question}</h4>
                  <div className="qs-question-meta">
                    <span className="qs-badge">{question.type}</span>
                    <span className="qs-badge">
                      {question.difficultyLevel || question.difficulty}
                    </span>
                    <span className="qs-badge">{question.marks}pts</span>
                    <span className="qs-badge-secondary">Used: {question.usageCount}x</span>
                    {question.subject && <span className="qs-badge-secondary">📚 {question.subject}</span>}
                    {question.topic && <span className="qs-badge-secondary">🏷️ {question.topic}</span>}
                    {question.source && <span className="qs-badge-secondary">{question.source}</span>}
                  </div>
                  {question.tags && question.tags.length > 0 && (
                    <div className="qs-tags">
                      {question.tags.map(tag => (
                        <span key={tag} className="qs-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="qs-footer">
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          onClick={handleLinkQuestions}
          disabled={loading || selectedQuestions.size === 0}
        >
          {loading ? 'Linking...' : `Link ${stats.questionCount} Questions`}
        </Button>
      </div>
    </div>
  );
};

export default QuestionSelector;
