import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { quizApi } from '../../api';
import { Alert, Spinner, Button, Modal } from '../../components/common';
import { Quiz, Question, QuizAttempt } from '../../types';
import './QuizTakingPage.css';

const QuizTakingPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Map<string, any>>(new Map());
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTabWarnModal, setShowTabWarnModal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fullScreenRef = useRef<HTMLDivElement>(null);

  const handleTabSwitch = useCallback(() => {
    if (document.hidden || document.visibilityState === 'hidden') {
      setTabSwitchCount(prev => prev + 1);
      if (quiz?.tabSwitchWarnings) {
        setShowTabWarnModal(true);
      }
    }
  }, [quiz?.tabSwitchWarnings]);

  const handleWindowFocus = useCallback(() => {
    // Detect when window loses focus
    if (document.visibilityState === 'hidden' && quiz?.tabSwitchWarnings) {
      setTabSwitchCount(prev => prev + 1);
      setShowTabWarnModal(true);
    }
  }, [quiz?.tabSwitchWarnings]);

  const handleFullscreenChange = useCallback(() => {
    // Handle fullscreen changes if needed
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setupEventListeners = useCallback(() => {
    // Tab switch detection
    document.addEventListener('visibilitychange', handleTabSwitch);
    window.addEventListener('blur', handleTabSwitch);
    window.addEventListener('focus', handleWindowFocus);
    // Fullscreen detection
    document.addEventListener('fullscreenchange', handleFullscreenChange);
  }, [handleTabSwitch, handleWindowFocus, handleFullscreenChange]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cleanupEventListeners = useCallback(() => {
    document.removeEventListener('visibilitychange', handleTabSwitch);
    window.removeEventListener('blur', handleTabSwitch);
    window.removeEventListener('focus', handleWindowFocus);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [handleTabSwitch, handleWindowFocus, handleFullscreenChange]);

  const loadQuiz = useCallback(async () => {
    try {
      setLoading(true);
      if (!quizId) {
        setError('Quiz ID not found');
        return;
      }

      // Fetch quiz and questions
      const quizRes = await quizApi.getQuizById(quizId);
      const questionsRes = await quizApi.getQuestionsWithAnswers(quizId);
      
      setQuiz(quizRes.data || quizRes);
      setQuestions(questionsRes.data || questionsRes);

      // Start attempt
      const attemptRes = await quizApi.startAttempt(quizId);
      setAttempt(attemptRes.data || attemptRes);

      // Calculate time left in minutes
      const quiz = quizRes.data || quizRes;
      setTimeLeft(quiz.totalTime * 60); // Convert to seconds

      // Require fullscreen if needed
      if (quiz.requireFullScreen && !document.fullscreenElement) {
        requestFullscreen();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    loadQuiz();
    setupEventListeners();

    return () => {
      cleanupEventListeners();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizId, loadQuiz, setupEventListeners, cleanupEventListeners]);

  const requestFullscreen = async () => {
    if (fullScreenRef.current) {
      try {
        await fullScreenRef.current.requestFullscreen();
      } catch (err) {
        console.error('Failed to enter fullscreen:', err);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, value);
    setAnswers(newAnswers);
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmitQuiz = useCallback(async () => {
    try {
      if (!attempt || !quiz) return;

      // Prepare submissions
      const submissions = Array.from(answers.entries()).map(([questionId, answer]) => {
        const question = questions.find(q => q._id === questionId);
        const submission: any = {
          questionId,
          questionType: question?.type,
        };

        // Format answer based on question type
        if (question?.type === 'mcq_single' || question?.type === 'mcq_multiple') {
          submission.selectedOptions = Array.isArray(answer) ? answer : [answer];
        } else {
          submission.answer = answer || '';
        }

        return submission;
      });

      await quizApi.submitAttempt(quizId, attempt._id, submissions);

      // Redirect to results
      window.location.href = `/quiz/${quizId}/results/${attempt._id}`;
    } catch (err: any) {
      setError(err.message || 'Failed to submit quiz');
    }
  }, [quizId, attempt, answers, questions]);

  useEffect(() => {
    if (timeLeft <= 0 && quiz) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, quiz, handleSubmitQuiz]);

  if (loading) return <Spinner fullScreen />;
  if (!quiz || !attempt) return <Alert type="error" message={error || 'Failed to load quiz'} />;

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const timeWarning = timeLeft < 300; // Less than 5 minutes
  const timeCritical = timeLeft < 60; // Less than 1 minute

  return (
    <div ref={fullScreenRef} className="quiz-taking-page">
      {/* Tab Switch Warning Modal */}
      <Modal
        isOpen={showTabWarnModal}
        onClose={() => setShowTabWarnModal(false)}
        title="⚠️ Warning: Tab Switch Detected"
        maxWidth="500px"
      >
        <div className="warning-content">
          <p>You've switched tabs {tabSwitchCount} time(s). Repeated tab switching may result in termination of the quiz.</p>
          <p>Please focus on the quiz window to continue.</p>
          <Button onClick={() => setShowTabWarnModal(false)} className="btn-primary btn-block">
            Continue Quiz
          </Button>
        </div>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitConfirmModal}
        onClose={() => setShowSubmitConfirmModal(false)}
        title="🔒 Submit Quiz?"
        maxWidth="500px"
      >
        <div className="confirm-content">
          <p>
            You have answered {Array.from(answers.keys()).length} out of {questions.length} questions.
          </p>
          <p>Are you sure you want to submit the quiz? You cannot change your answers after submission.</p>
          <div className="button-group">
            <Button onClick={() => setShowSubmitConfirmModal(false)}>
              Continue Quiz
            </Button>
            <Button onClick={handleSubmitQuiz} className="btn-danger">
              Submit Quiz
            </Button>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <div className={`quiz-header ${timeWarning ? 'warning' : ''} ${timeCritical ? 'critical' : ''}`}>
        <div className="quiz-title">
          <h1>{quiz.title}</h1>
          <p className="question-count">Question {currentQuestionIndex + 1} of {questions.length}</p>
        </div>

        <div className="quiz-timer">
          <div className={`timer ${timeCritical ? 'critical' : timeWarning ? 'warning' : ''}`}>
            ⏱️ {formatTime(timeLeft)}
          </div>
          {timeCritical && <p className="timer-warning">Hurry up!</p>}
          {timeWarning && !timeCritical && <p className="timer-warning">Less than 5 minutes left</p>}
        </div>
      </div>

      <div className="quiz-container">
        {/* Left Sidebar - Question Navigator */}
        <div className="question-navigator">
          <h3>Questions</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>

          <div className="questions-list">
            {questions.map((_, index) => (
              <button
                key={index}
                className={`question-btn ${index === currentQuestionIndex ? 'active' : ''} ${answers.has(questions[index]._id) ? 'answered' : ''}`}
                onClick={() => handleJumpToQuestion(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <h4 className="status-title">Status</h4>
          <div className="status-group">
            <div className="status-item">
              <span className="status-dot answered"></span>
              <span>Answered: {answers.size}</span>
            </div>
            <div className="status-item">
              <span className="status-dot unanswered"></span>
              <span>Unanswered: {questions.length - answers.size}</span>
            </div>
          </div>
        </div>

        {/* Main Content - Question */}
        <div className="question-content">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          {currentQuestion && (
            <div className="question-card">
              <div className="question-header">
                <h2>{currentQuestion.questionText}</h2>
                <span className={`question-type ${currentQuestion.type}`}>
                  {currentQuestion.type.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="question-body">
                {currentQuestion.type === 'mcq_single' || currentQuestion.type === 'mcq_multiple' ? (
                  <div className="mcq-options">
                    {currentQuestion.options?.map((option, index) => (
                      <label key={index} className="option-label">
                        <input
                          type={currentQuestion.type === 'mcq_single' ? 'radio' : 'checkbox'}
                          name={`question-${currentQuestion._id}`}
                          value={option.text}
                          checked={
                            currentQuestion.type === 'mcq_single'
                              ? answers.get(currentQuestion._id) === option.text
                              : Array.isArray(answers.get(currentQuestion._id)) && answers.get(currentQuestion._id).includes(option.text)
                          }
                          onChange={(e) => {
                            if (currentQuestion.type === 'mcq_single') {
                              handleAnswerChange(currentQuestion._id, e.target.value);
                            } else {
                              const currentAnswers = Array.isArray(answers.get(currentQuestion._id)) ? answers.get(currentQuestion._id) : [];
                              if (e.target.checked) {
                                handleAnswerChange(currentQuestion._id, [...currentAnswers, option.text]);
                              } else {
                                handleAnswerChange(currentQuestion._id, currentAnswers.filter((a: string) => a !== option.text));
                              }
                            }
                          }}
                        />
                        <span className="option-text">{option.text}</span>
                      </label>
                    ))}
                  </div>
                ) : currentQuestion.type === 'short_answer' ? (
                  <textarea
                    className="short-answer-input"
                    value={answers.get(currentQuestion._id) || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                    placeholder="Type your answer here..."
                    rows={8}
                  />
                ) : currentQuestion.type === 'coding' ? (
                  <div className="coding-area">
                    <div className="coding-header">
                      <label>
                        Language:
                        <select className="language-select">
                          <option>JavaScript</option>
                          <option>Python</option>
                          <option>Java</option>
                          <option>C++</option>
                        </select>
                      </label>
                    </div>
                    <textarea
                      className="code-input"
                      value={answers.get(currentQuestion._id) || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                      placeholder="Write your code here..."
                      rows={12}
                      spellCheck="false"
                    />
                  </div>
                ) : null}
              </div>

              {currentQuestion.explanation && (
                <div className="question-explanation">
                  <p><strong>Explanation:</strong> {currentQuestion.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="question-navigation">
            <Button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="btn-secondary"
            >
              ← Previous
            </Button>

            {currentQuestionIndex < questions.length - 1 ? (
              <Button onClick={handleNextQuestion} className="btn-secondary">
                Next →
              </Button>
            ) : (
              <Button onClick={() => setShowSubmitConfirmModal(true)} className="btn-primary btn-lg">
                ✅ Submit Quiz
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizTakingPage;
