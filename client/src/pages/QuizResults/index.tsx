import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { quizApi } from '../../api';
import { Alert, Spinner } from '../../components/common';
import { QuizResult, Question } from '../../types';
import { careerpilotReturn, withReturn, returnLabel } from '../../utils/careerpilotReturn';
import './quizResults.css';

const QuizResultsPage: React.FC = () => {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  // Opened from a CareerPilot journey day: the exits lead back to that day, not to the LMS quiz list.
  const backTo = careerpilotReturn(window.location.search);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

  // Format time taken as MM:SS or with seconds
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  // Get color based on percentage
  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 70) return 'green';
    if (percentage >= 50) return 'orange';
    return 'red';
  };

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      if (!quizId || !attemptId) {
        setError('Missing quiz or attempt ID');
        return;
      }

      const resultRes = await quizApi.getResults(attemptId);
      const resultData = resultRes.data || resultRes;
      // Only fetch answers if showAnswersAfterSubmit is enabled
      const includeAnswers = resultData.quiz?.showAnswersAfterSubmit !== false;
      const questionsRes = includeAnswers
        ? await quizApi.getQuestionsWithAnswers(quizId)
        : await quizApi.getQuestionsWithoutAnswers(quizId);

      setResult(resultData);
      setQuestions(questionsRes.data || questionsRes || []);
      // Open the review on the first question rather than an empty panel.
      setSelectedQuestionIndex(prev => (prev === null && (questionsRes.data || questionsRes || []).length ? 0 : prev));
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [quizId, attemptId]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const getOptionText = (option: any): string => {
    // Handle both string and object option formats
    if (typeof option === 'string') {
      return option;
    }
    return option?.text || '';
  };

  if (loading) return <Spinner fullScreen />;
  if (!result) return <Alert type="error" message={error || 'Failed to load results'} />;

  const percentage = result.attempt.obtainedMarks != null 
    ? (result.attempt.obtainedMarks / result.quiz.totalMarks) * 100 
    : 0;
  const isPassed = result.attempt.passed ?? false;
  const selectedQuestion = selectedQuestionIndex !== null ? questions[selectedQuestionIndex] : null;
  const selectedSubmission = selectedQuestion && result.submissions?.find(s => s.questionId === selectedQuestion._id);

  const pct = Math.round(percentage);
  const tone = getPercentageColor(percentage);
  const showScore = result.quiz.showScoreAfterSubmit !== false;
  const attemptsLeft = result.quiz.multipleAttempts && result.quiz.maxAttempts
    ? result.quiz.maxAttempts - (result.attempt.attemptNo || 1) : null;
  const canRetry = attemptsLeft !== null && attemptsLeft > 0;
  const goBack = () => { window.location.href = backTo || '/quizzes'; };
  const retry = () => { window.location.href = withReturn(`/quiz/${quizId}/take`, backTo); };
  const correctCount = questions.filter(q => result.submissions?.find(s => s.questionId === q._id)?.marksAwarded === q.marks).length;
  /**
   * One line per chosen option. Only a MULTI-select answer stored as text is split on commas: a single option's own
   * text often contains a comma ("The SSD, where the installed program files are kept"), and splitting it showed one
   * answer as two.
   */
  const answerLines = (ans: any, multi: boolean): string[] =>
    (Array.isArray(ans) ? ans : ans ? (multi ? String(ans).split(',') : [String(ans)]) : []).map((a: any) => String(a).trim()).filter(Boolean);

  /**
   * THIS PAGE'S STYLES WERE MISSING. It imported QuizResultsPage.css, which a redesign rewrote for a different
   * component (QuizResultsPage.tsx, never routed) — so the page every quiz lands on rendered unstyled: a giant
   * logo, a black disc for the score ring, a bare list for the review. It now has its own stylesheet (qr2-),
   * in the CodeBegun guide colours, for the LMS and for CareerPilot (where the shell already carries the brand,
   * so no logo is repeated).
   */
  return (
    <div className={`qr2${backTo ? ' in-cp' : ''}`}>
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <section className={`qr2-hero ${showScore ? (isPassed ? 'pass' : 'fail') : 'sent'}`}>
        <div className="qr2-hero-copy">
          {!backTo && <img src="/assets/logo.png" alt="CodeBegun" className="qr2-logo" onError={(e: any) => { e.currentTarget.style.display = 'none'; }} />}
          {backTo && <button type="button" className="qr2-crumb" onClick={goBack}><i className="bi bi-arrow-left" /> {returnLabel(backTo)}</button>}
          <span className="qr2-eyebrow">{backTo ? 'Checkpoint result' : 'Quiz result'}</span>
          <h1>{result.quiz.title}</h1>
          <div className="qr2-verdict">
            {showScore
              ? (isPassed
                ? <span className="pass"><i className="bi bi-patch-check-fill" /> Passed — well done!</span>
                : <span className="fail"><i className="bi bi-arrow-repeat" /> Not passed yet — review your answers and try again</span>)
              : <span className="sent"><i className="bi bi-check2-circle" /> Submitted — your responses are recorded</span>}
          </div>
          <div className="qr2-actions">
            <button type="button" className="qr2-btn light" onClick={goBack}>
              {backTo ? <>Continue {returnLabel(backTo).replace(/^Back to /, '')} <i className="bi bi-arrow-right" /></> : <><i className="bi bi-journal-text" /> Back to Quizzes</>}
            </button>
            {canRetry && <button type="button" className="qr2-btn ghost" onClick={retry}><i className="bi bi-arrow-counterclockwise" /> Retry ({attemptsLeft} left)</button>}
          </div>
        </div>
        {showScore && (
          <div className="qr2-score">
            <div className={`qr2-ring ${tone}`} style={{ ['--qr2-deg' as any]: `${Math.min(100, pct) * 3.6}deg` }}>
              <div><strong>{pct}%</strong><span>{result.attempt.obtainedMarks}/{result.quiz.totalMarks} marks</span></div>
            </div>
          </div>
        )}
      </section>

      {showScore && (
        <section className="qr2-stats">
          <div><span className="ic blue"><i className="bi bi-bullseye" /></span><div><small>Score</small><b>{result.attempt.obtainedMarks}<em>/{result.quiz.totalMarks}</em></b></div></div>
          <div><span className="ic green"><i className="bi bi-check2-circle" /></span><div><small>Correct</small><b>{correctCount}<em>/{questions.length}</em></b></div></div>
          <div><span className="ic amber"><i className="bi bi-flag" /></span><div><small>Pass mark</small><b>{result.quiz.passingMarks || 0}</b></div></div>
          <div><span className="ic teal"><i className="bi bi-stopwatch" /></span><div><small>Time taken</small><b>{formatTime(result.attempt.timeSpent || 0)}</b></div></div>
        </section>
      )}

      {result.quiz.allowReview !== false && questions.length > 0 && (
        <section className="qr2-review">
          <header><h2><i className="bi bi-list-check" /> Review your answers</h2><p>Pick a question to see your answer{result.quiz.showAnswersAfterSubmit ? ', the correct one and why' : ''}.</p></header>
          <div className="qr2-review-grid">
            <ol className="qr2-qlist">
              {questions.map((question, index) => {
                const submission = result.submissions?.find(s => s.questionId === question._id);
                const isCorrect = submission?.marksAwarded === question.marks;
                const isAttempted = !!(submission && submission.studentAnswer);
                const state = isCorrect ? 'correct' : isAttempted ? 'incorrect' : 'unattempted';
                return (
                  <li key={index}>
                    <button type="button" className={`qr2-q ${state}${selectedQuestionIndex === index ? ' on' : ''}`} onClick={() => setSelectedQuestionIndex(index)}>
                      <span className="st"><i className={`bi ${isCorrect ? 'bi-check-lg' : isAttempted ? 'bi-x-lg' : 'bi-dash-lg'}`} /></span>
                      <span className="tx"><small>Question {index + 1}</small><b title={question.questionText}>{question.questionText}</b></span>
                      <span className="mk">{submission ? submission.marksAwarded : 0}/{question.marks}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="qr2-detail">
              {selectedQuestion ? (
                <>
                  <div className="qr2-detail-head">
                    <span className="qr2-type">{selectedQuestion.type.replace('_', ' ')}</span>
                    {selectedSubmission && <span className={`qr2-marks ${selectedSubmission.marksAwarded === selectedQuestion.marks ? 'correct' : 'incorrect'}`}>{selectedSubmission.marksAwarded}/{selectedQuestion.marks} marks</span>}
                  </div>
                  <h3>{selectedQuestion.questionText}</h3>

                  {selectedSubmission ? (
                    <>
                      <div className="qr2-block">
                        <h4>Your answer</h4>
                        {selectedQuestion.type === 'mcq_single' || selectedQuestion.type === 'mcq_multiple' ? (
                          answerLines(selectedSubmission.studentAnswer, selectedQuestion.type === 'mcq_multiple').length
                            ? answerLines(selectedSubmission.studentAnswer, selectedQuestion.type === 'mcq_multiple').map((a, i) => <div key={i} className={`qr2-ans ${selectedSubmission.marksAwarded === selectedQuestion.marks ? 'correct' : 'incorrect'}`}>{a}</div>)
                            : <div className="qr2-ans none">No answer given</div>
                        ) : selectedQuestion.type === 'coding'
                          ? <pre className="qr2-code">{selectedSubmission.studentAnswer || 'No code submitted'}</pre>
                          : <div className="qr2-ans">{selectedSubmission.studentAnswer || 'No answer given'}</div>}
                      </div>
                      {result.quiz.showAnswersAfterSubmit && (selectedQuestion.type === 'mcq_single' || selectedQuestion.type === 'mcq_multiple') && (
                        <div className="qr2-block">
                          <h4>Correct answer</h4>
                          {(selectedQuestion.options || [])
                            .map((opt: any, optIndex: number) => {
                              const optText = getOptionText(opt);
                              const ok = opt?.isCorrect === true || (selectedQuestion.correctAnswers && (selectedQuestion.correctAnswers.includes(optText) || selectedQuestion.correctAnswers.includes(String(optIndex))));
                              return { optText, ok };
                            })
                            .filter((o: any) => o.ok)
                            .map((o: any, i: number) => <div key={i} className="qr2-ans correct"><i className="bi bi-check-circle-fill" /> {o.optText}</div>)}
                        </div>
                      )}
                      {result.quiz.showAnswersAfterSubmit && selectedQuestion.explanation && (
                        <div className="qr2-explain"><i className="bi bi-lightbulb" /><div><b>Why</b><p>{selectedQuestion.explanation}</p></div></div>
                      )}
                    </>
                  ) : (
                    <div className="qr2-ans none"><i className="bi bi-dash-circle" /> You did not answer this question.</div>
                  )}
                </>
              ) : (
                <div className="qr2-empty">Select a question to see the details.</div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default QuizResultsPage;
