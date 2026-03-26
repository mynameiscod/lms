import React, { useState, useEffect, useCallback } from 'react';
import { codeSnippetApi } from '../../api/codeSnippetApi';
import { batchApi, courseApi, subjectApi, chapterApi, topicApi, quizApi } from '../../api';
import './AdminCodeSnippets.css';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
  'csharp', 'go', 'rust', 'sql', 'html', 'css', 'php', 'ruby', 'kotlin', 'swift',
];

const LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
  java: 'Java', cpp: 'C++', c: 'C', csharp: 'C#', go: 'Go',
  rust: 'Rust', sql: 'SQL', html: 'HTML', css: 'CSS',
  php: 'PHP', ruby: 'Ruby', kotlin: 'Kotlin', swift: 'Swift',
};

type QuestionType = 'text' | 'mcq_single' | 'mcq_multiple';

interface SnippetOption { text: string; isCorrect: boolean; }
interface SnippetQuestion {
  _id?: string;
  question: string;
  type: QuestionType;
  options: SnippetOption[];
  marks: number;
}
interface Assessment {
  _id: string;
  title: string;
  description: string;
  language: string;
  codeSnippet: string;
  questions: SnippetQuestion[];
  totalMarks: number;
  batchIds: string[];
  status: 'draft' | 'published';
  dueDate?: string;
  createdAt: string;
}

const emptyQuestion = (): SnippetQuestion => ({
  question: '',
  type: 'text',
  options: [],
  marks: 1,
});

const emptyForm = () => ({
  title: '',
  description: '',
  language: 'javascript',
  codeSnippet: '',
  questions: [emptyQuestion()],
  batchIds: [] as string[],
  courseId: '',
  subjectId: '',
  chapterId: '',
  topicId: '',
  dueDate: '',
  status: 'draft' as 'draft' | 'published',
});

interface Batch { _id: string; name: string; }
interface Course { _id: string; name: string; }
interface Subject { _id: string; name: string; }
interface Chapter { _id: string; name: string; }
interface Topic { _id: string; name: string; }

export default function AdminCodeSnippets() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'basics' | 'code' | 'questions' | 'settings'>('basics');
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Settings tab data
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // AI generation for questions
  const [aiSnippet, setAiSnippet] = useState({ topic: '', difficulty: 'medium', count: 3 });
  const [aiSnippetLoading, setAiSnippetLoading] = useState(false);
  const [aiSnippetError, setAiSnippetError] = useState('');

  const loadAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      const res = await codeSnippetApi.list(params);
      setAssessments(res.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadAssessments(); }, [loadAssessments]);

  const loadSettingsData = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const [batchRes, courseRes] = await Promise.all([
        batchApi.getBatches(),
        courseApi.getCourses({ isActive: true }),
      ]);
      setBatches(batchRes.data || []);
      setCourses(courseRes.data || courseRes || []);
    } catch {
      // silent — settings data is optional
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadSubjects = useCallback(async (courseId: string) => {
    if (!courseId) { setSubjects([]); setChapters([]); setTopics([]); return; }
    try {
      const res = await subjectApi.getSubjectsByCourse(courseId);
      setSubjects(res.data || res || []);
      setChapters([]);
      setTopics([]);
    } catch { setSubjects([]); }
  }, []);

  const loadChapters = useCallback(async (subjectId: string) => {
    if (!subjectId) { setChapters([]); setTopics([]); return; }
    try {
      const res = await chapterApi.getChaptersBySubject(subjectId);
      setChapters(res.data || res || []);
      setTopics([]);
    } catch { setChapters([]); }
  }, []);

  const loadTopics = useCallback(async (chapterId: string) => {
    if (!chapterId) { setTopics([]); return; }
    try {
      const res = await topicApi.getTopicsByChapter(chapterId);
      setTopics(res.data || res || []);
    } catch { setTopics([]); }
  }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setEditId(null);
    setActiveTab('basics');
    setError('');
    setPreview(false);
    setSubjects([]);
    setChapters([]);
    setTopics([]);
    setShowModal(true);
    loadSettingsData();
  };

  const openEdit = async (id: string) => {
    try {
      const res = await codeSnippetApi.getById(id);
      const a: any = res.data.data;
      const newForm = {
        title: a.title,
        description: a.description || '',
        language: a.language,
        codeSnippet: a.codeSnippet,
        questions: a.questions.length ? a.questions : [emptyQuestion()],
        batchIds: a.batchIds || [],
        courseId: a.courseId || '',
        subjectId: a.subjectId || '',
        chapterId: a.chapterId || '',
        topicId: a.topicId || '',
        dueDate: a.dueDate ? a.dueDate.slice(0, 10) : '',
        status: a.status,
      };
      setForm(newForm);
      setEditId(id);
      setActiveTab('basics');
      setError('');
      setPreview(false);
      setSubjects([]);
      setChapters([]);
      setTopics([]);
      setShowModal(true);
      await loadSettingsData();
      if (a.courseId) await loadSubjects(a.courseId);
      if (a.subjectId) await loadChapters(a.subjectId);
      if (a.chapterId) await loadTopics(a.chapterId);
    } catch {
      alert('Failed to load assessment');
    }
  };

  const handleSave = async (publishNow = false) => {
    if (!form.title.trim()) { setError('Title is required'); setActiveTab('basics'); return; }
    if (!form.codeSnippet.trim()) { setError('Code snippet is required'); setActiveTab('code'); return; }
    if (!form.questions.length || !form.questions[0].question.trim()) {
      setError('At least one question is required'); setActiveTab('questions'); return;
    }
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, status: publishNow ? 'published' : form.status };
      if (editId) {
        await codeSnippetApi.update(editId, payload);
      } else {
        await codeSnippetApi.create(payload);
      }
      setShowModal(false);
      await loadAssessments();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    if (!window.confirm('Publish this assessment? Students will be able to see it.')) return;
    try {
      await codeSnippetApi.publish(id);
      await loadAssessments();
    } catch { alert('Failed to publish'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this assessment and all its submissions? This cannot be undone.')) return;
    try {
      await codeSnippetApi.delete(id);
      await loadAssessments();
    } catch { alert('Failed to delete'); }
  };

  // ── Question builder helpers ──
  const updateQuestion = (idx: number, patch: Partial<SnippetQuestion>) => {
    setForm((f) => {
      const qs = [...f.questions];
      qs[idx] = { ...qs[idx], ...patch };
      if (patch.type === 'text') {
        qs[idx].options = [];
      } else if ((patch.type === 'mcq_single' || patch.type === 'mcq_multiple') && (!qs[idx].options || qs[idx].options.length < 2)) {
        qs[idx].options = [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];
      }
      return { ...f, questions: qs };
    });
  };

  const addQuestion = () =>
    setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion()] }));

  const removeQuestion = (idx: number) =>
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));

  const generateAISnippetQuestions = async () => {
    if (!aiSnippet.topic.trim()) return;
    try {
      setAiSnippetLoading(true);
      setAiSnippetError('');
      const res = await quizApi.generateAIQuestions({
        topic: aiSnippet.topic,
        type: 'mcq_single',
        difficulty: aiSnippet.difficulty,
        count: aiSnippet.count
      });
      const generated: any[] = res.questions || res.data?.questions || [];
      const mapped: SnippetQuestion[] = generated.map((q: any) => ({
        question: q.question || '',
        type: 'mcq_single' as QuestionType,
        marks: q.marks || 1,
        options: (q.options || []).map((o: any) => ({
          text: typeof o === 'string' ? o : o.text || '',
          isCorrect: typeof o === 'object' ? Boolean(o.isCorrect) : false
        }))
      }));
      setForm((f) => ({ ...f, questions: [...f.questions, ...mapped] }));
    } catch (err: any) {
      setAiSnippetError(err.message || 'AI generation failed');
    } finally {
      setAiSnippetLoading(false);
    }
  };

  const updateOption = (qIdx: number, oIdx: number, patch: Partial<SnippetOption>) => {
    setForm((f) => {
      const qs = [...f.questions];
      const opts = [...qs[qIdx].options];
      opts[oIdx] = { ...opts[oIdx], ...patch };
      qs[qIdx] = { ...qs[qIdx], options: opts };
      return { ...f, questions: qs };
    });
  };

  const addOption = (qIdx: number) => {
    setForm((f) => {
      const qs = [...f.questions];
      qs[qIdx] = { ...qs[qIdx], options: [...qs[qIdx].options, { text: '', isCorrect: false }] };
      return { ...f, questions: qs };
    });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setForm((f) => {
      const qs = [...f.questions];
      qs[qIdx] = { ...qs[qIdx], options: qs[qIdx].options.filter((_, i) => i !== oIdx) };
      return { ...f, questions: qs };
    });
  };

  const setCorrect = (qIdx: number, oIdx: number, checked: boolean) => {
    setForm((f) => {
      const qs = [...f.questions];
      const isSingle = qs[qIdx].type === 'mcq_single';
      const opts = qs[qIdx].options.map((o, i) => ({
        ...o,
        isCorrect: isSingle ? i === oIdx : i === oIdx ? checked : o.isCorrect,
      }));
      qs[qIdx] = { ...qs[qIdx], options: opts };
      return { ...f, questions: qs };
    });
  };

  const totalFormMarks = form.questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);

  const stats = {
    total: assessments.length,
    draft: assessments.filter((a) => a.status === 'draft').length,
    published: assessments.filter((a) => a.status === 'published').length,
  };

  return (
    <div className="csa-page">
      <div className="csa-header">
        <div>
          <h1 className="csa-title">Coding Snippet Assessments</h1>
          <p className="csa-subtitle">Create assessments with code samples — students analyze and explain the code</p>
        </div>
        <button className="csa-btn-primary" onClick={openCreate}>+ New Assessment</button>
      </div>

      <div className="csa-stats">
        <div className="csa-stat"><span className="csa-stat-num">{stats.total}</span><span className="csa-stat-label">Total</span></div>
        <div className="csa-stat"><span className="csa-stat-num">{stats.draft}</span><span className="csa-stat-label">Draft</span></div>
        <div className="csa-stat csa-stat--published"><span className="csa-stat-num">{stats.published}</span><span className="csa-stat-label">Published</span></div>
      </div>

      <div className="csa-toolbar">
        <select className="csa-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      {loading ? (
        <div className="csa-loading">Loading assessments…</div>
      ) : assessments.length === 0 ? (
        <div className="csa-empty">
          <div className="csa-empty-icon">{'</>'}</div>
          <p>No assessments yet. Create your first coding snippet assessment.</p>
          <button className="csa-btn-primary" onClick={openCreate}>+ New Assessment</button>
        </div>
      ) : (
        <div className="csa-table-wrap">
          <table className="csa-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Language</th>
                <th>Questions</th>
                <th>Total Marks</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a._id}>
                  <td className="csa-cell-title">{a.title}</td>
                  <td><span className="csa-lang-badge">{LANG_LABELS[a.language] || a.language}</span></td>
                  <td>{a.questions.length}</td>
                  <td>{a.totalMarks}</td>
                  <td>{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</td>
                  <td>
                    <span className={`csa-status csa-status--${a.status}`}>
                      {a.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="csa-actions">
                    <button className="csa-btn-sm" onClick={() => openEdit(a._id)}>Edit</button>
                    {a.status === 'draft' && (
                      <button className="csa-btn-sm csa-btn-publish" onClick={() => handlePublish(a._id)}>Publish</button>
                    )}
                    <a className="csa-btn-sm" href={`/admin/coding-snippets/${a._id}/submissions`}>Submissions</a>
                    <button className="csa-btn-sm csa-btn-danger" onClick={() => handleDelete(a._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="csa-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="csa-modal">
            <div className="csa-modal-header">
              <h2>{editId ? 'Edit Assessment' : 'New Assessment'}</h2>
              <button className="csa-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="csa-tabs">
              {(['basics', 'code', 'questions', 'settings'] as const).map((t) => (
                <button
                  key={t}
                  className={`csa-tab ${activeTab === t ? 'csa-tab--active' : ''}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t === 'basics' ? '① Basics' : t === 'code' ? '② Code Snippet' : t === 'questions' ? `③ Questions (${form.questions.length})` : '④ Settings'}
                </button>
              ))}
            </div>

            {error && <div className="csa-error">{error}</div>}

            <div className="csa-modal-body">
              {/* ── Tab: Basics ── */}
              {activeTab === 'basics' && (
                <div className="csa-tab-content">
                  <div className="csa-field">
                    <label>Title <span className="csa-required">*</span></label>
                    <input
                      className="csa-input"
                      placeholder="e.g. Java Exception Handling Analysis"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="csa-field">
                    <label>Description</label>
                    <textarea
                      className="csa-textarea"
                      rows={3}
                      placeholder="Brief description of this assessment…"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="csa-field">
                    <label>Programming Language <span className="csa-required">*</span></label>
                    <select
                      className="csa-select"
                      value={form.language}
                      onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>{LANG_LABELS[l]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ── Tab: Code Snippet ── */}
              {activeTab === 'code' && (
                <div className="csa-tab-content">
                  <div className="csa-code-header">
                    <span className="csa-lang-badge">{LANG_LABELS[form.language]}</span>
                    <button
                      className={`csa-btn-sm ${preview ? 'csa-btn-active' : ''}`}
                      onClick={() => setPreview((p) => !p)}
                    >
                      {preview ? 'Edit' : 'Preview'}
                    </button>
                  </div>
                  {preview ? (
                    <pre className="csa-code-preview">
                      <code>{form.codeSnippet || '// No code entered yet'}</code>
                    </pre>
                  ) : (
                    <textarea
                      className="csa-code-editor"
                      rows={18}
                      placeholder={`// Paste your ${LANG_LABELS[form.language]} code snippet here…\n// Students will see this code and answer questions about it`}
                      value={form.codeSnippet}
                      onChange={(e) => setForm((f) => ({ ...f, codeSnippet: e.target.value }))}
                      spellCheck={false}
                    />
                  )}
                  <p className="csa-hint">Students will see this exact code and must analyze it to answer your questions.</p>
                </div>
              )}

              {/* ── Tab: Questions ── */}
              {activeTab === 'questions' && (
                <div className="csa-tab-content">
                  <div className="csa-questions-meta">
                    <span>Total marks: <strong>{totalFormMarks}</strong></span>
                    <button className="csa-btn-sm csa-btn-add" onClick={addQuestion}>+ Add Question</button>
                  </div>
                  {form.questions.map((q, qIdx) => (
                    <div key={qIdx} className="csa-question-card">
                      <div className="csa-question-header">
                        <span className="csa-q-num">Q{qIdx + 1}</span>
                        <select
                          className="csa-select csa-select-sm"
                          value={q.type}
                          onChange={(e) => updateQuestion(qIdx, { type: e.target.value as QuestionType })}
                        >
                          <option value="text">Text Answer</option>
                          <option value="mcq_single">MCQ — Single Answer</option>
                          <option value="mcq_multiple">MCQ — Multiple Answers</option>
                        </select>
                        <input
                          type="number"
                          className="csa-marks-input"
                          min={0}
                          max={100}
                          value={q.marks}
                          onChange={(e) => updateQuestion(qIdx, { marks: Number(e.target.value) })}
                          title="Marks"
                        />
                        <span className="csa-marks-label">marks</span>
                        {form.questions.length > 1 && (
                          <button className="csa-btn-icon-danger" onClick={() => removeQuestion(qIdx)} title="Remove question">✕</button>
                        )}
                      </div>
                      <textarea
                        className="csa-textarea"
                        rows={2}
                        placeholder={`Question ${qIdx + 1}: e.g. "What will this code output when input is null?"`}
                        value={q.question}
                        onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
                      />
                      <div className="csa-explanation-note">
                        📝 Student must provide a written explanation for this answer
                      </div>
                      {(q.type === 'mcq_single' || q.type === 'mcq_multiple') && (
                        <div className="csa-options">
                          <div className="csa-options-label">
                            Options {q.type === 'mcq_single' ? '(select one correct)' : '(select all correct)'}:
                          </div>
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="csa-option-row">
                              {q.type === 'mcq_single' ? (
                                <input
                                  type="radio"
                                  name={`q${qIdx}-correct`}
                                  checked={opt.isCorrect}
                                  onChange={() => setCorrect(qIdx, oIdx, true)}
                                  title="Mark as correct"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={opt.isCorrect}
                                  onChange={(e) => setCorrect(qIdx, oIdx, e.target.checked)}
                                  title="Mark as correct"
                                />
                              )}
                              <input
                                className="csa-input csa-input-option"
                                placeholder={`Option ${oIdx + 1}`}
                                value={opt.text}
                                onChange={(e) => updateOption(qIdx, oIdx, { text: e.target.value })}
                              />
                              {q.options.length > 2 && (
                                <button className="csa-btn-icon-danger" onClick={() => removeOption(qIdx, oIdx)}>✕</button>
                              )}
                            </div>
                          ))}
                          {q.options.length < 6 && (
                            <button className="csa-btn-sm" onClick={() => addOption(qIdx)}>+ Add Option</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="csa-btn-outline csa-btn-block" onClick={addQuestion}>+ Add Another Question</button>

                  {/* AI Generate Questions */}
                  <div style={{ marginTop: '20px', padding: '18px 20px', background: '#f0f7ff', borderRadius: '12px', border: '1.5px solid #bfdbfe' }}>
                    <div style={{ fontWeight: 700, color: '#005897', marginBottom: '12px', fontSize: '0.95rem' }}>✨ AI Generate Questions</div>
                    {aiSnippetError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '8px' }}>{aiSnippetError}</p>}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 2, minWidth: '160px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Topic / Language</label>
                        <input
                          className="csa-input"
                          placeholder="e.g. JavaScript Closures, Python Lists..."
                          value={aiSnippet.topic}
                          onChange={e => setAiSnippet(a => ({ ...a, topic: e.target.value }))}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Difficulty</label>
                        <select
                          className="csa-select"
                          value={aiSnippet.difficulty}
                          onChange={e => setAiSnippet(a => ({ ...a, difficulty: e.target.value }))}
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '70px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>Count</label>
                        <input
                          type="number"
                          className="csa-input"
                          min={1}
                          max={10}
                          value={aiSnippet.count}
                          onChange={e => setAiSnippet(a => ({ ...a, count: Math.min(10, Math.max(1, Number(e.target.value))) }))}
                        />
                      </div>
                      <button
                        className="csa-btn-primary"
                        onClick={generateAISnippetQuestions}
                        disabled={aiSnippetLoading || !aiSnippet.topic.trim()}
                      >
                        {aiSnippetLoading ? 'Generating…' : '✨ Generate'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Settings ── */}
              {activeTab === 'settings' && (
                <div className="csa-tab-content">
                  {settingsLoading && <div className="csa-hint">Loading options…</div>}

                  {/* Due Date */}
                  <div className="csa-field">
                    <label>Due Date <span className="csa-optional">(optional)</span></label>
                    <input
                      type="date"
                      className="csa-input"
                      value={form.dueDate}
                      onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>

                  {/* Batch multi-select */}
                  <div className="csa-field">
                    <label>Assign to Batches <span className="csa-optional">(leave empty = all batches)</span></label>
                    {batches.length === 0 && !settingsLoading ? (
                      <p className="csa-hint">No batches found.</p>
                    ) : (
                      <div className="csa-batch-list">
                        {batches.map((b) => (
                          <label key={b._id} className="csa-batch-item">
                            <input
                              type="checkbox"
                              checked={form.batchIds.includes(b._id)}
                              onChange={(e) => {
                                const ids = form.batchIds;
                                setForm((f) => ({
                                  ...f,
                                  batchIds: e.target.checked
                                    ? [...ids, b._id]
                                    : ids.filter((id) => id !== b._id),
                                }));
                              }}
                            />
                            <span>{b.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Course → Subject → Chapter → Topic */}
                  <div className="csa-field">
                    <label>Course <span className="csa-optional">(optional)</span></label>
                    <select
                      className="csa-select"
                      value={form.courseId}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, courseId: e.target.value, subjectId: '', chapterId: '', topicId: '' }));
                        loadSubjects(e.target.value);
                      }}
                    >
                      <option value="">— Select a course —</option>
                      {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>

                  {form.courseId && (
                    <div className="csa-field">
                      <label>Subject <span className="csa-optional">(optional)</span></label>
                      <select
                        className="csa-select"
                        value={form.subjectId}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, subjectId: e.target.value, chapterId: '', topicId: '' }));
                          loadChapters(e.target.value);
                        }}
                      >
                        <option value="">— Select a subject —</option>
                        {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}

                  {form.subjectId && (
                    <div className="csa-field">
                      <label>Chapter <span className="csa-optional">(optional)</span></label>
                      <select
                        className="csa-select"
                        value={form.chapterId}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, chapterId: e.target.value, topicId: '' }));
                          loadTopics(e.target.value);
                        }}
                      >
                        <option value="">— Select a chapter —</option>
                        {chapters.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}

                  {form.chapterId && (
                    <div className="csa-field">
                      <label>Topic <span className="csa-optional">(optional)</span></label>
                      <select
                        className="csa-select"
                        value={form.topicId}
                        onChange={(e) => setForm((f) => ({ ...f, topicId: e.target.value }))}
                      >
                        <option value="">— Select a topic —</option>
                        {topics.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="csa-modal-footer">
              <button className="csa-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="csa-btn-secondary" onClick={() => handleSave(false)} disabled={saving}>
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
              <button className="csa-btn-primary" onClick={() => handleSave(true)} disabled={saving}>
                {saving ? 'Publishing…' : 'Save & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
