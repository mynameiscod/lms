import React, { useState, useEffect, useCallback } from 'react';
import { codeSnippetApi } from '../../api/codeSnippetApi';
import './GradeSubmissions.css';

const LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
  java: 'Java', cpp: 'C++', c: 'C', csharp: 'C#', go: 'Go',
  rust: 'Rust', sql: 'SQL', html: 'HTML', css: 'CSS',
  php: 'PHP', ruby: 'Ruby', kotlin: 'Kotlin', swift: 'Swift',
};

interface Assessment { _id: string; title: string; language: string; totalMarks: number; questions: any[]; codeSnippet: string; }
interface Student { _id: string; firstName: string; lastName: string; email: string; }
interface Submission {
  _id: string;
  studentId: Student;
  status: 'submitted' | 'grading' | 'graded';
  answers: { questionId: string; selectedOptions: string[]; textAnswer: string; explanation: string }[];
  grades: { questionId: string; marksAwarded: number; feedback: string }[];
  totalMarksAwarded: number;
  overallFeedback: string;
  submittedAt: string;
}

interface GradeState {
  [questionId: string]: { marksAwarded: number; feedback: string };
}

export default function GradeSubmissions() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [gradeState, setGradeState] = useState<GradeState>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Load all published assessments for admin/instructor
  const loadAssessments = useCallback(async () => {
    try {
      const res = await codeSnippetApi.list({ status: 'published' });
      setAssessments(res.data.data || []);
    } catch {
      // silent
    } finally {
      setLoadingAssessments(false);
    }
  }, []);

  useEffect(() => { loadAssessments(); }, [loadAssessments]);

  const selectAssessment = async (id: string) => {
    if (!id) { setSelectedAssessment(null); setSubmissions([]); return; }
    setLoadingSubmissions(true);
    setActiveSubmission(null);
    try {
      const res = await codeSnippetApi.getSubmissions(id);
      const a = res.data.assessment as Assessment;
      // Re-fetch full assessment with codeSnippet
      const fullRes = await codeSnippetApi.getById(id);
      setSelectedAssessment({ ...a, ...fullRes.data.data });
      setSubmissions(res.data.data || []);
    } catch {
      alert('Failed to load submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const openGrading = (sub: Submission) => {
    setActiveSubmission(sub);
    // Init grade state from existing grades or zeros
    const init: GradeState = {};
    selectedAssessment?.questions.forEach((q: any) => {
      const existing = sub.grades?.find((g) => g.questionId?.toString() === q._id?.toString());
      init[q._id] = {
        marksAwarded: existing?.marksAwarded ?? 0,
        feedback: existing?.feedback ?? '',
      };
    });
    setGradeState(init);
    setOverallFeedback(sub.overallFeedback || '');
    setSavedId(null);
  };

  const handleGrade = async () => {
    if (!activeSubmission || !selectedAssessment) return;
    setSaving(true);
    try {
      const grades = selectedAssessment.questions.map((q: any) => ({
        questionId: q._id,
        marksAwarded: Number(gradeState[q._id]?.marksAwarded) || 0,
        feedback: gradeState[q._id]?.feedback || '',
      }));
      await codeSnippetApi.grade(activeSubmission._id, { grades, overallFeedback });
      setSavedId(activeSubmission._id);
      // Refresh submissions list
      const res = await codeSnippetApi.getSubmissions(selectedAssessment._id);
      setSubmissions(res.data.data || []);
      // Update activeSubmission with new data
      const updated = res.data.data.find((s: Submission) => s._id === activeSubmission._id);
      if (updated) setActiveSubmission(updated);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const totalAwarded = selectedAssessment
    ? selectedAssessment.questions.reduce((s: number, q: any) => s + (Number(gradeState[q._id]?.marksAwarded) || 0), 0)
    : 0;

  const pendingCount = submissions.filter((s) => s.status !== 'graded').length;

  return (
    <div className="gs-page">
      <div className="gs-page-header">
        <h1>Grade Snippet Submissions</h1>
        <p>Review student answers and provide marks + feedback</p>
      </div>

      {/* Assessment selector */}
      <div className="gs-selector">
        <label className="gs-label">Select Assessment</label>
        {loadingAssessments ? (
          <div className="gs-loading-sm">Loading assessments…</div>
        ) : (
          <select
            className="gs-select"
            onChange={(e) => selectAssessment(e.target.value)}
            defaultValue=""
          >
            <option value="">— Choose an assessment —</option>
            {assessments.map((a) => (
              <option key={a._id} value={a._id}>
                {a.title} [{LANG_LABELS[a.language] || a.language}] — {a.totalMarks} marks
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedAssessment && (
        <div className="gs-body">
          {/* Submissions list panel */}
          <div className="gs-panel-left">
            <div className="gs-panel-header">
              <span className="gs-panel-title">Submissions ({submissions.length})</span>
              {pendingCount > 0 && <span className="gs-pending-badge">{pendingCount} pending</span>}
            </div>
            {loadingSubmissions ? (
              <div className="gs-loading-sm">Loading…</div>
            ) : submissions.length === 0 ? (
              <div className="gs-empty-sm">No submissions yet.</div>
            ) : (
              <ul className="gs-sub-list">
                {submissions.map((sub) => {
                  const name = sub.studentId
                    ? `${sub.studentId.firstName} ${sub.studentId.lastName}`
                    : 'Unknown';
                  const isActive = activeSubmission?._id === sub._id;
                  return (
                    <li
                      key={sub._id}
                      className={`gs-sub-item ${isActive ? 'gs-sub-item--active' : ''}`}
                      onClick={() => openGrading(sub)}
                    >
                      <div className="gs-sub-name">{name}</div>
                      <div className="gs-sub-meta">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                        <span className={`gs-status gs-status--${sub.status}`}>{sub.status}</span>
                      </div>
                      {sub.status === 'graded' && (
                        <div className="gs-sub-score">{sub.totalMarksAwarded}/{selectedAssessment.totalMarks}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Grading panel */}
          <div className="gs-panel-right">
            {!activeSubmission ? (
              <div className="gs-select-hint">
                <div className="gs-select-hint-icon">👆</div>
                <p>Select a submission from the list to start grading</p>
              </div>
            ) : (
              <div className="gs-grading-form">
                <div className="gs-grade-header">
                  <div>
                    <h2 className="gs-grade-title">
                      {activeSubmission.studentId
                        ? `${activeSubmission.studentId.firstName} ${activeSubmission.studentId.lastName}`
                        : 'Student'}
                    </h2>
                    {activeSubmission.studentId?.email && (
                      <p className="gs-grade-email">{activeSubmission.studentId.email}</p>
                    )}
                  </div>
                  <div className="gs-total-score">
                    <span className="gs-total-num">{totalAwarded}</span>
                    <span className="gs-total-denom">/ {selectedAssessment.totalMarks}</span>
                  </div>
                </div>

                {/* Code snippet */}
                <div className="gs-code-block">
                  <div className="gs-code-bar">
                    <span className="gs-lang-badge">{LANG_LABELS[selectedAssessment.language] || selectedAssessment.language}</span>
                    <span className="gs-code-label">Assessment Code</span>
                  </div>
                  <pre className="gs-code"><code>{selectedAssessment.codeSnippet}</code></pre>
                </div>

                {/* Questions + grading */}
                {selectedAssessment.questions.map((q: any, qIdx: number) => {
                  const ans = activeSubmission.answers?.find(
                    (a) => a.questionId?.toString() === q._id?.toString()
                  );
                  const maxMarks = q.marks;
                  const awarded = Number(gradeState[q._id]?.marksAwarded) || 0;

                  return (
                    <div key={q._id} className="gs-q-card">
                      <div className="gs-q-header">
                        <span className="gs-q-num">Q{qIdx + 1}</span>
                        <div className="gs-q-info">
                          <span className="gs-q-text">{q.question}</span>
                          <span className="gs-q-type">{q.type.replace('_', ' ')}</span>
                        </div>
                      </div>

                      {/* Student's answer */}
                      <div className="gs-student-answer">
                        <div className="gs-answer-label">Student's Answer:</div>
                        {q.type !== 'text' && ans?.selectedOptions?.length > 0 ? (
                          <div className="gs-answer-options">
                            {ans.selectedOptions.map((o: string, i: number) => (
                              <span key={i} className="gs-selected-opt">{o}</span>
                            ))}
                          </div>
                        ) : q.type === 'text' && ans?.textAnswer ? (
                          <p className="gs-answer-text">{ans.textAnswer}</p>
                        ) : (
                          <p className="gs-no-answer">No answer provided</p>
                        )}
                      </div>

                      {/* Explanation */}
                      <div className="gs-explanation">
                        <div className="gs-answer-label">Student's Explanation:</div>
                        <p className="gs-explanation-text">{ans?.explanation || <em>No explanation</em>}</p>
                      </div>

                      {/* Grade input */}
                      <div className="gs-grade-row">
                        <div className="gs-grade-marks">
                          <label className="gs-small-label">Marks Awarded</label>
                          <div className="gs-marks-row">
                            <input
                              type="number"
                              className="gs-marks-input"
                              min={0}
                              max={maxMarks}
                              value={gradeState[q._id]?.marksAwarded ?? 0}
                              onChange={(e) =>
                                setGradeState((prev) => ({
                                  ...prev,
                                  [q._id]: { ...prev[q._id], marksAwarded: Math.min(maxMarks, Math.max(0, Number(e.target.value))) },
                                }))
                              }
                            />
                            <span className="gs-marks-max">/ {maxMarks}</span>
                            <div className="gs-marks-btns">
                              <button className="gs-mark-btn gs-mark-full" onClick={() =>
                                setGradeState((prev) => ({ ...prev, [q._id]: { ...prev[q._id], marksAwarded: maxMarks } }))
                              } title="Full marks">✓</button>
                              <button className="gs-mark-btn gs-mark-zero" onClick={() =>
                                setGradeState((prev) => ({ ...prev, [q._id]: { ...prev[q._id], marksAwarded: 0 } }))
                              } title="Zero">✗</button>
                            </div>
                            <div className="gs-marks-bar-wrap">
                              <div
                                className="gs-marks-bar-fill"
                                style={{ width: `${maxMarks > 0 ? (awarded / maxMarks) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="gs-grade-feedback">
                          <label className="gs-small-label">Feedback (optional)</label>
                          <textarea
                            className="gs-feedback-input"
                            rows={2}
                            placeholder="Leave feedback for the student…"
                            value={gradeState[q._id]?.feedback || ''}
                            onChange={(e) =>
                              setGradeState((prev) => ({
                                ...prev,
                                [q._id]: { ...prev[q._id], feedback: e.target.value },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Overall feedback */}
                <div className="gs-overall">
                  <label className="gs-small-label">Overall Feedback (optional)</label>
                  <textarea
                    className="gs-feedback-input"
                    rows={3}
                    placeholder="Overall feedback visible to the student after grading…"
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                  />
                </div>

                <div className="gs-save-bar">
                  {savedId === activeSubmission._id && (
                    <span className="gs-saved-msg">✔ Grades saved successfully</span>
                  )}
                  <div className="gs-save-summary">
                    Total: <strong>{totalAwarded}</strong> / {selectedAssessment.totalMarks} marks
                    ({selectedAssessment.totalMarks > 0 ? Math.round((totalAwarded / selectedAssessment.totalMarks) * 100) : 0}%)
                  </div>
                  <button
                    className="gs-btn-primary"
                    onClick={handleGrade}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : activeSubmission.status === 'graded' ? 'Update Grades' : 'Save Grades'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
