import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  assignmentApi,
  submissionApi,
  Assignment,
  Submission,
  SubmissionStatus,
  AssignmentType
} from '../../api/assignmentApi';
import ShareOnLinkedIn from '../../components/common/ShareOnLinkedIn';
import './AssignmentResultRedesign.css';

const AssignmentResultRedesign: React.FC = () => {
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!assignmentId) return;
      try {
        setLoading(true);
        const [assignmentRes, submissionRes] = await Promise.all([
          assignmentApi.getById(assignmentId),
          submissionApi.getMySubmission(assignmentId)
        ]);
        setAssignment(assignmentRes.data.data);
        setSubmission(submissionRes.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load assignment result');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assignmentId]);

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const displayScore = submission?.totalScore ?? submission?.finalScore ?? submission?.score;
  const scorePercentage = assignment && displayScore !== undefined
    ? Math.round((displayScore / Math.max(assignment.totalPoints, 1)) * 100)
    : null;
  const passingPoints = assignment ? (assignment.passingPoints || assignment.totalPoints * 0.5) : 0;
  const isGraded = submission?.status === SubmissionStatus.GRADED;
  const isPassing = displayScore !== undefined ? displayScore >= passingPoints : false;
  const testsPassed = submission?.testResults?.filter(t => t.passed).length || 0;
  const testsTotal = submission?.testResults?.length || 0;

  const performanceLabel = useMemo(() => {
    if (scorePercentage === null) return 'Awaiting evaluation';
    if (scorePercentage >= 90) return 'Excellent performance';
    if (scorePercentage >= 80) return 'Great work';
    if (scorePercentage >= 70) return 'Good progress';
    if (scorePercentage >= 60) return 'Keep practicing';
    return 'Needs more practice';
  }, [scorePercentage]);

  if (loading) {
    return <div className="cb-ar-state"><div className="spinner" /></div>;
  }

  if (error || !assignment) {
    return (
      <div className="cb-ar-state">
        <div className="cb-ar-state-card">
          <i className="bi bi-exclamation-triangle" />
          <h3>Unable to load result</h3>
          <p>{error || 'Assignment not found'}</p>
          <button className="cb-ar-btn cb-ar-btn-primary" onClick={() => navigate('/assignments')}>Back to Assignments</button>
        </div>
      </div>
    );
  }

  if (!submission || submission.status === SubmissionStatus.NOT_STARTED) {
    return (
      <div className="cb-ar-state">
        <div className="cb-ar-state-card">
          <i className="bi bi-journal-code" />
          <h3>Not submitted yet</h3>
          <p>Complete this assignment first to view your evaluation.</p>
          <button className="cb-ar-btn cb-ar-btn-primary" onClick={() => navigate(`/assignments/${assignmentId}/workspace`)}>Start Assignment</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cb-ar-page">
      <div className="cb-ar-header">
        <div>
          <button className="cb-ar-back" onClick={() => navigate('/assignments')}><i className="bi bi-arrow-left" /> Back to Assignments</button>
          <div className="cb-ar-eyebrow">MY WORK / ASSIGNMENTS / RESULT</div>
          <h1>Assignment Result</h1>
          <p>{assignment.title}</p>
        </div>
        <div className={`cb-ar-status ${isGraded ? (isPassing ? 'passed' : 'failed') : 'pending'}`}>
          <i className={`bi ${isGraded ? (isPassing ? 'bi-patch-check-fill' : 'bi-x-circle-fill') : 'bi-hourglass-split'}`} />
          <div><span>{isGraded ? (isPassing ? 'Passed' : 'Needs Improvement') : 'Pending Review'}</span><small>{isGraded ? 'Evaluation completed' : 'Instructor evaluation in progress'}</small></div>
        </div>
      </div>

      <section className="cb-ar-hero">
        <div className="cb-ar-score-wrap">
          <div className={`cb-ar-score-ring ${isPassing ? 'good' : 'warn'}`} style={{ ['--score' as any]: `${scorePercentage ?? 0}%` }}>
            <div><strong>{isGraded && scorePercentage !== null ? `${scorePercentage}%` : '—'}</strong><span>Overall score</span></div>
          </div>
          <div className="cb-ar-score-copy">
            <span className="cb-ar-kicker">Your Performance</span>
            <h2>{isGraded ? performanceLabel : 'Your work has been submitted'}</h2>
            <p>{isGraded ? `${displayScore ?? 0} of ${assignment.totalPoints} points earned` : 'You will see your score and detailed feedback once grading is complete.'}</p>
            {isGraded && <div className="cb-ar-passline"><span>Passing score</span><strong>{passingPoints} pts</strong></div>}
          </div>
        </div>
        <div className="cb-ar-mini-grid">
          <div><i className="bi bi-send-check" /><span>Submitted</span><strong>{formatDate(submission.submittedAt)}</strong></div>
          <div><i className="bi bi-clipboard-check" /><span>Evaluated</span><strong>{formatDate(submission.gradedAt)}</strong></div>
          <div><i className="bi bi-bullseye" /><span>Score</span><strong>{isGraded ? `${displayScore ?? 0} / ${assignment.totalPoints}` : 'Pending'}</strong></div>
          <div><i className="bi bi-check2-circle" /><span>{assignment.type === AssignmentType.CODING ? 'Tests Passed' : 'Status'}</span><strong>{assignment.type === AssignmentType.CODING && testsTotal ? `${testsPassed} / ${testsTotal}` : (isGraded ? 'Graded' : 'Submitted')}</strong></div>
        </div>
      </section>

      <div className="cb-ar-layout">
        <main className="cb-ar-main">
          {submission.feedback && (
            <section className="cb-ar-card cb-ar-feedback">
              <div className="cb-ar-section-head"><div><span className="cb-ar-icon green"><i className="bi bi-chat-square-text" /></span><div><h3>Instructor Feedback</h3><p>Comments from your evaluator</p></div></div></div>
              <div className="cb-ar-feedback-body">{submission.feedback}</div>
            </section>
          )}

          {assignment.type === AssignmentType.CODING && submission.testResults && (
            <section className="cb-ar-card">
              <div className="cb-ar-section-head"><div><span className="cb-ar-icon blue"><i className="bi bi-beaker" /></span><div><h3>Test Results</h3><p>{testsPassed} of {testsTotal} test cases passed</p></div></div><span className="cb-ar-chip">{testsTotal ? Math.round((testsPassed / testsTotal) * 100) : 0}% passed</span></div>
              <div className="cb-ar-tests">
                {submission.testResults.map((result, index) => (
                  <div key={index} className={`cb-ar-test ${result.passed ? 'pass' : 'fail'}`}>
                    <i className={`bi ${result.passed ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} />
                    <div><strong>Test Case #{result.testCaseIndex + 1}</strong>{result.error && <small>{result.error}</small>}</div>
                    <span>{result.executionTime} ms</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {assignment.type === AssignmentType.MCQ && submission.mcqAnswers && (
            <section className="cb-ar-card">
              <div className="cb-ar-section-head"><div><span className="cb-ar-icon blue"><i className="bi bi-ui-checks-grid" /></span><div><h3>Answer Review</h3><p>Review your answers and explanations</p></div></div></div>
              <div className="cb-ar-mcq-list">
                {assignment.mcqQuestions.map((q, qIndex) => {
                  const answer = submission.mcqAnswers?.find(a => a.questionIndex === qIndex);
                  return (
                    <article key={qIndex} className="cb-ar-question">
                      <div className="cb-ar-question-head"><span>Question {qIndex + 1}</span><strong className={answer?.isCorrect ? 'ok' : 'bad'}>{answer?.isCorrect ? `+${q.points} pts` : '0 pts'}</strong></div>
                      <h4>{q.question}</h4>
                      <div className="cb-ar-options">
                        {q.options.map((opt, oIndex) => {
                          const selected = answer?.selectedOption === oIndex;
                          const correct = opt.isCorrect;
                          return <div key={oIndex} className={`cb-ar-option ${correct ? 'correct' : ''} ${selected && !correct ? 'wrong' : ''}`}><i className={`bi ${correct ? 'bi-check-circle-fill' : selected ? 'bi-x-circle-fill' : 'bi-circle'}`} /><span>{opt.text}</span>{selected && <small>Your answer</small>}</div>;
                        })}
                      </div>
                      {assignment.settings?.showCorrectAnswers && q.explanation && <div className="cb-ar-explanation"><i className="bi bi-lightbulb" /><span>{q.explanation}</span></div>}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {submission.rubricScores && submission.rubricScores.length > 0 && (
            <section className="cb-ar-card">
              <div className="cb-ar-section-head"><div><span className="cb-ar-icon purple"><i className="bi bi-bar-chart" /></span><div><h3>Grading Breakdown</h3><p>Performance by evaluation criterion</p></div></div></div>
              <div className="cb-ar-rubric-list">
                {submission.rubricScores.map((rs, index) => {
                  const rubric = assignment.rubric?.find(r => r.criterion === rs.criterion);
                  const max = rubric?.maxPoints || 0;
                  const pct = max ? Math.round((rs.score / max) * 100) : 0;
                  return (
                    <div className="cb-ar-rubric" key={index}>
                      <div className="cb-ar-rubric-top"><div><strong>{rs.criterion}</strong>{rubric?.description && <small>{rubric.description}</small>}</div><b>{rs.score} / {max}</b></div>
                      <div className="cb-ar-progress"><span style={{ width: `${Math.min(100, pct)}%` }} /></div>
                      {rs.feedback && <p>{rs.feedback}</p>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {(assignment.type === AssignmentType.CODING || assignment.type === AssignmentType.SQL) && submission.code && (
            <section className="cb-ar-card">
              <div className="cb-ar-section-head"><div><span className="cb-ar-icon teal"><i className="bi bi-code-slash" /></span><div><h3>Your Submission</h3><p>Submitted source code</p></div></div><span className="cb-ar-chip">{submission.language}</span></div>
              <div className="cb-ar-code"><div className="cb-ar-code-head"><span><i className="bi bi-file-earmark-code" /> solution.{submission.language || 'txt'}</span><span>Read only</span></div><pre>{submission.code}</pre></div>
            </section>
          )}

          {assignment.type === AssignmentType.THEORY && submission.theoryAnswer && (
            <section className="cb-ar-card">
              <div className="cb-ar-section-head"><div><span className="cb-ar-icon teal"><i className="bi bi-file-text" /></span><div><h3>Your Answer</h3><p>Submitted written response</p></div></div></div>
              <div className="cb-ar-theory">{submission.theoryAnswer}</div>
            </section>
          )}
        </main>

        <aside className="cb-ar-side">
          <section className="cb-ar-card cb-ar-side-card">
            <h3>Assignment Details</h3>
            <dl>
              <div><dt>Type</dt><dd>{assignment.type}</dd></div>
              <div><dt>Difficulty</dt><dd>{assignment.difficulty || '—'}</dd></div>
              <div><dt>Total Points</dt><dd>{assignment.totalPoints}</dd></div>
              <div><dt>Passing Points</dt><dd>{passingPoints}</dd></div>
              <div><dt>Status</dt><dd className={isGraded ? (isPassing ? 'green-text' : 'red-text') : 'amber-text'}>{isGraded ? (isPassing ? 'Passed' : 'Failed') : 'Pending'}</dd></div>
            </dl>
          </section>

          {isGraded && scorePercentage !== null && (
            <section className="cb-ar-card cb-ar-side-card">
              <div className="cb-ar-side-title"><h3>Performance</h3><strong>{scorePercentage}%</strong></div>
              <div className="cb-ar-progress large"><span style={{ width: `${Math.min(100, scorePercentage)}%` }} /></div>
              <p className="cb-ar-muted">{performanceLabel}. Keep reviewing the feedback and improve the weaker areas.</p>
            </section>
          )}

          <section className="cb-ar-card cb-ar-actions">
            <button className="cb-ar-btn cb-ar-btn-primary" onClick={() => navigate('/assignments')}><i className="bi bi-arrow-left" /> Back to Assignments</button>
            {submission.shareToken && <ShareOnLinkedIn shareToken={submission.shareToken} title={assignment.title} type="assignment" percentage={submission.percentage} />}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default AssignmentResultRedesign;
