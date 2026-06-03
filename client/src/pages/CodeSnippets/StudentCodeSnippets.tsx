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

// Per-language tile (short label + colors) for the list view
const LANG_TILE: Record<string, { short: string; bg: string; color: string }> = {
  javascript: { short: 'JS',  bg: '#fef9c3', color: '#a16207' },
  typescript: { short: 'TS',  bg: '#dbeafe', color: '#1d4ed8' },
  python:     { short: 'Py',  bg: '#e0f2fe', color: '#0369a1' },
  java:       { short: 'Jv',  bg: '#fee2e2', color: '#b91c1c' },
  cpp:        { short: 'C++', bg: '#e0e7ff', color: '#4338ca' },
  c:          { short: 'C',   bg: '#e0e7ff', color: '#4338ca' },
  csharp:     { short: 'C#',  bg: '#dcfce7', color: '#15803d' },
  go:         { short: 'Go',  bg: '#cffafe', color: '#0e7490' },
  rust:       { short: 'Rs',  bg: '#ffedd5', color: '#c2410c' },
  sql:        { short: 'SQL', bg: '#f1f5f9', color: '#475569' },
  php:        { short: 'PHP', bg: '#ede9fe', color: '#6d28d9' },
  ruby:       { short: 'Rb',  bg: '#fee2e2', color: '#b91c1c' },
};
const langTile = (lang: string) =>
  LANG_TILE[lang] || { short: (LANG_LABELS[lang] || lang || '?').slice(0, 2), bg: '#ede9fe', color: '#6366f1' };

// Three-state status used by the list view (matches the dashboard mockup)
const listStatus = (s: Submission | null) => {
  if (!s) return { key: 'notstarted', label: 'Not Started', cls: 'notstarted' };
  if (s.status === 'graded') return { key: 'completed', label: 'Completed', cls: 'completed' };
  return { key: 'inprogress', label: 'In Progress', cls: 'inprogress' };
};

const deriveDifficulty = (marks: number) =>
  marks <= 10 ? 'Easy' : marks <= 20 ? 'Medium' : 'Hard';
const difficultyCls = (d: string) => d.toLowerCase();
const expectedTime = (questions: number) => `${Math.max(5, Math.round(questions * 1.5))} mins`;
const lastAttempt = (s: Submission | null) => {
  const ts = (s as any)?.submittedAt || (s as any)?.updatedAt || (s as any)?.createdAt;
  if (!ts) return null;
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
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

export default function StudentCodeSnippets() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [viewResult, setViewResult] = useState<Assessment | null>(null);

  // List-view controls
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState<'all' | 'inprogress' | 'completed' | 'notstarted'>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

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
  useEffect(() => { setPage(1); }, [search, langFilter, statusFilter, tab, perPage]);

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

  // ── Assessment list (dashboard view) ──
  const languages = Array.from(new Set(assessments.map((a) => a.language)));

  const matchesTab = (a: Assessment) => {
    if (tab === 'all') return true;
    return listStatus(a.submission).key === tab;
  };

  const filtered = assessments.filter((a) => {
    if (langFilter && a.language !== langFilter) return false;
    if (statusFilter && listStatus(a.submission).key !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !(a.description || '').toLowerCase().includes(q)) return false;
    }
    return matchesTab(a);
  });

  const total = assessments.length;
  const completed = assessments.filter((a) => listStatus(a.submission).key === 'completed').length;
  const inProgress = assessments.filter((a) => listStatus(a.submission).key === 'inprogress').length;
  const notStarted = assessments.filter((a) => listStatus(a.submission).key === 'notstarted').length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const tabCount = (t: typeof tab) =>
    t === 'inprogress' ? inProgress : t === 'completed' ? completed : t === 'notstarted' ? notStarted : total;

  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage));
  const pageStart = (page - 1) * perPage;
  const pageRows = filtered.slice(pageStart, pageStart + perPage);
  const pageNumbers = (): (number | '…')[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, '…', totalPages];
    if (page >= totalPages - 2) return [1, '…', totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', page, '…', totalPages];
  };

  const detail = filtered.find((a) => a._id === selectedId) || filtered[0] || null;

  const openFor = (a: Assessment) => {
    if (a.submission) openResult(a);
    else openAssessment(a);
  };

  return (
    <div className="csa-page">
      {/* Header */}
      <div className="csa-header">
        <div>
          <h1 className="csa-title">Code Snippet Assessments</h1>
          <p className="csa-subtitle">Practice, analyze, and strengthen your coding skills.</p>
        </div>
        <div className="csa-hero-art">{'</>'}</div>
      </div>

      {/* Stat cards */}
      <div className="csa-stats">
        <div className="csa-stat">
          <span className="csa-stat-ic purple">{'</>'}</span>
          <div><div className="csa-stat-label">Total Assessments</div><div className="csa-stat-val">{total}</div></div>
        </div>
        <div className="csa-stat">
          <span className="csa-stat-ic green">✅</span>
          <div><div className="csa-stat-label">Completed</div><div className="csa-stat-val">{completed}</div><div className="csa-stat-sub good">{pct(completed)}%</div></div>
        </div>
        <div className="csa-stat">
          <span className="csa-stat-ic blue">📊</span>
          <div><div className="csa-stat-label">In Progress</div><div className="csa-stat-val">{inProgress}</div><div className="csa-stat-sub blue">{pct(inProgress)}%</div></div>
        </div>
        <div className="csa-stat">
          <span className="csa-stat-ic red">⏳</span>
          <div><div className="csa-stat-label">Not Started</div><div className="csa-stat-val">{notStarted}</div><div className="csa-stat-sub low">{pct(notStarted)}%</div></div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="csa-filterbar">
        <div className="csa-filter-item">
          <label>Language</label>
          <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)}>
            <option value="">All Languages</option>
            {languages.map((l) => <option key={l} value={l}>{LANG_LABELS[l] || l}</option>)}
          </select>
        </div>
        <div className="csa-filter-item">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="inprogress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="notstarted">Not Started</option>
          </select>
        </div>
        <div className="csa-search-wrap">
          <input className="csa-search" placeholder="Search assessments…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <span className="csa-search-ic">🔍</span>
        </div>
      </div>

      {loading ? (
        <div className="csa-loading"><div className="csa-spinner" /></div>
      ) : (
        <div className="csa-body">
          {/* Left: table card */}
          <div className="csa-card">
            <div className="csa-tabs">
              {(['all', 'inprogress', 'completed', 'notstarted'] as const).map((t) => (
                <button key={t} className={`csa-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                  {t === 'all' ? 'All' : t === 'inprogress' ? 'In Progress' : t === 'completed' ? 'Completed' : 'Not Started'}
                  <span className="csa-tab-count">{tabCount(t)}</span>
                </button>
              ))}
            </div>

            {totalRecords === 0 ? (
              <div className="csa-empty">
                <div className="csa-empty-ic">{'</>'}</div>
                <h3>No assessments</h3>
                <p>No assessments match your filters. Check back later.</p>
              </div>
            ) : (
              <>
                <div className="csa-table-wrap">
                  <table className="csa-table">
                    <thead>
                      <tr>
                        <th>Assessment</th><th>Language</th><th>Questions</th><th>Marks</th>
                        <th>Status</th><th>Last Attempt</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((a) => {
                        const st = listStatus(a.submission);
                        const tile = langTile(a.language);
                        const la = lastAttempt(a.submission);
                        const action = st.key === 'notstarted' ? 'Start' : st.key === 'completed' ? 'View Result' : 'Continue';
                        return (
                          <tr
                            key={a._id}
                            className={`${detail?._id === a._id ? 'csa-row-active' : ''}`}
                            onClick={() => { setSelectedId(a._id); setShowInstructions(false); }}
                          >
                            <td data-label="Assessment" className="csa-titlecell">
                              <span className="csa-tile" style={{ background: tile.bg, color: tile.color }}>{tile.short}</span>
                              <div className="csa-titlebox">
                                <div className="csa-aname">{a.title}</div>
                                {a.description && <div className="csa-adesc">{a.description.length > 64 ? a.description.slice(0, 64) + '…' : a.description}</div>}
                              </div>
                            </td>
                            <td data-label="Language"><span className="csa-langpill" style={{ background: tile.bg, color: tile.color }}>{LANG_LABELS[a.language] || a.language}</span></td>
                            <td data-label="Questions" className="csa-center">{a.questions.length}</td>
                            <td data-label="Marks" className="csa-center">{a.totalMarks}</td>
                            <td data-label="Status"><span className={`csa-badge ${st.cls}`}>{st.label}</span></td>
                            <td data-label="Last Attempt">
                              {la ? <div className="csa-lastattempt"><div>{la.date}</div><div className="csa-la-time">{la.time}</div></div> : <span className="csa-dash">—</span>}
                            </td>
                            <td data-label="Action">
                              <button className={`csa-action ${st.key === 'completed' ? 'secondary' : ''}`} onClick={(e) => { e.stopPropagation(); openFor(a); }}>
                                {st.key === 'completed' ? '👁 View Result' : `▶ ${action}`}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="csa-foot">
                  <span className="csa-foot-info">
                    Showing {pageStart + 1} to {Math.min(pageStart + perPage, totalRecords)} of {totalRecords} assessments
                  </span>
                  <div className="csa-pager">
                    <button className="csa-pg" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>←</button>
                    {pageNumbers().map((n, i) =>
                      n === '…'
                        ? <span key={`e${i}`} className="csa-pg-ellipsis">…</span>
                        : <button key={n} className={`csa-pg ${page === n ? 'active' : ''}`} onClick={() => setPage(n as number)}>{n}</button>
                    )}
                    <button className="csa-pg" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>→</button>
                  </div>
                  <select className="csa-perpage" value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                    {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n} per page</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Right: detail panel */}
          {detail && (
            <aside className="csa-detail">
              <div className="csa-detail-hero"><span>{'</>'}</span></div>
              <div className="csa-detail-tags">
                <span className="csa-langpill" style={{ background: langTile(detail.language).bg, color: langTile(detail.language).color }}>
                  {LANG_LABELS[detail.language] || detail.language}
                </span>
                <span className={`csa-badge ${listStatus(detail.submission).cls}`}>{listStatus(detail.submission).label}</span>
              </div>
              <h2 className="csa-detail-title">{detail.title}</h2>
              {detail.description && <p className="csa-detail-desc">{detail.description}</p>}

              <div className="csa-detail-rows">
                <div className="csa-drow"><span className="csa-drow-ic">🧩</span><span className="csa-drow-label">Questions</span><span className="csa-drow-val">{detail.questions.length}</span></div>
                <div className="csa-drow"><span className="csa-drow-ic">⭐</span><span className="csa-drow-label">Marks</span><span className="csa-drow-val">{detail.totalMarks}</span></div>
                <div className="csa-drow"><span className="csa-drow-ic">📶</span><span className="csa-drow-label">Difficulty</span><span className={`csa-diff ${difficultyCls(deriveDifficulty(detail.totalMarks))}`}>{deriveDifficulty(detail.totalMarks)}</span></div>
                <div className="csa-drow"><span className="csa-drow-ic">⏱️</span><span className="csa-drow-label">Expected Time</span><span className="csa-drow-val">{expectedTime(detail.questions.length)}</span></div>
                <div className="csa-drow"><span className="csa-drow-ic">📅</span><span className="csa-drow-label">Last Attempt</span><span className="csa-drow-val">{lastAttempt(detail.submission)?.date || '—'}</span></div>
              </div>

              {showInstructions && (
                <div className="csa-instructions">
                  Read the code snippet carefully, answer each question, and explain your reasoning in detail.
                  You can submit your answers only once, so review them before submitting.
                </div>
              )}

              <button className="csa-detail-primary" onClick={() => openFor(detail)}>
                {listStatus(detail.submission).key === 'notstarted' ? '▶ Start Assessment'
                  : listStatus(detail.submission).key === 'completed' ? '👁 View Result' : '▶ Continue'}
              </button>
              <button className="csa-detail-outline" onClick={() => setShowInstructions((v) => !v)}>
                ⓘ {showInstructions ? 'Hide Instructions' : 'View Instructions'}
              </button>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
