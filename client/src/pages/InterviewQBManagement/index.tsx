import React, { useState, useEffect, useCallback } from 'react';
import { interviewQuestionBankApi } from '../../api/interviewModuleApi';
import './InterviewQBManagement.css';

type InterviewCategory = 'communication' | 'hr' | 'technical';
type IInterviewQuestionShared = { _id?: string; interviewCategory: string; questionType: string; topic?: string; subTopic?: string; difficulty: string; roleTarget?: string; experienceLevel?: string; tags?: string[]; questionText: string; questionHint?: string; answerMode: string; mcqOptions?: any[]; expectedAnswerPoints?: string[]; sampleStrongAnswer?: string; weakAnswerIndicators?: string[]; keywordsForMatching?: string[]; enableFollowUp?: boolean; maxScore: number; suggestedTimeSeconds: number; [key: string]: any; };

const CATEGORY_LABELS: Record<string, string> = {
  communication: '🗣️ Communication', hr: '👔 HR', technical: '💻 Technical',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10b981', medium: '#f59e0b', hard: '#ef4444',
};

const InterviewQBManagement: React.FC = () => {
  const [questions, setQuestions] = useState<IInterviewQuestionShared[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    interviewCategory: '', questionType: '', topic: '', difficulty: '', search: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IInterviewQuestionShared | null>(null);
  const [topics, setTopics] = useState<string[]>([]);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await interviewQuestionBankApi.getAll({ ...filters, page, limit: 20 });
      setQuestions(res.questions || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  useEffect(() => {
    interviewQuestionBankApi.getTopics().then(res => setTopics(res.data || [])).catch(() => {});
  }, []);

  const handleDeactivate = async (questionId: string) => {
    if (!window.confirm('Deactivate this question?')) return;
    try {
      await interviewQuestionBankApi.deactivate(questionId);
      fetchQuestions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="iqb-container">
      <div className="iqb-header">
        <div>
          <h1>Interview Question Bank</h1>
          <p className="iqb-subtitle">Manage reusable questions across Communication, HR, and Technical categories</p>
        </div>
        <button className="iqb-btn-primary" onClick={() => { setEditingQuestion(null); setShowCreateModal(true); }}>
          + Add Question
        </button>
      </div>

      {/* Filters */}
      <div className="iqb-filters">
        <input
          type="text" placeholder="Search questions..."
          value={filters.search}
          onChange={e => { setPage(1); setFilters(prev => ({ ...prev, search: e.target.value })); }}
        />
        <select value={filters.interviewCategory} onChange={e => { setPage(1); setFilters(prev => ({ ...prev, interviewCategory: e.target.value })); }}>
          <option value="">All Categories</option>
          <option value="communication">Communication</option>
          <option value="hr">HR</option>
          <option value="technical">Technical</option>
        </select>
        <select value={filters.difficulty} onChange={e => { setPage(1); setFilters(prev => ({ ...prev, difficulty: e.target.value })); }}>
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select value={filters.topic} onChange={e => { setPage(1); setFilters(prev => ({ ...prev, topic: e.target.value })); }}>
          <option value="">All Topics</option>
          {topics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="iqb-stats">Total: <strong>{total}</strong> questions</div>

      {/* Question List */}
      {loading ? (
        <div className="iqb-loading">Loading...</div>
      ) : questions.length === 0 ? (
        <div className="iqb-empty">No questions found. Start building your question bank!</div>
      ) : (
        <div className="iqb-list">
          {questions.map(q => (
            <div key={q._id} className="iqb-card">
              <div className="iqb-card-top">
                <span className="iqb-cat-badge">{CATEGORY_LABELS[q.interviewCategory] || q.interviewCategory}</span>
                <span className="iqb-diff-badge" style={{ color: DIFFICULTY_COLORS[q.difficulty] }}>{q.difficulty}</span>
                <span className="iqb-type-badge">{q.questionType}</span>
                {q.roleTarget && <span className="iqb-role-badge">{q.roleTarget}</span>}
              </div>
              <p className="iqb-question-text">{q.questionText}</p>
              <div className="iqb-card-meta">
                {q.topic && <span>Topic: {q.topic}</span>}
                {q.answerMode && <span>Mode: {q.answerMode}</span>}
                <span>Score: {q.maxScore}</span>
                <span>Time: {q.suggestedTimeSeconds}s</span>
                {q.tags && q.tags.length > 0 && (
                  <span>Tags: {q.tags.slice(0, 3).join(', ')}</span>
                )}
              </div>
              <div className="iqb-card-actions">
                <button onClick={() => { setEditingQuestion(q); setShowCreateModal(true); }}>Edit</button>
                <button className="iqb-btn-danger" onClick={() => handleDeactivate(q._id!)}>Deactivate</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="iqb-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <QuestionFormModal
          question={editingQuestion}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => { setShowCreateModal(false); fetchQuestions(); }}
        />
      )}
    </div>
  );
};

// ─── Question Form Modal ─────────────────────────────────────────────────────

interface QuestionFormModalProps {
  question: IInterviewQuestionShared | null;
  onClose: () => void;
  onSaved: () => void;
}

const QuestionFormModal: React.FC<QuestionFormModalProps> = ({ question, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<IInterviewQuestionShared>>({
    interviewCategory: 'technical',
    questionType: 'technical',
    topic: '',
    subTopic: '',
    difficulty: 'medium',
    roleTarget: '',
    experienceLevel: 'any',
    tags: [],
    questionText: '',
    questionHint: '',
    answerMode: 'text',
    expectedAnswerPoints: [],
    sampleStrongAnswer: '',
    weakAnswerIndicators: [],
    keywordsForMatching: [],
    enableFollowUp: false,
    maxScore: 10,
    suggestedTimeSeconds: 120,
    ...question,
  });

  const [tagsInput, setTagsInput] = useState((form.tags || []).join(', '));
  const [keywordsInput, setKeywordsInput] = useState((form.keywordsForMatching || []).join(', '));
  const [expectedPointsInput, setExpectedPointsInput] = useState((form.expectedAnswerPoints || []).join('\n'));

  const updateForm = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.questionText || !form.topic) { alert('Question text and topic are required'); return; }

    const payload = {
      ...form,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      keywordsForMatching: keywordsInput.split(',').map(k => k.trim()).filter(Boolean),
      expectedAnswerPoints: expectedPointsInput.split('\n').map(p => p.trim()).filter(Boolean),
    };

    try {
      setSaving(true);
      if (question?._id) {
        await interviewQuestionBankApi.update(question._id, payload);
      } else {
        await interviewQuestionBankApi.create(payload);
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="iqb-modal-overlay" onClick={onClose}>
      <div className="iqb-modal" onClick={e => e.stopPropagation()}>
        <div className="iqb-modal-header">
          <h2>{question ? 'Edit Question' : 'Add Question'}</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="iqb-modal-body">
          <div className="iqb-modal-row">
            <div className="iqb-modal-field">
              <label>Category *</label>
              <select value={form.interviewCategory} onChange={e => updateForm('interviewCategory', e.target.value)}>
                <option value="communication">Communication</option>
                <option value="hr">HR</option>
                <option value="technical">Technical</option>
              </select>
            </div>
            <div className="iqb-modal-field">
              <label>Question Type *</label>
              <select value={form.questionType} onChange={e => updateForm('questionType', e.target.value)}>
                <option value="behavioral">Behavioral</option>
                <option value="situational">Situational</option>
                <option value="technical">Technical</option>
                <option value="coding">Coding</option>
                <option value="opinion">Opinion</option>
                <option value="self_introduction">Self Introduction</option>
                <option value="topic_explanation">Topic Explanation</option>
                <option value="scenario">Scenario</option>
                <option value="architecture">Architecture</option>
                <option value="debugging">Debugging</option>
              </select>
            </div>
          </div>

          <div className="iqb-modal-row">
            <div className="iqb-modal-field">
              <label>Topic *</label>
              <input type="text" value={form.topic || ''} onChange={e => updateForm('topic', e.target.value)} placeholder="e.g., Java, React, Teamwork" />
            </div>
            <div className="iqb-modal-field">
              <label>Sub-Topic</label>
              <input type="text" value={form.subTopic || ''} onChange={e => updateForm('subTopic', e.target.value)} />
            </div>
          </div>

          <div className="iqb-modal-row">
            <div className="iqb-modal-field">
              <label>Difficulty</label>
              <select value={form.difficulty} onChange={e => updateForm('difficulty', e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="iqb-modal-field">
              <label>Role Target</label>
              <input type="text" value={form.roleTarget || ''} onChange={e => updateForm('roleTarget', e.target.value)} placeholder="e.g., Frontend, Backend, Full Stack" />
            </div>
            <div className="iqb-modal-field">
              <label>Experience Level</label>
              <select value={form.experienceLevel} onChange={e => updateForm('experienceLevel', e.target.value)}>
                <option value="any">Any</option>
                <option value="fresher">Fresher</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
              </select>
            </div>
          </div>

          <div className="iqb-modal-field">
            <label>Question Text *</label>
            <textarea value={form.questionText || ''} onChange={e => updateForm('questionText', e.target.value)} rows={3} required />
          </div>

          <div className="iqb-modal-row">
            <div className="iqb-modal-field">
              <label>Answer Mode</label>
              <select value={form.answerMode} onChange={e => updateForm('answerMode', e.target.value)}>
                <option value="text">Text</option>
                <option value="audio">Audio</option>
                <option value="mcq">MCQ</option>
                <option value="code">Code</option>
                <option value="structured_explanation">Structured Explanation</option>
              </select>
            </div>
            <div className="iqb-modal-field">
              <label>Max Score</label>
              <input type="number" value={form.maxScore} onChange={e => updateForm('maxScore', parseInt(e.target.value) || 10)} min={1} />
            </div>
            <div className="iqb-modal-field">
              <label>Suggested Time (seconds)</label>
              <input type="number" value={form.suggestedTimeSeconds} onChange={e => updateForm('suggestedTimeSeconds', parseInt(e.target.value) || 120)} min={10} />
            </div>
          </div>

          <div className="iqb-modal-field">
            <label>Expected Answer Points (one per line)</label>
            <textarea value={expectedPointsInput} onChange={e => setExpectedPointsInput(e.target.value)} rows={3} placeholder="Point 1&#10;Point 2&#10;Point 3" />
          </div>

          <div className="iqb-modal-field">
            <label>Keywords for Matching (comma-separated)</label>
            <input type="text" value={keywordsInput} onChange={e => setKeywordsInput(e.target.value)} placeholder="keyword1, keyword2, keyword3" />
          </div>

          <div className="iqb-modal-field">
            <label>Sample Strong Answer</label>
            <textarea value={form.sampleStrongAnswer || ''} onChange={e => updateForm('sampleStrongAnswer', e.target.value)} rows={2} />
          </div>

          <div className="iqb-modal-field">
            <label>Tags (comma-separated)</label>
            <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="placement, core-java, behavioral" />
          </div>

          <div className="iqb-modal-field">
            <label>Hint (optional)</label>
            <input type="text" value={form.questionHint || ''} onChange={e => updateForm('questionHint', e.target.value)} />
          </div>

          <div className="iqb-modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="iqb-btn-save" disabled={saving}>
              {saving ? 'Saving...' : question ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterviewQBManagement;
