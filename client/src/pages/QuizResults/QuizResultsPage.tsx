import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { quizApi } from '../../api';
import { Button, Spinner, Alert } from '../../components/common';
import ShareOnLinkedIn from '../../components/common/ShareOnLinkedIn';
import './QuizResultsPage.css';

interface QuizResult {
  attemptId: string;
  quizTitle: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  totalTime: number;
  questionsAnswered: number;
  totalQuestions: number;
  submittedAt: string;
  shareToken?: string;
}

interface QuestionResult {
  questionId: string;
  questionText: string;
  isCorrect: boolean;
  selectedAnswer: string;
  correctAnswer: string;
  marksAwarded: number;
  maxMarks: number;
  feedback?: string;
}

const QuizResultsPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');

  useEffect(() => {
    const fetchResults = async () => {
      if (!attemptId) {
        setError('No attempt ID provided');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await quizApi.getStudentAttemptResults(attemptId);
        const data = res.data || res;
        setResult(data?.attempt);
        setQuestionResults(data?.answers || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [attemptId]);

  const correctCount = useMemo(() => questionResults.filter((q) => q.isCorrect).length, [questionResults]);
  const incorrectCount = useMemo(() => questionResults.filter((q) => !q.isCorrect).length, [questionResults]);
  const filteredQuestions = useMemo(() => questionResults.filter((q) => {
    if (filter === 'correct') return q.isCorrect;
    if (filter === 'incorrect') return !q.isCorrect;
    return true;
  }), [filter, questionResults]);

  if (loading) return <Spinner fullScreen />;

  if (!result) {
    return (
      <div className="qrr-page">
        <Alert type="error" message={error || 'Unable to load quiz results'} onClose={() => {}} />
      </div>
    );
  }

  const unansweredCount = Math.max(0, result.totalQuestions - result.questionsAnswered);
  const roundedPercentage = Math.round(result.percentage);
  const answeredPercent = result.totalQuestions ? Math.round((result.questionsAnswered / result.totalQuestions) * 100) : 0;
  const correctPercent = result.totalQuestions ? Math.round((correctCount / result.totalQuestions) * 100) : 0;
  const incorrectPercent = result.totalQuestions ? Math.round((incorrectCount / result.totalQuestions) * 100) : 0;

  const formatTime = (seconds: number): string => {
    const totalSeconds = Math.max(0, Math.round(seconds || 0));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const timeTaken = formatTime(result.timeSpent);
  const totalTime = formatTime((result.totalTime || 0) * 60);
  const ringStyle: React.CSSProperties = {
    background: `conic-gradient(#16a36a 0 ${Math.max(0, Math.min(100, roundedPercentage))}%, #e9eef4 ${Math.max(0, Math.min(100, roundedPercentage))}% 100%)`,
  };

  return (
    <div className="qrr-page">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="qrr-head">
        <button className="qrr-back-link" onClick={() => window.location.href = '/quizzes'}>
          <i className="bi bi-arrow-left" /> Back to My Quizzes
        </button>
        <div className="qrr-head-row">
          <div>
            <h1>Quiz Result &amp; Review</h1>
            <p>Detailed analysis of your performance. Review your answers and learn from mistakes.</p>
          </div>
          <div className="qrr-head-actions">
            <Button className="qrr-outline-btn" onClick={() => window.print()}>
              <i className="bi bi-download" /> Download Report
            </Button>
            <Button className="qrr-primary-btn" onClick={() => window.location.href = '/quizzes'}>
              Back to Quizzes
            </Button>
          </div>
        </div>
      </div>

      <section className="qrr-hero-card">
        <div className={`qrr-trophy ${result.passed ? 'passed' : 'failed'}`}>
          <i className={`bi ${result.passed ? 'bi-trophy-fill' : 'bi-graph-up-arrow'}`} />
        </div>
        <div className="qrr-hero-title">
          <span className={`qrr-status ${result.passed ? 'passed' : 'failed'}`}>{result.passed ? 'Completed · Passed' : 'Completed'}</span>
          <h2>{result.quizTitle}</h2>
          <div className="qrr-meta-row">
            <span><i className="bi bi-ui-checks" /> {result.totalQuestions} Questions</span>
            <span><i className="bi bi-clock" /> {result.totalTime} Minutes</span>
            <span><i className="bi bi-bullseye" /> {result.totalMarks} Marks</span>
          </div>
          <small>Completed on {new Date(result.submittedAt).toLocaleString()}</small>
        </div>
        <div className="qrr-kpi"><span>Your Score</span><strong>{roundedPercentage}%</strong><small>{result.score} / {result.totalMarks}</small></div>
        <div className="qrr-kpi"><span>Correct Answers</span><strong className="green">{correctCount} / {result.totalQuestions}</strong><small>{correctPercent}%</small></div>
        <div className="qrr-kpi"><span>Incorrect Answers</span><strong className="red">{incorrectCount} / {result.totalQuestions}</strong><small>{incorrectPercent}%</small></div>
        <div className="qrr-kpi"><span>Time Taken</span><strong className="blue">{timeTaken}</strong><small>{totalTime !== '0:00' ? `of ${totalTime}` : 'Completed'}</small></div>
      </section>

      <div className="qrr-layout">
        <main className="qrr-main">
          <section className="qrr-panel qrr-overview">
            <div className="qrr-tabs">
              <button className="active">Overview</button>
              <button onClick={() => document.getElementById('answer-review')?.scrollIntoView({ behavior: 'smooth' })}>Review Answers</button>
            </div>
            <div className="qrr-overview-grid">
              <div className="qrr-score-block">
                <h3>Score Overview</h3>
                <div className="qrr-score-content">
                  <div className="qrr-ring" style={ringStyle}>
                    <div><strong>{roundedPercentage}%</strong><span>Your Score</span></div>
                  </div>
                  <div className="qrr-legend-stack">
                    <div><span className="dot green" /> Correct <b>{correctCount} ({correctPercent}%)</b></div>
                    <div><span className="dot red" /> Incorrect <b>{incorrectCount} ({incorrectPercent}%)</b></div>
                    <div><span className="dot gray" /> Unanswered <b>{unansweredCount}</b></div>
                  </div>
                </div>
              </div>
              <div className="qrr-progress-block">
                <h3>Completion</h3>
                <div className="qrr-completion-number">{answeredPercent}%</div>
                <div className="qrr-progress-track"><span style={{ width: `${answeredPercent}%` }} /></div>
                <p>{result.questionsAnswered} of {result.totalQuestions} questions answered.</p>
                <div className={`qrr-result-message ${result.passed ? 'passed' : 'failed'}`}>
                  <i className={`bi ${result.passed ? 'bi-check-circle-fill' : 'bi-info-circle-fill'}`} />
                  <div><strong>{result.passed ? 'Great work!' : 'Keep practicing'}</strong><span>{result.passed ? 'You passed this assessment.' : 'Review the incorrect answers and try again when available.'}</span></div>
                </div>
              </div>
            </div>
          </section>

          <section className="qrr-panel" id="answer-review">
            <div className="qrr-section-head">
              <div><h3>Answer Review</h3><p>Open a question to compare your response with the correct answer.</p></div>
              <div className="qrr-filter-group">
                <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
                <button className={filter === 'correct' ? 'active' : ''} onClick={() => setFilter('correct')}>Correct</button>
                <button className={filter === 'incorrect' ? 'active' : ''} onClick={() => setFilter('incorrect')}>Incorrect</button>
              </div>
            </div>
            <div className="qrr-question-list">
              {filteredQuestions.map((question) => {
                const originalIndex = questionResults.findIndex(q => q.questionId === question.questionId);
                const expanded = expandedQuestion === question.questionId;
                return (
                  <article key={question.questionId} className={`qrr-question ${question.isCorrect ? 'correct' : 'incorrect'} ${expanded ? 'expanded' : ''}`}>
                    <button className="qrr-question-head" onClick={() => setExpandedQuestion(expanded ? null : question.questionId)}>
                      <span className={`qrr-qnum ${question.isCorrect ? 'correct' : 'incorrect'}`}>{originalIndex + 1}</span>
                      <span className="qrr-qtext">{question.questionText}</span>
                      <span className={`qrr-qresult ${question.isCorrect ? 'correct' : 'incorrect'}`}><i className={`bi ${question.isCorrect ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} /> {question.marksAwarded} / {question.maxMarks}</span>
                      <i className={`bi bi-chevron-${expanded ? 'up' : 'down'} qrr-chevron`} />
                    </button>
                    {expanded && (
                      <div className="qrr-question-details">
                        <div className="qrr-answer-card your-answer"><span>Your Answer</span><p>{question.selectedAnswer || 'No answer submitted'}</p></div>
                        <div className="qrr-answer-card correct-answer"><span>Correct Answer</span><p>{question.correctAnswer || 'Not available'}</p></div>
                        {question.feedback && <div className="qrr-feedback"><i className="bi bi-lightbulb" /><div><span>Explanation</span><p>{question.feedback}</p></div></div>}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <div className="qrr-tip"><i className="bi bi-lightbulb-fill" /><div><strong>Keep it up!</strong><span>Regular practice and review will help you master these concepts.</span></div><Button className="qrr-outline-btn" onClick={() => window.location.href = '/quizzes'}>Practice More Quizzes <i className="bi bi-arrow-right" /></Button></div>
        </main>

        <aside className="qrr-side">
          <section className="qrr-panel qrr-nav-panel">
            <h3>Question Navigator</h3>
            <div className="qrr-nav-legend"><span><i className="green" />Correct</span><span><i className="red" />Incorrect</span><span><i className="gray" />Unanswered</span></div>
            <div className="qrr-nav-grid">
              {Array.from({ length: result.totalQuestions }).map((_, index) => {
                const q = questionResults[index];
                const state = !q ? 'unanswered' : q.isCorrect ? 'correct' : 'incorrect';
                return <button key={index} className={state} onClick={() => q && setExpandedQuestion(q.questionId)}>{index + 1}</button>;
              })}
            </div>
          </section>

          <section className="qrr-panel qrr-details-panel">
            <h3>Quiz Details</h3>
            <div><i className="bi bi-person" /><span>Student</span><b>{result.studentName}</b></div>
            <div><i className="bi bi-card-checklist" /><span>Questions</span><b>{result.questionsAnswered} / {result.totalQuestions}</b></div>
            <div><i className="bi bi-bullseye" /><span>Total Marks</span><b>{result.totalMarks}</b></div>
            <div><i className="bi bi-clock-history" /><span>Time Taken</span><b>{timeTaken}</b></div>
          </section>

          <section className="qrr-panel qrr-insight-panel">
            <h3>Performance Insight</h3>
            <div className="qrr-insight good"><i className="bi bi-hand-thumbs-up-fill" /><div><strong>Your Strength</strong><p>You answered {correctCount} questions correctly.</p></div></div>
            <div className="qrr-insight improve"><i className="bi bi-graph-up-arrow" /><div><strong>Improve Here</strong><p>Review {incorrectCount + unansweredCount} question{incorrectCount + unansweredCount === 1 ? '' : 's'} to improve your next attempt.</p></div></div>
          </section>

          {result.shareToken && (
            <section className="qrr-panel qrr-share-panel">
              <h3>Share Achievement</h3>
              <ShareOnLinkedIn shareToken={result.shareToken} title={result.quizTitle} type="quiz" percentage={roundedPercentage} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default QuizResultsPage;
