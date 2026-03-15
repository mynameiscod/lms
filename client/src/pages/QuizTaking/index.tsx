import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizApi } from '../../api';
import { Alert, Spinner, Button, Modal } from '../../components/common';
import { Quiz, Question, QuizAttempt } from '../../types';
import './QuizTakingPage.css';

const QuizTakingPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Map<string, any>>(new Map());
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [showTabWarnModal, setShowTabWarnModal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fullScreenRef = useRef<HTMLDivElement>(null);
  const preventCopyPasteRef = useRef((e: Event) => e.preventDefault());

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
    // Re-enforce fullscreen if user exits it
    if (quiz?.requireFullScreen && !document.fullscreenElement && !showInstructions) {
      requestFullscreen();
    }
  }, [quiz?.requireFullScreen, showInstructions]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setupEventListeners = useCallback(() => {
    // Tab switch detection
    document.addEventListener('visibilitychange', handleTabSwitch);
    window.addEventListener('blur', handleTabSwitch);
    window.addEventListener('focus', handleWindowFocus);
    // Fullscreen detection
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Copy/paste prevention
    if (!quiz?.canCopyPaste) {
      document.addEventListener('copy', preventCopyPasteRef.current);
      document.addEventListener('paste', preventCopyPasteRef.current);
      document.addEventListener('cut', preventCopyPasteRef.current);
      document.addEventListener('contextmenu', preventCopyPasteRef.current);
    }
  }, [handleTabSwitch, handleWindowFocus, handleFullscreenChange, quiz?.canCopyPaste]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cleanupEventListeners = useCallback(() => {
    document.removeEventListener('visibilitychange', handleTabSwitch);
    window.removeEventListener('blur', handleTabSwitch);
    window.removeEventListener('focus', handleWindowFocus);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    
    // Remove copy/paste prevention
    document.removeEventListener('copy', preventCopyPasteRef.current);
    document.removeEventListener('paste', preventCopyPasteRef.current);
    document.removeEventListener('cut', preventCopyPasteRef.current);
    document.removeEventListener('contextmenu', preventCopyPasteRef.current);
  }, [handleTabSwitch, handleWindowFocus, handleFullscreenChange]);

  const loadQuiz = useCallback(async () => {
    try {
      setLoading(true);
      if (!quizId) {
        setError('Quiz ID not found');
        return;
      }

      // Fetch quiz info only (don't start attempt yet)
      const quizRes = await quizApi.getQuizById(quizId);
      setQuiz(quizRes.data || quizRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  // Function to actually start the quiz (called from instructions page)
  const handleStartQuiz = useCallback(async () => {
    try {
      setStartingQuiz(true);
      if (!quizId) return;

      // Fetch questions
      const questionsRes = await quizApi.getQuestionsWithAnswers(quizId);
      setQuestions(questionsRes.data || questionsRes);

      // Start attempt
      const attemptRes = await quizApi.startAttempt(quizId);
      setAttempt(attemptRes.data || attemptRes);

      // Calculate time left in minutes
      if (quiz) {
        setTimeLeft(quiz.totalTime * 60); // Convert to seconds
      }

      // Require fullscreen if needed
      if (quiz?.requireFullScreen && !document.fullscreenElement) {
        requestFullscreen();
      }

      // Show quiz (hide instructions)
      setShowInstructions(false);
      
      // Setup event listeners after starting
      setupEventListeners();
    } catch (err: any) {
      setError(err.message || 'Failed to start quiz');
    } finally {
      setStartingQuiz(false);
    }
  }, [quizId, quiz, setupEventListeners]);

  useEffect(() => {
    loadQuiz();
    // Don't setup event listeners here - do it when quiz starts

    return () => {
      cleanupEventListeners();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizId, loadQuiz, cleanupEventListeners]);

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

  const getOptionText = (option: any): string => {
    // Handle both string and object option formats
    if (typeof option === 'string') {
      return option;
    }
    return option?.text || '';
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
        const questionIndex = questions.findIndex(q => q._id === questionId);
        const submission: any = {
          questionId,
          questionNo: questionIndex + 1, // Add questionNo (1-based index)
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
  }, [quizId, attempt, answers, questions, quiz]);

  useEffect(() => {
    // Only run timer when quiz has started (not on instruction page)
    if (showInstructions || timeLeft <= 0 || !quiz) return;

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
  }, [showInstructions, timeLeft, quiz, handleSubmitQuiz]);

  if (loading) return <Spinner fullScreen />;
  
  // If there's an error (like already attempted), show error with back button
  if (error) {
    return (
      <div className="quiz-error-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Cannot Start Quiz</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <Button onClick={() => window.history.back()} className="btn-secondary">
              ← Go Back
            </Button>
            <Button onClick={() => window.location.href = '/quizzes'} className="btn-primary">
              View My Quizzes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) return <Alert type="error" message="Failed to load quiz" />;

  // Show instructions page before starting quiz
  if (showInstructions) {
    return (
      <div className="quiz-instructions-page">
        <div className="instructions-container">
          <div className="instructions-header">
            <h1>{quiz.title}</h1>
            {quiz.description && <p className="quiz-description">{quiz.description}</p>}
          </div>

          <div className="quiz-info-cards">
            <div className="info-card">
              <div className="info-icon">📝</div>
              <div className="info-content">
                <span className="info-label">Total Questions</span>
                <span className="info-value">{quiz.totalQuestions}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">🎯</div>
              <div className="info-content">
                <span className="info-label">Total Marks</span>
                <span className="info-value">{quiz.totalMarks}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">⏱️</div>
              <div className="info-content">
                <span className="info-label">Duration</span>
                <span className="info-value">{quiz.totalTime} mins</span>
              </div>
            </div>
            {quiz.passingMarks && (
              <div className="info-card">
                <div className="info-icon">✅</div>
                <div className="info-content">
                  <span className="info-label">Passing Marks</span>
                  <span className="info-value">{quiz.passingMarks}</span>
                </div>
              </div>
            )}
            {quiz.negativeMarking && (
              <div className="info-card negative">
                <div className="info-icon">⚠️</div>
                <div className="info-content">
                  <span className="info-label">Negative Marking</span>
                  <span className="info-value">-{quiz.negativeMarkingValue} per wrong answer</span>
                </div>
              </div>
            )}
          </div>

          <div className="instructions-section">
            <h2>📋 Instructions</h2>
            {quiz.instructions ? (
              <div className="custom-instructions">
                {quiz.instructions.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            ) : (
              <ul className="default-instructions">
                <li>Read each question carefully before answering.</li>
                <li>You have <strong>{quiz.totalTime} minutes</strong> to complete this quiz.</li>
                <li>All questions are mandatory.</li>
                {quiz.negativeMarking && (
                  <li className="warning">Wrong answers will result in <strong>-{quiz.negativeMarkingValue}</strong> marks deduction.</li>
                )}
                {quiz.shuffleQuestions && <li>Questions will be shuffled randomly.</li>}
                {!quiz.canCopyPaste && <li>Copy-paste is disabled during the quiz.</li>}
                {quiz.requireFullScreen && <li>Full screen mode is required during the quiz.</li>}
                {quiz.tabSwitchWarnings && <li>Switching tabs/windows will be tracked and may result in penalties.</li>}
                {!quiz.multipleAttempts && <li>Only one attempt is allowed for this quiz.</li>}
                {quiz.multipleAttempts && quiz.maxAttempts && (
                  <li>Maximum {quiz.maxAttempts} attempts are allowed.</li>
                )}
              </ul>
            )}
          </div>

          <div className="instructions-actions">
            <Button 
              onClick={() => navigate(-1)} 
              className="btn-secondary"
              disabled={startingQuiz}
            >
              ← Go Back
            </Button>
            <Button 
              onClick={handleStartQuiz} 
              className="btn-primary btn-lg"
              disabled={startingQuiz}
            >
              {startingQuiz ? (
                <>
                  <Spinner size="small" /> Starting...
                </>
              ) : (
                '🚀 Start Quiz'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!attempt) return <Spinner fullScreen />;

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
                    {currentQuestion.options?.map((option, index) => {
                      const optionText = getOptionText(option);
                      return (
                        <label key={index} className="option-label">
                          <input
                            type={currentQuestion.type === 'mcq_single' ? 'radio' : 'checkbox'}
                            name={`question-${currentQuestion._id}`}
                            value={optionText}
                            checked={
                              currentQuestion.type === 'mcq_single'
                                ? answers.get(currentQuestion._id) === optionText
                                : Array.isArray(answers.get(currentQuestion._id)) && answers.get(currentQuestion._id).includes(optionText)
                            }
                            onChange={(e) => {
                              if (currentQuestion.type === 'mcq_single') {
                                handleAnswerChange(currentQuestion._id, e.target.value);
                              } else {
                                const currentAnswers = Array.isArray(answers.get(currentQuestion._id)) ? answers.get(currentQuestion._id) : [];
                                if (e.target.checked) {
                                  handleAnswerChange(currentQuestion._id, [...currentAnswers, optionText]);
                                } else {
                                  handleAnswerChange(currentQuestion._id, currentAnswers.filter((a: string) => a !== optionText));
                                }
                              }
                            }}
                          />
                          <span className="option-text">{optionText}</span>
                        </label>
                      );
                    })}
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
