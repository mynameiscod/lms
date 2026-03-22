import React, { useState, useEffect, useCallback } from 'react';
import { codeSnippetApi } from '../../api/codeSnippetApi';
import ShareOnLinkedIn from '../../components/common/ShareOnLinkedIn';
import './StudentCodeSnippets.css';

const LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
  java: 'Java', cpp: 'C++', c: 'C', csharp: 'C#', go: 'Go',
  rust: 'Rust', sql: 'SQL', html: 'HTML', css: 'CSS',
  php: 'PHP', ruby: 'Ruby', kotlin: 'Kotlin', swift: 'Swift',
};

interface SnippetOption { text: string; }
interface SnippetQuestion {
  _id: string;
  question: string;
  type: 'text' | 'mcq_single' | 'mcq_multiple';
  options: SnippetOption[];
  marks: number;
}
interface Submission { status: string; totalMarksAwarded: number; answers: any[]; grades: any[]; overallFeedback: string; shareToken?: string; }
interface Assessment {
  _id: string;
  title: string;
  description: string;
  language: string;
  codeSnippet: string;
  questions: SnippetQuestion[];
  totalMarks: number;
  dueDate?: string;
  createdAt: string;
  submission: Submission | null;
}

interface AnswerState {
  questionId: string;
  selectedOptions: string[];
  textAnswer: string;
  explanation: string;
}

const statusLabel = (s: Submission | null) => {
  if (!s) return { text: 'Not Started', cls: 'scs-badge--new' };
  if (s.status === 'graded') return { text: 'Graded', cls: 'scs-badge--graded' };
  return { text: 'Submitted', cls: 'scs-badge--submitted' };
};

export default function StudentCodeSnippets() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [viewResult, setViewResult] = useState<Assessment | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await codeSnippetApi.getStudentAssessments();
      setAssessments(res.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAssessment = (a: Assessment) => {
    setActive(a);
    setSubmitDone(false);
    setAnswers(
      a.questions.map((q) => ({
        questionId: q._id,
        selectedOptions: [],
        textAnswer: '',
        explanation: '',
      }))
    );
  };

  const openResult = (a: Assessment) => setViewResult(a);

  const updateAnswer = (idx: number, patch: Partial<AnswerState>) => {
    setAnswers((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const toggleOption = (qIdx: number, optText: string, isSingle: boolean) => {
    setAnswers((prev) =>
      prev.map((a, i) => {
        if (i !== qIdx) return a;
        if (isSingle) return { ...a, selectedOptions: [optText] };
        const has = a.selectedOptions.includes(optText);
        return {
          ...a,
          selectedOptions: has
            ? a.selectedOptions.filter((o) => o !== optText)
            : [...a.selectedOptions, optText],
        };
      })
    );
  };

  const canSubmit = () => {
    if (!active) return false;
    return answers.every((a, idx) => {
      const q = active.questions[idx];
      if (!a.explanation.trim()) return false;
      if (q.type === 'text') return a.textAnswer.trim().length > 0;
      return a.selectedOptions.length > 0;
    });
  };

  const handleSubmit = async () => {
    if (!active) return;
    setSubmitting(true);
    try {
      await codeSnippetApi.submit(active._id, answers);
      setSubmitDone(true);
      await load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Result view ──
  if (viewResult) {
    const sub = viewResult.submission!;
    return (
      <div className="scs-page">
        <button className="scs-back" onClick={() => setViewResult(null)}>← Back to Assessments</button>
        <div className="scs-result-header">
          <h1>{viewResult.title}</h1>
          {sub.status === 'graded' ? (
            <div className="scs-score-card">
              <span className="scs-score-num">{sub.totalMarksAwarded}</span>
              <span className="scs-score-denom">/ {viewResult.totalMarks}</span>
              <span className="scs-score-pct">
                {viewResult.totalMarks > 0 ? Math.round((sub.totalMarksAwarded / viewResult.totalMarks) * 100) : 0}%
              </span>
            </div>
          ) : (
            <span className="scs-badge scs-badge--submitted">Submitted — pending review</span>
          )}
        </div>

        {sub.overallFeedback && (
          <div className="scs-overall-feedback">
            <strong>Instructor Feedback:</strong> {sub.overallFeedback}
          </div>
        )}

        {sub.shareToken && (
          <div style={{ marginBottom: '20px' }}>
            <ShareOnLinkedIn
              shareToken={sub.shareToken}
              title={viewResult.title}
              type="snippet"
              percentage={
                viewResult.totalMarks > 0
                  ? Math.round((sub.totalMarksAwarded / viewResult.totalMarks) * 100)
                  : undefined
              }
            />
          </div>
        )}

        {/* Code block */}
        <div className="scs-code-block">
          <div className="scs-code-bar">
            <span className="scs-lang-badge">{LANG_LABELS[viewResult.language] || viewResult.language}</span>
          </div>
          <pre className="scs-code"><code>{viewResult.codeSnippet}</code></pre>
        </div>

        {/* Q&A */}
        {viewResult.questions.map((q, idx) => {
          const ans = sub.answers?.find((a: any) => a.questionId?.toString() === q._id.toString());
          const grade = sub.grades?.find((g: any) => g.questionId?.toString() === q._id.toString());
          return (
            <div key={q._id} className="scs-result-q">
              <div className="scs-result-q-header">
                <span className="scs-q-num">Q{idx + 1}</span>
                <span className="scs-q-text">{q.question}</span>
                {grade && (
                  <span className="scs-grade-chip">{grade.marksAwarded}/{q.marks}</span>
                )}
              </div>
              {ans && (
                <div className="scs-result-answers">
                  {q.type !== 'text' && ans.selectedOptions?.length > 0 && (
                    <div className="scs-result-row">
                      <span className="scs-result-label">Selected:</span>
                      <span>{ans.selectedOptions.join(', ')}</span>
                    </div>
                  )}
                  {q.type === 'text' && ans.textAnswer && (
                    <div className="scs-result-row">
                      <span className="scs-result-label">Answer:</span>
                      <span>{ans.textAnswer}</span>
                    </div>
                  )}
                  <div className="scs-result-row">
                    <span className="scs-result-label">Explanation:</span>
                    <span>{ans.explanation}</span>
                  </div>
                </div>
              )}
              {grade?.feedback && (
                <div className="scs-grade-feedback">💬 {grade.feedback}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Active assessment / submission view ──
  if (active) {
    if (submitDone) {
      return (
        <div className="scs-page">
          <div className="scs-submit-success">
            <div className="scs-success-icon">✔</div>
            <h2>Assessment Submitted!</h2>
            <p>Your answers have been submitted for review. Your instructor will grade them shortly.</p>
            <button className="scs-btn-primary" onClick={() => { setActive(null); setSubmitDone(false); }}>
              Back to Assessments
            </button>
          </div>
        </div>
      );
    }

    const answeredCount = answers.filter((a, idx) => {
      const q = active.questions[idx];
      return q.type === 'text' ? a.textAnswer.trim().length > 0 : a.selectedOptions.length > 0;
    }).length;

    return (
      <div className="scs-page scs-assessment-view">
        <button className="scs-back" onClick={() => setActive(null)}>← Back to Assessments</button>
        <h1 className="scs-view-title">{active.title}</h1>
        {active.description && <p className="scs-view-desc">{active.description}</p>}
        <div className="scs-view-meta">
          <span className="scs-lang-badge">{LANG_LABELS[active.language] || active.language}</span>
          <span className="scs-meta-info">{active.totalMarks} marks</span>
          {active.dueDate && <span className="scs-meta-info">Due: {new Date(active.dueDate).toLocaleDateString()}</span>}
        </div>

        {/* Code block */}
        <div className="scs-code-block">
          <div className="scs-code-bar">
            <span className="scs-lang-badge">{LANG_LABELS[active.language] || active.language}</span>
            <span className="scs-code-bar-tip">Read this code carefully before answering</span>
          </div>
          <pre className="scs-code"><code>{active.codeSnippet}</code></pre>
        </div>

        {/* Progress */}
        <div className="scs-progress-bar-wrap">
          <div className="scs-progress-label">Questions answered: {answeredCount} / {active.questions.length}</div>
          <div className="scs-progress-track">
            <div
              className="scs-progress-fill"
              style={{ width: `${active.questions.length ? (answeredCount / active.questions.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        {active.questions.map((q, qIdx) => {
          const ans = answers[qIdx];
          return (
            <div key={q._id} className="scs-q-card">
              <div className="scs-q-card-header">
                <span className="scs-q-num">Q{qIdx + 1}</span>
                <span className="scs-q-marks">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
              </div>
              <p className="scs-q-text">{q.question}</p>

              {/* Text answer */}
              {q.type === 'text' && (
                <div className="scs-field">
                  <label className="scs-label">Your Answer <span className="scs-required">*</span></label>
                  <textarea
                    className="scs-textarea"
                    rows={3}
                    placeholder="Write your answer here…"
                    value={ans?.textAnswer || ''}
                    onChange={(e) => updateAnswer(qIdx, { textAnswer: e.target.value })}
                  />
                </div>
              )}

              {/* MCQ single */}
              {q.type === 'mcq_single' && (
                <div className="scs-field">
                  <label className="scs-label">Select the correct answer <span className="scs-required">*</span></label>
                  <div className="scs-options">
                    {q.options.map((opt, oIdx) => (
                      <label key={oIdx} className={`scs-option ${ans?.selectedOptions.includes(opt.text) ? 'scs-option--selected' : ''}`}>
                        <input
                          type="radio"
                          name={`q${qIdx}-radio`}
                          checked={ans?.selectedOptions.includes(opt.text) || false}
                          onChange={() => toggleOption(qIdx, opt.text, true)}
                        />
                        <span>{opt.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* MCQ multiple */}
              {q.type === 'mcq_multiple' && (
                <div className="scs-field">
                  <label className="scs-label">Select all correct answers <span className="scs-required">*</span></label>
                  <div className="scs-options">
                    {q.options.map((opt, oIdx) => (
                      <label key={oIdx} className={`scs-option ${ans?.selectedOptions.includes(opt.text) ? 'scs-option--selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={ans?.selectedOptions.includes(opt.text) || false}
                          onChange={() => toggleOption(qIdx, opt.text, false)}
                        />
                        <span>{opt.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation — always required */}
              <div className="scs-field">
                <label className="scs-label">
                  Your Explanation <span className="scs-required">*</span>
                  <span className="scs-hint"> — Explain why this is your answer in detail</span>
                </label>
                <textarea
                  className="scs-textarea"
                  rows={4}
                  placeholder="Explain your understanding clearly. E.g.: 'The output will be X because on line 5, the variable... The reason this happens is...' "
                  value={ans?.explanation || ''}
                  onChange={(e) => updateAnswer(qIdx, { explanation: e.target.value })}
                />
              </div>
            </div>
          );
        })}

        <div className="scs-submit-bar">
          {!canSubmit() && (
            <p className="scs-submit-hint">All questions answered + explanations required to submit</p>
          )}
          <button
            className="scs-btn-primary scs-btn-submit"
            onClick={handleSubmit}
            disabled={!canSubmit() || submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Assessment'}
          </button>
        </div>
      </div>
    );
  }

  // ── Assessment list ──
  return (
    <div className="scs-page">
      <div className="scs-page-header">
        <h1>Coding Snippet Assessments</h1>
        <p>Analyze code, answer questions, and explain your understanding</p>
      </div>

      {loading ? (
        <div className="scs-loading">Loading your assessments…</div>
      ) : assessments.length === 0 ? (
        <div className="scs-empty">
          <div className="scs-empty-icon">{'</>'}</div>
          <p>No assessments assigned yet. Check back later.</p>
        </div>
      ) : (
        <div className="scs-cards">
          {assessments.map((a) => {
            const badge = statusLabel(a.submission);
            const isGraded = a.submission?.status === 'graded';
            const isSubmitted = !!a.submission;
            return (
              <div key={a._id} className="scs-card">
                <div className="scs-card-top">
                  <span className="scs-lang-badge">{LANG_LABELS[a.language] || a.language}</span>
                  <span className={`scs-badge ${badge.cls}`}>{badge.text}</span>
                </div>
                <h3 className="scs-card-title">{a.title}</h3>
                {a.description && <p className="scs-card-desc">{a.description}</p>}
                <div className="scs-card-meta">
                  <span>{a.questions.length} question{a.questions.length !== 1 ? 's' : ''}</span>
                  <span>{a.totalMarks} marks</span>
                  {a.dueDate && <span>Due {new Date(a.dueDate).toLocaleDateString()}</span>}
                </div>
                {isGraded && (
                  <div className="scs-card-score">
                    Score: <strong>{a.submission!.totalMarksAwarded}/{a.totalMarks}</strong>
                    {' '}({a.totalMarks > 0 ? Math.round((a.submission!.totalMarksAwarded / a.totalMarks) * 100) : 0}%)
                  </div>
                )}
                <div className="scs-card-actions">
                  {!isSubmitted ? (
                    <button className="scs-btn-primary" onClick={() => openAssessment(a)}>Start Assessment</button>
                  ) : (
                    <button className="scs-btn-outline" onClick={() => openResult(a)}>View {isGraded ? 'Grades' : 'Submission'}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
