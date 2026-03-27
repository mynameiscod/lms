import React, { useState, useEffect, useCallback } from 'react';
import { topicMasteryApi } from '../../api/topicMasteryApi';
import { learningRequestApi, LearningRequestType } from '../../api/learningRequestApi';
import { interviewQuestionApi } from '../../api';
import './TopicHub.css';

type MasteryLevel = 'not_started' | 'weak' | 'developing' | 'strong';
type ActiveTab = 'notes' | 'interview_qs' | 'practice' | 'ask';

interface TopicMasteryItem {
  _id: string;
  title: string;
  subjectName: string;
  subjectId: string;
  chapterId: string;
  masteryScore: number;
  masteryLevel: MasteryLevel;
  quizBestScore: number;
  interviewScore: number;
  interviewQTotal: number;
  interviewQConfident: number;
}

interface InterviewQ {
  _id: string;
  question: string;
  answer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  companyTags: string[];
  tags: string[];
  order: number;
  studentStatus?: 'not_reviewed' | 'reviewing' | 'understood' | 'confident';
}

const LEVEL_LABELS: Record<MasteryLevel, string> = {
  not_started: 'Not Started',
  weak: 'Weak',
  developing: 'Developing',
  strong: 'Strong'
};

const LEVEL_COLORS: Record<MasteryLevel, string> = {
  not_started: '#94a3b8',
  weak: '#f87171',
  developing: '#facc15',
  strong: '#4ade80'
};

const REQUEST_TYPES: { value: LearningRequestType; label: string; icon: string; description: string }[] = [
  { value: 'notes',        label: 'More Notes',       icon: '📝', description: 'Need better study notes for this topic' },
  { value: 'interview_qs', label: 'More Interview Qs', icon: '❓', description: 'Need more interview question practice' },
  { value: 'practice',     label: 'Practice Problems', icon: '🏋️', description: 'Need extra practice exercises' },
  { value: '1on1',         label: '1-on-1 Session',   icon: '🎓', description: 'Request a personal coaching session' },
  { value: 'clarification',label: 'Clarification',    icon: '💬', description: 'Have a specific doubt to clarify' }
];

const DIFFICULTY_COLORS = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626' };
const STATUS_LABELS: Record<string, string> = {
  not_reviewed: 'Not Reviewed',
  reviewing: 'Reviewing',
  understood: 'Understood',
  confident: 'Confident ✓'
};
const STATUS_COLORS: Record<string, string> = {
  not_reviewed: '#94a3b8',
  reviewing: '#f59e0b',
  understood: '#3b82f6',
  confident: '#16a34a'
};

const TopicHub: React.FC = () => {
  const [topics, setTopics]         = useState<TopicMasteryItem[]>([]);
  const [summary, setSummary]       = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const [selectedTopic, setSelectedTopic] = useState<TopicMasteryItem | null>(null);
  const [activeTab, setActiveTab]         = useState<ActiveTab>('interview_qs');

  const [interviewQs, setInterviewQs]     = useState<InterviewQ[]>([]);
  const [iqProgress, setIqProgress]       = useState<Record<string, string>>({});
  const [iqLoading, setIqLoading]         = useState(false);
  const [expandedQ, setExpandedQ]         = useState<string | null>(null);
  const [iqFilter, setIqFilter]           = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [iqStatusFilter, setIqStatusFilter] = useState<string>('all');

  const [myRequests, setMyRequests]       = useState<any[]>([]);
  const [showAskForm, setShowAskForm]     = useState(false);
  const [askType, setAskType]             = useState<LearningRequestType>('clarification');
  const [askMessage, setAskMessage]       = useState('');
  const [askSubmitting, setAskSubmitting] = useState(false);
  const [askSuccess, setAskSuccess]       = useState('');

  const [subjectFilter, setSubjectFilter] = useState('all');
  const [searchTerm, setSearchTerm]       = useState('');

  // Load mastery on mount
  useEffect(() => {
    setLoading(true);
    topicMasteryApi.getMyMastery()
      .then(res => {
        setTopics(res.data?.topics || []);
        setSummary(res.data?.summary);
        const firstTopic = res.data?.topics?.[0];
        if (firstTopic) setSelectedTopic(firstTopic);
      })
      .catch(e => setError(e.message || 'Failed to load topics'))
      .finally(() => setLoading(false));
  }, []);

  // Reload interview Qs when topic changes
  useEffect(() => {
    if (!selectedTopic?.chapterId) return;
    setIqLoading(true);
    setInterviewQs([]);
    setExpandedQ(null);

    Promise.all([
      interviewQuestionApi.getQuestionsByChapter(selectedTopic.chapterId),
      interviewQuestionApi.getStudentProgress(selectedTopic.chapterId)
    ]).then(([qRes, pRes]) => {
      setInterviewQs(qRes.data || qRes || []);
      const prog: Record<string, string> = {};
      const progressArr = pRes.data || pRes || [];
      progressArr.forEach((p: any) => { prog[p.questionId] = p.status; });
      setIqProgress(prog);
    }).catch(console.error)
      .finally(() => setIqLoading(false));
  }, [selectedTopic]);

  // Load my requests
  useEffect(() => {
    learningRequestApi.getMy()
      .then(res => setMyRequests(res.data || []))
      .catch(console.error);
  }, []);

  const handleUpdateIqStatus = useCallback(async (questionId: string, status: 'not_reviewed' | 'reviewing' | 'understood' | 'confident') => {
    try {
      await interviewQuestionApi.updateStudentProgress(questionId, { status, chapterId: selectedTopic?.chapterId! });
      setIqProgress(prev => ({ ...prev, [questionId]: status }));
      // Optimistically update mastery UI
      if (selectedTopic && (status === 'understood' || status === 'confident')) {
        setTopics(prev => prev.map(t => {
          if (t._id !== selectedTopic._id) return t;
          const newConfident = Object.values({ ...iqProgress, [questionId]: status })
            .filter(s => s === 'understood' || s === 'confident').length;
          const newInterviewScore = t.interviewQTotal > 0 ? Math.round((newConfident / t.interviewQTotal) * 100) : 0;
          const newMastery = t.quizBestScore > 0
            ? Math.round(t.quizBestScore * 0.6 + newInterviewScore * 0.4)
            : newInterviewScore;
          const newLevel: MasteryLevel = newMastery >= 75 ? 'strong' : newMastery >= 45 ? 'developing' : newMastery >= 10 ? 'weak' : 'not_started';
          return { ...t, interviewScore: newInterviewScore, masteryScore: newMastery, masteryLevel: newLevel, interviewQConfident: newConfident };
        }));
        setSelectedTopic(prev => {
          if (!prev || prev._id !== selectedTopic._id) return prev;
          const newConfident = Object.values({ ...iqProgress, [questionId]: status })
            .filter(s => s === 'understood' || s === 'confident').length;
          const newInterviewScore = prev.interviewQTotal > 0 ? Math.round((newConfident / prev.interviewQTotal) * 100) : 0;
          const newMastery = prev.quizBestScore > 0
            ? Math.round(prev.quizBestScore * 0.6 + newInterviewScore * 0.4)
            : newInterviewScore;
          const newLevel: MasteryLevel = newMastery >= 75 ? 'strong' : newMastery >= 45 ? 'developing' : newMastery >= 10 ? 'weak' : 'not_started';
          return { ...prev, interviewScore: newInterviewScore, masteryScore: newMastery, masteryLevel: newLevel, interviewQConfident: newConfident };
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, [iqProgress, selectedTopic]);

  const handleAskSubmit = async () => {
    if (!askMessage.trim()) return;
    setAskSubmitting(true);
    try {
      await learningRequestApi.create({
        type: askType,
        message: askMessage.trim(),
        topicId: selectedTopic?._id,
        chapterId: selectedTopic?.chapterId,
        subjectId: selectedTopic?.subjectId,
        topicTitle: selectedTopic?.title,
        subjectName: selectedTopic?.subjectName
      });
      setAskMessage('');
      setShowAskForm(false);
      setAskSuccess('Your request has been sent to the instructor!');
      setTimeout(() => setAskSuccess(''), 4000);
      // Reload requests
      learningRequestApi.getMy().then(res => setMyRequests(res.data || [])).catch(console.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAskSubmitting(false);
    }
  };

  // Get unique subjects for filter
  const subjects = [...new Set(topics.map(t => t.subjectName).filter(Boolean))];

  const filteredTopics = topics.filter(t => {
    if (subjectFilter !== 'all' && t.subjectName !== subjectFilter) return false;
    if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredIqs = interviewQs.filter(q => {
    if (iqFilter !== 'all' && q.difficulty !== iqFilter) return false;
    if (iqStatusFilter !== 'all') {
      const status = iqProgress[q._id] || 'not_reviewed';
      if (iqStatusFilter === 'done' && !['understood', 'confident'].includes(status)) return false;
      if (iqStatusFilter === 'todo' && ['understood', 'confident'].includes(status)) return false;
    }
    return true;
  });

  const topicRequestsCount = myRequests.filter(r =>
    (typeof r.topicId === 'string' ? r.topicId : r.topicId?._id) === selectedTopic?._id &&
    r.status === 'pending'
  ).length;

  if (loading) return (
    <div className="th-loading-screen">
      <div className="th-spinner" />
      <p>Loading your topic progress…</p>
    </div>
  );

  if (error && !topics.length) return (
    <div className="th-error-screen">
      <p>⚠️ {error}</p>
    </div>
  );

  return (
    <div className="th-layout">
      {/* Left Sidebar — Topic List */}
      <aside className="th-sidebar">
        <div className="th-sidebar-header">
          <h2 className="th-sidebar-title">📚 My Topics</h2>
          {summary && (
            <div className="th-overall-score">
              <div className="th-score-ring"
                style={{ background: `conic-gradient(#6366f1 ${summary.avgScore * 3.6}deg, #e2e8f0 0)` }}>
                <span className="th-score-ring-val">{summary.avgScore}%</span>
              </div>
              <span className="th-score-ring-label">Overall</span>
            </div>
          )}
        </div>

        {/* Search & Filter */}
        <div className="th-sidebar-filters">
          <input
            className="th-search"
            placeholder="Search topics…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {subjects.length > 1 && (
            <select className="th-filter-select" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {/* Summary pills */}
        {summary && (
          <div className="th-summary-pills">
            <span className="th-pill th-pill-strong">{summary.strongCount} Strong</span>
            <span className="th-pill th-pill-weak">{summary.weakCount} Need Work</span>
          </div>
        )}

        {/* Topic list */}
        <div className="th-topic-list">
          {filteredTopics.length === 0 ? (
            <div className="th-no-topics">No topics found</div>
          ) : (
            filteredTopics.map(topic => (
              <button
                key={topic._id}
                className={`th-topic-item ${selectedTopic?._id === topic._id ? 'th-topic-active' : ''}`}
                onClick={() => { setSelectedTopic(topic); setActiveTab('interview_qs'); }}
              >
                <div className="th-topic-item-header">
                  <span className="th-topic-item-name">{topic.title}</span>
                  <span
                    className="th-mastery-badge"
                    style={{ background: LEVEL_COLORS[topic.masteryLevel] + '20', color: LEVEL_COLORS[topic.masteryLevel], border: `1px solid ${LEVEL_COLORS[topic.masteryLevel]}` }}
                  >
                    {topic.masteryScore}%
                  </span>
                </div>
                <div className="th-topic-item-sub">{topic.subjectName}</div>
                <div className="th-mastery-bar-wrap">
                  <div
                    className="th-mastery-bar"
                    style={{ width: `${topic.masteryScore}%`, background: LEVEL_COLORS[topic.masteryLevel] }}
                  />
                </div>
                <span className="th-level-tag" style={{ color: LEVEL_COLORS[topic.masteryLevel] }}>
                  {LEVEL_LABELS[topic.masteryLevel]}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="th-main">
        {!selectedTopic ? (
          <div className="th-pick-topic">
            <div className="th-pick-icon">👈</div>
            <p>Select a topic from the sidebar to explore resources</p>
          </div>
        ) : (
          <>
            {/* Topic Header */}
            <div className="th-topic-header">
              <div className="th-topic-header-left">
                <div className="th-topic-breadcrumb">{selectedTopic.subjectName}</div>
                <h1 className="th-topic-name">{selectedTopic.title}</h1>
              </div>
              <div className="th-topic-header-right">
                <div className="th-mastery-display">
                  <div
                    className="th-mastery-circle"
                    style={{ borderColor: LEVEL_COLORS[selectedTopic.masteryLevel] }}
                  >
                    <span className="th-mastery-pct">{selectedTopic.masteryScore}%</span>
                    <span className="th-mastery-level">{LEVEL_LABELS[selectedTopic.masteryLevel]}</span>
                  </div>
                </div>
                <div className="th-mastery-breakdown">
                  {selectedTopic.quizBestScore > 0 && (
                    <div className="th-breakdown-item">
                      <span className="th-breakdown-label">Quiz Best</span>
                      <span className="th-breakdown-val quiz">{selectedTopic.quizBestScore}%</span>
                    </div>
                  )}
                  {selectedTopic.interviewQTotal > 0 && (
                    <div className="th-breakdown-item">
                      <span className="th-breakdown-label">Interview Qs</span>
                      <span className="th-breakdown-val iq">{selectedTopic.interviewQConfident}/{selectedTopic.interviewQTotal}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {askSuccess && (
              <div className="th-alert th-alert-success">{askSuccess}</div>
            )}

            {/* Tab Bar */}
            <div className="th-tabs">
              <button className={`th-tab ${activeTab === 'interview_qs' ? 'th-tab-active' : ''}`} onClick={() => setActiveTab('interview_qs')}>
                ❓ Interview Questions
                {interviewQs.length > 0 && <span className="th-tab-count">{interviewQs.length}</span>}
              </button>
              <button className={`th-tab ${activeTab === 'ask' ? 'th-tab-active' : ''}`} onClick={() => setActiveTab('ask')}>
                🙋 Ask for Help
                {topicRequestsCount > 0 && <span className="th-tab-count th-tab-count-pending">{topicRequestsCount}</span>}
              </button>
            </div>

            {/* Tab Content */}
            <div className="th-tab-content">

              {/* Interview Questions Tab */}
              {activeTab === 'interview_qs' && (
                <div className="th-iq-section">
                  {iqLoading ? (
                    <div className="th-inner-loading"><div className="th-spinner" /></div>
                  ) : interviewQs.length === 0 ? (
                    <div className="th-empty">
                      <div className="th-empty-icon">❓</div>
                      <p>No interview questions for this topic yet.</p>
                      <p className="th-empty-hint">Check back later or ask your instructor to add some.</p>
                    </div>
                  ) : (
                    <>
                      {/* Progress bar */}
                      <div className="th-iq-progress-bar-section">
                        <div className="th-iq-progress-info">
                          <span>{selectedTopic.interviewQConfident} of {selectedTopic.interviewQTotal} mastered</span>
                          <span className="th-iq-progress-pct">{selectedTopic.interviewScore}%</span>
                        </div>
                        <div className="th-iq-progress-track">
                          <div className="th-iq-progress-fill" style={{ width: `${selectedTopic.interviewScore}%` }} />
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="th-iq-filters">
                        <div className="th-iq-filter-group">
                          <span>Difficulty:</span>
                          {(['all', 'easy', 'medium', 'hard'] as const).map(d => (
                            <button
                              key={d}
                              className={`th-diff-btn ${iqFilter === d ? 'th-diff-active' : ''}`}
                              onClick={() => setIqFilter(d)}
                            >
                              {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                            </button>
                          ))}
                        </div>
                        <div className="th-iq-filter-group">
                          <span>Show:</span>
                          <button className={`th-diff-btn ${iqStatusFilter === 'all' ? 'th-diff-active' : ''}`} onClick={() => setIqStatusFilter('all')}>All</button>
                          <button className={`th-diff-btn ${iqStatusFilter === 'todo' ? 'th-diff-active' : ''}`} onClick={() => setIqStatusFilter('todo')}>To Do</button>
                          <button className={`th-diff-btn ${iqStatusFilter === 'done' ? 'th-diff-active' : ''}`} onClick={() => setIqStatusFilter('done')}>Done</button>
                        </div>
                      </div>

                      {/* Questions */}
                      <div className="th-iq-list">
                        {filteredIqs.map((q, idx) => {
                          const status = iqProgress[q._id] || 'not_reviewed';
                          const isExpanded = expandedQ === q._id;
                          return (
                            <div key={q._id} className={`th-iq-card ${isExpanded ? 'th-iq-card-expanded' : ''}`}>
                              <div className="th-iq-card-header" onClick={() => setExpandedQ(isExpanded ? null : q._id)}>
                                <div className="th-iq-card-left">
                                  <span className="th-iq-num">Q{idx + 1}</span>
                                  <span
                                    className="th-diff-chip"
                                    style={{ color: DIFFICULTY_COLORS[q.difficulty], background: DIFFICULTY_COLORS[q.difficulty] + '18' }}
                                  >
                                    {q.difficulty}
                                  </span>
                                  {q.companyTags.slice(0, 2).map(tag => (
                                    <span key={tag} className="th-company-tag">{tag}</span>
                                  ))}
                                  <span className="th-iq-question-preview">{q.question}</span>
                                </div>
                                <div className="th-iq-card-right">
                                  <select
                                    className="th-status-select"
                                    style={{ color: STATUS_COLORS[status] }}
                                    value={status}
                                    onChange={e => { e.stopPropagation(); handleUpdateIqStatus(q._id, e.target.value as 'not_reviewed' | 'reviewing' | 'understood' | 'confident'); }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                      <option key={val} value={val}>{label}</option>
                                    ))}
                                  </select>
                                  <span className="th-expand-icon">{isExpanded ? '▲' : '▼'}</span>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="th-iq-card-body">
                                  <div className="th-iq-question-full">
                                    <strong>Q:</strong> {q.question}
                                  </div>
                                  <div className="th-iq-answer">
                                    <strong>Answer:</strong>
                                    <p>{q.answer}</p>
                                  </div>
                                  {q.explanation && (
                                    <div className="th-iq-explanation">
                                      <strong>💡 Explanation:</strong>
                                      <p>{q.explanation}</p>
                                    </div>
                                  )}
                                  {q.tags.length > 0 && (
                                    <div className="th-iq-tags">
                                      {q.tags.map(tag => (
                                        <span key={tag} className="th-tag">{tag}</span>
                                      ))}
                                    </div>
                                  )}
                                  <div className="th-iq-status-row">
                                    <span>Mark as:</span>
                                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                      <button
                                        key={val}
                                        className={`th-status-btn ${status === val ? 'th-status-active' : ''}`}
                                        style={status === val ? { borderColor: STATUS_COLORS[val], color: STATUS_COLORS[val], background: STATUS_COLORS[val] + '15' } : {}}
                                        onClick={() => handleUpdateIqStatus(q._id, val as 'not_reviewed' | 'reviewing' | 'understood' | 'confident')}
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Ask for Help Tab */}
              {activeTab === 'ask' && (
                <div className="th-ask-section">
                  <div className="th-ask-intro">
                    <p>Struggling with <strong>{selectedTopic.title}</strong>? Ask your instructor for help.</p>
                  </div>

                  {!showAskForm ? (
                    <>
                      <div className="th-request-types">
                        {REQUEST_TYPES.map(rt => (
                          <button
                            key={rt.value}
                            className="th-request-type-card"
                            onClick={() => { setAskType(rt.value); setShowAskForm(true); }}
                          >
                            <span className="th-rt-icon">{rt.icon}</span>
                            <span className="th-rt-label">{rt.label}</span>
                            <span className="th-rt-desc">{rt.description}</span>
                          </button>
                        ))}
                      </div>

                      {/* My past requests for this topic */}
                      {myRequests.filter(r =>
                        (typeof r.topicId === 'string' ? r.topicId : r.topicId?._id) === selectedTopic._id
                      ).length > 0 && (
                        <div className="th-my-requests">
                          <h3 className="th-my-requests-title">Your Previous Requests</h3>
                          {myRequests
                            .filter(r => (typeof r.topicId === 'string' ? r.topicId : r.topicId?._id) === selectedTopic._id)
                            .map(r => (
                              <div key={r._id} className={`th-request-card th-req-${r.status}`}>
                                <div className="th-req-header">
                                  <span className="th-req-type-badge">
                                    {REQUEST_TYPES.find(t => t.value === r.type)?.icon} {REQUEST_TYPES.find(t => t.value === r.type)?.label}
                                  </span>
                                  <span className={`th-req-status th-req-status-${r.status}`}>{r.status.replace('_', ' ')}</span>
                                </div>
                                <p className="th-req-message">{r.message}</p>
                                {r.adminNote && (
                                  <div className="th-req-admin-note">
                                    <strong>Instructor note:</strong> {r.adminNote}
                                  </div>
                                )}
                                <span className="th-req-date">{new Date(r.createdAt).toLocaleDateString()}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="th-ask-form">
                      <div className="th-ask-form-header">
                        <span className="th-rt-selected-icon">
                          {REQUEST_TYPES.find(t => t.value === askType)?.icon}
                        </span>
                        <h3>{REQUEST_TYPES.find(t => t.value === askType)?.label}</h3>
                        <button className="th-ask-back" onClick={() => setShowAskForm(false)}>← Back</button>
                      </div>

                      <div className="th-ask-type-pills">
                        {REQUEST_TYPES.map(rt => (
                          <button
                            key={rt.value}
                            className={`th-ask-type-pill ${askType === rt.value ? 'th-ask-type-active' : ''}`}
                            onClick={() => setAskType(rt.value)}
                          >
                            {rt.icon} {rt.label}
                          </button>
                        ))}
                      </div>

                      <textarea
                        className="th-ask-textarea"
                        placeholder={`Describe what you need help with on "${selectedTopic.title}"…`}
                        value={askMessage}
                        onChange={e => setAskMessage(e.target.value)}
                        rows={5}
                      />

                      <div className="th-ask-form-actions">
                        <button className="th-ask-cancel" onClick={() => setShowAskForm(false)}>Cancel</button>
                        <button
                          className="th-ask-submit"
                          onClick={handleAskSubmit}
                          disabled={askSubmitting || !askMessage.trim()}
                        >
                          {askSubmitting ? '⏳ Sending…' : '📨 Send Request'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default TopicHub;
